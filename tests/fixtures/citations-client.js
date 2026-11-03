'use strict';
// Fixture: a client's citations list (citations/client.js) and the client API (citations/
// client-routes.js) on pg-mem with the real seed. Edens Edge (landscapers, Southampton base,
// three approved towns): the master NAP from the client values through gbp/profile.js buildNap,
// the listings email, the tiers (UK Core minus the shopfront only rows for a service area
// business, UK Secondary, the landscaper trade rows and the platforms open to trades, the
// Hampshire location rows from the councils, the county and the town names), the location
// block before approval, the Facebook and Instagram prefill, a roofer and a dog walker's
// trade rows, the saved row (listed, URL, status, done by, 1Password item), the tiles, the
// NAP banner, the validation, and the routes.
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const { ensureCitationTables, createCitationStore } = require(path.join(root, 'citations/store.js'));
const CL = require(path.join(root, 'citations/client.js'));
const { mountClientCitationsApi } = require(path.join(root, 'citations/client-routes.js'));
const P = require(path.join(root, 'locations/places.js'));
const V = require(path.join(root, 'locations/review.js'));
const A = require(path.join(root, 'locations/approved.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: citations, the client list and the Citations tab API ===\n');
const quiet = { log() {}, info() {}, warn() {}, error() {} };

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, niche_key TEXT, archived_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await ensureCitationTables(pool);
  await P.ensurePlacesTables(pool);
  await V.ensureReviewTables(pool);
  const store = createCitationStore(pool, { log: quiet, dfs: { configured: () => false }, env: {} });
  await store.seedDirectories({ fillDa: false });
  // A few places by hand (the real table has 37,000): the towns with their local authority
  const place = (id, name, lad, type = 'town', admin = false, pop = 50000) => pool.query(`INSERT INTO places (id, name, name_norm, slug, type, lat, lng, population, country, is_admin_area, kind, lad_name) VALUES ($1, $2, $3, $4, $5, 50.9, -1.4, $6, 'England', $7, 'built-up area', $8)`, [id, name, P.normaliseName(name), P.slugify(name), type, pop, admin, lad]);
  await place('E1', 'Southampton', 'Southampton; Eastleigh; New Forest; Test Valley', 'town', false, 249633);
  await place('E2', 'Romsey', 'Test Valley'); await place('E3', 'Winchester', 'Winchester'); await place('E4', 'Eastleigh', 'Eastleigh');
  await place('E5', 'Crewe', 'Cheshire East'); await place('E6', 'Bristol', 'Bristol, City of', 'town', false, 400000);
  await place('E06000045', 'Southampton', 'Southampton', 'admin', true, null);
  const placesStore = P.createPlacesStore(pool);

  // Clients: Edens Edge (landscapers, Southampton), Kestrel Ridge (roofers, Bristol), Paws (dog walkers, Crewe)
  const mk = async (name, trade, niche) => (await pool.query(`INSERT INTO clients (name, trade, niche_key) VALUES ($1, $2, $3) RETURNING id`, [name, trade, niche])).rows[0].id;
  const edens = await mk('Edens Edge Landscaping', 'Landscaper', 'landscapers');
  const kestrel = await mk('Kestrel Ridge Roofing', 'Roofer', 'roofers');
  const paws = await mk('Paws About Town', 'Dog walker', 'dog-walkers');
  const cvs = {
    [edens]: { company_name: 'Edens Edge Landscaping', phone: '+44 7850 412717', email: 'hello@edensedge.co.uk', address: '', gbp_address_type: '', hours: 'Mon to Fri 8am to 6pm' },
    [kestrel]: { company_name: 'Kestrel Ridge Roofing Ltd', phone: '0117 000 0000', address: '12 High St, Bristol BS1 1AA', gbp_address_type: 'storefront' },
    [paws]: { company_name: 'Paws About Town', phone: '07000 000000' },
  };
  const fields = { [edens]: { primary_town: 'Southampton', facebook: 'https://www.facebook.com/edensedgelandscaping', instagram: '@edensedge' }, [kestrel]: { primary_town: 'Bristol' }, [paws]: { primary_town: 'Crewe', instagram: 'https://www.instagram.com/pawsabouttown/' } };
  const filloutService = { record: async id => ({ sections: [{ fields: Object.entries(fields[id] || {}).map(([key, value]) => ({ key, value })) }] }) };
  const C = CL.createClientCitations({ pool, store, filloutService, placesStore, approvedTiers: A.approvedTiers, clientValues: async id => cvs[id] || {}, siteUrlFor: async id => (id === edens ? 'https://edensedge.co.uk/' : '') });

  // ── Edens Edge before the locations are approved ──
  let v = await C.view(edens);
  const tier = (view, t) => view.tiers.find(x => x.tier === t);
  const names = (view, t) => tier(view, t).rows.map(r => r.directory.name);
  chk('the master NAP: name as typed, the phone in one format, no address (service area), the site without the slash, the email, the hours', v.nap.name === 'Edens Edge Landscaping' && v.nap.phone === '07850 412717' && v.nap.address === null && v.nap.website === 'https://edensedge.co.uk' && v.nap.email === 'hello@edensedge.co.uk' && v.nap.hours === 'Mon to Fri 8am to 6pm', JSON.stringify(v.nap), '');
  chk('the listings email is the client slug at listings.locallaunchpad.co.uk', v.email === 'edens-edge-landscaping@listings.locallaunchpad.co.uk', v.email, '');
  chk('a service area business: the shopfront only rows are hidden (UK Core 13 of 16: no Apple, TomTom, HERE)', tier(v, 'uk_core').count === 13 && !names(v, 'uk_core').includes('Apple Business Connect') && !names(v, 'uk_core').includes('TomTom') && v.service_area === true, names(v, 'uk_core').join(', '), '13 rows');
  chk('UK Core is sorted P1 first, then by name; UK Secondary has its 11', tier(v, 'uk_core').rows[0].directory.priority === 'P1' && tier(v, 'uk_core').rows[tier(v, 'uk_core').count - 1].directory.priority === 'P2' && tier(v, 'uk_secondary').count === 11, names(v, 'uk_core').join(', '), '');
  chk('before approval: the location block says approve the locations first and has no rows', tier(v, 'location').count === 0 && tier(v, 'location').waiting === 'approve the locations first' && v.territory.approved === false, JSON.stringify(tier(v, 'location')), '');
  const trade = names(v, 'trade_niche');
  chk('the trade block: the landscaper bodies (BALI, APL), Houzz UK, the platforms open to trades (Checkatrade, MyBuilder, Which?), no roofer or builder rows', trade.includes('BALI (British Association of Landscape Industries)') && trade.some(n => /^APL/.test(n)) && trade.includes('Houzz UK') && trade.includes('Checkatrade') && trade.includes('MyBuilder') && !trade.includes('FMB Find a Builder') && !trade.some(n => /NFRC/.test(n)) && !trade.includes('Rated People') && !trade.includes('Bark'), trade.join(', '), '');
  const fb = tier(v, 'uk_core').rows.find(r => r.directory.name === 'Facebook'), ig = tier(v, 'uk_core').rows.find(r => r.directory.name === 'Instagram');
  chk('Facebook and Instagram rows take the page links from onboarding (an Instagram handle becomes the profile URL)', fb.row.live_url === 'https://www.facebook.com/edensedgelandscaping' && fb.row.live_url_source === 'onboarding' && ig.row.live_url === 'https://www.instagram.com/edensedge/' && fb.row.done_by_effective === 'client', fb.row.live_url + ' | ' + ig.row.live_url, '');
  chk('a blank row: unchecked, not started, the directory default for done by, the listings email as the login email', fb.row.listed === 'unchecked' && fb.row.nap_status === 'unchecked' && fb.row.status === 'not_started' && fb.row.done_by === null && fb.row.login_email_effective === v.email && fb.row.saved === false, JSON.stringify(fb.row), '');
  chk('the tiles start at zero', v.stats.core.pct === 0 && v.stats.core.of === 13 && v.stats.overall.of === 13 + 11 + tier(v, 'trade_niche').count && v.stats.nap.unchecked === v.stats.overall.of && v.stats.banner.length === 0, JSON.stringify(v.stats), '');

  // ── Approve three towns ──
  const tierRow = (cid, pid, name, t) => pool.query(`INSERT INTO client_location_tiers (client_id, place_id, name, type, outcome, tier, phase, source, population, approved_at, approved_by, run_at) VALUES ($1, $2, $3, 'town', 'tier', $4, $4, 'scored', 20000, NOW(), 'test', NOW())`, [cid, pid, name, t]);
  await tierRow(edens, 'E2', 'Romsey', 1); await tierRow(edens, 'E3', 'Winchester', 1); await tierRow(edens, 'E4', 'Eastleigh', 2);
  v = await C.view(edens);
  const loc = names(v, 'location');
  chk('after approval: the territory is the base town plus the approved towns, their councils and county', v.territory.approved && v.territory.towns.join() === 'Southampton,Romsey,Winchester,Eastleigh' && v.territory.councils.includes('Southampton') && v.territory.councils.includes('Test Valley') && v.territory.councils.includes('Winchester') && v.territory.counties.join() === 'Hampshire', JSON.stringify(v.territory), '');
  chk('the location block: BWC Southampton (the base council), BWC Hampshire (the districts), Hampshire Chamber (the county), the Southampton rows, the pattern networks', loc.includes('Buy With Confidence (Southampton)') && loc.includes('Buy With Confidence (Hampshire)') && loc.includes('Hampshire Chamber of Commerce') && loc.includes('In Common Southampton') && loc.includes('Findit Southampton pages') && loc.includes('LocalPage UK') && loc.includes('Reach plc newspaper directories'), loc.join(', '), '');
  chk('no other area\'s rows: no Bristol scheme, no Nub News, no Dorset chamber, no city sites elsewhere', !loc.some(n => /Bristol|Nub News|Dorset|Plymouth|Crewe/.test(n)), loc.join(', '), '');
  chk('the service areas on the NAP are the GBP areas from the approval', v.nap.service_areas.join() === 'Romsey,Winchester,Eastleigh', v.nap.service_areas.join(), '');
  chk('the location tier is P1 first: BWC Southampton before the chamber', loc.indexOf('Buy With Confidence (Southampton)') < loc.indexOf('Hampshire Chamber of Commerce'), loc.join(', '), '');

  // ── A storefront roofer in Bristol, a dog walker in Crewe ──
  await tierRow(kestrel, 'E6', 'Bristol', 1);
  const k = await C.view(kestrel);
  chk('a storefront client sees the shopfront only rows (UK Core 16) and its address expanded', tier(k, 'uk_core').count === 16 && k.nap.address === '12 High Street, Bristol BS1 1AA' && k.service_area === false, tier(k, 'uk_core').count + ' ' + k.nap.address, '16');
  const kt = names(k, 'trade_niche');
  chk('the roofer trade block: NFRC, CORC, Checkatrade; no BALI', kt.some(n => /NFRC/.test(n)) && kt.some(n => /CORC/.test(n)) && kt.includes('Checkatrade') && !kt.some(n => /BALI/.test(n)), kt.join(', '), '');
  chk('the roofer in Bristol: BWC Bristol and Business West, no Hampshire', names(k, 'location').includes('Buy With Confidence (Bristol)') && names(k, 'location').includes('Business West Chambers of Commerce') && !names(k, 'location').some(n => /Hampshire/.test(n)), names(k, 'location').join(', '), '');
  await tierRow(paws, 'E5', 'Crewe', 1);
  const p = await C.view(paws);
  const pt = names(p, 'trade_niche');
  chk('the dog walker: NarpsUK and The Good Dog Guide; no Checkatrade, MyBuilder, Which? or TrustMark (pet services excluded); Bark is in UK Secondary', pt.some(n => /NarpsUK/.test(n)) && pt.includes('The Good Dog Guide') && !pt.includes('Checkatrade') && !pt.includes('MyBuilder') && !pt.includes('Which? Trusted Traders') && !pt.includes('TrustMark') && names(p, 'uk_secondary').includes('Bark'), pt.join(', '), '');
  chk('the dog walker in Crewe: Nub News Crewe (the town) and South Cheshire Chamber, no Hampshire', names(p, 'location').includes('Nub News Crewe') && names(p, 'location').includes('South Cheshire Chamber of Commerce and Industry') && !names(p, 'location').some(n => /Hampshire/.test(n)), names(p, 'location').join(', '), '');
  chk('no Facebook link on the record: the row has no URL', tier(p, 'uk_core').rows.find(r => r.directory.name === 'Facebook').row.live_url === '' && tier(p, 'uk_core').rows.find(r => r.directory.name === 'Instagram').row.live_url === 'https://www.instagram.com/pawsabouttown/', '', '');

  // ── Saving rows ──
  const yell = tier(v, 'uk_core').rows.find(r => r.directory.name === 'Yell').directory;
  const saved = await C.saveRow(edens, yell.id, { listed: 'yes', live_url: 'https://www.yell.com/biz/edens-edge-landscaping-southampton-1/', status: 'live', onepassword_item: 'Edens Edge — Yell' });
  chk('saveRow makes the row on first write and keeps the fields', saved.listed === 'yes' && saved.status === 'live' && saved.onepassword_item === 'Edens Edge — Yell' && /yell\.com/.test(saved.live_url), JSON.stringify(saved), '');
  await C.saveRow(edens, yell.id, { nap_status: 'mismatch', nap_diffs: [{ field: 'phone', expected: '07850 412717', found: '023 8000 0000' }] });
  const bing = tier(v, 'uk_core').rows.find(r => r.directory.name === 'Bing Places').directory;
  await C.saveRow(edens, bing.id, { status: 'waiting_on_client', done_by: 'client' });
  const scoot = tier(v, 'uk_core').rows.find(r => r.directory.name === 'Scoot').directory;
  await C.saveRow(edens, scoot.id, { listed: 'no', status: 'wrong_location' });
  v = await C.view(edens);
  const yr = tier(v, 'uk_core').rows.find(r => r.directory.name === 'Yell').row;
  chk('the view joins the saved row: listed, URL (saved, not from onboarding), status live, the 1Password item, the mismatch', yr.listed === 'yes' && yr.live_url_source === 'saved' && yr.status === 'live' && yr.onepassword_item === 'Edens Edge — Yell' && yr.nap_status === 'mismatch' && yr.nap_diffs[0].field === 'phone' && yr.saved, JSON.stringify(yr), '');
  chk('the tiles: core 1 of 13 (8%), one mismatch, one wrong location, one waiting on client', v.stats.core.done === 1 && v.stats.core.pct === 8 && v.stats.nap.mismatch === 1 && v.stats.wrong_location === 1 && v.stats.waiting_on_client === 1 && v.stats.overall.done === 1, JSON.stringify(v.stats), '');
  chk('the NAP banner in plain words', v.stats.banner.length === 1 && v.stats.banner[0].text === 'Yell: phone mismatch: listing shows 023 8000 0000, expected 07850 412717', JSON.stringify(v.stats.banner), '');
  chk('done by: the override wins over the directory default', tier(v, 'uk_core').rows.find(r => r.directory.name === 'Bing Places').row.done_by_effective === 'client', '', '');
  const bad = await C.saveRow(edens, yell.id, { status: 'gone' }).catch(e => e);
  chk('a bad status is refused with a 400', bad instanceof Error && bad.status === 400 && /status must be one of/.test(bad.message), bad && bad.message, '');
  const badUrl = await C.saveRow(edens, yell.id, { live_url: 'yell.com/x' }).catch(e => e);
  chk('a listing URL without http is refused', badUrl instanceof Error && badUrl.status === 400, badUrl && badUrl.message, '');
  chk('the applies rule on its own: niches, not_niches, councils, towns, areas', CL.applies({ applies_to: { kind: 'niches', niches: ['roofers'] } }, { nicheKey: 'roofers' }) && !CL.applies({ applies_to: { kind: 'not_niches', niches: ['dog-walkers'] } }, { nicheKey: 'dog-walkers' }) && CL.applies({ applies_to: { kind: 'councils', councils: ['Test Valley'] } }, { councils: new Set(['test valley']) }) && !CL.applies({ applies_to: { kind: 'towns', towns: ['Crewe'] } }, { towns: new Set(['southampton']) }) && CL.applies({ applies_to: { kind: 'areas', counties: ['Hampshire'], towns: [] } }, { counties: new Set(['hampshire']), towns: new Set() }), '', '');

  // ── The routes ──
  const app = express(); app.use(express.json());
  mountClientCitationsApi(app, { pool, clientCitations: C, log: quiet });
  const srv = http.createServer(app); await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const j = (p, o = {}) => new Promise((resolve, reject) => {
    const body = o.body ? JSON.stringify(o.body) : null;
    const req = http.request(base + p, { method: o.method || 'GET', headers: { 'Content-Type': 'application/json', ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}) } }, res => { let t = ''; res.on('data', d => { t += d; }); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(t) }); } catch (e) { reject(e); } }); });
    req.on('error', reject); if (body) req.write(body); req.end();
  });
  const g = await j(`/api/clients/${edens}/citations`);
  chk('GET citations: the NAP, email, tiers, stats and options', g.status === 200 && g.body.nap.name === 'Edens Edge Landscaping' && g.body.tiers.length === 4 && g.body.stats.core.of === 13 && g.body.options.statuses.length === 9, JSON.stringify(Object.keys(g.body)), '');
  const put = await j(`/api/clients/${edens}/citations/rows/${bing.id}`, { method: 'PUT', body: { status: 'submitted', notes: 'Imported from GBP on 3 Nov' } });
  chk('PUT a row returns the whole view with the change', put.status === 200 && put.body.tiers.find(t => t.tier === 'uk_core').rows.find(r => r.directory.name === 'Bing Places').row.status === 'submitted' && put.body.stats.waiting_on_client === 0, '', '');
  const nf = await j(`/api/clients/${crypto.randomUUID()}/citations`);
  chk('an unknown client is a 404', nf.status === 404, nf.status, 404);
  const badPut = await j(`/api/clients/${edens}/citations/rows/${bing.id}`, { method: 'PUT', body: { listed: 'maybe' } });
  chk('a bad value is a 400', badPut.status === 400 && /listed must be/.test(badPut.body.error), JSON.stringify(badPut.body), '');
  srv.close();

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
