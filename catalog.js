/* Category filtering only; no tracking, storage or fabricated progress. */
(() => {
  'use strict';
  const filters = [...document.querySelectorAll('[data-filter]')];
  const cards = [...document.querySelectorAll('[data-category]')];
  if (!filters.length || !cards.length) return;
  filters.forEach(button => button.addEventListener('click', () => {
    const selected = button.dataset.filter;
    let count = 0;
    cards.forEach(card => { card.hidden = selected !== 'all' && card.dataset.category !== selected; if (!card.hidden) count += 1; });
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    const status = document.getElementById('catalogStatus');
    if (status) status.textContent = selected === 'all' ? 'Showing all ' + count + ' labs' : 'Showing ' + count + ' ' + (count === 1 ? 'lab' : 'labs') + ' · ' + button.textContent;
  }));
})();
