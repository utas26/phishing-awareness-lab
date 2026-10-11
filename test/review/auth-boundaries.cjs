'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createAuth,scryptOptions}=require('../../research/auth');
(async()=>{
 const password=crypto.randomBytes(24).toString('hex'),salt=crypto.randomBytes(32).toString('hex');
 const config={origin:'https://synthetic.invalid',production:true,adminConfigured:true,adminUsername:'synthetic-review',salt,passwordHash:crypto.scryptSync(password,Buffer.from(salt,'hex'),64,scryptOptions).toString('hex')};
 const auth=createAuth(config),request=c=>({headers:{cookie:c}});
 assert.equal(auth.valid(request('admin_session=forged')),false);
 assert.equal(auth.valid(request('admin_session=%ZZ')),false);
 const attempts=[auth.login({username:config.adminUsername,password}),auth.login({username:config.adminUsername,password})];
 const third=await auth.login({username:config.adminUsername,password});assert.equal(third.status,429);
 const [login]=await Promise.all(attempts);assert.equal(login.status,200);assert(login.cookie.includes('; Secure;'));const cookie=login.cookie.split(';')[0];assert(auth.valid(request(cookie)));
 const originalNow=Date.now;
 try{const expiry=originalNow()+4*60*60*1000+1000;Date.now=()=>expiry;assert.equal(auth.valid(request(cookie)),false)}finally{Date.now=originalNow}
 assert.equal(auth.valid(request(cookie)),false);
 console.log('PASS forged and malformed cookies, secure production cookie, two-concurrent-scrypt ceiling, and four-hour expiry with server-side revocation.');
})().catch(e=>{console.error(e.message);process.exitCode=1});
