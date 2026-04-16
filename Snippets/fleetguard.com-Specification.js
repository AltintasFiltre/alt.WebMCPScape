(() => {

  function getAllRoots(node) {
    const roots = [node];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const el = walker.currentNode;
      if (el.shadowRoot) {
        roots.push(el.shadowRoot);
        roots.push(...getAllRoots(el.shadowRoot));
      }
    }
    return roots;
  }

  const translateMap = {
    "Media Type": "Filtre Medya Türü",
    "Gasket OD": "Conta Dış Çapı",
    "Largest OD": "En Büyük Dış Çap",
    "Inside Diameter": "İç Çap",
    "Outside Diameter": "Dış Çap",
    "Rated Flow": "Nominal Debi",
    "Hydrostatic Burst Minimum": "Minimum Patlama Basıncı",
    "Primary Particle Efficiency": "Birincil Partikül Verimliliği",
    "Length / Overall Height": "Uzunluk / Toplam Yükseklik",
    "Length": "Uzunluk",
    "Test Specification": "Test Standardı",
    "Efficiency Test Std": "Verimlilik Testi Standart",
    "Family": "Aile",
    "Type": "Tip",
    "Style": "Stil"
  };

  const roots = getAllRoots(document);
  const tables = [];

  roots.forEach(root => {
    tables.push(...root.querySelectorAll(".table1, .table2"));
  });

  if (!tables.length) {
    console.warn("Tablo bulunamadı.");
    return [];
  }

  const output = [];

  tables.forEach(table => {
    table.querySelectorAll("tr").forEach(row => {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 2) {
        const field = cells[0].innerText.trim();
        const value = cells[1].innerText.trim();

        if (field && value) {
          const turkishKey = translateMap[field] || field;

          output.push({
            key: turkishKey,
            value: value
          });
        }
      }
    });
  });

  console.log(JSON.stringify(output, null, 2));
  copy(JSON.stringify(output, null, 2));

  return output;

})();