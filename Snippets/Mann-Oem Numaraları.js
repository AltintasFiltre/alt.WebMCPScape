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

  const container = document.querySelector('#oeNumbers');
  if (!container) {
    console.error("#oeNumbers bulunamadı.");
    return;
  }

  /* ========== 1. ACCORDION'LARI AÇ ========== */
  const buttons = container.querySelectorAll('.cmp-accordion__button');

  for (const btn of buttons) {
    if (btn.getAttribute('aria-expanded') !== 'true') {
      btn.click();
      await sleep(300);
    }
  }

  await sleep(500);

  /* ========== 2. TITLE + LI OKU ========== */
  const items = container.querySelectorAll('.cmp-accordion__item');

  const grouped = {};

  items.forEach(item => {

    const titleEl = item.querySelector('.cmp-accordion__title');
    if (!titleEl) return;

    const brand = titleEl.innerText.trim();

    const lis = item.querySelectorAll('li');

    const partNumbers = Array.from(lis)
      .map(li => li.innerText.trim())
      .filter(v => v);

    if (!partNumbers.length) return;

    // duplicate temizle
    grouped[brand] = [...new Set(partNumbers)];

  });

  /* ========== 3. İSTENEN FORMAT ========== */
  const results = Object.entries(grouped).map(([brand, parts]) => {
    return {
      "Üretici Adı": brand,
      "Oems": parts
    };
  });

  const json = JSON.stringify(results, null, 2);

  await copyToClipboard(json);

  console.log("OE Numbers (Formatted):");
  console.log(results);

})();