'use strict';
// Fixture: H1 research v2 (h1-research/*) with a stubbed DataForSEO and pg-mem. Batching at
// 1,000 keywords, the 90-day cache, every page type researched (services too), the >10 rule
// applied at once (H1 Added), the pattern fallback, keyword groups (normalised text; identical
// volume AND CPC, never volume alone), own name over a synonym, losers falling to their next
// candidate, pattern collisions as H1 conflicts, hub pages, manual H1s claiming first and never
// overwritten, re-research (preview, then apply) never touching manual or Copy Generated pages,
// no accept step, a job surviving a restart, a failed call leaving the page map intact, and
// credentials never appearing in a log, an error or the job.
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const H = require(path.join(root, 'h1-research/research.js'));
const C = require(path.join(root, 'h1-research/claims.js'));
const D = require(path.join(root, 'h1-research/dataforseo.js'));
const { ensureH1Tables, createH1Research } = require(path.join(root, 'h1-research/service.js'));
const { ensurePageMapTables, createPageMapStore } = require(path.join(root, 'page-map/store.js'));
const { mountPageMapApi } = require(path.join(root, 'page-map/routes.js'));
const routes = require(path.join(root, 'fillout/routes.js'));
const S = require(path.join(root, 'tools/seed-edens-edge.js'));
const fs = require('fs');
const { newDb, DataType } = require('pg-mem');
const { ensureFilloutTables, createFilloutService } = require(path.join(root, 'fillout/service.js'));
const { ensureAudioBlobTable, createPgAudioStore } = require(path.join(root, 'fillout/audio-store.js'));
const { ensurePriceTables } = require(path.join(root, 'fillout/prices.js'));
const { ensureAllocationColumns } = require(path.join(root, 'fillout/allocation.js'));
const AS = require(path.join(root, 'fillout/additional-services.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: H1 research (stubbed DataForSEO) ===\n');
const quiet = { log() {}, info() {}, warn() {}, error() {} };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const FAKE = { DATAFORSEO_LOGIN: 'login-SECRET-xyz', DATAFORSEO_PASSWORD: 'pw-SECRET-123' };
const B64 = Buffer.from(`${FAKE.DATAFORSEO_LOGIN}:${FAKE.DATAFORSEO_PASSWORD}`).toString('base64');
const leaks = s => [FAKE.DATAFORSEO_LOGIN, FAKE.DATAFORSEO_PASSWORD, B64].some(v => String(s).includes(v));

// A fake DataForSEO endpoint: volumes from a table, everything else null
const okReply = (keywords, table) => ({ ok: true, status: 200, statusText: 'OK', json: async () => ({ status_code: 20000, status_message: 'Ok.', cost: 0.09, tasks: [{ status_code: 20000, status_message: 'Ok.', cost: 0.09, result: keywords.map(k => (k in table ? { keyword: k, search_volume: table[k][0], cpc: table[k][1] } : { keyword: k, search_volume: null, cpc: null })) }] }) });

(async () => {
  // ── The DataForSEO client ──
  const calls = [];
  const fetchStub = async (url, opts) => { const body = JSON.parse(opts.body); calls.push({ url, n: body[0].keywords.length, auth: opts.headers.Authorization, loc: body[0].location_code }); return okReply(body[0].keywords, { 'kw 1': [500, 1.2] }); };
  const many = Array.from({ length: 1500 }, (_, i) => `kw ${i}`);
  const sv = await D.searchVolume(many, { env: FAKE, fetchImpl: fetchStub });
  chk('Batching: 1,500 keywords go in 2 calls of at most 1,000, United Kingdom (2826); the costs add up', calls.length === 2 && calls[0].n === 1000 && calls[1].n === 500 && calls.every(c => c.loc === 2826) && sv.calls === 2 && sv.cost === 0.18 && sv.results.size === 1500 && sv.results.get('kw 1').volume === 500, JSON.stringify([calls.map(c => c.n), sv.calls, sv.cost]), '[[1000,500],2,0.18]');
  chk('A keyword DataForSEO leaves out comes back as null, not missing', sv.results.get('kw 2').volume === null && sv.results.get('kw 2').status === 'null', '', '');
  const errStub = async () => ({ ok: false, status: 401, statusText: 'Unauthorized', json: async () => ({ status_code: 40100, status_message: `Bad login ${FAKE.DATAFORSEO_LOGIN} / ${FAKE.DATAFORSEO_PASSWORD} (Basic ${B64})` }) });
  const e1 = await D.searchVolume(['a'], { env: FAKE, fetchImpl: errStub }).then(() => null, e => e);
  chk('A failed call: status code and message only, with the credentials scrubbed even when the reply echoes them', e1 && e1.status === 401 && /Bad login/.test(e1.message) && !leaks(e1.message) && !leaks(JSON.stringify(e1)), e1 && e1.message, '');
  const e2 = await D.searchVolume(['a'], { env: FAKE, fetchImpl: async () => { throw new Error(`connect failed for ${FAKE.DATAFORSEO_PASSWORD}`); } }).then(() => null, e => e);
  chk('A network failure is scrubbed too', e2 && e2.status === 'network' && !leaks(e2.message), e2 && e2.message, '');
  const e3 = await D.searchVolume(['a'], { env: {}, fetchImpl: fetchStub }).then(() => null, e => e);
  chk('Missing credentials: a plain "not set up" error and no call made', e3 && e3.status === 'config' && /not set up/.test(e3.message) && calls.length === 2, e3 && e3.message, '');
  // Busy replies (DataForSEO 50301 "Too many requests", HTTP 429/5xx) are retried after a wait
  const busy = { ok: true, status: 200, json: async () => ({ status_code: 20000, cost: 0, tasks: [{ status_code: 50301, status_message: 'Too many requests.', cost: 0 }] }) };
  let seq = [busy, async (o) => okReply(JSON.parse(o.body)[0].keywords, { a: [40, 1] })], seen = 0; const waits = [], notes = [];
  const busyThenOk = async (u, o) => { const x = seq[Math.min(seen++, seq.length - 1)]; return typeof x === 'function' ? x(o) : x; };
  const rr = await D.searchVolume(['a'], { env: FAKE, fetchImpl: busyThenOk, retryDelays: [7, 9, 11], sleep: async ms => { waits.push(ms); }, onRetry: n => notes.push(n) });
  chk('A 50301 "Too many requests" reply is retried after a wait and then succeeds; only the successful call is charged', rr.results.get('a').volume === 40 && rr.calls === 2 && rr.cost === 0.09 && waits.join() === '7' && notes.length === 1 && notes[0].status === 50301 && notes[0].attempt === 1 && notes[0].of === 3 && /Too many requests/.test(notes[0].message), JSON.stringify([rr.calls, rr.cost, waits, notes]), '');
  seen = 0; seq = [busy]; waits.length = 0;
  const e4 = await D.searchVolume(['a'], { env: FAKE, fetchImpl: busyThenOk, retryDelays: [7, 9, 11], sleep: async ms => { waits.push(ms); } }).then(() => null, e => e);
  chk('Still busy after every retry: fails with the status and message, after 4 attempts and waits 7, 9, 11', e4 && e4.status === 50301 && e4.attempts === 4 && /Too many requests/.test(e4.message) && waits.join() === '7,9,11', JSON.stringify(e4 && [e4.status, e4.attempts, waits]), '');
  for (const [label, st] of [['HTTP 429', 429], ['HTTP 503', 503], ['DataForSEO 40202', 40202], ['a timeout', 'timeout'], ['a network error', 'network']]) chk(`${label} counts as busy (retried)`, D.isBusy(st), st, true);
  for (const [label, st] of [['HTTP 401 (credentials)', 401], ['DataForSEO 40200 (no credit)', 40200], ['DataForSEO 40100', 40100]]) chk(`${label} is not retried`, !D.isBusy(st), st, false);
  seen = 0; waits.length = 0;
  const e5 = await D.searchVolume(['a'], { env: FAKE, fetchImpl: errStub, retryDelays: [7, 9, 11], sleep: async ms => { waits.push(ms); } }).then(() => null, e => e);
  chk('Bad credentials fail at once, with no wait', e5 && e5.status === 401 && e5.attempts === 1 && !waits.length, JSON.stringify(e5 && [e5.status, e5.attempts]), '');
  const bal = await D.balance({ env: FAKE, fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ status_code: 20000, tasks: [{ result: [{ money: { balance: 7.5 } }] }] }) }) });
  chk('The balance comes from /v3/appendix/user_data money.balance', bal === 7.5, bal, 7.5);

  // ── v2 rules (h1-research/claims.js), pure ──
  const vol = m => new Map(Object.entries(m).map(([k, v]) => [k, { volume: v[0], cpc: v[1] }]));
  const slugOf = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const row = (type, title, extra = {}) => ({ page_key: `${type}:/${slugOf(title)}`, type, title, h1: '', h1_source: type === 'service' ? 'auto' : 'needed', status: 'Not Started', applies: true, info: {}, sort_order: 0, ...extra });
  const ctxB = { primaryName: 'Gardener', primaryKey: 'gardener', baseTown: 'Southampton', categoryName: k => ({ gardener: 'Gardener', lawn_care_service: 'Lawn Care Service', tree_service: 'Tree Service' })[k],
    terms: { gardener: ['gardening services'], lawn_care_service: ['lawn care'], tree_service: ['tree surgeon'], _sitewide: ['landscaper'] } };
  const pick = (out, key) => out.decisions.find(d => d.row.page_key === key);
  chk('Normalising: lower case, no punctuation, singular/plural, "in" and "near me" dropped, word order ignored', C.normalise('Gardeners in Southampton') === C.normalise('gardener southampton') && C.normalise('Southampton gardener near me') === C.normalise('gardener southampton') && C.normalise("Chandler's Ford gardeners") === C.normalise('gardener chandlers ford') && C.normalise('tree surgeon romsey') !== C.normalise('tree surgery romsey'), C.normalise('Gardeners in Southampton'), C.normalise('gardener southampton'));
  chk('"Service" alone never merges keywords when normalising: "lawn care service romsey" and "lawn care romsey" stay apart, as do "gardener services southampton" and "gardener southampton"', C.normalise('lawn care service romsey') !== C.normalise('lawn care romsey') && C.normalise('gardener services southampton') !== C.normalise('gardener southampton') && C.normalise('lawn care services romsey') === C.normalise('lawn care service romsey'), C.normalise('lawn care service romsey'), '');
  let G = C.buildGroups(['landscaper southampton', 'landscaping southampton'], vol({ 'landscaper southampton': [260, 2.45], 'landscaping southampton': [260, 2.45] }));
  chk('Grouping by identical figures: same volume AND same CPC are one group (close variants), and the reason says so', G.groupOf('landscaper southampton') === G.groupOf('landscaping southampton') && /identical Google Ads figures \(260\/mo, CPC 2\.45\)/.test(G.why('landscaper southampton', 'landscaping southampton')), G.why('landscaper southampton', 'landscaping southampton'), '');
  G = C.buildGroups(['landscaper southampton', 'landscaping southampton'], vol({ 'landscaper southampton': [260, null], 'landscaping southampton': [260, null] }));
  chk('Not grouped by volume alone when the CPC is null', G.groupOf('landscaper southampton') !== G.groupOf('landscaping southampton'), '', '');
  G = C.buildGroups(['landscaper southampton', 'landscaping southampton'], vol({ 'landscaper southampton': [260, 2.45], 'landscaping southampton': [260, 1.1] }));
  chk('Not grouped when the volume matches but the CPC differs', G.groupOf('landscaper southampton') !== G.groupOf('landscaping southampton'), '', '');
  const svcPair = ['lawn care service romsey', 'lawn care romsey'];
  G = C.buildGroups(svcPair, vol({ 'lawn care service romsey': [90, 2.1], 'lawn care romsey': [40, 1.3] }));
  chk('Keywords that differ only by "service" are different keywords when their figures differ', G.groupOf(svcPair[0]) !== G.groupOf(svcPair[1]), '', '');
  G = C.buildGroups(svcPair, vol({ 'lawn care service romsey': [90, 2.1], 'lawn care romsey': [90, 2.1] }));
  chk('…and one group when DataForSEO gives identical volume AND identical CPC', G.groupOf(svcPair[0]) === G.groupOf(svcPair[1]) && /identical Google Ads figures/.test(G.why(svcPair[0], svcPair[1])), G.why(svcPair[0], svcPair[1]), '');
  G = C.buildGroups(svcPair, vol({ 'lawn care service romsey': [90, null], 'lawn care romsey': [90, null] }));
  chk('…but not on identical volume with a null CPC', G.groupOf(svcPair[0]) !== G.groupOf(svcPair[1]), '', '');
  chk('Service pages are researched: "<service> <base town>", then "<service> services <base town>", both its own name', JSON.stringify(C.candidatesV2(row('service', 'Lawn care'), ctxB)) === JSON.stringify([{ keyword: 'lawn care southampton', fit: 'own' }, { keyword: 'lawn care services southampton', fit: 'own' }]), JSON.stringify(C.candidatesV2(row('service', 'Lawn care'), ctxB)), '');
  chk('The hub pattern: "<Primary Category> Services in and around <Town>", "Services" never doubled, Title Case', C.hubPattern('Gardener', 'Romsey') === 'Gardener Services in and around Romsey' && C.hubPattern('Cleaning Services', 'Leeds') === 'Cleaning Services in and around Leeds' && C.hubPattern('Tree Service', 'Ripon') === 'Tree Services in and around Ripon' && C.hubPattern('Pest control service', 'Leeds') === 'Pest Control Services in and around Leeds', C.hubPattern('Pest control service', 'Leeds'), '');
  chk('No "service services" candidate: a name ending in "Service" gets "…services <town>" second; one ending in "Services" has only its own', JSON.stringify(C.candidatesV2(row('category', 'Gutter Cleaning Service'), ctxB).map(c => c.keyword)) === JSON.stringify(['gutter cleaning service southampton', 'gutter cleaning services southampton']) && JSON.stringify(C.candidatesV2(row('category', 'Cleaning Services'), ctxB).map(c => c.keyword)) === JSON.stringify(['cleaning services southampton']), JSON.stringify(C.candidatesV2(row('category', 'Gutter Cleaning Service'), ctxB)), '');

  const rowsB = [
    row('homepage', 'X Homepage', { page_key: 'homepage:/' }),
    row('category', 'Gardener', { info: { category_key: 'gardener' }, sort_order: 1 }),
    row('category', 'Lawn Care Service', { info: { category_key: 'lawn_care_service' }, sort_order: 2 }),
    row('category', 'Tree Service', { info: { category_key: 'tree_service' }, sort_order: 3 }),
    row('service', 'Lawn care', { sort_order: 4 }),
    row('service', 'Garden design', { sort_order: 5 }),
    row('service', 'Garden designs', { sort_order: 6 }),
    row('location', 'Romsey', { info: { town: 'Romsey' }, sort_order: 7 }),
    row('location', 'Winchester', { info: { town: 'Winchester' }, sort_order: 8 }),
    row('location_category', 'Gardener Romsey', { page_key: 'location_category:/romsey/gardener', info: { town: 'Romsey', category_key: 'gardener' }, sort_order: 9 }),
    row('location_category', 'Tree Service Romsey', { page_key: 'location_category:/romsey/tree-service', h1: 'Tree Surgeon Romsey', h1_source: 'manual', status: 'H1 Added', info: { town: 'Romsey', category_key: 'tree_service' }, sort_order: 10 }),
  ];
  const volB = vol({ 'gardener southampton': [210, 3], 'gardening services southampton': [90, 2], 'lawn care southampton': [400, 2], 'lawn care service southampton': [20, 1], 'gardener romsey': [50, 1], 'landscaper romsey': [30, 1.5], 'tree surgeon romsey': [60, 2], 'paving contractor southampton': [10, null] });
  const outB = C.resolve(rowsB, ctxB, volB);
  const hp = pick(outB, 'homepage:/'), gard = pick(outB, 'category:/gardener'), lcs = pick(outB, 'category:/lawn-care-service'), lawn = pick(outB, 'service:/lawn-care');
  chk('More than 10 searches: applied as research with its volume (the homepage takes "Gardener Southampton", 210)', hp.source === 'research' && hp.h1 === 'Gardener Southampton' && hp.volume === 210, JSON.stringify([hp.source, hp.h1, hp.volume]), '');
  chk('The homepage owns "<primary> <base town>": the primary category page does not compete, takes its next best other candidate above 10 and is marked, not a conflict', hp.h1 === 'Gardener Southampton' && gard.source === 'research' && gard.h1 === 'Gardening Services Southampton' && gard.hub === 'primary category page: keyword owned by the homepage' && !gard.lostTo.length, JSON.stringify([gard.h1, gard.hub, gard.lostTo]), '');
  chk('A service page and a "… Service" category both keep their own keyword: "Lawn Care Southampton" (400) and "Lawn Care Service Southampton" (20)', lawn.source === 'research' && lawn.h1 === 'Lawn Care Southampton' && lawn.volume === 400 && lcs.source === 'research' && lcs.h1 === 'Lawn Care Service Southampton' && lcs.volume === 20, JSON.stringify([lawn.h1, lcs.h1]), '');
  chk('A loser falls to its next best candidate, and own name beats a synonym in a genuine group: the category wanted its synonym "lawn care southampton" (400), the service page\'s own name, and says so', lcs.lostTo.length === 1 && lcs.lostTo[0].keyword === 'lawn care southampton' && lcs.lostTo[0].by === 'service page "Lawn care"' && /after losing "lawn care southampton" \(400\/mo\) to service page "Lawn care"/.test(lcs.reason), JSON.stringify(lcs.lostTo), '');
  const tree = pick(outB, 'category:/tree-service'), win = pick(outB, 'location:/winchester');
  chk('No usable data: the standard pattern is applied ("pattern"), with the reason', tree.source === 'pattern' && tree.h1 === 'Tree Service Southampton' && /no keyword above 10 searches a month: the standard pattern is used/.test(tree.reason) && win.source === 'pattern' && win.h1 === 'Gardener Winchester' && !win.hub, JSON.stringify([tree.h1, tree.reason, win.h1]), '');
  const gd = pick(outB, 'service:/garden-design'), gds = pick(outB, 'service:/garden-designs');
  chk('A pattern that collides with another page\'s H1 is an "H1 conflict": H1 left empty, the page that has it named', gd.source === 'pattern' && gd.h1 === 'Garden Design Southampton' && gds.source === 'conflict' && gds.h1 === '' && gds.claimedBy === 'service page "Garden design"' && /choose an H1 by hand/.test(gds.reason), JSON.stringify([gd.h1, gds.source, gds.reason]), '');
  const rom = pick(outB, 'location:/romsey'), lcg = pick(outB, 'location_category:/romsey/gardener'), man = pick(outB, 'location_category:/romsey/tree-service');
  chk('Hub rule: the Gardener Romsey location category page owns "Gardener Romsey"; the Romsey location page takes its synonym "Landscaper Romsey" (30) and is marked a hub page, not a conflict', lcg.h1 === 'Gardener Romsey' && rom.source === 'research' && rom.h1 === 'Landscaper Romsey' && rom.hub === 'hub page: Gardener keyword owned by location category page "Gardener Romsey"', JSON.stringify([lcg.h1, rom.source, rom.h1, rom.hub]), '');
  const outHub = C.resolve(rowsB, ctxB, vol({ 'gardener romsey': [50, 1] }));
  chk('Hub rule with no other candidate above 10: the hub pattern "Gardener Services in and around Romsey"', pick(outHub, 'location:/romsey').source === 'pattern' && pick(outHub, 'location:/romsey').h1 === 'Gardener Services in and around Romsey' && /hub page/.test(pick(outHub, 'location:/romsey').reason), JSON.stringify(pick(outHub, 'location:/romsey')), '');
  const outPF = C.resolve(rowsB, ctxB, vol({ 'gardener southampton': [210, 3] }));
  chk('Primary category page with no other candidate above 10: "Gardener Services in and around Southampton", marked, not a conflict', pick(outPF, 'category:/gardener').source === 'pattern' && pick(outPF, 'category:/gardener').h1 === 'Gardener Services in and around Southampton' && pick(outPF, 'category:/gardener').hub === 'primary category page: keyword owned by the homepage', JSON.stringify(pick(outPF, 'category:/gardener')), '');
  const outPM = C.resolve([{ ...rowsB[0], h1: 'Landscaper Southampton', h1_source: 'manual' }, ...rowsB.slice(1)], ctxB, volB);
  chk('When the homepage does not hold the primary keyword (a manual "Landscaper Southampton"), the primary category page takes "Gardener Southampton" itself', pick(outPM, 'homepage:/').h1 === 'Landscaper Southampton' && pick(outPM, 'category:/gardener').h1 === 'Gardener Southampton' && !pick(outPM, 'category:/gardener').hub, JSON.stringify(pick(outPM, 'category:/gardener').h1), '');
  const outPG = C.resolve([{ ...rowsB[0], h1: 'Gardeners Southampton', h1_source: 'manual' }, ...rowsB.slice(1)], ctxB, vol({ 'gardener southampton': [210, 3] }));
  chk('A manual homepage H1 in the primary group still claims first; the primary category page falls back to its pattern, not a conflict', pick(outPG, 'homepage:/').source === 'manual' && pick(outPG, 'category:/gardener').source === 'pattern' && pick(outPG, 'category:/gardener').h1 === 'Gardener Services in and around Southampton', JSON.stringify(pick(outPG, 'category:/gardener')), '');
  chk('A manual H1 is never changed and keeps its keyword', man.source === 'manual' && man.h1 === 'Tree Surgeon Romsey', JSON.stringify([man.source, man.h1]), '');
  const all = outB.decisions.filter(d => d.h1).map(d => outB.groupOf(d.h1));
  chk('No two pages target the same keyword group', new Set(all).size === all.length, JSON.stringify(outB.decisions.map(d => d.h1)), '');
  // Manual claims first, even over the homepage
  const outM = C.resolve([rowsB[0], rowsB[1], row('location_category', 'Gardener Hythe', { page_key: 'location_category:/hythe/gardener', h1: 'Gardeners in Southampton', h1_source: 'manual', info: { town: 'Hythe', category_key: 'gardener' } })], ctxB, volB);
  chk('Manual H1s claim first, across the whole client: a location category page\'s manual "Gardeners in Southampton" keeps the group, so the homepage takes its next best', pick(outM, 'homepage:/').h1 === 'Gardening Services Southampton' && pick(outM, 'location_category:/hythe/gardener').h1 === 'Gardeners in Southampton', JSON.stringify(pick(outM, 'homepage:/')), '');
  chk('…and says which page took its keyword', pick(outM, 'homepage:/').lostTo.some(l => l.keyword === 'gardener southampton' && /Gardener Hythe/.test(l.by)), JSON.stringify(pick(outM, 'homepage:/').lostTo), '');
  // Identical figures make a contested group: the category page "Landscaping" cannot take what the homepage has
  const ctxL = { ...ctxB, primaryName: 'Landscaper', primaryKey: 'landscaper', terms: {} };
  const rowsL = [row('homepage', 'X Homepage', { page_key: 'homepage:/' }), row('category', 'Landscaping', { info: { category_key: 'landscaping' }, sort_order: 1 })];
  const outL = C.resolve(rowsL, ctxL, vol({ 'landscaper southampton': [260, 2.45], 'landscaping southampton': [260, 2.45] }));
  chk('Close variants by identical volume and CPC: the homepage takes "Landscaper Southampton"; "Landscaping Southampton" is the same group, so the category page is an H1 conflict, with the reason', pick(outL, 'homepage:/').h1 === 'Landscaper Southampton' && pick(outL, 'category:/landscaping').source === 'conflict' && /identical Google Ads figures/.test(pick(outL, 'category:/landscaping').lostTo.map(l => l.why).join() + pick(outL, 'category:/landscaping').reason), JSON.stringify(pick(outL, 'category:/landscaping')), '');
  const outL2 = C.resolve(rowsL, ctxL, vol({ 'landscaper southampton': [260, null], 'landscaping southampton': [260, null] }));
  chk('…but with a null CPC they stay apart: both pages get their own H1', pick(outL2, 'homepage:/').h1 === 'Landscaper Southampton' && pick(outL2, 'category:/landscaping').h1 === 'Landscaping Southampton' && pick(outL2, 'category:/landscaping').source === 'research', JSON.stringify(outL2.decisions.map(d => d.h1)), '');
  // Pages research must not change
  const outC = C.resolve([{ ...rowsB[0], h1: 'Lawn Care Southampton', h1_source: 'research', status: 'Copy Generated' }, rowsB[4]], ctxB, volB);
  chk('A page at Copy Generated keeps its H1, claims it first, and gets "research now suggests"; the service page whose keyword it holds has no other usable candidate, so it is a conflict', pick(outC, 'homepage:/').source === 'locked' && pick(outC, 'homepage:/').h1 === 'Lawn Care Southampton' && pick(outC, 'homepage:/').suggests === 'Gardener Southampton' && pick(outC, 'service:/lawn-care').source === 'conflict', JSON.stringify([pick(outC, 'homepage:/'), pick(outC, 'service:/lawn-care').h1].map(x => x.suggests || x)), '');
  chk('Title Case for H1s: small words lower case, acronyms kept', H.titleCase('Lawn mowing and maintenance Southampton') === 'Lawn Mowing and Maintenance Southampton' && H.titleCase('Excavation & grading Southampton') === 'Excavation & Grading Southampton' && H.titleCase('CCTV drain surveys Romsey') === 'CCTV Drain Surveys Romsey', H.titleCase('Lawn mowing and maintenance Southampton'), '');

  // ── The service with pg-mem: the one-click flow ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE pages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, page_type TEXT NOT NULL, page_title TEXT NOT NULL, url_slug TEXT, h1 TEXT, copy_output TEXT);`);
  await ensureFilloutTables(pool); await ensureAudioBlobTable(pool); await ensurePriceTables(pool); await ensureAllocationColumns(pool); await AS.ensureAdditionalTables(pool); await ensurePageMapTables(pool); await ensureH1Tables(pool);
  // (Running the migrations twice is not tested here: pg-mem cannot re-run CREATE TABLE IF NOT
  // EXISTS with constraints; real Postgres can, and every module relies on it)
  const svc = createFilloutService({ pool, audioStore: createPgAudioStore(pool), log: quiet });
  const store = createPageMapStore({ pool, filloutService: svc });
  await pool.query(`INSERT INTO clients (name, trade) VALUES ('ednes edge testing', 'Landscaper') RETURNING id`);
  await S.seed(pool, { write: true, log() {} });
  const cid = (await pool.query(`SELECT id FROM clients WHERE name = 'ednes edge testing'`)).rows[0].id;

  // Volumes like the real dry run (18 Oct 2026), plus a tie and a second-candidate win
  let table = { 'gardener southampton': [210, 3.12], 'landscape gardener southampton': [20, 2.79], 'tree service southampton': [20, 3.03], 'paving contractor southampton': [10, null],
    'gardener romsey': [50, 1.81], 'gardener winchester': [140, 2.43], 'tree service winchester': [30, null], 'deck builder southampton': [40, 1], 'deck builder services southampton': [40, 1],
    'landscape designer southampton': [15, null], 'landscape designer services southampton': [60, 2], 'lawn care southampton': [400, 2] };
  const searched = [];
  const searchVolume = async kws => { searched.push(kws.length); return D.searchVolume(kws, { env: FAKE, fetchImpl: async (u, o) => okReply(JSON.parse(o.body)[0].keywords, table) }); };
  const logs = [];
  const capture = { log: (...a) => logs.push(a.join(' ')), info: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.join(' ')) };
  let now = new Date('2026-10-18T10:00:00Z');
  const h1 = createH1Research({ pool, filloutService: svc, pageMapStore: store, searchVolume, log: capture, now: () => now });
  const waitFor = async (id) => { for (let i = 0; i < 400; i++) { const j = await h1.job(id); if (!['queued', 'building', 'researching'].includes(j.status)) return j; await sleep(15); } throw new Error('job never finished'); };

  const planRows = (await store.preview(cid)).plan.rows;
  let job = await h1.start(cid, { kind: 'generate' });
  chk('Generate starts a background job straight away (queued), nothing to confirm', ['queued', 'building'].includes(job.status) && job.kind === 'generate', job.status, 'queued');
  job = await waitFor(job.id);
  let rows = await store.saved(cid);
  const byKey = k => rows.find(r => r.page_key === k);
  const nServices = rows.filter(r => r.type === 'service').length;
  chk('The job builds the pages then researches every page, service pages included, in ONE batched DataForSEO call (fewer than 1,000 keywords), cost stored', job.status === 'complete' && job.pages_total === 176 && job.keywords_total > 308 && job.keywords_fetched === job.keywords_total && searched.join() === String(job.keywords_total) && job.cost === 0.09 && nServices > 0, JSON.stringify([job.status, job.keywords_total, job.keywords_fetched, searched, nServices]), '');
  chk('Stage text: "Complete: X H1s by search volume, Y by pattern, Z H1 conflicts to resolve, cost $…"', /^Complete: \d+ H1s by search volume, \d+ by pattern(, \d+ H1 conflicts? to resolve)?, cost \$0\.09$/.test(job.stage) && job.suggested_count + job.no_data_count + job.conflict_count === 176, job.stage, '');
  chk('More than 10 searches: applied as the H1 immediately, h1_source "research", keyword and volume stored, status Not Started → H1 Added', byKey('homepage:/').h1 === 'Gardener Southampton' && byKey('homepage:/').h1_source === 'research' && byKey('homepage:/').h1_keyword === 'gardener southampton' && byKey('homepage:/').h1_volume === 210 && byKey('homepage:/').status === 'H1 Added' && /210\/mo/.test(byKey('homepage:/').h1_reason), JSON.stringify(byKey('homepage:/')), '');
  chk('A service page is researched like the rest: "Lawn Care Southampton" by volume (400)', byKey('service:/services/lawn-care').h1 === 'Lawn Care Southampton' && byKey('service:/services/lawn-care').h1_source === 'research' && byKey('service:/services/lawn-care').h1_volume === 400, JSON.stringify(byKey('service:/services/lawn-care')), '');
  chk('No usable data (10, null): the standard pattern is applied, h1_source "pattern", status H1 Added', byKey('category:/paving-contractor').h1 === 'Paving Contractor Southampton' && byKey('category:/paving-contractor').h1_source === 'pattern' && byKey('category:/paving-contractor').status === 'H1 Added' && /no keyword above 10/.test(byKey('category:/paving-contractor').h1_reason), JSON.stringify(byKey('category:/paving-contractor')), '');
  chk('A tie on identical figures goes to the first candidate; a higher second candidate wins', byKey('category:/deck-builder').h1 === 'Deck Builder Southampton' && byKey('category:/landscape-designer').h1 === 'Landscape Designer Services Southampton', JSON.stringify([byKey('category:/deck-builder').h1, byKey('category:/landscape-designer').h1]), '');
  chk('Hub pages: the Romsey location page does not take "Gardener Romsey" (the Gardener Romsey location category page has it) and is marked a hub page', byKey('location_category:/locations/romsey/gardener').h1 === 'Gardener Romsey' && byKey('location:/locations/romsey').h1 === 'Gardener Services in and around Romsey' && /^hub page: Gardener keyword owned by location category page "Gardener Romsey"$/.test(byKey('location:/locations/romsey').h1_hub), JSON.stringify([byKey('location:/locations/romsey').h1, byKey('location:/locations/romsey').h1_hub]), '');
  chk('Page names and slugs are exactly the plan\'s', planRows.every(p => { const r = byKey(p.page_key); return r && r.title === p.title && r.slug === p.slug; }), '', '');
  const h1s = rows.filter(r => r.applies && r.h1).map(r => C.normalise(r.h1));
  const conflicts = rows.filter(r => r.h1_source === 'conflict');
  chk('After a full run no two pages share an H1 or a keyword group; every conflict has an empty H1 and says which page has its keyword', new Set(h1s).size === h1s.length && conflicts.every(r => r.h1 === '' && /already the H1 of/.test(r.h1_reason)) && conflicts.length === job.conflict_count, JSON.stringify(conflicts.map(r => [r.title, r.h1_reason])), '');
  const cands = await h1.candidates(cid);
  chk('Every candidate is stored per page with volume, CPC, which one was applied and why (services too)', cands['homepage:/'].length === 5 && cands['homepage:/'].map(c => c.candidate).join() === 'gardener southampton,gardener services southampton,garden maintenance southampton,landscaper southampton,landscaping southampton' && cands['homepage:/'][0].chosen === true && /210\/mo/.test(cands['homepage:/'][0].reason) && cands['homepage:/'][1].volume === null && /not usable/.test(cands['homepage:/'][1].reason) && Object.keys(cands).length === 176 && cands['service:/services/lawn-care'][0].chosen === true, JSON.stringify(cands['homepage:/']), '');

  // A person's work: a manual H1, a page at Copy Generated, and an old v1 "suggested" row
  const kings = byKey('location:/locations/kings-worthy'), copyGen = byKey('location:/locations/winchester'), lc = byKey('location_category:/locations/winchester/tree-service');
  await store.setRow(cid, byKey('category:/paving-contractor').id, { h1: 'Patio Layers Southampton' });
  await store.setRow(cid, copyGen.id, { status: 'Copy Generated' });
  await store.setRow(cid, lc.id, { h1: 'Tree Surgeon Winchester' });
  await pool.query(`UPDATE client_page_map SET h1 = 'Gardener Kings Worthy', h1_source = 'suggested', h1_suggestion = 'Gardener Kings Worthy', status = 'Not Started' WHERE id = $1`, [kings.id]);
  rows = await store.saved(cid);
  chk('A person typing an H1 sets h1_source "manual"', byKey('category:/paving-contractor').h1_source === 'manual' && byKey(lc.page_key).h1_source === 'manual', '', '');
  chk('There is no accept step: accept is refused', await store.setRow(cid, byKey('homepage:/').id, { accept: true }).then(() => false, e => e.status === 400), '', '400');
  const copyGenH1 = byKey(copyGen.page_key).h1;

  // Re-research with new volumes (the cache expired): a preview first, then apply
  table = { ...table, 'gardener southampton': [5, null], 'gardener services southampton': [300, 1], 'gardener winchester': [1, null], 'landscaper winchester': [500, 4], 'paving contractor services southampton': [800, 1], 'tree service winchester': [0, null], 'gardener eastleigh': [70, 1], 'tree surgeon winchester': [900, 5] };
  now = new Date('2027-01-20T10:00:00Z');
  const before = JSON.stringify((await store.saved(cid)).map(r => [r.page_key, r.h1, r.h1_source, r.status]));
  const pv = await h1.preview(cid);
  rows = await store.saved(cid);
  chk('The re-research preview writes no H1 (only caches the keywords it had to look up, in one call)', JSON.stringify(rows.map(r => [r.page_key, r.h1, r.h1_source, r.status])) === before && searched.length === 2, JSON.stringify(searched), '');
  const ch = k => pv.changes.find(c => c.page_key === k);
  chk('The preview lists old → new for pages that would change (the homepage to "Gardener Services Southampton", 300)', ch('homepage:/') && ch('homepage:/').from === 'Gardener Southampton' && ch('homepage:/').to === 'Gardener Services Southampton' && ch('homepage:/').volume === 300, JSON.stringify(ch('homepage:/')), '');
  chk('The preview never lists a manual page or one at Copy Generated; Copy Generated gets "research now suggests"', !ch('category:/paving-contractor') && !ch(lc.page_key) && !ch(copyGen.page_key) && pv.notes.some(n => n.page_key === copyGen.page_key && n.suggests === 'Landscaper Winchester'), JSON.stringify([pv.notes, pv.changes.map(c => c.page_key).filter(k => /winchester|paving/.test(k))]), '');
  job = await waitFor((await h1.start(cid, { kind: 'research' })).id);
  rows = await store.saved(cid);
  chk('Applying uses the keywords the preview cached: no new call', job.status === 'complete' && job.keywords_fetched === 0 && searched.length === 2, JSON.stringify([job.keywords_fetched, searched]), '');
  chk('Re-research changed the homepage as previewed', byKey('homepage:/').h1 === 'Gardener Services Southampton' && byKey('homepage:/').h1_source === 'research', byKey('homepage:/').h1, '');
  chk('Never touched: the manual Paving Contractor H1 (its second candidate now has 800), the typed Tree Surgeon Winchester (900 now), the Copy Generated Winchester page', byKey('category:/paving-contractor').h1 === 'Patio Layers Southampton' && byKey('category:/paving-contractor').h1_source === 'manual' && byKey(lc.page_key).h1 === 'Tree Surgeon Winchester' && byKey(lc.page_key).h1_source === 'manual' && byKey(copyGen.page_key).h1 === copyGenH1 && byKey(copyGen.page_key).status === 'Copy Generated', JSON.stringify([byKey('category:/paving-contractor').h1, byKey(lc.page_key).h1, byKey(copyGen.page_key).h1]), '');
  chk('The Copy Generated page shows "research now suggests Landscaper Winchester" instead', byKey(copyGen.page_key).h1_suggests === 'Landscaper Winchester', byKey(copyGen.page_key).h1_suggests, 'Landscaper Winchester');
  chk('An old v1 "suggested" row is converted on the next research run', ['research', 'pattern'].includes(byKey(kings.page_key).h1_source) && byKey(kings.page_key).h1_suggestion === null && byKey(kings.page_key).status === 'H1 Added', JSON.stringify(byKey(kings.page_key)), '');
  const h1s2 = rows.filter(r => r.applies && r.h1).map(r => C.normalise(r.h1));
  chk('Still no two pages share a keyword group', new Set(h1s2).size === h1s2.length, '', '');

  // Regenerating the map keeps every H1 (store.generate, and the one-click job in "fill" mode)
  const kept = JSON.stringify(rows.map(r => [r.page_key, r.h1, r.h1_source, r.status]));
  await store.generate(cid);
  rows = await store.saved(cid);
  chk('Regenerating the page map never changes a research, pattern, conflict or manual H1, or a status', JSON.stringify(rows.map(r => [r.page_key, r.h1, r.h1_source, r.status])) === kept, '', '');
  table = { ...table, 'gardener services southampton': [1, null], 'gardener southampton': [999, 3] };
  await pool.query(`UPDATE keyword_volumes SET fetched_at = '2020-01-01'`);
  job = await waitFor((await h1.start(cid, { kind: 'generate' })).id);
  rows = await store.saved(cid);
  chk('The one-click job on an existing map only fills pages without an H1: research and pattern H1s stay (only the first run applies everything)', job.status === 'complete' && job.mode === 'fill' && byKey('homepage:/').h1 === 'Gardener Services Southampton' && JSON.stringify(rows.filter(r => r.h1_source !== 'conflict').map(r => [r.page_key, r.h1])) === JSON.stringify(JSON.parse(kept).filter(r => r[2] !== 'conflict').map(r => [r[0], r[1]])), JSON.stringify([job.mode, byKey('homepage:/').h1]), '');

  // A failed API call: the page map stays, the job says why, the credentials never show
  const failing = createH1Research({ pool, filloutService: svc, pageMapStore: store, log: capture, now: () => now,
    searchVolume: kws => D.searchVolume(kws, { env: FAKE, fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ status_code: 40200, status_message: `Payment Required for ${FAKE.DATAFORSEO_LOGIN}` }) }) }) });
  now = new Date('2027-06-01T10:00:00Z'); // stale cache: must call
  const snapshot = JSON.stringify((await store.saved(cid)).map(r => [r.page_key, r.title, r.slug, r.h1, r.h1_source, r.status]));
  job = await failing.start(cid, { kind: 'research' });
  for (let i = 0; i < 200; i++) { job = await failing.job(job.id); if (job.status === 'failed' || job.status === 'complete') break; await sleep(15); }
  chk('A failed call (no credit): the job fails with the status and DataForSEO\'s message', job.status === 'failed' && /status 40200/.test(job.error) && /Payment Required/.test(job.error) && /H1 research failed/.test(job.stage), JSON.stringify([job.status, job.error, job.stage]), '');
  chk('The page map is untouched by the failure (names, slugs, H1s, statuses)', JSON.stringify((await store.saved(cid)).map(r => [r.page_key, r.title, r.slug, r.h1, r.h1_source, r.status])) === snapshot, '', '');
  chk('The credentials appear in no log line, job error or stage', !leaks(logs.join('\n')) && !leaks(job.error) && !leaks(job.stage) && logs.some(l => /research failed/.test(l)), logs.filter(l => /failed/.test(l)).join(' | '), '');

  // A busy DataForSEO during a job: the stage says so while waiting, then the job completes
  now = new Date('2027-09-01T10:00:00Z'); // stale cache again
  const stages = [];
  let busyLeft = 1;
  const patient = createH1Research({ pool, filloutService: svc, pageMapStore: store, log: quiet, now: () => now,
    searchVolume: (kws, opts) => D.searchVolume(kws, { env: FAKE, ...opts, retryDelays: [30000], sleep: async () => { const j = await patient.latest(cid); stages.push(j.stage); },
      fetchImpl: async (u, o) => (busyLeft-- > 0 ? busy : okReply(JSON.parse(o.body)[0].keywords, table)) }) });
  job = await patient.start(cid, { kind: 'research' });
  for (let i = 0; i < 200; i++) { job = await patient.job(job.id); if (job.status === 'failed' || job.status === 'complete') break; await sleep(15); }
  chk('A job that meets a busy DataForSEO shows "DataForSEO is busy … retrying in 30s (1 of 1)" while waiting, then completes', job.status === 'complete' && stages.some(s => /DataForSEO is busy \(Too many requests\.\), retrying in 30s \(1 of 1\)/.test(s)), JSON.stringify([job.status, stages]), '');

  // A restart: a job left "researching" is picked up by a new instance on startup
  await pool.query(`INSERT INTO h1_research_jobs (client_id, kind, status, stage) VALUES ($1, 'research', 'researching', 'Researching H1s')`, [cid]);
  now = new Date('2028-01-01T12:00:00Z'); // stale cache: the resumed job must fetch
  const searched2 = [];
  const restarted = createH1Research({ pool, filloutService: svc, pageMapStore: store, log: quiet, now: () => now, searchVolume: async kws => { searched2.push(kws.length); return D.searchVolume(kws, { env: FAKE, fetchImpl: async (u, o) => okReply(JSON.parse(o.body)[0].keywords, table) }); } });
  const n = await restarted.recover();
  job = await restarted.latest(cid);
  chk('After a simulated restart the interrupted job is resumed and completes', n === 1 && job.status === 'complete' && searched2.length === 1, JSON.stringify([n, job.status]), '');

  // ── Through the routes: run, latest job, candidates, accept, retry, balance ──
  const app = express(); app.use(express.json()); routes.mountApi(app, svc);
  let balanceCalls = 0;
  mountPageMapApi(app, { pool, filloutService: svc, recover: false, log: quiet, searchVolume, balanceOf: async () => { balanceCalls++; return 8.2; } });
  const srv = http.createServer(app); await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const req = (method, p, body) => fetch(base + p, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  try {
    const { rows: [c2] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('Second Gardens', 'Landscaper') RETURNING id`);
    await req('PUT', `/api/clients/${c2.id}/services/by-hand`, { niche: 'Landscapers/Gardeners', ticks: { 'landscapers.cat.gardener': ['Hedge trimming'] }, baseTown: 'Southampton', otherTowns: 'Romsey' });
    let r = await (await req('POST', `/api/clients/${c2.id}/page-map/run`, {})).json();
    chk('POST page-map/run returns the job at once', r.job && r.job.kind === 'generate', JSON.stringify(r), '');
    let got;
    for (let i = 0; i < 300; i++) { got = await (await req('GET', `/api/clients/${c2.id}/page-map`)).json(); if (got.job && got.job.status === 'complete') break; await sleep(15); }
    chk('GET page-map: rows, candidates per page and the latest job (what another device or a refresh sees)', got.job.status === 'complete' && got.rows.length > 0 && got.candidates['homepage:/'] && got.candidates['homepage:/'].length === 5, JSON.stringify(got.job), '');
    const hp2 = got.rows.find(x => x.page_key === 'homepage:/');
    chk('Through the API the first run applies at once: the homepage H1 is set and H1 Added', hp2.h1 && ['research', 'pattern'].includes(hp2.h1_source) && hp2.status === 'H1 Added', JSON.stringify([hp2.h1, hp2.h1_source, hp2.status]), '');
    const acc = await req('PUT', `/api/clients/${c2.id}/page-map/${hp2.id}`, { accept: true });
    const useAll = await req('POST', `/api/clients/${c2.id}/page-map/use-suggestions`, { type: 'location' });
    chk('The Accept and "Use all suggestions" endpoints are gone (400, 404)', acc.status === 400 && useAll.status === 404, JSON.stringify([acc.status, useAll.status]), '[400,404]');
    const pv2 = await (await req('GET', `/api/clients/${c2.id}/h1-research/preview`)).json();
    chk('GET h1-research/preview returns the changes and notes, writing nothing', Array.isArray(pv2.changes) && Array.isArray(pv2.notes) && typeof pv2.keywords === 'number', JSON.stringify(Object.keys(pv2)), '');
    const html = fs.readFileSync(path.join(root, 'public/client-record.html'), 'utf8');
    chk('The page has no Accept or "Use all suggestions" button; it shows the pattern badge, H1 conflicts, the volume line, the CPC label and the re-research preview', !/>Accept<|Use all \$\{|use-suggestions|accept: true/.test(html) && /pattern, no volume data/.test(html) && /H1 conflict/.test(html) && /searches a month<\/div>/.test(html) && /CPC \(currency unconfirmed\)/.test(html) && /h1-research\/preview/.test(html) && /Research now suggests/.test(html), '', '');
    r = await (await req('POST', `/api/clients/${c2.id}/h1-research/retry`, {})).json();
    chk('Retry starts a research job (the map exists)', r.job && r.job.kind === 'research', JSON.stringify(r.job), '');
    const b1 = await (await req('GET', '/api/dataforseo/balance')).json(); const b2 = await (await req('GET', '/api/dataforseo/balance')).json();
    chk('Balance: shown with a low warning below $10, cached (one call for two requests)', b1.balance === 8.2 && b1.low === true && b2.balance === 8.2 && balanceCalls === 1, JSON.stringify([b1, balanceCalls]), '');
  } finally { srv.close(); }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
