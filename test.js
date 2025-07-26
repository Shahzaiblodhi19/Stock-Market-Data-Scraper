import yahooScraper from "./scrapers/yahooScraper.js";
import googleScraper from "./scrapers/googleScraper.js";

(async () => {
  const tickers = ["AAPL", "AMZN", "GOOG"];

  for (const ticker of tickers) {
    const { cmp } = await yahooScraper(ticker);
    console.log(`${ticker}: ${cmp}`);
  }

  process.exit(0);
})();


// (async () => {
//   const result = await googleScraper("AAPL");
//   console.log(result);
// })();
