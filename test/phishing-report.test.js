'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const source = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const KEY = 'cyberlab_phishing_steps_v1';
const when = '2026-10-12T05:00:00.000Z';
function storage(seed = {}) {
  const values = new Map(Object.entries(seed)), calls = [];
  return { values, calls, getItem(key) { calls.push(['get', key]); return values.get(key) ?? null; }, setItem(key, value) { calls.push(['set', key]); values.set(key, value); }, removeItem(key) { calls.push(['remove', key]); values.delete(key); } };
}
function setup(sessionStorage = storage(), extra = {}) {
  const context = { sessionStorage }; Object.defineProperties(context, Object.getOwnPropertyDescriptors(extra)); context.window = context; vm.createContext(context);
  vm.runInContext(source('phishing-progress.js'), context);
  vm.runInContext(source('phishing-report.js'), context);
  return context;
}
const fixture = events => ({ version: 1, omitted: 0, storageStatus: 'available', events: events.map(value => ({ type: value[0] || value, at: when, ...(value[1] ? { outcome: value[1] } : {}) })) });
const events = (...types) => types.map(type => [type]);
function element() {
  const handlers = {}, children = [];
  return { handlers, children, style: {}, value: '', textContent: '', innerHTML: '', disabled: false, addEventListener(type, fn) { handlers[type] = fn; }, setAttribute() {}, append(...items) { children.push(...items); }, click() { return handlers.click?.(); }, remove() { this.removed = true; }, fire(type, event) { return handlers[type]?.(event); } };
}

test('empty report uses unknown/not-recorded language and separates generation from activity', () => {
  const app = setup(); const html = app.PhishingReport.render(app.PhishingProgress.read(), {}, when);
  for (const label of ['Lab name', 'Scope and method', 'What happened', 'When it happened', 'Weakness explained', 'PH-01', 'PH-02', 'Training risk: Moderate', 'Training risk: High', 'How to prevent it', 'Conclusion']) assert.ok(html.includes(label), label);
  assert.match(html, /No activity recorded/); assert.match(html, /Not recorded\. Generating a report does not establish/);
  assert.match(html, /12 Oct 2026, 09:00:00 Oman \(UTC\+04:00\)/);
  assert.match(html, /not the time of the exercise/); assert.doesNotMatch(html, /This lab has not been performed/);
});

test('only recorded actions count; missing stages and a started-only attempt are not completed', () => {
  const app = setup(); const { model, render } = app.PhishingReport;
  const raw = fixture(events('login-viewed', 'demo-started'));
  assert.equal(model(raw).status, 'Demo response not confirmed'); assert.equal(model(raw).completedAt, undefined);
  const html = render(raw); assert.match(html, /Fictional email displayed: <strong>Not recorded/); assert.match(html, /No final response is recorded/);
  assert.match(html, /Email-page activity was not recorded/);
});

test('server success, unconfirmed failure, pending retry and orphan final event remain distinct', () => {
  const app = setup(); const { model } = app.PhishingReport;
  const completed = fixture([...events('demo-started'), ['demo-finished', 'recorded']]);
  assert.equal(model(completed).status, 'Fixed-demo response received'); assert.equal(model(completed).completedAt, when);
  assert.equal(model(fixture([...events('demo-started'), ['demo-finished', 'unconfirmed']])).status, 'Demo ran; server receipt unknown');
  completed.events.push({ type: 'demo-started', at: when }); assert.equal(model(completed).status, 'Demo response not confirmed');
  assert.equal(model(fixture([['demo-finished', 'recorded']])).status, 'Response recorded; start unavailable');
});

test('safe allowlist strips unknown fields and never reads legacy local storage or credentials', () => {
  const store = storage({ other: 'untouched' });
  const app = setup(store, { get localStorage() { throw Error('Legacy access forbidden'); } });
  app.PhishingProgress.record('email-viewed', 'password'); app.PhishingProgress.record('evil', 'recorded');
  app.PhishingProgress.record('demo-started'); app.PhishingProgress.record('demo-finished', 'recorded');
  const record = JSON.parse(store.values.get(KEY));
  assert.deepEqual(Object.keys(record).sort(), ['events', 'omitted', 'version']); assert.equal(record.events.length, 3);
  record.password = 'LEAKED-CREDENTIAL'; record.browser = 'LEAKED-DEVICE'; record.events[0].password = 'LEAKED-CREDENTIAL';
  store.values.set(KEY, JSON.stringify(record));
  const html = app.PhishingReport.render(app.PhishingProgress.read()); assert.doesNotMatch(html, /LEAKED/);
  assert.ok(store.calls.every(([, key]) => key === KEY)); assert.equal(store.values.get('other'), 'untouched');
});

test('corrupt logs fail closed without overwrite, deletion or stale cached evidence', () => {
  const store = storage(); const app = setup(store); app.PhishingProgress.record('email-viewed');
  for (const bad of ['{bad', 'null', JSON.stringify({ version: 1, omitted: 0, events: [{ type: 'evil', at: when }] }), JSON.stringify({ version: 1, omitted: 0, events: [{ type: 'demo-finished', at: when, outcome: '__proto__' }] })]) {
    store.values.set(KEY, bad); const value = app.PhishingProgress.read(); assert.equal(value.storageStatus, 'invalid'); assert.equal(value.events.length, 0);
    app.PhishingProgress.record('email-viewed'); assert.equal(store.values.get(KEY), bad);
    assert.match(app.PhishingReport.render(value), /not recognized/);
  }
  assert.equal(store.calls.some(([action]) => action === 'remove'), false);
});

test('blocked storage gives an honest limitation and does not block the demonstration', () => {
  const blocked = { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); }, removeItem() { throw Error('denied'); } };
  const app = setup(blocked); app.PhishingProgress.record('demo-started');
  assert.equal(app.PhishingProgress.read().storageStatus, 'unavailable');
  assert.match(app.PhishingReport.render(app.PhishingProgress.read()), /blocking session storage/);
  assert.equal(app.PhishingProgress.reset(), false);
});

test('bounded history declares omitted events, explicit reset removes only its key', () => {
  const store = storage({ other: 'keep' }); const app = setup(store);
  for (let i = 0; i < 105; i++) app.PhishingProgress.record('email-viewed');
  assert.equal(app.PhishingProgress.read().events.length, 100); assert.equal(app.PhishingProgress.read().omitted, 5);
  assert.match(app.PhishingReport.render(app.PhishingProgress.read()), /5 earlier event\(s\) are omitted/);
  assert.equal(app.PhishingProgress.reset(), true); assert.equal(store.values.has(KEY), false); assert.equal(store.values.get('other'), 'keep');
});

test('reflection HTML and controls are escaped, exported report is self-contained and script-free', () => {
  const app = setup(); const html = app.PhishingReport.render(fixture(events('email-viewed')), { signs: '</p><script>alert(1)</script>', response: '<img src=x onerror=evil()>', learning: '<iframe src="https://example.com">' }, when, true);
  assert.match(html, /FICTIONAL EXAMPLE ONLY/); assert.match(html, /&lt;script&gt;/); assert.match(html, /&lt;img/); assert.doesNotMatch(html, /<(script|img|iframe)\b/i);
  assert.match(html, /default-src 'none'/); assert.match(html, /style-src 'unsafe-inline'/); assert.doesNotMatch(html, /<link|<form/i);
});

test('UI preview, reflection, refresh, reset, repeated download and print use the same report', () => {
  const ids = ['phishingReportPreview', 'reportStatus', 'reportSigns', 'reportResponse', 'reportLearning', 'refreshReport', 'resetReport', 'downloadReport', 'printReport'];
  const nodes = Object.fromEntries(ids.map(id => [id, element()])); const body = element(), blobs = [], timers = [], handlers = {}; let prints = 0;
  const app = setup(storage(), { document: { getElementById: id => nodes[id], body, createElement: tag => { const node = element(); node.tag = tag; if (tag === 'iframe') node.contentWindow = { addEventListener() {}, focus() {}, print() { prints++; } }; return node; } },
    Blob: class { constructor(parts) { blobs.push(parts.join('')); } }, URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} }, setTimeout: fn => timers.push(fn), addEventListener: (type, fn) => { handlers[type] = fn; } });
  app.PhishingProgress.record('email-viewed'); nodes.refreshReport.click(); assert.match(nodes.phishingReportPreview.innerHTML, /email page was displayed/);
  nodes.reportSigns.value = '<b>My note</b>'; nodes.reportSigns.fire('input'); assert.match(nodes.phishingReportPreview.innerHTML, /&lt;b&gt;My note/);
  nodes.downloadReport.click(); nodes.downloadReport.click(); assert.equal(blobs.length, 2); assert.ok(blobs.every(html => /&lt;b&gt;My note/.test(html)));
  nodes.printReport.click(); const frame = body.children.find(node => node.tag === 'iframe'); assert.match(frame.srcdoc, /&lt;b&gt;My note/); frame.onload(); assert.equal(prints, 1);
  app.PhishingProgress.record('link-opened'); handlers.pageshow(); assert.match(nodes.phishingReportPreview.innerHTML, /email link was selected/);
  nodes.resetReport.click(); assert.match(nodes.phishingReportPreview.innerHTML, /No activity recorded/); assert.match(nodes.phishingReportPreview.innerHTML, /&lt;b&gt;My note/);
});

test('Stage 1 events reflect display and explicit selection, with duplicate clicks suppressed', async () => {
  const nodes = { verifyBtn: element(), fakeUrl: element(), phishingStatus: element() }, handlers = {}; let finish; const store = storage();
  const app = setup(store, { location: { href: '' }, document: { getElementById: id => nodes[id] }, addEventListener: (type, fn) => { handlers[type] = fn; }, AbortController, setTimeout: () => 1, clearTimeout() {}, fetch: () => new Promise(resolve => { finish = resolve; }) });
  vm.runInContext(source('phishing.html').match(/<script>([\s\S]*?)<\/script>/)[1], app);
  assert.deepEqual(Array.from(app.PhishingProgress.read().events, e => e.type), ['email-viewed']);
  const pending = nodes.verifyBtn.click(); nodes.verifyBtn.click(); nodes.fakeUrl.fire('click', { preventDefault() {} }); finish({ ok: true }); await pending;
  assert.deepEqual(Array.from(app.PhishingProgress.read().events, e => e.type), ['email-viewed', 'link-opened']); assert.equal(app.location.href, '/fake-login.html');
});

test('Stage 2 records explicit start and actual response time, never reads illustrative credentials', async () => {
  for (const ok of [true, false]) {
    const nodes = { loginForm: element(), runDemo: element(), msg: element() };
    const app = setup(storage(), { document: { getElementById(id) { if (id === 'phishingReportPreview') return null; assert.ok(nodes[id], 'Credential or other DOM access forbidden: ' + id); return nodes[id]; } }, localStorage: storage(), navigator: { userAgent: 'Synthetic QA', platform: 'Synthetic QA', language: 'en' }, screen: { width: 800, height: 600 }, AbortController, setTimeout: () => 1, clearTimeout() {}, fetch: async () => ({ ok }) });
    vm.runInContext(source('fake-login.html').match(/<script>([\s\S]*?)<\/script>/)[1], app);
    assert.equal(app.PhishingProgress.read().events.length, 1); await nodes.loginForm.fire('submit', { preventDefault() {} });
    const ev = app.PhishingProgress.read().events; assert.deepEqual(Array.from(ev, e => e.type), ['login-viewed', 'demo-started', 'demo-finished']); assert.equal(ev[2].outcome, ok ? 'recorded' : 'unconfirmed');
    assert.doesNotMatch(JSON.stringify(ev), /TrainingOnly|Synthetic QA|Demo Student/);
  }
});

test('report assets are allowlisted and learner navigation reaches report without instructor access', () => {
  const allow = JSON.parse(source('research/public-files.json'));
  for (const name of ['phishing-report.html', 'phishing-report.js', 'phishing-report.css', 'phishing-progress.js']) assert.ok(allow.includes(name));
  for (const name of ['phishing.html', 'fake-login.html']) { assert.match(source(name), /href="\/phishing-report\.html"/); assert.match(source(name), /src="\/phishing-progress\.js"/); }
  assert.doesNotMatch(source('phishing-report.js') + source('phishing-progress.js'), /fetch\(|localStorage|navigator\.|password\.value/);
});


test('write-only storage failure retains in-page evidence and warning until a successful save or reset', () => {
  const store = storage(), originalSet = store.setItem; let blocked = true;
  store.setItem = (key, value) => { if (blocked) throw Error('quota exceeded'); originalSet(key, value); };
  const app = setup(store); app.PhishingProgress.record('email-viewed');
  assert.equal(app.PhishingProgress.read().storageStatus, 'unavailable'); assert.equal(app.PhishingProgress.read().events.length, 1);
  assert.match(app.PhishingReport.render(app.PhishingProgress.read()), /blocking session storage/);
  blocked = false; app.PhishingProgress.record('link-opened');
  assert.equal(app.PhishingProgress.read().storageStatus, 'available'); assert.equal(app.PhishingProgress.read().events.length, 2);
  assert.equal(JSON.parse(store.values.get(KEY)).events.length, 2);
});

test('history retention never hides a remaining response or invents its unavailable start', () => {
  const app = setup(); app.PhishingProgress.record('demo-started'); app.PhishingProgress.record('demo-finished', 'recorded');
  for (let i = 0; i < 99; i++) app.PhishingProgress.record('email-viewed');
  const model = app.PhishingReport.model(app.PhishingProgress.read());
  assert.equal(model.status, 'Response recorded; start unavailable'); assert.ok(model.completedAt); assert.equal(model.omitted, 1);
  assert.match(model.happened, /starting step is not available/); assert.doesNotMatch(model.happened, /no finished/);
});


test('Stage 2 navigation invalidates stale responses and restores a usable retry on return', async () => {
  const nodes = { loginForm: element(), runDemo: element(), msg: element() }, handlers = {}, pending = [];
  const app = setup(storage(), { document: { getElementById: id => nodes[id] }, localStorage: storage(), navigator: {}, screen: {}, AbortController, setTimeout: () => 1, clearTimeout() {}, addEventListener: (type, fn) => { handlers[type] = fn; }, fetch: () => new Promise(resolve => pending.push(resolve)) });
  vm.runInContext(source('fake-login.html').match(/<script>([\s\S]*?)<\/script>/)[1], app);
  const first = nodes.loginForm.fire('submit', { preventDefault() {} });
  handlers.pagehide(); handlers.pageshow(); assert.equal(nodes.runDemo.disabled, false); assert.match(nodes.msg.textContent, /server receipt is unknown/); assert.equal(nodes.runDemo.textContent, 'Run fixed demo again');
  const second = nodes.loginForm.fire('submit', { preventDefault() {} });
  pending[0]({ ok: true }); await first;
  assert.equal(app.PhishingProgress.read().events.filter(e => e.type === 'demo-finished').length, 0);
  assert.equal(nodes.runDemo.disabled, true);
  pending[1]({ ok: true }); await second;
  assert.equal(app.PhishingProgress.read().events.filter(e => e.type === 'demo-finished').length, 1); assert.equal(nodes.runDemo.disabled, false);
});

test('running app serves new report assets and navigation pages', async () => {
  const app = await require('./helpers').start();
  try { for (const file of ['phishing-report.html', 'phishing-report.js', 'phishing-report.css', 'phishing-progress.js', 'phishing.html', 'fake-login.html']) { const response = await fetch(app.base + '/' + file); assert.equal(response.status, 200, file); assert.ok((await response.text()).length > 0); } }
  finally { await app.close(); }
});


test('restored page cannot resurrect unsaved fallback after report reset in the same tab', () => {
  const store = storage(), save = store.setItem, handlers = {}; let failWrite = true;
  store.setItem = (key, value) => { if (failWrite) throw Error('quota'); save(key, value); };
  const oldPage = setup(store, { addEventListener: (type, fn) => { handlers[type] = fn; } });
  oldPage.PhishingProgress.record('email-viewed'); assert.equal(oldPage.PhishingProgress.read().events.length, 1);
  handlers.pagehide();
  const reportPage = setup(store); assert.equal(reportPage.PhishingProgress.reset(), true);
  failWrite = false; oldPage.PhishingProgress.record('link-opened');
  assert.deepEqual(Array.from(oldPage.PhishingProgress.read().events, e => e.type), ['link-opened']);
});
