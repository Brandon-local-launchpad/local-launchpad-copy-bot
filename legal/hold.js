'use strict';

// ── The hold rule, F-LEGAL (the brief's Stage 3) ────────────────────────────
// Pure. Any one reason holds all the legal pages, and a held page is never pushed
// (Brandon, 7 Nov 2026). F-LEGAL isn't a validator flag: a person can't tick it through
// as reviewed. Only one reason can be cleared, the exceptions text, and only by Brandon
// and only for that exact text. Every other reason goes when the facts are put right.

const CODE = 'F-LEGAL';

const LABELS = {
  website_url: 'Live domain', town: 'Base town on the form', vat_number: 'VAT number', trade_with_article: 'Trade word from the niche library',
  company_name: 'Company name', phone: 'Phone', email: 'Email', full_name: 'Full name on the form',
  business_address: 'Business address on the form', trade_type: 'Trade word from the niche library',
  legal_last_updated: 'Last updated date', legal_name: 'Registered company name', company_number: 'Company number',
  registered_office: 'Registered office', regulatory_number: 'Regulatory registration number',
  callout_fee_amount: 'Emergency or out of hours charge amount', deposit_threshold: 'Deposit taken on jobs over',
  deposit_percent: 'Deposit percentage', payment_methods: 'Payment methods on the form',
  adr_body: 'Dispute resolution provider', adr_url: 'Dispute resolution provider link',
};
const labelOf = key => LABELS[key] || key;

// Whitespace doesn't make it a different text; a changed word does
const sameText = (a, b) => String(a || '').trim().replace(/\s+/g, ' ') === String(b || '').trim().replace(/\s+/g, ' ');

// answers: legal/onboarding.js. unclear: legal/values.js.
// pages: [{ key, title, missing, residue, fault, stale }]. clearedText: the newest cleared exceptions text.
function legalHold({ answers = {}, unclear = [], pages = [], clearedText = null } = {}) {
  const reasons = [];
  const add = (code, message, extra = {}) => reasons.push({ code, message, ...extra });

  const exceptions = String(answers.standard_terms_exceptions || '').trim();
  if (exceptions && !sameText(exceptions, clearedText)) {
    add('exceptions', `The client wrote an exception to the standard terms: "${exceptions}". Brandon reads it, adjusts the wording, then clears it.`, { clearable: true });
  }
  const sign = answers.standard_terms_confirmed || {};
  if (sign.value !== 'yes') add('not_confirmed', sign.by_hand ? "The sign-off was ticked by hand. It needs the client's own tick on the form." : 'The client has not confirmed the standard terms.');

  for (const u of unclear) add('unclear', u.reason, { key: u.key });

  for (const p of pages) {
    if (p.fault) add('template', `${p.title}: ${p.fault}`, { page: p.key });
    if (p.stale) add('wording_stale', `${p.title}: this client's adjusted wording was made from an older master. Check it against the new master and save it again, or go back to the master.`, { page: p.key });
    // A token still in the text is already listed as missing; anything else left is a fault in the template
    const otherResidue = (p.residue || []).filter(r => !(r === '[CV:' && (p.missing || []).length));
    for (const r of otherResidue) add('residue', `${p.title}: "${r}" is left in the filled page.`, { page: p.key });
  }

  // One line per missing value, naming the pages it stops: most values are on more than one
  const missing = new Map();
  for (const p of pages) for (const key of p.missing || []) missing.set(key, [...(missing.get(key) || []), p.title]);
  for (const [key, titles] of missing) add('missing', `${labelOf(key)} is missing (${titles.join(', ')}).`, { key, pages: titles });

  return { code: reasons.length ? CODE : null, held: reasons.length > 0, reasons };
}

// What a push says for a held client. Nothing else may let a held page through.
function pushRefusals(hold) {
  return hold.held ? hold.reasons.map(r => `${CODE}: ${r.message}`) : [];
}

module.exports = { CODE, legalHold, pushRefusals, sameText, labelOf };
