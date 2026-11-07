'use strict';

// ── The client's answers on the standard terms (legal pages, Stage 1) ───────
// Pure: takes the stored client fields and the sign-off history and says what the
// legal pages should go by. fillout/service.js stores; nothing here touches the
// database or the model.
//
//   uses_subcontractors, late_payment_interest: yes or no. A client who hasn't
//     answered counts as yes (Brandon, 7 Nov 2026), marked defaulted. Anything that
//     isn't plainly yes or no is unclear, never guessed.
//   standard_terms_confirmed: yes only when the newest answer in the history is a
//     tick. It is never defaulted.
//   standard_terms_exceptions: the text as it stands on the record.

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
  out.standard_terms_confirmed = {
    value: latest && latest.confirmed ? 'yes' : '',
    at: latest && latest.confirmed ? latest.answered_at : null,
    source: latest ? latest.source : null,
  };
  out.standard_terms_exceptions = text(values.standard_terms_exceptions);
  return out;
}

module.exports = { FORM_KEYS, legalAnswers, newestFirst };
