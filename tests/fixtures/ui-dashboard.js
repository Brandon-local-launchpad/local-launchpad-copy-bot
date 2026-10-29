'use strict';
// Fixture: the redesigned UI's dashboard (ui/dashboard.js, ui/routes.js) on pg-mem.
// The stage and blocker rules on a thin client and a rich one, the needs a person
// count, running now, the Top 3% series, assigned_to, and the app shell paths.
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const { ensureFilloutTables } = require(path.join(root, 'fillout/service.js'));
const { ensureAllocationColumns } = require(path.join(root, 'fillout/allocation.js'));
const AS = require(path.join(root, 'fillout/additional-services.js'));
const { ensurePageMapTables } = require(path.join(root, 'page-map/store.js'));
const { ensureH1Tables } = require(path.join(root, 'h1-research/service.js'));
const { ensureWpTables } = require(path.join(root, 'wp/db-store.js'));
const D = require(path.join(root, 'ui/dashboard.js'));
const R = require(path.join(root, 'ui/routes.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: the dashboard (stage, blockers, needs a person, running, rankings) ===\n');

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metadata JSONB);
    CREATE TABLE pages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, page_type TEXT, page_title TEXT, url_slug TEXT);
    CREATE TABLE research_jobs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), session_id TEXT, client_id UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), status TEXT NOT NULL DEFAULT 'pending', preset TEXT, locations JSONB NOT NULL DEFAULT '{}');`);
  await ensureFilloutTables(pool); await ensureAllocationColumns(pool); await AS.ensureAdditionalTables(pool); await ensurePageMapTables(pool); await ensureH1Tables(pool); await ensureWpTables(pool); await R.ensureUiColumns(pool);

  const asset = (clientId, type, content, metadata = null, at = null) => pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content, metadata${at ? ', uploaded_at' : ''}) VALUES ($1, $2, 'x', $3, $4${at ? ', $5' : ''})`, at ? [clientId, type, JSON.stringify(content), metadata ? JSON.stringify(metadata) : null, at] : [clientId, type, JSON.stringify(content), metadata ? JSON.stringify(metadata) : null]);
  const mapRow = (clientId, type, slug, title, info = {}) => pool.query(`INSERT INTO client_page_map (client_id, page_key, type, title, slug, status, applies, info, sort_order) VALUES ($1, $2, $3, $4, $5, 'Not Started', TRUE, $6, 0)`, [clientId, `${type}:${slug}`, type, title, slug, JSON.stringify(info)]);

  // ── Thin: a hand-made client with a niche, nothing else ──
  const { rows: [thin] } = await pool.query(`INSERT INTO clients (name, trade, niche_key) VALUES ('Thin Gardens', 'Landscaper', 'landscapers-gardeners') RETURNING id`);
  // ── A Fillout client not yet allocated ──
  const { rows: [raw] } = await pool.query(`INSERT INTO clients (name, trade, source) VALUES ('Unsorted Roofing', 'Roofer', 'fillout') RETURNING id`);
  await pool.query(`INSERT INTO fillout_submissions (submission_id, raw_payload, status, client_id, received_at) VALUES ('s1', '{}', 'processed', $1, NOW())`, [raw.id]);
  // ── Rich: Edens Edge with a map, dossier, pages (one with claims, one blocked), a push ──
  const { rows: [rich] } = await pool.query(`INSERT INTO clients (name, trade, niche_key, reviewed_at, source) VALUES ('Edens Edge', 'Landscaper', 'landscapers-gardeners', NOW(), 'fillout') RETURNING id`);
  await pool.query(`INSERT INTO fillout_submissions (submission_id, raw_payload, status, client_id, received_at) VALUES ('s2', '{}', 'processed', $1, NOW() - INTERVAL '3 days')`, [rich.id]);
  await asset(rich.id, 'client_values', { phone: '023 8000 0000', free_quotes: 'yes', primary_category: 'Landscaper', confirmed_practices: ['tidy_site'], business_type: 'B' });
  await asset(rich.id, 'geo_dossier', 'dossier text', { location_norm: 'southampton', location_name: 'Southampton' });
  await mapRow(rich.id, 'homepage', '/', 'Edens Edge Homepage', { phase: 1 });
  await mapRow(rich.id, 'category', '/landscaper-southampton', 'Landscaper', { category_key: 'landscaper', phase: 1 });
  await mapRow(rich.id, 'service', '/garden-design-southampton', 'Garden Design', { phase: 1 });
  await mapRow(rich.id, 'location', '/romsey', 'Romsey', { town: 'Romsey', phase: 1 });
  await mapRow(rich.id, 'location', '/winchester', 'Winchester', { town: 'Winchester', phase: 2 });
  const good = { VALIDATION: { status: 'run', block: 0, flag: 2 }, CLAIMS: { findings: [{ quote: 'a' }, { quote: 'b' }], accepted: [{ quote: 'a' }] }, QUALITY: { score: 8.7 }, meta: { generated_at: '2026-10-20T10:00:00Z' } };
  const old = { VALIDATION: { status: 'run', block: 3, flag: 0 }, meta: { generated_at: '2026-10-19T10:00:00Z' } };
  await asset(rich.id, 'v20_page_record', old, null, '2026-10-19T10:00:00Z');
  await asset(rich.id, 'v20_page_record', good, null, '2026-10-20T10:00:00Z');
  await asset(rich.id, 'v20_page_record', { VALIDATION: { status: 'run', block: 2, flag: 1 }, meta: { generated_at: '2026-10-21T10:00:00Z' } }, { page_type: 'category', page_key: '/landscaper-southampton' });
  await asset(rich.id, 'gbp_scan', { month: '2026-09', keyword: 'landscaper southampton', top_3_percentage: 41, status: 'completed', run_type: 'baseline', kind: 'primary', heatmap_id: 1 });
  await asset(rich.id, 'gbp_scan', { month: '2026-10', keyword: 'landscaper southampton', top_3_percentage: 55, status: 'completed', run_type: 'monthly', kind: 'primary', heatmap_id: 2 });

  const tradeFacts = { status: async niche => ({ niche, verified: false, message: 'unverified' }) };
  const runners = { category: { running: new Map([[rich.id, { startedAt: new Date().toISOString(), current: '/landscaper-southampton' }]]) }, service: { running: new Map() }, location: { running: new Map() } };
  await asset(rich.id, 'category_run', { started_at: 'x', pages: [{ key: '/landscaper-southampton', title: 'Landscaper', status: 'running' }, { key: '/x', title: 'Driveways', status: 'pending' }] });

  const d = await D.loadDashboard({ pool, tradeFacts, runners, now: new Date() });
  const byName = Object.fromEntries(d.clients.map(c => [c.name, c]));
  const T = byName['Thin Gardens'], U = byName['Unsorted Roofing'], E = byName['Edens Edge'];
  chk('Thin: no values and no record → Onboarding, with the key fields named as the blocker', T.stage === 'Onboarding' && T.blocker === 'no phone, no quote method, no primary category, no practices ticked', `${T.stage} / ${T.blocker}`, '');
  chk('Unsorted Fillout client: no niche → Onboarding, no blocker text (nothing to fill until it is allocated)', U.stage === 'Onboarding' && U.blocker === '' && U.needs_person === false, `${U.stage} / ${U.blocker}`, '');
  chk('Rich: a page map with unwritten pages → Pages', E.stage === 'Pages', E.stage, 'Pages');
  chk('Rich: the first blocker is the unverified pack (service pages in the map), then the town with no dossier, the claim, the blocked page', E.blocker === 'pack unverified' && E.blockers.map(b => b.text).join(' | ') === 'pack unverified | no dossier for Romsey | 1 claim to accept | 1 page blocked', E.blockers.map(b => b.text).join(' | '), '');
  chk('Rich: phase 2 Winchester is not a launch town, so no dossier is asked for', !E.towns_without_dossier.includes('Winchester'), JSON.stringify(E.towns_without_dossier), '');
  chk('Rich: the latest homepage version counts (block 0), not the older one', E.pages.written === 1 && E.pages.total === 4, JSON.stringify(E.pages), '{written:1,total:4}');
  chk('Rich: business type from the client values', E.business_type === 'B', E.business_type, 'B');
  chk('Tiles: new clients today 1 (the raw Fillout client), this week 2 (plus Edens Edge 3 days ago), the hand-made client never counts', d.tiles.new_today === 1 && d.tiles.new_week === 2, JSON.stringify(d.tiles), '');
  chk('Tiles: needs a person counts clients (2: thin fields, rich pack+claims+blocked), split by kind', d.tiles.needs_person.count === 2 && d.tiles.needs_person.by_kind.fields === 1 && d.tiles.needs_person.by_kind.pack === 1 && d.tiles.needs_person.by_kind.claims === 1 && d.tiles.needs_person.by_kind.blocked === 1, JSON.stringify(d.tiles.needs_person), '');
  chk('Running now: the category run with its current page and the next one, 0 of 2 done', d.running.length === 1 && d.running[0].kind === 'category pages' && d.running[0].now === 'Writing Landscaper' && d.running[0].next === 'Next: Driveways' && d.running[0].done === 0 && d.running[0].total === 2 && E.running === true, JSON.stringify(d.running), '');
  chk('Last activity is set on every client', d.clients.every(c => c.last_activity), '', '');

  // Live: a push logged
  await pool.query(`INSERT INTO wp_push_log (client_id, action, result, entry) VALUES ($1, 'push', 'pushed', $2)`, [rich.id, JSON.stringify({ pageType: 'homepage', result: 'pushed' })]);
  const d2 = await D.loadDashboard({ pool, tradeFacts, runners: {}, now: new Date() });
  chk('A pushed page makes the client Live whatever else is open', d2.clients.find(c => c.id === rich.id).stage === 'Live', d2.clients.find(c => c.id === rich.id).stage, 'Live');

  // Stage rules, pure
  const base = { nicheKnown: true, reviewed: true, hasValues: true, dossiers: [{}], mapRows: [{}], pages: [{ good: true }], pushed: [], missing: [], packUnverified: false, townsWithoutDossier: [] };
  chk('stageOf: everything written and nothing pushed → GBP', D.stageOf(base) === 'GBP', D.stageOf(base), 'GBP');
  chk('stageOf: no page map → Page map; no dossier → Research', D.stageOf({ ...base, mapRows: [] }) === 'Page map' && D.stageOf({ ...base, dossiers: [] }) === 'Research', '', '');
  chk('stageOf: a Fillout record not reviewed and no values → Onboarding; reviewed → on', D.stageOf({ ...base, reviewed: false, hasValues: false }) === 'Onboarding' && D.stageOf({ ...base, hasValues: false }) === 'GBP', '', '');

  // Rankings
  const rk = await D.loadRankings({ pool, months: 6, now: new Date('2026-10-27') });
  chk('Rankings: 6 months, Edens Edge on its primary keyword with the two scanned months', rk.months.length === 6 && rk.months[5] === '2026-10' && rk.series.length === 1 && rk.series[0].name === 'Edens Edge' && rk.series[0].points.map(p => `${p.x}:${p.y}`).join(',') === '2026-09:41,2026-10:55', JSON.stringify(rk), '');

  // Routes
  const app = express(); app.use(express.json());
  R.mountUiApi(app, { pool, tradeFacts, runners: () => ({}), homepageRunning: () => null });
  R.mountAppShell(app, path.join(root, 'public'));
  const srv = http.createServer(app); await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base2 = `http://127.0.0.1:${srv.address().port}`;
  try {
    const j = await (await fetch(`${base2}/api/dashboard`)).json();
    chk('GET /api/dashboard returns tiles, clients, running, stages', j.tiles && Array.isArray(j.clients) && Array.isArray(j.running) && j.stages.length === 6, Object.keys(j).join(','), '');
    const a = await (await fetch(`${base2}/api/clients/${rich.id}/assigned-to`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '  Brandon ' }) })).json();
    const j2 = await (await fetch(`${base2}/api/dashboard`)).json();
    chk('PUT assigned-to trims and shows on the dashboard row', a.assigned_to === 'Brandon' && j2.clients.find(c => c.id === rich.id).assigned_to === 'Brandon', JSON.stringify(a), '');
    const a2 = await (await fetch(`${base2}/api/clients/${rich.id}/assigned-to`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '' }) })).json();
    chk('PUT assigned-to with a blank clears it', a2.assigned_to === '', JSON.stringify(a2), '');
    const miss = await fetch(`${base2}/api/clients/${crypto.randomUUID()}/assigned-to`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{"name":"x"}' });
    chk('PUT assigned-to on an unknown client is 404', miss.status === 404, miss.status, 404);
    for (const p of ['/dashboard', '/clients', `/clients/${rich.id}/pages`, '/add-client', '/niches/roofer', '/settings']) {
      const r = await fetch(base2 + p); const t = await r.text();
      chk(`App shell served at ${p}`, r.status === 200 && t.includes('/app/shell.js'), r.status, 200);
    }
    const rr = await (await fetch(`${base2}/api/dashboard/rankings?months=3`)).json();
    chk('GET /api/dashboard/rankings honours months', rr.months.length === 3, rr.months.length, 3);
  } finally { srv.close(); }

  console.log(`\n${pass} passed, ${fail} failed`);
  // A tick for the closed server's handles, so the exit is clean on Windows
  setTimeout(() => process.exit(fail ? 1 : 0), 100);
})().catch(e => { console.error(e); process.exit(1); });
