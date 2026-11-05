#!/usr/bin/env node
'use strict';

// ── A test client for the first real redirect push ────────────────────────────────
//   node tools/site-audit-test-client.js              what it would do. Writes nothing
//   node tools/site-audit-test-client.js --create     makes it on the live database
//   node tools/site-audit-test-client.js --archive    archives it when the test is over
//
// Edens Edge has no old site (edensedge.co.uk's nameservers refuse queries, 5 Nov 2026), so it has no
// URLs to redirect, and setting its live domain to another site would put that site on its NAP and
// citations. So the test has its own client: "Site audit test (Southampton Homes)". Its old site is
// southamptonhomes.co.uk, its Page Map is a copy of Edens Edge's, and its WordPress connection is a
// copy of Edens Edge's staging connection, marked staging. The stored password is copied still
// encrypted, so it is never read here. Edens Edge's own record isn't touched.

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
for (const line of (fs.existsSync(path.join(root, '.env')) ? fs.readFileSync(path.join(root, '.env'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const NAME = 'Site audit test (Southampton Homes)';
const LIVE = 'https://southamptonhomes.co.uk';
const SOURCE = 'ednes edge testing';
const create = process.argv.includes('--create');
const archive = process.argv.includes('--archive');

(async () => {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const { rows: src } = await pool.query(`SELECT id, trade FROM clients WHERE name = $1`, [SOURCE]);
  if (!src.length) throw new Error(`No client called "${SOURCE}".`);
  const from = src[0];
  const { rows: conn } = await pool.query(`SELECT url, wp_user, app_password_enc, staging, seo, homepage_slug FROM wp_connections WHERE client_id = $1`, [from.id]);
  if (!conn.length || !conn[0].staging) throw new Error(`${SOURCE} has no staging connection to copy.`);
  const { rows: map } = await pool.query(`SELECT page_key, type, title, slug, h1, h1_source, status, applies, info, sort_order FROM client_page_map WHERE client_id = $1 AND applies = TRUE`, [from.id]);
  const { rows: st } = await pool.query(`SELECT inputs FROM client_page_map_state WHERE client_id = $1`, [from.id]);
  const { rows: ex } = await pool.query(`SELECT id, archived_at FROM clients WHERE name = $1`, [NAME]);
  console.log(`From ${SOURCE}: ${map.length} Page Map rows, staging connection ${conn[0].url}.`);
  console.log(ex.length ? `Test client exists: ${ex[0].id}${ex[0].archived_at ? ' (archived)' : ''}` : 'Test client does not exist yet.');

  if (archive) {
    if (!ex.length) throw new Error('There is no test client to archive.');
    await pool.query(`UPDATE clients SET archived_at = NOW() WHERE id = $1`, [ex[0].id]);
    console.log('Archived.');
  } else if (create) {
    if (ex.length) { console.log(`Nothing to do. Open /clients/${ex[0].id}/site-audit`); await pool.end(); return; }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(`INSERT INTO clients (name, trade) VALUES ($1, $2) RETURNING id`, [NAME, from.trade]);
      const id = rows[0].id;
      await client.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'client_values', 'client-values.json', $2)`, [id, JSON.stringify({ company_name: 'Southampton Homes Ltd', live_domain: LIVE })]);
      for (const r of map) await client.query(`INSERT INTO client_page_map (client_id, page_key, type, title, slug, h1, h1_source, status, applies, info, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, $10)`, [id, r.page_key, r.type, r.title, r.slug, r.h1 || '', r.h1_source || 'needed', r.status || 'Not Started', JSON.stringify(r.info || {}), r.sort_order]);
      await client.query(`INSERT INTO client_page_map_state (client_id, generated_at, inputs) VALUES ($1, NOW(), $2)`, [id, JSON.stringify((st[0] && st[0].inputs) || { baseTown: 'Southampton' })]);
      await client.query(`INSERT INTO wp_connections (client_id, url, wp_user, app_password_enc, staging, seo, homepage_slug) VALUES ($1, $2, $3, $4, TRUE, $5, $6)`, [id, conn[0].url, conn[0].wp_user, conn[0].app_password_enc, conn[0].seo, conn[0].homepage_slug]);
      await client.query('COMMIT');
      console.log(`Made it. Open /clients/${id}/site-audit`);
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  } else {
    console.log('Dry run: nothing written. Use --create to make it.');
  }
  await pool.end();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
