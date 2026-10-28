'use strict';
// Fixture: blog posts, stage 7 (the push to WordPress), 28 Oct 2026. Against the fake
// WordPress server only (tests/fake-wp): never a real site. Edens Edge's posts written with
// the stub model, then: the payload (the ACF fields of spec section 6, the post's title, slug,
// Guides category, status and date), the schedule (future at 09:00 Europe/London, a draft
// with no date or a passed date, never publish), the dry run on a site with no posts (would
// create), the push making the Guides category and every post, the read back, a second push
// changing nothing, a rollback of a created post to a draft, and the safety rails (no BLOCK,
// FLAGs read, claims, a published post refused off staging). No API calls.
const fs = require('fs');
const path = require('path');
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
const { buildBlogPayload, BLOG_FIELDS, slugOf, scheduleFor, londonToUtc, GUIDES } = require(path.join(root, 'wp/blog-map.js'));
const { checkRecord, checkTarget } = require(path.join(root, 'wp/safety.js'));
const { dryRun, formatDryRun } = require(path.join(root, 'wp/dry-run.js'));
const { push, rollback } = require(path.join(root, 'wp/push.js'));
const { createMemoryStore } = require(path.join(root, 'wp/push-store.js'));
const { createFakeWp, listen } = require(path.join(__dirname, '../fake-wp/fake-wp.js'));
const { getPageType, pageTypeOf } = require(path.join(root, 'page-types'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: blog posts, stage 7 (the push to the fake WordPress) ===\n');

// ── The schedule ──
chk('Europe/London at 09:00 → date_gmt: 09:00 UTC in November (GMT), 08:00 UTC in June (BST)', londonToUtc('2026-11-09') === '2026-11-09T09:00:00' && londonToUtc('2026-06-15') === '2026-06-15T08:00:00' && londonToUtc('') === null, `${londonToUtc('2026-11-09')} ${londonToUtc('2026-06-15')}`, '09:00 / 08:00');
const NOW = new Date('2026-11-01T12:00:00Z');
chk('A post dated after now is future with its date; one with no date a draft; one whose date has passed a draft (the daily job publishes); never publish', scheduleFor({ publish_date: '2026-12-10' }, { now: NOW }).status === 'future' && scheduleFor({ publish_date: '2026-12-10' }, { now: NOW }).date_gmt === '2026-12-10T09:00:00' && scheduleFor({}, { now: NOW }).status === 'draft' && scheduleFor({ publish_date: '2026-10-20' }, { now: NOW }).status === 'draft' && /passed/.test(scheduleFor({ publish_date: '2026-10-20' }, { now: NOW }).why), JSON.stringify([scheduleFor({ publish_date: '2026-12-10' }, { now: NOW }), scheduleFor({}, { now: NOW }), scheduleFor({ publish_date: '2026-10-20' }, { now: NOW })]), '');

const { stubReply } = require(path.join(__dirname, 'data/blog-stub-model.js'));
const stubModel = async ({ message }) => ({ text: stubReply(message), usage: { input_tokens: 10, output_tokens: 10, stop_reason: 'end_turn', model: 'stub' } });
const edens = C.byId['edens-edge'];
const niche = { ...edens.niche, _source: 'landscaper' };
const sampleBank = B.parseBank(fs.readFileSync(path.join(__dirname, 'data/blog-bank-landscaper-run-v1.md'), 'utf8'));
const dossierText = fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8');

(async () => {
  // ── Edens Edge's posts, as the generation fixture makes them ──
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
  const res = reserveBlogTopics({ assignment: A, cv, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, serviceParentMap: edens.serviceParentMap, dossiers: [{ location: 'Southampton', text: dossierText }], allocationRecord: alloc, bank: sampleBank, pageWordings, launchDate: '2026-11-09' });
  const bankRelated = sampleBank.topics.flatMap(t => t.related);
  let bi = 0;
  const give = (t) => { if (t.query_stack.length >= 3 && t.faq_ids.length >= 3) return t; const pick = n => Array.from({ length: n }, () => { const r = bankRelated[bi++ % bankRelated.length]; return { id: `${r.id}#${bi}`, wording: r.question, doubt: r.doubt, needs_fact: false }; }); const stack = t.query_stack.length >= 3 ? t.stack : pick(3), faq = t.faq_ids.length >= 3 ? t.faq : pick(3); return { ...t, held: false, stack, query_stack: stack.map(x => x.id), faq, faq_ids: faq.map(x => x.id) }; };
  const scheduled = Q.schedule([...res.topics, ...res.held_back].map(give), '2026-11-09');
  const rows = Q.rowsFor(scheduled.topics).map(r => ({ ...r, type: 'blog', page_key: `blog:${r.slug}`, status: 'Not Started', applies: true, info: { ...r.info, wording_approved: true } }));
  const qById = new Map(questions.map(q => [q.id, q]));
  const dossier = parseDossier(dossierText);
  const priceRows = edens.pages.filter(p => p.pageType === 'service' && p.urlSlug).map((p, k) => ({ id: `p${k}`, service: p.pageTitle, from_gbp: 300 + k * 100, up_to_gbp: 900 + k * 100, unit: 'per job', what_moves_price: 'the size of the job', usable: true }));
  const tf = { niche: 'landscaper', verified: true, rows: [{ kind: 'standard method', text: 'Stages: dig out → sub base → bedding → lay → point' }, { kind: 'what goes wrong', text: 'Signs: slabs rock. Skipped: a thin base' }, { kind: 'timing', text: 'Turf is laid September to October or March to April' }, { kind: 'rule', text: 'Paving over five square metres draining to the road usually needs permission' }] };
  const decide = row => computeBlogDecisions({ row, cv, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, questions: qById, priceRows, tradeFacts: tf, dossier: row.info.post_type === 'local' ? dossier : null, blogRows: rows, today: '2026-10-28' });
  const records = [];
  for (const row of rows) {
    const d = decide(row);
    if (d.gates.length) continue;
    const rec = await generateBlogPost({ cv, niche, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, decisionsResult: d, calibrationPack: 'PACK', calibrationPackName: 'test', callModel: stubModel, retries: false, claimsReview: false });
    if (rec.VALIDATION && rec.VALIDATION.status === 'run' && rec.VALIDATION.block === 0) records.push(rec);
  }
  const dated = records.filter(r => r.publish_date), undated = records.filter(r => !r.publish_date);
  chk(`Set-up: Edens Edge's posts with no BLOCK (${records.length} of ${rows.length} rows; ${dated.length} dated by the schedule, ${undated.length} beyond the onboarding batch with no date), typed blog`, dated.length >= 3 && undated.length >= 1 && records.every(r => pageTypeOf(r).id === 'blog') && records[0].publish_date, records.map(r => [r.page_slug, r.publish_date].join(' ')).join(' | '), '3 or more dated');
  // A clean review on file for every record, as a push needs
  const at = r => r.meta.generated_at;
  const ready = records.map(r => ({ ...r, CLAIMS: { for: at(r), status: 'clear', findings: [] } }));

  // ── The payload ──
  const first = ready[0];
  const P = buildBlogPayload(first, { now: NOW });
  chk('The payload has exactly the mapped ACF fields (spec section 6), the Rank Math meta, and the post: the H1 as its title, the slug from /guides/<slug>, the Guides category, future with its date at 09:00 London', Object.keys(P.acf).sort().join() === BLOG_FIELDS.map(f => f[0]).sort().join() && P.meta.rank_math_title === first.seo_title && P.meta.rank_math_description === first.meta_description && P.post.title === first.blog_h1 && P.post.slug === slugOf(first) && !/\//.test(P.post.slug) && first.page_slug === `/guides/${P.post.slug}` && P.post.category === GUIDES.slug && P.post.status === 'future' && P.post.date_gmt === `${first.publish_date}T09:00:00`, JSON.stringify({ keys: Object.keys(P.acf), post: P.post }), '');
  chk('The sections, FAQ and closing as HTML with the links kept, the H2s and questions as text; the byline, last checked (the shown text) and review due; the buttons (the action to /contact/, the call as a tel token); tokens left for the site', P.acf.blog_sections.length === first.sections.length && P.acf.blog_sections.every((s, k) => s.section_h2 === first.sections[k].h2 && /^<p>/.test(s.section_body)) && P.acf.blog_faq_items.length === first.faq_items.length && /^<p>/.test(P.acf.blog_closing) && /<a href="/.test([P.acf.blog_closing, ...P.acf.blog_sections.map(s => s.section_body)].join('')) && P.acf.blog_byline === first.blog_byline && P.acf.blog_last_checked === first.blog_last_checked_text && P.acf.blog_review_due === first.blog_review_due && P.acf.blog_buttons.length === 2 && P.acf.blog_buttons.some(b => b.button_url === '/contact/') && P.acf.blog_buttons.some(b => /^Call \[CV: phone\]$/.test(b.button_label) && b.button_url === 'tel:[CV: phone]') && /\[CV: company_name\]/.test(JSON.stringify(P.acf)), JSON.stringify({ buttons: P.acf.blog_buttons, byline: P.acf.blog_byline, closing: P.acf.blog_closing.slice(0, 80) }), '');
  const withTable = ready.find(r => r.table_show && r.table_rows.length);
  const noTable = ready.find(r => !r.table_show);
  const PT = withTable && buildBlogPayload(withTable, { now: NOW });
  const PN = noTable && buildBlogPayload(noTable, { now: NOW });
  chk('The table: shown with its section number, the columns as rows of labels, each row its label and up to three cells; a post without a table sends it off and empty', (!withTable || (PT.acf.table_show === true && PT.acf.table_after === String(withTable.table_after) && PT.acf.table_columns.map(c => c.column_label).join('|') === withTable.table_columns.join('|') && PT.acf.table_rows.length === withTable.table_rows.length && PT.acf.table_rows[0].row_label === withTable.table_rows[0].row && PT.acf.table_rows[0].cell_1 === withTable.table_rows[0].cells[0])) && (!noTable || (PN.acf.table_show === false && PN.acf.table_after === '' && PN.acf.table_columns.length === 0 && PN.acf.table_rows.length === 0)), JSON.stringify({ table: PT && PT.acf.table_rows[0], none: PN && [PN.acf.table_show, PN.acf.table_after] }), '');
  const schema = JSON.parse(P.acf.blog_schema);
  chk('The schema JSON-LD: BlogPosting (the H1, the byline\'s person, the dates, the publisher as the LocalBusiness @id token), FAQPage from the FAQ items (answers as plain text), BreadcrumbList Home → Guides → the post', schema.length === 3 && schema[0]['@type'] === 'BlogPosting' && schema[0].headline === first.blog_h1 && schema[0].author.name === 'Ethan' && schema[0].datePublished === first.publish_date && schema[0].publisher['@id'] === '[CV: business_schema_id]' && schema[1]['@type'] === 'FAQPage' && schema[1].mainEntity.length === first.faq_items.length && !/\]\(/.test(schema[1].mainEntity[0].acceptedAnswer.text) && schema[2]['@type'] === 'BreadcrumbList' && schema[2].itemListElement.map(x => x.name).join(' → ') === `Home → Guides → ${first.blog_h1}`, JSON.stringify(schema[0]), '');
  const hiddenBusiness = ready.find(r => !r.blog_business_show) || { ...first, blog_business_show: false, blog_business: 'HIDDEN', blog_business_h2: 'HIDDEN' };
  chk('A hidden business block goes as off and empty, never the word HIDDEN', (() => { const p = buildBlogPayload(hiddenBusiness, { now: NOW }); return p.acf.blog_business_show === false && p.acf.blog_business === '' && p.acf.blog_business_h2 === '' && !/HIDDEN/.test(JSON.stringify(p.acf)); })(), '', 'off, empty');
  chk('Yoast on request; an unknown SEO plugin is an error', buildBlogPayload(first, { seo: 'yoast', now: NOW }).meta._yoast_wpseo_title === first.seo_title && (() => { try { buildBlogPayload(first, { seo: 'aioseo' }); return false; } catch (e) { return /Unknown SEO plugin/.test(e.message); } })(), '', 'yoast; throws');

  // ── Safety ──
  const flagged = ready.find(r => r.VALIDATION.flag > 0) || null;
  chk('The rails: a post with FLAGs is refused until they are read; a BLOCK is refused; a post the site lacks is no refusal (the push makes it), a page the site lacks is; a published post is refused unless the site is staging', (!flagged || (checkRecord(flagged).some(x => /FLAG/.test(x)) && !checkRecord(flagged, { reviewed: true }).length)) && checkRecord({ ...first, VALIDATION: { ...first.VALIDATION, block: 1 } }, { reviewed: true }).some(x => /1 BLOCK/.test(x)) && checkTarget(null, { url: 'x' }, 'blog post', { kind: 'post' }).length === 0 && checkTarget(null, { url: 'x' }, 'homepage').length === 1 && checkTarget({ status: 'publish' }, { url: 'x', staging: false }, 'blog post', { kind: 'post' }).length === 1 && checkTarget({ status: 'publish' }, { url: 'x', staging: true }, 'blog post', { kind: 'post' }).length === 0 && checkTarget({ status: 'future' }, { url: 'x', staging: false }, 'blog post', { kind: 'post' }).length === 0, '', 'as listed');
  chk('The blog page type\'s WordPress mapping: kind post, the blog fields and groups, the post found by its slug', getPageType('blog').wp.kind === 'post' && getPageType('blog').wp.fields === BLOG_FIELDS && getPageType('blog').wp.groups.length === 7 && typeof getPageType('blog').wp.findPage === 'function', '', '');

  // ── Against the fake WordPress: no posts, no Guides category ──
  const fake = createFakeWp();
  const { server, url } = await listen(fake.app);
  const site = { url, user: 'copybot', appPassword: 'test-app-password-not-real' };
  const store = createMemoryStore();
  try {
    const d0 = await dryRun({ record: first, site, reviewed: true, now: NOW });
    chk('Dry run on a site with no posts: the post would be created (future, its date), every field added, no refusal, nothing written, no Client Values on a post', d0.kind === 'post' && d0.page === null && d0.post && d0.post.create === true && d0.post.status === 'future' && d0.pushable && !d0.refusals.length && d0.summary.added > 10 && d0.summary.changed === 0 && d0.changes.every(c => c.change === 'added' || c.change === 'same') && d0.clientValues === null && fake.state.writes === 0 && /would create it/.test(formatDryRun(d0)), JSON.stringify({ page: d0.page, post: d0.post, refusals: d0.refusals, summary: d0.summary }), '');
    const dFlag = flagged ? await dryRun({ record: flagged, site, now: NOW }) : null;
    chk('Dry run on a flagged post without the FLAGs read: refused, not pushable', !flagged || (!dFlag.pushable && dFlag.refusals.some(x => /FLAG/.test(x))), dFlag && dFlag.refusals.join(' | '), 'refused');
    // The push of every post
    const results = [];
    for (const r of ready) results.push(await push({ record: r, recordId: `rec-${r.page_slug}`, site, store, reviewed: true, now: NOW }));
    const posts = [...fake.state.posts.values()];
    const guides = [...fake.state.categories.values()].find(c => c.slug === 'guides');
    chk(`Push: every post pushed and read back without differences (${results.length}); the Guides category made once; one post per record at /guides/<slug>/, in Guides`, results.every(x => x.ok && x.result === 'pushed' && x.created) && guides && [...fake.state.categories.values()].length === 1 && posts.length === ready.length && posts.every(p => p.categories.join() === String(guides.id)) && new Set(posts.map(p => p.slug)).size === posts.length && (await require(path.join(root, 'wp/client.js')).wpGet(site, `/wp/v2/posts/${results[0].pageId}?context=edit`)).link === `${url}/guides/${posts[0].slug}/`, JSON.stringify(results.map(x => [x.ok, x.result, x.created, x.mismatches])), 'all pushed');
    const launch = posts.filter(p => p.date_gmt === '2026-11-09T09:00:00');
    const bySlug = s => ready.find(r => slugOf(r) === s);
    chk(`Statuses: every dated post future with its date at 09:00 London (09:00 UTC in winter, 08:00 UTC in summer), the launch date ones on the launch date (${launch.length}); the undated ones (beyond the onboarding batch) drafts with no date; none published; the SEO meta on every post`, posts.every(p => bySlug(p.slug).publish_date ? (p.status === 'future' && p.date_gmt === londonToUtc(bySlug(p.slug).publish_date)) : (p.status === 'draft' && !p.date_gmt)) && launch.length >= 1 && posts.some(p => p.status === 'draft') && posts.every(p => p.meta.rank_math_title && p.meta.rank_math_description), JSON.stringify(posts.map(p => [p.slug, p.status, p.date_gmt])), 'dated future, undated draft');
    const stored = fake.state.posts.get(results[0].pageId);
    chk('The post holds the fields: the H1 as the title, the answer as HTML, the sections, the FAQ, the schema; tokens left in the post for the site', stored.title.raw === first.blog_h1 && /^<p>/.test(stored.acf.blog_answer) && stored.acf.blog_sections.length === first.sections.length && stored.acf.blog_faq_items.length === first.faq_items.length && /BlogPosting/.test(stored.acf.blog_schema) && /\[CV: /.test(JSON.stringify(stored.acf)), '', 'held');
    const writesAfterFirst = fake.state.writes;
    const log1 = await store.listLog();
    chk('The log: one "pushed" entry per post with created, the status and the date', log1.filter(l => l.result === 'pushed').length === ready.length && log1.filter(l => l.result === 'pushed').every(l => l.created === true && l.post && (l.post.status === 'future' ? !!l.post.date_gmt : l.post.status === 'draft') && l.pageType === 'blog'), JSON.stringify(log1[0]), '');
    // A second push: the dry run finds the post with nothing to change; the push updates it in place (no second post)
    const d1 = await dryRun({ record: first, site, reviewed: true, now: NOW });
    const again = await push({ record: first, recordId: 'rec-again', site, store, reviewed: true, now: NOW });
    const after = [...fake.state.posts.values()];
    chk('A second push of the same post: the dry run finds it with every field the same (0 added, 0 changed), the push updates it in place (the same post, nothing new), read back without differences', d1.page && d1.page.id === results[0].pageId && d1.post.create === false && d1.summary.added === 0 && d1.summary.changed === 0 && again.ok && !again.created && again.pageId === results[0].pageId && after.length === ready.length && JSON.stringify(fake.state.posts.get(results[0].pageId).acf) === JSON.stringify(stored.acf), JSON.stringify({ summary: d1.summary, create: d1.post && d1.post.create, again: [again.ok, again.created, again.pageId], posts: after.length }), '');
    // A changed record: the dry run shows the change, the push writes it
    const edited = { ...first, blog_answer: 'A new first answer for the test, in plain words.\n\nAnd a second paragraph.' };
    const d2 = await dryRun({ record: edited, site, reviewed: true, now: NOW });
    chk('An edited post: the dry run shows the one changed field against what the site holds', d2.summary.changed === 1 && d2.changes.find(c => c.change === 'changed').field === 'blog_answer', JSON.stringify(d2.changes.filter(c => c.change !== 'same').map(c => c.field)), 'blog_answer');
    // A post whose date has passed is set to draft (never published by a push)
    const old = { ...ready[1], publish_date: '2026-10-20' };
    const dOld = await dryRun({ record: old, site, reviewed: true, now: NOW });
    const rOld = await push({ record: old, recordId: 'rec-old', site, store, reviewed: true, now: NOW });
    chk('A post whose date has passed: the dry run says draft (the daily job publishes), the push sets the existing post to a draft, never publish', dOld.post.status === 'draft' && /passed/.test(dOld.post.why) && rOld.ok && fake.state.posts.get(rOld.pageId).status === 'draft', JSON.stringify([dOld.post, fake.state.posts.get(rOld.pageId).status]), 'draft');
    // Rollback of a created post: back to a draft, never deleted
    const rb = await rollback({ snapshotId: results[0].snapshotId, site, store });
    chk('Rollback of the first push (a created post): the post is set back to a draft, its copy kept, never deleted; logged', rb.ok && fake.state.posts.get(results[0].pageId).status === 'draft' && fake.state.posts.has(results[0].pageId) && (await store.listLog()).some(l => l.action === 'rollback' && l.created === true), JSON.stringify(rb), 'draft');
    // Rollback of an update: the fields and status go back
    const rb2 = await rollback({ snapshotId: again.snapshotId, site, store });
    chk('Rollback of an update: the snapshot (fields, status, date) is written back and read back', rb2.ok && !rb2.mismatches.length && fake.state.posts.get(results[0].pageId).status === 'future', JSON.stringify(rb2), 'restored');
    // A failing site: logged, nothing left half done
    const bad = createFakeWp({ failWrites: true });
    const lb = await listen(bad.app);
    try {
      const rf = await push({ record: ready[2] || first, recordId: 'rec-fail', site: { ...site, url: lb.url }, store, reviewed: true, now: NOW });
      chk('A site whose writes fail: the push reports the error and logs it (the category was made first; no post)', !rf.ok && /500/.test(rf.error) && (await store.listLog()).some(l => l.result === 'failed' && l.recordId === 'rec-fail') && bad.state.posts.size === 0, JSON.stringify(rf), 'failed');
    } finally { await new Promise(res => lb.server.close(res)); }
    chk('Writes counted: the first batch wrote the category once and each post once', writesAfterFirst === ready.length + 1, writesAfterFirst, ready.length + 1);
  } finally { await new Promise(res => server.close(res)); }

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
