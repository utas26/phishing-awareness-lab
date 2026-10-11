'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=require('node:path').resolve(__dirname,'../..');
const {createApp}=require(root+'/server'),{loadConfig}=require(root+'/research/config'),{scryptOptions}=require(root+'/research/auth'),{validateResponse,parseFilters,summarize,summaryCsv,responsesCsv}=require(root+'/research/data'),{ResearchStore}=require(root+'/research/store');
const instrument=require(root+'/research/instrument.json');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cyberlab-review-'));fs.chmodSync(dir,0o700);
// Synthetic test credentials exist only in this process environment and memory.
const pass=crypto.randomBytes(24).toString('hex'),salt=crypto.randomBytes(32).toString('hex'),hash=crypto.scryptSync(pass,Buffer.from(salt,'hex'),64,scryptOptions).toString('hex');
const base={APP_ORIGIN:'http://localhost:3000',ADMIN_USERNAME:'test-review',ADMIN_PASSWORD_SALT:salt,ADMIN_PASSWORD_SCRYPT:hash,RESEARCH_DATABASE_PATH:path.join(dir,'test.sqlite'),RESEARCH_PERSISTENT_VOLUME_CONFIRMED:'true',STUDY_ID:'synthetic-review',CONSENT_VERSION:'test-only-1',STUDY_INFORMATION:'Synthetic review data only',STUDY_CONSENT_TEXT:'Synthetic test consent',RESEARCHER_CONTACT:'synthetic',STUDY_RETENTION:'Delete after test',STUDY_WITHDRAWAL:'Synthetic',STUDY_ELIGIBILITY:'Synthetic records',STUDY_ETHICS_REFERENCE:'Local test only',RESEARCH_ETHICS_APPROVED:'true',RESEARCH_SECURITY_REVIEWED:'true',RESEARCH_COLLECTION_ENABLED:'true',NODE_ENV:'development'};
const response=(changes={})=>({instrumentVersion:instrument.version,consentVersion:base.CONSENT_VERSION,consent:true,submissionKey:crypto.randomUUID(),labId:null,answers:{},comments:{},...changes});
async function runServer(env,work){const app=createApp(env);await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+app.server.address().port;try{await work(app,async (route,options={})=>{const r=await fetch(url+route,options);const txt=await r.text();return{status:r.status,headers:r.headers,text:txt,json:()=>JSON.parse(txt)}})}finally{await new Promise(r=>app.server.close(r))}}
const json=(body,headers={})=>({method:'POST',headers:{origin:base.APP_ORIGIN,'content-type':'application/json',...headers},body:JSON.stringify(body)});
let completed=false;
test.after(()=>{fs.rmSync(dir,{recursive:true,force:true});completed=true});

test('configuration fail-closed and unsafe origin/storage rejects',()=>{
 assert.equal(loadConfig({},root).enabled,false);assert.equal(loadConfig(base,root).enabled,true);
 for(const key of ['APP_ORIGIN','ADMIN_USERNAME','ADMIN_PASSWORD_SALT','ADMIN_PASSWORD_SCRYPT','RESEARCH_DATABASE_PATH','RESEARCH_PERSISTENT_VOLUME_CONFIRMED','STUDY_ID','CONSENT_VERSION','STUDY_INFORMATION','STUDY_CONSENT_TEXT','RESEARCHER_CONTACT','STUDY_RETENTION','STUDY_WITHDRAWAL','STUDY_ELIGIBILITY','STUDY_ETHICS_REFERENCE','RESEARCH_ETHICS_APPROVED','RESEARCH_SECURITY_REVIEWED','RESEARCH_COLLECTION_ENABLED']){const env={...base};delete env[key];assert.equal(loadConfig(env,root).enabled,false,key)}
 for(const APP_ORIGIN of ['http://untrusted.example','https://example.com/','https://example.com/path','https://user:pass@example.com','null'])assert.equal(loadConfig({...base,APP_ORIGIN},root).enabled,false,APP_ORIGIN);
 assert.equal(loadConfig({...base,NODE_ENV:'production'},root).enabled,false);
 for(const RESEARCH_DATABASE_PATH of [root+'/secret.sqlite',':memory:','relative.sqlite','/tmp/missing-review-path/db.sqlite'])assert.equal(loadConfig({...base,RESEARCH_DATABASE_PATH},root).enabled,false,RESEARCH_DATABASE_PATH);
 fs.symlinkSync(root,path.join(dir,'source-link'));assert.equal(loadConfig({...base,RESEARCH_DATABASE_PATH:path.join(dir,'source-link','secret.sqlite')},root).enabled,false);
});

test('default server exposes no privileged endpoints or server source',async()=>runServer({},async(app,get)=>{
 assert.equal(app.config.enabled,false);assert.equal(app.storageStatus,'not_configured');
 let r=await get('/api/research/config');assert.equal(r.json().enabled,false);assert.equal(r.json().study,null);
 assert.equal((await get('/api/research/responses',json(response()))).status,503);
 assert.equal((await get('/api/admin-login',json({username:'admin',password:'admin'}))).status,503);
 for(const p of ['/api/research/report','/api/research/export.csv','/api/research/responses.csv','/api/submissions','/api/feedback'])assert.equal((await get(p)).status,401,p);
 for(const p of ['/server.js','/%73erver.js','/research/auth.js','/research/config.js','/research/store.js','/research/data.js','/research/instrument.json','/research/public-files.json','/package.json','/.env','/.git/config','/Dockerfile','/test/server.test.js','/docs/README.md','/%2e%2e/server.js','/research%2Fauth.js','/server.js%00.css'])assert.equal((await get(p)).status,404,p);
 assert.equal((await get('/%ZZ')).status,400);
 assert.equal((await get('/api/feedback',json({q1:5}))).status,410);
 assert.equal((await get('/')).status,200);assert.equal((await get('/healthz')).status,200);
}));

test('validation rejects fields, types, missing consent; normalizes omitted vs N/A',()=>{
 const config=loadConfig(base,root);
 for(const change of [{consent:false},{consent:'true'},{studentId:'SYNTHETIC'},{name:'SYNTHETIC'},{ip:'192.0.2.1'},{password:'SYNTHETIC'},{answers:{q1:'5'}},{answers:{q1:0}},{answers:{q1:6}},{answers:{q1:false}},{answers:{q11:5}},{comments:{other:'x'}},{comments:{usefulPart:'x'.repeat(1001)}},{comments:{usefulPart:'x\0y'}},{labId:'unknown'},{labId:undefined},{submissionKey:'not-uuid'},{instrumentVersion:'unknown'},{consentVersion:'unknown'}])assert.throws(()=>validateResponse(response(change),config),undefined,JSON.stringify(change));
 const r=validateResponse(response({answers:{q1:'na',q2:1,q3:5},comments:{usefulPart:'  synthetic comment  '}}),config);assert.equal(r.answers.q1,'na');assert.equal(r.answers.q4,null);assert.equal(r.comments.usefulPart,'synthetic comment');assert.equal(r.itemComplete,false);assert.equal(r.allLikert,false);
});

test('N/A versus missing counts, no invented denominators, safe CSV',()=>{
 const config=loadConfig(base,root),rows=[validateResponse(response({answers:{q1:5,q2:'na'}}),config),validateResponse(response({answers:Object.fromEntries(instrument.items.map(i=>[i.id,'na']))}),config),validateResponse(response({answers:Object.fromEntries(instrument.items.map(i=>[i.id,1]))}),config)];
 const report=summarize(rows,instrument,{from:'',to:'',lab:'',version:instrument.version});assert.deepEqual(report.counts,{responses:3,complete:2,partial:1,allLikert:1,missing:8,na:11,excluded:0});
 for(const item of report.items)assert.equal(item.valid+item.na+item.missing,3);
 assert.equal(report.items[0].agreePct,50);assert.equal(report.items[1].agreePct,0);
 for(const key of ['invited','eligible','opened'])assert.equal(report.participation[key],null);
 const empty=summarize([],instrument,{});assert.equal(empty.counts.responses,0);assert(empty.items.every(i=>i.agreePct===null));
 const raw=responsesCsv(rows,instrument);assert(!raw.includes('synthetic comment'));assert(!raw.includes('password'));assert(!raw.includes('submission_key'));assert(summaryCsv(report).includes('missing_n'));
});

test('strict filter validation',()=>{
 for(const search of ['from=2025-02-29','from=2024-02-30','from=2024-01-01&to=2023-12-31','from=2024-1-1','lab=unknown','version=unknown','lab=overall&lab=overall','foo=1'])assert.throws(()=>parseFilters(new URLSearchParams(search),instrument,[instrument.version]),undefined,search);
 assert.equal(parseFilters(new URLSearchParams('from=2024-02-29&lab=unspecified'),instrument,[instrument.version]).from,'2024-02-29');
});

test('authenticated server, CSRF, idempotency, private persistence and restart',async()=>{
 let key=crypto.randomUUID(),id,cookie;
 const body=response({submissionKey:key,answers:{q1:5,q2:'na',q3:3},comments:{usefulPart:'synthetic only'}});
 await runServer(base,async(app,get)=>{
 assert.equal(app.config.enabled,true);assert.equal(app.storageStatus,'ready');
 for(const headers of [{origin:'https://evil.example'},{origin:'null'},{origin:''},{'sec-fetch-site':'cross-site'},{'sec-fetch-site':'none'}]){
 assert.equal((await get('/api/admin-login',json({username:base.ADMIN_USERNAME,password:pass},headers))).status,403);
 assert.equal((await get('/api/research/responses',json(body,headers))).status,403);
 }
 assert.equal((await get('/api/admin-login',json({username:base.ADMIN_USERNAME,password:'wrong'}))).status,401);
 let login=await get('/api/admin-login',json({username:base.ADMIN_USERNAME,password:pass}));assert.equal(login.status,200);const setCookie=login.headers.get('set-cookie');assert(setCookie.includes('HttpOnly'));assert(setCookie.includes('SameSite=Strict'));cookie=setCookie.split(';')[0];
 let r=await get('/api/research/responses',json(body));assert.equal(r.status,200);id=r.json().responseId;assert.match(id,/^[a-f0-9-]{36}$/);
 r=await get('/api/research/responses',json(body));assert.equal(r.status,200);assert.equal(r.json().responseId,id);
 assert.equal((await get('/api/research/responses',json({...body,answers:{q1:1}}))).status,409);
 const headers={cookie};r=await get('/api/research/report',{headers});assert.equal(r.status,200);assert.equal(r.json().counts.responses,1);assert.equal(r.json().counts.na,1);assert.equal(r.json().counts.missing,7);assert(!r.text.includes('synthetic only'));
 for(const p of ['/api/research/export.csv','/api/research/responses.csv']){r=await get(p,{headers});assert.equal(r.status,200);assert(r.headers.get('content-disposition').startsWith('attachment;'));assert(!r.text.includes('synthetic only'));assert(!r.text.includes(pass));assert(!r.text.includes(key));}
 assert.equal((await get('/api/research/report?lab=phishing',{headers})).json().counts.responses,0);assert.equal((await get('/api/research/report?lab=unspecified',{headers})).json().counts.responses,1);
 assert.equal((await get('/api/research/report?lab=overall&lab=overall',{headers})).status,400);
 assert.equal((await get('/api/admin-logout',{method:'POST',headers:{origin:base.APP_ORIGIN,cookie}})).status,200);assert.equal((await get('/api/research/report',{headers})).status,401);
 for(const f of [base.RESEARCH_DATABASE_PATH,base.RESEARCH_DATABASE_PATH+'-wal',base.RESEARCH_DATABASE_PATH+'-shm'])assert.equal(fs.statSync(f).mode&0o077,0,f);
 });
 await runServer(base,async(app,get)=>{assert.equal(app.storageStatus,'ready');assert.equal((await get('/api/research/report',{headers:{cookie}})).status,401);const l=await get('/api/admin-login',json({username:base.ADMIN_USERNAME,password:pass}));cookie=l.headers.get('set-cookie').split(';')[0];const r=await get('/api/research/report',{headers:{cookie}});assert.equal(r.json().counts.responses,1);assert.equal((await get('/api/research/responses',json(body))).json().responseId,id)});
});

test('store scopes study/version/date/lab; preserves immutable snapshots',()=>{
 const file=path.join(dir,'scope.sqlite'),config=loadConfig({...base,RESEARCH_DATABASE_PATH:file},root),store=new ResearchStore(file,instrument,config.study);const records=[{labId:null,studyId:config.study.studyId,date:'2026-01-01T00:00:00.000Z'},{labId:'phishing',studyId:config.study.studyId,date:'2026-01-31T23:59:59.999Z'},{labId:'overall',studyId:'another-study',date:'2026-01-15T12:00:00.000Z'},{labId:'phishing',studyId:config.study.studyId,date:'2026-02-01T00:00:00.000Z'}];
 for(const x of records){const rec=validateResponse(response({labId:x.labId}),config);rec.studyId=x.studyId;const{id}=store.insert(rec);store.db.prepare('UPDATE responses SET submitted_at=? WHERE id=?').run(x.date,id)}
 let f={from:'2026-01-01',to:'2026-01-31',lab:'',version:instrument.version};assert.equal(store.rows(f,config.study.studyId).length,2);assert.equal(store.rows({...f,lab:'unspecified'},config.study.studyId).length,1);assert.equal(store.rows({...f,lab:'phishing'},config.study.studyId).length,1);store.close();
 assert.throws(()=>new ResearchStore(file,{...instrument,title:'Changed title'},config.study));assert.throws(()=>new ResearchStore(file,instrument,{...config.study,information:'Changed text'}));
});
