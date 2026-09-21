const { BaseScraper } = require('./BaseScraper');
const { getCodeVariations, isExactCodeMatch, isValidCode, normalizeBrand } = require('../utils/filterNormalizer');
const { USER_AGENT } = require('../config/constants');

class FilScraper extends BaseScraper {
  constructor() {
    super('FİL FİLTRE');
    this.token = 'd16042de9ea2ff17ca20a1afbce6f7f0';
    this.tokenExpiry = 0;
  }

  getType() {
    return 'http';
  }

  async getToken() {
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }
    try {
      const res = await fetch('https://catalog.filfilter.com.tr/tr', {
        headers: { 'User-Agent': USER_AGENT }
      });
      if (res.ok) {
        const html = await res.text();
        const match = html.match(/"token":"([a-f0-9]{32})"/);
        if (match && match[1]) {
          this.token = match[1];
          this.tokenExpiry = Date.now() + 3600 * 1000; // 1 saat geçerli
          return this.token;
        }
      }
    } catch (e) {
      console.warn('Fil Filter token alınamadı, varsayılan token kullanılacak:', e.message);
    }
    return this.token || 'd16042de9ea2ff17ca20a1afbce6f7f0';
  }

  async search(code) {
    try {
      let token = await this.getToken();
      const variations = getCodeVariations(code);

      const allItems = [];
      const seenItems = new Set();

      for (const q of variations) {
        const url = `https://api.filfilter.com.tr/v1/catalog/search?q=${encodeURIComponent(q)}&lang=tr&limit=100&country=TR`;
        let res = await fetch(url, {
          headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
            'Origin': 'https://catalog.filfilter.com.tr',
            'Referer': 'https://catalog.filfilter.com.tr/',
            'x-catalog-token': token
          }
        });

        if (res.status === 401) {
          // Token süresi dolmuşsa yenile ve tekrar dene
          this.tokenExpiry = 0;
          token = await this.getToken();
          res = await fetch(url, {
            headers: {
              'User-Agent': USER_AGENT,
              'Accept': 'application/json',
              'Origin': 'https://catalog.filfilter.com.tr',
              'Referer': 'https://catalog.filfilter.com.tr/',
              'x-catalog-token': token
            }
          });
        }

        if (!res.ok) continue;

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

      // Eşleşen ürünlerin varsa detay endpoint'inden tüm cross referanslarını zenginleştir
      for (const artId of matchedArtIds) {
        try {
          const pUrl = `https://api.filfilter.com.tr/v1/catalog/product/${artId}?lang=tr&country=TR`;
          const pRes = await fetch(pUrl, {
            headers: {
              'User-Agent': USER_AGENT,
              'Accept': 'application/json',
              'Origin': 'https://catalog.filfilter.com.tr',
              'Referer': 'https://catalog.filfilter.com.tr/',
              'x-catalog-token': token
            }
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
    } catch (err) {
      console.error('Fil Filter search error:', err.message);
      return [];
    }
  }
}

module.exports = {
  FilScraper
};
