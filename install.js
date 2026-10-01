(() => {
  'use strict';

  const button = document.getElementById('install-app');
  const status = document.getElementById('install-status');
  const help = document.getElementById('install-help');
  const close = document.getElementById('install-help-close');
  if (!button || !status || !help || !close) return;

  const standalone = window.matchMedia('(display-mode: standalone)');
  let deferredPrompt = null;
  let busy = false;
  let installed = standalone.matches || window.navigator.standalone === true;

  function showInstalled() {
    installed = true;
    deferredPrompt = null;
    button.hidden = true;
    status.textContent = 'Security Lab is installed. Open it from your device’s apps or shortcuts.';
    if (help.open) help.close();
  }

  function showHelp() {
    if (!help.open) help.showModal();
  }

  if (installed) showInstalled();

  window.addEventListener('beforeinstallprompt', (event) => {
    if (installed) return;
    event.preventDefault();
    deferredPrompt = event;
    button.hidden = false;
    status.textContent = 'Ready to install. Your browser will ask you to confirm.';
  });

  window.addEventListener('appinstalled', showInstalled);
  standalone.addEventListener('change', (event) => {
    if (event.matches) showInstalled();
  });

  button.addEventListener('click', async () => {
    if (busy || installed) return;
    if (!deferredPrompt) {
      showHelp();
      return;
    }

    // Each browser-supplied prompt can be used only once. Consume it before
    // awaiting, so repeated clicks cannot open overlapping prompts.
    const prompt = deferredPrompt;
    deferredPrompt = null;
    busy = true;
    button.disabled = true;
    try {
      const result = await prompt.prompt();
      const choice = result || await prompt.userChoice;
      if (!installed) {
        status.textContent = choice && choice.outcome === 'accepted'
          ? 'Install request accepted. Finish any browser steps, then open Security Lab from your apps.'
          : 'Installation canceled. You can try again from your browser’s install menu.';
      }
    } catch (error) {
      if (!installed) {
        status.textContent = 'The browser could not open its install prompt. Use the steps below.';
        showHelp();
      }
    } finally {
      busy = false;
      button.disabled = false;
    }
  });

  close.addEventListener('click', () => help.close());
  help.addEventListener('click', (event) => {
    if (event.target !== help) return;
    const bounds = help.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) help.close();
  });
})();
