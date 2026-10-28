'use strict';

// ── WordPress push, and rollback ────────────────────────────────────────────
// push(): the dry run's checks, then the claims review must be on file for this
// record (findings refuse the push until a person accepts them). Only then:
//   1. snapshot what the site holds now (page fields, SEO meta, Client Values)
//   2. write the page fields + SEO meta, then the Client Values
//   3. read everything back and check it matches what was sent
//   4. log the result (refusals are logged too, with nothing written)
// The page status is never changed: a draft stays a draft. A blog post (stage 7) is a
// WordPress post: made in the Guides category when the site has none, else updated; its
// status and date come from the record's publish date (future, or draft; never publish).
// rollback(): writes a snapshot back, checks it, and logs it. A post the push created
// goes back to a draft (never deleted).

const { dryRun, diffFields } = require('./dry-run');
const { wpGet, wpPost } = require('./client');
const { ensureGuidesCategory } = require('./posts');
const { SEO_ADAPTERS } = require('./homepage-map');
const { pageTypeOf, getPageType } = require('../page-types');
const { versionOf } = require('../v20-record');

const EMPTY = { text: '', html: '', bool: false, repeater: [] };

// claims: a review result, or the record's own CLAIMS (from generation) when none is given
function claimsRefusals(record, claims, acceptClaims) {
  if (!claims) return ['Run the claims review on this record before pushing.'];
  if (claims.status === 'failed') return [`The claims review failed (${claims.error || 'no result'}). Run it again before pushing.`];
  if (claims.for !== versionOf(record)) return ['The claims review on file is for a different version of the page. Run it again.'];
  if (claims.findings.length && !acceptClaims) {
    return [`The claims review found ${claims.findings.length} statement(s) the facts on file don't support. Fix them, or read them and accept before pushing.`];
  }
  return [];
}

const restOf = kind => (kind === 'post' ? 'posts' : 'pages');
const titleOf = p => (p && p.title && (p.title.raw !== undefined ? p.title.raw : p.title.rendered)) || '';

// Read back and compare with what was sent
async function verify(site, pageId, payload, clientValues, fields, kind = 'page') {
  const page = await wpGet(site, `/wp/v2/${restOf(kind)}/${pageId}?context=edit`);
  const mismatches = diffFields(page.acf || {}, payload.acf, fields).filter(c => c.change !== 'same').map(c => c.field);
  for (const [k, v] of Object.entries(payload.meta)) if (String((page.meta || {})[k] || '') !== String(v || '')) mismatches.push(`meta.${k}`);
  if (kind === 'post' && payload.post) {
    if (titleOf(page) !== payload.post.title) mismatches.push('post.title');
    if (String(page.slug || '') !== payload.post.slug) mismatches.push('post.slug');
    if (String(page.status || '') !== payload.post.status) mismatches.push('post.status');
    if (payload.post.date_gmt && String(page.date_gmt || '').slice(0, 19) !== payload.post.date_gmt) mismatches.push('post.date_gmt');
  }
  if (clientValues) {
    const cv = await wpGet(site, '/llp-copybot/v1/client-values');
    for (const [k, v] of Object.entries(clientValues)) if (String(cv[k] || '') !== String(v || '')) mismatches.push(`client_values.${k}`);
  }
  return mismatches;
}

async function push({ record, recordId = null, site, store, reviewed = false, seo = 'rankmath', clientValues = null, claims = null, acceptClaims = false, now = new Date() }) {
  const type = pageTypeOf(record);
  const kind = type.wp.kind || 'page';
  const rest = restOf(kind);
  claims = claims || record.CLAIMS || null;
  const dry = await dryRun({ record, site, reviewed, seo, clientValues, now });
  const refusals = [...dry.refusals, ...claimsRefusals(record, claims, acceptClaims)];
  const base = { action: 'push', pageType: type.id, site: site.url, page: dry.page && dry.page.id, recordId, generatedAt: record.meta && record.meta.generated_at };
  if (refusals.length) {
    await store.appendLog({ ...base, result: 'refused', refusals });
    return { ok: false, refusals, dry };
  }

  // 1. Snapshot (a post the site lacks: "created", so a rollback makes it a draft)
  const page = await type.wp.findPage(site, record);
  const metaKeys = Object.keys(dry.payload.meta);
  const before = {
    site: site.url, pageId: page ? page.id : null, pageType: type.id, kind, seo, created: !page,
    acf: page ? Object.fromEntries(type.wp.fields.map(([name, k]) => [name, page.acf && name in page.acf ? page.acf[name] : EMPTY[k]])) : {},
    meta: page ? Object.fromEntries(metaKeys.map(k => [k, (page.meta || {})[k] || ''])) : {},
    post: kind === 'post' && page ? { title: titleOf(page), slug: page.slug || '', status: page.status || 'draft', date_gmt: page.date_gmt || null } : null,
    clientValues: kind === 'post' ? null : await wpGet(site, '/llp-copybot/v1/client-values'),
  };
  let snapshotId = null;
  let pageId = page ? page.id : null;
  // 2. Write
  try {
    const body = { acf: dry.payload.acf, meta: dry.payload.meta };
    if (kind === 'post') {
      const P = dry.payload.post;
      const cat = await ensureGuidesCategory(site);
      Object.assign(body, { title: P.title, slug: P.slug, status: P.status, categories: [cat.id] });
      if (P.date_gmt) body.date_gmt = P.date_gmt;
      if (cat.created) base.categoryCreated = true;
    }
    if (page) {
      snapshotId = await store.saveSnapshot(before);
      await wpPost(site, `/wp/v2/${rest}/${page.id}`, body);
    } else {
      const made = await wpPost(site, `/wp/v2/${rest}`, body);
      pageId = made.id;
      snapshotId = await store.saveSnapshot({ ...before, pageId });
    }
    if (kind !== 'post') await wpPost(site, '/llp-copybot/v1/client-values', dry.clientValues);
  } catch (e) {
    await store.appendLog({ ...base, page: pageId, result: 'failed', error: e.message, snapshotId });
    return { ok: false, error: e.message, snapshotId, refusals: [] };
  }

  // 3. Verify, 4. log
  const mismatches = await verify(site, pageId, dry.payload, dry.clientValues, type.wp.fields, kind);
  const result = mismatches.length ? 'written, read-back differs' : 'pushed';
  await store.appendLog({ ...base, page: pageId, result, snapshotId, created: !page, post: kind === 'post' ? { status: dry.payload.post.status, date_gmt: dry.payload.post.date_gmt, slug: dry.payload.post.slug } : undefined, summary: dry.summary, mismatches, claims: claims.findings.length, acceptedClaims: !!acceptClaims });
  return { ok: !mismatches.length, result, snapshotId, mismatches, pageId, created: !page, dry };
}

async function rollback({ snapshotId, site, store }) {
  const snap = await store.getSnapshot(snapshotId);
  if (!snap) return { ok: false, error: `No snapshot ${snapshotId}.` };
  if (snap.site !== site.url) return { ok: false, error: `Snapshot ${snapshotId} is for ${snap.site}, not ${site.url}.` };
  const kind = snap.kind || 'page';
  const rest = restOf(kind);
  // A post the push created: back to a draft, its copy left for a person to delete (never deleted here)
  if (snap.created) {
    await wpPost(site, `/wp/v2/${rest}/${snap.pageId}`, { status: 'draft' });
    const now = await wpGet(site, `/wp/v2/${rest}/${snap.pageId}?context=edit`);
    const ok = now.status === 'draft';
    await store.appendLog({ action: 'rollback', pageType: snap.pageType || 'blog', site: site.url, page: snap.pageId, snapshotId, result: ok ? 'created post set back to draft' : 'restore failed: the post is not a draft', created: true });
    return { ok, mismatches: ok ? [] : ['post.status'] };
  }
  await wpPost(site, `/wp/v2/${rest}/${snap.pageId}`, { acf: snap.acf, meta: snap.meta, ...(kind === 'post' && snap.post ? { title: snap.post.title, slug: snap.post.slug, status: snap.post.status, ...(snap.post.date_gmt ? { date_gmt: snap.post.date_gmt } : {}) } : {}) });
  if (kind === 'post') {
    const mismatches = await verify(site, snap.pageId, { acf: snap.acf, meta: snap.meta, post: snap.post }, null, getPageType(snap.pageType || 'blog').wp.fields, kind);
    await store.appendLog({ action: 'rollback', pageType: snap.pageType, site: site.url, page: snap.pageId, snapshotId, result: mismatches.length ? 'restored, read-back differs' : 'restored', mismatches });
    return { ok: !mismatches.length, mismatches };
  }
  // Values the site didn't have before are cleared
  const now = await wpGet(site, '/llp-copybot/v1/client-values');
  const restore = { ...Object.fromEntries(Object.keys(now).map(k => [k, ''])), ...snap.clientValues };
  await wpPost(site, '/llp-copybot/v1/client-values', restore);
  const mismatches = await verify(site, snap.pageId, { acf: snap.acf, meta: snap.meta }, restore, getPageType(snap.pageType || 'homepage').wp.fields);
  await store.appendLog({ action: 'rollback', pageType: snap.pageType || 'homepage', site: site.url, page: snap.pageId, snapshotId, result: mismatches.length ? 'restored, read-back differs' : 'restored', mismatches });
  return { ok: !mismatches.length, mismatches };
}

module.exports = { push, rollback, claimsRefusals, SEO_ADAPTERS };
