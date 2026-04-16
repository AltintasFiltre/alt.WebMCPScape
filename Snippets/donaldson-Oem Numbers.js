(async () => {

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const clean = (text) => text ? text.replace(/\s+/g,' ').trim() : '';

  const container = document.querySelector('.ListCrossReferenceDetailPageComp.scrollSection');
  if (!container) {
    console.error("Cross reference container bulunamadı.");
    return [];
  }

  const result = [];

  // 1️⃣ ParentRows lazy aç
  const parentRows = container.querySelectorAll('tr.parentRows');
  parentRows.forEach(row => {
    const icon = row.querySelector('i.fa.fa-plus[role="button"]');
    if (icon) icon.click();
  });

  await sleep(1000); // lazy render için bekle

  // 2️⃣ Satırları tara
  const rows = container.querySelectorAll('tr');

  rows.forEach(row => {
    const manufacturerTd = row.querySelector('td[data-manufacturer]');
    const partTd = row.querySelector('td[data-manufacturepartnumber] span');

    const manufacturer = manufacturerTd ? clean(manufacturerTd.textContent) : '';
    const part = partTd ? clean(partTd.textContent) : '';

    if (!manufacturer || !part) return;

    let existing = result.find(r => r["Üretici Adı"] === manufacturer);
    if (!existing) {
      existing = { "Üretici Adı": manufacturer };
      result.push(existing);
    }

    const partCount = Object.keys(existing).length - 1;
    existing[`Oem ${partCount + 1}`] = part;
  });

  const json = JSON.stringify(result, null, 2);

  // 3️⃣ Clipboard kopya (fallback)
  try {
    await navigator.clipboard.writeText(json);
    console.log("JSON clipboard'a kopyalandı ✅");
  } catch(e) {
    // fallback
    const textarea = document.createElement("textarea");
    textarea.value = json;
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    console.warn("Clipboard API çalışmadı, fallback ile kopyalandı");
  }

  console.log(result);
  return result;

})();