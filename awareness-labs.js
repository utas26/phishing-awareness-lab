/* Local, fictional training state only. No network, native permission, download, or execution APIs. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  if (!byId('simStatus')) return;
  const actions = [];
  let guideRevision = 0;
  let resetTime = Date.now();
  let reportController = null;
  const status = text => { byId('simStatus').textContent = text; };
  const show = (id, visible) => { byId(id).hidden = !visible; };
  const lock = (id, disabled) => { byId(id).disabled = disabled; };
  const done = (id, value) => { const node = byId('e-' + id); node.classList.toggle('is-done', Boolean(value)); node.setAttribute('data-completed', String(Boolean(value))); };
  const on = (id, fn) => byId(id).addEventListener('click', () => { if (!byId(id).disabled) fn(); });
  const prefersReducedMotion = () => Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const mountGuide = config => window.BeginnerGuide ? window.BeginnerGuide.mount({ mountTo: '#beginnerGuideMount', ...config }) : null;
  function updateGuide(guide, state) {
    if (guide) guide.update({ ...state, eventKey: 'awareness:' + guideRevision, animate: actions.length > 0 });
  }
  function record(label, result = '') {
    guideRevision += 1;
    actions.push({ label, result, at: new Date().toISOString() });
    const item = document.createElement('li');
    item.textContent = Math.round((Date.now() - resetTime) / 1000) + 's · ' + label + (result ? ': ' + result : '');
    byId('simLog').appendChild(item);
  }
  function clearHistory() { actions.length = 0; guideRevision += 1; resetTime = Date.now(); byId('simLog').replaceChildren(); show('simDebrief', false); if (reportController) reportController.reset(); }
  function mountReport(config, getSnapshot) {
    if (!window.LabReport || !byId('labReportMount')) return;
    reportController = window.LabReport.mount({ ...config, mountTo: byId('labReportMount'), getSnapshot: () => { const snapshot = getSnapshot(); return { ...snapshot, actions: actions.slice(), startedAt: actions[0]?.at, completedAt: snapshot.status === 'completed' ? actions[actions.length - 1]?.at : undefined }; } });
  }

  if (byId('mfaStart')) {
    let s, timer = null, generation = 0;
    byId('mfaManual').checked = prefersReducedMotion();
    const guide = mountGuide({ title: 'Treat an approval like opening a locked door', intro: 'Repeated doorbell rings do not make a visitor trustworthy. An MFA approval opens an account session, so connect it to a sign-in you started.', steps: [
      { title: 'See the request', text: 'Start the burst and compare the phone with what you are doing on the workstation.' },
      { title: 'Stop and report', text: 'Deny unexpected requests, then report them to stop the burst in this model.' },
      { title: 'Check the account', text: 'Review activity. If an approval opened an unwanted session, revoke it.' },
      { title: 'Try your own sign-in', text: 'Start a sign-in yourself and match the number before approving.' }
    ] });
    const mission = window.PracticeMission?.mount({ mountTo: '#practiceMissionMount', guideTo: '#beginnerGuideMount', title: 'Approve only your own sign-in', goal: 'Handle the unexpected requests, prove that no unwanted session remains, then finish a sign-in you started yourself.', checks: [
      { id: 'observed', label: 'Observe an unexpected request while no sign-in is expected.' },
      { id: 'reported', label: 'Report the unexpected activity and stop the burst.' },
      { id: 'reviewed', label: 'Review the account and leave zero unwanted sessions.' },
      { id: 'own', label: 'Finish your own sign-in with the matching workstation number.' }
    ], hints: [
      { title: 'Connect the two screens', text: 'Compare what the workstation is doing with the phone request. A request arriving does not prove you started it.' },
      { title: 'Stopping requests is only part of recovery', text: 'Reporting stops this model’s burst. Review activity afterwards: an earlier approval may have left a session that must be revoked.' },
      { title: 'Verify your own action', text: 'Once the account is clear, start your own demo sign-in. Read the workstation number and select that same number on the phone. A wrong match opens no session.' }
    ], debrief: { takeaway: 'You connected an approval to a sign-in you initiated, and checked the account rather than assuming that stopping the requests removed every session.', limitation: 'The before/after state describes only this fictional account. Number matching can reduce accidental approvals; it is not equivalent to phishing-resistant authentication.' }, next: { href: '/fake-update.html', label: 'Next: inspect a fake software update →' } });
    function updateMission() {
      if (!mission) return;
      let feedback = 'Start the supplied request burst and compare the two screens.';
      if (s.compromised) feedback = 'An unexpected approval created one unwanted session. Stopping the burst does not remove that session; inspect account activity and recover it.';
      else if (s.numberError) feedback = 'The selected number did not match, so the model opened no session. Compare the phone choice with the workstation number before retrying.';
      else if (complete()) feedback = (actions.some(item => item.label === 'Approved unexpected request') ? 'Your earlier unexpected approval opened 1 unwanted session; the current reviewed count is 0 after recovery. ' : 'The current reviewed count is 0 unwanted sessions. ') + 'Your own number-matched sign-in is now complete. The action timeline records how you got here.';
      else if (s.reported && !s.reviewed) feedback = 'Reporting stopped new requests. The account has not been reviewed yet, so there is still missing evidence about active sessions.';
      else if (s.reviewed && !s.reported) feedback = 'The account review is recorded, but unexpected activity is not yet reported. A clean review alone does not stop the model’s requests.';
      else if (s.reported && s.reviewed) feedback = s.pending === 'legitimate' ? 'This request came from your own action. Match the number shown by the workstation; the first option is not automatically correct.' : 'Unexpected activity is reported and the account review shows no unwanted session. Now demonstrate a sign-in you initiate.';
      else if (s.denied) feedback = 'Denying stopped that individual request and opened no session. Further requests can still arrive until the activity is reported.';
      else if (s.started) feedback = 'A phone request is visible even though the workstation did not ask to sign in. Treat that mismatch as evidence before responding.';
      mission.update({ checks: { observed: s.started && s.count > 0, reported: s.reported, reviewed: s.reported && s.reviewed && !s.compromised, own: s.legitimate }, started: s.started, complete: complete(), feedback });
    }
    function stop() { clearTimeout(timer); timer = null; generation += 1; }
    const complete = () => s.reported && s.reviewed && !s.compromised && s.legitimate;
    function coach() {
      let step = 0, caption = 'Start the burst. Your workstation has not requested a sign-in, so the first phone request will be unexpected.', action = { id: 'mfaStart', label: 'Find the Start control' };
      if (s.started && !s.reported) {
        step = 1;
        caption = s.compromised ? 'Approving the unexpected request opened one unwanted session. Report the attempt, then review activity and revoke that session.' : s.pending === 'attack' ? 'The phone asks for approval, but you did not start a sign-in. Deny this request; reporting then stops the burst.' : 'A denial blocks that request only. Report the unexpected activity to stop further requests in this lab.';
        action = { id: !s.compromised && s.pending === 'attack' ? 'mfaDeny' : 'mfaReport', label: !s.compromised && s.pending === 'attack' ? 'Find Deny request' : 'Find Report unexpected sign-in' };
      } else if (s.reported && (!s.reviewed || s.compromised)) {
        step = 2; caption = !s.reviewed ? 'Reporting stopped the burst. Review account activity to check whether an approval left an unwanted session.' : 'The activity review shows one unwanted session. Revoke it before starting your own sign-in.';
        action = { id: !s.reviewed ? 'mfaReview' : 'mfaRevoke', label: !s.reviewed ? 'Find Review account activity' : 'Find Revoke unauthorized session' };
      } else if (s.reported && s.reviewed) {
        step = 3;
        caption = s.legitimate ? 'Your own number-matched sign-in succeeded. The model has zero unwanted sessions and the unexpected activity is reported.' : s.pending === 'legitimate' ? s.numberError ? 'That number did not match, so no session opened. The fictional workstation shows 42. Select the matching number and try again.' : 'You started this request yourself. The workstation shows demo number 42; choose it on the phone, then approve.' : 'The unwanted activity is handled and no unwanted session remains. Now start your own demo sign-in.';
        action = s.legitimate ? null : { id: s.pending === 'legitimate' ? byId('mfaNumber').value === '42' ? 'mfaApprove' : 'mfaNumber' : 'mfaLogin', label: s.pending === 'legitimate' ? byId('mfaNumber').value === '42' ? 'Find Approve request' : 'Find the number selector' : 'Find Start my sign-in' };
      }
      updateGuide(guide, { step, completed: [s.started, s.reported, s.reviewed && s.reported && !s.compromised, s.legitimate].flatMap((yes, i) => yes ? [i] : []), status: complete() ? 'Practice complete' : s.compromised ? 'Recover an unwanted session' : s.started ? 'Connect approval to your own action' : 'Ready to compare', caption,
        nodes: [{ label: 'Workstation', value: s.legitimate ? 'Your sign-in completed' : s.pending === 'legitimate' ? 'You started this sign-in' : 'No sign-in waiting for your approval', tone: s.pending === 'legitimate' || s.legitimate ? 'good' : 'neutral' }, { label: 'Phone', value: s.pending === 'attack' ? 'Unexpected approval request' : s.pending === 'legitimate' ? 'Match demo number 42' : s.reported ? 'Burst stopped' : s.started ? 'No pending request' : 'Waiting for the burst', tone: s.pending === 'attack' ? 'warn' : s.pending === 'legitimate' ? 'active' : 'neutral' }, { label: 'Account', value: s.compromised ? '1 unwanted session' : s.reviewed ? 'Reviewed: 0 unwanted sessions' : 'Activity not reviewed', tone: s.compromised ? 'warn' : s.reviewed ? 'good' : 'neutral' }], action });
    }
    function render() {
      byId('mfaCount').textContent = String(s.count);
      byId('mfaDenied').textContent = String(s.denied);
      byId('mfaSessions').textContent = s.compromised ? '1' : '0';
      lock('mfaStart', s.started); lock('mfaPause', !s.attacking || s.count >= 6); lock('mfaStep', !s.attacking || s.count >= 6);
      byId('mfaPause').textContent = s.paused ? 'Resume playback' : 'Pause playback';
      lock('mfaManual', s.started);
      byId('mfaPlayback').textContent = !s.started ? 'Choose automatic playback or manual steps before starting.' : !s.attacking ? 'Incoming-request playback stopped.' : s.count >= 6 ? 'All six requests delivered. Handle any pending request and report.' : s.paused ? 'Incoming requests paused. Handle the phone request or use Next request.' : 'Incoming requests playing automatically, every 2.8 seconds.';
      lock('mfaReport', !s.started || s.reported); lock('mfaReview', !s.started);
      lock('mfaRevoke', !s.reviewed || !s.compromised);
      lock('mfaLogin', !s.reported || !s.reviewed || s.compromised || s.pending === 'legitimate' || s.legitimate);
      show('mfaRequest', Boolean(s.pending)); show('mfaNumber', s.pending === 'legitimate'); show('mfaNumberLabel', s.pending === 'legitimate');
      lock('mfaDeny', !s.pending); lock('mfaApprove', !s.pending);
      if (s.pending === 'attack') {
        byId('mfaPhone').textContent = 'Unexpected sign-in request ' + s.count + ' of 6';
        byId('mfaDetails').textContent = 'Training account · Unrecognized browser · You did not initiate this sign-in. Location metadata alone cannot prove who is signing in.';
      } else if (s.pending === 'legitimate') {
        byId('mfaPhone').textContent = 'A request from the sign-in you just started';
        byId('mfaDetails').textContent = 'Training account · Your fictional workstation · Match its displayed demo number before approving.';
      } else byId('mfaPhone').textContent = s.legitimate ? 'Your demo sign-in is complete.' : s.started ? 'No pending request.' : 'No request yet.';
      show('mfaActivity', s.reviewed);
      byId('mfaActivity').textContent = s.compromised ? 'Activity review: 1 unauthorized fictional session is active after the accidental approval. Revoke it below.' : s.started ? 'Activity review: no unauthorized fictional session is active. ' + (s.legitimate ? 'Your learner-initiated session is signed in.' : 'The unexpected attempts remain recorded in the timeline.') : 'No activity yet.';
      byId('mfaLoginHint').textContent = s.pending === 'legitimate' ? 'Your workstation shows demo number 42. Match it on the simulated phone. This is a fixed classroom example, not a real sign-in code.' : s.legitimate ? 'Your number-matched demo sign-in succeeded.' : 'Handle and report the unexpected activity, then review the account before starting your own sign-in.';
      done('mfa-report', s.reported); done('mfa-review', s.reviewed && !s.compromised && s.reported); done('mfa-login', s.legitimate);
      show('simDebrief', complete());
      coach();
      updateMission();
    }
    function schedule() {
      stop();
      if (!s.attacking || s.paused || s.count >= 6) return;
      const token = generation;
      timer = setTimeout(() => { if (token !== generation || !s.attacking || s.paused) return; deliver(); }, 2800);
    }
    function deliver() {
      if (!s.attacking || s.count >= 6) return;
      s.count += 1; s.pending = 'attack';
      record('Unexpected request received', 'Request ' + s.count + ' of 6; no sign-in initiated by learner');
      status(s.count === 6 ? 'Playback finished. Handle the last request and report the unexpected activity.' : 'An unexpected request is on the simulated phone. Inspect it before responding.');
      render(); schedule();
    }
    function reset() {
      stop(); s = { started: false, attacking: false, paused: byId('mfaManual').checked, count: 0, denied: 0, pending: '', reported: false, reviewed: false, compromised: false, legitimate: false, numberError: false };
      byId('mfaNumber').value = ''; if (mission) mission.reset(); clearHistory(); render(); status('Ready. Start the fictional request burst, or use step mode after starting.');
    }
    on('mfaStart', () => { if (s.started) return; s.started = s.attacking = true; s.paused = byId('mfaManual').checked; record('Started request-flood simulation'); deliver(); });
    on('mfaPause', () => { s.paused = !s.paused; stop(); if (!s.paused) schedule(); record(s.paused ? 'Paused incoming requests' : 'Resumed incoming requests'); status(s.paused ? 'Playback paused. The pending request can still be handled.' : 'Incoming-request playback resumed.'); render(); });
    on('mfaStep', () => { stop(); s.paused = true; deliver(); });
    on('mfaDeny', () => {
      if (!s.pending) return;
      if (s.pending === 'attack') { s.denied += 1; record('Denied unexpected request', 'No new session granted'); status('Request denied. Report the unexpected activity to stop the simulated burst.'); }
      else { record('Denied learner-initiated request', 'No session granted'); status('Your own request was denied safely. Start the demo sign-in again when ready.'); }
      s.pending = ''; render();
    });
    on('mfaApprove', () => {
      if (s.pending === 'attack') {
        stop(); s.attacking = false; s.compromised = true; s.pending = ''; record('Approved unexpected request', 'One unauthorized fictional session became active'); status('The accidental approval opened a fictional unauthorized session. Report, review activity, then revoke it.');
      } else if (s.pending === 'legitimate') {
        if (byId('mfaNumber').value !== '42') { s.numberError = true; record('Number match rejected', 'The selected demo number did not match'); status('The numbers do not match. Recheck the number on the fictional workstation; no session was granted.'); render(); return; }
        s.pending = ''; s.legitimate = true; record('Approved learner-initiated sign-in', 'Matching demo number verified; own session opened'); status('Task complete: unwanted activity handled, account reviewed, and your own sign-in verified.');
      }
      render();
    });
    on('mfaReport', () => { stop(); s.reported = true; s.attacking = false; s.pending = ''; record('Reported unexpected sign-in', 'Fictional security team stopped further requests'); status(s.compromised ? 'Reported. Review activity and revoke the unauthorized session.' : 'Reported and stopped. Review account activity before starting your own sign-in.'); render(); });
    on('mfaReview', () => { s.reviewed = true; record('Reviewed account activity', s.compromised ? 'One unauthorized fictional session found' : 'No unauthorized fictional session active'); status(s.compromised ? 'An unauthorized session is visible. Revoke it to recover.' : 'No unauthorized session is active. Report any unreported attempts, then start your own sign-in.'); render(); });
    on('mfaRevoke', () => { if (!s.reviewed || !s.compromised) return; s.compromised = false; record('Revoked unauthorized fictional session', 'Unauthorized-session count returned to zero'); status('Unauthorized session revoked. Finish reporting if needed, then practice your own sign-in.'); render(); });
    on('mfaLogin', () => { if (!s.reported || !s.reviewed || s.compromised || s.legitimate) return; s.pending = 'legitimate'; s.numberError = false; byId('mfaNumber').value = ''; record('Started own demo sign-in', 'A matching-number request was sent to the fictional phone'); status('A sign-in you initiated is ready. Match the workstation’s demo number on the phone.'); render(); });
    byId('mfaNumber').addEventListener('change', () => { s.numberError = false; render(); });
    on('simReset', reset);
    window.addEventListener('pagehide', () => { stop(); s.paused = true; render(); });
    reset();
    mountReport({ labId: 'mfa-fatigue', title: 'MFA Fatigue Lab', attackType: 'MFA request flooding and accidental approval', howItHappens: 'Repeated unexpected approval requests can pressure a user into granting a session they did not initiate.', scope: 'Local fictional account, phone and sessions. No actual authentication requests or account changes.', recommendations: ['Deny unexpected requests and report through a trusted channel.', 'Review and revoke suspicious sessions with your security team.', 'Prefer phishing-resistant authentication where supported.'] }, () => ({ status: complete() ? 'completed' : s.started ? 'in progress' : 'not started', metrics: mission ? [{ label: 'Practice mission evidence', value: mission.getSummary().status }, { label: 'Current mission checks', value: mission.getSummary().completedChecks + ' / ' + mission.getSummary().totalChecks }, { label: 'Optional hints revealed', value: mission.getSummary().hintsRevealed }] : [], findings: s.started ? [{ title: 'Simulated authentication outcome', evidence: s.count + ' requests received; ' + s.denied + ' denied; report ' + (s.reported ? 'completed' : 'not completed') + '; unauthorized active sessions ' + (s.compromised ? '1' : '0') + '; own sign-in ' + (s.legitimate ? 'completed' : 'not completed'), risk: s.compromised ? 'An unintended approval left a fictional unauthorized session active.' : 'No unauthorized session currently active in the model; this does not assess a real account.', recommendation: 'Tie approvals to your own sign-in and review unexpected activity.' }] : [] }));
  }

  if (byId('updateVisit')) {
    let s, timer = null, generation = 0;
    byId('updateManual').checked = prefersReducedMotion();
    const guide = mountGuide({ title: 'Check the update’s front door', intro: 'A web page offering an urgent update is like a stranger handing you a replacement key. Open the application’s own updater to check where the update comes from.', steps: [
      { title: 'Inspect the offer', text: 'Open the video, inspect the source and publisher, then dismiss the web prompt.' },
      { title: 'Handle any exposure', text: 'If you tried the fake download, remove it. If you opened it, also contain the fictional incident.' },
      { title: 'Report the prompt', text: 'Record what happened so the suspicious offer can be investigated.' },
      { title: 'Use the built-in updater', text: 'Open Settings → Updates, check the training release, then install the verified demo.' }
    ] });
    const sequences = { check: ['Opened the built-in updater’s fixed training source', 'Read the demo release information for version 1.1', 'Compared the fixture publisher and signature status', 'Verified training update ready; no real signature was checked'], install: ['Prepared the verified demo package', 'Staged changes in the fictional application', 'Restarted the fictional application', 'Demo application updated to version 1.1'] };
    function stop() { clearTimeout(timer); timer = null; generation += 1; }
    const clean = () => (!s.downloaded || s.deleted) && (!s.ran || s.contained);
    const complete = () => s.inspected && s.closed && clean() && s.reported && s.installed;
    function coach() {
      let step = 0, caption = 'Play the classroom video to see the web offer. A familiar logo or urgent message does not establish who supplied a file.', action = { id: 'updateVisit', label: 'Find Play classroom video' };
      if (s.visited && !s.inspected) {
        caption = 'Inspect the offered file’s source and publisher. Compare them with the application’s expected update channel.';
        action = { id: 'updateInspect', label: 'Find Inspect source and file details' };
      } else if (s.inspected && !s.closed) {
        caption = 'The offer comes from an unrelated training host with an unverified publisher. Close this web prompt before opening the application’s own updater.';
        action = { id: 'updateClose', label: 'Find Close the web prompt' };
      } else if (s.closed && !clean()) {
        step = 1; caption = s.ran && !s.contained ? 'The fictional installer ran. Deleting its file cannot undo that action: contain the simulated incident, then remove any remaining file.' : 'The suspicious file is still on the shelf. Remove it so it cannot be opened in the model.';
        action = { id: s.ran && !s.contained ? 'updateContain' : 'updateDelete', label: s.ran && !s.contained ? 'Find Contain the simulated incident' : 'Find Remove suspicious demo file' };
      } else if (s.closed && !s.reported) {
        step = 2; caption = 'The prompt is closed and any simulated exposure has been handled. Report the suspicious offer before finishing the trusted update.';
        action = { id: 'updateReport', label: 'Find Report suspicious update' };
      } else if (s.closed) {
        step = 3;
        caption = !s.settings ? 'Open the application’s Settings → Updates yourself. This reaches the expected update channel independently of the web offer.' : s.operation ? (s.operation === 'check' ? 'Checking the training source' : 'Installing the verified demo') + ': ' + s.progress + ' of 4 steps finished. ' + (s.paused ? 'Playback is paused. Use Next update step to inspect each change, or Resume playback.' : 'Watch the timeline and progress. Pause to inspect a step; Cancel stops this operation without completing it.') : s.installed ? 'The demo is now version 1.1, using the built-in channel. The source details and verification shown here are fixed classroom examples.' : s.verified ? 'The built-in check found the expected training publisher and valid fixture signature. Install the verified demo next.' : 'Check the built-in source first. The lab will show its release and publisher information one step at a time.';
        action = s.installed ? null : { id: !s.settings ? 'updateSettings' : s.operation ? s.paused ? 'updateStep' : 'updatePause' : s.verified ? 'updateInstall' : 'updateCheck', label: !s.settings ? 'Find Settings → Updates' : s.operation ? s.paused ? 'Find Next update step' : 'Find Pause playback' : s.verified ? 'Find Install verified demo update' : 'Find Check for an official demo update' };
      }
      updateGuide(guide, { step, completed: [s.inspected && s.closed, s.visited && s.closed && clean(), s.reported, s.installed].flatMap((yes, i) => yes ? [i] : []), status: complete() ? 'Practice complete' : s.ran && !s.contained ? 'Contain the simulated incident' : s.operation ? (s.paused ? 'Updater paused' : 'Updater playing') : 'Check the source before trusting it', caption,
        nodes: [{ label: 'Web offer', value: !s.visited ? 'Not opened' : !s.inspected ? 'Source not inspected' : s.closed ? 'Inspected and dismissed' : 'Unrelated host; publisher unverified', tone: !s.visited ? 'neutral' : s.closed && s.inspected ? 'good' : 'warn' }, { label: 'Fictional workstation', value: s.ran && !s.contained ? 'Incident needs containment' : s.downloaded && !s.deleted ? 'Suspicious file on shelf' : s.contained ? 'Incident contained; file removed' : s.visited ? 'No suspicious file remains' : 'No file selected', tone: !clean() ? 'warn' : s.visited ? 'good' : 'neutral' }, { label: 'Built-in updater', value: s.installed ? 'Demo version 1.1 installed' : s.operation ? (s.operation === 'check' ? 'Checking' : 'Installing') + ' · ' + s.progress + '/4' : s.verified ? 'Demo update verified' : s.settings ? 'Ready to check the source' : 'Not opened', tone: s.installed || s.verified ? 'good' : s.operation ? 'active' : 'neutral' }], action });
    }
    function render() {
      lock('updateVisit', s.visited); show('updateOverlay', s.visited && !s.closed); show('updateDetails', s.inspected); show('updateShelf', s.downloaded);
      lock('updateInspect', !s.visited || s.inspected); lock('updateDownload', s.downloaded); lock('updateRun', !s.downloaded || s.deleted || s.ran); lock('updateDelete', !s.downloaded || s.deleted); lock('updateContain', !s.ran || s.contained);
      byId('updateFileState').textContent = (s.deleted ? 'Suspicious demo file removed from the simulated shelf.' : 'CampusPlayer_Update.exe is on the simulated shelf.') + (s.ran ? s.contained ? ' Fictional incident contained and escalated; no real repair is claimed.' : ' It was opened: the fictional workstation is flagged as affected until you contain the incident.' : ' It has not been opened.');
      lock('updateReport', !s.visited || s.reported); lock('updateSettings', !s.closed || s.settings); show('updateUpdater', s.settings);
      lock('updateCheck', Boolean(s.operation) || s.verified || s.installed); lock('updateInstall', !s.verified || Boolean(s.operation) || s.installed);
      lock('updatePause', !s.operation); lock('updateStep', !s.operation); lock('updateCancel', !s.operation);
      lock('updateManual', Boolean(s.operation));
      byId('updatePause').textContent = s.paused ? 'Resume playback' : 'Pause playback';
      byId('updateProgress').value = s.progress; byId('updateProgressText').textContent = s.progress + ' / 4 steps' + (s.operation ? ' · ' + (s.operation === 'check' ? 'checking' : 'installing') + (s.paused ? ' · paused' : '') : '');
      byId('updateRelease').textContent = s.installed ? 'Current demo version: 1.1 · Update complete.' : s.verified ? 'Version 1.1 available · Expected training publisher · Fixture signature status: valid. No real cryptographic check.' : 'Current demo version: 1.0 · Check the built-in source before installing.';
      done('update-inspect', s.inspected && s.closed); done('update-clean', s.visited && clean()); done('update-report', s.reported); done('update-install', s.installed); show('simDebrief', complete());
      coach();
    }
    function schedule() { stop(); if (!s.operation || s.paused) return; const token = generation; timer = setTimeout(() => { if (token !== generation || !s.operation || s.paused) return; advance(); }, 800); }
    function advance() {
      if (!s.operation) return;
      const operation = s.operation;
      record(operation === 'check' ? 'Trusted update check' : 'Demo update installation', sequences[operation][s.progress]); s.progress += 1;
      status(sequences[operation][s.progress - 1]);
      if (s.progress === 4) { stop(); s.operation = ''; if (operation === 'check') s.verified = true; else s.installed = true; }
      render(); if (complete()) status('Task complete: deceptive update handled, incident reported, and trusted demo update installed.'); schedule();
    }
    function begin(operation) { if (s.operation || !s.settings || (operation === 'install' && !s.verified)) return; s.operation = operation; s.progress = 0; s.paused = byId('updateManual').checked; record('Started ' + (operation === 'check' ? 'trusted update check' : 'verified demo installation')); status(s.paused ? 'Updater paused at step 0 of 4. Use Next update step or Resume playback.' : 'Updater started. Follow its four steps, or pause to inspect them.'); render(); schedule(); }
    function reset() { stop(); s = { visited: false, inspected: false, closed: false, downloaded: false, deleted: false, ran: false, contained: false, reported: false, settings: false, verified: false, installed: false, operation: '', progress: 0, paused: false }; clearHistory(); render(); status('Ready. Open the classroom video to encounter the deceptive update.'); }
    on('updateVisit', () => { s.visited = true; record('Opened classroom video', 'Unexpected web update prompt appeared'); status('Investigate the web prompt. The page is not the application’s trusted updater.'); render(); });
    on('updateInspect', () => { s.inspected = true; record('Inspected update source', 'Unrelated fictional host and unverified publisher'); status('Source and publisher details are available. Decide how to handle the prompt.'); render(); });
    on('updateDownload', () => { s.downloaded = true; record('Selected fake download', 'Only a fictional file appeared in the lab shelf'); status('A fictional file is on the shelf. Inspect the source and remove it, or explore the contained unsafe path.'); render(); });
    on('updateClose', () => { s.closed = true; record('Dismissed deceptive web prompt'); status('Prompt closed. Handle any demo file and report it, then open the trusted application settings.'); render(); });
    on('updateRun', () => { s.ran = true; record('Opened fictional suspicious installer', 'Simulated workstation flagged as affected; no software executed'); status('The model now shows an affected workstation. Contain the incident, remove the demo file, and report.'); render(); });
    on('updateDelete', () => { s.deleted = true; record('Removed suspicious demo file', s.ran && !s.contained ? 'Incident still requires containment' : 'File no longer present in the model'); status(s.ran && !s.contained ? 'File removed. That does not undo an executed installer: contain the fictional incident too.' : 'Suspicious demo file removed. Continue with reporting and the trusted updater.'); render(); });
    on('updateContain', () => { s.contained = true; record('Contained simulated incident', 'Fictional workstation isolated and security-team escalation recorded'); status('Fictional incident contained. A real compromise would still require professional investigation and recovery.'); render(); });
    on('updateReport', () => { s.reported = true; record('Reported suspicious update', 'Local classroom incident record created'); status('Report recorded in this lab only. Finish any file cleanup and use the trusted updater.'); render(); });
    on('updateSettings', () => { s.settings = true; record('Opened application updater independently'); status('You are in the built-in updater. Check its training release information first.'); render(); });
    on('updateCheck', () => begin('check')); on('updateInstall', () => begin('install'));
    on('updatePause', () => { s.paused = !s.paused; stop(); record(s.paused ? 'Paused updater playback' : 'Resumed updater playback'); status(s.paused ? 'Updater paused. Use Next update step to advance once, or Resume playback.' : 'Updater playback resumed.'); render(); if (!s.paused) schedule(); });
    on('updateStep', () => { stop(); s.paused = true; advance(); });
    on('updateCancel', () => { stop(); record('Cancelled demo update operation', s.operation); s.operation = ''; s.progress = 0; status('Operation cancelled. No completion was recorded; restart the check or installation when ready.'); render(); });
    on('simReset', reset); window.addEventListener('pagehide', () => { stop(); if (s.operation) s.paused = true; render(); }); reset();
    mountReport({ labId: 'fake-update', title: 'Fake Software Update Lab', attackType: 'Deceptive update prompt and untrusted installer', howItHappens: 'An unrelated web page impersonates an update channel to persuade a user to run an untrusted file.', scope: 'Fictional browser, file shelf, workstation and updater; no real downloads, execution or signature verification.', recommendations: ['Open the application’s own update channel independently.', 'Inspect the source and publisher rather than trusting logos or urgency.', 'If an unknown installer ran, follow your security team’s containment and recovery process.'] }, () => ({ status: complete() ? 'completed' : s.visited ? 'in progress' : 'not started', findings: s.visited ? [{ title: 'Deceptive update handling', evidence: 'Source inspected: ' + s.inspected + '; fake file selected: ' + s.downloaded + '; fictional installer opened: ' + s.ran + '; cleanup complete: ' + clean() + '; report completed: ' + s.reported + '; trusted demo update installed: ' + s.installed, risk: s.ran && !s.contained ? 'Fictional incident remains uncontained.' : 'The model illustrates the risk of untrusted update sources, not a scan of a real device.', recommendation: 'Use trusted update channels and complete any required incident response.' }] : [] }));
  }

  if (byId('permVisit')) {
    let s, timer = null, generation = 0;
    byId('permManual').checked = prefersReducedMotion();
    const guide = mountGuide({ title: 'Give a website only the key it needs', intro: 'A browser permission is like lending out a key. Ask what task needs it, check who holds it, and take it back when the task is finished.', steps: [
      { title: 'Read the request', text: 'Open the news page. Decide whether sending notifications is necessary for reading it.' },
      { title: 'Review and repair', text: 'Inspect site settings, block unwanted notifications and clear any alerts already delivered.' },
      { title: 'Try necessary access', text: 'Join the voice meeting you chose, allow its microphone and test the fictional signal.' },
      { title: 'Take back the key', text: 'End the meeting, then revoke its microphone permission in site settings.' }
    ] });
    function stop() { clearTimeout(timer); timer = null; generation += 1; }
    const newsSafe = () => s.visited && s.notifications === 'Blocked' && s.alerts.length === 0;
    const complete = () => s.reviewed && newsSafe() && s.tested && s.ended && s.microphone === 'Blocked';
    function coach() {
      let step = 0, caption = 'Open the news page to see what access it requests. Reading news does not require permission to send you notifications.', action = { id: 'permVisit', label: 'Find Open news page' };
      if (s.visited && s.notifications === 'Ask') {
        caption = 'The page links notifications to a fake robot check. Sending alerts is unrelated to reading the news; block that request.';
        action = { id: 'permDeny', label: 'Find Block simulated notifications' };
      } else if (s.visited && (!s.reviewed || !newsSafe())) {
        step = 1;
        caption = !s.reviewed ? s.notifications === 'Allowed' ? 'The grant lets this news site put alerts in the tray. Open site settings to inspect and revoke it; clearing alerts alone leaves the key with the site.' : 'Notifications are blocked. Open site settings to confirm the grant and see what other permissions are recorded.' : s.notifications === 'Allowed' ? 'The news site still holds notification permission. Revoke the grant to stop future alerts, then clear any already delivered.' : 'Notifications are blocked, so new alerts cannot arrive. Clear the existing tray to finish the cleanup.';
        action = { id: !s.reviewed ? 'permSettings' : s.notifications === 'Allowed' ? 'permRevokeNotifications' : 'permClear', label: !s.reviewed ? 'Find Open simulated site settings' : s.notifications === 'Allowed' ? 'Find Block / revoke notifications' : 'Find Clear simulated alerts' };
      } else if (newsSafe() && s.reviewed && !s.tested) {
        step = 2;
        caption = !s.joined ? 'The unrelated grant is blocked and the tray is clear. Join the voice meeting yourself to see a request that matches your task.' : s.microphone !== 'Allowed' ? 'You opened a voice meeting, so its microphone request serves your task. Allow only the demo microphone; camera and location stay blocked.' : 'The meeting has microphone permission. Test the fictional signal to see that the intended task can work.';
        action = { id: !s.joined ? 'permJoin' : s.microphone !== 'Allowed' ? 'permAllowMic' : 'permTest', label: !s.joined ? 'Find Join the demo voice meeting' : s.microphone !== 'Allowed' ? 'Find Allow demo microphone' : 'Find Test fictional microphone' };
      } else if (newsSafe() && s.reviewed && s.tested) {
        step = 3;
        caption = !s.ended ? 'The fictional microphone test worked. End the meeting, then take back its microphone permission.' : s.microphone === 'Allowed' ? 'The call has ended, but its microphone grant remains allowed. Revoke that permission in the site settings.' : 'The meeting is finished, the microphone is blocked, and unwanted news alerts are cleared. Each permission matched a task and was removed when no longer needed.';
        action = complete() ? null : { id: !s.ended ? 'permEnd' : 'permRevokeMic', label: !s.ended ? 'Find End the demo meeting' : 'Find Revoke microphone access' };
      }
      updateGuide(guide, { step, completed: [s.visited && s.notifications !== 'Ask', s.reviewed && newsSafe(), s.tested, s.ended && s.microphone === 'Blocked'].flatMap((yes, i) => yes ? [i] : []), status: complete() ? 'Practice complete' : s.notifications === 'Allowed' ? 'Unwanted permission is still allowed' : s.ended && s.microphone === 'Allowed' ? 'Call ended; permission remains' : 'Match access to the task', caption,
        nodes: [{ label: 'News site key', value: 'Notifications: ' + s.notifications, tone: s.notifications === 'Allowed' ? 'warn' : s.notifications === 'Blocked' ? 'good' : 'neutral' }, { label: 'Alert tray', value: s.alerts.length + ' visible · ' + s.alertsShown + ' delivered', tone: s.alerts.length ? 'warn' : s.visited ? 'good' : 'neutral' }, { label: 'Voice meeting', value: s.ended ? 'Ended' : s.tested ? 'Fictional test passed' : s.joined ? 'You opened the meeting' : 'Not joined', tone: s.tested || s.ended ? 'good' : s.joined ? 'active' : 'neutral' }, { label: 'Meeting key', value: 'Microphone: ' + s.microphone, tone: s.microphone === 'Allowed' ? s.ended ? 'warn' : 'active' : s.microphone === 'Blocked' ? 'good' : 'neutral' }], action });
    }
    function render() {
      lock('permVisit', s.visited); show('permPrompt', s.visited && s.notifications === 'Ask'); lock('permAllow', !s.visited || s.notifications !== 'Ask'); lock('permDeny', !s.visited || s.notifications !== 'Ask');
      lock('permSettings', !s.visited || s.reviewed); show('permLedger', s.reviewed); byId('permNotificationState').textContent = s.notifications; byId('permMicrophoneState').textContent = s.microphone;
      lock('permRevokeNotifications', !s.reviewed || s.notifications === 'Blocked'); lock('permRevokeMic', !s.reviewed || s.microphone !== 'Allowed');
      lock('permNext', s.notifications !== 'Allowed' || s.alertsShown >= 4); lock('permClear', !s.alerts.length);
      lock('permPause', s.notifications !== 'Allowed' || s.alertsShown >= 4); lock('permManual', s.notifications !== 'Ask');
      byId('permPause').textContent = s.paused ? 'Resume alerts' : 'Pause alerts';
      byId('permPlayback').textContent = s.notifications === 'Ask' ? 'No permission has been granted to send alerts.' : s.notifications === 'Blocked' ? 'Notifications blocked. No new alerts can arrive.' : s.alertsShown >= 4 ? 'All four demo alerts delivered. The notification grant remains allowed until revoked.' : s.paused ? 'Alert playback paused. Use Show next simulated alert to advance once, or revoke the grant.' : 'Alert playback active. Another demo alert arrives every 1.8 seconds until the grant is revoked.';
      byId('permAlerts').replaceChildren(); s.alerts.forEach(text => { const p = document.createElement('p'); p.textContent = text; byId('permAlerts').appendChild(p); });
      lock('permJoin', !s.visited || s.joined || s.ended); show('permMicPrompt', s.joined && !s.ended && s.microphone !== 'Allowed');
      lock('permAllowMic', !s.joined || s.ended || s.microphone === 'Allowed'); lock('permDenyMic', !s.joined || s.ended || s.microphone === 'Allowed');
      lock('permTest', !s.joined || s.ended || s.microphone !== 'Allowed' || s.tested); lock('permEnd', !s.joined || s.ended); show('permMeter', s.tested && !s.ended && s.microphone === 'Allowed');
      byId('permCallState').textContent = s.ended ? (s.microphone === 'Blocked' ? 'Meeting ended and its microphone grant is revoked.' : 'Meeting ended. Revoke its microphone grant in the simulated settings.') : s.tested && s.microphone === 'Allowed' ? 'Fictional microphone test passed. End the meeting when finished.' : s.joined ? s.microphone === 'Allowed' ? 'Demo microphone allowed. Run the fictional microphone test.' : 'Meeting opened by you. Microphone is blocked until you intentionally allow it.' : 'No meeting started.';
      done('perm-settings', s.reviewed); done('perm-news', newsSafe()); done('perm-call', s.tested); done('perm-cleanup', s.ended && s.microphone === 'Blocked'); show('simDebrief', complete());
      if (complete()) status('Task complete: unwanted access blocked, alerts cleared, voice task completed, and microphone permission revoked.');
      coach();
    }
    function schedule() { stop(); if (s.notifications !== 'Allowed' || s.paused || s.alertsShown >= 4) return; const token = generation; timer = setTimeout(() => { if (token !== generation || s.notifications !== 'Allowed' || s.paused) return; alert(); }, 1800); }
    function alert() { if (s.notifications !== 'Allowed' || s.alertsShown >= 4) return; s.alertsShown += 1; s.alerts.push('DEMO ALERT ' + s.alertsShown + ': “Your device needs an urgent fix.” This is fictional notification spam, not a real security warning.'); record('Simulated notification delivered', 'Unwanted notification ' + s.alertsShown + ' of 4'); status('A deceptive notification appeared inside the lab. Open site settings and revoke the grant.'); render(); schedule(); }
    function reset() { stop(); s = { visited: false, notifications: 'Ask', microphone: 'Ask', reviewed: false, alerts: [], alertsShown: 0, joined: false, tested: false, ended: false, paused: byId('permManual').checked }; clearHistory(); render(); status('Ready. Open the news page and inspect its simulated notification request.'); }
    on('permVisit', () => { s.visited = true; record('Opened fictional news page', 'Unrelated notification request appeared'); status('The news page asks for notifications as a fake verification step. No actual browser prompt was opened.'); render(); });
    on('permAllow', () => { s.notifications = 'Allowed'; s.paused = byId('permManual').checked; record('Allowed simulated news notifications', 'The fictional grant permits in-app notification spam'); alert(); });
    on('permDeny', () => { s.notifications = 'Blocked'; record('Blocked unrelated notification request'); status('Unnecessary notifications blocked. Review permissions, then join the intentional voice task.'); render(); });
    on('permPause', () => { s.paused = !s.paused; stop(); record(s.paused ? 'Paused simulated alerts' : 'Resumed simulated alerts'); status(s.paused ? 'Alert playback paused. The notification grant is still allowed until you revoke it.' : 'Alert playback resumed. Revoke the grant in site settings to block future alerts.'); render(); if (!s.paused) schedule(); });
    on('permNext', () => { stop(); s.paused = true; alert(); status('One alert shown in step mode. Use Next again, or revoke notifications in site settings.'); });
    on('permClear', () => { s.alerts = []; record('Cleared visible simulated alerts', s.notifications === 'Allowed' ? 'The grant is still active; more alerts can arrive' : 'Notification grant is blocked'); status(s.notifications === 'Allowed' ? 'Alerts cleared, but the permission is still allowed. Revoke it to prevent further alerts.' : 'Alerts cleared and notifications remain blocked.'); render(); });
    on('permSettings', () => { s.reviewed = true; record('Inspected simulated permission ledger'); status('Permission grants are visible. Revoke anything unrelated to the task you intended.'); render(); });
    on('permRevokeNotifications', () => { stop(); s.notifications = 'Blocked'; record('Blocked or revoked news notification grant'); status('Further alerts stopped. Clear any already visible alerts and continue the voice task.'); render(); });
    on('permJoin', () => { s.joined = true; record('Intentionally opened demo voice meeting', 'A task-related microphone request appeared'); status('This microphone request follows a task you initiated. Only the simulated microphone is needed.'); render(); });
    on('permAllowMic', () => { s.microphone = 'Allowed'; record('Allowed task-related demo microphone', 'Camera and location stayed blocked'); status('Microphone allowed in the model. Test it to complete the intended task.'); render(); });
    on('permDenyMic', () => { s.microphone = 'Blocked'; record('Kept demo microphone blocked', 'Voice test cannot work until access is intentionally allowed'); status('Microphone stayed blocked. Allow it if you want to complete the intended voice task.'); render(); });
    on('permTest', () => { s.tested = true; record('Tested fictional microphone', 'Demo signal succeeded; no actual recording or device access'); status('Demo microphone test passed. End the meeting and revoke its grant.'); render(); });
    on('permEnd', () => { if (!s.tested) { status('Test the fictional microphone before ending so you can demonstrate the intended task worked.'); return; } s.ended = true; record('Ended demo voice meeting', 'Permission must still be revoked in simulated settings'); status('Meeting ended. Return to simulated site settings and revoke microphone access.'); render(); });
    on('permRevokeMic', () => { s.microphone = 'Blocked'; if (!s.ended) s.tested = false; record('Revoked demo microphone access', s.ended ? 'Meeting had ended' : 'Meeting still open; the task needs permission to use the microphone'); status(s.ended ? 'Microphone access revoked. Finish any remaining news-site cleanup.' : 'Microphone revoked during the task. Re-allow it if the voice task still needs it.'); render(); });
    on('simReset', reset); window.addEventListener('pagehide', () => { stop(); s.paused = true; render(); }); reset();
    mountReport({ labId: 'browser-permissions', title: 'Browser Permission Lab', attackType: 'Deceptive permission request and notification abuse', howItHappens: 'A page links an unrelated permission request to a fake requirement, then uses the grant beyond the user’s intended task.', scope: 'Fictional browser prompts, permission ledger, notification tray and microphone test. No native device permissions or data access.', recommendations: ['Grant only access needed for the task you initiated.', 'Inspect site settings and revoke unwanted or expired grants.', 'Clearing an alert does not revoke the permission that enabled it.'] }, () => ({ status: complete() ? 'completed' : s.visited ? 'in progress' : 'not started', findings: s.visited ? [{ title: 'Permission state after learner actions', evidence: 'News notifications: ' + s.notifications + '; alerts delivered: ' + s.alertsShown + '; visible alerts: ' + s.alerts.length + '; microphone: ' + s.microphone + '; intentional voice task tested: ' + s.tested + '; meeting ended: ' + s.ended, risk: s.notifications === 'Allowed' ? 'Unwanted fictional notification permission remains allowed.' : 'Unwanted notifications are not currently permitted in the model.', recommendation: 'Revoke unrelated access and clean up task-specific grants when no longer needed.' }] : [] }));
  }
})();
