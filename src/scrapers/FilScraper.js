const { BaseScraper } = require('./BaseScraper');
const { getCodeVariations, isExactCodeMatch, isValidCode, normalizeBrand } = require('../utils/filterNormalizer');
const { USER_AGENT } = require('../config/constants');

class FilScraper extends BaseScraper {
  constructor() {
    super('FİL FİLTRE');
    this.token = null;
    this.tokenExpiry = 0;
  }

  getType() {
    return 'http';
  }

  /**
   * Fil Filter API için güncel x-token değerini dinamik olarak çeker.
   */
  async getToken(forceRefresh = false) {
    if (!forceRefresh && this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    try {
      const res = await fetch('https://catalog.filfilter.com.tr/tr', {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      if (res.ok) {
        const html = await res.text();
        const match =
          html.match(/token\\*":\\*"?([a-f0-9]{32})/i) ||
          html.match(/["\\]*token["\\]*:\s*["\\]*([a-f0-9]{32})/i) ||
          html.match(/"x-token":\s*"([a-f0-9]{32})"/i) ||
          html.match(/"x-catalog-token":\s*"([a-f0-9]{32})"/i);

        if (match && match[1]) {
          this.token = match[1];
          this.tokenExpiry = Date.now() + 10 * 60 * 1000;
          return this.token;
        }
      }
    } catch (e) {
      console.warn('Fil Filter token çekme hatası:', e.message);
    }

    return this.token || '4e2230ff88772fa675eaa82fa55b7cd2';
  }

  getAuthHeaders(token) {
    return {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
      'Origin': 'https://catalog.filfilter.com.tr',
      'Referer': 'https://catalog.filfilter.com.tr/tr',
      'x-token': token,
      'x-catalog-token': token
    };
  }

  async search(code) {
    let token = await this.getToken();
    const variations = getCodeVariations(code);

    const allItems = [];
    const seenItems = new Set();
    let successResponses = 0;
    let lastHttpError = null;

    for (const q of variations) {
      const url = `https://catalog.filfilter.com.tr/api/catalog/search?q=${encodeURIComponent(q)}&lang=tr&limit=100&country=TR`;
      let res = await fetch(url, {
        headers: this.getAuthHeaders(token)
      });

      if (res.status === 401) {
        token = await this.getToken(true);
        res = await fetch(url, {
          headers: this.getAuthHeaders(token)
        });
      }

      if (!res.ok) {
        lastHttpError = `HTTP ${res.status} (${res.statusText || 'API Hatası'})`;
        continue;
      }

      successResponses++;
      const json = await res.json();
      const data = json?.data || [];
      for (const item of data) {
        const key = `${item.artId}_${item.refNo}_${item.manufacturer}`;
        if (!seenItems.has(key)) {
          seenItems.add(key);
          allItems.push(item);
        }
      }
    }

    if (successResponses === 0 && lastHttpError) {
      throw new Error(`Fil Filtre API yanıt vermedi: ${lastHttpError}`);
    }

    const filCodes = [];
    const crossResults = [];
    const matchedArtIds = new Set();

    for (const item of allItems) {
      const artNo = item.artNo;
      const refNo = item.refNo;
      const manufacturer = item.manufacturer;

      const isRefMatch = refNo && isExactCodeMatch(code, refNo);
      const isArtMatch = artNo && isExactCodeMatch(code, artNo);

      if (!isRefMatch && !isArtMatch) {
        continue;
      }

      if (artNo && isValidCode(artNo)) {
        filCodes.push(artNo);
        if (item.artId) matchedArtIds.add(item.artId);
      }

      if (isRefMatch && manufacturer && isValidCode(refNo)) {
        const normBrand = normalizeBrand(manufacturer) || manufacturer;
        if (normBrand && isValidCode(normBrand)) {
          crossResults.push({
            'Üretici Adı': normBrand,
            'Oems': [refNo]
          });
        }
      }
    }

    for (const artId of matchedArtIds) {
      try {
        const pUrl = `https://catalog.filfilter.com.tr/api/catalog/product/${artId}?lang=tr&country=TR`;
        const pRes = await fetch(pUrl, {
          headers: this.getAuthHeaders(token)
        });
        if (pRes.ok) {
          const pJson = await pRes.json();
          const crossRefs = pJson?.data?.crossRefs || [];
          for (const cr of crossRefs) {
            if (cr.refNo && cr.manufacturer && isValidCode(cr.refNo)) {
              const normBrand = normalizeBrand(cr.manufacturer) || cr.manufacturer;
              if (normBrand && isValidCode(normBrand)) {
                crossResults.push({
                  'Üretici Adı': normBrand,
                  'Oems': [cr.refNo]
                });
              }
            }
          }
        }
      } catch (e) {
        // Ürün detay hatası genel aramayı durdurmamalı
      }
    }

    const results = [];
    if (filCodes.length > 0) {
      results.push({ 'Üretici Adı': 'FİL FİLTRE', 'Oems': [...new Set(filCodes)] });
    }
    results.push(...crossResults);
    return results;
  }
}

module.exports = {
  FilScraper
};
