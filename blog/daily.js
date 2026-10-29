'use strict';

// ── The daily job (stage 8; the amendment's "Daily automatic job", 29 Oct 2026) ──────
// Once a day, for every active client, with no person: the five steps on every dated blog post.
//   1. Churn: a churned client's scheduled posts go back to draft on the site (published ones stay).
//   2. Price change: a scheduled post that states a price the client's price rows no longer give
//      is written again (F-PRICE-CHANGED on the new record, unapproved, so it goes back to review);
//      the site keeps the old copy until the new one is approved and pushed.
//   3. Hold: a post due within two days whose primary link page is not Live, or whose latest record
//      is not approved, moves back seven days on the site and the page map (F-HELD); checked daily.
//   4. Publish: a post still scheduled on the site on or after its date is published through REST;
//      the row goes Live with the post's URL.
//   5. Backfill, on a cost guide's publish: the URL is stored on the client (cost_guide_urls, read
//      by the GBP batch) and the pages that link to it (the service page, the category page, the
//      homepage for the trade guide) are marked backfill pending on the page map; their re-push is
//      a later piece (the plan, section 3 point 7: those page types have no push yet).
// Every action is a row in blog_job_log, shown on the Pages tab's Blog filter. The steps are pure
// on what they are given; the runner (run, runAll) reads the stores and the site.
// now: the clock (BLOG_CLOCK on the cron entry, a body field on the hand run, the fixture's days).

const { wpPost } = require('../wp/client');
const { findPost, getPost } = require('../wp/posts');
const { slugOf, londonToUtc } = require('../wp/blog-map');
const { getBlogSettings } = require('./db');

const DAY = 86400000;
const HOLD_DAYS = 7;
const DUE_WITHIN_DAYS = 2;
const isoDay = d => new Date(d).toISOString().slice(0, 10);
const addDays = (day, n) => isoDay(new Date(`${day}T12:00:00Z`).getTime() + n * DAY);
const liveSlug = s => !s || s === '/' || /^\/#/.test(s);

async function ensureJobTable(pool) {
  try { await pool.query(`SELECT action FROM blog_job_log LIMIT 1`); return; } catch (_) { /* no table yet */ }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blog_job_log (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id   UUID NOT NULL,
      action      TEXT NOT NULL,
      slug        TEXT,
      detail      JSONB,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

// ── The pure steps ──
// The page a post links to first: Live when the page map says so (the homepage and its sections always are)
function primaryStatus(row, pageRows) {
  const slug = (row.info || {}).primary_link || '';
  if (liveSlug(slug)) return 'Live';
  const p = pageRows.find(r => r.type !== 'blog' && (r.slug === slug || r.slug === slug.replace(/\/$/, '') || `${r.slug}/` === slug));
  return p ? (p.status || 'Not Started') : 'missing';
}
const approvedRecord = rec => !!(rec && rec.record && !rec.record.blocked && !rec.record.error && rec.record.meta && rec.record.meta.approved_at && rec.record.VALIDATION && rec.record.VALIDATION.block === 0);

// What to do with one post today. post: the site's post (or null), rec: the latest record (or null)
function decideRow({ row, today, pageRows, post, rec, churned }) {
  const info = row.info || {};
  const date = info.publish_date || null;
  const onSite = !!post;
  const published = row.status === 'Live' || (post && post.status === 'publish');
  if (published) return post && row.status !== 'Live' ? { action: 'mark-live', why: 'the site shows the post published' } : null;
  if (churned) return onSite && post.status === 'future' ? { action: 'churn', why: 'the client is churned: back to a draft' } : null;
  if (!date) return null;
  if (!onSite) return date <= today ? { action: 'skip', why: 'due but not on the site: push it first' } : null;
  if (post.status !== 'future') return date <= today ? { action: 'skip', why: `due but the post is a ${post.status} on the site, not scheduled` } : null;
  if (date <= addDays(today, DUE_WITHIN_DAYS)) {
    const ps = primaryStatus(row, pageRows);
    if (ps !== 'Live') return { action: 'hold', why: `the primary link page ${info.primary_link} is ${ps}, not Live`, to: addDays(date < today ? today : date, HOLD_DAYS) };
    if (!approvedRecord(rec)) return { action: 'hold', why: rec ? 'its latest record is not approved' : 'it has no record', to: addDays(date < today ? today : date, HOLD_DAYS) };
  }
  if (date <= today) return { action: 'publish', why: 'due and still scheduled on the site' };
  return null;
}

// A price change: the prices the post stated (its record's price_ids) against today's price facts
function priceChange(rec, todays) {
  const stated = (rec && rec.record && rec.record.meta && rec.record.meta.price_ids) || [];
  if (!stated.length || !Array.isArray(todays)) return null;
  const gone = stated.filter(t => !todays.includes(t));
  return gone.length ? { gone, now: todays } : null;
}

// ── The runner ──
// siteFor(clientId) → the WordPress site ({ url, user, appPassword, staging }) or null
// priceFacts(clientId, row, rows) → today's PRICE fact texts for the post (the queue's decisions), or null
// clientValues: { get(clientId, key), set(clientId, key, value) } (the client's values asset);
// regenerate(clientId, slug) → the new record's id (the blog runner)
function createBlogDaily({ pool, pageMapStore, v20Store, siteFor = async () => null, priceFacts = null, clientValues = null, regenerate = null, log = console } = {}) {
  let table = null;
  const ready = async () => { if (table === null) { try { await ensureJobTable(pool); table = true; } catch (e) { table = false; log.error(`[blog daily] log table: ${e.message}`); } } return table; };
  async function logAction(clientId, action, slug, detail, at) {
    if (!(await ready())) return;
    await pool.query(`INSERT INTO blog_job_log (client_id, action, slug, detail, created_at) VALUES ($1, $2, $3, $4, $5)`, [clientId, action, slug || null, JSON.stringify(detail || {}), at || new Date()]);
  }
  async function listLog(clientId, limit = 100) {
    if (!(await ready())) return [];
    const { rows } = await pool.query(`SELECT id, action, slug, detail, created_at FROM blog_job_log WHERE client_id = $1 ORDER BY created_at DESC LIMIT ${Math.min(500, Math.max(1, limit | 0))}`, [clientId]);
    return rows.map(r => ({ id: r.id, action: r.action, slug: r.slug, at: r.created_at, ...(typeof r.detail === 'string' ? JSON.parse(r.detail) : r.detail || {}) }));
  }

  // A blog post just pushed: its row says so (Scheduled, or Pushed to WordPress for a draft), with the post's id
  async function afterPush(clientId, { slug, postId, status, dateGmt, link } = {}) {
    const rows = await pageMapStore.blogRows(clientId);
    const row = rows.find(r => r.slug === slug || slugOf({ page_slug: r.slug }) === slug);
    if (!row) return null;
    const next = status === 'publish' ? 'Live' : status === 'future' ? 'Scheduled' : 'Pushed to WordPress';
    return pageMapStore.patchBlogRow(clientId, row.slug, { status: next, info: { wp_post_id: postId || null, wp_date_gmt: dateGmt || null, ...(status === 'publish' && link ? { published_url: link } : {}) } });
  }

  async function run(clientId, { now = new Date(), dryRun = false } = {}) {
    const today = isoDay(now);
    const settings = await getBlogSettings(pool, clientId);
    const churned = settings.status === 'churned';
    const all = await pageMapStore.saved(clientId);
    const rows = all.filter(r => r.type === 'blog' && r.applies !== false && r.status !== 'Held');
    const site = await siteFor(clientId).catch(() => null);
    const actions = [];
    const act = async (slug, action, detail) => { actions.push({ slug, action, ...detail }); if (!dryRun) await logAction(clientId, action, slug, { ...detail, day: today }, now); };
    if (!rows.length) return { clientId, today, churned, site: !!site, actions, note: 'no blog posts in the queue' };
    if (!site) { await act(null, 'skip', { why: 'no WordPress site connected: nothing can be published or held on the site' }); }
    const posts = new Map();
    const postFor = async row => { if (!site) return null; if (!posts.has(row.slug)) posts.set(row.slug, await findPost(site, slugOf({ page_slug: row.slug })).catch(() => null)); return posts.get(row.slug); };
    const dated = rows.filter(r => (r.info || {}).publish_date).sort((a, b) => String(a.info.publish_date).localeCompare(String(b.info.publish_date)));
    for (const row of dated) {
      const info = row.info || {};
      const rec = await v20Store.latest(clientId, { type: 'blog', key: row.slug });
      const post = await postFor(row);
      const published = row.status === 'Live' || (post && post.status === 'publish');
      // 2. A price change on a scheduled post: written again, back to review
      if (!churned && !published && rec && priceFacts && !(rec.record.meta && rec.record.meta.price_changed)) {
        let todays = null;
        try { todays = await priceFacts(clientId, row, rows); } catch (e) { todays = null; }
        const change = priceChange(rec, todays);
        if (change) {
          await act(row.slug, 'price-change', { why: `${change.gone.length} price${change.gone.length === 1 ? '' : 's'} the post states changed`, gone: change.gone });
          if (!dryRun && regenerate) {
            try {
              const newId = await regenerate(clientId, row.slug);
              if (newId) await v20Store.setMeta(clientId, newId, { price_changed: { at: now.toISOString(), gone: change.gone }, flags_extra: ['F-PRICE-CHANGED'] });
              await act(row.slug, 'regenerated', { why: 'written again from today\'s prices; back to review (F-PRICE-CHANGED), the site keeps the old copy until it is approved and pushed', recordId: newId || null });
            } catch (e) { await act(row.slug, 'error', { why: `could not write the post again: ${e.message}` }); }
          }
        }
      }
      const latest = (!dryRun && regenerate) ? await v20Store.latest(clientId, { type: 'blog', key: row.slug }) : rec;
      const d = decideRow({ row, today, pageRows: all, post, rec: latest, churned });
      if (!d) continue;
      if (d.action === 'mark-live') { if (!dryRun) await pageMapStore.patchBlogRow(clientId, row.slug, { status: 'Live', info: { published_url: post.link || info.published_url || '' } }); await act(row.slug, 'mark-live', { why: d.why }); continue; }
      if (d.action === 'skip') { await act(row.slug, 'skip', { why: d.why }); continue; }
      if (d.action === 'churn') {
        if (!dryRun) { await wpPost(site, `/wp/v2/posts/${post.id}`, { status: 'draft' }); await pageMapStore.patchBlogRow(clientId, row.slug, { status: 'Pushed to WordPress', info: { churned_at: now.toISOString() } }); }
        await act(row.slug, 'churn', { why: d.why, postId: post.id });
        continue;
      }
      if (d.action === 'hold') {
        const dateGmt = londonToUtc(d.to);
        if (!dryRun) {
          await wpPost(site, `/wp/v2/posts/${post.id}`, { status: 'future', date_gmt: dateGmt });
          const held = { since: info.held && info.held.since ? info.held.since : today, from: info.held && info.held.from ? info.held.from : info.publish_date, why: d.why, times: ((info.held && info.held.times) || 0) + 1 };
          await pageMapStore.patchBlogRow(clientId, row.slug, { info: { publish_date: d.to, wp_date_gmt: dateGmt, held } });
        }
        await act(row.slug, 'hold', { why: d.why, from: info.publish_date, to: d.to, flag: 'F-HELD' });
        continue;
      }
      if (d.action === 'publish') {
        let link = post.link || info.published_url || '';
        if (!dryRun) {
          const nowGmt = now.toISOString().replace(/\.\d{3}Z$/, '');
          const r = await wpPost(site, `/wp/v2/posts/${post.id}`, { status: 'publish', date_gmt: nowGmt });
          link = (r && r.link) || link;
          await pageMapStore.patchBlogRow(clientId, row.slug, { status: 'Live', info: { published_url: link, published_at: now.toISOString(), held: null } });
        }
        await act(row.slug, 'publish', { why: d.why, postId: post.id, url: link });
        // 5. The backfill for a cost guide
        if (info.post_type === 'cost_guide') {
          const targets = [];
          if (info.homepage_cost_guide) targets.push({ page: '/', what: 'homepage FAQ Q1' });
          if (info.service_slug) targets.push({ page: info.service_slug, what: 'service page prices section' });
          if (info.category_slug) targets.push({ page: info.category_slug, what: 'category page cost section' });
          if (!dryRun) {
            if (clientValues) {
              let urls = {};
              try { const cur = await clientValues.get(clientId, 'cost_guide_urls'); urls = cur && typeof cur === 'object' ? cur : (typeof cur === 'string' && cur.trim().startsWith('{') ? JSON.parse(cur) : {}); } catch (_) { urls = {}; }
              urls[row.slug] = { url: link, published: today, service: info.service || '', homepage: !!info.homepage_cost_guide };
              await clientValues.set(clientId, 'cost_guide_urls', urls);
            }
            for (const t of targets) {
              const pageRow = all.find(r => r.type !== 'blog' && (r.slug === t.page || `${r.slug}/` === t.page));
              if (pageRow) { try { const nextInfo = { ...(pageRow.info || {}), backfill_pending: [...((pageRow.info || {}).backfill_pending || []).filter(b => b.guide !== row.slug), { guide: row.slug, url: link, what: t.what, since: today }] }; await pool.query(`UPDATE client_page_map SET info = $3, updated_at = NOW() WHERE id = $1 AND client_id = $2`, [pageRow.id, clientId, JSON.stringify(nextInfo)]); } catch (e) { log.error(`[blog daily] backfill mark on ${t.page}: ${e.message}`); } }
            }
            await pageMapStore.patchBlogRow(clientId, row.slug, { info: { backfill_pending: targets.map(t => ({ ...t, since: today })) } });
          }
          await act(row.slug, 'backfill', { why: `the cost guide's URL stored on the client (cost_guide_urls) and ${targets.length ? targets.map(t => `${t.what} (${t.page})`).join(', ') : 'no page'} marked backfill pending (their re-push waits for those page types' field maps)`, url: link, targets });
        }
      }
    }
    return { clientId, today, churned, site: !!site, actions };
  }

  // Every active client with blog posts in turn (the cron entry); a churned client still runs, for its churn step
  async function runAll({ now = new Date(), dryRun = false } = {}) {
    const { rows } = await pool.query(`SELECT id, name, status FROM clients ORDER BY name`);
    const out = [];
    for (const c of rows) {
      try { const r = await run(c.id, { now, dryRun }); if (r.actions.length || !r.note) out.push({ clientId: c.id, name: c.name, status: c.status, ...r }); }
      catch (e) { out.push({ clientId: c.id, name: c.name, error: e.message }); log.error(`[blog daily] ${c.name}: ${e.message}`); }
    }
    return { today: isoDay(now), clients: out };
  }

  return { run, runAll, afterPush, listLog, logAction, decideRow, priceChange, primaryStatus };
}

module.exports = { createBlogDaily, ensureJobTable, decideRow, priceChange, primaryStatus, addDays, HOLD_DAYS, DUE_WITHIN_DAYS };
