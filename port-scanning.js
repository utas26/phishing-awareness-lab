/* Educational playback only: no sockets, fetches, commands, or arbitrary targets. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  if (!byId('portTarget')) return;
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
  const lookupAddress = byId('portLookupAddress'), findHost = byId('portFindHost'), lookupStatus = byId('portLookupStatus');
  let lookupPending = false;
  let timer = null, run = 0, running = false, completed = false, checked = 0;
  let scanPorts = [], currentTarget = targets.web, counts = { open: 0, closed: 0, filtered: 0 };
  const network = { ipFound: false, ready: false, discovering: false, timer: null, run: 0 };
  const hostButtons = [];

  function resetNetwork() {
    clearTimeout(network.timer); network.run += 1;
    network.ipFound = network.ready = network.discovering = false;
    network.timer = null;
    byId('portFindIp').disabled = false;
    byId('portFindNetwork').disabled = true;
    byId('portCancelNetwork').hidden = true;
    byId('portIpOutput').hidden = byId('portNetworkOutput').hidden = true;
    byId('portDiscoveredHosts').replaceChildren(); hostButtons.length = 0;
    byId('portNetworkStatus').textContent = 'Start with Find my IP to reveal your virtual lab address.';
    byId('portScanHint').textContent = 'Complete the two discovery steps to unlock the scan controls.';
    lookupPending = false; if (!targets[target.value]) target.value = 'web'; lookupAddress.value = ''; lookupAddress.removeAttribute('aria-invalid');
    lookupAddress.disabled = findHost.disabled = true;
    setLookupStatus('Complete network discovery to look up a virtual device.');
  }
  function findIp() {
    if (network.ipFound) return;
    network.ipFound = true;
    byId('portIpOutput').hidden = false;
    byId('portFindIp').disabled = true;
    byId('portFindNetwork').disabled = false;
    byId('portNetworkStatus').textContent = 'Virtual learner IP: 192.0.2.50, subnet mask 255.255.255.0. Next, find your network IP.';
  }
  function findNetwork() {
    if (!network.ipFound || network.discovering || network.ready || running) return;
    network.discovering = true; network.run += 1;
    const token = network.run;
    byId('portFindNetwork').disabled = true;
    byId('portCancelNetwork').hidden = false;
    byId('portNetworkOutput').hidden = false;
    byId('portDiscoveredHosts').replaceChildren(); hostButtons.length = 0;
    byId('portNetworkStatus').textContent = 'Network calculated: 192.0.2.0/24. Simulating host discovery… 0 / 2 hosts.';
    function discover(index) {
      network.timer = setTimeout(() => {
        if (!network.discovering || token !== network.run) return;
        const key = ['web', 'workstation'][index], host = targets[key];
        const card = document.createElement('div'), info = document.createElement('div');
        card.className = 'port-host';
        const name = document.createElement('strong'), address = document.createElement('small');
        name.textContent = host.name; address.textContent = host.address + ' · virtual host';
        info.appendChild(name); info.appendChild(address); card.appendChild(info);
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'btn alt'; button.textContent = 'Use this host';
        button.setAttribute('aria-label', 'Use ' + host.name); button.disabled = true;
        button.addEventListener('click', () => { if (!network.ready || running) return; target.value = key; selectPresetTarget(); byId('portScanHint').textContent = host.name + ' selected. Choose ports and start the simulated scan.'; });
        hostButtons.push(button); card.appendChild(button); byId('portDiscoveredHosts').appendChild(card);
        byId('portNetworkStatus').textContent = 'Simulated discovery: ' + (index + 1) + ' / 2 hosts found on 192.0.2.0/24.';
        if (index === 0) discover(1);
        else {
          network.discovering = false; network.ready = true; network.timer = null;
          byId('portCancelNetwork').hidden = true;
          byId('portNetworkStatus').textContent = 'Discovery complete: 2 fictional hosts found on 192.0.2.0/24. Your learner computer is 192.0.2.50; no real network was contacted.';
          byId('portScanHint').textContent = 'Choose either discovered host below, then start the simulated scan.';
          setLookupStatus('Enter 192.0.2.10 or 192.0.2.20 to find a preset device, or use the target selector.');
          lockControls(false); setStatus('Ready to scan');
        }
      }, 650);
    }
    discover(0);
  }
  function cancelDiscovery() {
    if (!network.discovering) return;
    clearTimeout(network.timer); network.timer = null; network.run += 1; network.discovering = false;
    byId('portFindNetwork').disabled = false; byId('portCancelNetwork').hidden = true;
    byId('portNetworkStatus').textContent = 'Discovery cancelled. Click Find my network IP again to finish discovering the virtual hosts.';
  }
  function resetLab() { resetNetwork(); prepare(); }

  function setLookupStatus(message, type = '') {
    lookupStatus.textContent = message;
    lookupStatus.className = 'port-lookup-status' + (type ? ' ' + type : '');
  }
  function selectPresetTarget() {
    if (!network.ready || running || !targets[target.value]) return;
    lookupPending = false;
    lookupAddress.value = targets[target.value].address;
    lookupAddress.removeAttribute('aria-invalid');
    prepare();
    setLookupStatus('Selected ' + currentTarget.name + ' · ' + currentTarget.address + '. Ready for a simulated scan; no real device is contacted.', 'success');
  }
  function addressEdited() {
    if (!network.ready || running) return;
    lookupPending = true; target.value = '';
    lookupAddress.removeAttribute('aria-invalid');
    prepare();
    setLookupStatus('Address edited. Choose Find virtual host before scanning. Previous scan results have been cleared.');
  }
  function findVirtualHost() {
    if (!network.ready || network.discovering || running) return;
    const address = lookupAddress.value.trim();
    lookupPending = true; target.value = '';
    prepare();
    let message = '';
    if (!/^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(address) || address.split('.').some(octet => Number(octet) > 255)) {
      message = 'Enter a valid IPv4 address in dotted-decimal form, without leading zeros, a URL, port, or subnet suffix. Nothing was looked up or scanned.';
    } else if (!address.startsWith('192.0.2.')) {
      message = 'That address is outside the virtual lab 192.0.2.0/24. It was not contacted or scanned. Use 192.0.2.10 or 192.0.2.20.';
    } else if (address === '192.0.2.0' || address === '192.0.2.255') {
      message = 'That is the virtual network or broadcast address, not a device target. Nothing was scanned.';
    } else if (address === '192.0.2.50') {
      message = 'That is your fictional learner computer, not one of the two preset scan targets. Nothing was scanned. Use 192.0.2.10 or 192.0.2.20.';
    } else {
      const match = Object.keys(targets).find(key => targets[key].address === address);
      if (match) {
        target.value = match;
        selectPresetTarget();
        setLookupStatus('Found preset virtual device: ' + currentTarget.name + ' · ' + currentTarget.address + '. Choose Start simulated scan. No real network lookup was made.', 'success');
        byId('portScanHint').textContent = currentTarget.name + ' selected by virtual IP. Choose ports and start the simulated scan.';
        return;
      }
      message = 'No preset virtual device exists at ' + address + '. No real network lookup or scan was made. Try 192.0.2.10 or 192.0.2.20.';
    }
    lookupAddress.setAttribute('aria-invalid', 'true');
    setLookupStatus(message, 'error');
    setStatus('No valid virtual target selected for this address · not scanned');
  }

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
    target.disabled = profile.disabled = speed.disabled = locked || !network.ready;
    lookupAddress.disabled = findHost.disabled = locked || !network.ready;
    start.disabled = locked || !network.ready || lookupPending || !targets[target.value];
    hostButtons.forEach(button => { button.disabled = locked || !network.ready; });
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
    currentTarget = targets[target.value] || currentTarget;
    scanPorts = ports.map((port, index) => ({ ...port, state: currentTarget.states[index] }))
      .filter(port => profile.value === 'common' || port.number === 80 || port.number === 443);
    byId('portTargetNote').textContent = lookupPending ? 'No device selected for the entered address. Find a preset virtual host or use the discovered-target selector.' : currentTarget.note + ' These 192.0.2.x addresses are reserved for documentation.';
    byId('portCommand').textContent = lookupPending ? 'Find a preset virtual host or choose a discovered target to see the example command.' : 'nmap -sT -Pn -p ' + scanPorts.map(port => port.number).join(',') + ' ' + currentTarget.address;
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
    setStatus(network.ready ? (lookupPending ? 'Find a virtual host before scanning' : 'Ready to scan') : 'Waiting for virtual network discovery');
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
    if (running || !network.ready || lookupPending || !targets[target.value]) return;
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
  reset.addEventListener('click', resetLab);
  byId('portFindIp').addEventListener('click', findIp);
  byId('portFindNetwork').addEventListener('click', findNetwork);
  byId('portCancelNetwork').addEventListener('click', cancelDiscovery);
  target.addEventListener('change', selectPresetTarget);
  lookupAddress.addEventListener('input', addressEdited);
  findHost.addEventListener('click', findVirtualHost);
  lookupAddress.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); findVirtualHost(); } });
  profile.addEventListener('change', prepare);
  byId('portCheck').addEventListener('click', checkFindings);
  window.addEventListener('pagehide', () => { cancelScan(); cancelDiscovery(); });
  window.addEventListener('hashchange', () => { if (location.hash !== '#ports') { cancelScan(); cancelDiscovery(); } });
  resetLab();
})();
