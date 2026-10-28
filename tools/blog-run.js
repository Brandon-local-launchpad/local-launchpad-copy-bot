'use strict';
// ── Blog posts, local real run (stage 4) ─────────────────────────────────────
// Writes blog posts for the Edens Edge fixture client with the real model, as the live app
// does, and saves every record, reader view and the decisions block under
// tests/quality-runs/blog/<time>/. Inputs: the live FAQ research of 14 Oct replayed through
// the saved tidy replies, the real landscaper bank (blog-bank/landscaper.md, approved for
// this run), the Southampton dossier, the price rows below, and the landscaper niche entry.
//
//   node tools/blog-run.js                       every post in the queue (gated ones recorded blocked)
//   node tools/blog-run.js --keys /guides/a,/guides/b   the posts named
//   node tools/blog-run.js --launch 2026-11-09   the launch date (default: today)
//   node tools/blog-run.js --no-claims           skip the claims review
//   node tools/blog-run.js --quality             the rubric review and its rewrites too
//   node tools/blog-run.js --model claude-opus-5-5
//   node tools/blog-run.js --dry                 the queue with each post's gates, no model call
// Needs ANTHROPIC_API_KEY in .env. About 40p to 80p a post.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '..');
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
const { ensureBlogColumns } = require(path.join(root, 'blog/db.js'));
const { ensurePageMapTables, createPageMapStore } = require(path.join(root, 'page-map/store.js'));
const { createV20Store } = require(path.join(root, 'v20-store.js'));
const { buildBlogReaderView } = require(path.join(root, 'blog/reader.js'));
const P = require(path.join(root, 'trade-facts/pack.js'));

const arg = name => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
const flag = name => process.argv.includes(name);

(async () => {
  const edens = C.byId['edens-edge'];
  const niche = { ...edens.niche, _source: 'landscaper' };
  const snapFile = path.join(root, 'tests/live-snapshots/edens-edge.json');
  const snap = fs.existsSync(snapFile) ? JSON.parse(fs.readFileSync(snapFile, 'utf8')) : null;
  const cv = { ...(snap ? snap.cv : edens.cvThin), jobs_wanted: ['Landscape Gardener', 'Landscape Designer'], primary_category: 'Gardener' };
  const research = R.parseFaqResearch(fs.readFileSync(path.join(root, 'tests/fixtures/faq-research-replies/edens-edge-live-2026-10-14.md'), 'utf8'));
  const replies = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/faq-sort-replies/edens-edge-live.json'), 'utf8')).replies;
  let i = 0;
  const tidy = await S.runTidy({ research, niche: edens.niche, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, pages: edens.pages, cv, callModel: async () => replies[i++] });
  const questions = tidy.questions.map(q => ({ ...q, approved: !q.wording_errors.length }));
  const A = S.assignQuestions({ questions, cv, pages: edens.pages, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, niche: edens.niche });
  const bank = B.parseBank(fs.readFileSync(path.join(root, 'blog-bank/landscaper.md'), 'utf8'));
  const dossierText = fs.readFileSync(path.join(root, 'tests/fixtures/southampton-dossier.md'), 'utf8');
  const launch = arg('--launch') || new Date().toISOString().slice(0, 10);
  const pageWordings = new Set(Object.values(A.pages).flatMap(pg => pg.questions.map(q => q.wording)));
  const res = reserveBlogTopics({ assignment: A, cv, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, serviceParentMap: edens.serviceParentMap, dossiers: [{ location: 'Southampton', text: dossierText }], allocationRecord: { pages: {} }, bank, pageWordings, launchDate: launch });

  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metadata JSONB);`);
  await ensureBlogColumns(pool); await ensurePageMapTables(pool);
  const { rows: [client] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('Edens Edge', 'Landscaper') RETURNING id`);
  await pool.query(`UPDATE clients SET launch_date = $2 WHERE id = $1`, [client.id, launch]);
  await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content, metadata) VALUES ($1, 'geo_dossier', 'd.md', $2, $3)`, [client.id, dossierText, JSON.stringify({ location_name: 'Southampton', superseded: false })]);
  const store = createPageMapStore({ pool, filloutService: null });
  const v20Store = createV20Store(pool);
  const ctx = { cv, pages: edens.pages, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, trade: 'Landscaper' };
  // Price rows for this run (Edens Edge has none on file): one per main service, made up for the run and said so in the output folder
  const priceRows = [
    { id: 'p1', service: 'Artificial turf installation', from_gbp: 1500, up_to_gbp: 4000, unit: 'per job', what_moves_price: 'the area and the base', quote_only: false, unverified: false, deleted: false },
    { id: 'p2', service: 'Driveway landscaping', from_gbp: 3000, up_to_gbp: 9000, unit: 'per job', what_moves_price: 'the area, the surface and the drainage', quote_only: false, unverified: false, deleted: false },
  ];
  const queue = createBlogQueueService({ pool, pageMapStore: store, faqService: { blogTopics: async () => ({ blog: res, siteCheck: { ok: true }, sort: { record: { questions } }, assignment: A, ctx, niche }) }, filloutService: { record: async () => ({ prices: { rows: priceRows } }) }, tradeFactsGate: async () => ({ niche: 'landscaper', verified: true }), packRows: (n, s, q) => P.rowsForPost(n, s, q), v20Store, log: { log() {}, error: console.error } });
  await queue.build(client.id);
  for (const r of await store.blogRows(client.id)) if (!(r.info || {}).wording_approved) await queue.setWording(client.id, r.slug, { approved: true });

  if (flag('--dry')) {
    const v = await queue.view(client.id);
    for (const r of v.rows) console.log(`${r.status === 'Held' ? 'HELD ' : ''}${r.post_type.padEnd(10)} ${r.slug}  spec ${r.specificity ? r.specificity.count : '-'}/6  ${r.stack}/${r.faq}  link ${r.primary ? r.primary.url : '-'}  ${r.gates.length ? r.gates.map(g => g.code + ': ' + g.msg).join(' | ') : 'ready'}${flag('--flags') && r.flags.length ? `\n      flags: ${r.flags.map(f => f.code + ': ' + f.msg).join(' | ')}` : ''}`);
    console.log(JSON.stringify(v.counts));
    return;
  }
  const model = arg('--model') || BG.BLOG_MODEL;
  const callModel = makeCallModel(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }), model);
  const outDir = path.join(root, 'tests/quality-runs/blog', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'README.md'), `Edens Edge blog run, model ${model}, launch ${launch}. The price rows for Artificial turf installation and Driveway landscaping are made up for this run (Edens Edge has no price rows on file); every code written question was approved by the tool.\n`);
  const runner = createBlogRunner({ pool, v20Store, queue, generate: args => BG.generateBlogPost({ ...args, callModel, claimsReview: !flag('--no-claims'), qualityReview: flag('--quality') }), calibrationPack: () => { const f = path.join(root, 'Landscaper_Calibration_Pack_v4.md'); return fs.existsSync(f) ? { name: 'Landscaper_Calibration_Pack_v4.md', text: fs.readFileSync(f, 'utf8') } : null; }, log: console.log });
  const keys = arg('--keys') ? arg('--keys').split(',').map(s => '/' + s.trim().replace(/^\/+/, '')) : null; // a leading slash is optional (Git Bash rewrites /guides/… as a path)
  const state = await runner.run(client.id, { resume: false, keys });
  for (const p of state.posts) {
    const f = await v20Store.latest(client.id, { type: 'blog', key: p.key });
    if (!f) continue;
    const name = p.key.replace(/^\/guides\//, '').replace(/[^a-z0-9-]+/g, '-');
    fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(f.record, null, 2));
    fs.writeFileSync(path.join(outDir, `${name}.md`), buildBlogReaderView(f.record, f.record.meta && f.record.meta.client_values));
    if (f.record.meta && f.record.meta.decisions_block) fs.writeFileSync(path.join(outDir, `${name}.decisions.txt`), f.record.meta.decisions_block);
  }
  console.log(`\nDone: ${state.posts.filter(p => p.status === 'done').length} written, ${state.posts.filter(p => p.status === 'blocked').length} blocked, ${state.posts.filter(p => p.status === 'failed').length} failed. Files in ${path.relative(root, outDir)}/`);
})().catch(e => { console.error(e); process.exit(1); });
