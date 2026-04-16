(async () => {

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const tabBtn = [...document.querySelectorAll('button, a')]
    .find(el => el.innerText.trim().toLowerCase() === "equipment");

  if (tabBtn) {
    tabBtn.click();
    await sleep(1200);
  }

  function getAllRoots(node) {
    const roots = [node];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const el = walker.currentNode;
      if (el.shadowRoot) roots.push(el.shadowRoot);
    }
    return roots;
  }

  const roots = getAllRoots(document);

  let table = null;

  for (const root of roots) {
    const tables = root.querySelectorAll("table");
    for (const t of tables) {
      if (t.innerText.includes("Equipment") &&
          t.innerText.includes("Engine") &&
          t.innerText.includes("Year")) {
        table = t;
        break;
      }
    }
    if (table) break;
  }

  if (!table) {
    console.warn("Equipment tablosu bulunamadı.");
    return [];
  }

  const rows = [...table.querySelectorAll("tbody tr")];

  const output = rows.map(row => {
    const cells = row.querySelectorAll("td");
    return {
      "Ekipman": cells[0]?.innerText.trim() || "",
      "Motor": cells[1]?.innerText.trim() || "",
      "Yıl": cells[2]?.innerText.trim() || "",
      "Gerekli Adet": cells[3]?.innerText.trim() || ""
    };
  });

  console.log(JSON.stringify(output, null, 2));
  copy(JSON.stringify(output, null, 2));

  return output;

})();