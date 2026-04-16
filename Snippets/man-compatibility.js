(async () => {

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

  const container = document.querySelector('#applications');
  if (!container) {
    console.error("#applications bulunamadı.");
    return;
  }

  /* ========== 1. TÜM ACCORDION'LARI TEK SEFERDE AÇ ========== */
  const buttons = container.querySelectorAll('.cmp-accordion__button');

  buttons.forEach(btn => {
    if (btn.getAttribute('aria-expanded') !== 'true') {
      btn.click();
    }
  });

  /* İçerik yüklenmesi için tek bekleme */
  await new Promise(r => setTimeout(r, 1200));

  /* ========== 2. VERİ TOPLA ========== */
  const items = container.querySelectorAll('.cmp-accordion__item');

  const grouped = {};

  items.forEach(item => {

    const brandEl = item.querySelector('.cmp-accordion__header');
    const modelEl = item.querySelector('h3.cmp-accordion__title');

    if (!brandEl || !modelEl) return;

    const brand = brandEl.innerText.trim().replace(/\s+/g, ' ');
    const model = modelEl.innerText.trim().replace(/\s+/g, ' ');

    if (!grouped[brand]) grouped[brand] = [];

    if (!grouped[brand].includes(model)) {
      grouped[brand].push(model);
    }

  });

  /* ========== 3. MATRIX FORMAT ========== */
  let maxCount = 0;
  Object.values(grouped).forEach(models => {
    if (models.length > maxCount) maxCount = models.length;
  });

  const results = Object.entries(grouped).map(([brand, models]) => {

    const obj = { "Üretici": brand };

    for (let i = 0; i < maxCount; i++) {
      obj[`Model ${i + 1}`] = models[i] || "";
    }

    return obj;

  });

  await copyToClipboard(JSON.stringify(results, null, 2));

  console.log("Applications Matrix:");
  console.log(results);

})();