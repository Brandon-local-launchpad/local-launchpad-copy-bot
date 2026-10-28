'use strict';

// ── The blog question bank per trade: storage, approval, the Perplexity run ────
// One row per trade in blog_banks (the text as `body`, where it came from, when), with the approval
// as a fingerprint of the text at the time, like the trade facts verifications: a new
// paste or run makes the bank unapproved again without touching who approved it last.
// A repo file blog-bank/<trade>.md seeds a trade with no row (the local runner writes
// those files; the live app keeps what is pasted or run on Railway in the database, since
// its disk does not survive a deploy). The topic queue reads an approved bank only.

const B = require('./bank');

async function ensureBankTables(pool) {
  // Idempotent on pg-mem too, which refuses CREATE TABLE IF NOT EXISTS on a table that exists
  try { await pool.query(`SELECT trade FROM blog_banks LIMIT 1`); return; } catch (_) { /* no table yet */ }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blog_banks (
      trade                 TEXT PRIMARY KEY,
      body                  TEXT NOT NULL,
      generated             TEXT,
      model                 TEXT,
      source                TEXT NOT NULL DEFAULT 'paste',
      fingerprint           TEXT NOT NULL,
      approved_by           TEXT,
      approved_at           TIMESTAMPTZ,
      approved_fingerprint  TEXT,
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

const TRADE = /^[a-z0-9-]+$/;
const today = () => new Date().toISOString().slice(0, 10);

// runner: async (trade, prompt, onStatus) → { text, model, cost } (blog/bank-run.js); null when no key
function createBankStore({ pool = null, runner = null, log = console } = {}) {
  const running = new Map(); // trade → { startedAt, status, error }

  async function rowFor(trade) {
    if (!pool) return null;
    const { rows } = await pool.query(`SELECT * FROM blog_banks WHERE trade = $1`, [trade]);
    return rows[0] || null;
  }
  const checkTrade = trade => { const t = String(trade || '').toLowerCase().trim(); if (!TRADE.test(t)) throw Object.assign(new Error('Bad trade name.'), { status: 400 }); return t; };

  // The bank's text: the row, else the repo file
  async function read(trade) {
    const t = checkTrade(trade);
    const row = await rowFor(t);
    if (row) return { trade: t, text: row.body, generated: row.generated, model: row.model, source: row.source, fingerprint: row.fingerprint, from: 'database', updatedAt: row.updated_at, approvedBy: row.approved_by, approvedAt: row.approved_at, approvedFingerprint: row.approved_fingerprint };
    const f = B.readBankFile(t);
    if (!f.exists) return { trade: t, text: '', from: null };
    return { trade: t, text: f.text, generated: f.header ? f.header.generated : null, model: f.header ? f.header.model : null, source: 'file', fingerprint: f.fingerprint, from: f.file, updatedAt: null, approvedBy: null, approvedAt: null, approvedFingerprint: null };
  }

  async function status(trade) {
    const r = await read(trade);
    const exists = !!r.text;
    const parsed = exists ? B.parseBank(r.text) : null;
    const check = exists ? B.validateBank(parsed) : { valid: false, error: 'no bank yet' };
    const approved = !!(exists && r.approvedFingerprint && r.approvedFingerprint === r.fingerprint);
    const run = running.get(r.trade) || null;
    return {
      trade: r.trade, exists, from: r.from, generated: r.generated || null, model: r.model || null, source: r.source || null, updatedAt: r.updatedAt || null,
      valid: check.valid, error: check.error, counts: parsed ? parsed.counts : null, warnings: parsed ? parsed.warnings : [],
      approved, stale: !!(r.approvedFingerprint && r.approvedFingerprint !== r.fingerprint), approvedBy: r.approvedBy || null, approvedAt: r.approvedAt || null,
      running: !!(run && run.status === 'running'), run,
    };
  }

  // The parsed bank, only when approved (the topic queue's reader); null otherwise
  async function approvedBank(trade) {
    if (!trade) return null;
    const t = String(trade).toLowerCase().trim();
    if (!TRADE.test(t)) return null;
    const r = await read(t);
    if (!r.text || !r.approvedFingerprint || r.approvedFingerprint !== r.fingerprint) return null;
    const parsed = B.parseBank(r.text);
    return B.validateBank(parsed).valid ? { trade: t, ...parsed } : null;
  }

  // A pasted (or uploaded) reply. A header line is added when the text has none.
  async function save(trade, text, { source = 'paste', model = null, generated = null } = {}) {
    const t = checkTrade(trade);
    if (!pool) throw Object.assign(new Error('Database not configured.'), { status: 503 });
    let body = String(text || '').replace(/\r\n/g, '\n').trim();
    if (!body) throw Object.assign(new Error('Paste the reply first.'), { status: 400 });
    const parsed = B.parseBank(body);
    const check = B.validateBank(parsed);
    if (!check.valid) throw Object.assign(new Error(check.error), { status: 400 });
    const head = B.parseHeader(body);
    const gen = generated || (head ? head.generated : today());
    const mdl = model || (head ? head.model : source === 'paste' ? 'pasted (perplexity app)' : source);
    if (!head) body = `${B.header({ generated: gen, model: mdl })}\n\n${body}\n`;
    const fp = B.fingerprintOf(body);
    const { rows } = await pool.query(`SELECT trade FROM blog_banks WHERE trade = $1`, [t]);
    if (rows.length) await pool.query(`UPDATE blog_banks SET body = $2, generated = $3, model = $4, source = $5, fingerprint = $6, updated_at = NOW() WHERE trade = $1`, [t, body, gen, mdl, source, fp]);
    else await pool.query(`INSERT INTO blog_banks (trade, body, generated, model, source, fingerprint) VALUES ($1, $2, $3, $4, $5, $6)`, [t, body, gen, mdl, source, fp]);
    log.log(`[blog bank] ${t}: ${source}, ${parsed.counts.topics} topics, ${parsed.counts.related} related questions, ${parsed.warnings.length} warning(s)`);
    return status(t);
  }

  async function approve(trade, who) {
    const t = checkTrade(trade);
    const name = String(who || '').trim();
    if (!name) throw Object.assign(new Error('Say who is approving the bank.'), { status: 400 });
    if (!pool) throw Object.assign(new Error('Database not configured.'), { status: 503 });
    const r = await read(t);
    if (!r.text) throw Object.assign(new Error(`There is no bank for ${t} to approve.`), { status: 404 });
    const check = B.validateBank(B.parseBank(r.text));
    if (!check.valid) throw Object.assign(new Error(`The bank cannot be approved: ${check.error}`), { status: 400 });
    const row = await rowFor(t);
    if (!row) await pool.query(`INSERT INTO blog_banks (trade, body, generated, model, source, fingerprint, approved_by, approved_at, approved_fingerprint) VALUES ($1, $2, $3, $4, 'file', $5, $6, NOW(), $5)`, [t, r.text, r.generated, r.model, r.fingerprint, name]);
    else await pool.query(`UPDATE blog_banks SET approved_by = $2, approved_at = NOW(), approved_fingerprint = fingerprint WHERE trade = $1`, [t, name]);
    return status(t);
  }

  async function unapprove(trade) {
    const t = checkTrade(trade);
    if (!pool) throw Object.assign(new Error('Database not configured.'), { status: 503 });
    await pool.query(`UPDATE blog_banks SET approved_by = NULL, approved_at = NULL, approved_fingerprint = NULL WHERE trade = $1`, [t]);
    return status(t);
  }

  // The Perplexity run, in the background; the status shows it running, done or failed
  async function run(trade) {
    const t = checkTrade(trade);
    if (!runner) throw Object.assign(new Error('PERPLEXITY_API_KEY is not set: paste the reply from the Perplexity app instead.'), { status: 503 });
    if (!pool) throw Object.assign(new Error('Database not configured.'), { status: 503 });
    const cur = running.get(t);
    if (cur && cur.status === 'running') throw Object.assign(new Error(`The ${t} bank is already running.`), { status: 409 });
    const state = { startedAt: new Date().toISOString(), status: 'running', note: 'submitted', error: null, finishedAt: null, cost: null };
    running.set(t, state);
    const prompt = B.buildPrompt(t);
    (async () => {
      try {
        const r = await runner(t, prompt, note => { state.note = note; });
        await save(t, r.text, { source: 'perplexity', model: r.model ? `perplexity agent (${r.model})` : 'perplexity agent' });
        state.status = 'done'; state.cost = r.cost == null ? null : r.cost;
      } catch (e) {
        state.status = 'failed'; state.error = e.message;
        log.error(`[blog bank] ${t}: run failed: ${e.message}`);
      } finally { state.finishedAt = new Date().toISOString(); }
    })();
    return status(t);
  }

  // Every trade with a bank (database or file), plus any trades asked for
  async function list(extraTrades = []) {
    const trades = new Set(B.listBankFiles());
    if (pool) for (const r of (await pool.query(`SELECT trade FROM blog_banks`)).rows) trades.add(r.trade);
    for (const t of extraTrades) if (t && TRADE.test(t)) trades.add(t);
    const out = [];
    for (const t of [...trades].sort()) out.push(await status(t));
    return out;
  }

  return { read, status, approvedBank, save, approve, unapprove, run, list, running };
}

module.exports = { ensureBankTables, createBankStore };
