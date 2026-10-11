/* Standalone, voluntary feedback. Answers exist only in memory; preview never posts. */
(() => {
  'use strict';
  const source = window.UTAS_ASSESSMENT;
  const form = document.getElementById('feedback-form');
  const status = document.getElementById('form-status');
  const submit = document.getElementById('submit-button');
  const clear = document.getElementById('clear-form');
  const progress = document.getElementById('question-progress');
  let enabled = false;
  let instrument;
  let study = null;
  let pending = false;
  let completed = false;
  let retryPayload = null;
  let retryLocked = false;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function message(text, error = false) {
    status.className = error ? 'status error' : 'status success';
    status.textContent = text;
  }
  function readable(value) {
    if (typeof value === 'string') return value.trim();
    if (Array.isArray(value)) return value.map(readable).filter(Boolean).join('\n');
    return '';
  }
  function validConfig(config, fallback) {
    if (!config || config.enabled !== true || !config.instrument || !config.study) return false;
    const candidate = config.instrument;
    if (typeof candidate.version !== 'string' || !candidate.version.trim()) return false;
    if (!Array.isArray(candidate.items) || candidate.items.length !== 10 || !candidate.items.every((item, i) => item.id === fallback.items[i].id && item.text === fallback.items[i].text)) return false;
    if (!Array.isArray(candidate.comments) || candidate.comments.length !== 2 || !candidate.comments.every((item, i) => item.id === fallback.comments[i].id && item.text === fallback.comments[i].text)) return false;
    return ['studyId', 'consentVersion', 'information', 'consentText', 'researcherContact', 'retention', 'withdrawal', 'eligibility'].every(key => readable(config.study[key]).length > 0);
  }
  function setMode(isEnabled, reason) {
    enabled = isEnabled;
    const badge = document.getElementById('mode-badge');
    badge.className = isEnabled ? 'badge' : 'badge preview';
    badge.replaceChildren(element('span', 'badge-dot'), document.createTextNode(isEnabled ? 'VOLUNTARY STUDY' : 'LOCAL PREVIEW'));
    badge.firstChild.setAttribute('aria-hidden', 'true');
    const notice = document.getElementById('mode-notice');
    notice.className = isEnabled ? 'notice' : 'notice preview';
    document.getElementById('mode-title').textContent = isEnabled ? 'Research participation is optional.' : 'Local preview only. Research collection is off.';
    document.getElementById('mode-description').textContent = isEnabled
      ? 'Read the study information before deciding whether to take part. Your answers are sent only if you choose to consent and submit. You can use every activity without participating.'
      : (reason ? `${reason} ` : '') + 'This is not research enrollment. Practice answers stay only in this page’s memory and are not submitted. Refreshing or closing the page clears them.';
    document.getElementById('study-section').hidden = !isEnabled;
    document.getElementById('consent-row').hidden = !isEnabled;
    document.getElementById('consent').disabled = !isEnabled;
    submit.textContent = isEnabled ? 'Submit voluntary feedback' : 'Review local preview';
    document.getElementById('submission-note').textContent = isEnabled
      ? 'Questions and comments may be skipped. Review your answers before submitting. No names, student IDs, or contact details are requested.'
      : 'Preview only. This button does not submit or save your answers.';
  }
  function renderStudy() {
    if (!enabled) return;
    const rows = [
      ['About this study', 'information'], ['Who may take part', 'eligibility'],
      ['Researcher contact', 'researcherContact'], ['Storage and retention', 'retention'],
      ['Withdrawing a response', 'withdrawal'], ['Ethics reference', 'ethicsReference'],
      ['Study reference', 'studyId'], ['Consent version', 'consentVersion']
    ];
    const list = document.getElementById('study-details');
    rows.forEach(([label, key]) => {
      const value = readable(study[key]);
      if (!value) return;
      const group = element('div'); group.append(element('dt', '', label), element('dd', '', value)); list.append(group);
    });
    document.getElementById('consent-text').textContent = study.consentText;
  }
  function updateProgress() {
    const answered = instrument.items.filter(item => form.querySelector(`input[name="${item.id}"]:checked`)).length;
    progress.textContent = `${answered} of ${instrument.items.length} answered`;
    instrument.items.forEach(item => {
      const button = document.getElementById(`clear-${item.id}`);
      if (button) button.disabled = retryLocked || !form.querySelector(`input[name="${item.id}"]:checked`);
    });
  }
  function renderQuestions() {
    const holder = document.getElementById('questions');
    instrument.items.forEach((item, index) => {
      const fieldset = element('fieldset', 'question'); fieldset.setAttribute('aria-describedby', 'scale-instructions');
      const legend = element('legend');
      const title = element('span', 'question-title'); title.append(element('span', 'question-num', `Q${index + 1}`), document.createTextNode(item.text));
      legend.append(title); fieldset.append(legend);
      const scale = element('div', 'scale');
      instrument.scale.forEach(choice => {
        const na = choice.value === 'na' || choice.value === null;
        const value = na ? 'na' : String(choice.value);
        const label = element('label', na ? 'scale-option na' : 'scale-option');
        const input = document.createElement('input');
        input.type = 'radio'; input.name = item.id; input.value = value;
        input.id = `${item.id}-${value}`;
        label.htmlFor = input.id;
        label.append(input, element('span', 'scale-number', na ? 'N/A' : value), element('span', '', choice.label));
        scale.append(label);
      });
      fieldset.append(scale);
      const actions = element('div', 'question-actions');
      const clearAnswer = element('button', 'clear-answer', 'Clear answer');
      clearAnswer.type = 'button'; clearAnswer.id = `clear-${item.id}`; clearAnswer.disabled = true;
      clearAnswer.setAttribute('aria-label', `Clear answer for Q${index + 1}`);
      clearAnswer.addEventListener('click', () => {
        if (pending || retryLocked || completed) return;
        fieldset.querySelectorAll('input').forEach(input => { input.checked = false; });
        updateProgress();
        fieldset.querySelector('input').focus();
      });
      actions.append(clearAnswer); fieldset.append(actions); holder.append(fieldset);
    });
    form.addEventListener('change', updateProgress);
  }
  function renderComments() {
    const holder = document.getElementById('comments');
    instrument.comments.forEach(item => {
      const field = element('div', 'form-field');
      const label = element('label', '', item.text); label.htmlFor = item.id;
      const input = document.createElement('textarea'); input.id = item.id; input.name = item.id;
      input.maxLength = 1000; input.rows = 4; input.setAttribute('aria-describedby', `comment-privacy ${item.id}-hint`);
      const hint = element('p', 'field-hint', 'Optional · Maximum 1,000 characters'); hint.id = `${item.id}-hint`;
      field.append(label, input, hint); holder.append(field);
    });
  }
  function setLocked(locked) {
    form.querySelectorAll('input, select, textarea, button').forEach(control => { control.disabled = locked; });
    // Retrying an uncertain submission uses the exact same payload and idempotency key.
    if (locked && !pending && !completed) submit.disabled = false;
    if (!locked) { document.getElementById('consent').disabled = !enabled; updateProgress(); }
  }
  function currentPayload() {
    const answers = {};
    instrument.items.forEach(item => {
      const selected = form.querySelector(`input[name="${item.id}"]:checked`);
      answers[item.id] = !selected ? null : selected.value === 'na' ? 'na' : Number(selected.value);
    });
    const comments = {};
    instrument.comments.forEach(item => { comments[item.id] = document.getElementById(item.id).value.trim(); });
    return {
      instrumentVersion: instrument.version, labId: document.getElementById('lab').value || null,
      answers, comments, consent: true, consentVersion: study.consentVersion,
      submissionKey: window.crypto.randomUUID()
    };
  }
  async function sendFeedback(event) {
    event.preventDefault();
    if (pending || completed) return;
    if (!enabled) {
      const count = instrument.items.filter(item => form.querySelector(`input[name="${item.id}"]:checked`)).length;
      message(`Local preview reviewed: ${count} of 10 statements answered. Nothing was submitted or saved. You can keep editing, clear the form, or return to the activities.`);
      return;
    }
    if (!retryPayload && !document.getElementById('consent').checked) {
      message('To submit, please read the study information and choose whether to consent. You can leave this page without participating.', true);
      document.getElementById('consent').focus(); return;
    }
    if (!window.crypto || typeof window.crypto.randomUUID !== 'function') {
      message('This browser cannot create a secure submission reference. Nothing was submitted. Use an up-to-date browser on a secure connection.', true); return;
    }
    if (!retryPayload) retryPayload = currentPayload();
    pending = true; setLocked(true); submit.textContent = 'Submitting…'; message('Sending your feedback…');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('/api/research/responses', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(retryPayload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true || typeof result.responseId !== 'string') {
        retryLocked = true;
        if (response.status === 429) {
          message('The service is receiving too many requests. Wait before using Retry submission. Your answers and original reference are kept unchanged. Do not refresh: a new reference could duplicate a response already received.', true);
        } else if (response.status >= 400 && response.status < 500) {
          message('The service rejected this attempt. Your answers and original reference are kept unchanged. If you retry, the same reference will be used. Contact the researcher if this continues. Do not refresh: a new reference could duplicate a response already received.', true);
        } else {
          message('We could not confirm whether your response was received. Keep this page open and use Retry submission. Your answers are locked and the original reference is reused. Do not refresh: a new reference could duplicate a response already received.', true);
        }
        return;
      }
      completed = true; retryLocked = false;
      form.hidden = true;
      document.getElementById('response-id').textContent = `Response reference: ${result.responseId}`;
      document.getElementById('success-withdrawal').textContent = readable(study.withdrawal);
      const success = document.getElementById('success-panel'); success.hidden = false; success.focus();
      // Release answer data after a confirmed successful submission.
      retryPayload = null; form.reset();
    } catch (_) {
      retryLocked = true;
      message('We could not confirm whether your response was received. Keep this page open and use Retry submission. The original reference is reused. Do not refresh: a new reference could duplicate a response already received.', true);
    } finally {
      window.clearTimeout(timeout); pending = false;
      setLocked(completed || retryLocked);
      submit.textContent = retryLocked ? 'Retry submission' : 'Submit voluntary feedback';
    }
  }
  clear.addEventListener('click', () => {
    if (pending || retryLocked || completed) return;
    form.reset(); retryPayload = null; updateProgress();
    message(enabled ? 'All answers and consent have been cleared. Nothing was submitted.' : 'All preview answers have been cleared. Nothing was submitted or saved.');
    document.getElementById('lab').focus();
  });
  form.addEventListener('submit', sendFeedback);

  async function initialize() {
    if (!source || !Array.isArray(source.satisfaction) || source.satisfaction.length !== 10 || !Array.isArray(source.openPrompts) || source.openPrompts.length !== 2) {
      document.getElementById('loading').hidden = true;
      const error = document.getElementById('fatal-error'); error.hidden = false; error.textContent = 'The questionnaire could not be loaded. No information has been submitted. Please return to the activities and try again later.'; return;
    }
    const fallback = {
      version: 'utas-cyberlab-satisfaction-draft-1.0', title: 'Learning experience feedback',
      items: source.satisfaction.map((item, index) => ({ id: `q${index + 1}`, text: item.text })),
      comments: source.openPrompts.map((item, index) => ({ id: index === 0 ? 'usefulPart' : 'improvement', text: item.text })),
      scale: source.satisfactionScale.map(item => ({ value: item.value === null ? 'na' : item.value, label: item.label })),
      labs: []
    };
    instrument = fallback;
    let config = null;
    let reason = '';
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch('/api/research/config', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Config unavailable');
      config = await response.json();
      if (config.instrument && Array.isArray(config.instrument.labs)) instrument.labs = config.instrument.labs;
      if (validConfig(config, fallback)) {
        instrument.version = config.instrument.version; study = config.study; enabled = true;
      } else if (config.enabled === true) {
        reason = 'The study configuration could not be verified, so submission is unavailable.';
      }
    } catch (_) { reason = 'The research service could not be reached, so this page is in safe preview mode.'; }
    finally { window.clearTimeout(timeout); }
    setMode(enabled, reason);
    document.getElementById('question-instructions').textContent = source.satisfactionInstructions;
    instrument.labs.forEach(lab => {
      if (!lab || typeof lab.id !== 'string' || typeof lab.label !== 'string') return;
      const option = element('option', '', lab.label); option.value = lab.id; document.getElementById('lab').append(option);
    });
    renderStudy(); renderQuestions(); renderComments(); updateProgress();
    document.getElementById('instrument-version').textContent = `${instrument.version} · Draft instrument · Not validated as a combined scale`;
    document.getElementById('loading').hidden = true; form.hidden = false;
  }
  initialize().catch(() => {
    document.getElementById('loading').hidden = true;
    form.hidden = true; const error = document.getElementById('fatal-error'); error.hidden = false;
    error.textContent = 'The questionnaire could not be displayed safely. Nothing has been submitted. Please return to the activities and try again later.';
  });
})();
