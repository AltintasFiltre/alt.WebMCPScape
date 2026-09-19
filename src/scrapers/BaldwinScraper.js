const { BaseScraper } = require('./BaseScraper');
const { getCodeVariations, isExactCodeMatch, isValidCode, normalizeBrand } = require('../utils/filterNormalizer');
const { USER_AGENT } = require('../config/constants');

class BaldwinScraper extends BaseScraper {
  constructor() {
    super('BALDWIN');
  }

  getType() {
    return 'http';
  }

  async search(code) {
    try {
      const variations = getCodeVariations(code);
      const baldwinCodes = new Set();
      const crossResults = [];
      const visitedQueries = new Set();

      for (const query of variations) {
        const cleanCode = query.replace(/[^a-zA-Z0-9]/g, "").replace(/^0+/, "").toUpperCase();
        if (!cleanCode || visitedQueries.has(cleanCode)) continue;
        visitedQueries.add(cleanCode);

        const solrQuery = `https://api.parker.com/prod/baldwinsearch/BaldwinECatalog/select?fq=coreName_s:BaldwinCrossRefData&=&wt=json&indent=true&group=true&group.offset=0&group.query=compPartId_s:("${cleanCode}"%20OR%20${cleanCode}*%20OR%20*${cleanCode}*)&q=compPartId_s:("${cleanCode}"%20OR%20${cleanCode}*)^1%20OR%20partNumber_s:("${cleanCode}"%20OR%20${cleanCode}*)^2&group.limit=25`;

        const payload = {
          url: solrQuery,
          keyType: "appVinXrefSearchAPIKey",
          requestType: "GET",
          data: JSON.stringify({ partNumber: [query], type: "crossRef" })
        };

        const response = await fetch("https://www.baldwinfilters.com/bin/baldwinfilters/proxy", {
          method: "POST",
          headers: {
            "User-Agent": USER_AGENT,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) continue;

        let json = null;
        try {
          json = await response.json();
        } catch (e) {
          continue;
        }

        if (json && json.grouped) {
          for (const groupKey of Object.keys(json.grouped)) {
            const docs = json.grouped[groupKey]?.doclist?.docs || [];
            for (const doc of docs) {
              const compCode = doc.compPartId_s || doc.partNumber_s || "";
              const baldwinCode = doc.baldwinPartId_s || "";
              const mfg = doc.manufacturer_s || "";

              // Katı tam eşleşme kontrolü
              const matchComp = compCode && isExactCodeMatch(code, compCode);
              const matchBaldwin = baldwinCode && isExactCodeMatch(code, baldwinCode);

              if (matchComp || matchBaldwin) {
                if (isValidCode(baldwinCode)) {
                  baldwinCodes.add(baldwinCode.trim().toUpperCase());
                }
                if (mfg && compCode && isValidCode(compCode)) {
                  const normBrand = normalizeBrand(mfg) || mfg.trim();
                  if (normBrand) {
                    crossResults.push({
                      "Üretici Adı": normBrand,
                      "Oems": [compCode.trim().toUpperCase()]
                    });
                  }
                }
              }
            }
          }
        }
      }

      const results = [];
      if (baldwinCodes.size > 0) {
        results.push({
          "Üretici Adı": "BALDWIN",
          "Oems": Array.from(baldwinCodes)
        });
      }
      results.push(...crossResults);
      return results;
    } catch (err) {
      console.error("Baldwin search error:", err.message);
      return [];
    }
  }
}

module.exports = {
  BaldwinScraper
};
