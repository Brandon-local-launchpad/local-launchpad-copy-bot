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
// check (code only, no model: the message is fixed text and is never reworded). Stage 3, Make in
// QR.io: the tick list a person follows, its step text fixed (the SOP's), each value inline.
// Stage 4, Upload and check: what an uploaded code's link means for the slot it was put in.
// Stage 5: the status (the subtab's dot and the Tracker's two lines) and what the card Brief takes.
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
//   make             prepare() and the saved ticks → the folder steps and each code's steps
//   stepIds          every tick id there is: folder.<step>, <code>.<step>
//   samePlace        two links with the same host and path (trailing slash and query ignored)
//   whatsappOf       the phone and message a wa.me or api.whatsapp.com/send link carries
//   judge            a decoded code, where it lands, the slot → ok, static or failed, and why
//   duplicateOf      the checked slot that already holds this file or this short link
//   uploads          prepare() and the saved slot results → the three slots as the tab shows them
//   status           the record and the saved row → started, prepare_ready, upload_ready,
//                    temporary, failed, and the dot: none, wait, block or ok
//   handoff          what the card Brief takes: the funnel link always; once all three codes
//                    are checked, the two referral links and the three files' names
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

// ── Stage 3: Make in QR.io ──
// The step text is fixed (Brandon's SOP). **bold** is a button or menu in QR.io; {token} is a
// value shown inline with its own Copy, so nothing is retyped; {link} is the dashboard link.
const DASHBOARD = 'https://qr.io/dashboard/';
const FOLDER_STEPS = [
  ['open', 'Open {link} (new tab).'],
  ['folder', 'Folders → **New Folder** → paste {folder} → **Save**.'],
  ['open_folder', 'Open the new folder.'],
];
const CODE_STEPS = [
  ['create', '**Create QR Code** → **Website URL**.'],
  ['destination', 'Paste {destination} → **Continue**.'],
  ['design', 'Leave the design on default: no frame, no phrase, black → **Continue**.'],
  ['name', 'Click the pencil next to "Untitled" → paste {qr_name}.'],
  ['move', 'Three dots → **Move to folder** → {folder} → **Save**.'],
  ['download', 'Download the QR as PNG or SVG and upload it below.'],
];
const stepIds = () => [...FOLDER_STEPS.map(([k]) => `folder.${k}`), ...CODES.flatMap(c => CODE_STEPS.map(([k]) => `${c.key}.${k}`))];

// p: prepare(); ticks: { id: { at, by } }. The folder steps open once there is a folder name; a
// code's steps open only when its destination has passed (state ready).
function make({ prepare: p = { folder: '', codes: [] }, ticks = {} } = {}) {
  const steps = (group, list, values) => list.map(([key, text]) => {
    const id = `${group}.${key}`, t = ticks[id];
    const used = Object.fromEntries((text.match(/\{(\w+)\}/g) || []).map(m => m.slice(1, -1)).map(k => [k, values[k] || '']));
    return { id, text, values: used, ticked: !!t, ...(t ? { at: t.at, by: t.by || '' } : {}) };
  });
  const count = list => ({ done: list.filter(s => s.ticked).length, total: list.length });
  const folderSteps = steps('folder', FOLDER_STEPS, { link: DASHBOARD, folder: p.folder });
  const folder = { unlocked: !!p.folder, message: p.folder ? '' : 'Fill in the niche and the business name first.', steps: folderSteps, ...count(folderSteps) };
  const codes = p.codes.map(c => {
    const list = steps(c.key, CODE_STEPS, { destination: c.destination, qr_name: c.qr_name, folder: p.folder });
    const unlocked = c.state === 'ready';
    const message = unlocked ? '' : c.state === 'unchecked' ? 'Locked until its link has been checked.' : c.state === 'failed' ? `Locked: ${c.message}` : `Locked: ${c.message}`;
    return { key: c.key, name: c.name, card: c.card, unlocked, message, steps: list, ...count(list) };
  });
  const all = [folder, ...codes];
  return { folder, codes, done: all.reduce((n, g) => n + g.done, 0), total: all.reduce((n, g) => n + g.total, 0), complete: all.every(g => g.done === g.total) };
}

// ── Stage 4: Upload and check ──
const UNREADABLE = 'Can\'t read this QR. Download it again from QR.io.';
const STATIC = 'This is a static code. Its link can\'t be changed after printing. Recreate it in QR.io as a Website URL code.';
// What each code's destination is called in a message
const NOUN = { review: 'the review funnel', claim: 'WhatsApp', services: 'the website' };
const codeName = key => (CODES.find(c => c.key === key) || {}).name || key;

// host and path, lower-cased host, no trailing slash, no query: '' for what is not a link
function place(url) {
  try { const u = new URL(str(url)); return /^https?:$/.test(u.protocol) ? `${u.hostname.toLowerCase().replace(/\.$/, '')}${u.pathname.replace(/\/+$/, '')}` : ''; } catch (_) { return ''; }
}
const samePlace = (a, b) => !!place(a) && place(a) === place(b);

// wa.me/{phone}?text=… (exact: the message as the code carries it), or the page it forwards to,
// api.whatsapp.com/send?phone=…&text=… (WhatsApp may tidy the message on the way)
function whatsappOf(url) {
  try {
    const u = new URL(str(url)), host = u.hostname.toLowerCase();
    if (host === 'wa.me' || host === 'www.wa.me') {
      const phone = u.pathname.replace(/^\/+|\/+$/g, '');
      return /^\d+$/.test(phone) ? { phone, text: u.searchParams.get('text') || '', exact: true } : null;
    }
    if (/(^|\.)whatsapp\.com$/.test(host) && /^\/send\/?$/.test(u.pathname)) return { phone: (u.searchParams.get('phone') || '').replace(/\D/g, ''), text: u.searchParams.get('text') || '', exact: false };
  } catch (_) { /* not a link */ }
  return null;
}

// What each code should land on, from prepare(): the link, and for a fetched link where the
// link itself ended up when Prepare checked it (a site that forwards to www, say)
function targetsOf(p = { codes: [] }) {
  const out = {};
  for (const c of p.codes) {
    if (!c.destination) continue;
    if (c.key === 'claim') { const w = whatsappOf(c.destination); if (w) out.claim = { url: c.destination, phone: w.phone, text: w.text }; }
    else out[c.key] = { url: c.destination, final: (c.check && c.check.final_url) || '' };
  }
  return out;
}
// Does any of these links (the hops of a chain, in order) reach this code's destination?
function reaches(key, target, urls) {
  if (!target) return false;
  if (key === 'claim') return urls.map(whatsappOf).filter(Boolean).some(w => w.phone === target.phone && (w.exact ? w.text === target.text : w.text.trimEnd() === target.text.trimEnd()));
  return urls.some(u => samePlace(u, target.url) || (target.final && samePlace(u, target.final)));
}

// slot: review, claim or services; decoded: the text in the code; chain: links.js follow() of it
// (not needed for a static code or text that is not a link); p: prepare().
// → { state: 'ok' | 'static' | 'failed', level, message, short_url, final_url }
function judge({ slot, decoded = '', chain = null, prepare: p } = {}) {
  const out = (state, level, message, extra = {}) => ({ state, level, message, short_url: '', final_url: '', ...extra });
  if (!isLink(decoded)) return out('failed', 'red', 'This QR holds text, not a link. Download it again from QR.io.');
  const targets = targetsOf(p), keys = CODES.map(c => c.key);
  // Step 2: a QR.io code holds a short link. One that holds a destination itself is static.
  if (keys.some(k => reaches(k, targets[k], [decoded])) || whatsappOf(decoded)) return out('static', 'amber', STATIC, { final_url: decoded });
  if (!chain) return out('failed', 'red', 'The short link has not been followed yet. Press Re-check.', { short_url: decoded });
  const urls = [...(chain.hops || []).map(h => h.url), chain.finalUrl].filter(Boolean);
  const done = { short_url: decoded, final_url: chain.finalUrl || '' };
  // Step 3: where it lands against what this slot expects
  if (reaches(slot, targets[slot], urls)) return out('ok', 'green', `Checked: goes to ${slot === 'claim' ? `WhatsApp ${targets.claim.phone} with the claim message` : targets[slot].url}`, done);
  // Step 4: another code's destination
  const other = keys.find(k => k !== slot && reaches(k, targets[k], urls));
  if (other) return out('failed', 'red', `This code goes to ${NOUN[other]}, not ${NOUN[slot]}. Move it to the ${codeName(other)} slot.`, done);
  if (slot === 'claim' && targets.claim) {
    const w = urls.map(whatsappOf).filter(Boolean)[0];
    if (w && w.phone !== targets.claim.phone) return out('failed', 'red', `This code opens WhatsApp for ${w.phone || 'no number'}, not ${targets.claim.phone}. Make it again from the link in Prepare.`, done);
    if (w) return out('failed', 'red', 'This code opens WhatsApp with a different message. Make it again from the link in Prepare.', done);
  }
  if (chain.error && urls.length <= 1) return out('failed', 'red', `The code's link could not be followed: ${chain.error}.`, done);
  const landed = place(chain.finalUrl) || chain.finalUrl || 'nowhere';
  return out('failed', 'red', `This code goes to ${landed}, not ${NOUN[slot]}${slot === 'claim' ? '' : ` (${place(targets[slot] ? targets[slot].url : '')})`}.${chain.error ? ` The check stopped early: ${chain.error}.` : ''}`, done);
}

// Step 5: the same file or the same short link cannot be in two slots. Only a slot that passed
// counts, so a code put in the wrong slot can be moved to the right one.
function duplicateOf({ slot, sha256 = '', decoded = '', saved = {} } = {}) {
  for (const c of CODES) {
    const o = saved[c.key];
    if (c.key === slot || !o || o.state !== 'ok') continue;
    if (sha256 && o.sha256 === sha256) return { key: c.key, message: `This is the same file as the one in the ${c.name} slot. Each slot needs its own code.` };
    if (decoded && o.decoded === decoded) return { key: c.key, message: `This code is already in the ${c.name} slot. Each slot needs its own code.` };
  }
  return null;
}

// p: prepare(); saved: { review, claim, services }, each the last upload's result. A slot opens
// when its destination has passed. A code checked against a destination that has since changed
// is stale: amber, and it no longer counts until Re-check.
function uploads({ prepare: p = { codes: [] }, saved = {} } = {}) {
  const slots = p.codes.map(c => {
    const u = saved[c.key] || null;
    const unlocked = c.state === 'ready';
    const base = { key: c.key, name: c.name, card: c.card, unlocked, locked_message: unlocked ? '' : c.state === 'unchecked' ? 'Locked until its link has been checked.' : `Locked: ${c.message}`, expects: c.destination };
    if (!u) return { ...base, state: 'empty', level: 'grey', message: unlocked ? 'No code uploaded yet.' : '', file: null, short_url: '', final_url: '', checked_at: null, by: '', can_recheck: false };
    const stale = u.state === 'ok' && u.expected !== c.destination;
    return {
      ...base,
      state: stale ? 'stale' : u.state, level: stale ? 'amber' : u.level,
      message: stale ? 'The destination has changed since this code was checked. Press Re-check.' : u.message,
      file: u.name ? { name: u.name, kind: u.kind || '', kept: !!u.kept } : null,
      short_url: u.short_url || '', final_url: u.final_url || '', checked_at: u.checked_at || null, by: u.by || '',
      can_recheck: unlocked && !!u.kept && isLink(u.decoded || ''),
    };
  });
  return { slots, ready: slots.length === CODES.length && slots.every(s => s.state === 'ok') };
}

// ── Stage 5: the status and the hand-off ──
// record: recordValues(); row: { fields, checks, ticks, uploads } as saved, or null for a client
// with nothing saved. The dot: grey not started, amber waiting on a person, red a failed check,
// green all three codes checked.
function status({ record = {}, row = null } = {}) {
  const r = row || {};
  const built = build({ record, saved: r.fields || {} });
  const p = prepare({ fields: built.fields, temporary: built.website_temporary, checks: r.checks || {} });
  const u = uploads({ prepare: p, saved: r.uploads || {} });
  const started = !!row && [r.fields, r.checks, r.ticks, r.uploads].some(o => o && Object.keys(o).length);
  const failed = p.codes.some(c => c.state === 'failed') || u.slots.some(s => s.state === 'failed');
  const checkedAt = u.slots.map(s => s.checked_at).filter(Boolean).sort().pop() || null;
  return {
    started, prepare_ready: p.ready, upload_ready: u.ready, temporary: built.website_temporary, failed, checked_at: u.ready ? checkedAt : null,
    dot: u.ready ? 'ok' : failed ? 'block' : started ? 'wait' : 'none',
    built, prepare: p, upload: u,
  };
}

// What the card Brief takes from a status(). The review card's QR is the Review Funnel code, so
// its link is the funnel, never the Google review link. The files are named by their QR names.
function handoff(st) {
  const v = k => (st.built.fields[k] && !st.built.fields[k].problem ? st.built.fields[k].value : '');
  const code = k => st.prepare.codes.find(c => c.key === k) || {};
  const slot = k => st.upload.slots.find(s => s.key === k) || {};
  const USE = { review: 'Review card QR', claim: 'Referral QR 1 (Scan to claim)', services: 'Referral QR 2 (View our services)' };
  return {
    funnel: v('review_funnel_url'), ready: st.upload_ready, dot: st.dot,
    claim_link: st.upload_ready ? code('claim').destination : '',
    services_link: st.upload_ready ? code('services').destination : '',
    files: st.upload_ready ? CODES.map(c => ({ key: c.key, use: USE[c.key], name: fileName(code(c.key).qr_name, slot(c.key).file) })) : [],
  };
}
// "Landscapers Edens Edge Review Funnel QR Code.png": the QR name, with the file's own type
const fileName = (qrName, file) => `${line(qrName).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'QR Code'}.${file && file.kind === 'svg' ? 'svg' : 'png'}`;

module.exports = { status, handoff, fileName, UNREADABLE, STATIC, NOUN, place, samePlace, whatsappOf, targetsOf, reaches, judge, duplicateOf, uploads, DASHBOARD, FOLDER_STEPS, CODE_STEPS, stepIds, make, CODES, CHECKED, folderName, qrName, whatsappMessage, whatsappUrl, linkResult, prepare, AUTO, KEYS, LABELS, MOBILE_NEEDED, GOOGLE_REFUSED, nicheWord, looksPlural, normaliseNumber, isGoogleLink, isHttps, isLink, recordValues, clean, build };
