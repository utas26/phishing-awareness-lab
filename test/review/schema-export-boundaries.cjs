'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{DatabaseSync}=require('node:sqlite');
const root=require('node:path').resolve(__dirname,'../..'),instrument=require(root+'/research/instrument.json'),{ResearchStore}=require(root+'/research/store'),{summarize,summaryCsv,responsesCsv}=require(root+'/research/data');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cyberlab-schema-review-'));
try{
 for(const version of [-1,2,2147483647]){
  const filename=path.join(dir,'synthetic-'+version+'.sqlite');const db=new DatabaseSync(filename);db.exec('PRAGMA user_version='+version+'; CREATE TABLE sentinel(value TEXT); INSERT INTO sentinel VALUES (\'synthetic unchanged\');');db.close();fs.chmodSync(filename,0o600);
  const before=fs.readFileSync(filename);assert.throws(()=>new ResearchStore(filename,instrument,{}),/Unsupported research schema version/);assert.deepEqual(fs.readFileSync(filename),before,'Unsupported schema bytes must not be modified');
  const verify=new DatabaseSync(filename,{readOnly:true});assert.equal(verify.prepare('PRAGMA user_version').get().user_version,version);assert.equal(verify.prepare('SELECT value FROM sentinel').get().value,'synthetic unchanged');verify.close();
 }
 const row={id:'synthetic',studyId:'SYNTHETIC',instrumentVersion:instrument.version,consentVersion:'test-1',submittedAt:'2026-01-01T00:00:00.000Z',labId:null,answers:Object.fromEntries(instrument.items.map(x=>[x.id,5])),itemComplete:true,allLikert:true};
 const report=summarize([row],instrument,{from:'',to:'',lab:'',version:instrument.version},{studyId:'SYNTHETIC'}),summary=summaryCsv(report),coded=responsesCsv([row],instrument);
 assert(summary.startsWith('\uFEFF"study_id","generated_at_utc",'));assert(summary.includes('"SYNTHETIC","'+report.generatedAt+'"'));
 assert(coded.startsWith('\uFEFF"export_generated_at_utc",'));assert.match(coded.split('\r\n')[1],/^"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z","synthetic","SYNTHETIC"/);
 const html=fs.readFileSync(root+'/research-dashboard.html','utf8');assert.match(html,/fresh|requer|newer|export time|export-time/i);
 console.log('PASS unsupported SQLite versions -1/2/2147483647 rejected without modifying database bytes; summary/coded CSV provenance populated; fresh-export caveat present.');
}finally{fs.rmSync(dir,{recursive:true,force:true})}
