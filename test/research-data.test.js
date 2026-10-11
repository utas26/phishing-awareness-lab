'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const crypto=require('node:crypto');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const instrument=require('../research/instrument.json');
const {validateResponse,parseFilters,summarize,summaryCsv,responsesCsv,csvCell}=require('../research/data');
const {ResearchStore}=require('../research/store');const {loadConfig}=require('../research/config');
const config={instrument,study:{studyId:'SYNTHETIC-TEST',consentVersion:'test-consent-v1'}};
function response(overrides={}) {return {instrumentVersion:instrument.version,consentVersion:config.study.consentVersion,consent:true,submissionKey:crypto.randomUUID(),labId:null,answers:{q1:5,q2:'na'},comments:{usefulPart:'Synthetic test only',improvement:''},...overrides};}
test('instrument preserves all original statements, comments and agreement labels verbatim',()=>{
 const content=fs.readFileSync(path.join(__dirname,'../assessment-items.js'),'utf8');const original=JSON.parse(content.split('window.UTAS_ASSESSMENT = ')[1].trim().slice(0,-1));
 assert.deepEqual(instrument.items.map(x=>x.text),original.satisfaction.map(x=>x.text));assert.deepEqual(instrument.comments.map(x=>x.text),original.openPrompts.map(x=>x.text));assert.deepEqual(instrument.scale,original.satisfactionScale);assert.equal(instrument.items.length,10);
});
test('schema rejects unexpected personal identifiers, invalid values and missing consent',()=>{
 const valid=validateResponse(response(),config);assert.equal(valid.answers.q3,null);assert.equal(valid.answers.q2,'na');assert.equal(valid.itemComplete,false);
 for(const patch of [{name:'No'},{studentId:'No'},{ip:'No'},{password:'No'},{consent:false},{consentVersion:'old'},{instrumentVersion:'old'},{submissionKey:'bad'},{labId:'unknown'},{answers:{q1:'5'}},{answers:{q1:0}},{answers:{q1:6}},{answers:{q11:1}},{comments:{email:'No'}},{comments:{usefulPart:'x'.repeat(1001)}}])assert.throws(()=>validateResponse(response(patch),config));
});
test('counts distinguish numeric, N/A, missing, complete and all-Likert, without a composite',()=>{
 const a=validateResponse(response({answers:Object.fromEntries(instrument.items.map(i=>[i.id,4]))}),config);
 const b=validateResponse(response({answers:{q1:1,q2:'na'}}),config);
 const c=validateResponse(response({answers:Object.fromEntries(instrument.items.map(i=>[i.id,'na']))}),config);
 const r=summarize([a,b,c],instrument,{});assert.deepEqual(r.counts,{responses:3,complete:2,partial:1,allLikert:1,missing:8,na:11,excluded:0});assert.deepEqual(r.items[0].counts,[1,0,0,1,0]);assert.equal(r.items[0].agreePct,50);assert.equal(r.items[1].valid,1);assert.equal(r.items[1].na,2);assert.equal(r.participation.invited,null);assert.equal(r.participation.opened,null);assert.equal(r.composite,undefined);
 const empty=summarize([],instrument,{});assert.equal(empty.items[0].agreePct,null);assert.equal(empty.counts.responses,0);
});
test('filters validate dates, inverted ranges, versions, duplicate params and SQL-like input',()=>{
 const check=q=>parseFilters(new URLSearchParams(q),instrument,[instrument.version]);
 assert.equal(check('from=2026-02-28&to=2026-10-11&lab=unspecified').lab,'unspecified');
 for(const q of ['from=2026-02-30','from=2026-13-01','from=2026-10-11&to=2026-10-10','version=no','lab=%27OR1%3D1','from=2026-01-01&from=2026-01-02','unknown=x'])assert.throws(()=>check(q));
});
test('Excel-compatible CSV escapes formulas and excludes comments and identity fields',()=>{
 assert.equal(csvCell(' =2+2'),'"\' =2+2"');assert.equal(csvCell('a"b'),'"a""b"');
 const row={...validateResponse(response(),config),id:'synthetic',submittedAt:'2026-10-11T00:00:00.000Z'};
 const output=responsesCsv([row],instrument);assert.ok(output.startsWith('\uFEFF'));assert.ok(output.includes('"NA"'));assert.ok(!output.includes('Synthetic test only'));assert.ok(!output.includes('comments'));assert.ok(!output.includes('student'));assert.ok(!output.includes('ip_address'));
 const report=summarize([row],instrument,{from:'',to:'',lab:'',version:instrument.version});assert.ok(summaryCsv(report).includes('"numeric_n"'));
});
test('research store is durable across close/reopen, idempotent and outside public routing',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cyberlab-synthetic-test-'));const file=path.join(dir,'research.sqlite');
 try {assert.throws(()=>new ResearchStore(':memory:',instrument,config.study));let store=new ResearchStore(file,instrument,config.study);const record=validateResponse(response(),config);const first=store.insert(record);assert.equal(store.insert(record).id,first.id);assert.throws(()=>store.insert({...record,payloadHash:'different'}));store.close();store=new ResearchStore(file,instrument,config.study);const rows=store.rows({version:instrument.version,from:'',to:'',lab:'unspecified'},config.study.studyId);assert.equal(rows.length,1);assert.equal(rows[0].id,first.id);assert.equal(rows[0].answers.q2,'na');assert.equal(rows[0].answers.q3,null);assert.equal(rows[0].comments,undefined);assert.equal(store.rows({version:instrument.version,from:'2099-01-01',to:'',lab:''},config.study.studyId).length,0);store.close();assert.throws(()=>new ResearchStore(file,{...instrument,title:'mutated same version'},config.study));}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('configuration fails closed with absent, partial, insecure or source-tree storage settings',()=>{
 const root=path.resolve(__dirname,'..');assert.equal(loadConfig({},root).enabled,false);assert.equal(loadConfig({RESEARCH_COLLECTION_ENABLED:'true'},root).enabled,false);assert.equal(loadConfig({APP_ORIGIN:'https://example.com/path'},root).origin,null);assert.equal(loadConfig({APP_ORIGIN:'http://example.com'},root).origin,null);assert.equal(loadConfig({APP_ORIGIN:'http://localhost:3000',NODE_ENV:'production'},root).origin,null);assert.equal(loadConfig({RESEARCH_DATABASE_PATH:path.join(root,'research.sqlite'),RESEARCH_PERSISTENT_VOLUME_CONFIRMED:'true'},root).databasePath,null);
});
