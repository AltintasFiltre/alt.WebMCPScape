const { BaseScraper } = require('./BaseScraper');
const { isExactCodeMatch, isValidCode, normalizeBrand } = require('../utils/filterNormalizer');

/**
 * HiFiScraper
 * 
 * HiFi Filter Global E-Catalog (catalog.hifi-filter.com) cross-reference scraper'ı.
 * Cloudflare korumalı SPA katalogda Playwright browser üzerinden hem REST API yanıtlarını
 * hem de DOM yapısını yakalayarak yüksek doğrulukla HiFi ve üretici kodlarını çıkarır.
 */
class HiFiScraper extends BaseScraper {
  constructor() {
    super('HiFi');
  }

  getType() {
    return 'browser';
  }

  async search(code, page) {
    if (!page) return [];

    try {
      const queryCode = String(code || '').trim();
      if (!queryCode) return [];

      let crossData = null;
      let prodData = null;

      const responseHandler = async (res) => {
        try {
          const url = res.url();
          if (url.includes('/api/cross-reference/search')) {
            crossData = await res.json();
          } else if (url.includes('/api/product/search')) {
            prodData = await res.json();
          }
        } catch (e) {
          // Ignore JSON parse errors for non-JSON or aborts
        }
      };

      page.on('response', responseHandler);

      const targetUrl = `https://catalog.hifi-filter.com/en-GB/search/global/cross-reference?q=${encodeURIComponent(queryCode)}`;
      
      try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
      } catch (navErr) {
        // Fallback wait if timeout occurs on heavy assets
      }

      // SPA API çağrılarının tamamlanması için kısa bekleme
      await page.waitForTimeout(4000);
      page.off('response', responseHandler);

      const hifiCodes = new Set();
      const crossResults = [];

      // 1. Cross-Reference API Verilerini İşleme
      if (crossData && Array.isArray(crossData.results)) {
        for (const item of crossData.results) {
          const refCode = item.reference || '';
          const brandObj = item.brand || {};
          const brandName = brandObj.name || '';
          const products = Array.isArray(item.products) ? item.products : [];

          const isMatch = isExactCodeMatch(queryCode, refCode);

          // Eşleşen ürünlerdeki HiFi kodlarını topla
          for (const prod of products) {
            const hifiRef = prod.reference || prod.number;
            if (hifiRef && isValidCode(hifiRef)) {
              if (isMatch || isExactCodeMatch(queryCode, hifiRef)) {
                hifiCodes.add(hifiRef.trim().toUpperCase());
              }
            }
          }

          // Çapraz üretici referansı
          if (isMatch && brandName && isValidCode(refCode)) {
            const normBrand = normalizeBrand(brandName) || brandName.trim();
            if (normBrand) {
              crossResults.push({
                'Üretici Adı': normBrand,
                'Oems': [refCode.trim().toUpperCase()]
              });
            }
          }
        }
      }

      // 2. Doğrudan Ürün Arama API Verilerini İşleme (Aranan kod HiFi kodu ise)
      if (prodData && Array.isArray(prodData.results)) {
        for (const prod of prodData.results) {
          const hifiRef = prod.reference || prod.number;
          if (hifiRef && isValidCode(hifiRef)) {
            if (isExactCodeMatch(queryCode, hifiRef)) {
              hifiCodes.add(hifiRef.trim().toUpperCase());
            }
          }
        }
      }

      // 3. DOM Fallback (Eğer API yakalanamadıysa doğrudan sayfa kartlarından parse et)
      if (hifiCodes.size === 0) {
        try {
          const domResults = await page.evaluate((q) => {
            const list = [];
            document.querySelectorAll('article.product-row, .product-row').forEach((row) => {
              const text = row.innerText || '';
              const link = row.querySelector('a[href*="/product/"]');
              const hifiCode = link ? link.innerText.trim() : '';
              list.push({ text, hifiCode });
            });
            return list;
          }, queryCode);

          for (const item of domResults) {
            if (item.hifiCode && isValidCode(item.hifiCode)) {
              hifiCodes.add(item.hifiCode.trim().toUpperCase());
            }
          }
        } catch (e) {}
      }

      const results = [];
      if (hifiCodes.size > 0) {
        results.push({
          'Üretici Adı': 'HiFi',
          'Oems': Array.from(hifiCodes)
        });
      }

      results.push(...crossResults);
      return results;
    } catch (err) {
      console.error('HiFi search error:', err.message);
      return [];
    }
  }
}

module.exports = {
  HiFiScraper
};
