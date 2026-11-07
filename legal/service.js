'use strict';

// ── Legal pages for one client ──────────────────────────────────────────────
// Reads the client's real details, fills each page, and works out the hold.
//   status(clientId)    the filled pages, the hold and its reasons. Writes nothing.
//   clear(...)          Brandon clears the exceptions text he has read.
//   setWording(...)     Brandon's adjusted wording for one client and one page.
//   resetWording(...)   back to the master wording.
//   dryRun(clientId)    what a push would change on the site. Writes nothing.
//   push(...)           all three pages or none, through wp/push.js. A held client never reaches the site.
//   rollback(...)       puts the pages back from the push's snapshots.
//
// The Last updated date changes only when a page's filled text changes: the date of the
// last push of that same text is kept (legal_page_versions).
//
// The app has one shared login, so it can't tell who is signed in. Clearing and adjusting
// wording therefore need LEGAL_CLEAR_KEY, a key only Brandon has. With no key set, both
// are refused. Tables: legal_exception_clearances and legal_client_wording, rows only added.

const P = require('./pages');
const { fillTemplate, checkTemplate, templateKeys } = require('./fill');
const { resolveValues, knownKeys } = require('./values');
const { legalHold, pushRefusals, sameText } = require('./hold');
const { secretMatches } = require('../fillout/intake');
const { legalToHtml } = require('./html');
const { dryRun: wpDryRun } = require('../wp/dry-run');
const { push: wpPush, rollback: wpRollback } = require('../wp/push');

const FORM_KEYS = ['business_name', 'business_phone', 'business_email', 'full_name', 'business_address', 'vat_registered', 'deposit', 'payment_methods', 'primary_town'];

const fail = (status, message) => Object.assign(new Error(message), { status });
const DATE_MARK = 'LEGALDATEMARK';
const today = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });

async function ensureLegalTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS legal_exception_clearances (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      exceptions  TEXT NOT NULL,
      note        TEXT,
      cleared_at  TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS legal_client_wording (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      page         TEXT NOT NULL,
      template     TEXT,
      master_hash  TEXT,
      saved_at     TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS legal_page_versions (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      page          TEXT NOT NULL,
      text_hash     TEXT NOT NULL,
      last_updated  TEXT NOT NULL,
      pushed_at     TIMESTAMPTZ NOT NULL
    );
  `);
}

// loadValues(clientId): the Client Values object. tradeLowerFor(names): the niche's trade word.
// getSite(clientId): the WordPress connection or null. createStore(clientId): snapshots and the log.
function createLegalService({ pool, filloutService, loadValues, tradeLowerFor, getSite = async () => null, createStore = null, clearKey = () => process.env.LEGAL_CLEAR_KEY }) {
  let ready = null;
  const tables = () => (ready = ready || ensureLegalTables(pool));

  const requireKey = key => {
    if (!clearKey()) throw fail(403, 'LEGAL_CLEAR_KEY is not set, so nobody can do this yet.');
    if (!secretMatches(String(key || ''), clearKey())) throw fail(403, 'That key is not right.');
  };

  const newest = rows => [...rows].sort((a, b) => new Date(b.at) - new Date(a.at))[0] || null;

  async function clearedText(clientId) {
    const { rows } = await pool.query(`SELECT exceptions, cleared_at FROM legal_exception_clearances WHERE client_id = $1`, [clientId]);
    const row = newest(rows.map(r => ({ ...r, at: r.cleared_at })));
    return row ? row.exceptions : null;
  }

  async function wordingOf(clientId, page) {
    const { rows } = await pool.query(`SELECT template, master_hash, saved_at FROM legal_client_wording WHERE client_id = $1 AND page = $2`, [clientId, page]);
    const row = newest(rows.map(r => ({ ...r, at: r.saved_at })));
    return row && row.template ? row : null;
  }

  // The date of the last push of exactly this text, else today
  async function dateFor(clientId, page, textHash) {
    const { rows } = await pool.query(`SELECT text_hash, last_updated, pushed_at FROM legal_page_versions WHERE client_id = $1 AND page = $2`, [clientId, page]);
    const row = newest(rows.map(r => ({ ...r, at: r.pushed_at })));
    return row && row.text_hash === textHash ? row.last_updated : today();
  }

  async function formFields(clientId) {
    const { rows } = await pool.query(`SELECT field_key, value FROM client_fields WHERE client_id = $1 AND status = 'filled' AND field_key = ANY($2)`, [clientId, FORM_KEYS]);
    return Object.fromEntries(rows.map(r => [r.field_key, r.value]));
  }

  async function status(clientId) {
    await tables();
    const { rows: found } = await pool.query(`SELECT trade FROM clients WHERE id = $1`, [clientId]);
    if (!found.length) throw fail(404, 'Client not found.');
    const cv = (await loadValues(clientId)) || {};
    const answers = await filloutService.legalAnswers(clientId);
    const tradeLower = tradeLowerFor([cv.primary_category, found[0].trade]) || '';
    const { values, unclear, defaulted } = resolveValues({ cv, form: await formFields(clientId), answers, tradeLower, lastUpdated: DATE_MARK });

    const pages = [];
    for (const p of P.PAGES) {
      const master = P.masterTemplate(p.key);
      const custom = await wordingOf(clientId, p.key);
      const page = { key: p.key, title: p.title, slug: p.slug, custom: !!custom, template: custom ? P.normalise(custom.template) : master, stale: !!custom && custom.master_hash !== P.hashOf(master) };
      try {
        const filled = fillTemplate(page.template, values);
        page.textHash = P.hashOf(filled.text);
        page.lastUpdated = await dateFor(clientId, p.key, page.textHash);
        const dated = filled.text.split(DATE_MARK).join(page.lastUpdated);
        Object.assign(page, filled, { text: dated, html: legalToHtml(dated) });
      } catch (e) {
        Object.assign(page, { text: '', missing: [], residue: [], fault: e.message });
      }
      pages.push(page);
    }

    const cleared = await clearedText(clientId);
    const hold = legalHold({ answers, unclear, pages, clearedText: cleared });
    return {
      ...hold,
      refusals: pushRefusals(hold),
      pages,
      answers,
      defaulted,
      exceptions: { text: answers.standard_terms_exceptions, cleared: !!answers.standard_terms_exceptions && sameText(answers.standard_terms_exceptions, cleared) },
      keySet: !!clearKey(),
      liveDomain: cv.live_domain || '',
    };
  }

  const recordFor = (s, page) => ({
    meta: { page_type: 'legal' },
    legal_page: page.key, legal_slug: page.slug, legal_title: page.title,
    legal_text: page.text, legal_html: page.html || '',
    legal_refusals: s.refusals, legal_live_domain: s.liveDomain,
  });

  async function connected(clientId) {
    const site = await getSite(clientId);
    if (!site) throw fail(400, 'This client has no WordPress site connected, or no Application Password stored.');
    return site;
  }

  const plain = d => ({ page: d.page, pushable: d.pushable, refusals: d.refusals, summary: d.summary, changes: d.changes });

  async function dryRun(clientId) {
    const s = await status(clientId);
    const site = await connected(clientId);
    const pages = [];
    for (const p of s.pages) {
      const d = await wpDryRun({ record: recordFor(s, p), site, seo: site.seo });
      pages.push({ key: p.key, title: p.title, slug: p.slug, ...plain(d) });
    }
    return { held: s.held, code: s.code, reasons: s.reasons, site: site.url, pushable: pages.every(p => p.pushable), pages };
  }

  // All three or none: every page is checked before anything is written, and a failure
  // part way puts back what this run already wrote.
  async function push(clientId, { confirm = false } = {}) {
    if (confirm !== true) throw fail(400, 'A push needs confirming.');
    const s = await status(clientId);
    const store = createStore(clientId);
    if (s.held) {
      await store.appendLog({ action: 'push', pageType: 'legal', result: 'refused', refusals: s.refusals });
      return { ok: false, held: true, code: s.code, refusals: s.refusals, written: [] };
    }
    const site = await connected(clientId);
    const checks = [];
    for (const p of s.pages) checks.push({ p, d: await wpDryRun({ record: recordFor(s, p), site, seo: site.seo }) });
    const refusals = checks.flatMap(c => c.d.refusals.map(r => `${c.p.title}: ${r}`));
    if (refusals.length) {
      await store.appendLog({ action: 'push', pageType: 'legal', site: site.url, result: 'refused', refusals });
      return { ok: false, held: false, refusals, written: [] };
    }
    const written = [];
    for (const { p } of checks) {
      const r = await wpPush({ record: recordFor(s, p), site, store, seo: site.seo });
      if (r.snapshotId) written.push({ key: p.key, slug: p.slug, snapshotId: r.snapshotId, result: r.result || 'failed' });
      if (!r.ok) {
        const restored = [];
        for (const w of written) restored.push({ key: w.key, ...(await wpRollback({ snapshotId: w.snapshotId, site, store })) });
        return { ok: false, held: false, error: r.error || `${p.title}: the read back differs (${(r.mismatches || []).join(', ')}).`, refusals: r.refusals || [], written: [], restored };
      }
    }
    const at = new Date().toISOString();
    for (const { p } of checks) {
      await pool.query(`INSERT INTO legal_page_versions (client_id, page, text_hash, last_updated, pushed_at) VALUES ($1, $2, $3, $4, $5)`, [clientId, p.key, p.textHash, p.lastUpdated, at]);
    }
    return { ok: true, held: false, refusals: [], written };
  }

  async function rollback(clientId, { snapshotIds = [], confirm = false } = {}) {
    if (confirm !== true) throw fail(400, 'A rollback needs confirming.');
    if (!Array.isArray(snapshotIds) || !snapshotIds.length) throw fail(400, 'No snapshots to go back to.');
    const site = await connected(clientId);
    const store = createStore(clientId);
    const results = [];
    for (const snapshotId of snapshotIds) results.push({ snapshotId, ...(await wpRollback({ snapshotId, site, store })) });
    return { ok: results.every(r => r.ok), results };
  }

  // exceptions: the text Brandon read. It must be what the client's record says now,
  // so a text that changed while he was reading can't be cleared by mistake.
  async function clear(clientId, { key, exceptions, note = '' } = {}) {
    await tables();
    requireKey(key);
    const current = (await filloutService.legalAnswers(clientId)).standard_terms_exceptions;
    if (!current) throw fail(400, 'There is no exceptions text to clear.');
    if (!sameText(current, exceptions)) throw fail(409, 'The exceptions text has changed since this page loaded. Read it again.');
    await pool.query(`INSERT INTO legal_exception_clearances (client_id, exceptions, note, cleared_at) VALUES ($1, $2, $3, $4)`,
      [clientId, current, String(note || '').trim() || null, new Date().toISOString()]);
    return status(clientId);
  }

  async function setWording(clientId, page, { key, template } = {}) {
    await tables();
    requireKey(key);
    if (!P.pageFor(page)) throw fail(404, `No legal page "${page}".`);
    const text = P.normalise(String(template || ''));
    if (!text.trim()) throw fail(400, 'The wording is empty.');
    const faults = checkTemplate(text);
    if (faults.length) throw fail(400, `The wording has a fault: ${faults.join('; ')}.`);
    const allowed = new Set(knownKeys());
    const unknown = templateKeys(text).filter(k => !allowed.has(k));
    if (unknown.length) throw fail(400, `The wording names keys that don't exist: ${unknown.join(', ')}.`);
    await pool.query(`INSERT INTO legal_client_wording (client_id, page, template, master_hash, saved_at) VALUES ($1, $2, $3, $4, $5)`,
      [clientId, page, text, P.hashOf(P.masterTemplate(page)), new Date().toISOString()]);
    return status(clientId);
  }

  async function resetWording(clientId, page, { key } = {}) {
    await tables();
    requireKey(key);
    if (!P.pageFor(page)) throw fail(404, `No legal page "${page}".`);
    await pool.query(`INSERT INTO legal_client_wording (client_id, page, template, master_hash, saved_at) VALUES ($1, $2, NULL, NULL, $3)`,
      [clientId, page, new Date().toISOString()]);
    return status(clientId);
  }

  return { status, clear, setWording, resetWording, dryRun, push, rollback };
}

module.exports = { createLegalService, ensureLegalTables };
