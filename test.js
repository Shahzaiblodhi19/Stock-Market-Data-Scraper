import yahooScraper from "./scrapers/yahooScraper.js";
import googleScraper from "./scrapers/googleScraper.js";

(async () => {
  const result = await yahooScraper("AAPL");
  console.log(result);
})();

(async () => {
  const result = await googleScraper("AAPL");
  console.log(result);
})();
