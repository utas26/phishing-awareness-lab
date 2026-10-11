'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');
// This store never falls back to memory. Its directory must be a separately mounted,
// operator-confirmed durable volume outside the public/source directory.
class ResearchStore {
  constructor(filename, instrument, study) {
    if (!filename || filename === ':memory:') throw Error('A durable database path is required.');
    const {DatabaseSync}=require('node:sqlite');
    if (!fs.existsSync(filename)) fs.closeSync(fs.openSync(filename,'wx',0o600));
    if (fs.lstatSync(filename).isSymbolicLink() || (fs.statSync(filename).mode & 0o077)) throw Error('The research database must be a private regular file.');
    this.db = new DatabaseSync(filename,{timeout:5000,defensive:true});
    const schemaVersion=this.db.prepare('PRAGMA user_version').get().user_version;
    if (![0,1].includes(schemaVersion)) {this.close();throw Error('Unsupported research schema version. No downgrade attempted.');}
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS instruments(version TEXT PRIMARY KEY, snapshot TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS studies(study_id TEXT NOT NULL, consent_version TEXT NOT NULL, snapshot TEXT NOT NULL, PRIMARY KEY(study_id,consent_version));
      CREATE TABLE IF NOT EXISTS responses(
        id TEXT PRIMARY KEY, submission_key TEXT NOT NULL UNIQUE, payload_hash TEXT NOT NULL,
        study_id TEXT NOT NULL, instrument_version TEXT NOT NULL REFERENCES instruments(version),
        consent_version TEXT NOT NULL, submitted_at TEXT NOT NULL, lab_id TEXT,
        answers_json TEXT NOT NULL, comments_json TEXT NOT NULL,
        item_complete INTEGER NOT NULL CHECK(item_complete IN (0,1)), all_likert INTEGER NOT NULL CHECK(all_likert IN (0,1)));
      CREATE INDEX IF NOT EXISTS responses_filter ON responses(study_id,instrument_version,submitted_at,lab_id);
      PRAGMA user_version=1;`);
    const snapshot=JSON.stringify(instrument);
    const old=this.db.prepare('SELECT snapshot FROM instruments WHERE version=?').get(instrument.version);
    if (old && old.snapshot !== snapshot) { this.close();throw Error('Existing instrument version is immutable. Use a new version.'); }
    this.db.prepare('INSERT OR IGNORE INTO instruments(version,snapshot) VALUES (?,?)').run(instrument.version,snapshot);
    const studyFields=['studyId','consentVersion','information','consentText','researcherContact','retention','withdrawal','eligibility','ethicsReference'];
    // Do not freeze partially entered deployment settings during disabled setup.
    if (studyFields.every(key=>typeof study[key]==='string' && study[key].trim())) {
      const existing=this.db.prepare('SELECT snapshot FROM studies WHERE study_id=? AND consent_version=?').get(study.studyId,study.consentVersion);
      if (existing && existing.snapshot !== JSON.stringify(study)) { this.close();throw Error('Study information changed without a new consent version.'); }
      this.db.prepare('INSERT OR IGNORE INTO studies(study_id,consent_version,snapshot) VALUES (?,?,?)').run(study.studyId,study.consentVersion,JSON.stringify(study));
    }
  }
  versions() { return this.db.prepare('SELECT version FROM instruments ORDER BY version').all().map(x=>x.version); }
  instrument(version) { const r=this.db.prepare('SELECT snapshot FROM instruments WHERE version=?').get(version);return r?JSON.parse(r.snapshot):null; }
  insert(record) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const previous=this.db.prepare('SELECT id,payload_hash FROM responses WHERE submission_key=?').get(record.submissionKey);
      if (previous) {
        if (previous.payload_hash !== record.payloadHash) { const e=Error('This submission reference already belongs to a different response.');e.status=409;throw e; }
        this.db.exec('COMMIT');return {id:previous.id,duplicate:true};
      }
      const id=crypto.randomUUID();
      this.db.prepare(`INSERT INTO responses(id,submission_key,payload_hash,study_id,instrument_version,consent_version,submitted_at,lab_id,answers_json,comments_json,item_complete,all_likert) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,record.submissionKey,record.payloadHash,record.studyId,record.instrumentVersion,record.consentVersion,new Date().toISOString(),record.labId,JSON.stringify(record.answers),JSON.stringify(record.comments),Number(record.itemComplete),Number(record.allLikert));
      this.db.exec('COMMIT');return {id,duplicate:false};
    } catch(e) {this.db.exec('ROLLBACK');throw e;}
  }
  rows(filters,studyId) {
    let sql='SELECT id,study_id,instrument_version,consent_version,submitted_at,lab_id,answers_json,item_complete,all_likert FROM responses WHERE study_id=? AND instrument_version=?';
    const args=[studyId,filters.version];
    if (filters.from) { sql+=' AND submitted_at>=?';args.push(filters.from+'T00:00:00.000Z'); }
    if (filters.to) { sql+=' AND submitted_at<=?';args.push(filters.to+'T23:59:59.999Z'); }
    if (filters.lab==='unspecified') sql+=' AND lab_id IS NULL';
    else if (filters.lab) { sql+=' AND lab_id=?';args.push(filters.lab); }
    sql+=' ORDER BY submitted_at,id';
    return this.db.prepare(sql).all(...args).map(x=>({id:x.id,studyId:x.study_id,instrumentVersion:x.instrument_version,consentVersion:x.consent_version,submittedAt:x.submitted_at,labId:x.lab_id,answers:JSON.parse(x.answers_json),itemComplete:Boolean(x.item_complete),allLikert:Boolean(x.all_likert)}));
  }
  close() { if (this.db) {this.db.close();this.db=null;} }
}
module.exports={ResearchStore};
