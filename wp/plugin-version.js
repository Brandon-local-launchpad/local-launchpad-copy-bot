'use strict';
// The companion plugin's version, and a guard so it can't change without a bump (2 Nov 2026).
//
// wp-plugin/plugin-version.json records { version, fingerprint }: the fingerprint is a hash
// of every file the plugin ships (tests/ left out). tests/fixtures/wp-plugin.js fails when the
// plugin's files no longer match the recorded fingerprint, so a change can't land at the same
// version. After changing the plugin: bump LLP_COPYBOT_VERSION (and the Version: header) in
// llp-copybot.php, then run `npm run wp:plugin-version` to record the new fingerprint.
//
// The connection test and the dry run compare the site's reported version with VERSION here,
// so an old plugin on a site shows up before a push.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PLUGIN = path.join(__dirname, '..', 'wp-plugin', 'llp-copybot');
const RECORD = path.join(__dirname, '..', 'wp-plugin', 'plugin-version.json');

function shippedFiles(dir = PLUGIN, rel = '') {
  const out = [];
  for (const name of fs.readdirSync(dir).sort()) {
    const r = rel ? `${rel}/${name}` : name;
    if (r === 'tests') continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...shippedFiles(full, r));
    else out.push(r);
  }
  return out;
}

function fingerprint() {
  const hash = crypto.createHash('sha256');
  for (const r of shippedFiles()) {
    // Line endings normalised so a Windows checkout gives the same hash
    hash.update(r + '\0' + fs.readFileSync(path.join(PLUGIN, r), 'utf8').replace(/\r\n/g, '\n') + '\0');
  }
  return hash.digest('hex').slice(0, 16);
}

function phpVersion() {
  const php = fs.readFileSync(path.join(PLUGIN, 'llp-copybot.php'), 'utf8');
  const constant = (php.match(/define\(\s*'LLP_COPYBOT_VERSION',\s*'([^']+)'\s*\)/) || [])[1];
  const header = (php.match(/^\s*\*\s*Version:\s*(\S+)/m) || [])[1];
  return { constant, header };
}

const recorded = () => JSON.parse(fs.readFileSync(RECORD, 'utf8'));

// The version Copybot expects a site to run
const VERSION = recorded().version;

// -1, 0, 1 on dotted numbers ("0.10.0" > "0.9.0")
function compare(a, b) {
  const pa = String(a || '0').split('.').map(Number), pb = String(b || '0').split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

// What a site's reported version means: null when it's current
function siteVersionProblem(siteVersion) {
  if (!siteVersion) return 'The site did not report a plugin version.';
  const c = compare(siteVersion, VERSION);
  if (c < 0) return `The site has Copybot plugin ${siteVersion}; the latest is ${VERSION}. Install the latest plugin on the site first.`;
  if (c > 0) return `The site has Copybot plugin ${siteVersion}, newer than this Copybot expects (${VERSION}). Deploy the latest Copybot first.`;
  return null;
}

// Problems with the repo itself (used by the fixture)
function repoProblems() {
  const problems = [];
  const { constant, header } = phpVersion();
  const rec = recorded();
  if (constant !== header) problems.push(`llp-copybot.php: Version header ${header} and LLP_COPYBOT_VERSION ${constant} differ.`);
  if (constant !== rec.version) problems.push(`llp-copybot.php is ${constant} but wp-plugin/plugin-version.json records ${rec.version}: run npm run wp:plugin-version.`);
  if (fingerprint() !== rec.fingerprint) {
    problems.push(constant === rec.version
      ? `The plugin's files changed but its version is still ${constant}: bump LLP_COPYBOT_VERSION and the Version header in llp-copybot.php, then run npm run wp:plugin-version.`
      : `The plugin's fingerprint isn't recorded: run npm run wp:plugin-version.`);
  }
  return problems;
}

// npm run wp:plugin-version: record the fingerprint, refusing if the files changed without a bump
function record() {
  const { constant, header } = phpVersion();
  if (constant !== header) throw new Error(`Version header ${header} and LLP_COPYBOT_VERSION ${constant} differ in llp-copybot.php.`);
  const prev = fs.existsSync(RECORD) ? recorded() : null;
  const fp = fingerprint();
  if (prev && prev.fingerprint === fp) return { version: constant, fingerprint: fp, changed: false };
  if (prev && prev.version === constant) throw new Error(`The plugin's files changed but it is still ${constant}. Bump the version in llp-copybot.php first.`);
  if (prev && compare(constant, prev.version) < 0) throw new Error(`${constant} is lower than the recorded ${prev.version}.`);
  fs.writeFileSync(RECORD, JSON.stringify({ version: constant, fingerprint: fp }, null, 2) + '\n');
  return { version: constant, fingerprint: fp, changed: true };
}

if (require.main === module) {
  try { const r = record(); console.log(r.changed ? `Recorded plugin ${r.version} (${r.fingerprint}).` : `Plugin ${r.version} already recorded.`); }
  catch (e) { console.error(e.message); process.exit(1); }
}

module.exports = { VERSION, compare, siteVersionProblem, repoProblems, fingerprint, record, recorded };
