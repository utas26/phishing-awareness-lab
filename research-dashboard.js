/* Authenticated report view. No respondent data is placed in browser storage. */
(() => {
  'use strict';
  const filtersForm = document.getElementById('filters-form');
  const report = document.getElementById('report');
  const loading = document.getElementById('loading');
  const errorBox = document.getElementById('report-error');
  const actionStatus = document.getElementById('action-status');
  const apply = document.getElementById('apply-filters');
  let data = null;
  let appliedQuery = '';
  let activeRequest = null;
  let requestNumber = 0;
  let resizeTimer;

  const formatCount = value => Number.isFinite(value) ? value.toLocaleString('en-US') : 'Not recorded';
  const percent = (numerator, denominator) => denominator ? `${(100 * numerator / denominator).toFixed(1)}%` : '—';
  function element(tag, className, text) {
    const node = document.createElement(tag); if (className) node.className = className;
    if (text !== undefined) node.textContent = text; return node;
  }
  function notify(text, error = false) {
    actionStatus.className = error ? 'status no-print error' : 'status no-print success'; actionStatus.textContent = text;
  }
  function parameters() {
    const params = new URLSearchParams();
    ['from', 'to', 'lab', 'version'].forEach(key => {
      const value = filtersForm.elements[key].value;
      if (value) params.set(key, value);
    });
    return params;
  }
  function isCount(value) { return Number.isInteger(value) && value >= 0; }
  function validateReport(result) {
    if (!result || !result.instrument || typeof result.instrument.version !== 'string' || !result.filters || !result.counts || !result.participation || !Array.isArray(result.items) || result.items.length !== 10) return false;
    if (!['responses', 'complete', 'partial', 'allLikert', 'missing', 'na', 'excluded'].every(key => isCount(result.counts[key]))) return false;
    if (!result.items.every(item => item && typeof item.id === 'string' && typeof item.text === 'string' && Array.isArray(item.counts) && item.counts.length === 5 && item.counts.every(isCount) && ['valid', 'na', 'missing'].every(key => isCount(item[key])) && item.valid === item.counts.reduce((a, b) => a + b, 0))) return false;
    if (new Set(result.items.map(item => item.id)).size !== 10 || !result.items.some(item => item.id === 'q1')) return false;
    return typeof result.generatedAt === 'string' && !Number.isNaN(Date.parse(result.generatedAt));
  }
  function fillOptions(select, values, selected, includeAll = false) {
    select.replaceChildren();
    if (includeAll) { const option = element('option', '', 'All activities'); option.value = ''; select.append(option); }
    values.forEach(value => {
      const id = typeof value === 'string' ? value : value.id;
      const label = typeof value === 'string' ? value : value.label;
      if (typeof id !== 'string' || typeof label !== 'string') return;
      const option = element('option', '', label); option.value = id; select.append(option);
    });
    select.value = selected || '';
  }
  function labLabel() {
    const lab = data.filters.lab || '';
    if (!lab) return 'All activities';
    const match = Array.isArray(data.labs) && data.labs.find(item => item.id === lab);
    return match ? match.label : lab;
  }
  function context() {
    const from = data.filters.from || 'Beginning'; const to = data.filters.to || 'Latest';
    return `Study: ${data.studyId || 'Not configured'} · ${from} to ${to} (UTC) · ${labLabel()} · ${data.instrument.version}`;
  }
  function exportedContext() {
    return {
      version: data.instrument.version,
      filterText: context(),
      footer: `Generated ${new Date(data.generatedAt).toISOString()} · Response counts are submissions, not verified unique participants. Draft instrument; descriptive results only.`
    };
  }
  function renderCharts(printWidth) {
    if (!data || !window.ResearchCharts) return;
    const options = { ...exportedContext(), ...(printWidth ? { width: printWidth } : {}) };
    window.ResearchCharts.renderDistribution(document.getElementById('q1-chart'), data.items.find(item => item.id === 'q1'), { ...options, title: 'Q1 · Overall satisfaction' });
    window.ResearchCharts.renderLikert(document.getElementById('likert-chart'), data.items, { ...options, title: 'Learning experience · Item-level agreement' });
    window.ResearchCharts.renderFlow(document.getElementById('flow-chart'), data.participation, { ...options, title: 'Participation record' });
  }
  function renderTable() {
    const body = document.getElementById('item-table-body'); body.replaceChildren();
    data.items.forEach(item => {
      const row = document.createElement('tr');
      const label = element('th', '', undefined); label.scope = 'row';
      label.append(element('span', 'item-id', item.id.toUpperCase()), document.createTextNode(item.text));
      row.append(label);
      item.counts.forEach(value => row.append(element('td', '', formatCount(value))));
      ['valid', 'na', 'missing'].forEach(key => row.append(element('td', '', formatCount(item[key]))));
      const agree = item.counts[3] + item.counts[4];
      row.append(element('td', 'agreement', `${percent(agree, item.valid)} (${formatCount(agree)} / ${formatCount(item.valid)})`));
      body.append(row);
    });
  }
  function renderReport() {
    const noStorage = data.storageStatus === 'not_configured';
    const collection = data.collectionEnabled === true;
    document.getElementById('export-summary').disabled = noStorage;
    document.getElementById('export-responses').disabled = noStorage;
    document.getElementById('csv-availability').hidden = !noStorage;
    const badge = document.getElementById('collection-badge');
    badge.className = collection ? 'badge' : 'badge preview'; badge.textContent = collection ? 'COLLECTION ENABLED' : 'COLLECTION OFF';
    document.getElementById('collection-notice').hidden = false;
    document.getElementById('collection-title').textContent = noStorage ? 'Storage not configured. No research dataset loaded.' : collection ? 'Collection is enabled for the configured study.' : 'Research collection is off.';
    document.getElementById('collection-description').textContent = noStorage
      ? 'The zero values below describe an unloaded local report, not evidence that no students have used the activities. No research data can be collected until storage and the study configuration are approved and configured.'
      : collection ? 'Participation remains voluntary. Review the configured study information and disclosure risks before interpreting or sharing these results.' : 'The student feedback page is in local preview mode and cannot submit responses. Any previously stored records can still be reviewed here.';
    document.getElementById('collection-notice').className = collection ? 'notice' : 'notice preview';
    ['responses', 'complete', 'partial', 'excluded'].forEach(key => { document.getElementById(`count-${key}`).textContent = formatCount(data.counts[key]); });
    document.getElementById('zero-state').hidden = data.counts.responses !== 0;
    document.getElementById('zero-title').textContent = noStorage ? 'No research dataset loaded' : 'No responses in this view';
    document.getElementById('zero-description').textContent = noStorage ? 'Storage has not been configured. These empty charts are the report structure, with no invented student results.' : 'There are no stored submissions matching these filters. These empty charts contain no invented student results.';
    const q1 = data.items.find(item => item.id === 'q1');
    const agree = q1.counts[3] + q1.counts[4];
    document.getElementById('q1-caption').textContent = `${q1.text} Agreement (4 + 5): ${percent(agree, q1.valid)} (${formatCount(agree)} / ${formatCount(q1.valid)} valid answers). N/A: ${formatCount(q1.na)}. Missing: ${formatCount(q1.missing)}.`;
    document.getElementById('answer-totals').textContent = `Across all ten statements: ${formatCount(data.counts.na)} explicit N/A selections; ${formatCount(data.counts.missing)} missing answers. ${formatCount(data.counts.allLikert)} submissions answered all ten statements numerically (1–5). N/A is not coded as zero or neutral.`;
    document.getElementById('storage-note').textContent = noStorage ? 'No research dataset is loaded because persistent storage is not configured.' : 'The report summarizes the configured server-side response store. Retention, access, and backup procedures must follow the approved study arrangements.';
    const notes = data.participation.notes;
    document.getElementById('participation-note').textContent = Array.isArray(notes) ? notes.join(' ') : typeof notes === 'string' ? notes : 'Unrecorded participation stages are shown as unknown, not zero.';
    const summary = `Applied filters: ${context()}`;
    document.getElementById('filter-summary').textContent = `${summary}. Both dates are inclusive. Versions are never pooled.`;
    const generated = new Date(data.generatedAt).toISOString().replace('T', ' ').replace('.000Z', ' UTC');
    const reportText = `${summary} · Generated ${generated}. All figures and tables use this filtered dataset.`;
    document.getElementById('report-context').textContent = reportText;
    document.getElementById('print-context').textContent = `${reportText} Complete = all ten numeric or N/A; partial = at least one skipped. Percentages exclude N/A and missing. Response counts are submissions, not verified unique participants. ${noStorage ? 'Storage not configured. No research dataset loaded.' : ''}`;
    fillOptions(filtersForm.elements.lab, Array.isArray(data.labs) ? data.labs : [], data.filters.lab || '', true);
    const versions = Array.isArray(data.versions) ? data.versions : [data.instrument.version];
    fillOptions(filtersForm.elements.version, versions.includes(data.instrument.version) ? versions : [...versions, data.instrument.version], data.instrument.version);
    filtersForm.elements.from.value = data.filters.from || '';
    filtersForm.elements.to.value = data.filters.to || '';
    renderTable(); report.hidden = false; renderCharts();
  }
  async function loadReport(params) {
    if (activeRequest) activeRequest.abort();
    const controller = new AbortController(); activeRequest = controller;
    const number = ++requestNumber;
    loading.hidden = false; errorBox.hidden = true; report.hidden = true; apply.disabled = true;
    document.getElementById('collection-notice').hidden = true;
    const badge = document.getElementById('collection-badge'); badge.className = 'badge neutral'; badge.textContent = 'CHECKING STATUS';
    notify('');
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`/api/research/report?${params.toString()}`, { credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
      if (response.status === 401 || response.status === 403) { window.location.replace('research-login.html'); return; }
      if (!response.ok) throw new Error(response.status === 503 ? 'The research report is temporarily unavailable. No results are displayed.' : 'The report could not be loaded. Check the filters and try again. No results are displayed.');
      const result = await response.json();
      if (!validateReport(result)) throw new Error('The server returned an incomplete report. No results are displayed. Please contact the application administrator.');
      if (number !== requestNumber) return;
      data = result;
      // Use the server-confirmed filters for every export, never unsaved form edits.
      const applied = new URLSearchParams();
      ['from', 'to', 'lab'].forEach(key => { if (result.filters[key]) applied.set(key, result.filters[key]); });
      applied.set('version', result.instrument.version);
      appliedQuery = applied.toString();
      renderReport();
      window.history.replaceState(null, '', `${window.location.pathname}?${appliedQuery}`);
    } catch (error) {
      if (number !== requestNumber) return;
      data = null; report.hidden = true; errorBox.hidden = false;
      errorBox.textContent = error.name === 'AbortError' ? 'The report request timed out. No results are displayed. Try applying the filters again.' : error.message || 'The report could not be loaded. No results are displayed.';
      badge.textContent = 'REPORT UNAVAILABLE';
    } finally {
      window.clearTimeout(timeout);
      if (number === requestNumber) { loading.hidden = true; apply.disabled = false; activeRequest = null; }
    }
  }
  filtersForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!filtersForm.reportValidity()) return;
    if (filtersForm.elements.from.value && filtersForm.elements.to.value && filtersForm.elements.from.value > filtersForm.elements.to.value) {
      notify('Choose a start date on or before the end date.', true); filtersForm.elements.from.focus(); return;
    }
    loadReport(parameters());
  });
  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename;
    document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  async function downloadCSV(path, button, filename) {
    if (!data) return;
    button.disabled = true; notify('Preparing the filtered CSV…');
    try {
      const response = await fetch(`${path}?${appliedQuery}`, { credentials: 'same-origin', cache: 'no-store' });
      if (response.status === 401 || response.status === 403) { window.location.replace('research-login.html'); return; }
      if (!response.ok) throw new Error('The export could not be created. Try again or contact the application administrator.');
      const type = response.headers.get('content-type') || '';
      if (!type.includes('text/csv')) throw new Error('The server did not return a CSV file. Nothing was downloaded.');
      saveBlob(await response.blob(), filename);
      notify('CSV download requested. The file uses the applied filters. Review disclosure risk before sharing.');
    } catch (error) { notify(error.message || 'CSV export failed. Please try again.', true); }
    finally { button.disabled = false; }
  }
  document.getElementById('export-summary').addEventListener('click', event => downloadCSV('/api/research/export.csv', event.currentTarget, 'utas-satisfaction-summary.csv'));
  document.getElementById('export-responses').addEventListener('click', event => downloadCSV('/api/research/responses.csv', event.currentTarget, 'utas-satisfaction-coded-responses.csv'));
  document.getElementById('print-report').addEventListener('click', () => { if (data) window.print(); });
  document.querySelectorAll('.chart-download').forEach(button => button.addEventListener('click', async () => {
    if (!data || !window.ResearchCharts) return;
    button.disabled = true; notify('Preparing the figure…');
    try {
      await window.ResearchCharts.download(document.getElementById(button.dataset.chart), button.dataset.format, `utas-${button.dataset.chart}`);
      notify(`${button.dataset.format.toUpperCase()} download requested. Applied filters and version are included in the figure.`);
    } catch (error) { notify(error.message || 'The figure could not be downloaded. Try SVG or print the report.', true); }
    finally { button.disabled = false; }
  }));
  document.getElementById('logout').addEventListener('click', async event => {
    const button = event.currentTarget; button.disabled = true;
    try {
      const response = await fetch('/api/admin-logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!response.ok) throw new Error('Sign-out could not be confirmed. Please try again.');
      data = null; report.hidden = true; window.location.replace('research-login.html');
    } catch (error) { notify(error.message || 'Sign-out could not be confirmed. Check the connection and try again.', true); button.disabled = false; }
  });
  window.addEventListener('beforeprint', () => renderCharts(1080));
  window.addEventListener('afterprint', () => renderCharts());
  window.addEventListener('resize', () => { window.clearTimeout(resizeTimer); resizeTimer = window.setTimeout(renderCharts, 200); });
  window.addEventListener('pageshow', event => {
    if (event.persisted) { data = null; report.hidden = true; loadReport(new URLSearchParams(window.location.search)); }
  });
  const initial = new URLSearchParams(window.location.search);
  const params = new URLSearchParams();
  ['from', 'to', 'lab', 'version'].forEach(key => { if (initial.has(key)) params.set(key, initial.get(key)); });
  loadReport(params);
})();
