const { BaseScraper } = require('./BaseScraper');
const { isValidCode } = require('../utils/filterNormalizer');

class FleetguardScraper extends BaseScraper {
  constructor() {
    super('FLEETGUARD');
  }

  getType() {
    return 'browser';
  }

  async search(code, page) {
    if (!page) return [];
    try {
      const cleanCode = code.replace(/\s+/g, "");
      await page.goto("https://www.fleetguard.com", { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(2500);

      const searchInput = await page.$("input[type=\"search\"], input[placeholder*=\"Search\"], input.search-input");
      if (searchInput) {
        await searchInput.fill(cleanCode);
        await page.keyboard.press("Enter");
        await page.waitForTimeout(5000);

        const fleetguardCodes = await page.evaluate(() => {
          function findRoots(node) {
            let roots = [node];
            const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
            while (walker.nextNode()) {
              const el = walker.currentNode;
              if (el.shadowRoot) roots = roots.concat(findRoots(el.shadowRoot));
            }
            return [...new Set(roots)];
          }

          const allRoots = findRoots(document);
          const results = [];
          allRoots.forEach((r) => {
            r.querySelectorAll("a, h2, h3, h4, span, p, div").forEach((el) => {
              const t = el.innerText ? el.innerText.trim().replace(/[,;]+$/, "") : "";
              if (/^(LF|HF|FF|FS|AF|WF|MK|CS|CV|SP)\d+/i.test(t) && t.length < 20) {
                results.push(t);
              }
            });
          });
          return [...new Set(results)];
        });

        const validCodes = fleetguardCodes.filter(isValidCode);
        if (validCodes.length > 0) {
          return [{ "Üretici Adı": "FLEETGUARD", "Oems": [...new Set(validCodes)] }];
        }
      }
      return [];
    } catch (err) {
      console.error("Fleetguard search error:", err.message);
      return [];
    }
  }
}

module.exports = {
  FleetguardScraper
};
