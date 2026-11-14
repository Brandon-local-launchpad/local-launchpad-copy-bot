'use strict';
// Fixture: every front end file parses (14 Nov 2026). The other fixtures run the server's
// code; nothing ran the browser's, so an unescaped apostrophe in one screen went live and
// the Dashboard would not load. This parses each file under public/app as a module, the way
// the browser does, without running it.
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '../../public/app');
const files = [];
const walk = dir => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js')) files.push(p); } };
walk(root);

let pass = 0, fail = 0;
console.log('\n=== FIXTURE: the front end files parse ===\n');
for (const f of files) {
  const r = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: fs.readFileSync(f), encoding: 'utf8' });
  const name = path.relative(root, f).replace(/\\/g, '/');
  if (r.status === 0) { pass++; }
  else { console.log(`✗ ${name} does not parse\n  ${String(r.stderr || '').split('\n').slice(0, 4).join('\n  ')}`); fail++; }
}
if (!fail) console.log(`✓ all ${pass} files under public/app parse as modules`);
if (files.length < 20) { console.log(`✗ only ${files.length} files found: the folder has moved`); fail++; }
console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
