'use strict';

// ── Form answers into Client Values (10 Nov 2026, Brandon; Stage 3 of the automation plan) ──
// The onboarding form already holds answers that were being typed again on the Record tab.
// This copies them across, once the submission is processed and from the "Fill from the
// form" button, under three rules:
//   1. A value that is already there is never touched, whoever put it there. The one
//      exception: a value this module wrote, that nobody has edited or confirmed since, follows
//      the form when the client resubmits with a different answer (`_form_filled` remembers them).
//   2. An answer copied as the client gave it (a name, a phone, a choice) is source `form`.
//   (withoutUnconfirmed: generation, GBP and the legal pages read such a value as blank until then.)
//   3. An answer read out of free text (a year out of "started March 2015", a cover figure out
//      of "yes, £5 million") is source `form_inferred`: amber on the Record tab until a person
//      presses Confirm. Where the text is not plainly one thing, nothing is written.
// Nothing here words a claim: differentiators, the owner's story and promise, the guarantee
// scope wording and anything from a voice answer stay with a person. Typed answers only.
// Not mapped on purpose: live_domain (the form's "current website" is the old site, a business
// rule), gbp_address_type (the place ID step confirms it), the legal details (legal/values.js
// reads the form itself), emergency call outs and practices (read at generation already).
//
// A new mapping is a line in MAP: { key, from, exact, read(answer, fields) → value or '' }.

const text = v => (v == null ? '' : Array.isArray(v) ? v.map(text).filter(Boolean).join(', ') : typeof v === 'object' ? text(v.value ?? v.text ?? v.label ?? '') : String(v)).trim();
const no = t => /^\s*(no|none|n\/a|na|not yet|nope|don'?t)\b/i.test(t);
const whole = t => /^\d{1,7}$/.test(t.replace(/,/g, '')) ? t.replace(/,/g, '') : '';

const MAP = [
  // Copied as given
  { key: 'company_name', from: 'business_name', exact: true, read: t => t },
  { key: 'phone', from: 'business_phone', exact: true, read: t => t },
  { key: 'email', from: 'business_email', exact: true, read: t => t },
  { key: 'address', from: 'business_address', exact: true, read: t => t },
  { key: 'hours', from: 'opening_hours', exact: true, read: t => t },
  { key: 'travel_distance', from: 'travel_distance', exact: true, read: t => t },
  { key: 'quote_method', from: 'quote_method', exact: true, read: t => t },
  { key: 'response_time', from: 'reply_speed', exact: true, read: t => t },
  { key: 'start_time', from: 'start_speed', exact: true, read: t => t },
  { key: 'finance_options', from: 'finance', exact: true, read: t => (no(t) ? '' : t) },
  // "Is the quote free?": a fee of either kind is no; free is yes; anything else is left for a person
  { key: 'free_quotes', from: 'quote_free', exact: true, read: t => (/\bfee\b/i.test(t) ? 'no' : /^(yes|free)\b/i.test(t) ? 'yes' : '') },
  // One question per line, as the client typed them (the voice answer is not read)
  { key: 'customer_questions', from: 'common_questions_text', exact: true, read: t => { const q = t.split(/\r?\n/).map(s => s.replace(/^[\s\-*•\d.)]+/, '').trim()).filter(s => s.length > 5); return q.length ? q : ''; } },
  // A bare number is the client's figure; a number inside a sentence is read out and waits for Confirm
  { key: 'team_size', from: 'team_size', exact: t => !!whole(t), read: t => whole(t) || oneNumber(t) },
  { key: 'jobs_completed', from: 'jobs_completed', exact: t => !!whole(t), read: t => whole(t) || oneNumber(t) },
  // Read out of free text: amber until confirmed
  { key: 'year_founded', from: 'trading_since', exact: false, read: t => { const y = [...new Set(t.match(/\b(19[5-9]\d|20[0-4]\d)\b/g) || [])]; return y.length === 1 ? y[0] : ''; } },
  { key: 'owner_name', from: 'owner_name_title', exact: false, read: t => { const first = t.split(/[,\-–—(/|]| and | & /i)[0].trim().split(/\s+/)[0] || ''; return /^[A-Z][a-zA-Z'’]{1,20}$/.test(first) ? first : ''; } },
  { key: 'insurance_cover', from: 'public_liability', exact: false, read: t => {
    if (no(t)) return '';
    const m = [...t.matchAll(/£\s?(\d+(?:\.\d+)?)\s?(m\b|mil\b|million|k\b|,000,000)/gi)].map(x => `${x[1]}${/^k/i.test(x[2]) ? 'k' : 'm'}`);
    return new Set(m).size === 1 ? m[0] : '';
  } },
  { key: 'guarantee_years', from: 'guarantees', exact: false, read: t => { if (no(t)) return ''; const y = [...new Set([...t.matchAll(/\b(\d{1,2})[\s-]?(?:years?|yrs?)\b/gi)].map(x => x[1]))]; return y.length === 1 && !/\bmonths?\b/i.test(t) ? y[0] : ''; } },
];
// The only number in the answer, when there is exactly one ("about 150 jobs" → 150; "3 to 5" → nothing)
function oneNumber(t) { const n = t.replace(/(\d),(\d{3})/g, '$1$2').match(/\d+/g) || []; return n.length === 1 && n[0].length <= 7 ? n[0] : ''; }

const has = v => (Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== '');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// fields: { field_key: value } of the filled form answers. → [{ key, value, from, exact }]
function valuesFromFields(fields = {}) {
  const out = [];
  for (const m of MAP) {
    const answer = text(fields[m.from]);
    if (!answer) continue;
    const value = m.read(answer, fields);
    if (!has(value)) continue;
    out.push({ key: m.key, value, from: m.from, exact: typeof m.exact === 'function' ? m.exact(answer) : m.exact });
  }
  return out;
}

// cv: the saved client values (or {}). → { cv (new object), filled: [{ key, value, from, exact, was }], skipped: [{ key, why }] }
function mergeIntoValues(cv = {}, fields = {}) {
  const next = { ...cv, _sources: { ...(cv._sources || {}) }, _confirmed: { ...(cv._confirmed || {}) }, _form_filled: { ...(cv._form_filled || {}) } };
  const filled = [], skipped = [];
  for (const v of valuesFromFields(fields)) {
    const cur = cv[v.key];
    const ours = next._form_filled[v.key];
    const source = v.exact ? 'form' : 'form_inferred';
    if (has(cur)) {
      // Ours, untouched since and not confirmed: follow the form. Anything else stands.
      const untouched = ours && same(ours.value, cur) && next._sources[v.key] === ours.source && !next._confirmed[v.key];
      if (same(cur, v.value)) continue;
      if (!untouched) { skipped.push({ key: v.key, why: 'a value is already there' }); continue; }
    }
    next[v.key] = v.value;
    next._sources[v.key] = source;
    next._form_filled[v.key] = { from: v.from, value: v.value, source, at: new Date().toISOString() };
    filled.push({ ...v, was: has(cur) ? cur : null });
  }
  return { cv: next, filled, skipped };
}

// Reads the client's filled answers and saves the merged values. Writes nothing when nothing changes.
async function fillClientValues(pool, clientId) {
  const { rows: fr } = await pool.query(`SELECT field_key, value FROM client_fields WHERE client_id = $1 AND status = 'filled'`, [clientId]);
  const fields = {};
  for (const r of fr) { let v = r.value; if (typeof v === 'string' && /^[[{"]/.test(v)) { try { v = JSON.parse(v); } catch (_) { /* plain text */ } } fields[r.field_key] = v; }
  const { rows } = await pool.query(`SELECT id, content FROM client_assets WHERE client_id = $1 AND asset_type = 'client_values' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]);
  const cv = rows.length ? JSON.parse(rows[0].content) : {};
  const out = mergeIntoValues(cv, fields);
  if (out.filled.length) {
    if (rows.length) await pool.query(`UPDATE client_assets SET content = $1, uploaded_at = NOW() WHERE id = $2`, [JSON.stringify(out.cv), rows[0].id]);
    else await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'client_values', 'client_values.json', $2)`, [clientId, JSON.stringify(out.cv)]);
  }
  return { filled: out.filled, skipped: out.skipped, to_confirm: out.filled.filter(f => !f.exact).map(f => f.key) };
}

// What the pages, the GBP output and the legal pages may read: a value read out of free text counts for nothing
// until a person has confirmed it, so a misread guarantee or cover figure never reaches copy. Blanked, never deleted.
function withoutUnconfirmed(cv = {}) {
  const src = cv._sources || {}, conf = cv._confirmed || {};
  const out = { ...cv };
  for (const k of Object.keys(src)) if (src[k] === 'form_inferred' && !conf[k]) out[k] = Array.isArray(cv[k]) ? [] : '';
  return out;
}

module.exports = { valuesFromFields, mergeIntoValues, fillClientValues, withoutUnconfirmed, MAP };
