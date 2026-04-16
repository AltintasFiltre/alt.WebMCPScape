(async () => {

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  };

  /* ========== 0. Vehicles / Applications container bul ========== */
  const container = document.querySelector('#man-compatibility');

  if (!container) {
    console.error("man-compatibility bölümü bulunamadı.");
    return;
  }

  /* ========== 1. Accordion'ları Aç ========== */
  const buttons = container.querySelectorAll('.cmp-accordion__button');

  for (const btn of buttons) {
    if (btn.getAttribute('aria-expanded') !== 'true') {
      btn.click();
      await sleep(300);
    }
  }

  await sleep(600);

  /* ========== 2. Veri Topla ========== */
  const items = container.querySelectorAll('.cmp-accordion__item');

  const resultsRaw = [];

  items.forEach(item => {

    const brandEl = item.querySelector('.cmp-accordion__header > .cmp-accordion__title');
    const modelEl = item.querySelector('h3 > .cmp-accordion__button > span');

    if (!brandEl) return;

    const brand = brandEl.innerText.trim();
    const model = modelEl ? modelEl.innerText.trim() : "";

    const lis = item.querySelectorAll('li');

    const values = Array.from(lis)
      .map(li => li.innerText.trim())
      .filter(v => v);

    if (!values.length) return;

    resultsRaw.push({
      brand,
      model,
      values: [...new Set(values)]
    });

  });

  /* ========== 3. Matrix Format ========== */
  let maxCount = 0;
  resultsRaw.forEach(r => {
    if (r.values.length > maxCount) {
      maxCount = r.values.length;
    }
  });

  const results = resultsRaw.map(entry => {

    const obj = {
      "Üretici": entry.brand,
      "Model": entry.model
    };

    for (let i = 0; i < maxCount; i++) {
      obj[`Uygulama ${i + 1}`] = entry.values[i] || "";
    }

    return obj;
  });

  const json = JSON.stringify(results, null, 2);

  await copyToClipboard(json);

  console.log("Vehicles / Applications Matrix:");
  console.log(results);

})();