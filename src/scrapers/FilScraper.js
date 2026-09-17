const { BaseScraper } = require('./BaseScraper');
const { isValidCode } = require('../utils/filterNormalizer');

class FilScraper extends BaseScraper {
  constructor() {
    super('FİL FİLTRE');
  }

  getType() {
    return 'browser';
  }

  async search(code, page) {
    if (!page) return [];
    try {
      const formattedCode = code.trim().toLowerCase().replace(/[\s/]+/g, "-");
      const url = "https://catalog.filfilter.com.tr/tr/search/" + encodeURIComponent(formattedCode);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(2500);

      const data = await page.evaluate((searchCode) => {
        function normalize(s) {
          return String(s || "").replace(/[\s()#+\/\-_.]/g, "").toUpperCase();
        }

        const filCodes = [];
        const crossItems = [];
        document.querySelectorAll("table tbody tr").forEach((tr) => {
          const cells = Array.from(tr.querySelectorAll("td")).map((td) => td.innerText.trim());
          if (cells.length >= 2) {
            const infoLines = cells[1].split("\n").map((l) => l.trim()).filter(Boolean);
            const filCode = infoLines[0] || "";
            const brand = infoLines[1] || "";
            const crossCode = infoLines[2] || "";

            const matchCross = crossCode && normalize(crossCode) === normalize(searchCode);
            const matchFil = filCode && normalize(filCode) === normalize(searchCode);

            if (matchCross || matchFil) {
              if (filCode) filCodes.push(filCode);
              if (brand && crossCode) {
                crossItems.push({ "Üretici Adı": brand, "Oems": [crossCode] });
              }
            }
          }
        });
        return { filCodes, crossItems };
      }, code);

      const results = [];
      const validFil = data.filCodes.filter(isValidCode);
      if (validFil.length > 0) {
        results.push({ "Üretici Adı": "FİL FİLTRE", "Oems": [...new Set(validFil)] });
      }
      for (const item of data.crossItems) {
        if (isValidCode(item["Üretici Adı"]) && item.Oems.some(isValidCode)) {
          results.push({ "Üretici Adı": item["Üretici Adı"], "Oems": item.Oems.filter(isValidCode) });
        }
      }
      return results;
    } catch (err) {
      console.error("Fil Filter search error:", err.message);
      return [];
    }
  }
}

module.exports = {
  FilScraper
};
