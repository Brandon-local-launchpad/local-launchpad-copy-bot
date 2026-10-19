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
const C = require('./claims');
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
      conflict_count    INTEGER NOT NULL DEFAULT 0,
      mode              TEXT,
      error             TEXT,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      started_at        TIMESTAMPTZ,
      finished_at       TIMESTAMPTZ
    );
  `);
  // Added by H1 research v2 to a table that may already exist
  await pool.query(`ALTER TABLE h1_research_jobs ADD COLUMN IF NOT EXISTS conflict_count INTEGER NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE h1_research_jobs ADD COLUMN IF NOT EXISTS mode TEXT`);
  // The page map's own columns for research (h1_keyword, h1_volume, h1_reason, h1_hub,
  // h1_suggests, h1_researched_at) are added by page-map/store.js ensurePageMapTables
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
  async function start(clientId, { kind = 'generate', categoryTabRule = null, mode = null } = {}) {
    const cur = await latest(clientId);
    if (cur && ACTIVE.includes(cur.status)) return cur; // one job at a time per client
    const { rows } = await pool.query(`INSERT INTO h1_research_jobs (client_id, kind, category_tab_rule, status, stage, mode) VALUES ($1, $2, $3, 'queued', $4, $5) RETURNING id`,
      [clientId, kind, categoryTabRule, kind === 'generate' ? 'Queued: building pages' : 'Queued: researching H1s', mode || (kind === 'generate' ? null : 'all')]);
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
        // A brand new map is researched in full; regenerating an existing one only fills pages without a v2 H1
        if (!j.mode) await patch(id, { mode: (await pageMapStore.saved(j.client_id)).length ? 'fill' : 'all' });
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

  // Research rows that may change (mode "all": every row except manual or past H1 Added; mode
  // "fill", after regenerating an existing map: also keeps every H1 v2 research already set),
  // with volumes from the cache and one batched call for the rest
  async function decide(clientId, { mode = 'all', onStage = async () => {}, onRetry = null } = {}) {
    const rows = (await pageMapStore.saved(clientId)).filter(r => r.applies);
    const st = await pageMapStore.state(clientId);
    const inputs = await inputsFor(filloutService, clientId, { categoryTabRule: (st && st.category_tab_rule) || 'ticked_only' });
    const cats = inputs.resolved ? inputs.resolved.categories : [];
    const ctx = { primaryName: inputs.resolved && inputs.resolved.primaryName, primaryKey: inputs.resolved && inputs.resolved.primary, baseTown: inputs.baseTown, categoryName: key => (cats.find(c => c.key === key) || {}).name, terms: H.searchTerms(inputs.niche) };
    const keywords = [...new Set(rows.flatMap(r => C.candidatesV2(r, ctx).map(c => c.keyword)))];
    await onStage({ pages: rows.length, keywords: keywords.length });
    const volumes = await cached(keywords);
    const missing = keywords.filter(k => !volumes.has(k));
    let cost = 0;
    if (missing.length) {
      const r = await searchVolume(missing, { onRetry });
      cost = r.cost;
      const per = r.cost / missing.length;
      for (const k of missing) {
        const v = r.results.get(k) || { volume: null, cpc: null, status: 'null' };
        volumes.set(k, v);
        await saveVolume(k, v, per);
      }
    }
    const fillLock = r => C.isLocked(r) || (!!r.h1 && ['research', 'pattern'].includes(r.h1_source));
    const out = C.resolve(rows, ctx, volumes, { isLocked: mode === 'fill' ? fillLock : C.isLocked });
    return { rows, ctx, keywords, missing: missing.length, cost, ...out };
  }

  async function research(id) {
    const j = await job(id);
    const clientId = j.client_id;
    try {
      const stage = n => `Researching H1s (${n.pages} pages, ${n.keywords} keywords)`;
      let label = 'Researching H1s';
      const r = await decide(clientId, {
        mode: j.mode || 'all',
        onStage: async n => { label = stage(n); await patch(id, { status: 'researching', stage: label, pages_total: n.pages, pages_built: n.pages, keywords_total: n.keywords }); },
        onRetry: ({ attempt, of, waitMs, message }) => patch(id, { stage: `${label}: DataForSEO is busy (${message}), retrying in ${Math.round(waitMs / 1000)}s (${attempt} of ${of})` }),
      });
      await patch(id, { keywords_fetched: r.missing, cost: r.cost });
      const counts = { research: 0, pattern: 0, conflict: 0 };
      for (const d of r.decisions) {
        await saveCandidates(clientId, d);
        await apply(clientId, d);
        if (counts[d.source] != null && !['manual', 'locked'].includes(d.source)) counts[d.source]++;
      }
      await patch(id, { status: 'complete', suggested_count: counts.research, no_data_count: counts.pattern, conflict_count: counts.conflict,
        stage: `Complete: ${counts.research} H1s by search volume, ${counts.pattern} by pattern${counts.conflict ? `, ${counts.conflict} H1 conflict${counts.conflict === 1 ? '' : 's'} to resolve` : ''}, cost $${r.cost.toFixed(2)}`, finished_at: now() });
    } catch (err) {
      const msg = D.safeMessage(err.message);
      log.error(`[h1-research] research failed for ${clientId}: ${err.status ? `status ${err.status}, ` : ''}${msg}`);
      await patch(id, { status: 'failed', stage: `H1 research failed: ${msg}`, error: `${err.status ? `status ${err.status}: ` : ''}${msg}`, cost: err.cost || 0, finished_at: now() });
    }
  }

  // One decision onto its row. The WHERE clause is the guard: never a manual H1, never a page
  // past H1 Added (a person's edit made meanwhile always wins). Not Started becomes H1 Added.
  async function apply(clientId, d) {
    const r = d.row;
    const at = now();
    if (d.source === 'manual') return;
    if (d.source === 'locked') {
      await pool.query(`UPDATE client_page_map SET h1_suggests = $3, h1_researched_at = $4 WHERE id = $1 AND client_id = $2`, [r.id, clientId, d.suggests || null, at]);
      return;
    }
    const guard = `WHERE id = $1 AND client_id = $2 AND h1_source <> 'manual' AND status IN ('Not Started', 'H1 Added')`;
    if (d.source === 'research' || d.source === 'pattern') {
      await pool.query(`UPDATE client_page_map SET h1 = $3, h1_source = $4, h1_keyword = $5, h1_volume = $6, h1_reason = $7, h1_hub = $8, h1_suggests = NULL, h1_suggestion = NULL, h1_accepted = FALSE, h1_researched_at = $9, updated_at = $9,
        status = CASE WHEN status = 'Not Started' THEN 'H1 Added' ELSE status END ${guard}`,
        [r.id, clientId, d.h1, d.source, d.keyword, d.volume == null ? null : d.volume, d.reason, d.hub || null, at]);
    } else {
      await pool.query(`UPDATE client_page_map SET h1 = '', h1_source = 'conflict', h1_keyword = $3, h1_volume = NULL, h1_reason = $4, h1_hub = $5, h1_suggests = NULL, h1_suggestion = NULL, h1_accepted = FALSE, h1_researched_at = $6, updated_at = $6 ${guard}`,
        [r.id, clientId, d.keyword, d.reason, d.hub || null, at]);
    }
  }

  // What re-research would change, applied only after a person confirms (Brandon, 19 Oct 2026).
  // Fetching any uncached keywords here is the same single call research would make; they are cached.
  async function preview(clientId) {
    const r = await decide(clientId, { mode: 'all' });
    const changes = [], notes = [];
    for (const d of r.decisions) {
      const row = d.row;
      if (d.source === 'manual') continue;
      if (d.source === 'locked') { if (d.suggests) notes.push({ page_key: row.page_key, title: row.title, type: row.type, status: row.status, h1: row.h1, suggests: d.suggests }); continue; }
      const sourceNow = ['research', 'pattern', 'conflict'].includes(row.h1_source) ? row.h1_source : row.h1_source || 'needed';
      if ((row.h1 || '') !== (d.h1 || '') || sourceNow !== d.source) changes.push({ page_key: row.page_key, title: row.title, type: row.type, from: row.h1 || '', fromSource: row.h1_source, to: d.h1 || '', toSource: d.source, volume: d.volume == null ? null : d.volume, reason: d.reason });
    }
    return { changes, notes, keywords: r.keywords.length, fetched: r.missing, cost: r.cost };
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
  // Every candidate with its volume, CPC and fit; which one was applied and why; who claimed the rest
  async function saveCandidates(clientId, d) {
    await pool.query(`DELETE FROM h1_candidates WHERE client_id = $1 AND page_key = $2`, [clientId, d.row.page_key]);
    const lost = new Map((d.lostTo || []).map(l => [l.keyword, l]));
    for (let i = 0; i < (d.candidates || []).length; i++) {
      const c = d.candidates[i];
      const chosen = ['research', 'pattern'].includes(d.source) && c.keyword === d.keyword;
      const l = lost.get(c.keyword);
      const why = chosen ? d.reason
        : l ? `claimed by ${l.by}, ${l.volume}/mo (${l.why})`
        : c.volume == null || c.volume <= 10 ? `${c.volume == null ? 'no data' : `${c.volume}/mo`}: 10 or less is not usable`
        : c.fit === 'synonym' ? 'a synonym' : null;
      await pool.query(`INSERT INTO h1_candidates (client_id, page_key, candidate, position, volume, cpc, chosen, reason, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [clientId, d.row.page_key, c.keyword, i, c.volume, c.cpc, chosen, why, now()]);
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

  return { start, run, job, latest, candidates, recover, cached, preview, decide };
}

module.exports = { ensureH1Tables, createH1Research, CACHE_DAYS, ACTIVE };
