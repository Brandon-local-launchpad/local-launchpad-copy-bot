'use strict';

// ── Category page block briefs by business type (23 Oct 2026) ────────────────
// A niche entry carries `category_page_blocks`, keyed by business type (A, A2, B, C, D),
// each with an optional `emergency` variant. One entry gives block 4 (common problems)
// and block 5 (cost factors) as an H2 plus four card titles with a one line brief each,
// the three process steps, the FAQ slots and, for a seasonal niche, the one card and the
// one FAQ that swap in. `category_types` lets a category override the client's type
// (Gardener → B on a type A landscaper). Until a niche has the section, the job refuses
// its category pages: "no category block briefs for [niche]".
//
// Shape (niche-library/<niche>.json):
//   "seasonal_trade": true,
//   "category_types": { "gardener": "B" },
//   "category_page_blocks": {
//     "A": {
//       "problems": { "h2": "Common [CAT] Problems", "cards": [{ "title", "brief" } x4] },
//       "cost":     { "h2": "What Affects the Cost of [CAT] in [CITY]", "cards": [{ "title", "brief" } x4] },
//       "steps":    [{ "title", "brief" } x3],
//       "faq_slots": [{ "slot": "cost" | "cover" | "scope" | "process" | "timing", "when"?: "guarantee" | "insurance" | "price_list" | "start_time" | "quote_free",
//                      "question", "answer_brief", "doubt" }],
//       "faq_symptom": { "frame": "[SYMPTOM]: why does it happen, and what can be done?", "answer_brief", "doubt": "Process" },
//       "seasonal": { "problem_card": { "title", "brief" }, "faq_slot": { "slot": "seasonal", "question", "answer_brief", "doubt" } },
//       "emergency": { ...the same keys, each replacing its A counterpart when the emergency layout is on }
//     },
//     "B": { ... }
//   }

const lc = s => String(s || '').toLowerCase().trim();

// The business type a category page is written for: the category's override, else the
// client's business_type, else the niche default. Returns the letter and the markers.
function typeFor({ niche, cv = {}, category }) {
  const override = (niche.category_types || {})[lc(category)];
  const raw = lc(override || cv.business_type || niche.business_type_default || 'A');
  const letter = ['a', 'b', 'c', 'd'].includes(raw[0]) ? raw[0].toUpperCase() : 'A';
  const a2 = letter === 'A' && !!niche.big_ticket && cv.handles_planning === 'yes';
  const emergencyOn = !!(niche.emergency_niche && cv.emergency_primary === 'yes');
  return { letter, a2, emergencyOn, source: override ? 'category' : cv.business_type ? 'client' : 'niche default' };
}

class NoBriefsError extends Error {
  constructor(msg, detail) { super(msg); this.code = 'G-BRIEF'; this.status = 422; this.detail = detail; }
}

// The block entry for a page: A2 when the marker is set and an A2 entry exists, the
// emergency variant laid over it when the emergency layout is on. Throws NoBriefsError.
function blocksFor({ niche, cv = {}, category }) {
  const nicheName = niche._source || niche.trade_lower || niche.trade || 'this niche';
  const all = niche.category_page_blocks;
  if (!all || typeof all !== 'object' || !Object.keys(all).length) {
    throw new NoBriefsError(`no category block briefs for ${nicheName}`, { niche: nicheName });
  }
  const t = typeFor({ niche, cv, category });
  const key = t.a2 && all.A2 ? 'A2' : t.letter;
  const base = all[key];
  if (!base) throw new NoBriefsError(`no category block briefs for ${nicheName} type ${key}`, { niche: nicheName, type: key });
  const entry = t.emergencyOn && base.emergency ? { ...base, ...base.emergency } : base;
  return { ...t, key, entry, emergencyUsed: !!(t.emergencyOn && base.emergency) };
}

// What a block entry lacks, as F-BRIEF messages (the page still runs with what there is)
function briefGaps(entry) {
  const gaps = [];
  const cards = b => (entry[b] && Array.isArray(entry[b].cards) ? entry[b].cards : []);
  if (cards('problems').length < 4) gaps.push(`block 4 has ${cards('problems').length} card brief(s), not 4`);
  if (cards('cost').length < 4) gaps.push(`block 5 has ${cards('cost').length} card brief(s), not 4`);
  for (const b of ['problems', 'cost']) for (const c of cards(b)) if (!c.title || !c.brief) gaps.push(`block ${b === 'problems' ? 4 : 5} card "${c.title || '(untitled)'}" has no ${c.title ? 'brief' : 'title'}`);
  const slots = Array.isArray(entry.faq_slots) ? entry.faq_slots : [];
  for (const s of ['cost', 'cover', 'scope', 'process']) if (!slots.some(x => x.slot === s)) gaps.push(`no "${s}" FAQ slot`);
  if (!entry.faq_symptom) gaps.push('no faq_symptom entry');
  return gaps;
}

// The FAQ slots a page uses: one per slot name in the entry's order, the first whose
// `when` holds (none = always). Five at most before the symptom question (max), unless the
// caller allows a sixth for a slot marked when: rule_rows (a service with Table C rule rows).
function pickFaqSlots(entry, cv = {}, { quoteFree = '', ruleRows = false, max = 5 } = {}) {
  const holds = when => {
    if (!when) return true;
    if (when === 'guarantee') return !!((cv.guarantee_years && parseInt(cv.guarantee_years, 10) > 0) || cv.manufacturer_warranty);
    if (when === 'insurance') return !!cv.insurance_cover;
    if (when === 'price_list') return !!cv.price_list;
    if (when === 'start_time') return !!cv.start_time;
    if (when === 'quote_free') return !!quoteFree;
    if (when === 'not_quote_free') return !quoteFree;
    if (when === 'rule_rows') return !!ruleRows;
    return false;
  };
  const out = [];
  const seen = new Set();
  for (const s of (Array.isArray(entry.faq_slots) ? entry.faq_slots : [])) {
    if (!s || !s.slot || seen.has(s.slot) || !holds(s.when)) continue;
    seen.add(s.slot);
    out.push({ slot: s.slot, question: s.question, answer_brief: s.answer_brief || '', doubt: s.doubt || '' });
  }
  return out.slice(0, max);
}

// The seasonal swap: card 4 of block 4 gives way to the entry's seasonal card. The seasonal
// FAQ replaces the slot named timing (else the last slot that isn't cost, cover or scope) on
// a type A page; on a type B page the five slots stay (insurance is always one of them) and
// the seasonal question takes the symptom question's place instead (Brandon, 25 Oct):
// symptomSwap carries it for the caller to push where the symptom question would go.
function applySeasonal(niche, entry, { problems, faqs, letter = 'A' }) {
  const S = entry.seasonal;
  if (!niche.seasonal_trade || !S) return { problems, faqs, swapped: false, symptomSwap: null };
  const p = [...problems];
  if (S.problem_card && S.problem_card.title) p[Math.min(3, Math.max(0, p.length - 1))] = { title: S.problem_card.title, brief: S.problem_card.brief || '', mechanism: S.problem_card.mechanism || '', seasonal: true };
  let q = [...faqs];
  let symptomSwap = null;
  if (S.faq_slot && S.faq_slot.question) {
    const swap = { slot: 'seasonal', question: S.faq_slot.question, answer_brief: S.faq_slot.answer_brief || '', doubt: S.faq_slot.doubt || 'Timing', seasonal: true };
    if (letter === 'B') symptomSwap = swap;
    else {
      let i = q.findIndex(x => x.slot === 'timing');
      if (i < 0) { for (let j = q.length - 1; j >= 0; j--) if (!['cost', 'cover', 'scope'].includes(q[j].slot)) { i = j; break; } }
      if (i >= 0) q[i] = swap; else q.push(swap);
    }
  }
  return { problems: p, faqs: q, swapped: true, symptomSwap };
}

module.exports = { typeFor, blocksFor, briefGaps, pickFaqSlots, applySeasonal, NoBriefsError };
