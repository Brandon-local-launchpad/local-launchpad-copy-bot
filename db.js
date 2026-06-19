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
  `);
  console.log('DB schema ready');
}

module.exports = { pool, initDb };
