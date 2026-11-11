'use strict';

// ── Onboarding answers from GoHighLevel: the rules (11 Nov 2026, Brandon's brief) ──────────
// The 6 step onboarding funnel on GHL sends the client's answers as they go (the workflow
// "Onboarding: Sync answers"). Pure rules, no database and no outside call:
//   clean        the payload as stored: strings only, anything that looks like a password dropped
//   tidyDomain   "https://www.JohnsPlumbing.co.uk/" → "johnsplumbing.co.uk"
//   mergeState   a send into the client's saved onboarding state: an empty value never replaces
//                a saved one, a value a person typed (hand) is never replaced, the stage is the
//                furthest reached, the time of the latest send is kept per stage
//   mirror       the four answers that belong on existing Record fields (company name, phone,
//                email, Live domain): filled only when the field is empty, source "ghl"
//   pickClient   which client a send belongs to: the GHL contact id, else the email, else nobody
//   stepsOf      the Tracker steps for a person, worked out from the saved answers: one per kind,
//                gone when the answer behind it changes; a step a person ticked Done stays done
//                until its answer changes
// A new domain provider is a line in DOMAIN_STEPS.

const STAGES = ['started', 'gbp', 'domain-access-request', 'domain', 'citations', 'complete'];
// The answers kept on the client's onboarding record, with the label the Record tab shows
const ANSWERS = [
  { key: 'gbp_status', label: 'GBP status' },
  { key: 'gbp_category', label: 'GBP category the client gave (a suggestion for Primary category)' },
  { key: 'domain_provider', label: 'Domain provider' },
  { key: 'domain', label: 'Domain' },
  { key: 'provider_login_email', label: 'Provider login email' },
  { key: 'domain_name_ideas', label: 'Domain name ideas' },
  { key: 'facebook_page', label: 'Facebook page' },
  { key: 'instagram_account', label: 'Instagram account' },
];
const ANSWER_KEYS = ANSWERS.map(a => a.key);
const SOURCE = 'ghl', SOURCE_LABEL = 'Onboarding (GHL)';

const str = v => (v == null ? '' : String(v)).trim();
const has = v => (Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== '');
const normEmail = v => str(v).toLowerCase();

// Strings only, trimmed; a key that could hold a password is never stored
function clean(payload) {
  const out = {};
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return out;
  for (const [k, v] of Object.entries(payload)) {
    if (/pass(word|code|phrase)?|pwd|secret/i.test(k)) continue;
    if (v == null || typeof v === 'object') continue;
    out[k] = String(v).trim().slice(0, 4000);
  }
  return out;
}

function tidyDomain(v) {
  let d = str(v).toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/^www\./, '');
  d = d.split(/[/?#]/)[0].replace(/:\d+$/, '').replace(/\.+$/, '');
  return d;
}

const stageIndex = s => STAGES.indexOf(str(s));

// state: { answers, hand, contact, stage, stages, completed_at, notified }. → a new state
// A send older than the newest one already merged (an old event attached by hand) only fills blanks.
function mergeState(state, payload, at = new Date().toISOString()) {
  const s = state || {};
  const next = { answers: { ...(s.answers || {}) }, hand: { ...(s.hand || {}) }, contact: { ...(s.contact || {}) }, stage: s.stage || '', stages: { ...(s.stages || {}) }, completed_at: s.completed_at || null, notified: { ...(s.notified || {}) }, last_at: s.last_at || null };
  const older = !!(next.last_at && new Date(at) < new Date(next.last_at));
  if (!older) next.last_at = at;
  const p = clean(payload);
  for (const k of ANSWER_KEYS) {
    const v = k === 'domain' ? tidyDomain(p[k]) : str(p[k]);
    if (!v) continue;                    // never an empty value over a saved one
    if (next.hand[k]) continue;          // never over a value a person typed
    if (older && str(next.answers[k])) continue;
    next.answers[k] = v;
  }
  for (const k of ['email', 'phone', 'company_name', 'first_name', 'last_name']) if (str(p[k]) && !(older && str(next.contact[k]))) next.contact[k] = str(p[k]);
  const stage = str(p.stage);
  if (stageIndex(stage) >= 0) {
    if (!next.stages[stage] || new Date(at) > new Date(next.stages[stage])) next.stages[stage] = at;
    if (stageIndex(stage) > stageIndex(next.stage)) next.stage = stage;
    if (stage === 'complete' && !next.completed_at) next.completed_at = at;
  }
  return next;
}

// A person's edit on the Record tab: the value is theirs from then on (blank gives it back to GHL)
function handEdit(state, key, value) {
  if (!ANSWER_KEYS.includes(key)) throw Object.assign(new Error('Not an onboarding answer.'), { status: 400 });
  const next = mergeState(state, {}, (state && state.last_at) || new Date().toISOString());
  const v = key === 'domain' ? tidyDomain(value) : str(value);
  next.answers[key] = v;
  if (v) next.hand[key] = true; else delete next.hand[key];
  return next;
}

// The answers that belong on existing Record fields. Only ever into an empty field.
const MIRROR = [
  { key: 'company_name', from: s => s.contact.company_name },
  { key: 'phone', from: s => s.contact.phone },
  { key: 'email', from: s => s.contact.email },
  { key: 'live_domain', from: s => s.answers.domain },
];
// cv: the saved client values (or {}). → { cv (new object), filled: [keys] }
function mirror(cv = {}, state, at = new Date().toISOString()) {
  const next = { ...cv, _sources: { ...(cv._sources || {}) }, _ghl_filled: { ...(cv._ghl_filled || {}) } };
  const filled = [];
  for (const m of MIRROR) {
    const v = str(m.from(state));
    if (!v || has(cv[m.key])) continue;
    next[m.key] = v;
    next._sources[m.key] = SOURCE;
    next._ghl_filled[m.key] = { value: v, at };
    filled.push(m.key);
  }
  return { cv: next, filled };
}

// The domain the client gave against Live domain, both tidied: null when they agree or either is blank
function domainDifference(cv = {}, state) {
  const given = tidyDomain(state && state.answers && state.answers.domain), live = tidyDomain(cv.live_domain);
  return given && live && given !== live ? { given, live: str(cv.live_domain) } : null;
}

// clients: [{ id, ghl_contact_id, emails: [..] }] (unarchived only). → { client_id, by } or { client_id: null, why }
function pickClient(payload, clients) {
  const p = clean(payload);
  const cid = str(p.ghl_contact_id), email = normEmail(p.email);
  if (cid) {
    const byId = clients.filter(c => str(c.ghl_contact_id) === cid);
    if (byId.length === 1) return { client_id: byId[0].id, by: 'contact_id' };
  }
  if (email) {
    const byEmail = clients.filter(c => (c.emails || []).some(e => normEmail(e) === email));
    if (byEmail.length === 1) return { client_id: byEmail[0].id, by: 'email' };
    if (byEmail.length > 1) return { client_id: null, why: `${byEmail.length} clients have this email` };
  }
  return { client_id: null, why: cid || email ? 'no client with this GHL contact id or email' : 'no GHL contact id or email in the send' };
}

// ── The Tracker steps ────────────────────────────────────────────────────────────────────
const DOMAIN_STEPS = {
  GoDaddy: { text: 'Send the GoDaddy access request', detail: a => `${loginAndDomain(a)} Done in The Hub by GoDaddy Pro: Manage Sites → Add Site → add new client with "Client account access: Yes".`, urgent: true },
  IONOS: { text: 'Send the IONOS access request', detail: a => loginAndDomain(a), urgent: true },
  Squarespace: invite('Squarespace'), Namecheap: invite('Namecheap'), Wix: invite('Wix'), Hostinger: invite('Hostinger'), Cloudflare: invite('Cloudflare'),
  '123 Reg': whatsapp(), Fasthosts: whatsapp(),
  'Wix (not connected to a website)': { text: 'Message the client about their Wix domain', detail: a => domainLine(a) },
  'Other provider': { text: 'Check what access the client set up', detail: a => domainLine(a) },
  'No domain yet': { text: 'Choose and buy the domain (domain-buying SOP)', detail: a => (a.domain_name_ideas ? `Name ideas: ${a.domain_name_ideas}.` : 'The client gave no name ideas.') },
};
function invite(provider) { return { text: `Accept the domain invite from ${provider}`, detail: a => domainLine(a) }; }
function whatsapp() { return { text: 'Log in with the details sent on WhatsApp', detail: a => `${domainLine(a)} Delete the WhatsApp message after logging in.`.trim() }; }
function domainLine(a) { return a.domain ? `Domain: ${a.domain}.` : 'No domain given yet.'; }
function loginAndDomain(a) { return `Login email: ${a.provider_login_email || 'not given yet'}. ${domainLine(a)}`; }

// o: { answers, stage, stages, completed_at, ticks: { kind: { basis, by, at } } }
// → { needs: [{ key, kind, basis, text, why, urgent }], done: [{ key, text, at }] }
function stepsOf(o) {
  const needs = [], done = [];
  if (!o) return { needs, done };
  const a = o.answers || {}, ticks = o.ticks || {}, stages = o.stages || {};
  const complete = !!o.completed_at || o.stage === 'complete';
  const step = (kind, basis, text, why = '', urgent = false) => {
    const t = ticks[kind];
    if (t && t.basis === basis) done.push({ key: `onb_${kind}_done`, text: `${text}: ticked done${t.by ? ` by ${t.by}` : ''}`, at: t.at || null });
    else needs.push({ key: `onb_${kind}`, kind, basis, text: urgent ? `Urgent: ${text}` : text, why: urgent ? `${why} The client is waiting for this email.`.trim() : why, urgent });
  };
  const d = DOMAIN_STEPS[a.domain_provider];
  if (d) step('domain', [a.domain_provider, a.domain || '', a.provider_login_email || ''].join('|'), d.text, d.detail(a), !!d.urgent && !!stages['domain-access-request']);
  if (a.gbp_status === 'Already had one' || a.gbp_status === 'Created a new one') step('gbp', a.gbp_status, 'Accept the Google Business Profile manager invite', a.gbp_category ? `Category the client gave: ${a.gbp_category}.` : '');
  else if (a.gbp_status === 'Started creating, not finished') step('gbp', a.gbp_status, 'Help the client finish their Google Business Profile');
  for (const [kind, key, what] of [['facebook', 'facebook_page', 'Facebook page'], ['instagram', 'instagram_account', 'Instagram username']]) {
    const v = str(a[key]);
    if (/not sent yet/i.test(v) || (!v && complete)) step(kind, v, `Chase the client for their ${what}`, v ? `The client answered: ${v}.` : 'Onboarding is complete and none was given.');
  }
  if (complete) done.push({ key: 'onb_complete', text: 'Onboarding answers received from GHL', at: o.completed_at || stages.complete || null });
  return { needs, done };
}

module.exports = { STAGES, ANSWERS, ANSWER_KEYS, SOURCE, SOURCE_LABEL, DOMAIN_STEPS, clean, tidyDomain, mergeState, handEdit, mirror, domainDifference, pickClient, stepsOf, normEmail };
