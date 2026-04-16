(async () => {

  /* ========== 1. ACCORDION'LARI AÇ ========== */
  const openAccordions = async () => {
    const buttons = document.querySelectorAll('[aria-expanded="false"], .accordion-button.collapsed');
    for (const btn of buttons) {
      btn.click();
      await new Promise(r => setTimeout(r, 300));
    }
  };

  await openAccordions();

  /* ========== 2. SECTION BUL ========== */
  const section = document.querySelector('.ListCrossReferenceDetailPageComp.scrollSection');
  if (!section) {
    console.error("Cross Reference section bulunamadı.");
    return;
  }

  const table = section.querySelector("table");
  if (!table) {
    console.error("Cross Reference table bulunamadı.");
    return;
  }

  const rows = Array.from(table.querySelectorAll("tbody tr"));
  const results = [];
  const uniqueSet = new Set();

  rows.forEach(row => {

    const cells = Array.from(row.querySelectorAll("td"))
      .map(td => td.innerText.trim().replace(/\s+/g, " "))
      .filter(cell => cell && !cell.includes("View Parts"));

    if (cells.length < 2) return;

    const obj = {
      key: cells[0],
      value: cells[1]
    };

    const uniqueKey = JSON.stringify(obj);

    if (!uniqueSet.has(uniqueKey)) {
      uniqueSet.add(uniqueKey);
      results.push(obj);
    }
  });

  /* ========== 3. CLIPBOARD ========== */
  const jsonOutput = JSON.stringify(results, null, 2);
  await navigator.clipboard.writeText(jsonOutput);

  console.log("Cross Reference JSON kopyalandı:");
  console.log(results);

})();