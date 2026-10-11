'use strict';
// Synthetic test-only settings. Nothing in this file configures a deployed service.
const crypto=require('node:crypto');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {scryptOptions}=require('../research/auth');
const password='SYNTHETIC TEST PASSWORD - NEVER DEPLOY';
const salt=Buffer.alloc(16,7).toString('hex');
const hash=crypto.scryptSync(password,Buffer.from(salt,'hex'),64,scryptOptions).toString('hex');
function testEnv(dir,overrides={}) {
 return {NODE_ENV:'test',APP_ORIGIN:'http://127.0.0.1:0',ADMIN_USERNAME:'synthetic-researcher',ADMIN_PASSWORD_SALT:salt,ADMIN_PASSWORD_SCRYPT:hash,
 RESEARCH_DATABASE_PATH:path.join(dir,'synthetic.sqlite'),RESEARCH_PERSISTENT_VOLUME_CONFIRMED:'true',RESEARCH_COLLECTION_ENABLED:'true',RESEARCH_ETHICS_APPROVED:'true',RESEARCH_SECURITY_REVIEWED:'true',
 STUDY_ID:'SYNTHETIC-QA-ONLY',CONSENT_VERSION:'synthetic-consent-1',STUDY_INFORMATION:'Synthetic local test. No real participants.',STUDY_CONSENT_TEXT:'Synthetic test consent only.',RESEARCHER_CONTACT:'Synthetic local QA contact',STUDY_RETENTION:'Remove after test.',STUDY_WITHDRAWAL:'Synthetic local QA only.',STUDY_ELIGIBILITY:'Synthetic fixtures only.',STUDY_ETHICS_REFERENCE:'SYNTHETIC TEST - NOT ETHICS APPROVAL',...overrides};
}
async function start(env={}) {
 const {createApp}=require('../server');const app=createApp(env);await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${app.server.address().port}`;if(env.APP_ORIGIN==='http://127.0.0.1:0')app.config.origin=base;
 return {...app,base,close:()=>new Promise(resolve=>app.server.close(resolve))};
}
async function login(app) {
 const result=await fetch(app.base+'/api/admin-login',{method:'POST',headers:{origin:app.base,'content-type':'application/json'},body:JSON.stringify({username:'synthetic-researcher',password})});
 return {result,cookie:result.headers.get('set-cookie')?.split(';')[0]};
}
function dir(){return fs.mkdtempSync(path.join(os.tmpdir(),'cyberlab-synthetic-qa-'));}
module.exports={testEnv,start,login,dir,password};
