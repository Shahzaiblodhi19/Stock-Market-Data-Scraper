import puppeteer  from "puppeteer-core";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DEBUGGING_URL = "http://localhost:9222";
const MAX_CONCURRENT_TABS = 3;

let browserInstance = null;
let browserLaunchingPromise = null;
let tabPool = [];

const connectOrLaunchBrowser = async () => {
  if (browserInstance) return browserInstance;
  if (browserLaunchingPromise) return browserLaunchingPromise;

  browserLaunchingPromise = (async () => {
    try {
      const browser = await puppeteer.connect({
        browserURL: DEBUGGING_URL,
        defaultViewport: null,
      });
      console.log("Connected to existing Chrome instance to run Google Scraper");
      browserInstance = browser;
    } catch {
      console.warn("No running Chrome detected, launching a new one...");
      const browser = await puppeteer.launch({
        headless: false,
        executablePath: CHROME_PATH,
        args: ["--remote-debugging-port=9222"],
        defaultViewport: null,
      });
      console.log("Launched new Chrome instance");
      browserInstance = browser;
    }
    return browserInstance;
  })();

  const result = await browserLaunchingPromise;
  browserLaunchingPromise = null;
  return result;
};

const initTabPool = async () => {
  const browser = await connectOrLaunchBrowser();
  while (tabPool.length < MAX_CONCURRENT_TABS) {
    const page = await browser.newPage();
    tabPool.push(page);
  }
};

const getTab = () => {
  return tabPool.shift();
};

const releaseTab = (tab) => {
  tabPool.push(tab);
};

const googleScraper = async (ticker) => {
  if (tabPool.length === 0) await initTabPool();

  const page = getTab();

  try {
    await page.goto(`https://www.google.com/finance/quote/${ticker}:NASDAQ`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    await page.waitForSelector("tr.roXhBd, .gyFHrc", { timeout: 7000 });

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