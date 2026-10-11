'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const path = require('path');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }
function environment(htmlName, reduced = false) {
  const ids = new Map(), timers = new Map(); let nextTimer = 1;
  const handlers = () => ({ listeners: {}, addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }, removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] || []).filter(v => v !== fn); }, emit(type, event = {}) { for (const fn of this.listeners[type] || []) fn(event); } });
  const document = Object.assign(handlers(), { hidden: false, activeElement: null, getElementById: id => ids.get(id) || null });
  class Element {
    constructor(tag = 'div') { Object.assign(this, handlers()); this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.attributes = {}; this._text = ''; this._html = ''; this.disabled = this.hidden = this.checked = false; this.value = ''; this.className = ''; this.style = {}; this.parentNode = null; this.classList = {toggle: (c, value) => { const classes = new Set(this.className.split(/\s+/).filter(Boolean)); value ? classes.add(c) : classes.delete(c); this.className = [...classes].join(' '); }}; }
    set id(value) { this._id = value; ids.set(value, this); } get id() { return this._id || ''; }
    get parentElement() { return this.parentNode; }
    set textContent(value) { this._text = String(value); this.children = []; } get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
    set innerHTML(value) { this._html = value; this._text = ''; for (const c of this.children) c.parentNode = null; this.children = []; parse(value, this); }
    get innerHTML() { return this._html; }
    appendChild(node) { this.children.push(node); node.parentNode = this; return node; }
    replaceChildren(...nodes) { for (const c of this.children) c.parentNode = null; this.children = []; this._text = ''; nodes.forEach(n => this.appendChild(n)); }
    setAttribute(key, value) { this.attributes[key] = String(value); if (key === 'id') this.id = value; if (key === 'class') this.className = value; if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(value); }
    getAttribute(key) { return this.attributes[key] ?? null; }
    removeAttribute(key) { delete this.attributes[key]; }
    contains(node) { for (let n = node; n; n = n.parentNode) if (n === this) return true; return false; }
    focus() { if (!this.disabled) document.activeElement = this; }
    click() { if (!this.disabled) { this.focus(); this.emit('click', { target: this }); } }
    getClientRects() { return this.hidden ? [] : [{}]; }
    matches(s) { return s === ':disabled' && this.disabled; }
    closest(s) { if (s === '[hidden]') { for (let n = this; n; n = n.parentNode) if (n.hidden) return n; } return null; }
    scrollIntoView() {}
    querySelector(selector) { const nodes = []; const walk = node => { node.children.forEach(c => {nodes.push(c);walk(c);}); }; walk(this); if (selector === '.sim-status') return nodes.find(n => n.className.split(' ').includes('sim-status')) || null; const pairs = [...selector.matchAll(/\[([^=]+)="([^"]+)"\]/g)]; return nodes.find(n => pairs.length && pairs.every(([,k,v]) => n.getAttribute(k) === v)) || null; }
  }
  function parse(source, parent = null) {
    for (const match of source.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)) {
      const [,tag,attrs] = match; if (!/\bid\s*=|\bdata-action\s*=|\bclass="[^"]*sim-status/.test(attrs)) continue;
      const n = new Element(tag);
      for (const a of attrs.matchAll(/([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
        const k=a[1], value=a[2]??a[3]??a[4]??''; n.setAttribute(k,value); if (['disabled','hidden','checked'].includes(k)) n[k]=true; if(k==='value')n.value=value;
      }
      if (tag === 'select') { const rest = source.slice(match.index + match[0].length); const option = rest.match(/<option\b[^>]*value="([^"]*)"/); if(option)n.value=option[1]; }
      if(parent)parent.appendChild(n);
    }
  }
  document.createElement = tag => new Element(tag);
  if (htmlName) parse(fs.readFileSync(`${root}/${htmlName}.html`, 'utf8'));
  const motion = Object.assign(handlers(), { matches: reduced, set(value) { this.matches = value; this.emit('change', { matches: value }); } });
  const snapshots = [], guideStates = [];
  const window = Object.assign(handlers(), { matchMedia: () => motion, BeginnerGuide: {mount: () => ({update: state => guideStates.push(state)})}, PracticeMission: {mount: () => ({update() {},reset() {},getSummary: () => ({status:'not-performed',completedChecks:0,totalChecks:1,hintsRevealed:0})})}, LabReport: {mount: options => { snapshots.push(options); return {reset() {}};}} });
  const deferredDigests=[]; const crypto={ defer:false, subtle:{digest:()=>crypto.defer?new Promise(resolve=>deferredDigests.push(resolve)):Promise.resolve(new Uint8Array(32).buffer)} };
  const context = vm.createContext({window,document,console,URL,TextEncoder,crypto,Date,Event:class {},location:{hash:''},setTimeout:(fn)=>{const id=nextTimer++;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id)});
  const run = (file, expose='') => {let code=fs.readFileSync(`${root}/${file}`,'utf8');if(expose)code=code.replace(/\}\)\(\);\s*$/, `window.__test = ${expose};\n})();`);vm.runInContext(code,context,{filename:file});};
  return {ids,timers,motion,window,document,run,snapshots,guideStates,crypto,deferredDigests,node:id=>ids.get(id), click:id=>ids.get(id).click(), hide:()=>{document.hidden=true;document.emit('visibilitychange');},show:()=>{document.hidden=false;document.emit('visibilitychange');},tick:()=>{const [id,fn]=timers.entries().next().value||[];assert.ok(fn,'expected queued timer');timers.delete(id);fn();},create:tag=>new Element(tag)};
}
async function flush(){await Promise.resolve();await Promise.resolve();}
test('playback accessibility, reduced motion, interruption and reset regressions', async () => {
  // Guide preference override is visible and cannot pretend to enable motion.
  {const e=environment(null,true),host=e.create('div');host.id='guide';e.run('beginner-guide.js');const g=e.window.BeginnerGuide.mount({mountTo:'#guide',steps:[]});const panel=host.children[0],button=panel.children[0].children[1];check(button.disabled && button.textContent.includes('system preference'),'guide exposes reduced-motion override');check(button.getAttribute('aria-pressed')==='false','guide pressed state reflects off');e.motion.set(false);check(!button.disabled,'guide toggle re-enabled after system override removed');button.click();check(panel.dataset.motion==='on','guide effects can be explicitly enabled');g.destroy();check(host.children.length===0,'guide destroy clears its UI');}
  for(const [page,start,progress,pause,step,manual] of [
    ['mfa-fatigue','mfaStart','mfaCount','mfaPause','mfaStep','mfaManual'],
    ['browser-permissions','permAllow','permAlerts','permPause','permNext','permManual'],
    ['fake-update','updateCheck','updateProgress','updatePause','updateStep','updateManual']]){
    const e=environment(page);e.run('awareness-labs.js');
    if(page==='browser-permissions')e.click('permVisit');
    if(page==='fake-update'){e.click('updateVisit');e.click('updateClose');e.click('updateSettings');}
    e.click(start);check(e.timers.size===1,`${page} starts timed playback`);
    const stale=[...e.timers.values()][0];e.tick();const before=e.node(progress).value||e.node(progress).textContent;const actions=e.node('simLog').children.length;
    e.motion.set(true);check(e.timers.size===0 && e.node(manual).checked,`${page} reduced motion pauses timers and selects manual`);stale();check((e.node(progress).value||e.node(progress).textContent)===before,`${page} stale callback cannot change progress`);check(e.node('simLog').children.length>=actions,`${page} pause retains event evidence`);
    e.motion.set(false);check(e.timers.size===0,`${page} preference removal does not auto-resume`);e.click(step);check(e.timers.size===0,`${page} single step stays paused`);e.click(pause);check(e.timers.size===1,`${page} explicit Resume starts timer`);e.hide();check(e.timers.size===0,`${page} hidden tab pauses playback`);e.show();check(e.timers.size===0,`${page} visible tab does not auto-resume`);
    const evidence=[...e.ids.values()].filter(n=>n.id.startsWith('e-'));check(evidence.every(n=>/Completed\.|Not completed\./.test(n.getAttribute('aria-label')||'')),`${page} checklist has accessible state`);
    e.click('simReset');check(e.timers.size===0 && e.node('simLog').children.length===0,`${page} reset cancels and clears evidence`);
  }
  for(const page of ['qr-phishing','suspicious-url']){
    const e=environment(page);e.run('inspection-labs.js','{handle, getState:()=>({playback,state})}');const t=e.window.__test,begin=()=>{if(page==='qr-phishing')t.handle('decode');else{t.handle('preview');t.handle('trace');}};begin();check(e.timers.size===1,`${page} starts timed playback`);
    e.node('inspection-pause').focus();t.handle('pause');check(e.document.activeElement.dataset.action==='resume',`${page} pause keeps focus on Resume`);e.node('inspection-resume').focus();t.handle('resume');check(e.document.activeElement.dataset.action==='pause',`${page} resume keeps focus on Pause`);
    const stale=[...e.timers.values()][0];e.tick();const index=t.getState().playback.index;e.motion.set(true);check(!t.getState().playback.running && e.timers.size===0,`${page} reduced motion pauses`);stale();check(t.getState().playback.index===index,`${page} stale callback preserves observations`);e.motion.set(false);check(e.timers.size===0,`${page} no automatic resume`);t.handle('resume');e.hide();check(!t.getState().playback.running && e.timers.size===0,`${page} hidden tab pauses`);e.show();t.handle('step');check(e.timers.size===0,`${page} step leaves no timer`);t.handle('reset');check(e.timers.size===0 && t.getState().playback===null,`${page} reset fully stops playback`);
  }
  {const e=environment('wifi-auditing');e.run('wifi-auditing.js','{discover,chooseAp,inspect,loadFixture,start,step,pause,reset,getState:()=>({phase,index,discovery,discoveryPaused,busy,report})}');const t=e.window.__test;t.discover();e.tick();const stale=[...e.timers.values()][0];e.motion.set(true);check(e.timers.size===0&&t.getState().discoveryPaused,'wifi discovery pauses for reduced motion');stale();check(e.node('wifiAps').children.length===1,'wifi discovery ignores stale reveal');e.click('wifiDiscoveryPlay');e.hide();check(e.timers.size===0&&t.getState().discoveryPaused,'wifi discovery pauses when hidden');e.show();e.click('wifiDiscoveryStep');check(t.getState().discovery==='done','wifi discovery can finish by step');t.chooseAp('weak');t.inspect();t.loadFixture();t.start();check(t.getState().phase==='paused'&&e.timers.size===0,'wifi reduced-motion audit prepares paused');t.start();check(e.timers.size===1,'wifi explicit resume plays');e.tick();await flush();check(t.getState().index===1,'wifi audit has one completed check');e.motion.set(false);e.motion.set(true);check(t.getState().phase==='paused'&&t.getState().index===1&&e.timers.size===0,'wifi live preference pause retains rows');e.crypto.defer=true;t.step();check(t.getState().busy,'wifi single check can be pending');e.hide();check(!t.getState().busy&&t.getState().phase==='paused','wifi hiding during async manual check pauses');e.deferredDigests.shift()(new Uint8Array(32).buffer);await flush();check(t.getState().index===1,'wifi stale async digest cannot add evidence');e.show();e.crypto.defer=false;t.step();await flush();check(t.getState().index===2&&e.timers.size===0,'wifi next step retries interrupted candidate once');t.reset();check(t.getState().index===0&&e.timers.size===0,'wifi reset clears current checks');}
  {const e=environment('dos-ddos',true);e.run('dos-ddos.js','{chooseView,guideStart,stepOnce,reset,getState:()=>({running,paused,tick,guideIndex,actions,baseline,status})}');const t=e.window.__test;check(e.node('guidePrevious').disabled,'DoS previous disabled on first scene');e.click('guideNext');check(t.getState().guideIndex===1&&!e.node('guidePrevious').disabled,'DoS next enables previous');t.guideStart(true);t.stepOnce();const before=t.getState().actions.length;e.click('guidePrevious');check(t.getState().guideIndex===0&&t.getState().tick===2&&!t.getState().running,'DoS previous changes scene and stops partial playback');check(t.getState().actions.length>=before,'DoS previous preserves report evidence');t.chooseView('advanced');e.click('trafficRun');check(t.getState().tick===1&&t.getState().paused&&e.timers.size===0,'DoS advanced reduced-motion run starts with one paused tick');e.click('trafficPause');check(e.timers.size===1,'DoS advanced explicit Resume works');const stale=[...e.timers.values()][0];e.hide();check(e.timers.size===0&&t.getState().paused,'DoS hidden tab pauses advanced playback');stale();check(t.getState().tick===1,'DoS stale callback cannot advance hidden run');e.show();check(e.timers.size===0,'DoS visible tab stays paused');e.motion.set(false);e.click('trafficPause');e.motion.set(true);check(t.getState().paused&&e.timers.size===0,'DoS advanced responds to live reduced-motion preference');t.reset();check(t.getState().tick===0&&t.getState().actions.length===0&&e.node('guidePrevious').disabled,'DoS reset clears evidence and returns first scene');
    t.chooseView('beginner'); t.guideStart(true);
    for (let i = 1; i < 12; i++) t.stepOnce();
    const completedBaseline = t.getState().baseline, completedActions = t.getState().actions.length;
    check(t.getState().status === 'completed' && completedBaseline, 'DoS completed scene records a baseline');
    e.click('guideNext'); e.click('guidePrevious');
    check(t.getState().baseline === completedBaseline && t.getState().status === 'completed', 'DoS scene navigation preserves completed baseline and report status');
    check(t.getState().actions.length === completedActions && t.getState().tick === 12, 'DoS navigation does not add fabricated run evidence');
    t.reset();
    check(t.getState().baseline === null, 'DoS explicit restart clears the previous baseline');
  }

  {
    const e = environment('port-scanning');
    e.run('port-scanning.js', '{findIp,findNetwork,stepDiscovery,startScan,stepScan,resetLab,getState:()=>({running,paused,checked,completed,network})}');
    const t = e.window.__test;
    t.findIp(); t.findNetwork(); e.tick();
    const staleDiscovery = [...e.timers.values()][0];
    e.hide();
    check(t.getState().network.paused && e.timers.size === 0, 'port discovery pauses when tab is hidden');
    staleDiscovery();
    check(t.getState().network.index === 1, 'port discovery ignores stale callbacks');
    e.show();
    check(e.timers.size === 0, 'port discovery does not resume automatically');
    t.stepDiscovery();
    check(t.getState().network.ready, 'port discovery can finish manually after interruption');
    t.startScan(); e.tick();
    const staleScan = [...e.timers.values()][0];
    e.hide();
    check(t.getState().paused && e.timers.size === 0, 'port scan pauses when tab is hidden');
    staleScan();
    check(t.getState().checked === 1, 'port scan retains completed replies and ignores stale callbacks');
    e.show();
    check(e.timers.size === 0, 'port scan does not resume automatically');
    t.stepScan();
    check(t.getState().checked === 2 && e.timers.size === 0, 'port scan can advance exactly one reply after interruption');
    e.click('portPause');
    check(e.timers.size === 1, 'port scan explicit resume works');
    e.motion.set(true);
    check(t.getState().paused && e.timers.size === 0, 'port existing reduced-motion pause still works');
    t.resetLab();
    check(t.getState().checked === 0 && !t.getState().network.ready && e.timers.size === 0, 'port reset cancels and clears progress');
  }
  console.log(`PASS: ${checks} focused VM assertions across guide and eight lab routes. No browser or network requests.`);
});
