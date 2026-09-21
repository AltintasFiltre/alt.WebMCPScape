const { BaseScraper } = require('./BaseScraper');
const { isExactCodeMatch, isValidCode, normalizeBrand } = require('../utils/filterNormalizer');

class SampiyonScraper extends BaseScraper {
  constructor() {
    super('ŞAMPİYON');
  }

  getType() {
    return 'browser';
  }

  async search(code, page) {
    if (!page) return [];
    try {
      const cleanCode = code.trim().replace(/\s+/g, '');
      const url = `https://www.sampiyonfilter.com.tr/katalog/koda-gore-arama?s=${encodeURIComponent(cleanCode)}#h`;
      
      // Sayfa yükleme hızını 5x artırmak için gereksiz resim, font ve analitik isteklerini engelle
      await page.route('**/*', (route) => {
        const type = route.request().resourceType();
        const reqUrl = route.request().url();
        if (['image', 'media', 'font'].includes(type) || reqUrl.includes('google') || reqUrl.includes('analytics') || reqUrl.includes('facebook')) {
          return route.abort();
        }
        return route.continue();
      }).catch(() => {});

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      
      // Tablo satırlarının veya sonuç yok uyarısının render edilmesini bekle
      await page.waitForSelector('table tbody tr, .alert-warning, .card-body', { timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(600);

      const rawRows = await page.evaluate(() => {
        const rows = [];
        document.querySelectorAll('table tbody tr').forEach((tr) => {
          const cells = Array.from(tr.querySelectorAll('td')).map((td) => td.innerText.trim());
          if (cells.length >= 4) {
            rows.push({
              kod: cells[1] || '',
              uretici: cells[2] || '',
              sampiyonKodu: cells[3] || ''
            });
          }
        });
        return rows;
      });

      const sampiyonCodes = [];
      const crossResults = [];

      for (const row of rawRows) {
        const kod = row.kod;
        const uretici = row.uretici;
        const sampiyonKodu = row.sampiyonKodu;

        const isKodMatch = kod && isExactCodeMatch(code, kod);
        const isSampMatch = sampiyonKodu && isExactCodeMatch(code, sampiyonKodu);

        if (!isKodMatch && !isSampMatch) {
          continue;
        }

        if (sampiyonKodu && isValidCode(sampiyonKodu)) {
          sampiyonCodes.push(sampiyonKodu);
        }

        if (isKodMatch && uretici && kod && isValidCode(kod)) {
          const normBrand = normalizeBrand(uretici) || uretici;
          if (normBrand && isValidCode(normBrand)) {
            crossResults.push({
              'Üretici Adı': normBrand,
              'Oems': [kod]
            });
          }
        }
      }

      const results = [];
      if (sampiyonCodes.length > 0) {
        results.push({ 'Üretici Adı': 'ŞAMPİYON', 'Oems': [...new Set(sampiyonCodes)] });
      }
      results.push(...crossResults);
      return results;
    } catch (err) {
      console.error('Sampiyon search error:', err.message);
      return [];
    }
  }
}

module.exports = {
  SampiyonScraper
};
