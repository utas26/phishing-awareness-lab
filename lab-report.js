/* Local-only training reports. This module never reads lab inputs, browser storage,
   credentials, or the network. Integrations must supply safe, non-secret summaries. */
(function (root) {
  'use strict';
  const catalog = {
    phishing: {
      title: 'Phishing Awareness Lab',
      attackType: 'Phishing and credential-harvesting social engineering',
      howItHappens: 'A deceptive message creates urgency and sends a person to an imitation sign-in page. Entering credentials on an attacker-controlled page can expose an account. This report does not collect credentials or verify a compromise.',
      recommendations: ['Open the service through a trusted bookmark or independently verified address.', 'Check the actual destination and report suspicious messages through the approved channel.', 'Use a password manager and phishing-resistant MFA where supported.']
    },
    qr: {
      title: 'QR Phishing Lab', attackType: 'QR-code phishing (quishing)',
      howItHappens: 'A QR code can conceal a deceptive destination until it is previewed. Replaced posters or urgent messages may direct people to imitation login or payment pages.',
      recommendations: ['Preview the destination before opening a QR link.', 'Check the actual domain and the physical source of the QR code.', 'Open sensitive services through an independently trusted route.']
    },
    mfa: {
      title: 'MFA Fatigue Lab', attackType: 'Repeated authentication-prompt social engineering',
      howItHappens: 'An attacker repeatedly triggers authentication prompts and hopes that fatigue, confusion, or a deceptive support message persuades the account owner to approve an uninitiated sign-in.',
      recommendations: ['Deny and report prompts you did not initiate.', 'Verify unexpected support requests independently.', 'Use phishing-resistant authentication where available and investigate unexpected sign-in attempts.']
    },
    update: {
      title: 'Fake Software Update Lab', attackType: 'Malicious software delivery through a fake update prompt',
      howItHappens: 'A deceptive page or message imitates an update notice and asks a person to run an untrusted installer or command. The resulting software could execute with the permissions granted to it.',
      recommendations: ['Use the application or operating system’s built-in update channel.', 'Do not run installers or commands from unexpected update prompts.', 'Keep approved software updated and report suspicious prompts.']
    },
    browser: {
      title: 'Browser Permission Lab', attackType: 'Deceptive permission requests and excessive access',
      howItHappens: 'A site requests access unrelated to the activity a person initiated, sometimes disguised as a verification step. Granting it can expose device capabilities or permit unwanted notifications.',
      recommendations: ['Match each permission to an action you intentionally initiated.', 'Deny unrelated requests and review previously granted permissions.', 'Grant the least access needed and revoke it when no longer required.']
    },
    url: {
      title: 'Suspicious URL Lab', attackType: 'Deceptive domains and misleading URL structure',
      howItHappens: 'A URL places familiar words in subdomains, paths, or query strings to disguise the actual destination. A secure connection alone does not establish that the site is trustworthy.',
      recommendations: ['Identify the actual host and domain before opening a sensitive link.', 'Compare the destination with an independently verified service address.', 'Use trusted bookmarks for sign-in and report deceptive links.']
    },
    port: {
      title: 'Port Scanning Lab', attackType: 'Network reconnaissance and service exposure assessment',
      howItHappens: 'A port scan probes selected ports and interprets replies as open, closed, or filtered. Reconnaissance can reveal reachable services; an open port alone does not prove a vulnerability, successful attack, or compromise.',
      recommendations: ['Verify that each reachable service is required.', 'Restrict administrative services, patch approved services, and use strong authentication.', 'Validate findings with authorized follow-up testing; a port scan cannot establish patch levels or exploitation.']
    },
    password: {
      title: 'Password Strength Lab', attackType: 'Password guessing and credential-reuse risk awareness',
      howItHappens: 'Short, common, or reused passwords can be guessed or reused after a breach. This exercise shows the length of invented examples and checks a small set of classroom patterns. It does not screen a complete breach list, verify uniqueness, predict cracking time, or test an account.',
      recommendations: ['Use long, unique passwords managed by a reputable password manager.', 'Enable phishing-resistant MFA where supported.', 'A length or pattern observation is not a security guarantee; this classroom check cannot establish uniqueness or breach status.']
    },
    wifi: {
      title: 'Wi-Fi Auditing Lab', attackType: 'Offline password-guessing concept simulation',
      howItHappens: 'This fictional exercise compares preset candidate counts against a synthetic teaching verifier to illustrate why predictable secrets are weaker. It does not capture wireless traffic, calculate a real WPA verifier, connect to a network, or recover a real password.',
      recommendations: ['Use long, unique wireless passphrases and supported modern Wi-Fi security.', 'Keep access-point software current and disable unneeded legacy features.', 'Validate only within explicitly authorized environments; this teaching model cannot establish the security of a real Wi-Fi network.']
    },
    'dos-ddos': {
      title: 'DoS / DDoS Resilience Lab', attackType: 'Denial-of-service and distributed denial-of-service concepts',
      howItHappens: 'Synthetic demand is compared with a fictional service capacity. Excess demand can create modeled queuing, latency, and dropped requests. The exercise illustrates single-source and distributed pressure without sending traffic or testing a live service.',
      recommendations: ['Set appropriate rate limits and resource budgets for legitimate workloads.', 'Use layered monitoring, upstream filtering, and resilience planning.', 'Validate defenses in an explicitly authorized environment; this simple capacity model does not predict production availability.']
    },
    'sql-injection': {
      title: 'SQL Injection Defense Lab', attackType: 'SQL injection concept simulation',
      howItHappens: 'Unsafe query construction can interpret untrusted input as SQL structure rather than data. The sandbox contrasts fictional vulnerable behavior with a parameterized defensive model; it does not contact or query a real database.',
      recommendations: ['Use parameterized queries and avoid concatenating untrusted input into SQL.', 'Give application database accounts only the permissions required.', 'Test validation, error handling, and query behavior within an authorized environment.']
    },
    xss: {
      title: 'Cross-Site Scripting Defense Lab', attackType: 'Cross-site scripting (XSS) concept simulation',
      howItHappens: 'When untrusted content is treated as executable browser markup or script, it can run in a site’s context. This sandbox models that distinction with fictional fixtures and safe displayed outcomes, without executing student-supplied scripts.',
      recommendations: ['Render untrusted text through safe text APIs and use context-appropriate output encoding.', 'Avoid unsafe HTML insertion; use a maintained sanitizer when rich HTML is required.', 'Use a suitable Content Security Policy as defense in depth and test only authorized applications.']
    }
  };
  const aliases = { 'qr-phishing': 'qr', 'mfa-fatigue': 'mfa', 'fake-update': 'update', 'browser-permissions': 'browser', 'suspicious-url': 'url', 'port-scanning': 'port', 'password-strength': 'password', 'public-wifi': 'wifi', 'wifi-security': 'wifi', 'wifi-auditing': 'wifi', 'phishing-report': 'phishing' };
  const statusLabels = { 'not-performed': 'Not performed', 'in-progress': 'In progress / partial', completed: 'Completed simulation', cancelled: 'Cancelled / partial' };
  let mountCount = 0;
  function clean(value, limit) {
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') return '';
    return String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, limit || 4000);
  }
  function escape(value) { return clean(value, 20000).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
  function date(value) {
    if (!value || typeof value !== 'string') return '';
    const time = new Date(value);
    return Number.isFinite(time.getTime()) ? time.toISOString() : '';
  }
  function list(value, limit) { return Array.isArray(value) ? value.slice(0, limit || 30).map(v => clean(v)).filter(Boolean) : []; }
  function definition(options) {
    const id = aliases[options.labId] || options.labId || 'lab';
    const defaults = catalog[id] || {};
    return {
      id: clean(id, 80), title: clean(options.title || defaults.title || 'Security Training Lab', 180),
      attackType: clean(options.attackType || defaults.attackType || 'Security-awareness exercise'),
      howItHappens: clean(options.howItHappens || defaults.howItHappens || 'See the lab scenario for the simulated technique and its limitations.'),
      scope: clean(options.scope || 'Only fictional, preset scenarios in this browser session. No real accounts, devices, or networks are assessed.'),
      recommendations: list(options.recommendations || defaults.recommendations || [])
    };
  }
  function normalize(options, raw, observations) {
    raw = raw && typeof raw === 'object' ? raw : {};
    const def = definition(options);
    const allActions = Array.isArray(raw.actions) ? raw.actions : [];
    const actions = allActions.slice(-200).filter(v => typeof v === 'string' || (v && typeof v === 'object')).map(v => {
      if (typeof v === 'string') return { label: clean(v, 600), result: '', at: '' };
      const recordedTime = v.at ?? v.timestamp;
      const elapsed = typeof recordedTime === 'number' ? String(recordedTime) + ' s elapsed' : clean(recordedTime, 60);
      return { label: clean(v.label || v.action, 600), result: clean(v.result || v.evidence, 2000), at: date(recordedTime) || (/^\d+(?:\.\d+)?\s*(?:s|sec|seconds?)(?:\s+elapsed)?$/i.test(elapsed) ? elapsed : '') };
    }).filter(v => v.label || v.result);
    let status = clean(raw.status, 40);
    status = ({ complete: 'completed', running: 'in-progress', partial: 'in-progress', 'not-started': 'not-performed', 'not started': 'not-performed', 'not performed': 'not-performed', 'in progress': 'in-progress' })[status] || status;
    if (!statusLabels[status]) status = actions.length ? 'in-progress' : 'not-performed';
    if (!actions.length) status = 'not-performed';
    const performed = status !== 'not-performed';
    const findings = performed && Array.isArray(raw.findings) ? raw.findings.slice(0, 50).filter(v => v && typeof v === 'object').map(v => ({
      title: clean(v.title, 240), evidence: clean(v.evidence, 3000), risk: clean(v.risk || 'Informational training observation', 800),
      recommendation: clean(v.recommendation, 1600)
    })).filter(v => v.title && v.evidence) : [];
    const metrics = performed && Array.isArray(raw.metrics) ? raw.metrics.slice(0, 25).filter(v => v && typeof v === 'object').map(v => ({ label: clean(v.label, 180), value: clean(v.value, 500) })).filter(v => v.label && v.value) : [];
    return {
      ...def, status, statusLabel: statusLabels[status], generatedAt: new Date().toISOString(),
      startedAt: performed ? date(raw.startedAt) : '', completedAt: status === 'completed' ? date(raw.completedAt) : '',
      summary: performed ? clean(raw.summary, 4000) : 'This lab has not been performed in the current report session. No test results, successful attacks, or vulnerabilities are claimed.',
      actions: performed ? actions : [], omittedActions: performed ? Math.max(0, allActions.length - 200) : 0, findings, metrics,
      observations: clean(observations, 4000), limitations: list(raw.limitations),
      recommendations: def.recommendations.concat(list(raw.recommendations)).slice(0, 30)
    };
  }
  const reportStyles = `
    :root{font-family:Arial,Helvetica,sans-serif;color:#23344b;background:#eef2f6;line-height:1.6}*{box-sizing:border-box}body{margin:0;padding:34px 20px}main{max-width:1000px;margin:auto;background:white;padding:44px;border:1px solid #d9e2ec;border-radius:12px}header{border-bottom:3px solid #285797;padding-bottom:24px}.eyebrow{font-size:12px;letter-spacing:.1em;color:#34659e;font-weight:bold;text-transform:uppercase}h1{font-size:32px;line-height:1.2;margin:10px 0;color:#19395f}h2{font-size:19px;color:#234e80;margin:28px 0 10px}h3{font-size:16px;margin:0 0 8px}p{margin:8px 0}.notice{background:#fff6df;border:1px solid #e8d496;padding:14px 18px;border-radius:8px;margin-top:20px}.meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:18px}.meta div,.finding{border:1px solid #d9e2ec;padding:12px 15px;border-radius:6px}.meta span{display:block;font-size:12px;color:#607088}.status{font-weight:bold}.muted{color:#5c6d82}table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;table-layout:fixed}th,td{text-align:left;vertical-align:top;padding:10px;border:1px solid #d9e2ec;overflow-wrap:anywhere}th{background:#edf3fa;color:#224a79}.when{width:20%}.action{width:30%}.finding{margin:12px 0;background:#fbfcfe}.preserve{white-space:pre-wrap;overflow-wrap:anywhere}li{margin:6px 0}footer{border-top:1px solid #d9e2ec;margin-top:32px;padding-top:14px;font-size:12px;color:#617289}.print-hint{font-size:13px;color:#5c6d82;margin:0 0 20px;text-align:right}section{overflow-wrap:anywhere}@page{size:A4;margin:15mm}@media print{:root{background:#fff}body{padding:0;font-size:10pt}main{max-width:none;padding:0;border:0;border-radius:0}h1{font-size:24pt}h2{font-size:14pt;break-after:avoid}h3,thead{break-after:avoid}tr,.finding,.notice{break-inside:avoid}.meta{grid-template-columns:1fr 1fr}.print-hint{display:none}table{font-size:9pt}thead{display:table-header-group}footer{font-size:8pt}}@media(max-width:600px){body{padding:12px}main{padding:22px}.meta{grid-template-columns:1fr}h1{font-size:26px}table{font-size:11px}th,td{padding:6px}}
  `;
  function renderReport(options, snapshot, observations) {
    const r = normalize(options || {}, snapshot, observations);
    const bullets = items => '<ul>' + items.map(item => '<li>' + escape(item) + '</li>').join('') + '</ul>';
    const actionRows = r.actions.map((a, i) => '<tr><td class="when">' + (a.at ? escape(a.at) : 'Time not recorded') + '</td><td class="action">' + (i + 1 + r.omittedActions) + '. ' + escape(a.label || 'Recorded action') + '</td><td class="preserve">' + escape(a.result || 'No result recorded') + '</td></tr>').join('');
    const findings = r.findings.map((f, i) => '<article class="finding"><h3>' + (i + 1) + '. ' + escape(f.title) + '</h3><p class="preserve"><strong>Recorded evidence:</strong> ' + escape(f.evidence) + '</p><p class="preserve"><strong>Risk / significance:</strong> ' + escape(f.risk) + '</p><p class="preserve"><strong>Recommendation:</strong> ' + escape(f.recommendation || 'Review the mitigation guidance below and validate within an authorized environment.') + '</p></article>').join('');
    const limits = ['This is an educational simulation report, not an independent penetration test, certification, or evidence of compromise.', 'Results describe only the actions recorded in this current page session. Unperformed, reset, or unrecorded work is not inferred.', 'Risk descriptions are qualitative training context. No CVSS score, successful exploitation, or production vulnerability is inferred.', 'No student identity is required. Lab credentials and browser storage are not read by the report module. Optional observations are included only as typed; do not enter secrets.'].concat(r.limitations);
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'"><title>' + escape(r.title) + ' — Training Report</title><style>' + reportStyles + '</style></head><body><main><p class="print-hint">To save as PDF, use your browser’s Print command and choose Save as PDF.</p><header><div class="eyebrow">UTAS-Ibra CyberLab · Explore. Practise. Defend.</div><h1>' + escape(r.title) + '</h1><p>Practical Security Learning Hub · Security training report</p><div class="meta"><div><span>Completion status</span><strong class="status">' + escape(r.statusLabel) + '</strong></div><div><span>Report generated (UTC)</span>' + escape(r.generatedAt) + '</div><div><span>Session started (UTC)</span>' + escape(r.startedAt || 'Not recorded') + '</div><div><span>Session completed (UTC)</span>' + escape(r.completedAt || 'Not completed / not recorded') + '</div></div></header><div class="notice"><strong>SIMULATION ONLY</strong><br>This document records a fictional classroom exercise. It does not assert that a real system was tested, attacked, compromised, or found vulnerable.</div><section><h2>1. Executive summary</h2><p class="preserve">' + escape(r.summary || 'The following actions and outcomes were recorded by this training lab. Interpret them within the fictional scope and stated limitations.') + '</p>' + (r.metrics.length ? '<table><thead><tr><th>Recorded measure</th><th>Value</th></tr></thead><tbody>' + r.metrics.map(m => '<tr><td>' + escape(m.label) + '</td><td>' + escape(m.value) + '</td></tr>').join('') + '</tbody></table>' : '') + '</section><section><h2>2. Scope and method</h2><p class="preserve">' + escape(r.scope) + '</p><p>Method: local interactive training actions and recorded, non-secret lab-state summaries. No external verification is implied. The report is generated in the browser without uploading report data.</p></section><section><h2>3. Attack type and how it happens</h2><p><strong>' + escape(r.attackType) + '</strong></p><p class="preserve">' + escape(r.howItHappens) + '</p></section><section><h2>4. Actions, evidence, and results</h2>' + (r.actions.length ? '<table><thead><tr><th class="when">Recorded time (UTC or elapsed)</th><th class="action">Action</th><th>Recorded result / evidence</th></tr></thead><tbody>' + actionRows + '</tbody></table>' + (r.omittedActions ? '<p class="muted">Only the most recent 200 actions are included; ' + r.omittedActions + ' earlier action(s) are omitted.</p>' : '') : '<p>No actions were recorded. Testing was not performed in this report session.</p>') + '</section><section><h2>5. Findings and risk interpretation</h2>' + (findings || '<p>No evidence-backed findings were recorded. This does not establish that any system is secure or vulnerable.</p>') + '</section><section><h2>6. Recommendations</h2>' + (r.recommendations.length ? bullets(r.recommendations) : '<p>Review the lab’s defensive guidance and use only authorized environments for further testing.</p>') + '</section><section><h2>7. Student observations (optional)</h2><p class="preserve">' + escape(r.observations || 'No student observations supplied.') + '</p><p class="muted">Student-authored observations are not independently verified test evidence.</p></section><section><h2>8. Limitations and handling</h2>' + bullets(limits) + '</section><footer>Prepared locally by UTAS-Ibra CyberLab · Educational use only · Share only after reviewing the report contents.</footer></main></body></html>';
  }
  function mount(options) {
    options = options || {};
    const document = root.document;
    const target = typeof options.mountTo === 'string' ? document.querySelector(options.mountTo) : options.mountTo;
    if (!target) throw new Error('LabReport.mount requires an existing mountTo element or selector.');
    if (target.__labReport) return target.__labReport;
    const def = definition(options), uid = 'lab-report-' + (++mountCount);
    const section = document.createElement('section');
    section.className = 'lab-report'; section.setAttribute('aria-labelledby', uid + '-title');
    const heading = document.createElement('h2'); heading.id = uid + '-title'; heading.textContent = 'Download your lab report';
    const intro = document.createElement('p'); intro.textContent = 'Create a security assessment-style report with the attack type, how it happens, recorded actions, evidence, risk context, and recommendations. Unperformed work is clearly marked.';
    const label = document.createElement('label'); label.htmlFor = uid + '-notes'; label.textContent = 'Your observations (optional)';
    const notes = document.createElement('textarea'); notes.id = uid + '-notes'; notes.rows = 3; notes.maxLength = 4000; notes.placeholder = 'What did you notice, and what would you recommend? Do not include passwords, account details, or personal information.'; notes.setAttribute('aria-describedby', uid + '-privacy');
    const privacy = document.createElement('p'); privacy.className = 'lab-report-note'; privacy.id = uid + '-privacy'; privacy.textContent = 'No name or student ID needed. Reports stay on your device unless you choose to share them. Optional observations are included in the file exactly as entered; never add secrets.';
    const controls = document.createElement('div'); controls.className = 'lab-report-actions';
    const download = document.createElement('button'); download.type = 'button'; download.className = 'btn'; download.textContent = 'Download Report (.html)';
    const print = document.createElement('button'); print.type = 'button'; print.className = 'btn alt'; print.textContent = 'Print / Save PDF';
    const status = document.createElement('p'); status.className = 'lab-report-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    controls.append(download, print); section.append(heading, intro, label, notes, privacy, controls, status); target.append(section);
    let state = { status: 'not-performed', actions: [], findings: [] };
    function snapshot() {
      const supplied = typeof options.getSnapshot === 'function' ? options.getSnapshot() : state;
      if (supplied && typeof supplied.then === 'function') throw new Error('Report snapshots must be synchronous.');
      return supplied;
    }
    function html() { return renderReport(options, snapshot(), notes.value); }
    download.addEventListener('click', () => {
      try {
        const blob = new root.Blob([html()], { type: 'text/html;charset=utf-8' });
        const url = root.URL.createObjectURL(blob), anchor = document.createElement('a');
        anchor.href = url; anchor.download = (def.id.replace(/[^a-z0-9_-]/gi, '-') || 'lab') + '-training-report-' + new Date().toISOString().slice(0, 10) + '.html';
        document.body.append(anchor); anchor.click(); anchor.remove();
        root.setTimeout(() => root.URL.revokeObjectURL(url), 60000);
        status.textContent = 'Report download requested. Open the HTML file in a browser; its Print command can save a PDF.';
      } catch (error) { status.textContent = 'The report could not be generated. Your lab data was not sent anywhere. Try again or restart the lab.'; }
    });
    print.addEventListener('click', () => {
      let frame;
      try {
        const output = html();
        frame = document.createElement('iframe'); frame.title = def.title + ' printable report'; frame.className = 'lab-report-print-frame'; frame.setAttribute('aria-hidden', 'true'); frame.tabIndex = -1;
        frame.onload = () => {
          try {
            const win = frame.contentWindow;
            win.addEventListener('afterprint', () => frame.remove(), { once: true });
            win.focus(); win.print();
            status.textContent = 'Print dialog requested. Choose Save as PDF if your browser supports it, or download the HTML report.';
          } catch (error) { frame.remove(); status.textContent = 'Printing is unavailable in this browser. Download the HTML report and print it from a browser.'; }
        };
        frame.srcdoc = output; document.body.append(frame);
        root.setTimeout(() => { if (frame && frame.isConnected) frame.remove(); }, 300000);
      } catch (error) { if (frame) frame.remove(); status.textContent = 'The report could not be prepared for printing. Try Download Report instead.'; }
    });
    const api = {
      update(next) { state = next && typeof next === 'object' ? next : { status: 'not-performed', actions: [] }; },
      record(action) { state.actions = Array.isArray(state.actions) ? state.actions : []; state.actions.push({ ...action, at: action && action.at || new Date().toISOString() }); if (state.status === 'not-performed') state.status = 'in-progress'; },
      reset() { state = { status: 'not-performed', actions: [], findings: [] }; notes.value = ''; status.textContent = ''; },
      render: html,
      element: section
    };
    target.__labReport = api;
    return api;
  }
  const api = { mount, renderReport, normalize, catalog };
  root.LabReport = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
