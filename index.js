import express from "express";
import cors from "cors";
import pLimit from "p-limit";
import fs from "fs/promises";

import yahooScraper from "./scrapers/yahooScraper.js";
import googleScraper from "./scrapers/googleScraper.js";

const app = express();
const PORT = 3000;

const data = await fs.readFile("./data/stockList.json", "utf-8");
const stockList = JSON.parse(data);

// Utility: Limit concurrent scrapes
const limit = pLimit(3);

// Utility: Promise timeout wrapper
const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout exceeded")), ms)
    ),
  ]);

let cachedData = [];
let lastUpdated = null;

// Core scraper + calculator
async function fetchStockData(stock, totalInvestment) {
  const investment = stock.purchasePrice * stock.quantity;

  let cmp = null;
  let presentValue = null;
  let gainLoss = null;
  let peRatio = null;
  let latestEarnings = null;

  // Fetch CMP
  try {
    const yahooRaw = await withTimeout(yahooScraper(stock.ticker), 45000);
    const yahooData = Array.isArray(yahooRaw) ? yahooRaw[0] : yahooRaw;

    if (yahooData && typeof yahooData.cmp === "number") {
      cmp = yahooData.cmp;
      presentValue = cmp * stock.quantity;
      gainLoss = presentValue - investment;
    } else {
      console.warn(`⚠️ CMP not found for ${stock.ticker}`);
    }
  } catch (err) {
    console.warn(`❌ Yahoo scraper failed for ${stock.ticker}: ${err.message}`);
  }

  // Fetch P/E and earnings
  try {
    const googleData = await withTimeout(googleScraper(stock.ticker), 45000);
    peRatio = googleData?.peRatio ?? null;
    latestEarnings = googleData?.latestEarnings ?? null;
  } catch (err) {
    console.warn(`❌ Google scraper failed for ${stock.ticker}: ${err.message}`);
  }

  const portfolioPercent = (investment / totalInvestment) * 100;

  return {
    ...stock,
    investment,
    cmp,
    presentValue: cmp !== null ? presentValue : null,
    gainLoss: cmp !== null ? gainLoss : null,
    peRatio,
    latestEarnings,
    portfolioPercent: portfolioPercent.toFixed(2),
  };
}

// Main update logic
async function calculateData() {
  try {
    console.log("🔁 Updating stock data...");

    const totalInvestment = stockList.reduce(
      (sum, stock) => sum + stock.purchasePrice * stock.quantity,
      0
    );

    const results = await Promise.all(
      stockList.map(stock => limit(() => fetchStockData(stock, totalInvestment)))
    );

    cachedData = results;
    lastUpdated = new Date();

    console.log("✅ Data updated at:", lastUpdated.toLocaleTimeString());
  } catch (err) {
    console.error("❌ Critical error during data update:", err.message);
  }
}

// Initial + scheduled updates
await calculateData();
setInterval(calculateData, 15000);

// Enable CORS
app.use(cors());

// API Route
app.get("/getstocksData", (req, res) => {
  res.json({
    lastUpdated,
    count: cachedData.length,
    data: cachedData,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
