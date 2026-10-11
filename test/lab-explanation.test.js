'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'lab-explanation.js'), 'utf8');
const routes = ['phishing','qr-phishing','suspicious-url','mfa-fatigue','fake-update','browser-permissions','port-scanning','wifi-auditing','sql-injection','xss','password-strength'];

// A deliberately small DOM fixture for the independent player. Engine behavior
// is tested separately; this harness has no network or persistence facilities.
function setup(name, reduced = false, ready = 'complete') {
  let serial = 0, active, hidden = false;
  const timers = new Map(), callbacks = [], listeners = {}, windowListeners = {}, mediaListeners = [];
  class Element {
    constructor(tag) { this.tagName = tag; this.children = []; this.attrs = {}; this.dataset = {}; this.listeners = {}; this.disabled = false; this.className = ''; this._text = ''; this._open = false; this.classList = { toggle: (c, on) => { const names = new Set(this.className.split(' ').filter(Boolean)); on ? names.add(c) : names.delete(c); this.className = [...names].join(' '); } }; }
    appendChild(n) { n.parent = this; this.children.push(n); return n; }
    append(...nodes) { nodes.forEach(n => this.appendChild(n)); }
    before(n) { n.parent = this.parent; this.parent.children.splice(this.parent.children.indexOf(this), 0, n); }
    replaceChildren(...nodes) { this.children = []; this._text = ''; this.append(...nodes); }
    setAttribute(k, v) { this.attrs[k] = String(v); if(k === 'id') this.id = String(v); }
    getAttribute(k) { return this.attrs[k] ?? null; }
    addEventListener(k, fn) { (this.listeners[k] ||= []).push(fn); }
    emit(k) { for(const fn of this.listeners[k] || []) fn({ target: this }); }
    click() { if(!this.disabled) this.emit('click'); }
    focus() { active = this; }
    closest() { for(let node=this;node;node=node.parent) if(node.hidden || node.tagName==='fieldset' && node.disabled) return node; return null; }
    scrollIntoView() { this.scrolled = true; }
    matches(selector) { return selector.split(',').some(s => s === this.tagName || s === '[tabindex]' && 'tabindex' in this.attrs || s === 'a[href]' && this.tagName === 'a' && 'href' in this.attrs); }
    set open(v) { this._open = Boolean(v); this.emit('toggle'); }
    get open() { return this._open; }
    set textContent(v) { this._text = String(v); this.children = []; }
    get textContent() { return this._text + this.children.map(n => n.textContent).join(''); }
  }
  const documentRoot = new Element('main');
  const host = new Element('div'); host.id = name === 'phishing' ? 'labExplanationMount' : 'beginnerGuideMount'; documentRoot.append(host);
  const target = new Element('button'); target.id = name === 'mfa-fatigue' ? 'mfaStart' : 'verifyBtn'; documentRoot.append(target);
  const guideAction = new Element('button'); guideAction.className = 'bg-action'; documentRoot.append(guideAction);
  const nodes = () => { const result = []; function walk(n) { result.push(n); n.children.forEach(walk); } walk(documentRoot); return result; };
  const media = { matches: reduced, addEventListener: (event, fn) => mediaListeners.push(fn) };
  const document = { readyState: ready, createElement: tag => new Element(tag), getElementById: id => nodes().find(n=>n.id===id) || null, get hidden() {return hidden;}, get activeElement(){return active;}, addEventListener: (event, fn) => (listeners[event] ||= []).push(fn), querySelector: selector => selector === '[data-lab-explanation]' ? nodes().find(n=>'data-lab-explanation' in n.attrs) || null : selector === '.bg-action:not([hidden])' && name !== 'phishing' && !guideAction.hidden ? guideAction : null };
  const window = { location: { pathname: '/' + name + '.html' }, matchMedia: () => media, addEventListener: (event, fn) => (windowListeners[event] ||= []).push(fn) };
  const context = { document, window, setTimeout: fn => { const id = ++serial; timers.set(id, fn); callbacks.push(fn); return id; }, clearTimeout: id => timers.delete(id) };
  vm.createContext(context); vm.runInContext(source, context);
  const byClass = name => nodes().find(n=>n.className.split(' ').includes(name));
  const control = name => nodes().find(n=>n.attrs['data-le-control']===name);
  return {context,host,target,guideAction, document, window, nodes, control, byClass, panel: () => byClass('lab-explanation'), timerCount: () => timers.size, run: () => {const [id,fn] = timers.entries().next().value || []; if(fn) { timers.delete(id); fn(); }}, stale: () => callbacks.at(-1), changeMotion: value => { media.matches=value; mediaListeners.forEach(fn=>fn({matches:value})); }, hide: () => {hidden=true;(listeners.visibilitychange||[]).forEach(fn=>fn());}, pagehide: () => (windowListeners.pagehide||[]).forEach(fn=>fn()), ready: () => (listeners.DOMContentLoaded||[]).forEach(fn=>fn()) };
}
for(const name of routes) {
  test(name + ': complete four-scene preview and reset never auto-starts', () => {
    const s = setup(name); assert.ok(s.panel()); assert.equal(s.panel().open, false); assert.equal(s.timerCount(), 0);
    s.panel().open=true; assert.equal(s.timerCount(),0); assert.match(s.byClass('le-progress').textContent,/Scene 1 of 4/);
    assert.match(s.byClass('le-scope').textContent,/does not run the lab/);
    for(let n=2;n<=4;n++){s.control('next').click();assert.match(s.byClass('le-progress').textContent,new RegExp('Scene '+n+' of 4'));assert.equal(s.byClass('le-diagram').children.length,3);assert.equal(s.byClass('le-captions').children.length,6);}
    assert.equal(s.control('next').disabled,true);s.control('next').click();assert.match(s.byClass('le-progress').textContent,/Scene 4/);
    s.control('back').click();assert.match(s.byClass('le-progress').textContent,/Scene 3/);s.control('reset').click();assert.match(s.byClass('le-progress').textContent,/Scene 1/);assert.equal(s.timerCount(),0);
  });
}
test('play/pause/resume is bounded and repeated play does not duplicate timers',()=>{const s=setup('sql-injection');s.panel().open=true;s.control('play').click();s.control('play').click();assert.equal(s.timerCount(),1);s.run();assert.match(s.byClass('le-progress').textContent,/Scene 2/);const stale=s.stale();s.control('pause').click();assert.equal(s.timerCount(),0);stale();assert.match(s.byClass('le-progress').textContent,/Scene 2/);s.control('play').click();s.run();s.run();assert.equal(s.timerCount(),0);assert.match(s.byClass('le-progress').textContent,/End of explanation/);s.control('play').click();assert.match(s.byClass('le-progress').textContent,/Scene 1/);s.control('reset').click();assert.equal(s.timerCount(),0);});
test('closing the panel, hiding the document and navigating away cancel playback without advancing',()=>{for(const stop of [s=>s.panel().open=false,s=>s.hide(),s=>s.pagehide()]){const s=setup('mfa-fatigue');s.panel().open=true;s.control('play').click();s.run();const stale=s.stale();stop(s);assert.equal(s.timerCount(),0);stale();assert.match(s.byClass('le-progress').textContent,/Scene 2 of 4 · Paused/);s.panel().open=true;assert.equal(s.timerCount(),0);}});
test('reduced motion starts manual, switches live and never starts a timer',()=>{const s=setup('qr-phishing',true);s.panel().open=true;s.control('play').click();assert.equal(s.timerCount(),0);assert.match(s.byClass('le-progress').textContent,/Scene 2/);assert.equal(s.panel().dataset.motion,'off');s.changeMotion(false);s.control('play').click();assert.equal(s.timerCount(),1);const stale=s.stale();s.changeMotion(true);assert.equal(s.timerCount(),0);stale();assert.match(s.byClass('le-progress').textContent,/Scene 2/);assert.match(s.byClass('le-help').textContent,/no automatic playback/);});
test('try it only focuses an existing control; it never runs an exercise',()=>{for(const name of ['phishing','sql-injection']){const s=setup(name);let actions=0;s.target.addEventListener('click',()=>actions++);s.guideAction.addEventListener('click',()=>actions++);s.panel().open=true;s.control('play').click();s.byClass('le-try').click();assert.equal(s.panel().open,false);assert.equal(s.timerCount(),0);assert.equal(actions,0);assert.equal(s.document.activeElement,name==='phishing'?s.target:s.guideAction);}});
test('late deferred mounting is idempotent and unsupported routes do nothing',()=>{const s=setup('xss',false,'loading');assert.equal(s.panel(),undefined);s.ready();assert.ok(s.panel());s.ready();assert.equal(s.nodes().filter(n=>'data-lab-explanation'in n.attrs).length,1);assert.equal(setup('dos-ddos').panel(),undefined);});
test('all 11 applicable routes load the player once; DoS retains its existing player',()=>{for(const name of routes){const html=fs.readFileSync(path.join(root,name+'.html'),'utf8');assert.equal((html.match(/src="\/lab-explanation.js"/g)||[]).length,1);assert.equal((html.match(/href="\/lab-explanation.css"/g)||[]).length,1);}const dos=fs.readFileSync(path.join(root,'dos-ddos.html'),'utf8');assert.doesNotMatch(dos,/lab-explanation.js/);assert.match(dos,/id="guidePlay"/);});
test('player has no network, credential, storage or mission-completion side effects',()=>{assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|sendBeacon)\b/);assert.doesNotMatch(source,/\.click\(|dispatchEvent\(/);});

test('completed lab fallback skips disabled controls and retains keyboard focus',()=>{const s=setup('mfa-fatigue');s.guideAction.hidden=true;s.target.disabled=true;s.panel().open=true;s.byClass('le-try').click();assert.equal(s.document.activeElement,s.host);assert.equal(s.host.attrs.tabindex,'-1');assert.equal(s.panel().open,false);});

test('independent mission mode skips a guide inside a hidden ancestor',()=>{const s=setup('mfa-fatigue');s.host.appendChild(s.guideAction);s.host.hidden=true;s.panel().open=true;s.byClass('le-try').click();assert.equal(s.document.activeElement,s.target);assert.equal(s.panel().open,false);});
