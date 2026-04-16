(() => {

  const output = [];

  const containers = document.querySelectorAll(".cmp-table__container");

  if (!containers.length) {
    console.warn("cmp-table__container bulunamadı.");
    return [];
  }

  containers.forEach(container => {

    // Applications alanını atla
    if (container.closest("#applications")) return;

    const rows = container.querySelectorAll("tr");

    rows.forEach(row => {

      const cells = row.querySelectorAll("th, td");

      if (cells.length >= 2) {

        const key = cells[0].innerText.trim();
        const value = cells[1].innerText.trim();

        // Ölçü filtresi: mm, inch, Mxx gibi pattern kontrolü
        const isDimension =
          /mm|inch|mm²|M\d+/i.test(value) ||
          /^[A-Z]$/.test(key);

        if (key && value && isDimension) {
          output.push({ key, value });
        }

      }
    });

  });

  if (!output.length) {
    console.warn("Ölçüler bulunamadı. Accordion açık mı kontrol et.");
  }

  console.log(JSON.stringify(output, null, 2));
  copy(JSON.stringify(output, null, 2));

  return output;

})();