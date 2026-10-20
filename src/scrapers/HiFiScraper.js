const { BaseScraper } = require('./BaseScraper');
const { isExactCodeMatch, isValidCode, normalizeBrand } = require('../utils/filterNormalizer');

/**
 * HiFiScraper
 * 
 * HiFi Filter Global E-Catalog (catalog.hifi-filter.com) cross-reference scraper'ı.
 */
class HiFiScraper extends BaseScraper {
  constructor() {
    super('HiFi');
  }

  getType() {
    return 'browser';
  }

  async search(code, page) {
    if (!page) throw new Error('Tarayıcı oturumu başlatılamadı.');

    const queryCode = String(code || '').trim();
    if (!queryCode) return [];

    let crossData = null;
    let prodData = null;
    let ssoBlockedStatus = null;
    let apiErrorStatus = null;

    const responseHandler = async (res) => {
      try {
        const url = res.url();
        const status = res.status();
        if (url.includes('/assets/silent-check-sso.html') && status >= 400) {
          ssoBlockedStatus = status;
        }
        if (url.includes('/api/cross-reference/search')) {
          if (status === 200) {
            crossData = await res.json();
          } else {
            apiErrorStatus = status;
          }
        } else if (url.includes('/api/product/search')) {
          if (status === 200) {
            prodData = await res.json();
          }
        }
      } catch (e) {
        // Ignore JSON parse errors for non-JSON or aborts
      }
    };

    page.on('response', responseHandler);

    const targetUrl = `https://catalog.hifi-filter.com/en-GB/search/global/cross-reference?q=${encodeURIComponent(queryCode)}`;
    const navRes = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });

    if (navRes && navRes.status() >= 400) {
      page.off('response', responseHandler);
      throw new Error(`HiFi sayfası erişim hatası döndürdü: HTTP ${navRes.status()}`);
    }

    const deadline = Date.now() + 8000;
    while (!crossData && Date.now() < deadline) {
      await page.waitForTimeout(400);
    }
    page.off('response', responseHandler);

    // Eğer ne crossData ne prodData geldiyse, Cloudflare veya SSO engeli olup olmadığını kontrol et
    if (!crossData && !prodData) {
      const title = await page.title().catch(() => '');
      if (title.includes('Just a moment') || title.includes('Attention Required') || ssoBlockedStatus === 403) {
        throw new Error(`Cloudflare / Güvenlik Engeli (HTTP ${ssoBlockedStatus || 403})`);
      }
      if (apiErrorStatus) {
        throw new Error(`HiFi Arama API Hatası: HTTP ${apiErrorStatus}`);
      }
    }

    const hifiCodes = new Set();
    const crossResults = [];

    if (crossData && Array.isArray(crossData.results)) {
      for (const item of crossData.results) {
        const refCode = item.reference || '';
        const brandObj = item.brand || {};
        const brandName = brandObj.name || '';
        const products = Array.isArray(item.products) ? item.products : [];

        const isMatch = isExactCodeMatch(queryCode, refCode);

        for (const prod of products) {
          const hifiRef = prod.reference || prod.number;
          if (hifiRef && isValidCode(hifiRef)) {
            if (isMatch || isExactCodeMatch(queryCode, hifiRef)) {
              hifiCodes.add(hifiRef.trim().toUpperCase());
            }
          }
        }

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
  }
}

module.exports = {
  HiFiScraper
};
