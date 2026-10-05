/* All destinations, pages, redirects, and reports below are local training fixtures.
   No camera API, requests, navigation, credential fields, storage, or telemetry. */
(() => {
  'use strict';
  const app = document.getElementById('inspectionApp');
  if (!app) return;
  const mode = app.dataset.inspectionLab;
  if (!['qr', 'url'].includes(mode)) return;
  const isQr = mode === 'qr';
  const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const guide = window.BeginnerGuide?.mount({
    mountTo: '#beginnerGuideMount',
    title: isQr ? 'Read the address behind the QR code' : 'Check where the link really goes',
    intro: 'A familiar label is like a name on an envelope. The hostname is the address it actually goes to. Use the tools below to check the supplied example.',
    steps: [
      { title: 'Reveal', text: isQr ? 'Decode the supplied QR to see its hidden destination.' : 'Preview the urgent message’s stored link without visiting a website.' },
      { title: 'Inspect', text: 'Read the hostname: the website address. Compare it with the supplied trusted portal.' },
      { title: 'Collect proof', text: 'Follow each redirect, then attach the hostname and mismatch evidence.' },
      { title: 'Stop & report', text: 'Close the suspect destination, recover any fictional session, and file the local report.' },
      { title: 'Verify', text: isQr ? 'Open the trusted bookmark independently to check the fictional account.' : 'Open the trusted bookmark, then inspect and compare the timetable message.' }
    ]
  });
  const trustedUrl = 'https://portal.campus.example/dashboard';
  const trustedHost = new URL(trustedUrl).hostname;
  // Owner domains are explicitly authored fixtures, never a last-two-label guess.
  const fixtures = {
    qr: {
      entry: 'https://campus-qr.example/confirm',
      owner: 'campus-qr.example',
      final: 'https://login.campus-check.example/session',
      finalOwner: 'campus-check.example',
      trace: [
        { url: 'https://campus-qr.example/confirm', detail: 'Sample QR payload · local fixture' },
        { url: 'https://campus-qr.example/redirect', detail: 'Simulated HTTP 302 · same fixture owner' },
        { url: 'https://login.campus-check.example/session', detail: 'Simulated HTTP 302 · different fixture owner' }
      ]
    },
    url: {
      entry: 'https://portal.campus.example@campus-session.example/verify?next=%2Fdashboard',
      owner: 'campus-session.example',
      final: 'https://signin.campus-session.example/continue',
      finalOwner: 'campus-session.example',
      trace: [
        { url: 'https://portal.campus.example@campus-session.example/verify?next=%2Fdashboard', detail: 'Actual link target · local fixture' },
        { url: 'https://campus-session.example/redirect', detail: 'Simulated HTTP 302 · untrusted fixture owner' },
        { url: 'https://signin.campus-session.example/continue', detail: 'Simulated HTTP 302 · final sign-in imitation' }
      ]
    },
    legitimate: {
      entry: 'https://portal.campus.example/services/timetable',
      owner: 'campus.example',
      final: 'https://portal.campus.example/services/timetable',
      finalOwner: 'campus.example',
      trace: [{ url: 'https://portal.campus.example/services/timetable', detail: 'Simulated HTTP 200 · no redirect in this fixture' }]
    }
  };
  const threat = fixtures[mode];
  const evidenceLabels = {
    host: `The actual destination hostname differs from the supplied trusted host (${trustedHost})`,
    redirect: `The redirect ends at ${new URL(threat.final).hostname}, outside the trusted portal`,
    label: 'The displayed portal URL does not match the actual link target; the text before @ is userinfo',
    urgency: 'The poster applies a 15-minute account-suspension deadline'
  };
  let state;
  let report = null;
  let playback = null;
  let timer = null;
  let generation = 0;

  function freshState() {
    return {
      selected: 'threat', previewed: { threat: false, legitimate: false },
      inspected: { threat: false, legitimate: false },
      traceCount: { threat: 0, legitimate: 0 }, traced: { threat: false, legitimate: false },
      scanCount: 0, scanDone: false, browser: 'blank', pins: new Set(),
      contained: false, reported: false, trusted: false, compared: false,
      compromised: false, recovered: false, legitOpened: false, completedAt: '',
      message: isQr ? 'Start by decoding the supplied poster. Inspect the destination before trusting the sign-in page.' : 'Select the urgent message and preview its real link destination. The visible link text is only a claim.',
      tone: 'info', events: [{ type: 'ready', text: 'Local exercise started. Nothing leaves this page.', at: new Date().toISOString() }]
    };
  }
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const disabled = value => value ? ' disabled' : '';
  const currentFixture = () => state.selected === 'legitimate' ? fixtures.legitimate : threat;
  const selectedTarget = () => state.traced[state.selected] ? currentFixture().final : currentFixture().entry;
  const enoughEvidence = () => state.pins.has('host') && state.pins.has(isQr ? 'redirect' : 'label');
  const recoveredIfNeeded = () => !state.compromised || state.recovered;
  const reportReady = () => state.previewed.threat && state.inspected.threat && state.traced.threat && enoughEvidence() && state.contained && recoveredIfNeeded();
  const completed = () => state.reported && state.trusted && recoveredIfNeeded() && (isQr || state.compared);
  function log(type, text) { state.events.push({ type, text, at: new Date().toISOString() }); }
  function say(message, tone = 'info') { state.message = message; state.tone = tone; }
  function progress() {
    const items = [
      [isQr ? 'Decode sample QR' : 'Preview actual target', state.previewed.threat],
      ['Inspect hostname', state.inspected.threat],
      ['Trace redirects', state.traced.threat],
      ['Attach evidence', enoughEvidence()],
      ['Stop / recover', state.contained && recoveredIfNeeded()],
      ['File local report', state.reported],
      ['Use trusted bookmark', state.trusted]
    ];
    if (!isQr) items.push(['Compare legitimate link', state.compared]);
    return items;
  }
  function button(action, text, blocked = false, style = 'alt') {
    return `<button type="button" id="inspection-${action}" class="btn ${style}" data-action="${action}"${disabled(blocked)}>${text}</button>`;
  }
  function pin(id, visible) {
    if (!visible) return '';
    const selected = state.pins.has(id);
    const labels = { host: 'Destination hostname', redirect: 'Redirect destination', label: 'Link-text mismatch', urgency: 'Urgent poster claim' };
    return `<button type="button" id="inspection-pin-${id}" class="evidence-pin" data-action="pin" data-pin="${id}" aria-pressed="${selected}"${disabled(state.reported)}>${selected ? '✓ Attached: ' : '+ Attach: '}${labels[id]}</button>`;
  }
  function updateGuide() {
    if (!guide) return;
    const done = [state.previewed.threat, state.inspected.threat, state.traced.threat && enoughEvidence(), state.reported && recoveredIfNeeded(), state.trusted && recoveredIfNeeded() && (isQr || state.compared)];
    let step = Math.max(0, done.findIndex(value => !value));
    let action = null;
    let caption = '';
    const next = (id, label, text, index = step) => { action = { id: `inspection-${id}`, label }; caption = text; step = index; };
    if (state.compromised && !state.recovered) {
      next('recover', 'Find demo-session recovery', 'The fictional sign-in exposed the demo account. Close the preview and revoke its demo session before continuing.', 3);
    } else if (playback) {
      step = playback.kind === 'decode' ? 0 : (state.selected === 'legitimate' ? 4 : 2);
      next(playback.running ? 'pause' : 'step', playback.running ? 'Find Pause playback' : 'Find One step', `${playback.kind === 'decode' ? 'QR decode' : 'Redirect trace'} ${playback.running ? 'is playing' : 'is paused'} at step ${playback.index} of ${playback.kind === 'decode' ? 3 : currentFixture().trace.length}. Each step reveals one supplied observation.`, step);
    } else if (completed()) {
      step = 4; caption = 'Investigation complete. You checked the address, saved evidence, reported locally, and verified through the trusted route. The report below explains your actions.';
    } else if (!isQr && state.selected === 'legitimate' && (!done[0] || !done[1] || !done[2])) {
      next('select-threat', 'Find the urgent message', 'You selected the timetable comparison. Return to the urgent message to finish its destination evidence first.');
    } else if (!state.previewed.threat) {
      next(isQr ? 'decode' : 'preview', isQr ? 'Find Decode supplied QR' : 'Find Preview link destination', isQr ? 'Start with the in-page Decode button. You do not need a phone or camera.' : 'Preview the urgent message’s actual destination. Clicking this lab control stays on this page.', 0);
    } else if (!state.inspected.threat) {
      next('inspect', 'Find Inspect hostname', 'The destination is visible. Inspect its hostname and compare the full address with portal.campus.example.', 1);
    } else if (!state.traced.threat) {
      next('trace', 'Find Trace redirect chain', 'The hostname differs from the trusted portal. Trace the supplied redirects to see the final destination.', 2);
    } else if (!state.pins.has('host')) {
      next('pin-host', 'Find Attach destination hostname', 'Save the hostname mismatch as evidence. Attaching it adds an observation to your local report.', 2);
    } else if (!state.pins.has(isQr ? 'redirect' : 'label')) {
      next(isQr ? 'pin-redirect' : 'pin-label', isQr ? 'Find Attach redirect destination' : 'Find Attach link-text mismatch', isQr ? 'Attach the final redirect destination as your second observation.' : 'Attach the link-text mismatch. In this example, the hostname comes after @.', 2);
    } else if (!state.contained) {
      next('contain', 'Find Stop untrusted destination', 'Your evidence is ready. Stop the untrusted destination before filing the local report.', 3);
    } else if (!state.reported) {
      next('report', 'Find File local security report', 'The destination is stopped and the required evidence is attached. File the report inside this exercise.', 3);
    } else if (!state.trusted) {
      next('trusted', 'Find Open trusted bookmark', 'Now check the fictional account using the independent bookmark, rather than the suspicious message.', 4);
    } else if (!isQr && state.selected !== 'legitimate') {
      next('select-legitimate', 'Find the timetable message', 'Select “Your timetable is ready” to practise the same checks on a legitimate example.', 4);
    } else if (!isQr && !state.previewed.legitimate) {
      next('preview', 'Find Preview link destination', 'Preview the timetable’s stored destination before opening the contained timetable.', 4);
    } else if (!isQr && !state.inspected.legitimate) {
      next('inspect', 'Find Inspect hostname', 'Inspect the timetable hostname. Compare it with the same trusted portal address.', 4);
    } else if (!isQr && !state.legitOpened) {
      next('open-preview', 'Find Open contained timetable', 'The timetable hostname matches the trusted reference. Open its contained local preview.', 4);
    } else if (!isQr) {
      next('compare', 'Find Compare inspected timetable', 'Both trusted addresses are available. Compare them to finish the investigation.', 4);
    }
    guide.update({ step, completed: done.flatMap((value, i) => value ? [i] : []),
      status: completed() ? 'Investigation complete' : state.compromised && !state.recovered ? 'Recovery needed' : playback ? (playback.running ? 'Playing local steps' : 'Paused · your pace') : 'Your next action', caption,
      nodes: [
        { label: isQr ? 'Supplied QR' : 'Selected message', value: isQr ? (state.scanDone ? 'Destination revealed' : `${state.scanCount} of 3 decode steps`) : state.selected === 'threat' ? 'Urgent account message' : 'Timetable comparison', tone: state.previewed[state.selected] ? 'good' : 'neutral' },
        { label: 'Actual hostname', value: state.inspected[state.selected] ? new URL(selectedTarget()).hostname : 'Inspect to reveal', tone: state.inspected[state.selected] ? (state.selected === 'threat' ? 'warn' : 'good') : 'neutral' },
        { label: 'Redirect evidence', value: `${state.traceCount[state.selected]} of ${currentFixture().trace.length} hops checked`, tone: state.traced[state.selected] ? 'good' : playback?.kind === 'trace' ? 'active' : 'neutral' },
        { label: 'Response', value: state.compromised && !state.recovered ? 'Demo recovery pending' : state.reported ? 'Local report filed' : state.contained ? 'Destination stopped' : `${state.pins.size} observations attached`, tone: state.compromised && !state.recovered ? 'warn' : state.reported || state.contained ? 'good' : 'neutral' }
      ], action, eventKey: [state.events.length, state.selected, state.browser, playback?.kind, playback?.index, playback?.running].join(':'), animate: state.events.length > 1
    });
  }
  function source() {
    if (isQr) {
      const artwork = document.getElementById('qrArtwork');
      return `<div class="sim-panel-head"><h2>01 · Inspect the source</h2><small>Fictional poster</small></div><div class="sim-panel-body">
        <div class="sim-poster"><span class="poster-kicker">CAMPUS ACCOUNT NOTICE</span><h3>Keep your<br>account active</h3><p>Scan to confirm your campus account</p>${artwork ? artwork.innerHTML : '<p>Supplied sample QR</p>'}<span class="poster-urgent">Act within 15 minutes</span><p>Your account may be suspended if verification is not completed</p><div class="poster-footer">FICTIONAL POSTER · TRAINING SAMPLE</div></div>
        <div class="sim-source-controls">${button('decode', state.scanDone ? '✓ Sample QR decoded' : 'Decode supplied QR', state.scanDone || !!playback, '')}</div>
        <p class="sim-caption">The button replays a decode of this supplied QR payload. It does not scan other codes or use your camera. Do not use a phone.</p>
        <div class="evidence-row">${pin('urgency', true)}</div>
      </div>`;
    }
    const legitimate = state.selected === 'legitimate';
    return `<div class="sim-panel-head"><h2>01 · Inspect the inbox</h2><small>2 sample messages</small></div><div class="sim-panel-body">
      <div class="mail-list" aria-label="Fictional inbox"><button type="button" id="inspection-select-threat" class="mail-item${!legitimate ? ' active' : ''}" data-action="select-threat" aria-pressed="${!legitimate}"><strong>${state.reported ? '✓ Reported · ' : ''}Account access expires today</strong><small>Campus Service Desk · 09:12 · training message</small></button><button type="button" id="inspection-select-legitimate" class="mail-item${legitimate ? ' active' : ''}" data-action="select-legitimate" aria-pressed="${legitimate}"><strong>Your timetable is ready</strong><small>Campus Services · 08:45 · comparison message</small></button></div>
      <div class="mail-header"><span class="mail-demo">LOCAL MOCK EMAIL</span><strong>${legitimate ? 'Your timetable is ready' : 'Account access expires today'}</strong><span>From: ${legitimate ? 'services@campus.example' : 'help@campus-notices.example'}<br>To: demo-learner@campus.example</span></div>
      <div class="mail-body">${legitimate ? '<p>Your new timetable is available in the campus portal. You can also reach it from your saved portal bookmark.</p>' : '<p>Your campus access will be suspended in 15 minutes. Use the portal link below to confirm your account immediately.</p>'}<p><button type="button" class="mail-link" data-action="preview"${disabled(!legitimate && state.reported)}>https://portal.campus.example/services/timetable</button></p><p class="sim-caption">Click the displayed link to preview its stored destination inside this lab. Sender names and link text are claims, not proof.</p></div>
      <div class="actions">${button('preview', state.previewed[state.selected] ? 'Show destination again' : 'Preview link destination', !legitimate && state.reported, '')}</div>
    </div>`;
  }
  function browser() {
    let url = 'Local training browser · no page open';
    let content = '<div class="browser-empty"><span class="empty-icon" aria-hidden="true">▧</span>Open a contained preview or use the trusted bookmark<br><small>No real site is loaded here</small></div>';
    if (state.browser === 'threat') {
      url = threat.final;
      content = `<div class="mock-page"><div class="mock-page-logo" aria-hidden="true">C</div><h3>Campus account verification</h3><p>Confirm your identity to keep access to campus services.</p><div class="demo-identity">Training identity: <b>demo-learner</b><br>No username or password can be entered</div>${button('demo-login', 'Try fictional demo sign-in', false, '')}<div class="preview-warning">Contained imitation page. This button demonstrates a fictional consequence only; no credentials exist or are sent.</div></div>`;
    } else if (state.browser === 'consequence') {
      url = threat.final;
      content = `<div class="mock-page mock-danger"><h3>Demo account exposed</h3><p>In this scenario, the imitation page captured the fictional demo sign-in and created an attacker session. No real account or data was affected.</p>${button('recover', 'Close preview & revoke demo session', false, 'good')}<div class="preview-warning">Recovery here changes only the simulation. For a real incident, use a known official recovery route and contact your security team.</div></div>`;
    } else if (state.browser === 'blocked') {
      url = 'Local stop screen · untrusted destination closed';
      content = `<div class="mock-page mock-safe"><h3>${state.recovered ? 'Demo session revoked' : 'Destination stopped'}</h3><p>${state.recovered ? 'The fictional session is revoked and the imitation page is closed.' : 'The untrusted page is closed inside the simulation.'} Preserve the hostname and redirect evidence, then file your local report.</p></div>`;
    } else if (state.browser === 'trusted') {
      url = trustedUrl;
      content = '<div class="mock-page mock-safe"><div class="mock-page-logo" aria-hidden="true">C</div><h3>Campus portal dashboard</h3><p>Opened independently from the supplied trusted bookmark.</p><div class="demo-identity"><b>Demo account status: active</b><br>No account-verification request appears here</div><p class="preview-warning">This dashboard is a local fixture, not a real campus service.</p></div>';
    } else if (state.browser === 'legitimate') {
      url = fixtures.legitimate.entry;
      content = '<div class="mock-page mock-safe"><h3>Your timetable</h3><p>The inspected link reaches the same hostname as the supplied trusted portal.</p><div class="demo-identity">Monday · 10:00 · Cybersecurity practice<br>Wednesday · 13:00 · Network fundamentals</div><p class="preview-warning">Fictional timetable, rendered entirely inside this page.</p></div>';
    }
    return `<div class="sim-browser"><div class="browser-boundary">Simulated browser · all content stays inside this lab</div><div class="browser-toolbar"><span class="browser-dots" aria-hidden="true"><span></span><span></span><span></span></span><div class="browser-address" aria-label="Simulated address bar">${escape(url)}</div></div><div class="browser-view">${content}</div></div>`;
  }
  function playbackView() {
    if (!playback) return '';
    const steps = playback.kind === 'decode' ? ['Read supplied code', 'Decode fixture payload', 'Reveal destination'] : currentFixture().trace.map((_, i) => `Inspect hop ${i + 1}`);
    return `<div class="playback-bar" role="group" aria-label="Local playback controls"><strong>${playback.kind === 'decode' ? 'Sample QR decode' : 'Redirect inspection'} · ${playback.running ? 'playing' : 'paused'}</strong><p>${playback.index} / ${steps.length} local steps. ${steps[playback.index] || 'Complete'}${playback.running ? '…' : ''}</p><div class="actions">${button(playback.running ? 'pause' : 'resume', playback.running ? 'Pause playback' : 'Resume playback')}${button('step', 'One step')}${button('skip', 'Finish now')}${button('stop-playback', 'Stop playback')}</div></div>`;
  }
  function previewView() {
    const kind = state.selected;
    if (!state.previewed[kind]) return '';
    return `<div class="inspection-readout"><h3>${isQr ? 'Decoded QR payload' : 'Actual link destination'}</h3><div class="readout-url">${escape(currentFixture().entry)}</div><p class="readout-note">${kind === 'threat' && !isQr ? 'The displayed link says portal.campus.example. Here, the @ character makes that text userinfo; the hostname comes after it.' : 'A decoded URL is a destination to investigate, not a guarantee of trust.'}</p>${kind === 'threat' && !isQr ? `<div class="evidence-row">${pin('label', true)}</div>` : ''}</div>`;
  }
  function inspectorView() {
    const kind = state.selected;
    if (!state.inspected[kind]) return '';
    const parsed = new URL(selectedTarget());
    const original = new URL(currentFixture().entry);
    const owner = state.traced[kind] ? currentFixture().finalOwner : currentFixture().owner;
    return `<div class="inspection-readout"><h3>URL inspector · ${state.traced[kind] ? 'final destination' : 'initial destination'}</h3><dl><dt>Scheme</dt><dd>${escape(parsed.protocol)} <span>(encryption ≠ identity)</span></dd><dt>Actual hostname</dt><dd><span class="hostname">${escape(parsed.hostname)}</span></dd><dt>Fixture owner domain</dt><dd>${escape(owner)}</dd><dt>Path</dt><dd>${escape(parsed.pathname)}</dd><dt>Initial userinfo</dt><dd>${original.username ? escape(original.username) + ' (before @; not the hostname)' : 'None'}</dd><dt>Trusted hostname</dt><dd>${escape(trustedHost)}</dd><dt>Exact host match</dt><dd>${parsed.hostname === trustedHost ? 'YES · matches the supplied bookmark' : 'NO · different destination'}</dd></dl><p class="readout-note">Hostname is read with the browser URL parser. Owner domains are supplied facts for these fixtures, not a general domain-detection algorithm. HTTPS alone does not establish who runs a site.</p>${kind === 'threat' ? `<div class="evidence-row">${pin('host', true)}</div>` : ''}</div>`;
  }
  function traceView() {
    const kind = state.selected;
    if (!state.traceCount[kind]) return '';
    return `<div class="inspection-readout"><h3>Recorded redirect chain · local playback</h3><ol class="trace-list">${currentFixture().trace.slice(0, state.traceCount[kind]).map(hop => `<li><code>${escape(hop.url)}</code><span>${escape(hop.detail)}</span></li>`).join('')}</ol><p class="readout-note">${state.traced[kind] ? 'Trace complete. Compare the final hostname with the saved trusted portal, even if the first link looks familiar.' : 'Trace paused or in progress. Resume the trace to inspect the remaining fixture hops.'}</p>${kind === 'threat' ? `<div class="evidence-row">${pin('redirect', state.traced.threat)}</div>` : ''}</div>`;
  }
  function comparison() {
    if (!state.compared) return '';
    return `<div class="inspection-readout"><h3>Legitimate comparison verified</h3><div class="compare-grid"><div class="compare-cell"><strong>Inspected timetable link</strong>${escape(new URL(fixtures.legitimate.entry).hostname)}<br>/services/timetable</div><div class="compare-cell"><strong>Supplied trusted bookmark</strong>${escape(trustedHost)}<br>/dashboard</div></div><p class="readout-note">The exact hostnames match; their paths serve different pages. This fixture is expected. A matching-looking page or HTTPS padlock alone would not establish this.</p></div>`;
  }
  function workbench() {
    const kind = state.selected;
    const legitimate = kind === 'legitimate';
    const active = !!playback;
    const available = state.previewed[kind];
    return `<div class="sim-panel-head"><h2>02 · Follow the evidence</h2><small>${legitimate ? 'Comparison link' : 'Suspect destination'}</small></div><div class="sim-panel-body">${browser()}
      <div class="sim-tool-grid">${button('inspect', '<span class="tool-number">1</span> Inspect hostname', !available || active, '')}${button('trace', '<span class="tool-number">2</span> Trace redirect chain', !available || active || state.traced[kind], '')}${button('open-preview', legitimate ? 'Open contained timetable' : 'Open contained login preview', !available || active || !recoveredIfNeeded() || (!legitimate && (state.contained || state.reported || state.compromised)))}${button('contain', 'Stop untrusted destination', !state.previewed.threat || state.contained || state.reported || (state.compromised && !state.recovered), 'bad')}</div>
      <p class="sim-caption">Tools inspect only supplied fixtures. You never visit the shown domains.</p>${playbackView()}${previewView()}${inspectorView()}${traceView()}
      <div class="inspection-readout"><h3>Navigate independently</h3><p class="readout-note">A saved, trusted bookmark supplied for this exercise:</p><div class="readout-url">${escape(trustedUrl)}</div><div class="actions" style="margin-top:10px">${button('trusted', 'Open trusted bookmark', state.compromised && !state.recovered, 'good')}${!isQr ? button('compare', 'Compare inspected timetable', !state.previewed.legitimate || !state.inspected.legitimate || !state.legitOpened || !state.trusted || state.compared) : ''}</div>${!isQr ? '<p class="sim-caption">For comparison, select “Your timetable is ready”, preview and inspect it, open the contained timetable, then compare with this bookmark.</p>' : ''}</div>${comparison()}
    </div>`;
  }
  function evidencePanel() {
    const missing = [];
    if (!state.inspected.threat) missing.push('inspect the suspect hostname');
    if (!state.traced.threat) missing.push('finish the suspect redirect trace');
    if (!state.pins.has('host')) missing.push('attach destination-host evidence');
    if (!state.pins.has(isQr ? 'redirect' : 'label')) missing.push(isQr ? 'attach redirect evidence' : 'attach link-text mismatch evidence');
    if (!state.contained) missing.push('stop the suspect destination');
    if (!recoveredIfNeeded()) missing.push('revoke the fictional demo session');
    return `<div class="sim-panel-head"><h2>03 · Evidence & local report</h2><small>${state.pins.size} attached</small></div><div class="sim-panel-body">${state.pins.size ? `<ul class="evidence-tray">${[...state.pins].map(id => `<li>${escape(evidenceLabels[id])}</li>`).join('')}</ul>` : '<p class="empty-tray">Attach concrete observations from the inspector and redirect viewer. The report is built from the evidence you collect.</p>'}<div class="report-check">${state.reported ? 'Local report filed. No email, ticket, or network request was sent.' : missing.length ? `Before reporting: ${escape(missing.join('; '))}.` : 'Evidence ready. The suspect destination is stopped; submit the local practice report.'}</div>${button('report', state.reported ? '✓ Report filed locally' : 'File local security report', !reportReady() || state.reported, 'good')}${state.reported ? `<div class="sim-report"><h3>Practice report ${isQr ? 'QR' : 'URL'}-001</h3><p><b>Source:</b> ${isQr ? 'Fictional account-verification poster' : 'Account access expires today · mock inbox'}</p><p><b>Final hostname:</b> ${escape(new URL(threat.final).hostname)}</p><p><b>Evidence:</b> ${state.pins.size} observations attached</p><p><b>Disposition:</b> Destination stopped${state.recovered ? '; fictional demo session revoked' : '; demo sign-in avoided'}</p><p><b>Delivery:</b> On this page only</p></div>` : ''}</div>`;
  }
  function render() {
    const focused = document.activeElement;
    const focusAction = focused && app.contains(focused) ? focused.dataset.action : null;
    const focusPin = focusAction === 'pin' ? focused.dataset.pin : null;
    const items = progress();
    const count = items.filter(item => item[1]).length;
    app.innerHTML = `<div class="sim-overview"><div><strong>${isQr ? 'Mission: investigate the account-verification poster' : 'Mission: resolve a suspicious inbox message'}</strong><p>Complete the investigation by using the tools. There is no answer quiz or score for guessing.</p></div><div class="sim-progress">${count}<span aria-hidden="true"> / </span>${items.length}<small>actions completed</small></div></div><ol class="sim-steps" aria-label="Investigation checklist">${items.map((item, i) => `<li class="${item[1] ? 'is-done' : ''}"><span class="step-dot" aria-hidden="true">${item[1] ? '✓' : i + 1}</span><span>${escape(item[0])}${item[1] ? '<span class="sim-visually-hidden"> completed</span>' : ''}</span></li>`).join('')}</ol><div class="sim-grid"><section class="sim-panel">${source()}</section><section class="sim-panel">${workbench()}</section></div><div class="sim-status" role="status" tabindex="-1" aria-live="polite" data-tone="${state.tone}">${escape(state.message)}</div><div class="case-bottom"><section class="sim-panel">${evidencePanel()}</section><section class="sim-panel"><div class="sim-panel-head"><h2>Session event log</h2><small>Local & temporary</small></div><div class="sim-panel-body"><ol class="event-list" aria-label="Investigation event log">${state.events.map((event, i) => `<li><span class="event-index">${String(i + 1).padStart(2, '0')}</span><span class="event-text"><strong>${escape(event.type)}</strong>${escape(event.text)}</span></li>`).join('')}</ol></div></section></div>${completed() ? `<div class="completion-banner" role="status"><h2>Investigation complete</h2><p>You inspected the real destination, traced the supplied redirects, preserved evidence, stopped and reported the imitation, and used an independent trusted route.${!isQr ? ' You also verified the legitimate comparison link.' : ''}${state.recovered ? ' You recovered the fictional demo session after exploring the unsafe branch.' : ' No demo sign-in was exposed.'}</p></div>` : ''}<div class="sim-instruction"><b>In a real incident:</b> do not enter credentials into an unverified page. Use a trusted bookmark or known official route and follow your organization’s reporting process. If credentials were entered, use the official recovery flow and contact the security team. This lab’s report and recovery affect only its fictional state.</div><div class="sim-reset-row"><p>No credentials, saved progress, or external requests. Reset clears this page’s evidence and event log. Playback stops when you leave.</p>${button('reset', 'Reset exercise')}</div>`;
    updateGuide();
    if (focusAction) {
      let next = app.querySelector(`[data-action="${focusAction}"]${focusPin ? `[data-pin="${focusPin}"]` : ''}`);
      if (!next || next.disabled) next = app.querySelector(playback ? '[data-action="pause"]' : '[data-action="inspect"]');
      if (!next || next.disabled) next = app.querySelector('.sim-status');
      if (next) next.focus({ preventScroll: true });
    }
  }
  function clearTimer() { if (timer !== null) clearTimeout(timer); timer = null; generation++; }
  function stopPlayback(note = true) {
    if (!playback) return;
    clearTimer();
    const label = playback.kind === 'decode' ? 'QR decode' : 'Redirect inspection';
    playback = null;
    if (note) { log('stopped', `${label} stopped. Completed observations remain available.`); say('Playback stopped. Restart the same tool to continue from the last completed step.'); }
  }
  function schedule() {
    if (!playback || !playback.running) return;
    const token = generation;
    timer = setTimeout(() => {
      if (token !== generation || !playback || !playback.running) return;
      timer = null;
      advance(); render(); schedule();
    }, 650);
  }
  function startPlayback(kind) {
    if (playback) return;
    const key = state.selected;
    const index = kind === 'decode' ? state.scanCount : state.traceCount[key];
    playback = { kind, key, index, running: !reducedMotion() };
    log('playback', `${kind === 'decode' ? 'QR decode' : 'Redirect inspection'} started using local fixture data.`);
    say(playback.running ? 'Local playback running. Pause, step, finish now, or stop at any time.' : 'Playback starts paused for reduced motion. Use One step to reveal each observation, or Resume playback to play it.');
    schedule();
  }
  function advance() {
    if (!playback) return;
    const task = playback;
    if (task.kind === 'decode') {
      task.index++;
      state.scanCount = task.index;
      const messages = ['Supplied QR pattern loaded; no camera opened.', 'Training payload decoded from the supplied fixture.', `Destination revealed: ${threat.entry}`];
      log('decode', messages[task.index - 1]);
      if (task.index >= 3) {
        state.scanDone = true; state.previewed.threat = true; playback = null;
        say('QR decoded. Inspect the actual hostname and redirect chain before taking any sign-in action.');
      }
    } else {
      const fixture = task.key === 'legitimate' ? fixtures.legitimate : threat;
      task.index++; state.traceCount[task.key] = task.index;
      log('redirect', `${fixture.trace[task.index - 1].detail}: ${fixture.trace[task.index - 1].url}`);
      if (task.index >= fixture.trace.length) {
        state.traced[task.key] = true; playback = null;
        say(task.key === 'legitimate' ? 'This comparison fixture has no redirect and stays on the supplied trusted hostname.' : 'Trace complete. The final hostname is outside the supplied trusted portal. Attach the observed evidence.', task.key === 'legitimate' ? 'good' : 'warn');
      }
    }
  }
  function handle(action, target) {
    const kind = state.selected;
    switch (action) {
      case 'reset':
        stopPlayback(false); clearTimer(); state = freshState(); if (report) report.reset(); break;
      case 'decode':
        if (!isQr || state.scanDone || playback) return;
        startPlayback('decode'); break;
      case 'select-threat':
      case 'select-legitimate': {
        if (isQr) return;
        const next = action === 'select-threat' ? 'threat' : 'legitimate';
        if (state.selected === next) return;
        stopPlayback(); state.selected = next;
        log('selected', next === 'threat' ? 'Urgent account-access message selected.' : 'Timetable comparison message selected.');
        say(next === 'threat' ? 'Inspect the urgent message using its actual destination, not its display text.' : 'Compare this routine message using the same inspection tools and the supplied trusted bookmark.');
        break;
      }
      case 'preview':
        if (isQr || (kind === 'threat' && state.reported)) return;
        if (!state.previewed[kind]) { state.previewed[kind] = true; log('preview', `Actual link target revealed: ${currentFixture().entry}`); }
        say('Actual link destination revealed below the browser. Inspect the hostname; no website was opened.'); break;
      case 'inspect':
        if (!state.previewed[kind] || playback) return;
        if (!state.inspected[kind]) { state.inspected[kind] = true; log('inspected', `Hostname parsed: ${new URL(selectedTarget()).hostname}. Trusted reference: ${trustedHost}.`); }
        say(kind === 'threat' ? 'The hostname does not match the supplied trusted portal. Attach the destination-host observation to your report.' : 'The comparison hostname matches the supplied trusted portal. Open the contained timetable and compare it with your bookmark.', kind === 'threat' ? 'warn' : 'good'); break;
      case 'trace':
        if (!state.previewed[kind] || state.traced[kind] || playback) return;
        startPlayback('trace'); break;
      case 'pause':
        if (!playback || !playback.running) return;
        clearTimer(); playback.running = false; say('Playback paused. Use One step, Resume playback, or Finish now.'); break;
      case 'resume':
        if (!playback || playback.running) return;
        playback.running = true; schedule(); say('Local playback resumed.'); break;
      case 'step':
        if (!playback) return;
        clearTimer(); playback.running = false; advance(); break;
      case 'skip':
        if (!playback) return;
        clearTimer(); while (playback) advance(); break;
      case 'stop-playback':
        if (!playback) return;
        stopPlayback(); break;
      case 'open-preview':
        if (!state.previewed[kind] || playback || !recoveredIfNeeded()) return;
        if (kind === 'threat') {
          if (state.contained || state.reported || state.compromised) return;
          if (state.browser !== 'threat') log('preview', 'Contained imitation sign-in page opened at its final fixture URL. No real page loaded.');
          state.browser = 'threat'; say('The imitation looks plausible. Its address bar still shows an untrusted hostname. You can stop it without attempting a sign-in.', 'warn');
        } else {
          if (!state.legitOpened) log('preview', 'Contained timetable page opened on the supplied trusted hostname.');
          state.legitOpened = true; state.browser = 'legitimate'; say('The timetable is visible inside the simulated browser. Compare its hostname with the trusted bookmark.');
        }
        break;
      case 'demo-login':
        if (state.browser !== 'threat' || state.reported || state.compromised) return;
        stopPlayback(false); state.compromised = true; state.recovered = false; state.contained = false; state.trusted = false; state.browser = 'consequence';
        log('consequence', 'Fictional demo sign-in exposed; a simulated attacker session is active. No real credentials exist.');
        say('Unsafe-path demonstration: the fictional demo account is exposed. Revoke the demo session, preserve evidence, and report.', 'bad'); break;
      case 'recover':
        if (!state.compromised || state.recovered) return;
        state.recovered = true; state.contained = true; state.browser = 'blocked';
        log('recovered', 'Fictional session revoked and untrusted preview closed locally.');
        say('Fictional session revoked. Attach evidence, file the practice report, and revisit the trusted portal.', 'good'); break;
      case 'contain':
        if (!state.previewed.threat || state.contained || state.reported || !recoveredIfNeeded()) return;
        stopPlayback(); state.contained = true; state.browser = 'blocked';
        log('contained', 'Untrusted destination stopped; no demo credentials submitted.');
        say('Untrusted destination stopped. Finish the inspection and attach evidence for the local report.', 'good'); break;
      case 'pin': {
        const id = target.dataset.pin;
        if (state.reported || !Object.prototype.hasOwnProperty.call(evidenceLabels, id)) return;
        const permitted = id === 'urgency' ? isQr : id === 'host' ? state.inspected.threat : id === 'redirect' ? state.traced.threat : !isQr && state.previewed.threat;
        if (!permitted) return;
        if (state.pins.has(id)) { state.pins.delete(id); log('evidence', `Observation detached: ${evidenceLabels[id]}`); }
        else { state.pins.add(id); log('evidence', `Observation attached: ${evidenceLabels[id]}`); }
        say('Evidence tray updated. Reporting needs concrete destination evidence and the relevant mismatch.'); break;
      }
      case 'report':
        if (state.reported || !reportReady()) return;
        stopPlayback(false); state.reported = true; state.browser = 'blocked';
        log('reported', `${isQr ? 'QR' : 'URL'}-001 filed locally with ${state.pins.size} evidence observations. Nothing sent externally.`);
        say('Practice report filed on this page. Use the independent trusted bookmark to verify the account state.', 'good'); break;
      case 'trusted':
        if (!recoveredIfNeeded()) return;
        stopPlayback();
        if (!state.trusted) log('trusted route', `Independent supplied bookmark used: ${trustedUrl}`);
        state.trusted = true; state.browser = 'trusted';
        say('The independent portal fixture shows the demo account is active. Complete any remaining evidence and report steps.', 'good'); break;
      case 'compare':
        if (isQr || state.compared || !state.previewed.legitimate || !state.inspected.legitimate || !state.legitOpened || !state.trusted) return;
        state.compared = true; log('compared', 'Timetable link and supplied bookmark verified to have exactly the same hostname.');
        say('Legitimate comparison complete: the exact hostname matches the independent bookmark.', 'good'); break;
      default: return;
    }
    if (completed()) {
      if (!state.completedAt) state.completedAt = new Date().toISOString();
      say('Investigation complete. Your evidence, local report, and trusted-route verification are recorded below.', 'good');
    }
    render();
  }
  app.addEventListener('click', event => {
    const target = event.target.closest('[data-action]');
    if (!target || !app.contains(target) || target.disabled) return;
    handle(target.dataset.action, target);
  });
  window.addEventListener('pagehide', () => { stopPlayback(false); clearTimer(); });
  window.addEventListener('pageshow', event => {
    if (event.persisted) { say('Welcome back. Any playback was stopped when you left; use the tool again to continue.'); render(); }
  });
  state = freshState();
  render();
  if (window.LabReport) {
    report = window.LabReport.mount({
      labId: isQr ? 'qr-phishing' : 'suspicious-url',
      title: isQr ? 'QR Phishing Lab' : 'Suspicious URL Lab',
      attackType: isQr ? 'QR-code phishing and redirected sign-in imitation' : 'Misleading link text, URL userinfo, and redirected sign-in imitation',
      howItHappens: isQr
        ? 'An urgent fictional poster hides a destination in a QR code. The supplied payload redirects to an imitation sign-in page outside the trusted portal. The exercise models previewing, inspection, reporting, and recovery without contacting a site.'
        : 'A fictional email displays a trusted-looking URL while its stored target uses userinfo before @ and a different hostname. A local redirect leads to an imitation sign-in page. A second message provides a legitimate hostname comparison.',
      scope: 'Only authored .example-domain fixtures, a local mock browser, and the current page session. Decode and HTTP redirects are recorded playback, not live requests. The demo account, session revocation, portal, inbox, and security report are fictional. No real account or system is tested.',
      recommendations: [
        'Preview QR and email destinations and inspect the actual hostname before using a sensitive service.',
        'Compare the full hostname with an independently verified route; HTTPS, urgency, page appearance, and familiar words do not establish identity.',
        'Stop untrusted destinations and report concrete observations through the organization’s official process.',
        'If real credentials were entered, use the official recovery route and ask the security team to investigate and revoke unauthorized sessions.'
      ],
      getSnapshot: () => {
        const actions = state.events.slice(1).map(event => ({ label: event.type, result: event.text, at: event.at }));
        const findings = [];
        if (state.inspected.threat) findings.push({ title: 'Destination-host mismatch observed', evidence: `Initial target: ${threat.entry}. Final fixture URL: ${state.traced.threat ? threat.final : 'not yet traced'}. Trusted reference: ${trustedHost}.`, risk: 'A sign-in imitation can use a hostname unrelated to the intended service.', recommendation: 'Navigate through the independently trusted portal rather than the message or poster.' });
        if (state.traced.threat) findings.push({ title: 'Redirect chain inspected', evidence: threat.trace.map(hop => `${hop.detail}: ${hop.url}`).join(' → '), risk: 'Redirects can move a visitor away from the expected destination. These were local fixture steps, not measured HTTP responses.', recommendation: 'Verify the final hostname as well as the initial destination.' });
        if (!isQr && state.previewed.threat) findings.push({ title: 'Displayed link and stored target differ', evidence: `Displayed: https://portal.campus.example/services/timetable. Stored target: ${threat.entry}.`, risk: 'The familiar text before @ is userinfo rather than the destination hostname.', recommendation: 'Inspect the URL parser’s hostname field; do not rely on the displayed label.' });
        if (state.compromised) findings.push({ title: 'Fictional unsafe branch exercised', evidence: state.recovered ? 'Demo sign-in exposed, followed by local demo-session revocation and preview closure.' : 'Demo sign-in exposed. Fictional session recovery is still pending.', risk: 'Illustrates possible account exposure after sign-in on an imitation. No real credentials or account were involved.', recommendation: 'Use a known official recovery route and report a real exposure promptly.' });
        if (state.reported) findings.push({ title: 'Evidence report filed locally', evidence: [...state.pins].map(id => evidenceLabels[id]).join('; '), risk: 'A local practice report does not contact a security team.', recommendation: 'For a real incident, use the approved reporting channel.' });
        if (state.trusted) findings.push({ title: 'Independent trusted route used', evidence: `Supplied bookmark opened in mock browser: ${trustedUrl}. The fictional account status was active.`, risk: 'The observation applies only to this fixture, not a real account.', recommendation: 'Use an independently verified route for sensitive account actions.' });
        if (state.compared) findings.push({ title: 'Legitimate comparison verified', evidence: `${fixtures.legitimate.entry} and ${trustedUrl} have the same exact hostname: ${trustedHost}.`, risk: 'Informational comparison of the supplied fixtures only.', recommendation: 'Compare actual hostnames, while accounting for the verified service’s documented domains.' });
        const steps = progress();
        return {
          status: completed() ? 'completed' : actions.length ? 'in progress' : 'not started',
          startedAt: actions.length ? state.events[0].at : '',
          completedAt: completed() ? state.completedAt : '',
          summary: `${steps.filter(item => item[1]).length} of ${steps.length} required investigation actions completed. Local report ${state.reported ? 'filed' : 'not filed'}. Trusted-route check ${state.trusted ? 'performed' : 'not performed'}.${state.compromised ? ` Fictional demo exposure ${state.recovered ? 'recovered' : 'not yet recovered'}.` : ' Fictional demo sign-in was not used.'}`,
          actions, findings,
          metrics: steps.map(item => ({ label: item[0], value: item[1] ? 'Completed' : 'Not completed' }))
        };
      },
      mountTo: document.getElementById('labReportMount')
    });
  }
})();
