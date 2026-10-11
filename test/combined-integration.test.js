'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {start,testEnv,login,dir}=require('./helpers');
const root=path.resolve(__dirname,'..');
test('all 12 integrated lab routes and browser asset references are served by the hardened allowlist',async()=>{
 const app=await start();try {
 const catalog=fs.readFileSync(path.join(root,'labs.html'),'utf8');
 const routes=[...catalog.matchAll(/class="cyber-card-link" href="\/([^"]+)"/g)].map(m=>m[1]);assert.equal(routes.length,12);
 const assets=new Set(['/lab-explanation.css','/lab-explanation.js']);
 for(const route of [...routes,'fake-login.html','local-capture.html','satisfaction.html','research-login.html','feedback.html']) {
  const r=await fetch(app.base+'/'+route);assert.equal(r.status,200,route);const html=await r.text();
  for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
   const url=new URL(match[1],app.base+'/'+route);
   if(url.origin===app.base && /\.(js|css|png|svg|jpg|json)$/.test(url.pathname))assets.add(url.pathname);
  }
 }
 for(const asset of assets)assert.equal((await fetch(app.base+asset)).status,200,asset);
 for(const blocked of ['/server.js','/research/auth.js','/test/lab-explanation.test.js','/docs/simulation-usability-review.md'])assert.equal((await fetch(app.base+blocked)).status,404,blocked);
 const config=await (await fetch(app.base+'/api/research/config')).json();assert.equal(config.enabled,false);assert.equal(config.study,null);
 }finally{await app.close();}
});
test('fixed classroom simulation contract works with hardened server and stays out of research',async()=>{
 const temp=dir();const app=await start(testEnv(temp,{RESEARCH_COLLECTION_ENABLED:'false',RESEARCH_DATABASE_PATH:''}));
 try{
 const headers={origin:app.base,'content-type':'application/json'};
 const event=await fetch(app.base+'/api/event',{method:'POST',headers,body:JSON.stringify({event:'clicked_phishing_link'})});assert.equal(event.status,200);
 const record={name:'Demo Student',usernameEntered:'Demo Student',passwordSubmitted:true,passwordLength:16,browser:'Synthetic test browser',os:'Test OS',platform:'Test',language:'en',screen:'1000 × 800',timezone:'UTC'};
 const submission=await fetch(app.base+'/api/submit',{method:'POST',headers,body:JSON.stringify(record)});assert.equal(submission.status,200);
 const {cookie}=await login(app);const authed={cookie};
 const legacy=await (await fetch(app.base+'/api/submissions',{headers:authed})).json();assert.equal(legacy.clickCount,1);assert.equal(legacy.submissions.length,1);assert.equal(legacy.submissions[0].name,'Demo Student');assert.equal(legacy.submissions[0].password,undefined);
 const report=await (await fetch(app.base+'/api/research/report',{headers:authed})).json();assert.equal(report.counts.responses,0);assert.equal(report.storageStatus,'not_configured');assert.equal(report.collectionEnabled,false);
 assert.equal((await fetch(app.base+'/api/feedback',{method:'POST',headers,body:'{}'})).status,410);
 }finally{await app.close();fs.rmSync(temp,{recursive:true,force:true});}
});
