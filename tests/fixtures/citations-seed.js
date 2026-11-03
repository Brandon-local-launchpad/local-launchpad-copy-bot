'use strict';
// Fixture: the citation directory database seed (citations/seed.js, citations/store.js) and the
// Directories API (citations/routes.js) on pg-mem. The real CSVs in data/citations/: every tab
// read, the tier per tab, the column mapping (cost, priority, verification, done by, SAB skip,
// live check), the dedupe and merges, the explicit skips, Rated People retired, the Trade
// Platforms niche rule (pets), the Places lookup, the Southampton rows, the Nub News towns.
// The store: seed, reseed only when the files change, hand edits kept across a reseed, add,
// edit, retire, unretire, the DA fill with a fake DataForSEO and its cost log, the routes.
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const S = require(path.join(root, 'citations/seed.js'));
const { ensureCitationTables, createCitationStore } = require(path.join(root, 'citations/store.js'));
const { mountCitationsApi } = require(path.join(root, 'citations/routes.js'));
const DFS = require(path.join(root, 'citations/dataforseo.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: citations directory seed and database ===\n');

(async () => {
  // ── The parse ──
  const P = S.parseSeed();
  const by = name => P.rows.find(r => r.name === name);
  chk('every tab is read', S.TABS.every(t => P.tabs.includes(t)), P.tabs.join(', '), S.TABS.join(', '));
  chk('no seed problems apart from chambers with no Places row', P.problems.every(p => p.tab === 'Chambers' && /no Places row/.test(p.problem)), JSON.stringify(P.problems.filter(p => !(p.tab === 'Chambers' && /no Places row/.test(p.problem)))), '[]');
  chk('16 UK Core, 11 UK Secondary rows', P.counts.by_tier.uk_core === 16 && P.counts.by_tier.uk_secondary === 11, JSON.stringify(P.counts.by_tier), '16 / 11');
  chk('301 places', P.places.length === 301, P.places.length, 301);
  const yell = by('Yell');
  chk('Yell: uk_core, P1, free, email, va, applies to every client, confirmed live', yell && yell.tier === 'uk_core' && yell.priority === 'P1' && yell.cost === 'free' && yell.verification_method === 'email' && yell.done_by === 'va' && yell.applies_to.kind === 'all' && !yell.needs_live_check && yell.domain === 'yell.com', JSON.stringify(yell), '');
  chk('Apple Business Connect, TomTom, HERE: skip for service area (shopfronts only)', ['Apple Business Connect', 'TomTom', 'HERE'].every(n => by(n) && by(n).skip_for_service_area), '', 'all three');
  chk('Facebook: done by the client, no verification; Instagram P2', by('Facebook').done_by === 'client' && by('Facebook').verification_method === 'none' && by('Instagram').priority === 'P2', '', '');
  chk('Yelp UK: phone verification; Bark: code (SMS); Bing: unknown (import from GBP, kept in notes)', by('Yelp UK').verification_method === 'phone' && by('Bark').verification_method === 'code' && by('Bing Places').verification_method === 'unknown', '', '');
  chk('Scoot: needs a live check (unconfirmed)', by('Scoot').needs_live_check === true, '', '');
  chk('Bark: one row (UK Secondary wins over Trade Platforms), open to every niche', by('Bark').tier === 'uk_secondary' && by('Bark').applies_to.kind === 'all' && P.rows.filter(r => r.domain === 'bark.com').length === 1 && P.skipped.some(s => s.tab === 'Trade Platforms' && s.name === 'Bark'), '', '');
  chk('Checkatrade, MyBuilder, Which?, TrustMark: every niche except the pet niches', ['Checkatrade', 'MyBuilder', 'Which? Trusted Traders', 'TrustMark'].every(n => by(n).applies_to.kind === 'not_niches' && by(n).applies_to.niches.join(',') === 'dog-grooming,dog-training,dog-walkers'), '', '');
  chk('Houzz UK: the four design and build niches only', by('Houzz UK').applies_to.kind === 'niches' && by('Houzz UK').applies_to.niches.join(',') === 'landscapers,builders,kitchen-bathroom,roofers', JSON.stringify(by('Houzz UK').applies_to), '');
  chk('Houzz UK (Curtains Blinds & Shutters) is its own row for blinds', by('Houzz UK (Curtains Blinds & Shutters)') && by('Houzz UK (Curtains Blinds & Shutters)').applies_to.niches.join() === 'blinds-curtains', '', '');
  chk('Rated People: seeded retired with the reason', by('Rated People').retired && /closed 16 Sep 2026/.test(by('Rated People').retired_reason), '', '');
  chk('Buy With Confidence in Trade Platforms and Local Networks skipped (the council rows cover it)', P.skipped.some(s => s.tab === 'Trade Platforms' && s.name === 'Buy With Confidence') && P.skipped.some(s => s.tab === 'Local Networks' && /^Buy With Confidence/.test(s.name)), '', '');
  chk('Trades & Niche: BALI is landscapers, P1, membership, client; FMB covers builders and loft extensions (merged)', by('BALI (British Association of Landscape Industries)').applies_to.niches.join() === 'landscapers' && by('BALI (British Association of Landscape Industries)').cost === 'membership' && by('BALI (British Association of Landscape Industries)').done_by === 'client' && by('FMB Find a Builder').applies_to.niches.join() === 'builders,loft-extensions', '', '');
  chk('The Good Dog Guide: one row for grooming, training and walkers, the best priority (P2)', by('The Good Dog Guide').applies_to.niches.join() === 'dog-grooming,dog-training,dog-walkers' && by('The Good Dog Guide').priority === 'P2', JSON.stringify(by('The Good Dog Guide').applies_to) + ' ' + by('The Good Dog Guide').priority, '');
  chk('Council schemes: one row per council (BWC Hampshire lists the county and its districts; BWC Southampton its own)', by('Buy With Confidence (Hampshire)').applies_to.councils.includes('Eastleigh') && by('Buy With Confidence (Southampton)').applies_to.councils.join() === 'Southampton' && P.rows.filter(r => /^Buy With Confidence \(/.test(r.name)).length >= 60, P.rows.filter(r => /^Buy With Confidence \(/.test(r.name)).length, '>= 60');
  chk('"Argyll and Bute Council" is stored as "Argyll and Bute"', by('Buy With Confidence (Argyll and Bute)').applies_to.councils.join() === 'Argyll and Bute', by('Buy With Confidence (Argyll and Bute)').applies_to.councils.join(), '');
  chk('Chambers: Hampshire Chamber tied to Hampshire and its towns, P2, membership, client decision, the member directory URL', by('Hampshire Chamber of Commerce').applies_to.counties.join() === 'Hampshire' && by('Hampshire Chamber of Commerce').applies_to.towns.includes('Southampton') && by('Hampshire Chamber of Commerce').priority === 'P2' && by('Hampshire Chamber of Commerce').cost === 'membership' && by('Hampshire Chamber of Commerce').done_by === 'client_decision', JSON.stringify(by('Hampshire Chamber of Commerce').applies_to), '');
  chk('Local Networks: the pattern networks are location rows for every client with a live check; the rule lines are skipped', ['Reach plc newspaper directories', 'National World Findit', 'LocalPage UK'].every(n => by(n) && by(n).tier === 'location' && by(n).applies_to.kind === 'all' && by(n).needs_live_check) && P.skipped.filter(s => s.tab === 'Local Networks' && /rule line/.test(s.reason)).length === 7 && !by('Tourism sites (Visit <place>)'), '', '');
  const nub = P.rows.filter(r => /^Nub News /.test(r.name));
  chk('Nub News: 34 town rows with the town site URL, Stoke carries Stoke-on-Trent, Kingston carries Kingston upon Thames', nub.length === 34 && by('Nub News Stoke').url === 'https://stoke.nub.news/directories' && by('Nub News Stoke').applies_to.towns.includes('Stoke-on-Trent') && by('Nub News Kingston').applies_to.towns.includes('Kingston upon Thames') && by('Nub News Shepton Mallet').url === 'https://sheptonmallet.nub.news/directories', nub.length, 34);
  chk('City local sites from the Places tab: Find It in Plymouth (free, VA, no URL, live check) tied to Plymouth; Swansea has two', by('Find It in Plymouth') && by('Find It in Plymouth').cost === 'free' && by('Find It in Plymouth').url === '' && by('Find It in Plymouth').needs_live_check && by('Find It in Plymouth').applies_to.towns.join() === 'Plymouth' && by("It's Local Swansea") && by('4theRegion Directory'), '', '');
  chk('Southampton Example: In Common and the Findit page added for Southampton; BWC, the chamber and LocalPage skipped as duplicates', by('In Common Southampton').applies_to.towns.join() === 'Southampton' && by('Findit Southampton pages') && P.skipped.filter(s => s.tab === 'Southampton Example').length === 4 && !by('LocalPage UK Southampton'), P.skipped.filter(s => s.tab === 'Southampton Example').map(s => s.name).join('; '), '4 skipped');
  chk('every row has a valid tier, cost, priority, verification, done_by and a key', P.rows.every(r => S.TIERS.includes(r.tier) && S.COSTS.includes(r.cost) && S.PRIORITIES.includes(r.priority) && S.VERIFICATIONS.includes(r.verification_method) && S.DONE_BY.includes(r.done_by) && r.key) && new Set(P.rows.map(r => r.key)).size === P.rows.length, '', '');
  chk('domainOf: www stripped, the registrable domain (biz.yelp.co.uk is yelp.co.uk, business.nextdoor.co.uk is nextdoor.co.uk), a pattern host resolves to its fixed part, a pattern with no fixed host is blank', S.domainOf('https://www.yell.com/x') === 'yell.com' && S.domainOf('https://biz.yelp.co.uk/') === 'yelp.co.uk' && S.domainOf('https://business.nextdoor.co.uk/') === 'nextdoor.co.uk' && S.domainOf('https://search.napit.org.uk/') === 'napit.org.uk' && S.domainOf('https://businessconnect.apple.com/') === 'apple.com' && S.domainOf('https://<town>.nub.news/directories') === 'nub.news' && S.domainOf('https://directory.<paper-domain>/search') === '' && S.domainOf('') === '', [S.domainOf('https://biz.yelp.co.uk/'), S.domainOf('https://search.napit.org.uk/')].join(), '');
  chk('costOf: Free (paid upgrades) → free; Annual membership fee → membership; £248 assessment → paid; blank → fallback', S.costOf('Free (paid upgrades)') === 'free' && S.costOf('Annual membership fee (not published)') === 'membership' && S.costOf('£248 assessment, then £69 a month') === 'paid' && S.costOf('', 'membership') === 'membership', '', '');
  const place = P.places.find(p => p.name === 'Southampton');
  chk('Places: Southampton is a city in Hampshire, council Southampton, BWC (Southampton), Hampshire Chamber', place && place.type === 'city' && place.county === 'Hampshire' && place.councils.join() === 'Southampton' && place.schemes.join() === 'Buy With Confidence (Southampton)' && place.chambers.join() === 'Hampshire Chamber of Commerce', JSON.stringify(place), '');

  // ── The store on pg-mem ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await ensureCitationTables(pool);
  const quiet = { log() {}, info() {}, warn() {}, error() {} };
  // A fake DataForSEO: bulk ranks for whatever domains are asked, $0.02 a call
  const asked = [];
  const fakeDfs = { configured: () => true, bulkRanks: async domains => { asked.push(domains.length); return { ranks: new Map(domains.map(d => [d, d === 'yell.com' ? 640 : d === 'in-common.co.uk' ? null : 100])), cost: 0.02, calls: 1 }; } };
  const store = createCitationStore(pool, { log: quiet, dfs: fakeDfs, env: { DATAFORSEO_LOGIN: 'x', DATAFORSEO_PASSWORD: 'y' } });
  const r1 = await store.seedDirectories();
  chk('seed: every parsed row inserted, places loaded, the version recorded', r1.seeded && r1.inserted === P.rows.length && r1.updated === 0 && r1.places === 301 && (await store.seedState()).version === S.seedVersion(), JSON.stringify({ seeded: r1.seeded, inserted: r1.inserted, updated: r1.updated, places: r1.places }), `inserted ${P.rows.length}`);
  chk('seed: DA filled from the fake DataForSEO for every row with a domain, the spend logged', r1.da.filled > 0 && asked[0] === P.rows.filter(r => r.domain).length - 0 && (await store.costs())[0].kind === 'directory_da' && (await store.costs())[0].cost_usd === 0.02, JSON.stringify(r1.da) + ' asked ' + asked.join(','), '');
  const yellRow = await store.byKey('yell');
  chk('Yell has DA 640 from the domain rank; In Common (no rank) stays blank', yellRow.da === 640 && yellRow.da_source === 'dataforseo domain rank' && (await store.byKey('in-common-southampton')).da === null, yellRow.da, 640);
  const r2 = await store.seedDirectories();
  chk('a second seed with unchanged files does nothing', r2.seeded === false && r2.reason === 'up to date', JSON.stringify(r2), 'up to date');
  chk('list hides retired rows by default; Rated People is retired', !(await store.list()).some(d => d.key === 'rated-people') && (await store.list({ includeRetired: true })).find(d => d.key === 'rated-people').retired, '', '');
  // A hand edit survives a forced reseed; an untouched row follows the seed
  await store.update(yellRow.id, { priority: 'P2', notes: 'Edited by hand' });
  const r3 = await store.seedDirectories({ force: true, fillDa: false });
  const yell2 = await store.byKey('yell');
  chk('reseed (forced): the hand edited row keeps its values, the others are updated, nothing inserted', r3.seeded && r3.inserted === 0 && r3.kept === 1 && r3.updated === P.rows.length - 1 && yell2.priority === 'P2' && yell2.notes === 'Edited by hand' && yell2.hand_edited && yell2.da === 640, JSON.stringify({ inserted: r3.inserted, kept: r3.kept, updated: r3.updated, priority: yell2.priority }), '');
  // Add, edit, retire, unretire
  const added = await store.create({ name: 'Hampshire Trader Hub', url: 'https://www.hampshiretraderhub.co.uk/add', tier: 'location', type: 'Local directory', cost: 'free', priority: 'P3', applies_to: { kind: 'towns', towns: ['Southampton', 'Eastleigh'] } });
  chk('add by hand: key from the name, domain from the URL, hand added (not seeded), applies to the towns', added.key === 'hampshire-trader-hub' && added.domain === 'hampshiretraderhub.co.uk' && !added.seeded && added.hand_edited && added.applies_to.towns.join() === 'Southampton,Eastleigh' && added.verification_method === 'unknown', JSON.stringify(added.applies_to), '');
  let bad = null; try { await store.create({ name: 'Nope', tier: 'gold' }); } catch (e) { bad = e; }
  chk('a bad tier is refused with a 400', bad && bad.status === 400 && /tier must be one of/.test(bad.message), bad && bad.message, '');
  const ret = await store.retire(added.id, 'Site closed');
  chk('retire sets the date and reason; unretire clears them', ret.retired && ret.retired_reason === 'Site closed' && !(await store.unretire(added.id)).retired, '', '');
  chk('domains(): every domain once, including retired rows', (await store.domains()).includes('yell.com') && (await store.domains()).includes('ratedpeople.com') && new Set(await store.domains()).size === (await store.domains()).length, '', '');
  chk('byDomain finds Yell from www.yell.com', (await store.byDomain('www.yell.com')).key === 'yell', '', '');
  const hants = await store.countiesForCouncils(['Southampton', 'Eastleigh']);
  chk('countiesForCouncils: Southampton and Eastleigh are in Hampshire', hants.length === 1 && hants[0].name === 'Hampshire', hants.map(p => p.name).join(), 'Hampshire');
  const pl = await store.placesByNames(['Stoke-on-Trent', 'southampton']);
  chk('placesByNames matches on the normalised name', pl.length === 2 && pl.some(p => p.name === 'Stoke-on-Trent') && pl.some(p => p.name === 'Southampton'), pl.map(p => p.name).join(), '');

  // ── The DataForSEO call shape with a fake fetch ──
  const calls = [];
  const fakeFetch = async (url, init) => { calls.push({ url, body: JSON.parse(init.body), auth: init.headers.Authorization }); return { ok: true, status: 200, json: async () => ({ status_code: 20000, tasks: [{ status_code: 20000, cost: 0.02, result: [{ items: [{ target: 'yell.com', rank: 640 }, { target: 'bark.com', rank: null }] }] }] }) }; };
  const br = await DFS.bulkRanks(['www.yell.com', 'bark.com', 'yell.com'], { env: { DATAFORSEO_LOGIN: 'me', DATAFORSEO_PASSWORD: 'secret' }, fetchImpl: fakeFetch });
  chk('bulkRanks: one task, the domains deduped without www, basic auth, ranks by domain, the cost', calls.length === 1 && calls[0].url.endsWith('/backlinks/bulk_ranks/live') && calls[0].body[0].targets.join() === 'yell.com,bark.com' && calls[0].auth.startsWith('Basic ') && br.ranks.get('yell.com') === 640 && br.ranks.get('bark.com') === null && br.cost === 0.02, JSON.stringify([...br.ranks]), '');
  let err = null; try { await DFS.serp('x', { env: { DATAFORSEO_LOGIN: 'me', DATAFORSEO_PASSWORD: 'secret' }, fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ status_code: 20000, tasks: [{ status_code: 40101, status_message: 'Auth error for me:secret' }] }) }) }); } catch (e) { err = e; }
  chk('a failing task throws a safe message (no credentials in it), no retry', err && err.status === 40101 && !/secret/.test(err.message) && err.attempts === 1, err && err.message, '');

  // ── The routes ──
  const app = express(); app.use(express.json());
  mountCitationsApi(app, { pool, store, log: quiet });
  const srv = http.createServer(app); await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  // http.request, not fetch: undici's keep alive sockets trip a libuv assertion at exit on Windows
  const j = (p, o = {}) => new Promise((resolve, reject) => {
    const body = o.body ? JSON.stringify(o.body) : null;
    const req = http.request(base + p, { method: o.method || 'GET', headers: { 'Content-Type': 'application/json', ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}) } }, res => { let t = ''; res.on('data', d => { t += d; }); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(t) }); } catch (e) { reject(e); } }); });
    req.on('error', reject); if (body) req.write(body); req.end();
  });
  const g = await j('/api/citations/directories');
  chk('GET directories: every row (retired included), the counts, the seed state, the niche list', g.status === 200 && g.body.directories.length === P.rows.length + 1 && g.body.counts.retired === 1 && g.body.seed.version === S.seedVersion() && g.body.niches.length === 28, JSON.stringify(g.body.counts), '');
  const post = await j('/api/citations/directories', { method: 'POST', body: { name: 'Test Dir', url: 'https://testdir.example/add', tier: 'uk_secondary', applies_to: { kind: 'niches', niches: ['roofers'] } } });
  chk('POST adds a row', post.status === 200 && post.body.directory.key === 'test-dir' && post.body.directory.applies_to.niches.join() === 'roofers', JSON.stringify(post.body), '');
  const put = await j(`/api/citations/directories/${post.body.directory.id}`, { method: 'PUT', body: { priority: 'P1', skip_for_service_area: true } });
  chk('PUT edits a row', put.status === 200 && put.body.directory.priority === 'P1' && put.body.directory.skip_for_service_area === true, JSON.stringify(put.body), '');
  const rt = await j(`/api/citations/directories/${post.body.directory.id}/retire`, { method: 'POST', body: { reason: 'test' } });
  chk('POST retire', rt.status === 200 && rt.body.directory.retired, '', '');
  const badPut = await j(`/api/citations/directories/${post.body.directory.id}`, { method: 'PUT', body: { cost: 'cheap' } });
  chk('a bad value is a 400 with the reason', badPut.status === 400 && /cost must be one of/.test(badPut.body.error), JSON.stringify(badPut.body), '');
  const costs = await j('/api/citations/costs');
  chk('GET costs lists the DA spend', costs.status === 200 && costs.body.costs.length === 1 && costs.body.costs[0].kind === 'directory_da', '', '');
  srv.close();

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
