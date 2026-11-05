'use strict';

// ── A Search Console export as the second route (stage 9) ─────────────────────────────
// The "Queries" table export from the Performance report: Top queries, Clicks, Impressions,
// CTR, Position (the column names Google writes, in any order; a Page column when the export
// has one). CTR comes as "3.2%" or 0.032; thousands may carry commas; quotes are the CSV kind.
// A Pages export (Top pages, …) is read too: its rows carry a page and no query.

const HEADERS = {
  query: ['top queries', 'query', 'queries', 'search query'],
  page: ['top pages', 'page', 'pages', 'url'],
  clicks: ['clicks'],
  impressions: ['impressions'],
  ctr: ['ctr'],
  position: ['position', 'average position', 'avg. position'],
};

// One CSV line into cells (quotes, doubled quotes, commas inside quotes)
function splitLine(line) {
  const out = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; } else cur += c; }
    else if (c === '"') inQ = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim());
}
const num = s => { const t = String(s == null ? '' : s).replace(/[%,£\s]/g, ''); const v = parseFloat(t); return Number.isFinite(v) ? v : 0; };
const ctrOf = s => { const t = String(s == null ? '' : s).trim(); const v = num(t); return /%/.test(t) ? v / 100 : (v > 1 ? v / 100 : v); };

// text → { rows: [{ query, page, clicks, impressions, ctr, position }], columns, problems }
function parseSearchConsoleCsv(text) {
  const lines = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim());
  const problems = [];
  if (!lines.length) return { rows: [], columns: {}, problems: ['The file is empty.'] };
  const head = splitLine(lines[0]).map(h => h.toLowerCase());
  const col = {};
  for (const [key, names] of Object.entries(HEADERS)) { const i = head.findIndex(h => names.includes(h)); if (i >= 0) col[key] = i; }
  if (col.query === undefined && col.page === undefined) return { rows: [], columns: col, problems: [`No "Top queries" (or "Top pages") column in the header: ${lines[0].slice(0, 120)}`] };
  if (col.impressions === undefined || col.position === undefined) problems.push('No Impressions or Position column: every row counts as 0 there.');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const c = splitLine(lines[i]);
    if (c.length < 2) continue;
    const query = col.query !== undefined ? String(c[col.query] || '').trim() : '';
    const page = col.page !== undefined ? String(c[col.page] || '').trim() : '';
    if (!query && !page) continue;
    rows.push({ query, page, clicks: num(c[col.clicks]), impressions: num(c[col.impressions]), ctr: col.ctr !== undefined ? ctrOf(c[col.ctr]) : 0, position: num(c[col.position]) });
  }
  return { rows, columns: col, problems };
}

module.exports = { parseSearchConsoleCsv, splitLine };
