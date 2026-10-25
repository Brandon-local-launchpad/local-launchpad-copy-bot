'use strict';
// Fixture: page types (C1). The homepage is one entry in the page type registry,
// and the shared pipeline follows a record's own type: a made-up second type
// ("testpage") goes through edits, re-validation, retries, the claims parser,
// dry run, push and rollback against the fake WordPress, and its versions are
// stored apart from the homepage's (v20-store.js on pg-mem). No API calls.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const PT = require(path.join(root, 'page-types'));
const { modelFields } = require(path.join(root, 'validate-v20.js'));
const Ed = require(path.join(root, 'v20-edit.js'));
const { runRetries } = require(path.join(root, 'v20-retry.js'));
const { parseFindings } = require(path.join(root, 'wp/claims-review.js'));
const { dryRun } = require(path.join(root, 'wp/dry-run.js'));
const { push, rollback } = require(path.join(root, 'wp/push.js'));
const { createMemoryStore } = require(path.join(root, 'wp/push-store.js'));
const { wpGet } = require(path.join(root, 'wp/client.js'));
const { createV20Store } = require(path.join(root, 'v20-store.js'));
const { createFakeWp, seedHomepage, listen } = require(path.join(__dirname, '../fake-wp/fake-wp.js'));
const { newDb, DataType } = require('pg-mem');

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
const throwsMsg = async fn => { try { await fn(); return ''; } catch (e) { return e.message; } };
console.log('\n=== FIXTURE: page types (C1) ===\n');

// ── A made-up second page type ──
const TEST = {
  id: 'testpage', label: 'Test page',
  modelFields: r => [
    { label: 't_body', ref: { key: 't_body' }, text: r.t_body || '', rangeKey: 't_body' },
    ...(r.t_items || []).map((it, i) => ({ label: `item_text (${it.name})`, ref: { key: 't_items', index: i, sub: 'item_text' }, text: it.item_text || '', rangeKey: 'item' })),
  ],
  replyLabels: /t_[a-z_]+|item_text/,
  ranges: { t_body: { min: 3, max: 12, label: '3 to 12' }, item: { min: 2, max: 10, label: '2 to 10' } },
  // BLOCK on the word "bad", so the tests can tell this validator is the one running
  validate: r => TEST.modelFields(r).filter(f => /\bbad\b/i.test(f.text)).map(f => ({ type: 'BLOCK', check: 'T1', field: f.label, ref: f.ref, message: 'Says "bad".', retry: true })),
  readerView: r => `# ${r.t_h1}\n\n${r.t_body}\n`,
  wp: {
    label: 'test page',
    fields: [['t_h1', 'text'], ['t_body', 'html'], ['t_items', 'repeater', { name: 'text', item_text: 'html' }]],
    buildPayload: r => ({ acf: { t_h1: r.t_h1, t_body: `<p>${r.t_body}</p>`, t_items: r.t_items.map(i => ({ name: i.name, item_text: `<p>${i.item_text}</p>` })) }, meta: { rank_math_title: r.t_h1, rank_math_description: '' } }),
    findPage: async (site, r) => (await wpGet(site, `/wp/v2/pages?slug=${encodeURIComponent(r.page_slug)}&status=any&context=edit`))[0] || null,
    groups: [{ name: 'testpage' }],
  },
};

(async () => {
  // ── Registry ──
  const old = JSON.parse(fs.readFileSync(path.join(__dirname, 'v20-outputs/edens-edge-2026-10-14-stage7b-record.json'), 'utf8'));
  chk('A record with no page type is a homepage (records from before C1)', PT.pageTypeOf(old).id === 'homepage' && PT.pageTypeId({}) === 'homepage', PT.pageTypeId(old), 'homepage');
  const hf = modelFields(old);
  chk('Homepage model fields unchanged: 25, hero intro first, final CTA last', hf.length === 25 && hf[0].label === 'home_hero_intro' && hf[24].label === 'home_final_cta_body' && hf.some(f => f.label === 'faq_answer (How soon can you start?)'), `${hf.length}: ${hf[0].label} … ${hf[hf.length - 1].label}`, '25');
  chk('Unknown page type refused', /Unknown page type "nope"/.test(await throwsMsg(async () => PT.getPageType('nope'))), '', 'refused');
  chk('A page type missing a part is refused', /missing "wp"/.test(await throwsMsg(async () => PT.registerPageType({ id: 'x', label: 'X', modelFields: () => [], validate: () => [], readerView: () => '' }))), '', 'refused');
  PT.registerPageType(TEST);
  chk('A second type registers alongside the homepage, the category page and the service page', PT.pageTypes().map(t => t.id).join() === 'homepage,category,service,testpage', PT.pageTypes().map(t => t.id).join(), 'homepage,category,service,testpage');

  const rec = {
    meta: { page_type: 'testpage', generated_at: '2026-10-14T09:00:00.000Z', client_values: { company_name: 'Edens Edge Landscaping', phone: '023 0000 0000' } },
    page_slug: 'paving-contractor',
    VALIDATION: { status: 'run', block: 1, flag: 0, issues: [] },
    CLAIMS: { for: '2026-10-14T09:00:00.000Z', status: 'clear', findings: [] },
    t_h1: 'Paving Contractor Southampton',
    t_body: 'Our paving work is bad sometimes, honestly.',
    t_items: [{ name: 'Patios', item_text: 'We lay sandstone patios on a proper base.' }],
  };

  // ── Shared modules follow the record's type ──
  chk('modelFields of a test page come from its type', modelFields(rec).map(f => f.label).join() === 't_body,item_text (Patios)', modelFields(rec).map(f => f.label).join(), 't_body, item_text');
  const ef = Ed.editableFields(rec);
  chk('Field editor: the type\'s fields and word ranges', ef.length === 2 && ef[0].range.label === '3 to 12' && ef[1].range.max === 10, JSON.stringify(ef.map(f => f.range)), 'its ranges');
  chk('Field editor: a homepage field name is not editable on a test page', /can't be edited/.test(await throwsMsg(async () => Ed.applyEdits(rec, [{ field: 'home_hero_intro', text: 'x' }]))), '', 'refused');
  const current = { V: {}, clientValues: rec.meta.client_values, decisionsBlock: null };
  const rv = Ed.revalidate(rec, current);
  chk('Re-validation runs the type\'s own validator', rv.VALIDATION.block === 1 && rv.VALIDATION.issues[0].check === 'T1' && rv.VALIDATION.issues[0].field === 't_body', JSON.stringify(rv.VALIDATION.issues), 'T1 on t_body');
  const edited = await Ed.editRecord({ record: rec, isLatest: true, edits: [{ field: 't_body', text: 'Our paving work is careful and tidy.' }], current, review: async () => ({ findings: [] }) });
  chk('Hand edit: saved as a new version of the same type, validated by its validator', edited.record.meta.page_type === 'testpage' && edited.record.VALIDATION.block === 0 && edited.record.t_body === 'Our paving work is careful and tidy.', JSON.stringify(edited.record.VALIDATION).slice(0, 80), '0 BLOCK');

  // Retries: the type's validator finds the BLOCK, the rewrite is checked with its ranges and labels
  const forRetry = JSON.parse(JSON.stringify(rec));
  const calls = [];
  const { finalIssues } = await runRetries({ record: forRetry, V: {}, callRetry: async ({ message }) => { calls.push(message); return { text: 't_body: Our paving work is careful and neat.' }; } });
  chk('Retries: the type\'s BLOCK is rewritten away, the message names its range', finalIssues.length === 0 && forRetry.t_body === 'Our paving work is careful and neat.' && /FIELD: t_body \(3 to 12 words\)/.test(calls[0] || ''), (calls[0] || '').split('\n')[0], 'FIELD: t_body (3 to 12 words)');
  const forRetry2 = JSON.parse(JSON.stringify(rec));
  await runRetries({ record: forRetry2, V: {}, callRetry: async () => ({ text: 't_body: Fine words here now.\nitem_text: Something else entirely.' }) });
  chk('Retries: a reply carrying another of the type\'s labels is not one field, so it\'s not kept', /bad/.test(forRetry2.t_body), forRetry2.t_body, 'unchanged');

  // Claims parser keeps a quote only when it's in the named field of this type
  const pf = parseFindings(JSON.stringify({ findings: [
    { field: 'item_text (Patios)', quote: 'sandstone patios', why: 'material not confirmed' },
    { field: 'home_hero_intro', quote: 'sandstone patios', why: 'wrong field' },
  ] }), rec);
  chk('Claims parser: findings checked against the type\'s fields', pf.findings.length === 1 && pf.findings[0].field === 'item_text (Patios)' && pf.dropped.length === 1, JSON.stringify(pf), '1 kept');

  // ── Dry run, push, rollback on the type's page ──
  const clean = edited.record;
  const fake = createFakeWp({
    pages: [seedHomepage(), { id: 21, slug: 'paving-contractor', status: 'draft', title: { raw: 'Paving' }, acf: { t_h1: 'Old paving page', t_body: '<p>Old.</p>' }, meta: { rank_math_title: 'Old' } }],
    fieldGroups: ['group_llp_testpage'],
  });
  const { server, url } = await listen(fake.app);
  try {
    const site = { url, user: 'copybot', appPassword: 'test-app-password-not-real', seo: 'rankmath' };
    const d = await dryRun({ record: clean, site, reviewed: true });
    chk('Dry run: finds the type\'s page by slug and diffs the type\'s fields', d.pushable && d.page.id === 21 && d.pageType === 'testpage' && d.changes.some(c => c.field === 't_h1' && c.change === 'changed') && d.changes.some(c => c.field === 't_items[1].item_text' && c.change === 'added') && !d.changes.some(c => c.field.startsWith('home_')), JSON.stringify(d.refusals), 'pushable, t_ fields');
    const dHome = await dryRun({ record: old.meta.client_values ? old : { ...old, meta: { ...old.meta, client_values: { company_name: 'x' } } }, site, reviewed: true });
    chk('Dry run: the homepage checks its own field groups (missing on this site)', dHome.refusals.some(x => /^Homepage field groups missing/.test(x)), JSON.stringify(dHome.refusals).slice(0, 120), 'refused');
    const store = createMemoryStore();
    const p = await push({ record: clean, site, store, reviewed: true });
    chk('Push: writes the type\'s page, reads it back, logs the type', p.ok && fake.state.pages.get(21).acf.t_h1 === 'Paving Contractor Southampton' && fake.state.pages.get(7).acf.home_hero_h1 === 'Gardener Southampton | Edens Edge' && (await store.listLog())[0].pageType === 'testpage', JSON.stringify({ ok: p.ok, refusals: p.refusals, mismatches: p.mismatches }), 'pushed to page 21 only');
    const rb = await rollback({ snapshotId: p.snapshotId, site, store });
    chk('Rollback: restores the type\'s page from its snapshot', rb.ok && fake.state.pages.get(21).acf.t_h1 === 'Old paving page', JSON.stringify(rb), 'restored');
    const missing = await dryRun({ record: { ...clean, page_slug: 'no-such-page' }, site, reviewed: true });
    chk('Dry run: the type\'s page missing on the site is named by its label', missing.refusals.includes('The test page was not found on the site.'), JSON.stringify(missing.refusals), 'not found');
  } finally { await new Promise(res => server.close(res)); }

  // ── Storage: versions by page type and key ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const pool = new (mem.adapters.createPg().Pool)();
  await pool.query(`CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metadata JSONB);`);
  const cid = crypto.randomUUID(), other = crypto.randomUUID();
  const S = createV20Store(pool);
  const tick = () => new Promise(r => setTimeout(r, 5));
  // A homepage row from before page types (no metadata)
  const legacy = (await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'v20_page_record', 'homepage_v20.json', $2) RETURNING id`, [cid, JSON.stringify(old)])).rows[0].id;
  await tick();
  const pav1 = await S.insert(cid, rec, { type: 'testpage', key: 'paving-contractor' }); await tick();
  const deck = await S.insert(cid, { ...rec, page_slug: 'deck-builder' }, { type: 'testpage', key: 'deck-builder' }); await tick();
  const pav2 = await S.insert(cid, clean, { type: 'testpage', key: 'paving-contractor' }); await tick();
  await S.insert(other, rec, { type: 'testpage', key: 'paving-contractor' });
  const home = await S.latest(cid, { type: 'homepage', key: 'homepage' });
  chk('Store: a row with no metadata is the homepage, and newer test pages don\'t displace it', home && home.id === legacy && home.type === 'homepage', JSON.stringify(home && { id: home.id, type: home.type }), legacy);
  const pv = await S.versions(cid, { type: 'testpage', key: 'paving-contractor' });
  chk('Store: versions of one page, newest first, not another page\'s or another client\'s', pv.map(v => v.id).join() === [pav2, pav1].join(), pv.map(v => v.id).join(), 'pav2, pav1');
  const pages = await S.pages(cid, 'testpage');
  chk('Store: a type\'s pages, each with its latest version', pages.length === 2 && pages.find(x => x.key === 'paving-contractor').id === pav2 && pages.find(x => x.key === 'deck-builder').id === deck, JSON.stringify(pages.map(x => [x.key, x.id === pav2 || x.id === deck])), '2 pages');
  const b = await S.byId(cid, pav1);
  chk('Store: a version by id knows its type and key; another client\'s id is not found', b.type === 'testpage' && b.key === 'paving-contractor' && (await S.byId(other, pav1)) === null && (await S.byId(cid, 'not-an-id')) === null, JSON.stringify({ t: b.type, k: b.key }), 'testpage/paving');
  await S.saveClaims(cid, pav1, { for: 'x', status: 'needs acceptance', findings: [{ field: 't_body', quote: 'bad', why: 'w' }] });
  const after = (await S.byId(cid, pav1)).record;
  chk('Store: claims saved on the version, after VALIDATION', after.CLAIMS.status === 'needs acceptance' && Object.keys(after).indexOf('CLAIMS') === Object.keys(after).indexOf('VALIDATION') + 1, Object.keys(after).join(), 'CLAIMS after VALIDATION');

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
