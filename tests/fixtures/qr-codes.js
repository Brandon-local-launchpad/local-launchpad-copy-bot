'use strict';
// Fixture: the QR codes subtab (qr-codes/, 14 Nov 2026, Brandon). Stage 1, the fields: the niche
// word, the WhatsApp number rule, a Google link refused as the review funnel, what the record
// fills and where from, an override kept on the tab and never written to the record, the
// Temporary URL tick. Stage 2, Prepare: the folder name, the QR names, the fixed WhatsApp message
// and its link, the link follower (links.js, on a fake fetch: no network), each code's state, the
// link checks and the pass by hand. Brandon's tests 1 (the names and the link, word for word),
// 2 (the landline), 3 (the Google link) and 5 (Smith & Son's) are marked. Stage 3, Make in QR.io:
// the tick list word for word, the values each step carries, what is locked, a tick's who and when.
// Postgres in memory, a real express app on a local port. Nothing is sent anywhere.
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const R = require(path.join(root, 'qr-codes/rules.js'));
const S = require(path.join(root, 'qr-codes/service.js'));
const N = require(path.join(root, 'fillout/niches.js'));
const L = require(path.join(root, 'qr-codes/links.js'));
const CB = require(path.join(root, 'card-brief/rules.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got = '', want = '') => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + (typeof got === 'string' ? got : JSON.stringify(got)) + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: the QR codes subtab (the fields, Prepare, the link checks, the tick list) ===\n');

// http.request, not fetch: a fixture that fetches its own server aborts at exit on Windows
const call = (base, method, p, body) => new Promise((resolve, reject) => {
  const u = new URL(p, base);
  const data = body === undefined ? null : JSON.stringify(body);
  const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method, headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} }, res => {
    let text = ''; res.on('data', c => { text += c; });
    res.on('end', () => { let json = null; try { json = JSON.parse(text); } catch (_) { /* not JSON */ } resolve({ status: res.statusCode, json, text }); });
  });
  req.on('error', reject); req.end(data);
});

// ── The pure rules ──
chk('The niche word is the label before the first "/"', R.nicheWord('Landscapers/Gardeners') === 'Landscapers' && R.nicheWord('Roofers') === 'Roofers' && R.nicheWord('Loft Conversions / Extensions') === 'Loft Conversions' && R.nicheWord('') === '');
chk('Every niche in the form gives a word', N.allNiches().every(n => R.nicheWord(n.label)));
chk('A plural trade word passes; anything else is flagged to check', R.looksPlural('Landscapers') && R.looksPlural('Tree Surgeons') && !R.looksPlural('Plumbing & Heating') && !R.looksPlural('Kitchen') && !R.looksPlural('Flooring Fitters (carpet'));

const num = v => R.normaliseNumber(v);
chk('07700 900123 is 447700900123, from any spacing, brackets, dashes, +44 or 0044', ['07700 900123', '07700-900-123', '(07700) 900123', '+44 7700 900123', '0044 7700 900123', '447700900123', '+44 (0)7700 900123'].every(v => num(v).valid && num(v).value === '447700900123'), ['07700 900123', '+44 (0)7700 900123'].map(v => num(v)));
chk('[T2] A landline never passes and is kept as typed', !num('023 8000 0000').valid && num('023 8000 0000').value === '023 8000 0000' && !num('+44 23 8000 0000').valid);
chk('A short, long or empty number does not pass', !num('07700 90012').valid && !num('07700 9001234').valid && !num('').valid && !num('ask Ethan').valid);

chk('[T3] g.page, goo.gl and google hosts are Google links', ['https://g.page/r/CabcDEF/review', 'https://maps.app.goo.gl/abc', 'https://goo.gl/maps/x', 'https://search.google.com/local/writereview?placeid=ChIJx', 'https://www.google.com/maps/place/x', 'https://www.google.co.uk/search?q=x', 'g.page/r/Cabc/review'].every(R.isGoogleLink));
chk('A funnel link is not a Google link, whatever its path says', !R.isGoogleLink('https://edensedge.example/review-us/') && !R.isGoogleLink('https://reviews.example/google.com') && !R.isGoogleLink('https://notgoogle.com/x') && !R.isGoogleLink('https://page.example/g.page'));

const c = (k, v) => R.clean(k, v);
chk('[T3] A Google review link typed as the funnel is refused, with the reason', c('review_funnel_url', 'https://g.page/r/CedensEDGE/review').error === R.GOOGLE_REFUSED && /Review Us funnel/.test(R.GOOGLE_REFUSED));
chk('The funnel link must be https', /https:\/\//.test(c('review_funnel_url', 'http://edensedge.example/review-us/').error) && /https:\/\//.test(c('review_funnel_url', 'edensedge.example/review-us').error) && c('review_funnel_url', ' https://edensedge.example/review-us/ ').value === 'https://edensedge.example/review-us/' && c('review_funnel_url', '').value === '');
chk('A number is saved normalised; a landline as typed', c('whatsapp_number', '07700 900123').value === '447700900123' && c('whatsapp_number', '023 8000 0000').value === '023 8000 0000');
chk('A key that is not a field is not cleaned', c('company_name', 'X') === undefined && c('website_temporary', 'yes').error);

// ── What the record gives ──
const FULL = { company_name: 'Eden\'s Edge', phone: '07700 900123', live_domain: 'edensedge.example/', review_url: 'https://g.page/r/CedensEDGE/review' };
const rec = R.recordValues({ cv: FULL, clientName: 'ednes edge testing', nicheLabel: 'Landscapers/Gardeners' });
chk('The record fills the niche, the name, the number and the site', rec.qr_niche_label.value === 'Landscapers' && rec.qr_business_name.value === 'Eden\'s Edge' && rec.whatsapp_number.value === '447700900123' && rec.website_url.value === 'https://edensedge.example', rec);
chk('Each value says where it came from', /Landscapers\/Gardeners/.test(rec.qr_niche_label.source) && rec.qr_business_name.source === 'from Record → Company name' && rec.whatsapp_number.source === 'from Record → Phone' && rec.website_url.source === 'from Record → Live domain');
chk('The review funnel link is never filled from the record: the Google review link is not it', rec.review_funnel_url.value === '');
const land = R.recordValues({ cv: { ...FULL, phone: '023 8000 0000' }, nicheLabel: 'Landscapers/Gardeners' });
chk('[T2] A landline on the record is not used, and the note says so', land.whatsapp_number.value === '' && /023 8000 0000/.test(land.whatsapp_number.note));
chk('No company name: the client\'s name in Copybot', R.recordValues({ cv: {}, clientName: 'Kestrel Ridge Roofing' }).qr_business_name.value === 'Kestrel Ridge Roofing');

// ── The fields ──
let b = R.build({ record: rec, saved: {} });
chk('Record values only: the funnel link is the one thing missing', Object.entries(b.fields).filter(([, f]) => f.problem).map(([k]) => k).join() === 'review_funnel_url', b.fields);
b = R.build({ record: land, saved: {} });
chk('[T2] No mobile: "Needs a UK mobile number with WhatsApp on it"; the niche, name and site carry no problem', b.fields.whatsapp_number.problem === 'Needs a UK mobile number with WhatsApp on it' && !b.fields.qr_niche_label.problem && !b.fields.qr_business_name.problem && !b.fields.website_url.problem);
b = R.build({ record: rec, saved: { website_temporary: true, review_funnel_url: 'https://edensedge.example/review-us/' } });
chk('Temporary URL ticked: allowed, flagged amber, no problem', b.website_temporary === true && /Temporary URL/.test(b.fields.website_url.warn) && !b.fields.website_url.problem && !b.fields.review_funnel_url.problem);
b = R.build({ record: R.recordValues({ cv: FULL, nicheLabel: 'Plumbing & Heating' }), saved: {} });
chk('A niche word that is not a plural trade is flagged, not stopped', /plural/.test(b.fields.qr_niche_label.warn) && !b.fields.qr_niche_label.problem);
b = R.build({ record: R.recordValues({}), saved: {} });
chk('Nothing on the record: every field says what it is needed for', R.KEYS.every(k => b.fields[k].problem), b.fields);

// ── Stage 2: Prepare ──
const EDENS_LINK = 'https://wa.me/447700900123?text=Hey%20Eden%27s%20Edge%2C%20I%27ve%20been%20given%20one%20of%20your%20referral%20cards%20and%20I%27d%20like%20to%20claim%20the%20offer%20on%20it.%20My%20name%20is%20';
const EDGE = "Eden's Edge", SMITH = "Smith & Son's";
chk('[T1] The folder is Landscapers-Eden\'s Edge, the name exactly as written', R.folderName('Landscapers', EDGE) === "Landscapers-Eden's Edge");
chk('[T1] The QR names drop the apostrophe and nothing else', R.CODES.map(c => R.qrName('Landscapers', EDGE, c.name)).join(' | ') === 'Landscapers Edens Edge Review Funnel QR Code | Landscapers Edens Edge Scan to Claim QR Code | Landscapers Edens Edge View Our Services QR Code');
chk('The message is the fixed text and ends in a space', R.whatsappMessage(EDGE) === "Hey Eden's Edge, I've been given one of your referral cards and I'd like to claim the offer on it. My name is ");
chk('[T1] The WhatsApp link for Eden\'s Edge on 07700 900123, character for character', R.whatsappUrl(R.normaliseNumber('07700 900123').value, EDGE) === EDENS_LINK, R.whatsappUrl('447700900123', EDGE), EDENS_LINK);
chk('The link decodes back to the message, trailing space and all', decodeURIComponent(EDENS_LINK.split('?text=')[1]) === R.whatsappMessage(EDGE));
chk('[T5] Smith & Son\'s: folder Builders-Smith & Son\'s, names Builders Smith & Sons …, and & is %26', R.folderName('Builders', SMITH) === "Builders-Smith & Son's" && R.qrName('Builders', SMITH, 'Scan to Claim') === 'Builders Smith & Sons Scan to Claim QR Code' && R.whatsappUrl('447700900123', SMITH).includes('Hey%20Smith%20%26%20Son%27s%2C%20') && !/[&'!()*]/.test(R.whatsappUrl('447700900123', "Smith & (Son's)!*").split('?text=')[1]));
chk('A curly apostrophe is dropped from a QR name too', R.qrName('Roofers', 'O’Neill Roofing', 'Review Funnel') === 'Roofers ONeill Roofing Review Funnel QR Code');
chk('The Cards tab\'s WhatsApp button follows the same rule: a mobile only', CB.whatsappLink('07700 900123') === 'https://wa.me/447700900123' && CB.whatsappLink('023 8000 0000') === '' && CB.whatsappLink('+44 7700 900123') === 'https://wa.me/447700900123');

const withFunnel = saved => R.build({ record: rec, saved: { review_funnel_url: 'https://edensedge.example/review-us/', ...saved } });
const okCheck = url => ({ url, ok: true, status: 200, final_url: url, at: '2026-11-14T10:00:00.000Z' });
const st = p => p.codes.map(c => `${c.key}:${c.state}`).join(' ');
let pr = R.prepare({ fields: withFunnel({}).fields });
chk('Before any check: the two links are unchecked, Scan to Claim is ready on the number alone', st(pr) === 'review:unchecked claim:ready services:unchecked' && pr.ready === false && pr.folder === "Landscapers-Eden's Edge" && pr.codes[1].destination === EDENS_LINK, pr.codes);
pr = R.prepare({ fields: withFunnel({}).fields, checks: { review: okCheck('https://edensedge.example/review-us/'), services: okCheck('https://edensedge.example') } });
chk('Both links answered 200: all three ready', st(pr) === 'review:ready claim:ready services:ready' && pr.ready === true && pr.codes.every(c => c.level === 'green'));
pr = R.prepare({ fields: withFunnel({ website_url: 'https://new.example' }).fields, checks: { review: okCheck('https://edensedge.example/review-us/'), services: okCheck('https://edensedge.example') } });
chk('A check counts only for the link it was made on: a changed link is unchecked again', st(pr) === 'review:ready claim:ready services:unchecked');
pr = R.prepare({ fields: withFunnel({}).fields, temporary: true, checks: { services: okCheck('https://edensedge.example') } });
chk('Temporary URL: ready, but amber', pr.codes[2].state === 'ready' && pr.codes[2].level === 'amber' && /Temporary URL/.test(pr.codes[2].message));
pr = R.prepare({ fields: R.build({ record: land, saved: { review_funnel_url: 'https://edensedge.example/review-us/' } }).fields, checks: { review: okCheck('https://edensedge.example/review-us/'), services: okCheck('https://edensedge.example') } });
chk('[T2] A landline: Scan to Claim is locked with the mobile message and has no link; the other two carry on', st(pr) === 'review:ready claim:locked services:ready' && pr.codes[1].message === 'Needs a UK mobile number with WhatsApp on it' && pr.codes[1].destination === '' && pr.ready === false);
pr = R.prepare({ fields: R.build({ record: rec, saved: { qr_niche_label: '' } }).fields });
chk('No niche: no folder, no names, every code locked', pr.folder === '' && pr.codes.every(c => c.state === 'locked' && c.qr_name === ''));
chk('A link\'s answer: 200 passes; 404, an error, and a funnel that forwards to Google do not', R.linkResult('review', { status: 200, finalUrl: 'https://x.example/r' }).ok && /404, not 200/.test(R.linkResult('services', { status: 404, finalUrl: 'https://x.example' }).message) && /could not be checked: no answer in 10 seconds/.test(R.linkResult('services', { status: null, error: 'no answer in 10 seconds' }).message) && /straight to Google/.test(R.linkResult('review', { status: 200, finalUrl: 'https://g.page/r/Cx/review' }).message) && R.linkResult('services', { status: 200, finalUrl: 'https://www.google.com/' }).ok);

// ── Stage 3: Make in QR.io ──
const readyPrep = R.prepare({ fields: withFunnel({}).fields, checks: { review: okCheck('https://edensedge.example/review-us/'), services: okCheck('https://edensedge.example') } });
let mk = R.make({ prepare: readyPrep, ticks: {} });
chk('The tick list: 3 steps once per client, then 6 per code in the order Review Funnel, Scan to Claim, View Our Services', mk.folder.steps.length === 3 && mk.codes.map(c => `${c.name}:${c.steps.length}`).join(' ') === 'Review Funnel:6 Scan to Claim:6 View Our Services:6' && mk.total === 21 && mk.done === 0 && !mk.complete && R.stepIds().length === 21);
chk('The step text is fixed, word for word', mk.folder.steps.map(s => s.text).join(' | ') === 'Open {link} (new tab). | Folders → **New Folder** → paste {folder} → **Save**. | Open the new folder.' && mk.codes[0].steps.map(s => s.text).join(' | ') === '**Create QR Code** → **Website URL**. | Paste {destination} → **Continue**. | Leave the design on default: no frame, no phrase, black → **Continue**. | Click the pencil next to "Untitled" → paste {qr_name}. | Three dots → **Move to folder** → {folder} → **Save**. | Download the QR as PNG or SVG and upload it below.' && mk.codes.every(c => c.steps.map(s => s.text).join() === mk.codes[0].steps.map(s => s.text).join()), mk.codes[0].steps.map(s => s.text));
chk('Each step carries the values it names, so nothing is retyped', mk.folder.steps[0].values.link === 'https://qr.io/dashboard/' && mk.folder.steps[1].values.folder === "Landscapers-Eden's Edge" && mk.codes[1].steps[1].values.destination === EDENS_LINK && mk.codes[1].steps[3].values.qr_name === 'Landscapers Edens Edge Scan to Claim QR Code' && mk.codes[2].steps[4].values.folder === "Landscapers-Eden's Edge" && mk.codes[0].steps[1].values.destination === 'https://edensedge.example/review-us/' && Object.keys(mk.codes[0].steps[0].values).length === 0);
chk('All three destinations passed: every list is open', mk.folder.unlocked && mk.codes.every(c => c.unlocked && c.message === ''));
mk = R.make({ prepare: R.prepare({ fields: withFunnel({}).fields }), ticks: {} });
chk('A code whose link is not checked yet is locked; Scan to Claim, on the number alone, is open', mk.codes.map(c => c.unlocked).join() === 'false,true,false' && /link has been checked/.test(mk.codes[0].message) && mk.folder.unlocked);
mk = R.make({ prepare: pr, ticks: {} });
chk('No niche: the folder steps and every code are locked', !mk.folder.unlocked && mk.codes.every(c => !c.unlocked) && /niche and the business name/.test(mk.folder.message));
mk = R.make({ prepare: readyPrep, ticks: Object.fromEntries(R.stepIds().map(id => [id, { at: '2026-11-14T10:00:00.000Z', by: 'Ray' }])) });
chk('Every step ticked: complete, each tick with who and when', mk.complete && mk.done === 21 && mk.codes[2].steps[5].by === 'Ray' && mk.codes[2].steps[5].at === '2026-11-14T10:00:00.000Z');

// ── Following a link (a fake fetch: nothing leaves this machine) ──
const fakeFetch = map => async (url, opts) => {
  const r = map[url];
  if (r === 'hang') return new Promise((_, reject) => { opts.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))); });
  if (!r) throw Object.assign(new Error('fetch failed'), { cause: { code: 'ENOTFOUND' } });
  return { status: r.status, headers: { get: k => (k.toLowerCase() === 'location' ? r.location || null : null) }, body: { cancel: async () => {} } };
};
const WEB = {
  'https://a.example/': { status: 200 },
  'https://b.example/old': { status: 301, location: '/new' },
  'https://b.example/new': { status: 302, location: 'https://a.example/' },
  'https://c.example/': { status: 404 },
  'https://loop.example/': { status: 302, location: 'https://loop.example/' },
  'https://slow.example/': 'hang',
};

// ── The service and the routes ──
(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  const add = async name => (await pool.query(`INSERT INTO clients (name, trade) VALUES ($1, 'x') RETURNING id`, [name])).rows[0].id;
  const edens = await add('ednes edge testing'), other = await add('Kestrel Ridge Roofing');
  const VALUES = { [edens]: { ...FULL }, [other]: { phone: '023 8000 0000' } };
  const fetched = [];
  let ANSWERS = {};
  const follow = async u => { fetched.push(u); return ANSWERS[u] || { status: 200, finalUrl: u, hops: [] }; };
  let clock = new Date('2026-11-14T10:00:00Z');
  const svc = S.createQrCodes({ pool, follow, now: () => clock, loadValues: async id => VALUES[id], nicheLabel: async id => { if (id === other) throw new Error('the niche is down'); return 'Landscapers/Gardeners'; }, log: { error: () => {} } });
  const app = express(); app.use(express.json());
  S.mount(app, svc, { log: { error: () => {} } });
  const server = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const url = id => `/api/clients/${id}/qr-codes`;
  const get = async id => (await call(base, 'GET', url(id))).json;
  const put = async (id, body) => call(base, 'PUT', url(id), body);
  const stored = async id => { const r = (await pool.query(`SELECT fields FROM client_qr_codes WHERE client_id = $1`, [id])).rows[0]; return r ? (typeof r.fields === 'string' ? JSON.parse(r.fields) : r.fields) : null; };
  const before = JSON.stringify(VALUES);

  try {
    // The follower
    let f = await L.follow('https://a.example/', { fetchImpl: fakeFetch(WEB) });
    chk('A link that answers 200', f.status === 200 && f.finalUrl === 'https://a.example/' && !f.error && f.hops.length === 1, f);
    f = await L.follow('https://b.example/old', { fetchImpl: fakeFetch(WEB) });
    chk('Redirects are followed hop by hop, a relative one too', f.status === 200 && f.finalUrl === 'https://a.example/' && f.hops.map(x => x.status).join() === '301,302,200', f);
    f = await L.follow('https://c.example/', { fetchImpl: fakeFetch(WEB) });
    chk('A 404 is reported as 404', f.status === 404 && !f.error);
    f = await L.follow('https://loop.example/', { fetchImpl: fakeFetch(WEB) });
    chk('More than 10 redirects stops', /more than 10 redirects/.test(f.error) && f.hops.length === 11, f);
    f = await L.follow('https://slow.example/', { fetchImpl: fakeFetch(WEB), timeoutMs: 40 });
    chk('No answer in time stops with the reason', /no answer in/.test(f.error) && f.status === null, f);
    f = await L.follow('https://nowhere.example/', { fetchImpl: fakeFetch(WEB) });
    chk('A host that does not exist is an error, not a crash', f.status === null && f.error === 'ENOTFOUND', f);
    const never = async () => { throw new Error('this must not be fetched'); };
    chk('This machine and private networks are never fetched', (await Promise.all(['http://localhost:3000/', 'http://127.0.0.1/', 'http://10.0.0.5/x', 'http://192.168.1.1/', 'http://169.254.169.254/latest', 'http://[::1]/', 'http://db.railway.internal/'].map(u => L.follow(u, { fetchImpl: never })))).every(r => /private address/.test(r.error)) && /not a web link/.test((await L.follow('ftp://a.example/', { fetchImpl: never })).error) && !L.isPrivateHost('edensedge.example') && !L.isPrivateHost('172.32.0.1'));

    let v = await get(edens);
    chk('The tab opens filled from the record, and nothing is stored yet', v.fields.qr_niche_label.value === 'Landscapers' && v.fields.qr_business_name.value === 'Eden\'s Edge' && v.fields.whatsapp_number.value === '447700900123' && v.fields.website_url.value === 'https://edensedge.example' && (await stored(edens)) === null, v.fields);

    let r = await put(edens, { set: { review_funnel_url: 'https://g.page/r/CedensEDGE/review' } });
    chk('[T3] The Google review link pasted as the funnel: refused, the field named, nothing saved', r.status === 400 && r.json.error === R.GOOGLE_REFUSED && r.json.field === 'review_funnel_url' && (await get(edens)).fields.review_funnel_url.value === '', r.json);
    r = await put(edens, { set: { qr_business_name: 'Should not save', review_funnel_url: 'http://edensedge.example/review-us/' } });
    chk('One refused value saves none of the others sent with it', r.status === 400 && (await get(edens)).fields.qr_business_name.value === 'Eden\'s Edge');
    v = (await put(edens, { set: { review_funnel_url: 'https://edensedge.example/review-us/' } })).json;
    chk('The funnel link is saved, and its problem goes', v.fields.review_funnel_url.value === 'https://edensedge.example/review-us/' && !v.fields.review_funnel_url.problem && R.KEYS.every(k => !v.fields[k].problem), v.fields);

    v = (await put(edens, { set: { qr_business_name: 'Smith & Son\'s', whatsapp_number: '+44 7999 000111' } })).json;
    chk('A value typed over the record\'s is kept as an override, with the record\'s value beside it', v.fields.qr_business_name.value === 'Smith & Son\'s' && v.fields.qr_business_name.overridden && v.fields.qr_business_name.record === 'Eden\'s Edge' && v.fields.whatsapp_number.value === '447999000111' && v.fields.whatsapp_number.overridden);
    VALUES[edens].company_name = 'Eden\'s Edge Landscaping Ltd';
    chk('An overridden line keeps its value when the record changes', (await get(edens)).fields.qr_business_name.value === 'Smith & Son\'s');
    v = (await put(edens, { reset: ['qr_business_name'] })).json;
    chk('"reset to record value" puts back the record\'s current value', v.fields.qr_business_name.value === 'Eden\'s Edge Landscaping Ltd' && !v.fields.qr_business_name.overridden);
    VALUES[edens].company_name = 'Eden\'s Edge';
    v = (await put(edens, { set: { whatsapp_number: '07700 900123' } })).json;
    chk('Typed back to what the record says: no override is kept', !v.fields.whatsapp_number.overridden && !('whatsapp_number' in (await stored(edens))));

    v = (await put(edens, { set: { whatsapp_number: '023 8000 0000' } })).json;
    chk('[T2] A landline typed on the tab: kept as typed, with the mobile message; the other fields carry on', v.fields.whatsapp_number.value === '023 8000 0000' && v.fields.whatsapp_number.problem === R.MOBILE_NEEDED && !v.fields.review_funnel_url.problem && !v.fields.website_url.problem);
    await put(edens, { reset: ['whatsapp_number'] });

    v = (await put(edens, { set: { website_temporary: true, website_url: 'https://temp.host.example/edens' } })).json;
    chk('Temporary URL ticked with a temporary link: amber, and kept', v.website_temporary === true && /Temporary URL/.test(v.fields.website_url.warn) && (await stored(edens)).website_temporary === true);
    v = (await put(edens, { set: { website_temporary: false } })).json;
    chk('Unticked: the flag goes', v.website_temporary === false && !v.fields.website_url.warn && !('website_temporary' in (await stored(edens))));
    chk('reset cannot remove the funnel link (it has no record value)', (await put(edens, { reset: ['review_funnel_url'] })).json.fields.review_funnel_url.value === 'https://edensedge.example/review-us/');

    // Stage 2 through the routes: the link checks
    const post = async (id, p, body) => call(base, 'POST', `${url(id)}/${p}`, body || {});
    await put(edens, { set: { website_temporary: false }, reset: ['website_url'] });
    v = await get(edens);
    chk('[T1] The tab gives the folder, the three names and the WhatsApp link', v.prepare.folder === "Landscapers-Eden's Edge" && v.prepare.codes.map(c => c.qr_name).join('|') === 'Landscapers Edens Edge Review Funnel QR Code|Landscapers Edens Edge Scan to Claim QR Code|Landscapers Edens Edge View Our Services QR Code' && v.prepare.codes[1].destination === EDENS_LINK && v.prepare.message.endsWith('My name is '), v.prepare);
    chk('Opening the tab fetches nothing', fetched.length === 0 && st(v.prepare) === 'review:unchecked claim:ready services:unchecked');
    ANSWERS = { 'https://edensedge.example': { status: 503, finalUrl: 'https://edensedge.example/', hops: [] } };
    v = (await post(edens, 'check')).json;
    chk('Check: both links are fetched; the funnel passes, the website that answers 503 fails with the reason', fetched.join(' ') === 'https://edensedge.example/review-us/ https://edensedge.example' && st(v.prepare) === 'review:ready claim:ready services:failed' && /503, not 200/.test(v.prepare.codes[2].message) && v.prepare.codes[0].check.at === '2026-11-14T10:00:00.000Z', v.prepare.codes);
    v = (await post(edens, 'check')).json;
    chk('A link that already has an answer is not fetched again by itself', fetched.length === 2 && st(v.prepare) === 'review:ready claim:ready services:failed');
    chk('A link that passed cannot be passed by hand, nor can Scan to Claim', (await post(edens, 'checked-by-hand', { key: 'review', by: 'Ray' })).status === 409 && (await post(edens, 'checked-by-hand', { key: 'claim', by: 'Ray' })).status === 400);
    clock = new Date('2026-11-14T11:00:00Z');
    v = (await post(edens, 'checked-by-hand', { key: 'services', by: 'Ray' })).json;
    chk('A failed link a person opened and saw working: passed by hand, with who and when', st(v.prepare) === 'review:ready claim:ready services:ready' && v.prepare.ready && v.prepare.codes[2].check.hand && v.prepare.codes[2].check.by === 'Ray' && v.prepare.codes[2].check.at === '2026-11-14T11:00:00.000Z' && v.prepare.codes[2].message === 'Checked by hand.', v.prepare.codes[2]);
    ANSWERS = {};
    v = (await post(edens, 'check', { keys: ['services'], all: true })).json;
    chk('Check again fetches that one link afresh, and the fresh answer replaces the pass by hand', fetched.length === 3 && fetched[2] === 'https://edensedge.example' && v.prepare.codes[2].state === 'ready' && !v.prepare.codes[2].check.hand);
    v = (await put(edens, { set: { website_url: 'https://temp.host.example/edens', website_temporary: true } })).json;
    chk('The website link changed: unchecked again, the funnel\'s check kept', st(v.prepare) === 'review:ready claim:ready services:unchecked');
    v = (await post(edens, 'check')).json;
    chk('Checked with Temporary URL ticked: ready and amber', fetched[3] === 'https://temp.host.example/edens' && v.prepare.codes[2].state === 'ready' && v.prepare.codes[2].level === 'amber');
    ANSWERS = { 'https://edensedge.example/review-us/': { status: 200, finalUrl: 'https://g.page/r/CedensEDGE/review', hops: [] } };
    v = (await post(edens, 'check', { keys: ['review'], all: true })).json;
    chk('A funnel link that forwards straight to Google fails, and cannot be passed by hand', v.prepare.codes[0].state === 'failed' && /straight to Google/.test(v.prepare.codes[0].message) && (await post(edens, 'checked-by-hand', { key: 'review', by: 'Ray' })).status === 409);
    ANSWERS = {};
    await post(edens, 'check', { keys: ['review'], all: true });
    await put(edens, { set: { website_temporary: false }, reset: ['website_url'] });
    v = (await put(edens, { set: { whatsapp_number: '023 8000 0000' } })).json;
    chk('[T2] A landline through the routes: Scan to Claim locked, no link; the funnel carries on', v.prepare.codes[1].state === 'locked' && v.prepare.codes[1].destination === '' && v.prepare.codes[0].state === 'ready');
    chk('[T2] The landline locks Scan to Claim\'s steps with the mobile message: a step cannot be ticked', !v.make.codes[1].unlocked && /Needs a UK mobile number/.test(v.make.codes[1].message) && await (async () => { const r = await post(edens, 'tick', { id: 'claim.create', ticked: true, by: 'Ray' }); return r.status === 409 && /Needs a UK mobile number/.test(r.json.error); })());
    await put(edens, { reset: ['whatsapp_number'] });

    // Stage 3 through the routes: the ticks
    clock = new Date('2026-11-14T12:00:00Z');
    v = (await post(edens, 'tick', { id: 'folder.folder', ticked: true, by: 'Ray' })).json;
    chk('A step ticked keeps who ticked it and when', v.make.folder.steps[1].ticked && v.make.folder.steps[1].by === 'Ray' && v.make.folder.steps[1].at === '2026-11-14T12:00:00.000Z' && v.make.done === 1 && v.make.folder.done === 1);
    clock = new Date('2026-11-14T12:05:00Z');
    v = (await post(edens, 'tick', { id: 'review.destination', ticked: true, by: 'Given' })).json;
    chk('Ticks are kept per step, each with its own person and time', v.make.codes[0].steps[1].by === 'Given' && v.make.folder.steps[1].by === 'Ray' && v.make.done === 2);
    chk('The ticks are saved for the client and survive a reload', (await get(edens)).make.done === 2 && (await get(other)).make.done === 0);
    v = (await post(edens, 'tick', { id: 'folder.folder', ticked: false })).json;
    chk('A tick can be taken off', !v.make.folder.steps[1].ticked && v.make.done === 1);
    chk('A step that does not exist is refused', (await post(edens, 'tick', { id: 'review.nothing', ticked: true })).status === 400 && (await post(edens, 'tick', { id: '', ticked: true })).status === 400);
    v = (await put(edens, { set: { website_url: 'https://changed.example' } })).json;
    chk('A link changed after its steps were open: the code locks again until the new link is checked, and its ticks are kept', !v.make.codes[2].unlocked && (await post(edens, 'tick', { id: 'services.create', ticked: true, by: 'Ray' })).status === 409 && v.make.codes[0].steps[1].ticked);
    await put(edens, { reset: ['website_url'] });
    const n = fetched.length;
    v = (await post(other, 'check')).json;
    chk('A client with nothing to check: nothing is fetched', fetched.length === n && v.prepare.codes.every(c => c.state === 'locked'));

    chk('A key that is not a field is refused', (await put(edens, { set: { company_name: 'X' } })).status === 400);
    chk('Nothing the tab did touched Client Values', JSON.stringify(VALUES) === before);

    v = await get(other);
    chk('A niche that cannot be read leaves the niche blank, and the tab still opens', v.fields.qr_niche_label.value === '' && !!v.fields.qr_niche_label.problem && v.fields.qr_business_name.value === 'Kestrel Ridge Roofing' && v.fields.whatsapp_number.problem === R.MOBILE_NEEDED);
    chk('A client that does not exist is a 404', (await call(base, 'GET', url(crypto.randomUUID()))).status === 404);
  } catch (err) {
    chk('The fixture ran to the end', false, err.stack);
  } finally {
    server.close();
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
