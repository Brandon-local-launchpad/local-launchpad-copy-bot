#!/usr/bin/env node
'use strict';
// ── Blog posts: the acceptance test (the build plan, section 2; 29 Oct 2026) ─────────────
// Two clients through the whole blog path with the real model, as the live app runs it, and
// nothing outside this machine: Edens Edge (landscaper, Southampton, the live FAQ research of
// 14 Oct replayed, the approved landscaper bank, the Southampton dossier, two made up price
// rows) and Kestrel Ridge rich (roofer, Bournemouth, the paper test's values and page map, the
// roofer research replayed, the roofer bank from blog-bank/roofer.md, the fixture's price
// rows, no dossier). For each client:
//   1. the queue (the onboarding batch: what runs, what is gated and why, what is held and why)
//   2. the posts written with the real model (the validator's BLOCK and FLAG counts, the claims review)
//   3. the push of every clean post to the fake WordPress server (never a real site)
//   4. 190 days of the daily job from the launch, one run a day with the clock override: a
//      phase 2 page that goes Live on day 40 (a post linking it is held until then), a price
//      change on day 60 (the post stating it is written again with the real model), no churn
// Every record, reader view and decisions block lands under tests/quality-runs/blog/ACCEPTANCE_<date>/
// with REPORT.md: the runs, gates, holds and their reasons, the pushes, the simulation and the cost.
//
//   node tests/acceptance/blog.js                       both clients
//   node tests/acceptance/blog.js --client kestrel-ridge
//   node tests/acceptance/blog.js --launch 2026-11-09   the launch date (default 2026-11-09)
//   node tests/acceptance/blog.js --model claude-opus-5-5
//   node tests/acceptance/blog.js --no-claims           skip the claims review (then nothing is pushed)
//   node tests/acceptance/blog.js --accept-claims       push a post whose claims review found statements to accept, as a person
//                                                      would after reading them (they are all listed); without it such a post is not pushed
// Needs ANTHROPIC_API_KEY in .env. About 40p to 80p a post.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
for (const line of (fs.existsSync(path.join(root, '.env')) ? fs.readFileSync(path.join(root, '.env'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY is not set in .env.'); process.exit(1); }

const Anthropic = require('@anthropic-ai/sdk');
const { newDb, DataType } = require('pg-mem');
const { makeCallModel } = require(path.join(root, 'anthropic-call.js'));
const R = require(path.join(root, 'faq-research.js'));
const S = require(path.join(root, 'faq-sort.js'));
const C = require(path.join(root, 'tests/fixtures/data/faq-clients.js'));
const B = require(path.join(root, 'blog/bank.js'));
const { reserveBlogTopics } = require(path.join(root, 'blog/topics.js'));
const { createBlogQueueService } = require(path.join(root, 'blog/queue-service.js'));
const { createBlogRunner } = require(path.join(root, 'blog/run.js'));
const BG = require(path.join(root, 'blog/generate.js'));
const { ensureBlogColumns, saveBlogSettings } = require(path.join(root, 'blog/db.js'));
const { ensurePageMapTables, createPageMapStore } = require(path.join(root, 'page-map/store.js'));
const { createV20Store } = require(path.join(root, 'v20-store.js'));
const { buildBlogReaderView } = require(path.join(root, 'blog/reader.js'));
const P = require(path.join(root, 'trade-facts/pack.js'));
const D = require(path.join(root, 'blog/daily.js'));
const { push } = require(path.join(root, 'wp/push.js'));
const { createMemoryStore } = require(path.join(root, 'wp/push-store.js'));
const { createFakeWp, listen } = require(path.join(root, 'tests/fake-wp/fake-wp.js'));
const { ensureFilloutTables } = require(path.join(root, 'fillout/service.js'));
const { ensureAllocationColumns } = require(path.join(root, 'fillout/allocation.js'));
const AS = require(path.join(root, 'fillout/additional-services.js'));
const { ensureH1Tables } = require(path.join(root, 'h1-research/service.js'));
const { ensureWpTables } = require(path.join(root, 'wp/db-store.js'));
const UR = require(path.join(root, 'ui/routes.js'));

const arg = name => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
const flag = name => process.argv.includes(name);
const LAUNCH = arg('--launch') || '2026-11-09';
const MODEL = arg('--model') || BG.BLOG_MODEL;
const CLAIMS = !flag('--no-claims');
const ACCEPT = flag('--accept-claims'); // the push accepts the claims review's findings after listing them (a person's step on the live app), so the push and the daily job run
const dayAt = n => new Date(new Date(`${LAUNCH}T10:00:00Z`).getTime() + n * 86400000);
const addDaysStr = (day, n) => new Date(new Date(`${day}T12:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
const dayOf = d => Math.round((new Date(`${d}T12:00:00Z`) - new Date(`${LAUNCH}T12:00:00Z`)) / 86400000);
const pounds = p => `£${((p || 0) / 100).toFixed(2)}`;

// ── The two clients ──
const CLIENTS = {
  'edens-edge': () => {
    const c = C.byId['edens-edge'];
    const snapFile = path.join(root, 'tests/live-snapshots/edens-edge.json');
    const snap = fs.existsSync(snapFile) ? JSON.parse(fs.readFileSync(snapFile, 'utf8')) : null;
    return {
      id: 'edens-edge', name: 'Edens Edge', trade: 'Landscaper', pack: 'landscaper',
      niche: { ...c.niche, _source: 'landscaper' },
      cv: { ...(snap ? snap.cv : c.cvThin), jobs_wanted: ['Landscape Gardener', 'Landscape Designer'], primary_category: 'Gardener' },
      cvSource: snap ? 'the live snapshot (tests/live-snapshots/edens-edge.json)' : 'the fixture values (no live snapshot on this machine)',
      pages: c.pages, keyValueMap: c.keyValueMap, serviceParentMap: c.serviceParentMap,
      research: path.join(root, 'tests/fixtures/faq-research-replies/edens-edge-live-2026-10-14.md'),
      replies: path.join(root, 'tests/fixtures/faq-sort-replies/edens-edge-live.json'),
      tidyCv: null,
      bank: path.join(root, 'blog-bank/landscaper.md'),
      dossier: { location: 'Southampton', file: path.join(root, 'tests/fixtures/southampton-dossier.md') },
      calibration: 'Landscaper_Calibration_Pack_v4.md',
      // Edens Edge has no price rows on file: two made up for the run, said so in the report
      priceRows: [
        { id: 'p1', service: 'Artificial turf installation', from_gbp: 1500, up_to_gbp: 4000, unit: 'per job', what_moves_price: 'the area and the base', quote_only: false, unverified: false, deleted: false },
        { id: 'p2', service: 'Driveway landscaping', from_gbp: 3000, up_to_gbp: 9000, unit: 'per job', what_moves_price: 'the area, the surface and the drainage', quote_only: false, unverified: false, deleted: false },
      ],
      priceNote: 'two price rows made up for the run (Artificial turf installation, Driveway landscaping): Edens Edge has none on file',
    };
  },
  'kestrel-ridge': () => {
    const c = C.byId['kestrel-ridge'];
    return {
      id: 'kestrel-ridge', name: 'Kestrel Ridge Roofing', trade: 'Roofer', pack: 'roofer',
      niche: { ...c.niche, _source: 'roofer' },
      // The paper test's three FAQ facts are stand-ins ("TEST quote includes"), which the push refuses by rule: three values made up for the run stand in their place, said so in the report
      cv: { ...c.cvRich, stand_ins: [], quote_includes: 'materials, labour, scaffolding and taking the waste away', deposit_terms: 'no deposit; payment on completion', waste_carrier_registered: 'yes' },
      cvSource: 'the paper test\'s rich values (tests/fixtures/data/kestrel-ridge-rich.js) with quote_includes, deposit_terms and waste_carrier_registered made up for the run (the paper test has stand-ins there, which the push refuses)',
      pages: c.pages, keyValueMap: c.keyValueMap, serviceParentMap: c.serviceParentMap,
      research: c.researchFile,
      replies: path.join(root, 'tests/fixtures/faq-sort-replies/kestrel-ridge.json'),
      tidyCv: c.cvThin, // the saved tidy replies were made against the thin values
      bank: path.join(root, 'blog-bank/roofer.md'),
      dossier: null,
      calibration: 'Roofer_Calibration_Pack_v5.md',
      // The fixture's rows (tests/fixtures/blog-data.js): the client's paper test has none
      priceRows: [
        { id: 'p1', service: 'Roof repairs', from_gbp: 150, up_to_gbp: 600, typical_gbp: null, unit: 'per job', what_moves_price: 'access and how many tiles', quote_only: false, unverified: false, deleted: false },
        { id: 'p2', service: 'Flat roof replacement', from_gbp: 1500, up_to_gbp: 5000, typical_gbp: null, unit: 'per job', what_moves_price: '', quote_only: false, unverified: false, deleted: false },
        { id: 'p3', service: 'Roof replacement', from_gbp: null, up_to_gbp: null, typical_gbp: null, unit: null, what_moves_price: '', quote_only: true, unverified: false, deleted: false },
        { id: 'p4', service: 'Leadwork', from_gbp: 300, up_to_gbp: null, typical_gbp: null, unit: 'per job', what_moves_price: '', quote_only: false, unverified: true, deleted: false },
        { id: 'p5', service: 'Velux windows', from_gbp: 900, up_to_gbp: 1400, typical_gbp: null, unit: 'per job', what_moves_price: '', quote_only: false, unverified: false, deleted: false },
      ],
      priceNote: 'the fixture\'s five price rows (Roof repairs, Flat roof replacement, Roof replacement quote only, Leadwork unverified, Velux windows): the paper test has none',
    };
  },
};

async function newPool() {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metadata JSONB);
    CREATE TABLE pages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, page_type TEXT, page_title TEXT, url_slug TEXT);
    CREATE TABLE research_jobs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), session_id TEXT, client_id UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), status TEXT NOT NULL DEFAULT 'pending', preset TEXT, locations JSONB NOT NULL DEFAULT '{}');`);
  await ensureFilloutTables(pool); await ensureAllocationColumns(pool); await AS.ensureAdditionalTables(pool); await ensurePageMapTables(pool); await ensureH1Tables(pool); await ensureWpTables(pool); await UR.ensureUiColumns(pool); await ensureBlogColumns(pool);
  return pool;
}

const short = (s, n = 140) => String(s || '').replace(/\s+/g, ' ').slice(0, n);

async function runClient(cfg, outRoot, callModel) {
  const out = path.join(outRoot, cfg.id);
  fs.mkdirSync(out, { recursive: true });
  const rep = [];
  const say = s => { rep.push(s); console.log(s); };
  say(`\n## ${cfg.name} (${cfg.trade})\n`);
  say(`Inputs: the values from ${cfg.cvSource}; ${cfg.priceNote}; the bank ${path.relative(root, cfg.bank)}; ${cfg.dossier ? `the ${cfg.dossier.location} dossier` : 'no dossier on file (the local posts need one)'}; launch ${LAUNCH}; model ${MODEL}; claims review ${CLAIMS ? 'on' : 'off'}${ACCEPT ? ', its findings accepted at the push for the test (listed under the posts)' : ''}.\n`);
  if (!fs.existsSync(cfg.bank)) { say(`STOP: no bank at ${path.relative(root, cfg.bank)}. Run scripts/blog-bank.js and scripts/blog-bank-paa.js for ${cfg.pack} first.`); return { rep, cost: 0, stopped: true }; }

  // ── The FAQ research replayed through the saved tidy replies, the questions assigned ──
  const research = R.parseFaqResearch(fs.readFileSync(cfg.research, 'utf8'));
  const replies = JSON.parse(fs.readFileSync(cfg.replies, 'utf8')).replies;
  let i = 0;
  const tidy = await S.runTidy({ research, niche: cfg.niche, keyValueMap: cfg.keyValueMap, serviceParentMap: cfg.serviceParentMap, pages: cfg.pages, cv: cfg.tidyCv || cfg.cv, callModel: async () => { if (i >= replies.length) throw new Error(`the saved tidy replies ran out (${replies.length})`); return replies[i++]; } });
  const questions = tidy.questions.map(q => ({ ...q, approved: !q.wording_errors.length }));
  const A = S.assignQuestions({ questions, cv: cfg.cv, pages: cfg.pages, keyValueMap: cfg.keyValueMap, serviceParentMap: cfg.serviceParentMap, niche: cfg.niche });
  const bank = B.parseBank(fs.readFileSync(cfg.bank, 'utf8'));
  const dossierText = cfg.dossier ? fs.readFileSync(cfg.dossier.file, 'utf8') : null;
  const pageWordings = new Set(Object.values(A.pages).flatMap(pg => pg.questions.map(q => q.wording)));
  const res = reserveBlogTopics({ assignment: A, cv: cfg.cv, niche: cfg.niche, keyValueMap: cfg.keyValueMap, pages: cfg.pages, serviceParentMap: cfg.serviceParentMap, dossiers: cfg.dossier ? [{ location: cfg.dossier.location, text: dossierText }] : [], allocationRecord: { pages: {} }, bank, pageWordings, launchDate: LAUNCH });
  say(`FAQ research: ${questions.length} questions tidied (${i} saved replies), ${questions.filter(q => q.approved).length} approved; bank ${bank.version || 'v1'}: ${bank.topics.length} topics, ${bank.costTopics.length} cost topics, ${bank.seasonalTopics.length} seasonal.`);
  say(`Reservation: ${res.topics.length} topics, ${res.held_back.length} held back; ${res.flags.length} flags${res.flags.length ? ': ' + res.flags.map(f => f.code).join(', ') : ''}.`);

  // ── The stores: the client, its settings, the dossier, the page map's pages ──
  const pool = await newPool();
  const { rows: [client] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ($1, $2) RETURNING id`, [cfg.name, cfg.trade]);
  await saveBlogSettings(pool, client.id, { launch_date: LAUNCH });
  if (cfg.dossier) await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content, metadata) VALUES ($1, 'geo_dossier', 'd.md', $2, $3)`, [client.id, dossierText, JSON.stringify({ location_name: cfg.dossier.location, superseded: false })]);
  const store = createPageMapStore({ pool, filloutService: null });
  const v20Store = createV20Store(pool);
  const ctx = { cv: cfg.cv, pages: cfg.pages, keyValueMap: cfg.keyValueMap, serviceParentMap: cfg.serviceParentMap, trade: cfg.trade };
  const priceRows = cfg.priceRows.map(r => ({ ...r }));
  const queue = createBlogQueueService({ pool, pageMapStore: store, faqService: { blogTopics: async () => ({ blog: res, siteCheck: { ok: true }, sort: { record: { questions } }, assignment: A, ctx, niche: cfg.niche }) }, filloutService: { record: async () => ({ prices: { rows: priceRows } }) }, tradeFactsGate: async () => ({ niche: cfg.pack, verified: true }), packRows: (n, s, q) => P.rowsForPost(n, s, q), v20Store, log: { log() {}, error: console.error } });

  // ── 1. The queue ──
  await queue.build(client.id);
  for (const r of await store.blogRows(client.id)) if (!(r.info || {}).wording_approved) await queue.setWording(client.id, r.slug, { approved: true });
  const v = await queue.view(client.id);
  const heldWhy = new Map([...(v.reservation ? v.reservation.held : [])].map(x => [x.key, x.flags.map(f => `${f.code}: ${short(f.msg, 160)}`).join(' | ')]));
  say(`\n### 1. The queue: ${v.counts.rows} rows, ${v.counts.ready} run, ${v.counts.gated} gated, ${v.counts.held} held, ${v.counts.dated} dated\n`);
  say('| Post | Type | Date | Status | Specificity | Why |');
  say('|---|---|---|---|---|---|');
  for (const r of v.rows) {
    const why = r.status === 'Held' ? (heldWhy.get(r.slug) || r.gates.filter(g => g.hold).map(g => `${g.code}: ${short(g.msg, 160)}`).join(' | ') || 'held') : r.gates.length ? r.gates.map(g => `${g.code}: ${short(g.msg, 160)}`).join(' | ') : 'runs';
    say(`| ${r.slug} | ${r.post_type} | ${r.publish_date || ''} | ${r.status === 'Held' ? 'held' : r.gates.length ? 'gated' : 'runs'} | ${r.specificity ? r.specificity.count + '/6' : ''} | ${why.replace(/\|/g, '/')} |`);
  }
  if (v.reservation && v.reservation.flags.length) say(`\nReservation flags: ${v.reservation.flags.map(f => `${f.code} (${short(f.msg, 120)})`).join('; ')}`);

  // The page map's pages for the daily job: every page the posts link Live, except one phase 2 page (Live on day 40)
  const primaries = [...new Set(v.rows.map(r => r.primary && r.primary.url).filter(s => s && s !== '/' && !/^\/#/.test(s)))];
  const datedPrimaries = v.rows.filter(r => !r.gates.length && r.status !== 'Held' && r.publish_date && r.primary && primaries.includes(r.primary.url)).map(r => r.primary.url);
  const phase2 = datedPrimaries.find(s => datedPrimaries.filter(x => x === s).length === 1) || datedPrimaries[0] || null;
  let sort = 1;
  for (const slug of primaries) await pool.query(`INSERT INTO client_page_map (client_id, page_key, type, title, slug, h1, h1_source, links_to, links_from, status, applies, info, sort_order) VALUES ($1, $2, 'service', $3, $4, $3, 'auto', '[]', '[]', $5, TRUE, '{}', $6)`, [client.id, `service:${slug}`, slug, slug, slug === phase2 ? 'Not Started' : 'Live', sort++]);
  await pool.query(`INSERT INTO client_page_map (client_id, page_key, type, title, slug, h1, h1_source, links_to, links_from, status, applies, info, sort_order) VALUES ($1, 'homepage:/', 'homepage', 'Home', '/', 'Home', 'auto', '[]', '[]', 'Live', TRUE, '{}', 0)`, [client.id]);

  // ── 2. The posts, with the real model ──
  const calFile = path.join(root, cfg.calibration);
  const runner = createBlogRunner({ pool, v20Store, queue, generate: args => BG.generateBlogPost({ ...args, callModel, claimsReview: CLAIMS }), calibrationPack: () => (fs.existsSync(calFile) ? { name: cfg.calibration, text: fs.readFileSync(calFile, 'utf8') } : null), log: s => console.log(`  ${s}`) });
  const t0 = Date.now();
  const state = await runner.run(client.id, { resume: false });
  const records = [];
  let cost = 0;
  for (const p of state.posts) {
    const f = await v20Store.latest(client.id, { type: 'blog', key: p.key });
    if (!f) continue;
    cost += f.record.meta && f.record.meta.cost_pence || 0;
    const name = p.key.replace(/^\/guides\//, '').replace(/[^a-z0-9-]+/g, '-');
    fs.writeFileSync(path.join(out, `${name}.json`), JSON.stringify(f.record, null, 2));
    try { fs.writeFileSync(path.join(out, `${name}.md`), buildBlogReaderView(f.record, f.record.meta && f.record.meta.client_values)); } catch (e) { fs.writeFileSync(path.join(out, `${name}.md`), `reader view failed: ${e.message}`); }
    if (f.record.meta && f.record.meta.decisions_block) fs.writeFileSync(path.join(out, `${name}.decisions.txt`), f.record.meta.decisions_block);
    records.push({ key: p.key, state: p, record: f.record, id: f.id });
  }
  const done = state.posts.filter(p => p.status === 'done'), blocked = state.posts.filter(p => p.status === 'blocked'), failed = state.posts.filter(p => p.status === 'failed'), heldRun = state.posts.filter(p => p.status === 'held');
  say(`\n### 2. The posts: ${done.length} written, ${blocked.length} blocked by a gate, ${failed.length} failed, ${heldRun.length} held; ${Math.round((Date.now() - t0) / 1000)}s, ${pounds(cost)}\n`);
  say('| Post | Result | BLOCK | FLAG | Flags | Claims | Cost |');
  say('|---|---|---|---|---|---|---|');
  for (const p of state.posts) {
    const x = records.find(r => r.key === p.key);
    const rec = x && x.record;
    const flags = rec && rec.FLAGS ? [...new Set(rec.FLAGS.map(f => f.code))].join(', ') : '';
    const claims = rec && rec.CLAIMS ? `${rec.CLAIMS.status}${rec.CLAIMS.findings && rec.CLAIMS.findings.length ? ` (${rec.CLAIMS.findings.length})` : ''}` : (CLAIMS ? 'none' : 'off');
    say(`| ${p.key} | ${p.status}${p.error ? ': ' + short(p.error, 120) : ''}${p.hold ? ': ' + short(p.hold, 120) : ''} | ${p.block ?? ''} | ${p.flag ?? ''} | ${flags} | ${claims} | ${rec && rec.meta ? pounds(rec.meta.cost_pence) : ''} |`);
  }
  for (const x of records) {
    const rec = x.record;
    if (rec.FLAGS && rec.FLAGS.length) say(`- ${x.key}: ${rec.FLAGS.map(f => `${f.code} ${short(f.msg, 110)}`).join(' / ')}`);
    if (rec.CLAIMS && rec.CLAIMS.findings && rec.CLAIMS.findings.length) say(`- ${x.key} claims: ${rec.CLAIMS.findings.map(f => short(f.claim || f.text || f.msg || JSON.stringify(f), 110)).join(' / ')}`);
  }

  // ── 3. The push to the fake WordPress ──
  const fake = createFakeWp();
  const { server, url } = await listen(fake.app);
  const site = { url, user: 'copybot', appPassword: 'test-app-password-not-real', staging: true };
  const pushStore = createMemoryStore();
  const values = {
    get: async (id, key) => { const { rows: r } = await pool.query(`SELECT content FROM client_assets WHERE client_id = $1 AND asset_type = 'client_values' ORDER BY uploaded_at DESC LIMIT 1`, [id]); return r.length ? JSON.parse(r[0].content)[key] : undefined; },
    set: async (id, key, value) => { const { rows: r } = await pool.query(`SELECT content FROM client_assets WHERE client_id = $1 AND asset_type = 'client_values' ORDER BY uploaded_at DESC LIMIT 1`, [id]); const cur = r.length ? JSON.parse(r[0].content) : {}; cur[key] = value; await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'client_values', 'v.json', $2)`, [id, JSON.stringify(cur)]); },
  };
  const daily = D.createBlogDaily({
    pool, pageMapStore: store, v20Store, siteFor: async () => site,
    priceFacts: async (clientId, row, rows) => { const I = await queue.inputsFor(clientId); const d = queue.decide(I, row, rows); return d.decisions ? d.decisions.facts.filter(f => f.kind === 'price').map(f => f.text) : null; },
    clientValues: values,
    regenerate: async (clientId, slug) => { await runner.run(clientId, { resume: false, keys: [slug] }); const f = await v20Store.latest(clientId, { type: 'blog', key: slug }); if (f) { cost += f.record.meta && f.record.meta.cost_pence || 0; regenerated.push({ slug, record: f.record }); } return f ? f.id : null; },
    log: { log() {}, error: e => console.error('  daily:', e) },
  });
  const regenerated = [];
  const pushed = [], notPushed = [];
  try {
    for (const x of records) {
      const rec = x.record;
      if (rec.blocked || rec.error) continue;
      if (rec.VALIDATION && rec.VALIDATION.block) { notPushed.push([x.key, `${rec.VALIDATION.block} BLOCK`]); continue; }
      if (!rec.CLAIMS) { notPushed.push([x.key, 'no claims review on the record']); continue; }
      if (rec.CLAIMS.status === 'needs acceptance' && !ACCEPT) { notPushed.push([x.key, `waiting on a person: ${rec.CLAIMS.findings.length} claim(s) to accept`]); continue; }
      if (rec.CLAIMS.status === 'failed') { notPushed.push([x.key, `the claims review failed: ${short(rec.CLAIMS.error, 100)}`]); continue; }
      const approved = { ...rec, meta: { ...rec.meta, approved_at: dayAt(-5).toISOString(), approved_by: 'acceptance test' } };
      const r = await push({ record: approved, recordId: x.id, site, store: pushStore, reviewed: true, claims: rec.CLAIMS, acceptClaims: ACCEPT && rec.CLAIMS.status === 'needs acceptance', now: dayAt(-5) });
      if (!r.ok) { notPushed.push([x.key, `push refused: ${(r.refusals || []).join('; ') || r.error}`]); continue; }
      await v20Store.insert(client.id, approved, { type: 'blog', key: x.key });
      await daily.afterPush(client.id, { slug: x.key, postId: r.pageId, status: r.dry.post.status, dateGmt: r.dry.post.date_gmt });
      pushed.push({ key: x.key, postId: r.pageId, status: r.dry.post.status, date_gmt: r.dry.post.date_gmt, created: r.created, record: rec, accepted: rec.CLAIMS.status === 'needs acceptance' ? rec.CLAIMS.findings.length : 0 });
    }
    say(`\n### 3. The push to the fake WordPress: ${pushed.length} pushed, ${notPushed.length} not\n`);
    for (const p of pushed) say(`- ${p.key}: ${p.created === false ? 'updated' : 'created'} post ${p.postId}, ${p.status}, ${p.date_gmt}${p.accepted ? ` (${p.accepted} claim(s) accepted for the test)` : ''}`);
    for (const [k, why] of notPushed) say(`- ${k}: not pushed, ${why}`);
    const pushedRows = (await store.blogRows(client.id)).filter(r => r.status === 'Scheduled');
    say(`Rows Scheduled with a post id after the push: ${pushedRows.filter(r => r.info.wp_post_id).length} of ${pushed.length}.`);

    // ── 4. 190 days of the daily job ──
    // The price change reaches a pushed post stating a price that is still scheduled: two days before its date (day 60 when one is due after day 62)
    const heldKey = phase2 ? (v.rows.find(r => r.primary && r.primary.url === phase2 && pushed.some(p => p.key === r.slug)) || {}).slug : null;
    const pricePosts = pushed.filter(p => p.key !== heldKey && p.record.meta && p.record.meta.price_ids && p.record.meta.price_ids.length);
    const priceTarget = pricePosts.find(p => dayOf(p.record.publish_date) > 62) || pricePosts.find(p => dayOf(p.record.publish_date) >= 3) || null;
    const priceDay = priceTarget ? Math.min(60, dayOf(priceTarget.record.publish_date) - 2) : 60;
    const heldPost = phase2 ? pushed.find(p => { const row = v.rows.find(r => r.slug === p.key); return row && row.primary && row.primary.url === phase2; }) : null;
    say(`\n### 4. 190 days from the launch\n`);
    say(`Set-up: ${phase2 ? `${phase2} is the phase 2 page, Live on day 40${heldPost ? ` (${heldPost.key} links it, due day ${dayOf(heldPost.record.publish_date)})` : ' (no pushed post links it)'}` : 'no phase 2 page (no post links a page)'}; ${priceTarget ? `the price change on day ${priceDay} reaches ${priceTarget.key} (due day ${dayOf(priceTarget.record.publish_date)}, states ${priceTarget.record.meta.price_ids[0]})` : 'no pushed post states a price and is due three days or more after the launch, so the price change on day 60 reaches nothing'}; no churn.`);
    const byDay = [];
    let priceChangedOn = null;
    for (let day = 0; day <= 190; day++) {
      if (day === 40 && phase2) await pool.query(`UPDATE client_page_map SET status = 'Live' WHERE client_id = $1 AND slug = $2`, [client.id, phase2]);
      if (day === priceDay && priceTarget) {
        const stated = priceTarget.record.meta.price_ids[0];
        const pr = priceRows.find(p => stated.startsWith(`${p.service}:`) || p.service === priceTarget.record.service) || priceRows.find(p => p.from_gbp);
        if (pr) { pr.from_gbp = (pr.from_gbp || 0) + 55; if (pr.up_to_gbp) pr.up_to_gbp += 55; priceChangedOn = day; }
      }
      const r = await daily.run(client.id, { now: dayAt(day) });
      byDay.push({ day, actions: r.actions || [] });
    }
    const actions = byDay.flatMap(d => d.actions.map(a => ({ day: d.day, ...a })));
    const log = await daily.listLog(client.id, 2000);
    const by = k => actions.filter(a => a.action === k);
    say(`\nActions over 190 days: ${actions.length} (${['publish', 'hold', 'backfill', 'price-change', 'churn', 'skip'].map(k => `${k} ${by(k).length}`).join(', ')}); ${log.length} job log lines.`);
    say('| Day | Date | Action | Post | Detail |');
    say('|---|---|---|---|---|');
    const grouped = [];
    const open = new Map(); // key → the run still open (the same action on consecutive days)
    for (const a of actions) { const key = `${a.action}|${a.slug || ''}|${short(a.why || a.flag || a.msg || '', 150)}`; const run = open.get(key); if (run && run.to === a.day - 1) run.to = a.day; else { const g = { key, from: a.day, to: a.day, a }; grouped.push(g); open.set(key, g); } }
    grouped.sort((x, y) => x.from - y.from || actions.indexOf(x.a) - actions.indexOf(y.a));
    for (const g of grouped) say(`| ${g.from === g.to ? g.from : `${g.from} to ${g.to}`} | ${addDaysStr(LAUNCH, g.from)}${g.from === g.to ? '' : ' on'} | ${g.a.action} | ${g.a.slug || ''} | ${short(g.a.why || g.a.flag || g.a.msg || '', 150).replace(/\|/g, '/')} |`);
    const posts = [...fake.state.posts.values()];
    const rowsNow = await store.blogRows(client.id);
    const live = rowsNow.filter(r => r.status === 'Live');
    say(`\nAt day 190: the site holds ${posts.length} posts, ${posts.filter(p => p.status === 'publish').length} published, ${posts.filter(p => p.status === 'future').length} scheduled, ${posts.filter(p => p.status === 'draft').length} drafts; the page map has ${live.length} Live blog rows${live.length ? ` (${live.map(r => r.slug.replace(/^\/guides\//, '')).join(', ')})` : ''}.`);
    const onTime = pushed.filter(p => p !== heldPost && p !== priceTarget && dayOf(p.record.publish_date) <= 190);
    const onTimeOk = onTime.filter(p => by('publish').some(a => a.slug === p.key && addDaysStr(LAUNCH, a.day) === p.record.publish_date));
    say(`Published on their day: ${onTimeOk.length} of ${onTime.length} plain posts due within the 190 days${onTime.length !== onTimeOk.length ? ` (not on their day: ${onTime.filter(p => !onTimeOk.includes(p)).map(p => p.key).join(', ')})` : ''}.`);
    if (heldPost) { const holds = by('hold').filter(a => a.slug === heldPost.key); const pub = by('publish').find(a => a.slug === heldPost.key); say(`The held post ${heldPost.key}: held ${holds.length} time(s) (${holds.map(a => a.flag || a.action).join(', ')}), ${pub ? `published on day ${pub.day}` : 'not published by day 190'}.`); }
    if (priceTarget) { const pc = by('price-change'); const rg = regenerated.find(r => r.slug === priceTarget.key); say(`The price change on day ${priceChangedOn}: ${pc.length ? `${priceTarget.key} written again on day ${pc[0].day}${rg ? ` (${rg.record.VALIDATION ? rg.record.VALIDATION.block : '?'} BLOCK, ${rg.record.FLAGS ? [...new Set(rg.record.FLAGS.map(f => f.code))].join(', ') : ''})` : ''}; the new record ${rg && rg.record.meta && rg.record.meta.price_changed ? 'is marked price changed and unapproved' : 'is NOT marked price changed'}; then ${by('hold').filter(a => a.slug === priceTarget.key).length} hold(s) at its date` : 'no price-change action (the change was not seen)'}.`); }
    const backfills = by('backfill');
    const urls = await values.get(client.id, 'cost_guide_urls');
    say(`The backfill: ${backfills.length} cost guide(s) published and recorded on the client (cost_guide_urls: ${urls ? Object.keys(urls).length : 0}).`);
    const dry = await daily.run(client.id, { now: dayAt(191), dryRun: true });
    say(`A dry run on day 191 lists ${(dry.actions || []).length} action(s) and writes nothing.`);
  } finally { await new Promise(res => server.close(res)); }
  say(`\nCost for ${cfg.name}: ${pounds(cost)} (${records.length} post(s) written${regenerated.length ? `, ${regenerated.length} written again` : ''}, the claims reviews included).`);
  return { rep, cost, stopped: false };
}

(async () => {
  const which = (arg('--client') || 'edens-edge,kestrel-ridge').split(',').map(s => s.trim()).filter(Boolean);
  for (const w of which) if (!CLIENTS[w]) { console.error(`Unknown client ${w}: ${Object.keys(CLIENTS).join(', ')}`); process.exit(1); }
  const callModel = makeCallModel(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }), MODEL);
  const stamp = new Date().toISOString().slice(0, 10);
  const outRoot = path.join(root, 'tests/quality-runs/blog', `ACCEPTANCE_${stamp}`);
  fs.mkdirSync(outRoot, { recursive: true });
  // One report file per client (a client run on its own keeps the other's), joined into REPORT.md
  const ids = Object.keys(CLIENTS);
  const join = () => {
    const have = ids.filter(id => fs.existsSync(path.join(outRoot, `REPORT_${id}.md`)));
    const parts = have.map(id => fs.readFileSync(path.join(outRoot, `REPORT_${id}.md`), 'utf8'));
    const costs = parts.map(p => (p.match(/^Cost for .*?: £([0-9.]+)/m) || [0, '0'])[1]).map(Number);
    fs.writeFileSync(path.join(outRoot, 'REPORT.md'), [`# Blog posts: the acceptance test, ${stamp}`, '', `Launch ${LAUNCH}, model ${MODEL}, the fake WordPress server only (no real site). Clients: ${have.join(', ')}.`, '', ...parts, '', `Total model cost: ${pounds(Math.round(costs.reduce((x, y) => x + y, 0) * 100))}`, ''].join('\n'));
  };
  let total = 0;
  for (const w of which) {
    const r = await runClient(CLIENTS[w](), outRoot, callModel);
    total += r.cost;
    fs.writeFileSync(path.join(outRoot, `REPORT_${w}.md`), r.rep.join('\n') + '\n');
    join();
  }

  console.log(`\nTotal model cost: ${pounds(total)}. Report: ${path.relative(root, path.join(outRoot, 'REPORT.md'))}`);
})().catch(e => { console.error(e); process.exit(1); });
