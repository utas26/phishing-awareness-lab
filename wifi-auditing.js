/* Fixed, fictional classroom data only. No radio access, network calls, uploads,
   external commands, arbitrary targets, user-entered passwords, or persistence. */
(() => {
  'use strict';
  const el = id => document.getElementById(id);
  if (!el('wifiDiscover')) return;
  const lists = Object.freeze({
    short: Object.freeze(['password123', 'welcome2026', 'campuswifi', 'learning123', 'guestaccess', 'Classroom1!', 'securewifi', 'UTASdemo123', 'IbraClass2026!', 'routeradmin', 'summer2026', 'wireless123']),
    extended: Object.freeze(['letmein123', 'internet2026', 'studentwifi', 'classroom2025', 'blueclassroom', 'labaccess1', 'guest2026', 'learning2026', 'campus2025', 'welcomehome', 'routerdemo', 'education123', 'classroom2026', 'demo-network', 'samplepassword', 'schoolwifi', 'winter2026', 'teachandlearn', 'UTASdemo123', 'testwifi2026', 'IbraClass2026!', 'password123', 'welcome2026', 'wireless123'])
  });
  const listLabels = { short: 'Classroom basics', extended: 'Extended classroom list' };
  const aps = Object.freeze({
    weak: Object.freeze({ key: 'weak', ssid: 'UTAS-LAB-DEMO', channel: '6', signal: '−42 dBm', description: 'Deliberately weak classroom password · baseline fixture', nonce: 'CLASSROOM-A-001', expected: '0cee4349381f01c123774af07e0848c7694f30adeaf95da1e1d5adb27c4875fa' }),
    strong: Object.freeze({ key: 'strong', ssid: 'UTAS-LAB-STRONG', channel: '11', signal: '−58 dBm', description: 'Long, unique classroom passphrase · comparison fixture', nonce: 'CLASSROOM-B-002', expected: '1ef5fcd7fd3442e4cdf3d7f1a8d66f57a4351ab1ce0ddb2b754b177ca7dae31a' })
  });
  const postChange = Object.freeze({
    rotated: Object.freeze({ nonce: 'CLASSROOM-A-ROTATED', expected: '528619ddbb30fe2b20a31dbd95815bf9979673a5f4208d2ed7e7efbb2d8792e2' }),
    unchanged: Object.freeze({ nonce: 'CLASSROOM-A-RETEST', expected: 'fde68f57d2bfbc00d88b514b633faedf91fb4f22d62eb998cd0e6899e68c89e0' })
  });
  let discoveryTimer = null, discoveryToken = 0, discovery = 'idle';
  let timer = null, token = 0, phase = 'idle', busy = false;
  let selected = null, fixture = null, inspected = false, loaded = false;
  let index = 0, found = null, runListKey = 'short', runCandidates = lists.short;
  let retesting = false, applied = null;
  let history = Object.create(null);
  let reportController = null;
  let report = { actions: [], startedAt: null, completedAt: null, cancelled: false, retest: null };
  const apButtons = new Map();

  function record(label, result) {
    const at = new Date().toISOString();
    if (!report.startedAt) report.startedAt = at;
    report.cancelled = false;
    report.actions.push({ label, result, at });
  }
  function say(text) { el('wifiStatus').textContent = text; }
  function stopAsync() {
    token += 1;
    clearTimeout(timer);
    timer = null;
    busy = false;
  }
  function active() { return phase === 'running' || phase === 'paused' || busy; }
  function comparisonList() {
    const preferred = el('wifiWordlist').value;
    return [preferred, ...Object.keys(lists)].find(key => history[key]?.weak?.found && history[key]?.strong?.found === false) || null;
  }
  function controls() {
    const locked = active();
    el('wifiDiscover').disabled = discovery !== 'idle';
    el('wifiCancelDiscovery').disabled = discovery !== 'running';
    apButtons.forEach(button => { button.disabled = discovery !== 'done' || locked; });
    el('wifiInspect').disabled = !fixture || inspected || locked;
    el('wifiLoad').disabled = !inspected || loaded || locked;
    el('wifiWordlist').disabled = !loaded || locked || retesting;
    el('wifiSpeed').disabled = !loaded || locked;
    el('wifiStart').disabled = !loaded || phase === 'running' || busy;
    el('wifiStart').textContent = phase === 'paused' ? 'Resume audit' : (['complete', 'cancelled', 'error'].includes(phase) ? 'Start new audit' : 'Start local audit');
    el('wifiPause').disabled = phase !== 'running';
    el('wifiStep').disabled = !loaded || busy || !['ready', 'paused'].includes(phase);
    el('wifiCancel').disabled = !locked;
    el('wifiCompare').disabled = discovery !== 'done' || locked || !Object.keys(history).length;
    el('wifiDefenses').disabled = !comparisonList() || locked;
  }
  function append(parent, tag, text, className) {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    parent.appendChild(node);
    return node;
  }
  function showResult(node, title, text, tone) {
    node.replaceChildren();
    node.hidden = false;
    node.className = 'wifi-result' + (tone ? ' ' + tone : '');
    append(node, 'h3', title);
    append(node, 'p', text);
  }
  function renderCandidates() {
    const key = lists[el('wifiWordlist').value] ? el('wifiWordlist').value : 'short';
    el('wifiWordlist').value = key;
    el('wifiCandidateList').replaceChildren();
    lists[key].forEach(candidate => append(el('wifiCandidateList'), 'li', candidate));
    el('wifiTotal').textContent = '/ ' + lists[key].length;
    el('wifiProgress').max = lists[key].length;
  }
  function clearRun() {
    stopAsync();
    report.completedAt = null;
    index = 0; found = null;
    el('wifiRows').replaceChildren();
    const row = append(el('wifiRows'), 'tr', '');
    const cell = append(row, 'td', 'No candidates evaluated yet.'); cell.colSpan = 4;
    el('wifiCount').textContent = '0'; el('wifiProgress').value = 0;
    el('wifiCurrentCandidate').textContent = loaded ? 'Ready for the first candidate' : 'Waiting for a loaded fixture';
    el('wifiCurrentDigest').textContent = 'No candidate evaluated';
    el('wifiCurrentVerdict').textContent = 'Not started';
    el('wifiResult').hidden = true;
    el('wifiRunSummary').textContent = loaded ? 'Use Start for visible playback, or Check one candidate to inspect each comparison.' : 'Load a fixture to begin. A result appears only after a candidate is evaluated.';
    renderCandidates();
  }
  function renderFixture() {
    el('wifiFixtureSsid').textContent = fixture.ssid;
    el('wifiFixtureNonce').textContent = fixture.nonce;
    el('wifiFixtureDigest').textContent = fixture.expected;
    el('wifiFixturePanel').hidden = !inspected;
  }
  function chooseAp(key, isRetest = false) {
    if (discovery !== 'done' || active() || !aps[key]) return;
    selected = key; retesting = isRetest;
    record('Fixture selected', aps[key].ssid + (isRetest ? ': fresh post-change synthetic fixture' : ': supplied baseline synthetic fixture'));
    report.completedAt = null;
    fixture = isRetest ? { ...aps.weak, ...postChange[applied.rotate ? 'rotated' : 'unchanged'] } : aps[key];
    inspected = false; loaded = false; phase = 'idle';
    clearRun(); renderFixture();
    apButtons.forEach((button, apKey) => {
      button.setAttribute('aria-pressed', String(apKey === key));
      button.parentElement.classList.toggle('is-selected', apKey === key);
    });
    el('wifiTargetSummary').textContent = fixture.ssid + (isRetest ? ' · fresh post-change fixture. Inspect and load it, then rerun the same list.' : ' · saved baseline. Inspect the supplied teaching record, then load it.');
    say(isRetest ? 'Simulated settings applied. Inspect and load the fresh fixture in step 2, then retest using ' + listLabels[el('wifiWordlist').value] + '.' : fixture.ssid + ' selected. Inspect its synthetic fixture in step 2.');
    controls();
  }
  function discover() {
    if (discovery !== 'idle') return;
    discovery = 'running'; discoveryToken += 1;
    record('Virtual AP discovery started', 'Revealing two fixed classroom access points; no radio scan');
    const current = discoveryToken;
    el('wifiAps').replaceChildren(); apButtons.clear();
    say('Simulating AP discovery: 0 of 2 preset access points revealed. No wireless scan is running.');
    controls();
    const keys = Object.keys(aps);
    function next(i) {
      discoveryTimer = setTimeout(() => {
        if (current !== discoveryToken || discovery !== 'running') return;
        const ap = aps[keys[i]], card = append(el('wifiAps'), 'article', '', 'wifi-ap');
        append(card, 'small', 'AUTHORIZED CLASSROOM FIXTURE · FICTIONAL AP');
        append(card, 'h3', ap.ssid);
        append(card, 'p', 'Simulated channel ' + ap.channel + ' · signal ' + ap.signal + '. ' + ap.description + '.');
        const button = append(card, 'button', 'Choose this virtual AP', 'btn alt');
        button.type = 'button'; button.disabled = true;
        button.setAttribute('aria-label', 'Choose virtual AP ' + ap.ssid);
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', () => chooseAp(ap.key));
        apButtons.set(ap.key, button);
        if (i + 1 < keys.length) next(i + 1);
        else {
          discoveryTimer = null; discovery = 'done';
          record('Virtual AP discovery completed', 'Two authorized fictional AP fixtures revealed');
          say('Discovery complete: two fictional access points. Choose UTAS-LAB-DEMO to begin with the deliberately weak fixture.');
          controls();
        }
      }, 550);
    }
    next(0);
  }
  function cancelDiscovery() {
    if (discovery !== 'running') return;
    clearTimeout(discoveryTimer); discoveryTimer = null; discoveryToken += 1;
    discovery = 'idle'; el('wifiAps').replaceChildren(); apButtons.clear();
    record('Discovery cancelled', 'No complete discovery result'); report.cancelled = true;
    say('Discovery cancelled. Restart discovery to reveal both preset access points.');
    controls();
  }
  function inspect() {
    if (!fixture || active() || inspected) return;
    inspected = true; renderFixture();
    record('Synthetic fixture inspected', fixture.ssid + ': SSID, public challenge, and verifier reviewed');
    say('Fixture inspected: fictional SSID, public challenge, and expected SHA-256 verifier. Now load this supplied record.');
    controls();
  }
  function loadFixture() {
    if (!inspected || active() || loaded) return;
    loaded = true; phase = 'ready'; clearRun();
    record('Supplied fixture loaded', fixture.ssid + ': local teaching record loaded');
    el('wifiListDetails').hidden = false;
    say('Fixture loaded locally. Choose a built-in list and start the audit, or check one candidate at a time.');
    controls();
  }
  function renderHistory() {
    el('wifiEvidence').replaceChildren();
    Object.keys(history).forEach(key => {
      ['weak', 'strong'].forEach(apKey => {
        const record = history[key][apKey];
        if (!record) return;
        append(el('wifiEvidence'), 'li', aps[apKey].ssid + ' · ' + listLabels[key] + ': ' + (record.found ? 'matched supplied candidate “' + record.password + '”' : 'not found in this list') + ' after ' + record.count + ' of ' + lists[key].length + ' local checks.');
      });
    });
    if (!Object.keys(history).length) append(el('wifiEvidence'), 'li', 'No completed baseline audits yet.');
    const paired = comparisonList();
    el('wifiComparison').hidden = !paired;
    if (paired) {
      el('wifiComparison').textContent = 'Same-list comparison complete with ' + listLabels[paired] + ': the weak example was found; the long, unique fixture was not found. This proves only the outcome of these ' + lists[paired].length + ' supplied candidates, not that the stronger example is uncrackable. The simulated router is now unlocked.';
      el('wifiDefenseHint').textContent = 'Choose simulated changes, apply them, and test a fresh classroom fixture with the same list. Only passphrase rotation changes what this simplified verifier can recover.';
    }
  }
  function finish() {
    stopAsync(); phase = 'complete';
    const matched = found !== null;
    record(retesting ? 'Defensive retest completed' : 'Baseline audit completed', fixture.ssid + ': ' + (matched ? 'exact synthetic verifier match' : 'no match in selected list') + '; ' + index + '/' + runCandidates.length + ' evaluated using ' + listLabels[runListKey]);
    report.completedAt = retesting ? new Date().toISOString() : null;
    if (matched) {
      showResult(el('wifiResult'), 'Match verified locally', 'The full computed SHA-256 verifier matched the supplied fixture after ' + index + ' checks. Recovered fictional classroom password: ' + found + '. Remaining candidates were not needed.', 'warning');
      el('wifiCurrentVerdict').textContent = 'Exact verifier match';
    } else {
      showResult(el('wifiResult'), 'Not found in this candidate list', 'All ' + index + ' supplied candidates were evaluated. None matched this fixture. This is a limited list result, not proof of an uncrackable password or secure network.', 'success');
    }
    el('wifiRunSummary').textContent = 'Completed: ' + index + ' of ' + runCandidates.length + ' candidates evaluated. ' + (matched ? 'Stopped only after an exact verifier match.' : 'The selected list is exhausted.');
    if (retesting) {
      report.retest = { ...applied, matched, count: index, total: runCandidates.length, list: listLabels[runListKey] };
      const configuration = 'Applied: ' + (applied.rotate ? 'long, unique passphrase' : 'original weak passphrase retained') + '; WPS ' + (applied.wps ? 'disabled' : 'still on') + '; firmware ' + (applied.firmware ? 'simulated update applied' : 'update pending') + '.';
      showResult(el('wifiRetest'), matched ? 'Retest: weak example still recovered' : 'Retest: rotated fixture not found in the same list', configuration + ' ' + (matched ? 'Configuration changes alone did not remove the matching candidate from this teaching verifier. Rotate the passphrase and retest to change this result.' : 'The new verifier no longer matches any candidate in this list. That is evidence of improvement against this list only.') + ' WPS and firmware are recorded settings, not evaluated attacks. No real router was changed.', matched ? 'warning' : 'success');
      say('Retest complete. ' + (matched ? 'The unchanged weak password still matched.' : 'The rotated fixture was not found in the same list.') + ' Review the evidence in step 5.');
    } else {
      if (!history[runListKey]) history[runListKey] = Object.create(null);
      history[runListKey][selected] = { found: matched, password: found, count: index };
      say('Baseline audit complete. ' + (matched ? 'The fictional weak candidate matched after ' + index + ' checks.' : 'No match after all ' + index + ' checks.') + (comparisonList() ? ' Same-list comparison complete; defenses are unlocked.' : ' Select the other baseline AP in step 4 and use the same list.'));
    }
    renderHistory(); controls();
  }
  function delay() { return { normal: 700, fast: 250, slow: 1400 }[el('wifiSpeed').value] || 700; }
  function schedule(current) {
    if (phase !== 'running' || current !== token) return;
    timer = setTimeout(() => { timer = null; void evaluate(current, false); }, delay());
  }
  async function evaluate(current, single) {
    if (current !== token || busy || !loaded || !['running', 'paused'].includes(phase)) return;
    if (index >= runCandidates.length) { finish(); return; }
    busy = true; controls();
    const candidate = runCandidates[index];
    el('wifiCurrentCandidate').textContent = candidate;
    el('wifiCurrentDigest').textContent = 'Computing the local SHA-256 verifier…';
    el('wifiCurrentVerdict').textContent = 'Evaluating candidate ' + (index + 1);
    try {
      if (!globalThis.crypto?.subtle || typeof TextEncoder === 'undefined') throw new Error('unsupported');
      const bytes = new TextEncoder().encode(['WIFI-TEACHING-V1', fixture.ssid, fixture.nonce, candidate].join('|'));
      const buffer = await globalThis.crypto.subtle.digest('SHA-256', bytes);
      if (current !== token) return;
      const digest = Array.from(new Uint8Array(buffer), n => n.toString(16).padStart(2, '0')).join('');
      const matches = digest === fixture.expected;
      if (index === 0) el('wifiRows').replaceChildren();
      index += 1;
      const row = append(el('wifiRows'), 'tr', '', matches ? 'wifi-match' : '');
      [String(index), candidate, digest.slice(0, 16) + '…', matches ? 'Exact match' : 'No match'].forEach(value => append(row, 'td', value));
      el('wifiCurrentDigest').textContent = digest;
      el('wifiCurrentVerdict').textContent = matches ? 'Exact verifier match' : 'No match';
      el('wifiCount').textContent = String(index); el('wifiProgress').value = index;
      el('wifiRunSummary').textContent = index + ' of ' + runCandidates.length + ' candidates evaluated locally.';
      busy = false;
      record('Candidate check ' + index, matches ? 'Full SHA-256 verifier matched; candidate text omitted from report' : 'Full SHA-256 verifier did not match; candidate text omitted from report');
      if (matches) { found = candidate; finish(); return; }
      if (index === runCandidates.length) { finish(); return; }
      if (single) { phase = 'paused'; say('Candidate ' + index + ' checked: no match. Step again or resume playback.'); }
      controls();
      if (!single) schedule(current);
    } catch (error) {
      if (current !== token) return;
      stopAsync(); phase = 'error';
      record('Local verification unavailable', 'Web Crypto SHA-256 could not complete; no successful result recorded');
      el('wifiCurrentVerdict').textContent = 'Verification unavailable';
      el('wifiCurrentDigest').textContent = 'No verifier result was produced.';
      showResult(el('wifiResult'), 'Local verifier unavailable', 'This browser could not run Web Crypto SHA-256. Use a browser that supports Web Crypto on HTTPS or localhost. No successful audit result has been invented.', 'warning');
      say('The local verifier is unavailable. No match or completed audit has been recorded.');
      controls();
    }
  }
  function prepareRun() {
    clearRun();
    runListKey = lists[el('wifiWordlist').value] ? el('wifiWordlist').value : 'short';
    runCandidates = lists[runListKey];
  }
  function start() {
    if (!loaded || phase === 'running' || busy) return;
    if (phase !== 'paused') prepareRun();
    record(phase === 'paused' ? 'Audit resumed' : 'Audit started', fixture.ssid + ': ' + listLabels[runListKey] + '; ' + runCandidates.length + ' fixed candidates');
    phase = 'running';
    say('Checking ' + listLabels[runListKey] + ' locally. Pause to inspect evidence, or cancel to stop this run.');
    controls(); schedule(token);
  }
  function step() {
    if (!loaded || busy || !['ready', 'paused'].includes(phase)) return;
    if (phase === 'ready') prepareRun();
    phase = 'paused';
    record('Single-step requested', 'Evaluate the next fixed candidate locally');
    void evaluate(token, true);
  }
  function pause() {
    if (phase !== 'running') return;
    stopAsync(); phase = 'paused';
    record('Audit paused', index + ' completed candidate checks retained');
    el('wifiCurrentVerdict').textContent = 'Paused after ' + index + ' completed checks';
    el('wifiRunSummary').textContent = 'Paused. ' + index + ' completed checks retained. Resume or check the next candidate.';
    say('Audit paused after ' + index + ' completed checks. Resume, step one candidate, or cancel.');
    controls();
  }
  function cancel() {
    if (!active()) return;
    stopAsync(); phase = 'cancelled';
    record('Audit cancelled', index + ' completed checks; incomplete run is not a result'); report.cancelled = true;
    el('wifiCurrentVerdict').textContent = 'Cancelled · incomplete audit';
    el('wifiRunSummary').textContent = 'Cancelled after ' + index + ' completed checks. No conclusion is recorded from a partial run. Start new audit begins at candidate 1.';
    say('Audit cancelled. Completed comparison rows remain visible, but this incomplete run is not a result.');
    controls();
  }
  function applyDefenses() {
    const paired = comparisonList();
    if (!paired || active()) return;
    const choices = { rotate: el('wifiRotate').checked, wps: el('wifiWps').checked, firmware: el('wifiFirmware').checked };
    if (!choices.rotate && !choices.wps && !choices.firmware) { say('Choose at least one simulated setting before applying changes.'); return; }
    applied = choices;
    record('Simulated settings applied', 'Passphrase rotated: ' + choices.rotate + '; WPS disabled: ' + choices.wps + '; firmware update applied: ' + choices.firmware + '. No real router changed.');
    el('wifiWordlist').value = paired;
    el('wifiRetest').hidden = true;
    el('wifiConfig').textContent = 'Simulated configuration: ' + (choices.rotate ? 'supplied long, unique passphrase' : 'weak classroom passphrase retained') + ' · WPS ' + (choices.wps ? 'off' : 'on') + ' · firmware ' + (choices.firmware ? 'update applied' : 'update pending') + '. The retest uses ' + listLabels[paired] + '.';
    chooseAp('weak', true);
    el('wifiInspect').focus();
  }
  function reset() {
    if (reportController) reportController.reset();
    stopAsync(); clearTimeout(discoveryTimer); discoveryTimer = null; discoveryToken += 1;
    discovery = 'idle'; phase = 'idle'; selected = fixture = null;
    inspected = loaded = retesting = false; applied = null; history = Object.create(null);
    report = { actions: [], startedAt: null, completedAt: null, cancelled: false, retest: null };
    apButtons.clear(); el('wifiAps').replaceChildren();
    el('wifiWordlist').value = 'short'; el('wifiSpeed').value = 'normal';
    el('wifiFixturePanel').hidden = true; el('wifiListDetails').hidden = true; el('wifiListDetails').open = false;
    el('wifiFixtureSsid').textContent = ''; el('wifiFixtureNonce').textContent = ''; el('wifiFixtureDigest').textContent = '';
    el('wifiTargetSummary').textContent = 'Choose a discovered access point to unlock this step.';
    ['wifiRotate', 'wifiWps', 'wifiFirmware'].forEach(id => { el(id).checked = false; });
    el('wifiConfig').textContent = 'Baseline: weak classroom passphrase · WPS on · firmware update pending';
    el('wifiDefenseHint').textContent = 'Complete a weak-password match and a strong-fixture “not found” result using the same list to unlock the simulated router.';
    el('wifiRetest').hidden = true;
    clearRun(); renderHistory(); controls();
    say('Begin by discovering the two preset classroom access points.');
  }
  el('wifiDiscover').addEventListener('click', discover);
  el('wifiCancelDiscovery').addEventListener('click', cancelDiscovery);
  el('wifiInspect').addEventListener('click', inspect);
  el('wifiLoad').addEventListener('click', loadFixture);
  el('wifiStart').addEventListener('click', start);
  el('wifiPause').addEventListener('click', pause);
  el('wifiStep').addEventListener('click', step);
  el('wifiCancel').addEventListener('click', cancel);
  el('wifiReset').addEventListener('click', reset);
  el('wifiApply').addEventListener('click', applyDefenses);
  el('wifiCompare').addEventListener('click', () => {
    if (active() || !Object.keys(history).length) return;
    chooseAp(selected === 'strong' ? 'weak' : 'strong'); el('wifiInspect').focus();
  });
  el('wifiWordlist').addEventListener('change', () => {
    if (active() || retesting || !loaded) return;
    phase = 'ready'; clearRun(); renderHistory(); controls();
    record('Candidate list changed', listLabels[el('wifiWordlist').value] + '; current-run evidence cleared');
    say('Candidate list changed. Current-run evidence cleared; completed baseline comparisons are retained.');
  });
  window.addEventListener('pagehide', () => {
    if (discovery === 'running') cancelDiscovery();
    if (phase === 'running' || busy) {
      stopAsync(); phase = 'paused'; controls();
      record('Page left; audit paused', index + ' completed checks retained; background timers stopped');
      el('wifiCurrentVerdict').textContent = 'Paused when this page was left';
      say('Audit paused when this page was left. Resume or step to continue; no background work is running.');
    } else stopAsync();
  });
  reset();
  if (window.LabReport?.mount) {
    reportController = window.LabReport.mount({
      labId: 'wifi',
      title: 'Wi-Fi Password Auditing Lab',
      attackType: 'Offline password-guessing concept simulation',
      howItHappens: 'A local SHA-256 teaching verifier hashes fixed candidate examples with a supplied fictional SSID and public challenge, then compares each full digest with a synthetic expected value. This is not a WPA capture, real handshake, radio scan, or real password-cracking tool.',
      scope: 'Only two supplied fictional classroom APs and fresh synthetic retest fixtures. All evidence is session-only; no real devices, networks, passwords, or permissions are tested.',
      mountTo: '#labReportMount',
      getSnapshot: () => {
        const findings = [];
        Object.keys(history).forEach(key => {
          ['weak', 'strong'].forEach(apKey => {
            const item = history[key][apKey];
            if (!item) return;
            findings.push({
              title: aps[apKey].ssid + ': ' + (item.found ? 'supplied weak example matched' : 'not found in selected list'),
              evidence: listLabels[key] + ': ' + item.count + ' of ' + lists[key].length + ' candidates evaluated with the synthetic SHA-256 verifier. Candidate and recovered password text omitted.',
              risk: item.found ? 'The deliberately weak example was included in this fixed classroom list. This is not a finding about a real network.' : 'A limited-list non-match does not establish security or prove an uncrackable passphrase.',
              recommendation: item.found ? 'Use a long, unique passphrase and retest fresh evidence after a change.' : 'Maintain long, unique passphrases and assess real systems only through authorized, protocol-appropriate testing.'
            });
          });
        });
        if (report.retest) {
          const result = report.retest;
          findings.push({ title: result.matched ? 'Retest: weak fixture still matched' : 'Retest: fresh fixture not found in the same list', evidence: result.count + '/' + result.total + ' checks using ' + result.list + '. Passphrase rotated: ' + result.rotate + '; WPS disabled: ' + result.wps + '; simulated firmware update: ' + result.firmware + '.', risk: 'Only passphrase rotation affects this teaching verifier. WPS and firmware attacks were not evaluated; no real router was changed.', recommendation: result.matched ? 'Rotate the passphrase and retest using fresh evidence.' : 'Keep the limited-list result in context; maintain current firmware and supported modern Wi-Fi security.' });
        }
        return {
          status: phase === 'complete' && report.retest ? 'completed' : (phase === 'cancelled' || report.cancelled ? 'cancelled' : (report.actions.length ? 'in-progress' : 'not-performed')),
          startedAt: report.startedAt,
          completedAt: report.completedAt,
          summary: 'Synthetic classroom exercise. Current audit phase: ' + phase + '. ' + index + ' candidate checks in the current run. ' + (comparisonList() ? 'Same-list baseline comparison completed.' : 'Same-list baseline comparison not yet complete.'),
          actions: report.actions.slice(),
          findings,
          metrics: [{ label: 'Current local checks', value: index }, { label: 'Current list size', value: lists[el('wifiWordlist').value].length }, { label: 'Selected synthetic AP', value: fixture?.ssid || 'None' }, { label: 'Same-list comparison', value: comparisonList() ? 'Complete' : 'Not complete' }, { label: 'Passphrase rotation applied', value: applied?.rotate ? 'Yes (simulated)' : 'No' }],
          limitations: ['Not real WPA2/WPA3, packet capture, wireless discovery, or attack-speed measurement.', 'Only built-in candidates and supplied synthetic fixtures were tested. A non-match is not proof of security.', 'WPS and firmware changes are simulated configuration records, not tested defenses.', 'Candidate words and recovered classroom passwords are intentionally excluded from this report.', 'Partial and cancelled runs cannot establish a completed result.'],
          recommendations: ['Use long, unique Wi-Fi passphrases, disable unused WPS, keep router firmware current, and use supported modern Wi-Fi security.', 'After passphrase rotation, assess fresh evidence; old captures still describe the old credential.', 'Obtain explicit authorization before any real-world wireless security test.']
        };
      }
    });
  }
})();
