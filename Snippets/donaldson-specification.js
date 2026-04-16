(async () => {

  const clean = (text) =>
    text ? text.replace(/\s+/g, " ").trim() : "";

  const table = document.querySelector(
    ".productSpecsSection table.table-striped"
  ) || document.querySelector("table.table-striped");

  if (!table) {
    console.error("Özellik tablosu bulunamadı.");
    return [];
  }

  const result = [];

  const rows = table.querySelectorAll("tr");

  rows.forEach(row => {

    if (row.style.display === "none") return;

    const cells = row.querySelectorAll("td");
    if (cells.length < 2) return;

    let rawKey = clean(cells[0].innerText);
    let rawValue = clean(cells[1].innerText);

    if (!rawKey) return;

    let unit = "";

    /* ---------- 1️⃣ Key içindeki [mm] gibi birimi ayır ---------- */
    const keyUnitMatch = rawKey.match(/\[(.*?)\]/);
    if (keyUnitMatch) {
      unit = keyUnitMatch[1];
      rawKey = rawKey.replace(/\[.*?\]/, "").trim();
    }

    /* ---------- 2️⃣ Value içindeki "(11.09 İnç)" gibi birimi ayır ---------- */
    const valueParenMatch = rawValue.match(/\((.*?)\)/);
    if (valueParenMatch) {
      if (!unit) unit = valueParenMatch[1];
      rawValue = rawValue.replace(/\(.*?\)/, "").trim();
    }

    result.push({
      key: rawKey,
      value: rawValue,
      unit: unit
    });

  });

  const json = JSON.stringify(result, null, 2);

  try {
    await navigator.clipboard.writeText(json);
    console.log("JSON clipboard'a kopyalandı ✅");
  } catch (e) {
    console.log("Clipboard izin vermedi, console'a yazıldı.");
  }

  console.log(result);
  return result;

})();