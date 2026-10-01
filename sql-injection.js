(() => {
'use strict';
let reportUI=null;
const $=id=>document.getElementById(id); if(!$('sqlInput'))return;
const records=[{id:'R01',title:'Account Safety Basics',category:'Security',published:true},{id:'R02',title:'Safe Data Handling',category:'Security',published:true},{id:'R03',title:'Solar System Guide',category:'Science',published:true},{id:'R04',title:'Color and Composition',category:'Art',published:true},{id:'R05',title:'Draft: Future Security Workshop',category:'Security',published:false},{id:'R06',title:'Draft: New Science Activity',category:'Science',published:false}];
const examples={normal:'Security',tautology:"' OR 1=1 --",string:"' OR 'a'='a' --",unknown:'Unknown'};
const limitations=['Only two explicitly supported OR-true/comment patterns and ordinary category literals are modeled. No SQL engine or backend is contacted.','Raw user input is excluded from this report. Output and records are fictional.'];
let runs=[],actions=[],startedAt='',completedAt='',paired=false;
const now=()=>new Date().toISOString();
function record(label,result){actions.push({label,result,at:now()});if(actions.length>60)actions.shift();}
function model(input,mode){
 if(mode==='bound')return{kind:'bound value',rows:records.filter(r=>r.published&&r.category.toLowerCase()===input.toLowerCase()),supported:true,detail:'The query structure stays fixed. The complete input is one category value; SQL-looking characters do not become operators.'};
 const normalized=input.trim().replace(/\s+/g,' ').toLowerCase();
 if(/^' or 1\s*=\s*1 --\s*$/.test(normalized)||/^' or 'a'\s*=\s*'a' --\s*$/.test(normalized))return{kind:'supported injected true condition',rows:records.slice(),supported:true,detail:'In this supported pattern, OR makes the filter true and the comment removes the publication check. The model returns every fictional record, including two drafts.'};
 if(/['];?|--|\/\*/.test(input))return{kind:'unsupported query syntax',rows:[],supported:false,detail:'This syntax is outside the small teaching interpreter. No SQL was executed and no security outcome is inferred. Try one of the supplied examples.'};
 return{kind:'ordinary category',rows:records.filter(r=>r.published&&r.category.toLowerCase()===input.toLowerCase()),supported:true,detail:'The ordinary category filter returns only matching published fictional records.'};
}
function renderRows(rows){$('sqlRows').replaceChildren();for(const r of rows){const tr=document.createElement('tr');for(const text of[r.id,r.title,r.category,r.published?'Published':'DRAFT — outside intended result']){const td=document.createElement('td');td.textContent=text;tr.appendChild(td);}$('sqlRows').appendChild(tr);}}
function compare(last){const other=[...runs].reverse().find(r=>r!==last&&r.input===last.input&&r.mode!==last.mode&&r.supported&&last.supported);paired=!!other;
 if(!other){$('sqlComparison').textContent='No matched comparison yet. Run the other mode with exactly the same input.';return;}
 const vulnerable=last.mode==='concatenated'?last:other,bound=last.mode==='bound'?last:other;
 $('sqlComparison').textContent=`Same-input comparison: concatenation returned ${vulnerable.count} record(s), including ${vulnerable.drafts} draft(s); binding returned ${bound.count} record(s), including ${bound.drafts} draft(s). ${vulnerable.drafts?'The bound model kept the injected condition inside a data value.':'This input did not demonstrate draft disclosure; try a supplied injected-condition example.'}`;
 completedAt=now();
}
function run(){const input=$('sqlInput').value.slice(0,120).trim(),mode=$('sqlMode').value;if(!['bound','concatenated'].includes(mode))return;
 if(!input){$('sqlStatus').textContent='Enter a demo category or load an example. No query was run.';return;}
 if(!startedAt)startedAt=now();const result=model(input,mode),drafts=result.rows.filter(r=>!r.published).length;
 $('sqlQuery').textContent=mode==='bound'?"SELECT id, title, category FROM catalog\nWHERE category = ? AND published = 1;\n\nBound value (data only): "+JSON.stringify(input):"SELECT id, title, category FROM catalog\nWHERE category = '"+input+"' AND published = 1;";
 renderRows(result.rows);$('sqlStatus').textContent=result.detail+` Result: ${result.rows.length} record(s), ${drafts} draft(s).`;
 const entry={input,mode,kind:result.kind,count:result.rows.length,drafts,supported:result.supported};runs.push(entry);if(runs.length>40)runs.shift();record(mode==='bound'?'Run bound-parameter model':'Run concatenation model',`${result.kind}; ${result.rows.length} fictional records; ${drafts} drafts; ${result.supported?'supported model input':'unsupported, no outcome inferred'}.`);compare(entry);
 $('sqlHistory').textContent=runs.slice(-8).map((r,i)=>`${runs.length-Math.min(runs.length,8)+i+1}. ${r.mode} · ${r.kind} · ${r.count} records · ${r.drafts} drafts`).join('\n');
}
function reset(){if(reportUI)reportUI.reset();runs=[];actions=[];startedAt='';completedAt='';paired=false;$('sqlInput').value='Security';$('sqlExample').value='normal';$('sqlMode').value='concatenated';renderRows([]);$('sqlQuery').textContent='No query has been run.';$('sqlStatus').textContent='Reset complete. No query has been run in this session.';$('sqlComparison').textContent='Run the vulnerable and bound versions with identical input to compare them.';$('sqlHistory').textContent='No runs yet.';}
$('sqlMode').addEventListener('change',()=>{$('sqlStatus').textContent='Query mode changed. Run again to produce evidence for this mode.';});
$('sqlRun').addEventListener('click',run);$('sqlDefend').addEventListener('click',()=>{$('sqlMode').value='bound';run();});$('sqlReset').addEventListener('click',reset);
$('sqlExample').addEventListener('change',()=>{const value=examples[$('sqlExample').value];if(value!==undefined){$('sqlInput').value=value;$('sqlStatus').textContent='Example loaded. Run the query model to produce new evidence.';}});
$('sqlInput').addEventListener('input',()=>{$('sqlStatus').textContent='Input changed. Results below still describe the last recorded run; run again to test this input.';});
$('sqlInput').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();run();}});
if(window.LabReport)reportUI=window.LabReport.mount({labId:'sql-injection',mountTo:'#labReportMount',title:'SQL Injection Defense Lab',scope:'Local fictional catalog with six records, including two drafts. Limited string-concatenation versus bound-value model.',getSnapshot:()=>{const last=runs[runs.length-1];return{status:!runs.length?'not-performed':paired?'completed':'in-progress',startedAt,completedAt:paired?completedAt:'',summary:last?`Last recorded model run: ${last.mode}; ${last.count} fictional records returned. ${paired?'A same-input comparison was completed.':'A same-input comparison has not yet been completed.'}`:'',actions:actions.slice(),metrics:last?[{label:'Last model result',value:last.count+' records'},{label:'Draft records in last result',value:last.drafts}]:[],findings:runs.filter(r=>r.supported&&r.drafts>0).slice(-1).map(r=>({title:'Modeled publication filter bypass',evidence:`Supported injected condition returned ${r.count} fictional records, including ${r.drafts} drafts.`,risk:'Query structure can change when values are concatenated into SQL.',recommendation:'Bind values with parameterized queries; retain authorization and least-privilege controls.'})),limitations};}});
})();
