'use strict';

// ── Review replies: the eight client fields and the templates ────────────────
// Brandon's brief (docs/current-build/Review_Replies_Bundle_Social_Build_Brief.md, sections 4 and 8).
// The templates are templates/gbp/review-replies.json, word for word; nothing here rewords them.
// The fields are saved on review_settings, so the sync job (a separate Railway service) needs nothing
// but the database. suggest() fills them in from what Copybot already holds, for a person to check.

const TEMPLATES = require('../templates/gbp/review-replies.json');

const FIELDS = [
  { key: 'business_name', label: 'Business name', hint: 'The trading name as it is on Google' },
  { key: 'trade', label: 'Trade', hint: 'What they do, in plain words: "landscaping"' },
  { key: 'main_services', label: 'Main services', hint: '3 to 6 core services, comma separated' },
  { key: 'service_area', label: 'Service area', hint: 'The main town plus key areas' },
  { key: 'contact_name', label: 'Contact first name', hint: 'The person who signs the 1 to 3 star replies' },
  { key: 'contact_role', label: 'Contact role', hint: 'Their role, for example Owner' },
  { key: 'direct_phone', label: 'Direct phone', hint: 'Their direct line, not the main office number if avoidable' },
  { key: 'direct_email', label: 'Direct email', hint: 'Their own email' },
];
const KEYS = FIELDS.map(f => f.key);

const str = v => (v == null ? '' : String(v)).trim();
const STAR_WORD = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
const starsOf = v => (typeof v === 'number' ? v : STAR_WORD[str(v).toUpperCase()] || Number(v) || 0);
const templateKey = stars => {
  const n = starsOf(stars);
  if (!(n >= 1 && n <= 5)) throw new Error(`No template for a rating of "${stars}".`);
  return `star${n}`;
};

// What still stops replies for this client. The direct phone and email start as the main ones,
// so they also need the "confirmed" tick (the plan Brandon approved, 8 Nov 2026).
function missing(settings) {
  const s = settings || {};
  const out = FIELDS.filter(f => !str(s[f.key])).map(f => f.label);
  if (str(s.direct_phone) && !s.phone_confirmed) out.push('Direct phone not confirmed');
  if (str(s.direct_email) && !s.email_confirmed) out.push('Direct email not confirmed');
  const services = str(s.main_services).split(',').map(str).filter(Boolean);
  if (str(s.main_services) && (services.length < 3 || services.length > 6)) out.push(`Main services: ${services.length} listed, the brief asks for 3 to 6`);
  return out;
}

function fill(text, fields) {
  return String(text).replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, k) => (KEYS.includes(k) && str(fields[k]) ? str(fields[k]) : m));
}
// The system prompt for a rating, filled. Refuses while a field is blank: a reply must never hold {{
function systemFor(stars, fields) {
  const gaps = missing(fields);
  if (gaps.length) throw Object.assign(new Error(`Review replies are stopped for this client: ${gaps.join(', ')}.`), { status: 400, missing: gaps });
  const filled = fill(TEMPLATES[templateKey(stars)], fields);
  if (filled.includes('{{')) throw new Error('A template field is not filled in.');
  return filled;
}
// The neutral reply: fixed text, never sent to the model
function neutralReply(fields) {
  const gaps = missing(fields);
  if (gaps.length) throw Object.assign(new Error(`Review replies are stopped for this client: ${gaps.join(', ')}.`), { status: 400, missing: gaps });
  return fill(TEMPLATES.neutral, fields);
}

// The sign off each template ends with
function signOff(stars, f) {
  const n = starsOf(stars);
  if (n <= 2) return `${str(f.contact_name)}, ${str(f.contact_role)}, ${str(f.business_name)}`;
  if (n === 3) return `${str(f.contact_name)}, ${str(f.business_name)}`;
  return `The ${str(f.business_name)} team`;
}

// "Sam, Owner", "Sam - owner", "Sam (Director)", "Sam Owner" → the role; the first name is owner_name
function roleFrom(answer, firstName = '') {
  let s = str(answer);
  if (!s) return '';
  const first = str(firstName);
  if (first && s.toLowerCase().startsWith(first.toLowerCase())) s = s.slice(first.length);
  else s = s.replace(/^[A-Z][a-z'’-]+\b/, '');
  s = s.replace(/^[\s,;:/()\-–—]+|[\s()]+$/g, '').replace(/^(and|the)\s+/i, '');
  if (!s || s.length > 40) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// The suggested values, from what Copybot already holds (filled in only where the saved row is blank)
//   intake: leadsnap/autopost/intake.js buildIntake, cv: Client Values, niche: the niche entry,
//   ownerAnswer: the Fillout "Owner's first name and job title" answer
function suggest({ intake = null, cv = {}, niche = null, ownerAnswer = '' } = {}) {
  const groups = (intake && intake.groups) || [];
  const services = groups.slice().sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)).map(g => str(g.label).toLowerCase()).filter(Boolean).slice(0, 6);
  const main = str(intake && intake.mainTown);
  const towns = main ? [main, ...((intake && intake.nearby) || []).map(str).filter(Boolean).slice(0, 3)] : [];
  const area = towns.length > 1 ? `${towns.slice(0, -1).join(', ')} and ${towns[towns.length - 1]}` : towns.join('');
  return {
    business_name: str(cv.company_name) || str(intake && intake.business),
    trade: str(niche && niche.trade_lower) || str(intake && intake.niche).toLowerCase(),
    main_services: services.join(', '),
    service_area: area,
    contact_name: str(cv.owner_name),
    contact_role: roleFrom(ownerAnswer, cv.owner_name),
    direct_phone: str(intake && intake.phone) || str(cv.phone),
    direct_email: str(cv.email),
  };
}

module.exports = { TEMPLATES, FIELDS, KEYS, missing, fill, systemFor, neutralReply, signOff, templateKey, starsOf, roleFrom, suggest };
