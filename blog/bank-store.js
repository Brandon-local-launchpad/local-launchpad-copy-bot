'use strict';

// ── The blog question bank per trade: storage, approval, the Perplexity run ────
// One row per trade in blog_banks (the text as `body`, where it came from, when), with the approval
// as a fingerprint of the text at the time, like the trade facts verifications: a new
// paste or run makes the bank unapproved again without touching who approved it last.
// A repo file blog-bank/<trade>.md seeds a trade with no row (the local runner writes
// those files; the live app keeps what is pasted or run on Railway in the database, since
// its disk does not survive a deploy). The topic queue reads an approved bank only.

const B = require('./bank');
const P = require('./paa');

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
// The People also ask report per trade (the last pass: its date, cost and per block counts)
async function ensureReportTable(pool) {
  try { await pool.query(`SELECT trade FROM blog_bank_reports LIMIT 1`); return; } catch (_) { /* no table yet */ }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blog_bank_reports (
      trade       TEXT PRIMARY KEY,
      body        TEXT NOT NULL,
      summary     TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

const TRADE = /^[a-z0-9-]+$/;
const today = () => new Date().toISOString().slice(0, 10);

// runner: async (trade, prompt, onStatus) → { text, model, cost }; null when no key.
// paa: async (text, { niche, onStatus }) → { text, report, cost, calls, reportText } (blog/paa.js paaPass
// with the DataForSEO credentials); null when they are not set. nicheFor(trade) → the niche entry or null.
// testSamplesAllowed: only the fixtures and the demo pass true; a hand written test sample
// (its header says TEST SAMPLE) is otherwise refused by save and approve, so it never
// reaches a real client.
function createBankStore({ pool = null, runner = null, paa = null, nicheFor = () => null, log = console, testSamplesAllowed = false } = {}) {
  const running = new Map(); // trade → { startedAt, status, error }
  const paaRunning = new Map(); // trade → { startedAt, status, note, error, finishedAt, cost }
  let reportTable = null;
  const reports = async () => { if (!pool) return false; if (reportTable === null) { try { await ensureReportTable(pool); reportTable = true; } catch (e) { reportTable = false; log.error(`[blog bank] reports table: ${e.message}`); } } return reportTable; };
  async function paaReport(trade) {
    const t = checkTrade(trade);
    if (!(await reports())) return null;
    const { rows } = await pool.query(`SELECT body, summary, created_at FROM blog_bank_reports WHERE trade = $1`, [t]);
    if (!rows.length) return null;
    const summary = typeof rows[0].summary === 'string' ? JSON.parse(rows[0].summary) : rows[0].summary;
    return { trade: t, text: rows[0].body, at: rows[0].created_at, ...summary };
  }
  const refuseSample = text => { if (!testSamplesAllowed && B.isTestSample(text)) throw Object.assign(new Error('This is a hand written test sample (its header says TEST SAMPLE), not a bank: it is for the fixtures and the demo only and is never saved or approved for a real trade.'), { status: 400 }); };

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
    const paaRun = paaRunning.get(r.trade) || null;
    const report = await paaReport(r.trade).catch(() => null);
    return {
      paa: { available: !!paa, running: !!(paaRun && paaRun.status === 'running'), run: paaRun, last: report ? { at: report.at, date: report.date, cost: report.cost, found: report.found, kept: report.kept, blocks: report.blocks, thin: report.thin } : null },
      trade: r.trade, exists, from: r.from, file: (() => { const f = B.readBankFile(r.trade); return f.exists ? { header: f.header, same: B.fingerprintOf(f.text.replace(/\r\n/g, '\n').trim()) === r.fingerprint } : null; })(), generated: r.generated || null, model: r.model || null, source: r.source || null, updatedAt: r.updatedAt || null,
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
    if (!testSamplesAllowed && B.isTestSample(r.text)) return null;
    const parsed = B.parseBank(r.text);
    return B.validateBank(parsed).valid ? { trade: t, ...parsed } : null;
  }

  // A pasted (or uploaded) reply. A header line is added when the text has none.
  async function save(trade, text, { source = 'paste', model = null, generated = null } = {}) {
    const t = checkTrade(trade);
    if (!pool) throw Object.assign(new Error('Database not configured.'), { status: 503 });
    let body = String(text || '').replace(/\r\n/g, '\n').trim();
    if (!body) throw Object.assign(new Error('Paste the reply first.'), { status: 400 });
    refuseSample(body);
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
    refuseSample(r.text);
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

  // The repo file (blog-bank/<trade>.md, the local runner's result, deployed with the code) saved
  // over the trade's row, unapproved: the way a local Perplexity run reaches the live app
  async function loadFile(trade) {
    const t = checkTrade(trade);
    const f = B.readBankFile(t);
    if (!f.exists) throw Object.assign(new Error(`There is no file blog-bank/${t}.md in this deploy.`), { status: 404 });
    return save(t, f.text, { source: 'file', model: f.header ? f.header.model : null, generated: f.header ? f.header.generated : undefined });
  }

  // The People also ask pass on the bank as it is (Brandon, 28 Oct): every target question to
  // DataForSEO, the related questions replaced, the bank saved unapproved, the report kept
  async function runPaa(trade) {
    const t = checkTrade(trade);
    if (!paa) throw Object.assign(new Error('DataForSEO is not set up: DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD are missing.'), { status: 503 });
    if (!pool) throw Object.assign(new Error('Database not configured.'), { status: 503 });
    const r = await read(t);
    if (!r.text) throw Object.assign(new Error(`There is no ${t} bank to take the targets from: run or paste one first.`), { status: 404 });
    refuseSample(r.text);
    const cur = paaRunning.get(t);
    if (cur && cur.status === 'running') throw Object.assign(new Error(`The ${t} People also ask pass is already running.`), { status: 409 });
    if (running.get(t) && running.get(t).status === 'running') throw Object.assign(new Error(`The ${t} bank is being run on Perplexity; wait for it.`), { status: 409 });
    const state = { startedAt: new Date().toISOString(), status: 'running', note: 'starting', error: null, finishedAt: null, cost: null };
    paaRunning.set(t, state);
    (async () => {
      try {
        const out = await paa(r.text, { niche: nicheFor(t), trade: t, onStatus: note => { state.note = note; } });
        await save(t, out.text, { source: `${r.source && r.source !== 'file' ? r.source : 'perplexity'}+paa`, model: (B.parseHeader(out.text) || {}).model || r.model, generated: r.generated || undefined });
        if (await reports()) {
          const summary = JSON.stringify({ date: out.report.date, cost: out.cost, calls: out.calls, modelPence: out.modelPence ?? null, found: out.report.totals.found, kept: out.report.totals.kept, blocks: out.report.totals.blocks, thin: out.report.totals.thin, failed: out.report.totals.failed, relevance_dropped: out.report.totals.relevance_dropped, deepened: out.report.totals.deepened });
          const body = out.reportText || P.formatReport(out.report, { trade: t, cost: out.cost, calls: out.calls, modelPence: out.modelPence, modelCalls: out.modelCalls });
          const { rows } = await pool.query(`SELECT trade FROM blog_bank_reports WHERE trade = $1`, [t]);
          if (rows.length) await pool.query(`UPDATE blog_bank_reports SET body = $2, summary = $3, created_at = NOW() WHERE trade = $1`, [t, body, summary]);
          else await pool.query(`INSERT INTO blog_bank_reports (trade, body, summary) VALUES ($1, $2, $3)`, [t, body, summary]);
        }
        state.status = 'done'; state.cost = out.cost; state.note = `${out.report.totals.kept} questions kept over ${out.report.totals.blocks} blocks`;
      } catch (e) {
        state.status = 'failed'; state.error = e.message;
        log.error(`[blog bank] ${t}: People also ask pass failed: ${e.message}`);
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

  return { read, status, approvedBank, save, approve, unapprove, run, runPaa, paaReport, loadFile, list, running, paaRunning };
}

module.exports = { ensureBankTables, ensureReportTable, createBankStore };
