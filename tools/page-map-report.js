'use strict';
// Prints the Edens Edge page map from the fixture (no database): counts with the
// arithmetic, the homepage's Links TO, one example of each other type, collisions
// and the services waiting on confirmation. Both category tab rules. Page map v3
// needs keyword volumes: this uses tests/fixtures/data/edens-edge-volumes.js (a stub,
// not DataForSEO), so the service and town service pages are examples, not the live plan.
//   node tools/page-map-report.js [ticked_only|ticked_or_propagated]
const path = require('path');
const root = path.join(__dirname, '..');
const R = require(path.join(root, 'fillout/services/resolver.js'));
const G = require(path.join(root, 'page-map/generator.js'));
const S = require('./seed-edens-edge.js');
const ticks = require(path.join(root, 'tests/fixtures/data/edens-edge-ticks.js'));
const { volumes } = require(path.join(root, 'tests/fixtures/data/edens-edge-volumes.js'));

function report(rule) {
  const config = R.loadConfig('landscapers-gardeners');
  const resolved = R.resolve(ticks, config, { categoryTabRule: rule });
  const m = G.buildPageMap({ resolved, baseTown: S.BASE_TOWN, otherTowns: S.OTHER_TOWNS.join('\n'), companyName: S.COMPANY, niche: 'Landscapers/Gardeners', waiting: [] }, { volumes: volumes() });
  const show = r => [`  ${G.TYPE_LABEL[r.type]}: ${r.title}  ${r.slug}`, `    H1: ${r.h1 || '(needed)'} [${r.h1_source}]`, `    Links TO (${r.links_to.length}): ${r.links_to.join(', ')}`, `    Links FROM (${r.links_from.length}): ${r.links_from.join(', ')}`].join('\n');
  console.log(`\n===== categoryTabRule: ${rule} =====`);
  console.log(`a) ${Object.entries(m.counts).map(([k, v]) => `${k} ${v}`).join(', ')}\n   ${m.arithmetic}`);
  console.log(`   tabs: ${resolved.categories.map(c => c.name).join(', ')}`);
  const home = m.rows.find(r => r.type === 'homepage');
  console.log(`b) Homepage Links TO (${home.links_to.length}):\n   ${home.links_to.join('\n   ')}`);
  console.log(show(m.rows.find(r => r.type === 'category')));
  console.log(show(m.rows.find(r => r.type === 'service')));
  console.log(`c) Services: ${JSON.stringify(m.serviceCounts)}; town service pages: ${JSON.stringify(m.townServicePages)}`);
  console.log(show(m.rows.find(r => r.type === 'location')));
  console.log(show(m.rows.find(r => r.type === 'location_category')));
  if (m.rows.some(r => r.type === 'town_service')) console.log(show(m.rows.find(r => r.type === 'town_service')));
  console.log(`d) Slug collisions: ${m.collisions.length ? m.collisions.map(c => c.msg).join('; ') : 'none'}`);
  if (m.droppedTowns.length) console.log(`   Towns dropped: ${m.droppedTowns.map(d => `${d.town} (${d.why})`).join(', ')}`);
  return m;
}

const rules = process.argv[2] ? [process.argv[2]] : ['ticked_only', 'ticked_or_propagated'];
for (const r of rules) report(r);
