'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {loadConfig}=require('./research/config');
const {createAuth}=require('./research/auth');
const {ResearchStore}=require('./research/store');
const {validateResponse,parseFilters,summarize,summaryCsv,responsesCsv}=require('./research/data');
const publicFiles=new Set(require('./research/public-files.json'));
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml'};
function send(res,status,body,type='application/json; charset=utf-8',extra={}) {
  res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store',...extra});
  res.end(typeof body==='string' || Buffer.isBuffer(body)?body:JSON.stringify(body));
}
function error(status,message) {const e=Error(message);e.status=status;return e;}
function readJson(req) {
  if (!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json')) return Promise.reject(error(415,'Use application/json.'));
  return new Promise((resolve,reject)=>{
    let chunks=[],length=0,failed=false;
    req.on('data',chunk=>{length+=chunk.length;if(length>20000){failed=true;chunks=[];reject(error(413,'Request too large.'));}else if(!failed)chunks.push(chunk);});
    req.on('end',()=>{if(failed)return;try{const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw Error();resolve(value);}catch{reject(error(400,'Invalid JSON object.'));}});
    req.on('error',()=>reject(error(400,'Interrupted request.')));
  });
}
function createApp(env=process.env) {
  const root=__dirname;
  const config=loadConfig(env,root);
  const auth=createAuth(config);
  let store=null,storageStatus='not_configured';
  if (config.databasePath) {
    try {store=new ResearchStore(config.databasePath,config.instrument,config.study);storageStatus='ready';}
    catch {storageStatus='unavailable';config.enabled=false;config.problems.push('The durable research store could not be opened.');}
  }
  if (!store) config.enabled=false;
  // Legacy teaching simulation records are deliberately separate from research.
  // They remain temporary and are not included in research reports or exports.
  const submissions=[],events=[];
  const teachingAdminUser=String(env.TEACHING_ADMIN_USERNAME||'admin');
  const teachingAdminPassword=String(env.TEACHING_ADMIN_PASSWORD||'');
  const teachingSessions=new Set();
  function teachingCookie(req){
    const raw=String(req.headers.cookie||'');
    const m=raw.match(/(?:^|;\s*)teaching_admin=([^;]+)/);
    return m?decodeURIComponent(m[1]):'';
  }
  function teachingValid(req){return teachingSessions.has(teachingCookie(req));}
  function newTeachingSession(){
    const token=require('node:crypto').randomBytes(24).toString('hex');
    teachingSessions.add(token);
    if(teachingSessions.size>100){const first=teachingSessions.values().next().value;teachingSessions.delete(first);}
    return token;
  }
  const homepageImage=Buffer.from(Array.from({length:24},(_,i)=>fs.readFileSync(path.join(root,'homepage-image-parts',String(i).padStart(2,'0')+'.base64'),'utf8')).join(''),'base64');
  let writeWindow=Date.now(),writeCount=0;
  function sameOrigin(req) {
    const origin=req.headers.origin;
    if (!config.origin) return false;
    return origin===config.origin && !['cross-site','none'].includes(req.headers['sec-fetch-site']);
  }
  function legacySameOrigin(req) {
    if(config.origin)return sameOrigin(req);
    // Keeps existing classroom-only simulations usable without enabling research/admin.
    // Host-bound same-origin requests only; origin is never trusted for research auth.
    try {return req.headers.origin && new URL(req.headers.origin).host===req.headers.host && req.headers['sec-fetch-site']!=='cross-site';}catch{return false;}
  }
  function researchRows(params) {
    const versions=store?store.versions():[config.instrument.version];
    const chosen=params.get('version')||config.instrument.version;
    const instrument=store?.instrument(chosen)||config.instrument;
    const filters=parseFilters(params,instrument,versions);
    const rows=store?store.rows(filters,config.study.studyId):[];
    return {rows,instrument,filters,versions};
  }
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    if(config.origin?.startsWith('https:'))res.setHeader('Strict-Transport-Security','max-age=31536000');
    try {
      const url=new URL(req.url,'http://localhost');
      const route=decodeURIComponent(url.pathname);
      if(route.startsWith('/api/research') || route.startsWith('/research-') || route==='/satisfaction.html') {
        res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
      }
      if(req.method==='GET' && route==='/healthz') return send(res,200,{ok:true});
      if(req.method==='GET' && route==='/api/research/config') return send(res,200,{enabled:config.enabled,instrument:config.instrument,study:config.enabled?config.study:null});
      if(req.method==='POST' && route==='/api/research/responses') {
        if(!config.enabled || !store) return send(res,503,{error:'Research collection is disabled. No response was saved.'});
        if(!sameOrigin(req)) return send(res,403,{error:'Same-origin submission required.'});
        if(Date.now()-writeWindow>60000){writeWindow=Date.now();writeCount=0;}
        if(++writeCount>120) return send(res,429,{error:'Submission limit reached. Please retry later with the same response.'});
        const body=await readJson(req);
        const record=validateResponse(body,config);
        let result;
        try {result=store.insert(record);}catch(e){if(e.status)throw e;return send(res,503,{error:'Storage is unavailable. Your response was not confirmed; retry with the same submission reference.'});}
        return send(res,200,{ok:true,responseId:result.id});
      }
      if(req.method==='GET' && ['/api/research/report','/api/research/export.csv','/api/research/responses.csv'].includes(route)) {
        if(!auth.valid(req))return send(res,401,{error:'Researcher login required.'});
        if(storageStatus==='unavailable')return send(res,503,{error:'Research storage is unavailable. No dataset was loaded.'});
        const {rows,instrument,filters,versions}=researchRows(url.searchParams);
        const report=summarize(rows,instrument,filters,{versions,labs:[...instrument.labs,{id:'unspecified',label:'Not specified'}],collectionEnabled:config.enabled,storageStatus,studyId:config.study.studyId||null});
        if(route.endsWith('.csv')) {
          if(!store)return send(res,503,{error:'No research store is configured. No dataset can be exported.'});
          const data=route==='/api/research/export.csv'?summaryCsv(report):responsesCsv(rows,instrument);
          return send(res,200,data,'text/csv; charset=utf-8',{'Content-Disposition':`attachment; filename="cyberlab-${route.endsWith('/responses.csv')?'coded-responses':'item-summary'}.csv"`});
        }
        return send(res,200,report);
      }
      if(req.method==='POST' && route==='/api/teaching-admin-login') {
        if(!legacySameOrigin(req))return send(res,403,{error:'Same-origin login required.'});
        if(!teachingAdminPassword)return send(res,503,{error:'Teaching admin login is not configured.'});
        const body=await readJson(req);
        const ok=String(body.username||'')===teachingAdminUser && String(body.password||'')===teachingAdminPassword;
        if(!ok)return send(res,401,{error:'Invalid credentials.'});
        const token=newTeachingSession();
        return send(res,200,{ok:true},undefined,{'Set-Cookie':`teaching_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=14400${config.origin?.startsWith('https:')?'; Secure':''}`});
      }
      if(req.method==='POST' && route==='/teaching-admin-logout') {
        const token=teachingCookie(req);if(token)teachingSessions.delete(token);
        return send(res,200,{ok:true},undefined,{'Set-Cookie':'teaching_admin=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'});
      }
      if(req.method==='POST' && route==='/api/admin-login') {
        if(!config.adminConfigured || !config.origin)return send(res,503,{error:'Researcher login is not configured.'});
        if(!sameOrigin(req))return send(res,403,{error:'Same-origin login required.'});
        const result=await auth.login(await readJson(req));
        return send(res,result.status,result.error?{error:result.error}:{ok:true},undefined,result.cookie?{'Set-Cookie':result.cookie}:{});
      }
      if(req.method==='POST' && route==='/api/admin-logout') {
        if(!sameOrigin(req))return send(res,403,{error:'Same-origin logout required.'});
        return send(res,200,{ok:true},undefined,{'Set-Cookie':auth.logout(req)});
      }
      if(req.method==='GET' && route==='/api/submissions') {
        if(!teachingValid(req) && !auth.valid(req))return send(res,401,{error:'Unauthorized'});
        return send(res,200,{submissions,clickCount:events.filter(e=>e.event==='clicked_phishing_link').length});
      }
      if(route==='/api/feedback') {
        if(req.method==='POST')return send(res,410,{error:'Legacy feedback collection has been retired. Use the versioned satisfaction form; research may still be disabled.'});
        if(req.method==='GET') {
          if(!auth.valid(req))return send(res,401,{error:'Unauthorized'});
          return send(res,200,{feedback:[],retired:true,message:'Legacy feedback was held only in process memory and is not a research dataset. No records were migrated.'});
        }
      }
      if(req.method==='POST' && ['/api/event','/api/submit'].includes(route)) {
        if(!legacySameOrigin(req))return send(res,403,{error:'Same-origin request required.'});
        const b=await readJson(req);
        const ip=req.socket.remoteAddress||'Unavailable'; // Never trust arbitrary forwarded headers.
        if(route==='/api/event') {
          events.push({name:String(b.name||'').slice(0,120),id:String(b.id||'').slice(0,80),event:String(b.event||'').slice(0,120),time:new Date().toISOString(),ip});
          if(events.length>2000)events.shift();
        } else {
          submissions.push({name:String(b.name||'Unknown student').slice(0,120),id:'',dummyUsername:String(b.usernameEntered||b.name||'Training user').slice(0,120),passwordSubmitted:Boolean(b.passwordSubmitted),passwordLength:Math.max(0,Math.min(128,Number(b.passwordLength)||0)),capturedAt:new Date().toLocaleString('en-US',{timeZone:'Asia/Muscat'}),ip,os:String(b.os||'Unavailable').slice(0,80),platform:String(b.platform||'Unavailable').slice(0,120),browser:String(b.browser||'Unavailable').slice(0,500),language:String(b.language||'Unavailable').slice(0,40),screen:String(b.screen||'Unavailable').slice(0,40),timezone:String(b.timezone||'Unavailable').slice(0,80)});
          if(submissions.length>1000)submissions.shift();
        }
        return send(res,200,{ok:true});
      }
      if(req.method!=='GET' && req.method!=='HEAD')return send(res,405,{error:'Method not allowed.'},undefined,{'Allow':'GET, HEAD'});
      if(route==='/research-dashboard.html' && !auth.valid(req))return send(res,303,'','text/plain',{'Location':'/research-login.html'});
      if(route==='/homepage-awareness.png')return send(res,200,req.method==='HEAD'?'':homepageImage,'image/png');
      const relative=route==='/'?'index.html':route.slice(1);
      if(!publicFiles.has(relative))return send(res,404,'Not found','text/plain; charset=utf-8');
      const filePath=path.join(root,relative);
      const real=fs.realpathSync(filePath);
      if(!real.startsWith(fs.realpathSync(root)+path.sep) || fs.lstatSync(filePath).isSymbolicLink())return send(res,404,'Not found','text/plain; charset=utf-8');
      const contents=fs.readFileSync(real);
      return send(res,200,req.method==='HEAD'?'':contents,mime[path.extname(relative)]||'application/octet-stream');
    } catch(e) {
      // Never log request bodies, passwords, comments, response IDs or participant identifiers.
      const status=e.status || (e.code==='ENOENT'?404:e instanceof URIError?400:500);
      return send(res,status,{error:status===500?'Server error. No result was confirmed.':e.status?e.message:status===404?'Not found':'Invalid request.'});
    }
  });
  server.requestTimeout=15000;server.headersTimeout=10000;server.maxHeadersCount=50;
  server.on('close',()=>store?.close());
  return {server,config,storageStatus};
}
if(require.main===module) {
  const app=createApp();
  const port=Number(process.env.PORT)||3000;
  app.server.listen(port,'0.0.0.0',()=>console.log(`CyberLab listening on ${port}; research collection ${app.config.enabled?'enabled':'disabled'}; storage ${app.storageStatus}.`));
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.server.close(()=>process.exit(0)));
}
module.exports={createApp};
