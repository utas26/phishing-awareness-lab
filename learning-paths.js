/* Optional learning sequences. No account, tracking, storage or completion claims. */
(() => {
  'use strict';
  const root = document.querySelector('.learning-paths');
  if (!root) return;
  const choices = [...root.querySelectorAll('.learning-path-choice')];
  const panels = [...root.querySelectorAll('.learning-path-panel')];
  const status = root.querySelector('#learningPathStatus');

  function selectPath(button, open) {
    const panelId = button.getAttribute('aria-controls');
    choices.forEach(choice => choice.setAttribute('aria-expanded', String(open && choice === button)));
    panels.forEach(panel => { panel.hidden = !open || panel.id !== panelId; });
    if (status) {
      const panel = panels.find(item => item.id === panelId);
      status.textContent = open && panel
        ? panel.querySelector('h3').textContent + ': ' + panel.querySelectorAll('li').length + ' labs in a suggested order.'
        : 'Learning path closed.';
    }
  }

  choices.forEach(button => button.addEventListener('click', () => {
    selectPath(button, button.getAttribute('aria-expanded') !== 'true');
  }));

  root.querySelectorAll('[data-close-path]').forEach(button => button.addEventListener('click', () => {
    const choice = choices.find(item => item.getAttribute('aria-controls') === button.dataset.closePath);
    if (!choice) return;
    selectPath(choice, false);
    choice.focus();
  }));

  root.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const choice = choices.find(button => button.getAttribute('aria-expanded') === 'true');
    if (!choice) return;
    event.preventDefault();
    selectPath(choice, false);
    choice.focus();
  });
})();
