/* Optional teaching UI. Evidence comes from each lab engine; hints never run actions. */
(() => {
  'use strict';
  let serial = 0;
  const asText = value => value == null ? '' : String(value);
  const node = (tag, className, value) => { const element = document.createElement(tag); if (className) element.className = className; if (value != null) element.textContent = asText(value); return element; };
  const safeLink = value => typeof value === 'string' && /^\/[a-z0-9-]+\.html$/.test(value) ? value : null;
  function mount(options = {}) {
    const resolve = value => typeof value === 'string' ? document.getElementById(value.replace(/^#/, '')) : value;
    const host = resolve(options.mountTo);
    if (!host) return { update() {}, reset() {}, destroy() {}, getSummary: () => ({ status: 'not-performed', completedChecks: 0, totalChecks: 0, hintsRevealed: 0 }) };
    const guide = resolve(options.guideTo), guideWasHidden = !!guide?.hidden;
    const checks = Array.isArray(options.checks) ? options.checks.filter(check => check && typeof check.id === 'string').slice(0, 8) : [];
    const hints = Array.isArray(options.hints) ? options.hints.slice(0, 6) : [];
    let state = {}, hintsRevealed = 0, opened = false, independent = false, disposed = false;
    const id = 'practice-mission-' + (++serial), panel = node('section', 'practice-mission'); panel.setAttribute('aria-labelledby', id + '-title');
    panel.appendChild(node('span', 'pm-eyebrow', 'OPTIONAL PRACTICE · USE THE LAB TO PROVE IT'));
    const title = node('h2', '', options.title || 'Try it yourself'); title.id = id + '-title'; panel.appendChild(title);
    panel.appendChild(node('p', 'pm-goal', options.goal || 'Use the simulation tools below and inspect the result.'));
    const mode = node('button', 'btn alt pm-mode', 'Try it yourself'); mode.type = 'button'; mode.setAttribute('aria-controls', id + '-body'); mode.setAttribute('aria-expanded', 'false'); panel.appendChild(mode);
    const body = node('div', 'pm-body'); body.id = id + '-body'; body.hidden = true;
    body.appendChild(node('p', 'pm-instruction', 'Use the actual lab controls. This checklist updates from the current simulation evidence; you cannot tick it yourself. Hints are optional.'));
    const list = node('ul', 'pm-checks'), checkNodes = [];
    checks.forEach(check => { const item = node('li', ''), symbol = node('span', 'pm-check-symbol', '○'), label = node('span', '', check.label); symbol.setAttribute('aria-hidden', 'true'); item.appendChild(symbol); item.appendChild(label); list.appendChild(item); checkNodes.push({ item, symbol, label }); }); body.appendChild(list);
    const feedback = node('p', 'pm-feedback'); feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite'); body.appendChild(feedback);
    const hintButton = node('button', 'btn alt pm-hint'); hintButton.type = 'button'; hintButton.hidden = hints.length === 0; body.appendChild(hintButton);
    const hintList = node('ol', 'pm-hints'); hintList.id = id + '-hints'; hintList.setAttribute('aria-label', 'Hints you chose to reveal'); hintList.setAttribute('aria-live', 'polite'); hintButton.setAttribute('aria-controls', hintList.id); body.appendChild(hintList);
    const debrief = node('div', 'pm-debrief'); debrief.hidden = true; debrief.appendChild(node('h3', '', 'What your evidence shows'));
    debrief.appendChild(node('p', '', options.debrief?.takeaway || 'The required evidence is present in this exercise. Review the recorded actions before drawing a conclusion.'));
    debrief.appendChild(node('p', 'pm-limitation', options.debrief?.limitation || 'This describes this classroom model only. Completing a mission does not certify real-world skills or security.'));
    const href = safeLink(options.next?.href); if (href) { const link = node('a', 'pm-next', options.next.label || 'Continue to the next lab'); link.href = href; debrief.appendChild(link); }
    body.appendChild(debrief); panel.appendChild(body); host.replaceChildren(panel);
    function summary() {
      const completedChecks = checks.filter(check => state.checks?.[check.id] === true).length;
      const complete = checks.length > 0 && state.complete === true && completedChecks === checks.length;
      return { status: complete ? 'completed' : state.started === true || completedChecks > 0 ? 'in-progress' : 'not-performed', completedChecks, totalChecks: checks.length, hintsRevealed };
    }
    function render() {
      const result = summary();
      body.hidden = !opened;
      mode.textContent = !opened ? 'Try it yourself' : independent ? 'Show guided help' : 'Try without the guide';
      mode.setAttribute('aria-expanded', String(opened)); mode.setAttribute('aria-pressed', String(independent));
      if (guide) guide.hidden = independent || guideWasHidden;
      checks.forEach((check, index) => { const met = state.checks?.[check.id] === true, item = checkNodes[index]; item.item.dataset.met = String(met); item.symbol.textContent = met ? '✓' : '○'; item.item.setAttribute('aria-label', (met ? 'Evidence present: ' : 'Evidence still needed: ') + asText(check.label)); });
      const prefix = result.status === 'completed' ? 'Mission evidence complete. ' : result.status === 'not-performed' ? 'No mission evidence yet. ' : result.completedChecks + ' of ' + result.totalChecks + ' evidence checks are currently met. ';
      const nextFeedback = prefix + asText(state.feedback || 'Use the lab below; opening this mission or reading a hint does not perform a test.');
      if (feedback.textContent !== nextFeedback) feedback.textContent = nextFeedback;
      hintButton.disabled = hintsRevealed >= hints.length;
      hintButton.textContent = hintsRevealed >= hints.length ? 'All hints shown' : 'Show hint ' + (hintsRevealed + 1) + ' of ' + hints.length;
      debrief.hidden = result.status !== 'completed'; panel.dataset.status = result.status;
    }
    mode.addEventListener('click', () => { opened = true; independent = !independent; render(); });
    hintButton.addEventListener('click', () => { if (hintsRevealed >= hints.length) return; const hint = hints[hintsRevealed++], item = node('li', ''); if (hint.title) item.appendChild(node('strong', '', hint.title)); item.appendChild(node('p', '', hint.text)); hintList.appendChild(item); render(); });
    render();
    return {
      update(next = {}) { if (disposed) return; state = next; render(); },
      getSummary: summary,
      reset() { if (disposed) return; state = {}; hintsRevealed = 0; opened = false; independent = false; hintList.replaceChildren(); render(); },
      destroy() { disposed = true; if (guide) guide.hidden = guideWasHidden; host.replaceChildren(); }
    };
  }
  window.PracticeMission = Object.freeze({ mount });
})();
