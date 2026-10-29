// Shared UI pieces (27 Oct 2026): HTML builders for the card, table, stat tile, status
// dot, running state, the empty / failed / waiting states, toast, confirm, relative
// time, the info dot, a line chart in SVG with PNG export. Everything returns an
// HTML string unless it says otherwise; behaviour is wired by the caller or by
// `wire(root)` for the generic bits (copy buttons, sortable headers, row links).

export const h = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const attr = s => h(s).replace(/\n/g, '&#10;');

// ── API ───────────────────────────────────────────────────────────────────────
export async function api(path, opts = {}) {
  const o = { ...opts, headers: { ...(opts.headers || {}) } };
  if (o.body !== undefined && typeof o.body !== 'string') { o.body = JSON.stringify(o.body); o.headers['Content-Type'] = 'application/json'; }
  const r = await fetch(path, o);
  if (r.status === 401) { location.href = '/login.html'; throw new Error('Signed out'); }
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = { raw: text }; }
  if (!r.ok) { const e = new Error((data && data.error) || `${r.status} ${r.statusText}`); e.status = r.status; e.data = data; throw e; }
  return data;
}

// ── Time ──────────────────────────────────────────────────────────────────────
export function relTime(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime(); if (!t) return '';
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const hr = Math.round(m / 60); if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const d = Math.round(hr / 24); if (d < 14) return `${d} day${d === 1 ? '' : 's'} ago`;
  const w = Math.round(d / 7); if (w < 9) return `${w} week${w === 1 ? '' : 's'} ago`;
  const mo = Math.round(d / 30); if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`;
  return `${Math.round(d / 365)} year${Math.round(d / 365) === 1 ? '' : 's'} ago`;
}
export function fmtDate(iso, withTime = false) {
  if (!iso) return '';
  const d = new Date(iso); if (!d.getTime()) return String(iso);
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return withTime ? `${date}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : date;
}
export const timeEl = iso => iso ? `<span class="tip" data-tip="${attr(fmtDate(iso, true))}">${h(relTime(iso))}</span>` : '<span class="muted">never</span>';

// ── Status ────────────────────────────────────────────────────────────────────
// kind: ok (done, green), wait (waiting on a person, amber), block (red), none (grey), run (blue)
export const dot = kind => `<span class="dot ${h(kind || 'none')}"></span>`;
export const status = (kind, label) => `<span class="status">${dot(kind)}<span>${h(label)}</span></span>`;
export const pill = (kind, label) => `<span class="pill ${h(kind || '')}">${h(label)}</span>`;
export const tag = (kind, label) => `<span class="tag ${h(kind || '')}">${h(label || kind)}</span>`;
export const info = tip => `<span class="info" data-tip="${attr(tip)}">i</span>`;

// ── Blocks ────────────────────────────────────────────────────────────────────
export function card({ title = '', sub = '', actions = '', body = '', flat = false, id = '', cls = '' } = {}) {
  const head = title || actions ? `<div class="card-head"><div><h2>${title}</h2>${sub ? `<div class="sub">${sub}</div>` : ''}</div>${actions ? `<div class="btn-row">${actions}</div>` : ''}</div>` : '';
  return `<section class="card${flat ? ' card-flat' : ''} ${cls}"${id ? ` id="${h(id)}"` : ''}>${head}${body}</section>`;
}

export function tile({ label, value, tip = '', foot = '', href = '', id = '', small = false }) {
  const inner = `<div class="label">${h(label)}${tip ? info(tip) : ''}</div><div class="num${small ? ' small-num' : ''}">${value}</div><div class="foot">${foot}</div>`;
  return href ? `<a class="tile clickable" href="${h(href)}" data-link${id ? ` id="${h(id)}"` : ''}>${inner}</a>` : `<div class="tile"${id ? ` id="${h(id)}"` : ''}>${inner}</div>`;
}

export function empty({ title, text = '', action = '' }) {
  return `<div class="state empty"><h3>${h(title)}</h3>${text ? `<p>${h(text)}</p>` : ''}${action}</div>`;
}
export function failed({ title = 'That did not work', reason = '', retry = '' }) {
  return `<div class="state failed"><h3>${h(title)}</h3>${reason ? `<p>${h(reason)}</p>` : ''}${retry}</div>`;
}
export function waiting({ what, who = '' }) {
  return `<div class="state waiting"><h3>Waiting on a person</h3><p>${h(what)}${who ? ` (${h(who)})` : ''}</p></div>`;
}
// A long-running action in place: a bar, one sentence on what it is doing, one on what comes next
export function running({ now, next = '', done = null, total = null }) {
  const pct = total ? Math.max(3, Math.round((done / total) * 100)) : null;
  return `<div class="running"><div class="bar${pct === null ? ' indeterminate' : ''}"><i style="width:${pct === null ? 35 : pct}%"></i></div><div class="now">${h(now)}${pct !== null ? ` <span class="muted">(${done} of ${total})</span>` : ''}</div>${next ? `<div class="next">${h(next)}</div>` : ''}</div>`;
}
export const skeleton = (n = 3) => `<div class="stack">${Array.from({ length: n }, (_, i) => `<div class="skel" style="width:${80 - i * 15}%"></div>`).join('')}</div>`;

// ── Table ─────────────────────────────────────────────────────────────────────
// columns: [{ key, label, sortable, num, render(row), cls }]; rows: objects; rowHref(row) for a
// clickable row; cards: the phone layout (each cell carries its label)
export function table({ columns, rows, rowHref = null, rowId = null, emptyText = 'Nothing here yet.', cards = false, sort = null, id = '' }) {
  const th = columns.map(c => `<th class="${c.sortable ? 'sortable' : ''} ${c.num ? 'num' : ''}" data-key="${h(c.key)}">${h(c.label)}${sort && sort.key === c.key ? `<span class="arrow">${sort.dir === 'asc' ? '▲' : '▼'}</span>` : ''}</th>`).join('');
  const body = rows.length
    ? rows.map(r => `<tr${rowHref ? ` class="row-link" data-href="${h(rowHref(r))}"` : ''}${rowId ? ` data-id="${h(rowId(r))}"` : ''}>${columns.map(c => `<td class="${c.num ? 'num' : ''} ${c.cls || ''}" data-label="${h(c.label)}">${c.render ? c.render(r) : h(r[c.key])}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${columns.length}" class="no-label"><div class="state">${h(emptyText)}</div></td></tr>`;
  return `<div class="tbl-wrap"><table class="tbl${cards ? ' cards' : ''}"${id ? ` id="${h(id)}"` : ''}><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>`;
}
export function sortRows(rows, sort) {
  if (!sort || !sort.key) return rows;
  const dir = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = a[sort.key], y = b[sort.key];
    if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
    return String(x).localeCompare(String(y), 'en', { numeric: true, sensitivity: 'base' }) * dir;
  });
}

// ── Toast, confirm ────────────────────────────────────────────────────────────
export function toast(msg, kind = '') {
  const el = document.createElement('div'); el.className = `toast ${kind}`; el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, kind === 'bad' ? 6000 : 3200);
}
export function confirm({ title, text = '', ok = 'Continue', cancel = 'Cancel', danger = false }) {
  return new Promise(resolve => {
    const ov = document.createElement('div'); ov.className = 'overlay';
    ov.innerHTML = `<div class="dialog" role="dialog"><h3>${h(title)}</h3>${text ? `<p>${h(text)}</p>` : ''}<div class="btn-row"><button class="btn btn-ghost" data-x="0">${h(cancel)}</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-x="1">${h(ok)}</button></div></div>`;
    ov.addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (b) { ov.remove(); resolve(b.dataset.x === '1'); } else if (e.target === ov) { ov.remove(); resolve(false); } });
    document.body.appendChild(ov);
    ov.querySelector('[data-x="1"]').focus();
  });
}
// A dialog with free content; returns { close }
export function dialog({ title, body, wide = false }) {
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="dialog${wide ? ' wide' : ''}" role="dialog"><div class="card-head"><h3>${h(title)}</h3><button class="btn btn-ghost btn-xs" data-close>Close</button></div><div class="dialog-body">${body}</div></div>`;
  const close = () => ov.remove();
  ov.addEventListener('click', e => { if (e.target.closest('[data-close]') || e.target === ov) close(); });
  document.body.appendChild(ov);
  return { close, el: ov.querySelector('.dialog-body') };
}

// A button's work: the label changes to the running text, no spinner; the caller shows the running state in place
export async function busy(btn, label, fn) {
  if (!btn) return fn();
  const old = btn.textContent; btn.disabled = true; btn.textContent = label;
  try { return await fn(); }
  finally { btn.disabled = false; btn.textContent = old; }
}

export async function copyText(text, btn) {
  try { await navigator.clipboard.writeText(text); } catch (_) {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  if (btn) { const old = btn.textContent; btn.textContent = 'Copied'; btn.classList.add('done'); setTimeout(() => { btn.textContent = old; btn.classList.remove('done'); }, 1500); }
}
export const copyBtn = (text, label = 'Copy') => `<button class="btn btn-copy" data-copy="${attr(text)}">${h(label)}</button>`;

// Generic wiring on a rendered root: copy buttons, row links, sortable headers (onSort(key))
export function wire(root, { onSort = null } = {}) {
  root.addEventListener('click', e => {
    const cp = e.target.closest('[data-copy]'); if (cp) { copyText(cp.dataset.copy, cp); return; }
    const th = e.target.closest('th.sortable'); if (th && onSort) { onSort(th.dataset.key); return; }
    if (e.target.closest('a, button, input, select, textarea, label')) return;
    const tr = e.target.closest('tr.row-link[data-href]'); if (tr) { window.dispatchEvent(new CustomEvent('app:navigate', { detail: tr.dataset.href })); }
  });
}

// ── Score ─────────────────────────────────────────────────────────────────────
export function score(n) {
  if (n === null || n === undefined || n === '') return '<span class="muted">–</span>';
  const v = Number(n); const cls = v >= 8.5 ? 'good' : v >= 7 ? 'mid' : 'low';
  return `<span class="score ${cls}">${v.toFixed(1)}</span>`;
}

// ── Line chart ────────────────────────────────────────────────────────────────
// series: [{ name, points: [{ x: 'YYYY-MM' | number, y }] , colour? }]; x labels in order of
// `xs`; one line per series, the name on the line's end, minimal gridlines, no legend.
const PALETTE = ['#5e63f0', '#3f6bff', '#6b5ae6', '#2563eb', '#8b5cf6', '#0ea5e9', '#4f46e5', '#7c3aed'];
export function lineChart({ series, xs, yMax = 100, yLabel = '', height = 280, width = 760, unit = '' }) {
  const padL = 44, padR = 150, padT = 16, padB = 32;
  const W = width, H = height, iw = W - padL - padR, ih = H - padT - padB;
  const xi = new Map(xs.map((x, i) => [x, i]));
  const px = i => padL + (xs.length <= 1 ? iw / 2 : (i / (xs.length - 1)) * iw);
  const py = y => padT + ih - (Math.max(0, Math.min(yMax, y)) / yMax) * ih;
  const ticks = [0, 25, 50, 75, 100].filter(t => t <= yMax);
  let out = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Inter, system-ui, sans-serif">`;
  out += `<rect width="${W}" height="${H}" fill="#fff"/>`;
  for (const t of ticks) out += `<line class="grid-line" x1="${padL}" x2="${padL + iw}" y1="${py(t)}" y2="${py(t)}" stroke="#e4e6ec"/><text class="axis" x="${padL - 8}" y="${py(t) + 4}" text-anchor="end" fill="#8a8f9c" font-size="11">${t}${unit}</text>`;
  xs.forEach((x, i) => { if (xs.length <= 8 || i % Math.ceil(xs.length / 8) === 0) out += `<text class="axis" x="${px(i)}" y="${H - 10}" text-anchor="middle" fill="#8a8f9c" font-size="11">${h(x)}</text>`; });
  const ends = [];
  series.forEach((s, si) => {
    const colour = s.colour || PALETTE[si % PALETTE.length];
    const pts = s.points.filter(p => xi.has(p.x) && p.y !== null && p.y !== undefined).map(p => ({ x: px(xi.get(p.x)), y: py(p.y), v: p.y }));
    if (!pts.length) return;
    out += `<path class="line" d="${pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}" stroke="${colour}" fill="none" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    for (const p of pts) out += `<circle class="pt" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="${colour}" stroke="#fff" stroke-width="1.5"><title>${h(s.name)}: ${p.v}${unit}</title></circle>`;
    ends.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y, name: s.name, colour });
  });
  // Labels on the line ends, nudged apart so they do not overlap
  ends.sort((a, b) => a.y - b.y);
  let last = -Infinity;
  for (const e of ends) { const y = Math.max(e.y, last + 13); last = y; out += `<text class="line-label" x="${(e.x + 8).toFixed(1)}" y="${(y + 4).toFixed(1)}" fill="${e.colour}" font-size="11.5" font-weight="500">${h(e.name)}</text>`; }
  if (yLabel) out += `<text class="axis" x="${padL}" y="${padT - 4}" fill="#8a8f9c" font-size="11">${h(yLabel)}</text>`;
  out += '</svg>';
  return out;
}
export function exportSvgPng(svgEl, filename = 'chart.png', scale = 2) {
  const xml = new XMLSerializer().serializeToString(svgEl);
  const vb = (svgEl.getAttribute('viewBox') || '0 0 760 280').split(/\s+/).map(Number);
  const img = new Image();
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = vb[2] * scale; c.height = vb[3] * scale;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    const a = document.createElement('a'); a.download = filename; a.href = c.toDataURL('image/png'); a.click();
  };
  img.src = url;
}

// ── Small helpers ─────────────────────────────────────────────────────────────
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const q = (sel, root = document) => root.querySelector(sel);
export const qa = (sel, root = document) => [...root.querySelectorAll(sel)];
export function debounce(fn, ms = 200) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
export function markdownToHtml(md) {
  // The reader view's .md: headings, paragraphs, lists, links, bold, horizontal rules
  const lines = String(md || '').replace(/\r/g, '').split('\n');
  const out = []; let para = []; let list = null;
  const inline = s => h(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of lines) {
    const l = raw.trimEnd();
    const hm = l.match(/^(#{1,5})\s+(.*)$/);
    if (hm) { flush(); out.push(`<h${hm[1].length}>${inline(hm[2])}</h${hm[1].length}>`); continue; }
    if (/^(-{3,}|\*{3,})$/.test(l)) { flush(); out.push('<hr>'); continue; }
    const lm = l.match(/^\s*[-*]\s+(.*)$/); const om = l.match(/^\s*\d+\.\s+(.*)$/);
    if (lm || om) { const kind = lm ? 'ul' : 'ol'; if (list !== kind) { flush(); list = kind; out.push(`<${kind}>`); } out.push(`<li>${inline((lm || om)[1])}</li>`); continue; }
    if (!l.trim()) { flush(); continue; }
    if (list) flush();
    para.push(l.trim());
  }
  flush();
  return out.join('\n');
}
