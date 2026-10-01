/* Local, fictional training state only. No network, native permission, download, or execution APIs. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  if (!byId('simStatus')) return;
  const actions = [];
  let resetTime = Date.now();
  let reportController = null;
  const status = text => { byId('simStatus').textContent = text; };
  const show = (id, visible) => { byId(id).hidden = !visible; };
  const lock = (id, disabled) => { byId(id).disabled = disabled; };
  const done = (id, value) => { const node = byId('e-' + id); node.classList.toggle('is-done', Boolean(value)); node.setAttribute('data-completed', String(Boolean(value))); };
  const on = (id, fn) => byId(id).addEventListener('click', () => { if (!byId(id).disabled) fn(); });
  function record(label, result = '') {
    actions.push({ label, result, at: new Date().toISOString() });
    const item = document.createElement('li');
    item.textContent = Math.round((Date.now() - resetTime) / 1000) + 's · ' + label + (result ? ': ' + result : '');
    byId('simLog').appendChild(item);
  }
  function clearHistory() { actions.length = 0; resetTime = Date.now(); byId('simLog').replaceChildren(); show('simDebrief', false); if (reportController) reportController.reset(); }
  function mountReport(config, getSnapshot) {
    if (!window.LabReport || !byId('labReportMount')) return;
    reportController = window.LabReport.mount({ ...config, mountTo: byId('labReportMount'), getSnapshot: () => { const snapshot = getSnapshot(); return { ...snapshot, actions: actions.slice(), startedAt: actions[0]?.at, completedAt: snapshot.status === 'completed' ? actions[actions.length - 1]?.at : undefined }; } });
  }

  if (byId('mfaStart')) {
    let s, timer = null, generation = 0;
    function stop() { clearTimeout(timer); timer = null; generation += 1; }
    const complete = () => s.reported && s.reviewed && !s.compromised && s.legitimate;
    function render() {
      byId('mfaCount').textContent = String(s.count);
      byId('mfaDenied').textContent = String(s.denied);
      byId('mfaSessions').textContent = s.compromised ? '1' : '0';
      lock('mfaStart', s.started); lock('mfaPause', !s.attacking || s.count >= 6); lock('mfaStep', !s.attacking || s.count >= 6);
      byId('mfaPause').textContent = s.paused ? 'Resume playback' : 'Pause playback';
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
      stop(); s = { started: false, attacking: false, paused: false, count: 0, denied: 0, pending: '', reported: false, reviewed: false, compromised: false, legitimate: false };
      byId('mfaNumber').value = ''; clearHistory(); render(); status('Ready. Start the fictional request burst, or use step mode after starting.');
    }
    on('mfaStart', () => { if (s.started) return; s.started = s.attacking = true; record('Started request-flood simulation'); deliver(); });
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
        if (byId('mfaNumber').value !== '42') { record('Number match rejected', 'The selected demo number did not match'); status('The numbers do not match. Recheck the number on the fictional workstation; no session was granted.'); return; }
        s.pending = ''; s.legitimate = true; record('Approved learner-initiated sign-in', 'Matching demo number verified; own session opened'); status('Task complete: unwanted activity handled, account reviewed, and your own sign-in verified.');
      }
      render();
    });
    on('mfaReport', () => { stop(); s.reported = true; s.attacking = false; s.pending = ''; record('Reported unexpected sign-in', 'Fictional security team stopped further requests'); status(s.compromised ? 'Reported. Review activity and revoke the unauthorized session.' : 'Reported and stopped. Review account activity before starting your own sign-in.'); render(); });
    on('mfaReview', () => { s.reviewed = true; record('Reviewed account activity', s.compromised ? 'One unauthorized fictional session found' : 'No unauthorized fictional session active'); status(s.compromised ? 'An unauthorized session is visible. Revoke it to recover.' : 'No unauthorized session is active. Report any unreported attempts, then start your own sign-in.'); render(); });
    on('mfaRevoke', () => { if (!s.reviewed || !s.compromised) return; s.compromised = false; record('Revoked unauthorized fictional session', 'Unauthorized-session count returned to zero'); status('Unauthorized session revoked. Finish reporting if needed, then practice your own sign-in.'); render(); });
    on('mfaLogin', () => { if (!s.reported || !s.reviewed || s.compromised || s.legitimate) return; s.pending = 'legitimate'; byId('mfaNumber').value = ''; record('Started own demo sign-in', 'A matching-number request was sent to the fictional phone'); status('A sign-in you initiated is ready. Match the workstation’s demo number on the phone.'); render(); });
    on('simReset', reset);
    window.addEventListener('pagehide', () => { stop(); s.paused = true; render(); });
    reset();
    mountReport({ labId: 'mfa-fatigue', title: 'MFA Fatigue Lab', attackType: 'MFA request flooding and accidental approval', howItHappens: 'Repeated unexpected approval requests can pressure a user into granting a session they did not initiate.', scope: 'Local fictional account, phone and sessions. No actual authentication requests or account changes.', recommendations: ['Deny unexpected requests and report through a trusted channel.', 'Review and revoke suspicious sessions with your security team.', 'Prefer phishing-resistant authentication where supported.'] }, () => ({ status: complete() ? 'completed' : s.started ? 'in progress' : 'not started', findings: s.started ? [{ title: 'Simulated authentication outcome', evidence: s.count + ' requests received; ' + s.denied + ' denied; report ' + (s.reported ? 'completed' : 'not completed') + '; unauthorized active sessions ' + (s.compromised ? '1' : '0') + '; own sign-in ' + (s.legitimate ? 'completed' : 'not completed'), risk: s.compromised ? 'An unintended approval left a fictional unauthorized session active.' : 'No unauthorized session currently active in the model; this does not assess a real account.', recommendation: 'Tie approvals to your own sign-in and review unexpected activity.' }] : [] }));
  }

  if (byId('updateVisit')) {
    let s, timer = null, generation = 0;
    const sequences = { check: ['Opened the built-in updater’s fixed training source', 'Read the demo release information for version 1.1', 'Compared the fixture publisher and signature status', 'Verified training update ready; no real signature was checked'], install: ['Prepared the verified demo package', 'Staged changes in the fictional application', 'Restarted the fictional application', 'Demo application updated to version 1.1'] };
    function stop() { clearTimeout(timer); timer = null; generation += 1; }
    const clean = () => (!s.downloaded || s.deleted) && (!s.ran || s.contained);
    const complete = () => s.inspected && s.closed && clean() && s.reported && s.installed;
    function render() {
      lock('updateVisit', s.visited); show('updateOverlay', s.visited && !s.closed); show('updateDetails', s.inspected); show('updateShelf', s.downloaded);
      lock('updateInspect', !s.visited || s.inspected); lock('updateDownload', s.downloaded); lock('updateRun', !s.downloaded || s.deleted || s.ran); lock('updateDelete', !s.downloaded || s.deleted); lock('updateContain', !s.ran || s.contained);
      byId('updateFileState').textContent = (s.deleted ? 'Suspicious demo file removed from the simulated shelf.' : 'CampusPlayer_Update.exe is on the simulated shelf.') + (s.ran ? s.contained ? ' Fictional incident contained and escalated; no real repair is claimed.' : ' It was opened: the fictional workstation is flagged as affected until you contain the incident.' : ' It has not been opened.');
      lock('updateReport', !s.visited || s.reported); lock('updateSettings', !s.closed || s.settings); show('updateUpdater', s.settings);
      lock('updateCheck', Boolean(s.operation) || s.verified || s.installed); lock('updateInstall', !s.verified || Boolean(s.operation) || s.installed);
      lock('updatePause', !s.operation); lock('updateStep', !s.operation); lock('updateCancel', !s.operation);
      byId('updatePause').textContent = s.paused ? 'Resume playback' : 'Pause playback';
      byId('updateProgress').value = s.progress; byId('updateProgressText').textContent = s.progress + ' / 4 steps' + (s.operation ? ' · ' + (s.operation === 'check' ? 'checking' : 'installing') + (s.paused ? ' · paused' : '') : '');
      byId('updateRelease').textContent = s.installed ? 'Current demo version: 1.1 · Update complete.' : s.verified ? 'Version 1.1 available · Expected training publisher · Fixture signature status: valid. No real cryptographic check.' : 'Current demo version: 1.0 · Check the built-in source before installing.';
      done('update-inspect', s.inspected && s.closed); done('update-clean', s.visited && clean()); done('update-report', s.reported); done('update-install', s.installed); show('simDebrief', complete());
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
    function begin(operation) { if (s.operation || !s.settings || (operation === 'install' && !s.verified)) return; s.operation = operation; s.progress = 0; s.paused = false; record('Started ' + (operation === 'check' ? 'trusted update check' : 'verified demo installation')); render(); schedule(); }
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
    on('updatePause', () => { s.paused = !s.paused; stop(); record(s.paused ? 'Paused updater playback' : 'Resumed updater playback'); render(); if (!s.paused) schedule(); });
    on('updateStep', () => { stop(); s.paused = true; advance(); });
    on('updateCancel', () => { stop(); record('Cancelled demo update operation', s.operation); s.operation = ''; s.progress = 0; status('Operation cancelled. No completion was recorded; restart the check or installation when ready.'); render(); });
    on('simReset', reset); window.addEventListener('pagehide', () => { stop(); if (s.operation) s.paused = true; render(); }); reset();
    mountReport({ labId: 'fake-update', title: 'Fake Software Update Lab', attackType: 'Deceptive update prompt and untrusted installer', howItHappens: 'An unrelated web page impersonates an update channel to persuade a user to run an untrusted file.', scope: 'Fictional browser, file shelf, workstation and updater; no real downloads, execution or signature verification.', recommendations: ['Open the application’s own update channel independently.', 'Inspect the source and publisher rather than trusting logos or urgency.', 'If an unknown installer ran, follow your security team’s containment and recovery process.'] }, () => ({ status: complete() ? 'completed' : s.visited ? 'in progress' : 'not started', findings: s.visited ? [{ title: 'Deceptive update handling', evidence: 'Source inspected: ' + s.inspected + '; fake file selected: ' + s.downloaded + '; fictional installer opened: ' + s.ran + '; cleanup complete: ' + clean() + '; report completed: ' + s.reported + '; trusted demo update installed: ' + s.installed, risk: s.ran && !s.contained ? 'Fictional incident remains uncontained.' : 'The model illustrates the risk of untrusted update sources, not a scan of a real device.', recommendation: 'Use trusted update channels and complete any required incident response.' }] : [] }));
  }

  if (byId('permVisit')) {
    let s, timer = null, generation = 0;
    function stop() { clearTimeout(timer); timer = null; generation += 1; }
    const newsSafe = () => s.visited && s.notifications === 'Blocked' && s.alerts.length === 0;
    const complete = () => s.reviewed && newsSafe() && s.tested && s.ended && s.microphone === 'Blocked';
    function render() {
      lock('permVisit', s.visited); show('permPrompt', s.visited && s.notifications === 'Ask'); lock('permAllow', !s.visited || s.notifications !== 'Ask'); lock('permDeny', !s.visited || s.notifications !== 'Ask');
      lock('permSettings', !s.visited || s.reviewed); show('permLedger', s.reviewed); byId('permNotificationState').textContent = s.notifications; byId('permMicrophoneState').textContent = s.microphone;
      lock('permRevokeNotifications', !s.reviewed || s.notifications === 'Blocked'); lock('permRevokeMic', !s.reviewed || s.microphone !== 'Allowed');
      lock('permNext', s.notifications !== 'Allowed' || s.alertsShown >= 4); lock('permClear', !s.alerts.length);
      byId('permAlerts').replaceChildren(); s.alerts.forEach(text => { const p = document.createElement('p'); p.textContent = text; byId('permAlerts').appendChild(p); });
      lock('permJoin', !s.visited || s.joined || s.ended); show('permMicPrompt', s.joined && !s.ended && s.microphone !== 'Allowed');
      lock('permAllowMic', !s.joined || s.ended || s.microphone === 'Allowed'); lock('permDenyMic', !s.joined || s.ended || s.microphone === 'Allowed');
      lock('permTest', !s.joined || s.ended || s.microphone !== 'Allowed' || s.tested); lock('permEnd', !s.joined || s.ended); show('permMeter', s.tested && !s.ended && s.microphone === 'Allowed');
      byId('permCallState').textContent = s.ended ? 'Meeting ended. Revoke its microphone grant in the simulated settings.' : s.tested && s.microphone === 'Allowed' ? 'Fictional microphone test passed. End the meeting when finished.' : s.joined ? s.microphone === 'Allowed' ? 'Demo microphone allowed. Run the fictional microphone test.' : 'Meeting opened by you. Microphone is blocked until you intentionally allow it.' : 'No meeting started.';
      done('perm-settings', s.reviewed); done('perm-news', newsSafe()); done('perm-call', s.tested); done('perm-cleanup', s.ended && s.microphone === 'Blocked'); show('simDebrief', complete());
      if (complete()) status('Task complete: unwanted access blocked, alerts cleared, voice task completed, and microphone permission revoked.');
    }
    function schedule() { stop(); if (s.notifications !== 'Allowed' || s.alertsShown >= 4) return; const token = generation; timer = setTimeout(() => { if (token !== generation || s.notifications !== 'Allowed') return; alert(); }, 1800); }
    function alert() { if (s.notifications !== 'Allowed' || s.alertsShown >= 4) return; s.alertsShown += 1; s.alerts.push('DEMO ALERT ' + s.alertsShown + ': “Your device needs an urgent fix.” This is fictional notification spam, not a real security warning.'); record('Simulated notification delivered', 'Unwanted notification ' + s.alertsShown + ' of 4'); status('A deceptive notification appeared inside the lab. Open site settings and revoke the grant.'); render(); schedule(); }
    function reset() { stop(); s = { visited: false, notifications: 'Ask', microphone: 'Ask', reviewed: false, alerts: [], alertsShown: 0, joined: false, tested: false, ended: false }; clearHistory(); render(); status('Ready. Open the news page and inspect its simulated notification request.'); }
    on('permVisit', () => { s.visited = true; record('Opened fictional news page', 'Unrelated notification request appeared'); status('The news page asks for notifications as a fake verification step. No actual browser prompt was opened.'); render(); });
    on('permAllow', () => { s.notifications = 'Allowed'; record('Allowed simulated news notifications', 'The fictional grant permits in-app notification spam'); alert(); });
    on('permDeny', () => { s.notifications = 'Blocked'; record('Blocked unrelated notification request'); status('Unnecessary notifications blocked. Review permissions, then join the intentional voice task.'); render(); });
    on('permNext', () => { stop(); alert(); stop(); status('One alert shown in step mode. Use Next again, or revoke notifications in site settings.'); });
    on('permClear', () => { s.alerts = []; record('Cleared visible simulated alerts', s.notifications === 'Allowed' ? 'The grant is still active; more alerts can arrive' : 'Notification grant is blocked'); status(s.notifications === 'Allowed' ? 'Alerts cleared, but the permission is still allowed. Revoke it to prevent further alerts.' : 'Alerts cleared and notifications remain blocked.'); render(); });
    on('permSettings', () => { s.reviewed = true; record('Inspected simulated permission ledger'); status('Permission grants are visible. Revoke anything unrelated to the task you intended.'); render(); });
    on('permRevokeNotifications', () => { stop(); s.notifications = 'Blocked'; record('Blocked or revoked news notification grant'); status('Further alerts stopped. Clear any already visible alerts and continue the voice task.'); render(); });
    on('permJoin', () => { s.joined = true; record('Intentionally opened demo voice meeting', 'A task-related microphone request appeared'); status('This microphone request follows a task you initiated. Only the simulated microphone is needed.'); render(); });
    on('permAllowMic', () => { s.microphone = 'Allowed'; record('Allowed task-related demo microphone', 'Camera and location stayed blocked'); status('Microphone allowed in the model. Test it to complete the intended task.'); render(); });
    on('permDenyMic', () => { s.microphone = 'Blocked'; record('Kept demo microphone blocked', 'Voice test cannot work until access is intentionally allowed'); status('Microphone stayed blocked. Allow it if you want to complete the intended voice task.'); render(); });
    on('permTest', () => { s.tested = true; record('Tested fictional microphone', 'Demo signal succeeded; no actual recording or device access'); status('Demo microphone test passed. End the meeting and revoke its grant.'); render(); });
    on('permEnd', () => { if (!s.tested) { status('Test the fictional microphone before ending so you can demonstrate the intended task worked.'); return; } s.ended = true; record('Ended demo voice meeting', 'Permission must still be revoked in simulated settings'); status('Meeting ended. Return to simulated site settings and revoke microphone access.'); render(); });
    on('permRevokeMic', () => { s.microphone = 'Blocked'; if (!s.ended) s.tested = false; record('Revoked demo microphone access', s.ended ? 'Meeting had ended' : 'Meeting still open; the task needs permission to use the microphone'); status(s.ended ? 'Microphone access revoked. Finish any remaining news-site cleanup.' : 'Microphone revoked during the task. Re-allow it if the voice task still needs it.'); render(); });
    on('simReset', reset); window.addEventListener('pagehide', stop); reset();
    mountReport({ labId: 'browser-permissions', title: 'Browser Permission Lab', attackType: 'Deceptive permission request and notification abuse', howItHappens: 'A page links an unrelated permission request to a fake requirement, then uses the grant beyond the user’s intended task.', scope: 'Fictional browser prompts, permission ledger, notification tray and microphone test. No native device permissions or data access.', recommendations: ['Grant only access needed for the task you initiated.', 'Inspect site settings and revoke unwanted or expired grants.', 'Clearing an alert does not revoke the permission that enabled it.'] }, () => ({ status: complete() ? 'completed' : s.visited ? 'in progress' : 'not started', findings: s.visited ? [{ title: 'Permission state after learner actions', evidence: 'News notifications: ' + s.notifications + '; alerts delivered: ' + s.alertsShown + '; visible alerts: ' + s.alerts.length + '; microphone: ' + s.microphone + '; intentional voice task tested: ' + s.tested + '; meeting ended: ' + s.ended, risk: s.notifications === 'Allowed' ? 'Unwanted fictional notification permission remains allowed.' : 'Unwanted notifications are not currently permitted in the model.', recommendation: 'Revoke unrelated access and clean up task-specific grants when no longer needed.' }] : [] }));
  }
})();
