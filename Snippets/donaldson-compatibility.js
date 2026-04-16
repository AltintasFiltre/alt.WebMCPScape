(async () => {

  const clean = (text) =>
    text ? text.replace(/\s+/g, " ").trim() : "";

  const container = document.querySelector(
    ".container.ListPartDetailPageComp.scrollSection"
  );

  if (!container) {
    console.error("Ekipman container bulunamadı.");
    return [];
  }

  const result = [];

  const rows = container.querySelectorAll("tbody tr");

  rows.forEach(row => {

    const equipment = clean(
      row.querySelector('[data-equipment]')?.textContent
    );

    const year = clean(
      row.querySelector('[data-year]')?.textContent
    );

    const type = clean(
      row.querySelector('[data-type]')?.textContent
    );

    const options = clean(
      row.querySelector('[data-options]')?.textContent
    );

    const engine = clean(
      row.querySelector('[data-engine]')?.textContent
    );

    const engineType = clean(
      row.querySelector('[data-enginetypes]')?.textContent
    );

    const linkElement = row.querySelector('a.commonLinkClass');
    const link = linkElement
      ? linkElement.href
      : "";

    if (!equipment) return;

    result.push({
      "Ekipman": equipment,
      "Yıl": year,
      "Ekipman Tipi": type,
      "Ekipman Seçenekleri": options,
      "Motor": engine,
      "Motor Seçeneği": engineType,
    });

  });

  const json = JSON.stringify(result, null, 2);

  // Clipboard güvenli kopyalama
  try {
    await navigator.clipboard.writeText(json);
    console.log("JSON clipboard'a kopyalandı ✅");
  } catch (e) {
    const textarea = document.createElement("textarea");
    textarea.value = json;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    console.warn("Clipboard API fallback kullanıldı.");
  }

  console.log(result);
  return result;

})();