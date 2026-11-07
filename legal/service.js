'use strict';

// ── Legal pages for one client ──────────────────────────────────────────────
// Reads the client's real details, fills each page, and works out the hold.
//   status(clientId)    the filled pages, the hold and its reasons. Writes nothing.
//   clear(...)          Brandon clears the exceptions text he has read.
//   setWording(...)     Brandon's adjusted wording for one client and one page.
//   resetWording(...)   back to the master wording.
//
// The app has one shared login, so it can't tell who is signed in. Clearing and adjusting
// wording therefore need LEGAL_CLEAR_KEY, a key only Brandon has. With no key set, both
// are refused. Tables: legal_exception_clearances and legal_client_wording, rows only added.

const P = require('./pages');
const { fillTemplate, checkTemplate, templateKeys } = require('./fill');
const { resolveValues, knownKeys } = require('./values');
const { legalHold, pushRefusals, sameText } = require('./hold');
const { secretMatches } = require('../fillout/intake');

const FORM_KEYS = ['business_name', 'business_phone', 'business_email', 'full_name', 'business_address', 'vat_registered', 'deposit', 'payment_methods'];

const fail = (status, message) => Object.assign(new Error(message), { status });
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
  `);
}

// loadValues(clientId): the Client Values object. tradeLowerFor(names): the niche's trade word.
function createLegalService({ pool, filloutService, loadValues, tradeLowerFor, clearKey = () => process.env.LEGAL_CLEAR_KEY }) {
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
    const { values, unclear, defaulted } = resolveValues({ cv, form: await formFields(clientId), answers, tradeLower, lastUpdated: today() });

    const pages = [];
    for (const p of P.PAGES) {
      const master = P.masterTemplate(p.key);
      const custom = await wordingOf(clientId, p.key);
      const page = { key: p.key, title: p.title, slug: p.slug, custom: !!custom, template: custom ? P.normalise(custom.template) : master, stale: !!custom && custom.master_hash !== P.hashOf(master) };
      try {
        Object.assign(page, fillTemplate(page.template, values));
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
    };
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

  return { status, clear, setWording, resetWording };
}

module.exports = { createLegalService, ensureLegalTables };
