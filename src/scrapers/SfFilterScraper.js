const { BaseScraper } = require('./BaseScraper');
const { getCodeVariations, isExactCodeMatch, isValidCode, normalizeBrand } = require('../utils/filterNormalizer');
const { USER_AGENT } = require('../config/constants');

class SfFilterScraper extends BaseScraper {
  constructor() {
    super('SF-FILTER');
  }

  async search(code) {
    const variations = getCodeVariations(code);
    const sfCodes = [];
    const crossResults = [];
    const seenKeys = new Set();
    let successResponses = 0;
    let lastHttpError = null;

    for (const q of variations) {
      const url = `https://www.sf-filter.com/api/search/serp/result?filter=products&limit=50&offset=0&query=${encodeURIComponent(q)}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "application/json"
        }
      });
      if (!res.ok) {
        lastHttpError = `HTTP ${res.status} (${res.statusText || 'API Hatası'})`;
        continue;
      }

      successResponses++;
      const data = await res.json();
      const items = Array.isArray(data?.payload) ? data.payload : [];

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
            const normBrand = normalizeBrand(origBrand) || origBrand;
            const key = `${normBrand}_${origNumber}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              crossResults.push({ "Üretici Adı": normBrand, "Oems": [origNumber] });
            }
          }
        }
      }
    }

    if (successResponses === 0 && lastHttpError) {
      throw new Error(`SF-Filter API hatası: ${lastHttpError}`);
    }

    const results = [];
    if (sfCodes.length > 0) {
      results.push({ "Üretici Adı": "SF-FILTER", "Oems": [...new Set(sfCodes)] });
    }
    results.push(...crossResults);
    return results;
  }
}

module.exports = {
  SfFilterScraper
};
