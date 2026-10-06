/* Fixed, fictional classroom data only. No radio access, network calls, uploads,
   external commands, arbitrary targets, user-entered passwords, or persistence. */
(() => {
  'use strict';
  const el = id => document.getElementById(id);
  if (!el('wifiDiscover')) return;
  const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const guide = window.BeginnerGuide?.mount({
    mountTo: '#beginnerGuideMount',
    title: 'Watch a supplied password candidate get checked',
    intro: 'Think of the verifier as a fingerprint of a classroom example. The browser makes a fingerprint for each supplied candidate and checks for an exact match. This is a simplified local lesson, not a real Wi-Fi test.',
    steps: [
      { title: 'Choose a fixture', text: 'Reveal the fictional access points (APs), then choose the weak example first.' },
      { title: 'Load evidence', text: 'Inspect the supplied record, then load it into the local verifier.' },
      { title: 'Check candidates', text: 'Test the fixed list one candidate at a time or play the checks. Watch the count and result.' },
      { title: 'Compare', text: 'Test the other fixture with the same list. A non-match only describes that list.' },
      { title: 'Change & retest', text: 'Apply simulated settings, load fresh evidence, and repeat the same checks.' }
    ]
  });
  const mission = window.PracticeMission?.mount({
    mountTo: '#practiceMissionMount', guideTo: '#beginnerGuideMount',
    title: 'Change the evidence with a fresh retest',
    goal: 'Compare weak and strong fixtures with one candidate list, then rotate the weak passphrase and show that a fresh verifier no longer matches that same list.',
    checks: [
      { id: 'weak', label: 'Record a completed weak-fixture match with the selected list' },
      { id: 'strong', label: 'Exhaust that same list against the strong baseline without a match' },
      { id: 'fresh', label: 'Apply passphrase rotation and inspect and load its fresh fixture' },
      { id: 'retest', label: 'Finish a same-list retest of the rotated fixture with no match' }
    ],
    hints: [
      { title: 'Build a baseline', text: 'Discover the supplied APs, select the weak example, inspect and load its fixture, and finish the local candidate checks.' },
      { title: 'Keep the list constant', text: 'Select the other baseline AP and finish its audit using the identical candidate list. Results from two different lists cannot establish this comparison.' },
      { title: 'Choose the change the model measures', text: 'Only passphrase rotation changes this teaching verifier. WPS and firmware settings are recorded, but their effects are not tested here.' },
      { title: 'Retest fresh evidence', text: 'Apply rotation, inspect and load the fresh fixture, then finish all candidates in the same list. Editing settings or cancelling a run requires a new completed retest.' }
    ],
    debrief: {
      takeaway: 'A completed match shows that a supplied candidate fits the baseline verifier. A non-match after rotation supports improvement against that same list and fresh fixture only.',
      limitation: 'This SHA-256 teaching model does not test WPA2/WPA3, WPS, firmware vulnerabilities, or a real wireless network. A limited-list non-match is not proof of security.'
    },
    next: { href: '/dos-ddos.html', label: 'Next: explore service availability and defenses' }
  });
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
  let discoveryTimer = null, discoveryToken = 0, discovery = 'idle', discoveryPaused = false;
  let timer = null, token = 0, phase = 'idle', busy = false;
  let selected = null, fixture = null, inspected = false, loaded = false;
  let index = 0, found = null, runListKey = 'short', runCandidates = lists.short;
  let retesting = false, applied = null;
  let currentResult = null, appliedListKey = null;
  let settingsRevision = 0, appliedRevision = -1;
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
  function settingsCurrent() {
    return !!applied && settingsRevision === appliedRevision && applied.rotate === el('wifiRotate').checked && applied.wps === el('wifiWps').checked && applied.firmware === el('wifiFirmware').checked;
  }
  function currentRetest() {
    return retesting && phase === 'complete' && !busy && loaded && inspected && currentResult?.retesting && currentResult.listKey === el('wifiWordlist').value && currentResult.listKey === appliedListKey && currentResult.nonce === fixture?.nonce && currentResult.expected === fixture?.expected && currentResult.appliedRevision === appliedRevision && settingsCurrent();
  }
  function updateMission() {
    if (!mission) return;
    const key = el('wifiWordlist').value;
    const total = lists[key]?.length || 0;
    const baseline = history[key];
    const fresh = !!(applied?.rotate && settingsCurrent() && appliedListKey === key && retesting && inspected && loaded && fixture?.nonce === postChange.rotated.nonce && fixture?.expected === postChange.rotated.expected);
    const checks = {
      weak: !!(baseline?.weak?.found && baseline.weak.count > 0),
      strong: !!(baseline?.strong?.found === false && baseline.strong.count === total && total > 0),
      fresh,
      retest: !!(fresh && currentRetest() && currentResult.matched === false && currentResult.count === total && currentResult.total === total)
    };
    const complete = Object.values(checks).every(Boolean);
    let feedback;
    if (applied && !settingsCurrent()) feedback = 'The selected settings were edited after the last application. Earlier retest evidence remains in the history, but it does not verify these choices. Apply the settings, inspect and load the fresh fixture, and finish a new retest.';
    else if (phase === 'running' || busy) feedback = 'The current audit is still in progress. Pending and unfinished candidate checks cannot establish a completed outcome. Pause to inspect the recorded evidence.';
    else if (phase === 'cancelled' || phase === 'error') feedback = phase === 'cancelled' ? 'The current run was cancelled. Partial checks cannot establish its outcome. Previous completed baseline evidence is retained; start a new audit to finish the current test.' : 'The browser did not produce a completed verifier result. Retry the audit in a browser with Web Crypto; no result has been invented.';
    else if (complete) feedback = `With ${listLabels[key]}, the weak baseline matched after ${baseline.weak.count} checks and the strong baseline did not match after all ${total}. After applied rotation, the fresh ${fixture.nonce} fixture also had no match after all ${currentResult.count} checks from that same list. This supports improvement against these candidates only. WPS and firmware effects were not tested.`;
    else if (!checks.weak || !checks.strong) {
      const otherEvidence = Object.keys(history).some(other => other !== key && (history[other].weak || history[other].strong));
      feedback = `${listLabels[key] || 'The selected list'} needs both a completed weak-fixture match and an exhausted strong-fixture non-match. ${otherEvidence ? 'Results from another candidate list stay in the history but do not fill this comparison.' : checks.weak ? 'The weak match is recorded. Test the strong baseline with this identical list.' : checks.strong ? 'The strong non-match is recorded. Test the weak baseline with this identical list.' : 'Inspect, load, and finish both baseline audits.'}`;
    } else if (currentRetest() && currentResult.matched) feedback = 'The fresh retest still matched the weak example. That is useful negative evidence: WPS or firmware settings alone do not change this verifier. Apply passphrase rotation and retest fresh evidence with the same list.';
    else if (!fresh) feedback = applied?.rotate ? 'Passphrase rotation is applied, but the current evidence is not yet a loaded fresh rotated fixture for this baseline list. Apply it for this comparison if needed, then inspect and load the new record.' : 'Both baselines are complete with the same list. Select and apply passphrase rotation, then inspect and load its fresh fixture. Selecting a checkbox alone does not change the verifier.';
    else feedback = `${index} of ${total} candidates have been checked against the fresh rotated fixture. Finish this same-list retest; an unfinished or restarted run cannot establish a non-match.`;
    mission.update({ checks, feedback, complete, started: report.actions.length > 0 });
  }
  function updateGuide() {
    updateMission();
    if (!guide) return;
    const paired = comparisonList();
    const baselineDone = Object.values(history).some(item => item.weak || item.strong);
    const retestDone = !!currentRetest();
    const done = [discovery === 'done' && !!selected, inspected && loaded, baselineDone, !!paired, retestDone];
    let step = 0, action = null, caption = '';
    const next = (position, id, label, text) => { step = position; action = id ? { id, label } : null; caption = text; };
    if (discovery === 'idle') next(0, 'wifiDiscover', 'Find Discover virtual APs', 'Reveal the two supplied classroom examples. Nothing scans or connects to a wireless network.');
    else if (discovery === 'running') next(0, discoveryPaused ? 'wifiDiscoveryStep' : 'wifiDiscoveryPlay', discoveryPaused ? 'Find Reveal one AP' : 'Find Pause discovery', `${apButtons.size} of 2 fictional APs revealed. ${discoveryPaused ? 'Discovery is paused. Reveal one example when you are ready.' : 'The local reveal is playing; you can pause or cancel it.'}`);
    else if (!selected) next(0, 'wifi-ap-weak', 'Find the weak classroom AP', 'Choose UTAS-LAB-DEMO first. AP means access point: the device that provides Wi-Fi in a real network. These APs are fictional.');
    else if (!inspected) next(1, 'wifiInspect', 'Find Inspect synthetic fixture', `${retesting ? 'Your changed settings have a fresh record.' : fixture.ssid + ' is selected.'} Inspect the record to see its public challenge and expected fingerprint (verifier).`);
    else if (!loaded) next(1, 'wifiLoad', 'Find Load supplied fixture', 'You have inspected the record. Load it to enable the supplied candidate list and local checks.');
    else if (busy) next(2, 'wifiCancel', 'Find Cancel audit', `Computing the fingerprint for candidate ${index + 1}. ${index} completed checks are recorded; this check is still in progress.`);
    else if (phase === 'running') next(2, 'wifiPause', 'Find Pause', `${index} of ${runCandidates.length} candidates checked. The next supplied candidate will be checked locally. Pause to read each comparison.`);
    else if (phase === 'paused' || phase === 'ready') next(retesting ? 4 : 2, 'wifiStep', 'Find Check one candidate', `${index ? index + ' checks are recorded.' : 'No candidates have been checked in this run.'} Check one candidate to see its fingerprint and comparison. ${retesting ? 'This uses fresh evidence and the same baseline list.' : 'You can also choose timed playback with the Start or Resume control.'}`);
    else if (phase === 'cancelled' || phase === 'error') next(retesting ? 4 : 2, 'wifiStart', 'Find Start new audit', phase === 'error' ? 'The browser could not calculate a verifier. No result was invented. Start a new audit to retry; local verification needs Web Crypto on HTTPS or localhost.' : 'This run was cancelled. Partial checks are not a completed result. Start a new audit from candidate 1; completed baseline evidence is retained.');
    else if (applied && !settingsCurrent()) next(4, 'wifiApply', 'Find Apply simulated settings', 'Your selected settings changed after the earlier application. Apply the current choices, then inspect and load fresh evidence and complete a new retest. The earlier result remains historical evidence.');
    else if (retestDone) next(4, report.retest.matched ? (el('wifiRotate').checked ? 'wifiApply' : 'wifiRotate') : null, el('wifiRotate').checked ? 'Find Apply simulated settings' : 'Find passphrase rotation', report.retest.matched ? 'The unchanged weak example still matched. WPS and firmware settings do not change this verifier. ' + (el('wifiRotate').checked ? 'Passphrase rotation is selected. Apply it, then load fresh evidence and retest.' : 'Select passphrase rotation, apply it, then load fresh evidence and retest.') : 'The rotated fixture was not found in the same list. Your comparison is complete. This is improvement against these supplied candidates only; review the report below.');
    else if (paired) {
      const chosen = el('wifiRotate').checked || el('wifiWps').checked || el('wifiFirmware').checked;
      next(4, chosen ? 'wifiApply' : 'wifiRotate', chosen ? 'Find Apply simulated settings' : 'Find passphrase rotation', 'Both baseline results use ' + listLabels[paired] + '. Select simulated settings and apply them. Only passphrase rotation changes this teaching verifier.');
    } else if (baselineDone) {
      const other = selected === 'weak' ? 'strong' : 'weak';
      next(3, 'wifiCompare', 'Find Select the other baseline AP', `This run ${found !== null ? 'matched a supplied candidate' : 'found no match'}. Select ${aps[other].ssid}, inspect and load it, then test the same ${listLabels[runListKey]} list.`);
    }
    const verdict = phase === 'complete' ? (found !== null ? 'Exact match found' : 'No match in this list') : phase === 'cancelled' ? 'Cancelled · no conclusion' : phase === 'error' ? 'Verification unavailable' : busy ? 'Computing a fingerprint' : index ? `${index} checks · run unfinished` : 'No completed check';
    guide.update({ step, completed: done.flatMap((value, i) => value ? [i] : []), status: retestDone ? 'Retest complete' : discovery === 'running' && discoveryPaused || phase === 'paused' ? 'Paused · your pace' : phase === 'running' || busy ? 'Checking locally' : 'Your next action', caption,
      nodes: [
        { label: 'Fictional AP', value: fixture ? fixture.ssid : `${apButtons.size} of 2 revealed`, tone: fixture ? 'good' : discovery === 'running' ? 'active' : 'neutral' },
        { label: 'Supplied evidence', value: loaded ? (retesting ? 'Fresh retest record loaded' : 'Baseline record loaded') : inspected ? 'Inspected · ready to load' : 'Not loaded', tone: loaded ? 'good' : 'neutral' },
        { label: 'Local checks', value: `${index} of ${loaded && phase !== 'ready' ? runCandidates.length : lists[el('wifiWordlist').value].length} evaluated`, tone: busy || phase === 'running' ? 'active' : phase === 'complete' ? 'good' : 'neutral' },
        { label: 'Current result', value: verdict, tone: found !== null || phase === 'error' || phase === 'cancelled' ? 'warn' : phase === 'complete' ? 'good' : 'neutral' }
      ], action, eventKey: [report.actions.length, discovery, discoveryPaused, apButtons.size, phase, busy, index, selected, loaded, el('wifiWordlist').value, el('wifiRotate').checked, el('wifiWps').checked, el('wifiFirmware').checked].join(':'), animate: report.actions.length > 0
    });
  }
  function controls() {
    const locked = active();
    el('wifiDiscover').disabled = discovery !== 'idle';
    el('wifiCancelDiscovery').disabled = discovery !== 'running';
    el('wifiDiscoveryStep').disabled = discovery !== 'running';
    el('wifiDiscoveryPlay').disabled = discovery !== 'running';
    el('wifiDiscoveryPlay').textContent = discoveryPaused ? 'Play discovery' : 'Pause discovery';
    apButtons.forEach(button => { button.disabled = discovery !== 'done' || locked; });
    el('wifiInspect').disabled = !fixture || inspected || locked;
    el('wifiLoad').disabled = !inspected || loaded || locked;
    el('wifiWordlist').disabled = !loaded || locked || retesting;
    el('wifiSpeed').disabled = !loaded || locked;
    el('wifiStart').disabled = !loaded || phase === 'running' || busy;
    el('wifiStart').textContent = phase === 'paused' ? 'Resume audit' : (['complete', 'cancelled', 'error'].includes(phase) ? 'Start new audit' : reducedMotion() ? 'Prepare manual audit' : 'Start local audit');
    el('wifiPause').disabled = phase !== 'running';
    el('wifiStep').disabled = !loaded || busy || !['ready', 'paused'].includes(phase);
    el('wifiCancel').disabled = !locked;
    el('wifiCompare').disabled = discovery !== 'done' || locked || !Object.keys(history).length;
    el('wifiDefenses').disabled = !comparisonList() || locked;
    updateGuide();
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
    currentResult = null;
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
    discovery = 'running'; discoveryPaused = reducedMotion(); discoveryToken += 1;
    record('Virtual AP discovery started', 'Revealing two fixed classroom access points; no radio scan');
    el('wifiAps').replaceChildren(); apButtons.clear();
    say(discoveryPaused ? 'Discovery starts paused for reduced motion. Use Reveal one AP or Play discovery. No wireless scan is running.' : 'Simulating AP discovery: 0 of 2 preset access points revealed. No wireless scan is running.');
    controls();
    scheduleDiscovery();
  }
  function scheduleDiscovery() {
    if (discovery !== 'running' || discoveryPaused || discoveryTimer !== null) return;
    const current = discoveryToken;
    discoveryTimer = setTimeout(() => {
      if (current !== discoveryToken || discovery !== 'running' || discoveryPaused) return;
      discoveryTimer = null; revealAp(); scheduleDiscovery();
    }, 550);
  }
  function revealAp() {
    if (discovery !== 'running') return;
    const ap = aps[Object.keys(aps)[apButtons.size]];
    if (!ap) return;
    const card = append(el('wifiAps'), 'article', '', 'wifi-ap');
    append(card, 'small', 'AUTHORIZED CLASSROOM FIXTURE · FICTIONAL AP');
    append(card, 'h3', ap.ssid);
    append(card, 'p', 'Simulated channel ' + ap.channel + ' · signal ' + ap.signal + '. ' + ap.description + '.');
    const button = append(card, 'button', 'Choose this virtual AP', 'btn alt');
    button.id = 'wifi-ap-' + ap.key;
    button.type = 'button'; button.disabled = true;
    button.setAttribute('aria-label', 'Choose virtual AP ' + ap.ssid);
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => chooseAp(ap.key));
    apButtons.set(ap.key, button);
    if (apButtons.size === Object.keys(aps).length) {
      discovery = 'done';
      record('Virtual AP discovery completed', 'Two authorized fictional AP fixtures revealed');
      say('Discovery complete: two fictional access points. Choose UTAS-LAB-DEMO to begin with the deliberately weak fixture.');
    } else say('1 of 2 fictional APs revealed. ' + (discoveryPaused ? 'Reveal the next AP when ready.' : 'The second example is next.'));
    controls();
  }
  function stepDiscovery() {
    if (discovery !== 'running') return;
    clearTimeout(discoveryTimer); discoveryTimer = null; discoveryToken += 1; discoveryPaused = true;
    revealAp();
  }
  function toggleDiscovery() {
    if (discovery !== 'running') return;
    clearTimeout(discoveryTimer); discoveryTimer = null; discoveryToken += 1;
    discoveryPaused = !discoveryPaused;
    say(discoveryPaused ? 'Discovery paused. Reveal one AP, play the remaining steps, or cancel.' : 'Local discovery playback resumed.');
    controls(); scheduleDiscovery();
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
    currentResult = { retesting, listKey: runListKey, nonce: fixture.nonce, expected: fixture.expected, appliedRevision, matched, count: index, total: runCandidates.length };
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
    if (phase !== 'paused') {
      prepareRun();
      if (reducedMotion()) {
        phase = 'paused';
        record('Manual audit prepared', fixture.ssid + ': fixed candidates ready; no background timer');
        say('Audit starts paused for reduced motion. Check one candidate at a time, or choose Resume audit for timed playback.');
        controls(); return;
      }
    }
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
    appliedRevision = settingsRevision; appliedListKey = paired;
    record('Simulated settings applied', 'Passphrase rotated: ' + choices.rotate + '; WPS disabled: ' + choices.wps + '; firmware update applied: ' + choices.firmware + '. No real router changed.');
    el('wifiWordlist').value = paired;
    el('wifiRetest').hidden = true;
    el('wifiConfig').textContent = 'Simulated configuration: ' + (choices.rotate ? 'supplied long, unique passphrase' : 'weak classroom passphrase retained') + ' · WPS ' + (choices.wps ? 'off' : 'on') + ' · firmware ' + (choices.firmware ? 'update applied' : 'update pending') + '. The retest uses ' + listLabels[paired] + '.';
    chooseAp('weak', true);
    el('wifiInspect').focus();
  }
  function reset() {
    if (reportController) reportController.reset();
    mission?.reset();
    stopAsync(); clearTimeout(discoveryTimer); discoveryTimer = null; discoveryToken += 1;
    discovery = 'idle'; discoveryPaused = false; phase = 'idle'; selected = fixture = null;
    inspected = loaded = retesting = false; applied = null; history = Object.create(null);
    currentResult = null; appliedListKey = null; settingsRevision = 0; appliedRevision = -1;
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
  el('wifiDiscoveryStep').addEventListener('click', stepDiscovery);
  el('wifiDiscoveryPlay').addEventListener('click', toggleDiscovery);
  el('wifiInspect').addEventListener('click', inspect);
  el('wifiLoad').addEventListener('click', loadFixture);
  el('wifiStart').addEventListener('click', start);
  el('wifiPause').addEventListener('click', pause);
  el('wifiStep').addEventListener('click', step);
  el('wifiCancel').addEventListener('click', cancel);
  el('wifiReset').addEventListener('click', reset);
  el('wifiApply').addEventListener('click', applyDefenses);
  ['wifiRotate', 'wifiWps', 'wifiFirmware'].forEach(id => el(id).addEventListener('change', () => { settingsRevision += 1; controls(); }));
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
        const missionSummary = mission?.getSummary();
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
          findings.push({ title: (currentRetest() ? 'Retest: ' : 'Earlier completed retest: ') + (result.matched ? 'weak fixture still matched' : 'fresh fixture not found in the same list'), evidence: result.count + '/' + result.total + ' checks using ' + result.list + '. Passphrase rotated: ' + result.rotate + '; WPS disabled: ' + result.wps + '; simulated firmware update: ' + result.firmware + '.', risk: 'Only passphrase rotation affects this teaching verifier. WPS and firmware attacks were not evaluated; no real router was changed.', recommendation: result.matched ? 'Rotate the passphrase and retest using fresh evidence.' : 'Keep the limited-list result in context; maintain current firmware and supported modern Wi-Fi security.' });
        }
        return {
          status: currentRetest() ? 'completed' : (phase === 'cancelled' || report.cancelled ? 'cancelled' : (report.actions.length ? 'in-progress' : 'not-performed')),
          startedAt: report.startedAt,
          completedAt: currentRetest() ? report.completedAt : null,
          summary: 'Synthetic classroom exercise. Current audit phase: ' + phase + '. ' + index + ' candidate checks in the current run. ' + (comparisonList() ? 'Same-list baseline comparison completed.' : 'Same-list baseline comparison not yet complete.') + (missionSummary ? ' Optional rotation mission evidence: ' + missionSummary.status + '.' : ''),
          actions: report.actions.slice(),
          findings,
          metrics: [{ label: 'Current local checks', value: index }, { label: 'Current list size', value: lists[el('wifiWordlist').value].length }, { label: 'Selected synthetic AP', value: fixture?.ssid || 'None' }, { label: 'Same-list comparison', value: comparisonList() ? 'Complete' : 'Not complete' }, { label: 'Passphrase rotation applied', value: applied?.rotate ? 'Yes (simulated)' : 'No' }, ...(missionSummary ? [
            { label: 'Practice mission', value: missionSummary.status },
            { label: 'Mission evidence checks', value: `${missionSummary.completedChecks}/${missionSummary.totalChecks}` },
            { label: 'Optional hints revealed', value: missionSummary.hintsRevealed }
          ] : [])],
          limitations: ['Not real WPA2/WPA3, packet capture, wireless discovery, or attack-speed measurement.', 'Only built-in candidates and supplied synthetic fixtures were tested. A non-match is not proof of security.', 'WPS and firmware changes are simulated configuration records, not tested defenses.', 'Candidate words and recovered classroom passwords are intentionally excluded from this report.', 'Partial and cancelled runs cannot establish a completed result.', 'Completed simulation means a current retest finished, including a retest that still matches. The optional rotation mission additionally requires a fresh same-list non-match; its evidence status is reported separately.'],
          recommendations: ['Use long, unique Wi-Fi passphrases, disable unused WPS, keep router firmware current, and use supported modern Wi-Fi security.', 'After passphrase rotation, assess fresh evidence; old captures still describe the old credential.', 'Obtain explicit authorization before any real-world wireless security test.']
        };
      }
    });
  }
})();
