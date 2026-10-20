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
    const variations = getCodeVariations(code);
    const scTurboCodes = new Set();
    let successResponses = 0;
    let lastHttpError = null;

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

      if (!response.ok) {
        lastHttpError = `HTTP ${response.status}`;
        continue;
      }

      successResponses++;
      let items = [];
      try {
        items = await response.json();
      } catch (e) {
        continue;
      }

      if (!Array.isArray(items)) continue;

      for (const item of items) {
        if (!item || !item.urun) continue;

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

    if (successResponses === 0 && lastHttpError) {
      throw new Error(`SCTurbo API hatası: ${lastHttpError}`);
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
  }
}

module.exports = {
  SCTurboScraper
};
