/* Local-only draft preview. Never sends questionnaire responses to a server. */
(() => {
  'use strict';
  const bank = window.UTAS_ASSESSMENT;
  if (!bank || !document.getElementById('before-form')) return;
  const key = 'utas-assessment-preview-v1';
  const panels = ['before', 'lab', 'after', 'summary'];
  const $ = id => document.getElementById(id);
  let storageAvailable = true;
  function newState() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'LOCAL-PREVIEW';
    try {
      const bytes = new Uint8Array(12); window.crypto.getRandomValues(bytes);
      code = Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('');
    } catch (_) { /* A code is optional in an unsupported preview browser. */ }
    return {version:bank.instrumentVersion,code,before:null,after:null,draftBefore:{},draftAfter:{}};
  }
  let state = newState();
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(key) || 'null');
    if (saved && saved.version === bank.instrumentVersion && /^[A-Z2-9-]{12,13}$/.test(saved.code) &&
        [saved.before,saved.after,saved.draftBefore,saved.draftAfter].every(value => value === null || (value && typeof value === 'object' && !Array.isArray(value)))) state = saved;
  } catch (_) { storageAvailable = false; }
  function persist() {
    try { window.sessionStorage.setItem(key, JSON.stringify(state)); } catch (_) { storageAvailable = false; }
    $('storage-message').textContent = storageAvailable ? '' : 'This browser cannot save the demo between pages. Responses remain only on this page and may be lost when you leave or reload.';
  }
  function el(tag, text, className) {
    const node = document.createElement(tag); if (text !== undefined) node.textContent = text;
    if (className) node.className = className; return node;
  }
  function addChoices(container, item, choices, isScale) {
    const field = el('fieldset',undefined,'assessment-question');field.appendChild(el('legend',item.prompt || item.text));
    const options = el('div',undefined,isScale ? 'assessment-options assessment-scale' : 'assessment-options');
    choices.forEach(choice => {
      const label=el('label',undefined,'assessment-option');const input=el('input');input.type='radio';input.name=item.id;input.value=String(choice.value);
      label.appendChild(input);if (isScale && choice.value !== 'na') label.appendChild(el('strong',String(choice.value)));
      label.appendChild(el('span',choice.label));options.appendChild(label);
    });
    field.appendChild(options);container.appendChild(field);
  }
  ['before','after'].forEach(phase => {
    bank.perceivedKnowledge.forEach(item => addChoices($(phase+'-perceived'),item,bank.perceivedScale,true));
    bank.objective.forEach(item => addChoices($(phase+'-objective'),item,item.options.map((label,value)=>({label,value})),false));
  });
  bank.satisfaction.forEach(item => addChoices($('after-satisfaction'),item,bank.satisfactionScale.map(option=>({value:option.value===null?'na':option.value,label:option.label})),true));
  bank.openPrompts.forEach(item => {
    const label=el('label',item.text+' (optional)');label.htmlFor=item.id;
    const input=el('textarea');input.name=item.id;input.id=item.id;input.maxLength=item.maxLength;
    $('after-open').appendChild(label);$('after-open').appendChild(input);
  });
  function values(form) { return Object.fromEntries(new FormData(form).entries()); }
  function restore(form, answers) {
    for (const input of form.elements) {
      const value=answers && answers[input.name];
      if (input.type==='radio') input.checked=value===input.value;
      if (input.tagName==='TEXTAREA') input.value=typeof value==='string'?value.slice(0,input.maxLength):'';
    }
  }
  function show(phase) {
    panels.forEach(name=>{$(name+'-panel').hidden=name!==phase;});
    $('demo-reference').textContent='Demo reference: '+state.code+' · Instrument: '+bank.instrumentVersion;
  }
  function objectiveResult(answers) {
    let completed=0,correct=0;
    bank.objective.forEach(item=>{const value=answers && answers[item.id];if(typeof value==='string' && /^[0-4]$/.test(value)){completed++;if(Number(value)===item.correctIndex)correct++;}});
    return {completed,correct};
  }
  function rating(value) { return /^[1-5]$/.test(String(value)) ? Number(value) : null; }
  function showSummary() {
    const before=objectiveResult(state.before),after=objectiveResult(state.after);
    const complete=before.completed===bank.objective.length && after.completed===bank.objective.length;
    $('objective-summary').replaceChildren();
    for(const [label,result] of [['Before',before],['After',after]]) {
      const card=el('article');card.appendChild(el('h3',label+' knowledge quiz'));
      card.appendChild(el('div',complete?result.correct+' / '+bank.objective.length:'Incomplete pair','metric'));
      card.appendChild(el('p',result.completed+' of '+bank.objective.length+' items answered. Skipped items are missing, not incorrect.'));$('objective-summary').appendChild(card);
    }
    const delta=after.correct-before.correct;
    $('score-change').textContent=complete?'Objective quiz score change: '+(delta>0?'+':'')+delta+' points. This is a demo score change, not proof of a causal effect.':'A paired 0–10 score comparison is shown only when all knowledge items are answered in both phases. Missing answers have not been treated as zero.';
    $('perceived-summary').replaceChildren();
    bank.perceivedKnowledge.forEach(item=>{
      const pre=rating(state.before[item.id]),post=rating(state.after[item.id]);const line=el('p');line.appendChild(el('strong',item.text+': '));
      line.appendChild(el('span',(pre===null?'Skipped':pre)+' → '+(post===null?'Skipped':post)+(pre!==null&&post!==null?' (change '+(post-pre>0?'+':'')+(post-pre)+')':'')));$('perceived-summary').appendChild(line);
    });
    $('satisfaction-summary').replaceChildren();
    const rated=bank.satisfaction.filter(item=>rating(state.after[item.id])!==null).length;
    const notApplicable=bank.satisfaction.filter(item=>state.after[item.id]==='na').length;
    $('satisfaction-summary').appendChild(el('p',rated+' rated · '+notApplicable+' not applicable · '+(bank.satisfaction.length-rated-notApplicable)+' skipped.'));
    bank.satisfaction.forEach(item=>{const value=state.after[item.id],number=rating(value);const label=number===null?(value==='na'?'Not applicable':'Skipped'):number+' / 5';$('satisfaction-summary').appendChild(el('p',item.text+' '+label));});
    $('answer-review').replaceChildren();
    bank.objective.forEach((item,index)=>{
      const section=el('section');section.appendChild(el('h3',(index+1)+'. '+item.prompt));
      const format=answers=>{const value=answers[item.id];return /^[0-4]$/.test(String(value))?item.options[Number(value)]:'Skipped';};
      section.appendChild(el('p','Before: '+format(state.before)));section.appendChild(el('p','After: '+format(state.after)));
      section.appendChild(el('p','Correct answer: '+item.options[item.correctIndex]));section.appendChild(el('p',item.explanation));$('answer-review').appendChild(section);
    });show('summary');
  }
  for(const phase of ['before','after']) {
    const form=$(phase+'-form');restore(form,state[phase==='before'?'draftBefore':'draftAfter']);
    form.addEventListener('input',()=>{if(phase==='before' && state.before)return;state[phase==='before'?'draftBefore':'draftAfter']=values(form);persist();});
    const savePhase=event=>{
      event.preventDefault();
      if(phase==='before') {
        if(state.before)return;state.before=values(form);persist();show('lab');$('assessment-message').textContent='Before-lab demo saved only in this tab. No response has been submitted.';
      } else {
        if(!state.before){show('before');return;}state.after=values(form);persist();showSummary();$('assessment-message').textContent='After-lab demo complete. Your comparison is local to this tab and has not been submitted.';
      }window.scrollTo({top:0,behavior:'smooth'});
    };
    form.addEventListener('submit',savePhase);
    $('save-'+phase).addEventListener('click',savePhase);
  }
  $('start-after').addEventListener('click',()=>{if(state.before){show('after');$('assessment-message').textContent='After-lab preview. Use demo answers; no research response is submitted.';window.scrollTo({top:0,behavior:'smooth'});}});
  $('return-to-labs').addEventListener('click',()=>{show('lab');window.scrollTo({top:0,behavior:'smooth'});});
  $('reset-assessment').addEventListener('click',()=>{
    state=newState();$('before-form').reset();$('after-form').reset();persist();show('before');
    $('objective-summary').replaceChildren();$('perceived-summary').replaceChildren();$('satisfaction-summary').replaceChildren();$('answer-review').replaceChildren();
    $('assessment-message').textContent='Demo responses cleared. Start a new before-lab preview whenever you are ready.';
  });
  // Back/Forward can restore an older page snapshot. Re-read tab storage so
  // cleared answers cannot reappear or be saved again from a stale closure.
  window.addEventListener('pageshow',event=>{
    if(event.persisted && storageAvailable) window.location.reload();
  });
  persist();if(state.before&&state.after)showSummary();else show(state.before?'lab':'before');
  $('save-before').disabled=false;$('save-after').disabled=false;
})();
