/* Safe adapters for the original port/password labs. Intentionally no reads of
   password input values, generated examples, browser storage, or remote data. */
(() => {
  'use strict';
  if (!window.LabReport) return;
  const byId = id => document.getElementById(id);
  const text = id => byId(id) ? byId(id).textContent.trim() : '';
  const now = () => new Date().toISOString();
  function mountPoint() {
    const element = document.createElement('div');
    element.id = 'labReportMount';
    const main = document.querySelector('main');
    const nav = main.querySelector('.lab-return');
    if (nav) main.insertBefore(element, nav); else main.append(element);
    return element;
  }
  if (byId('portRows')) {
    let startedAt = '', completedAt = '', scanStartedAt = '';
    const times = {}, rowTimes = {};
    const targetNames = { web: 'Campus web server · 192.0.2.10', workstation: 'Staff workstation · 192.0.2.20' };
    function clearScan() { scanStartedAt = ''; completedAt = ''; for (const key of Object.keys(rowTimes)) delete rowTimes[key]; }
    function targetName() { return targetNames[byId('portTarget').value] || 'No valid preset target selected'; }
    function snapshot() {
      const actions = [], findings = [];
      if (!byId('portIpOutput').hidden) actions.push({ label: 'Revealed the fictional learner IP', result: '192.0.2.50 with subnet mask 255.255.255.0. No device address was detected.', at: times.ip });
      if (!byId('portNetworkOutput').hidden) actions.push({ label: 'Calculated the virtual network and attempted preset-host discovery', result: text('portNetworkStatus'), at: times.network });
      if (scanStartedAt) actions.push({ label: 'Started a simulated TCP scan', result: 'Preset target: ' + targetName() + '. No network traffic was generated.', at: scanStartedAt });
      const rows = [...byId('portRows').querySelectorAll('tr')];
      let checked = 0;
      rows.forEach(row => {
        const cells = [...row.querySelectorAll('td')].map(cell => cell.textContent.trim());
        if (cells.length !== 3 || !/^(Open|Closed|Filtered)$/.test(cells[2])) return;
        checked += 1;
        actions.push({ label: 'Simulated probe: ' + cells[0] + ' (' + cells[1] + ')', result: 'Preset target: ' + targetName() + '. Recorded state: ' + cells[2] + '.', at: rowTimes[cells[0]] });
        if (cells[2] === 'Open') findings.push({ title: 'Simulated reachable service: ' + cells[0], evidence: cells[1] + ' returned an Open state on ' + targetName() + '.', risk: 'Informational service-exposure observation. This is not proof of a vulnerability or compromise.', recommendation: 'Verify the business need, restrict access, and review authentication and updates within an authorized environment.' });
      });
      const scanStatus = text('portStatus');
      const cancelled = /cancelled/i.test(scanStatus), complete = /Scan complete/.test(scanStatus);
      if (cancelled) actions.push({ label: 'Cancelled the simulated scan', result: checked + ' / ' + rows.length + ' selected ports finished. Unchecked ports have no result.', at: times.cancel });
      const challenge = text('portFeedback');
      if (/^\d\/3 correct\./.test(challenge)) actions.push({ label: 'Checked the evidence-interpretation questions', result: challenge, at: times.challenge });
      return {
        status: complete ? 'completed' : cancelled ? 'cancelled' : actions.length ? 'in-progress' : 'not-performed', startedAt, completedAt,
        summary: scanStatus + '. Only completed preset replies appear in the evidence. ' + (challenge ? 'Interpretation feedback is recorded below when available.' : 'The interpretation questions have not been checked.'),
        actions, findings,
        metrics: [{ label: 'Selected fictional target', value: targetName() }, { label: 'Completed probes', value: checked + ' / ' + rows.length }, { label: 'Open / closed / filtered', value: text('portOpenCount') + ' / ' + text('portClosedCount') + ' / ' + text('portFilteredCount') }],
        limitations: ['A completed simulation status describes the scan playback. Interpretation-question results are recorded separately.', 'A filtered or unchecked port has no confirmed open/closed finding. Only the selected preset ports are covered.']
      };
    }
    const report = LabReport.mount({ labId: 'port', mountTo: mountPoint(), getSnapshot: snapshot });
    byId('portFindIp').addEventListener('click', () => { times.ip = now(); startedAt = startedAt || times.ip; });
    byId('portFindNetwork').addEventListener('click', () => { times.network = now(); });
    byId('portStart').addEventListener('click', () => { clearScan(); scanStartedAt = now(); startedAt = startedAt || scanStartedAt; });
    byId('portCancel').addEventListener('click', () => { times.cancel = now(); });
    byId('portCheck').addEventListener('click', () => { times.challenge = now(); });
    byId('portReset').addEventListener('click', () => { clearScan(); startedAt = ''; for (const key of Object.keys(times)) delete times[key]; report.reset(); });
    ['portTarget', 'portProfile'].forEach(id => byId(id).addEventListener('change', clearScan));
    byId('portLookupAddress').addEventListener('input', clearScan);
    byId('portFindHost').addEventListener('click', clearScan);
    byId('portDiscoveredHosts').addEventListener('click', event => { if (event.target.closest('button')) clearScan(); });
    new MutationObserver(() => {
      for (const row of byId('portRows').querySelectorAll('tr')) {
        const cells = [...row.querySelectorAll('td')].map(cell => cell.textContent.trim());
        if (cells.length === 3 && /^(Open|Closed|Filtered)$/.test(cells[2]) && !rowTimes[cells[0]]) rowTimes[cells[0]] = now();
      }
      if (/Scan complete/.test(text('portStatus')) && !completedAt) completedAt = now();
    }).observe(byId('ports'), { childList: true, subtree: true, characterData: true });
  }
  if (byId('pwInput')) {
    let startedAt = '', checkedAt = '', comparison = null, generationCount = 0, generationAt = '';
    const flagLabels = {
      common: 'matches a classroom common example',
      repeated: 'three identical characters in a row',
      sequence: 'contains a short classroom sequence'
    };
    function recordStart() { startedAt = startedAt || now(); }
    function observedLength(value) {
      const length = /^\d+$/.test(value || '') ? Number(value) : 0;
      return Number.isSafeInteger(length) && length > 0 ? length : 0;
    }
    function observedFlags(value) {
      if (typeof value !== 'string') return null;
      const flags = value ? value.split(',') : [];
      if (flags.some(flag => !Object.prototype.hasOwnProperty.call(flagLabels, flag)) || new Set(flags).size !== flags.length) return null;
      return flags.length ? flags.map(flag => flagLabels[flag]).join('; ') : 'none spotted by the tiny check (not proof of safety)';
    }
    function snapshot() {
      const actions = [], metrics = [], findings = [];
      // Only derived lengths and allowlisted flag codes are read. Never inspect
      // pwInput/cmpA/cmpB values or generatedOut text, including shown passwords.
      const length = observedLength(text('pwLength'));
      const observation = byId('pwObservations').dataset;
      const flags = observedFlags(observation.flags);
      if (checkedAt && observation.state === 'observed' && length && flags !== null) {
        actions.push({ label: 'Observed an invented password example locally', result: 'Length: ' + length + ' Unicode code points. Classroom flags: ' + flags + '. Uniqueness and breach status are unknown. The password is omitted.', at: checkedAt });
        metrics.push({ label: 'Example length (Unicode code points)', value: length }, { label: 'Tiny classroom pattern check', value: flags }, { label: 'Uniqueness and breach status', value: 'Unknown; not checked' });
        findings.push({ title: 'Limited local password observations', evidence: 'The current invented example has ' + length + ' characters. Classroom flags: ' + flags + '.', risk: 'Length and these few pattern flags cannot establish security. A full common or compromised-password blocklist, account protections, and reuse were not checked.', recommendation: 'Use long, unique passwords, a password manager, and phishing-resistant MFA where supported. Reaching a length minimum is not a security guarantee.' });
      }
      if (comparison && byId('compareOut').dataset.state === 'compared') actions.push(comparison);
      if (generationCount) actions.push({ label: 'Generated local teaching examples', result: generationCount + ' example-generation action(s). All generated strings are omitted. The small demo generator is not suitable for real accounts.', at: generationAt });
      return {
        status: actions.length ? 'in-progress' : 'not-performed', startedAt: actions.length ? startedAt : '', actions, findings, metrics,
        summary: 'Open-ended local password-awareness exercise. Only current sample observations and the latest current comparison are summarized. There is no required completion test or security rating.',
        limitations: ['No password values, generated strings, credential hashes, or real-account data are exported.', 'The tiny classroom checks do not perform a full common or compromised-password blocklist check. Uniqueness, reuse, and breach status are unknown.', 'There is no security score, entropy calculation, or cracking-time estimate. Character-type mixtures do not earn a rating.', 'Generation alone does not inspect an example. Comparison evidence is included only after Compare succeeds and is invalidated when either input changes.']
      };
    }
    const report = LabReport.mount({ labId: 'password', mountTo: mountPoint(), getSnapshot: snapshot });
    byId('pwInput').addEventListener('input', () => {
      checkedAt = byId('pwObservations').dataset.state === 'observed' ? now() : '';
      if (checkedAt) recordStart();
      else if (!comparison && !generationCount) startedAt = '';
    });
    ['genPw', 'genPhrase'].forEach(id => byId(id).addEventListener('click', () => { generationCount += 1; generationAt = now(); recordStart(); }));
    byId('compareBtn').addEventListener('click', () => {
      const output = byId('compareOut').dataset;
      const firstLength = observedLength(output.lengthA), secondLength = observedLength(output.lengthB);
      const firstFlags = observedFlags(output.flagsA), secondFlags = observedFlags(output.flagsB);
      if (output.state !== 'compared' || !firstLength || !secondLength || firstFlags === null || secondFlags === null) { comparison = null; return; }
      comparison = { label: 'Compared two invented examples locally', result: 'Sample A: ' + firstLength + ' characters; classroom flags: ' + firstFlags + '. Sample B: ' + secondLength + ' characters; classroom flags: ' + secondFlags + '. No security ranking is inferred. Uniqueness and breach status are unknown. Both values are omitted.', at: now() };
      recordStart();
    });
    ['cmpA', 'cmpB'].forEach(id => byId(id).addEventListener('input', () => {
      comparison = null;
      if (!checkedAt && !generationCount) startedAt = '';
    }));
    byId('clearPw').addEventListener('click', () => { checkedAt = ''; generationCount = 0; generationAt = ''; if (!comparison) startedAt = ''; report.reset(); });
    byId('pwResetLesson').addEventListener('click', () => { startedAt = checkedAt = generationAt = ''; comparison = null; generationCount = 0; report.reset(); });
  }
})();
