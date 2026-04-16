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

  const roots = getAllRoots(document);
  const output = [];

  roots.forEach(root => {

    const blocks = root.querySelectorAll(".Related_Parts_Class");

    blocks.forEach(block => {

      const manufacturerEl = block.querySelector(":scope > .parts");
      const partsEls = block.querySelectorAll(".Parts_Grid .parts span");

      if (!manufacturerEl || !partsEls.length) return;

      const manufacturer = manufacturerEl.innerText.trim();
      const partNumbers = Array.from(partsEls).map(p => p.innerText.trim());

      const obj = {
        "Üretici Adı": manufacturer,
        "Üretici Parça No 1.": partNumbers[0] || "",
        "Üretici Parça No 2.": partNumbers[1] || ""
      };

      output.push(obj);

    });

  });

  console.log(JSON.stringify(output, null, 2));
  copy(JSON.stringify(output, null, 2));

  return output;

})();