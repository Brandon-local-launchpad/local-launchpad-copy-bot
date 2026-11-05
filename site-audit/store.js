'use strict';

// ── Site audit tables ─────────────────────────────────────────────────────────────
// Add only, created at start-up, safe to run twice. One scan per run; a row per URL, per link and
// per keyword within it. A person's work sits in site_url_decisions, per client and URL, so it
// survives a rescan. The spend goes in citation_api_costs (kind site_scan) with the other
// DataForSEO spend. The later stages add their own tables.

const TABLES = {
  site_scans: `
    CREATE TABLE IF NOT EXISTS site_scans (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      status      TEXT NOT NULL DEFAULT 'running',
      phase       TEXT NOT NULL DEFAULT 'starting',
      target      TEXT NOT NULL,
      current_url TEXT,
      pages_done  INTEGER NOT NULL DEFAULT 0,
      pages_total INTEGER NOT NULL DEFAULT 0,
      platform    TEXT,
      platform_evidence JSONB,
      state       JSONB NOT NULL DEFAULT '{}',
      settings    JSONB NOT NULL DEFAULT '{}',
      summary     JSONB,
      issues      JSONB,
      warnings    JSONB,
      benchmark   TEXT,
      cost_usd    NUMERIC NOT NULL DEFAULT 0,
      calls       INTEGER NOT NULL DEFAULT 0,
      error       TEXT,
      started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ
    );`,
  site_scan_urls: `
    CREATE TABLE IF NOT EXISTS site_scan_urls (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      scan_id        UUID NOT NULL REFERENCES site_scans(id) ON DELETE CASCADE,
      client_id      UUID NOT NULL,
      url            TEXT NOT NULL,
      path           TEXT NOT NULL DEFAULT '',
      kind           TEXT NOT NULL DEFAULT 'page',
      sources        JSONB NOT NULL DEFAULT '[]',
      priority       INTEGER NOT NULL DEFAULT 2,
      fetch_state    TEXT NOT NULL DEFAULT 'pending',
      fetch_error    TEXT,
      status_code    INTEGER,
      redirect_target TEXT,
      redirect_chain JSONB,
      canonical      TEXT,
      noindex        BOOLEAN NOT NULL DEFAULT FALSE,
      title          TEXT,
      h1             TEXT,
      meta_description TEXT,
      word_count     INTEGER,
      low_text       BOOLEAN NOT NULL DEFAULT FALSE,
      main_text      TEXT,
      facts          JSONB,
      links_out      JSONB,
      summary_rd     INTEGER,
      inlinks        INTEGER NOT NULL DEFAULT 0,
      orphan         BOOLEAN NOT NULL DEFAULT FALSE,
      clicks         NUMERIC NOT NULL DEFAULT 0,
      impressions    NUMERIC NOT NULL DEFAULT 0,
      est_traffic    NUMERIC NOT NULL DEFAULT 0,
      keywords_count INTEGER NOT NULL DEFAULT 0,
      all_rd         INTEGER NOT NULL DEFAULT 0,
      real_rd        INTEGER NOT NULL DEFAULT 0,
      matters        BOOLEAN NOT NULL DEFAULT FALSE,
      matters_why    JSONB,
      injected       BOOLEAN NOT NULL DEFAULT FALSE,
      top20          BOOLEAN NOT NULL DEFAULT FALSE,
      top20_why      TEXT,
      top_searches   JSONB,
      UNIQUE (scan_id, url)
    );`,
  site_scan_backlinks: `
    CREATE TABLE IF NOT EXISTS site_scan_backlinks (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      scan_id        UUID NOT NULL REFERENCES site_scans(id) ON DELETE CASCADE,
      url            TEXT NOT NULL,
      domain_from    TEXT NOT NULL,
      url_from       TEXT,
      anchor         TEXT,
      spam_score     INTEGER,
      domain_rank    INTEGER,
      external_links INTEGER,
      dofollow       BOOLEAN NOT NULL DEFAULT FALSE
    );`,
  site_scan_keywords: `
    CREATE TABLE IF NOT EXISTS site_scan_keywords (
      id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      scan_id   UUID NOT NULL REFERENCES site_scans(id) ON DELETE CASCADE,
      url       TEXT NOT NULL,
      keyword   TEXT NOT NULL,
      position  INTEGER,
      etv       NUMERIC NOT NULL DEFAULT 0,
      volume    INTEGER
    );`,
  site_url_decisions: `
    CREATE TABLE IF NOT EXISTS site_url_decisions (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      url              TEXT NOT NULL,
      matters_override BOOLEAN,
      override_note    TEXT,
      suggested_decision TEXT,
      suggested_reason TEXT,
      suggested_new_url TEXT,
      suggested_redirect TEXT,
      suggested_page_key TEXT,
      proposal         JSONB,
      proposal_declined BOOLEAN NOT NULL DEFAULT FALSE,
      no_action        BOOLEAN NOT NULL DEFAULT FALSE,
      needs_page       BOOLEAN NOT NULL DEFAULT FALSE,
      needs_check      BOOLEAN NOT NULL DEFAULT FALSE,
      decision         TEXT,
      new_url          TEXT,
      redirect_type    TEXT,
      hand_note        TEXT,
      lifted_note      TEXT,
      by_hand          BOOLEAN NOT NULL DEFAULT FALSE,
      approved_at      TIMESTAMPTZ,
      approved_by      TEXT,
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (client_id, url)
    );`,
  site_redirect_checks: `
    CREATE TABLE IF NOT EXISTS site_redirect_checks (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      kind       TEXT NOT NULL,
      site       TEXT,
      block      INTEGER NOT NULL DEFAULT 0,
      warn       INTEGER NOT NULL DEFAULT 0,
      result     JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
  site_audit_settings: `
    CREATE TABLE IF NOT EXISTS site_audit_settings (
      client_id  UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
      settings   JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
  site_search_console: `
    CREATE TABLE IF NOT EXISTS site_search_console (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      kind        TEXT NOT NULL,
      filename    TEXT,
      rows        JSONB NOT NULL DEFAULT '[]',
      date_range  TEXT,
      problems    JSONB,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (client_id, kind)
    );`,
};

async function exists(pool, table) {
  try { await pool.query(`SELECT 1 FROM ${table} LIMIT 1`); return true; }
  catch (_) { return false; } // not there yet: the caller creates it
}

async function ensureSiteAuditTables(pool) {
  for (const [table, sql] of Object.entries(TABLES)) {
    if (!(await exists(pool, table))) await pool.query(sql);
  }
  for (const idx of [
    'CREATE INDEX IF NOT EXISTS site_scans_client ON site_scans (client_id, started_at)',
    'CREATE INDEX IF NOT EXISTS site_scan_backlinks_scan ON site_scan_backlinks (scan_id, url)',
    'CREATE INDEX IF NOT EXISTS site_scan_keywords_scan ON site_scan_keywords (scan_id, url)',
  ]) {
    try { await pool.query(idx); }
    catch (e) { if (!/not supported|already exists/i.test(e.message)) throw e; } // pg-mem on a second run
  }
}

module.exports = { ensureSiteAuditTables, TABLES };
