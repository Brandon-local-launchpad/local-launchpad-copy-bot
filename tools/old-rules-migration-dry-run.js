'use strict';
// Old-rules migration dry run for one client: what the automatic migration (page map v3 rebuild
// plus H1 research, applied without confirmation to pages at Not Started or H1 Added whose H1 is
// not manual) would create, retire and change. Reads only; at most one DataForSEO call for
// uncached keywords, nothing stored.
//
//   node tools/old-rules-migration-dry-run.js "<client name>"|<client id>

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
try { fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/).forEach(l => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, ''); }); } catch (_) {}
const G = require(path.join(root, 'page-map/generator.js'));
const { retiredReason } = require(path.join(root, 'page-map/store.js'));
const { dryRun } = require(path.join(root, 'tools/page-map-v3-dry-run.js'));

const LABEL = G.TYPE_LABEL;
// Old-rules research: a v1 "suggested" row, or an empty row v1 researched and left "needed"
const oldRules = r => r.h1_source === 'suggested' || (r.h1_source === 'needed' && r.h1_researched_at);
const editable = r => r.h1_source !== 'manual' && ['Not Started', 'H1 Added'].includes(r.status);

async function migrationDryRun(pool, who) {
  const r = await dryRun(pool, who);
  const diff = G.diffPlan(r.saved, r.plan.rows);
  const savedBy = new Map(r.saved.map(x => [x.page_key, x]));
  const created = diff.add.map(p => ({ page: `${LABEL[p.type]} "${p.title}"`, slug: p.slug, h1: p.h1, why: 'new in the current plan' }));
  const revived = diff.revive.map(x => ({ page: `${LABEL[x.row.type]} "${x.row.title}"`, slug: x.row.slug, why: 'back in the plan (its retired row comes back with what was on it)' }));
  const retired = diff.retire.map(x => ({ page: `${LABEL[x.type]} "${x.title}"`, slug: x.slug, status: x.status, h1: x.h1, why: retiredReason(x, r.plan) }));
  const changed = [], untouched = [], notes = [];
  for (const p of r.plan.rows) {
    const s = savedBy.get(p.page_key);
    if (!s) continue;
    const d = r.decisions.get(p.page_key);
    if (!d) continue;
    if (!editable(s)) {
      untouched.push({ page: `${LABEL[s.type]} "${s.title}"`, h1: s.h1, why: s.h1_source === 'manual' ? 'manual H1' : `status ${s.status}` });
      if (d.suggests) notes.push({ page: `${LABEL[s.type]} "${s.title}"`, h1: s.h1, suggests: d.suggests });
      continue;
    }
    if (!['research', 'pattern', 'conflict'].includes(d.source)) continue;
    if ((s.h1 || '') !== (d.h1 || '') || s.h1_source !== d.source) changed.push({ page: `${LABEL[s.type]} "${s.title}"`, from: s.h1 || '(empty)', fromSource: s.h1_source, to: d.h1 || '(empty)', toSource: d.source, volume: d.volume, old: oldRules(s), why: d.reason });
  }
  return { r, diff, created, revived, retired, changed, untouched, notes, oldCount: r.saved.filter(x => x.applies && oldRules(x)).length };
}

function report(m) {
  const L = [];
  const { r } = m;
  L.push(`# Old-rules migration dry run: ${r.client.name} (${new Date().toISOString().slice(0, 10)})`, '');
  L.push(`${r.saved.filter(x => x.applies).length} pages now, ${m.oldCount} with old-rules research · ${r.keywords.total} keywords: ${r.keywords.cached} cached, ${r.keywords.fetched} fetched, cost $${r.cost.toFixed(2)} · nothing written`, '');
  L.push(`## Pages created (${m.created.length})`, '', ...(m.created.length ? ['| Page | Slug |', '|---|---|', ...m.created.map(c => `| ${c.page} | ${c.slug} |`)] : ['- none']), '');
  if (m.revived.length) L.push(`## Pages revived (${m.revived.length})`, '', ...m.revived.map(c => `- ${c.page} (${c.slug}): ${c.why}`), '');
  L.push(`## Pages retired (${m.retired.length})`, '', ...(m.retired.length ? ['| Page | Status | H1 now | Why |', '|---|---|---|---|', ...m.retired.map(c => `| ${c.page} | ${c.status} | ${c.h1 || '—'} | ${c.why} |`)] : ['- none']), '');
  L.push(`## H1s changed (${m.changed.length}; ${m.changed.filter(c => c.old).length} of them from old-rules rows)`, '', ...(m.changed.length ? ['| Page | From | To | Why |', '|---|---|---|---|', ...m.changed.map(c => `| ${c.page} | ${c.from} (${c.fromSource}) | ${c.to} (${c.toSource}${c.volume != null ? `, ${c.volume}/mo` : ''}) | ${String(c.why).replace(/\|/g, '/')} |`)] : ['- none']), '');
  L.push(`## Untouched (${m.untouched.length}: manual, or Copy Generated or later)`, '', ...(m.untouched.length ? m.untouched.map(c => `- ${c.page}: "${c.h1}" (${c.why})`) : ['- none']), '');
  L.push(`## "Research now suggests" notes (${m.notes.length})`, '', ...(m.notes.length ? m.notes.map(c => `- ${c.page}: "${c.h1}" → research now suggests "${c.suggests}"`) : ['- none']), '');
  L.push(`## Unchanged: ${m.diff.unchanged.length + m.diff.update.length - m.changed.length} pages keep their H1 (links or titles may update)`);
  return L.join('\n') + '\n';
}

module.exports = { migrationDryRun, report, oldRules, editable };

if (require.main === module) {
  (async () => {
    const who = process.argv[2];
    if (!who) { console.log('Usage: node tools/old-rules-migration-dry-run.js "<client name>"|<client id>'); process.exitCode = 2; return; }
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    try {
      const m = await migrationDryRun(pool, who);
      const text = report(m);
      const file = path.join(root, 'docs/h1-research', `${m.r.client.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-old-rules-migration-dry-run.md`);
      fs.writeFileSync(file, text);
      console.log(text);
      console.log(`(saved: ${path.relative(root, file)})`);
    } catch (e) { console.log(`Dry run failed: ${e.status ? `status ${e.status}, ` : ''}${e.message}`); console.log(e.stack.split('\n').slice(1, 4).join('\n')); process.exitCode = 1; }
    finally { await pool.end(); }
  })();
}
