import puppeteer  from "puppeteer-core";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DEBUGGING_URL = "http://localhost:9222";
const MAX_CONCURRENT_TABS = 3;

let browserInstance = null;
let browserLaunchingPromise = null;
let tabPool = [];

/**
 * Connects to existing Chrome or launches a new one.
 */
async function connectOrLaunchBrowser() {
  if (browserInstance) return browserInstance;
  if (browserLaunchingPromise) return browserLaunchingPromise;

  browserLaunchingPromise = (async () => {
    try {
      const browser = await puppeteer.connect({
        browserURL: DEBUGGING_URL,
        defaultViewport: null,
      });
      console.log("✅ Connected to existing Chrome instance");
      browserInstance = browser;
    } catch {
      console.warn("🚀 No running Chrome detected, launching a new one...");
      const browser = await puppeteer.launch({
        headless: false,
        executablePath: CHROME_PATH,
        args: ["--remote-debugging-port=9222", "--disable-features=site-per-process"],
        defaultViewport: null,
      });
      console.log("✅ Launched new Chrome instance");
      browserInstance = browser;
    }
    return browserInstance;
  })();

  const result = await browserLaunchingPromise;
  browserLaunchingPromise = null;
  return result;
}

/**
 * Initializes a pool of tabs
 */
async function initTabPool() {
  const browser = await connectOrLaunchBrowser();
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

/**
 * Scrape Yahoo Finance for CMP
 * @param {string} ticker
 * @returns {Promise<{ cmp: number | null }>}
 */
async function yahooScraper(ticker) {
  if (tabPool.length === 0) await initTabPool();
  const page = getTab();

  try {
    const url = `https://finance.yahoo.com/quote/${ticker}`;
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });

    // Wait until price element appears or fallback after delay
    const selector = 'fin-streamer[data-field="regularMarketPrice"]';
    await page.waitForSelector(selector, { timeout: 15000 });

    const cmp = await page.$eval(selector, el =>
      parseFloat(el.textContent.replace(/,/g, ""))
    );

    if (isNaN(cmp)) throw new Error("Invalid CMP parsed");

    return { cmp };
  } catch (err) {
    console.error(`❌ Error fetching CMP for ${ticker}:`, err.message);
    return { cmp: null };
  } finally {
    releaseTab(page); // Don't close, reuse
  }
}

export default yahooScraper;
