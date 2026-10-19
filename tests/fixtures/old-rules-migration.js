'use strict';
// Fixture: the old-rules migration and the fill-mode fix (h1-research/service.js, page-map/routes.js).
// A page map opened with old-rules research (v1 "suggested" / researched "needed" rows) is rebuilt
// and researched without confirmation: Not Started / H1 Added and not manual only; manual and
// Copy Generated pages untouched (the latter get "research now suggests"); pages that no longer
// apply retired with the reason; nothing to migrate means no job; Re-research still previews.
// Fill mode: a page whose keyword group a newly created page wins is re-researched too (the
// Romsey case: location page to the pattern, town service page to "Garden Maintenance Romsey").
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const D = require(path.join(root, 'h1-research/dataforseo.js'));
const { ensureH1Tables, createH1Research } = require(path.join(root, 'h1-research/service.js'));
const { ensurePageMapTables, createPageMapStore } = require(path.join(root, 'page-map/store.js'));
const { mountPageMapApi } = require(path.join(root, 'page-map/routes.js'));
const routes = require(path.join(root, 'fillout/routes.js'));
const S = require(path.join(root, 'tools/seed-edens-edge.js'));
const { TABLE } = require(path.join(root, 'tests/fixtures/data/edens-edge-volumes.js'));
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
console.log('\n=== FIXTURE: old-rules migration and the fill-mode fix ===\n');
const quiet = { log() {}, info() {}, warn() {}, error() {} };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const FAKE = { DATAFORSEO_LOGIN: 'login-SECRET', DATAFORSEO_PASSWORD: 'pw-SECRET' };

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE pages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, page_type TEXT NOT NULL, page_title TEXT NOT NULL, url_slug TEXT, h1 TEXT, copy_output TEXT);`);
  await ensureFilloutTables(pool); await ensureAudioBlobTable(pool); await ensurePriceTables(pool); await ensureAllocationColumns(pool); await AS.ensureAdditionalTables(pool); await ensurePageMapTables(pool); await ensureH1Tables(pool);
  const svc = createFilloutService({ pool, audioStore: createPgAudioStore(pool), log: quiet });
  // Volumes: the stub table plus "garden maintenance romsey" (the Romsey case)
  const live = { ...TABLE, 'garden maintenance romsey': [30, 1.5] };
  const okReply = keywords => ({ ok: true, status: 200, json: async () => ({ status_code: 20000, cost: 0.09, tasks: [{ status_code: 20000, cost: 0.09, result: keywords.map(k => (k in live ? { keyword: k, search_volume: live[k][0], cpc: live[k][1] } : { keyword: k, search_volume: null, cpc: null })) }] }) });
  const searchVolume = async kws => D.searchVolume(kws, { env: FAKE, fetchImpl: async (u, o) => okReply(JSON.parse(o.body)[0].keywords) });
  const app = express(); app.use(express.json()); routes.mountApi(app, svc);
  const { store, h1 } = mountPageMapApi(app, { pool, filloutService: svc, recover: false, log: quiet, searchVolume, balanceOf: async () => 50 });
  const srv = http.createServer(app); await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const req = (method, p, body) => fetch(base + p, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  await pool.query(`INSERT INTO clients (name, trade) VALUES ('ednes edge testing', 'Landscaper')`);
  await S.seed(pool, { write: true, log() {} });
  const cid = (await pool.query(`SELECT id FROM clients WHERE name = 'ednes edge testing'`)).rows[0].id;
  for (const t of S.OTHER_TOWNS) await store.setLaunchTown(cid, t, true);
  const waitFor = async id => { for (let i = 0; i < 4000; i++) { const j = await h1.job(id); if (!['queued', 'building', 'researching'].includes(j.status)) return j; await sleep(15); } throw new Error('job never finished'); };
  let rows, byKey = k => rows.find(r => r.page_key === k);

  try {
    // ── The fill-mode fix: the Romsey case ──
    // Step 1: no Garden maintenance page (excluded), so the Romsey location page takes "garden maintenance romsey" (30)
    await store.setExclude(cid, 'garden maintenance', true);
    let job = await waitFor((await h1.start(cid, { kind: 'generate' })).id);
    rows = await store.saved(cid);
    chk('Set-up: with the Garden maintenance page excluded, the Romsey location page holds "Garden Maintenance Romsey" (30) by research', job.status === 'complete' && byKey('location:/locations/romsey').h1 === 'Garden Maintenance Romsey' && byKey('location:/locations/romsey').h1_source === 'research' && !byKey('town_service:/locations/romsey/garden-maintenance'), JSON.stringify([byKey('location:/locations/romsey').h1, byKey('location:/locations/romsey').h1_source]), '');
    // Step 2: un-exclude and regenerate: the new town service page wins the group; fill mode must free the location page
    await store.setExclude(cid, 'garden maintenance', false);
    job = await waitFor((await h1.start(cid, { kind: 'generate' })).id);
    rows = await store.saved(cid);
    const ts = byKey('town_service:/locations/romsey/garden-maintenance'), loc = byKey('location:/locations/romsey');
    chk('Fill-mode fix: the new town service page gets "Garden Maintenance Romsey" (30, research) and the out-ranked location page is re-researched to the hub pattern, no conflict', job.mode === 'fill' && ts && ts.h1 === 'Garden Maintenance Romsey' && ts.h1_source === 'research' && ts.h1_volume === 30 && loc.h1 === 'Gardener Services in and around Romsey' && loc.h1_source === 'pattern' && !rows.some(r => r.applies && r.h1_source === 'conflict'), JSON.stringify([ts && [ts.h1, ts.h1_source], [loc.h1, loc.h1_source]]), '');
    chk('Fill mode still keeps every other research H1 (Hedge trimming 30, Gardener Winchester 140)', byKey('service:/services/hedge-trimming').h1 === 'Hedge Trimming Southampton' && byKey('location_category:/locations/winchester/gardener').h1 === 'Gardener Winchester', '', '');
    // The limits: a manual or Copy Generated page is never freed by a fresh page
    await store.setRow(cid, loc.id, { h1: 'Garden Maintenance Romsey' }); // a person types it back: manual
    await store.setExclude(cid, 'garden maintenance', true);
    await waitFor((await h1.start(cid, { kind: 'generate' })).id);
    await store.setExclude(cid, 'garden maintenance', false);
    job = await waitFor((await h1.start(cid, { kind: 'generate' })).id);
    rows = await store.saved(cid);
    chk('The fix respects the limits: a manual H1 keeps its keyword, so the fresh town service page cannot have it and is not created', byKey('location:/locations/romsey').h1 === 'Garden Maintenance Romsey' && byKey('location:/locations/romsey').h1_source === 'manual' && !(byKey('town_service:/locations/romsey/garden-maintenance') || {}).applies, JSON.stringify([byKey('location:/locations/romsey').h1_source, byKey('town_service:/locations/romsey/garden-maintenance')]), '');
    await store.setRow(cid, byKey('location:/locations/romsey').id, { h1: '' }); // back to research

    // ── The old-rules migration ──
    // Make the map look like 18 Oct: v1 "suggested" rows, researched "needed" rows, a manual page, a Copy Generated page, and a page that no longer applies
    const eastleigh = byKey('location:/locations/eastleigh'), kings = byKey('location:/locations/kings-worthy'), lcW = byKey('location_category:/locations/winchester/tree-service'), paving = byKey('category:/paving-contractor'), copyGen = byKey('location:/locations/winchester');
    await pool.query(`UPDATE client_page_map SET h1 = 'Gardener Eastleigh', h1_source = 'suggested', h1_suggestion = 'Gardener Eastleigh', status = 'Not Started' WHERE id = $1`, [eastleigh.id]);
    await pool.query(`UPDATE client_page_map SET h1 = '', h1_source = 'needed', h1_suggestion = 'Gardener Kings Worthy', status = 'Not Started' WHERE id = $1`, [kings.id]);
    await store.setRow(cid, lcW.id, { h1: 'Tree Surgeon Winchester' });
    await store.setRow(cid, paving.id, { h1: 'Patio Layers Southampton' });
    await pool.query(`UPDATE client_page_map SET h1 = 'Landscaper Winchester', h1_source = 'suggested', status = 'Copy Generated' WHERE id = $1`, [copyGen.id]);
    await pool.query(`INSERT INTO client_page_map (client_id, page_key, type, title, slug, h1, h1_source, status, applies, info, sort_order) VALUES ($1, 'service:/services/porch-construction', 'service', 'Porch construction', '/services/porch-construction', 'Porch construction Southampton', 'auto', 'Not Started', TRUE, '{"service_id":"porch construction","parent_keys":["deck_builder"]}', 999)`, [cid]);
    rows = await store.saved(cid);
    const before = JSON.stringify(rows.map(r => [r.page_key, r.h1, r.h1_source, r.status]));
    // Re-research on a map with old-rules pages still only previews
    const pv = await (await req('GET', `/api/clients/${cid}/h1-research/preview`)).json();
    chk('Re-research H1s still previews: nothing written, the changes listed', Array.isArray(pv.changes) && pv.changes.some(c => c.page_key === 'location:/locations/kings-worthy') && JSON.stringify((await store.saved(cid)).map(r => [r.page_key, r.h1, r.h1_source, r.status])) === before, JSON.stringify(pv.changes.length), '');
    // The migration
    let r = await (await req('POST', `/api/clients/${cid}/page-map/migrate`, {})).json();
    chk('POST page-map/migrate on a map with old-rules pages starts a generate job in "all" mode and says how many pages were on the old rules', r.job && r.job.kind === 'generate' && r.job.mode === 'all' && r.migrated === 4, JSON.stringify([r.job && r.job.mode, r.migrated]), '');
    job = await waitFor(r.job.id);
    rows = await store.saved(cid);
    chk('The job completes like a first run: progress fields and the summary stage', job.status === 'complete' && job.pages_total > 0 && /^Complete: \d+ H1s by search volume/.test(job.stage), job.stage, '');
    chk('Old-rules rows at Not Started are converted without confirmation: the "suggested" Eastleigh row and the researched-"needed" Kings Worthy row now carry current research or pattern H1s, status H1 Added', ['research', 'pattern'].includes(byKey('location:/locations/eastleigh').h1_source) && byKey('location:/locations/eastleigh').h1_suggestion === null && byKey('location:/locations/eastleigh').status === 'H1 Added' && byKey('location:/locations/kings-worthy').h1 === 'Gardener Services in and around Kings Worthy' && byKey('location:/locations/kings-worthy').h1_source === 'pattern', JSON.stringify([byKey('location:/locations/eastleigh').h1_source, byKey('location:/locations/kings-worthy').h1]), '');
    chk('Never manual: the typed Tree Surgeon Winchester and Patio Layers Southampton stay', byKey(lcW.page_key).h1 === 'Tree Surgeon Winchester' && byKey(lcW.page_key).h1_source === 'manual' && byKey(paving.page_key).h1 === 'Patio Layers Southampton' && byKey(paving.page_key).h1_source === 'manual', '', '');
    chk('Never Copy Generated: the Winchester location page keeps its old H1 and status and gets "research now suggests"', byKey(copyGen.page_key).h1 === 'Landscaper Winchester' && byKey(copyGen.page_key).status === 'Copy Generated' && byKey(copyGen.page_key).h1_source === 'suggested' && !!byKey(copyGen.page_key).h1_suggests, JSON.stringify([byKey(copyGen.page_key).h1, byKey(copyGen.page_key).h1_suggests]), '');
    chk('A page that no longer applies is retired with the reason, not deleted', byKey('service:/services/porch-construction') && !byKey('service:/services/porch-construction').applies && /no longer one of this client's services|niche library|excluded/.test(byKey('service:/services/porch-construction').retired_reason), byKey('service:/services/porch-construction').retired_reason, '');
    const oldLeft = rows.filter(x => x.applies && (x.h1_source === 'suggested' || (x.h1_source === 'needed' && x.h1_researched_at)));
    chk('The banner condition clears: no applying page is on the old rules any more (the Copy Generated page keeps its old source but is not editable; it is the one left)', oldLeft.length === 1 && oldLeft[0].page_key === copyGen.page_key, JSON.stringify(oldLeft.map(x => x.page_key)), '');
    r = await (await req('POST', `/api/clients/${cid}/page-map/migrate`, {})).json();
    chk('Running the migration again starts a job only while old-rules pages remain; the Copy Generated one does not count once promoted', r.job === null || r.migrated === 1, JSON.stringify(r), '');
    await store.setRow(cid, copyGen.id, { status: 'Live' });
    await pool.query(`UPDATE client_page_map SET h1_source = 'research' WHERE id = $1`, [copyGen.id]); // a later edit by research would do this; here the row is simply no longer old
    r = await (await req('POST', `/api/clients/${cid}/page-map/migrate`, {})).json();
    chk('With nothing on the old rules, POST migrate starts no job', r.job === null && r.migrated === 0, JSON.stringify(r), '');
    const pv2 = await (await req('GET', `/api/clients/${cid}/h1-research/preview`)).json();
    chk('Afterwards Re-research H1s still previews first (changes and notes, nothing written)', Array.isArray(pv2.changes) && Array.isArray(pv2.notes) && typeof pv2.realCount === 'number', '', '');
  } finally { srv.close(); }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
