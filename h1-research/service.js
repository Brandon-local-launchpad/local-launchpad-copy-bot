'use strict';

// ── H1 research: storage, jobs and the one-click flow ───────────────────────
// "Generate page map" starts a job that builds the pages (page-map/store.js) and then
// researches H1s in one batched DataForSEO call (h1-research/dataforseo.js, cached 90
// days per keyword). Job state lives in h1_research_jobs, so a refresh, a closed tab or
// another device sees the same progress, and a job interrupted by a restart is picked up
// again on startup. Research only ever writes H1s whose h1_source is "needed" or
// "suggested" (a conditional UPDATE, so a person's edit made meanwhile always wins); it
// never touches the page name, slug, status, meta, notes, or a manual or accepted H1.
// A failed research leaves the page map as it is; the job carries a safe message.

const H = require('./research');
const D = require('./dataforseo');
const { inputsFor } = require('../page-map/store');

const CACHE_DAYS = 90;
const ACTIVE = ['queued', 'building', 'researching'];

async function ensureH1Tables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS keyword_volumes (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      keyword       TEXT NOT NULL,
      location_code INTEGER NOT NULL,
      volume        INTEGER,
      cpc           NUMERIC,
      status        TEXT NOT NULL,
      fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      cost          NUMERIC,
      UNIQUE(keyword, location_code)
    );
    CREATE TABLE IF NOT EXISTS h1_candidates (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      page_key    TEXT NOT NULL,
      candidate   TEXT NOT NULL,
      position    INTEGER NOT NULL DEFAULT 0,
      volume      INTEGER,
      cpc         NUMERIC,
      chosen      BOOLEAN NOT NULL DEFAULT FALSE,
      reason      TEXT,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(client_id, page_key, candidate)
    );
    CREATE TABLE IF NOT EXISTS h1_research_jobs (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      kind              TEXT NOT NULL DEFAULT 'generate',
      category_tab_rule TEXT,
      status            TEXT NOT NULL DEFAULT 'queued',
      stage             TEXT,
      pages_total       INTEGER NOT NULL DEFAULT 0,
      pages_built       INTEGER NOT NULL DEFAULT 0,
      keywords_total    INTEGER NOT NULL DEFAULT 0,
      keywords_fetched  INTEGER NOT NULL DEFAULT 0,
      suggested_count   INTEGER NOT NULL DEFAULT 0,
      no_data_count     INTEGER NOT NULL DEFAULT 0,
      cost              NUMERIC NOT NULL DEFAULT 0,
      error             TEXT,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      started_at        TIMESTAMPTZ,
      finished_at       TIMESTAMPTZ
    );
  `);
  // The page map's own columns for research (h1_keyword, h1_volume, h1_suggestion,
  // h1_accepted, h1_researched_at) are added by page-map/store.js ensurePageMapTables
}

const num = v => (v == null ? null : Number(v));
const jobOut = j => j && ({ ...j, cost: num(j.cost) });

function createH1Research({ pool, filloutService, pageMapStore, searchVolume = D.searchVolume, log = console, now = () => new Date() }) {
  const running = new Set();

  async function job(id) { const { rows } = await pool.query(`SELECT * FROM h1_research_jobs WHERE id = $1`, [id]); return jobOut(rows[0]) || null; }
  async function latest(clientId) {
    const { rows } = await pool.query(`SELECT * FROM h1_research_jobs WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1`, [clientId]);
    return jobOut(rows[0]) || null;
  }
  async function patch(id, fields) {
    const keys = Object.keys(fields);
    if (!keys.length) return;
    await pool.query(`UPDATE h1_research_jobs SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')} WHERE id = $1`, [id, ...keys.map(k => fields[k])]);
  }

  // kind: "generate" (build the page map, then research) or "research" (research only)
  async function start(clientId, { kind = 'generate', categoryTabRule = null } = {}) {
    const cur = await latest(clientId);
    if (cur && ACTIVE.includes(cur.status)) return cur; // one job at a time per client
    const { rows } = await pool.query(`INSERT INTO h1_research_jobs (client_id, kind, category_tab_rule, status, stage) VALUES ($1, $2, $3, 'queued', $4) RETURNING id`,
      [clientId, kind, categoryTabRule, kind === 'generate' ? 'Queued: building pages' : 'Queued: researching H1s']);
    const id = rows[0].id;
    setImmediate(() => run(id).catch(err => log.error('[h1-research] job crashed:', D.safeMessage(err.message))));
    return job(id);
  }

  async function run(id) {
    if (running.has(id)) return;
    running.add(id);
    try {
      let j = await job(id);
      if (!j || !ACTIVE.includes(j.status)) return;
      await patch(id, { started_at: j.started_at || now() });
      if (j.kind === 'generate' && j.status !== 'researching') {
        await patch(id, { status: 'building', stage: 'Building pages' });
        try {
          await pageMapStore.generate(j.client_id, { categoryTabRule: j.category_tab_rule || 'ticked_only', onProgress: (done, total) => patch(id, { pages_built: done, pages_total: total, stage: `Building pages (${done} of ${total})` }) });
        } catch (err) {
          await patch(id, { status: 'failed', stage: 'Could not build the page map', error: D.safeMessage(err.message), finished_at: now() });
          return;
        }
      }
      await research(id);
    } finally { running.delete(id); }
  }

  async function research(id) {
    const j = await job(id);
    const clientId = j.client_id;
    try {
      const rows = (await pageMapStore.saved(clientId)).filter(r => r.applies);
      const st = await pageMapStore.state(clientId);
      const inputs = await inputsFor(filloutService, clientId, { categoryTabRule: (st && st.category_tab_rule) || 'ticked_only' });
      const cats = inputs.resolved ? inputs.resolved.categories : [];
      const ctx = { primaryName: inputs.resolved && inputs.resolved.primaryName, baseTown: inputs.baseTown, categoryName: key => (cats.find(c => c.key === key) || {}).name };
      const { pages, keywords } = H.plan(rows, ctx);
      await patch(id, { status: 'researching', stage: `Researching H1s (${pages.length} pages, ${keywords.length} keywords)`, pages_total: rows.length, pages_built: rows.length, keywords_total: keywords.length });

      // Volumes: fresh cache first, one batched call for the rest
      const volumes = await cached(keywords);
      const missing = keywords.filter(k => !volumes.has(k));
      let cost = 0;
      if (missing.length) {
        const stage = `Researching H1s (${pages.length} pages, ${keywords.length} keywords)`;
        const r = await searchVolume(missing, { onRetry: ({ attempt, of, waitMs, message }) => patch(id, { stage: `${stage}: DataForSEO is busy (${message}), retrying in ${Math.round(waitMs / 1000)}s (${attempt} of ${of})` }) });
        cost = r.cost;
        const per = missing.length ? r.cost / missing.length : 0;
        for (const k of missing) {
          const v = r.results.get(k) || { volume: null, cpc: null, status: 'null' };
          volumes.set(k, v);
          await saveVolume(k, v, per);
        }
      }
      await patch(id, { keywords_fetched: missing.length, cost });

      // Candidates and H1s, page by page
      let suggested = 0, noData = 0;
      for (const p of pages) {
        const sel = H.select(p.candidates, volumes);
        await saveCandidates(clientId, p.row.page_key, sel);
        if (sel.usable) {
          suggested++;
          await pool.query(`UPDATE client_page_map SET h1 = $3, h1_source = 'suggested', h1_keyword = $4, h1_volume = $5, h1_suggestion = NULL, h1_accepted = FALSE, h1_researched_at = $6, updated_at = $6
            WHERE id = $1 AND client_id = $2 AND h1_source IN ('needed', 'suggested')`, [p.row.id, clientId, sel.display, sel.chosen, sel.volume, now()]);
        } else {
          noData++;
          await pool.query(`UPDATE client_page_map SET h1 = '', h1_source = 'needed', h1_keyword = NULL, h1_volume = NULL, h1_suggestion = $3, h1_accepted = FALSE, h1_researched_at = $4, updated_at = $4
            WHERE id = $1 AND client_id = $2 AND h1_source IN ('needed', 'suggested')`, [p.row.id, clientId, sel.suggestion ? H.displayOf(sel.suggestion) : null, now()]);
        }
      }
      await patch(id, { status: 'complete', suggested_count: suggested, no_data_count: noData, stage: `Complete: ${suggested} suggested, ${noData} need a manual H1, cost $${cost.toFixed(2)}`, finished_at: now() });
    } catch (err) {
      const msg = D.safeMessage(err.message);
      log.error(`[h1-research] research failed for ${clientId}: ${err.status ? `status ${err.status}, ` : ''}${msg}`);
      await patch(id, { status: 'failed', stage: `H1 research failed: ${msg}`, error: `${err.status ? `status ${err.status}: ` : ''}${msg}`, cost: err.cost || 0, finished_at: now() });
    }
  }

  async function cached(keywords) {
    const out = new Map();
    if (!keywords.length) return out;
    const { rows } = await pool.query(`SELECT keyword, volume, cpc, status, fetched_at FROM keyword_volumes WHERE location_code = $1`, [D.UK.location_code]);
    const fresh = now().getTime() - CACHE_DAYS * 86400000;
    const want = new Set(keywords);
    for (const r of rows) if (want.has(r.keyword) && r.status !== 'error' && new Date(r.fetched_at).getTime() >= fresh) out.set(r.keyword, { volume: num(r.volume), cpc: num(r.cpc), status: r.status });
    return out;
  }
  async function saveVolume(keyword, v, cost) {
    const { rowCount } = await pool.query(`UPDATE keyword_volumes SET volume = $3, cpc = $4, status = $5, fetched_at = $6, cost = $7 WHERE keyword = $1 AND location_code = $2`,
      [keyword, D.UK.location_code, v.volume, v.cpc, v.status, now(), cost]);
    if (!rowCount) await pool.query(`INSERT INTO keyword_volumes (keyword, location_code, volume, cpc, status, fetched_at, cost) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [keyword, D.UK.location_code, v.volume, v.cpc, v.status, now(), cost]);
  }
  async function saveCandidates(clientId, pageKey, sel) {
    await pool.query(`DELETE FROM h1_candidates WHERE client_id = $1 AND page_key = $2`, [clientId, pageKey]);
    for (const s of sel.scored) {
      await pool.query(`INSERT INTO h1_candidates (client_id, page_key, candidate, position, volume, cpc, chosen, reason, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [clientId, pageKey, s.keyword, s.order, s.volume, s.cpc, sel.usable && s.keyword === sel.chosen, s.keyword === (sel.chosen || sel.suggestion) ? sel.reason : null, now()]);
    }
  }

  async function candidates(clientId) {
    const { rows } = await pool.query(`SELECT page_key, candidate, position, volume, cpc, chosen, reason FROM h1_candidates WHERE client_id = $1 ORDER BY page_key, position`, [clientId]);
    const out = {};
    for (const r of rows) (out[r.page_key] = out[r.page_key] || []).push({ candidate: r.candidate, volume: num(r.volume), cpc: num(r.cpc), chosen: r.chosen, reason: r.reason });
    return out;
  }

  // On startup: jobs a restart interrupted are run again (research is idempotent and cached)
  async function recover() {
    const { rows } = await pool.query(`SELECT id FROM h1_research_jobs WHERE status IN ('queued', 'building', 'researching') ORDER BY created_at`);
    for (const r of rows) await run(r.id).catch(err => log.error('[h1-research] recovery failed:', D.safeMessage(err.message)));
    return rows.length;
  }

  return { start, run, job, latest, candidates, recover, cached };
}

module.exports = { ensureH1Tables, createH1Research, CACHE_DAYS, ACTIVE };
