const cheerio = require('cheerio');
const { BaseScraper } = require('./BaseScraper');
const { getCodeVariations, isExactCodeMatch, isValidCode } = require('../utils/filterNormalizer');
const { USER_AGENT } = require('../config/constants');

class FerraScraper extends BaseScraper {
  constructor() {
    super('FERRA');
  }

  async search(code) {
    try {
      const variations = getCodeVariations(code);

      // 1. Ferra anti-bot 'ff_dg' çerezini dinamik çöz
      let cookie = "";
      try {
        const initRes = await fetch("https://www.ferrafilter.com/search_for_original_no.php", {
          headers: { "User-Agent": USER_AGENT }
        });
        const initHtml = await initRes.text();
        const match = initHtml.match(/var p = \["(.*?)", "(.*?)"\];/);
        if (match) {
          cookie = "ff_dg=" + match[2] + match[1];
        }
      } catch (e) {}

      const ferraCodes = [];
      const crossResults = [];

      for (const c of variations) {
        const url = "https://www.ferrafilter.com/search_for_original_no2.php?filtre11=" + encodeURIComponent(c);
        const res = await fetch(url, {
          headers: {
            "User-Agent": USER_AGENT,
            ...(cookie ? { "Cookie": cookie } : {})
          }
        });
        if (!res.ok) continue;
        const html = await res.text();

        let targetHtml = html;
        const challengeMatch = html.match(/var p = \["(.*?)", "(.*?)"\];/);
        if (challengeMatch) {
          const dynamicCookie = "ff_dg=" + challengeMatch[2] + challengeMatch[1];
          const res2 = await fetch(url, {
            headers: {
              "User-Agent": USER_AGENT,
              "Cookie": dynamicCookie
            }
          });
          targetHtml = await res2.text();
        }

        const $ = cheerio.load(targetHtml);

        $("table tr").each((i, row) => {
          const cells = $(row).find("td").map((j, td) => $(td).text().trim()).get();
          if (cells.length >= 3) {
            const origNo = cells[0];
            const uretici = cells[1];
            const ferraNo = cells[2];
            const rowText = cells.join(" ").toLowerCase();

            if (
              rowText.includes("muadili yok") ||
              rowText.includes("muadil yok") ||
              ferraNo.toLowerCase().includes("yok") ||
              ferraNo === "-"
            ) {
              return;
            }

            if (isExactCodeMatch(code, origNo)) {
              if (isValidCode(ferraNo) && !ferraNo.toLowerCase().includes("ferra")) {
                ferraCodes.push(ferraNo);
              }
              if (isValidCode(origNo) && uretici) {
                crossResults.push({ "Üretici Adı": uretici, "Oems": [origNo] });
              }
            }
          }
        });
      }

      const results = [];
      if (ferraCodes.length > 0) {
        results.push({ "Üretici Adı": "FERRA", "Oems": [...new Set(ferraCodes)] });
      }
      results.push(...crossResults);
      return results;
    } catch (err) {
      console.error("Ferra search error:", err.message);
      return [];
    }
  }
}

module.exports = {
  FerraScraper
};
