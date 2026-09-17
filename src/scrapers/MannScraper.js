const { BaseScraper } = require('./BaseScraper');
const { getCodeVariations, isExactCodeMatch, isValidCode, normalizeBrand } = require('../utils/filterNormalizer');
const { USER_AGENT } = require('../config/constants');

class MannScraper extends BaseScraper {
  constructor() {
    super('MANN-FILTER');
  }

  async search(code) {
    try {
      const q = "query($search:String!){search_crossreference_no(search:$search,pageSize:50){items{sales_designation ext_brand_name ext_product_name}}}";
      const variations = getCodeVariations(code);

      const allItems = [];
      for (const c of variations) {
        const vars = JSON.stringify({ search: c });
        const url = "https://www.mann-filter.com/api/graphql/catalog-prod?query=" + encodeURIComponent(q) + "&variables=" + encodeURIComponent(vars);
        const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
        if (res.ok) {
          const data = await res.json();
          const items = data?.data?.search_crossreference_no?.items || [];
          allItems.push(...items);
        }
      }

      const mannCodes = [];
      const otherResults = [];

      for (const item of allItems) {
        if (!item.sales_designation || !isValidCode(item.sales_designation)) {
          continue;
        }

        const extName = item.ext_product_name;
        const mannDesignation = item.sales_designation;

        const isExtMatch = extName && isExactCodeMatch(code, extName);
        const isMannMatch = mannDesignation && isExactCodeMatch(code, mannDesignation);

        if (!isExtMatch && !isMannMatch) {
          continue;
        }

        mannCodes.push(mannDesignation);

        if (isExtMatch && item.ext_brand_name && isValidCode(extName)) {
          const normBrand = normalizeBrand(item.ext_brand_name);
          if (normBrand) {
            otherResults.push({
              "Üretici Adı": normBrand,
              "Oems": [extName]
            });
          }
        }
      }

      const results = [];
      if (mannCodes.length > 0) {
        results.push({ "Üretici Adı": "MANN-FILTER", "Oems": [...new Set(mannCodes)] });
      }
      results.push(...otherResults);
      return results;
    } catch (err) {
      console.error("Mann search error:", err.message);
      return [];
    }
  }
}

module.exports = {
  MannScraper
};
