const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const root=require('path').resolve(__dirname,'..');
const routes={qr:'qr-phishing.html',mfa:'mfa-fatigue.html',update:'fake-update.html',browser:'browser-permissions.html',url:'suspicious-url.html',ports:'port-scanning.html',passwords:'password-strength.html'};
function setup(file, storage=new Map(), denyStorage=false){
 const ids=new Map(),timers=new Map(),windowHandlers={}; let serial=0;
 class Element {
  constructor(tag,attrs={}) {this.tagName=tag;this.attrs=attrs;this.children=[];this.listeners={};this._text='';this.dataset={};this.style={};this.disabled='disabled' in attrs;this.hidden='hidden' in attrs;this.checked=false;this.className=attrs.class||'';this.value=attrs.value||'';this.type=attrs.type||'';this.name=attrs.name||'';if(attrs.id)this.id=attrs.id;for(const[k,v]of Object.entries(attrs))if(k.startsWith('data-'))this.dataset[k.slice(5)]=v;this.classList={toggle:(cls,on)=>{const s=new Set(this.className.split(' ').filter(Boolean));on?s.add(cls):s.delete(cls);this.className=[...s].join(' ');}};}
  set id(id){this._id=id;ids.set(id,this);}get id(){return this._id;}
  set textContent(s){this._text=String(s);this.children=[];}get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
  set innerHTML(s){this._text=String(s);this.children=[];}get innerHTML(){return this._text;}
  get elements(){const out=[];const walk=n=>{for(const c of n.children){if(['input','textarea','select','button'].includes(c.tagName.toLowerCase()))out.push(c);walk(c);}};walk(this);return out;}reset(){for(const e of this.elements){e.checked=false;if(e.tagName.toLowerCase()==='textarea')e.value='';}}
  appendChild(c){this.children.push(c);c.parent=this;return c;}replaceChildren(...c){this._text='';this.children=c;}
  addEventListener(event,fn){(this.listeners[event]??=[]).push(fn);}dispatch(event){for(const fn of this.listeners[event]||[])fn({target:this,preventDefault(){}});if(event==='click'&&this.onclick)this.onclick();}
  click(){if(!this.disabled)this.dispatch('click');}
  setAttribute(k,v){this.attrs[k]=String(v);}removeAttribute(k){delete this.attrs[k];}
  querySelectorAll(sel){const out=[];function test(n){if(sel.startsWith('[')){const m=sel.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);return m[1] in n.attrs&&(m[2]===undefined||n.attrs[m[1]]===m[2]);}return sel.startsWith('#')?n.id===sel.slice(1):sel.startsWith('.')?n.className.split(' ').includes(sel.slice(1)):n.tagName===sel;}function walk(n){for(const c of n.children){if(test(c))out.push(c);walk(c);}}walk(this);return out;}
  querySelector(sel){return this.querySelectorAll(sel)[0]||null;}
 }
 const html=fs.readFileSync(root+'/'+file,'utf8'),docroot=new Element('document'),stack=[docroot];
 for(const m of html.matchAll(/<!--[\s\S]*?-->|<[^>]*>|[^<]+/g)){
  const token=m[0];if(token.startsWith('<!--')||token.startsWith('<!'))continue;
  if(token.startsWith('</')){if(stack.length>1)stack.pop();continue;}
  if(token.startsWith('<')){const tag=token.match(/^<([^\s>]+)/)?.[1];if(!tag)continue;const attrs={};for(const a of token.slice(tag.length+1,-1).matchAll(/([^\s=]+)(?:="([^"]*)"|='([^']*)'|=([^\s]+))?/g))attrs[a[1]]=a[2]??a[3]??a[4]??'';const node=new Element(tag,attrs);stack.at(-1).appendChild(node);if(!['meta','link','input','br','hr','img','source','area','base','embed','wbr'].includes(tag))stack.push(node);
  } else stack.at(-1)._text+=token;
 }
 for(const el of docroot.querySelectorAll('select')){const options=el.querySelectorAll('option');el.value=options[0]?.attrs.value??options[0]?.textContent??'';}
 const document={getElementById:id=>ids.get(id)||null,createElement:tag=>new Element(tag==='textarea'?'TEXTAREA':tag)};
 const location={hash:'',search:'',replace:v=>{location.replaced=v;},reload:()=>{location.reloaded=true;}};
 const window={sessionStorage:{getItem:k=>{if(denyStorage)throw Error('blocked');return storage.get(k)||null},setItem:(k,v)=>{if(denyStorage)throw Error('blocked');storage.set(k,v)}},crypto:require('crypto').webcrypto,scrollTo(){},requestAnimationFrame(fn){fn();},location,addEventListener:(e,fn)=>(windowHandlers[e]??=[]).push(fn)};
 class FormData {constructor(form){this.form=form;}entries(){return this.form.elements.filter(e=>e.name&&(e.type==='radio'?e.checked:e.tagName.toLowerCase()==='textarea')).map(e=>[e.name,e.value]);}}
 const context={document,window,FormData,location,console,Math,setTimeout:fn=>{const id=++serial;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id)};
 vm.createContext(context);
 const scripts=[...html.matchAll(/<script src="\/([^"]+)"/g)].map(m=>m[1]);
 for(const script of scripts)if(script!=='install.js')vm.runInContext(fs.readFileSync(root+'/'+script,'utf8'),context,{filename:script});
 return {storage, id:id=>{assert.ok(ids.has(id),'Missing node '+id+' in '+file);return ids.get(id);},doc:docroot,context,location,windowEvent:(e,event={})=>(windowHandlers[e]||[]).forEach(fn=>fn(event)),tick:()=>{const entry=timers.entries().next().value;if(entry){timers.delete(entry[0]);entry[1]();return true;}return false;},flush:()=>{let n=0;while(timers.size){const[id,fn]=timers.entries().next().value;timers.delete(id);fn();if(++n>1000)throw new Error('Unbounded timers');}},timerCount:()=>timers.size,html,scripts};
}

function answer(app,phase,values){const form=app.id(phase+'-form');for(const [name,value]of Object.entries(values)){const controls=form.elements.filter(e=>e.name===name);assert.ok(controls.length,'missing '+name);for(const control of controls){if(control.type==='radio')control.checked=control.value===String(value);else control.value=String(value);}}form.dispatch('input');}
const a=setup('feedback.html'), bank=a.context.window.UTAS_ASSESSMENT;
assert.equal(a.id('before-panel').hidden,false);assert.equal(a.id('after-panel').hidden,true);assert.equal(a.id('before-perceived').children.length,8);assert.equal(a.id('before-objective').children.length,10);assert.equal(a.id('after-satisfaction').children.length,10);assert.equal(a.id('answer-review').children.length,0);
const pre=Object.fromEntries(bank.objective.map((q,i)=>[q.id,i<5?q.correctIndex:4]));bank.perceivedKnowledge.forEach(q=>pre[q.id]=2);
answer(a,'before',pre);a.id('before-form').dispatch('submit');assert.equal(a.id('lab-panel').hidden,false);assert.equal(a.id('answer-review').children.length,0);assert.equal(a.id('objective-summary').children.length,0);
const b=setup('feedback.html',a.storage);assert.equal(b.id('lab-panel').hidden,false);const locked=JSON.parse(b.storage.values().next().value).before;b.id('before-form').dispatch('submit');assert.deepEqual(JSON.parse(b.storage.values().next().value).before,locked);
b.id('start-after').click();assert.equal(b.id('after-panel').hidden,false);b.id('return-to-labs').click();assert.equal(b.id('lab-panel').hidden,false);b.id('start-after').click();
const post=Object.fromEntries(bank.objective.map(q=>[q.id,q.correctIndex]));bank.perceivedKnowledge.forEach(q=>post[q.id]=4);bank.satisfaction.forEach((q,i)=>post[q.id]=i===0?'na':5);post.open_helpful='Demo feedback only';
answer(b,'after',post);
const c=setup('feedback.html',b.storage);c.id('start-after').click();assert.equal(c.id('open_helpful').value,'Demo feedback only');c.id('after-form').dispatch('submit');assert.equal(c.id('summary-panel').hidden,false);assert.match(c.id('objective-summary').textContent,/5 \/ 10/);assert.match(c.id('objective-summary').textContent,/10 \/ 10/);assert.match(c.id('score-change').textContent,/\+5 points/);assert.match(c.id('satisfaction-summary').textContent,/Not applicable/);assert.equal(c.id('answer-review').children.length,10);
const d=setup('feedback.html',c.storage);assert.equal(d.id('summary-panel').hidden,false);d.id('reset-assessment').click();assert.equal(d.id('before-panel').hidden,false);assert.equal(d.id('answer-review').children.length,0);assert.equal(JSON.parse(d.storage.values().next().value).before,null);assert.equal(d.id('open_helpful').value,'');
d.id('before-form').dispatch('submit');d.id('start-after').click();d.id('after-form').dispatch('submit');assert.match(d.id('objective-summary').textContent,/Incomplete/);assert.match(d.id('score-change').textContent,/Missing answers have not been treated as zero/);
const e=setup('feedback.html',new Map(),true);assert.match(e.id('storage-message').textContent,/cannot save/);e.id('before-form').dispatch('submit');e.id('start-after').click();e.id('after-form').dispatch('submit');assert.equal(e.id('summary-panel').hidden,false);
assert.doesNotMatch(fs.readFileSync(root+'/assessment.js','utf8'),/fetch\(|XMLHttpRequest|sendBeacon|https?:\/\//);
d.windowEvent('pageshow',{persisted:true});assert.equal(d.location.reloaded,true);e.windowEvent('pageshow',{persisted:true});assert.equal(e.location.reloaded,undefined);
const restoredControl=d.id('before-form').elements.find(e=>e.type==='radio');restoredControl.checked=true;d.windowEvent('pageshow',{persisted:false});assert.equal(restoredControl.checked,false);
console.log('PASS: item counts, baseline score hiding/lock, tab restoration, draft comments restoration, before/lab/after/back flow, complete objective scoring, skipped/missing semantics, not-applicable handling, answer review timing, reset, denied-storage fallback, no network APIs');
