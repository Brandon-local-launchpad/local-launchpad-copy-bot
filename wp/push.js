'use strict';

// ── WordPress push, and rollback ────────────────────────────────────────────
// push(): the dry run's checks, then the claims review must be on file for this
// record (findings refuse the push until a person accepts them). Only then:
//   1. snapshot what the site holds now (page fields, SEO meta, Client Values)
//   2. write the page fields + SEO meta, then the Client Values
//   3. read everything back and check it matches what was sent
//   4. log the result (refusals are logged too, with nothing written)
// The page status is never changed: a draft stays a draft.
// rollback(): writes a snapshot back, checks it, and logs it.

const { dryRun, diffFields } = require('./dry-run');
const { findHomepage, wpGet, wpPost } = require('./client');
const { HOMEPAGE_FIELDS, SEO_ADAPTERS } = require('./homepage-map');

const EMPTY = { text: '', html: '', bool: false, repeater: [] };

function claimsRefusals(record, claims, acceptClaims) {
  if (!claims) return ['Run the claims review on this record before pushing.'];
  if (claims.for !== (record.meta && record.meta.generated_at)) return ['The claims review on file is for a different version of the page. Run it again.'];
  if (claims.findings.length && !acceptClaims) {
    return [`The claims review found ${claims.findings.length} statement(s) the facts on file don't support. Fix them, or read them and accept before pushing.`];
  }
  return [];
}

// Read back and compare with what was sent
async function verify(site, pageId, payload, clientValues) {
  const page = await wpGet(site, `/wp/v2/pages/${pageId}?context=edit`);
  const mismatches = diffFields(page.acf || {}, payload.acf).filter(c => c.change !== 'same').map(c => c.field);
  for (const [k, v] of Object.entries(payload.meta)) if (String((page.meta || {})[k] || '') !== String(v || '')) mismatches.push(`meta.${k}`);
  if (clientValues) {
    const cv = await wpGet(site, '/llp-copybot/v1/client-values');
    for (const [k, v] of Object.entries(clientValues)) if (String(cv[k] || '') !== String(v || '')) mismatches.push(`client_values.${k}`);
  }
  return mismatches;
}

async function push({ record, recordId = null, site, store, reviewed = false, seo = 'rankmath', clientValues = null, claims = null, acceptClaims = false }) {
  const dry = await dryRun({ record, site, reviewed, seo, clientValues });
  const refusals = [...dry.refusals, ...claimsRefusals(record, claims, acceptClaims)];
  const base = { action: 'push', site: site.url, page: dry.page && dry.page.id, recordId, generatedAt: record.meta && record.meta.generated_at };
  if (refusals.length) {
    await store.appendLog({ ...base, result: 'refused', refusals });
    return { ok: false, refusals, dry };
  }

  // 1. Snapshot
  const page = await findHomepage(site);
  const metaKeys = Object.keys(dry.payload.meta);
  const before = {
    site: site.url, pageId: page.id, seo,
    acf: Object.fromEntries(HOMEPAGE_FIELDS.map(([name, kind]) => [name, page.acf && name in page.acf ? page.acf[name] : EMPTY[kind]])),
    meta: Object.fromEntries(metaKeys.map(k => [k, (page.meta || {})[k] || ''])),
    clientValues: await wpGet(site, '/llp-copybot/v1/client-values'),
  };
  const snapshotId = await store.saveSnapshot(before);

  // 2. Write
  try {
    await wpPost(site, `/wp/v2/pages/${page.id}`, { acf: dry.payload.acf, meta: dry.payload.meta });
    await wpPost(site, '/llp-copybot/v1/client-values', dry.clientValues);
  } catch (e) {
    await store.appendLog({ ...base, result: 'failed', error: e.message, snapshotId });
    return { ok: false, error: e.message, snapshotId, refusals: [] };
  }

  // 3. Verify, 4. log
  const mismatches = await verify(site, page.id, dry.payload, dry.clientValues);
  const result = mismatches.length ? 'written, read-back differs' : 'pushed';
  await store.appendLog({ ...base, result, snapshotId, summary: dry.summary, mismatches, claims: claims.findings.length, acceptedClaims: !!acceptClaims });
  return { ok: !mismatches.length, result, snapshotId, mismatches, dry };
}

async function rollback({ snapshotId, site, store }) {
  const snap = await store.getSnapshot(snapshotId);
  if (!snap) return { ok: false, error: `No snapshot ${snapshotId}.` };
  if (snap.site !== site.url) return { ok: false, error: `Snapshot ${snapshotId} is for ${snap.site}, not ${site.url}.` };
  await wpPost(site, `/wp/v2/pages/${snap.pageId}`, { acf: snap.acf, meta: snap.meta });
  // Values the site didn't have before are cleared
  const now = await wpGet(site, '/llp-copybot/v1/client-values');
  const restore = { ...Object.fromEntries(Object.keys(now).map(k => [k, ''])), ...snap.clientValues };
  await wpPost(site, '/llp-copybot/v1/client-values', restore);
  const mismatches = await verify(site, snap.pageId, { acf: snap.acf, meta: snap.meta }, restore);
  await store.appendLog({ action: 'rollback', site: site.url, page: snap.pageId, snapshotId, result: mismatches.length ? 'restored, read-back differs' : 'restored', mismatches });
  return { ok: !mismatches.length, mismatches };
}

module.exports = { push, rollback, claimsRefusals, SEO_ADAPTERS };
