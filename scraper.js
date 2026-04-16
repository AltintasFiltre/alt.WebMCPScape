const { chromium } = require('playwright');

/**
 * MANN-FILTER
 */
async function scrapeMann(page) {
  const result = { Specification: [], OENumbers: [], Vehicles: [] };
  result.Specification = await page.evaluate(() => {
    const output = [];
    document.querySelectorAll(".cmp-table__container").forEach(c => {
      if (c.closest("#applications")) return;
      c.querySelectorAll("tr").forEach(row => {
        const cells = row.querySelectorAll("th, td");
        if (cells.length >= 2) {
          const key = cells[0].innerText.trim();
          const value = cells[1].innerText.trim();
          if (key && value) output.push({ key, value });
        }
      });
    });
    return output;
  });
  result.OENumbers = await page.evaluate(async () => {
    const sleepInner = (ms) => new Promise(r => setTimeout(r, ms));
    const container = document.querySelector('#oeNumbers');
    if (!container) return [];
    container.querySelectorAll('.cmp-accordion__button').forEach(btn => { if (btn.getAttribute('aria-expanded') !== 'true') btn.click(); });
    await sleepInner(800);
    return Array.from(container.querySelectorAll('.cmp-accordion__item')).map(item => {
      const brand = item.querySelector('.cmp-accordion__title')?.innerText.trim();
      const oems = Array.from(item.querySelectorAll('li')).map(li => li.innerText.trim()).filter(v => v);
      return brand && oems.length ? { "Üretici Adı": brand, "Oems": [...new Set(oems)] } : null;
    }).filter(i => i);
  });
  result.Vehicles = await page.evaluate(async () => {
    const sleepInner = (ms) => new Promise(r => setTimeout(r, ms));
    const clean = (t) => t.replace(/\s+/g, " ").trim();
    const container = document.querySelector("#applications");
    if (!container) return [];
    container.querySelectorAll(".cmp-accordion__button").forEach(btn => { if (btn.getAttribute("aria-expanded") !== "true") btn.click(); });
    await sleepInner(1500);
    const details = [];
    container.querySelectorAll('table[aria-label="Application Table"]').forEach(table => {
      const modelHeader = table.closest(".cmp-accordion__item")?.querySelector(".cmp-accordion__header");
      const manufacturerHeader = table.closest(".cmp-accordion__item")?.parentElement.closest(".cmp-accordion__item")?.querySelector(".cmp-accordion__header");
      const desktopBody = table.querySelector("tbody.cmp-table__desktop");
      if (!desktopBody) return;
      const rows = Array.from(desktopBody.querySelectorAll("tr"));
      const headers = Array.from(rows[0].querySelectorAll("th")).map(th => clean(th.textContent));
      rows.slice(1).forEach(row => {
        const cells = row.querySelectorAll("td");
        const rowData = {};
        cells.forEach((cell, i) => { rowData[headers[i]] = clean(cell.textContent); });
        details.push({
          "Üretici": manufacturerHeader ? clean(manufacturerHeader.textContent) : "", "Model": modelHeader ? clean(modelHeader.textContent) : "",
          "Model Tipi": rowData["Model Tipi"] || rowData["Model Type"] || "", "Filtre Tipi": rowData["Filtre Tipi"] || rowData["Filter Type"] || "",
          "Motor Kodu": rowData["Motor Kodu"] || rowData["Engine Code"] || "", "ccm": rowData["ccm"] || "", "kW": rowData["kW"] || "", "HP": rowData["HP"] || "",
          "Üretim yılı": rowData["Üretim yılı"] || rowData["Year of construction"] || ""
        });
      });
    });
    return details;
  });
  return result;
}

/**
 * FLEETGUARD
 */
async function scrapeFleetguard(page) {
  const result = { Specification: [], OENumbers: [], Vehicles: [] };
  await page.evaluate(async () => {
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
    const allBtns = allRoots.flatMap(r => Array.from(r.querySelectorAll('button, a, span, li')));
    const oemBtn = allBtns.find(el => el.innerText.toLowerCase().includes('cross reference'));
    if (oemBtn) oemBtn.click();
    await new Promise(r => setTimeout(r, 2000));
    const eqBtn = allBtns.find(el => el.innerText.toLowerCase().includes('equipment'));
    if (eqBtn) eqBtn.click();
    await new Promise(r => setTimeout(r, 2000));
  });
  const data = await page.evaluate(() => {
    function findRoots(node) {
      let roots = [node];
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
      while (walker.nextNode()) {
        const el = walker.currentNode;
        if (el.shadowRoot) roots = roots.concat(findRoots(el.shadowRoot));
      }
      return [...new Set(roots)];
    }
    const roots = findRoots(document);
    const results = { specs: [], oems: [], equipment: [] };
    const translateMap = { "Media Type": "Filtre Medya Türü", "Gasket OD": "Conta Dış Çapı", "Largest OD": "En Büyük Dış Çap", "Inside Diameter": "İç Çap", "Outside Diameter": "Dış Çap", "Rated Flow": "Nominal Debi", "Length": "Uzunluk" };
    roots.forEach(root => {
      root.querySelectorAll(".table1, .table2, .product-specs-table").forEach(table => {
        table.querySelectorAll("tr").forEach(row => {
          const c = row.querySelectorAll("td");
          if (c.length >= 2) results.specs.push({ key: translateMap[c[0].innerText.trim()] || c[0].innerText.trim(), value: c[1].innerText.trim() });
        });
      });
      root.querySelectorAll(".Related_Parts_Class").forEach(block => {
        const brandEl = block.querySelector(":scope > .parts");
        const partsEls = block.querySelectorAll(".Parts_Grid .parts span");
        if (brandEl && partsEls.length) results.oems.push({ "Üretici Adı": brandEl.innerText.trim(), "Oems": Array.from(partsEls).map(p => p.innerText.trim()).filter(v => v) });
      });
      root.querySelectorAll("table").forEach(table => {
        if (table.innerText.includes("Equipment") && table.innerText.includes("Engine")) {
          table.querySelectorAll("tbody tr").forEach(row => {
            const c = row.querySelectorAll("td");
            if (c.length >= 1) {
              const txt = c[0]?.innerText.trim() || "";
              results.equipment.push({ "Üretici": txt.split(' - ')[0] || "", "Model": txt.split(' - ')[1] || txt, "Model Tipi": "", "Filtre Tipi": "", "Motor Kodu": c[1]?.innerText.trim() || "", "ccm": "", "kW": "", "HP": "", "Üretim yılı": c[2]?.innerText.trim() || "" });
            }
          });
        }
      });
    });
    return results;
  });
  result.Specification = data.specs;
  result.OENumbers = data.oems;
  result.Vehicles = data.equipment;
  return result;
}

/**
 * DONALDSON
 */
async function scrapeDonaldson(page) {
  const result = { Specification: [], OENumbers: [], Vehicles: [] };
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    document.querySelectorAll('[aria-expanded="false"], .accordion-button.collapsed').forEach(b => b.click());
    await sleep(500);
    const showMoreButtons = ['#showMoreProductSpecsButton', '#showAllCrossReferenceListButton', '#showMorePdpListButton'];
    for (const selector of showMoreButtons) {
        const btn = document.querySelector(selector);
        if (btn && btn.offsetParent !== null) { btn.click(); await sleep(1000); }
    }
    document.querySelectorAll('tr.parentRows i.fa.fa-plus[role="button"]').forEach(i => i.click());
    await sleep(1500);
  });
  result.Specification = await page.evaluate(() => {
    const output = [];
    const attrTable = document.querySelector('.AttributesDetailPageComp table, .productSpecsSection table');
    if (attrTable) {
        attrTable.querySelectorAll('tr').forEach(row => {
            if (row.style.display === "none") return;
            const cells = row.querySelectorAll('td, th');
            if (cells.length >= 2) {
                let key = cells[0].innerText.trim();
                let value = cells[1].innerText.trim();
                if (!key || key.toLowerCase().includes('printable')) return;
                key = key.replace(/\[.*?\]/, "").trim();
                value = value.replace(/\(.*?\)/, "").trim();
                output.push({ key, value });
            }
        });
    }
    return output;
  });
  result.OENumbers = await page.evaluate(() => {
    const grouped = {};
    document.querySelectorAll('.ListCrossReferenceDetailPageComp tr').forEach(row => {
        const manufacturerTd = row.querySelector('td[data-manufacturer]');
        const partTd = row.querySelector('td[data-manufacturepartnumber] span');
        if (manufacturerTd && partTd) {
            const brand = manufacturerTd.textContent.trim();
            const part = partTd.textContent.trim();
            if (brand && part) {
                if (!grouped[brand]) grouped[brand] = [];
                grouped[brand].push(part);
            }
        }
    });
    return Object.entries(grouped).map(([brand, oems]) => ({ "Üretici Adı": brand, "Oems": [...new Set(oems)] }));
  });
  result.Vehicles = await page.evaluate(() => {
    const details = [];
    document.querySelectorAll('.ListPartDetailPageComp tr, .ListEquipmentDetailPageComp tr').forEach(row => {
        const equipment = row.querySelector('[data-equipment]')?.textContent.trim();
        if (equipment) {
            details.push({
                "Üretici": equipment.split(' ')[0], "Model": equipment, "Model Tipi": row.querySelector('[data-type]')?.textContent.trim() || "",
                "Filtre Tipi": "", "Motor Kodu": row.querySelector('[data-engine]')?.textContent.trim() || "",
                "ccm": "", "kW": "", "HP": row.querySelector('[data-enginetypes]')?.textContent.trim() || "", "Üretim yılı": row.querySelector('[data-year]')?.textContent.trim() || ""
            });
        }
    });
    return details;
  });
  return result;
}

/**
 * MICRONIC FILTER (Kesin Çözüm)
 */
async function scrapeMicronic(page) {
  const result = { Specification: [], OENumbers: [], Vehicles: [] };
  
  // 1. Önce Ana Tabloyu (Specification) al
  result.Specification = await page.evaluate(() => {
    const specs = [];
    const table = document.querySelector('#firstTab table');
    if (table) {
      table.querySelectorAll('tr').forEach(row => {
        const key = row.querySelector('th')?.innerText.trim();
        const value = row.querySelector('td')?.innerText.trim();
        if (key && value) specs.push({ key, value });
      });
    }
    // Ölçüler (mm) tablosu
    const dimTable = Array.from(document.querySelectorAll('table')).find(t => t.innerText.includes('A\t') || t.innerText.includes('H\t'));
    if (dimTable) {
      dimTable.querySelectorAll('tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) specs.push({ key: cells[0].innerText.trim(), value: cells[1].innerText.trim() });
      });
    }
    return specs;
  });

  // 2. Çapraz Referans (OEM) - Sekmeye Tıkla ve Al
  const crossTab = await page.locator('#nav-cross-tab');
  if (await crossTab.isVisible()) {
    await crossTab.click();
    await page.waitForTimeout(2000);
    result.OENumbers = await page.evaluate(() => {
      const oems = [];
      const cards = document.querySelectorAll('#nav-cross .card');
      cards.forEach(card => {
        const brand = card.querySelector('.card-header')?.innerText.trim();
        const numbers = Array.from(card.querySelectorAll('li')).map(li => li.innerText.trim()).filter(v => v);
        if (brand && numbers.length) oems.push({ "Üretici Adı": brand, "Oems": numbers });
      });
      return oems;
    });
  }

  // 3. Uygulama (Vehicles) - Sekmeye Tıkla ve Al
  const appTab = await page.locator('#nav-app-tab');
  if (await appTab.isVisible()) {
    await appTab.click();
    await page.waitForTimeout(2000);
    result.Vehicles = await page.evaluate(() => {
      const vehicles = [];
      const manufacturers = document.querySelectorAll('#nav-app #accordion > .card');
      
      manufacturers.forEach(mCard => {
        const manufacturer = mCard.querySelector('.card-header h5 a')?.innerText.trim();
        const modelCards = mCard.querySelectorAll('.card-body .card');
        
        modelCards.forEach(modCard => {
          const model = modCard.querySelector('.card-header h5 a')?.innerText.trim();
          const rows = modCard.querySelectorAll('table tbody tr');
          
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 5) {
              vehicles.push({
                "Üretici": manufacturer,
                "Model": model,
                "Model Tipi": cells[1]?.innerText.trim() || "",
                "Filtre Tipi": "",
                "Motor Kodu": cells[2]?.innerText.trim() || "",
                "ccm": "",
                "kW": cells[3]?.innerText.trim() || "",
                "HP": cells[4]?.innerText.trim() || "",
                "Üretim yılı": cells[5]?.innerText.trim() || ""
              });
            }
          });
        });
      });
      return vehicles;
    });
  }

  return result;
}

async function scrape(url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    let result;
    if (url.includes('mann-filter.com')) result = await scrapeMann(page);
    else if (url.includes('fleetguard.com')) result = await scrapeFleetguard(page);
    else if (url.includes('donaldson.com')) result = await scrapeDonaldson(page);
    else if (url.includes('micronicfilter.com')) result = await scrapeMicronic(page);
    else throw new Error('Desteklenmeyen URL formatı.');
    
    return {
        Specification: result.Specification.map(d => ({ key: String(d.key), value: String(d.value) })),
        OENumbers: result.OENumbers.map(a => ({ "Üretici Adı": String(a["Üretici Adı"]), "Oems": a.Oems })),
        Vehicles: result.Vehicles.map(o => ({
            "Üretici": String(o["Üretici"] || ""), "Model": String(o["Model"] || ""), "Model Tipi": String(o["Model Tipi"] || ""),
            "Filtre Tipi": String(o["Filtre Tipi"] || ""), "Motor Kodu": String(o["Motor Kodu"] || ""), "ccm": String(o["ccm"] || ""),
            "kW": String(o["kW"] || ""), "HP": String(o["HP"] || ""), "Üretim yılı": String(o["Üretim yılı"] || "")
        }))
    };
  } finally { await browser.close(); }
}

module.exports = { scrape };
