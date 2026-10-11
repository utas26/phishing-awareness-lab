'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const catalog=fs.readFileSync(path.join(root,'labs.html'),'utf8');
const routes=[...catalog.matchAll(/class="cyber-card-link" href="\/([^"]+)"/g)].map(m=>m[1]);
test('catalog has 12 distinct lab routes with valid local assets and unique static IDs',()=>{
 assert.equal(routes.length,12);assert.equal(new Set(routes).size,12);
 for(const file of [...routes,'fake-login.html','local-capture.html']){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,file+' has duplicate IDs');
  for(const m of html.matchAll(/(?:src|href)="\/([^"?#]+)(?:[?#][^"]*)?"/g))assert.ok(fs.existsSync(path.join(root,m[1])),file+' missing '+m[1]);
  const includes=[...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m=>m[1]);assert.equal(includes.length,new Set(includes).size,file+' has duplicate scripts');
 }
});
test('all application scripts and inline lab scripts parse',()=>{
 for(const file of fs.readdirSync(root).filter(x=>x.endsWith('.js')))new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
 for(const file of [...routes,'fake-login.html','local-capture.html']){const html=fs.readFileSync(path.join(root,file),'utf8');for(const m of html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1],{filename:file});}
});
