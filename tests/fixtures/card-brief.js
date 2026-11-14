'use strict';
// Fixture: the Review & Referral Cards tab (card-brief/, 13 Nov 2026, Brandon). The trade mapping,
// the mobile and WhatsApp rules, what the record fills and where each value came from, an override
// kept on the tab and never written to the record, the readiness bar (red, amber, green), the brief
// text line for line, last copied, the sign-off ticks, the template gallery and a missing image.
// Brandon's acceptance tests 1 to 9, 11 and 12 are marked [T1] … [T12].
// Postgres in memory, a real express app on a local port. Nothing is sent anywhere.
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const R = require(path.join(root, 'card-brief/rules.js'));
const S = require(path.join(root, 'card-brief/service.js'));
const RT = require(path.join(root, 'card-brief/routes.js'));
const IMP = require(path.join(root, 'scripts/import-card-templates.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got = '', want = '') => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + (typeof got === 'string' ? got : JSON.stringify(got)) + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: the Review & Referral Cards tab (the brief, the overrides, the readiness, the gallery) ===\n');

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
const trade = c => { const t = R.tradeOf(c); return t.trade === 'other' ? `other: ${t.other}` : t.trade; };
chk('[T5] "Roofing contractor" is roofer; "Pressure washing service" is other with the category text', trade('Roofing contractor') === 'roofer' && trade('Pressure washing service') === 'other: Pressure washing service', [trade('Roofing contractor'), trade('Pressure washing service')]);
chk('Every line of the trade table, whatever the capitals', [['ELECTRICIAN', 'electrician'], ['Plumber', 'plumber'], ['Landscape gardener', 'landscaper'], ['Gardener', 'landscaper'], ['House cleaning service', 'cleaner'], ['Home builder', 'builder'], ['Construction company', 'builder'], ['General contractor', 'builder'], ['Painter', 'decorator'], ['Painter and decorator', 'decorator'], ['Locksmith', 'locksmith'], ['Heating contractor', 'heating'], ['Boiler supplier', 'heating'], ['Gas engineer', 'heating'], ['Carpenter', 'carpenter'], ['Joiner', 'carpenter'], ['Cabinet maker', 'carpenter']].every(([c, t]) => trade(c) === t));
chk('First match wins, and a joiner is carpenter (the skill\'s word)', trade('Plumbing and heating') === 'plumber' && trade('Roofing and building contractor') === 'roofer' && trade('Joinery') === 'carpenter');
chk('No category: no trade', R.tradeOf('').trade === '' && R.tradeOf(null).trade === '');

chk('A mobile is written 07xxx xxxxxx, from any spacing, +44 or 0044', R.formatMobile('07700900123').value === '07700 900123' && R.formatMobile('+44 7700 900123').value === '07700 900123' && R.formatMobile('0044 (0)7700 900 123').value === '07700 900123' && R.formatMobile('07700 900123').mobile);
chk('A landline is kept as typed and is not a mobile', R.formatMobile('023 8000 0000').value === '023 8000 0000' && !R.formatMobile('023 8000 0000').mobile && R.formatMobile('').value === '');
chk('[T6] The WhatsApp link from 07700 900123', R.whatsappLink('07700 900123') === 'https://wa.me/447700900123', R.whatsappLink('07700 900123'));
chk('No number, or not a number: no WhatsApp link', R.whatsappLink('') === '' && R.whatsappLink('ask Ethan') === '');
chk('A review link is one of Google\'s two shapes', R.looksLikeReviewLink('https://g.page/r/CabcDEF/review') && R.looksLikeReviewLink('https://search.google.com/local/writereview?placeid=ChIJx') && !R.looksLikeReviewLink('https://edensedge.example/reviews') && !R.looksLikeReviewLink('https://www.google.com/maps/place/x'));
chk('Dates are DD MMM YYYY; the day is the UK\'s', R.dayOf('2026-11-13') === '13 Nov 2026' && R.dayOf('') === '' && R.ukToday(new Date('2026-06-30T23:30:00Z')) === '2026-07-01');
chk('The file name is the business name as a slug', R.slugOf('Eden\'s Edge Landscaping & Co') === 'edens-edge-landscaping-and-co');

// ── What the record gives ──
const FULL = { company_name: 'Edens Edge Landscaping', company_name_gbp_checked: 'yes', primary_category: 'Landscaper', owner_name: 'Ethan Hall', phone: '07580412717', email: 'ethan@edensedge.example', review_url: 'https://g.page/r/CedensEDGE/review', live_domain: 'edensedge.example/', gbp_place_id: 'ChIJ_edens_edge_own' };
// What the QR codes subtab hands over (qr-codes/rules.js handoff): the funnel link typed there; nothing else until all three codes are checked
const QRH = { funnel: 'https://edensedge.example/review-us/', ready: false, dot: 'wait', claim_link: '', services_link: '', files: [] };
const QR_READY = { funnel: 'https://edensedge.example/review-us/', ready: true, dot: 'ok', claim_link: 'https://wa.me/447580412717?text=Hey%20Edens%20Edge%2C%20', services_link: 'https://edensedge.example',
  files: [{ key: 'review', use: 'Review card QR', name: 'Landscapers Edens Edge Review Funnel QR Code.png' }, { key: 'claim', use: 'Referral QR 1 (Scan to claim)', name: 'Landscapers Edens Edge Scan to Claim QR Code.svg' }, { key: 'services', use: 'Referral QR 2 (View our services)', name: 'Landscapers Edens Edge View Our Services QR Code.png' }] };
const rec = R.recordValues({ cv: FULL, clientName: 'ednes edge testing', baseTown: 'Southampton', pageRows: [], qr: QRH });
chk('The record fills: name, trade, town, first name only, the mobile formatted, the review link, the site', rec.business_name.value === 'Edens Edge Landscaping' && rec.trade.value === 'landscaper' && rec.area.value === 'Southampton' && rec.contact_first_name.value === 'Ethan' && rec.mobile.value === '07580 412717' && rec.review_link.value === 'https://edensedge.example/review-us/' && rec.services_link.value === 'https://edensedge.example', rec);
chk('Each value says where it came from', rec.business_name.source === 'from Record → Company name' && rec.mobile.source === 'from Record → Phone' && rec.contact_first_name.source === 'from Record → Owner name' && rec.trade.source === 'from Record → Primary category' && rec.review_link.source === 'from the QR codes tab → Review Us funnel link' && rec.services_link.source === 'from Record → Live domain' && /Base town/.test(rec.area.source));
chk('A company name checked against GBP carries no note; one not checked says to check it', rec.business_name.note === '' && /Check this matches GBP exactly/.test(R.recordValues({ cv: { company_name: 'X Ltd' } }).business_name.note));
const fallback = R.recordValues({ cv: {}, clientName: 'Kestrel Ridge Roofing' });
chk('No company name: the client\'s name, with "check this matches GBP exactly"', fallback.business_name.value === 'Kestrel Ridge Roofing' && /Check this matches GBP exactly/.test(fallback.business_name.note));
chk('The review card\'s link is the funnel from the QR codes tab, never the record\'s Google review link: no funnel typed, nothing filled', R.recordValues({ cv: FULL }).review_link.value === '' && R.recordValues({ cv: { gbp_place_id: 'ChIJ_x' }, qr: { funnel: '' } }).review_link.value === '' && R.recordValues({ cv: FULL }).review_link.source === '');
const hub = R.recordValues({ cv: FULL, pageRows: [{ slug: 'services', applies: true }, { slug: 'patios' }] });
chk('The page map has a services page: the link goes to it; a row that does not apply does not count', hub.services_link.value === 'https://edensedge.example/services/' && /page map/.test(hub.services_link.source) && R.recordValues({ cv: FULL, pageRows: [{ slug: 'services', applies: false }] }).services_link.value === 'https://edensedge.example');
chk('No email, login or ID from the record is among the values', !JSON.stringify(rec).includes('ethan@') && !JSON.stringify(rec).includes('ChIJ'));

// ── The brief, line for line ──
const NOW = new Date('2026-11-13T10:00:00Z');
const chosen = { claim_link: 'https://wa.me/447580412717', short_name: 'Edens Edge', sole_or_team: 'Sole trader (he)', logo_supplied: 'yes', logo_type: 'PNG transparent', logo_on_dark: 'no', colour_main: '#2f6b3a', colour_dark: '#12261a', colour_avoid: 'red', template: '3c', feel: ['premium', 'friendly'], job_photo: 'yes', example_job: 'laid our new patio', pun: 'evergreen.', must_say: 'Fully insured (small, footer)', qty_review: '250', qty_referral: '500', deadline: '2026-12-01', test_client: true };
const full = R.build({ record: rec, saved: chosen, now: NOW, qr: QRH });
const WANT = `/customer-revref-cards

# Customer Review & Referral Cards — Client Brief
Generated by CopyBot on 13 Nov 2026 for Edens Edge Landscaping.
> ⚠️ **TEST CLIENT — fictional business for template testing. Not for print.**

## 1. Business
- Business name (exactly as on Google Business Profile): Edens Edge Landscaping
- Short name for the wordmark (if different): Edens Edge
- Trade: landscaper
- Sole trader or team? Sole trader (he)
- Area / town: Southampton

## 2. Contact (referral card back)
- First name to call/text: Ethan
- Mobile number: 07580 412717

## 3. Links & QR codes
- Review Us funnel link (review card QR): https://edensedge.example/review-us/
- "Scan to claim" link (referral QR 1): https://wa.me/447580412717
- "View our services" link (referral QR 2): https://edensedge.example
- QR files supplied? no — generate black-on-white SVG from the links and test-scan

## 4. Brand
- Logo supplied? yes — PNG transparent · works on dark? no
- Brand colours (hex): main/accent #2F6B3A · dark #12261A · avoid red

## 5. Style
- Template: 3c Deep Colour
- Feel: premium · friendly
- Job photo supplied? yes

## 6. Copy tweaks
- Review example job: laid our new patio
- Review trade pun ("keep our standards ___."): evergreen.
- Must say: Fully insured (small, footer)
- Must not say: Any discount or reward for leaving a review (against Google policy)

## 7. Print
- Quantities: review 250 · referral 500
- Printer / CMYK needed? Solopress — CMYK PDF, 3 mm bleed, crop marks on
- Paper & finish: review 400gsm silk, matt lamination both sides · referral 400gsm uncoated (no lamination, so biro writes on the offer box)
- Deadline: 01 Dec 2026

## Missing details
- None
`;
chk('[T1] Everything filled: the brief matches the format line for line, /customer-revref-cards on line 1', full.brief === WANT, full.brief, WANT);
chk('[T1] Everything filled: green, "Ready. Everything filled."', full.readiness.level === 'green' && full.readiness.text === 'Ready. Everything filled.' && full.readiness.missing.length === 0);
chk('[T7] Test client ticked: the warning line sits straight under the generated line; not ticked: no such line', full.brief.split('\n')[4].startsWith('> ⚠️ **TEST CLIENT') && !R.build({ record: rec, saved: { ...chosen, test_client: false }, now: NOW }).brief.includes('TEST CLIENT'));
chk('[T8] A logo or a job photo supplied: the attach reminder is on; neither: off', full.attach && R.build({ record: rec, saved: { job_photo: 'yes' } }).attach && !R.build({ record: rec, saved: {} }).attach);

// The QR codes hand-off (14 Nov 2026): all three codes checked
const handed = R.build({ record: R.recordValues({ cv: FULL, clientName: 'ednes edge testing', baseTown: 'Southampton', qr: QR_READY }), saved: { ...chosen, claim_link: 'https://typed.example/old', services_link: 'https://typed.example/services', review_link: 'https://typed.example/review' }, now: NOW, qr: QR_READY });
chk('All three QR codes checked: the three links are the checked codes\' destinations, whatever was typed on this tab', handed.fields.review_link.value === QR_READY.funnel && handed.fields.claim_link.value === QR_READY.claim_link && handed.fields.services_link.value === QR_READY.services_link && R.QR_LINES.every(k => handed.fields[k].locked && !handed.fields[k].overridden && /QR codes tab/.test(handed.fields[k].source)), handed.fields);
chk('The brief says the QR files are supplied, names the three, and tells the skill never to generate a QR from a link', handed.brief.includes('- QR files supplied? yes — 3 files attached. Place these files exactly as they are. Never generate a QR from a link: a generated code is static, bypasses QR.io, cannot be redirected later and its scans are not tracked\n  - Review card QR: Landscapers Edens Edge Review Funnel QR Code.png\n  - Referral QR 1 (Scan to claim): Landscapers Edens Edge Scan to Claim QR Code.svg\n  - Referral QR 2 (View our services): Landscapers Edens Edge View Our Services QR Code.png\n\n## 4. Brand') && !handed.brief.includes('generate black-on-white') && handed.brief.includes(`- "Scan to claim" link (referral QR 1): ${QR_READY.claim_link}\n`), handed.brief);
chk('The placeholder bar clears: green, nothing missing, and the three files are listed for the tab', handed.readiness.level === 'green' && handed.readiness.missing.length === 0 && handed.qr.ready && handed.qr.files.length === 3 && handed.qr.dot === 'ok');
chk('Not all checked yet: the brief still says no QR files, the links stay as they were, and nothing is locked', full.brief.includes('- QR files supplied? no — generate black-on-white SVG from the links and test-scan\n') && !full.qr.ready && full.qr.files.length === 0 && !full.fields.claim_link.locked && full.fields.claim_link.value === 'https://wa.me/447580412717');
chk('No QR hand-off at all: the review card link is a placeholder, amber', (() => { const b = R.build({ record: R.recordValues({ cv: FULL, baseTown: 'Southampton' }), saved: chosen, now: NOW }); return b.readiness.level === 'amber' && b.readiness.text === 'Ready, with 1 placeholder: Review Us funnel link' && b.qr.dot === 'none'; })());

const bare = R.build({ record: rec, saved: {}, now: NOW });
chk('The defaults: Team, designer\'s choice, a text wordmark, the printer and paper lines, the must not say line', bare.brief.includes('- Sole trader or team? Team\n') && bare.brief.includes('- Template: designer\'s choice\n') && bare.brief.includes('- Logo supplied? no — use a text wordmark\n') && bare.brief.includes('- Printer / CMYK needed? Solopress — CMYK PDF, 3 mm bleed, crop marks on\n') && bare.brief.includes('- Must not say: Any discount or reward for leaving a review (against Google policy)\n'));
chk('An empty value is left blank: no N/A, and no space left on the end of a line', bare.brief.includes('- Short name for the wordmark (if different):\n') && bare.brief.includes('- Feel:\n') && bare.brief.includes('- Deadline:\n') && bare.brief.includes('- Quantities: review  · referral\n') && !/N\/A/.test(bare.brief) && !/[ \t]\n/.test(bare.brief), bare.brief);
chk('Amber: one placeholder, named, and it is in Missing details', bare.readiness.level === 'amber' && bare.readiness.text === 'Ready, with 1 placeholder: Scan-to-claim link' && bare.brief.endsWith('## Missing details\n- Scan-to-claim link — use TEST placeholder and flag\n'), bare.readiness);
const thin = R.build({ record: R.recordValues({ cv: { company_name: 'Thin Ltd' } }), saved: {}, now: NOW });
chk('All five amber items, in the brief\'s order', thin.readiness.text === 'Ready, with 5 placeholders: Contact first name, Mobile number, Review Us funnel link, Scan-to-claim link, View our services link' && thin.readiness.missing.map(m => m.key).join() === 'contact_first_name,mobile,review_link,claim_link,services_link');
chk('An unmapped category goes in as "other: [category]"', R.build({ record: R.recordValues({ cv: { company_name: 'X', primary_category: 'Pressure washing service' } }) }).brief.includes('- Trade: other: Pressure washing service\n'));
chk('A colour that is not #RRGGBB warns and is left out of the brief', (() => { const b = R.build({ record: rec, saved: { colour_main: 'green', colour_dark: '#12261a' } }); return /Not a hex colour/.test(b.fields.colour_main.warn) && b.brief.includes('- Brand colours (hex): main/accent  · dark #12261A · avoid\n'); })());
chk('Warnings never block: a landline, a Google link as the review card link, 3d with no job photo', (() => { const b = R.build({ record: rec, saved: { mobile: '023 8000 0000', review_link: 'https://g.page/r/CedensEDGE/review', claim_link: 'https://x.example', template: '3d' } }); return b.readiness.level === 'green' && /not a UK mobile/.test(b.fields.mobile.warn) && /This is a Google link/.test(b.fields.review_link.warn) && !R.build({ record: rec, saved: { claim_link: 'https://x.example' } }).fields.review_link.warn && /Needed for 3d Job Photo/.test(b.fields.job_photo.warn); })());
chk('Nothing but the format\'s lines is in the brief: no email, no place ID', !full.brief.includes('ethan@') && !full.brief.includes('ChIJ'));

chk('A saved field is tidied; one that is not a field, or not a value it can hold, is refused', R.clean('mobile', '+447700900123') === '07700 900123' && R.clean('template', '3z') === undefined && R.clean('template', '') === '' && R.clean('sole_or_team', 'Family') === undefined && R.clean('nope', 'x') === undefined && R.clean('qty_review', '1,000') === '1000' && R.clean('qty_review', 'lots') === undefined && R.clean('deadline', '1 Dec') === undefined);
chk('Feel is two at most, from the list only', JSON.stringify(R.clean('feel', ['bold', 'loud', 'clean', 'modern'])) === '["bold","clean"]' && R.clean('feel', 'bold') === undefined);

// ── The import script's own rules ──
chk('The import reads the template off the printed ID, else off the demo business', IMP.templateOf('3c Deep Colour Sample: landscaper').stem === '3c-deep' && IMP.templateOf('Thank you for choosing Oak & Iron Joinery').stem === '3e-craft' && IMP.templateOf('3a Referral · Midnight').id === '3a' && IMP.templateOf('Some other page') === null);
chk('A card found in the wrong place takes the place the other pages share', (() => { const b = (x0, y0) => [{ x0, x1: x0 + 500, y0, y1: y0 + 700 }, { x0: x0 + 600, x1: x0 + 1100, y0, y1: y0 + 700 }]; const out = IMP.settle([{ boxes: b(100, 200) }, { boxes: [{ x0: 100, x1: 600, y0: 200, y1: 500 }, b(100, 200)[1]] }, { boxes: b(101, 200) }, { boxes: [] }], 3300); return out[1].boxes[0].y1 === 900 && out[1].settled && out[3].boxes.length === 2 && !out[0].settled; })());

// ── Storage and the routes ──
(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  const newClient = async name => (await pool.query(`INSERT INTO clients (name, trade) VALUES ($1, 'Landscaper') RETURNING id`, [name])).rows[0].id;
  const edens = await newClient('ednes edge testing'), blank = await newClient(' ');

  const VALUES = { [edens]: { ...FULL }, [blank]: {} };
  const before = JSON.stringify(VALUES);
  let clock = new Date('2026-11-13T10:00:00Z');
  // The gallery's images, in a folder this test owns: one is deleted further down
  const imageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'card-templates-'));
  for (const t of R.TEMPLATES) for (const [kind, side] of R.IMAGE_SLOTS) { fs.mkdirSync(path.join(imageRoot, kind), { recursive: true }); fs.writeFileSync(path.join(imageRoot, kind, `${t.stem}-${side}.webp`), 'x'); }

  let QR_NOW = QRH;
  const svc = S.createCardBrief({ pool, qrHandoff: async id => { if (id !== edens) throw new Error('the QR codes are down'); return QR_NOW; }, loadValues: async id => VALUES[id], baseTown: async id => (id === edens ? 'Southampton' : ''), pageRows: async () => { throw new Error('the page map is down'); }, imageRoot, now: () => clock, log: { error: () => {} } });
  const app = express();
  app.use(express.json());
  RT.mount(app, svc, { log: { error: () => {} } });
  const server = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const url = id => `/api/clients/${id}/card-brief`;
  const get = async id => (await call(base, 'GET', url(id))).json;
  const put = async (id, body) => call(base, 'PUT', url(id), body);

  try {
    let v = await get(edens);
    chk('[T1] The tab opens with the record\'s values and their source tags (a page map that cannot be read does not stop it)', v.fields.mobile.value === '07580 412717' && v.fields.mobile.source === 'from Record → Phone' && !v.fields.mobile.overridden && v.fields.area.value === 'Southampton' && v.fields.services_link.value === 'https://edensedge.example', v.fields);
    chk('The file name is [slug]-card-brief.md', v.filename === 'edens-edge-landscaping-card-brief.md', v.filename);
    chk('The first PUT makes the table and saves the tab\'s own fields', (await put(edens, { set: { claim_link: 'https://wa.me/447580412717', template: '3a' } })).status === 200);
    v = await get(edens);
    chk('[T1] Green once the claim link is in', v.readiness.level === 'green' && v.brief.startsWith('/customer-revref-cards\n') && v.brief.includes('- Template: 3a Midnight\n'), v.readiness);

    // [T2] the phone cleared on the record
    VALUES[edens].phone = '';
    v = await get(edens);
    chk('[T2] The phone cleared on the record: amber, listing Mobile number, and the brief\'s Missing details lists it', v.readiness.level === 'amber' && v.readiness.text === 'Ready, with 1 placeholder: Mobile number' && v.brief.includes('- Mobile number:\n') && v.brief.endsWith('- Mobile number — use TEST placeholder and flag\n'), v.readiness);
    chk('[T2] Copy still works on amber', (await call(base, 'POST', `${url(edens)}/copied`, { by: 'Ray' })).status === 200);
    VALUES[edens].phone = '07580412717';

    // [T4] an override
    const snap = JSON.stringify(VALUES);
    v = (await put(edens, { set: { mobile: '07700 900123' } })).json;
    chk('[T4] The mobile overridden on the tab: the brief carries it, the field is marked and still shows the record\'s value', v.fields.mobile.value === '07700 900123' && v.fields.mobile.overridden && v.fields.mobile.record === '07580 412717' && v.brief.includes('- Mobile number: 07700 900123\n'), v.fields.mobile);
    chk('[T4] The Record → Phone value is unchanged', JSON.stringify(VALUES) === snap && VALUES[edens].phone === '07580412717');
    chk('[T6] The WhatsApp link the button fills, from the mobile on the tab', v.whatsapp === 'https://wa.me/447700900123', v.whatsapp);
    VALUES[edens].phone = '07999 000111';
    chk('An overridden line keeps its value when the record changes', (await get(edens)).fields.mobile.value === '07700 900123');
    v = (await put(edens, { reset: ['mobile'] })).json;
    chk('[T4] "reset to record value" puts back the record\'s current value', v.fields.mobile.value === '07999 000111' && !v.fields.mobile.overridden, v.fields.mobile);
    VALUES[edens].phone = '07580412717';
    v = (await put(edens, { set: { contact_first_name: '' } })).json;
    chk('A line cleared on the tab is an override too: blank, amber, and reset brings the record\'s value back', v.fields.contact_first_name.value === '' && v.fields.contact_first_name.overridden && v.readiness.missing.some(m => m.key === 'contact_first_name') && (await put(edens, { reset: ['contact_first_name'] })).json.fields.contact_first_name.value === 'Ethan');
    v = (await put(edens, { set: { area: 'Southampton' } })).json;
    chk('Typed back to what the record says: no override is kept', !v.fields.area.overridden && !('area' in (f => (typeof f === 'string' ? JSON.parse(f) : f))((await pool.query(`SELECT fields FROM client_card_briefs WHERE client_id = $1`, [edens])).rows[0].fields)));
    chk('Nothing the tab did touched Client Values', JSON.stringify(VALUES) === before);

    // [T3] no name at all
    v = await get(blank);
    chk('[T3] No company name and no client name: red, "Can\'t copy yet. Business name missing."', v.readiness.level === 'red' && v.readiness.text === 'Can\'t copy yet. Business name missing.', v.readiness);
    chk('[T3] Copy is refused while red', (await call(base, 'POST', `${url(blank)}/copied`, { by: 'Ray' })).status === 409 && (await get(blank)).last_copied === null);
    v = (await put(edens, { set: { business_name: '' } })).json;
    chk('[T3] The name cleared on the tab is red too; reset brings the record\'s name back', v.readiness.level === 'red' && (await put(edens, { reset: ['business_name'] })).json.readiness.level === 'green');

    // [T7] [T8] [T11] through the routes
    v = (await put(edens, { set: { test_client: true, logo_supplied: 'yes', template: '3c' } })).json;
    chk('[T7] Test client ticked: the warning line is in the preview under the generated line', v.brief.split('\n')[3].startsWith('Generated by CopyBot on 13 Nov 2026 for Edens Edge Landscaping.') && v.brief.split('\n')[4] === '> ⚠️ **TEST CLIENT — fictional business for template testing. Not for print.**', v.brief.split('\n').slice(3, 5));
    chk('[T8] Logo supplied = Yes: the attach reminder is on', v.attach === true && v.brief.includes('- Logo supplied? yes — SVG · works on dark? yes\n'));
    chk('[T11] Use this template on 3c: the preview shows "Template: 3c Deep Colour"', v.fields.template.value === '3c' && v.brief.includes('- Template: 3c Deep Colour\n'));
    chk('A value a field cannot hold is refused with the reason, and nothing is saved', await (async () => { const r = await put(edens, { set: { template: '9z', short_name: 'Should not save' } }); return r.status === 400 && /"template" cannot be saved/.test(r.json.error) && (await get(edens)).fields.short_name.value === ''; })());

    // The QR codes hand-off through the service
    QR_NOW = QR_READY;
    v = await get(edens);
    chk('All three QR codes checked: the tab shows the checked links, locked, and the brief lists the files', v.fields.claim_link.value === QR_READY.claim_link && v.fields.claim_link.locked && v.qr.ready && v.qr.files.length === 3 && v.brief.includes('- QR files supplied? yes — 3 files attached.'), v.fields.claim_link);
    chk('A link typed over a locked line changes nothing in the brief', (await put(edens, { set: { claim_link: 'https://typed.example/x' } })).json.fields.claim_link.value === QR_READY.claim_link);
    QR_NOW = QRH;
    chk('A code no longer checked: the hand-off is withdrawn and the typed link is back', await (async () => { const x = await get(edens); return !x.qr.ready && x.fields.claim_link.value === 'https://typed.example/x' && x.brief.includes('- QR files supplied? no'); })());
    await put(edens, { set: { claim_link: 'https://wa.me/447580412717' } });
    chk('The QR codes cannot be read: the tab still opens, with the review card link a placeholder', await (async () => { const x = await get(blank); return x.qr.ready === false && x.fields.review_link.value === ''; })());

    // Last copied
    clock = new Date('2026-11-13T15:30:00Z');
    v = (await call(base, 'POST', `${url(edens)}/copied`, { by: 'Given' })).json;
    chk('Last copied keeps the time and who', v.last_copied.at === '2026-11-13T15:30:00.000Z' && v.last_copied.by === 'Given', v.last_copied);

    // [T9] the sign-off
    clock = new Date('2026-11-14T09:00:00Z');
    v = (await call(base, 'POST', `${url(edens)}/signoff`, { key: 'proofs_sent', ticked: true, by: 'Ray' })).json;
    chk('The four sign-off boxes, in order', v.signoff.map(s => s.label).join(' | ') === 'Proofs sent to client | Client approved name, number, colours and QR links | Both PDFs exported (guides off) | Sent to printer');
    const reloaded = S.createCardBrief({ pool, loadValues: async id => VALUES[id], imageRoot, now: () => new Date('2026-11-20T09:00:00Z') });
    const again = (await reloaded.view(edens)).signoff.find(s => s.key === 'proofs_sent');
    chk('[T9] A ticked box keeps who and when, and they survive a reload', again.ticked && again.by === 'Ray' && again.at === '2026-11-14T09:00:00.000Z' && (await reloaded.view(edens)).signoff.filter(s => s.ticked).length === 1 && (await reloaded.view(edens)).last_copied.by === 'Given', again);
    chk('Unticking clears it; a box that is not one is refused', !(await call(base, 'POST', `${url(edens)}/signoff`, { key: 'proofs_sent', ticked: false, by: 'Ray' })).json.signoff[0].ticked && (await call(base, 'POST', `${url(edens)}/signoff`, { key: 'paid', ticked: true })).status === 400);

    // The gallery
    v = await get(edens);
    chk('[T10] The gallery: five templates in order 3a to 3e, four images each, review front and back then referral front and back', v.templates.map(t => t.id).join() === '3a,3b,3c,3d,3e' && v.templates.every(t => t.images.map(i => i.label).join() === 'Review front,Review back,Referral front,Referral back' && t.images.every(i => i.url)) && v.templates[0].images[2].url === '/card-templates/referral/3a-midnight-front.webp', v.templates[0]);
    fs.unlinkSync(path.join(imageRoot, 'referral', '3d-photo-back.webp'));
    v = await get(edens);
    chk('[T12] One image file deleted: its slot is empty ("Example not added yet"), the other 19 are still there, nothing breaks', v.templates[3].images[3].url === null && v.templates.flatMap(t => t.images).filter(i => i.url).length === 19);
    chk('The 20 real images are in the repo, where the app serves them', S.templates().flatMap(t => t.images).every(i => i.url && fs.existsSync(path.join(root, 'public', i.url))), S.templates().flatMap(t => t.images).filter(i => !i.url).map(i => `${i.kind} ${i.side}`));

    chk('A client that does not exist is a 404', (await call(base, 'GET', url(crypto.randomUUID()))).status === 404);
  } catch (err) {
    chk('The fixture ran to the end', false, err.stack);
  } finally {
    server.close();
    fs.rmSync(imageRoot, { recursive: true, force: true });
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
