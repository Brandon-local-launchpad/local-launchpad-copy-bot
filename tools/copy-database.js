'use strict';

// ── Copy one Postgres database into another, table by table (27 Oct 2026) ──────
// For a preview environment: production's data into the preview's own Postgres so
// the preview shows the real clients. No pg_dump on this machine, so it reads every
// table in the public schema from the source and writes it to the target with the
// pg driver. The target's tables are emptied first (TRUNCATE ... CASCADE), then the
// rows go in, in an order that respects the foreign keys. The source is only read.
//
//   node tools/copy-database.js --from "<source DATABASE_URL>" --to "<target DATABASE_URL>" [--yes]
//
// Without --yes it prints the tables and row counts and writes nothing. It refuses
// to write when the target URL is the source URL, or when the target looks like the
// production database named in .env (DATABASE_URL) unless --allow-production is passed.

const path = require('path');
const { Pool } = require('pg');

function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; }
const has = name => process.argv.includes(name);

async function tablesInOrder(pool) {
  const { rows: tables } = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`);
  const { rows: fks } = await pool.query(`
    SELECT tc.table_name AS child, ccu.table_name AS parent
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
     WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'`);
  const names = tables.map(t => t.table_name);
  const parents = new Map(names.map(n => [n, new Set()]));
  for (const f of fks) if (f.child !== f.parent && parents.has(f.child)) parents.get(f.child).add(f.parent);
  // Parents first
  const out = [], seen = new Set();
  const visit = (n, stack = new Set()) => { if (seen.has(n)) return; if (stack.has(n)) return; stack.add(n); for (const p of parents.get(n) || []) visit(p, stack); seen.add(n); out.push(n); };
  for (const n of names) visit(n);
  return out;
}

async function copy({ from, to, write = false, batch = 200, log = console.log }) {
  const src = new Pool({ connectionString: from, ssl: { rejectUnauthorized: false } });
  const dst = new Pool({ connectionString: to, ssl: { rejectUnauthorized: false } });
  try {
    const order = await tablesInOrder(src);
    const { rows: dstTables } = await dst.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`);
    const dstSet = new Set(dstTables.map(t => t.table_name));
    const plan = [];
    for (const t of order) {
      const { rows: [{ n }] } = await src.query(`SELECT COUNT(*)::int AS n FROM "${t}"`);
      plan.push({ table: t, rows: n, inTarget: dstSet.has(t) });
    }
    log(`${plan.length} tables in the source; ${plan.filter(p => !p.inTarget).length} missing in the target (start the app against the target once to create them)`);
    for (const p of plan) log(`  ${p.table.padEnd(32)} ${String(p.rows).padStart(7)} rows${p.inTarget ? '' : '  (NOT in target: skipped)'}`);
    if (!write) { log('\nDry run: nothing written. Add --yes to copy.'); return { plan, written: false }; }
    const todo = plan.filter(p => p.inTarget);
    // Empty the target tables (children first, cascade covers the rest)
    await dst.query(`TRUNCATE ${todo.map(p => `"${p.table}"`).join(', ')} CASCADE`);
    let total = 0;
    for (const p of todo) {
      const { rows: cols } = await src.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`, [p.table]);
      const { rows: dcols } = await dst.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`, [p.table]);
      const dset = new Set(dcols.map(c => c.column_name));
      const names = cols.map(c => c.column_name).filter(c => dset.has(c));
      let offset = 0, copied = 0;
      for (;;) {
        const { rows } = await src.query(`SELECT ${names.map(c => `"${c}"`).join(', ')} FROM "${p.table}" LIMIT ${batch} OFFSET ${offset}`);
        if (!rows.length) break;
        const values = [], params = [];
        for (const r of rows) { const ph = []; for (const c of names) { params.push(r[c] !== null && typeof r[c] === 'object' && !Buffer.isBuffer(r[c]) && !(r[c] instanceof Date) ? JSON.stringify(r[c]) : r[c]); ph.push(`$${params.length}`); } values.push(`(${ph.join(', ')})`); }
        await dst.query(`INSERT INTO "${p.table}" (${names.map(c => `"${c}"`).join(', ')}) VALUES ${values.join(', ')}`, params);
        copied += rows.length; offset += rows.length;
        if (rows.length < batch) break;
      }
      total += copied;
      log(`  copied ${p.table}: ${copied}`);
    }
    log(`\nDone: ${total} rows into the target.`);
    return { plan, written: true, total };
  } finally { await src.end(); await dst.end(); }
}

if (require.main === module) {
  (async () => {
    const from = arg('--from') || process.env.COPY_FROM;
    const to = arg('--to') || process.env.COPY_TO;
    if (!from || !to) { console.error('Usage: node tools/copy-database.js --from "<source url>" --to "<target url>" [--yes]'); process.exit(2); }
    if (from === to) { console.error('The target is the source. Nothing done.'); process.exit(2); }
    try {
      const env = require('fs').readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
      const m = env.match(/^DATABASE_URL=(.+)$/m);
      if (m && m[1].trim() === to && !has('--allow-production')) { console.error('The target is the production database named in .env. Refused.'); process.exit(2); }
    } catch (_) {}
    await copy({ from, to, write: has('--yes') });
  })().catch(e => { console.error('Copy failed:', e.message); process.exit(1); });
}

module.exports = { copy, tablesInOrder };
