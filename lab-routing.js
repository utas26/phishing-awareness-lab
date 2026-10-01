/* Keep existing classroom bookmarks working after splitting the labs. */
(() => {
  'use strict';
  const routes = {'qr': '/qr-phishing.html', 'mfa': '/mfa-fatigue.html', 'update': '/fake-update.html', 'browser': '/browser-permissions.html', 'url': '/suspicious-url.html', 'ports': '/port-scanning.html', 'passwords': '/password-strength.html'};
  function redirectLegacyLab() {
    const destination = routes[window.location.hash.slice(1).toLowerCase()];
    if (destination) window.location.replace(destination + window.location.search);
  }
  redirectLegacyLab();
  window.addEventListener('hashchange', redirectLegacyLab);
})();
