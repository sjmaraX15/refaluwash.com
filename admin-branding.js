(() => {
  'use strict';

  const replaceText = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      node.nodeValue = node.nodeValue
        .replace(/KaMoRaLe\s*4\s*Network/gi, 'ReFaluwash')
        .replace(/K4N/gi, 'ReFaluwash')
        .replace(/ONE NATION WITH ONE CONNECTION/gi, 'ISLAND NEWS & COMMUNITY PERSPECTIVES')
        .replace(/One Nation with One Connection/gi, 'Independent stories from Micronesia')
        .replace(/K4N News Desk/gi, 'ReFaluwash News Desk');
    });
  };

  function applyBrand() {
    replaceText(document.body);
    document.title = 'ReFaluwash | Newsroom';
    const name = document.getElementById('site-name');
    const tagline = document.getElementById('site-tagline');
    if (name && /^(K4N|KaMoRaLe\s*4\s*Network)$/i.test(name.value.trim())) name.value = 'ReFaluwash';
    if (tagline && /^ONE NATION WITH ONE CONNECTION$/i.test(tagline.value.trim())) tagline.value = 'Island news & community perspectives';
  }

  applyBrand();
  const observer = new MutationObserver(() => applyBrand());
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  // The settings form may be populated asynchronously from the database.
  let attempts = 0;
  const timer = setInterval(() => {
    applyBrand();
    if (++attempts >= 20) clearInterval(timer);
  }, 250);
})();
