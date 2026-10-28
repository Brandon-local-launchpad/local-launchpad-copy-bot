'use strict';
// Fixture: the companion plugin's PHP, run for real under php-wasm (PHP 8.3, the
// @php-wasm/node dev dependency) with minimal WordPress stand-ins
// (tests/php/wp-stubs.php). Checks the shared token cases, the display filter,
// the shortcode, sanitising, meta and REST registration, and the routes.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
const PLUGIN = path.join(root, 'wp-plugin/llp-copybot');

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: companion plugin PHP (php-wasm) ===\n');

(async () => {
  const { loadNodeRuntime } = await import('@php-wasm/node');
  const { PHP } = await import('@php-wasm/universal');
  const php = new PHP(await loadNodeRuntime('8.3', { emscriptenOptions: { processId: 1 } }));
  const put = (rel, file) => { const dir = path.posix.dirname(rel); php.mkdir(dir); php.writeFile(rel, fs.readFileSync(file)); };
  put('/plugin/llp-copybot.php', path.join(PLUGIN, 'llp-copybot.php'));
  put('/plugin/client-value-keys.json', path.join(PLUGIN, 'client-value-keys.json'));
  put('/plugin/tests/token-cases.json', path.join(PLUGIN, 'tests/token-cases.json'));
  put('/tests/wp-stubs.php', path.join(root, 'tests/php/wp-stubs.php'));
  put('/tests/plugin-tests.php', path.join(root, 'tests/php/plugin-tests.php'));

  const res = await php.run({ scriptPath: '/tests/plugin-tests.php' });
  php.exit();
  let o;
  try { o = JSON.parse(res.text); } catch (e) {
    console.log('✗ PHP ran and printed JSON\n  got:  ' + res.text.slice(0, 800) + (res.errors ? '\n  errors: ' + res.errors : ''));
    process.exit(1);
  }
  chk('PHP ran the plugin with no warnings', !/Warning|Notice|Deprecated|Fatal/.test(res.text), '', 'clean');

  const bad = o.cases.filter(c => c.got !== c.want);
  chk(`Shared token cases: all ${o.cases.length} match in PHP`, !bad.length, bad.map(c => `${c.in} → ${JSON.stringify(c.got)} (want ${JSON.stringify(c.want)})`).join(' | '), 'all');
  chk('Display filter: WYSIWYG values HTML-escaped', o.format_wysiwyg === '<p>Fish &amp; &lt;b&gt;Chips&lt;/b&gt; &quot;Ltd&quot;</p>', o.format_wysiwyg, 'escaped');
  chk('Display filter: text fields resolved', o.format_text === 'Call 023 0000 0000', o.format_text, 'Call 023 0000 0000');
  chk('Display filter: non-strings left alone', Array.isArray(o.format_array) && o.format_array[0] === 'x', JSON.stringify(o.format_array), '["x"]');
  chk('Display filter: tokens stay raw in the admin', o.format_admin === 'Call [CV: phone]', o.format_admin, 'raw');
  chk('Rank Math title and Yoast description resolved', o.seo_title === 'Landscaper Southampton | Edens Edge Landscaping' && o.yoast_desc === 'From Edens Edge Landscaping.', `${o.seo_title} / ${o.yoast_desc}`, 'resolved');
  chk('Shortcode: key lower-cased and escaped; missing value empty', o.shortcode === 'Fish &amp; &lt;b&gt;Chips&lt;/b&gt; &quot;Ltd&quot;' && o.shortcode_missing === '', `${o.shortcode} / ${JSON.stringify(o.shortcode_missing)}`, 'escaped / ""');
  chk('Sanitise: tags stripped, bad URL emptied, good URL kept, unknown key dropped',
    o.sanitize.company_name === 'Edens Edge' && o.sanitize.map_embed === '' && o.sanitize.review_url === 'https://g.page/r/x' && !('not_a_key' in o.sanitize), JSON.stringify(o.sanitize), 'ok');
  const metaKeys = ['rank_math_title', 'rank_math_description', '_yoast_wpseo_title', '_yoast_wpseo_metadesc'];
  chk('SEO meta registered for REST, string, edit_pages only', metaKeys.every(k => o.meta[k] && o.meta[k].show_in_rest === true && o.meta[k].type === 'string' && o.meta[k].auth === true), JSON.stringify(o.meta), 'all four');
  chk('SEO meta registered on pages and on posts (the blog posts, 0.2.0)', metaKeys.every(k => o.meta_types && o.meta_types[k] && o.meta_types[k].includes('page') && o.meta_types[k].includes('post')), JSON.stringify(o.meta_types), 'page and post');
  chk('Settings page setting registered', o.setting_registered === true, '', 'registered');
  chk('REST routes: client-values and status', o.routes.includes('llp-copybot/v1/client-values') && o.routes.includes('llp-copybot/v1/status'), o.routes.join(', '), 'both');
  chk('GET client-values returns the stored values', o.get_values.company_name === 'Edens Edge Landscaping', JSON.stringify(o.get_values).slice(0, 120), 'values');
  chk('POST client-values merges, sanitises and drops unknown keys', o.post_values.phone === '01234 567890' && o.post_values.company_name === 'Edens Edge Landscaping' && !('nope' in o.post_values) && o.stored_after_post.phone === '01234 567890', JSON.stringify(o.post_values).slice(0, 160), 'merged');
  chk('POST with a bad body: 400 error', o.post_bad && o.post_bad.code === 'llp_bad_body' && o.post_bad.data.status === 400, JSON.stringify(o.post_bad), 'llp_bad_body 400');
  chk('Client values need manage_options', o.perm_without_manage === false, String(o.perm_without_manage), 'false');
  chk('Status: plugin version, front page, SEO "none" without Rank Math/Yoast', o.status.plugin === '0.2.0' && o.status.front_page === 7 && o.status.seo === 'none' && o.status.acf_pro === false, JSON.stringify(o.status), 'ok');
  chk('years_trading worked out from year_founded', o.years_trading === '17', o.years_trading, '17');
  chk('Settings page shows an input for every key', o.settings_page_inputs === o.key_count && o.key_count > 40, `${o.settings_page_inputs} inputs, ${o.key_count} keys`, 'equal');

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
