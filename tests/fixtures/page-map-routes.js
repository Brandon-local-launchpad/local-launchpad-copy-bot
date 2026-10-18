'use strict';
// Fixture: the page map and "Set up by hand" routes (page-map/routes.js) through
// HTTP with pg-mem. A hand-made client (no Fillout record): the editor's view,
// saving ticks and towns as hand edits, the resolver and page map built from them,
// edits, the dry run and the CSV. A Fillout client: the hand set-up survives a
// Reprocess and a resubmission.
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const { ensureFilloutTables, createFilloutService } = require(path.join(root, 'fillout/service.js'));
const { ensureAudioBlobTable, createPgAudioStore } = require(path.join(root, 'fillout/audio-store.js'));
const { ensurePriceTables } = require(path.join(root, 'fillout/prices.js'));
const { ensureAllocationColumns } = require(path.join(root, 'fillout/allocation.js'));
const AS = require(path.join(root, 'fillout/additional-services.js'));
const { ensurePageMapTables } = require(path.join(root, 'page-map/store.js'));
const { mountPageMapApi } = require(path.join(root, 'page-map/routes.js'));
const routes = require(path.join(root, 'fillout/routes.js'));
const ticks = require(path.join(root, 'tests/fixtures/data/edens-edge-ticks.js'));
const S = require(path.join(root, 'tools/seed-edens-edge.js'));
const sample = require(path.join(root, 'fixtures/fillout-sample.json'));
const fieldMap = require(path.join(root, 'fillout/field-map.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: page map routes and the hand set-up editor ===\n');
const quiet = { log() {}, info() {}, warn() {}, error() {} };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clone = o => JSON.parse(JSON.stringify(o));

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  await ensureFilloutTables(pool); await ensureAudioBlobTable(pool); await ensurePriceTables(pool); await ensureAllocationColumns(pool); await AS.ensureAdditionalTables(pool); await ensurePageMapTables(pool);
  const svc = createFilloutService({ pool, audioStore: createPgAudioStore(pool), fetchAudio: async () => ({ buffer: Buffer.from('ID3x'), contentType: 'audio/mpeg' }), log: quiet });
  const app = express(); routes.mountWebhook(app, svc, { secret: 's', log: quiet }); app.use(express.json()); routes.mountApi(app, svc); mountPageMapApi(app, { pool, filloutService: svc });
  const srv = http.createServer(app); await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const req = (method, p, body) => fetch(base + p, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = async r => r.json();
  try {
    // ── A hand-made client ──
    const { rows: [c] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('Hand Made Gardens', 'Landscaper') RETURNING id`);
    let b = await json(await req('GET', `/api/clients/${c.id}/services/by-hand`));
    chk('Editor view: no Fillout record, niche not saved yet but suggested from the trade, its 7 tick groups shown, nothing ticked', b.hasFillout === false && b.niche === null && b.suggestedNiche === 'Landscapers/Gardeners' && b.niches.includes('Landscapers/Gardeners') && b.groups.length === 7 && b.groups.every(x => !x.ticked.length), JSON.stringify([b.hasFillout, b.niche, b.suggestedNiche, b.groups.length]), '');
    let r = await req('PUT', `/api/clients/${c.id}/services/by-hand`, { niche: 'Chimney Sweeps' });
    chk('A niche with no categories file is refused', r.status === 400, r.status, 400);
    b = await json(await req('PUT', `/api/clients/${c.id}/services/by-hand`, { niche: 'Landscapers/Gardeners' }));
    chk('Saving the niche shows the 7 category groups with the form\'s tick boxes', b.niche === 'Landscapers/Gardeners' && b.groups.length === 7 && b.groups[0].name === 'Gardener' && b.groups[0].options.length === 9, JSON.stringify(b.groups.map(g => g.options.length)), '');
    let pv = await json(await req('GET', `/api/clients/${c.id}/page-map/preview`));
    chk('Preview with no ticks and no base town: not ready, both problems named', pv.ok === false && pv.problems.length === 2, JSON.stringify(pv.problems), '');
    r = await req('POST', `/api/clients/${c.id}/page-map/generate`, {});
    chk('Generate refuses with nothing to map', r.status === 400, r.status, 400);
    const groupTicks = Object.fromEntries(b.groups.map(g => [g.field, ticks[g.field] || []]));
    groupTicks['landscapers.cat.gardener'] = [...groupTicks['landscapers.cat.gardener'], 'Not a real service'];
    b = await json(await req('PUT', `/api/clients/${c.id}/services/by-hand`, { niche: 'Landscapers/Gardeners', ticks: groupTicks, baseTown: ' Southampton ', otherTowns: S.OTHER_TOWNS.join('\n') + '\n\n', companyName: S.COMPANY }));
    chk('Saved: ticks (unknown names dropped), base town trimmed, towns one per line, company', b.groups.find(g => g.key === 'gardener').ticked.length === 8 && b.baseTown === 'Southampton' && b.otherTowns.split('\n').length === 13 && b.companyName === S.COMPANY, JSON.stringify([b.groups.find(g => g.key === 'gardener').ticked.length, b.baseTown]), '');
    const { rows: srcs } = await pool.query(`SELECT field_key, source FROM client_fields WHERE client_id = $1`, [c.id]);
    chk('Every saved value is a hand edit (source manual)', srcs.length === 11 && srcs.every(s => s.source === 'manual'), JSON.stringify(srcs), '11 manual');
    const sv = await json(await req('GET', `/api/clients/${c.id}/services`));
    chk('The resolver reads the hand ticks: 6 tabs, 78 services, Gardener primary', sv.hasConfig && sv.resolved.counts.tabs === 6 && sv.resolved.counts.services === 78 && sv.resolved.primary === 'gardener', JSON.stringify(sv.resolved && sv.resolved.counts), '');

    chk('Tick counts per category tick group and in total: Gardener 8 of 9, Deck Builder 16 of 17, 78 of 102 in all', (() => { const t = sv.tickCounts, by = k => t.find(x => x.key === k); return t.length === 7 && by('gardener').ticked === 8 && by('gardener').total === 9 && by('deck_builder').ticked === 16 && by('deck_builder').total === 17 && by('lawn_care_service').ticked === 0 && by('lawn_care_service').total === 1 && t.reduce((a, x) => a + x.ticked, 0) === 78 && t.reduce((a, x) => a + x.total, 0) === 102; })(), JSON.stringify(sv.tickCounts), '');
    const recA = await json(await req('GET', `/api/clients/${c.id}/record`));
    chk('A supported niche has no "Services not set up" flag', recA.servicesConfigured === true && !recA.attention.some(a => a.code === 'services_not_set_up'), JSON.stringify(recA.attention.map(a => a.code)), '');

    // ── A niche with no services file ──
    const { rows: [u] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('Sweep Pros', 'Chimney Sweeps') RETURNING id`);
    const recU = await json(await req('GET', `/api/clients/${u.id}/record`));
    chk('No services file: the record flags "Services not set up for this niche yet" in Needs attention', recU.niche === 'Chimney Sweeps' && recU.servicesConfigured === false && recU.attention.some(a => a.code === 'services_not_set_up' && a.group === 'blocks' && /Services not set up for this niche yet \(Chimney Sweeps\)/.test(a.msg)), JSON.stringify(recU.attention.map(a => a.code)), '');
    const svU = await json(await req('GET', `/api/clients/${u.id}/services`));
    chk('No services file: the Services view says so (hasConfig false), not an empty resolver result', svU.hasConfig === false && svU.resolved === null, JSON.stringify([svU.hasConfig, svU.niche]), '');
    const pvU = await json(await req('GET', `/api/clients/${u.id}/page-map/preview`));
    chk('No services file: the page map preview is not ready and names the reason', pvU.ok === false && pvU.inputs.hasConfig === false && pvU.problems.length === 1 && pvU.problems[0].code === 'services_not_set_up', JSON.stringify(pvU.problems), '');
    r = await req('POST', `/api/clients/${u.id}/page-map/generate`, {});
    chk('No services file: Generate page map is refused', r.status === 400 && /Services not set up/.test((await r.json()).error), r.status, 400);

    pv = await json(await req('GET', `/api/clients/${c.id}/page-map/preview`));
    chk('Preview: first run would add 176, inputs shown, nothing written', pv.ok && pv.firstRun && pv.diff.counts.wouldAdd === 176 && pv.inputs.tabs === 6 && pv.inputs.baseTown === 'Southampton' && (await json(await req('GET', `/api/clients/${c.id}/page-map`))).rows.length === 0, JSON.stringify(pv.diff && pv.diff.counts), '');
    let g = await json(await req('POST', `/api/clients/${c.id}/page-map/generate`, { rule: 'ticked_or_propagated' }));
    chk('Generate with ticked_or_propagated: 190 rows and the rule remembered', g.rows.length === 190 && g.state.category_tab_rule === 'ticked_or_propagated', JSON.stringify([g.rows.length, g.state && g.state.category_tab_rule]), '');
    g = await json(await req('POST', `/api/clients/${c.id}/page-map/generate`, { rule: 'ticked_only' }));
    chk('Back to ticked_only: Lawn Care Service and its 13 location pages no longer apply (14 retired, none deleted)', g.rows.length === 190 && g.rows.filter(x => !x.applies).length === 14 && g.counts.wouldRetire === 14, JSON.stringify(g.counts), '');
    const home = g.rows.find(x => x.page_key === 'homepage:/');
    let row = await json(await req('PUT', `/api/clients/${c.id}/page-map/${home.id}`, { h1: 'Landscaper Southampton' }));
    chk('Editing an H1 through the API: manual, status H1 Added', row.h1 === 'Landscaper Southampton' && row.h1_source === 'manual' && row.status === 'H1 Added', JSON.stringify([row.h1_source, row.status]), '');
    row = await json(await req('PUT', `/api/clients/${c.id}/page-map/${home.id}`, { status: 'Pushed to WordPress' }));
    chk('Status dropdown values save', row.status === 'Pushed to WordPress', row.status, '');
    r = await req('PUT', `/api/clients/${c.id}/page-map/${crypto.randomUUID()}`, { status: 'Live' });
    chk('Editing an unknown row is a 404', r.status === 404, r.status, 404);
    const csvRes = await req('GET', `/api/clients/${c.id}/page-map.csv`);
    const csv = (await csvRes.text()).replace(/^﻿/, '');
    chk('CSV download: old column order, 176 applying rows, the edited homepage first', /attachment; filename="Hand_Made_Gardens_page_map.csv"/.test(csvRes.headers.get('content-disposition')) && csv.startsWith('Page Type,Page Title,URL Slug,H1 (Ahrefs),Meta Title,Meta Description,Links TO,Links FROM,Status') && csv.split('\r\n')[1].startsWith('Homepage,Edens Edge landscaping Homepage,/,Landscaper Southampton,') && !/Lawn Care Service/.test(csv), csv.split('\r\n')[1].slice(0, 80), '');
    // Saving the editor again (same values) changes nothing in the page map
    await req('PUT', `/api/clients/${c.id}/services/by-hand`, { niche: 'Landscapers/Gardeners', ticks: groupTicks, baseTown: 'Southampton', otherTowns: S.OTHER_TOWNS.join('\n'), companyName: S.COMPANY });
    pv = await json(await req('GET', `/api/clients/${c.id}/page-map/preview`));
    chk('Re-saving the same set-up: the dry run shows nothing to add, retire or update', pv.diff.counts.wouldAdd === 0 && pv.diff.counts.wouldRetire === 0 && pv.diff.counts.wouldUpdate === 0, JSON.stringify(pv.diff.counts), '');

    // ── A Fillout client: the hand set-up survives Reprocess and a resubmission ──
    const payload = sid => {
      const p = clone(sample); p.submission.submissionId = sid;
      const qs = p.submission.questions;
      qs.find(q => q.id === 'q_niche_select').value = 'Landscapers/Gardeners';
      qs.find(q => q.id === 'bwUuvaZTmChegZekppzNNv').value = 'Formed Gardens'; qs.find(q => q.id === '5EHeuZ2pntQwCaoADHRRrJ').value = 'f@example.com';
      for (const f of fieldMap.fields.filter(f => f.niche === 'Landscapers/Gardeners')) { const q = qs.find(q => q.id === f.id); if (q) q.value = f.key === 'landscapers.cat.gardener' ? ['Hedge trimming'] : null; }
      const town = fieldMap.fields.find(f => f.key === 'primary_town'); const t = qs.find(q => q.id === town.id); if (t) t.value = 'Romsey';
      return p;
    };
    const deliver = async sid => { await req('POST', `/api/webhooks/fillout?token=s`, payload(sid)); for (let i = 0; i < 300; i++) { const x = (await pool.query(`SELECT client_id, status FROM fillout_submissions WHERE submission_id = $1`, [sid])).rows[0]; if (x && x.status !== 'received') { await sleep(150); return x.client_id; } await sleep(10); } throw new Error('never processed'); };
    const fid = await deliver('pm-0001');
    b = await json(await req('GET', `/api/clients/${fid}/services/by-hand`));
    chk('A Fillout client: the editor view says it has a Fillout record (the page hides the editor)', b.hasFillout === true && b.niche === 'Landscapers/Gardeners', JSON.stringify([b.hasFillout, b.niche]), '');
    await req('PUT', `/api/clients/${fid}/services/by-hand`, { niche: 'Landscapers/Gardeners', ticks: { 'landscapers.cat.gardener': ['Hedge trimming', 'Mulching'] }, baseTown: 'Southampton', otherTowns: 'Romsey\nWinchester' });
    const sub = (await pool.query(`SELECT id FROM fillout_submissions WHERE submission_id = 'pm-0001'`)).rows[0].id;
    await req('POST', `/api/fillout/submissions/${sub}/reprocess`); await sleep(200);
    await deliver('pm-0002');
    b = await json(await req('GET', `/api/clients/${fid}/services/by-hand`));
    chk('After Reprocess and a resubmission the hand set-up is kept (ticks, base town, other towns)', b.groups.find(x => x.key === 'gardener').ticked.join() === 'Hedge trimming,Mulching' && b.baseTown === 'Southampton' && b.otherTowns === 'Romsey\nWinchester', JSON.stringify([b.groups.find(x => x.key === 'gardener').ticked, b.baseTown, b.otherTowns]), '');
  } finally { srv.close(); }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
