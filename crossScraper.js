const { chromium } = require("playwright");
const cheerio = require("cheerio");

const ALLOWED_BRANDS = [
  "FLEETGUARD",
  "DONALDSON",
  "MANN-FILTER",
  "ASAŞ",
  "ŞAMPİYON",
  "HiFi",
  "SF-FILTER",
  "FİL FİLTRE",
  "MAHLE",
  "HENGST",
  "BALDWIN",
  "FİLMAR",
  "SCTURBO",
  "MYER",
  "MICRONIC",
  "AUTOTECHNIK",
  "BAVARIA",
  "PARKER",
  "CATERPILLAR",
  "VOLVO",
  "SCANIA",
  "KOMATSU",
  "PERKINS",
  "FERRA"
];

/**
 * Kod varyasyonları oluşturur (boşluklu ve boşluksuz formatlar)
 * Böylece kullanıcı "OC132" veya "OC 132" yazdığında sitelerin her iki arama yapısı da taranır
 */
function getCodeVariations(code) {
  if (!code) return [];
  const raw = String(code).trim();
  const noSpaces = raw.replace(/\s+/g, "");
  const withSpaces = raw.replace(/([A-Za-z]+)(\d+)/g, "$1 $2");
  return [...new Set([raw, noSpaces, withSpaces])];
}

/**
 * Filtre kodunu katı karşılaştırma için normalize eder:
 * Boşluklar ve parantezler temizlenir, büyük harfe çevrilir.
 * / (slash) ve - (tire) karakterleri KORUNUR.
 */
function normalizeCode(code) {
  if (!code) return "";
  return String(code).replace(/[\s()#+]/g, "").toUpperCase();
}

/**
 * İki filtre kodunun TAM BİREBİR EŞLEŞTİĞİNİ doğrular.
 */
function isExactCodeMatch(targetCode, candidateCode) {
  if (!targetCode || !candidateCode) return false;
  const nTarget = normalizeCode(targetCode);
  const nCandidate = normalizeCode(candidateCode);
  return nTarget.length > 0 && nTarget === nCandidate;
}

/**
 * Üretici isimlerini standartlaştırma ve sadece izin verilen 23 üreticiyi kabul etme
 */
function normalizeBrand(brand) {
  if (!brand) return null;
  const b = brand.trim().toUpperCase();

  if (b.includes("FLEETGUARD")) return "FLEETGUARD";
  if (b.includes("DONALDSON")) return "DONALDSON";
  if (b.includes("MANN")) return "MANN-FILTER";
  if (b.includes("ASAŞ") || b.includes("ASAS")) return "ASAŞ";
  if (b.includes("SAMPIYON") || b.includes("ŞAMPİYON")) return "ŞAMPİYON";
  if (b.includes("HIFI")) return "HiFi";
  if (b.includes("SF-FILTER") || b.includes("SF FILTER") || b === "SF") return "SF-FILTER";
  if (b.includes("MAHLE") || b.includes("KNECHT")) return "MAHLE";
  if (b.includes("HENGST")) return "HENGST";
  if (b.includes("BALDWIN")) return "BALDWIN";
  if (b.includes("FILMAR") || b.includes("FİLMAR")) return "FİLMAR";
  if (b.includes("SCTURBO") || b.includes("SC TURBO")) return "SCTURBO";
  if (b.includes("MYER")) return "MYER";
  if (b.includes("MICRONIC")) return "MICRONIC";
  if (b.includes("AUTOTECHNIK") || b.includes("AUTO TECHNIK")) return "AUTOTECHNIK";
  if (b.includes("BAVARIA")) return "BAVARIA";
  if (b.includes("PARKER") || b.includes("RACOR")) return "PARKER";
  if (b.includes("CATERPILLAR") || b === "CAT") return "CATERPILLAR";
  if (b.includes("VOLVO")) return "VOLVO";
  if (b.includes("SCANIA")) return "SCANIA";
  if (b.includes("KOMATSU")) return "KOMATSU";
  if (b.includes("PERKINS")) return "PERKINS";
  if (b.includes("FERRA")) return "FERRA";
  if (b.includes("FIL FILTER") || b.includes("FİL FİLTRE") || b.startsWith("FIL") || b.startsWith("FİL") || b === "FIL" || b === "FİL") return "FİL FİLTRE";

  const directMatch = ALLOWED_BRANDS.find(ab => ab.toUpperCase() === b);
  if (directMatch) return directMatch;

  return null;
}

/**
 * Geçersiz kod veya başlık metni filtreleme
 */
function isValidCode(code) {
  if (!code) return false;
  const c = String(code).trim();
  if (c.length < 2 || c.length > 35) return false;
  const lower = c.toLowerCase();
  if (lower.includes("muadil") || 
      lower.includes("referans") || 
      lower.includes("orijinal") || 
      lower.includes("filtre durumu") || 
      lower.includes("üretici") || 
      lower.includes("şampiyon kodu") || 
      lower.includes("parça no") ||
      lower.includes("available") ||
      lower.includes("aktif") ||
      lower.includes("karşılaştır") ||
      lower.includes("resim") ||
      lower.includes("yok") ||
      c === "-") {
    return false;
  }
  return true;
}

/**
 * Sonuçları Üretici Adına göre birleştir ve kodları tekilleştir
 */
function mergeCrossResults(list) {
  const brandMap = new Map();

  for (const item of list) {
    if (!item || !item["Üretici Adı"]) continue;
    const brand = normalizeBrand(item["Üretici Adı"]);
    if (!brand) continue; // Sadece izin verilen üreticiler listesindekileri al
    
    const oems = Array.isArray(item.Oems) ? item.Oems : [];

    if (!brandMap.has(brand)) {
      brandMap.set(brand, new Set());
    }
    const oemSet = brandMap.get(brand);
    for (const code of oems) {
      if (isValidCode(code)) {
        oemSet.add(String(code).trim());
      }
    }
  }

  const result = [];
  for (const [brand, oemSet] of brandMap.entries()) {
    if (oemSet.size > 0) {
      result.push({
        "Üretici Adı": brand,
        "Oems": Array.from(oemSet)
      });
    }
  }
  return result;
}

/**
 * 1. MANN-FILTER (GraphQL API with Multi-Variation Search & Strict Exact Matching)
 */
async function searchMann(code) {
  try {
    const q = "query($search:String!){search_crossreference_no(search:$search,pageSize:50){items{sales_designation ext_brand_name ext_product_name}}}";
    const variations = getCodeVariations(code);

    const allItems = [];
    for (const c of variations) {
      const vars = JSON.stringify({ search: c });
      const url = "https://www.mann-filter.com/api/graphql/catalog-prod?query=" + encodeURIComponent(q) + "&variables=" + encodeURIComponent(vars);
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (res.ok) {
        const data = await res.json();
        const items = data?.data?.search_crossreference_no?.items || [];
        allItems.push(...items);
      }
    }

    const mannCodes = [];
    const otherResults = [];

    for (const item of allItems) {
      // MANN karşılığı (sales_designation) yoksa kesinlikle alma
      if (!item.sales_designation || !isValidCode(item.sales_designation)) {
        continue;
      }

      const extName = item.ext_product_name;
      const mannDesignation = item.sales_designation;

      // Kullanıcının aradığı kod ile MANN'daki Dış Numara (ext_product_name) birebir eşit mi?
      const isExtMatch = extName && isExactCodeMatch(code, extName);

      // Kullanıcının aradığı kod ile MANN'daki Ürün Kodu (sales_designation) birebir eşit mi?
      const isMannMatch = mannDesignation && isExactCodeMatch(code, mannDesignation);

      // Kullanıcının verdiği kod ile Dış Numara VEYA MANN kodu tam eşitlik sağlamıyorsa KESİNLİKLE REDDET!
      if (!isExtMatch && !isMannMatch) {
        continue;
      }

      // MANN muadilini ekle
      mannCodes.push(mannDesignation);

      // Dış numara aranan kodla tam eşitse ve izinli üretici listesindeyse ekle
      if (isExtMatch && item.ext_brand_name && isValidCode(extName)) {
        const normBrand = normalizeBrand(item.ext_brand_name);
        if (normBrand) {
          otherResults.push({
            "Üretici Adı": normBrand,
            "Oems": [extName]
          });
        }
      }
    }

    const results = [];
    if (mannCodes.length > 0) {
      results.push({ "Üretici Adı": "MANN-FILTER", "Oems": [...new Set(mannCodes)] });
    }
    results.push(...otherResults);
    return results;
  } catch (err) {
    console.error("Mann search error:", err.message);
    return [];
  }
}

/**
 * 2. FERRA FILTER (Direct HTML Table Scrape with STRICT EXACT Matching)
 */
async function searchFerra(code) {
  try {
    const cleanCode = code.replace(/\s+/g, "");
    const url = "https://www.ferrafilter.com/search_for_original_no2.php?filtre11=" + encodeURIComponent(cleanCode);
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      }
    });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const ferraCodes = [];
    const crossResults = [];

    $("table tr").each((i, row) => {
      const cells = $(row).find("td").map((j, td) => $(td).text().trim()).get();
      // Table cols: [ORIJINAL NO, ÜRETICI, FERRA NO, FILTRE DURUMU, ...]
      if (cells.length >= 4) {
        const origNo = cells[0];
        const uretici = cells[1];
        const ferraNo = cells[2];
        const rowText = cells.join(" ").toLowerCase();

        // Eğer satırda "muadili yok" / "muadil yok" / "yok" yazıyorsa atla
        if (rowText.includes("muadili yok") || rowText.includes("muadil yok") || ferraNo.toLowerCase().includes("yok") || ferraNo === "-") {
          return;
        }

        // SADECE ORIJINAL NO aranan kod ile TAM EŞLEŞİYORSA al
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

/**
 * 3. DONALDSON (shop.donaldson.com with STRICT EXACT MATCHING)
 * OC132 arandığında OC13250 veya OC13210 kesinlikle elenir, sadece tam eşleşen satırlar alınır.
 */
async function searchDonaldson(code) {
  try {
    const cleanCode = code.trim().replace(/\s+/g, "");
    const url = "https://shop.donaldson.com/store/tr-tr/search?Ntt=" + encodeURIComponent(cleanCode + "*") + "&Ntk=All";
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);

    const donaldsonCodes = [];
    const crossResults = [];

    $(".listTile").each((i, el) => {
      // Donaldson ürün parça numarası (örn: P554403)
      const partNum = $(el).find("a[href*=\"/product/\"], .part-number, h2, h3").first().text().trim().replace(/#.*/, "").trim();
      
      const mfgBlock = $(el).find(".part-details-search, .manufacturer-details");
      const spans = mfgBlock.find("span").map((j, s) => $(s).text().trim()).get().filter(Boolean);
      
      let matched = false;
      
      // SADECE aranan kod ile tam eşleşen span varsa kabul et (OC13250 veya OC13210 kesinlikle elenir)
      for (const spanText of spans) {
        if (isExactCodeMatch(code, spanText)) {
          matched = true;
          break;
        }
      }

      // Veya Donaldson ürün kodunun kendisi aranan kodla tam eşleşiyorsa
      if (isExactCodeMatch(code, partNum)) {
        matched = true;
      }

      if (matched) {
        if (isValidCode(partNum)) {
          donaldsonCodes.push(partNum);
        }
        
        // Üretici eşleşmesi
        if (spans.length >= 2) {
          const brandName = spans[0];
          const partCode = spans[1];
          if (isExactCodeMatch(code, partCode) && isValidCode(brandName)) {
            crossResults.push({ "Üretici Adı": brandName, "Oems": [partCode] });
          }
        }
      }
    });

    const results = [];
    if (donaldsonCodes.length > 0) {
      results.push({ "Üretici Adı": "DONALDSON", "Oems": [...new Set(donaldsonCodes)] });
    }
    results.push(...crossResults);
    return results;
  } catch (err) {
    console.error("Donaldson search error:", err.message);
    return [];
  }
}

/**
 * 3. ŞAMPİYON FİLTRE (Playwright Scraper with Multi-Variation Search)
 */
async function searchSampiyon(page, code) {
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
      document.querySelectorAll("table tr").forEach(tr => {
        const cells = Array.from(tr.querySelectorAll("td")).map(td => td.innerText.trim());
        // [empty, Kod, Üretici, Şampiyon Kodu, Filtre Tipi, Bilgi]
        if (cells.length >= 4) {
          const kod = cells[1];
          const uretici = cells[2];
          const sampiyonKodu = cells[3];

          // Sadece Kod aranan kodla TAM BİREBİR EŞLEŞİYORSA al
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

/**
 * 4. FİL FİLTRE (Playwright Scraper with Multi-Variation Support)
 */
async function searchFil(page, code) {
  try {
    const formattedCode = code.trim().toLowerCase().replace(/\s+/g, "-");
    const url = "https://catalog.filfilter.com.tr/tr/search/" + encodeURIComponent(formattedCode);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(2500);

    const data = await page.evaluate((searchCode) => {
      function normalize(s) {
        return String(s || "").replace(/[\s()#+]/g, "").toUpperCase();
      }

      const filCodes = [];
      const crossItems = [];
      document.querySelectorAll("table tbody tr").forEach(tr => {
        const cells = Array.from(tr.querySelectorAll("td")).map(td => td.innerText.trim());
        if (cells.length >= 2) {
          const infoLines = cells[1].split("\n").map(l => l.trim()).filter(Boolean);
          const filCode = infoLines[0] || "";
          const brand = infoLines[1] || "";
          const crossCode = infoLines[2] || "";

          // Aranan kod ile çapraz kod veya Fil kodu TAM EŞLEŞİYORSA al
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

/**
 * 5. FLEETGUARD (Official Catalog Search)
 */
async function searchFleetguard(page, code) {
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
        allRoots.forEach(r => {
          r.querySelectorAll("a, h2, h3, h4, span, p, div").forEach(el => {
            const t = el.innerText ? el.innerText.trim() : "";
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

/**
 * 6. MAHLE AFTERMARKET (TecAlliance Catalog Scraper)
 */
async function searchMahle(page, code) {
  try {
    const cleanCode = code.trim().replace(/\s+/g, "");
    const url = "https://web.tecalliance.net/mahle-catalog/en/parts/search?query=" + encodeURIComponent(cleanCode);
    await page.goto(url, { waitUntil: "networkidle", timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const data = await page.evaluate((searchCode) => {
      const mahleCodes = [];
      const text = document.body.innerText || "";
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Mahle kod kalıpları: LX, OC, OX, KL, KX, LA, LAK, KC, HX, HC, CR vb.
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

/**
 * Main cross search aggregator function
 */
async function searchCrossReferences(code) {
  if (!code || !code.trim()) return [];
  const queryCode = code.trim();

  const allRawResults = [];

  // 1. Fast direct API & HTML scrapers (parallel)
  const [mannResults, ferraResults, donaldsonResults] = await Promise.all([
    searchMann(queryCode),
    searchFerra(queryCode),
    searchDonaldson(queryCode)
  ]);
  allRawResults.push(...mannResults, ...ferraResults, ...donaldsonResults);

  // 2. Playwright Browser Scrapers (shared browser session)
  let browser = null;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    });

    // Mahle
    const pageM = await context.newPage();
    const mahleResults = await searchMahle(pageM, queryCode);
    await pageM.close();
    allRawResults.push(...mahleResults);

    // Fleetguard
    const page0 = await context.newPage();
    const fgResults = await searchFleetguard(page0, queryCode);
    await page0.close();
    allRawResults.push(...fgResults);

    // Şampiyon
    const page1 = await context.newPage();
    const sampResults = await searchSampiyon(page1, queryCode);
    await page1.close();
    allRawResults.push(...sampResults);

    // Fil Filtre
    const page2 = await context.newPage();
    const filResults = await searchFil(page2, queryCode);
    await page2.close();
    allRawResults.push(...filResults);

  } catch (err) {
    console.error("Browser scraping error:", err.message);
  } finally {
    if (browser) await browser.close();
  }

  // 3. Merge & Deduplicate
  return mergeCrossResults(allRawResults);
}

module.exports = {
  searchCrossReferences,
  searchMann,
  searchFerra,
  searchDonaldson,
  searchMahle,
  searchSampiyon,
  searchFil,
  searchFleetguard,
  mergeCrossResults,
  isExactCodeMatch,
  normalizeCode,
  getCodeVariations,
  ALLOWED_BRANDS
};
