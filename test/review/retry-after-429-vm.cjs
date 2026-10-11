'use strict';
const vm=require('node:vm'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'../..');
const {createApp}=require(root+'/server'),{scryptOptions}=require(root+'/research/auth'),{DatabaseSync}=require('node:sqlite');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cyberlab-retry-vm-'));
const password=crypto.randomBytes(24).toString('hex'),salt=crypto.randomBytes(32).toString('hex');
const env={APP_ORIGIN:'http://localhost:3000',ADMIN_USERNAME:'synthetic-review',ADMIN_PASSWORD_SALT:salt,ADMIN_PASSWORD_SCRYPT:crypto.scryptSync(password,Buffer.from(salt,'hex'),64,scryptOptions).toString('hex'),RESEARCH_DATABASE_PATH:path.join(dir,'test.sqlite'),RESEARCH_PERSISTENT_VOLUME_CONFIRMED:'true',RESEARCH_COLLECTION_ENABLED:'true',RESEARCH_ETHICS_APPROVED:'true',RESEARCH_SECURITY_REVIEWED:'true',STUDY_ID:'synthetic',CONSENT_VERSION:'test-1',STUDY_INFORMATION:'Synthetic review only',STUDY_CONSENT_TEXT:'Synthetic consent',RESEARCHER_CONTACT:'Synthetic',STUDY_RETENTION:'Delete after test',STUDY_WITHDRAWAL:'Synthetic',STUDY_ELIGIBILITY:'Synthetic records',STUDY_ETHICS_REFERENCE:'Local test only'};
let app;
(async()=>{
 app=createApp(env);await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;app.config.origin=base;
 const nodes=new Map();const get=id=>{if(!nodes.has(id))nodes.set(id,{id,textContent:'',value:'',checked:id==='consent',disabled:false,hidden:false,focus(){},addEventListener(){},querySelectorAll(){return[]},querySelector(){return null},reset(){}});return nodes.get(id)};
 get('feedback-form').querySelector=s=>s.includes('name="q1"')?{value:'5'}:null;
 const keys=[];const context=vm.createContext({document:{getElementById:get},window:{crypto:{randomUUID:()=>crypto.randomUUID()},setTimeout,clearTimeout},AbortController,fetch:async(route,opts)=>{
   keys.push(JSON.parse(opts.body).submissionKey);
   if(keys.length===1){const committed=await fetch(base+route,{...opts,headers:{...opts.headers,origin:base}});assert.equal(committed.status,200);throw Error('Synthetic lost response after commit');}
   if(keys.length===2)return{status:429,ok:false,json:async()=>({error:'Synthetic rate limit'})};
   return fetch(base+route,{...opts,headers:{...opts.headers,origin:base}});
 }});
 const original=fs.readFileSync(root+'/satisfaction.js','utf8');
 const cut=original.lastIndexOf('  initialize().catch(() => {');assert(cut>0);
 const code=original.slice(0,cut)+`\n  globalThis.harness={sendFeedback,configure(){enabled=true;instrument=${JSON.stringify(app.config.instrument)};study=${JSON.stringify(app.config.study)};},inspect(){return {retryLocked,key:retryPayload?.submissionKey||null};}};\n})();`;
 vm.runInContext(code,context);context.harness.configure();
 for(let n=0;n<3;n++)await context.harness.sendFeedback({preventDefault(){}});
 const db=new DatabaseSync(env.RESEARCH_DATABASE_PATH,{readOnly:true});const count=db.prepare('SELECT COUNT(*) AS n FROM responses').get().n;db.close();
 console.log(JSON.stringify({harness:'actual handler functions in VM; DOM mocked',firstRetryKeptKey:keys[0]===keys[1],retryAfter429KeptKey:keys[0]===keys[2],storedResponses:count,expectedResponses:1}));
 assert.equal(keys[0],keys[2],'Original idempotency key must survive 429 after uncertain delivery');assert.equal(count,1);
})().catch(e=>{console.error(e.message);process.exitCode=1}).finally(async()=>{if(app)await new Promise(r=>app.server.close(r));fs.rmSync(dir,{recursive:true,force:true})});
