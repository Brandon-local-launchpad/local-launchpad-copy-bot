'use strict';

const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null;

async function initDb() {
  if (!pool) { console.log('No DATABASE_URL — DB disabled (local mode)'); return; }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        TEXT NOT NULL,
      trade       TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS client_assets (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      asset_type   TEXT NOT NULL,
      filename     TEXT,
      content      TEXT NOT NULL,
      uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pages (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      page_type     TEXT NOT NULL,
      page_title    TEXT NOT NULL,
      url_slug      TEXT,
      h1            TEXT,
      copy_output   TEXT,
      issues        JSONB DEFAULT '[]',
      generated_at  TIMESTAMPTZ,
      edited_at     TIMESTAMPTZ,
      UNIQUE(client_id, url_slug)
    );

    CREATE TABLE IF NOT EXISTS batch_jobs (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id           UUID REFERENCES clients(id) ON DELETE SET NULL,
      anthropic_batch_id  TEXT NOT NULL,
      trade               TEXT,
      jobs_meta           JSONB NOT NULL,
      custom_values_text  TEXT,
      skipped_pages       JSONB NOT NULL DEFAULT '[]',
      company_name        TEXT,
      total               INTEGER NOT NULL,
      status              TEXT NOT NULL DEFAULT 'in_progress',
      download_id         TEXT,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at        TIMESTAMPTZ
    );

    ALTER TABLE client_assets ADD COLUMN IF NOT EXISTS metadata JSONB;

    CREATE TABLE IF NOT EXISTS client_locations (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      location_name_norm    TEXT NOT NULL,
      location_name_display TEXT NOT NULL,
      code                  TEXT NOT NULL,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(client_id, location_name_norm)
    );

    CREATE TABLE IF NOT EXISTS research_jobs (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id  TEXT NOT NULL,
      client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status      TEXT NOT NULL DEFAULT 'pending',
      preset      TEXT NOT NULL DEFAULT 'medium',
      locations   JSONB NOT NULL DEFAULT '{}'::jsonb
    );
  `);
  console.log('DB schema ready');
}

module.exports = { pool, initDb };
