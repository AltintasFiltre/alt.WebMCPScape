const { BaseScraper } = require('./BaseScraper');
const { isValidCode } = require('../utils/filterNormalizer');

class MahleScraper extends BaseScraper {
  constructor() {
    super('MAHLE');
  }

  getType() {
    return 'browser';
  }

  async search(code, page) {
    if (!page) return [];
    try {
      const cleanCode = code.trim().replace(/\s+/g, "");
      const url = "https://web.tecalliance.net/mahle-catalog/en/parts/search?query=" + encodeURIComponent(cleanCode);
      await page.goto(url, { waitUntil: "networkidle", timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(2000);

      const data = await page.evaluate((searchCode) => {
        const mahleCodes = [];
        const text = document.body.innerText || "";
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (/^(LX|OC|OX|KL|KX|LA|LAK|LAKO|KC|HX|HC|CR)\s*\d+/i.test(line) && line.length < 25) {
            const brandLine = (lines[i + 1] || "").toUpperCase();
            if (brandLine.includes("MAHLE") || brandLine.includes("KNECHT") || brandLine.includes("FILTER")) {
              mahleCodes.push(line);
            }
          }
        }
        return mahleCodes;
      }, cleanCode);

      const validMahle = data.filter(isValidCode);
      if (validMahle.length > 0) {
        return [{ "Üretici Adı": "MAHLE", "Oems": [...new Set(validMahle)] }];
      }
      return [];
    } catch (err) {
      console.error("Mahle search error:", err.message);
      return [];
    }
  }
}

module.exports = {
  MahleScraper
};
