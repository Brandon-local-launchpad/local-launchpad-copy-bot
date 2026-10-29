'use strict';

// ── New post and page improvement candidates from the Search Console rows (B16, stage 9) ──
// A query is a new post candidate when it has 10 or more impressions in the 90 days, an average
// position worse than 10 (off page one), no page or post on the site owns it, and it is a
// question or reads as one (code turns "pergola planning permission southampton" into "Does a
// Pergola Need Planning Permission in Southampton?", for a person to approve or edit).
// A query is a page improvement when a page sits at positions 5 to 20 with 20 or more
// impressions: listed with the page and a suggested FAQ question; nothing is changed by it.
// Owned: the query's words are covered by a page's keyword or H1, one of its H2s or FAQ
// questions, a post's target query, H1, H2 or FAQ wording (stems, blog/same-question.js).
// The thresholds are starting values (the amendment) to check after the first real batch.

const SQ = require('../blog/same-question');
const { titleCase } = require('../h1-research/research');

const THRESHOLDS = { newImpressions: 10, newPosition: 10, improveImpressions: 20, improveFrom: 5, improveTo: 20 };
const QUESTION_RE = /^(?:how|what|why|when|where|which|who|do|does|did|can|could|should|would|is|are|will|am)\b/i;
const lc = s => String(s || '').toLowerCase();
const norm = s => lc(s).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// ── Ownership ──
// owned: [{ kind: 'page'|'post', slug, title, names: [keyword, title, h1], texts: [h2s…, faqs…, a post's wordings] }]
// A page's name owns the query that is that keyword (a town added is another page's); a question
// a page or post asks (an H2, an FAQ, a post's target) owns every query its words cover. A query
// with an angle of its own (cost, planning permission, a comparison, a problem) is never owned by
// a name alone: "how much does garden levelling cost" is a cost guide's, not the levelling page's.
const stemsOf = s => SQ.questionStems(s);
const ANGLE_RE = /\b(?:cost|costs|price|prices|how much|cheap|cheaper|cheapest|planning permission|permission|vs|versus|or|best|near me|ideas?|why|how|when|what|which|who|should|can|could|do|does|is|are|problems?|sinking|cracked|leaking|rotting|dying|brown|yellow|waterlogged|moss|repair|repairs|fix|worth|last|lasts)\b/i;
const sameStems = (a, b) => a.size === b.size && [...a].every(w => b.has(w));
function ownerOf(query, owned) {
  const q = stemsOf(query);
  if (!q.size) return null;
  const angle = ANGLE_RE.test(String(query));
  for (const o of owned) {
    if (!angle) for (const n of o.names || []) { const N = stemsOf(n); if (N.size && sameStems(q, N)) return { ...o, text: n }; }
    for (const t of o.texts || []) {
      const T = stemsOf(t);
      if (!T.size) continue;
      let covered = 0; for (const w of q) if (T.has(w) || [...T].some(x => x.length >= 5 && w.length >= 5 && (x.startsWith(w) || w.startsWith(x)))) covered++;
      if (covered === q.size || (q.size >= 3 && covered >= q.size - 1 && SQ.sameQuestion(query, t))) return { ...o, text: t };
    }
  }
  return null;
}

// ── The question wording for a query that is not one ──
// towns: the client's towns, so "… southampton" becomes "in Southampton"
function questionFromQuery(query, { towns = [] } = {}) {
  let q = norm(query);
  if (!q) return '';
  const isQ = QUESTION_RE.test(q);
  let town = '';
  for (const t of [...towns].sort((a, b) => b.length - a.length)) { const nt = norm(t); if (nt && (q.endsWith(` ${nt}`) || q.startsWith(`${nt} `) || q.includes(` ${nt} `))) { town = t; q = q.replace(new RegExp(`(^| )${nt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`), ' ').replace(/\s+/g, ' ').trim(); break; } }
  const inTown = town ? ` in ${titleCase(town)}` : '';
  const uk = /\b(?:uk|england)\b/.test(q); q = q.replace(/\b(?:uk|england)\b/g, '').replace(/\s+/g, ' ').trim();
  const tail = inTown || (uk ? ' in the UK' : '');
  const cap = s => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
  if (isQ) { const words = q.split(' '); return `${titleCase(words.join(' '))}${tail}?`.replace(/\s+\?/, '?'); }
  const cost = q.match(/^(.*?)\s*(?:cost|costs|price|prices|how much)\s*(.*)$/);
  if (cost) { const thing = `${cost[1]} ${cost[2]}`.replace(/\s+/g, ' ').trim(); return `How Much Does ${titleCase(thing)} Cost${tail}?`; }
  const perm = q.match(/^(.*?)\s*planning permission\s*(.*)$/);
  if (perm) { const thing = `${perm[1]} ${perm[2]}`.replace(/\s+/g, ' ').trim(); return `Does ${/s$/.test(thing) ? '' : /^[aeiou]/.test(thing) ? 'an ' : 'a '}${titleCase(thing)} Need Planning Permission${tail}?`; }
  const vs = q.match(/^(.+?)\s+(?:vs|versus|or)\s+(.+)$/);
  if (vs) return `${titleCase(vs[1])} or ${titleCase(vs[2])}: Which Is Better${tail}?`;
  const best = q.match(/^best\s+(.+)$/);
  if (best) return `What Is the Best ${titleCase(best[1])}${tail}?`;
  const nearMe = q.replace(/\bnear me\b/g, '').replace(/\s+/g, ' ').trim();
  if (nearMe !== q) return `How Do You Choose ${/s$/.test(nearMe) ? '' : /^[aeiou]/.test(nearMe) ? 'an ' : 'a '}${titleCase(nearMe)}${tail}?`;
  const ideas = q.match(/^(.*?)\s*ideas?\s*(.*)$/);
  if (ideas) return `What ${titleCase(ideas[1] || 'garden')} Ideas Work Well${ideas[2] ? ` for a ${titleCase(ideas[2])}` : ''}${tail}?`;
  if (/\b(?:repair|repairs|fix|problems?|sinking|cracked|leaking|rotting|dying|brown|yellow|waterlogged|moss)\b/.test(q)) return `What Can Be Done About ${titleCase(q)}${tail}?`;
  return `What Should You Know About ${cap(titleCase(q))}${tail}?`;
}

// rows: the Search Console rows (query, page, clicks, impressions, position); the same query on several
// pages is summed (impressions and clicks) with the best position's page kept.
// owned: see ownerOf; towns: the client's; thresholds: THRESHOLDS.
// Returns { newPosts, improvements, dropped: [{ query, why }], counts }
function findCandidates({ rows = [], owned = [], towns = [], thresholds = THRESHOLDS } = {}) {
  const T = { ...THRESHOLDS, ...thresholds };
  const byQuery = new Map();
  for (const r of rows) {
    const key = norm(r.query);
    if (!key) continue;
    const cur = byQuery.get(key) || { query: r.query, impressions: 0, clicks: 0, position: Infinity, page: '', pages: [] };
    cur.impressions += r.impressions || 0; cur.clicks += r.clicks || 0;
    if (r.page) cur.pages.push({ page: r.page, impressions: r.impressions || 0, position: r.position || 0 });
    if ((r.position || 0) > 0 && (r.position || 0) < cur.position) { cur.position = r.position; cur.page = r.page || cur.page; }
    byQuery.set(key, cur);
  }
  const newPosts = [], improvements = [], dropped = [];
  for (const c of byQuery.values()) {
    if (!Number.isFinite(c.position)) c.position = 0;
    const owner = ownerOf(c.query, owned);
    const inWindow = c.position >= T.improveFrom && c.position <= T.improveTo && c.impressions >= T.improveImpressions;
    if (inWindow && (owner || c.page)) {
      improvements.push({ query: c.query, impressions: c.impressions, clicks: c.clicks, position: Math.round(c.position * 10) / 10, page: owner ? owner.slug : c.page, owner: owner ? { kind: owner.kind, title: owner.title, text: owner.text } : null, suggestion: `Add an FAQ: ${questionFromQuery(c.query, { towns })}` });
    }
    if (c.impressions < T.newImpressions) { dropped.push({ query: c.query, why: `${c.impressions} impressions (10 needed)` }); continue; }
    if (c.position > 0 && c.position <= T.newPosition) { dropped.push({ query: c.query, why: `average position ${Math.round(c.position * 10) / 10} (page one already)` }); continue; }
    if (owner) { dropped.push({ query: c.query, why: `owned by the ${owner.kind} ${owner.slug} ("${owner.text}")` }); continue; }
    const wording = questionFromQuery(c.query, { towns });
    newPosts.push({ query: c.query, impressions: c.impressions, clicks: c.clicks, position: Math.round(c.position * 10) / 10, wording, is_question: QUESTION_RE.test(norm(c.query)), page: c.page || '' });
  }
  newPosts.sort((a, b) => b.impressions - a.impressions || a.position - b.position);
  improvements.sort((a, b) => b.impressions - a.impressions);
  return { newPosts, improvements, dropped, counts: { queries: byQuery.size, newPosts: newPosts.length, improvements: improvements.length, dropped: dropped.length }, thresholds: T };
}

// The owned texts from the page map rows, the written records and the blog rows
// pages: [{ type, slug, title, h1, info }] (the page map); records: Map slug → record (the written pages); blogRows: the blog rows
function ownedFrom({ pages = [], records = new Map(), blogRows = [] } = {}) {
  const owned = [];
  for (const p of pages) {
    if (p.type === 'blog' || p.applies === false) continue;
    const rec = records.get(p.slug) || null;
    const names = [p.title, p.h1, (p.info || {}).keyword, (p.info || {}).target_keyword].filter(t => t && typeof t === 'string');
    const texts = (rec ? [...(rec.sections || []).map(s => s.h2), ...(rec.faq_items || []).map(f => f.faq_question), ...Object.keys(rec).filter(k => /_h2$/.test(k)).map(k => rec[k])] : []).filter(t => t && typeof t === 'string' && t !== 'HIDDEN');
    owned.push({ kind: 'page', slug: p.slug, title: p.title || p.h1 || p.slug, names, texts });
  }
  for (const b of blogRows) {
    if (b.applies === false) continue;
    const info = b.info || {};
    const rec = records.get(b.slug) || null;
    const texts = [b.h1, info.wording, info.target_query, info.source_query, ...((info.stack || []).map(s => s.wording)), ...((info.faq || []).map(f => f.wording)), ...(rec ? [...(rec.sections || []).map(s => s.h2), ...(rec.faq_items || []).map(f => f.faq_question)] : [])].filter(t => t && typeof t === 'string');
    owned.push({ kind: 'post', slug: b.slug, title: b.h1 || b.slug, names: [], texts });
  }
  return owned;
}

module.exports = { findCandidates, ownerOf, questionFromQuery, ownedFrom, THRESHOLDS, QUESTION_RE };
