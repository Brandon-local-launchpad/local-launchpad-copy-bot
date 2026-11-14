'use strict';
// Fixture: the QR codes subtab (qr-codes/, 14 Nov 2026, Brandon). Stage 1, the fields: the niche
// word, the WhatsApp number rule, a Google link refused as the review funnel, what the record
// fills and where from, an override kept on the tab and never written to the record, the
// Temporary URL tick. Brandon's tests 2 (the landline) and 3 (the Google link) are marked.
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

let pass = 0, fail = 0;
const chk = (label, ok, got = '', want = '') => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + (typeof got === 'string' ? got : JSON.stringify(got)) + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: the QR codes subtab (stage 1: the fields) ===\n');

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
  const svc = S.createQrCodes({ pool, loadValues: async id => VALUES[id], nicheLabel: async id => { if (id === other) throw new Error('the niche is down'); return 'Landscapers/Gardeners'; }, log: { error: () => {} } });
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
