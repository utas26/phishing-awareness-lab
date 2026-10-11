'use strict';
const crypto=require('node:crypto');
const {promisify}=require('node:util');
const scrypt=promisify(crypto.scrypt);
const scryptOptions={N:131072,r:8,p:1,maxmem:256*1024*1024};
function cookieValue(req,name) {
  for (const part of String(req.headers.cookie||'').split(';')) {
    const i=part.indexOf('=');
    if (part.slice(0,i).trim()===name) {try{return decodeURIComponent(part.slice(i+1));}catch{return '';}}
  }
  return '';
}
function createAuth(config) {
  const sessions=new Map();
  // A single process-wide throttle avoids retaining IPs or trusting spoofable proxy headers.
  // Institution reverse-proxy/SSO controls are still required before public collection.
  let windowStart=Date.now(), attempts=0, active=0;
  const ttl=4*60*60*1000;
  const secure=config.origin?.startsWith('https:') || config.production;
  const cookie=(token,seconds)=>`admin_session=${token}; Path=/; HttpOnly; ${secure?'Secure; ':''}SameSite=Strict; Max-Age=${seconds}`;
  function valid(req) {
    const token=cookieValue(req,'admin_session'); const expiry=sessions.get(token);
    if (!expiry || expiry<=Date.now() || !config.adminConfigured) {if(token)sessions.delete(token);return false;}
    return true;
  }
  async function login(body) {
    if (!config.adminConfigured || !config.origin) return {status:503,error:'Researcher login is not configured.'};
    if (Date.now()-windowStart>15*60*1000) {windowStart=Date.now();attempts=0;}
    if (attempts>=20 || active>=2) return {status:429,error:'Too many login attempts. Try again later.'};
    attempts++;active++;
    try {
      const password=typeof body.password==='string' && body.password.length<=1024?body.password:'';
      const key=await scrypt(password,Buffer.from(config.salt,'hex'),64,scryptOptions);
      const sameHash=crypto.timingSafeEqual(key,Buffer.from(config.passwordHash,'hex'));
      const nameHash=crypto.createHash('sha256').update(String(body.username||'')).digest();
      const targetHash=crypto.createHash('sha256').update(config.adminUsername).digest();
      if (!sameHash || !crypto.timingSafeEqual(nameHash,targetHash)) return {status:401,error:'Invalid researcher credentials.'};
      const token=crypto.randomBytes(32).toString('hex');
      for(const [k,v] of sessions) if(v<Date.now())sessions.delete(k);
      if(sessions.size>=100) return {status:429,error:'Session limit reached. Try again later.'};
      sessions.set(token,Date.now()+ttl);
      return {status:200,cookie:cookie(token,ttl/1000)};
    } finally {active--;}
  }
  function logout(req) { sessions.delete(cookieValue(req,'admin_session'));return cookie('',0); }
  return {valid,login,logout};
}
module.exports={createAuth,scryptOptions};
