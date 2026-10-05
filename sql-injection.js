(() => {
'use strict';
let reportUI=null;
const $=id=>document.getElementById(id); if(!$('sqlInput'))return;
const records=[{id:'R01',title:'Account Safety Basics',category:'Security',published:true},{id:'R02',title:'Safe Data Handling',category:'Security',published:true},{id:'R03',title:'Solar System Guide',category:'Science',published:true},{id:'R04',title:'Color and Composition',category:'Art',published:true},{id:'R05',title:'Draft: Future Security Workshop',category:'Security',published:false},{id:'R06',title:'Draft: New Science Activity',category:'Science',published:false}];
const examples={normal:'Security',tautology:"' OR 1=1 --",string:"' OR 'a'='a' --",unknown:'Unknown'};
const limitations=['Only two explicitly supported OR-true/comment patterns and ordinary category literals are modeled. No SQL engine or backend is contacted.','Raw user input is excluded from this report. Output and records are fictional.'];
let runs=[],actions=[],startedAt='',completedAt='',paired=false,currentRun=null,inputTouched=false,guideEvent=0;
const now=()=>new Date().toISOString();
const guide=window.BeginnerGuide?window.BeginnerGuide.mount({mountTo:'#beginnerGuideMount',title:'Follow the category through the query',intro:'Watch your demo text move from a category value to a modeled query result. Each change below comes from a run you start.',steps:[{title:'Choose demo text',text:'Start with Security, load an example, or type your own category.'},{title:'Run one mode',text:'Run the local model and inspect the query and matched records.'},{title:'Retest the same text',text:'Change only the query construction so the comparison is fair.'},{title:'Compare the evidence',text:'Read the record and draft counts for both modes. A comparison is not proof of a real vulnerability.'}] }):null;
function currentInput(){return $('sqlInput').value.slice(0,120).trim();}
function isCurrent(){return !!currentRun&&currentRun.input===currentInput()&&currentRun.mode===$('sqlMode').value;}
function updateGuide(animate=false){
 if(!guide)return;
 const active=isCurrent()?currentRun:null,input=currentInput(),mode=$('sqlMode').value,validMode=['bound','concatenated'].includes(mode),complete=!!active&&paired;
 let step=0,completed=[],status='Ready to practise',caption='Start with Security, then run the local query model. A query is a request for records.',action={id:'sqlRun',label:'Find Run local query model'};
 if(inputTouched||active){completed=[0];step=1;caption='Your demo text is ready. Run the selected mode to see what this small model returns.';}
 if(active&&active.supported){completed=[0,1];step=2;status='One mode tested';caption=active.mode==='concatenated'?'Read the query and draft count, then bind exactly the same input and retest.':'The bound run is recorded. Choose the vulnerable construction and run the same input to compare both modes.';action=active.mode==='concatenated'?{id:'sqlDefend',label:'Find Bind input and retest'}:{id:'sqlMode',label:'Find query construction'};}
 if(complete){completed=[0,1,2,3];step=3;status='Same-input comparison ready';caption=$('sqlComparison').textContent;action={id:'sqlExample',label:'Find another teaching example'};}
 if(active&&!active.supported){completed=[0];step=1;status='Outside this teaching model';caption='This query syntax was not interpreted. No security outcome can be inferred. Load a supported example or edit the input and run again.';action={id:'sqlExample',label:'Find supported examples'};}
 if(!input){completed=[];step=0;status='Input needed';caption='Enter a demo category or choose an example. No run is recorded for an empty input.';action={id:'sqlInput',label:'Find category input'};}
 if(!validMode){step=1;status='Choose a query mode';caption='Choose one of the two query constructions before running the model.';action={id:'sqlMode',label:'Find query construction'};}
 if(!active&&runs.length&&input&&validMode)status='Current settings not tested';
 guide.update({step,completed,status,caption,nodes:[{label:'Category input',value:!input?'Empty input':active?active.kind:'Demo text ready',tone:input?'active':'warn'},{label:'Query construction',value:mode==='bound'?'Bound value':validMode?'Joined to query text':'Choose a mode',tone:mode==='bound'?'good':validMode?'active':'warn'},{label:'Local result',value:active?(active.supported?`${active.count} records · ${active.drafts} drafts`:'Unsupported syntax'):'Not run for these settings',tone:active?(active.supported?(active.drafts?'warn':'good'):'warn'):'neutral'},{label:'Comparison',value:complete?'Same input, both modes':'Retest still needed',tone:complete?'good':'neutral'}],action,eventKey:'sql:'+guideEvent,animate});
}
function invalidate(message,animate=false){currentRun=null;paired=false;completedAt='';renderRows([]);$('sqlQuery').textContent='No query has been run for the current input and mode.';$('sqlStatus').textContent=message;$('sqlComparison').textContent='Current settings are not tested. Earlier runs remain in Run evidence; run again before comparing.';guideEvent++;updateGuide(animate);}
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
function run(){const input=currentInput(),mode=$('sqlMode').value;if(!['bound','concatenated'].includes(mode)){invalidate('Choose a supported query construction. No query was run.');return;}
 if(!input){invalidate('Enter a demo category or load an example. No query was run.');return;}
 if(!startedAt)startedAt=now();const result=model(input,mode),drafts=result.rows.filter(r=>!r.published).length;
 $('sqlQuery').textContent=mode==='bound'?"SELECT id, title, category FROM catalog\nWHERE category = ? AND published = 1;\n\nBound value (data only): "+JSON.stringify(input):"SELECT id, title, category FROM catalog\nWHERE category = '"+input+"' AND published = 1;";
 renderRows(result.rows);$('sqlStatus').textContent=result.detail+` Result: ${result.rows.length} record(s), ${drafts} draft(s).`;
 const entry={input,mode,kind:result.kind,count:result.rows.length,drafts,supported:result.supported};currentRun=entry;inputTouched=true;runs.push(entry);if(runs.length>40)runs.shift();record(mode==='bound'?'Run bound-parameter model':'Run concatenation model',`${result.kind}; ${result.rows.length} fictional records; ${drafts} drafts; ${result.supported?'supported model input':'unsupported, no outcome inferred'}.`);compare(entry);
 $('sqlHistory').textContent=runs.slice(-8).map((r,i)=>`${runs.length-Math.min(runs.length,8)+i+1}. ${r.mode} · ${r.kind} · ${r.count} records · ${r.drafts} drafts`).join('\n');
 guideEvent++;updateGuide(true);
}
function reset(){if(reportUI)reportUI.reset();runs=[];actions=[];startedAt='';completedAt='';paired=false;currentRun=null;inputTouched=false;$('sqlInput').value='Security';$('sqlExample').value='normal';$('sqlMode').value='concatenated';renderRows([]);$('sqlQuery').textContent='No query has been run.';$('sqlStatus').textContent='Reset complete. No query has been run in this session.';$('sqlComparison').textContent='Run the vulnerable and bound versions with identical input to compare them.';$('sqlHistory').textContent='No runs yet.';guideEvent++;updateGuide(false);}
$('sqlMode').addEventListener('change',()=>{invalidate('Query mode changed. Run again to produce evidence for this mode.',true);});
$('sqlRun').addEventListener('click',run);$('sqlDefend').addEventListener('click',()=>{$('sqlMode').value='bound';run();});$('sqlReset').addEventListener('click',reset);
$('sqlExample').addEventListener('change',()=>{const value=examples[$('sqlExample').value];if(value!==undefined){$('sqlInput').value=value;inputTouched=true;invalidate('Example loaded. Run the query model to produce new evidence.',true);}});
$('sqlInput').addEventListener('input',()=>{inputTouched=true;$('sqlExample').value='custom';invalidate('Input changed. The current input has not been tested. Earlier runs remain in Run evidence.');});
$('sqlInput').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();run();}});
if(window.LabReport)reportUI=window.LabReport.mount({labId:'sql-injection',mountTo:'#labReportMount',title:'SQL Injection Defense Lab',scope:'Local fictional catalog with six records, including two drafts. Limited string-concatenation versus bound-value model.',getSnapshot:()=>{const last=runs[runs.length-1],active=isCurrent(),complete=active&&paired;return{status:!runs.length?'not-performed':complete?'completed':'in-progress',startedAt,completedAt:complete?completedAt:'',summary:last?`${active?'':'Current input or mode has not been run. '}Last recorded model run: ${last.mode}; ${last.count} fictional records returned. ${complete?'A same-input comparison was completed for the current input.':'A same-input comparison for the current settings is still pending.'}`:'',actions:actions.slice(),metrics:last?[{label:'Last recorded model result',value:last.count+' records'},{label:'Draft records in last recorded result',value:last.drafts}]:[],findings:runs.filter(r=>r.supported&&r.drafts>0).slice(-1).map(r=>({title:'Modeled publication filter bypass',evidence:`Supported injected condition returned ${r.count} fictional records, including ${r.drafts} drafts.`,risk:'Query structure can change when values are concatenated into SQL.',recommendation:'Bind values with parameterized queries; retain authorization and least-privilege controls.'})),limitations};}});
updateGuide(false);
})();
