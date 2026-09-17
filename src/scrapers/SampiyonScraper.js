const { BaseScraper } = require('./BaseScraper');
const { isValidCode } = require('../utils/filterNormalizer');

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
      const cleanCode = code.replace(/\s+/g, "");
      const url = "https://www.sampiyonfilter.com.tr/katalog/koda-gore-arama?s=" + encodeURIComponent(cleanCode) + "#h";
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(2000);

      const data = await page.evaluate((searchCode) => {
        function normalize(s) {
          return String(s || "").replace(/[\s()#+]/g, "").toUpperCase();
        }

        const sampiyonCodes = [];
        const crossItems = [];
        document.querySelectorAll("table tr").forEach((tr) => {
          const cells = Array.from(tr.querySelectorAll("td")).map((td) => td.innerText.trim());
          if (cells.length >= 4) {
            const kod = cells[1];
            const uretici = cells[2];
            const sampiyonKodu = cells[3];

            if (normalize(kod) === normalize(searchCode)) {
              if (sampiyonKodu) {
                sampiyonCodes.push(sampiyonKodu);
              }
              if (uretici && kod) {
                crossItems.push({ "Üretici Adı": uretici, "Oems": [kod] });
              }
            }
          }
        });
        return { sampiyonCodes, crossItems };
      }, code);

      const results = [];
      const validSamp = data.sampiyonCodes.filter(isValidCode);
      if (validSamp.length > 0) {
        results.push({ "Üretici Adı": "ŞAMPİYON", "Oems": [...new Set(validSamp)] });
      }
      for (const item of data.crossItems) {
        if (isValidCode(item["Üretici Adı"]) && item.Oems.some(isValidCode)) {
          results.push({ "Üretici Adı": item["Üretici Adı"], "Oems": item.Oems.filter(isValidCode) });
        }
      }
      return results;
    } catch (err) {
      console.error("Sampiyon search error:", err.message);
      return [];
    }
  }
}

module.exports = {
  SampiyonScraper
};
