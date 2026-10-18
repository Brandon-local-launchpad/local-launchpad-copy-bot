'use strict';
// The declared source errors (knownSourceErrors) in every niche file, grouped by niche
// and by type (fillout/services/check-niche.js): (a) note says duplicate of X but X's
// list does not contain the service; (b) service in 2+ categories with no note naming
// them; (c) anything else. Every (a) is shown in full with the relevant lines of both
// category lists. Read-only. Saved to docs/niches-source/source-errors-report.md.
//   node tools/source-errors-report.js

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const R = require(path.join(root, 'fillout/services/resolver.js'));
const { classifySourceError, SOURCE_ERROR_TYPES } = require(path.join(root, 'fillout/services/check-niche.js'));
const dir = path.join(root, 'fillout/services');

const words = s => new Set(R.norm(s).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(w => w.length > 2));
const overlap = (a, b) => { const x = words(a), y = words(b); let n = 0; for (const w of x) if (y.has(w)) n++; return n / Math.max(1, Math.min(x.size, y.size)); };
const line = (cat, s) => `● ${s}${(cat.duplicateNotes || {})[s] ? ` (Duplicate: ${cat.duplicateNotes[s].join(', ')})` : ''}`;

function build() {
  const L = [`# Declared source errors by niche and type (${new Date().toISOString().slice(0, 10)})`, '', 'Types: ' + Object.values(SOURCE_ERROR_TYPES).join(' · '), ''];
  const rows = [];
  const all = [];
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
    const c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const list = (c.knownSourceErrors || []).map(k => ({ k, cl: classifySourceError(c, k) }));
    if (!list.length) continue;
    const by = t => list.filter(x => x.cl.type === t).length;
    rows.push(`| ${c.niche} | ${by('a')} | ${by('b')} | ${by('c')} | ${list.length} |`);
    all.push({ c, list });
  }
  const tot = t => all.reduce((n, x) => n + x.list.filter(y => y.cl.type === t).length, 0);
  L.push('| Niche | (a) | (b) | (c) | Total |', '|---|---|---|---|---|', ...rows, `| **All** | **${tot('a')}** | **${tot('b')}** | **${tot('c')}** | **${tot('a') + tot('b') + tot('c')}** |`);

  // By code within each type
  L.push('', '## By check code');
  const codes = new Map();
  for (const { list } of all) for (const { k, cl } of list) { const key = `${cl.type} · ${k.code}`; codes.set(key, (codes.get(key) || 0) + 1); }
  for (const [k, n] of [...codes].sort()) L.push(`- ${k}: ${n}`);

  // Every (a) in full
  L.push('', '## (a) in full: the note says duplicate of X, but X\'s list does not contain the service');
  for (const { c, list } of all) {
    const as = list.filter(x => x.cl.type === 'a');
    if (!as.length) continue;
    L.push('', `### ${c.niche} (${as.length})`);
    for (const { k, cl } of as) {
      const cat = c.categories.find(x => x.key === k.category);
      const svc = cat.services.find(s => R.norm(s) === R.norm(k.service)) || k.service;
      L.push('', `**${cat.name}**: ${line(cat, svc)}`);
      for (const xKey of cl.missingFrom) {
        const x = c.categories.find(y => y.key === xKey);
        const near = x.services.map(s => ({ s, o: overlap(svc, s) })).filter(n => n.o >= 0.5).sort((a, b) => b.o - a.o).slice(0, 3);
        L.push(`  - **${x.name}** (${x.services.length} services) does not list it.${near.length ? ` Closest lines: ${near.map(n => line(x, n.s)).join(' / ')}` : ' No similar line.'}`);
      }
      if (cl.unknownNames.length) L.push(`  - The note also names ${cl.unknownNames.map(n => `"${n}"`).join(', ')}, which is not a category in this niche.`);
      if (cl.notNoted.length) L.push(`  - Also listed under ${cl.notNoted.map(key => c.categories.find(y => y.key === key).name).join(', ')}, which the note leaves out.`);
    }
  }
  return L.join('\n') + '\n';
}

module.exports = { build };
if (require.main === module) {
  const text = build();
  const out = path.join(root, 'docs/niches-source/source-errors-report.md');
  fs.writeFileSync(out, text);
  console.log(text);
  console.log(`(saved to ${path.relative(root, out)})`);
}
