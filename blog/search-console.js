'use strict';

// ── The Search Console batch (B16, stage 9, 29 Oct 2026) ─────────────────────────────
// In month six after the launch, and every six months after, the next six posts come from the
// client's Search Console data: the queries of the last 90 days (the API with the service
// account, or an export uploaded as CSV), kept as a client asset (search_console_rows); the new
// post candidates and the page improvements (search-console/candidates.js); the batch reserved
// in B16's order through the same reservation as the onboarding batch (blog/topics.js, batch
// 'search_console'), dated one a month across the six months from the batch's start
// (blog/queue.js scheduleBatch) and written to the page map beside the earlier rows. A short
// batch (F-SC-THIN) fills its empty months with refreshes: the posts nearest their review date,
// written again; from month 12 the published posts whose review date falls before the next batch
// are listed to recheck. Then stages 4 to 7 run as for any post.

const Q = require('./queue');
const { findCandidates, ownedFrom } = require('../search-console/candidates');
const { parseSearchConsoleCsv } = require('../search-console/csv');
const { getBlogSettings } = require('./db');

const ASSET = 'search_console_rows';
const BATCH_MONTHS = 6;
const addMonths = (day, n) => { const d = Q.parseDate(day); if (!d) return null; return Q.addMonths(d, n).toISOString().slice(0, 10); };

// deps: pool, pageMapStore, faqService (blogTopics(clientId, null, opts)), v20Store, queryReport (search-console/client.js),
// clientValues get (the towns), runner (regenerate for a refresh: run(clientId, { keys })), log
function createSearchConsoleService({ pool, pageMapStore, faqService, v20Store = null, queryReport = null, env = process.env, log = console } = {}) {
  async function rowsAsset(clientId) {
    const { rows } = await pool.query(`SELECT id, content, metadata, uploaded_at FROM client_assets WHERE client_id = $1 AND asset_type = '${ASSET}' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]);
    if (!rows.length) return null;
    const r = rows[0];
    const meta = (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) || {};
    return { id: r.id, rows: JSON.parse(r.content), meta, at: r.uploaded_at };
  }
  async function saveRows(clientId, rows, meta) {
    await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content, metadata) VALUES ($1, '${ASSET}', $2, $3, $4)`, [clientId, meta.source === 'csv' ? 'search-console.csv' : 'search-console.json', JSON.stringify(rows), JSON.stringify(meta)]);
    return rowsAsset(clientId);
  }

  // A CSV export uploaded (the Queries table of the Performance report)
  async function upload(clientId, text) {
    const parsed = parseSearchConsoleCsv(text);
    if (!parsed.rows.length) throw Object.assign(new Error(parsed.problems[0] || 'No rows could be read from the file.'), { status: 400 });
    const a = await saveRows(clientId, parsed.rows, { source: 'csv', problems: parsed.problems, fetched_at: new Date().toISOString(), days: 90 });
    log.log(`[search console] ${clientId}: ${parsed.rows.length} rows uploaded`);
    return status(clientId, a);
  }
  // The API (the service account on the client's property)
  async function fetchRows(clientId) {
    if (!queryReport) throw Object.assign(new Error('Search Console is not set up: GOOGLE_SERVICE_ACCOUNT_JSON is missing on the server. Upload an export instead.'), { status: 503 });
    const settings = await getBlogSettings(pool, clientId);
    const r = await queryReport(settings.search_console_property, { env });
    const a = await saveRows(clientId, r.rows, { source: 'api', property: r.property, startDate: r.startDate, endDate: r.endDate, fetched_at: new Date().toISOString(), days: r.days });
    log.log(`[search console] ${clientId}: ${r.rows.length} rows from the API (${r.startDate} to ${r.endDate})`);
    return status(clientId, a);
  }

  // The batches: the first is due six months after the launch, then every six months; a batch is
  // "done" once the queue holds rows tagged with its start date
  async function batches(clientId, today = new Date().toISOString().slice(0, 10)) {
    const settings = await getBlogSettings(pool, clientId);
    const launch = settings.launch_date;
    const rows = await pageMapStore.blogRows(clientId);
    const out = [];
    if (!launch) return { launch: null, batches: out, due: null, next: null };
    for (let k = 1; k <= 8; k++) {
      const start = addMonths(launch, BATCH_MONTHS * k);
      const tag = `search_console:${start}`;
      const have = rows.filter(r => r.applies !== false && (r.info || {}).batch === tag);
      out.push({ n: k, start, month: BATCH_MONTHS * k, tag, built: have.length > 0, rows: have.length, due: start <= today && !have.length, yearly: (BATCH_MONTHS * k) % 12 === 0 });
      if (start > today && !have.length) break; // the list runs to the first batch not built, so the next one shows once this one is
    }
    const due = out.find(b => b.due) || null;
    const next = out.find(b => !b.built) || null;
    return { launch, batches: out, due, next };
  }

  async function status(clientId, asset = null) {
    const a = asset || await rowsAsset(clientId);
    const b = await batches(clientId);
    const settings = await getBlogSettings(pool, clientId);
    return { rows: a ? a.rows.length : 0, source: a ? a.meta.source : null, fetched_at: a ? a.meta.fetched_at : null, range: a ? { start: a.meta.startDate || null, end: a.meta.endDate || null, days: a.meta.days || 90 } : null, problems: a ? a.meta.problems || [] : [], property: settings.search_console_property || '', api: !!queryReport, ...b };
  }

  // What the site owns today: the page map's pages and posts, with their written records
  async function ownedNow(clientId) {
    const pages = await pageMapStore.saved(clientId);
    const records = new Map();
    if (v20Store) for (const p of pages) { const type = p.type === 'blog' ? 'blog' : p.type === 'location_category' ? 'category' : p.type === 'town_service' ? 'service' : p.type; try { const f = await v20Store.latest(clientId, { type, key: p.type === 'homepage' ? 'homepage' : p.slug }); if (f) records.set(p.slug, f.record); } catch (_) { /* no record */ } }
    return { owned: ownedFrom({ pages: pages.filter(p => p.type !== 'blog'), records, blogRows: pages.filter(p => p.type === 'blog') }), pages };
  }
  async function townsOf(clientId) {
    const T = await faqService.blogTopics(clientId, null);
    const kv = T.ctx.keyValueMap || {};
    return { towns: Object.entries(kv).filter(([k, v]) => /^biz_area_\d+$/.test(k) && v).map(([, v]) => String(v).trim()), T };
  }

  // The candidates from the rows on file
  async function candidates(clientId) {
    const a = await rowsAsset(clientId);
    if (!a) throw Object.assign(new Error('No Search Console rows for this client yet: fetch them or upload an export.'), { status: 400 });
    const { owned } = await ownedNow(clientId);
    const { towns } = await townsOf(clientId);
    const c = findCandidates({ rows: a.rows, owned, towns });
    return { ...c, source: a.meta.source, fetched_at: a.meta.fetched_at, range: { start: a.meta.startDate || null, end: a.meta.endDate || null } };
  }

  // The batch: the next one not built (or the one named), from the candidates and the reservation
  async function build(clientId, { start = null, today = new Date().toISOString().slice(0, 10) } = {}) {
    const b = await batches(clientId, today);
    if (!b.launch) throw Object.assign(new Error('The client has no launch date (the Record tab\'s Blog card): the batch months run from it.'), { status: 400 });
    const target = start ? b.batches.find(x => x.start === start) || { n: 0, start, tag: `search_console:${start}`, month: null, yearly: false } : b.next;
    if (!target) throw Object.assign(new Error('No Search Console batch is due.'), { status: 400 });
    const c = await candidates(clientId);
    const existing = (await pageMapStore.blogRows(clientId)).filter(r => r.applies !== false);
    const { towns, T } = await townsOf(clientId);
    const scQuestions = c.newPosts.map((p, i) => ({ id: `SC-${target.start}-${i + 1}`, query: p.query, wording: p.wording, impressions: p.impressions, position: p.position, approved: false, town: towns.find(t => new RegExp(`\\b${t.toLowerCase()}\\b`).test(p.query.toLowerCase())) || '' }));
    const res = await faqService.blogTopics(clientId, null, { batch: 'search_console', batchStart: target.start, scQuestions, existingRows: existing });
    const blog = res.blog;
    if (!blog) throw Object.assign(new Error('No FAQ questions sorted for this client yet.'), { status: 400 });
    let topics = blog.topics.map(t => ({ ...t, batch: target.tag }));
    // A short batch: the empty months refresh the posts nearest their review date (written again, back to review)
    const refreshes = [];
    if (topics.length < 6) {
      const due = existing.filter(r => r.status === 'Live' && (r.info || {}).review_due).sort((a, b) => String(a.info.review_due).localeCompare(String(b.info.review_due)));
      const limit = addMonths(target.start, BATCH_MONTHS);
      for (const r of due) { if (topics.length + refreshes.length >= 6) break; if (r.info.review_due > limit) break; refreshes.push({ key: `${r.slug}--refresh-${target.start}`, refresh_of: r.slug, post_type: r.info.post_type, source: 'refresh', batch: target.tag, wording: r.info.wording || r.h1, wording_source: r.info.wording_source, needs_approval: false, question: null, service: r.info.service ? { title: r.info.service, slug: r.info.service_slug } : null, category: r.info.category ? { title: r.info.category, slug: r.info.category_slug } : null, town: r.info.town || '', primary: r.info.primary_link, query_stack: r.info.query_stack || [], faq_ids: r.info.faq_ids || [], stack: r.info.stack || [], faq: r.info.faq || [], target_query: r.info.target_query, flags: [{ code: 'F-SC-REFRESH', msg: `A refresh of ${r.slug} (review due ${r.info.review_due}): its facts rechecked and the post written again.` }] }); }
      if (!refreshes.length && topics.length < 6) blog.flags.push({ code: 'F-SC-THIN', msg: `${topics.length} topic(s) and no published post due a refresh: the batch is short.` });
    }
    topics = [...topics, ...refreshes];
    const sch = Q.scheduleBatch(topics, target.start);
    // The rows: the earlier batches' rows as they are, then this batch's
    const keep = existing.map(r => ({ slug: r.slug, title: r.title, h1: r.h1, status: r.status === 'Held' ? 'Held' : undefined, info: r.info || {} }));
    const fresh = Q.rowsFor(sch.topics, { existing, held: blog.held_back || [] }).map(r => ({ ...r, info: { ...r.info, batch: target.tag, impressions: (r.info.question_id && scQuestions.find(q => q.id === r.info.question_id) || {}).impressions || 0 } }));
    await pageMapStore.upsertBlogRows(clientId, [...keep, ...fresh]);
    // The yearly recheck: published posts whose review date falls before the next batch
    const rechecks = target.yearly ? existing.filter(r => r.status === 'Live' && (r.info || {}).review_due && r.info.review_due <= addMonths(target.start, BATCH_MONTHS)).map(r => ({ slug: r.slug, review_due: r.info.review_due })) : [];
    log.log(`[search console] ${clientId}: batch ${target.tag} built: ${fresh.length} rows (${topics.length - refreshes.length} new, ${refreshes.length} refreshes)`);
    return { batch: target, topics: sch.topics.map(t => ({ key: t.key, post_type: t.post_type, source: t.source, wording: t.wording, publish_date: t.publish_date, month: t.month, source_query: t.source_query || '', refresh_of: t.refresh_of || '', flags: t.flags })), held_back: (blog.held_back || []).map(t => ({ key: t.key, flags: t.flags })), flags: [...blog.flags, ...sch.flags], candidates: { newPosts: c.newPosts.length, improvements: c.improvements.length, dropped: c.dropped.length }, rechecks, counts: { rows: fresh.length, new: topics.length - refreshes.length, refreshes: refreshes.length } };
  }

  return { upload, fetchRows, candidates, batches, status, build, rowsAsset };
}

module.exports = { createSearchConsoleService, ASSET, BATCH_MONTHS };
