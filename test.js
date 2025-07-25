const yahooScraper = require("./scrapers/yahooScraper");
const googleScraper = require("./scrapers/googleScraper");

(async () => {
  const result = await yahooScraper("AAPL");
  console.log(result);
})();

(async () => {
  const result = await googleScraper("AAPL");
  console.log(result);
})();
