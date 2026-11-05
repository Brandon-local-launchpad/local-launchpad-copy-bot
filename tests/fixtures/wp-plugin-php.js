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
  put('/tests/rankmath-stubs.php', path.join(root, 'tests/php/rankmath-stubs.php'));
  put('/plugin/redirects.php', path.join(PLUGIN, 'redirects.php'));

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
  chk('Settings page setting registered', o.setting_registered === true, '', 'registered');
  chk('REST routes: client-values and status', o.routes.includes('llp-copybot/v1/client-values') && o.routes.includes('llp-copybot/v1/status'), o.routes.join(', '), 'both');
  chk('GET client-values returns the stored values', o.get_values.company_name === 'Edens Edge Landscaping', JSON.stringify(o.get_values).slice(0, 120), 'values');
  chk('POST client-values merges, sanitises and drops unknown keys', o.post_values.phone === '01234 567890' && o.post_values.company_name === 'Edens Edge Landscaping' && !('nope' in o.post_values) && o.stored_after_post.phone === '01234 567890', JSON.stringify(o.post_values).slice(0, 160), 'merged');
  chk('POST with a bad body: 400 error', o.post_bad && o.post_bad.code === 'llp_bad_body' && o.post_bad.data.status === 400, JSON.stringify(o.post_bad), 'llp_bad_body 400');
  chk('Client values need manage_options', o.perm_without_manage === false, String(o.perm_without_manage), 'false');
  chk('Status: plugin version, front page, SEO "none" without Rank Math/Yoast', o.status.plugin === require(path.join(root, 'wp/plugin-version.js')).VERSION && o.status.front_page === 7 && o.status.seo === 'none' && o.status.acf_pro === false, JSON.stringify(o.status), 'ok');
  chk('years_trading worked out from year_founded', o.years_trading === '17', o.years_trading, '17');
  chk('Settings page shows an input for every key', o.settings_page_inputs === o.key_count && o.key_count > 40, `${o.settings_page_inputs} inputs, ${o.key_count} keys`, 'equal');

  // ── Redirects into Rank Math (against a stand-in for its classes, tests/php/rankmath-stubs.php) ──
  const R = o.redirects;
  const J = JSON.stringify;
  chk('Redirects: no Rank Math, reported, and a push refused with a 409 saying so', R.no_rm_status.ready === false && R.no_rm_post.code === 'llp_no_redirections' && R.no_rm_post.data.status === 409 && /not active/.test(R.no_rm_post.message), J(R.no_rm_post), '');
  chk('Redirects: a read with no Rank Math still answers, empty', R.no_rm_get.ready.ready === false && R.no_rm_get.items.length === 0, J(R.no_rm_get), '');
  chk('Redirects: the module off is told apart, and says where to turn it on', R.module_off.rank_math && !R.module_off.module && !R.module_off.ready && /Redirections module is off/.test(R.module_off_msg), R.module_off_msg, '');
  chk('Redirects: ready once the module is on', R.ready.ready === true);
  chk('Redirects: a 301, a 410 and a query string URL created; the homepage, a 302 and a 301 with no destination refused', R.push1.created === 3 && R.push1.errors.length === 3, J(R.push1), '');
  const rows = Object.values(R.rows1);
  chk('Redirects: every row arrives inactive', rows.length === 3 && rows.every(x => x.status === 'inactive'), J(rows), '');
  chk('Redirects: no redirect cache rows are made', R.cached === false, String(R.cached), 'false');
  chk('Redirects: a 410 has no destination; a 301 holds the current site\'s address', rows.find(x => x.header_code === 410).url_to === '' && rows.find(x => x.header_code === 301).url_to === 'https://staging.example.test/services/new', J(rows), '');
  const v1 = R.view1;
  chk('Redirects: the read back lists what Rank Math stored, with the slash normalised', v1.items.length === 3 && v1.items[0].source === '/old-page' && v1.items[0].stored === '/old-page' && v1.items.find(i => i.source === '/page?id=5').stored === '/page?id=5', J(v1.items), '');
  chk('Redirects: the tag is the plugin\'s own list, with the path kept', v1.items[0].path === '/services/new', J(v1.items[0]), '');
  chk('Redirects: pushing inactive rows again adds no duplicates', R.adds_on_repush === 0 && R.count_after_repush === 3 && R.push2.updated === 3 && R.push2.created === 0, J(R.push2), '');
  chk('Redirects: a changed destination updates the same row', R.push3.updated === 1 && R.view3.items.find(i => i.source === '/old-page').path === '/services/other' && R.view3.items.length === 3, J(R.view3.items), '');
  chk('Redirects: a URL someone else redirected is a conflict, and their row is untouched', R.conflict.conflicts.length === 1 && R.conflict.conflicts[0].id === 500 && R.conflict.created === 0 && R.theirs_same === true, J(R.conflict), '');
  chk('Redirects: their row is reported as not Copybot\'s', R.view_other.other.length === 1 && R.view_other.other[0].source === '/theirs', J(R.view_other.other), '');
  chk('Redirects: delete can\'t remove their row', R.del_theirs.deleted === 0 && R.theirs_still === true, J(R.del_theirs), '');
  chk('Redirects: a bad status is refused', R.bad_status.code === 'llp_bad_status', J(R.bad_status), '');
  chk('Redirects: turning on covers Copybot\'s rows and not theirs', R.on.changed === 3 && R.view_on.active === 3 && R.view_on.inactive === 0 && R.theirs_status_on === 'active', J(R.on), '');
  chk('Redirects: turning on rebuilds each destination from where the site is now', R.view_on.items.filter(i => i.code === 301).every(i => i.url_to.startsWith('https://live.example.test/')), J(R.view_on.items), '');
  chk('Redirects: a 410 stays with no destination when on', R.view_on.items.find(i => i.code === 410).url_to === '', J(R.view_on.items), '');
  chk('Redirects: a query string URL fires through pre_search while active', R.pre_query_on && R.pre_query_on.llp_query_row === true && /services\/new/.test(R.pre_query_on.url_to), J(R.pre_query_on), '');
  chk('Redirects: another query string on that path doesn\'t match, and a plain URL is left to Rank Math', R.pre_other_query === null && R.pre_no_query === null, `${J(R.pre_other_query)} ${J(R.pre_no_query)}`, 'null');
  chk('Redirects: that row\'s query string isn\'t passed to the destination; other rows keep theirs', R.add_query_row === false && R.add_query_plain === true, `${R.add_query_row} ${R.add_query_plain}`, 'false true');
  chk('Redirects: turning off turns them all off', R.off.changed === 3 && R.view_off.active === 0 && R.view_off.inactive === 3 && R.view_off.items.every(i => i.status === 'inactive'), J(R.view_off), '');
  chk('Redirects: once off, the query string URL no longer fires', R.pre_query_off === null, J(R.pre_query_off), 'null');
  chk('Redirects: a row deleted in Rank Math\'s screen shows as missing, and a push remakes it without a stray', R.view_missing.items[0].status === 'missing' && R.push_missing.created === 1 && R.count_list === 3, `${J(R.view_missing.items[0])} ${J(R.push_missing)} ${R.count_list}`, '');
  chk('Redirects: a save Rank Math refuses is an error, not a success', R.refused_save.errors.length === 1 && R.refused_save.created === 0, J(R.refused_save), '');
  chk('Redirects: the launch day screen shows the counts, the switch and the last check\'s BLOCKs', /<strong>0 on<\/strong>/.test(R.page) && /2 BLOCK/.test(R.page) && /Fix them in Copybot/.test(R.page) && /Copybot redirects/.test(R.page), R.page.slice(0, 300), '');
  chk('Redirects: delete all removes Copybot\'s rows and leaves theirs', R.del_all.deleted === 3 && R.rows_after_del.length === 1 && R.rows_after_del[0] === 500 && R.list_after_del.length === 0, J(R), '');
  chk('Redirects: every route needs manage_options', [R.perm_get, R.perm_post, R.perm_delete, R.perm_status].every(x => x === false));
  chk('Status reports the redirects state', R.status_route.redirects && R.status_route.redirects.ready === true, J(R.status_route), '');

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
