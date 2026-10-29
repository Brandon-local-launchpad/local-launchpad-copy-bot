'use strict';
// Fixture: blog posts, stage 8 (the daily job), 29 Oct 2026. Edens Edge's posts (the stub model)
// pushed to the fake WordPress, then 190 days from the launch with the clock override, one run a
// day: posts publish in order on their dates; a post linking a phase 2 page that goes Live on day
// 40 is held in weekly steps until then (F-HELD, the date moved on the site and the page map); the
// backfill marks land the day each cost guide publishes (cost_guide_urls on the client, the pages
// marked backfill pending); a price change on day 60 writes the affected scheduled post again and
// sends it back to review (F-PRICE-CHANGED), so it is held when due; churn on day 100 turns the
// posts still scheduled into drafts, the published ones stay. Every action logged. No API calls.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const R = require(path.join(root, 'faq-research.js'));
const S = require(path.join(root, 'faq-sort.js'));
const C = require(path.join(__dirname, 'data/faq-clients.js'));
const B = require(path.join(root, 'blog/bank.js'));
const { reserveBlogTopics } = require(path.join(root, 'blog/topics.js'));
const Q = require(path.join(root, 'blog/queue.js'));
const { computeBlogDecisions } = require(path.join(root, 'blog/decisions.js'));
const { generateBlogPost } = require(path.join(root, 'blog/generate.js'));
const { parseDossier } = require(path.join(root, 'geo-dossier.js'));
const { push } = require(path.join(root, 'wp/push.js'));
const { createMemoryStore } = require(path.join(root, 'wp/push-store.js'));
const { createFakeWp, listen } = require(path.join(__dirname, '../fake-wp/fake-wp.js'));
const { ensurePageMapTables, createPageMapStore } = require(path.join(root, 'page-map/store.js'));
const { ensureBlogColumns, saveBlogSettings } = require(path.join(root, 'blog/db.js'));
const { createV20Store } = require(path.join(root, 'v20-store.js'));
const D = require(path.join(root, 'blog/daily.js'));
const { ensureFilloutTables } = require(path.join(root, 'fillout/service.js'));
const { ensureAllocationColumns } = require(path.join(root, 'fillout/allocation.js'));
const AS = require(path.join(root, 'fillout/additional-services.js'));
const { ensureH1Tables } = require(path.join(root, 'h1-research/service.js'));
const { ensureWpTables } = require(path.join(root, 'wp/db-store.js'));
const UR = require(path.join(root, 'ui/routes.js'));
const { newDb, DataType } = require('pg-mem');

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: blog posts, stage 8 (the daily job, 190 days on the fake WordPress) ===\n');

// ── The pure steps ──
const pageRows = [{ type: 'service', slug: '/services/lawn-care', status: 'Live' }, { type: 'service', slug: '/services/decking', status: 'Not Started' }];
const rowOf = (date, primary, extra = {}) => ({ slug: '/guides/x', status: 'Scheduled', info: { publish_date: date, primary_link: primary, ...extra } });
const good = { record: { meta: { approved_at: '2026-11-01T00:00:00Z' }, VALIDATION: { block: 0 } } };
const future = { id: 1, status: 'future' };
chk('decideRow: a post due in two days whose primary page is Live and whose record is approved waits; due today it publishes; a page not Live holds it seven days (from its date); an unapproved record holds it; a date already passed holds from today', D.decideRow({ row: rowOf('2026-11-11', '/services/lawn-care'), today: '2026-11-09', pageRows, post: future, rec: good }) === null && D.decideRow({ row: rowOf('2026-11-09', '/services/lawn-care'), today: '2026-11-09', pageRows, post: future, rec: good }).action === 'publish' && JSON.stringify(D.decideRow({ row: rowOf('2026-11-11', '/services/decking'), today: '2026-11-09', pageRows, post: future, rec: good })) === JSON.stringify({ action: 'hold', why: 'the primary link page /services/decking is Not Started, not Live', to: '2026-11-18' }) && /not approved/.test(D.decideRow({ row: rowOf('2026-11-10', '/'), today: '2026-11-09', pageRows, post: future, rec: { record: { meta: {}, VALIDATION: { block: 0 } } } }).why) && D.decideRow({ row: rowOf('2026-11-01', '/services/decking'), today: '2026-11-09', pageRows, post: future, rec: good }).to === '2026-11-16', JSON.stringify([D.decideRow({ row: rowOf('2026-11-11', '/services/decking'), today: '2026-11-09', pageRows, post: future, rec: good }), D.decideRow({ row: rowOf('2026-11-01', '/services/decking'), today: '2026-11-09', pageRows, post: future, rec: good })]), '');
chk('decideRow: a published post is left alone (the row marked Live when the site says so); a churned client\'s scheduled post goes to draft and a published one stays; a due post not on the site or a draft is a skip in words; the homepage and its sections are always Live', D.decideRow({ row: { ...rowOf('2026-11-01', '/'), status: 'Live' }, today: '2026-11-09', pageRows, post: { status: 'publish' }, rec: good }) === null && D.decideRow({ row: rowOf('2026-11-01', '/'), today: '2026-11-09', pageRows, post: { status: 'publish' }, rec: good }).action === 'mark-live' && D.decideRow({ row: rowOf('2027-01-01', '/'), today: '2026-11-09', pageRows, post: future, rec: good, churned: true }).action === 'churn' && D.decideRow({ row: { ...rowOf('2026-11-01', '/'), status: 'Live' }, today: '2026-11-09', pageRows, post: { status: 'publish' }, rec: good, churned: true }) === null && /not on the site/.test(D.decideRow({ row: rowOf('2026-11-09', '/'), today: '2026-11-09', pageRows, post: null, rec: good }).why) && /a draft on the site/.test(D.decideRow({ row: rowOf('2026-11-09', '/'), today: '2026-11-09', pageRows, post: { status: 'draft' }, rec: good }).why) && D.primaryStatus(rowOf('x', '/#services'), pageRows) === 'Live' && D.primaryStatus(rowOf('x', '/services/nowhere'), pageRows) === 'missing', '', '');
chk('priceChange: a stated price no longer in today\'s price facts is a change; the same facts, or a post with no prices, is not', JSON.stringify(D.priceChange({ record: { meta: { price_ids: ['Lawn mowing: from £30 to £60 per job'] } } }, ['Lawn mowing: from £35 to £70 per job']).gone) === '["Lawn mowing: from £30 to £60 per job"]' && D.priceChange({ record: { meta: { price_ids: ['a'] } } }, ['a', 'b']) === null && D.priceChange({ record: { meta: { price_ids: [] } } }, ['a']) === null, '', '');

const { stubReply } = require(path.join(__dirname, 'data/blog-stub-model.js'));
const stubModel = async ({ message }) => ({ text: stubReply(message), usage: { input_tokens: 10, output_tokens: 10, stop_reason: 'end_turn', model: 'stub' } });
const edens = C.byId['edens-edge'];
const niche = { ...edens.niche, _source: 'landscaper' };
const sampleBank = B.parseBank(fs.readFileSync(path.join(__dirname, 'data/blog-bank-landscaper-run-v1.md'), 'utf8'));
const dossierText = fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8');
const LAUNCH = '2026-11-09';
const dayAt = n => new Date(new Date(`${LAUNCH}T10:00:00Z`).getTime() + n * 86400000);

(async () => {
  // ── Edens Edge's posts, as the push fixture makes them ──
  const research = R.parseFaqResearch(fs.readFileSync(path.join(__dirname, 'faq-research-replies/edens-edge-live-2026-10-14.md'), 'utf8'));
  const replies = JSON.parse(fs.readFileSync(path.join(__dirname, 'faq-sort-replies/edens-edge-live.json'), 'utf8')).replies;
  const cv = { ...edens.cvThin, primary_category: 'Gardener', insurance_cover: '5m', differentiator_2_confirmed: true, jobs_wanted: ['Landscape Gardener', 'Landscape Designer'], quote_method: 'written quote after a visit', confirmed_practices: ['price_agreed_before_work'], owner_name: 'Ethan', owner_role: 'owner', year_founded: '2016', free_quotes: 'yes' };
  let i = 0;
  const tidy = await S.runTidy({ research, niche: edens.niche, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, pages: edens.pages, cv, callModel: async () => replies[i++] });
  const customerQs = ['Why is my lawn always waterlogged after rain?', 'Is turf or seed better for a new lawn?', 'Do I need planning permission to pave my front garden?', 'What does a landscape gardener charge per day?', 'Can you lay a patio in winter?', 'How do I stop my hedge dying back after cutting?'];
  const questions = [...S.clientQuestionItems({ customer_questions: customerQs }).map(q => ({ ...q, wording: q.text, wording_errors: [], approved: true })), ...tidy.questions.map(q => ({ ...q, approved: !q.wording_errors.length }))];
  const A = S.assignQuestions({ questions, cv, pages: edens.pages, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, niche: edens.niche });
  const pageWordings = new Set(Object.values(A.pages).flatMap(pg => pg.questions.map(q => q.wording)));
  const alloc = { pages: { homepage: { neighbourhoods: ['SOU-N07'], symptoms: { faq_B: 'SOU-S01' } } } };
  const res = reserveBlogTopics({ assignment: A, cv, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, serviceParentMap: edens.serviceParentMap, dossiers: [{ location: 'Southampton', text: dossierText }], allocationRecord: alloc, bank: sampleBank, pageWordings, launchDate: LAUNCH });
  const bankRelated = sampleBank.topics.flatMap(t => t.related);
  let bi = 0;
  const give = (t) => { if (t.query_stack.length >= 3 && t.faq_ids.length >= 3) return t; const pick = n => Array.from({ length: n }, () => { const r = bankRelated[bi++ % bankRelated.length]; return { id: `${r.id}#${bi}`, wording: r.question, doubt: r.doubt, needs_fact: false }; }); const stack = t.query_stack.length >= 3 ? t.stack : pick(3), faq = t.faq_ids.length >= 3 ? t.faq : pick(3); return { ...t, held: false, stack, query_stack: stack.map(x => x.id), faq, faq_ids: faq.map(x => x.id) }; };
  const scheduled = Q.schedule([...res.topics, ...res.held_back].map(give), LAUNCH);
  const queueRows = Q.rowsFor(scheduled.topics);
  const rows = queueRows.map(r => ({ ...r, type: 'blog', page_key: `blog:${r.slug}`, status: 'Not Started', applies: true, info: { ...r.info, wording_approved: true } }));
  const qById = new Map(questions.map(q => [q.id, q]));
  const dossier = parseDossier(dossierText);
  // The prices today: a mutable list the price facts come from (the change on day 60 edits it)
  const priceRows = edens.pages.filter(p => p.pageType === 'service' && p.urlSlug).map((p, k) => ({ id: `p${k}`, service: p.pageTitle, from_gbp: 300 + k * 100, up_to_gbp: 900 + k * 100, unit: 'per job', what_moves_price: 'the size of the job', usable: true }));
  const tf = { niche: 'landscaper', verified: true, rows: [{ kind: 'standard method', text: 'Stages: dig out → sub base → bedding → lay → point' }, { kind: 'what goes wrong', text: 'Signs: slabs rock. Skipped: a thin base' }, { kind: 'timing', text: 'Turf is laid September to October or March to April' }, { kind: 'rule', text: 'Paving over five square metres draining to the road usually needs permission' }] };
  const decide = row => computeBlogDecisions({ row, cv, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, questions: qById, priceRows, tradeFacts: tf, dossier: row.info.post_type === 'local' ? dossier : null, blogRows: rows, today: '2026-10-28' });
  const make = async row => { const d = decide(row); if (d.gates.length) return null; const rec = await generateBlogPost({ cv, niche, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, decisionsResult: d, calibrationPack: 'PACK', calibrationPackName: 'test', callModel: stubModel, retries: false, claimsReview: false }); return rec.VALIDATION && rec.VALIDATION.status === 'run' && rec.VALIDATION.block === 0 ? rec : null; };
  const records = [];
  for (const row of rows) { const rec = await make(row); if (rec && rec.publish_date) records.push({ row, rec }); }
  chk(`Set-up: ${records.length} dated posts with no BLOCK (3 or more), the first on the launch date`, records.length >= 3 && records.some(x => x.rec.publish_date === LAUNCH), records.map(x => x.rec.publish_date).join(), '');

  // ── The stores on pg-mem, the fake site, the posts pushed ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metadata JSONB);
    CREATE TABLE pages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, page_type TEXT, page_title TEXT, url_slug TEXT);
    CREATE TABLE research_jobs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), session_id TEXT, client_id UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), status TEXT NOT NULL DEFAULT 'pending', preset TEXT, locations JSONB NOT NULL DEFAULT '{}');`);
  await ensureFilloutTables(pool); await ensureAllocationColumns(pool); await AS.ensureAdditionalTables(pool); await ensurePageMapTables(pool); await ensureH1Tables(pool); await ensureWpTables(pool); await UR.ensureUiColumns(pool); await ensureBlogColumns(pool);
  const { rows: [client] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('Edens Edge', 'Landscaper') RETURNING id`);
  await saveBlogSettings(pool, client.id, { launch_date: LAUNCH });
  const store = createPageMapStore({ pool, filloutService: null });
  const v20Store = createV20Store(pool);
  // The page map's pages: the primary link pages Live, except one phase 2 page that goes Live on day 40
  const primaries = [...new Set(records.map(x => x.row.info.primary_link).filter(s => s && s !== '/' && !/^\/#/.test(s)))];
  const phase2 = primaries[0];
  let sort = 1;
  for (const slug of primaries) await pool.query(`INSERT INTO client_page_map (client_id, page_key, type, title, slug, h1, h1_source, links_to, links_from, status, applies, info, sort_order) VALUES ($1, $2, 'service', $3, $4, $3, 'auto', '[]', '[]', $5, TRUE, '{}', $6)`, [client.id, `service:${slug}`, slug, slug, slug === phase2 ? 'Not Started' : 'Live', sort++]);
  await pool.query(`INSERT INTO client_page_map (client_id, page_key, type, title, slug, h1, h1_source, links_to, links_from, status, applies, info, sort_order) VALUES ($1, 'homepage:/', 'homepage', 'Home', '/', 'Home', 'auto', '[]', '[]', 'Live', TRUE, '{}', 0)`, [client.id]);
  await store.upsertBlogRows(client.id, queueRows.map(r => ({ ...r, info: { ...r.info, wording_approved: true } })));
  const fake = createFakeWp();
  const { server, url } = await listen(fake.app);
  const site = { url, user: 'copybot', appPassword: 'test-app-password-not-real', staging: true };
  const pushStore = createMemoryStore();
  // The client's values asset (cost_guide_urls lands there)
  const values = { get: async (id, key) => { const { rows: r } = await pool.query(`SELECT content FROM client_assets WHERE client_id = $1 AND asset_type = 'client_values' ORDER BY uploaded_at DESC LIMIT 1`, [id]); return r.length ? JSON.parse(r[0].content)[key] : undefined; }, set: async (id, key, value) => { const { rows: r } = await pool.query(`SELECT id, content FROM client_assets WHERE client_id = $1 AND asset_type = 'client_values' ORDER BY uploaded_at DESC LIMIT 1`, [id]); const cvNow = { ...(r.length ? JSON.parse(r[0].content) : {}), [key]: value }; if (r.length) await pool.query(`UPDATE client_assets SET content = $1 WHERE id = $2`, [JSON.stringify(cvNow), r[0].id]); else await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'client_values', 'client_values.json', $2)`, [id, JSON.stringify(cvNow)]); } };
  // Today's price facts for a post: the decisions on today's price rows
  const priceFacts = async (clientId, row) => { const full = rows.find(r => r.slug === row.slug); const d = computeBlogDecisions({ row: full, cv, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, questions: qById, priceRows, tradeFacts: tf, dossier: full.info.post_type === 'local' ? dossier : null, blogRows: rows, today: '2026-10-28' }); return d.decisions ? d.decisions.facts.filter(f => f.kind === 'price').map(f => f.text) : null; };
  // The regenerate: the post written again with the stub from today's decisions (a new, unapproved record)
  const regenerated = [];
  const regenerate = async (clientId, slug) => { const row = rows.find(r => r.slug === slug); const rec = await make(row); if (!rec) throw new Error('could not write it'); const id = await v20Store.insert(clientId, rec, { type: 'blog', key: slug }); regenerated.push(slug); return id; };
  const daily = D.createBlogDaily({ pool, pageMapStore: store, v20Store, siteFor: async () => site, priceFacts, clientValues: values, regenerate, log: { error() {}, log() {} } });
  try {
    // Every record approved and pushed as the push fixture does; the rows marked by afterPush
    for (const x of records) {
      const rec = { ...x.rec, CLAIMS: { for: x.rec.meta.generated_at, status: 'clear', findings: [] }, meta: { ...x.rec.meta, approved_at: '2026-11-01T00:00:00Z', approved_by: 'Brandon' } };
      await v20Store.insert(client.id, rec, { type: 'blog', key: x.row.slug });
      const r = await push({ record: rec, recordId: `rec-${x.row.slug}`, site, store: pushStore, reviewed: true, now: dayAt(-5) });
      if (!r.ok) throw new Error(`push failed for ${x.row.slug}: ${(r.refusals || []).join('; ') || r.error}`);
      await daily.afterPush(client.id, { slug: x.row.slug, postId: r.pageId, status: r.dry.post.status, dateGmt: r.dry.post.date_gmt });
    }
    const pushedRows = (await store.blogRows(client.id)).filter(r => r.status === 'Scheduled');
    chk(`After the push: every pushed post's row is Scheduled with its post id (${pushedRows.length})`, pushedRows.length === records.length && pushedRows.every(r => r.info.wp_post_id), JSON.stringify(pushedRows.map(r => [r.slug, r.status, r.info.wp_post_id])), '');
    const heldPost = records.find(x => x.row.info.primary_link === phase2);
    const costGuides = records.filter(x => x.row.info.post_type === 'cost_guide');
    // The post the price change on day 60 reaches: one stating a price, still scheduled then (dated after day 62), not the held one
    const dayOf = d => Math.round((new Date(`${d}T12:00:00Z`) - new Date(`${LAUNCH}T12:00:00Z`)) / 86400000);
    const priceTarget = records.find(x => x !== heldPost && x.rec.meta.price_ids.length && dayOf(x.rec.publish_date) > 62) || null;
    chk('Set-up: a post stating a price is still scheduled on day 60 (the price change reaches it)', !!priceTarget, JSON.stringify(records.map(x => [x.row.slug, x.rec.publish_date, x.rec.meta.price_ids.length])), 'one');

    // ── 190 days ──
    const byDay = [];
    let churnedOn = null, priceChangedOn = null;
    for (let day = 0; day <= 190; day++) {
      if (day === 40) await pool.query(`UPDATE client_page_map SET status = 'Live' WHERE client_id = $1 AND slug = $2`, [client.id, phase2]);
      if (day === 60 && priceTarget) { const stated = priceTarget.rec.meta.price_ids[0]; const pr = priceRows.find(p => stated.startsWith(`${p.service}:`) || p.service === priceTarget.row.info.service || p.service === priceTarget.rec.service); if (pr) { pr.from_gbp += 55; pr.up_to_gbp += 55; priceChangedOn = day; } }
      if (day === 100) { await saveBlogSettings(pool, client.id, { status: 'churned' }); churnedOn = day; }
      const r = await daily.run(client.id, { now: dayAt(day) });
      byDay.push({ day, actions: r.actions });
    }
    const log = await daily.listLog(client.id, 500);
    const actions = byDay.flatMap(d => d.actions.map(a => ({ day: d.day, ...a })));
    const published = actions.filter(a => a.action === 'publish');
    const posts = [...fake.state.posts.values()];
    const rowsNow = await store.blogRows(client.id);
    const dateOf = slug => records.find(x => x.row.slug === slug).rec.publish_date;
    // Posts publish in order on their dates (the held one and the price changed one aside)
    const plain = records.filter(x => x !== heldPost && x !== priceTarget && x.rec.publish_date < addDaysStr(LAUNCH, 100));
    chk(`Posts publish on their dates, in date order, through the REST status change: the ${plain.length} plain posts dated before the churn each publish on their day; the site shows them published and the page map Live with the URL`, plain.every(x => published.some(a => a.slug === x.row.slug && addDaysStr(LAUNCH, a.day) === x.rec.publish_date)) && published.map(a => a.day).every((d, k, arr) => k === 0 || d >= arr[k - 1]) && plain.every(x => { const p = posts.find(p => p.slug === x.row.slug.split('/').pop()); const row = rowsNow.find(r => r.slug === x.row.slug); return p && p.status === 'publish' && row.status === 'Live' && /\/guides\//.test(row.info.published_url); }), JSON.stringify(published.map(a => [a.day, a.slug])), '');
    // The held post
    const holds = actions.filter(a => a.action === 'hold' && a.slug === heldPost.row.slug);
    const heldPub = published.find(a => a.slug === heldPost.row.slug);
    const heldRow = rowsNow.find(r => r.slug === heldPost.row.slug);
    const heldDay = Math.round((new Date(`${heldPost.rec.publish_date}T12:00:00Z`) - new Date(`${LAUNCH}T12:00:00Z`)) / 86400000);
    chk(`The post whose primary page (${phase2}) goes Live on day 40 (its date day ${heldDay}): held in seven day steps from two days before its date, F-HELD each time, the date moved on the site and the row, then published once the page is Live; the row keeps the hold's history`, holds.length >= 1 && holds.every(a => a.flag === 'F-HELD' && /not Live/.test(a.why)) && heldPub && heldPub.day >= 40 && heldPub.day <= 47 && heldRow.status === 'Live' && heldRow.info.held === null && fake.state.posts.get(Number(heldRow.info.wp_post_id)).status === 'publish', JSON.stringify([holds.map(a => [a.day, a.from, a.to]), heldPub && heldPub.day, heldRow.info.held]), '');
    // The backfill
    const backfills = actions.filter(a => a.action === 'backfill');
    const urls = await values.get(client.id, 'cost_guide_urls');
    const guidesPublished = costGuides.filter(x => published.some(a => a.slug === x.row.slug));
    chk(`The backfill lands the day each cost guide publishes (${guidesPublished.length}): the URL stored on the client in cost_guide_urls, the service page (or the homepage for the trade guide) marked backfill pending with the guide's URL, logged with what waits`, guidesPublished.length >= 1 && guidesPublished.every(x => { const b = backfills.find(a => a.slug === x.row.slug); const pub = published.find(a => a.slug === x.row.slug); return b && b.day === pub.day && urls && urls[x.row.slug] && /\/guides\//.test(urls[x.row.slug].url) && b.targets.length >= 1; }) && (await (async () => { const g = guidesPublished.find(x => x.row.info.service_slug); if (!g) return true; const { rows: pr } = await pool.query(`SELECT info FROM client_page_map WHERE client_id = $1 AND slug = $2`, [client.id, g.row.info.service_slug]); const inf = pr.length ? (typeof pr[0].info === 'string' ? JSON.parse(pr[0].info) : pr[0].info) : null; return inf && (inf.backfill_pending || []).some(b => b.guide === g.row.slug); })()), JSON.stringify([backfills.map(a => [a.day, a.slug, a.targets]), urls]), '');
    // The price change on day 60
    const pc = actions.filter(a => a.action === 'price-change');
    const pcTarget = priceTarget && priceTarget.row.slug;
    const latestPc = pcTarget && await v20Store.latest(client.id, { type: 'blog', key: pcTarget });
    const pcHolds = actions.filter(a => a.action === 'hold' && a.slug === pcTarget);
    chk(`A price change on day 60: the scheduled post stating that price (${pcTarget}) is written again that day, the new record flagged F-PRICE-CHANGED and unapproved, logged; the site keeps the old copy; when its date comes it is held (not approved) and never publishes`, priceChangedOn === 60 && pc.length >= 1 && pc[0].day === 60 && pc[0].slug === pcTarget && regenerated.includes(pcTarget) && latestPc && latestPc.record.meta.price_changed && (latestPc.record.meta.flags_extra || []).includes('F-PRICE-CHANGED') && !latestPc.record.meta.approved_at && !published.some(a => a.slug === pcTarget) && pcHolds.length >= 1 && pcHolds.every(a => /not approved/.test(a.why)) && pc.length === 1, JSON.stringify([pc.map(a => [a.day, a.slug, a.gone]), latestPc && latestPc.record.meta.price_changed, pcHolds.map(a => [a.day, a.why])]), '');
    // Churn on day 100
    const churns = actions.filter(a => a.action === 'churn');
    const stillFuture = records.filter(x => !published.some(a => a.slug === x.row.slug));
    chk(`Churn on day 100: every post still scheduled then (${churns.length}) goes back to a draft on the site, its row Pushed to WordPress; the published ones stay published; nothing publishes after`, churnedOn === 100 && churns.length >= 1 && churns.every(a => a.day === 100) && stillFuture.every(x => { const p = posts.find(p => p.slug === x.row.slug.split('/').pop()); const row = rowsNow.find(r => r.slug === x.row.slug); return p.status === 'draft' && row.status === 'Pushed to WordPress'; }) && !published.some(a => a.day > 100) && posts.filter(p => p.status === 'publish').length === published.length, JSON.stringify([churns.map(a => a.slug), posts.map(p => [p.slug, p.status])]), '');
    chk('Every action is in the job log with its day, in words', log.length === actions.length && log.every(l => l.day && l.why) && ['publish', 'hold', 'backfill', 'price-change', 'churn'].every(k => log.some(l => l.action === k)), JSON.stringify([log.length, actions.length, [...new Set(log.map(l => l.action))]]), '');
    // A dry run changes nothing
    const before = JSON.stringify([...fake.state.posts.values()].map(p => [p.id, p.status, p.date_gmt]));
    const dry = await daily.run(client.id, { now: dayAt(191), dryRun: true });
    chk('A dry run lists what would happen and writes nothing (no log, no site change)', JSON.stringify([...fake.state.posts.values()].map(p => [p.id, p.status, p.date_gmt])) === before && (await daily.listLog(client.id, 500)).length === log.length && Array.isArray(dry.actions), '', '');
  } finally { await new Promise(res => server.close(res)); }

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });

function addDaysStr(day, n) { return new Date(new Date(`${day}T12:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10); }
