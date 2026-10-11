/* Credentials are never persisted by this page. Authentication uses an HttpOnly server cookie. */
(() => {
  'use strict';
  const form = document.getElementById('login-form');
  const button = document.getElementById('login-button');
  const status = document.getElementById('login-status');
  let pending = false;
  button.disabled = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending || !form.reportValidity()) return;
    pending = true; button.disabled = true; status.className = 'status'; status.textContent = 'Signing in…';
    try {
      const response = await fetch('/api/admin-login', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.elements.username.value, password: form.elements.password.value })
      });
      const result = await response.json().catch(() => ({}));
      form.elements.password.value = '';
      if (!response.ok || result.ok !== true) {
        status.className = 'status error';
        status.textContent = response.status === 429 ? 'Too many sign-in attempts. Please wait before trying again.' : response.status === 503 ? 'Research sign-in is not configured. Contact the application administrator.' : 'Sign-in was not successful. Check your credentials and try again.';
        return;
      }
      status.textContent = 'Signed in. Opening the research report…';
      window.location.replace('research-dashboard.html');
    } catch (_) {
      form.elements.password.value = ''; status.className = 'status error';
      status.textContent = 'Could not reach the sign-in service. Check the connection and try again.';
    } finally { pending = false; button.disabled = false; }
  });
})();
