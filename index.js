import express from "express";
import cors from "cors";
import pLimit from "p-limit";

import googleScraper from "./scrapers/googleScraper.js";
import yahooScraper from "./scrapers/yahooScraper.js";
import fs from 'fs/promises';

const data = await fs.readFile('./data/stockList.json', 'utf-8');
const stockList = JSON.parse(data);



const app = express();
const PORT = 3000;

let cachedData = stockList.map(stock => ({
  ...stock,
  investment: stock.purchasePrice * stock.quantity,
  cmp: null,
  presentValue: null,
  gainLoss: null,
  peRatio: null,
  latestEarnings: null,
  portfolioPercent: null,
}));

let lastUpdated = null;
const limit = pLimit(3); // concurrent scraping limit

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout exceeded")), ms)
    ),
  ]);

async function fetchStockData(stock, totalInvestment) {
  try {
    const yahooRaw = await withTimeout(yahooScraper(stock.ticker), 45000);

    // In case yahooScraper returns array
    const yahooData = Array.isArray(yahooRaw) ? yahooRaw[0] : yahooRaw;

    if (!yahooData || typeof yahooData.cmp !== "number") {
      throw new Error("Invalid CMP from Yahoo scraper");
    }

    const googleData = await withTimeout(googleScraper(stock.ticker), 45000);

    const investment = stock.purchasePrice * stock.quantity;
    const cmp = yahooData.cmp;
    const presentValue = cmp * stock.quantity;
    const gainLoss = presentValue - investment;
    const portfolioPercent = (investment / totalInvestment) * 100;

    return {
      ...stock,
      investment,
      cmp,
      presentValue,
      gainLoss,
      peRatio: googleData?.peRatio ?? null,
      latestEarnings: googleData?.latestEarnings ?? null,
      portfolioPercent: portfolioPercent.toFixed(2),
    };
  } catch (err) {
    console.error(`❌ Error fetching CMP for ${stock.ticker}:`, err.message);

    return {
      ...stock,
      investment: stock.purchasePrice * stock.quantity,
      cmp: null,
      presentValue: null,
      gainLoss: null,
      peRatio: null,
      latestEarnings: null,
      portfolioPercent: null,
    };
  }
}

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
  } catch (error) {
    console.error("❌ Critical error during data update:", error.message);
  }
}

setInterval(calculateData, 15000);
calculateData();

app.use(cors());

app.get("/api/stocks", (req, res) => {
  res.json({
    lastUpdated,
    count: cachedData.length,
    data: cachedData,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
