/* Educational playback only: no sockets, fetches, commands, or arbitrary targets. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const ports = [
    { number: 21, service: 'FTP' }, { number: 22, service: 'SSH' },
    { number: 25, service: 'SMTP' }, { number: 53, service: 'DNS' },
    { number: 80, service: 'HTTP' }, { number: 443, service: 'HTTPS' },
    { number: 3306, service: 'MySQL' }, { number: 3389, service: 'RDP' }
  ];
  const targets = {
    web: {
      name: 'Campus web server', address: '192.0.2.10',
      note: 'Fictional campus website. Web traffic is allowed; administrative and database access is restricted.',
      states: ['closed', 'filtered', 'filtered', 'closed', 'open', 'open', 'filtered', 'closed'],
      debrief: 'Web services on TCP 80 and 443 are expected here. Check that HTTP redirects to HTTPS, keep the web software updated, and restrict administrative and database access. A port scan alone cannot verify encryption, patch levels, or a compromise.'
    },
    workstation: {
      name: 'Staff workstation', address: '192.0.2.20',
      note: 'Fictional staff computer. Remote administration is listening; web and mail services are not in use.',
      states: ['closed', 'open', 'closed', 'closed', 'closed', 'closed', 'filtered', 'open'],
      debrief: 'SSH on TCP 22 and RDP on TCP 3389 represent remote administration in this scenario. Verify they are needed, restrict who can reach them, use strong authentication, and keep them updated. The web-only profile cannot tell you about ports it did not check.'
    }
  };
  const target = byId('portTarget'), profile = byId('portProfile'), speed = byId('portSpeed');
  const start = byId('portStart'), cancel = byId('portCancel'), reset = byId('portReset');
  const status = byId('portStatus'), progress = byId('portProgress'), log = byId('portLog');
  const questions = byId('portQuestions'), feedback = byId('portFeedback');
  let timer = null, run = 0, running = false, completed = false, checked = 0;
  let scanPorts = [], currentTarget = targets.web, counts = { open: 0, closed: 0, filtered: 0 };

  function setStatus(message) { status.textContent = message; }
  function appendLog(message) { log.textContent += '\n' + message; log.scrollTop = log.scrollHeight; }
  function updateProgress() {
    progress.value = checked;
    byId('portProgressText').textContent = checked + ' / ' + scanPorts.length + ' ports';
    for (const state of ['open', 'closed', 'filtered']) {
      byId('port' + state[0].toUpperCase() + state.slice(1) + 'Count').textContent = counts[state];
    }
  }
  function lockControls(locked) {
    target.disabled = profile.disabled = speed.disabled = start.disabled = locked;
    cancel.disabled = !locked;
    byId('portConnection').classList.toggle('is-scanning', locked);
  }
  function stopTimer() {
    run += 1;
    clearTimeout(timer);
    timer = null;
    running = false;
    lockControls(false);
  }
  function setPortState(index, state) {
    const cell = byId('portState' + index);
    cell.textContent = state[0].toUpperCase() + state.slice(1);
    cell.className = 'port-state ' + state;
  }
  function prepare() {
    stopTimer();
    completed = false;
    checked = 0;
    counts = { open: 0, closed: 0, filtered: 0 };
    currentTarget = targets[target.value];
    scanPorts = ports.map((port, index) => ({ ...port, state: currentTarget.states[index] }))
      .filter(port => profile.value === 'common' || port.number === 80 || port.number === 443);
    byId('portTargetNote').textContent = currentTarget.note + ' These 192.0.2.x addresses are reserved for documentation.';
    byId('portCommand').textContent = 'nmap -sT -Pn -p ' + scanPorts.map(port => port.number).join(',') + ' ' + currentTarget.address;
    byId('portRows').replaceChildren();
    scanPorts.forEach((port, index) => {
      const row = document.createElement('tr');
      for (const text of [port.number + '/tcp', port.service]) {
        const cell = document.createElement('td'); cell.textContent = text; row.appendChild(cell);
      }
      const cell = document.createElement('td'), badge = document.createElement('span');
      badge.id = 'portState' + index; badge.className = 'port-state'; badge.textContent = 'Waiting';
      cell.appendChild(badge); row.appendChild(cell); byId('portRows').appendChild(row);
    });
    progress.max = scanPorts.length;
    updateProgress();
    log.textContent = 'Ready. Choose a target, then start the simulated scan.';
    setStatus('Ready to scan');
    start.textContent = 'Start simulated scan';
    questions.disabled = true;
    for (const id of ['portAnswerCount', 'portAnswerFiltered', 'portAnswerRisk']) byId(id).value = '';
    feedback.className = 'feedback'; feedback.replaceChildren();
    byId('portDebrief').hidden = true;
    byId('portChallengeHint').textContent = 'Finish a scan to unlock three quick questions. Use the results above.';
  }
  function finish() {
    stopTimer();
    completed = true;
    start.textContent = 'Run simulation again';
    questions.disabled = false;
    setStatus('Scan complete · ' + scanPorts.length + ' ports checked');
    appendLog('COMPLETE: ' + counts.open + ' open, ' + counts.closed + ' closed, ' + counts.filtered + ' filtered.');
    appendLog('Only the selected ports were checked. All results are simulated.');
    byId('portChallengeHint').textContent = 'Scan complete. Interpret this result below; you can retry without losing your scan.';
    byId('portDebrief').textContent = 'Defensive takeaway: ' + currentTarget.debrief;
    byId('portDebrief').hidden = false;
  }
  function probe(index, token) {
    if (!running || token !== run) return;
    const port = scanPorts[index];
    setPortState(index, 'probing');
    setStatus('Checking TCP ' + port.number + ' · ' + port.service);
    appendLog('> Probing ' + port.number + '/tcp (' + port.service + ')…');
    const delay = { fast: 400, normal: 1000, slow: 2000 }[speed.value];
    timer = setTimeout(() => {
      if (!running || token !== run) return;
      setPortState(index, port.state);
      counts[port.state] += 1; checked += 1;
      const reply = { open: 'Connection accepted', closed: 'Connection refused', filtered: 'No usable reply / blocked' }[port.state];
      appendLog('  ' + port.state.toUpperCase() + ' — ' + reply);
      updateProgress();
      if (checked === scanPorts.length) finish();
      else probe(index + 1, token);
    }, delay);
  }
  function startScan() {
    if (running) return;
    prepare();
    running = true;
    lockControls(true);
    log.textContent = 'SIMULATION ONLY · TCP connect-style scan\nTarget: ' + currentTarget.name + ' (' + currentTarget.address + ')\nNo network traffic is sent.\n';
    probe(0, run);
  }
  function cancelScan() {
    if (!running) return;
    stopTimer();
    setPortState(checked, 'cancelled');
    setStatus('Scan cancelled · partial results only');
    appendLog('CANCELLED: ' + checked + ' of ' + scanPorts.length + ' ports checked. Unchecked ports have no result.');
    start.textContent = 'Restart simulated scan';
    byId('portChallengeHint').textContent = 'This scan was cancelled. Restart and finish a scan to unlock the questions.';
  }
  function checkFindings() {
    if (!completed || running) return;
    const answers = [byId('portAnswerCount').value, byId('portAnswerFiltered').value, byId('portAnswerRisk').value];
    feedback.replaceChildren();
    if (answers.some(answer => answer === '')) {
      feedback.className = 'feedback bad'; feedback.textContent = 'Choose an answer for all three questions first.'; return;
    }
    const correct = [Number(answers[0]) === counts.open, answers[1] === 'unknown', answers[2] === 'review'];
    const score = correct.filter(Boolean).length;
    feedback.className = 'feedback ' + (score === 3 ? 'good' : 'bad');
    const heading = document.createElement('strong');
    heading.textContent = score + '/3 correct. ' + (score === 3 ? 'Lab complete! You read the evidence accurately.' : 'Review the explanations and try again.');
    feedback.appendChild(heading);
    const list = document.createElement('ul');
    [
      'This scan found ' + counts.open + ' open port' + (counts.open === 1 ? '' : 's') + ' among the ' + scanPorts.length + ' checked. Unscanned ports remain unknown.',
      'Filtered means the scanner cannot determine open or closed, often because a firewall blocks the probe or its reply.',
      'An open port means a service is reachable. Review its purpose, access controls, and updates; it does not prove a breach.'
    ].forEach((text, index) => {
      const item = document.createElement('li'); item.textContent = (correct[index] ? 'Correct: ' : 'Recheck: ') + text; list.appendChild(item);
    });
    feedback.appendChild(list);
  }
  start.addEventListener('click', startScan);
  cancel.addEventListener('click', cancelScan);
  reset.addEventListener('click', prepare);
  target.addEventListener('change', prepare);
  profile.addEventListener('change', prepare);
  byId('portCheck').addEventListener('click', checkFindings);
  window.addEventListener('pagehide', cancelScan);
  window.addEventListener('hashchange', () => { if (location.hash !== '#ports') cancelScan(); });
  prepare();
})();
