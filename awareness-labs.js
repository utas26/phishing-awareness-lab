/* Fictional classroom scenarios only. This module never requests real permissions or sends data. */
(() => {
  'use strict';
  const cases = {
    qr: [
      { text: 'https://utas-login-check.example/verify', answer: 'true', why: 'The domain is not the official university domain and the message creates urgency.' },
      { text: 'https://student-portal.example.edu/announcements', answer: 'false', why: 'In this fictional scenario, this is the expected official training domain and no credential request is made.' },
      { text: 'https://utas.account-security.example/reset', answer: 'true', why: 'The important domain is account-security.example, not UTAS.' }
    ],
    mfa: [
      { text: 'You are not logging in, but your phone suddenly shows an MFA approval request.', answer: 'report', why: 'Unexpected MFA prompts should be denied and reported.' },
      { text: 'You just entered your password into the official training portal and immediately receive one MFA prompt.', answer: 'approve', why: 'This prompt matches the action you just initiated.' },
      { text: 'You receive six MFA prompts in one minute while not using the account.', answer: 'report', why: 'Repeated unexpected prompts are a classic MFA-fatigue warning sign.' }
    ],
    browser: [
      { text: 'A news website asks for camera access immediately on page load.', answer: 'deny', why: 'Camera access is unrelated to reading news.' },
      { text: 'A video-conference page you intentionally opened asks for microphone access before joining.', answer: 'allow', why: 'Microphone access is expected for the activity you initiated.' },
      { text: "A random page says 'Allow notifications to prove you are not a robot'.", answer: 'deny', why: 'That is a common deceptive permission pattern.' }
    ],
    url: [
      { text: 'https://utas-portal.example-login.com/signin', answer: 'false', why: "The real domain is example-login.com; 'utas-portal' is only a subdomain." },
      { text: 'https://portal.training-university.example/login', answer: 'true', why: 'In this fictional lab, training-university.example is the expected domain.' },
      { text: 'https://university-secure.example/reset?continue=login', answer: 'false', why: 'The domain does not match the expected training university domain.' },
      { text: 'https://training-university.example.security-check.com/', answer: 'false', why: 'The real domain is security-check.com, not training-university.example.' }
    ]
  };
  const config = {
    qr: { content: 'qrUrl', feedback: 'qrFeedback', score: 'qrScore' },
    mfa: { content: 'mfaScenario', feedback: 'mfaFeedback', score: 'mfaScore', prefix: 'Prompt: ' },
    browser: { content: 'permScenario', feedback: 'permFeedback', score: 'permScore', prefix: 'Prompt: ' },
    url: { content: 'urlText', feedback: 'urlFeedback', score: 'urlScore' }
  };

  for (const [id, options] of Object.entries(config)) {
    const module = document.getElementById(id);
    if (!module) continue;
    let index = 0, correct = 0, total = 0, answered = false;
    const content = document.getElementById(options.content);
    const feedback = document.getElementById(options.feedback);
    const score = document.getElementById(options.score);
    const answerButtons = [...module.querySelectorAll('[data-answer]')];
    function render() {
      content.textContent = (options.prefix || '') + cases[id][index].text;
      feedback.className = 'feedback';
      feedback.textContent = '';
      answered = false;
      answerButtons.forEach(button => { button.disabled = false; });
    }
    answerButtons.forEach(button => button.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      total += 1;
      const scenario = cases[id][index];
      const ok = button.dataset.answer === scenario.answer;
      if (ok) correct += 1;
      feedback.className = 'feedback ' + (ok ? 'good' : 'bad');
      feedback.textContent = (ok ? 'Correct. ' : 'Not quite. ') + scenario.why;
      score.textContent = 'Score: ' + correct + ' / ' + total;
      answerButtons.forEach(answer => { answer.disabled = true; });
    }));
    module.querySelector('[data-next]').addEventListener('click', () => {
      index = (index + 1) % cases[id].length;
      render();
    });
    render();
  }

  const update = document.getElementById('update');
  if (update) {
    let correct = 0, total = 0, answered = false;
    const choices = [...update.querySelectorAll('[data-answer]')];
    const feedback = document.getElementById('updateFeedback');
    choices.forEach(button => button.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      total += 1;
      const ok = button.dataset.answer === '1';
      if (ok) correct += 1;
      choices.forEach(choice => {
        choice.disabled = true;
        choice.setAttribute('aria-pressed', String(choice === button));
      });
      feedback.className = 'feedback ' + (ok ? 'good' : 'bad');
      feedback.textContent = ok
        ? 'Correct. Use official operating-system or application update channels.'
        : 'Suspicious. Avoid unexpected executable downloads or email attachments presented as updates.';
      document.getElementById('updateScore').textContent = 'Score: ' + correct + ' / ' + total;
    }));
    update.querySelector('[data-retry]').addEventListener('click', () => {
      answered = false;
      choices.forEach(choice => { choice.disabled = false; choice.removeAttribute('aria-pressed'); });
      feedback.className = 'feedback';
      feedback.textContent = '';
    });
  }
})();
