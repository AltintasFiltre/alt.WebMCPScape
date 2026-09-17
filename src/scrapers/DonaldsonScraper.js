const cheerio = require('cheerio');
const { BaseScraper } = require('./BaseScraper');
const { isExactCodeMatch, isValidCode } = require('../utils/filterNormalizer');
const { USER_AGENT } = require('../config/constants');

class DonaldsonScraper extends BaseScraper {
  constructor() {
    super('DONALDSON');
  }

  async search(code) {
    try {
      const cleanCode = code.trim().replace(/\s+/g, "");
      const url = "https://shop.donaldson.com/store/tr-tr/search?Ntt=" + encodeURIComponent(cleanCode + "*") + "&Ntk=All";
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"
        }
      });
      if (!res.ok) return [];
      const html = await res.text();
      const $ = cheerio.load(html);

      const donaldsonCodes = [];
      const crossResults = [];

      $(".listTile").each((i, el) => {
        const partNum = $(el).find("a[href*=\"/product/\"], .part-number, h2, h3").first().text().trim().replace(/#.*/, "").trim();
        const mfgBlock = $(el).find(".part-details-search, .manufacturer-details");
        const spans = mfgBlock.find("span").map((j, s) => $(s).text().trim()).get().filter(Boolean);

        let matched = false;

        for (const spanText of spans) {
          if (isExactCodeMatch(code, spanText)) {
            matched = true;
            break;
          }
        }

        if (isExactCodeMatch(code, partNum)) {
          matched = true;
        }

        if (matched) {
          if (isValidCode(partNum)) {
            donaldsonCodes.push(partNum);
          }

          if (spans.length >= 2) {
            const brandName = spans[0];
            const partCode = spans[1];
            if (isExactCodeMatch(code, partCode) && isValidCode(brandName)) {
              crossResults.push({ "Üretici Adı": brandName, "Oems": [partCode] });
            }
          }
        }
      });

      const results = [];
      if (donaldsonCodes.length > 0) {
        results.push({ "Üretici Adı": "DONALDSON", "Oems": [...new Set(donaldsonCodes)] });
      }
      results.push(...crossResults);
      return results;
    } catch (err) {
      console.error("Donaldson search error:", err.message);
      return [];
    }
  }
}

module.exports = {
  DonaldsonScraper
};
