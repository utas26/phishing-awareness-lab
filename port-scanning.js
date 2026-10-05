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
  let timer = null, run = 0, running = false, paused = false, completed = false, checked = 0;
  let scanPorts = [], currentTarget = targets.web, counts = { open: 0, closed: 0, filtered: 0 };
  const network = { ipFound: false, ready: false, discovering: false, timer: null, run: 0, paused: false, index: 0 };
  const hostButtons = [];
  const motionQuery=typeof window.matchMedia==='function'?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
  const reducedMotion=()=>Boolean(motionQuery&&motionQuery.matches);
  let guideQuiet=false;
  const guide=window.BeginnerGuide?window.BeginnerGuide.mount({mountTo:'#beginnerGuideMount',title:'Check the doors of a fictional computer',intro:'A computer can offer different services through numbered “ports”, like doors into a building. A scan asks how each selected door responds. An open door means a service answered, not that someone broke in.',steps:[{title:'Find your lab',text:'Reveal the pretend learner address, then discover its two preset devices.'},{title:'Choose a device',text:'Select a fictional target and the ports you want to check.'},{title:'Watch each reply',text:'Pause or use Next port to inspect one reply at a time.'},{title:'Read the evidence',text:'Separate open, closed and unknown results. Only checked ports count.'}]}):null;
  function updateGuide(){if(!guide)return;const done=[];if(network.ready)done.push(0);if(running||checked||completed)done.push(1);if(completed)done.push(2);if(/^3\/3 correct\./.test(feedback.textContent))done.push(3);let caption,action;
    if(!network.ipFound){caption='Start by revealing your fictional learner address. No real IP address is detected.';action={id:'portFindIp',label:'Find the first control'};}
    else if(!network.ready){caption=network.discovering?(network.paused?'Discovery is paused. Next host reveals exactly one preset device.':'Discovering two preset devices. You can pause and use Next host to go slowly.'):'Your pretend address is known. Find my network IP reveals the group of addresses and its two preset devices.';action={id:network.discovering?(network.paused?'portStepNetwork':'portPauseNetwork'):'portFindNetwork',label:network.discovering?'Find discovery playback controls':'Find the network control'};}
    else if(lookupPending||!targets[target.value]){caption='The address has not matched a preset device. Find a valid virtual host before scanning; no external address is contacted.';action={id:'portFindHost',label:'Find the virtual-host lookup'};}
    else if(completed){caption='All '+scanPorts.length+' selected ports have a preset reply. Open means a service answered; closed means it refused; filtered means its open/closed state is unknown. Check your interpretation below.';action={id:'portCheck',label:'Find the evidence questions'};}
    else if(running){const last=checked?scanPorts[checked-1]:null;caption=(paused?'Paused. Use Next port for one reply. ':'Replies are arriving. Pause to inspect them. ')+(last?'Latest reply: TCP '+last.number+' is '+last.state+'. ':'No port reply has completed yet. ')+checked+' of '+scanPorts.length+' selected ports have results.';action={id:paused?'portStep':'portPause',label:paused?'Find Next port':'Find Pause scan'};}
    else {caption=checked?'This run stopped early. Only '+checked+' ports have results; the others are untested. Restart the scan to finish.':'Choose the campus server or staff computer, then Start simulated scan. The displayed command is only an illustration.';action={id:'portStart',label:checked?'Find Restart simulated scan':'Find Start simulated scan'};}
    guide.update({step:completed?3:network.ready?(running||checked?2:1):0,completed:done,status:completed?'Scan complete; interpret the result':running?(paused?'Paused':'Simulated scan running'):network.discovering?'Preset discovery in progress':checked?'Partial scan':'Ready',caption,nodes:[{label:'YOUR VIRTUAL LAB',value:network.ready?'192.0.2.0/24 · 2 preset devices':network.ipFound?'192.0.2.50 revealed':'Not revealed',tone:network.ready?'good':'neutral'},{label:'TARGET',value:network.ready&&!lookupPending&&targets[target.value]?currentTarget.name:'No confirmed target',tone:network.ready&&!lookupPending?'active':'neutral'},{label:'OBSERVED REPLIES',value:checked?counts.open+' open · '+counts.closed+' closed · '+counts.filtered+' filtered':'No replies yet',tone:completed?'good':checked?'active':'neutral'}],action,eventKey:[network.ipFound,network.ready,network.discovering,network.paused,network.index,running,paused,checked,completed,lookupPending,target.value,profile.value,feedback.textContent].join(':'),animate:!guideQuiet});
  }
  function discoveryControls(){byId('portPauseNetwork').hidden=byId('portStepNetwork').hidden=!network.discovering;byId('portPauseNetwork').textContent=network.paused?'Resume discovery':'Pause discovery';byId('portStepNetwork').disabled=!network.discovering||!network.paused;updateGuide();}
  function scheduleDiscovery(){clearTimeout(network.timer);network.timer=null;if(!network.discovering||network.paused)return;const token=++network.run;network.timer=setTimeout(()=>{if(token!==network.run||!network.discovering||network.paused)return;advanceDiscovery();},650);}
  function advanceDiscovery(){if(!network.discovering||network.index>=2)return;network.timer=null;const index=network.index++,key=['web','workstation'][index],host=targets[key];
    const card=document.createElement('div'),info=document.createElement('div');card.className='port-host';const name=document.createElement('strong'),address=document.createElement('small');name.textContent=host.name;address.textContent=host.address+' · virtual host';info.appendChild(name);info.appendChild(address);card.appendChild(info);
    const button=document.createElement('button');button.type='button';button.className='btn alt';button.textContent='Use this host';button.setAttribute('aria-label','Use '+host.name);button.disabled=true;button.addEventListener('click',()=>{if(!network.ready||running)return;target.value=key;selectPresetTarget();byId('portScanHint').textContent=host.name+' selected. Choose ports and start the simulated scan.';updateGuide();});hostButtons.push(button);card.appendChild(button);byId('portDiscoveredHosts').appendChild(card);
    byId('portNetworkStatus').textContent='Simulated discovery: '+network.index+' / 2 hosts found on 192.0.2.0/24.';
    if(network.index===2){network.discovering=false;network.ready=true;network.paused=false;byId('portCancelNetwork').hidden=true;byId('portNetworkStatus').textContent='Discovery complete: 2 fictional hosts found on 192.0.2.0/24. Your learner computer is 192.0.2.50; no real network was contacted.';byId('portScanHint').textContent='Choose either discovered host below, then start the simulated scan.';setLookupStatus('Enter 192.0.2.10 or 192.0.2.20 to find a preset device, or use the target selector.');lockControls(false);setStatus('Ready to scan');}else scheduleDiscovery();discoveryControls();
  }
  function pauseDiscovery(){if(!network.discovering)return;network.run++;clearTimeout(network.timer);network.timer=null;network.paused=!network.paused;byId('portNetworkStatus').textContent=(network.paused?'Discovery paused':'Discovery resumed')+' · '+network.index+' / 2 preset hosts found.';if(!network.paused)scheduleDiscovery();discoveryControls();}
  function stepDiscovery(){if(!network.discovering||!network.paused)return;network.run++;clearTimeout(network.timer);network.timer=null;advanceDiscovery();}


  function resetNetwork() {
    clearTimeout(network.timer); network.run += 1;
    network.ipFound = network.ready = network.discovering = false;
    network.timer = null; network.paused=false; network.index=0;
    byId('portFindIp').disabled = false;
    byId('portFindNetwork').disabled = true;
    byId('portCancelNetwork').hidden = true;
    byId('portIpOutput').hidden = byId('portNetworkOutput').hidden = true;
    byId('portDiscoveredHosts').replaceChildren(); hostButtons.length = 0;
    byId('portNetworkStatus').textContent = 'Start with Find my IP to reveal your virtual lab address.';
    byId('portScanHint').textContent = 'Complete the two discovery steps to unlock the scan controls.';
    lookupPending = false; if (!targets[target.value]) target.value = 'web'; lookupAddress.value = ''; lookupAddress.removeAttribute('aria-invalid');
    lookupAddress.disabled = findHost.disabled = true;
    setLookupStatus('Complete network discovery to look up a virtual device.');discoveryControls();
  }
  function findIp() {
    if (network.ipFound) return;
    network.ipFound = true;
    byId('portIpOutput').hidden = false;
    byId('portFindIp').disabled = true;
    byId('portFindNetwork').disabled = false;
    byId('portNetworkStatus').textContent = 'Virtual learner IP: 192.0.2.50, subnet mask 255.255.255.0. Next, find your network IP.';updateGuide();
  }
  function findNetwork() {
    if(!network.ipFound||network.discovering||network.ready||running)return;
    network.discovering=true;network.paused=reducedMotion();network.index=0;network.run++;
    byId('portFindNetwork').disabled=true;byId('portCancelNetwork').hidden=false;byId('portNetworkOutput').hidden=false;byId('portDiscoveredHosts').replaceChildren();hostButtons.length=0;
    byId('portNetworkStatus').textContent=network.paused?'Network calculated: 192.0.2.0/24. Reduced-motion playback is paused; use Next host.':'Network calculated: 192.0.2.0/24. Simulating host discovery… 0 / 2 hosts.';
    scheduleDiscovery();discoveryControls();
  }
  function cancelDiscovery() {
    if (!network.discovering) return;
    clearTimeout(network.timer); network.timer = null; network.run += 1; network.discovering = false;
    byId('portFindNetwork').disabled = false; byId('portCancelNetwork').hidden = true;
    byId('portNetworkStatus').textContent = 'Discovery cancelled. Click Find my network IP again to finish discovering the virtual hosts.';network.paused=false;discoveryControls();
  }
  function resetLab() { guideQuiet=true;resetNetwork(); prepare();guideQuiet=false; }

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

  function setStatus(message) { status.textContent = message;updateGuide(); }
  function appendLog(message) { log.textContent += '\n' + message; log.scrollTop = log.scrollHeight; }
  function updateProgress() {
    progress.value = checked;
    byId('portProgressText').textContent = checked + ' / ' + scanPorts.length + ' ports';
    for (const state of ['open', 'closed', 'filtered']) {
      byId('port' + state[0].toUpperCase() + state.slice(1) + 'Count').textContent = counts[state];
    }updateGuide();
  }
  function lockControls(locked) {
    target.disabled = profile.disabled = speed.disabled = locked || !network.ready;
    lookupAddress.disabled = findHost.disabled = locked || !network.ready;
    start.disabled = locked || !network.ready || lookupPending || !targets[target.value];
    hostButtons.forEach(button => { button.disabled = locked || !network.ready; });
    cancel.disabled = !locked;
    byId('portConnection').classList.toggle('is-scanning', locked&&!paused);byId('portPause').disabled=!locked;byId('portPause').textContent=paused?'Resume scan':'Pause scan';byId('portStep').disabled=!locked||!paused;updateGuide();
  }
  function stopTimer() {
    run += 1;
    clearTimeout(timer);
    timer = null;
    running = false;paused=false;
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
    byId('portChallengeHint').textContent = 'Finish a scan to unlock three quick questions. Use the results above.';updateGuide();
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
    byId('portDebrief').hidden = false;updateGuide();
  }
  function resolveProbe(index,token){if(!running||token!==run||index!==checked)return;timer=null;const port=scanPorts[index];setPortState(index,port.state);counts[port.state]++;checked++;const reply={open:'Connection accepted',closed:'Connection refused',filtered:'No usable reply / blocked'}[port.state];appendLog('  '+port.state.toUpperCase()+' — '+reply);updateProgress();if(checked===scanPorts.length)finish();else if(!paused)probe(checked,token);else setStatus('Paused · '+checked+' / '+scanPorts.length+' replies shown. Use Next port.');}
  function probe(index, token) {
    if(!running||token!==run||index!==checked)return;const port=scanPorts[index];setPortState(index,'probing');setStatus((paused?'Paused before reply: ':'Checking ')+'TCP '+port.number+' · '+port.service);appendLog('> Probing '+port.number+'/tcp ('+port.service+')…');if(paused)return;
    const delay={fast:400,normal:1000,slow:2000}[speed.value];timer=setTimeout(()=>resolveProbe(index,token),delay);
  }
  function startScan(manual=false) {
    if(running||!network.ready||lookupPending||!targets[target.value])return;prepare();running=true;paused=manual;lockControls(true);log.textContent='SIMULATION ONLY · TCP connect-style scan\nTarget: '+currentTarget.name+' ('+currentTarget.address+')\nNo network traffic is sent.\n';probe(0,run);
  }
  function pauseScan(){if(!running)return;run++;clearTimeout(timer);timer=null;paused=!paused;lockControls(true);if(paused)setStatus('Scan paused · '+checked+' / '+scanPorts.length+' replies shown. Use Next port or Resume.');else probe(checked,run);}
  function stepScan(){if(!running||!paused)return;run++;clearTimeout(timer);timer=null;const index=checked;setPortState(index,'probing');appendLog('> One-step probe '+scanPorts[index].number+'/tcp');resolveProbe(index,run);}
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
  start.addEventListener('click',()=>startScan(reducedMotion()));byId('portPause').addEventListener('click',pauseScan);byId('portStep').addEventListener('click',stepScan);byId('portPauseNetwork').addEventListener('click',pauseDiscovery);byId('portStepNetwork').addEventListener('click',stepDiscovery);
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
  byId('portCheck').addEventListener('click',()=>{checkFindings();updateGuide();});
  window.addEventListener('pagehide', () => { cancelScan(); cancelDiscovery(); });
  window.addEventListener('hashchange', () => { if (location.hash !== '#ports') { cancelScan(); cancelDiscovery(); } });
  if(motionQuery&&typeof motionQuery.addEventListener==='function')motionQuery.addEventListener('change',event=>{if(event.matches){if(running&&!paused)pauseScan();if(network.discovering&&!network.paused)pauseDiscovery();}});
  resetLab();
})();
