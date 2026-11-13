'use strict';
// Fixture: WordPress companion plugin (slice 2). Generated files up to date,
// schema ↔ payload in step, token rules (shared cases), the plugin PHP's wiring
// (static checks: PHP isn't available here), and the dry run's site checks.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
const { GROUPS, KIND_TO_TYPE } = require(path.join(root, 'wp/acf-schema.js'));
const { HOMEPAGE_FIELDS, SEO_ADAPTERS } = require(path.join(root, 'wp/homepage-map.js'));
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
// The plugin can't change without a version bump (2 Nov): see wp/plugin-version.js
const versionProblems = require(path.join(root, 'wp/plugin-version.js')).repoProblems();
chk('Plugin version bumped with every change (npm run wp:plugin-version)', !versionProblems.length, versionProblems.join(' | '), 'recorded');
const files = generatedFiles();
const stale = Object.entries(files).filter(([rel, body]) => !fs.existsSync(path.join(PLUGIN, rel)) || fs.readFileSync(path.join(PLUGIN, rel), 'utf8').replace(/\r\n/g, '\n') !== body);
chk('Plugin ACF JSON and key list are up to date (npm run wp:plugin-data)', !stale.length, stale.map(s => s[0]).join(', '), 'none stale');

// ── Schema ↔ payload ──
const schemaFields = Object.fromEntries(GROUPS.flatMap(g => g.fields).map(f => [f.name, f]));
const mismatches = [];
for (const [name, kind, subs] of HOMEPAGE_FIELDS) {
  const f = schemaFields[name];
  if (!f) { mismatches.push(`${name}: not in the schema`); continue; }
  if (f.type !== KIND_TO_TYPE[kind]) mismatches.push(`${name}: payload ${kind}, schema ${f.type}`);
  if (kind === 'repeater') {
    const sub = Object.fromEntries(f.sub_fields.map(s => [s.name, s]));
    for (const [s, sk] of Object.entries(subs)) if (!sub[s] || sub[s].type !== KIND_TO_TYPE[sk]) mismatches.push(`${name}.${s}`);
  }
}
chk('Every pushed field exists in the ACF schema with the right type', !mismatches.length, mismatches.join(' | '), 'none');
const pushed = new Set(HOMEPAGE_FIELDS.map(f => f[0]));
const unpushed = Object.values(schemaFields).filter(f => f.push !== false && !pushed.has(f.name)).map(f => f.name);
chk('Every Copybot-written schema field is in the payload', !unpushed.length, unpushed.join(', '), 'none');
const allKeys = Object.values(files).filter((_, i) => i < GROUPS.length).flatMap(b => JSON.parse(b).fields.flatMap(f => [f.key, ...(f.sub_fields || []).map(s => s.key)]));
chk('ACF field keys are unique and prefixed field_llp_', new Set(allKeys).size === allKeys.length && allKeys.every(k => k.startsWith('field_llp_')), allKeys.length, 'unique');
const hero = JSON.parse(files['acf-json/group_llp_home_hero.json']);
chk('Groups show on the front page and in the REST API', hero.location[0][0].value === 'front_page' && hero.show_in_rest === 1 && hero.fields.every(f => f.show_in_rest === 1), '', 'front_page, REST');
chk('The five NEW fields are in the schema', ['home_trusted_show', 'home_reviews_show', 'home_services_more_line', 'home_cta_band_heading', 'home_final_cta_body'].every(n => schemaFields[n] && schemaFields[n].new), '', 'all five');

// ── The inner pages' field groups (13 Nov 2026) ──
{
  const { INNER_GROUPS } = require(path.join(root, 'wp/acf-schema.js'));
  const { POST_TYPES, postTypeFor } = require(path.join(root, 'wp/post-types.js'));
  const count = set => INNER_GROUPS.filter(g => g.set === set).length;
  chk('Inner pages: 11 category, 12 service and 11 location groups', count('cat') === 11 && count('svc') === 12 && count('loc') === 11, [count('cat'), count('svc'), count('loc')].join(), '11,12,11');
  const json = name => JSON.parse(files[`acf-json/group_llp_${name}.json`]);
  const rule = name => json(name).location.map(r => r[0].param + '=' + r[0].value).join(' | ');
  chk('Inner pages: a group attaches by post type, the base page and its town version both',
    rule('cat_hero') === 'post_type=service-category | post_type=category-location' && rule('svc_faq') === 'post_type=service | post_type=location-service' && rule('loc_areas') === 'post_type=location',
    [rule('cat_hero'), rule('svc_faq'), rule('loc_areas')].join(' ; '), 'by post type');
  chk('Inner pages: no post type is called category, and each page type and scope has one',
    POST_TYPES.every(p => p.post_type !== 'category') && postTypeFor('category', 'base') === 'service-category' && postTypeFor('category', 'town') === 'category-location' && postTypeFor('service', 'base') === 'service' && postTypeFor('service', 'town') === 'location-service' && postTypeFor('location', 'town') === 'location', '', 'five');
  const every = Object.keys(files).filter(f => f.startsWith('acf-json/')).flatMap(f => { const g = JSON.parse(files[f]); return [g.key, ...g.fields.flatMap(x => [x.key, ...(x.sub_fields || []).map(s => s.key)])]; });
  chk('Inner pages: every group and field key in the plugin is unique', new Set(every).size === every.length, every.length - new Set(every).size + ' repeated', 'unique');
  chk('Inner pages: every field and group is in the REST API', INNER_GROUPS.every(g => json(g.name).show_in_rest === 1 && json(g.name).fields.every(f => f.show_in_rest === 1)), '', 'all');
  // Every field a record holds under its page's prefix is a field on the site, bar the two the template fills
  const names = new Set(INNER_GROUPS.flatMap(g => g.fields.map(f => f.name)));
  const gaps = [];
  for (const [file, p] of [['category-record.js', 'cat'], ['service-record.js', 'svc'], ['location-record.js', 'loc']]) {
    const src = fs.readFileSync(path.join(root, file), 'utf8');
    const labels = Object.values(require(path.join(root, 'page-types', file.replace('-record', ''))).LABELS);
    const held = new Set([...(src.match(new RegExp(`\\b${p}_[a-z0-9_]+(?=:)`, 'g')) || []), ...labels]);
    for (const n of held) if (!names.has(n) && !/_hero_rating_line$|_final_cta_trust_lines$/.test(n)) gaps.push(n);
  }
  chk('Inner pages: every field a record holds has an ACF field', !gaps.length, gaps.join(', '), 'none');
  const subs = name => INNER_GROUPS.flatMap(g => g.fields).find(f => f.name === name).sub_fields.map(s => s.name).join();
  chk('Inner pages: the repeater rows are the ones the page view names (wp/field-names.js)',
    subs('svc_included_items') === 'item_title,item_text' && subs('cat_services_cards') === 'card_name,card_text,card_image,card_url' && subs('loc_reviews') === 'review_text,review_name,review_town' && subs('svc_more_cards') === 'card_name,card_url' && subs('cat_areas_links') === 'area_name,page_url',
    subs('svc_included_items'), 'match');
  const types = JSON.parse(files['page-post-types.json']);
  chk('Inner pages: the plugin\'s post type list is the one in wp/post-types.js', types.path_meta === '_llp_path' && types.post_types.map(t => t.post_type).join() === POST_TYPES.map(p => p.post_type).join(), JSON.stringify(types).slice(0, 200), 'same');
}

// ── Token rules (shared cases) ──
const cases = JSON.parse(fs.readFileSync(path.join(PLUGIN, 'tests/token-cases.json'), 'utf8'));
const bad = cases.cases.filter(c => resolveTokens(c.in, cases.values, { mode: c.mode, year: cases.year }) !== c.want);
chk(`Token rules: all ${cases.cases.length} shared cases`, !bad.length, bad.map(c => `${c.in} → ${resolveTokens(c.in, cases.values, { mode: c.mode, year: cases.year })}`).join(' | '), c => 'all');

// ── Plugin PHP, static checks ──
// Line endings normalised: a Windows checkout has CRLF and the multi-line checks below would miss
const php = fs.readFileSync(path.join(PLUGIN, 'llp-copybot.php'), 'utf8').replace(/\r\n/g, '\n');
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
// The map embed only when the record has one: a push never clears the site's (5 Nov 2026). The same for the
// Google review link (12 Nov 2026): the Review Us page uses the site's
chk('Client Values payload covers every key but an empty map embed and an empty review link', ALL_KEYS.every(k => k.key in cv || k.key === 'map_embed' || k.key === 'review_url'), ALL_KEYS.filter(k => !(k.key in cv)).map(k => k.key).join(','), 'all keys');
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
  chk('Ready site: pushable, plugin reported, nothing written', ok.r.pushable && ok.r.plugin && ok.r.plugin.plugin === require(path.join(root, 'wp/plugin-version.js')).VERSION && ok.writes === 0, ok.r.refusals.join(' | '), 'pushable');
  chk('Ready site: Client Values diff included', ok.r.changes.some(c => c.field === 'client_values.company_name' && c.change === 'added' && c.next === 'Edens Edge Landscaping'), '', 'added');
  const oldPlugin = await run({ pluginVersion: '0.1.0' });
  chk('Old plugin on the site: refused, naming both versions', !oldPlugin.r.pushable && oldPlugin.r.refusals.some(x => /has Copybot plugin 0\.1\.0; the latest is/.test(x)), oldPlugin.r.refusals.join(' | '), 'refused');
  // 2 Nov: a homepage slug that points at a page other than the front page (the ACF groups don't attach there)
  const notFront = await (async () => {
    const fake = createFakeWp({ pages: [seedHomepage(), { ...seedHomepage({ id: 12 }), slug: 'home-test' }] });
    const { server, url } = await listen(fake.app);
    try { return { r: await dryRun({ record: rec, site: { ...site(url), homepageSlug: 'home-test' }, reviewed: true }), writes: fake.state.writes }; } finally { await new Promise(r => server.close(r)); }
  })();
  chk('Homepage slug on a page that is not the front page: refused before writing', !notFront.r.pushable && notFront.r.refusals.some(x => /only attach to the site's front page.*page 12 \(\/home-test\)/.test(x)) && notFront.writes === 0, notFront.r.refusals.join(' | '), 'refused');
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
