const http=require('http');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

const port=process.env.PORT||3000;
const root=__dirname;
const submissions=[];
const events=[];
const sessions=new Set();
const feedbackResponses=[];

const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml'};

function send(res,status,body,type='application/json; charset=utf-8'){
  res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store'});
  res.end(typeof body==='string'?body:JSON.stringify(body));
}
function readJson(req){
  return new Promise((resolve,reject)=>{
    let b=''; req.on('data',c=>{b+=c;if(b.length>20000)req.destroy();});
    req.on('end',()=>{try{resolve(b?JSON.parse(b):{});}catch(e){reject(e);}});
  });
}
function ipOf(req){
  const x=req.headers['x-forwarded-for'];
  if(x) return String(x).split(',')[0].trim();
  return req.socket.remoteAddress||'Unavailable';
}
function cookies(req){
  const out={}; String(req.headers.cookie||'').split(';').forEach(p=>{const i=p.indexOf('=');if(i>0)out[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim())}); return out;
}
function isAdmin(req){return sessions.has(cookies(req).admin_session);}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  try{
    if(req.method==='POST' && url.pathname==='/api/event'){
      const b=await readJson(req);
      events.push({name:String(b.name||''),id:String(b.id||''),event:String(b.event||''),time:new Date().toISOString(),ip:ipOf(req)});
      console.log(JSON.stringify({type:'training_event',event:b.event,name:b.name,id:b.id,ip:ipOf(req)}));
      return send(res,200,{ok:true});
    }

    if(req.method==='POST' && url.pathname==='/api/submit'){
      const b=await readJson(req);
      const rec={
        name:String(b.name||'Unknown student').slice(0,120),
        id:'',
        dummyUsername:String(b.usernameEntered||b.name||'Training user').slice(0,120),
        passwordSubmitted:Boolean(b.passwordSubmitted),
        passwordLength:Math.max(0,Math.min(128,Number(b.passwordLength)||0)),
        capturedAt:new Date().toLocaleString('en-US',{timeZone:'Asia/Muscat'}),
        ip:ipOf(req),
        os:String(b.os||'Unavailable').slice(0,80),
        platform:String(b.platform||'Unavailable').slice(0,120),
        browser:String(b.browser||'Unavailable').slice(0,500),
        language:String(b.language||'Unavailable').slice(0,40),
        screen:String(b.screen||'Unavailable').slice(0,40),
        timezone:String(b.timezone||'Unavailable').slice(0,80)
      };
      submissions.push(rec);
      if(submissions.length>1000) submissions.shift();
      console.log(JSON.stringify({type:'training_submission',...rec,password:'[not collected]'}));
      return send(res,200,{ok:true});
    }

    if(req.method==='POST' && url.pathname==='/api/feedback'){
      const b=await readJson(req);
      const rec={
        name:String(b.name||'').slice(0,120),
        studentId:String(b.studentId||'').slice(0,80),
        className:String(b.className||'').slice(0,120),
        level:String(b.level||'').slice(0,120),
        subject:String(b.subject||'').slice(0,160),
        q1:Number(b.q1)||0,q2:Number(b.q2)||0,q3:Number(b.q3)||0,q4:Number(b.q4)||0,q5:Number(b.q5)||0,
        q6:Number(b.q6)||0,q7:Number(b.q7)||0,q8:Number(b.q8)||0,q9:Number(b.q9)||0,q10:Number(b.q10)||0,
        usefulPart:String(b.usefulPart||'').slice(0,1200),
        improvement:String(b.improvement||'').slice(0,1200),
        submittedAt:new Date().toLocaleString('en-US',{timeZone:'Asia/Muscat'})
      };
      feedbackResponses.push(rec);
      if(feedbackResponses.length>2000) feedbackResponses.shift();
      return send(res,200,{ok:true});
    }

    if(req.method==='GET' && url.pathname==='/api/feedback'){
      if(!isAdmin(req)) return send(res,401,{error:'Unauthorized'});
      return send(res,200,{feedback:feedbackResponses});
    }

    if(req.method==='POST' && url.pathname==='/api/admin-login'){
      const b=await readJson(req);
      if(b.username==='admin' && b.password==='admin123'){
        const token=crypto.randomBytes(24).toString('hex'); sessions.add(token);
        res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Set-Cookie':`admin_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=14400`,'Cache-Control':'no-store'});
        return res.end(JSON.stringify({ok:true}));
      }
      return send(res,401,{error:'Invalid credentials'});
    }

    if(req.method==='POST' && url.pathname==='/api/admin-logout'){
      const c=cookies(req); if(c.admin_session)sessions.delete(c.admin_session);
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Set-Cookie':'admin_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0','Cache-Control':'no-store'});
      return res.end(JSON.stringify({ok:true}));
    }

    if(req.method==='GET' && url.pathname==='/api/submissions'){
      if(!isAdmin(req)) return send(res,401,{error:'Unauthorized'});
      return send(res,200,{submissions,clickCount:events.filter(e=>e.event==='clicked_phishing_link').length});
    }

    let reqPath=decodeURIComponent(url.pathname);
    if(reqPath==='/')reqPath='/index.html';
    const filePath=path.normalize(path.join(root,reqPath));
    if(!filePath.startsWith(root)) return send(res,403,'Forbidden','text/plain; charset=utf-8');
    fs.stat(filePath,(err,stat)=>{
      if(err||!stat.isFile()) return send(res,404,'Not found','text/plain; charset=utf-8');
      const ext=path.extname(filePath).toLowerCase();
      res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream','Cache-Control':'no-store'});
      fs.createReadStream(filePath).pipe(res);
    });
  }catch(e){
    console.error(e);
    send(res,500,{error:'Server error'});
  }
});
server.listen(port,'0.0.0.0',()=>console.log(`PhishLab central dashboard server running on port ${port}`));