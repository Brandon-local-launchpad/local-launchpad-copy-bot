'use strict';
// Fixture: blog posts, stage 4 (generation), 28 Oct 2026. The request (CORE (1) plus the
// shared rules, the cached client block, the post's block), the parser on the blog spec with
// a stub model that writes every field the DECISIONS block asks for (nothing left over, no
// P-* flag), the record (B5 meta description, the table cells, HIDDEN parts), and the runner
// on pg-mem (the queue order, a gated post recorded blocked, resume keeping a good record, a
// rerun updating the post instead of making a second one, the ideas of an earlier post
// reaching the next). The live Edens Edge sort with the test sample bank. No API calls.
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
const { computeBlogDecisions, expectedFromBlogDecisions } = require(path.join(root, 'blog/decisions.js'));
const { generateBlogPost, buildBlogRequest, loadCore1 } = require(path.join(root, 'blog/generate.js'));
const { buildBlogRecord, metaDescriptionFor, splitCells } = require(path.join(root, 'blog/record.js'));
const { createBlogQueueService } = require(path.join(root, 'blog/queue-service.js'));
const { createBlogRunner } = require(path.join(root, 'blog/run.js'));
const { ensureBlogColumns } = require(path.join(root, 'blog/db.js'));
const { ensurePageMapTables, createPageMapStore } = require(path.join(root, 'page-map/store.js'));
const { createV20Store } = require(path.join(root, 'v20-store.js'));
const { parseOutput } = require(path.join(root, 'v20-parse.js'));
const PT = require(path.join(root, 'page-types/blog.js'));
const { parseDossier } = require(path.join(root, 'geo-dossier.js'));
const { newDb, DataType } = require('pg-mem');

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
const has = (list, re) => (list || []).some(x => typeof x === 'string' ? re.test(x) : (re.test(x.code || '') || re.test(x.msg || '')));
console.log('\n=== FIXTURE: blog posts, stage 4 (generation) ===\n');

// ── A stub model (tests/fixtures/data/blog-stub-model.js): it writes what MODEL FIELDS asks for ──
const { stubReply, words } = require(path.join(__dirname, 'data/blog-stub-model.js'));
const calls = [];
const stubModel = async ({ system, message }) => { calls.push({ system, message }); return { text: stubReply(message), usage: { input_tokens: 10, output_tokens: 10, stop_reason: 'end_turn', model: 'stub' } }; };

const edens = C.byId['edens-edge'];
const niche = { ...edens.niche, _source: 'landscaper' };
const sampleBank = B.parseBank(fs.readFileSync(path.join(__dirname, 'data/blog-bank-landscaper-sample.md'), 'utf8'));
const dossierText = fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8');

chk('B5 on its own: the first sentence and the meta CTA at 155; the CTA dropped when over; F-LEN-META when the sentence alone is over', metaDescriptionFor('A patio in Southampton usually costs between two and six thousand pounds. The ground decides it.', 'Get your free quote today.').text === 'A patio in Southampton usually costs between two and six thousand pounds. Get your free quote today.' && metaDescriptionFor(`${'A long opening sentence about the price of a patio that runs on and on for a while'}, with more words to pass one hundred and forty characters in all here. Next.`, 'Get your free quote today.').how.startsWith('first sentence (the CTA dropped') && metaDescriptionFor(`${words(40)}`, 'x').flag && metaDescriptionFor('', 'x').flag, JSON.stringify(metaDescriptionFor(`${words(40)}`, 'x')), '');
chk('Table cells: "a ; b ; c" split to the columns, padded or cut', JSON.stringify(splitCells('from £80 ; the size ; ', 2)) === '["from £80","the size"]' && JSON.stringify(splitCells('one', 3)) === '["one","",""]', JSON.stringify(splitCells('from £80 ; the size ; ', 2)), '');
chk('CORE (1) loads with the shared copy rules appended under their heading', /## SHARED COPY RULES/.test(loadCore1()) && /blog_answer/.test(loadCore1()), '', '');

(async () => {
  const research = R.parseFaqResearch(fs.readFileSync(path.join(__dirname, 'faq-research-replies/edens-edge-live-2026-10-14.md'), 'utf8'));
  const replies = JSON.parse(fs.readFileSync(path.join(__dirname, 'faq-sort-replies/edens-edge-live.json'), 'utf8')).replies;
  const cv = { ...edens.cvThin, primary_category: 'Gardener', insurance_cover: '5m', differentiator_2_confirmed: true, jobs_wanted: ['Landscape Gardener', 'Landscape Designer'], quote_method: 'written quote after a visit', confirmed_practices: ['price_agreed_before_work'], owner_name: 'Ethan', owner_role: 'owner', year_founded: '2016', free_quotes: 'yes' };
  let i = 0;
  const tidy = await S.runTidy({ research, niche: edens.niche, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, pages: edens.pages, cv, callModel: async () => replies[i++] });
  // The client's customers' own questions (client value customer_questions, C-1…): the held
  // "No page for these" posts, with the customer's words as a specificity fact (B9)
  const customerQs = ['Why is my lawn always waterlogged after rain?', 'Is turf or seed better for a new lawn?', 'Do I need planning permission to pave my front garden?', 'What does a landscape gardener charge per day?', 'Can you lay a patio in winter?', 'How do I stop my hedge dying back after cutting?'];
  const questions = [...S.clientQuestionItems({ customer_questions: customerQs }).map(q => ({ ...q, wording: q.text, wording_errors: [], approved: true })), ...tidy.questions.map(q => ({ ...q, approved: !q.wording_errors.length }))];
  const A = S.assignQuestions({ questions, cv, pages: edens.pages, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, niche: edens.niche });
  const pageWordings = new Set(Object.values(A.pages).flatMap(pg => pg.questions.map(q => q.wording)));
  const alloc = { pages: { homepage: { neighbourhoods: ['SOU-N07'], symptoms: { faq_B: 'SOU-S01' } } } };
  const res = reserveBlogTopics({ assignment: A, cv, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, serviceParentMap: edens.serviceParentMap, dossiers: [{ location: 'Southampton', text: dossierText }], allocationRecord: alloc, bank: sampleBank, pageWordings, launchDate: '2026-11-09' });
  const scheduled = Q.schedule(res.topics, '2026-11-09');
  // Every post's question approved, as a person would on the queue
  const rows = Q.rowsFor(scheduled.topics).map(r => ({ ...r, type: 'blog', page_key: `blog:${r.slug}`, status: 'Not Started', applies: true, info: { ...r.info, wording_approved: true } }));
  const qById = new Map(questions.map(q => [q.id, q]));
  const dossier = parseDossier(dossierText);
  // A price row for every service page, so the cost guides run in prices mode and B9 passes
  const priceRows = edens.pages.filter(p => p.pageType === 'service' && p.urlSlug).map((p, k) => ({ id: `p${k}`, service: p.pageTitle, from_gbp: 300 + k * 100, up_to_gbp: 900 + k * 100, unit: 'per job', what_moves_price: 'the size of the job', quote_only: false, unverified: false, deleted: false }));
  const tf = { niche: 'landscaper', verified: true, rows: [{ kind: 'standard method', text: 'Stages: dig out → sub base → bedding → lay → point' }, { kind: 'what goes wrong', text: 'Signs: slabs rock. Skipped: a thin base' }, { kind: 'rule', name: 'Front garden paving', text: 'Over five square metres of an impermeable surface draining to the road usually needs permission' }] };
  const decide = (row, extra = {}) => computeBlogDecisions({ row, cv, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, questions: qById, priceRows, tradeFacts: tf, dossier: row.info.post_type === 'local' ? dossier : null, blogRows: rows, today: '2026-10-28', ...extra });

  // ── The request ──
  const merged = rows.find(r => r.info.question_id === 'C-1');
  chk('A customer question that is a bank topic in other words (C-1 "always waterlogged after rain", BT-4 "waterlogged") keeps the slot as the customer\'s words and takes the bank topic\'s related questions as its stack and FAQ; the bank topic is not a second post', merged && merged.info.bank_topic === 'BT-4' && merged.info.query_stack.length >= 3 && merged.info.query_stack.every(id => /^BT-4\./.test(id)) && !rows.some(r => r.info.question_id === 'BT-4'), JSON.stringify(merged && { bank_topic: merged.info.bank_topic, stack: merged.info.query_stack, faq: merged.info.faq_ids }), '');
  const d0 = decide(merged);
  chk('Set-up: the merged post passes its gates: the customer\'s words, the town, a confirmed process and the trade facts methods make 4 of 6', !d0.gates.length && d0.decisions.specificity.count >= 4 && d0.decisions.facts.some(f => f.id === 'CQ-1'), JSON.stringify(d0.gates), 'no gates');
  const req = buildBlogRequest({ cv, niche, decisions: d0.decisions, decisionsBlock: d0.decisionsBlock, calibrationPack: 'PACK TEXT', keyValueMap: edens.keyValueMap });
  chk('The request: CORE (1) with the shared rules, the cached client block (CLIENT VALUES, confirmed practices, NICHE ENTRY, CALIBRATION PACK), the post block as the message', req.system.length === 2 && /## SHARED COPY RULES/.test(req.system[0].text) && req.system[1].cache_control && /^CLIENT VALUES\n/.test(req.system[1].text) && /CONFIRMED PRACTICES/.test(req.system[1].text) && /NICHE ENTRY/.test(req.system[1].text) && /CALIBRATION PACK\nPACK TEXT/.test(req.system[1].text) && /^POST: post_type question/.test(req.message) && /MODEL FIELDS/.test(req.message) && /MODEL FIELDS:/.test(req.message), '', '');

  // ── Every post that passes its gates parses into its fields with nothing left over ──
  let generated = 0, gated = 0;
  const problems = [];
  const records = [];
  for (const row of rows) {
    const d = decide(row);
    if (d.gates.length) { gated++; continue; }
    const rec = await generateBlogPost({ cv, niche, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, decisionsResult: d, calibrationPack: 'PACK', calibrationPackName: 'test', callModel: stubModel, retries: false, claimsReview: false });
    records.push({ row, rec, d });
    generated++;
    const pflags = (rec.FLAGS || []).filter(f => f.source === 'parse');
    if (pflags.length) problems.push(`${row.slug}: ${pflags.map(f => f.code + ' ' + f.msg).join('; ')}`);
    const D = d.decisions;
    if (!rec.blog_answer || rec.sections.length !== D.sections.length || rec.sections.some(s => !s.body) || rec.faq_items.length !== D.faq.length || rec.faq_items.some(f => !f.faq_answer) || !rec.blog_closing) problems.push(`${row.slug}: a field is empty or a count is off`);
    if (D.table.show && (!rec.table_show || rec.table_rows.length !== D.table.rows.length || rec.table_rows.some(r => r.cells.length !== D.table.columns.length - 1 || r.cells.some(c => !c)))) problems.push(`${row.slug}: the table rows or cells are off`);
    if (!D.table.show && rec.table_show) problems.push(`${row.slug}: a hidden table shows`);
    if (D.business.show ? (!rec.blog_business || rec.blog_business === 'HIDDEN') : rec.blog_business !== 'HIDDEN') problems.push(`${row.slug}: the business block is wrong`);
    if (!rec.meta_description || rec.meta_description.length > 155) problems.push(`${row.slug}: meta description ${rec.meta_description.length}`);
  }
  chk(`Every post that passes its gates (${generated} of ${rows.length}; ${gated} gated on the thin data) parses into its fields with nothing left over: no P-* flag, every section body, table cell, FAQ answer and the closing filled, HIDDEN parts hidden, a meta description at 155 or under`, generated >= 8 && !problems.length, problems.join('\n') || `${generated} generated`, 'no problems');
  const first = records[0].rec;
  chk('The record: page blog, the post type, the slug and URL, the H1 and byline, last checked and review due, the meta description from the first sentence plus the CTA, the breadcrumb, the buttons with the phone as a token, the meta with the model and the decisions block', first.page === 'blog' && PT.POST_TYPES.includes(first.post_type) && first.url === `${first.page_slug}/` && first.blog_h1 && /^By Ethan, owner at \[CV: company_name\]$/.test(first.blog_byline) && first.blog_last_checked === '2026-10-28' && first.blog_review_due && /Get your \[QUOTE_FREE_LOWER\] quote today\.$/.test(first.meta_description) && first.breadcrumb.length === 3 && first.buttons.includes('Call [CV: phone]') && first.meta.page_type === 'blog' && first.meta.page_key === first.page_slug && first.meta.model === 'stub' && first.meta.decisions_block && first.meta.raw_output && Array.isArray(first.meta.ideas), JSON.stringify({ byline: first.blog_byline, meta: first.meta_description, buttons: first.buttons }), '');
  const withTable = records.find(x => x.rec.table_show);
  chk('A table post: the columns from the decisions, one row per label with the cells split from "a ; b" and the joined text kept for editing', withTable && withTable.rec.table_columns.length >= 2 && withTable.rec.table_rows.every(r => r.cells.length === withTable.rec.table_columns.length - 1 && r.cells_text === r.cells.join(' ; ')), withTable ? JSON.stringify(withTable.rec.table_rows[0]) : 'none', '');
  chk('The validator ran (the shared checks) on every generated post and the ideas were extracted', records.every(x => x.rec.VALIDATION && x.rec.VALIDATION.status === 'run') && records.every(x => Array.isArray(x.rec.meta.ideas)), JSON.stringify(records.map(x => x.rec.VALIDATION && x.rec.VALIDATION.status)), '');
  const withSections = records.find(x => x.rec.sections.length).rec;
  chk('modelFields on a generated record lists every prose field in page order with the post type\'s section range', (() => { const f = PT.modelFields(withSections); return f[0].label === 'blog_answer' && f.some(x => x.rangeKey === `section_body:${withSections.post_type}`) && f[f.length - 1].label === 'blog_closing'; })(), '', '');
  // A gated post: no call, recorded blocked with the gate
  const gatedRow = rows.find(r => decide(r).gates.length);
  const before = calls.length;
  const blocked = await generateBlogPost({ cv, niche, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, decisionsResult: decide(gatedRow), calibrationPack: null, callModel: stubModel });
  chk('A gated post makes no model call and is recorded blocked with its gate in FLAGS', calls.length === before && blocked.blocked && blocked.FLAGS.some(f => f.source === 'gate') && blocked.VALIDATION.status === 'not run', JSON.stringify(blocked.FLAGS), '');
  // The parser on a reply with a field missing and a HIDDEN table written with rows
  const dq = d0;
  const bad = parseOutput(stubReply(dq.decisionsBlock).replace(/^blog_closing:.*$/m, '').replace('blog_table: HIDDEN', 'blog_table:\n- row: X | cells: a ; b'), PT.OUTPUT_SPEC, expectedFromBlogDecisions(dq.decisions));
  chk('The parser flags a missing field (P-MISSING) and rows given for a table the decisions hid (P-COUNT), keeping the given titles', bad.flags.some(f => f.code === 'P-MISSING' && /blog_closing/.test(f.msg)) && bad.flags.some(f => f.code === 'P-COUNT' && /blog_table/.test(f.msg)), JSON.stringify(bad.flags), '');

  // ── The runner on pg-mem ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metadata JSONB);`);
  await ensureBlogColumns(pool); await ensurePageMapTables(pool);
  const { rows: [client] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('Edens Edge', 'Landscaper') RETURNING id`);
  await pool.query(`UPDATE clients SET launch_date = '2026-11-09' WHERE id = $1`, [client.id]);
  await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content, metadata) VALUES ($1, 'geo_dossier', 'd.md', $2, $3)`, [client.id, dossierText, JSON.stringify({ location_name: 'Southampton', superseded: false })]);
  const store = createPageMapStore({ pool, filloutService: null });
  const v20Store = createV20Store(pool);
  const ctx = { cv, pages: edens.pages, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, trade: 'Landscaper' };
  const faqStub = { blogTopics: async () => ({ blog: res, siteCheck: { ok: true }, sort: { record: { questions } }, assignment: A, ctx, niche }) };
  const queue = createBlogQueueService({ pool, pageMapStore: store, faqService: faqStub, filloutService: { record: async () => ({ prices: { rows: priceRows } }) }, tradeFactsGate: async () => ({ niche: 'landscaper', verified: true }), packRows: () => ({ rows: tf.rows }), v20Store, log: { log() {}, error() {} } });
  await queue.build(client.id);
  for (const r of await store.blogRows(client.id)) if (!(r.info || {}).wording_approved) await queue.setWording(client.id, r.slug, { approved: true });
  let genCalls = 0;
  const runner = createBlogRunner({ pool, v20Store, queue, generate: async args => { genCalls++; return generateBlogPost({ ...args, callModel: stubModel, retries: false, claimsReview: false }); }, calibrationPack: () => ({ name: 'test', text: 'PACK' }), log() {} });
  const state = await runner.run(client.id, { resume: false });
  const done = state.posts.filter(p => p.status === 'done'), blockedPosts = state.posts.filter(p => p.status === 'blocked');
  chk(`The run: every post in queue order, ${done.length} written and ${blockedPosts.length} blocked by a gate, the state saved with each post's result`, state.posts.length === rows.length && done.length + blockedPosts.length === rows.length && done.length >= 8 && state.finished_at && (await runner.loadState(client.id)).state.posts.length === rows.length && state.posts[0].key === rows[0].slug, JSON.stringify(state.posts.map(p => [p.key, p.status])), '');
  const stored = await v20Store.pages(client.id, 'blog');
  chk('The records are in the v20 store by slug, one per post, blocked ones too', stored.length === rows.length && stored.every(p => p.key.startsWith('/guides/')), stored.length, rows.length);
  const resumed = await runner.run(client.id, { resume: true });
  chk('Resume: a post with a good record is kept, a blocked one is tried again; no second record for a kept post', resumed.posts.filter(p => p.status === 'kept').length === done.length && (await v20Store.versions(client.id, { type: 'blog', key: done[0].key }, 5)).length === 1, JSON.stringify(resumed.posts.map(p => p.status)), '');
  const again = await runner.run(client.id, { resume: false, keys: [done[0].key] });
  chk('A rerun of one post updates it as a new version of the same key, never a second post', again.posts.length === 1 && again.posts[0].status === 'done' && (await v20Store.versions(client.id, { type: 'blog', key: done[0].key }, 5)).length === 2 && (await v20Store.pages(client.id, 'blog')).length === rows.length, JSON.stringify(again.posts), '');
  const v = await runner.view(client.id);
  chk('The view: every post with its record summary (good, block, flag) and the run state', v.posts.length === rows.length && v.posts.filter(p => p.record && p.record.good).length === done.length && v.run && v.run.finished_at, JSON.stringify(v.posts.slice(0, 2)), '');
  const qv = await queue.view(client.id);
  chk('The queue view carries each post\'s record too', qv.rows.filter(r => r.record).length === rows.length, qv.rows.filter(r => r.record).length, rows.length);
  // Ideas: the second post about the same service sees the first post's ideas in its block
  const sameService = rows.filter(r => r.info.service).reduce((m, r) => { (m[r.info.service] = m[r.info.service] || []).push(r); return m; }, {});
  const pair = Object.values(sameService).find(l => l.length >= 2);
  if (pair) {
    const I = await queue.inputsFor(client.id);
    const rec1 = (await v20Store.latest(client.id, { type: 'blog', key: pair[0].slug })).record;
    const { decisionsResult, ideasUsed } = await runner.prepare(client.id, I, pair[1], await store.blogRows(client.id), [{ key: pair[0].slug, title: pair[0].title, service: pair[0].info.service, town: '', record: rec1 }]);
    chk('IDEAS USED ELSEWHERE: an earlier post about the same service feeds the next post\'s block', ideasUsed.length > 0 && /IDEAS USED ELSEWHERE/.test(decisionsResult.decisionsBlock || '') && (decisionsResult.decisionsBlock || '').includes(`(${pair[0].title} post)`), String(ideasUsed.length), '');
  } else chk('IDEAS USED ELSEWHERE: (no two posts share a service in this queue; skipped)', true, '', '');
  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
