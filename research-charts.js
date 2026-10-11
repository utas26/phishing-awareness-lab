/* Local-only, dependency-free SVG figures for the UTAS research dashboard. */
(function (global) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const FONT = 'Arial, Helvetica, sans-serif';
  const COLORS = ['#b65a53', '#d99871', '#b9c4d0', '#62aaa6', '#176f70'];
  const LABELS = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];
  const INK = '#17354a';
  const MUTED = '#566978';
  const RULE = '#dce5e9';
  let figureNumber = 0;

  function el(doc, name, attrs, text) {
    const node = doc.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(function (key) {
      node.setAttribute(key, String(attrs[key]));
    });
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function add(parent, name, attrs, text) {
    const node = el(parent.ownerDocument, name, attrs, text);
    parent.appendChild(node);
    return node;
  }

  function text(parent, x, y, value, attrs) {
    return add(parent, 'text', Object.assign({
      x: x, y: y, fill: INK, 'font-family': FONT, 'font-size': 14
    }, attrs || {}), value);
  }

  function count(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }

  function recorded(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
  }

  function number(value) {
    return count(value).toLocaleString('en');
  }

  function percent(n, denominator) {
    return denominator ? (100 * n / denominator).toFixed(1) + '%' : 'Not estimable';
  }

  function normalize(item, index) {
    item = item || {};
    const counts = Array.from({ length: 5 }, function (_, i) {
      return count(Array.isArray(item.counts) ? item.counts[i] : 0);
    });
    return {
      id: item.id === undefined ? 'Q' + (index + 1) : String(item.id),
      text: item.text == null ? 'Item wording not supplied' : String(item.text),
      counts: counts,
      valid: counts.reduce(function (sum, n) { return sum + n; }, 0),
      na: count(item.na),
      missing: count(item.missing)
    };
  }

  // A conservative character measure keeps words intact without canvas/font loading.
  // Long unbroken tokens are split, never removed. Original wording also lives in <desc>.
  function wrap(value, width, size) {
    const budget = Math.max(8, Math.floor(width / (size * 0.57)));
    const lines = [];
    String(value == null ? '' : value).split(/\r?\n/).forEach(function (paragraph) {
      const words = paragraph.split(/\s+/).filter(Boolean);
      let line = '';
      words.forEach(function (word) {
        if (word.length > budget) {
          if (line) { lines.push(line); line = ''; }
          while (word.length > budget) {
            lines.push(word.slice(0, budget));
            word = word.slice(budget);
          }
        }
        if (!word) return;
        if (line && line.length + word.length + 1 > budget) {
          lines.push(line);
          line = word;
        } else {
          line += (line ? ' ' : '') + word;
        }
      });
      lines.push(line);
    });
    return lines.length ? lines : [''];
  }

  function lines(parent, value, x, y, width, size, attrs) {
    const wrapped = wrap(value, width, size);
    const node = text(parent, x, y, '', Object.assign({ 'font-size': size }, attrs || {}));
    wrapped.forEach(function (line, i) {
      add(node, 'tspan', { x: x, dy: i ? size * 1.4 : 0 }, line);
    });
    return wrapped.length * size * 1.4;
  }

  function resolveContainer(container) {
    if (typeof container === 'string') container = global.document.querySelector(container);
    if (!container || !container.ownerDocument || !container.appendChild) {
      throw new TypeError('A chart container element is required.');
    }
    return container;
  }

  function makeFigure(container, options, fallbackTitle, description) {
    container = resolveContainer(container);
    options = options || {};
    const doc = container.ownerDocument;
    const measured = Number(container.clientWidth);
    const requestedWidth = options.width;
    const width = typeof requestedWidth === 'number' && Number.isFinite(requestedWidth)
      ? Math.max(340, Math.min(1200, Math.round(requestedWidth)))
      : measured > 0 ? Math.max(340, Math.min(1200, Math.round(measured))) : 1080;
    const margin = width < 600 ? 18 : 30;
    const title = String(options.title || fallbackTitle);
    const uid = 'research-figure-' + (++figureNumber);
    const svg = el(doc, 'svg', {
      xmlns: NS,
      width: width,
      role: 'img',
      'aria-labelledby': uid + '-title ' + uid + '-desc',
      'font-family': FONT,
      'font-size': 14,
      fill: INK,
      'data-research-chart': 'true',
      'preserveAspectRatio': 'xMinYMin meet'
    });
    svg.style.display = 'block';
    svg.style.width = '100%';
    svg.style.height = 'auto';
    add(svg, 'title', { id: uid + '-title' }, title);
    const desc = add(svg, 'desc', { id: uid + '-desc' }, description);
    add(svg, 'metadata', {}, JSON.stringify({
      generator: 'UTAS ResearchCharts',
      title: title,
      subtitle: options.subtitle || '',
      version: options.version || '',
      filterText: options.filterText || '',
      footer: options.footer || '',
      generatedAt: new Date().toISOString(),
      denominator: 'Where percentages are shown, item-level responses coded 1–5; N/A and missing are excluded.'
    }));
    const background = add(svg, 'rect', { x: 0, y: 0, width: width, height: 1, fill: '#ffffff' });
    let y = margin + 23;
    y += lines(svg, title, margin, y, width - margin * 2, width < 600 ? 21 : 24,
      { 'font-weight': 700 });
    if (options.subtitle) {
      y += 7;
      y += lines(svg, options.subtitle, margin, y, width - margin * 2, 13, { fill: MUTED });
    }
    const context = [];
    if (options.version) context.push('Instrument: ' + String(options.version));
    if (options.filterText) context.push('View: ' + String(options.filterText));
    if (context.length) {
      y += 6;
      y += lines(svg, context.join('  •  '), margin, y, width - margin * 2, 12, { fill: MUTED });
    }
    y += 12;
    add(svg, 'line', { x1: margin, y1: y, x2: width - margin, y2: y, stroke: RULE });
    y += 24;
    return { container: container, svg: svg, desc: desc, background: background,
      width: width, margin: margin, y: y, options: options };
  }

  function finish(figure, y, notes) {
    const svg = figure.svg;
    const margin = figure.margin;
    y += 15;
    add(svg, 'line', { x1: margin, y1: y, x2: figure.width - margin, y2: y, stroke: RULE });
    y += 23;
    (notes || []).forEach(function (note) {
      y += lines(svg, note, margin, y, figure.width - margin * 2, 12, { fill: MUTED });
      y += 5;
    });
    if (figure.options.footer) {
      y += 4;
      y += lines(svg, figure.options.footer, margin, y, figure.width - margin * 2, 11, { fill: MUTED });
    }
    y += margin;
    svg.setAttribute('viewBox', '0 0 ' + figure.width + ' ' + Math.ceil(y));
    svg.setAttribute('height', Math.ceil(y));
    figure.background.setAttribute('height', Math.ceil(y));
    figure.container.replaceChildren(svg);
    return svg;
  }

  function legend(figure, y) {
    const available = figure.width - figure.margin * 2;
    const columns = available >= 890 ? 5 : available >= 540 ? 3 : available >= 360 ? 2 : 1;
    const cell = available / columns;
    LABELS.forEach(function (label, i) {
      const x = figure.margin + (i % columns) * cell;
      const rowY = y + Math.floor(i / columns) * 27;
      add(figure.svg, 'rect', { x: x, y: rowY - 10, width: 12, height: 12, rx: 2, fill: COLORS[i] });
      text(figure.svg, x + 19, rowY, (i + 1) + '  ' + label, { 'font-size': 12 });
    });
    return y + Math.ceil(5 / columns) * 27 + 7;
  }

  function itemDescription(item) {
    const categories = item.counts.map(function (n, i) {
      return (i + 1) + ' ' + LABELS[i] + ': ' + number(n) + ' (' + percent(n, item.valid) + ')';
    });
    return item.id + '. ' + item.text + '. ' + categories.join('; ') +
      '. Valid n=' + number(item.valid) + '; N/A=' + number(item.na) +
      '; missing=' + number(item.missing) + '. Agreement (4–5): ' +
      percent(item.counts[3] + item.counts[4], item.valid) + '.';
  }

  function renderLikert(container, items, options) {
    const data = (Array.isArray(items) ? items : []).map(normalize);
    const figure = makeFigure(container, options, 'Satisfaction across all items',
      'Each bar shows the distribution of valid responses coded 1 through 5 for one item. ' +
      'N/A and missing responses are reported separately and excluded from percentages. ' +
      data.map(itemDescription).join(' '));
    const svg = figure.svg;
    const m = figure.margin;
    const w = figure.width;
    const stacked = w < 760;
    let y = legend(figure, figure.y);
    if (!data.length) {
      y += 22;
      y += lines(svg, 'No item data is available for this view.', m, y, w - m * 2, 16);
      return finish(figure, y, ['No percentages have been calculated.']);
    }
    data.forEach(function (item) {
      const group = add(svg, 'g', { 'data-item-id': item.id });
      add(group, 'title', {}, itemDescription(item));
      const labelWidth = stacked ? w - m * 2 - 44 : Math.max(265, (w - m * 2) * 0.4 - 40);
      text(group, m, y, item.id.toUpperCase(), { 'font-size': 12, 'font-weight': 700, fill: '#176f70' });
      const labelHeight = lines(group, item.text, m + 42, y, labelWidth, 14, { 'font-weight': 600 });
      const barX = stacked ? m : m + labelWidth + 66;
      const barWidth = w - m - barX;
      const barY = stacked ? y + labelHeight + 10 : y - 12;
      const barHeight = 28;
      add(group, 'rect', { x: barX, y: barY, width: barWidth, height: barHeight,
        rx: 3, fill: '#f0f4f6', stroke: '#dce5e9' });
      if (!item.valid) {
        text(group, barX + 10, barY + 19, 'No valid responses', { 'font-size': 12, fill: MUTED });
      } else {
        let x = barX;
        item.counts.forEach(function (n, i) {
          if (!n) return;
          const segmentWidth = barWidth * n / item.valid;
          const segment = add(group, 'rect', { x: x, y: barY, width: segmentWidth,
            height: barHeight, fill: COLORS[i] });
          add(segment, 'title', {}, LABELS[i] + ': ' + number(n) + ' (' + percent(n, item.valid) + ')');
          if (segmentWidth >= 48) {
            text(group, x + segmentWidth / 2, barY + 18,
              Math.round(100 * n / item.valid) + '%', {
                'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700,
                fill: i === 4 ? '#ffffff' : '#07141c'
              });
          }
          x += segmentWidth;
        });
      }
      const detail = 'n = ' + number(item.valid) + '  ·  N/A = ' + number(item.na) +
        '  ·  Missing = ' + number(item.missing);
      let detailY = barY + barHeight + 20;
      detailY += lines(group, detail, barX, detailY, barWidth, 11, { fill: MUTED });
      detailY += 3;
      detailY += lines(group, 'Counts 1–5: ' + item.counts.map(number).join(' / ') +
        '  ·  Agree (4–5): ' + percent(item.counts[3] + item.counts[4], item.valid),
        barX, detailY, barWidth, 11, { fill: MUTED });
      y = Math.max(y + labelHeight, detailY) + 23;
      add(svg, 'line', { x1: m, y1: y - 11, x2: w - m, y2: y - 11, stroke: '#edf1f3' });
      y += 6;
    });
    return finish(figure, y, [
      'Denominator: valid numeric responses (1–5) for each item. N/A and missing are excluded.',
      'Bar labels are rounded percentages; exact counts appear beneath each bar. Items are reported individually; no total scale score is calculated.'
    ]);
  }

  function renderDistribution(container, item, options) {
    const data = normalize(item, 0);
    const figure = makeFigure(container, options, data.id.toUpperCase() + ' response distribution',
      itemDescription(data) + ' Percentages use valid numeric responses only. No mean or scale score is calculated.');
    const svg = figure.svg;
    const m = figure.margin;
    const available = figure.width - m * 2;
    const narrow = figure.width < 600;
    let y = figure.y;
    y += lines(svg, data.text, m, y, available, 16, { 'font-weight': 600 });
    y += 14;
    y += lines(svg, 'Valid n = ' + number(data.valid) + '  ·  N/A = ' + number(data.na) +
      '  ·  Missing = ' + number(data.missing), m, y, available, 12, { fill: MUTED });
    y += 22;
    if (!data.valid) {
      y += lines(svg, 'No valid numeric responses in this view. Percentages are not estimable.',
        m, y, available, 14, { fill: MUTED });
      y += 22;
    }
    data.counts.forEach(function (n, i) {
      const label = (i + 1) + '  ' + LABELS[i];
      const labelY = y;
      const barY = y + 14;
      text(svg, m, labelY, label, { 'font-size': 13, 'font-weight': 600 });
      // Label and value are on separate lines on narrow screens to prevent collisions.
      if (narrow) {
        y += 15;
      } else {
        text(svg, figure.width - m, labelY, number(n) + '  (' + percent(n, data.valid) + ')',
          { 'text-anchor': 'end', 'font-size': 13, 'font-weight': 600 });
      }
      add(svg, 'rect', { x: m, y: barY, width: available, height: 27,
        rx: 3, fill: '#f0f4f6' });
      if (data.valid && n) {
        const rect = add(svg, 'rect', { x: m, y: barY, width: available * n / data.valid,
          height: 27, rx: 3, fill: COLORS[i] });
        add(rect, 'title', {}, label + ': ' + number(n) + ' (' + percent(n, data.valid) + ')');
      }
      if (narrow) {
        text(svg, m, barY + 45, number(n) + '  (' + percent(n, data.valid) + ')',
          { 'font-size': 12, fill: MUTED });
        y = barY + 73;
      } else {
        y = barY + 58;
      }
    });
    // Keep the scale explicit: even a unanimous category occupies exactly 100%.
    text(svg, m, y - 3, '0%', { 'font-size': 11, fill: MUTED });
    text(svg, figure.width - m, y - 3, '100% of valid responses',
      { 'text-anchor': 'end', 'font-size': 11, fill: MUTED });
    return finish(figure, y + 12, [
      'Percentages use valid responses coded 1–5. N/A and missing are separate response states.',
      'This item is reported as a response distribution. No mean or validated scale score is inferred.'
    ]);
  }

  function renderFlow(container, participation, options) {
    const p = participation || {};
    const stages = [
      ['invited', 'Invited'], ['eligible', 'Eligible'], ['opened', 'Opened'],
      ['consented', 'Consented'], ['submitted', 'Submitted records']
    ];
    const complete = recorded(p.complete);
    const partial = recorded(p.partial);
    const analysis = recorded(p.analysis);
    const valueText = function (value) { return value === null ? 'Not recorded' : number(value); };
    const stageDescription = stages.map(function (stage) {
      return stage[1] + ': ' + valueText(recorded(p[stage[0]]));
    }).concat(['Complete: ' + valueText(complete), 'Partial: ' + valueText(partial),
      'In analysis: ' + valueText(analysis)]).join('. ');
    const caveat = 'Submitted records are not necessarily unique participants. Unknown invitation or eligibility totals do not support a response-rate calculation.';
    const figure = makeFigure(container, options, 'Participation and submission flow',
      stageDescription + '. ' + caveat + ' Connecting lines indicate reporting stages, not verified person-level linkage.');
    const svg = figure.svg;
    const m = figure.margin;
    const cardX = m + (figure.width > 750 ? (figure.width - m * 2 - 650) / 2 : 0);
    const cardWidth = Math.min(650, figure.width - m * 2);
    const center = cardX + cardWidth / 2;
    let y = figure.y;
    y += lines(svg, 'Recorded counts at each stage', m, y, figure.width - m * 2, 13, { fill: MUTED });
    y += 12;

    function connector(y1, y2) {
      add(svg, 'line', { x1: center, y1: y1, x2: center, y2: y2,
        stroke: '#9eb2bc', 'stroke-width': 1.5, 'stroke-dasharray': '4 4' });
    }

    function card(x, top, width, label, value, accent) {
      const unknown = value === null;
      const compact = width < 300;
      const height = compact ? 85 : 66;
      add(svg, 'rect', { x: x, y: top, width: width, height: height, rx: 7,
        fill: accent ? '#edf6f5' : unknown ? '#f6f8fa' : '#ffffff',
        stroke: accent ? '#8bbeba' : RULE, 'stroke-width': 1.2 });
      text(svg, x + 18, top + 27, label, { 'font-size': 13, 'font-weight': 600 });
      text(svg, compact ? x + 18 : x + width - 18, compact ? top + 60 : top + 29,
        valueText(value), { 'text-anchor': compact ? 'start' : 'end',
          'font-size': unknown ? 14 : 22, 'font-weight': unknown ? 400 : 700,
          fill: unknown ? MUTED : accent ? '#176f70' : INK });
      if (!compact && !unknown) {
        text(svg, x + width - 18, top + 49, label === 'Submitted records' ? 'records' : 'recorded count',
          { 'text-anchor': 'end', 'font-size': 10, fill: MUTED });
      }
      return height;
    }

    stages.forEach(function (stage) {
      const height = card(cardX, y, cardWidth, stage[1], recorded(p[stage[0]]), stage[0] === 'submitted');
      connector(y + height, y + height + 22);
      y += height + 22;
    });
    const half = (cardWidth - 18) / 2;
    const branchY = y;
    add(svg, 'path', { d: 'M ' + center + ' ' + (y - 8) + ' H ' + (cardX + half / 2) +
      ' V ' + y + ' M ' + center + ' ' + (y - 8) + ' H ' + (cardX + half + 18 + half / 2) + ' V ' + y,
      fill: 'none', stroke: '#9eb2bc', 'stroke-width': 1.5, 'stroke-dasharray': '4 4' });
    const branchHeight = card(cardX, y, half, 'Complete', complete, false);
    card(cardX + half + 18, y, half, 'Partial', partial, false);
    y += branchHeight + 28;
    add(svg, 'path', { d: 'M ' + (cardX + half / 2) + ' ' + (branchY + branchHeight) +
      ' V ' + (y - 12) + ' H ' + (cardX + half + 18 + half / 2) +
      ' V ' + (branchY + branchHeight) + ' M ' + center + ' ' + (y - 12) + ' V ' + y,
      fill: 'none', stroke: '#9eb2bc', 'stroke-width': 1.5, 'stroke-dasharray': '4 4' });
    y += card(cardX, y, cardWidth, 'Included in analysis', analysis, true);
    const notes = [
      caveat,
      'Connecting lines show reporting stages, not verified person-level linkage or attrition. “Not recorded” is distinct from a recorded count of zero.'
    ];
    if (Array.isArray(p.notes)) p.notes.forEach(function (note) { if (note) notes.push(String(note)); });
    else if (p.notes) notes.push(String(p.notes));
    return finish(figure, y + 12, notes);
  }

  async function download(container, format, filename) {
    container = resolveContainer(container);
    const svg = container.tagName && container.tagName.toLowerCase() === 'svg'
      ? container : container.querySelector('svg[data-research-chart]');
    if (!svg) throw new Error('Render a chart before downloading it.');
    const kind = String(format || 'svg').toLowerCase();
    if (kind !== 'svg' && kind !== 'png') throw new Error('Choose SVG or PNG format.');
    const clone = svg.cloneNode(true);
    const box = svg.viewBox && svg.viewBox.baseVal;
    const width = box && box.width ? box.width : Number(svg.getAttribute('width'));
    const height = box && box.height ? box.height : Number(svg.getAttribute('height'));
    if (!(width > 0 && height > 0)) throw new Error('Chart dimensions are unavailable.');
    clone.setAttribute('xmlns', NS);
    clone.setAttribute('width', width);
    clone.setAttribute('height', height);
    clone.style.width = width + 'px';
    clone.style.height = height + 'px';
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      new global.XMLSerializer().serializeToString(clone);
    let blob = new global.Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    if (kind === 'png') {
      const sourceUrl = global.URL.createObjectURL(blob);
      try {
        const img = new global.Image();
        await new Promise(function (resolve, reject) {
          img.onload = resolve;
          img.onerror = function () { reject(new Error('The chart could not be converted to PNG. Try SVG instead.')); };
          img.src = sourceUrl;
        });
        const canvas = container.ownerDocument.createElement('canvas');
        canvas.width = Math.ceil(width * 2);
        canvas.height = Math.ceil(height * 2);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('PNG export is not supported in this browser. Try SVG instead.');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        blob = await new Promise(function (resolve, reject) {
          canvas.toBlob(function (result) {
            if (result) resolve(result);
            else reject(new Error('PNG export failed. Try SVG instead.'));
          }, 'image/png');
        });
      } finally {
        global.URL.revokeObjectURL(sourceUrl);
      }
    }
    const name = String(filename || 'utas-research-chart').replace(/\.(svg|png)$/i, '')
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').slice(0, 180) || 'utas-research-chart';
    const url = global.URL.createObjectURL(blob);
    const link = container.ownerDocument.createElement('a');
    link.href = url;
    link.download = name + '.' + kind;
    link.style.display = 'none';
    container.ownerDocument.body.appendChild(link);
    try { link.click(); } finally {
      link.remove();
      // Let the browser finish reading the blob before releasing it.
      global.setTimeout(function () { global.URL.revokeObjectURL(url); }, 1000);
    }
    return { filename: name + '.' + kind, format: kind, blob: blob,
      width: width * (kind === 'png' ? 2 : 1), height: height * (kind === 'png' ? 2 : 1) };
  }

  global.ResearchCharts = Object.freeze({
    renderLikert: renderLikert,
    renderDistribution: renderDistribution,
    renderFlow: renderFlow,
    download: download
  });
})(window);
