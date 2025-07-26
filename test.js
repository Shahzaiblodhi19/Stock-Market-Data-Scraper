import yahooScraper from "./scrapers/yahooScraper.js";
import googleScraper from "./scrapers/googleScraper.js";

const run = async () => {
  const result = await yahooScraper("AAPL");
  console.log("AAPL CMP:", result.cmp);
};

run();
// (async () => {
//   const result = await googleScraper("AAPL");
//   console.log(result);
// })();
