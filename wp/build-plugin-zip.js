'use strict';
// Builds the plugin's install file: npm run wp:plugin-zip → wp-plugin/dist/llp-copybot-<version>.zip
// Everything the plugin ships (tests/ left out, the same files its fingerprint covers), in one
// llp-copybot folder, as WordPress wants it. It refuses a plugin whose version isn't recorded.
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { repoProblems, recorded, VERSION } = require('./plugin-version');

const PLUGIN = path.join(__dirname, '..', 'wp-plugin', 'llp-copybot');
const DIST = path.join(__dirname, '..', 'wp-plugin', 'dist');

function add(zip, dir, rel) {
  for (const name of fs.readdirSync(dir).sort()) {
    const r = rel ? `${rel}/${name}` : name;
    if (r === 'tests') continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) add(zip, full, r);
    else zip.addFile(`llp-copybot/${r}`, fs.readFileSync(full));
  }
}

function build() {
  const problems = repoProblems();
  if (problems.length) throw new Error(problems.join(' '));
  fs.mkdirSync(DIST, { recursive: true });
  const zip = new AdmZip();
  add(zip, PLUGIN, '');
  const out = path.join(DIST, `llp-copybot-${VERSION}.zip`);
  zip.writeZip(out);
  return { file: out, version: VERSION, fingerprint: recorded().fingerprint, bytes: fs.statSync(out).size, entries: zip.getEntries().length };
}

if (require.main === module) {
  try { const r = build(); console.log(`Built ${path.relative(process.cwd(), r.file)}: plugin ${r.version}, ${r.entries} files, ${r.bytes} bytes.`); }
  catch (e) { console.error(e.message); process.exit(1); }
}

module.exports = { build };
