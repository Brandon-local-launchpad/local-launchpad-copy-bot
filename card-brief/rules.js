'use strict';

// ── Review & Referral Cards: the rules (13 Nov 2026, Brandon) ────────────────────────────────
// Every client gets a matched print kit: an A5 Google review card and an 85 × 55 mm referral
// card. Claude makes them with the /customer-revref-cards skill, from a client brief. This
// builds that brief from the client record, so nothing is typed twice and nothing is missed.
// Copybot does not make the cards and sends nothing to Claude: a person copies the brief.
// Pure: no database, no network. card-brief/service.js keeps the tab's own fields.
//   tradeOf        Primary category → one of the skill's ten trades, else other
//   formatMobile   07xxx xxxxxx, and whether it is a UK mobile
//   whatsappLink   https://wa.me/44…
//   recordValues   the lines the record can fill, each with where it came from
//   build          the record, the tab's saved fields → every field, the readiness, the brief
//   clean          one saved field, tidied; undefined for a key or value that is not one
// A saved key among AUTO is an override of the record's value (a blank one included): it is
// never written back to the Record tab.

const R = require('../review-funnel/rules');

const str = v => (v == null ? '' : String(v)).trim();
const line = v => str(v).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();

const TRADES = ['electrician', 'plumber', 'roofer', 'landscaper', 'cleaner', 'builder', 'decorator', 'locksmith', 'heating', 'carpenter'];
// GBP primary category contains → trade. First match wins. Joiners are carpenter: the skill's word.
const TRADE_MAP = [
  [['electric'], 'electrician'],
  [['plumb'], 'plumber'],
  [['roof'], 'roofer'],
  [['landscap', 'garden'], 'landscaper'],
  [['clean'], 'cleaner'],
  [['builder', 'construction', 'general contractor', 'extension'], 'builder'],
  [['paint', 'decorat'], 'decorator'],
  [['locksmith'], 'locksmith'],
  [['heating', 'boiler', 'gas engineer'], 'heating'],
  [['carpent', 'joiner', 'cabinet'], 'carpenter'],
];

// The five designs, as the Templates gallery shows them. The images are the same for every
// client: public/card-templates/<review|referral>/<stem>-<front|back>.webp (scripts/import-card-templates.js)
const TEMPLATES = [
  { id: '3a', name: 'Midnight', stem: '3a-midnight', look: 'Near-black with soft warm and cool glows', best_for: 'Default all-rounder; electricians, heating, locksmiths' },
  { id: '3b', name: 'Paper', stem: '3b-paper', look: 'Warm stone / off-white', best_for: 'Plumbers, cleaners, kitchens and bathrooms; light brands' },
  { id: '3c', name: 'Deep Colour', stem: '3c-deep', look: 'The client\'s darkest brand colour', best_for: 'Strong brand colour; landscapers, roofers' },
  { id: '3d', name: 'Job Photo', stem: '3d-photo', look: 'A photo of finished work fading to near-black', best_for: 'Any trade with one great photo of finished work (needs a job photo)' },
  { id: '3e', name: 'Craft Serif', stem: '3e-craft', look: 'Espresso / deep warm dark, serif headline', best_for: 'Joiners, stonemasons, high-end / heritage' },
];
const IMAGE_SLOTS = [['review', 'front', 'Review front'], ['review', 'back', 'Review back'], ['referral', 'front', 'Referral front'], ['referral', 'back', 'Referral back']];

const FEELS = ['premium', 'friendly', 'bold', 'traditional', 'modern', 'clean'];
const SOLE = ['Sole trader (he)', 'Sole trader (she)', 'Team'];
const LOGO_TYPES = ['SVG', 'PNG transparent', 'JPG'];
const SIGNOFF = [
  ['proofs_sent', 'Proofs sent to client'],
  ['client_approved', 'Client approved name, number, colours and QR links'],
  ['pdfs_exported', 'Both PDFs exported (guides off)'],
  ['sent_to_printer', 'Sent to printer'],
];

// The lines the record fills. A saved value for one of these is an override.
const AUTO = ['business_name', 'trade', 'trade_other', 'area', 'contact_first_name', 'mobile', 'review_link', 'services_link'];
// The tab's own fields and what each starts as
const DEFAULTS = {
  short_name: '', sole_or_team: 'Team', claim_link: '',
  logo_supplied: 'no', logo_type: 'SVG', logo_on_dark: 'yes',
  colour_main: '', colour_dark: '', colour_avoid: '',
  template: '', feel: [], job_photo: 'no',
  example_job: '', pun: '', must_say: '', must_not_say: 'Any discount or reward for leaving a review (against Google policy)',
  qty_review: '', qty_referral: '',
  printer: 'Solopress — CMYK PDF, 3 mm bleed, crop marks on',
  paper_review: '400gsm silk, matt lamination both sides',
  paper_referral: '400gsm uncoated (no lamination, so biro writes on the offer box)',
  deadline: '', test_client: false,
};
// What drives amber, in the brief's order: the skill fills each with a marked TEST placeholder
const PLACEHOLDERS = [
  ['contact_first_name', 'Contact first name'],
  ['mobile', 'Mobile number'],
  ['review_link', 'Google review link'],
  ['claim_link', 'Scan-to-claim link'],
  ['services_link', 'View our services link'],
];

function tradeOf(category) {
  const c = line(category), low = c.toLowerCase();
  if (!low) return { trade: '', other: '' };
  const hit = TRADE_MAP.find(([words]) => words.some(w => low.includes(w)));
  return hit ? { trade: hit[1], other: '' } : { trade: 'other', other: c };
}

// A UK number's digits, starting 0: +44 and 0044 become the leading 0
function ukDigits(v) {
  let d = str(v).replace(/[^\d+]/g, '');
  if (d.startsWith('+44')) d = `0${d.slice(3).replace(/^0/, '')}`;
  else if (d.startsWith('0044')) d = `0${d.slice(4).replace(/^0/, '')}`;
  return d.replace(/\D/g, '');
}
function formatMobile(v) {
  const d = ukDigits(v);
  if (/^07\d{9}$/.test(d)) return { value: `${d.slice(0, 5)} ${d.slice(5)}`, mobile: true };
  return { value: line(v), mobile: false };
}
function whatsappLink(mobile) {
  const d = ukDigits(mobile);
  // A UK mobile only (14 Nov 2026, the QR codes rule): WhatsApp is not on a landline
  return /^07\d{9}$/.test(d) ? `https://wa.me/44${d.slice(1)}` : '';
}
const looksLikeReviewLink = url => /(^|\/\/)g\.page\/r\/[^/\s]+\/review\b/i.test(str(url)) || /search\.google\.com\/local\/writereview\?placeid=[^&\s]+/i.test(str(url));
const isHex = v => /^#[0-9a-f]{6}$/i.test(str(v));
const isLink = v => /^https?:\/\/\S+$/i.test(str(v));
const yes = v => v === true || /^(yes|true|1|on)$/i.test(str(v));

// The site's address as a link: https:// put on, no slash on the end
function siteOf(domain) {
  const d = str(domain).replace(/\/+$/, '');
  if (!d || /\s/.test(d)) return '';
  return /^https?:\/\//i.test(d) ? d : `https://${d}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// DD MMM YYYY from YYYY-MM-DD
function dayOf(iso) {
  const m = str(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m && MONTHS[+m[2] - 1] ? `${m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}` : '';
}
// Today in the UK, as YYYY-MM-DD
function ukToday(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

const slugOf = name => line(name).toLowerCase().replace(/&/g, ' and ').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'client';

// What the record gives each AUTO line, and the grey tag that says where from.
// cv: Client Values (unconfirmed form values already blanked); clientName: the client's name in
// Copybot; baseTown: the onboarding form's base town; pageRows: the page map's rows
function recordValues({ cv = {}, clientName = '', baseTown = '', pageRows = [] } = {}) {
  const out = {};
  const company = line(cv.company_name);
  if (company) out.business_name = { value: company, source: 'from Record → Company name', note: yes(cv.company_name_gbp_checked) ? '' : 'Check this matches GBP exactly: "Checked against GBP" is not ticked on the Record tab.' };
  else out.business_name = { value: line(clientName), source: line(clientName) ? 'from the client\'s name in Copybot' : '', note: line(clientName) ? 'Check this matches GBP exactly: the Record tab has no company name.' : '' };

  const t = tradeOf(cv.primary_category);
  out.trade = { value: t.trade, source: t.trade ? 'from Record → Primary category' : '' };
  out.trade_other = { value: t.other, source: t.other ? 'from Record → Primary category' : '' };

  out.area = { value: line(baseTown), source: line(baseTown) ? 'from the onboarding form → Base town' : '' };

  const first = line(cv.owner_name).split(' ')[0] || '';
  out.contact_first_name = { value: first, source: first ? 'from Record → Owner name' : '' };

  const m = formatMobile(cv.phone);
  out.mobile = { value: m.value, source: m.value ? 'from Record → Phone' : '' };

  const link = R.reviewLink(cv);
  out.review_link = { value: link.url, source: link.source === 'typed' ? 'from Record → Google review link' : link.source === 'listing' ? 'built from the confirmed Google listing' : '' };

  const site = siteOf(cv.live_domain);
  const hub = site && (pageRows || []).some(r => r && r.applies !== false && !r.retired_at && str(r.slug).replace(/^\/+|\/+$/g, '') === 'services');
  out.services_link = { value: site ? (hub ? `${site}/services/` : site) : '', source: site ? (hub ? 'from Record → Live domain, and the page map\'s services page' : 'from Record → Live domain') : '' };
  return out;
}

// One saved field, tidied. undefined: not a field, or not a value it can hold.
function clean(key, value) {
  const text = (max = 300) => line(value).slice(0, max);
  switch (key) {
    case 'trade': { const v = text(20).toLowerCase(); return TRADES.includes(v) || v === 'other' || v === '' ? v : undefined; }
    case 'sole_or_team': return SOLE.includes(str(value)) ? str(value) : undefined;
    case 'logo_supplied': case 'job_photo': case 'logo_on_dark': return /^(yes|no)$/.test(str(value)) ? str(value) : undefined;
    case 'logo_type': return LOGO_TYPES.includes(str(value)) ? str(value) : undefined;
    case 'template': return str(value) === '' || TEMPLATES.some(t => t.id === str(value)) ? str(value) : undefined;
    case 'feel': return Array.isArray(value) ? [...new Set(value.map(str).filter(v => FEELS.includes(v)))].slice(0, 2) : undefined;
    case 'test_client': return value === true || value === false ? value : undefined;
    case 'qty_review': case 'qty_referral': { const v = str(value).replace(/[,\s]/g, ''); return v === '' || /^\d{1,7}$/.test(v) ? v : undefined; }
    case 'deadline': return str(value) === '' || (/^\d{4}-\d{2}-\d{2}$/.test(str(value)) && dayOf(value)) ? str(value) : undefined;
    case 'mobile': return formatMobile(value).value.slice(0, 40);
    case 'review_link': case 'claim_link': case 'services_link': return text(500);
    case 'colour_main': case 'colour_dark': return text(20);
    default: return AUTO.includes(key) || key in DEFAULTS ? text() : undefined;
  }
}

// record: recordValues(); saved: the tab's stored fields; now: for the generated line
function build({ record = {}, saved = {}, now = new Date() } = {}) {
  const has = k => Object.prototype.hasOwnProperty.call(saved, k);
  const fields = {};
  for (const k of AUTO) {
    const rec = record[k] || { value: '', source: '' };
    const overridden = has(k) && saved[k] !== rec.value;
    fields[k] = { value: has(k) ? saved[k] : rec.value, record: rec.value, source: rec.source || '', overridden, note: overridden ? '' : rec.note || '', warn: '' };
  }
  for (const k of Object.keys(DEFAULTS)) fields[k] = { value: has(k) ? saved[k] : DEFAULTS[k], warn: '' };
  const v = k => fields[k].value;

  // Warnings: none of them stops the copy
  if (v('mobile') && !formatMobile(v('mobile')).mobile) fields.mobile.warn = 'This is not a UK mobile starting 07.';
  if (v('review_link') && !looksLikeReviewLink(v('review_link'))) fields.review_link.warn = 'This does not look like a Google review link (g.page/r/…/review, or search.google.com/local/writereview?placeid=…).';
  for (const k of ['claim_link', 'services_link']) if (v(k) && !isLink(v(k))) fields[k].warn = 'This is not a full link (https://…).';
  for (const k of ['colour_main', 'colour_dark']) if (v(k) && !isHex(v(k))) fields[k].warn = 'Not a hex colour like #1A2B3C: left out of the brief until it is.';
  if (v('template') === '3d' && v('job_photo') !== 'yes') fields.job_photo.warn = 'Needed for 3d Job Photo.';

  const missing = PLACEHOLDERS.filter(([k]) => !v(k)).map(([key, label]) => ({ key, label }));
  const level = !v('business_name') ? 'red' : missing.length ? 'amber' : 'green';
  const readiness = {
    level, missing,
    text: level === 'red' ? 'Can\'t copy yet. Business name missing.'
      : level === 'amber' ? `Ready, with ${missing.length} placeholder${missing.length === 1 ? '' : 's'}: ${missing.map(m => m.label).join(', ')}`
        : 'Ready. Everything filled.',
  };

  const tpl = TEMPLATES.find(t => t.id === v('template'));
  const hex = k => (isHex(v(k)) ? v(k).toUpperCase() : '');
  const trade = v('trade') === 'other' ? (v('trade_other') ? `other: ${v('trade_other')}` : 'other') : v('trade');
  const logo = v('logo_supplied') === 'yes' ? `yes — ${v('logo_type')} · works on dark? ${v('logo_on_dark')}` : 'no — use a text wordmark';
  const lines = [
    '/customer-revref-cards',
    '',
    '# Customer Review & Referral Cards — Client Brief',
    `Generated by CopyBot on ${dayOf(ukToday(now))} for ${v('business_name')}.`,
    ...(v('test_client') ? ['> ⚠️ **TEST CLIENT — fictional business for template testing. Not for print.**'] : []),
    '',
    '## 1. Business',
    `- Business name (exactly as on Google Business Profile): ${v('business_name')}`,
    `- Short name for the wordmark (if different): ${v('short_name')}`,
    `- Trade: ${trade}`,
    `- Sole trader or team? ${v('sole_or_team')}`,
    `- Area / town: ${v('area')}`,
    '',
    '## 2. Contact (referral card back)',
    `- First name to call/text: ${v('contact_first_name')}`,
    `- Mobile number: ${v('mobile')}`,
    '',
    '## 3. Links & QR codes',
    `- Google review link (review card QR): ${v('review_link')}`,
    `- "Scan to claim" link (referral QR 1): ${v('claim_link')}`,
    `- "View our services" link (referral QR 2): ${v('services_link')}`,
    '- QR files supplied? no — generate black-on-white SVG from the links and test-scan',
    '',
    '## 4. Brand',
    `- Logo supplied? ${logo}`,
    `- Brand colours (hex): main/accent ${hex('colour_main')} · dark ${hex('colour_dark')} · avoid ${v('colour_avoid')}`,
    '',
    '## 5. Style',
    `- Template: ${tpl ? `${tpl.id} ${tpl.name}` : 'designer\'s choice'}`,
    `- Feel: ${v('feel').join(' · ')}`,
    `- Job photo supplied? ${v('job_photo')}`,
    '',
    '## 6. Copy tweaks',
    `- Review example job: ${v('example_job')}`,
    `- Review trade pun ("keep our standards ___."): ${v('pun')}`,
    `- Must say: ${v('must_say')}`,
    `- Must not say: ${v('must_not_say')}`,
    '',
    '## 7. Print',
    `- Quantities: review ${v('qty_review')} · referral ${v('qty_referral')}`,
    `- Printer / CMYK needed? ${v('printer')}`,
    `- Paper & finish: review ${v('paper_review')} · referral ${v('paper_referral')}`,
    `- Deadline: ${dayOf(v('deadline'))}`,
    '',
    '## Missing details',
    ...(missing.length ? missing.map(m => `- ${m.label} — use TEST placeholder and flag`) : ['- None']),
  ];
  const brief = `${lines.map(l => l.replace(/[ \t]+$/, '')).join('\n')}\n`;

  return {
    fields, readiness, brief,
    attach: v('logo_supplied') === 'yes' || v('job_photo') === 'yes',
    whatsapp: whatsappLink(v('mobile')),
  };
}

module.exports = {
  TRADES, TRADE_MAP, TEMPLATES, IMAGE_SLOTS, FEELS, SOLE, LOGO_TYPES, SIGNOFF, AUTO, DEFAULTS, PLACEHOLDERS,
  tradeOf, formatMobile, whatsappLink, looksLikeReviewLink, isHex, siteOf, dayOf, ukToday, slugOf, recordValues, clean, build,
};
