'use strict';
// Fills the hand-made client "ednes edge testing" with the Edens Edge fixture:
// niche, service ticks, base town, other towns and company name, all saved as
// hand edits (source manual) so a Reprocess or a later form never overwrites them.
// Writes client_fields only. Never reads or writes pages, v20 records or the page map.
//
//   node tools/seed-edens-edge.js            dry run: prints what would change
//   node tools/seed-edens-edge.js --write    applies it (safe to run again)
//
// Needs DATABASE_URL (the Railway Postgres public URL) in .env or the environment.

const path = require('path');
const root = path.join(__dirname, '..');
try { require('fs').readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/).forEach(l => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, ''); }); } catch (_) {}

const R = require(path.join(root, 'fillout/services/resolver.js'));
const TICKS = require(path.join(root, 'tests/fixtures/data/edens-edge-ticks.js'));

const CLIENT_NAME = 'ednes edge testing';
const NICHE = 'Landscapers/Gardeners';
const BASE_TOWN = 'Southampton';
const OTHER_TOWNS = ['Romsey', 'Winchester', 'Eastleigh', 'Chandlers Ford', 'Ampfield', 'Stockbridge', 'Awbridge', 'Chilworth', 'Hedge End', 'Lyndhurst', 'New Forest District', 'Lockerley', 'Kings Worthy'];
const COMPANY = 'Edens Edge landscaping';

// The values to set, in the order they must be set (the niche first, so the tick fields exist)
function targets() {
  const config = R.loadConfig('landscapers-gardeners');
  return [
    ['niche', NICHE],
    ...config.categories.map(c => [c.tickGroup, TICKS[c.tickGroup] || []]),
    ['primary_town', BASE_TOWN],
    ['other_areas', OTHER_TOWNS.join('\n')],
    ['business_name', COMPANY],
  ];
}

const norm = v => JSON.stringify(v == null || (Array.isArray(v) && !v.length) || v === '' ? null : v);
const short = v => { const s = Array.isArray(v) ? `[${v.length}] ${v.slice(0, 3).join(', ')}${v.length > 3 ? ', …' : ''}` : String(v == null ? '(blank)' : v).replace(/\n/g, ' | '); return s.length > 90 ? s.slice(0, 87) + '…' : s; };

// pool: a pg Pool; returns { client, changes, unchanged, pagesBefore, pagesAfter }
async function seed(pool, { write = false, log = console.log } = {}) {
  const { createFilloutService } = require(path.join(root, 'fillout/service.js'));
  const svc = createFilloutService({ pool, audioStore: { put() { throw new Error('not used'); }, get() { return null; } }, log: { log() {}, info() {}, warn() {}, error() {} } });
  const { rows: found } = await pool.query(`SELECT id, name, trade FROM clients`);
  const hits = found.filter(c => String(c.name).trim().toLowerCase() === CLIENT_NAME);
  if (hits.length !== 1) throw new Error(`Expected one client named "${CLIENT_NAME}", found ${hits.length}`);
  const client = hits[0];
  const pagesCount = async () => (await pool.query(`SELECT COUNT(*)::int AS n FROM pages WHERE client_id = $1`, [client.id]).catch(() => ({ rows: [{ n: null }] }))).rows[0].n;
  const pagesBefore = await pagesCount();
  const { rows: subs } = await pool.query(`SELECT COUNT(*)::int AS n FROM fillout_submissions WHERE client_id = $1`, [client.id]);
  log(`Client: ${client.name} (${client.id}), trade "${client.trade}", Fillout submissions: ${subs[0].n}, pages (left alone): ${pagesBefore}`);
  if (subs[0].n) log('Note: this client has a Fillout record; hand edits still win over it.');

  const changes = [], unchanged = [];
  for (const [key, want] of targets()) {
    const rec = await svc.record(client.id);
    const f = rec.sections.flatMap(s => s.fields).find(x => x.key === key);
    const have = f ? f.value : null;
    const source = f ? f.source : '(no field yet)';
    if (f && norm(have) === norm(want) && source === 'manual') { unchanged.push(key); continue; }
    changes.push({ key, from: have, fromSource: source, to: want });
    log(`  ${write ? 'SET ' : 'would set'} ${key}: ${short(have)} (${source}) -> ${short(want)} (manual)`);
    if (write) await svc.setField(client.id, key, want);
    else if (key === 'niche' && (!f || norm(have) !== norm(want))) {
      // The tick fields only exist once the niche is set, so a dry run reads the rest as they stand
      for (const [k, w] of targets().slice(1)) {
        const g = rec.sections.flatMap(s => s.fields).find(x => x.key === k);
        if (g && norm(g.value) === norm(w) && g.source === 'manual') { unchanged.push(k); continue; }
        changes.push({ key: k, from: g ? g.value : null, fromSource: g ? g.source : '(no field yet)', to: w });
        log(`  would set ${k}: ${short(g ? g.value : null)} (${g ? g.source : 'no field yet'}) -> ${short(w)} (manual)`);
      }
      break;
    }
  }
  const pagesAfter = await pagesCount();
  log(`${write ? 'Changed' : 'Would change'} ${changes.length} field(s); ${unchanged.length} already set. Pages before ${pagesBefore}, after ${pagesAfter}.`);
  return { client, changes, unchanged, pagesBefore, pagesAfter };
}

module.exports = { seed, targets, CLIENT_NAME, BASE_TOWN, OTHER_TOWNS, COMPANY, NICHE };

if (require.main === module) {
  (async () => {
    if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set (add the Railway Postgres public URL to .env).'); process.exit(1); }
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const write = process.argv.includes('--write');
    console.log(write ? 'WRITING' : 'DRY RUN (add --write to apply)');
    try { await seed(pool, { write }); } finally { await pool.end(); }
  })().catch(e => { console.error(e.message); process.exit(1); });
}
