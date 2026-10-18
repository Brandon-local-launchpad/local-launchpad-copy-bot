'use strict';
// The page map for one client from the command line, through the same store the
// app uses (page-map/store.js). Dry run by default: prints would add / would
// retire / would update / unchanged and writes nothing. --write regenerates
// (adds pages, retires the rest with applies=false, never deletes, never touches
// a person's H1, meta, status or notes).
//
//   node tools/page-map-cli.js "<client name>"|<client id> [--rule ticked_only|ticked_or_propagated] [--write]
//
// The rule defaults to the one the client's map was last generated with, else ticked_only.
// Needs DATABASE_URL in .env or the environment.

const path = require('path');
const root = path.join(__dirname, '..');
try { require('fs').readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/).forEach(l => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, ''); }); } catch (_) {}

const { createFilloutService } = require(path.join(root, 'fillout/service.js'));
const { createPageMapStore, ensurePageMapTables } = require(path.join(root, 'page-map/store.js'));

async function run(pool, { client: who, rule = null, write = false, log = console.log }) {
  const svc = createFilloutService({ pool, audioStore: { put() { throw new Error('not used'); }, get() { return null; } }, log: { log() {}, info() {}, warn() {}, error() {} } });
  const store = createPageMapStore({ pool, filloutService: svc });
  const { rows: cs } = await pool.query(`SELECT id, name FROM clients`);
  const hits = cs.filter(c => c.id === who || String(c.name).trim().toLowerCase() === String(who).trim().toLowerCase());
  if (hits.length !== 1) throw new Error(`Expected one client matching "${who}", found ${hits.length}`);
  const client = hits[0];
  if (write) await ensurePageMapTables(pool);
  const st = await store.state(client.id);
  const categoryTabRule = rule || (st && st.category_tab_rule) || 'ticked_only';
  const before = await store.saved(client.id);
  const p = await store.preview(client.id, { categoryTabRule });
  log(`${write ? 'WRITING' : 'DRY RUN (add --write to apply)'}: ${client.name} (${client.id}), rule ${categoryTabRule}`);
  if (!p.plan.ok) { log('Not ready: ' + p.plan.problems.map(x => x.msg).join(' ')); return { client, preview: p }; }
  const c = p.diff.counts;
  log(`Plan: ${p.plan.arithmetic}`);
  log(`Would add ${c.wouldAdd} · would retire ${c.wouldRetire} · would update ${c.wouldUpdate} · unchanged ${c.unchanged}${c.alreadyRetired ? ` · already retired ${c.alreadyRetired}` : ''}`);
  if (p.diff.add.length || p.diff.revive.length) log('  add: ' + [...p.diff.add.map(r => r.title), ...p.diff.revive.map(x => x.row.title)].join(', '));
  if (p.diff.retire.length) log('  retire (kept, tagged "no longer applies"): ' + p.diff.retire.map(r => `${r.title} (${r.slug})`).join(', '));
  if (p.diff.update.length) log('  update (links or auto H1 only): ' + p.diff.update.map(u => `${u.row.title} [${Object.keys(u.changes).join(', ')}]`).join('; '));
  for (const r of p.diff.renames) log('  ' + r.msg);
  if (p.diff.retiringWorkedOn.length) log('  retiring pages someone worked on: ' + p.diff.retiringWorkedOn.map(r => `${r.title} (${r.status})`).join(', '));
  if (!write) return { client, preview: p, before };
  await store.generate(client.id, { categoryTabRule });
  const after = await store.saved(client.id);
  log(`Written: ${after.length} rows, ${after.filter(r => r.applies).length} applying, ${after.filter(r => !r.applies).length} no longer apply`);
  return { client, preview: p, before, after };
}

module.exports = { run };

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const write = args.includes('--write');
    const ri = args.indexOf('--rule');
    const rule = ri >= 0 ? args[ri + 1] : null;
    const who = args.filter((a, i) => !a.startsWith('--') && (ri < 0 || i !== ri + 1))[0];
    if (!who) { console.error('Usage: node tools/page-map-cli.js "<client name>"|<client id> [--rule ticked_only|ticked_or_propagated] [--write]'); process.exit(2); }
    if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set (add the Railway Postgres public URL to .env).'); process.exit(1); }
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    try { await run(pool, { client: who, rule, write }); } finally { await pool.end(); }
  })().catch(e => { console.error(e.message); process.exit(1); });
}
