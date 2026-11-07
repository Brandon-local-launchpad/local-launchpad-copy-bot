'use strict';

// ── Working practices in the copy (Brandon, 7 Nov 2026) ──────────────────────
// Three kinds, set by "kind" in niche-library/practices.json:
//   confirmed      the client's own: confirmed_practices, auto filled from the onboarding form (formPractices)
//   kind "method"  how the job is done: allowed without confirmation
//   anything else  a promise about the business. Unconfirmed, it is left out: code deletes the sentence after each
//                  draft and retry. No BLOCK, no retry. A field that is only that sentence can't lose it, so it
//                  gets one FLAG to write around it (validate-v20.js); if that fails it goes to the edit list.
// A trade facts stage may also be described as the job, never as a "we" promise (validate-v20.js isTradeStage).

const { practiceClaims } = require('./practices');

// Sentences with the white space after each, so a field can be put back together exactly
const sentencesOf = t => (String(t || '').match(/[^.!?]+(?:[.!?]+["'’”)\]]*)?(?:\s+|$)/g) || []);

// The practices to leave out of this sentence
function promisesIn(sentence, V) {
  const { helpers: { scanText }, isTradeStage } = require('./validate-v20');
  const confirmed = new Set((V.cv && V.cv.confirmed_practices) || []);
  const plain = scanText(sentence);
  return practiceClaims(plain, V.niche).filter(c => !confirmed.has(c.practice.key) && c.practice.kind !== 'method' && !isTradeStage(c.match, plain, V));
}

// Returns what it removed: [{ field, sentence, practice }]
function stripPromises(record, V) {
  const { modelFields, setField } = require('./validate-v20');
  const removed = [];
  for (const f of modelFields(record)) {
    if (!f.text || f.text === 'HIDDEN') continue;
    const parts = sentencesOf(f.text);
    const keep = parts.filter(s => !promisesIn(s, V).length);
    if (keep.length === parts.length || !keep.length) continue;
    for (const s of parts.filter(x => !keep.includes(x))) removed.push({ field: f.label, sentence: s.trim(), practice: promisesIn(s, V).map(c => c.practice.label).join('; ') });
    setField(record, f.ref, keep.join('').replace(/\n{3,}/g, '\n\n').trim());
  }
  return removed;
}

// ── The onboarding form's answers as practices ───────────────────────────────
// Only structured answers that say it outright. No new questions; voice notes aren't read.
const stated = v => (Array.isArray(v) ? v.join(' ') : typeof v === 'string' ? v : v && (v.value || v.text || v.label) ? String(v.value || v.text || v.label) : '');
const FORM_PRACTICES = [
  { key: 'price_agreed_before_work', field: 'stand_out', test: t => /\bfixed[\s-]?pric/i.test(t), why: 'Says fixed pricing' },
  { key: 'written_quote', field: 'written_quotes', test: t => /^\s*(?:yes|yep|yeah|always)\b/i.test(t) && !/\bno\b/i.test(t.slice(0, 3)), why: 'Says yes to written quotes' },
];

// fields: { field_key: value } of the client's filled form answers. Returns [{ key, field, answer, why }]
function formPractices(fields = {}) {
  const out = [];
  for (const p of FORM_PRACTICES) {
    const answer = stated(fields[p.field]);
    if (answer && p.test(answer)) out.push({ key: p.key, field: p.field, answer, why: p.why });
  }
  return out;
}

// The client values with the form's practices added. Ticks saved by hand on the Record tab stand as they are.
function withFormPractices(cv, fields) {
  const hand = cv && cv._sources && cv._sources.confirmed_practices === 'hand';
  if (hand) return cv;
  const have = Array.isArray(cv.confirmed_practices) ? cv.confirmed_practices : [];
  return { ...cv, confirmed_practices: [...new Set([...have, ...formPractices(fields).map(p => p.key)])] };
}

const FORM_FIELD_KEYS = [...new Set(FORM_PRACTICES.map(p => p.field))];

module.exports = { sentencesOf, promisesIn, stripPromises, formPractices, withFormPractices, FORM_FIELD_KEYS };
