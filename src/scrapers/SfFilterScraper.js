const { BaseScraper } = require('./BaseScraper');
const { isExactCodeMatch, isValidCode } = require('../utils/filterNormalizer');
const { USER_AGENT } = require('../config/constants');

class SfFilterScraper extends BaseScraper {
  constructor() {
    super('SF-FILTER');
  }

  async search(code) {
    try {
      const url = "https://www.sf-filter.com/api/search/serp/result?filter=filters&limit=50&offset=0&query=" + encodeURIComponent(code.trim());
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "application/json"
        }
      });
      if (!res.ok) return [];
      const data = await res.json();
      const items = Array.isArray(data?.payload) ? data.payload : [];

      const sfCodes = [];
      const crossResults = [];

      for (const item of items) {
        const sfNumber = item.number || item.item?.title;
        const origNumber = item.originalNumber;
        const origBrand = item.originalManufacturer || item.brand;

        const matchOrig = origNumber && isExactCodeMatch(code, origNumber);
        const matchSf = sfNumber && isExactCodeMatch(code, sfNumber);

        if (matchOrig || matchSf) {
          if (sfNumber && isValidCode(sfNumber)) {
            sfCodes.push(sfNumber);
          }
          if (origNumber && isValidCode(origNumber) && origBrand) {
            crossResults.push({ "Üretici Adı": origBrand, "Oems": [origNumber] });
          }
        }
      }

      const results = [];
      if (sfCodes.length > 0) {
        results.push({ "Üretici Adı": "SF-FILTER", "Oems": [...new Set(sfCodes)] });
      }
      results.push(...crossResults);
      return results;
    } catch (err) {
      console.error("SF-Filter search error:", err.message);
      return [];
    }
  }
}

module.exports = {
  SfFilterScraper
};
