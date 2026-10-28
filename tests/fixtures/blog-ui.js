'use strict';
// Fixture: blog posts, stage 6 (review), 28 Oct 2026. The batch approve route on pg-mem
// ("Approve all without BLOCK or unreviewed FLAG": a clean post is approved, a post with
// FLAGs only once its FLAGs are read, a blocked post never, a held post never), the FLAGs
// read tick through the shared approve route, and the dashboard counting posts. No API call.
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const { ensurePageMapTables, createPageMapStore } = require(path.join(root, 'page-map/store.js'));
const { ensureBlogColumns } = require(path.join(root, 'blog/db.js'));
const { createV20Store } = require(path.join(root, 'v20-store.js'));
const { mountBlogApi } = require(path.join(root, 'blog/routes.js'));
const D = require(path.join(root, 'ui/dashboard.js'));
const { ensureFilloutTables } = require(path.join(root, 'fillout/service.js'));
const { ensureAllocationColumns } = require(path.join(root, 'fillout/allocation.js'));
const AS = require(path.join(root, 'fillout/additional-services.js'));
const { ensureH1Tables } = require(path.join(root, 'h1-research/service.js'));
const { ensureWpTables } = require(path.join(root, 'wp/db-store.js'));
const R = require(path.join(root, 'ui/routes.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: blog posts, stage 6 (the batch review) ===\n');

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metadata JSONB);
    CREATE TABLE pages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, page_type TEXT, page_title TEXT, url_slug TEXT);
    CREATE TABLE research_jobs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), session_id TEXT, client_id UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), status TEXT NOT NULL DEFAULT 'pending', preset TEXT, locations JSONB NOT NULL DEFAULT '{}');`);
  await ensureFilloutTables(pool); await ensureAllocationColumns(pool); await AS.ensureAdditionalTables(pool); await ensurePageMapTables(pool); await ensureH1Tables(pool); await ensureWpTables(pool); await R.ensureUiColumns(pool); await ensureBlogColumns(pool);
  const { rows: [client] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('Edens Edge', 'Landscaper') RETURNING id`);
  const store = createPageMapStore({ pool, filloutService: null });
  const v20Store = createV20Store(pool);
  // Four posts on the queue: clean, flagged, blocked, held
  const rows = [
    { slug: '/guides/a-clean-post', title: 'A Clean Post?', h1: 'A Clean Post?', info: { post_type: 'question', publish_date: '2026-11-09', batch: 'onboarding', wording_approved: true } },
    { slug: '/guides/a-flagged-post', title: 'A Flagged Post?', h1: 'A Flagged Post?', info: { post_type: 'question', publish_date: '2026-12-10', batch: 'onboarding', wording_approved: true } },
    { slug: '/guides/a-blocked-post', title: 'A Blocked Post?', h1: 'A Blocked Post?', info: { post_type: 'question', publish_date: '2026-12-21', batch: 'onboarding', wording_approved: true } },
    { slug: '/guides/a-held-post', title: 'A Held Post?', h1: 'A Held Post?', status: 'Held', info: { post_type: 'question', batch: 'onboarding', held: true, wording_approved: true } },
  ];
  await store.upsertBlogRows(client.id, rows);
  const rec = (slug, block, flag, extra = {}) => ({ page: 'blog', post_type: 'question', page_slug: slug, url: `${slug}/`, blog_h1: slug, VALIDATION: { status: 'run', block, flag, issues: [] }, FLAGS: [], sections: [], faq_items: [], table_rows: [], meta: { page_type: 'blog', page_key: slug, post_type: 'question', generated_at: '2026-10-28T10:00:00Z', model: 'stub' }, ...extra });
  await v20Store.insert(client.id, rec('/guides/a-clean-post', 0, 0), { type: 'blog', key: '/guides/a-clean-post' });
  await v20Store.insert(client.id, rec('/guides/a-flagged-post', 0, 3), { type: 'blog', key: '/guides/a-flagged-post' });
  await v20Store.insert(client.id, rec('/guides/a-blocked-post', 2, 1), { type: 'blog', key: '/guides/a-blocked-post' });

  // The runner's view and the queue's rows, as the real service gives them
  const summarise = async () => {
    const posts = [];
    for (const r of (await store.blogRows(client.id)).filter(x => x.status !== 'Held')) {
      const f = await v20Store.latest(client.id, { type: 'blog', key: r.slug });
      const m = f ? f.record.meta || {} : {};
      posts.push({ key: r.slug, title: r.h1, record: f ? { id: f.id, block: f.record.VALIDATION.block, flag: f.record.VALIDATION.flag, good: f.record.VALIDATION.block === 0, approved: !!m.approved_at, flags_reviewed: !!m.flags_reviewed_at, blocked: false, error: null } : null });
    }
    return { posts, run: null, running: null };
  };
  const runner = { view: summarise, running: new Map(), run: async () => ({}), prepare: async () => ({ decisionsResult: { gates: [], flags: [], decisionsBlock: '' }, ideasUsed: [] }) };
  const queue = { view: async () => ({ rows: [] }), build: async () => ({}), setWording: async () => ({}), inputsFor: async () => ({}), rowsFor: () => store.blogRows(client.id) };
  const app = express();
  app.use(express.json());
  mountBlogApi(app, { pool, loadBlogInputs: async () => ({}), queue, runner, v20Store });
  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const call = (method, p, body) => new Promise((resolve, reject) => {
    const req = http.request({ port, path: p, method, headers: { 'content-type': 'application/json' } }, res => { let s = ''; res.on('data', d => s += d); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(s || '{}') }); } catch (e) { reject(e); } }); });
    req.on('error', reject); if (body) req.write(JSON.stringify(body)); req.end();
  });

  const first = await call('POST', `/api/clients/${client.id}/blog/approve-batch`, { by: 'Brandon' });
  const latest = async slug => (await v20Store.latest(client.id, { type: 'blog', key: slug })).record.meta;
  chk('Approve all without BLOCK or unreviewed FLAG: the clean post is approved, the flagged one waits for its FLAGs to be read, the blocked one never, the held one is not a post to approve', first.status === 200 && first.body.approved.length === 1 && first.body.approved[0] === '/guides/a-clean-post' && first.body.skipped.some(s => s.key === '/guides/a-flagged-post' && /FLAG/.test(s.why)) && first.body.skipped.some(s => s.key === '/guides/a-blocked-post' && /BLOCK/.test(s.why)) && !first.body.skipped.some(s => s.key === '/guides/a-held-post') && (await latest('/guides/a-clean-post')).approved_at && (await latest('/guides/a-clean-post')).approved_by === 'Brandon' && !(await latest('/guides/a-flagged-post')).approved_at, JSON.stringify(first.body), '');
  // The FLAGs read tick on the flagged post (the shared approve route's setMeta), then the batch again
  const f = await v20Store.latest(client.id, { type: 'blog', key: '/guides/a-flagged-post' });
  await v20Store.setMeta(client.id, f.id, { flags_reviewed_at: new Date().toISOString(), flags_reviewed_by: 'Brandon' });
  const second = await call('POST', `/api/clients/${client.id}/blog/approve-batch`, { by: 'Brandon' });
  chk('Once its FLAGs are read the flagged post is approved by the next batch approve; the clean one stays approved, not approved twice', second.status === 200 && second.body.approved.join() === '/guides/a-flagged-post' && second.body.already === 1 && (await latest('/guides/a-flagged-post')).approved_at, JSON.stringify(second.body), '');
  const view = await call('GET', `/api/clients/${client.id}/blog-pages`);
  chk('The blog pages view carries approved and flags_reviewed per post for the Pages tab', view.status === 200 && view.body.posts.find(p => p.key === '/guides/a-flagged-post').record.flags_reviewed === true && view.body.posts.find(p => p.key === '/guides/a-clean-post').record.approved === true, JSON.stringify(view.body.posts.map(p => [p.key, p.record && p.record.approved, p.record && p.record.flags_reviewed])), '');
  server.close();

  // The dashboard counts posts: three with a record, two good, the held one left out
  let d = null;
  try { d = await D.loadDashboard({ pool, tradeFacts: null, runners: {}, now: new Date(), clientId: client.id }); } catch (e) { d = { error: e.message }; }
  const E = d && d.clients ? d.clients[0] : null;
  chk('The dashboard: blog is a page type; the client has 3 posts with a record (the held one is not a page), 2 written clean; the page list carries them for the Page view\'s previous and next', E && E.page_types.blog && E.page_types.blog.total === 3 && E.page_types.blog.records === 3 && E.page_types.blog.written === 2 && (E.page_list || []).filter(p => p.type === 'blog').length === 3, JSON.stringify(E ? E.page_types : d), '');

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
