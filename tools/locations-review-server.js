'use strict';
// A local server for the Location Determiner review screen only: the static pages and the
// locations API on the database in .env (the live one, when .env points there). No schedulers,
// no webhooks, no other routes, so nothing else runs or spends. For looking at and reviewing a
// client's run from this machine; the live app serves the same page at /locations.html.
//   node tools/locations-review-server.js          http://localhost:3993/locations.html?id=<client>
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '..');
try {
  fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/).forEach(line => { const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim(); });
} catch (_) {}
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set'); process.exit(1); }
const express = require('express');
const { Pool } = require('pg');
const { createFilloutService } = require(path.join(root, 'fillout/service.js'));
const { createPgAudioStore } = require(path.join(root, 'fillout/audio-store.js'));
const { mountLocationsApi } = require(path.join(root, 'locations/routes.js'));

const PORT = Number(process.env.REVIEW_PORT || 3993);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(root, 'public')));
const filloutService = createFilloutService({ pool, audioStore: createPgAudioStore(pool), log: console });
app.get('/api/clients', async (_req, res) => { try { const { rows } = await pool.query(`SELECT id, name, trade FROM clients WHERE archived_at IS NULL ORDER BY name`); res.json(rows); } catch (e) { res.status(500).json({ error: e.message }); } });
app.get('/api/clients/:id', async (req, res) => { try { const { rows } = await pool.query(`SELECT id, name, trade, source FROM clients WHERE id = $1`, [req.params.id]); if (!rows[0]) return res.status(404).json({ error: 'Client not found' }); res.json(rows[0]); } catch (e) { res.status(500).json({ error: e.message }); } });
mountLocationsApi(app, { pool, filloutService });
app.listen(PORT, () => console.log(`Locations review at http://localhost:${PORT}/locations.html?id=<client>`));
