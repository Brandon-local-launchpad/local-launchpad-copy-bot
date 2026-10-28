'use strict';

// ── The cost guide's fixed H2s (Brandon, 28 Oct) ─────────────────────────────
// A cost guide does not take its H2s from the blog question bank: it gets a fixed set from
// prompts/Cost_Guide_Structure.md (Brandon's Cost Guide Structure; a placeholder set until it
// arrives), in order, with a brief each. The bank supplies the FAQ questions only, so the
// shape gate (G-STACK) never holds a cost guide. The file: a "## H2s" heading, then one
// "- <H2> | <brief>" line per H2, with [SERVICE], [SERVICE_TITLE] and [CITY] tokens.

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'prompts', 'Cost_Guide_Structure.md');
const FALLBACK = [
  { wording: 'What Does [SERVICE_TITLE] Cost in [CITY]?', brief: 'the typical range from the PRICE rows and the one thing that moves it most; factors mode: what moves the price, no figures' },
  { wording: 'What Affects the Price of [SERVICE]?', brief: 'the price factors from the PRICE rows and the trade facts price factor rows, each tied to the work it adds' },
  { wording: 'How to Get an Accurate Quote for [SERVICE]', brief: 'what the business checks before quoting, from the confirmed practices and the quote method' },
];

let cache = null;
function loadStructure() {
  if (cache) return cache;
  let text = '';
  try { text = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n'); } catch (_) { text = ''; }
  const section = text.split(/^## H2s\s*$/m)[1] || '';
  const h2s = section.split('\n').filter(l => /^- /.test(l)).map(l => {
    const [wording, brief] = l.replace(/^- /, '').split(' | ');
    return { wording: String(wording || '').trim(), brief: String(brief || '').trim() };
  }).filter(h => h.wording);
  cache = { h2s: h2s.length ? h2s : FALLBACK, source: h2s.length ? path.relative(path.join(__dirname, '..'), FILE) : 'built in fallback', placeholder: /PLACEHOLDER/.test(text) || !h2s.length };
  return cache;
}

const titleCase = s => String(s || '').replace(/\b([a-z])/g, c => c.toUpperCase());
// The H2s for one cost guide: service (lower case; the trade for the Homepage cost guide), city
function costGuideH2s({ service = '', city = '' } = {}) {
  const S = loadStructure();
  const lower = String(service || '').trim().toLowerCase();
  const fill = s => String(s).replace(/\[SERVICE_TITLE\]/g, titleCase(lower)).replace(/\[SERVICE\]/g, lower).replace(/\[CITY\]/g, city || '').replace(/\s+/g, ' ').replace(/\s+\?/, '?').trim();
  return S.h2s.map((h, i) => ({ id: `CG-${i + 1}`, wording: fill(h.wording), brief: fill(h.brief), doubt: 'Price', fixed: true }));
}

module.exports = { costGuideH2s, loadStructure, FILE, FALLBACK };
