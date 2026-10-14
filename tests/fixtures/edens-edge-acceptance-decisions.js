'use strict';
// Fixture: brief §7 acceptance table on Edens Edge's real page map and GBP sheets,
// with the §7 client values and a recorded real allocation. No API calls. The live
// end-to-end run is tests/acceptance/edens-edge.js (npm run test:acceptance).
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../..');
const { computeDecisions } = require(path.join(root, 'decisions.js'));
const { parseDossier } = require(path.join(root, 'geo-dossier.js'));
const A = require(path.join(root, 'allocation.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));
const real = require(path.join(__dirname, 'data/edens-edge-real.js'));
const spec = require(path.join(root, 'tests/acceptance/edens-edge-spec.js'));

console.log('\n=== FIXTURE: Edens Edge acceptance decisions (brief §7, real page map) ===\n');
const parsed = parseDossier(fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8'));
const reply = JSON.parse(fs.readFileSync(path.join(__dirname, 'allocation-replies/edens-edge-bassett-heath-old-woolston.json'), 'utf8'));
const result = computeDecisions({
  cv: spec.cv, niche: landscaper, pages: real.pages, keyValueMap: real.keyValueMap, serviceParentMap: real.serviceParentMap,
  v20TestMode: true, allocationData: A.resolveAllocatedItems(reply.homepage, parsed),
});
if (result.gates.length) { console.log('GATES:', result.gates); process.exit(1); }
const rows = spec.checkDecisions(result);
console.log(spec.formatRows(rows));
const failed = rows.filter(r => !r.pass);
console.log(`\n${rows.length} checks: ${rows.length - failed.length} passed, ${failed.length} failed`);
if (failed.length) process.exit(1);
