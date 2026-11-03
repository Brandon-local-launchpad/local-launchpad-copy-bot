'use strict';

// ── Citations: the tables and the directory database ─────────────────────────────
//   citation_directories   one row per directory (citations/seed.js, plus rows added by hand)
//   citation_places        the Places tab: a town or county to its council, chamber, Nub News
//   citation_seed          which seed version is in the table (the files' fingerprint)
//   citation_api_costs     every DataForSEO and model spend, by kind and client
//   client_citation_locations, client_citations, citation_scans, citation_gap_runs:
//                          the client side (citations/client.js, scan.js, gaps.js)
//
// seedDirectories upserts the parsed rows by key: a row nobody edited in the UI follows the
// seed; a hand edited row (hand_edited) keeps its values; a row added by hand is never
// touched. The DA column is the DataForSEO domain rank, filled after the seed for rows
// without one (fillDa) when the credentials are set; the spend is logged.

const Seed = require('./seed');
const DFS = require('./dataforseo');

const parse = v => { if (v == null || v === '') return null; if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch (_) { return null; } };
const json = v => (v == null ? null : JSON.stringify(v));
const str = v => (v == null ? '' : String(v)).trim();

async function ensureCitationTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS citation_directories (
      id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key                    TEXT UNIQUE NOT NULL,
      name                   TEXT NOT NULL,
      url                    TEXT NOT NULL DEFAULT '',
      domain                 TEXT NOT NULL DEFAULT '',
      tier                   TEXT NOT NULL,
      type                   TEXT NOT NULL DEFAULT '',
      da                     INTEGER,
      da_source              TEXT,
      da_at                  TIMESTAMPTZ,
      cost                   TEXT NOT NULL DEFAULT 'paid',
      cost_text              TEXT NOT NULL DEFAULT '',
      priority               TEXT NOT NULL DEFAULT 'P3',
      verification_method    TEXT NOT NULL DEFAULT 'unknown',
      done_by                TEXT NOT NULL DEFAULT 'va',
      applies_to             TEXT NOT NULL DEFAULT '{"kind":"all"}',
      skip_for_service_area  BOOLEAN NOT NULL DEFAULT FALSE,
      needs_live_check       BOOLEAN NOT NULL DEFAULT FALSE,
      notes                  TEXT NOT NULL DEFAULT '',
      source_tab             TEXT NOT NULL DEFAULT '',
      source_url             TEXT NOT NULL DEFAULT '',
      sender_domains         TEXT,
      fields                 TEXT,
      seeded                 BOOLEAN NOT NULL DEFAULT FALSE,
      hand_edited            BOOLEAN NOT NULL DEFAULT FALSE,
      retired_at             TIMESTAMPTZ,
      retired_reason         TEXT,
      created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS citation_places (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type              TEXT NOT NULL,
      name              TEXT NOT NULL,
      name_norm         TEXT NOT NULL,
      country           TEXT NOT NULL DEFAULT '',
      county            TEXT NOT NULL DEFAULT '',
      councils          TEXT NOT NULL DEFAULT '[]',
      population        INTEGER,
      trading_standards TEXT NOT NULL DEFAULT '',
      schemes           TEXT NOT NULL DEFAULT '[]',
      chambers          TEXT NOT NULL DEFAULT '[]',
      nub_news          TEXT NOT NULL DEFAULT '[]',
      city_sites        TEXT NOT NULL DEFAULT '',
      also_touches      TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS citation_seed (
      version    TEXT PRIMARY KEY,
      seeded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      rows       INTEGER NOT NULL DEFAULT 0,
      places     INTEGER NOT NULL DEFAULT 0,
      skipped    TEXT,
      problems   TEXT
    );
    CREATE TABLE IF NOT EXISTS citation_api_costs (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      kind       TEXT NOT NULL,
      client_id  UUID,
      cost_usd   NUMERIC NOT NULL DEFAULT 0,
      calls      INTEGER NOT NULL DEFAULT 0,
      detail     TEXT
    );
    CREATE TABLE IF NOT EXISTS client_citation_locations (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id   UUID NOT NULL,
      label       TEXT NOT NULL DEFAULT 'Primary',
      is_primary  BOOLEAN NOT NULL DEFAULT TRUE,
      nap         TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS client_citations (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id          UUID NOT NULL,
      location_id        UUID NOT NULL,
      directory_id       UUID NOT NULL,
      listed             TEXT NOT NULL DEFAULT 'unchecked',
      live_url           TEXT NOT NULL DEFAULT '',
      nap_status         TEXT NOT NULL DEFAULT 'unchecked',
      nap_diffs          TEXT,
      status             TEXT NOT NULL DEFAULT 'not_started',
      done_by            TEXT,
      last_scanned_at    TIMESTAMPTZ,
      scan               TEXT,
      notes              TEXT NOT NULL DEFAULT '',
      onepassword_item   TEXT NOT NULL DEFAULT '',
      login_email        TEXT NOT NULL DEFAULT '',
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (client_id, location_id, directory_id)
    );
    CREATE TABLE IF NOT EXISTS citation_scans (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id    UUID NOT NULL,
      started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at  TIMESTAMPTZ,
      status       TEXT NOT NULL DEFAULT 'running',
      scope        TEXT NOT NULL DEFAULT 'all',
      rows_total   INTEGER NOT NULL DEFAULT 0,
      rows_done    INTEGER NOT NULL DEFAULT 0,
      found        INTEGER NOT NULL DEFAULT 0,
      cost_usd     NUMERIC NOT NULL DEFAULT 0,
      calls        INTEGER NOT NULL DEFAULT 0,
      summary      TEXT,
      error        TEXT
    );
    CREATE TABLE IF NOT EXISTS citation_gap_runs (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id    UUID NOT NULL,
      at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      keyword      TEXT NOT NULL DEFAULT '',
      competitors  TEXT,
      gaps         TEXT,
      dropped      TEXT,
      cost_usd     NUMERIC NOT NULL DEFAULT 0,
      model_cost_usd NUMERIC NOT NULL DEFAULT 0,
      calls        INTEGER NOT NULL DEFAULT 0,
      error        TEXT
    );
  `);
}

const SEED_COLUMNS = ['name', 'url', 'domain', 'tier', 'type', 'cost', 'cost_text', 'priority', 'verification_method', 'done_by', 'applies_to', 'skip_for_service_area', 'needs_live_check', 'notes', 'source_tab', 'source_url'];
const HAND_COLUMNS = ['name', 'url', 'domain', 'tier', 'type', 'da', 'cost', 'cost_text', 'priority', 'verification_method', 'done_by', 'applies_to', 'skip_for_service_area', 'needs_live_check', 'notes', 'source_url', 'sender_domains', 'fields'];

function typed(r) {
  if (!r) return null;
  return { ...r, applies_to: parse(r.applies_to) || { kind: 'all' }, sender_domains: parse(r.sender_domains) || [], fields: parse(r.fields) || null, da: r.da == null ? null : Number(r.da), retired: !!r.retired_at };
}
function typedPlace(r) { return { ...r, councils: parse(r.councils) || [], schemes: parse(r.schemes) || [], chambers: parse(r.chambers) || [], nub_news: parse(r.nub_news) || [], also_touches: parse(r.also_touches) || [], population: r.population == null ? null : Number(r.population) }; }

// The same spelling the places table uses for a name (locations/places.js normaliseName)
const normaliseName = s => require('../locations/places').normaliseName(s);

function createCitationStore(pool, { log = console, dfs = DFS, env = process.env } = {}) {
  async function logCost({ kind, clientId = null, cost = 0, calls = 0, detail = null }) {
    await pool.query(`INSERT INTO citation_api_costs (kind, client_id, cost_usd, calls, detail) VALUES ($1, $2, $3, $4, $5)`, [kind, clientId, Number(cost) || 0, calls | 0, detail == null ? null : (typeof detail === 'string' ? detail : JSON.stringify(detail))]);
  }

  // ── Seed ──
  async function seedState() {
    const { rows } = await pool.query(`SELECT version, seeded_at, rows, places, skipped, problems FROM citation_seed ORDER BY seeded_at DESC LIMIT 1`);
    const r = rows[0];
    return r ? { version: r.version, seeded_at: r.seeded_at, rows: Number(r.rows), places: Number(r.places), skipped: parse(r.skipped) || [], problems: parse(r.problems) || [], current: Seed.seedVersion() } : { version: null, seeded_at: null, rows: 0, places: 0, skipped: [], problems: [], current: Seed.seedVersion() };
  }

  async function seedDirectories({ force = false, dir = Seed.DATA_DIR, fillDa: doFill = true, now = new Date() } = {}) {
    const version = Seed.seedVersion(dir);
    const have = await seedState();
    const { rows: cnt } = await pool.query(`SELECT COUNT(*) AS n FROM citation_directories WHERE seeded = TRUE`);
    if (!force && have.version === version && Number(cnt[0].n) > 0) return { seeded: false, reason: 'up to date', version, rows: Number(cnt[0].n) };
    const parsed = Seed.parseSeed({ dir, now });
    let inserted = 0, updated = 0, kept = 0;
    for (const r of parsed.rows) {
      const { rows: ex } = await pool.query(`SELECT id, hand_edited, retired_at, retired_reason FROM citation_directories WHERE key = $1`, [r.key]);
      const vals = [r.name, r.url || '', r.domain || '', r.tier, r.type || '', r.cost, r.cost_text || '', r.priority, r.verification_method, r.done_by, json(r.applies_to), !!r.skip_for_service_area, !!r.needs_live_check, r.notes || '', r.source_tab || '', r.source_url || ''];
      if (!ex.length) {
        await pool.query(`INSERT INTO citation_directories (key, ${SEED_COLUMNS.join(', ')}, seeded, retired_at, retired_reason) VALUES ($1, ${SEED_COLUMNS.map((_, i) => '$' + (i + 2)).join(', ')}, TRUE, $${SEED_COLUMNS.length + 2}, $${SEED_COLUMNS.length + 3})`, [r.key, ...vals, r.retired ? now : null, r.retired ? r.retired_reason : null]);
        inserted++;
      } else if (!ex[0].hand_edited) {
        const retiredAt = r.retired ? (ex[0].retired_at || now) : (ex[0].retired_reason && Object.values(Seed.RETIRED).includes(ex[0].retired_reason) ? null : ex[0].retired_at);
        const retiredReason = r.retired ? r.retired_reason : (retiredAt ? ex[0].retired_reason : null);
        await pool.query(`UPDATE citation_directories SET ${SEED_COLUMNS.map((c, i) => `${c} = $${i + 2}`).join(', ')}, seeded = TRUE, retired_at = $${SEED_COLUMNS.length + 2}, retired_reason = $${SEED_COLUMNS.length + 3}, updated_at = $${SEED_COLUMNS.length + 4} WHERE id = $1`, [ex[0].id, ...vals, retiredAt, retiredReason, now]);
        updated++;
      } else kept++;
    }
    // The places lookup is replaced whole
    await pool.query(`DELETE FROM citation_places`);
    for (const p of parsed.places) {
      await pool.query(`INSERT INTO citation_places (type, name, name_norm, country, county, councils, population, trading_standards, schemes, chambers, nub_news, city_sites, also_touches) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [p.type, p.name, normaliseName(p.name), p.country || '', p.county || '', json(p.councils), p.population, p.trading_standards || '', json(p.schemes), json(p.chambers), json(p.nub_news), p.city_sites || '', json(p.also_touches)]);
    }
    await pool.query(`DELETE FROM citation_seed`);
    await pool.query(`INSERT INTO citation_seed (version, seeded_at, rows, places, skipped, problems) VALUES ($1, $2, $3, $4, $5, $6)`, [version, now, parsed.rows.length, parsed.places.length, json(parsed.skipped), json(parsed.problems)]);
    const out = { seeded: true, version, rows: parsed.rows.length, inserted, updated, kept, places: parsed.places.length, skipped: parsed.skipped.length, problems: parsed.problems, counts: parsed.counts, da: null };
    if (doFill) out.da = await fillDa().catch(e => { log.error(`[citations] DA fill failed: ${e.message}`); return { filled: 0, error: e.message }; });
    return out;
  }

  // The DA column from the DataForSEO domain rank, for rows with a domain and no DA yet (or every row with force)
  async function fillDa({ force = false, fetchImpl = fetch, now = new Date() } = {}) {
    if (!dfs.configured(env)) return { filled: 0, skipped: 'DataForSEO is not configured' };
    const { rows } = await pool.query(`SELECT id, domain FROM citation_directories WHERE domain <> '' ${force ? '' : 'AND da IS NULL'}`);
    if (!rows.length) return { filled: 0, cost: 0 };
    const { ranks, cost, calls } = await dfs.bulkRanks(rows.map(r => r.domain), { env, fetchImpl });
    let filled = 0;
    for (const r of rows) {
      const rank = ranks.get(String(r.domain).toLowerCase().replace(/^www\./, ''));
      if (rank == null) continue;
      await pool.query(`UPDATE citation_directories SET da = $2, da_source = 'dataforseo domain rank', da_at = $3 WHERE id = $1`, [r.id, Math.round(rank), now]);
      filled++;
    }
    await logCost({ kind: 'directory_da', cost, calls, detail: { domains: rows.length, filled } });
    return { filled, domains: rows.length, cost, calls };
  }

  // ── The directory database ──
  async function list({ includeRetired = false } = {}) {
    const { rows } = await pool.query(`SELECT * FROM citation_directories ${includeRetired ? '' : 'WHERE retired_at IS NULL'} ORDER BY tier, priority, name`);
    return rows.map(typed);
  }
  async function get(id) { const { rows } = await pool.query(`SELECT * FROM citation_directories WHERE id = $1`, [id]); return typed(rows[0]); }
  async function byKey(key) { const { rows } = await pool.query(`SELECT * FROM citation_directories WHERE key = $1`, [key]); return typed(rows[0]); }
  async function byDomain(domain) { const d = str(domain).toLowerCase().replace(/^www\./, ''); if (!d) return null; const { rows } = await pool.query(`SELECT * FROM citation_directories WHERE domain = $1 ORDER BY retired_at NULLS FIRST, priority LIMIT 1`, [d]); return typed(rows[0]); }
  // Every active domain, for the competitor check's directory filter (gbp/competitors.js) and the gap check
  async function domains({ includeRetired = true } = {}) {
    const { rows } = await pool.query(`SELECT domain FROM citation_directories WHERE domain <> '' ${includeRetired ? '' : 'AND retired_at IS NULL'}`);
    return [...new Set(rows.map(r => r.domain))];
  }

  function validate(data, { partial = false } = {}) {
    const out = {};
    const bad = [];
    const enums = { tier: Seed.TIERS, cost: Seed.COSTS, priority: Seed.PRIORITIES, verification_method: Seed.VERIFICATIONS, done_by: Seed.DONE_BY };
    for (const col of HAND_COLUMNS) {
      if (!(col in data)) { if (!partial && ['name', 'tier'].includes(col)) bad.push(`${col} is required`); continue; }
      let v = data[col];
      if (col in enums) { v = str(v); if (!enums[col].includes(v)) bad.push(`${col} must be one of ${enums[col].join(', ')}`); }
      else if (col === 'da') v = v === '' || v == null ? null : (Number.isFinite(Number(v)) ? Math.round(Number(v)) : bad.push('da must be a number') && null);
      else if (col === 'applies_to') { v = typeof v === 'string' ? parse(v) : v; if (!v || !['all', 'niches', 'not_niches', 'councils', 'areas', 'towns'].includes(v.kind)) bad.push('applies_to.kind must be all, niches, not_niches, councils, areas or towns'); else v = { kind: v.kind, ...(v.kind === 'niches' || v.kind === 'not_niches' ? { niches: [].concat(v.niches || []).map(str).filter(Boolean) } : {}), ...(v.kind === 'councils' ? { councils: [].concat(v.councils || []).map(str).filter(Boolean) } : {}), ...(v.kind === 'towns' ? { towns: [].concat(v.towns || []).map(str).filter(Boolean) } : {}), ...(v.kind === 'areas' ? { counties: [].concat(v.counties || []).map(str).filter(Boolean), towns: [].concat(v.towns || []).map(str).filter(Boolean) } : {}) }; v = json(v); }
      else if (col === 'sender_domains' || col === 'fields') v = v == null || v === '' ? null : json(typeof v === 'string' ? parse(v) : v);
      else if (col === 'skip_for_service_area' || col === 'needs_live_check') v = v === true || v === 'true' || v === 1 || v === '1';
      else v = str(v);
      out[col] = v;
    }
    if (out.name === '') bad.push('name is required');
    if ('url' in out && out.url && !/^https?:\/\//i.test(out.url) && !out.url.includes('<')) bad.push('url must start with http:// or https://');
    if ('url' in out && !('domain' in data)) out.domain = Seed.domainOf(out.url);
    if (bad.length) throw Object.assign(new Error(bad.join('; ')), { status: 400 });
    return out;
  }

  async function create(data) {
    const v = validate({ cost: 'paid', priority: 'P3', verification_method: 'unknown', done_by: 'va', applies_to: { kind: 'all' }, url: '', ...data });
    let key = Seed.slugify(v.name) || 'directory';
    for (let i = 2; await byKey(key); i++) key = `${Seed.slugify(v.name)}-${i}`;
    const cols = Object.keys(v);
    await pool.query(`INSERT INTO citation_directories (key, ${cols.join(', ')}, seeded, hand_edited) VALUES ($1, ${cols.map((_, i) => '$' + (i + 2)).join(', ')}, FALSE, TRUE)`, [key, ...cols.map(c => v[c])]);
    return byKey(key);
  }
  async function update(id, data, { now = new Date() } = {}) {
    const v = validate(data, { partial: true });
    const cols = Object.keys(v);
    if (!cols.length) return get(id);
    const { rows } = await pool.query(`UPDATE citation_directories SET ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')}, hand_edited = TRUE, updated_at = $${cols.length + 2} WHERE id = $1 RETURNING id`, [id, ...cols.map(c => v[c]), now]);
    if (!rows.length) throw Object.assign(new Error('Directory not found.'), { status: 404 });
    return get(id);
  }
  async function retire(id, reason = '', { now = new Date() } = {}) {
    const { rows } = await pool.query(`UPDATE citation_directories SET retired_at = $2, retired_reason = $3, hand_edited = TRUE, updated_at = $2 WHERE id = $1 RETURNING id`, [id, now, str(reason) || 'Retired by hand']);
    if (!rows.length) throw Object.assign(new Error('Directory not found.'), { status: 404 });
    return get(id);
  }
  async function unretire(id, { now = new Date() } = {}) {
    const { rows } = await pool.query(`UPDATE citation_directories SET retired_at = NULL, retired_reason = NULL, hand_edited = TRUE, updated_at = $2 WHERE id = $1 RETURNING id`, [id, now]);
    if (!rows.length) throw Object.assign(new Error('Directory not found.'), { status: 404 });
    return get(id);
  }

  // ── Places ──
  async function placesByNames(names) {
    const norms = [...new Set((names || []).map(normaliseName).filter(Boolean))];
    if (!norms.length) return [];
    const { rows } = await pool.query(`SELECT * FROM citation_places WHERE name_norm IN (${norms.map((_, i) => '$' + (i + 1)).join(', ')})`, norms);
    return rows.map(typedPlace);
  }
  async function countiesForCouncils(councils) {
    const { rows } = await pool.query(`SELECT * FROM citation_places WHERE type = 'county'`);
    const want = new Set((councils || []).map(normaliseName).filter(Boolean));
    return rows.map(typedPlace).filter(p => p.councils.some(c => want.has(normaliseName(c))));
  }

  async function costs({ clientId = null, limit = 50 } = {}) {
    const { rows } = await pool.query(`SELECT id, at, kind, client_id, cost_usd, calls, detail FROM citation_api_costs ${clientId ? 'WHERE client_id = $1' : ''} ORDER BY at DESC LIMIT ${Math.max(1, Math.min(500, limit | 0))}`, clientId ? [clientId] : []);
    return rows.map(r => ({ ...r, cost_usd: Number(r.cost_usd), calls: Number(r.calls), detail: parse(r.detail) }));
  }

  return { ensure: () => ensureCitationTables(pool), seedDirectories, seedState, fillDa, list, get, byKey, byDomain, domains, create, update, retire, unretire, validate, placesByNames, countiesForCouncils, logCost, costs, typed, pool };
}

module.exports = { ensureCitationTables, createCitationStore, typed, typedPlace, SEED_COLUMNS, HAND_COLUMNS };
