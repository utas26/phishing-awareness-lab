/* Phishing report event log: fixed event names and timestamps only, in this tab.
   Never read credential fields, legacy storage, device metadata, or server records. */
(function (root) {
  'use strict';
  const KEY = 'cyberlab_phishing_steps_v1';
  const TYPES = ['email-viewed', 'link-opened', 'login-viewed', 'demo-started', 'demo-finished'];
  const OUTCOMES = ['recorded', 'unconfirmed'];
  const validTime = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value));
  let cached = { version: 1, events: [], omitted: 0 }, storageStatus = 'available', writeFailed = false;
  function sanitize(value) {
    if (!value || value.version !== 1 || !Array.isArray(value.events) || value.events.length > 100 || !Number.isSafeInteger(value.omitted) || value.omitted < 0) return null;
    if (value.events.some(event => !event || !TYPES.includes(event.type) || !validTime(event.at) || (event.type === 'demo-finished' && !OUTCOMES.includes(event.outcome)))) return null;
    return { version: 1, omitted: value.omitted, events: value.events.map(event => ({ type: event.type, at: event.at, ...(event.type === 'demo-finished' ? { outcome: event.outcome } : {}) })) };
  }
  function read() {
    if (writeFailed) return { ...cached, events: cached.events.map(event => ({ ...event })), storageStatus: 'unavailable' };
    try {
      const raw = root.sessionStorage.getItem(KEY);
      if (!raw) { cached = { version: 1, events: [], omitted: 0 }; storageStatus = 'available'; }
      else {
        const value = sanitize(JSON.parse(raw));
        if (!value) throw new TypeError('Unrecognized event log');
        cached = value; storageStatus = 'available';
      }
    } catch (error) { storageStatus = error instanceof TypeError || error instanceof SyntaxError ? 'invalid' : 'unavailable'; if (storageStatus === 'invalid') cached = { version: 1, events: [], omitted: 0 }; }
    return { ...cached, events: cached.events.map(event => ({ ...event })), storageStatus };
  }
  function record(type, outcome) {
    if (!TYPES.includes(type) || (type === 'demo-finished' && !OUTCOMES.includes(outcome))) return;
    read();
    // Invalid saved data is never repaired or overwritten without an explicit reset.
    if (storageStatus === 'invalid') return;
    cached.events.push({ type, at: new Date().toISOString(), ...(type === 'demo-finished' ? { outcome } : {}) });
    if (cached.events.length > 100) { cached.events.shift(); cached.omitted += 1; }
    try { root.sessionStorage.setItem(KEY, JSON.stringify(cached)); storageStatus = 'available'; writeFailed = false; }
    catch (error) { storageStatus = 'unavailable'; writeFailed = true; }
  }
  function reset() {
    try { root.sessionStorage.removeItem(KEY); writeFailed = false; cached = { version: 1, events: [], omitted: 0 }; storageStatus = 'available'; return true; }
    catch (error) { return false; }
  }
  // BFCache may restore this document after another page reset the report.
  // Unsaved fallback belongs only to the active page and must not resurrect history.
  if (typeof root.addEventListener === 'function') root.addEventListener('pagehide', () => { cached = { version: 1, events: [], omitted: 0 }; writeFailed = false; storageStatus = 'available'; });
  const api = { read, record, reset, sanitize, KEY };
  root.PhishingProgress = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
