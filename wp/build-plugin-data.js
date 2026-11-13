'use strict';
// Writes the plugin's generated files from the Copybot sources, so the site and
// Copybot can't drift:
//   wp-plugin/llp-copybot/acf-json/group_llp_*.json   ← wp/acf-schema.js
//   wp-plugin/llp-copybot/client-value-keys.json       ← wp/client-values.js
// Run after changing either source: npm run wp:plugin-data
// tests/fixtures/wp-plugin.js fails if the committed files are out of date.

const fs = require('fs');
const path = require('path');
const { GROUPS, LEGAL_GROUPS, INNER_GROUPS, acfGroupJson } = require('./acf-schema');
const { POST_TYPES, PATH_META } = require('./post-types');
const { ALL_KEYS } = require('./client-values');

const PLUGIN = path.join(__dirname, '..', 'wp-plugin', 'llp-copybot');

function generatedFiles() {
  const files = {};
  [...GROUPS, ...LEGAL_GROUPS, ...INNER_GROUPS].forEach((g, i) => {
    files[`acf-json/group_llp_${g.name}.json`] = JSON.stringify(acfGroupJson(g, i), null, 2) + '\n';
  });
  files['client-value-keys.json'] = JSON.stringify(ALL_KEYS, null, 2) + '\n';
  // wp/post-types.js: the inner pages' post types and the meta a page's URL is served from
  files['page-post-types.json'] = JSON.stringify({ path_meta: PATH_META, post_types: POST_TYPES.map(p => ({ post_type: p.post_type, label: p.label, singular: p.singular })) }, null, 2) + '\n';
  return files;
}

function write() {
  const files = generatedFiles();
  fs.mkdirSync(path.join(PLUGIN, 'acf-json'), { recursive: true });
  for (const f of fs.readdirSync(path.join(PLUGIN, 'acf-json'))) {
    if (/^group_llp_.*\.json$/.test(f) && !files[`acf-json/${f}`]) fs.unlinkSync(path.join(PLUGIN, 'acf-json', f));
  }
  for (const [rel, body] of Object.entries(files)) fs.writeFileSync(path.join(PLUGIN, rel), body);
  return Object.keys(files);
}

if (require.main === module) console.log('Wrote:\n  ' + write().join('\n  '));
module.exports = { generatedFiles, PLUGIN };
