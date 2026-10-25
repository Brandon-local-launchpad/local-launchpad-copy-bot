'use strict';

// ── Service page block briefs by business type (CORE (17), 25 Oct 2026) ──────
// A niche entry carries `service_page_blocks`, keyed by business type (A, A2, B, C, D),
// each with an optional `emergency` variant, in the shape of `category_page_blocks`
// (category-blocks.js) plus the What's Included block. One entry gives:
//   included   { h2, items: [{ title, brief }] x6 to 8 }   the tick items (the stages of the job for A, what a visit covers for B)
//   problems   { h2, cards: [{ title, brief, mechanism }] x4 }   block 4 (A: signs you need it; B: signs it's time for a visit)
//   cost       { h2, cards: [{ title, brief }] x4 }   block 5
//   steps      [{ title, brief }] x3   (A falls back to the niche steps)
//   faq_slots  [{ slot, when?, question, answer_brief, doubt }]   five before the symptom question; the
//              slot names by type: A cost, timing, cover, rules, scope; B frequency, cost, access, scope, timing
//   faq_symptom, seasonal { problem_card, faq_slot }, emergency { ...overrides }
// The type is the parent category's (category_types) else the client's, as for category pages.
// Placeholders: [SERVICE], [SERVICE_LOWER], [CAT], [CAT_LOWER], [WORK], [WORK_LOWER], [CITY], [TOWN], [SYMPTOM].
// Until a niche has the section, the job refuses its service pages: "no service block briefs for [niche]".

const C = require('./category-blocks');

class NoBriefsError extends Error {
  constructor(msg, detail) { super(msg); this.code = 'G-BRIEF'; this.status = 422; this.detail = detail; }
}

// The block entry for a service page: the parent category's type (or the client's), A2
// when the marker holds and an A2 entry exists, the emergency variant laid over it.
function blocksFor({ niche, cv = {}, category }) {
  const nicheName = niche._source || niche.trade_lower || niche.trade || 'this niche';
  const all = niche.service_page_blocks;
  if (!all || typeof all !== 'object' || !Object.keys(all).length) {
    throw new NoBriefsError(`no service block briefs for ${nicheName}`, { niche: nicheName });
  }
  const t = C.typeFor({ niche, cv, category });
  const key = t.a2 && all.A2 ? 'A2' : t.letter;
  const base = all[key];
  if (!base) throw new NoBriefsError(`no service block briefs for ${nicheName} type ${key}`, { niche: nicheName, type: key });
  const entry = t.emergencyOn && base.emergency ? { ...base, ...base.emergency } : base;
  return { ...t, key, entry, emergencyUsed: !!(t.emergencyOn && base.emergency) };
}

// What a block entry lacks, as F-BRIEF messages (the page still runs with what there is)
function briefGaps(entry) {
  const gaps = [];
  const items = entry.included && Array.isArray(entry.included.items) ? entry.included.items : [];
  if (items.length < 6) gaps.push(`What's Included has ${items.length} item(s), not 6 to 8`);
  if (items.length > 8) gaps.push(`What's Included has ${items.length} items; 8 at most are used`);
  for (const it of items) if (!it.title) gaps.push('a What\'s Included item has no title');
  const cards = b => (entry[b] && Array.isArray(entry[b].cards) ? entry[b].cards : []);
  if (cards('problems').length < 4) gaps.push(`block 4 has ${cards('problems').length} card brief(s), not 4`);
  if (cards('cost').length < 4) gaps.push(`block 5 has ${cards('cost').length} card brief(s), not 4`);
  for (const b of ['problems', 'cost']) for (const c of cards(b)) if (!c.title || !c.brief) gaps.push(`block ${b === 'problems' ? 4 : 5} card "${c.title || '(untitled)'}" has no ${c.title ? 'brief' : 'title'}`);
  for (const c of cards('problems')) if (c.title && !c.mechanism) gaps.push(`block 4 card "${c.title}" has no mechanism`);
  const slots = Array.isArray(entry.faq_slots) ? entry.faq_slots : [];
  for (const s of ['cost', 'scope']) if (!slots.some(x => x.slot === s)) gaps.push(`no "${s}" FAQ slot`);
  if (!entry.faq_symptom) gaps.push('no faq_symptom entry');
  return gaps;
}

module.exports = { blocksFor, briefGaps, pickFaqSlots: C.pickFaqSlots, applySeasonal: C.applySeasonal, typeFor: C.typeFor, NoBriefsError };
