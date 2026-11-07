'use strict';

// ── The client's answers on the standard terms (legal pages, Stage 1) ───────
// Pure: takes the stored client fields and the sign-off history and says what the
// legal pages should go by. fillout/service.js stores; nothing here touches the
// database or the model.
//
//   uses_subcontractors, late_payment_interest: yes or no. A client who hasn't
//     answered counts as yes (Brandon, 7 Nov 2026), marked defaulted. Anything that
//     isn't plainly yes or no is unclear, never guessed.
//   standard_terms_confirmed: yes only when the newest answer in the history is the
//     client's own tick on the form. A tick by hand stays on the history but doesn't
//     count: the app has one shared login, so it can't release the hold. Never defaulted.
//   standard_terms_exceptions: the text on the record, else the text on the client's newest
//     form answer, so blanking the field by hand can't release the hold either.

const FORM_KEYS = ['uses_subcontractors', 'late_payment_interest', 'standard_terms_confirmed', 'standard_terms_exceptions'];
const DEFAULT_YES = ['uses_subcontractors', 'late_payment_interest'];

const text = v => (v == null ? '' : String(v).trim());

function yesNo(raw) {
  const t = text(raw);
  if (!t) return { value: 'yes', defaulted: true, unclear: false };
  if (/^(y|yes)$/i.test(t)) return { value: 'yes', defaulted: false, unclear: false };
  if (/^(n|no)$/i.test(t)) return { value: 'no', defaulted: false, unclear: false };
  return { value: null, defaulted: false, unclear: true, given: t };
}

// The newest answer first by the time the client gave it
function newestFirst(history = []) {
  return [...history].sort((a, b) => new Date(b.answered_at) - new Date(a.answered_at));
}

// values: { key: stored value }, history: rows from client_terms_confirmations
function legalAnswers(values = {}, history = []) {
  const latest = newestFirst(history)[0] || null;
  const out = {};
  for (const k of DEFAULT_YES) out[k] = yesNo(values[k]);
  const ticked = !!latest && !!latest.confirmed && latest.source === 'form';
  out.standard_terms_confirmed = {
    value: ticked ? 'yes' : '',
    at: ticked ? latest.answered_at : null,
    source: latest ? latest.source : null,
    by_hand: !!latest && !!latest.confirmed && latest.source !== 'form',
  };
  const newestForm = newestFirst(history).find(h => h.source === 'form');
  out.standard_terms_exceptions = text(values.standard_terms_exceptions) || text(newestForm && newestForm.exceptions);
  return out;
}

module.exports = { FORM_KEYS, legalAnswers, newestFirst };
