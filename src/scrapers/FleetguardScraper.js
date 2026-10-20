const { BaseScraper } = require('./BaseScraper');
const { isValidCode, isExactCodeMatch } = require('../utils/filterNormalizer');

class FleetguardScraper extends BaseScraper {
  constructor() {
    super('FLEETGUARD');
  }

  getType() {
    return 'browser';
  }

  async search(code, page) {
    if (!page) throw new Error('Tarayıcı oturumu başlatılamadı.');
    const noSpaces = String(code).replace(/\s+/g, "");
    const noSlash = noSpaces.replace(/[\/\-_.]/g, "");
    
    const searchTerms = [...new Set([noSpaces, noSlash, String(code).trim()])];
    let searchInputsFound = 0;

    for (const term of searchTerms) {
      const navRes = await page.goto("https://www.fleetguard.com", { waitUntil: "domcontentloaded", timeout: 20000 });
      if (navRes && navRes.status() >= 400) {
        throw new Error(`Fleetguard erişim hatası: HTTP ${navRes.status()}`);
      }
      await page.waitForTimeout(2000);

      const searchInput = await page.$("input[type=\"search\"], input[placeholder*=\"Search\"], input.search-input");
      if (!searchInput) continue;
      searchInputsFound++;

      await searchInput.fill(term);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(4500);

      const parsedItems = await page.evaluate(() => {
        const fullText = document.body.innerText || '';
        const isNoExactMatch = 
          /didn’t find an exact match/i.test(fullText) || 
          /didn't find an exact match/i.test(fullText) || 
          /no results found/i.test(fullText) ||
          /Parts\s*\(0\)/i.test(fullText);

        if (isNoExactMatch) {
          return [];
        }

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
        const items = [];

        allRoots.forEach((r) => {
          r.querySelectorAll(".product-item, li[class*=\"product-item\"]").forEach((itemEl) => {
            const nameEl = itemEl.querySelector(".product-name, h2, h3, a");
            const name = nameEl ? nameEl.innerText.trim() : "";

            const rawText = itemEl.innerText || "";
            const crossMatch = rawText.match(/Cross\s*Reference\s*:\s*([^\n\r]+)/i);
            const crossRefFull = crossMatch ? crossMatch[1].trim() : "";

            let isRelated = false;
            let prev = itemEl.previousElementSibling;
            while (prev) {
              if (/Related\s*Results/i.test(prev.innerText || "")) {
                isRelated = true;
                break;
              }
              prev = prev.previousElementSibling;
            }

            if (name) {
              items.push({
                name,
                crossRefFull,
                isRelated
              });
            }
          });
        });

        if (items.length === 0) {
          allRoots.forEach((r) => {
            r.querySelectorAll("a, h2, h3, h4, span, p, div").forEach((el) => {
              const rawText = el.innerText ? el.innerText.trim() : "";
              rawText.split("\n").forEach((line) => {
                const t = line.trim().replace(/[,;]+$/, "");
                if (/^(LF|HF|FF|FS|AF|WF|MK|CS|CV|SP)\d+/i.test(t) && t.length < 20) {
                  items.push({ name: t, crossRefFull: "", isRelated: false });
                }
              });
            });
          });
        }

        return items;
      });

      const exactMatches = [];
      for (const item of parsedItems) {
        if (item.isRelated) continue;

        const fgCode = item.name.split("\n")[0].trim();
        const matchFg = isExactCodeMatch(code, fgCode) || isExactCodeMatch(term, fgCode);

        let matchCross = false;
        if (item.crossRefFull) {
          const parts = item.crossRefFull.split(/\s+/);
          for (const p of parts) {
            if (isExactCodeMatch(code, p) || isExactCodeMatch(term, p)) {
              matchCross = true;
              break;
            }
          }
          if (isExactCodeMatch(code, item.crossRefFull) || isExactCodeMatch(term, item.crossRefFull)) {
            matchCross = true;
          }
        }

        if (matchFg || matchCross) {
          exactMatches.push(fgCode);
        }
      }

      const validCodes = exactMatches.filter(isValidCode);
      if (validCodes.length > 0) {
        return [{ "Üretici Adı": "FLEETGUARD", "Oems": [...new Set(validCodes)] }];
      }
    }

    if (searchInputsFound === 0) {
      throw new Error('Fleetguard arama kutusu yüklenemedi (Sayfa engeli veya zaman aşımı).');
    }

    return [];
  }
}

module.exports = {
  FleetguardScraper
};
