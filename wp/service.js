'use strict';

// ── WordPress push service (slice 4) ────────────────────────────────────────
// What the Copybot screens call. The routes in server.js are thin wrappers.
//   connection / saveConnection: the client's site (password stored encrypted,
//     never returned)
//   test: is the site ready (plugin, ACF Pro, SEO plugin, field groups)?
//   reviewClaims: run the claims review on a record that has none yet
//   acceptClaims: save which findings a person has ticked on a version
//   dryRun, push, rollback, log
// A push needs: confirm: true (the button), reviewed: true when FLAGs remain, and
// every remaining claims finding listed in acceptedClaims (by its quote).

const { encrypt, decrypt } = require('./secrets');
const { createDbStore, getConnectionRow, saveConnectionRow } = require('./db-store');
const { dryRun } = require('./dry-run');
const { push, rollback } = require('./push');
const { wpGet } = require('./client');
const { SEO_ADAPTERS } = require('./homepage-map');
const { runClaimsReview, factsFromRecord } = require('./claims-review');
const { withAccepted } = require('../v20-edit');

const isLocal = host => ['localhost', '127.0.0.1', '[::1]'].includes(host);

function createWpService({ pool, loadRecord, saveRecordClaims, secretKey = process.env.COPYBOT_SECRET_KEY }) {
  async function site(clientId) {
    const row = await getConnectionRow(pool, clientId);
    if (!row) throw new Error('This client has no WordPress site connected yet.');
    if (!row.app_password_enc) throw new Error('No Application Password is stored for this site. Enter it on the WordPress card.');
    return { url: row.url, user: row.wp_user, appPassword: decrypt(row.app_password_enc, secretKey), staging: !!row.staging, seo: row.seo, homepageSlug: row.homepage_slug || undefined };
  }

  return {
    async connection(clientId) {
      const row = await getConnectionRow(pool, clientId);
      if (!row) return null;
      return { url: row.url, user: row.wp_user, staging: !!row.staging, seo: row.seo, homepageSlug: row.homepage_slug || '', hasPassword: !!row.app_password_enc, updatedAt: row.updated_at };
    },

    async saveConnection(clientId, input = {}) {
      let url;
      try { url = new URL(String(input.url || '').trim()); } catch { throw new Error('Enter the site address, e.g. https://edensedge.co.uk'); }
      if (url.protocol !== 'https:' && !isLocal(url.hostname)) throw new Error('The site address must start with https://');
      const user = String(input.user || '').trim();
      if (!user) throw new Error('Enter the WordPress username Copybot signs in as.');
      const seo = input.seo || 'rankmath';
      if (!SEO_ADAPTERS[seo]) throw new Error(`SEO plugin must be one of: ${Object.keys(SEO_ADAPTERS).join(', ')}.`);
      const pw = String(input.appPassword || '').trim();
      const existing = await getConnectionRow(pool, clientId);
      if (!pw && !(existing && existing.app_password_enc)) throw new Error('Enter the Application Password (WordPress → Users → Profile → Application Passwords).');
      await saveConnectionRow(pool, clientId, {
        url: url.origin, user, staging: !!input.staging, seo, homepageSlug: String(input.homepageSlug || '').trim(),
        appPasswordEnc: pw ? encrypt(pw, secretKey) : null,
      });
      return this.connection(clientId);
    },

    async test(clientId) {
      const s = await site(clientId);
      const status = await wpGet(s, '/llp-copybot/v1/status').catch(e => ({ error: e.message }));
      return { site: s.url, staging: s.staging, status };
    },

    async reviewClaims(clientId, { recordId } = {}, callModel) {
      const { record, id } = await loadRecord(clientId, recordId);
      const claims = await runClaimsReview(record, factsFromRecord(record), callModel);
      const CLAIMS = { for: claims.for, at: claims.at, status: claims.findings.length ? 'needs acceptance' : 'clear', first_review: claims.findings.length, findings: claims.findings, rounds: [] };
      await saveRecordClaims(clientId, id, CLAIMS);
      return CLAIMS;
    },

    // Save which findings a person has accepted on a version (the screen calls this on
    // each tick), so a hand edit can carry them over to the next version
    async acceptClaims(clientId, { recordId, quotes = [] } = {}) {
      const { record, id } = await loadRecord(clientId, recordId);
      const { CLAIMS } = withAccepted(record, quotes);
      await saveRecordClaims(clientId, id, CLAIMS);
      return CLAIMS;
    },

    async dryRun(clientId, { recordId, reviewed = false } = {}) {
      const s = await site(clientId);
      const { record, values } = await loadRecord(clientId, recordId);
      const r = await dryRun({ record, site: s, reviewed, seo: s.seo, clientValues: values });
      return { ...r, payload: undefined, claims: record.CLAIMS || null };
    },

    async push(clientId, { recordId, reviewed = false, acceptedClaims = [], confirm = false } = {}) {
      if (confirm !== true) throw new Error('A push needs confirming.');
      const s = await site(clientId);
      const { record, id, values } = await loadRecord(clientId, recordId);
      const left = (record.CLAIMS && record.CLAIMS.findings) || [];
      const accepted = new Set((acceptedClaims || []).map(String));
      const acceptClaims = left.length > 0 && left.every(f => accepted.has(f.quote));
      if (acceptClaims) await saveRecordClaims(clientId, id, withAccepted(record, left.map(f => f.quote)).CLAIMS);
      const store = createDbStore(pool, clientId);
      const r = await push({ record, recordId: id, site: s, store, reviewed, seo: s.seo, clientValues: values, acceptClaims });
      return { ...r, dry: r.dry ? { ...r.dry, payload: undefined } : undefined };
    },

    async rollback(clientId, { snapshotId, confirm = false } = {}) {
      if (confirm !== true) throw new Error('A rollback needs confirming.');
      return rollback({ snapshotId, site: await site(clientId), store: createDbStore(pool, clientId) });
    },

    async log(clientId) {
      return createDbStore(pool, clientId).listLog();
    },
  };
}

module.exports = { createWpService };
