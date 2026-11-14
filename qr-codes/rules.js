'use strict';

// ── QR codes: the rules (14 Nov 2026, Brandon) ───────────────────────────────────────────────
// The QR codes subtab of the Review & Referral Cards tab. Every client gets three QR codes, made
// by a person in QR.io: Review Funnel (the A5 review card), Scan to Claim (referral card, QR 1)
// and View Our Services (referral card, QR 2). Copybot prepares the names and links and checks
// the finished codes. No QR.io API, no QR.io login, no browser automation.
// Brandon's brief: docs/current-build/QR_Codes_Subtab_Brief.md. The team's steps by hand: the
// SOP "Client QR Codes (QR.io)".
// Stage 1: the five fields at the top of the subtab. Stage 2, Prepare: the folder name, the three
// QR names, the WhatsApp message and link, and whether each code's destination has passed its
// check (code only, no model: the message is fixed text and is never reworded).
// Pure: no database, no network. qr-codes/service.js keeps the tab's own values.
//   nicheWord        the niche label's text before the first "/"
//   normaliseNumber  the WhatsApp number rule: 447 and nine digits, or not valid
//   isGoogleLink     g.page, goo.gl or a google host: never the review funnel
//   recordValues     what the record gives each field, and where from
//   clean            one typed value, tidied; { error } for one that is refused
//   build            the record, the tab's saved values → every field with its notes
//   folderName       {niche}-{business}, the business name exactly as written
//   qrName           {niche} {business} {code} QR Code, the business name without apostrophes
//   whatsappMessage  the fixed claim message, ending in a space for the customer's name
//   whatsappUrl      https://wa.me/{number}?text={message, everything encoded}
//   linkResult       what a followed link's answer means for its code
//   prepare          the fields and the saved checks → the folder, and each code's name,
//                    destination and state (ready, unchecked, failed or locked)
// A saved key among AUTO is an override of the record's value (a blank one included): it is
// never written back to the Record tab.

const { siteOf } = require('../card-brief/rules');

const str = v => (v == null ? '' : String(v)).trim();
const line = v => str(v).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();

// The lines the record fills. review_funnel_url is typed by hand: nothing in the record holds it.
const AUTO = ['qr_niche_label', 'qr_business_name', 'whatsapp_number', 'website_url'];
const KEYS = ['qr_niche_label', 'qr_business_name', 'review_funnel_url', 'whatsapp_number', 'website_url'];
const LABELS = {
  qr_niche_label: 'Niche (plural)',
  qr_business_name: 'Business name',
  review_funnel_url: 'Review Us funnel link',
  whatsapp_number: 'WhatsApp number',
  website_url: 'Website link',
};
const MOBILE_NEEDED = 'Needs a UK mobile number with WhatsApp on it';
const GOOGLE_REFUSED = 'That is a Google link. The review code must go through the Review Us funnel, so 1 to 3 star customers stay private.';

// "Landscapers/Gardeners" → "Landscapers"
const nicheWord = label => line(line(label).split('/')[0]);
// One word or more, letters only, ending in s: Landscapers, Tree Surgeons
const looksPlural = v => /^[A-Za-z][A-Za-z ]*s$/.test(line(v));

// Brandon's number rule: strip spaces, +, brackets and dashes; 0044 → 44; 07 → 447; valid only
// as 447 and nine digits. "+44 (0)7…" is read as 447… too (4407 → 447). Landlines never pass.
function normaliseNumber(v) {
  let d = str(v).replace(/[\s+()\-]/g, '');
  if (d.startsWith('0044')) d = d.slice(2);
  if (d.startsWith('07')) d = `44${d.slice(1)}`;
  else if (d.startsWith('4407')) d = `44${d.slice(3)}`;
  const valid = /^447\d{9}$/.test(d);
  return { value: valid ? d : line(v), valid };
}

function hostOf(url) {
  try { return new URL(str(url)).hostname.toLowerCase().replace(/\.$/, ''); } catch (_) { return ''; }
}
const isHttps = v => /^https:\/\/\S+$/i.test(str(v)) && !!hostOf(v);
const isLink = v => /^https?:\/\/\S+$/i.test(str(v)) && !!hostOf(v);
// g.page, goo.gl (maps.app.goo.gl too), and google.com or any other google host
function isGoogleLink(url) {
  const host = hostOf(url) || hostOf(`https://${str(url).replace(/^[a-z]+:\/\//i, '')}`);
  return /(^|\.)(g\.page|goo\.gl)$/.test(host) || /(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host);
}

// cv: Client Values (unconfirmed form values already blanked); clientName: the client's name in
// Copybot; nicheLabel: the client's niche as the onboarding form names it ('' when not sorted)
function recordValues({ cv = {}, clientName = '', nicheLabel = '' } = {}) {
  const out = {};
  const word = nicheWord(nicheLabel);
  out.qr_niche_label = { value: word, source: word ? `from the client's niche (${line(nicheLabel)})` : '' };

  const company = line(cv.company_name);
  out.qr_business_name = company ? { value: company, source: 'from Record → Company name', note: 'Use the name customers know, not the registered company name.' }
    : { value: line(clientName), source: line(clientName) ? 'from the client\'s name in Copybot' : '', note: line(clientName) ? 'Use the name customers know, not the registered company name.' : '' };

  out.review_funnel_url = { value: '', source: '' };

  const n = normaliseNumber(cv.phone);
  out.whatsapp_number = n.valid ? { value: n.value, source: 'from Record → Phone' }
    : { value: '', source: '', note: line(cv.phone) ? `The Record's phone (${line(cv.phone)}) is not a UK mobile, so it is not used.` : '' };

  const site = siteOf(cv.live_domain);
  out.website_url = { value: site, source: site ? 'from Record → Live domain' : '' };
  return out;
}

// One typed value: { value }, or { error } when it is refused. undefined: not a field.
function clean(key, value) {
  switch (key) {
    case 'qr_niche_label': case 'qr_business_name': return { value: line(value).slice(0, 120) };
    case 'review_funnel_url': {
      const v = line(value).slice(0, 500);
      if (!v) return { value: '' };
      if (isGoogleLink(v)) return { error: GOOGLE_REFUSED };
      if (!isHttps(v)) return { error: 'The review funnel link must be a full link starting https://' };
      return { value: v };
    }
    case 'whatsapp_number': return { value: normaliseNumber(value).value.slice(0, 40) };
    case 'website_url': return { value: line(value).slice(0, 500) };
    case 'website_temporary': return value === true || value === false ? { value } : { error: 'Temporary URL is ticked or not.' };
    default: return undefined;
  }
}

// record: recordValues(); saved: the tab's stored values.
// Each field: value, record, source, overridden, note (grey), warn (amber), problem (red: the
// codes that use this field cannot be made until it is put right).
function build({ record = {}, saved = {} } = {}) {
  const has = k => Object.prototype.hasOwnProperty.call(saved, k);
  const fields = {};
  for (const k of KEYS) {
    const rec = record[k] || { value: '', source: '' };
    const auto = AUTO.includes(k);
    const overridden = auto && has(k) && saved[k] !== rec.value;
    fields[k] = { label: LABELS[k], value: has(k) ? saved[k] : rec.value, ...(auto ? { record: rec.value, overridden } : {}), source: overridden ? '' : rec.source || '', note: overridden ? '' : rec.note || '', warn: '', problem: '' };
  }
  const temporary = saved.website_temporary === true;
  const v = k => fields[k].value;

  if (!v('qr_niche_label')) fields.qr_niche_label.problem = 'Needed for the folder name and the QR names.';
  else if (!looksPlural(v('qr_niche_label'))) fields.qr_niche_label.warn = 'Check this is a plural trade word, like Landscapers, Roofers or Builders.';

  if (!v('qr_business_name')) fields.qr_business_name.problem = 'Needed for the folder name, the QR names and the WhatsApp message.';

  if (!v('review_funnel_url')) fields.review_funnel_url.problem = 'Needed for the Review Funnel code. Paste the Review Us funnel link from Phase 6.';
  else if (isGoogleLink(v('review_funnel_url'))) fields.review_funnel_url.problem = GOOGLE_REFUSED;
  else if (!isHttps(v('review_funnel_url'))) fields.review_funnel_url.problem = 'The review funnel link must be a full link starting https://';

  if (!normaliseNumber(v('whatsapp_number')).valid) fields.whatsapp_number.problem = MOBILE_NEEDED;

  if (!v('website_url')) fields.website_url.problem = 'Needed for the View Our Services code.';
  else if (!isLink(v('website_url'))) fields.website_url.problem = 'This is not a full link (https://…).';
  else if (temporary) fields.website_url.warn = 'Temporary URL. The code\'s destination must be changed in QR.io once the domain is live.';

  return { fields, website_temporary: temporary };
}

// ── Stage 2: Prepare ──
// The three codes, in the order they are made
const CODES = [
  { key: 'review', name: 'Review Funnel', card: 'A5 review card', field: 'review_funnel_url' },
  { key: 'claim', name: 'Scan to Claim', card: 'Referral card back, QR 1', field: 'whatsapp_number' },
  { key: 'services', name: 'View Our Services', card: 'Referral card back, QR 2', field: 'website_url' },
];
// The two destinations Copybot fetches. Scan to Claim passes on the number rule alone.
const CHECKED = ['review', 'services'];

const folderName = (niche, business) => `${line(niche)}-${line(business)}`;
const qrName = (niche, business, codeName) => `${line(niche)} ${line(business).replace(/['’‘`]/g, '')} ${codeName} QR Code`;
// Fixed text (Brandon). The trailing space stays: the customer types their name straight after it.
const whatsappMessage = business => `Hey ${line(business)}, I've been given one of your referral cards and I'd like to claim the offer on it. My name is `;
// Everything encoded, the characters encodeURIComponent leaves alone included (' ! ( ) *)
const encodeAll = text => encodeURIComponent(text).replace(/[!'()*]/g, ch => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
const whatsappUrl = (number, business) => `https://wa.me/${number}?text=${encodeAll(whatsappMessage(business))}`;

// What a followed link's answer means. r: qr-codes/links.js follow(); key: review or services
function linkResult(key, r = {}) {
  if (r.error) return { ok: false, message: `The link could not be checked: ${r.error}.` };
  if (r.status !== 200) return { ok: false, message: `The link answered ${r.status}, not 200.` };
  if (key === 'review' && isGoogleLink(r.finalUrl)) return { ok: false, message: 'This link forwards straight to Google. The code must go through the Review Us funnel.' };
  return { ok: true, message: '' };
}

// fields: build().fields; temporary: the Temporary URL tick; checks: { review, services }, each
// the last check of that destination: { url, ok, message, status, final_url, at, hand, by }.
// A check counts only for the link it was made on: a changed link is unchecked again.
function prepare({ fields = {}, temporary = false, checks = {} } = {}) {
  const v = k => (fields[k] ? fields[k].value : '');
  const niche = v('qr_niche_label'), business = v('qr_business_name');
  const named = !!niche && !!business;
  const number = normaliseNumber(v('whatsapp_number'));
  const destination = { review: v('review_funnel_url'), claim: number.valid && business ? whatsappUrl(number.value, business) : '', services: v('website_url') };

  const codes = CODES.map(c => {
    const out = { key: c.key, name: c.name, card: c.card, qr_name: named ? qrName(niche, business, c.name) : '', destination: destination[c.key], state: 'ready', level: 'green', message: '', check: null };
    const lock = message => ({ ...out, state: 'locked', level: 'grey', message });
    if (!named) return lock('Fill in the niche and the business name first.');
    if (c.key === 'claim') return number.valid ? { ...out, message: 'The number is a UK mobile.' } : lock(MOBILE_NEEDED);
    if (fields[c.field].problem) return lock(fields[c.field].problem);
    const chk = checks[c.key] && checks[c.key].url === out.destination ? checks[c.key] : null;
    if (!chk) return { ...out, state: 'unchecked', level: 'grey', message: 'Not checked yet.' };
    out.check = { ok: !!chk.ok, hand: !!chk.hand, by: chk.by || '', at: chk.at || null, status: chk.status || null, final_url: chk.final_url || '' };
    if (!chk.ok) return { ...out, state: 'failed', level: 'red', message: chk.message || 'The link did not pass its check.' };
    if (c.key === 'services' && temporary) return { ...out, level: 'amber', message: 'Temporary URL. Change the destination of the code in QR.io once the domain is live.' };
    return { ...out, message: chk.hand ? 'Checked by hand.' : 'The link answers 200.' };
  });
  return {
    folder: named ? folderName(niche, business) : '',
    message: business ? whatsappMessage(business) : '',
    codes,
    ready: codes.every(c => c.state === 'ready'),
  };
}

module.exports = { CODES, CHECKED, folderName, qrName, whatsappMessage, whatsappUrl, linkResult, prepare, AUTO, KEYS, LABELS, MOBILE_NEEDED, GOOGLE_REFUSED, nicheWord, looksPlural, normaliseNumber, isGoogleLink, isHttps, isLink, recordValues, clean, build };
