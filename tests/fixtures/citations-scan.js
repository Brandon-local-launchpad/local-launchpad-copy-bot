'use strict';
// Fixture: the NAP comparison (citations/nap.js), the listing reader (citations/listing.js)
// and the scan (citations/scan.js) on pg-mem with a fake DataForSEO and fake pages. The
// comparison cases (+44 against 0, Ltd, St against Street, the postcode with and without its
// space, www), the reader (JSON-LD, the title and headings, phones, postcodes, the locality,
// the website candidates), and one Edens Edge scan: a listing found through a backlink, one
// through the name search, one through the phone search, one not found, a low confidence
// page kept under needs review without a URL, a wrong location, a login wall, a hand set
// status left alone, a saved URL used as is, a pattern row skipped, the statuses, the cost
// summed and logged, a one row scan, and the refusal without credentials.
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const N = require(path.join(root, 'citations/nap.js'));
const L = require(path.join(root, 'citations/listing.js'));
const { createScanner, nextStatus } = require(path.join(root, 'citations/scan.js'));
const { ensureCitationTables, createCitationStore } = require(path.join(root, 'citations/store.js'));
const CL = require(path.join(root, 'citations/client.js'));
const P = require(path.join(root, 'locations/places.js'));
const V = require(path.join(root, 'locations/review.js'));
const A = require(path.join(root, 'locations/approved.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: citations NAP comparison, listing reader and scan ===\n');
const quiet = { log() {}, info() {}, warn() {}, error() {} };

(async () => {
  // ── The comparison ──
  const E = { name: 'Edens Edge Landscaping', phone: '07850 412717', address: '12 High St, Southampton, SO14 1AA', website: 'https://edensedge.co.uk' };
  let c = N.compareNap(E, { name: 'EDENS EDGE LANDSCAPING LTD', phones: ['+44 7850 412717'], address: '12 High Street, Southampton, SO141AA', websites: ['http://www.edensedge.co.uk/'] });
  chk('+44 against 0, Ltd, St against Street, the postcode without its space, www: a match on every field', c.status === 'match' && c.verified.join() === 'name,phone,address,website' && !c.diffs.length, JSON.stringify(c), '');
  c = N.compareNap(E, { name: 'Edens Edge Landscaping', phones: ['023 8000 0000'], address: '12 High Street Southampton SO14 1AA', websites: ['https://edensedge.co.uk'] });
  chk('a different phone is a mismatch with the field, what the listing shows and what was expected', c.status === 'mismatch' && c.diffs.length === 1 && c.diffs[0].field === 'phone' && c.diffs[0].found === '023 8000 0000' && c.diffs[0].expected === '07850 412717', JSON.stringify(c.diffs), '');
  c = N.compareNap(E, { name: 'Edens Edge Landscaping', phones: ['07850412717'], address: '5 Other Road, Southampton, SO15 2BB', websites: [] });
  chk('a different postcode is an address mismatch; a missing website is missing, not a mismatch', c.status === 'mismatch' && c.diffs[0].field === 'address' && c.missing.join() === 'website', JSON.stringify(c), '');
  c = N.compareNap({ name: 'Edens Edge Landscaping', phone: '07850 412717' }, { name: 'Edens Edge Landscaping', phones: [] });
  chk('the name alone, no phone on the page: needs review', c.status === 'needs_review' && c.missing.join() === 'phone', JSON.stringify(c), '');
  c = N.compareNap({ name: 'Kestrel Ridge Roofing Ltd', address: '12 High Street, Bristol' }, { name: 'Kestrel Ridge Roofing', address: 'Unit 3, 12 High St, Bristol, Avon, United Kingdom' });
  chk('no postcode on either side: every number and word of the record\'s address must be in the listing\'s', c.status === 'match' && c.verified.join() === 'name,address', JSON.stringify(c), '');
  c = N.compareNap({ name: 'Edens Edge Landscaping', phone: '07850 412717' }, { name: 'Southampton Landscapes Ltd', phones: ['07850 412717'] });
  chk('the phone matches but the name is another business: a name mismatch', c.status === 'mismatch' && c.diffs[0].field === 'name', JSON.stringify(c), '');
  chk('a service area record (no address) never compares the address', !N.compareNap({ name: 'A', phone: '07000 000000', address: '' }, { name: 'A', phones: ['07000000000'], address: 'Somewhere SO1 1AA' }).missing.includes('address'), '', '');
  chk('the normalisers on their own', N.normPhone('+44 (0)7850 412 717') === '07850412717' && N.normPhone('0044 7850 412717') === '07850412717' && N.normName('Edens Edge Landscaping Ltd.') === 'edens edge landscaping' && N.normWebsite('www.Edensedge.co.uk/about') === 'edensedge.co.uk' && N.postcodeOf('Flat 2, SO14 1AA') === 'SO141AA' && N.namesMatch('Edens Edge', 'Edens Edge Landscaping & Garden Design'), '', '');

  // ── The reader ──
  const page = ({ name = 'Edens Edge Landscaping', phone = '07850 412717', locality = 'Southampton', postcode = 'SO14 1AA', site = 'https://edensedge.co.uk', jsonld = true, title = `${name} | Listing`, extra = '', text = '' } = {}) => `<html><head><title>${title}</title>${jsonld ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'LocalBusiness', name, telephone: phone, address: { '@type': 'PostalAddress', streetAddress: '12 High St', addressLocality: locality, postalCode: postcode }, url: site })}</script>` : ''}</head><body><h1>${name}</h1><p>${text || `Call ${phone}. 12 High St, ${locality}, ${postcode}.`}</p><a href="https://www.yell.com/other">Yell</a><a href="${site}/">website</a><a href="https://facebook.com/x">fb</a>${extra}</body></html>`;
  const ex = L.extractNap(page(), { domain: 'yell.com' });
  chk('the reader: the JSON-LD name, phone, address, locality and postcode, the site as a website candidate, not the directory or social links', ex.name === 'Edens Edge Landscaping' && ex.source === 'jsonld' && ex.phones.includes('07850 412717') && ex.postcodes.join() === 'SO141AA' && ex.locality === 'Southampton' && ex.websites.every(w => /edensedge/.test(w)) && ex.websites.length >= 1, JSON.stringify(ex), '');
  const ex2 = L.extractNap(page({ jsonld: false, title: 'Edens Edge Landscaping - Landscapers in Southampton - FreeIndex', text: 'Phone: 023 8000 0000. Southampton, SO14 1AA. Also 07850 412717. 99 Some Road' }), { domain: 'freeindex.co.uk' });
  chk('no JSON-LD: the title and heading give the name, every phone in the text is read (not run into the next number), the locality from the postcode line', ex2.names.includes('Edens Edge Landscaping') && ex2.phones.includes('023 8000 0000') && ex2.phones.includes('07850 412717') && ex2.phones.length === 2 && ex2.locality === 'Southampton' && ex2.source === 'text', JSON.stringify(ex2), '');
  const blocked = await L.fetchPage('https://x.test/', { fetchFn: async () => ({ ok: false, status: 403, url: 'https://x.test/', text: async () => '' }) });
  chk('fetchPage: a 403 is a refusal with the reason; a login wall is spotted', blocked.ok === false && /refused/.test(blocked.reason) && (await L.fetchPage('https://y.test/', { fetchFn: async () => ({ ok: true, status: 200, url: 'https://y.test/', text: async () => '<html><body><p>You must log in to continue</p></body></html>' }) })).reason === 'the page needs a login or a browser check', blocked.reason, '');

  // ── The scan on pg-mem ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, niche_key TEXT, archived_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await ensureCitationTables(pool); await P.ensurePlacesTables(pool); await V.ensureReviewTables(pool);
  const store = createCitationStore(pool, { log: quiet, dfs: { configured: () => false }, env: {} });
  await store.seedDirectories({ fillDa: false });
  await pool.query(`INSERT INTO places (id, name, name_norm, slug, type, lat, lng, population, country, is_admin_area, kind, lad_name) VALUES ('E1', 'Southampton', 'southampton', 'southampton', 'town', 50.9, -1.4, 249633, 'England', FALSE, 'built-up area', 'Southampton'), ('E2', 'Romsey', 'romsey', 'romsey', 'town', 50.99, -1.5, 20000, 'England', FALSE, 'built-up area', 'Test Valley')`);
  const edens = (await pool.query(`INSERT INTO clients (name, trade, niche_key) VALUES ('Edens Edge Landscaping', 'Landscaper', 'landscapers') RETURNING id`)).rows[0].id;
  await pool.query(`INSERT INTO client_location_tiers (client_id, place_id, name, type, outcome, tier, phase, source, population, approved_at, approved_by, run_at) VALUES ($1, 'E2', 'Romsey', 'town', 'tier', 1, 1, 'scored', 20000, NOW(), 'test', NOW())`, [edens]);
  const cv = { company_name: 'Edens Edge Landscaping', phone: '07850 412717', email: 'hello@edensedge.co.uk' };
  const filloutService = { record: async () => ({ sections: [{ fields: [{ key: 'primary_town', value: 'Southampton' }, { key: 'facebook', value: 'https://www.facebook.com/edensedgelandscaping' }] }] }) };
  const C = CL.createClientCitations({ pool, store, filloutService, placesStore: P.createPlacesStore(pool), approvedTiers: A.approvedTiers, clientValues: async () => cv, siteUrlFor: async () => 'https://edensedge.co.uk/' });
  const dirId = async key => (await store.byKey(key)).id;
  // Rows set by hand before the scan
  await C.saveRow(edens, await dirId('bing-places'), { status: 'waiting_on_client' });
  await C.saveRow(edens, await dirId('trustpilot'), { live_url: 'https://uk.trustpilot.com/review/edensedge.co.uk', listed: 'yes' });

  // The fake DataForSEO and the fake web
  const serps = [];
  const dfs = {
    configured: () => true,
    backlinks: async target => ({ items: [{ domain_from: 'yell.com', url_from: 'https://www.yell.com/biz/edens-edge-landscaping-southampton-1/' }, { domain_from: 'thomsonlocal.com', url_from: 'https://www.thomsonlocal.com/profile/edens-edge/' }, { domain_from: 'someblog.example', url_from: 'https://someblog.example/post' }], cost: 0.02, total: 3 }),
    serp: async q => {
      serps.push(q);
      const items = {
        'site:freeindex.co.uk "Edens Edge Landscaping"': [{ url: 'https://www.freeindex.co.uk/profile(edens-edge-landscaping)_123.htm', domain: 'www.freeindex.co.uk', title: 'Edens Edge Landscaping - Landscapers in Southampton - FreeIndex', description: 'Garden design and landscaping' }],
        'site:cylex-uk.co.uk "07850 412717"': [{ url: 'https://www.cylex-uk.co.uk/company/edens-edge-999.html', domain: 'www.cylex-uk.co.uk', title: 'Landscaper Southampton', description: 'tel 07850 412717' }],
        'site:scoot.co.uk "Edens Edge Landscaping"': [{ url: 'https://www.scoot.co.uk/southampton/edens-edge-landscaping-555', domain: 'www.scoot.co.uk', title: 'Edens Edge Landscaping Southampton', description: '' }],
        'site:yelp.co.uk "Edens Edge Landscaping"': [{ url: 'https://www.yelp.co.uk/biz/edens-edge-southampton', domain: 'www.yelp.co.uk', title: 'Edens Edge Landscaping - Southampton', description: 'Landscaping' }],
        // An unrelated page on the domain for the phone query (the live run's Leeds page): not accepted
        'site:hotfrog.co.uk "07850 412717"': [{ url: 'https://www.hotfrog.co.uk/company/krimpterm-leeds', domain: 'www.hotfrog.co.uk', title: 'Krimpterm Ltd Leeds', description: 'Another business entirely' }],
      }[q] || [];
      return { items, cost: 0.002, check_url: '', total: items.length };
    },
  };
  const pages = {
    'https://www.yell.com/biz/edens-edge-landscaping-southampton-1/': page(),
    'https://www.thomsonlocal.com/profile/edens-edge/': page({ locality: 'Bournemouth', postcode: 'BH1 1AA' }),
    'https://www.freeindex.co.uk/profile(edens-edge-landscaping)_123.htm': page({ phone: '023 8000 0000', jsonld: false, title: 'Edens Edge Landscaping - FreeIndex', text: 'Phone 023 8000 0000. Southampton SO14 1AA' }),
    'https://www.cylex-uk.co.uk/company/edens-edge-999.html': page({ name: 'Landscaping Services', jsonld: false, title: 'Landscaping Services in Southampton - Cylex', text: 'Tel 07850 412717, Southampton' }),
    'https://www.scoot.co.uk/southampton/edens-edge-landscaping-555': page({ name: 'Scoot Southampton', phone: '0800 000 0000', jsonld: false, title: 'Business listings Southampton - Scoot', text: 'A directory page with nothing of the business on it. Southampton.' }),
    'https://www.yelp.co.uk/biz/edens-edge-southampton': page({ phone: '', jsonld: false, title: 'Edens Edge Landscaping - Southampton - Yelp', text: 'Garden design. Southampton.' }),
    'https://uk.trustpilot.com/review/edensedge.co.uk': page({ phone: '', jsonld: false, title: 'Edens Edge Landscaping Reviews | Trustpilot', text: 'Reviews of Edens Edge Landscaping, edensedge.co.uk. Phone 07850 412717.' }),
    'https://www.facebook.com/edensedgelandscaping': '<html><body><p>You must log in to continue.</p></body></html>',
  };
  const fetched = [];
  const fetchFn = async url => { fetched.push(url); const html = pages[url]; return { ok: !!html, status: html ? 200 : 404, url, text: async () => html || '' }; };
  const scanner = createScanner({ pool, store, clientCitations: C, dfs, fetchFn, env: { DATAFORSEO_LOGIN: 'x', DATAFORSEO_PASSWORD: 'y' }, log: quiet, concurrency: 2 });

  const result = await scanner.run(edens);
  const view = await C.view(edens);
  const rowOf = name => view.tiers.flatMap(t => t.rows).find(r => r.directory.name === name).row;
  const yell = rowOf('Yell');
  chk('Yell found through the backlink: listed, the URL, NAP match (name, phone, address not compared, website), live, high confidence', yell.listed === 'yes' && yell.live_url === 'https://www.yell.com/biz/edens-edge-landscaping-southampton-1/' && yell.nap_status === 'match' && yell.status === 'live' && yell.scan.confidence === 'high' && /backlink/.test(yell.scan.how) && yell.last_scanned_at, JSON.stringify(yell), '');
  const fi = rowOf('FreeIndex');
  chk('FreeIndex found by the name search: listed, a phone mismatch with the fields, needs fixing', fi.listed === 'yes' && fi.nap_status === 'mismatch' && fi.nap_diffs[0].field === 'phone' && fi.nap_diffs[0].found === '023 8000 0000' && fi.status === 'needs_fixing' && /name/.test(fi.scan.how), JSON.stringify(fi), '');
  const cy = rowOf('Cylex UK');
  chk('Cylex found by the phone search after the name found nothing: the phone alone is medium confidence, listed, NAP needs review (the other name on the page is kept for a person, not a mismatch), submitted', cy.listed === 'yes' && cy.nap_status === 'needs_review' && cy.nap_diffs.length === 0 && cy.scan.diffs_unconfirmed[0].field === 'name' && cy.scan.confidence === 'medium' && cy.status === 'submitted' && /phone/.test(cy.scan.how) && serps.includes('site:cylex-uk.co.uk "Edens Edge Landscaping"'), JSON.stringify(cy), '');
  const hf = rowOf('Hotfrog UK');
  chk('Hotfrog: the name search finds nothing and the phone search returns an unrelated page (no phone or name in it): not accepted, listed no, not started', hf.listed === 'no' && hf.status === 'not_started' && hf.scan.how === 'not found' && serps.includes('site:hotfrog.co.uk "Edens Edge Landscaping"') && serps.includes('site:hotfrog.co.uk "07850 412717"'), JSON.stringify(hf), '');
  const sc = rowOf('Scoot');
  chk('Scoot: the page found has neither the name nor the phone: low confidence, not listed, no URL written, needs review with the candidate kept', sc.listed === 'unchecked' && sc.live_url === '' && sc.nap_status === 'needs_review' && sc.scan.confidence === 'low' && sc.scan.candidate === 'https://www.scoot.co.uk/southampton/edens-edge-landscaping-555', JSON.stringify(sc), '');
  const tl = rowOf('Thomson Local');
  chk('Thomson Local: the listing says Bournemouth, not one of the client\'s towns: wrong location', tl.listed === 'yes' && tl.status === 'wrong_location' && tl.scan.found.locality === 'Bournemouth', JSON.stringify(tl), '');
  const fb = rowOf('Facebook');
  chk('Facebook: the onboarding link hits a login wall: listed (the URL is known), needs review with the reason, no search made', fb.listed === 'yes' && fb.live_url === 'https://www.facebook.com/edensedgelandscaping' && fb.nap_status === 'needs_review' && /login/.test(fb.scan.reason) && !serps.some(q => /facebook/.test(q)), JSON.stringify(fb), '');
  const bing = rowOf('Bing Places');
  chk('Bing: waiting on client is never moved by a scan', bing.status === 'waiting_on_client' && bing.listed === 'no', JSON.stringify(bing), '');
  const tp = rowOf('Trustpilot');
  chk('Trustpilot: the saved URL is used as is (no search), the name and phone on the page: live', tp.live_url === 'https://uk.trustpilot.com/review/edensedge.co.uk' && !serps.some(q => /trustpilot/.test(q)) && tp.status === 'live' && tp.nap_status === 'match', JSON.stringify(tp), '');
  const yelp = rowOf('Yelp UK');
  chk('Yelp: the name alone on the page is medium confidence: listed, needs review, not live', yelp.listed === 'yes' && yelp.nap_status === 'needs_review' && yelp.status === 'submitted', JSON.stringify(yelp), '');
  const reach = rowOf('Reach plc newspaper directories');
  chk('a pattern row with no domain is skipped with a note', reach.scan && reach.scan.how === 'skipped' && reach.listed === 'unchecked', JSON.stringify(reach.scan), '');
  const total = view.tiers.flatMap(t => t.rows).length;
  chk('the scan row: done, every row counted, the found count, the cost summed (one backlinks call plus the searches)', result.status === 'done' && result.rows_done === total && result.found === view.tiers.flatMap(t => t.rows).filter(r => r.row.listed === 'yes').length && Math.abs(result.cost_usd - (0.02 + serps.length * 0.002)) < 1e-6 && result.calls === serps.length + 1, JSON.stringify({ status: result.status, rows_done: result.rows_done, total, found: result.found, cost: result.cost_usd, calls: result.calls, serps: serps.length }), '');
  const costs = await store.costs({ clientId: edens });
  chk('the spend is logged under scan for the client', costs.length === 1 && costs[0].kind === 'scan' && costs[0].cost_usd === result.cost_usd, JSON.stringify(costs), '');
  const st = await scanner.status(edens);
  chk('status(): the latest scan, not running, with the summary', st && st.running === false && st.status === 'done' && st.summary.found.length > 0 && st.summary.not_found.includes('Hotfrog UK'), JSON.stringify(st && Object.keys(st)), '');
  chk('the tiles after the scan: mismatch 1, wrong location 1, waiting on client 1, needs review counts the low and medium rows', view.stats.nap.mismatch === 1 && view.stats.wrong_location === 1 && view.stats.waiting_on_client === 1 && view.stats.needs_review >= 4 && view.stats.banner[0].text === 'FreeIndex: phone mismatch: listing shows 023 8000 0000, expected 07850 412717', JSON.stringify(view.stats), '');

  // One row again: a scan of Yell alone makes no backlinks call and reads the saved URL
  const before = serps.length;
  const one = await scanner.run(edens, { directoryId: await dirId('yell') });
  chk('a one row scan: scope one, no backlinks call, no search (the URL is saved), the page read', one.scope === 'one' && one.rows_total === 1 && one.calls === 0 && serps.length === before && fetched.filter(u => /yell\.com\/biz/.test(u)).length === 2, JSON.stringify({ scope: one.scope, calls: one.calls }), '');
  chk('nextStatus on its own', nextStatus('not_started', { listed: 'yes', nap_status: 'match' }) === 'live' && nextStatus('live', { listed: 'no' }) === 'not_started' && nextStatus('client_declined', { listed: 'yes', nap_status: 'match' }) === 'client_declined' && nextStatus('live', { listed: 'yes', nap_status: 'mismatch' }) === 'needs_fixing' && nextStatus('awaiting_email', { listed: 'yes', nap_status: 'needs_review' }) === 'awaiting_email', '', '');
  const off = createScanner({ pool, store, clientCitations: C, dfs: { configured: () => false }, env: {}, log: quiet });
  const refused = await off.run(edens).catch(e => e);
  chk('no credentials: refused with a 503 and nothing written', refused instanceof Error && refused.status === 503, refused && refused.message, '');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
