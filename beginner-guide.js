/* Read-only teaching UI: lab engines own every action, result, timer and report. */
(() => {
  'use strict';
  let serial = 0;
  const text = value => value == null ? '' : String(value);
  const el = (tag, className, value) => { const node = document.createElement(tag); if (className) node.className = className; if (value != null) node.textContent = text(value); return node; };
  function mount(options) {
    const host = typeof options.mountTo === 'string' ? document.getElementById(options.mountTo.replace(/^#/, '')) : options.mountTo;
    if (!host) return { update() {}, destroy() {} };
    const id = 'beginner-guide-' + (++serial), steps = Array.isArray(options.steps) ? options.steps.slice(0, 5) : [];
    const query = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    let motion = !query?.matches, previousEvent, previousDiagram, state = {}, disposed = false;
    const panel = el('section', 'beginner-guide'); panel.setAttribute('aria-labelledby', id + '-heading');
    const header = el('div', 'bg-header'), copy = el('div', 'bg-heading-copy');
    copy.appendChild(el('span', 'bg-eyebrow', 'START HERE · LEARN BY DOING'));
    const heading = el('h2', '', options.title || 'See what happens, step by step'); heading.id = id + '-heading'; copy.appendChild(heading); header.appendChild(copy);
    const motionButton = el('button', 'bg-motion'); motionButton.type = 'button'; motionButton.setAttribute('aria-label', 'Toggle short visual effects. Lab playback uses the lab controls.'); header.appendChild(motionButton); panel.appendChild(header);
    if (options.intro) panel.appendChild(el('p', 'bg-intro', options.intro));
    const list = el('ol', 'bg-steps'), stepNodes = [];
    steps.forEach((step, index) => { const li = el('li', 'bg-step'), number = el('span', 'bg-step-number', index + 1), body = el('div', 'bg-step-copy'); number.setAttribute('aria-hidden', 'true'); body.appendChild(el('strong', '', step.title)); body.appendChild(el('p', '', step.text)); li.appendChild(number); li.appendChild(body); list.appendChild(li); stepNodes.push({ li, number }); }); panel.appendChild(list);
    const diagram = el('div', 'bg-diagram'); diagram.setAttribute('aria-label', 'Live explanation of the current lab state'); panel.appendChild(diagram);
    const feedback = el('div', 'bg-feedback'); feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite'); feedback.setAttribute('aria-atomic', 'true');
    const status = el('strong', 'bg-status', 'Ready'), caption = el('p', 'bg-caption', 'Use the lab controls below to begin.'); feedback.appendChild(status); feedback.appendChild(caption); panel.appendChild(feedback);
    const action = el('button', 'bg-action'); action.type = 'button'; action.hidden = true; panel.appendChild(action);
    const note = el('p', 'bg-note', 'This guide explains the current simulation. Highlighted steps only change when the lab state changes.'); panel.appendChild(note); host.replaceChildren(panel);
    function updateMotion() { panel.dataset.motion = motion && !query?.matches ? 'on' : 'off'; motionButton.textContent = panel.dataset.motion === 'on' ? 'Guide motion on' : 'Guide motion off'; motionButton.setAttribute('aria-pressed', String(panel.dataset.motion === 'on')); }
    function findTarget() { const target = state.action?.id ? document.getElementById(state.action.id) : null; if (!target || target.disabled || target.hidden) return null; if (typeof target.closest === 'function' && target.closest('[hidden]')) return null; if (typeof target.matches === 'function' && target.matches(':disabled')) return null; if (typeof target.getClientRects === 'function' && target.getClientRects().length === 0) return null; return target; }
    action.addEventListener('click', () => { const target = findTarget(); if (!target) { action.hidden = true; return; } if (typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'center', behavior: 'auto' }); if (typeof target.focus === 'function') target.focus({ preventScroll: true }); });
    motionButton.addEventListener('click', () => { motion = !motion; updateMotion(); });
    function preferenceChanged(event) { if (event.matches) motion = false; updateMotion(); }
    if (query && typeof query.addEventListener === 'function') query.addEventListener('change', preferenceChanged);
    function pageHidden() { motion = false; updateMotion(); }
    window.addEventListener('pagehide', pageHidden);
    updateMotion();
    return {
      update(next = {}) {
        if (disposed) return; state = next;
        const completed = Array.isArray(next.completed) ? next.completed : [];
        stepNodes.forEach(({ li, number }, index) => { const done = completed.includes(index), active = !done && next.step === index; li.dataset.state = done ? 'done' : active ? 'active' : 'waiting'; li.setAttribute('aria-label', 'Step ' + (index + 1) + ': ' + text(steps[index].title) + '. ' + (done ? 'Completed.' : active ? 'Current step.' : 'Not completed.')); number.textContent = done ? '✓' : String(index + 1); if (active) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
        status.textContent = text(next.status || 'Ready'); caption.textContent = text(next.caption || 'Use the lab controls below to begin.');
        const event = next.eventKey, renderNodes = Array.isArray(next.nodes) ? next.nodes.slice(0, 4) : [], diagramKey = JSON.stringify(renderNodes.map(node => [text(node.label), text(node.value), text(node.tone)]));
        const shouldAnimate = next.animate !== false && event != null && event !== previousEvent && previousEvent !== undefined, rebuild = event !== previousEvent || diagramKey !== previousDiagram || next.animate === false; previousEvent = event; previousDiagram = diagramKey;
        if (rebuild) { diagram.replaceChildren();
        renderNodes.forEach((node, index) => { if (index) { const arrow = el('span', 'bg-arrow' + (shouldAnimate ? ' bg-pulse' : ''), '→'); arrow.setAttribute('aria-hidden', 'true'); diagram.appendChild(arrow); } const box = el('div', 'bg-node'); box.dataset.tone = ['neutral', 'active', 'good', 'warn'].includes(node.tone) ? node.tone : 'neutral'; box.appendChild(el('span', 'bg-node-label', node.label)); box.appendChild(el('strong', 'bg-node-value', node.value)); diagram.appendChild(box); }); }
        action.textContent = text(next.action?.label || 'Find the next control'); action.hidden = !findTarget();
      },
      destroy() { disposed = true; if (query && typeof query.removeEventListener === 'function') query.removeEventListener('change', preferenceChanged); if (typeof window.removeEventListener === 'function') window.removeEventListener('pagehide', pageHidden); host.replaceChildren(); }
    };
  }
  window.BeginnerGuide = Object.freeze({ mount });
})();
