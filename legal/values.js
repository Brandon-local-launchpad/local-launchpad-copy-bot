'use strict';

// ── The values a legal page is filled with ──────────────────────────────────
// Pure. Takes the Client Values (typed in on the Record tab), the form answers, the
// answers from legal/onboarding.js and the niche's trade word, and gives every key the
// templates use. Returns { values, unclear, defaulted }:
//   unclear    answers that can't be read with confidence, or that a page can't safely go
//              without. Stage 3 holds the pages on any of them. Never guessed.
//   defaulted  keys that took a fixed default, so a person can see which.
//
// Claims never get a default: insurance and a guarantee are shown only when given, and
// what identifies the business or sets a price is held for rather than assumed.

const text = v => (v === undefined || v === null ? '' : String(v).trim());

// Fixed defaults from the token list (Legal Templates doc, 22 Oct 2026). None states a
// claim the client hasn't made about cover, a guarantee, who they are or their prices.
const DEFAULTS = {
  jurisdiction: 'England and Wales',
  regulatory_body: 'none',
  trade_body: 'none',
  quote_valid_days: '30',
  callout_fee: 'no',
  waste_removal: 'no',
  adr_member: 'no',
};
const FIXED = { cancel_notice_hours: '24', parking_required: 'no' };

// A cover figure as a full £ amount: "5m" → "£5,000,000". Only forms that can't mean
// anything else; anything else, and a figure under £1,000, is null (unclear).
function fullPounds(raw) {
  const s = text(raw).replace(/^£\s*/, '').replace(/,/g, '').toLowerCase();
  const m = s.match(/^(\d+)(\.\d{1,2})?\s*(m|million|k)?$/);
  if (!m || (m[2] && !m[3])) return null;
  const n = Math.round(Number(m[1] + (m[2] || '')) * (m[3] === 'k' ? 1000 : m[3] ? 1000000 : 1));
  if (n < 1000) return null;
  return `£${n.toLocaleString('en-GB')}`;
}

const wholeNumber = raw => (/^\d+$/.test(text(raw)) && Number(text(raw)) > 0 ? Number(text(raw)) : null);

// Guarantee length in months: guarantee_months, else guarantee_years × 12. Blank is "none".
function guaranteeMonths(cv) {
  const months = text(cv.guarantee_months);
  if (months) {
    const n = wholeNumber(months);
    return n ? { value: String(n) } : { unclear: `Guarantee length in months is "${months}", not a whole number.` };
  }
  const years = text(cv.guarantee_years);
  if (!years) return { value: 'none' };
  const n = /^\d+(\.5)?$/.test(years) ? Number(years) * 12 : 0;
  return n > 0 ? { value: String(n) } : { unclear: `Guarantee years is "${years}", not a number that converts to months.` };
}

const yesNoOf = raw => {
  const t = text(raw).toLowerCase();
  if (t === 'yes' || t === 'no') return t;
  return t ? null : '';
};

// "Yes" or "Only on larger jobs" means a deposit is taken
function depositRequired(raw) {
  const t = text(raw).toLowerCase();
  if (t === 'yes' || t === 'only on larger jobs') return 'yes';
  if (t === 'no') return 'no';
  return null;
}

// ["Bank transfer", "Card", "Cash"] → "bank transfer, card and cash"
function paymentList(raw) {
  const list = (Array.isArray(raw) ? raw : text(raw).split(',')).map(x => text(x).toLowerCase()).filter(Boolean);
  if (list.length < 2) return list[0] || '';
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

// "electrical work" in a niche entry would read "all electrical work work" in the Service Terms
const tradeWord = raw => text(raw).replace(/\s+work$/i, '');

function resolveValues({ cv = {}, form = {}, answers = {}, tradeLower = '', lastUpdated = '' } = {}) {
  const values = { ...FIXED };
  const unclear = [];
  const defaulted = [];
  const hold = (key, reason) => unclear.push({ key, reason });

  // Who the business is
  values.company_name = text(cv.company_name) || text(form.business_name);
  values.phone = text(cv.phone) || text(form.business_phone);
  values.email = text(cv.email) || text(form.business_email);
  values.full_name = text(form.full_name);
  values.business_address = text(form.business_address);
  values.trade_type = tradeWord(tradeLower);
  values.legal_last_updated = text(lastUpdated);

  const entity = text(cv.legal_entity).toLowerCase();
  if (entity === 'limited' || entity === 'sole_trader') values.legal_entity = entity;
  else hold('legal_entity', entity ? `Limited company or sole trader is "${cv.legal_entity}".` : 'Limited company or sole trader is not set.');
  values.legal_name = text(cv.legal_name);
  values.company_number = text(cv.company_number);
  values.registered_office = text(cv.registered_office);

  // Fixed defaults, unless the client has an answer
  for (const [key, fallback] of Object.entries(DEFAULTS)) {
    const given = text(cv[key]);
    values[key] = given || fallback;
    if (!given) defaulted.push(key);
  }
  values.regulatory_number = text(cv.regulatory_number);
  values.callout_fee_amount = text(cv.callout_fee_amount);
  values.adr_body = text(cv.adr_body);
  values.adr_url = text(cv.adr_url);

  for (const key of ['callout_fee', 'waste_removal', 'adr_member']) {
    const yn = yesNoOf(values[key]);
    if (yn === null) hold(key, `${key} is "${values[key]}", not yes or no.`);
    else values[key] = yn;
  }
  if (!wholeNumber(values.quote_valid_days)) hold('quote_valid_days', `Days a quote stays valid is "${values.quote_valid_days}", not a whole number.`);

  // Insurance: shown only when given, as a full figure
  const cover = text(cv.insurance_cover);
  if (!cover) values.insurance_cover = 'none';
  else {
    const pounds = fullPounds(cover);
    if (pounds) values.insurance_cover = pounds;
    else { values.insurance_cover = 'none'; hold('insurance_cover', `Insurance cover "${cover}" can't be read as a figure.`); }
  }

  // Guarantee: shown only when given
  const g = guaranteeMonths(cv);
  if (g.unclear) { values.guarantee_months = 'none'; hold('guarantee_months', g.unclear); }
  else values.guarantee_months = g.value;

  // Prices: the form's answers, held for rather than assumed
  const vat = yesNoOf(form.vat_registered);
  if (vat) values.vat_registered = vat;
  else hold('vat_registered', vat === null ? `Are you VAT registered? is "${form.vat_registered}".` : 'Are you VAT registered? has no answer.');

  const deposit = depositRequired(form.deposit);
  if (deposit) values.deposit_required = deposit;
  else hold('deposit_required', text(form.deposit) ? `Do you take a deposit? is "${form.deposit}".` : 'Do you take a deposit? has no answer.');
  values.deposit_threshold = text(cv.deposit_threshold);
  values.deposit_percent = text(cv.deposit_percent).replace(/\s*%$/, '');

  values.payment_methods = paymentList(form.payment_methods);

  // The form's yes or no answers, with their own defaults (legal/onboarding.js)
  for (const key of ['uses_subcontractors', 'late_payment_interest']) {
    const a = answers[key] || { value: 'yes', defaulted: true };
    if (a.unclear) hold(key, `${key} is "${a.given}", not yes or no.`);
    else {
      values[key] = a.value;
      if (a.defaulted) defaulted.push(key);
    }
  }

  return { values, unclear, defaulted };
}

module.exports = { resolveValues, fullPounds, guaranteeMonths, paymentList, tradeWord };
