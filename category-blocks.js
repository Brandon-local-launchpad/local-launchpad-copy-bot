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

// The client has confirmed emergency call outs (3 Nov 2026): the hand set Emergency primary
// field wins when it says no; otherwise a yes there, or a yes on the onboarding question
// "Do you take emergency call-outs?" (emergency_callouts), confirms it.
const yes = v => /^\s*yes/i.test(Array.isArray(v) ? v.join(' ') : String(v || ''));
function clientEmergency(cv = {}) {
  if (lc(cv.emergency_primary) === 'no') return false;
  return lc(cv.emergency_primary) === 'yes' || yes(cv.emergency_callouts);
}

// The site takes urgent symptoms in the allocation pass (4 Nov 2026): the client confirms call
// outs and the page map has a service page flagged emergency (page map rows, or the v3 context's
// pages). The old niche level emergency_niche marker used to decide this; nothing reads it now.
function emergencySite(cv = {}, rows = []) {
  return clientEmergency(cv) && (rows || []).some(r => r && (r.type === 'service' || r.type === 'town_service' || r.pageType === 'service') && !!(r.emergency || (r.info && r.info.emergency)));
}

// Why the emergency layout is on or off, for the DECISIONS block. names: the flagged pages
// the page's cards lead to (a service page: itself)
function emergencyWhy(on, names, cv = {}) {
  if (on) return `${names.join(', ')} ${names.length > 1 ? 'are emergency pages' : 'is an emergency page'} and the client confirms emergency call outs`;
  if (!names.length) return 'no page here is flagged emergency in the niche library';
  return clientEmergency(cv) ? '' : `${names.join(', ')} ${names.length > 1 ? 'are emergency pages' : 'is an emergency page'} but the client has not confirmed emergency call outs`;
}

// The business type a category page is written for: the category's override, else the
// client's business_type, else the niche default. Returns the letter and the markers.
// emergencyPage (3 Nov 2026): the page qualifies for the emergency briefs: a service page
// flagged `emergency` in the niche library, or a category, location or homepage whose cards
// lead to one. The emergency layout is on only when the client has confirmed call outs AND
// the page qualifies; every other page gets the plain briefs.
function typeFor({ niche, cv = {}, category, emergencyPage = false }) {
  const override = (niche.category_types || {})[lc(category)];
  const raw = lc(override || cv.business_type || niche.business_type_default || 'A');
  const letter = ['a', 'b', 'c', 'd'].includes(raw[0]) ? raw[0].toUpperCase() : 'A';
  const a2 = letter === 'A' && !!niche.big_ticket && cv.handles_planning === 'yes';
  const emergencyOn = clientEmergency(cv) && !!emergencyPage;
  return { letter, a2, emergencyOn, source: override ? 'category' : cv.business_type ? 'client' : 'niche default' };
}

class NoBriefsError extends Error {
  constructor(msg, detail) { super(msg); this.code = 'G-BRIEF'; this.status = 422; this.detail = detail; }
}

// The block entry for a page: A2 when the marker is set and an A2 entry exists, the
// emergency variant laid over it when the emergency layout is on. Throws NoBriefsError.
// category_overrides (copy quality 2, phase 2, 4 Nov 2026): the entry may replace block 5 (cost), the
// steps or block 4 (problems) for one category, keyed by the category name in lower case, and set
// always_emergency so the page takes the urgent framing whatever the client values say:
//   "category_overrides": { "paving contractor": { "cost": { "h2", "cards": [x4] }, "steps": [x3] } }
// A step 2 title that promises a look before the price ("We Walk It and Price the Round") goes back to the
// niche's no visit step when the client has not confirmed site visits (copy quality 3, 4 Nov 2026). A step 2
// that is the job itself ("We Measure and Draw It", "We Test on a Day That Suits You") stays.
const VISIT_STEP_RE = /\b(?:look|walk|measure|survey|visit|count|find)\b.*\bprice\b/i;
function overrideStepsFor(steps, niche = {}, cv = {}) {
  if (!Array.isArray(steps) || steps.length < 2) return steps;
  if ((cv.confirmed_practices || []).includes('site_visit_before_quote') || !niche.step_2_no_visit) return steps;
  return steps.map((s, i) => (i === 1 && VISIT_STEP_RE.test(s.title || '') ? niche.step_2_no_visit : s));
}

// A step title is a claim the reader sees (Brandon, 4 Nov 2026). Emergency step 2 promising the price or
// an arrival needs [CV: quote_method] (and [CV: response_time] for an arrival), else it reads "We Come
// Out and Make It Safe"; a step 2 promising a look before the price needs site_visit_before_quote; any
// other title that states an unconfirmed practice goes to a plain one. The brief stays with the step.
const EMERGENCY_STEP_2 = { title: 'We Come Out and Make It Safe', brief: 'What usually happens first when someone arrives, from the trade facts stages for this service: what is looked at, what is made safe, and what the customer is told. No arrival time unless [CV: response_time] is set. Nothing about how the price is reached. Never restates \'free\'.' };
const PLAIN_STEP = ['Tell Us What You Need', 'We Price Your Job', 'We Do the Work'];
function gateStepTitles(steps, { niche = {}, cv = {}, emergencyOn = false } = {}) {
  if (!Array.isArray(steps)) return steps;
  const { practiceClaims } = require('./practices');
  const confirmed = new Set(cv.confirmed_practices || []);
  return steps.map((s, i) => {
    if (!s || !s.title) return s;
    if (i === 1 && emergencyOn && /\b(?:price|quote|arrival)\b/i.test(s.title)) {
      const ok = String(cv.quote_method || '').trim() && (!/\barrival\b/i.test(s.title) || String(cv.response_time || '').trim());
      return ok ? s : EMERGENCY_STEP_2;
    }
    if (i === 1 && !emergencyOn && VISIT_STEP_RE.test(s.title) && !confirmed.has('site_visit_before_quote') && niche.step_2_no_visit) return niche.step_2_no_visit;
    if (practiceClaims(s.title, niche).some(c => !confirmed.has(c.practice.key))) {
      if (i === 1 && niche.step_2_no_visit) return niche.step_2_no_visit;
      return { ...s, title: PLAIN_STEP[Math.min(i, PLAIN_STEP.length - 1)] };
    }
    return s;
  });
}

function overrideFor(map, name) { return (map && typeof map === 'object' && map[lc(name)]) || null; }
function applyOverride(entry, over) {
  if (!over) return entry;
  const out = { ...entry };
  if (over.problems) out.problems = over.problems;
  if (over.cost) out.cost = over.cost;
  if (Array.isArray(over.steps) && over.steps.length) out.steps = over.steps;
  if (Array.isArray(over.faq_slots) && over.faq_slots.length) out.faq_slots = over.faq_slots;
  if (over.included && Array.isArray(over.included.items) && over.included.items.length) out.included = over.included;
  return out;
}

function blocksFor({ niche, cv = {}, category, emergencyPage = false }) {
  const nicheName = niche._source || niche.trade_lower || niche.trade || 'this niche';
  const all = niche.category_page_blocks;
  if (!all || typeof all !== 'object' || !Object.keys(all).length) {
    throw new NoBriefsError(`no category block briefs for ${nicheName}`, { niche: nicheName });
  }
  const over = overrideFor(niche.category_overrides, category);
  const t = typeFor({ niche, cv, category, emergencyPage });
  if (over && over.always_emergency) t.emergencyOn = true;
  const key = t.a2 && all.A2 ? 'A2' : t.letter;
  const base = all[key];
  if (!base) throw new NoBriefsError(`no category block briefs for ${nicheName} type ${key}`, { niche: nicheName, type: key });
  const entry = applyOverride(t.emergencyOn && base.emergency ? { ...base, ...base.emergency } : base, over);
  return { ...t, key, entry, emergencyUsed: !!(t.emergencyOn && base.emergency), overrideUsed: !!over, forcedEmergency: !!(over && over.always_emergency) };
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
// ── Elements tagged with the services they depend on (copy quality 6, 5 Nov 2026) ─
// A block 4 card, block 5 card, FAQ slot or step may carry "needs": [page targets from the niche's library]:
// it is true only of a firm that offers one of them ("Boarded tonight" needs Burglary repairs and boarding up).
// Code drops an element whose service the client hasn't confirmed and uses the next eligible one.
// confirmed: a Set of lower case names, or null when the client's list isn't known (nothing is dropped).
const eligibleFor = (el, confirmed) => !confirmed || !el || !Array.isArray(el.needs) || !el.needs.length || el.needs.some(n => confirmed.has(lc(n)));

// The services a client has confirmed, from the page map: its service pages and what its categories mention
function confirmedFromRows(rows = [], own = '') {
  const out = new Set();
  for (const r of rows || []) {
    if (!r || r.applies === false) continue;
    if (r.type === 'service') out.add(lc(r.title));
    if (r.type === 'town_service' && r.info && r.info.service_name) out.add(lc(r.info.service_name));
    const mentioned = (r.type === 'category' && r.info && r.info.links && r.info.links.mentioned) || [];
    for (const m of mentioned) out.add(lc(m));
  }
  if (!out.size) return null;
  if (own) out.add(lc(own));
  return out;
}
// The same from the homepage's context: every key with a parent category is a confirmed service
// A client on the older uploaded page map carries its own service names, so each is read through the library to its target
function confirmedFromContext(keyValueMap = {}, serviceParentMap = {}, niche = null) {
  const names = Object.keys(serviceParentMap || {}).map(k => keyValueMap[k]).filter(Boolean);
  const out = new Set(names.map(lc));
  if (niche) {
    try {
      const L = require('./niche-library/library');
      const stem = L.stemOfEntry(niche);
      const set = stem ? L.loadLibrarySet(stem) : null;
      if (set) for (const n of names) for (const m of L.findEntries(set, n, [], { fuzzy: true })) if (m.entry && m.entry.target) out.add(lc(m.entry.target));
    } catch (e) { /* no library for this niche: the names as they stand */ }
  }
  return out.size ? out : null;
}
// Where the next eligible element comes from: the type's plain set, its no call outs set, then the other types
function sparesFor(all = {}, key = 'A') {
  const base = (all || {})[key] || {};
  const others = Object.keys(all || {}).filter(k => k !== key).map(k => all[k]);
  return [base, base.no_callouts, base.emergency, ...others].filter(Boolean);
}
function filterCards(block, confirmed, spares, section) {
  if (!block || !Array.isArray(block.cards)) return block;
  const kept = block.cards.filter(c => eligibleFor(c, confirmed));
  if (kept.length === block.cards.length) return block;
  const want = Math.min(4, block.cards.length);
  const used = new Set(kept.map(c => lc(c.title)));
  for (const s of spares) {
    for (const c of (s[section] && s[section].cards) || []) {
      if (kept.length >= want) break;
      if (used.has(lc(c.title)) || !eligibleFor(c, confirmed)) continue;
      used.add(lc(c.title));
      kept.push(c);
    }
  }
  return { ...block, cards: kept };
}
// A step keeps its place: a dropped step takes the same place from the first set that has an eligible one
function filterSteps(steps, confirmed, ...fallbacks) {
  if (!Array.isArray(steps) || !confirmed) return steps;
  return steps.map((s, i) => {
    if (eligibleFor(s, confirmed)) return s;
    for (const set of fallbacks) if (Array.isArray(set) && set[i] && eligibleFor(set[i], confirmed)) return set[i];
    return { title: ['Tell Us What You Need', 'We Price Your Job', 'We Do the Work'][Math.min(i, 2)], brief: s.brief };
  });
}
function filterSlots(slots, confirmed, spares) {
  if (!Array.isArray(slots)) return slots;
  const kept = slots.filter(s => eligibleFor(s, confirmed));
  const droppedNames = new Set(slots.filter(s => !eligibleFor(s, confirmed)).map(s => s.slot));
  // A slot name with an eligible variant left needs no spare. No more questions than the entry had
  const open = [...droppedNames].filter(n => !kept.some(s => s.slot === n)).length;
  const names = new Set(kept.map(s => s.slot));
  let added = 0;
  for (const s of spares) {
    for (const f of (Array.isArray(s.faq_slots) ? s.faq_slots : [])) {
      if (added >= open) break;
      if (names.has(f.slot) || !eligibleFor(f, confirmed) || f.when) continue;
      names.add(f.slot);
      kept.push(f);
      added++;
    }
  }
  return kept;
}
function filterEntry(entry, { confirmed = null, spares = [] } = {}) {
  if (!entry || !confirmed) return entry;
  const out = { ...entry };
  if (out.problems) out.problems = filterCards(out.problems, confirmed, spares, 'problems');
  if (out.cost) out.cost = filterCards(out.cost, confirmed, spares, 'cost');
  if (out.steps) out.steps = filterSteps(out.steps, confirmed, ...spares.map(s => s.steps));
  if (out.steps_emergency) out.steps_emergency = filterSteps(out.steps_emergency, confirmed, out.steps, ...spares.map(s => s.steps));
  if (out.faq_slots) out.faq_slots = filterSlots(out.faq_slots, confirmed, spares);
  if (out.seasonal) {
    const pc = out.seasonal.problem_card, fs = out.seasonal.faq_slot;
    if (!eligibleFor(pc, confirmed) || !eligibleFor(fs, confirmed)) delete out.seasonal;
  }
  return out;
}
// A homepage FAQ slot the page always asks for stays whatever its tag says: Q2 and Q3 have no other source
const HOMEPAGE_FIXED_SLOTS = new Set(['faq_2', 'faq_2_fallback', 'faq_3', 'faq_3_none']);
const homepageSlotKept = (slot, confirmed) => HOMEPAGE_FIXED_SLOTS.has(slot.slot) || eligibleFor(slot, confirmed);

// The cost question answers it (copy quality 6): the factor that moves the price most and what the customer can do
const COST_FAQ_RULE = ' Name the factor that moves the price most, then what the customer can do to get a figure (ask for a quote, send photos). Never point to another section.';
function pickFaqSlots(entry, cv = {}, { quoteFree = '', ruleRows = false, max = 5 } = {}) {
  const holds = when => {
    if (!when) return true;
    if (when === 'guarantee') return !!((cv.guarantee_years && parseInt(cv.guarantee_years, 10) > 0) || cv.manufacturer_warranty);
    if (when === 'insurance') return !!cv.insurance_cover;
    if (when === 'price_list') return !!cv.price_list;
    if (when === 'start_time') return !!cv.start_time;
    if (when === 'out_of_hours') return !!cv.out_of_hours_available;
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
    out.push({ slot: s.slot, question: s.question, answer_brief: `${s.answer_brief || ''}${s.slot === 'cost' ? COST_FAQ_RULE : ''}`, doubt: s.doubt || '' });
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

// The client's business type letter (the niche default when unset), for the homepage
function typeLetterFor(cv = {}, niche = {}) {
  const raw = lc(cv.business_type || niche.business_type_default || 'A');
  return ['a', 'b', 'c', 'd'].includes(raw[0]) ? raw[0].toUpperCase() : 'A';
}

// The niche's fears and homepage FAQ slots for a client's type (4 Nov 2026): fears_by_type and
// faq_slots_by_type override the shared lists by type letter, so a maintenance client is not
// sold project fears and project questions. A slot override replaces the shared slot of the
// same name; a new slot name is added after the shared ones.
function fearsFor(niche = {}, cv = {}) {
  const by = niche.fears_by_type || {};
  const t = typeLetterFor(cv, niche);
  return Array.isArray(by[t]) && by[t].length ? by[t] : (niche.fears || []);
}
function faqSlotsFor(niche = {}, cv = {}) {
  const over = ((niche.faq_slots_by_type || {})[typeLetterFor(cv, niche)]) || [];
  if (!Array.isArray(over) || !over.length) return niche.faq_slots || [];
  const out = (niche.faq_slots || []).map(s => over.find(o => o.slot === s.slot) || s);
  for (const o of over) if (!out.some(s => s.slot === o.slot)) out.push(o);
  return out;
}

module.exports = { typeFor, blocksFor, briefGaps, pickFaqSlots, applySeasonal, NoBriefsError, clientEmergency, emergencyWhy, emergencySite, typeLetterFor, fearsFor, faqSlotsFor, overrideFor, applyOverride, overrideStepsFor, gateStepTitles, EMERGENCY_STEP_2, eligibleFor, confirmedFromRows, confirmedFromContext, sparesFor, filterEntry, filterSteps, filterSlots, homepageSlotKept, COST_FAQ_RULE };
