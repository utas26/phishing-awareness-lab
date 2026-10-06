/* Invented examples only. Observations stay in this page; no network requests. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const pw = byId('pwInput');
  if (!pw) return;
  const show = byId('showPw'), lengthEl = byId('pwLength'), patternsEl = byId('pwPatterns');
  const observations = byId('pwObservations'), comparisonOut = byId('compareOut');
  // A tiny teaching fixture, not a production or breached-password blocklist.
  // Whole-example matching is separate from the illustrative pattern flags.
  const classroomExamples = new Set(['password', 'password123', 'welcome123', 'qwerty', '123456', 'admin', 'letmein', '111111', '000000']);
  const patternLabels = {
    common: 'Matches a classroom common example',
    repeated: 'Three identical characters in a row',
    sequence: 'Contains a short classroom sequence'
  };
  let current = null, guideComparison = false, guideGenerated = false, guideEvent = 0;
  const guide = window.BeginnerGuide ? window.BeginnerGuide.mount({
    mountTo: '#beginnerGuideMount', title: 'Observe an invented password',
    intro: 'Length and unpredictable choices matter. Inspect a supplied sample, then compare a change. These observations cannot establish that a password is safe or unique.',
    steps: [
      { title: 'Try an example', text: 'Choose a supplied sample or type an invented one.' },
      { title: 'Compare a change', text: 'Observe length and limited pattern flags for two samples.' },
      { title: 'Use a safe habit', text: 'Use long, unique passwords, a password manager, and phishing-resistant MFA where supported.' }
    ]
  }) : null;

  function inspectSample(value) {
    const lower = value.toLowerCase(), flags = [];
    if (classroomExamples.has(lower)) flags.push('common');
    if (/(.)\1\1/u.test(lower)) flags.push('repeated');
    if (/1234|4321|abcd|dcba|qwer|asdf/.test(lower)) flags.push('sequence');
    return { length: Array.from(value).length, flags };
  }
  function flagText(result) {
    return result.flags.length ? result.flags.map(flag => patternLabels[flag]).join('; ') : 'None spotted by this tiny check';
  }
  function lengthContext(length) {
    if (length < 8) return 'Below both NIST verifier length minimums: 15 for single-factor passwords; 8 when used only as part of MFA.';
    if (length < 15) return 'At least 8 but below 15 characters: within the shorter length NIST permits only when the password is part of MFA. This is not an account or security check.';
    return 'At least 15 characters: reaches the NIST single-factor length minimum. Length alone does not make a password secure.';
  }
  function updateGuide(reason = '', animate = true) {
    if (!guide) return;
    const completed = [];
    if (current) completed.push(0);
    if (guideComparison) completed.push(1);
    let caption = current
      ? 'The current invented sample has ' + current.length + ' characters. The tiny classroom check cannot verify uniqueness or breach status. Compare a change to observe the difference.'
      : 'Choose a provided example, or type an invented sample. Do not use a real password.';
    if (guideComparison) caption = 'The comparison below is current. Length and a few pattern flags are observations, not a security ranking. Use a different long, unique password for each real account.';
    if (reason === 'generated') caption = 'A classroom example was generated below, not evaluated. Its small teaching generator is not suitable for real accounts. Current sample observations, if any, describe only the input above.';
    if (reason === 'missing') caption = 'The comparison needs two invented examples. Load the provided pair, then press Compare.';
    if (reason === 'changed') caption = 'The comparison inputs changed. Press Compare again to observe these inputs. The previous comparison is no longer current.';
    guide.update({
      step: guideComparison ? 2 : current ? 1 : 0, completed,
      status: guideComparison ? 'Comparison ready to interpret' : current ? 'Example observed locally' : guideGenerated ? 'Example generated, not evaluated' : 'Ready',
      caption,
      nodes: [
        { label: 'INVENTED SAMPLE', value: current ? current.length + ' characters' : 'No sample observed', tone: current ? 'active' : 'neutral' },
        { label: 'CLASSROOM FLAGS', value: current ? (current.flags.length ? 'Pattern spotted; inspect below' : 'None spotted; safety unknown') : 'Waiting for a sample', tone: current ? 'active' : 'neutral' },
        { label: 'COMPARISON', value: guideComparison ? 'Current observations below' : 'Not compared yet', tone: guideComparison ? 'active' : 'neutral' }
      ],
      action: guideComparison ? undefined : { id: current ? 'pwComparisonDemo' : 'pwShortDemo', label: current ? 'Find provided comparison examples' : 'Find a provided example' },
      eventKey: guideEvent, animate
    });
  }
  function analyze() {
    current = pw.value ? inspectSample(pw.value) : null;
    lengthEl.textContent = current ? current.length : 0;
    patternsEl.textContent = current ? (current.flags.length ? 'Pattern spotted' : 'None spotted') : 'No sample yet';
    observations.dataset.state = current ? 'observed' : 'empty';
    observations.dataset.flags = current ? current.flags.join(',') : '';
    byId('pwLengthContext').textContent = current ? lengthContext(current.length) : 'Choose an invented sample to observe its length.';
    byId('pwPatternDetail').textContent = current ? 'Classroom flags: ' + flagText(current) + '. Uniqueness and breach status remain unknown.' : 'No sample has been checked.';
    guideEvent += 1;
    updateGuide();
  }
  function invalidateComparison(message = 'Examples changed. Press Compare to observe a current result.') {
    guideComparison = false;
    // Delete all previous derived evidence, not just the visible result.
    comparisonOut.dataset.state = 'empty';
    comparisonOut.dataset.lengthA = comparisonOut.dataset.lengthB = '';
    comparisonOut.dataset.flagsA = comparisonOut.dataset.flagsB = '';
    comparisonOut.textContent = message;
    guideEvent += 1;
  }
  function setSample(value) {
    pw.value = value;
    pw.dispatchEvent(new Event('input', { bubbles: true }));
  }
  show.addEventListener('change', () => { pw.type = show.checked ? 'text' : 'password'; });
  pw.addEventListener('input', analyze);
  byId('pwShortDemo').addEventListener('click', () => setSample('welcome123'));
  byId('pwLongDemo').addEventListener('click', () => setSample('River!Cedar8-Moon-Sample'));
  byId('clearPw').addEventListener('click', () => {
    pw.value = '';
    show.checked = false;
    pw.type = 'password';
    guideGenerated = false;
    byId('generatedOut').style.display = 'none';
    byId('generatedOut').textContent = '';
    analyze();
    updateGuide('', false);
  });
  function showGenerated(label, value) {
    const box = byId('generatedOut');
    box.style.display = 'block';
    box.textContent = label + ': ' + value;
    guideGenerated = true;
    guideEvent += 1;
    updateGuide('generated');
  }
  byId('genPw').addEventListener('click', () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_-+=';
    let result = '';
    while (result.length < 16) result += chars[Math.floor(Math.random() * chars.length)];
    showGenerated('Generated demo password', result);
  });
  byId('genPhrase').addEventListener('click', () => {
    const words = ['Blue', 'Falcon', 'Palm', 'Shield', 'Desert', 'Harbor', 'Cloud', 'Cedar', 'Oasis', 'Quartz', 'River', 'Star'];
    const result = [];
    // Sampling without replacement keeps this small classroom generator bounded.
    while (result.length < 4) result.push(words.splice(Math.floor(Math.random() * words.length), 1)[0]);
    showGenerated('Generated demo passphrase', result.join('-'));
  });
  byId('compareBtn').addEventListener('click', () => {
    const a = byId('cmpA').value, b = byId('cmpB').value;
    if (!a || !b) {
      invalidateComparison('Enter both invented passwords first.');
      updateGuide('missing');
      return;
    }
    const first = inspectSample(a), second = inspectSample(b);
    const difference = first.length === second.length
      ? 'Both samples have the same observed length.'
      : 'Sample ' + (first.length > second.length ? 'A' : 'B') + ' is longer by ' + Math.abs(first.length - second.length) + ' character(s).';
    comparisonOut.replaceChildren();
    [
      'Sample A: ' + first.length + ' characters. Classroom flags: ' + flagText(first) + '.',
      'Sample B: ' + second.length + ' characters. Classroom flags: ' + flagText(second) + '.',
      difference + ' This does not determine which password is safer. Uniqueness and breach status are unknown for both.'
    ].forEach(message => { const line = document.createElement('p'); line.textContent = message; comparisonOut.appendChild(line); });
    comparisonOut.dataset.state = 'compared';
    comparisonOut.dataset.lengthA = String(first.length);
    comparisonOut.dataset.lengthB = String(second.length);
    comparisonOut.dataset.flagsA = first.flags.join(',');
    comparisonOut.dataset.flagsB = second.flags.join(',');
    guideComparison = true;
    guideEvent += 1;
    updateGuide();
  });
  ['cmpA', 'cmpB'].forEach(id => byId(id).addEventListener('input', () => {
    invalidateComparison();
    updateGuide('changed');
  }));
  byId('pwComparisonDemo').addEventListener('click', () => {
    byId('cmpA').value = 'welcome123';
    byId('cmpB').value = 'River!Cedar8-Moon-Sample';
    ['cmpA', 'cmpB'].forEach(id => byId(id).dispatchEvent(new Event('input', { bubbles: true })));
    if (guide) guide.update({
      step: 1, completed: current ? [0] : [], status: 'Two provided examples loaded',
      caption: 'The short and longer teaching examples are ready. Press Compare to observe their lengths and pattern flags; loading alone has not compared them.',
      nodes: [
        { label: 'EXAMPLE A', value: 'Provided short sample', tone: 'active' },
        { label: 'EXAMPLE B', value: 'Provided longer sample', tone: 'active' },
        { label: 'RESULT', value: 'Not compared yet', tone: 'neutral' }
      ], action: { id: 'compareBtn', label: 'Find the Compare control' }, eventKey: guideEvent
    });
  });
  byId('pwResetLesson').addEventListener('click', () => {
    ['cmpA', 'cmpB'].forEach(id => {
      byId(id).value = '';
      byId(id).dispatchEvent(new Event('input', { bubbles: true }));
    });
    invalidateComparison('Enter two invented passwords and click Compare.');
    byId('clearPw').click();
    updateGuide('', false);
  });
  observations.dataset.state = 'empty';
  observations.dataset.flags = '';
  invalidateComparison('Enter two invented passwords and click Compare.');
  updateGuide('', false);
})();
