'use strict';
// Fixture: "Coastal: Yes/No" from the area research (Geo Research CORE v7, 15 Oct 2026).
// The dossier's Location Overview states it; code reads it and fills the client's
// "Primary city is coastal" when that is blank. A value set by hand wins.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
const G = require(path.join(root, 'geo-dossier.js'));
const { computeDecisions } = require(path.join(root, 'decisions.js'));
const real = require(path.join(__dirname, 'data/edens-edge-real.js'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: coastal from the area research ===\n');

// The prompt asks for the line
const core = fs.readdirSync(path.join(root, 'Geo Research')).filter(f => /^Geo_Research_CORE \(\d+\)\.md$/.test(f))
  .sort((a, b) => parseInt(b.match(/\((\d+)\)/)[1], 10) - parseInt(a.match(/\((\d+)\)/)[1], 10))[0];
const coreText = fs.readFileSync(path.join(root, 'Geo Research', core), 'utf8');
chk('The newest Geo Research CORE is v7 and asks for "Coastal: Yes/No" in the Location Overview', core === 'Geo_Research_CORE (7).md' && /## 1\. LOCATION OVERVIEW[\s\S]*?Coastal: Yes \[source URL\] or Coastal: No \[source URL\][\s\S]*?## 2\./.test(coreText), core, 'v7 with the line in section 1');

// Reading the line
const forms = {
  'Coastal: Yes [https://www.southampton.gov.uk/x]': ['yes', 'https://www.southampton.gov.uk/x'],
  '**Coastal:** No [https://a.example/c]': ['no', 'https://a.example/c'],
  '- Coastal: yes': ['yes', ''],
  'Coastal: No (inland, 12 miles from the sea) [https://b.example/d]': ['no', 'https://b.example/d'],
};
for (const [line, [v, src]] of Object.entries(forms)) {
  const r = G.coastalLine(`Some overview text.\n${line}\nMore text.`);
  chk(`Reads "${line.slice(0, 40)}"`, r.coastal === v && r.coastalSource === src, JSON.stringify(r), `${v}, ${src || 'no source'}`);
}
chk('No line: no answer (the coast mentioned in passing does not count)', G.coastalLine('The coast is 10 miles away. Coastal walks are popular.').coastal === null, JSON.stringify(G.coastalLine('The coast is 10 miles away. Coastal walks are popular.')), 'null');

// The real Southampton dossier is from before v7
const dossier = fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8');
chk('The 8 Oct Southampton dossier (before v7) gives no answer', G.parseDossier(dossier).coastal === null, G.parseDossier(dossier).coastal, 'null');
const v7 = dossier.replace(/(## 1\. LOCATION OVERVIEW[^\n]*\n[\s\S]*?)(\n## 2\.)/, '$1\nCoastal: Yes [https://www.southampton.gov.uk/media/f2hbzwte/6-environment.pdf]\n$2');
const p7 = G.parseDossier(v7);
chk('The same dossier with the v7 line: yes, with its source; the rest still parses', p7.coastal === 'yes' && /southampton\.gov\.uk/.test(p7.coastalSource) && p7.neighbourhoods.length === 20,
  JSON.stringify([p7.coastal, p7.coastalSource, p7.neighbourhoods.length]), 'yes, council source, 20 neighbourhoods');

// What the decisions do with it (server: blank coastal_city takes the dossier's answer)
const decide = coastal => computeDecisions({ cv: { ...E.ethanValues(), coastal_city: coastal, map_embed: 'x' }, niche: landscaper, pages: real.pages,
  keyValueMap: real.keyValueMap, serviceParentMap: real.serviceParentMap, v20TestMode: true, allocationData: null });
chk('Coastal yes: the decisions tell the model "inland and along the coast"', /Primary city coastal: yes\. Write the travel distance as "inland and along the coast"/.test(decide('yes').decisionsBlock), '', 'yes line');
chk('Coastal blank: not coastal', /Primary city coastal: no/.test(decide('').decisionsBlock), '', 'no');

console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
