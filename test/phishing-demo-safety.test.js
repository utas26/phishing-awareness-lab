'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const safeKey = 'phishlab_demo_result_v1';
const legacyKey = 'phishlab_local_capture';
const legacyValue = JSON.stringify({ username: 'old-private-name', password: 'old-private-password' });
const html = file => fs.readFileSync(path.join(root, file), 'utf8');
const inlineScript = file => html(file).match(/<script>([\s\S]*?)<\/script>/)[1];

function element() {
  const events = new Map();
  return {
    style: {}, disabled: false, textContent: '', innerHTML: '',
    addEventListener(type, callback) { events.set(type, callback); },
    fire(type, event = {}) { return events.get(type)?.(event); }
  };
}

function storage({ seed = {}, failRead = false, failWrite = false, failRemove = false } = {}) {
  const values = new Map([[legacyKey, legacyValue], ...Object.entries(seed)]);
  const calls = [];
  return {
    values, calls,
    getItem(key) {
      calls.push(['get', key]);
      if (failRead) throw new Error('Storage unavailable');
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      calls.push(['set', key]);
      if (failWrite) throw new Error('Storage unavailable');
      values.set(key, value);
    },
    removeItem(key) {
      calls.push(['remove', key]);
      if (failRemove) throw new Error('Storage unavailable');
      values.delete(key);
    }
  };
}

function stage({ localStorage = storage(), fetchImpl = async () => ({ ok: true }) } = {}) {
  const elements = { loginForm: element(), runDemo: element(), msg: element() };
  const requests = [], timers = new Map();
  const context = {
    document: {
      getElementById(id) {
        // Any access to the illustrative identity/password is a test failure,
        // even if someone replaces the static DOM nodes with editable inputs.
        if (id === 'studentName' || id === 'studentPassword') throw new Error('Credential DOM access is forbidden');
        assert.ok(elements[id], `Unexpected element: ${id}`);
        return elements[id];
      }
    },
    navigator: { userAgent: 'Fictional Browser / Linux', platform: 'Demo platform', language: 'en' },
    screen: { width: 1024, height: 768 },
    localStorage,
    AbortController,
    setTimeout(callback) { timers.set(1, callback); return 1; },
    clearTimeout(id) { timers.delete(id); },
    fetch(url, options) { requests.push({ url, options }); return fetchImpl(url, options); }
  };
  vm.runInNewContext(inlineScript('fake-login.html'), context, { filename: 'fake-login.html' });
  return {
    elements, requests, timers, localStorage,
    submit() { return elements.loginForm.fire('submit', { preventDefault() {} }); }
  };
}

function validRecord(overrides = {}) {
  return {
    version: 1, demoId: 'fixed-classroom-demo', completed: true,
    savedAt: '2026-10-11T09:00:00.000Z', serverStatus: 'recorded', ...overrides
  };
}

function capture(localStorage = storage()) {
  const elements = { captureArea: element(), resetDemo: element() };
  const windowEvents = new Map();
  vm.runInNewContext(inlineScript('local-capture.html'), {
    document: { getElementById: id => elements[id] }, localStorage,
    window: { addEventListener(type, callback) { windowEvents.set(type, callback); } }
  }, { filename: 'local-capture.html' });
  return { elements, localStorage, windowEvents, output: () => elements.captureArea.innerHTML };
}

function assertLegacyUntouched(localStorage) {
  assert.equal(localStorage.values.get(legacyKey), legacyValue);
  assert.equal(localStorage.calls.some(([, key]) => key === legacyKey), false);
}

test('Stage 2 has no editable credential field and labels the public fixed example', () => {
  const source = html('fake-login.html');
  assert.doesNotMatch(source, /<(?:input|textarea)\b|contenteditable\s*=/i);
  assert.match(source, /Never enter a real password/);
  const example = source.match(/id="studentPassword">([^<]+)</)[1];
  assert.equal(example, 'TrainingOnly!123');
  assert.equal(example.length, 16);
  assert.match(source, /browser\/device metadata/);
});

test('submission uses constants, preserves metadata contract, and stores no password or device fields', async () => {
  const app = stage();
  await app.submit();
  assert.equal(app.requests.length, 1);
  const { url, options } = app.requests[0];
  assert.equal(url, '/api/submit');
  assert.equal(options.method, 'POST');
  const payload = JSON.parse(options.body);
  assert.deepEqual(Object.keys(payload).sort(), [
    'name', 'usernameEntered', 'passwordSubmitted', 'passwordLength', 'passwordStrength',
    'browser', 'os', 'platform', 'language', 'screen', 'timezone'
  ].sort());
  assert.equal(payload.name, 'Demo Student');
  assert.equal(payload.usernameEntered, 'Demo Student');
  assert.equal(payload.passwordLength, 16);
  assert.equal(payload.passwordSubmitted, true);
  assert.equal(payload.passwordStrength, 'Not assessed (fixed demo)');
  assert.equal(payload.os, 'Linux');
  const saved = JSON.parse(app.localStorage.values.get(safeKey));
  assert.deepEqual(Object.keys(saved).sort(), ['version', 'demoId', 'completed', 'savedAt', 'serverStatus'].sort());
  assert.equal(saved.serverStatus, 'recorded');
  assert.equal(saved.demoId, 'fixed-classroom-demo');
  assert.doesNotMatch(JSON.stringify(saved) + options.body, /TrainingOnly!123|old-private/);
  assert.equal(app.elements.runDemo.disabled, false);
  assert.equal(app.timers.size, 0);
  assert.match(app.elements.msg.textContent, /Stage 2 completed/);
  assertLegacyUntouched(app.localStorage);
});

test('rapid repeated submissions send one request; an explicit rerun works after completion', async () => {
  let finish;
  const app = stage({ fetchImpl: () => new Promise(resolve => { finish = resolve; }) });
  const first = app.submit();
  assert.equal(app.elements.runDemo.disabled, true);
  assert.equal(JSON.parse(app.localStorage.values.get(safeKey)).serverStatus, 'pending');
  await app.submit();
  assert.equal(app.requests.length, 1);
  finish({ ok: true });
  await first;
  const second = app.submit();
  assert.equal(app.requests.length, 2);
  finish({ ok: true });
  await second;
  assertLegacyUntouched(app.localStorage);
});

test('blocked storage does not prevent the existing classroom metadata request', async () => {
  const app = stage({ localStorage: storage({ failWrite: true }) });
  await app.submit();
  assert.equal(app.requests.length, 1);
  assert.equal(app.localStorage.values.has(safeKey), false);
  assert.match(app.elements.msg.textContent, /could not save the local demo result/);
  assert.match(app.elements.msg.textContent, /server record was still recorded/);
  assertLegacyUntouched(app.localStorage);
});

test('server errors preserve only a safe, explicitly unconfirmed result', async () => {
  const app = stage({ fetchImpl: async () => ({ ok: false }) });
  await app.submit();
  assert.equal(JSON.parse(app.localStorage.values.get(safeKey)).serverStatus, 'unconfirmed');
  assert.match(app.elements.msg.textContent, /could not be confirmed/);
  assert.match(app.elements.msg.textContent, /retry may create another classroom record/);
  assert.equal(app.elements.runDemo.disabled, false);
  assertLegacyUntouched(app.localStorage);
});

test('an interrupted request times out and re-enables the demonstration', async () => {
  const app = stage({ fetchImpl: (url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('Request aborted')));
  }) });
  const pending = app.submit();
  app.timers.get(1)();
  await pending;
  assert.equal(app.elements.runDemo.disabled, false);
  assert.equal(app.timers.size, 0);
  assert.equal(JSON.parse(app.localStorage.values.get(safeKey)).serverStatus, 'unconfirmed');
});

test('capture ignores an existing legacy record and performs no automatic deletion', () => {
  const app = capture();
  assert.match(app.output(), /No safe demo result/);
  assert.equal(app.localStorage.calls.some(([operation]) => operation === 'remove'), false);
  assertLegacyUntouched(app.localStorage);
});

test('capture displays fixed teaching data and allowlisted status only, never injected stored fields', () => {
  const app = capture(storage({ seed: { [safeKey]: JSON.stringify(validRecord({
    username: 'untrusted-person', password: 'injected-private-password', browser: '<script>evil()</script>'
  })) } }));
  assert.match(app.output(), /Demo Student \(fixed example\)/);
  assert.match(app.output(), /16 characters/);
  assert.match(app.output(), /Not collected or stored/);
  assert.match(app.output(), /2026-10-11T09:00:00.000Z/);
  assert.match(app.output(), /not a live check/);
  assert.doesNotMatch(app.output(), /untrusted-person|injected-private-password|evil|old-private/);
  assertLegacyUntouched(app.localStorage);
});

test('missing, corrupt, unrecognized, and blocked new storage fail safely without deletion', () => {
  for (const raw of ['{broken', 'null', JSON.stringify(validRecord({ savedAt: '<script>bad</script>' })),
    JSON.stringify(validRecord({ serverStatus: '__proto__' })), JSON.stringify(validRecord({ demoId: 'another-demo' }))]) {
    const app = capture(storage({ seed: { [safeKey]: raw } }));
    assert.match(app.output(), /could not be read|not a recognized demo record/);
    assert.doesNotMatch(app.output(), /<script>|old-private/);
    assert.equal(app.localStorage.calls.some(([operation]) => operation === 'remove'), false);
    assertLegacyUntouched(app.localStorage);
  }
  const blocked = capture(storage({ failRead: true }));
  assert.match(blocked.output(), /blocking local storage/);
  assertLegacyUntouched(blocked.localStorage);
});

test('explicit reset removes only the new record and handles a denied reset', () => {
  const seed = { [safeKey]: JSON.stringify(validRecord()) };
  const app = capture(storage({ seed }));
  app.elements.resetDemo.fire('click');
  assert.equal(app.localStorage.values.has(safeKey), false);
  assert.match(app.output(), /No safe demo result/);
  assertLegacyUntouched(app.localStorage);
  const blocked = capture(storage({ seed, failRemove: true }));
  blocked.elements.resetDemo.fire('click');
  assert.equal(blocked.localStorage.values.has(safeKey), true);
  assert.match(blocked.output(), /did not allow the demo result to be reset/);
  assertLegacyUntouched(blocked.localStorage);
});

test('Back/Forward and same-origin new-record updates refresh the capture view', () => {
  const app = capture();
  app.localStorage.values.set(safeKey, JSON.stringify(validRecord({ serverStatus: 'pending' })));
  app.windowEvents.get('pageshow')();
  assert.match(app.output(), /Not confirmed/);
  app.localStorage.values.set(safeKey, JSON.stringify(validRecord({ serverStatus: 'unconfirmed' })));
  app.windowEvents.get('storage')({ key: safeKey });
  assert.match(app.output(), /may or may not have reached/);
  app.localStorage.values.delete(safeKey);
  app.windowEvents.get('storage')({ key: safeKey });
  assert.match(app.output(), /No safe demo result/);
  const readsBeforeLegacyEvent = app.localStorage.calls.length;
  app.windowEvents.get('storage')({ key: legacyKey });
  assert.equal(app.localStorage.calls.length, readsBeforeLegacyEvent);
  assertLegacyUntouched(app.localStorage);
});
