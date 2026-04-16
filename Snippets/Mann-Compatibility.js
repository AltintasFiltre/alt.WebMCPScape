(async () => {

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const clean = (text) =>
    text.replace(/\s+/g, " ").trim();

  const container = document.querySelector("#applications");
  if (!container) {
    console.error("#applications bulunamadı");
    return;
  }

  /* ========== 1. TÜM ACCORDION'LARI AÇ ========== */
  container.querySelectorAll(".cmp-accordion__button")
    .forEach(btn => {
      if (btn.getAttribute("aria-expanded") !== "true") {
        btn.click();
      }
    });

  await sleep(1500); // lazy render için

  const result = [];

  /* ========== 2. TABLO OLAN MODEL ACCORDION'LARI BUL ========== */
  const tables = container.querySelectorAll(
    'table[aria-label="Application Table"]'
  );

  tables.forEach(table => {

    const modelItem = table.closest(".cmp-accordion__item");
    if (!modelItem) return;

    const modelHeader =
      modelItem.querySelector(".cmp-accordion__header");

    const manufacturerItem =
      modelItem.parentElement.closest(".cmp-accordion__item");

    const manufacturerHeader =
      manufacturerItem
        ? manufacturerItem.querySelector(".cmp-accordion__header")
        : null;

    const model = modelHeader ? clean(modelHeader.textContent) : "";
    const manufacturer = manufacturerHeader
      ? clean(manufacturerHeader.textContent)
      : "";

    const desktopBody =
      table.querySelector("tbody.cmp-table__desktop");

    if (!desktopBody) return;

    const rows = desktopBody.querySelectorAll("tr");
    if (rows.length < 2) return;

    const headers = Array.from(rows[0].querySelectorAll("th"))
      .map(th => clean(th.textContent));

    rows.forEach((row, index) => {

      if (index === 0) return;

      const cells = row.querySelectorAll("td");
      if (!cells.length) return;

      const obj = {
        "Üretici": manufacturer,
        "Model": model
      };

      cells.forEach((cell, i) => {
        const key = headers[i] || `Kolon ${i+1}`;
        obj[key] = clean(cell.textContent);
      });

      result.push(obj);

    });

  });

  console.log(JSON.stringify(result, null, 2));
  copy(JSON.stringify(result, null, 2));

  return result;

})();