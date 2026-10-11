'use strict';
const crypto = require('node:crypto');
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
function invalid(message) { const e = new Error(message); e.status = 400; return e; }
function plain(value) { return value && typeof value === 'object' && !Array.isArray(value); }
function keysOnly(value, allowed, label) {
  if (!plain(value) || Object.keys(value).some(k => !allowed.includes(k))) throw invalid(`Invalid ${label} fields.`);
}
function validateResponse(body, config) {
  keysOnly(body,['instrumentVersion','labId','answers','comments','consent','consentVersion','submissionKey'],'response');
  if (body.instrumentVersion !== config.instrument.version || body.consentVersion !== config.study.consentVersion) throw invalid('The questionnaire or consent version changed. Reload and review it before submitting.');
  if (body.consent !== true) throw invalid('Explicit consent is required to submit.');
  if (body.labId !== null && !config.instrument.labs.some(x=>x.id===body.labId)) throw invalid('Choose a listed learning activity.');
  if (typeof body.submissionKey !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.submissionKey)) throw invalid('Invalid submission reference. Reload the page.');
  keysOnly(body.answers,config.instrument.items.map(x=>x.id),'answer');
  keysOnly(body.comments,config.instrument.comments.map(x=>x.id),'comment');
  const answers = {};
  for (const {id} of config.instrument.items) {
    const v = own(body.answers,id) ? body.answers[id] : null;
    if (!(v === null || v === 'na' || Number.isInteger(v) && v >= 1 && v <= 5)) throw invalid(`Invalid answer to ${id}.`);
    answers[id] = v;
  }
  const comments = {};
  for (const {id,maxLength} of config.instrument.comments) {
    const v = own(body.comments,id) ? body.comments[id] : '';
    if (typeof v !== 'string' || v.length > maxLength || /\u0000/.test(v)) throw invalid(`Invalid ${id} comment.`);
    comments[id] = v.trim();
  }
  const canonical = {instrumentVersion:body.instrumentVersion,labId:body.labId,answers,comments,consentVersion:body.consentVersion,studyId:config.study.studyId};
  return {...canonical, submissionKey:body.submissionKey,
    payloadHash:crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex'),
    itemComplete:Object.values(answers).every(x=>x!==null),allLikert:Object.values(answers).every(Number.isInteger)};
}
function parseFilters(params, instrument, versions) {
  for (const key of params.keys()) if (!['from','to','lab','version'].includes(key) || params.getAll(key).length!==1) throw invalid('Unsupported or repeated filter.');
  const filters = {from:params.get('from') || '',to:params.get('to') || '',lab:params.get('lab') || '',version:params.get('version') || instrument.version};
  for (const key of ['from','to']) if (filters[key] && (!/^\d{4}-\d{2}-\d{2}$/.test(filters[key]) || !Number.isFinite(Date.parse(filters[key])) || new Date(filters[key]).toISOString().slice(0,10)!==filters[key])) throw invalid('Use valid YYYY-MM-DD dates in UTC.');
  if (filters.from && filters.to && filters.from>filters.to) throw invalid('The start date must not follow the end date.');
  if (filters.lab && filters.lab !== 'unspecified' && !instrument.labs.some(x=>x.id===filters.lab)) throw invalid('Unknown learning activity filter.');
  if (!versions.includes(filters.version)) throw invalid('Unknown instrument version.');
  return filters;
}
function summarize(rows, instrument, filters, extra={}) {
  const counts={responses:rows.length,complete:0,partial:0,allLikert:0,missing:0,na:0,excluded:0};
  const items=instrument.items.map(item=>({...item,counts:[0,0,0,0,0],valid:0,na:0,missing:0,agreePct:null}));
  for (const row of rows) {
    const values=items.map(x=>row.answers[x.id]);
    if (values.every(x=>x!==null && x!==undefined)) counts.complete++; else counts.partial++;
    if (values.every(Number.isInteger)) counts.allLikert++;
    for (const item of items) {
      const v=row.answers[item.id];
      if (Number.isInteger(v)&&v>=1&&v<=5) { item.counts[v-1]++;item.valid++; }
      else if (v==='na') { item.na++;counts.na++; } else { item.missing++;counts.missing++; }
    }
  }
  for (const item of items) item.agreePct=item.valid ? (item.counts[3]+item.counts[4])*100/item.valid : null;
  return {instrument,filters,generatedAt:new Date().toISOString(),counts,items,
    participation:{invited:null,eligible:null,opened:null,consented:rows.length,submitted:rows.length,complete:counts.complete,partial:counts.partial,analysis:rows.length,
      notes:'Counts are submitted forms, not verified unique participants. Consent is recorded only with submission; declines and abandoned forms are not counted. Invitation, eligibility and opening denominators are unknown. No response rate can be calculated. Complete means all ten items recorded, including explicit N/A. No automatic exclusions.'},
    ...extra};
}
function csvCell(v) {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(s)) s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
}
function csv(rows) { return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n'; }
function summaryCsv(report) {
  const header=['study_id','generated_at_utc','instrument_version','from_utc','to_utc','lab_id','item_id','item_text','numeric_n','count_1','count_2','count_3','count_4','count_5','na_n','missing_n','agree_n','agree_pct'];
  return csv([header,...report.items.map(x=>[report.studyId||'',report.generatedAt,report.instrument.version,report.filters.from,report.filters.to,report.filters.lab,x.id,x.text,x.valid,...x.counts,x.na,x.missing,x.counts[3]+x.counts[4],x.agreePct===null?'':x.agreePct.toFixed(2)])]);
}
function responsesCsv(rows, instrument) {
  const generatedAt=new Date().toISOString();
  const header=['export_generated_at_utc','response_id','study_id','instrument_version','consent_version','submitted_at_utc','lab_id',...instrument.items.map(x=>x.id),'item_complete','all_likert'];
  return csv([header,...rows.map(x=>[generatedAt,x.id,x.studyId,x.instrumentVersion,x.consentVersion,x.submittedAt,x.labId,...instrument.items.map(i=>x.answers[i.id]==='na'?'NA':x.answers[i.id]),x.itemComplete ? 1:0,x.allLikert?1:0])]);
}
module.exports={validateResponse,parseFilters,summarize,summaryCsv,responsesCsv,csvCell,invalid};
