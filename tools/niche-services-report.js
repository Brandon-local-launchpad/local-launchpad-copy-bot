'use strict';
// The report tools/build-niche-services.js prints (and saves as Markdown): per niche,
// categories with All vs tick counts, tick group mapping, duplicate-note
// disagreements, home-category checks, anything not placed, primaryDefault; then the
// Plumbing & Heating copies side by side, categories shared across niches,
// near-duplicate names, odd services, and the alwaysCreate candidates table.

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const R = require(path.join(root, 'fillout/services/resolver.js'));
const norm = R.norm;

// "Boiler repair" ~ "Boiler Repairs": case, plural s, punctuation
const loose = s => norm(s).replace(/[^a-z0-9 ]/g, '').split(' ').map(w => w.replace(/(ies)$/, 'y').replace(/([^s])s$/, '$1')).join(' ');
const ODD = ['Gutter cleaning', 'Furniture assembly', 'TV mounting', 'Exterior painting', 'Drywall installation'];

function nicheSection(r, checkNiche, fieldMap) {
  const L = [];
  const d = r.def;
  L.push(`\n## ${d.niche}${d.title !== d.niche ? `  (PDF: "${d.title || 'no title: Output 2 / Output 1 headings'}")` : ''}`);
  if (r.missing) { L.push('NOT FOUND in the PDFs'); return L; }
  if (r.skipped) { L.push(`Skipped: ${d.skip}`); return L; }
  for (const i of r.report.issues) L.push(`ISSUE: ${i}`);
  if (!r.config) return L;
  const c = r.config;
  const show = (cats, label) => {
    L.push(label ? `\n${label}` : '');
    L.push('| Category | key | All | Tick | Tick group | alwaysCreate | Notes |', '|---|---|---|---|---|---|---|');
    for (const k of cats) L.push(`| ${k.name} | ${k.key} | ${k.services.length} | ${k.ticks.length} | ${k.tickGroup || '—'} | ${k.alwaysCreate ? 'yes' : ''} | ${(k.notes || []).join(' / ').replace(/\|/g, '/') || ''} |`);
    L.push(`Totals: ${cats.reduce((a, k) => a + k.services.length, 0)} All rows (${new Set(cats.flatMap(k => k.services.map(norm))).size} unique services), ${cats.reduce((a, k) => a + k.ticks.length, 0)} tick boxes`);
  };
  if (r.draft) {
    L.push(`DRAFT (fillout/services/drafts/, not loaded by the resolver): ${r.report.draft}`);
    c.copies.forEach(cp => show(cp.categories, `Copy ${cp.copy}`));
  } else {
    L.push(`File: fillout/services/${require('./build-niche-services.js').fileOf(d.niche)}.json · nicheKey ${c.nicheKey} · primaryDefault **${r.report.primary || 'NONE'}** (${c.primaryDefault}) · other services field ${c.additionalServicesField || '—'}`);
    show(c.categories);
  }
  if (c.additionalTickGroup) L.push(`Additional services: tick group ${c.additionalTickGroup.field}; ${c.additionalTickGroup.examples.length} examples kept as help text (not services)${c.extraAdditionalTickGroups ? `; also ${c.extraAdditionalTickGroups.map(x => `${x.field} (${x.examples.length} examples)`).join(', ')}` : ''}`);
  L.push('\nTick group mapping:'); for (const m of r.report.mapping) L.push(`- ${m}`);
  for (const n of r.report.notes) L.push(`- Note: ${n}`);
  if (r.report.unplaced.length) { L.push('\nCould not place:'); for (const u of r.report.unplaced) L.push(`- ${u}`); }
  if (!r.draft) {
    const v = R.validateConfig(c);
    const ck = checkNiche(c, fieldMap);
    const homes = v.problems.filter(p => ['no_home', 'two_homes', 'tick_not_in_list'].includes(p.code));
    const other = ck.errors.filter(e => !/no_home|two_homes|tick_not_in_list/.test(e.code));
    L.push(`\nHome categories (item 6): ${homes.length ? '' : 'every service has exactly one home in the tick box list'}`); for (const p of homes) L.push(`- ${p.msg}`);
    const dis = v.disagreements;
    const missing = dis.filter(x => x.code === 'missing_note');
    const rest = dis.filter(x => x.code !== 'missing_note');
    L.push(`Duplicate-note disagreements: ${rest.length ? '' : 'none'}`); for (const x of rest) L.push(`- ${x.msg}${(c.knownSourceErrors || []).some(k => k.code === x.code && norm(k.service) === norm(x.service)) ? ' (declared known source error)' : ''}`);
    L.push(`In 2+ categories with no "(Duplicate: …)" note (item 5, the lists are the authority): ${missing.length ? '' : 'none'}`); for (const x of missing) L.push(`- ${x.msg}`);
    const casing = v.problems.filter(p => p.code === 'inconsistent_casing' || p.code === 'repeated_in_category');
    const names = [...new Set(c.categories.flatMap(k => [...k.services, ...k.ticks]))];
    const near = [];
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) if (norm(names[i]) !== norm(names[j]) && loose(names[i]) === loose(names[j])) near.push(`"${names[i]}" / "${names[j]}"`);
    L.push(`Same service, other case or wording (item 4): ${casing.length || near.length ? '' : 'none'}`); for (const p of casing) L.push(`- ${p.msg}`); for (const n of near) L.push(`- ${n}`);
    L.push(`Niche check: ${other.length ? `${other.length} error(s)` : 'passes'}${ck.notices.length ? `, ${ck.notices.length} notice(s)` : ''}`); for (const e of other) L.push(`- ERROR ${e.msg}`);
  }
  return L;
}

function print({ files, results, unknownTitles, fieldMap, checkNiche, out = path.join(root, 'docs/niches-source/niche-services-report.md') }) {
  const L = [`# Niche services: generated from the PDFs (${new Date().toISOString().slice(0, 10)})`, `Sources: ${files.join('; ')}`];
  L.push('\n## Niche names (PDF → Fillout dropdown label)');
  for (const r of results) L.push(`- "${r.def.title || '(no title)'}" → ${r.def.niche}${r.missing ? ' — NOT FOUND' : r.skipped ? ' (skipped)' : ''}${fieldMap.niches[r.def.niche] ? '' : ' — NOT A DROPDOWN LABEL'}`);
  for (const u of unknownTitles) L.push(`- UNMAPPED PDF title "${u.title}"`);
  for (const r of results) L.push(...nicheSection(r, checkNiche, fieldMap));

  // Plumbing & Heating side by side
  const ph = results.find(r => r.draft);
  if (ph) {
    L.push(`\n## ${ph.def.niche}: the two All-list copies side by side (item 1)`);
    const [a, b] = ph.config.copies.map(x => x.categories);
    const names = [...new Set([...a, ...b].map(k => norm(k.name)))];
    for (const n of names) {
      const x = a.find(k => norm(k.name) === n), y = b.find(k => norm(k.name) === n);
      L.push(`\n### ${(x || y).name}: copy 1 ${x ? x.services.length : 0} rows, copy 2 ${y ? y.services.length : 0} rows`);
      L.push('| # | Copy 1 | Copy 2 |', '|---|---|---|');
      for (let i = 0; i < Math.max(x ? x.services.length : 0, y ? y.services.length : 0); i++) {
        const s1 = x && x.services[i], s2 = y && y.services[i];
        const mark = s1 && s2 && norm(s1) !== norm(s2) ? ' ≠' : '';
        L.push(`| ${i + 1} | ${s1 || ''}${x && s1 && x.duplicateNotes[s1] ? ` (Dup: ${x.duplicateNotes[s1].join(', ')})` : ''} | ${s2 || ''}${mark} |`);
      }
      const only1 = x ? x.services.filter(s => !y || !y.services.some(t => norm(t) === norm(s))) : [], only2 = y ? y.services.filter(s => !x || !x.services.some(t => norm(t) === norm(s))) : [];
      if (only1.length) L.push(`Only in copy 1: ${only1.join('; ')}`);
      if (only2.length) L.push(`Only in copy 2: ${only2.join('; ')}`);
      const rep2 = y ? y.services.filter((s, i) => y.services.findIndex(t => norm(t) === norm(s)) !== i) : [];
      if (rep2.length) L.push(`Listed twice in copy 2: ${rep2.join('; ')}`);
      if ((x && x.notes) || (y && y.notes)) L.push(`Notes: ${[...(x && x.notes || []), ...(y && y.notes || [])].join(' / ')}`);
    }
  }

  // Shared categories across niches (with the landscaper file)
  const land = JSON.parse(fs.readFileSync(path.join(root, 'fillout/services/landscapers-gardeners.json'), 'utf8'));
  const cats = [];
  for (const k of land.categories) cats.push({ niche: land.niche, ...k });
  for (const r of results) if (r.config && !r.draft) for (const k of r.config.categories) cats.push({ niche: r.def.niche, ...k });
  if (ph) for (const cp of ph.config.copies) for (const k of cp.categories) cats.push({ niche: `${ph.def.niche} (copy ${cp.copy})`, ...k });
  const alias = n => ({ plumbing: 'plumber' })[norm(n)] || norm(n);
  const groups = new Map();
  for (const k of cats) { const g = alias(k.name); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(k); }
  L.push('\n## Categories in more than one niche (item 3)');
  for (const [g, list] of [...groups].filter(([, l]) => new Set(l.map(k => k.niche.replace(/ \(copy \d\)$/, ''))).size > 1).sort((a, b) => a[0].localeCompare(b[0]))) {
    L.push(`\n### ${list[0].name}: ${list.map(k => `${k.niche} ${k.services.length}`).join(', ')}`);
    const base = list[0];
    for (const k of list.slice(1)) {
      const a = k.services.filter(s => !base.services.some(t => norm(t) === norm(s))), b = base.services.filter(s => !k.services.some(t => norm(t) === norm(s)));
      L.push(a.length || b.length ? `- ${k.niche} vs ${base.niche}: only in ${k.niche}: ${a.join('; ') || '—'} · only in ${base.niche}: ${b.join('; ') || '—'}` : `- ${k.niche}: same services as ${base.niche}${k.services.map(norm).join('|') !== base.services.map(norm).join('|') ? ' (other order)' : ''}`);
    }
  }

  // Odd services in Flooring and Tiling
  L.push('\n## Odd services kept in Flooring Fitters and Tiling (item 7)');
  for (const r of results.filter(r => r.config && /Flooring|Tiling/.test(r.def.niche))) {
    for (const k of r.config.categories) { const hit = k.services.filter(s => ODD.some(o => norm(o) === norm(s))); if (hit.length) L.push(`- ${r.def.niche} / ${k.name}: ${hit.join('; ')}`); }
  }

  // alwaysCreate candidates
  L.push('\n## alwaysCreate candidates: "No unique services" or fewer than 3 own tick boxes');
  L.push('| Niche | Category | Own tick boxes | All-list rows | Tick note | alwaysCreate now |', '|---|---|---|---|---|---|');
  const cand = [...cats.filter(k => !/\(copy/.test(k.niche))];
  for (const k of cand) {
    const noUnique = (k.notes || []).some(n => /no (unique|additional) services/i.test(n));
    if (noUnique || (k.ticks || []).length < 3) L.push(`| ${k.niche} | ${k.name} | ${(k.ticks || []).length} | ${k.services.length} | ${(k.notes || []).filter(n => /no (unique|additional)|removed/i.test(n)).join(' / ').slice(0, 120)} | ${k.alwaysCreate ? 'yes' : ''} |`);
  }

  const text = L.join('\n') + '\n';
  fs.writeFileSync(out, text);
  console.log(text);
  console.log(`(saved to ${path.relative(root, out)})`);
}

module.exports = { print, loose };
