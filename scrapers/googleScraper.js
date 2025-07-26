import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const MAX_CONCURRENT_TABS = 3;

let browserInstance = null;
let browserLaunchingPromise = null;
let tabPool = [];

async function launchBrowser() {
  if (browserInstance) return browserInstance;
  if (browserLaunchingPromise) return browserLaunchingPromise;

  browserLaunchingPromise = (async () => {
    const browser = await puppeteer.launch({
      headless: false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
      ],
      defaultViewport: null,
    });
    console.log("✅ Launched bundled Chromium in headless mode");
    browserInstance = browser;
    return browser;
  })();

  const result = await browserLaunchingPromise;
  browserLaunchingPromise = null;
  return result;
}

/**
 * Initializes a pool of tabs
 */
async function initTabPool() {
  const browser = await launchBrowser();
  while (tabPool.length < MAX_CONCURRENT_TABS) {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });
    tabPool.push(page);
  }
}

function getTab() {
  return tabPool.shift();
}

function releaseTab(tab) {
  tabPool.push(tab);
}

const googleScraper = async (ticker) => {
  if (tabPool.length === 0) await initTabPool();

  const page = getTab();

  try {
    await page.goto(`https://www.google.com/finance/quote/${ticker}:NASDAQ`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    await page.waitForSelector("tr.roXhBd, .gyFHrc", { timeout: 10000 });

    const data = await page.evaluate(() => {
      let peRatio = null;
      let latestEarnings = null;

      const rows = document.querySelectorAll("tr.roXhBd");
      rows.forEach((row) => {
        const labelEl = row.querySelector("td.J9Jhg div");
        const valueEl = row.querySelector("td.QXDnM");
        if (!labelEl || !valueEl) return;

        const label = labelEl.textContent.trim();
        const value = valueEl.textContent.trim();

        if (label.includes("P/E ratio")) peRatio = value;
        if (label.includes("Earnings per share")) latestEarnings = value;
      });

      if (!peRatio || !latestEarnings) {
        const altRows = document.querySelectorAll(".gyFHrc");
        altRows.forEach((row) => {
          const label = row.querySelector(".mfs7Fc")?.textContent?.trim();
          const value = row.querySelector(".P6K39c")?.textContent?.trim();

          if (label === "P/E ratio" && !peRatio) peRatio = value;
          if (label === "Earnings per share" && !latestEarnings) latestEarnings = value;
        });
      }

      return { peRatio, latestEarnings };
    });

    return data;
  } catch (err) {
    console.error(`Error scraping ${ticker}:`, err.message);
    return { peRatio: null, latestEarnings: null };
  } finally {
    releaseTab(page);
  }
};

export default googleScraper;