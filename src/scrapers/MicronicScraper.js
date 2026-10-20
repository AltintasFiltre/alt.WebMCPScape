const cheerio = require('cheerio');
const { BaseScraper } = require('./BaseScraper');
const { isExactCodeMatch, isValidCode } = require('../utils/filterNormalizer');
const { USER_AGENT } = require('../config/constants');

class MicronicScraper extends BaseScraper {
  constructor() {
    super('MICRONIC');
  }

  async search(code) {
    const url = "https://catalog.micronicfilter.com/product-search-result/?code=" + encodeURIComponent(code.trim());
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    if (!res.ok) {
      throw new Error(`Micronic erişim hatası: HTTP ${res.status}`);
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    const micronicCodes = [];
    const crossResults = [];

    $("table tr").each((i, row) => {
      const cells = $(row).find("td").map((j, td) => $(td).text().trim()).get();
      if (cells.length >= 4) {
        const searchedCode = cells[1];
        const manufacturer = cells[2];
        const micronicFilter = cells[3];

        if (isExactCodeMatch(code, searchedCode)) {
          if (isValidCode(micronicFilter)) {
            micronicCodes.push(micronicFilter);
          }
          if (isValidCode(searchedCode) && isValidCode(manufacturer)) {
            crossResults.push({ "Üretici Adı": manufacturer, "Oems": [searchedCode] });
          }
        }
      }
    });

    const results = [];
    if (micronicCodes.length > 0) {
      results.push({ "Üretici Adı": "MICRONIC", "Oems": [...new Set(micronicCodes)] });
    }
    results.push(...crossResults);
    return results;
  }
}

module.exports = {
  MicronicScraper
};
