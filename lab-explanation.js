/* Optional narrated diagrams, independent of lab engines and recorded evidence.
 * All examples are authored classroom illustrations. No network or storage APIs.
 */
(() => {
  'use strict';
  const scene = (title, action, result, why, from, middle, to) => ({ title, action, result, why, nodes: [from, middle, to] });
  const lessons = {
    'phishing.html': { target: 'verifyBtn', goal: 'Spot pressure in a message and choose a trusted way to sign in.', scenes: [
      scene('A message tries to rush you', 'Read the fictional email before pressing its button.', 'It threatens an account suspension and asks for immediate action.', 'Urgency can push you to act before checking. A familiar logo or sender name is not proof.', 'Unexpected email', 'Pressure to act', 'Pause and check'),
      scene('Check where the link leads', 'Compare the sender and the actual destination with the service you expected.', 'The exercise uses made-up .example addresses, not a university sign-in.', 'A link can look familiar while pointing somewhere else. The address is evidence to inspect.', 'Familiar-looking text', 'Different destination', 'Do not trust the label'),
      scene('See the fictional login trap', 'In this classroom exercise, open Stage 2 to inspect its supplied demo fields.', 'The imitation page shows how a copied login can ask for information.', 'Real phishing can steal entered details. This exercise uses fixed examples; never enter a real password.', 'Imitation page', 'Demo fields only', 'Understand the risk'),
      scene('Take the safer route', 'For a real unexpected message, open your saved bookmark or the official app yourself.', 'You can check your account without using the message’s link.', 'Report the suspicious message through your organisation’s known support route.', 'Leave the message', 'Open a trusted route', 'Verify and report')
    ] },
    'qr-phishing.html': { target: 'inspectionApp', goal: 'Check the address behind a QR code before trusting it.', scenes: [
      scene('A QR code hides a destination', 'Decode the supplied classroom QR in the lab.', 'The image becomes a readable address.', 'A QR code is a way to carry information, not a stamp of trust. No camera is needed here.', 'QR image', 'Decode locally', 'Read the address'),
      scene('A short link can take detours', 'Follow the lab’s redirect trail one step at a time.', 'Each hop reveals another supplied destination.', 'A redirect is a move to another address. Inspect the final hostname, not just the first link.', 'Short address', 'Redirect hops', 'Final hostname'),
      scene('Connect clues to your decision', 'Pin the destination evidence and compare it with the expected service.', 'The suspicious route ends at a fictional sign-in outside the expected service.', 'A convincing page or HTTPS does not establish who owns it.', 'Look at the host', 'Compare expectation', 'Choose a safe route'),
      scene('Recover if you followed the trap', 'Use the lab’s report and account-recovery controls when needed.', 'The simulated account returns to the state shown by the lab.', 'Closing a page alone does not undo information already shared. Real recovery uses official support.', 'Report the incident', 'Check the account', 'Review the outcome')
    ] },
    'suspicious-url.html': { target: 'inspectionApp', goal: 'Find the real destination of a link, then choose a trusted route.', scenes: [
      scene('Link text can disguise a destination', 'Preview the urgent message’s link in the fictional inbox.', 'The displayed words and the actual target can be different.', 'Judge the destination, not only the text you can see in the email.', 'Displayed link', 'Preview target', 'Compare the two'),
      scene('Find the hostname', 'Use Inspect to separate the URL into its parts.', 'The hostname identifies the destination site. Text before @ can be user information.', 'A trusted name elsewhere in an address does not make it the destination.', 'Whole address', 'Parsed hostname', 'Who receives the visit?'),
      scene('Follow the detours', 'Trace the supplied redirects with Play or One step.', 'The last hop shows where this classroom route ends.', 'A redirect moves a visitor to another address. Check the full trail before deciding.', 'First address', 'Redirect trail', 'Final destination'),
      scene('Verify independently', 'Compare the evidence, report the suspicious link and inspect the trusted-route example.', 'Your decision is based on observed destinations.', 'Use a known bookmark or official app for a real account. A clean-looking URL alone is not proof.', 'Collect evidence', 'Known trusted route', 'Make a reasoned choice')
    ] },
    'mfa-fatigue.html': { target: 'mfaStart', goal: 'Approve only a sign-in you started, and check unwanted sessions.', scenes: [
      scene('The phone asks, but you did not sign in', 'Start the fictional approval-request burst.', 'The phone receives a request while the workstation has no sign-in waiting.', 'MFA means a second check at sign-in. An unexpected request is not a reason to approve.', 'No sign-in started', 'Phone request', 'Unexpected request'),
      scene('One denial stops one request', 'Deny the request and report the unexpected activity.', 'In this model, reporting stops the burst.', 'Repeated requests do not become trustworthy. Approving one can open an unwanted session.', 'Deny request', 'Report activity', 'Stop the burst'),
      scene('Check what remains', 'Review account activity and revoke any unwanted session.', 'The session count shows whether access still needs to be removed.', 'A session is an active signed-in connection. Stopping alerts does not end an existing session.', 'Review activity', 'Revoke unwanted access', 'Check session count'),
      scene('Match your own request', 'Start a sign-in yourself and match the number shown on the workstation.', 'The matching demo number completes your own sign-in.', 'Number matching helps prevent accidental approvals; it is not the same as phishing-resistant authentication.', 'Your sign-in', 'Match the number', 'Expected approval')
    ] },
    'fake-update.html': { target: 'updateVisit', goal: 'Recognise a deceptive update and use the application’s own updater.', scenes: [
      scene('A web page offers an urgent update', 'Open and inspect the supplied update offer.', 'The page asks you to download something outside the app’s usual update route.', 'A convincing update message is not proof that the file came from the publisher.', 'Web offer', 'Inspect source', 'Question the download'),
      scene('Downloading and running are different', 'Try the supplied choices and inspect the local timeline.', 'Running the pretend file causes additional simulated effects.', 'Deleting a download does not undo an earlier execution. This lab never runs or downloads a real file.', 'Pretend download', 'Pretend execution', 'Different consequences'),
      scene('Contain and report', 'Close the offer, clean up the simulated incident and report it.', 'The lab explains which effects have been contained.', 'Respond to what actually happened; closing a tab alone may not finish recovery.', 'Close the offer', 'Contain the effects', 'Report the incident'),
      scene('Use the built-in update route', 'Open Settings → Updates, check the demo publisher and install the verified demo.', 'The four-step playback shows check and install progress.', 'Start updates from the app or an independently verified official source.', 'Application settings', 'Trusted update check', 'Verified demo update')
    ] },
    'browser-permissions.html': { target: 'permVisit', goal: 'Give a website only the access it needs, then remove it when finished.', scenes: [
      scene('A website asks for access', 'Open the supplied page and inspect its notification request.', 'Allowing it can produce simulated alerts.', 'A permission is ongoing access, like lending a key. The request itself does not justify it.', 'Site request', 'Allow or block?', 'Consider the task'),
      scene('Closing an alert leaves the permission', 'Compare clearing the displayed alerts with revoking notifications.', 'Clearing hides existing alerts; revoking prevents future ones in this model.', 'Remove the permission when the access is unwanted. The lab never opens real permission prompts.', 'Clear an alert', 'Grant still exists', 'Revoke in settings'),
      scene('Some tasks need limited access', 'Try the fictional call and give it the microphone access it needs.', 'The call can work after the relevant permission is allowed.', 'Decide based on the current task and the site you trust, not on a habit of always pressing Allow.', 'Expected call', 'Microphone permission', 'Test the task'),
      scene('Finish the task and review access', 'End the call, then remove its microphone permission.', 'The exercise shows the final permission state.', 'Ending a task and revoking access are separate actions. Check both.', 'End call', 'Remove access', 'Review final state')
    ] },
    'port-scanning.html': { target: 'portFindIp', goal: 'Understand a port reply without confusing an open port with a break-in.', scenes: [
      scene('Find the fictional computers', 'Reveal your lab address and discover the two preset hosts.', 'Only the supplied 192.0.2.x teaching addresses appear.', 'A host is a computer on a network. This lesson sends no real discovery traffic.', 'Learner address', 'Preset network', 'Two fictional hosts'),
      scene('Ports are service doors', 'Choose a device and the supplied port list.', 'Each numbered port represents a possible service.', 'An open door means something answered. It does not prove the service is vulnerable.', 'Fictional host', 'Numbered ports', 'Possible services'),
      scene('Read one response at a time', 'Start the simulation, pause it and use Next port.', 'Replies are classified as open, closed or filtered.', 'Open means answered; closed means refused; filtered leaves the open/closed state unknown.', 'Simulated question', 'Preset response', 'Classify the evidence'),
      scene('Limit your conclusion', 'Compare the observed replies and answer the interpretation questions.', 'Only ports you actually checked contribute results.', 'A partial scan is incomplete evidence. These preset results do not describe a real network.', 'Checked ports', 'Observed replies', 'Careful conclusion')
    ] },
    'wifi-auditing.html': { target: 'wifiDiscover', goal: 'See why a supplied weak password is easier to guess than an improved choice.', scenes: [
      scene('Choose the classroom network', 'Discover and select one of the fictional access points.', 'The lab provides a made-up network and a teaching verifier.', 'An access point connects devices to Wi-Fi. This lab does not scan radios or capture real handshakes.', 'Preset networks', 'Select one', 'Fictional verifier'),
      scene('Try supplied guesses', 'Choose a candidate list and start or step through the audit.', 'Each supplied guess is compared locally with the teaching verifier.', 'A candidate list is just a list of guesses. Matching one sample is not a real Wi-Fi security assessment.', 'Supplied guesses', 'Local comparison', 'Match or no match'),
      scene('Read the stopping point', 'Pause, inspect the tested count and review the result.', 'No match means only that these tried candidates did not match.', 'A short list cannot prove a password is safe. Untested possibilities remain unknown.', 'Candidates tested', 'Observed outcome', 'State the limit'),
      scene('Strengthen and retest', 'Apply the offered improvement and compare the supplied audit again.', 'The same classroom checks help explain the before-and-after difference.', 'Use long, unique, unpredictable real passwords and suitable current Wi-Fi security settings.', 'Improve the choice', 'Retest fairly', 'Compare evidence')
    ] },
    'sql-injection.html': { target: 'sqlExample', goal: 'See why query instructions and user-provided values must stay separate.', scenes: [
      scene('Start with a normal category', 'Run the supplied Security category in the local model.', 'The model selects records for that category.', 'A database query is a request for stored records. User text should provide a value, not change the request.', 'Category text', 'Query model', 'Matching records'),
      scene('Unsafe joining changes the meaning', 'Load a supplied injection example and use concatenated mode.', 'This small model recognises a pattern that changes which records match.', 'Concatenation means joining strings. Joining input into query instructions can confuse data with code.', 'Supplied example', 'Joined query text', 'Changed result'),
      scene('Keep the value separate', 'Retest exactly the same text with parameterised input.', 'The supplied text is treated as a value in the fixed query structure.', 'A parameter is a separate value slot. Input no longer supplies query instructions in this model.', 'Same input', 'Separate value slot', 'Fixed query meaning'),
      scene('Compare the evidence', 'Compare record counts and draft visibility for both modes.', 'The run history shows only the examples you actually tested.', 'This is a deliberately small teaching model, not a full SQL engine or a test of a live site.', 'Unsafe-mode result', 'Bound-mode result', 'Explain the difference')
    ] },
    'xss.html': { target: 'xssExample', goal: 'Understand the difference between displaying text and treating it as page instructions.', scenes: [
      scene('A comment reaches a page', 'Start with the supplied plain-text comment.', 'The preview shows how the page handles that input.', 'XSS means cross-site scripting. It can happen when untrusted input is interpreted as executable page content.', 'User comment', 'Output boundary', 'Page content'),
      scene('Explore the unsafe idea safely', 'Load a supplied marker and select the unsafe HTML model.', 'The lab explains a recognised pattern using an inert preview.', 'No student script runs here. A real unsafe page can let hostile content act in the visitor’s page.', 'Supplied marker', 'Unsafe interpretation', 'Illustrated effect'),
      scene('Render the same characters as text', 'Retest the identical comment with safe text output.', 'The characters are displayed instead of becoming instructions.', 'The output boundary is the place where the page decides how to handle the value.', 'Same characters', 'Text-only output', 'Displayed literally'),
      scene('Compare and explain', 'Read both results and the model’s limitations.', 'You can explain why the output handling changed the outcome.', 'Real applications need context-appropriate safe output handling. This lab does not prove a real site is safe.', 'Two modes', 'Same input', 'Different handling')
    ] },
    'password-strength.html': { target: 'pwInput', goal: 'Compare invented samples without treating a score as a guarantee.', scenes: [
      scene('Use an invented sample', 'Select a supplied classroom password example.', 'The checker reports visible properties of that sample.', 'Never enter a real password into a teaching exercise. Its purpose is to explain choices.', 'Invented sample', 'Local observations', 'No real password'),
      scene('Length is one useful property', 'Compare shorter and longer invented samples.', 'The observed character count changes.', 'Longer choices can help, but predictable phrases and reuse still matter.', 'Short sample', 'Longer sample', 'Compare length'),
      scene('Look for predictable patterns', 'Inspect the limited pattern flags in the lab.', 'Some common or repeated patterns can be recognised.', 'No flag does not prove safety: this checker cannot know reuse, every guess or every breach.', 'Pattern checks', 'Limited findings', 'Unknowns remain'),
      scene('Make the everyday choice', 'Use the comparison to explain long, unique and unpredictable passwords.', 'You can describe improvements without relying on a strength label.', 'For real accounts, use a password manager and available strong sign-in protection.', 'Long', 'Unique and unpredictable', 'Safer account habits')
    ] }
  };
  function mount() {
    const file = window.location.pathname.split('/').pop();
    const lesson = lessons[file];
    if (!lesson || document.querySelector('[data-lab-explanation]')) return;
    const host = document.getElementById('labExplanationMount') || document.getElementById('beginnerGuideMount');
    if (!host) return;
    const make = (tag, className, value) => { const el = document.createElement(tag); if (className) el.className = className; if (value != null) el.textContent = value; return el; };
    const panel = make('details', 'lab-explanation'); panel.setAttribute('data-lab-explanation', file);
    const summary = make('summary', 'le-summary', 'Watch the idea: a short step-by-step explanation'); panel.appendChild(summary);
    const body = make('div', 'le-body'); panel.appendChild(body);
    body.appendChild(make('p', 'le-goal', 'Your goal: ' + lesson.goal));
    body.appendChild(make('p', 'le-scope', 'Illustration only · about 30 seconds · no sound needed. This preview does not run the lab or count as your practice evidence.'));
    const controls = make('div', 'le-controls'); controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', 'Explanation playback');
    const button = (label, name) => { const b = make('button', 'le-button', label); b.type = 'button'; b.setAttribute('data-le-control', name); controls.appendChild(b); return b; };
    const play = button('Play explanation', 'play'), pause = button('Pause', 'pause'), back = button('Back', 'back'), next = button('Next scene', 'next'), reset = button('Restart', 'reset'); body.appendChild(controls);
    const progress = make('p', 'le-progress'); body.appendChild(progress);
    const frame = make('div', 'le-frame'); frame.setAttribute('role', 'region'); frame.setAttribute('aria-label', 'Explanation scene'); frame.setAttribute('aria-live', 'polite'); frame.setAttribute('aria-atomic', 'true'); body.appendChild(frame);
    const heading = make('h3', 'le-heading'), diagram = make('ol', 'le-diagram'), explanation = make('dl', 'le-captions'); frame.append(heading, diagram, explanation);
    const values = {};
    for (const [key, label] of [['action', 'What to do'], ['result', 'What happens'], ['why', 'Why it matters']]) { explanation.appendChild(make('dt', '', label)); values[key] = make('dd'); explanation.appendChild(values[key]); }
    const help = make('p', 'le-help'); body.appendChild(help);
    const tryLab = make('button', 'le-button le-try', 'Try it in the lab below'); tryLab.type = 'button'; body.appendChild(tryLab);
    if (host.id === 'labExplanationMount') host.appendChild(panel); else host.before(panel);
    const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    let index = 0, timer = null, playing = false, revision = 0;
    const reduced = () => Boolean(media?.matches);
    function stop() { clearTimeout(timer); timer = null; playing = false; revision += 1; }
    function render(animate = false) {
      const current = lesson.scenes[index]; panel.dataset.playing = String(playing); panel.dataset.motion = reduced() ? 'off' : 'on';
      progress.textContent = 'Scene ' + (index + 1) + ' of ' + lesson.scenes.length + (playing ? ' · Playing' : index === lesson.scenes.length - 1 ? ' · End of explanation' : ' · Paused');
      heading.textContent = current.title; diagram.replaceChildren();
      current.nodes.forEach((label, i) => { const node = make('li', 'le-node', label); node.dataset.stage = String(i + 1); diagram.appendChild(node); });
      for (const key of Object.keys(values)) values[key].textContent = current[key];
      frame.classList.toggle('le-enter', animate && !reduced());
      play.disabled = playing; play.textContent = reduced() ? (index === lesson.scenes.length - 1 ? 'Replay first scene' : 'Show next scene') : index === lesson.scenes.length - 1 ? 'Replay explanation' : 'Play explanation';
      pause.disabled = !playing; back.disabled = index === 0; next.disabled = index === lesson.scenes.length - 1;
      help.textContent = reduced() ? 'Reduced motion is on. Read each scene and use Next or Back; there is no automatic playback.' : 'Play changes scene every 8 seconds. Pause to read, or use Back and Next at your own pace. Closing this panel pauses it.';
    }
    function schedule() { const token = revision; timer = setTimeout(() => { if (!playing || token !== revision || !panel.open || document.hidden) return; index += 1; if (index >= lesson.scenes.length - 1) { index = lesson.scenes.length - 1; stop(); } render(true); if (playing) schedule(); }, 8000); }
    play.addEventListener('click', () => { if (playing) return; stop(); if (reduced()) { index = index === lesson.scenes.length - 1 ? 0 : index + 1; render(); return; } if (index === lesson.scenes.length - 1) index = 0; playing = true; render(); schedule(); });
    pause.addEventListener('click', () => { stop(); render(); });
    next.addEventListener('click', () => { stop(); index = Math.min(index + 1, lesson.scenes.length - 1); render(true); });
    back.addEventListener('click', () => { stop(); index = Math.max(0, index - 1); render(true); });
    reset.addEventListener('click', () => { stop(); index = 0; render(); });
    panel.addEventListener('toggle', () => { if (!panel.open) { stop(); render(); } });
    function suspend() { stop(); render(); }
    document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
    window.addEventListener('pagehide', suspend);
    if (media?.addEventListener) media.addEventListener('change', () => { if (reduced()) stop(); render(); });
    tryLab.addEventListener('click', () => {
      stop(); panel.open = false; render();
      const usable = node => node && !node.disabled && !node.hidden && !(node.closest && node.closest('[hidden],fieldset[disabled]')) && (!node.getClientRects || node.getClientRects().length > 0);
      const target = [document.querySelector('.bg-action:not([hidden])'), document.getElementById(lesson.target), host, document.querySelector('main h1,main h2')].find(usable);
      if (!target) { summary.focus(); return; }
      if (!target.matches('button,input,select,textarea,a[href],[tabindex]')) target.setAttribute('tabindex', '-1');
      target.scrollIntoView({ block: 'center', behavior: 'auto' }); target.focus({ preventScroll: true });
    });
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
})();
