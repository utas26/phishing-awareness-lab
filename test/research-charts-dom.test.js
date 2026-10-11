const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert'),path=require('node:path');
const root=path.join(__dirname,'..');
const artifactDir=process.env.RESEARCH_QA_ARTIFACT_DIR;
if(artifactDir)fs.mkdirSync(artifactDir,{recursive:true});
function writeArtifact(name,value){if(artifactDir)fs.writeFileSync(path.join(artifactDir,name),value);}
function escape(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
class Node {
 constructor(name,doc){this.tagName=name;this.ownerDocument=doc;this.children=[];this.attrs={};this.style={};this._text='';this.clientWidth=1080;}
 setAttribute(k,v){this.attrs[k]=String(v)}
 getAttribute(k){return this.attrs[k]??null}
 appendChild(n){this.children.push(n);n.parent=this;return n}
 replaceChildren(...ns){this.children=ns;ns.forEach(n=>n.parent=this)}
 set textContent(v){this._text=String(v);this.children=[]}
 get textContent(){return this._text+this.children.map(n=>n.textContent).join('')}
 querySelectorAll(sel){const match=n=>sel==='*'||(sel==='[data-item-id]'?n.attrs['data-item-id']!==undefined:sel==='svg[data-research-chart]'?n.tagName==='svg'&&n.attrs['data-research-chart']:n.tagName===sel);return this.children.flatMap(n=>(match(n)?[n]:[]).concat(n.querySelectorAll(sel)))}
 querySelector(sel){return this.querySelectorAll(sel)[0]||null}
 cloneNode(){const n=new Node(this.tagName,this.ownerDocument);n.attrs={...this.attrs};n.style={...this.style};n._text=this._text;n.children=this.children.map(c=>c.cloneNode());return n;}
 get viewBox(){const [x,y,width,height]=(this.attrs.viewBox||'').split(' ').map(Number);return {baseVal:{x,y,width,height}}}
 click(){this.clicked=true}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this)}
}
const doc={createElementNS:(ns,name)=>new Node(name,doc),createElement:name=>new Node(name,doc),querySelector:()=>c};doc.body=new Node('body',doc);const c=new Node('div',doc);
function serialize(n){const attrs={...n.attrs};if(Object.keys(n.style).length)attrs.style=Object.entries(n.style).map(([k,v])=>k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())+':'+v).join(';');return '<'+n.tagName+Object.entries(attrs).map(([k,v])=>' '+k+'="'+escape(v)+'"').join('')+'>'+escape(n._text)+n.children.map(serialize).join('')+'</'+n.tagName+'>'}
const urls=[];const w={document:doc,Blob,XMLSerializer:class{serializeToString(n){return serialize(n)}},URL:{createObjectURL:b=>(urls.push(b),'blob:test'),revokeObjectURL:()=>{}},setTimeout:()=>{}};
Object.defineProperty(w,'localStorage',{get(){throw new Error('Forbidden localStorage access')}});Object.defineProperty(w,'sessionStorage',{get(){throw new Error('Forbidden sessionStorage access')}});w.fetch=()=>{throw new Error('Forbidden network')};
vm.runInNewContext(fs.readFileSync(path.join(root,'research-charts.js'),'utf8'),{window:w});
const instrument=JSON.parse(fs.readFileSync(path.join(root,'research','instrument.json'),'utf8'));
const wording=instrument.items[0].text;
const items=instrument.items.map((item,i)=>({id:item.id,text:item.text,counts:i===9?[0,0,0,0,0]:[1,2,4,10,15],valid:999,na:2,missing:3}));
const opt={title:'SYNTHETIC QA ONLY',subtitle:'No real student responses. Illustrative renderer fixture.',version:instrument.version,filterText:'Study: SYNTHETIC-QA-ONLY; all activities; artificial test counts',footer:'Synthetic QA fixture only. No real student responses or research findings are represented.'};
(async()=>{
 let cases=0;
 for(const width of [1080,740,380,340]){
 c.clientWidth=width;
 let svg=w.ResearchCharts.renderLikert(c,items,{...opt,title:opt.title+' · Item distributions'});
 assert.equal(svg.tagName,'svg');assert.equal(svg.querySelectorAll('[data-item-id]').length,10);assert.equal(svg.attrs.role,'img');assert(svg.querySelector('desc').textContent.includes(wording));assert(svg.textContent.includes('n = 32'));assert(!svg.textContent.includes('n = 999'));assert(svg.textContent.includes('N/A = 2'));assert(svg.textContent.includes('Missing = 3'));assert(svg.textContent.includes('No valid responses'));assert.equal(svg.viewBox.baseVal.width,width);
 for(const r of svg.querySelectorAll('rect'))for(const attr of ['x','y','width','height'])assert(Number.isFinite(Number(r.attrs[attr])));
 if(width===1080||width===380)writeArtifact('synthetic-qa-likert-'+width+'.svg',serialize(svg));
 svg=w.ResearchCharts.renderDistribution(c,items[0],{...opt,title:opt.title+' · Q1 distribution'});assert(svg.textContent.includes('46.9%'));assert(svg.textContent.includes('100% of valid responses'));
 if(width===1080||width===380)writeArtifact('synthetic-qa-distribution-'+width+'.svg',serialize(svg));
 svg=w.ResearchCharts.renderFlow(c,{invited:null,eligible:null,opened:null,consented:42,submitted:38,complete:30,partial:8,analysis:38,notes:['Repeat submissions cannot be ruled out.']},{...opt,title:opt.title+' · Participation record'});assert(svg.textContent.includes('Not recorded'));assert(svg.textContent.includes('Submitted records are not necessarily unique participants'));assert(svg.textContent.includes('Repeat submissions cannot be ruled out.'));
 if(width===1080||width===380)writeArtifact('synthetic-qa-flow-'+width+'.svg',serialize(svg));cases+=3;
 }
 let svg=w.ResearchCharts.renderLikert(c,[],opt);assert(svg.textContent.includes('No item data'));cases++;
 svg=w.ResearchCharts.renderDistribution(c,{id:'Q1',text:'<script>alert(1)</script>',counts:[0,0,0,0,0],na:2,missing:4},opt);assert(!svg.querySelector('script'));assert(svg.textContent.includes('not estimable'));cases++;
 const out=await w.ResearchCharts.download(c,'svg','test<>.svg');assert(out.blob.size>100);assert.equal(out.filename,'test--.svg');assert((await out.blob.text()).includes('&lt;script&gt;'));cases++;
 await assert.rejects(()=>w.ResearchCharts.download(c,'pdf','test'),/Choose SVG or PNG/);cases++;
 console.log('PASS: '+cases+' renderer/export cases; four widths; exact wording; 10 rows; numeric denominator; N/A/missing; empty and zero states; no HTML execution; SVG export. PNG browser execution is outside this DOM test; requires browser QA.');
})().catch(e=>{console.error(e);process.exit(1)});
