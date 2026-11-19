(() => {
  'use strict';

  function addCultureCategory() {
    const category = document.getElementById('article-category');
    if (!category || [...category.options].some(option => option.value === 'Culture & Community')) return;
    const option = document.createElement('option');
    option.value = 'Culture & Community';
    option.textContent = 'Culture & Community';
    category.appendChild(option);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addCultureCategory, { once: true });
  } else {
    addCultureCategory();
  }
})();
