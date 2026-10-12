/* Beginner report: allowlisted simulation events only; no credential or metadata access. */
(function (root) {
  'use strict';
  const LABELS = {
    'email-viewed': ['The fictional email page was displayed', 'The page showed an urgent Moodle suspension message. Displaying it does not prove the learner read it or spotted the warning signs.'],
    'link-opened': ['The fictional email link was selected', 'The learner selected the classroom link or button. It opens only the internal demo page, not the fictional address printed in the email.'],
    'login-viewed': ['The imitation login page was displayed', 'The classroom page showed a familiar-looking portal with a fixed, non-editable example. No real account was accessed.'],
    'demo-started': ['The fixed demonstration was started', 'The learner selected Run fixed demo. The existing classroom demo attempts to send fixed example metadata and browser/device metadata; the report does not read or include that metadata.'],
    'demo-finished': ['The demonstration returned a result', '']
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clean = value => typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, 1200) : '';
  function time(value) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value || '') || !Number.isFinite(Date.parse(value))) return 'Not recorded';
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Muscat', year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date(value)) + ' Oman (UTC+04:00)';
  }
  const weak = 'The scenario shows how trust in a familiar-looking message or login page, combined with urgency and failure to verify the address, can lead to disclosure. This is a simulated social-engineering weakness, not a finding that your account, password or network is vulnerable.';
  function model(raw) {
    const sanitized = root.PhishingProgress?.sanitize(raw);
    const events = sanitized ? sanitized.events : [];
    const last = events.at(-1);
    const startIndex = events.map(e => e.type).lastIndexOf('demo-started');
    const finishIndex = events.map(e => e.type).lastIndexOf('demo-finished');
    const latestFinish = finishIndex > startIndex ? events[finishIndex] : null;
    let status = 'No activity recorded', happened = 'No phishing steps are available in this tab. You may have used the exercise earlier, in another tab or before recording was available. This report cannot determine what happened then.';
    if (events.length) {
      status = 'Partial activity recorded';
      happened = 'Some classroom steps were recorded, but no finished fixed-demo attempt is recorded. See the steps below; missing steps are not assumed.';
    }
    if (startIndex >= 0 && !latestFinish) {
      status = 'Demo response not confirmed';
      happened = 'The fixed demonstration was started. No final response is recorded for the latest attempt. It may still be running or may have been interrupted; completion and server receipt are unknown.';
    }
    if (latestFinish?.outcome === 'recorded') {
      status = 'Fixed-demo response received';
      happened = 'The learner started the fixed classroom demonstration, and this browser received a successful server response. This is a simulation result, not evidence that a real password was stolen or that a real account was compromised.';
    }
    if (latestFinish?.outcome === 'unconfirmed') {
      status = 'Demo ran; server receipt unknown';
      happened = 'The fixed demonstration ran, but a successful server response was not confirmed. The request may or may not have reached the classroom server. A retry could create another classroom record.';
    }
    if (latestFinish && startIndex < 0) {
      status = 'Response recorded; start unavailable';
      happened = 'A demo result was recorded, but its starting step is not available. No start time or earlier actions are inferred. ' + (latestFinish.outcome === 'recorded' ? 'The recorded result says a successful response was received.' : 'The recorded result says server receipt was not confirmed.');
    }
    return { events, omitted: sanitized?.omitted || 0, storageStatus: ['available', 'unavailable', 'invalid'].includes(raw?.storageStatus) ? raw.storageStatus : 'available', status, happened,
      firstAt: events[0]?.at, lastAt: last?.at, completedAt: latestFinish?.at,
      count: events.filter(e => e.type === 'demo-started').length };
  }
  function body(raw, notes = {}, generatedAt = new Date().toISOString(), example = false) {
    const r = model(raw);
    const list = items => '<ul>' + items.map(item => '<li>' + esc(item) + '</li>').join('') + '</ul>';
    const activityRows = r.events.map((e, i) => {
      const result = e.type !== 'demo-finished' ? LABELS[e.type][1] : e.outcome === 'recorded'
        ? 'A successful response was received at this time. This report does not query the server or independently verify its stored record.'
        : 'No successful response was confirmed. The request may or may not have reached the classroom server.';
      return '<li class="report-step"><div class="report-step-top"><strong>' + (i + 1 + r.omitted) + '. ' + esc(LABELS[e.type][0]) + '</strong><span>' + esc(time(e.at)) + '</span></div><p>' + esc(result) + '</p></li>';
    }).join('');
    const coverage = [
      ['Fictional email displayed', 'email-viewed'], ['Classroom link selected', 'link-opened'], ['Imitation login displayed', 'login-viewed'], ['Fixed demonstration started', 'demo-started']
    ].map(([label, type]) => '<li>' + esc(label) + ': <strong>' + (r.events.some(e => e.type === type) ? 'Recorded' : 'Not recorded') + '</strong></li>').join('');
    const reflection = [['Warning signs I noticed', notes.signs], ['My safe response', notes.response], ['What I learned', notes.learning]].map(([label, value]) => '<div class="report-answer"><h3>' + esc(label) + '</h3><p class="report-preserve">' + esc(clean(value) || 'Not supplied.') + '</p></div>').join('');
    const storageNotice = r.storageStatus === 'invalid' ? 'The saved step log is not recognized. It was not imported or repaired. Clear this tab’s report steps and repeat the exercise if you want a fresh record.' : r.storageStatus === 'unavailable' ? 'This browser is blocking session storage. Steps may be lost when moving between pages. Missing activity cannot be recovered.' : '';
    return '<article class="phishing-report" aria-label="Phishing awareness lab report"><header><p class="report-eyebrow">UTAS-Ibra CyberLab · Simulated penetration-test-style report</p><h2>Phishing Awareness Lab</h2><p class="report-status-badge">' + esc(r.status) + '</p>' + (example ? '<p class="report-disclaimer"><strong>ILLUSTRATIVE SAMPLE · FICTIONAL EXAMPLE ONLY.</strong> These timestamps and events are synthetic QA examples, not student activity or research results.</p>' : '') + '<p class="report-disclaimer"><strong>Simulation only.</strong> This classroom exercise does not test a real account or network. The fixed demo does not read, store or send a password value.</p></header>' + (storageNotice ? '<p class="report-warning">' + esc(storageNotice) + '</p>' : '') +
      '<section class="report-overview"><h2>1. Lab name, scope, result and time</h2><dl><div><dt>Lab name</dt><dd>Phishing Awareness: suspicious email and imitation login</dd></div><div><dt>Objective</dt><dd>Recognize a deceptive email, understand the risk of an imitation login, and choose a safe response.</dd></div><div><dt>Scope and method</dt><dd>Fictional email and fixed imitation-login demonstration inside this classroom site. Evidence comes only from a local, unverified event log in this tab. No real accounts, networks or security controls are tested.</dd></div><div><dt>What happened</dt><dd>' + esc(r.happened) + '</dd></div><div><dt>When it happened</dt><dd>' + (r.events.length ? 'First recorded step: ' + esc(time(r.firstAt)) + '<br>Latest recorded step: ' + esc(time(r.lastAt)) + '<br>Latest demo result: ' + esc(time(r.completedAt)) : 'Not recorded. Generating a report does not establish when the exercise happened.') + '</dd></div><div><dt>Weakness explained</dt><dd>' + esc(weak) + '</dd></div></dl><p class="report-note">Report generated: ' + esc(time(generatedAt)) + '. This is the export/preview time, not the time of the exercise. Times use Oman time (UTC+04:00), converted from recorded UTC timestamps. The browser clock supplies the event time; it is not server-verified.</p></section>' +
      '<section><h2>2. Recorded steps and evidence</h2><p>Only events recorded in this tab are listed. A page being displayed does not prove it was read, understood or completed.</p><ul class="report-coverage">' + coverage + '</ul>' + (activityRows ? '<ol class="report-steps">' + activityRows + '</ol>' : '<p class="report-empty">No recorded steps. Open the exercise in this tab, perform the classroom steps, then return using “My phishing lab report”. Older activity is not reconstructed.</p>') + (r.omitted ? '<p>' + esc(r.omitted) + ' earlier event(s) are omitted. Only the latest 100 are retained; the first time above is the first retained step.</p>' : '') + '</section>' +
      '<section><h2>3. Findings, weakness and risk</h2><p>These are scenario findings for learning. They do not establish a real vulnerability, successful attack or learner mistake. Risk labels describe potential impact if this happened with real credentials; likelihood was not assessed and no CVSS score is assigned.</p>' +
      '<article class="report-finding"><h3>PH-01 · Urgent message and unverified destination</h3><p><strong>Evidence:</strong> The fictional email says “Your Moodle account will be suspended today”. It displays security-alert@campus-access.example as sender and secure-login.campus-check.example as destination.</p><p><strong>Activity evidence:</strong> ' + (r.events.some(e => e.type === 'email-viewed') ? 'The email page display was recorded. This does not show whether the learner recognized its warning signs.' : 'Email-page activity was not recorded. The example above is scenario context only.') + '</p><p><strong>Weakness:</strong> Urgency and an IT Support display name can encourage action without checking the real sender and destination. These are fictional domains, and the training link stays inside the lab.</p><p><strong>Training risk: Moderate.</strong> A deceptive message could lead someone to an unsafe page. Opening this classroom link does not compromise an account.</p><p><strong>Recommendation:</strong> Pause, inspect the address, and verify through a known IT-support channel. Open the official portal independently.</p></article>' +
      '<article class="report-finding"><h3>PH-02 · Trust in an imitation login page</h3><p><strong>Evidence:</strong> The classroom scenario uses a familiar-looking portal and a “session timed out” prompt. The displayed example is fixed and cannot be edited.</p><p><strong>Activity evidence:</strong> ' + (r.events.some(e => e.type === 'login-viewed') ? 'The imitation page display was recorded. See the step log for any fixed-demo attempt and response.' : 'Login-page activity was not recorded. No visit or submission is inferred.') + '</p><p><strong>Weakness:</strong> A familiar design can be mistaken for proof that a site is trusted. In a real attack, a password submitted to an attacker’s page may be stolen even if it is long or complex.</p><p><strong>Training risk: High potential impact if real credentials are disclosed.</strong> Account access could be lost. This lab collected no password value and does not demonstrate an actual compromise.</p><p><strong>Recommendation:</strong> Use a trusted bookmark, verify the real domain, and use phishing-resistant MFA where supported.</p></article></section>' +
      '<section><h2>4. How to prevent it</h2>' + list([
        'Pause. Do not use the message’s sign-in link when the request is unexpected.',
        'Open the official learning portal from a trusted bookmark or independently confirmed address.',
        'Verify the request with IT support through a known channel and report suspicious messages.',
        'Use unique passwords and phishing-resistant MFA where supported. These do not replace checking the destination.',
        'If you entered real details on a suspicious site, change the password through the official service and contact IT promptly.'
      ]) + '</section>' +
      '<section><h2>5. Conclusion and your reflection</h2><p><strong>Lab conclusion:</strong> The scenario illustrates how urgency and a trusted-looking page can persuade someone to disclose information. Checking the real destination and verifying independently help prevent this. This report does not measure your understanding or assign a grade.</p>' + reflection + '<p class="report-note">Reflection is student-authored and not independently verified. Blank answers are left blank rather than invented.</p></section>' +
      '<section><h2>6. What this report cannot confirm</h2>' + list([
        'Not recorded means unknown. It does not prove that an action was never performed.',
        'The record belongs to this browser tab, may be copied when a tab is duplicated, and is not identity-verified or tamper-proof. Cleared, older or other-tab history cannot be recovered.',
        'A server response is not a live check of classroom records. No instructor records, raw passwords, account values or browser/device metadata are imported.',
        'This learning report is not proof of a successful attack, a real vulnerability, a research result or completion of an assessment.'
      ]) + '</section><footer>Prepared in your browser · Review before sharing · Educational use only</footer></article>';
  }
  const exportCss = `:root{font-family:Arial,Helvetica,sans-serif;color:#24364b;line-height:1.6;background:#eef3f6}*{box-sizing:border-box}body{margin:0;padding:24px}main{max-width:900px;margin:auto;background:white;padding:34px;border:1px solid #d5e0e6;border-radius:12px}h2{font-size:21px;line-height:1.3;color:#17646d;margin:30px 0 14px}header h2{font-size:32px;margin:8px 0}h3{font-size:16px;margin:8px 0}p{margin:8px 0}.report-eyebrow{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#426971}.report-status-badge{display:inline-block;padding:5px 12px;background:#e6f2f0;border-radius:20px;font-weight:bold}.report-disclaimer,.report-warning,.report-empty{background:#fff6dc;padding:14px;border:1px solid #e6d294;border-radius:8px}.report-note{font-size:13px;color:#526476}dl{margin:0}dl>div{display:grid;grid-template-columns:160px 1fr;gap:16px;padding:12px 0;border-bottom:1px solid #dce5e9}dt{font-weight:bold}dd{margin:0}.report-steps{list-style:none;padding:0}.report-step{padding:14px 0;border-bottom:1px solid #dce5e9}.report-step-top strong,.report-step-top span{display:block}.report-step-top span{font-size:13px;color:#526476}.report-step p{font-size:14px}.report-preserve{white-space:pre-wrap;overflow-wrap:anywhere}.report-answer{padding:10px 0}.report-finding{padding:16px;border:1px solid #d2dfe5;border-left:4px solid #26747b;border-radius:6px;margin:16px 0;background:#fbfdfe}.report-coverage{font-size:14px}li{margin:7px 0}section,dd,p{overflow-wrap:anywhere}footer{font-size:12px;border-top:1px solid #ccdbe0;margin-top:26px;padding-top:12px;color:#526476}.print-help{font-size:13px;color:#526476}@media(max-width:600px){body{padding:10px}main{padding:20px}dl>div{grid-template-columns:1fr;gap:4px}header h2{font-size:27px}}@page{size:A4;margin:15mm}@media print{:root{background:white}body{padding:0;font-size:10pt}main{padding:0;border:0;border-radius:0;max-width:none}h2{font-size:14pt;break-after:avoid}header h2{font-size:22pt}h3{break-after:avoid}dl>div,.report-step,.report-answer,.report-finding{break-inside:avoid}.print-help{display:none}.report-note,.report-step p{font-size:9pt}}`;
  function render(raw, notes, generatedAt, example) {
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'"><title>Phishing Awareness Lab Report</title><style>' + exportCss + '</style></head><body><main><p class="print-help">To save a PDF, use your browser’s Print command and choose Save as PDF.</p>' + body(raw, notes, generatedAt, example) + '</main></body></html>';
  }
  function mount() {
    const doc = root.document, byId = id => doc.getElementById(id), preview = byId('phishingReportPreview');
    if (!preview || !root.PhishingProgress) return;
    const status = byId('reportStatus');
    const notes = () => ({ signs: byId('reportSigns').value, response: byId('reportResponse').value, learning: byId('reportLearning').value });
    const refresh = () => { preview.innerHTML = body(root.PhishingProgress.read(), notes()); };
    const html = () => render(root.PhishingProgress.read(), notes());
    ['reportSigns', 'reportResponse', 'reportLearning'].forEach(id => byId(id).addEventListener('input', refresh));
    byId('refreshReport').addEventListener('click', () => { refresh(); status.textContent = 'Recorded steps refreshed. Missing activity remains unknown.'; });
    byId('resetReport').addEventListener('click', () => { status.textContent = root.PhishingProgress.reset() ? 'This tab’s report steps were cleared. Other records and reflection text were not changed.' : 'The browser did not allow the report steps to be cleared.'; refresh(); });
    byId('downloadReport').addEventListener('click', () => {
      try {
        const url = root.URL.createObjectURL(new root.Blob([html()], { type: 'text/html;charset=utf-8' }));
        const a = doc.createElement('a'); a.href = url; a.download = 'phishing-lab-report-' + new Date().toISOString().slice(0, 10) + '.html'; doc.body.append(a); a.click(); a.remove(); root.setTimeout(() => root.URL.revokeObjectURL(url), 60000);
        status.textContent = 'HTML report download requested. Open the file in a browser to read it or save it as a PDF.';
      } catch (error) { status.textContent = 'The report download could not be prepared. No report data was sent.'; }
    });
    byId('printReport').addEventListener('click', () => {
      let frame;
      try {
        frame = doc.createElement('iframe'); frame.className = 'report-print-frame'; frame.title = 'Printable phishing lab report'; frame.tabIndex = -1; frame.setAttribute('aria-hidden', 'true');
        frame.onload = () => {
          try { frame.contentWindow.addEventListener('afterprint', () => frame.remove(), { once: true }); frame.contentWindow.focus(); frame.contentWindow.print(); status.textContent = 'Print dialog requested. Choose Save as PDF, or use Download report (.html).'; }
          catch (error) { frame.remove(); status.textContent = 'Printing is unavailable. Download the HTML report and print it from a browser.'; }
        };
        frame.srcdoc = html(); doc.body.append(frame); root.setTimeout(() => frame.remove(), 300000);
      } catch (error) { if (frame) frame.remove(); status.textContent = 'The print view could not be prepared. Try Download report (.html).'; }
    });
    root.addEventListener('pageshow', refresh);
    refresh();
  }
  root.PhishingReport = { model, body, render, mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.PhishingReport;
  if (root.document) mount();
})(typeof window !== 'undefined' ? window : globalThis);
