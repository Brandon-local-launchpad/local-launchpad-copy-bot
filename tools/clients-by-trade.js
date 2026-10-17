'use strict';
// Lists the distinct trade / niche values on the clients table with counts, split by
// where the client came from (hand-made or Fillout) and whether it is archived.
//   node tools/clients-by-trade.js
// Reads DATABASE_URL from .env. Read-only.

const path = require('path');
try {
  require('fs').readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  });
} catch (_) {}
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set'); process.exit(2); }
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const { rows } = await pool.query(`SELECT trade, source, archived_at IS NOT NULL AS archived, COUNT(*)::int AS n FROM clients GROUP BY trade, source, archived ORDER BY trade, source`);
  const byTrade = new Map();
  for (const r of rows) {
    const t = byTrade.get(r.trade) || { total: 0, fillout: 0, hand: 0, archived: 0 };
    t.total += r.n; if (r.source === 'fillout') t.fillout += r.n; else t.hand += r.n; if (r.archived) t.archived += r.n;
    byTrade.set(r.trade, t);
  }
  console.log('trade | total | hand-made | from Fillout | archived');
  for (const [trade, t] of [...byTrade].sort((a, b) => b[1].total - a[1].total)) console.log(`${trade} | ${t.total} | ${t.hand} | ${t.fillout} | ${t.archived}`);
  console.log(`\n${byTrade.size} distinct values, ${[...byTrade.values()].reduce((n, t) => n + t.total, 0)} clients`);
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
