'use strict';
// Fixture: WordPress companion plugin (slice 2). Generated files up to date,
// schema ↔ payload in step, token rules (shared cases), the plugin PHP's wiring
// (static checks: PHP isn't available here), and the dry run's site checks.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
const { GROUPS, HOMEPAGE_GROUPS, BLOG_GROUPS, KIND_TO_TYPE } = require(path.join(root, 'wp/acf-schema.js'));
const { HOMEPAGE_FIELDS, SEO_ADAPTERS } = require(path.join(root, 'wp/homepage-map.js'));
const { BLOG_FIELDS } = require(path.join(root, 'wp/blog-map.js'));
const { generatedFiles, PLUGIN } = require(path.join(root, 'wp/build-plugin-data.js'));
const { resolveTokens } = require(path.join(root, 'wp/token-resolve.js'));
const { ALL_KEYS, buildClientValuesPayload } = require(path.join(root, 'wp/client-values.js'));
const { dryRun } = require(path.join(root, 'wp/dry-run.js'));
const { createFakeWp, seedHomepage, listen } = require(path.join(__dirname, '../fake-wp/fake-wp.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: WordPress companion plugin ===\n');

// ── Generated files ──
const files = generatedFiles();
const stale = Object.entries(files).filter(([rel, body]) => !fs.existsSync(path.join(PLUGIN, rel)) || fs.readFileSync(path.join(PLUGIN, rel), 'utf8').replace(/\r\n/g, '\n') !== body);
chk('Plugin ACF JSON and key list are up to date (npm run wp:plugin-data)', !stale.length, stale.map(s => s[0]).join(', '), 'none stale');

// ── Schema ↔ payload ──
const schemaFields = Object.fromEntries(HOMEPAGE_GROUPS.flatMap(g => g.fields).map(f => [f.name, f]));
const schemaMismatches = (fields, groups) => {
  const sf = Object.fromEntries(groups.flatMap(g => g.fields).map(f => [f.name, f]));
  const out = [];
  for (const [name, kind, subs] of fields) {
    const f = sf[name];
    if (!f) { out.push(`${name}: not in the schema`); continue; }
    if (f.type !== KIND_TO_TYPE[kind]) out.push(`${name}: payload ${kind}, schema ${f.type}`);
    if (kind === 'repeater') {
      const sub = Object.fromEntries(f.sub_fields.map(s => [s.name, s]));
      for (const [s, sk] of Object.entries(subs)) if (!sub[s] || sub[s].type !== KIND_TO_TYPE[sk]) out.push(`${name}.${s}`);
    }
  }
  const pushed = new Set(fields.map(f => f[0]));
  for (const f of Object.values(sf)) if (f.push !== false && !pushed.has(f.name)) out.push(`${f.name}: in the schema, not pushed`);
  return out;
};
const mismatches = schemaMismatches(HOMEPAGE_FIELDS, HOMEPAGE_GROUPS);
chk('Every pushed homepage field exists in the ACF schema with the right type, and every Copybot-written schema field is in the payload', !mismatches.length, mismatches.join(' | '), 'none');
const blogMismatches = schemaMismatches(BLOG_FIELDS, BLOG_GROUPS);
chk('The blog groups (stage 7): every pushed blog field in the schema with the right type, every written field pushed; on posts in the Guides category; the homepage keeps its front page groups only', !blogMismatches.length && BLOG_GROUPS.every(g => g.location[0][0].value === 'post' && g.location[0][1].value === 'category:guides') && GROUPS.length === HOMEPAGE_GROUPS.length + BLOG_GROUPS.length && require(path.join(root, 'page-types')).getPageType('homepage').wp.groups.length === HOMEPAGE_GROUPS.length && require(path.join(root, 'page-types')).getPageType('blog').wp.groups.length === BLOG_GROUPS.length, blogMismatches.join(' | '), 'none');
const allKeys = Object.values(files).filter((_, i) => i < GROUPS.length).flatMap(b => JSON.parse(b).fields.flatMap(f => [f.key, ...(f.sub_fields || []).map(s => s.key)]));
chk('ACF field keys are unique and prefixed field_llp_', new Set(allKeys).size === allKeys.length && allKeys.every(k => k.startsWith('field_llp_')), allKeys.length, 'unique');
const hero = JSON.parse(files['acf-json/group_llp_home_hero.json']);
chk('Groups show on the front page and in the REST API', hero.location[0][0].value === 'front_page' && hero.show_in_rest === 1 && hero.fields.every(f => f.show_in_rest === 1), '', 'front_page, REST');
const blogHeader = JSON.parse(files['acf-json/group_llp_blog_header.json']);
chk('The blog groups\' JSON: on post type post in the Guides category, in the REST API, the image the site\'s', blogHeader.location[0].length === 2 && blogHeader.location[0][0].param === 'post_type' && blogHeader.location[0][1].value === 'category:guides' && blogHeader.show_in_rest === 1 && blogHeader.fields.find(f => f.name === 'blog_image').instructions === 'Filled on the site, not by Copybot.' && JSON.parse(files['acf-json/group_llp_blog_cta.json']).fields.find(f => f.name === 'blog_schema').type === 'textarea', JSON.stringify(blogHeader.location), 'post + guides');
chk('The five NEW fields are in the schema', ['home_trusted_show', 'home_reviews_show', 'home_services_more_line', 'home_cta_band_heading', 'home_final_cta_body'].every(n => schemaFields[n] && schemaFields[n].new), '', 'all five');

// ── Token rules (shared cases) ──
const cases = JSON.parse(fs.readFileSync(path.join(PLUGIN, 'tests/token-cases.json'), 'utf8'));
const bad = cases.cases.filter(c => resolveTokens(c.in, cases.values, { mode: c.mode, year: cases.year }) !== c.want);
chk(`Token rules: all ${cases.cases.length} shared cases`, !bad.length, bad.map(c => `${c.in} → ${resolveTokens(c.in, cases.values, { mode: c.mode, year: cases.year })}`).join(' | '), c => 'all');

// ── Plugin PHP, static checks ──
const php = fs.readFileSync(path.join(PLUGIN, 'llp-copybot.php'), 'utf8');
chk('PHP token pattern matches the JS one', php.includes("'/\\[CV: ([a-z0-9_]+)\\]/'"), '', "'/\\[CV: ([a-z0-9_]+)\\]/'");
chk('PHP registers the REST routes, filters and shortcode the push relies on',
  ["'/client-values'", "'/status'", "'acf/format_value'", "'acf/settings/load_json'", "add_shortcode(\n\t'llp_cv'", "'rank_math/frontend/title'", "'wpseo_metadesc'"].every(s => php.includes(s)), '', 'all present');
const metaKeys = Object.values(SEO_ADAPTERS).flatMap(a => Object.keys(a('t', 'd')));
chk('PHP exposes every SEO meta key the payload writes', metaKeys.every(k => php.includes(`'${k}'`)), metaKeys.join(', '), 'all');
chk('PHP leaves tokens raw in the REST API and the editor', /REST_REQUEST/.test(php) && /is_admin\(\)/.test(php), '', 'guarded');
// Brackets outside strings and comments
const phpCode = php.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/'(?:\\.|[^'\\])*'/g, "''").replace(/"(?:\\.|[^"\\])*"/g, '""');
const unbalanced = ['()', '{}', '[]'].filter(([o, c]) => phpCode.split(o).length !== phpCode.split(c).length);
chk('PHP brackets balance (outside strings and comments)', !unbalanced.length, unbalanced.join(' '), 'balanced');
chk('PHP starts with <?php and an ABSPATH guard', php.startsWith('<?php') && /defined\( 'ABSPATH' \)/.test(php), '', 'guard');

// ── Client Values payload ──
// The stage7b record predates meta.client_values (Stage 8); give it Ethan's values as a newer record would carry
const G = require(path.join(root, 'v20-generate.js'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));
const oldRec = require(path.join(__dirname, 'v20-outputs/edens-edge-2026-10-14-stage7b-record.json'));
const rec = { ...oldRec, meta: { ...oldRec.meta, client_values: G.clientValueMap({ ...E.ethanValues(), phone: '023 0000 0000' }, null) } };
const cv = buildClientValuesPayload(rec);
chk('Client Values payload covers every key', ALL_KEYS.every(k => k.key in cv), ALL_KEYS.filter(k => !(k.key in cv)).map(k => k.key).join(','), 'all keys');
chk('Client Values: company, travel distance, button label, no rating line', cv.company_name === 'Edens Edge Landscaping' && cv.travel_distance === '20 miles' && cv.primary_action === 'Get My Free Quote' && cv.rating_line === '', JSON.stringify({ c: cv.company_name, t: cv.travel_distance, p: cv.primary_action, r: cv.rating_line }), 'ok');

// ── Dry run: site checks ──
(async () => {
  const site = url => ({ url, user: 'copybot', appPassword: 'test-app-password-not-real' });
  const run = async (opts, extra = {}) => {
    const fake = createFakeWp({ pages: [seedHomepage()], ...opts });
    const { server, url } = await listen(fake.app);
    try { return { r: await dryRun({ record: rec, site: site(url), reviewed: true, ...extra }), writes: fake.state.writes }; } finally { await new Promise(r => server.close(r)); }
  };
  const ok = await run({});
  chk('Ready site: pushable, plugin reported, nothing written', ok.r.pushable && ok.r.plugin && ok.r.plugin.plugin === '0.2.0' && ok.writes === 0, ok.r.refusals.join(' | '), 'pushable');
  chk('Ready site: Client Values diff included', ok.r.changes.some(c => c.field === 'client_values.company_name' && c.change === 'added' && c.next === 'Edens Edge Landscaping'), '', 'added');
  const noPlugin = await run({ plugin: false });
  chk('No plugin: refused', !noPlugin.r.pushable && noPlugin.r.refusals.some(x => /plugin is not active/.test(x)), noPlugin.r.refusals.join(' | '), 'refused');
  const noAcf = await run({ acfPro: false });
  chk('No ACF Pro: refused', noAcf.r.refusals.some(x => /ACF Pro/.test(x)), noAcf.r.refusals.join(' | '), 'refused');
  const yoast = await run({ seo: 'yoast' });
  chk('Site on Yoast, push set for Rank Math: refused', yoast.r.refusals.some(x => /SEO plugin is yoast/.test(x)), yoast.r.refusals.join(' | '), 'refused');
  const yoastOk = await run({ seo: 'yoast' }, { seo: 'yoast' });
  chk('Site on Yoast, push set for Yoast: fine', yoastOk.r.pushable, yoastOk.r.refusals.join(' | '), 'pushable');
  const missingGroups = await run({ fieldGroups: ['group_llp_home_hero'] });
  chk('Field groups missing: refused, listing them', missingGroups.r.refusals.some(x => /field groups missing.*group_llp_home_faq/.test(x)), missingGroups.r.refusals.join(' | '), 'refused');
  const old = await run({}, { record: oldRec });
  chk('Record without its client values: refused with a clear reason', old.r.refusals.some(x => /does not carry its client values/.test(x)), old.r.refusals.join(' | '), 'refused');
  const oldFallback = await run({}, { record: oldRec, clientValues: rec.meta.client_values });
  chk('…unless the current client values are passed in', oldFallback.r.pushable, oldFallback.r.refusals.join(' | '), 'pushable');
  const same = await run({ clientValues: buildClientValuesPayload(rec) });
  chk('Client Values already on the site: no client_values changes', same.r.changes.filter(c => c.field.startsWith('client_values.') && c.change !== 'same').length === 0, '', 'all same');

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
