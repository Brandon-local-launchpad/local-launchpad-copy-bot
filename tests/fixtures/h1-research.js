'use strict';
// Fixture: H1 research (h1-research/*) with a stubbed DataForSEO and pg-mem. Batching at
// 1,000 keywords, the 90-day cache, tie-break to the first candidate, null and 0-10 as no
// usable data, never overwriting manual or accepted H1s, statuses untouched, re-runs
// updating suggestions only, page names and slugs unchanged, service-page H1s unchanged,
// a job surviving a simulated restart, a failed call leaving the page map intact, and
// credentials never appearing in a log, an error or the job.
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const H = require(path.join(root, 'h1-research/research.js'));
const D = require(path.join(root, 'h1-research/dataforseo.js'));
const { ensureH1Tables, createH1Research } = require(path.join(root, 'h1-research/service.js'));
const { ensurePageMapTables, createPageMapStore } = require(path.join(root, 'page-map/store.js'));
const { mountPageMapApi } = require(path.join(root, 'page-map/routes.js'));
const routes = require(path.join(root, 'fillout/routes.js'));
const S = require(path.join(root, 'tools/seed-edens-edge.js'));
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

  // ── Candidates and selection ──
  const ctx = { primaryName: 'Gardener', baseTown: 'Southampton', categoryName: k => ({ tree_service: 'Tree Service' })[k] };
  chk('Candidates per type in SOP order, lower case, no punctuation; service pages none', JSON.stringify([
    H.candidatesFor({ type: 'homepage', title: 'X Homepage' }, ctx), H.candidatesFor({ type: 'category', title: 'Tree Service' }, ctx),
    H.candidatesFor({ type: 'location', title: "Chandler's Ford", info: { town: "Chandler's Ford" } }, ctx), H.candidatesFor({ type: 'location_category', title: 'Tree Service Romsey', info: { town: 'Romsey', category_key: 'tree_service' } }, ctx),
    H.needsResearch({ type: 'service', h1_source: 'auto' })]) === JSON.stringify([
    ['gardener southampton', 'gardener services southampton'], ['tree service southampton', 'tree service services southampton'],
    ['gardener chandlers ford', 'gardener services chandlers ford'], ['tree service romsey', 'tree service services romsey'], false]), '', '');
  const vol = m => new Map(Object.entries(m).map(([k, v]) => [k, { volume: v[0], cpc: v[1] }]));
  let s = H.select(['a b', 'a services b'], vol({ 'a b': [210, 3.1], 'a services b': [210, 3.1] }));
  chk('A tie (Google merges close variants) goes to the first-listed candidate', s.chosen === 'a b' && s.usable && /ties with/.test(s.reason) && /close variants/.test(s.reason), s.reason, '');
  s = H.select(['a b', 'a services b'], vol({ 'a b': [20, null], 'a services b': [90, 2] }));
  chk('The second candidate wins when its volume is higher (and says so)', s.chosen === 'a services b' && s.beatFirst && s.display === 'A Services B', JSON.stringify(s), '');
  for (const [label, m] of [['null', {}], ['zero', { 'a b': [0, null] }], ['10', { 'a b': [10, null], 'a services b': [10, null] }]]) {
    s = H.select(['a b', 'a services b'], vol(m));
    chk(`No usable data when the best volume is ${label}: nothing chosen, the first candidate kept as a suggestion`, !s.usable && s.chosen === null && s.suggestion === 'a b' && /no usable data/.test(s.reason), JSON.stringify(s), '');
  }
  s = H.select(['a b'], vol({ 'a b': [11, null] }));
  chk('11 is usable', s.usable && s.volume === 11, '', '');
  chk('Display form: Title Case', H.displayOf('landscape gardener new forest district') === 'Landscape Gardener New Forest District', H.displayOf('landscape gardener new forest district'), '');

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
    'landscape designer southampton': [15, null], 'landscape designer services southampton': [60, 2] };
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
  chk('The job builds the pages then researches: complete, 176 pages, 98 researched, one DataForSEO call for 168 keywords, cost stored', job.status === 'complete' && job.pages_total === 176 && job.pages_built === 176 && job.keywords_total === 168 && job.keywords_fetched === 168 && searched.join() === '168' && job.cost === 0.09, JSON.stringify(job), '');
  chk('Stage text: "Complete: X suggested, Y need a manual H1, cost $Z"', /^Complete: \d+ suggested, \d+ need a manual H1, cost \$0\.09$/.test(job.stage) && job.suggested_count + job.no_data_count === 98, job.stage, '');
  chk('A winner above 10 is written as the H1: suggested, keyword and volume stored, status still Not Started', byKey('homepage:/').h1 === 'Gardener Southampton' && byKey('homepage:/').h1_source === 'suggested' && byKey('homepage:/').h1_keyword === 'gardener southampton' && byKey('homepage:/').h1_volume === 210 && byKey('homepage:/').status === 'Not Started', JSON.stringify(byKey('homepage:/')), '');
  chk('No usable data (10, null): H1 left empty, h1_source needed, the first candidate stored as a suggestion', byKey('category:/paving-contractor').h1 === '' && byKey('category:/paving-contractor').h1_source === 'needed' && byKey('category:/paving-contractor').h1_suggestion === 'Paving Contractor Southampton' && byKey('location:/locations/kings-worthy').h1_suggestion === 'Gardener Kings Worthy', JSON.stringify(byKey('category:/paving-contractor')), '');
  chk('A tie on identical figures goes to the first candidate; a higher second candidate wins', byKey('category:/deck-builder').h1 === 'Deck Builder Southampton' && byKey('category:/landscape-designer').h1 === 'Landscape Designer Services Southampton', JSON.stringify([byKey('category:/deck-builder').h1, byKey('category:/landscape-designer').h1]), '');
  chk('Page names and slugs are exactly the plan\'s; service-page H1s stay "<service> Southampton" (auto, never researched)', planRows.every(p => { const r = byKey(p.page_key); return r && r.title === p.title && r.slug === p.slug; }) && rows.filter(r => r.type === 'service').every(r => r.h1_source === 'auto' && r.h1 === `${r.title} Southampton`), '', '');
  const cands = await h1.candidates(cid);
  chk('Every candidate is stored per page with volume, CPC, which one was chosen and why', cands['homepage:/'].length === 2 && cands['homepage:/'][0].chosen === true && /highest volume/.test(cands['homepage:/'][0].reason) && cands['homepage:/'][1].volume === null && Object.keys(cands).length === 98, JSON.stringify(cands['homepage:/']), '');

  // A person's work: a manual H1, an accepted suggestion, a status, and an edit to a suggested row's status
  const loc = byKey('location:/locations/romsey'), win = byKey('location:/locations/winchester'), lc = byKey('location_category:/locations/winchester/tree-service');
  await store.setRow(cid, byKey('category:/paving-contractor').id, { h1: 'Patio Layers Southampton' });
  await store.setRow(cid, loc.id, { accept: true });
  await store.setRow(cid, win.id, { status: 'Copy Generated' });
  await store.setRow(cid, lc.id, { h1: 'Tree Surgeon Winchester' });
  rows = await store.saved(cid);
  chk('Accept: manual, accepted, status Not Started → H1 Added; a typed H1 is manual, not accepted', byKey(loc.page_key).h1_source === 'manual' && byKey(loc.page_key).h1_accepted === true && byKey(loc.page_key).status === 'H1 Added' && byKey('category:/paving-contractor').h1_source === 'manual' && byKey('category:/paving-contractor').h1_accepted === false && byKey('category:/paving-contractor').h1_suggestion === null, JSON.stringify(byKey(loc.page_key)), '');
  chk('Accept is only for a suggested H1', await store.setRow(cid, byKey('location:/locations/kings-worthy').id, { accept: true }).then(() => false, e => e.status === 400), '', '400');

  // Re-research with new volumes: suggestions move, a person's work never
  table = { ...table, 'gardener southampton': [5, null], 'gardener services southampton': [300, 1], 'gardener romsey': [999, 1], 'gardener winchester': [1, null], 'paving contractor services southampton': [800, 1], 'tree service winchester': [0, null], 'gardener eastleigh': [70, 1] };
  now = new Date('2026-10-18T11:00:00Z');
  job = await waitFor((await h1.start(cid, { kind: 'research' })).id);
  rows = await store.saved(cid);
  chk('Re-research: cached keywords are not fetched again (0 fetched, no new call, cost 0)', job.status === 'complete' && job.keywords_fetched === 0 && searched.length === 1 && job.cost === 0, JSON.stringify([job.keywords_fetched, searched]), '');
  // Let the cache expire so the new volumes are seen
  now = new Date('2027-01-20T10:00:00Z');
  job = await waitFor((await h1.start(cid, { kind: 'research' })).id);
  rows = await store.saved(cid);
  chk('After 90 days the cache is stale and the keywords are fetched again in one call: 164, as pages with a manual or accepted H1 are no longer researched', job.keywords_fetched === 164 && searched.join() === '168,164', JSON.stringify(searched), '168,164');
  chk('Re-research updates suggestions: the homepage now takes the second candidate (300 vs 5)', byKey('homepage:/').h1 === 'Gardener Services Southampton' && byKey('homepage:/').h1_source === 'suggested', byKey('homepage:/').h1, '');
  chk('A suggestion that falls to 10 or less goes back to "needed" with a suggestion (Winchester location, status kept)', byKey('location:/locations/winchester').h1 === '' && byKey('location:/locations/winchester').h1_source === 'needed' && byKey('location:/locations/winchester').status === 'Copy Generated', JSON.stringify(byKey('location:/locations/winchester')), '');
  chk('Never overwritten: the manual Paving Contractor H1 (though its second candidate now has 800), the accepted Romsey H1 (though 999 now), the typed Tree Surgeon Winchester H1', byKey('category:/paving-contractor').h1 === 'Patio Layers Southampton' && byKey('location:/locations/romsey').h1 === 'Gardener Romsey' && byKey('location:/locations/romsey').h1_accepted === true && byKey(lc.page_key).h1 === 'Tree Surgeon Winchester' && byKey(lc.page_key).h1_source === 'manual', JSON.stringify([byKey('category:/paving-contractor').h1, byKey('location:/locations/romsey').h1, byKey(lc.page_key).h1]), '');
  chk('Statuses untouched by research: H1 Added and Copy Generated kept, everything else still Not Started', byKey('location:/locations/romsey').status === 'H1 Added' && byKey('location:/locations/winchester').status === 'Copy Generated' && rows.filter(r => ![loc.page_key, win.page_key, lc.page_key, 'category:/paving-contractor'].includes(r.page_key)).every(r => r.status === 'Not Started'), '', '');

  // Regenerating the map (store.generate) keeps suggestions and a person's H1s
  const before = JSON.stringify(rows.map(r => [r.page_key, r.h1, r.h1_source, r.status]));
  await store.generate(cid);
  rows = await store.saved(cid);
  chk('Regenerating the page map never clears a suggested H1, a manual H1 or a status', JSON.stringify(rows.map(r => [r.page_key, r.h1, r.h1_source, r.status])) === before, '', '');

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
    chk('GET page-map: rows, candidates per page and the latest job (what another device or a refresh sees)', got.job.status === 'complete' && got.rows.length > 0 && got.candidates['homepage:/'] && got.candidates['homepage:/'].length === 2, JSON.stringify(got.job), '');
    const hp = got.rows.find(x => x.page_key === 'homepage:/');
    const acc = await (await req('PUT', `/api/clients/${c2.id}/page-map/${hp.id}`, { accept: true })).json();
    chk('Accept through the API', acc.h1_source === 'manual' && acc.h1_accepted === true && acc.status === 'H1 Added', JSON.stringify(acc), '');
    r = await (await req('POST', `/api/clients/${c2.id}/h1-research/retry`, {})).json();
    chk('Retry starts a research job (the map exists)', r.job && r.job.kind === 'research', JSON.stringify(r.job), '');
    const b1 = await (await req('GET', '/api/dataforseo/balance')).json(); const b2 = await (await req('GET', '/api/dataforseo/balance')).json();
    chk('Balance: shown with a low warning below $10, cached (one call for two requests)', b1.balance === 8.2 && b1.low === true && b2.balance === 8.2 && balanceCalls === 1, JSON.stringify([b1, balanceCalls]), '');
  } finally { srv.close(); }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
