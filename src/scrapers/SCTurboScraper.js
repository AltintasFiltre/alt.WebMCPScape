const { BaseScraper } = require('./BaseScraper');
const { getCodeVariations, isExactCodeMatch, isValidCode } = require('../utils/filterNormalizer');
const { USER_AGENT } = require('../config/constants');

class SCTurboScraper extends BaseScraper {
  constructor() {
    super('SCTURBO');
  }

  getType() {
    return 'http';
  }

  async search(code) {
    try {
      const variations = getCodeVariations(code);
      const scTurboCodes = new Set();

      for (const query of variations) {
        const response = await fetch('https://www.scturbofiltre.com/ajax-search-control', {
          method: 'POST',
          headers: {
            'User-Agent': USER_AGENT,
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: `search=${encodeURIComponent(query)}&dil=varsayilan`
        });

        if (!response.ok) continue;

        let items = [];
        try {
          items = await response.json();
        } catch (e) {
          continue;
        }

        if (!Array.isArray(items)) continue;

        for (const item of items) {
          if (!item || !item.urun) continue;

          // Aranan kod ile item.kod veya item.urun tam eşleştiğinde ekle
          const matchedCross = item.kod && isExactCodeMatch(code, item.kod);
          const matchedUrun = item.urun && isExactCodeMatch(code, item.urun);

          if (matchedCross || matchedUrun) {
            const scCode = item.urun.trim();
            if (isValidCode(scCode)) {
              scTurboCodes.add(scCode);
            }
          }
        }
      }

      if (scTurboCodes.size === 0) {
        return [];
      }

      return [
        {
          "Üretici Adı": "SCTURBO",
          "Oems": Array.from(scTurboCodes)
        }
      ];
    } catch (err) {
      console.error("SCTurbo search error:", err.message);
      return [];
    }
  }
}

module.exports = {
  SCTurboScraper
};
