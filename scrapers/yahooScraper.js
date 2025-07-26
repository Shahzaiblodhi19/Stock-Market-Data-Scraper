import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { setTimeout as wait } from "timers/promises"; // fix for waitForTimeout

puppeteer.use(StealthPlugin());

const MAX_CONCURRENT_TABS = 3;
let browserInstance = null;
let browserLaunchingPromise = null;
let tabPool = [];

/**
 * Launch Puppeteer in headless stealth mode.
 */
async function launchBrowser() {
  if (browserInstance) return browserInstance;
  if (browserLaunchingPromise) return browserLaunchingPromise;

  browserLaunchingPromise = (async () => {
    const browser = await puppeteer.launch({
      headless: "new",
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
    console.log("✅ Launched Chromium in headless stealth mode");
    browserInstance = browser;
    return browser;
  })();

  const result = await browserLaunchingPromise;
  browserLaunchingPromise = null;
  return result;
}

/**
 * Initialize a pool of reusable tabs.
 */
async function initTabPool() {
  const browser = await launchBrowser();
  while (tabPool.length < MAX_CONCURRENT_TABS) {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });
    tabPool.push(page);
  }
}

/**
 * Get an available tab from the pool.
 */
function getTab() {
  return tabPool.shift();
}

/**
 * Release a tab back to the pool.
 */
function releaseTab(tab) {
  tabPool.push(tab);
}

/**
 * Scrape Yahoo Finance for CMP (Current Market Price).
 * @param {string} ticker
 * @returns {Promise<{ cmp: number | null }>}
 */
async function yahooScraper(ticker) {
  if (tabPool.length === 0) await initTabPool();
  const page = getTab();

  if (!page) {
    console.error(`❌ No tab available for ${ticker}`);
    return { cmp: null };
  }

  try {
    const url = `https://finance.yahoo.com/quote/${ticker}`;
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    await page.waitForSelector('fin-streamer[data-field="regularMarketPrice"]', {
      timeout: 15000,
    });

    await wait(1500); // replaces waitForTimeout

    const cmp = await page.$eval(
      'fin-streamer[data-field="regularMarketPrice"]',
      el => parseFloat(el.textContent.replace(/,/g, ""))
    );

    if (isNaN(cmp)) throw new Error("Parsed CMP is NaN");

    return { cmp };
  } catch (err) {
    console.error(`❌ Error fetching CMP for ${ticker}:`, err.message);
    return { cmp: null };
  } finally {
    releaseTab(page);
  }
}

export default yahooScraper;
