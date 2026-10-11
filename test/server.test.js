'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const crypto=require('node:crypto');const fs=require('node:fs');const path=require('node:path');
const {testEnv,start,login,dir}=require('./helpers');const instrument=require('../research/instrument.json');
function body(patch={}) {return {instrumentVersion:instrument.version,labId:null,answers:{q1:5,q2:'na'},comments:{usefulPart:'Synthetic local test only',improvement:''},consent:true,consentVersion:'synthetic-consent-1',submissionKey:crypto.randomUUID(),...patch};}
async function post(app,url,data,extra={}) {return fetch(app.base+url,{method:'POST',headers:{origin:app.base,'content-type':'application/json',...extra},body:JSON.stringify(data)});}
test('default deployment keeps collection and admin disabled; no source, database or dotfile exposures',async()=>{
 const app=await start();try {
  const config=await (await fetch(app.base+'/api/research/config')).json();assert.equal(config.enabled,false);assert.equal(config.study,null);
  assert.equal((await post(app,'/api/research/responses',body())).status,503);assert.equal((await post(app,'/api/admin-login',{})).status,503);assert.equal((await post(app,'/api/feedback',{})).status,410);
  for(const route of ['/server.js','/package.json','/Dockerfile','/.env','/research/config.js','/research/instrument.json','/test/helpers.js','/README.md','/homepage-image-parts/00.base64','/%2e%2e%2fserver.js','/research%2fstore.js','/server.js?x=1'])assert.equal((await fetch(app.base+route)).status,404,route);
  for(const route of ['/','/labs.html','/feedback.html','/assessment-items.js','/port-scanning.html','/sql-injection.html','/xss.html','/dos-ddos.html','/wifi-auditing.html','/manifest.json','/homepage-awareness.png','/icons/utas-primary.svg'])assert.equal((await fetch(app.base+route)).status,200,route);
  for(const route of ['/api/research/report','/api/research/export.csv','/api/research/responses.csv','/api/submissions','/api/feedback'])assert.equal((await fetch(app.base+route)).status,401,route);
  const dash=await fetch(app.base+'/research-dashboard.html',{redirect:'manual'});assert.equal(dash.status,303);assert.equal(dash.headers.get('location'),'/research-login.html');
  assert.equal((await fetch(app.base+'/%E0%A4%A')).status,400);
 }finally{await app.close();}
});
test('synthetic configured store validates submissions, idempotence, protected reports, CSV, origin and logout',async()=>{
 const temp=dir();const app=await start(testEnv(temp));try {
  assert.equal(app.config.enabled,true);
  const loginResult=await login(app);assert.equal(loginResult.result.status,200);assert.match(loginResult.result.headers.get('set-cookie'),/HttpOnly/);assert.match(loginResult.result.headers.get('set-cookie'),/SameSite=Strict/);assert.ok(loginResult.cookie);
  assert.equal((await post(app,'/api/admin-login',{}, {origin:'https://untrusted.example'})).status,403);
  assert.equal((await post(app,'/api/research/responses',body(),{origin:'https://untrusted.example'})).status,403);
  const invalid=await post(app,'/api/research/responses',body({name:'Do not collect'}));assert.equal(invalid.status,400);
  assert.equal((await post(app,'/api/research/responses',body({answers:{q1:6}}))).status,400);
  assert.equal((await post(app,'/api/research/responses',body({consent:false}))).status,400);
  const input=body();const saved=await post(app,'/api/research/responses',input);assert.equal(saved.status,200);const receipt=await saved.json();assert.ok(receipt.responseId);
  const duplicate=await (await post(app,'/api/research/responses',input)).json();assert.equal(duplicate.responseId,receipt.responseId);
  assert.equal((await post(app,'/api/research/responses',{...input,answers:{q1:1}})).status,409);
  const second=body({labId:'phishing',answers:Object.fromEntries(instrument.items.map(i=>[i.id,4]))});assert.equal((await post(app,'/api/research/responses',second)).status,200);
  const headers={cookie:loginResult.cookie};const r=await fetch(app.base+'/api/research/report',{headers});assert.equal(r.status,200);const report=await r.json();assert.equal(report.counts.responses,2);assert.equal(report.counts.complete,1);assert.equal(report.counts.na,1);assert.equal(report.counts.missing,8);assert.equal(report.items[0].agreePct,100);assert.equal(report.storageStatus,'ready');assert.equal(report.participation.invited,null);
  assert.equal((await (await fetch(app.base+'/api/research/report?lab=phishing',{headers})).json()).counts.responses,1);
  assert.equal((await (await fetch(app.base+'/api/research/report?lab=unspecified',{headers})).json()).counts.responses,1);
  assert.equal((await (await fetch(app.base+'/api/research/report?to=2001-01-01',{headers})).json()).counts.responses,0);
  assert.equal((await fetch(app.base+'/api/research/report?from=2026-02-30',{headers})).status,400);
  assert.equal((await fetch(app.base+'/api/research/report?lab=no',{headers})).status,400);
  const csv=await fetch(app.base+'/api/research/responses.csv',{headers});assert.equal(csv.status,200);assert.match(csv.headers.get('content-type'),/text\/csv/);const text=await csv.text();assert.ok(!text.includes('Synthetic local test only'));assert.ok(!text.includes('payload_hash'));assert.ok(!text.includes('submission_key'));assert.ok(text.includes('"NA"'));
  const summary=await fetch(app.base+'/api/research/export.csv',{headers});assert.equal(summary.status,200);assert.ok((await summary.text()).includes('Overall, I am satisfied'));
  assert.equal((await post(app,'/api/admin-logout',{}, {cookie:loginResult.cookie})).status,200);assert.equal((await fetch(app.base+'/api/research/report',{headers})).status,401);
  const database=fs.readFileSync(path.join(temp,'synthetic.sqlite'));assert.ok(!database.includes(Buffer.from('Do not collect')));
 }finally {await app.close();fs.rmSync(temp,{recursive:true,force:true});}
});
test('no-store report is explicitly marked and export fails instead of fabricating a dataset',async()=>{
 const temp=dir();const app=await start(testEnv(temp,{RESEARCH_DATABASE_PATH:'',RESEARCH_COLLECTION_ENABLED:'false'}));try {
 const {cookie}=await login(app);const headers={cookie};const report=await (await fetch(app.base+'/api/research/report',{headers})).json();assert.equal(report.storageStatus,'not_configured');assert.equal(report.collectionEnabled,false);assert.equal(report.counts.responses,0);assert.equal((await fetch(app.base+'/api/research/export.csv',{headers})).status,503);
 }finally {await app.close();fs.rmSync(temp,{recursive:true,force:true});}
});
test('request parser rejects malformed, non-JSON and oversized input safely',async()=>{
 const temp=dir();const app=await start(testEnv(temp));try {
 for(const [data,type,status] of [['{','application/json',400],['x','text/plain',415],[JSON.stringify({data:'x'.repeat(21000)}),'application/json',413]]) {const r=await fetch(app.base+'/api/research/responses',{method:'POST',headers:{origin:app.base,'content-type':type},body:data});assert.equal(r.status,status);}
 assert.equal((await fetch(app.base+'/healthz')).status,200);
 }finally{await app.close();fs.rmSync(temp,{recursive:true,force:true});}
});
test('disabled incomplete study settings do not freeze blank consent metadata',async()=>{
 const temp=dir();const base=testEnv(temp,{RESEARCH_COLLECTION_ENABLED:'false',STUDY_INFORMATION:''});
 try {const first=await start(base);assert.equal(first.storageStatus,'ready');assert.equal(first.config.enabled,false);await first.close();const second=await start(testEnv(temp));assert.equal(second.storageStatus,'ready');assert.equal(second.config.enabled,true);await second.close();}finally{fs.rmSync(temp,{recursive:true,force:true});}
});
