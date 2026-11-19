(() => {
  'use strict';

  const replacements = [
    [/KaMoRaLe\s*4\s*Network/gi, 'ReFaluwash'],
    [/\bK4N\b/gi, 'ReFaluwash'],
    [/ONE NATION WITH ONE CONNECTION/gi, 'ISLAND NEWS & COMMUNITY PERSPECTIVES'],
    [/One Nation with One Connection/gi, 'Independent stories from Micronesia'],
    [/K4N News Desk/gi, 'ReFaluwash News Desk']
  ];

  function replaceText(root) {
    if (!root) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;

    while ((node = walker.nextNode())) {
      let value = node.nodeValue;
      if (!value) continue;

      for (const [pattern, replacement] of replacements) {
        value = value.replace(pattern, replacement);
      }

      if (node.nodeValue !== value) {
        node.nodeValue = value;
      }
    }
  }

  function applyBrand() {
    replaceText(document.body);

    if (document.title) {
      document.title = 'ReFaluwash | Newsroom';
    }

    const name = document.getElementById('site-name');
    if (name && /^(K4N|KaMoRaLe\s*4\s*Network)$/i.test(name.value.trim())) {
      name.value = 'ReFaluwash';
    }

    const tagline = document.getElementById('site-tagline');
    if (tagline && /^ONE NATION WITH ONE CONNECTION$/i.test(tagline.value.trim())) {
      tagline.value = 'Island news & community perspectives';
    }
  }

  applyBrand();

  // Observe only new page nodes. Character/text mutations are intentionally
  // excluded, otherwise this branding script can trigger a mutation loop.
  if (document.body) {
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
            applyBrand();
            return;
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
})();
