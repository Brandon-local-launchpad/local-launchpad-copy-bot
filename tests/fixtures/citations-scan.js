'use strict';
// Fixture: the NAP comparison (citations/nap.js), the listing readers (citations/listing.js)
// and the scan (citations/scan.js) on pg-mem with a fake DataForSEO. The comparison cases
// (+44 against 0, Ltd, St against Street, the postcode with and without its space, www), the
// readers (HTML, text, snippet), the discovery (the queued searches at depth 100: the name, the phone, the postcode matched
// to the directory database by the result's site, a Google goto link read from its breadcrumb,
// social results accepted only for the business's own page, sites not in the database kept
// as "also listed on"), and one Edens Edge scan: a listing found through a backlink and read
// through content parsing, one through the name search, a goto listing read from its snippet,
// a low confidence page kept under needs review, a wrong location, a page link from onboarding
// that cannot be read, a hand set status left alone, a saved URL used as is, a pattern row
// skipped, a search that fails (the other still counts), the method on every row, the
// statuses, the cost summed and logged, a one row scan on the live search, and the refusal
// without credentials.
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const N = require(path.join(root, 'citations/nap.js'));
const L = require(path.join(root, 'citations/listing.js'));
const S = require(path.join(root, 'citations/scan.js'));
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
console.log('\n=== FIXTURE: citations NAP comparison, listing readers, discovery and scan ===\n');
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

  // ── The readers ──
  const html = ({ name = 'Edens Edge Landscaping', phone = '07850 412717', locality = 'Southampton', postcode = 'SO14 1AA', site = 'https://edensedge.co.uk' } = {}) => `<html><head><title>${name} | Listing</title><script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'LocalBusiness', name, telephone: phone, address: { '@type': 'PostalAddress', streetAddress: '12 High St', addressLocality: locality, postalCode: postcode }, url: site })}</script></head><body><h1>${name}</h1><p>Call ${phone}. 12 High St, ${locality}, ${postcode}.</p><a href="https://www.yell.com/other">Yell</a><a href="${site}/">website</a><a href="https://facebook.com/x">fb</a></body></html>`;
  const ex = L.extractNap(html(), { domain: 'yell.com' });
  chk('the HTML reader: the JSON-LD name, phone, address, locality and postcode, the site as a website candidate, not the directory or social links', ex.name === 'Edens Edge Landscaping' && ex.source === 'jsonld' && ex.phones.includes('07850 412717') && ex.postcodes.join() === 'SO141AA' && ex.locality === 'Southampton' && ex.websites.every(w => /edensedge/.test(w)) && ex.websites.length >= 1, JSON.stringify(ex), '');
  const ex2 = L.extractNapFromText('Edens Edge Landscaping\nLandscapers in Southampton\nPhone: 023 8000 0000. 12 High Street, Southampton, SO14 1AA. Also 07850 412717. 99 Some Road', ['Edens Edge Landscaping - FreeIndex']);
  chk('the text reader (DataForSEO content parsing): the titles and first lines as names, every phone (not run into the next number), the postcode, the town before it', ex2.names.includes('Edens Edge Landscaping') && ex2.phones.includes('023 8000 0000') && ex2.phones.includes('07850 412717') && ex2.phones.length === 2 && ex2.postcodes.join() === 'SO141AA' && ex2.locality === 'Southampton' && ex2.source === 'text', JSON.stringify(ex2), '');
  const ex3 = L.extractNapFromSnippet({ title: 'Edens Edge Landscaping - Southampton - Yell', description: 'Call 07850 412717. Garden design in Southampton SO14 1AA.' });
  chk('the snippet reader: the name from the title, the phone, the postcode and the town from the description', ex3.name === 'Edens Edge Landscaping' && ex3.phones.join() === '07850 412717' && ex3.postcodes.join() === 'SO141AA' && ex3.locality === 'Southampton' && ex3.source === 'snippet', JSON.stringify(ex3), '');

  // ── The acceptance rules ──
  const nap = { name: 'Edens Edge Landscaping', phone: '07850 412717' };
  chk('accept: a directory result with the name in the title; not one without it', S.accept({ url: 'https://www.yell.com/biz/x/', title: 'Edens Edge Landscaping, Southampton | Yell', description: '' }, nap, { domain: 'yell.com' }) && !S.accept({ url: 'https://www.yell.com/biz/y/', title: 'Krimpterm Ltd, Leeds', description: 'Car parts' }, nap, { domain: 'yell.com' }), '', '');
  chk('accept on a social site: the business\'s own page, not a post, a reel or another company', S.accept({ url: 'https://www.instagram.com/edensedge/', title: 'Edens Edge Landscaping (@edensedge)', description: '' }, nap, { domain: 'instagram.com' }) && !S.accept({ url: 'https://www.instagram.com/p/DWPBJMVjXKJ/', title: 'Edens Edge Landscaping on Instagram', description: '' }, nap, { domain: 'instagram.com' }) && !S.accept({ url: 'https://uk.linkedin.com/company/eglo-uk', title: 'Edens Edge Landscaping | LinkedIn', description: '' }, nap, { domain: 'linkedin.com' }) && S.accept({ url: 'https://google.com/goto?url=x', goto: true, breadcrumb: 'https://www.facebook.com › edensedgelandscaping', title: 'Edens Edge Landscaping | Facebook', description: '' }, nap, { domain: 'facebook.com' }), '', '');
  chk('the discovery queries: the name with the town, the name alone, the phone spaced and as digits, the name with the postcode when there is an address', S.discoveryQueries(nap, 'Southampton').join(' | ') === '"Edens Edge Landscaping" Southampton | "Edens Edge Landscaping" | "07850 412717" | "07850412717"' && S.discoveryQueries({ ...nap, address: '12 High St, Southampton SO14 1AA' }, 'Southampton').slice(-1)[0] === '"Edens Edge Landscaping" SO14 1AA', S.discoveryQueries(nap, 'Southampton').join(' | '), '');
  chk('phone forms: a 02 landline as 3 4 4, a mobile or 01 number as 5 6, both with the digits; a short or empty number gives none', S.phoneForms('02380445123').join('|') === '023 8044 5123|02380445123' && S.phoneForms('+44 7580 412717').join('|') === '07580 412717|07580412717' && S.phoneForms('01962 123456')[0] === '01962 123456' && S.phoneForms('').length === 0, JSON.stringify([S.phoneForms('02380445123'), S.phoneForms('+44 7580 412717')]), '');
  chk('accept: a result with the phone number is the business even when the name differs', S.accept({ url: 'https://www.bizify.co.uk/x', title: 'Edens Edge Garden Services, Southampton', description: 'Tel: 07850 412717' }, nap, { domain: 'bizify.co.uk' }) && !S.accept({ url: 'https://www.bizify.co.uk/y', title: 'Edens Edge Garden Services, Southampton', description: 'Tel: 07850 999999' }, nap, { domain: 'bizify.co.uk' }), '', '');

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
  const cv = { company_name: 'Edens Edge Landscaping', phone: '07850 412717', email: 'hello@edensedge.co.uk', live_domain: 'edensedge.co.uk' };
  const filloutService = { record: async () => ({ sections: [{ fields: [{ key: 'primary_town', value: 'Southampton' }, { key: 'facebook', value: 'https://www.facebook.com/edensedgelandscaping' }] }] }) };
  const C = CL.createClientCitations({ pool, store, filloutService, placesStore: P.createPlacesStore(pool), approvedTiers: A.approvedTiers, clientValues: async () => cv, siteUrlFor: async () => 'https://mediumturquoise-parr-749549.hostingersite.com' });
  const dirId = async key => (await store.byKey(key)).id;
  await C.saveRow(edens, await dirId('bing-places'), { status: 'waiting_on_client' });
  await C.saveRow(edens, await dirId('trustpilot'), { live_url: 'https://uk.trustpilot.com/review/edensedge.co.uk', listed: 'yes' });

  // The fake DataForSEO: the two name searches (queued), the live search, the backlinks, the page reads
  const reads = [], live = [];
  let batches = [];
  const item = (site, url, title, description = '', goto = false) => ({ url: goto ? 'https://google.com/goto?url=x' : url, domain: goto ? 'google.com' : site, site, goto, breadcrumb: goto ? `https://www.${site} › company › edens-edge` : '', title, description });
  const searchResults = {
    '"Edens Edge Landscaping" Southampton': [
      item('www.freeindex.co.uk', 'https://www.freeindex.co.uk/profile(edens-edge-landscaping)_123.htm', 'Edens Edge Landscaping - Landscapers in Southampton - FreeIndex', 'Garden design and landscaping'),
      item('www.cylex-uk.co.uk', '', 'Edens Edge Landscaping, Southampton - Cylex', 'Call 07850 412717. Landscaping in Southampton SO14 1AA.', true),
      item('www.scoot.co.uk', 'https://www.scoot.co.uk/southampton/edens-edge-landscaping-555', 'Edens Edge Landscaping Southampton', ''),
      item('www.yelp.co.uk', 'https://www.yelp.co.uk/biz/edens-edge-southampton', 'Edens Edge Landscaping - Southampton', 'Landscaping'),
      item('www.instagram.com', 'https://www.instagram.com/p/DWPBJMVjXKJ/', 'Edens Edge Landscaping on Instagram', 'a post'),
      item('uk.linkedin.com', 'https://uk.linkedin.com/company/eglo-uk', 'Edens Edge Landscaping | LinkedIn', ''),
      item('ukbusinesslist.co.uk', 'https://ukbusinesslist.co.uk/edens-edge', 'Edens Edge Landscaping - UK Business List', 'Southampton'),
      item('www.hotfrog.co.uk', 'https://www.hotfrog.co.uk/company/krimpterm-leeds', 'Krimpterm Ltd Leeds', 'Another business entirely'),
      item('google.com', 'https://google.com/maps/x', 'Edens Edge Landscaping', ''),
    ],
    '"Edens Edge Landscaping"': [item('www.freeindex.co.uk', 'https://www.freeindex.co.uk/profile(edens-edge-landscaping)_123.htm', 'Edens Edge Landscaping - FreeIndex', '')],
    // The phone searches: Bizify lists the business under a slightly different name, found by the phone alone; Brownbook shows a snippet with the phone and no link
    '"07850 412717"': [item('www.bizify.co.uk', 'https://www.bizify.co.uk/edens-edge-garden-services', 'Edens Edge Garden Services - Southampton', 'Tel: 07850 412717. Landscaping.')],
    '"07850412717"': [
      item('www.brownbook.net', '', 'Edens Edge Gardens, Southampton', 'Phone 07850412717, SO14 1AA', true),
      item('www.bark.com', 'https://www.bark.com/en/gb/landscapers/hampshire/southampton/', 'Find a Landscaper in Southampton', 'Edens Edge Landscaping ... 07850412717 ... 20 more'),
      item('www.yell.com', 'https://www.yell.com/s/landscapers-southampton.html', 'Landscapers Near Me in Southampton', 'Edens Edge Landscaping, Call 07850412717'),
    ],
  };
  const pageText = ({ name = 'Edens Edge Landscaping', phone = '07850 412717', locality = 'Southampton', postcode = 'SO14 1AA', site = 'https://edensedge.co.uk' } = {}) => ({ ok: true, status: 200, titles: [`${name} | Listing`], text: `${name}\nLandscaping and garden design\nCall ${phone}. 12 High St, ${locality}, ${postcode}.\nWebsite ${site}/`, cost: 0.0015 });
  const pages = {
    'https://www.yell.com/biz/edens-edge-landscaping-southampton-1/': pageText(),
    'https://www.thomsonlocal.com/profile/edens-edge/': pageText({ locality: 'Bournemouth', postcode: 'BH1 1AA' }),
    'https://www.freeindex.co.uk/profile(edens-edge-landscaping)_123.htm': pageText({ phone: '023 8000 0000' }),
    'https://www.scoot.co.uk/southampton/edens-edge-landscaping-555': { ok: true, status: 200, titles: ['Business listings Southampton - Scoot'], text: 'A directory page with nothing of the business on it. Southampton. Call 0800 000 0000.', cost: 0.0015 },
    'https://www.yelp.co.uk/biz/edens-edge-southampton': { ok: true, status: 200, titles: ['Edens Edge Landscaping - Southampton - Yelp'], text: 'Edens Edge Landscaping\nGarden design. Southampton.', cost: 0.0015 },
    'https://uk.trustpilot.com/review/edensedge.co.uk': { ok: true, status: 200, titles: ['Edens Edge Landscaping Reviews | Trustpilot'], text: 'Reviews of Edens Edge Landscaping, edensedge.co.uk. Phone 07850 412717.', cost: 0.0015 },
    'https://www.facebook.com/edensedgelandscaping': { ok: false, status: 403, titles: [], text: '', cost: 0.0015 },
    'https://www.bizify.co.uk/edens-edge-garden-services': pageText({ name: 'Edens Edge Garden Services' }),
  };
  const dfs = {
    configured: () => true,
    backlinks: async () => ({ items: [{ domain_from: 'yell.com', url_from: 'https://www.yell.com/biz/edens-edge-landscaping-southampton-1/' }, { domain_from: 'thomsonlocal.com', url_from: 'https://www.thomsonlocal.com/profile/edens-edge/' }, { domain_from: 'someblog.example', url_from: 'https://someblog.example/post' }], cost: 0.02, total: 3 }),
    serpMany: async (queries, { depth }) => { batches.push({ queries, depth }); const m = new Map(); for (const q of queries) m.set(q, q === '"Edens Edge Landscaping"' && batches.length === 1 ? { items: [], cost: 0.003, error: 'Internal SE Server Error.' } : { items: searchResults[q] || [], cost: 0.006 }); return m; },
    serp: async q => { live.push(q); return { items: searchResults[q] || [], cost: 0.01 }; },
    contentParsing: async url => { reads.push(url); const p = pages[url]; if (!p) return { ok: false, status: 404, titles: [], text: '', cost: 0.0015 }; return p; },
  };
  const scanner = S.createScanner({ pool, store, clientCitations: C, dfs, env: { DATAFORSEO_LOGIN: 'x', DATAFORSEO_PASSWORD: 'y' }, log: quiet, concurrency: 2 });

  const result = await scanner.run(edens);
  const view = await C.view(edens);
  const rowOf = name => view.tiers.flatMap(t => t.rows).find(r => r.directory.name === name).row;
  chk('discovery: one queued batch of the four searches (two name, two phone; no address so no postcode search) at depth 100, no live search; one search failed and the scan went on with the others', batches.length === 1 && batches[0].queries.length === 4 && batches[0].queries[2] === '"07850 412717"' && batches[0].depth === 100 && live.length === 0 && result.summary.search_errors.length === 1 && /Internal SE/.test(result.summary.search_errors[0]) && result.status === 'done', JSON.stringify({ batches, live, errors: result.summary.search_errors }), '');
  const yell = rowOf('Yell');
  chk('Yell found through the backlink and read through DataForSEO: listed, the URL, NAP match, live, high confidence, the method on the row', yell.listed === 'yes' && yell.live_url === 'https://www.yell.com/biz/edens-edge-landscaping-southampton-1/' && yell.nap_status === 'match' && yell.status === 'live' && yell.scan.confidence === 'high' && yell.scan.method === 'DataForSEO content parsing' && /backlink/.test(yell.scan.how), JSON.stringify(yell), '');
  const fi = rowOf('FreeIndex');
  chk('FreeIndex found by the name search and read: listed, a phone mismatch with the fields, needs fixing', fi.listed === 'yes' && fi.nap_status === 'mismatch' && fi.nap_diffs[0].field === 'phone' && fi.nap_diffs[0].found === '023 8000 0000' && fi.status === 'needs_fixing' && /name search/.test(fi.scan.how), JSON.stringify(fi), '');
  const cy = rowOf('Cylex UK');
  chk('Cylex: Google hid the link, so the site comes from the breadcrumb and the NAP from the snippet: listed, needs review, no URL, the reason says to open the directory', cy.listed === 'yes' && cy.live_url === '' && cy.nap_status === 'needs_review' && cy.scan.method === 'search snippet' && /Google hid the link/.test(cy.scan.reason) && cy.scan.found.phones.join() === '07850 412717' && /cylex-uk\.co\.uk/.test(cy.scan.breadcrumb), JSON.stringify(cy), '');
  const bz = rowOf('Bizify');
  chk('Bizify, found by the phone search under a slightly different name, read: listed, high confidence by the phone, the name passed by phone, NAP match', bz.listed === 'yes' && bz.scan.confidence === 'high' && bz.nap_status === 'match' && bz.scan.verified.includes('name (by phone)') && /name search/.test(bz.scan.how), JSON.stringify(bz), '');
  const bb = rowOf('Brownbook');
  chk('Brownbook: a snippet with the phone number and the link hidden: listed, high confidence, no URL, the reason says the phone is in it', bb.listed === 'yes' && bb.live_url === '' && bb.scan.confidence === 'high' && bb.scan.method === 'search snippet' && /phone number is in it/.test(bb.scan.reason), JSON.stringify(bb), '');
  const bk = rowOf('Bark');
  chk('Bark: the phone on a category page (no name word in its title): listed, no URL, medium, not read, the reason says to find the listing by hand', bk.listed === 'yes' && bk.live_url === '' && bk.scan.confidence === 'medium' && bk.scan.fetched === false && /list page/.test(bk.scan.reason) && bk.scan.candidate === 'https://www.bark.com/en/gb/landscapers/hampshire/southampton/' && !reads.includes('https://www.bark.com/en/gb/landscapers/hampshire/southampton/'), JSON.stringify(bk.scan), '');
  chk('listPageHit: a title without a name word and the phone in the snippet; not a listing title, not a snippet without the phone', S.listPageHit({ title: 'Landscapers Near Me in Southampton', description: 'Call 07850 412717' }, nap) && !S.listPageHit({ title: 'Edens Edge Landscaping, Southampton', description: 'Call 07850 412717' }, nap) && !S.listPageHit({ title: 'Landscapers Near Me', description: 'none' }, nap), '', '');
  const sc = rowOf('Scoot');
  chk('Scoot: the page has neither the name nor the phone: low confidence, not listed, the candidate kept under needs review', sc.listed === 'unchecked' && sc.live_url === '' && sc.nap_status === 'needs_review' && sc.scan.confidence === 'low' && sc.scan.candidate === 'https://www.scoot.co.uk/southampton/edens-edge-landscaping-555', JSON.stringify(sc), '');
  const tl = rowOf('Thomson Local');
  chk('Thomson Local (a backlink): the listing says Bournemouth: wrong location', tl.listed === 'yes' && tl.status === 'wrong_location' && tl.scan.found.locality === 'Bournemouth', JSON.stringify(tl), '');
  const yelp = rowOf('Yelp UK');
  chk('Yelp: the name alone on the page is medium confidence: listed, needs review, submitted', yelp.listed === 'yes' && yelp.nap_status === 'needs_review' && yelp.status === 'submitted', JSON.stringify(yelp), '');
  chk('Instagram (a post) and LinkedIn (another company) are not listings: not found; Hotfrog (a stranger\'s page) not found', rowOf('Instagram').listed === 'no' && rowOf('LinkedIn').listed === 'no' && rowOf('Hotfrog UK').listed === 'no' && /not in Google's top 100/.test(rowOf('Hotfrog UK').scan.reason), JSON.stringify([rowOf('Instagram').scan, rowOf('LinkedIn').scan]), '');
  const fb = rowOf('Facebook');
  chk('Facebook: the onboarding link cannot be read and there is no snippet: listed (the URL is known), needs review with the reason', fb.listed === 'yes' && fb.live_url === 'https://www.facebook.com/edensedgelandscaping' && fb.nap_status === 'needs_review' && /could not be read through DataForSEO \(HTTP 403\)/.test(fb.scan.reason) && fb.scan.method === 'none', JSON.stringify(fb.scan), '');
  chk('Bing: waiting on client is never moved; Trustpilot: the saved URL read, live', rowOf('Bing Places').status === 'waiting_on_client' && rowOf('Trustpilot').status === 'live' && rowOf('Trustpilot').nap_status === 'match', '', '');
  chk('a pattern row with no domain is skipped with a note', rowOf('Reach plc newspaper directories').scan.how === 'skipped', '', '');
  chk('also listed on: a site not in the database with the name in its title (ukbusinesslist), not Google itself', result.summary.also_listed.length === 1 && result.summary.also_listed[0].site === 'ukbusinesslist.co.uk' && result.summary.also_listed[0].url === 'https://ukbusinesslist.co.uk/edens-edge', JSON.stringify(result.summary.also_listed), '');
  const total = view.tiers.flatMap(t => t.rows).length;
  chk('the scan row: done, every row counted, the found count, the cost summed (the backlinks call, four searches, the page reads), the methods counted', result.status === 'done' && result.rows_done === total && result.found === view.tiers.flatMap(t => t.rows).filter(r => r.row.listed === 'yes').length && Math.abs(result.cost_usd - (0.02 + 3 * 0.006 + 0.003 + reads.length * 0.0015)) < 1e-6 && result.calls === 1 + 4 + reads.length && result.summary.methods['DataForSEO content parsing'] >= 4 && result.summary.methods['search snippet'] === 3, JSON.stringify({ status: result.status, rows_done: result.rows_done, total, found: result.found, cost: result.cost_usd, calls: result.calls, reads: reads.length, methods: result.summary.methods }), '');
  const costs = await store.costs({ clientId: edens });
  chk('the spend is logged under scan for the client', costs.length === 1 && costs[0].kind === 'scan' && costs[0].cost_usd === result.cost_usd, JSON.stringify(costs), '');
  chk('the tiles after the scan: mismatch 1, wrong location 1, waiting on client 1, needs review counts the snippet, low and medium rows', view.stats.nap.mismatch === 1 && view.stats.wrong_location === 1 && view.stats.waiting_on_client === 1 && view.stats.needs_review >= 4 && view.stats.banner[0].text === 'FreeIndex: phone mismatch: listing shows 023 8000 0000, expected 07850 412717', JSON.stringify(view.stats), '');

  // One row again: the live search, no backlinks call, the saved URL read
  const readsBefore = reads.length;
  const one = await scanner.run(edens, { directoryId: await dirId('yell') });
  chk('a one row scan: scope one, the four searches live (no queue), no backlinks call, the saved URL read once', one.scope === 'one' && one.rows_total === 1 && live.length === 4 && batches.length === 1 && reads.length === readsBefore + 1 && one.calls === 5, JSON.stringify({ scope: one.scope, calls: one.calls, live }), '');
  const hitsMap = new Map([['yell.com', [{ url: 'https://www.yell.com/s/landscapers-southampton.html', title: 'Landscapers Near Me in Southampton', description: 'Edens Edge Landscaping, Call 07850412717', query: 'q' }, { url: 'https://www.yell.com/biz/edens-edge-1/', title: 'Edens Edge Landscaping, Southampton | Yell', description: '', query: 'q' }]]]);
  chk('listingFor prefers a listing page hit over a list page that carries the phone', S.listingFor({ dir: { domain: 'yell.com' }, row: {}, backlinks: [], hits: hitsMap, nap }).url === 'https://www.yell.com/biz/edens-edge-1/', '', '');
  chk('nextStatus on its own', S.nextStatus('not_started', { listed: 'yes', nap_status: 'match' }) === 'live' && S.nextStatus('live', { listed: 'no' }) === 'not_started' && S.nextStatus('client_declined', { listed: 'yes', nap_status: 'match' }) === 'client_declined' && S.nextStatus('live', { listed: 'yes', nap_status: 'mismatch' }) === 'needs_fixing' && S.nextStatus('awaiting_email', { listed: 'yes', nap_status: 'needs_review' }) === 'awaiting_email', '', '');
  const off = S.createScanner({ pool, store, clientCitations: C, dfs: { configured: () => false }, env: {}, log: quiet });
  const refused = await off.run(edens).catch(e => e);
  chk('no credentials: refused with a 503 and nothing written', refused instanceof Error && refused.status === 503, refused && refused.message, '');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
