<?php
// Runs the plugin's own PHP under php-wasm (with tests/php/wp-stubs.php) and
// prints one JSON object of results for tests/fixtures/wp-plugin-php.js.
require __DIR__ . '/wp-stubs.php';
require '/plugin/llp-copybot.php';

$out   = array( 'cases' => array() );
$cases = json_decode( file_get_contents( '/plugin/tests/token-cases.json' ), true );

// Shared token cases: the same table the JavaScript copy passes
$GLOBALS['llp_test']['options'][ LLP_COPYBOT_OPTION ] = $cases['values'];
$GLOBALS['llp_test']['year']                          = (string) $cases['year'];
foreach ( $cases['cases'] as $c ) {
	$out['cases'][] = array( 'in' => $c['in'], 'mode' => $c['mode'], 'want' => $c['want'], 'got' => llp_copybot_resolve( $c['in'], $c['mode'] ) );
}

// The ACF display filter: wysiwyg → html mode, text → text mode, raw in REST
$out['format_wysiwyg'] = apply_filters_test( 'acf/format_value', '<p>[CV: tricky]</p>', 7, array( 'type' => 'wysiwyg' ) );
$out['format_text']    = apply_filters_test( 'acf/format_value', 'Call [CV: phone]', 7, array( 'type' => 'text' ) );
$out['format_array']   = apply_filters_test( 'acf/format_value', array( 'x' ), 7, array( 'type' => 'repeater' ) );
$GLOBALS['llp_test']['is_admin'] = true;
$out['format_admin']   = apply_filters_test( 'acf/format_value', 'Call [CV: phone]', 7, array( 'type' => 'text' ) );
$GLOBALS['llp_test']['is_admin'] = false;
$out['seo_title']      = apply_filters_test( 'rank_math/frontend/title', 'Landscaper Southampton | [CV: company_name]' );
$out['yoast_desc']     = apply_filters_test( 'wpseo_metadesc', 'From [CV: company_name].' );

// Shortcode
$out['shortcode']         = $GLOBALS['llp_test']['shortcodes']['llp_cv']( array( 'key' => 'Tricky' ) );
$out['shortcode_missing'] = $GLOBALS['llp_test']['shortcodes']['llp_cv']( array( 'key' => 'rating' ) );

// Sanitising: unknown keys dropped, URLs checked, tags stripped
$out['sanitize'] = llp_copybot_sanitize( array( 'company_name' => ' <b>Edens</b> Edge ', 'map_embed' => 'javascript:alert(1)', 'review_url' => 'https://g.page/r/x', 'not_a_key' => 'x' ) );

// init: SEO meta registered for REST; admin_init: the setting
do_action_test( 'init' );
do_action_test( 'admin_init' );
$out['meta'] = array_map( function ( $a ) { return array( 'show_in_rest' => $a['show_in_rest'], 'type' => $a['type'], 'auth' => ( $a['auth_callback'] )() ); }, $GLOBALS['llp_test']['meta'] );
$out['setting_registered'] = isset( $GLOBALS['llp_test']['settings'][ LLP_COPYBOT_OPTION ] );

// REST routes
do_action_test( 'rest_api_init' );
$routes                  = $GLOBALS['llp_test']['routes'];
$out['routes']           = array_keys( $routes );
$cv                      = $routes['llp-copybot/v1/client-values'];
$out['get_values']       = ( $cv[0]['callback'] )();
$out['post_values']      = ( $cv[1]['callback'] )( new WP_REST_Request( array( 'phone' => '01234 567890', 'nope' => 'x' ) ) );
$out['post_bad']         = ( $cv[1]['callback'] )( new WP_REST_Request( null ) );
$out['stored_after_post'] = $GLOBALS['llp_test']['options'][ LLP_COPYBOT_OPTION ];
$GLOBALS['llp_test']['caps']['manage_options'] = false;
$out['perm_without_manage'] = ( $cv[0]['permission_callback'] )();
$GLOBALS['llp_test']['caps']['manage_options'] = true;
$out['status']           = ( $routes['llp-copybot/v1/status']['callback'] )();

// years_trading from year_founded
$GLOBALS['llp_test']['options'][ LLP_COPYBOT_OPTION ] = array( 'year_founded' => '2009' );
$GLOBALS['llp_test']['year']                          = '2026';
$out['years_trading'] = llp_cv( 'years_trading' );

// The settings page renders every key
ob_start();
llp_copybot_settings_page();
$out['settings_page_inputs'] = substr_count( ob_get_clean(), '<input type="text"' );
$out['key_count']            = count( llp_copybot_keys() );

// ── Redirects into Rank Math ─────────────────────────────────────────────────
$T = &$GLOBALS['llp_test'];
$r = $routes;
$R = array();
$call = function ( $route, $body = null, $method = 0 ) use ( $routes ) {
	$def = $routes[ "llp-copybot/v1/$route" ];
	$one = isset( $def['callback'] ) ? $def : $def[ $method ];
	return ( $one['callback'] )( new WP_REST_Request( $body ) );
};
$T['site_url'] = 'https://staging.example.test';
$T['rm_rows'] = array(); $T['rm_next'] = 0; $T['rm_adds'] = 0; $T['rm_module'] = false; $T['rm_purged'] = array();

// No Rank Math classes yet: refused plainly
$R['no_rm_status'] = llp_redirects_ready();
$R['no_rm_post']   = $call( 'redirects', array( 'items' => array() ), 1 );
$R['no_rm_get']    = $call( 'redirects', null, 0 );

require '/tests/rankmath-stubs.php';
define( 'RANK_MATH_VERSION', '1.0.0' );
$R['module_off']      = llp_redirects_ready();
$R['module_off_post'] = $call( 'redirects', array( 'items' => array() ), 1 );
$R['module_off_msg']  = $R['module_off_post']->message;
$T['rm_module'] = true;
$R['ready']     = llp_redirects_ready();

$items = array(
	array( 'source' => '/old-page/', 'path' => '/services/new', 'code' => 301 ),
	array( 'source' => '/gone', 'path' => '', 'code' => 410 ),
	array( 'source' => '/page?id=5', 'path' => '/services/new', 'code' => 301 ),
	array( 'source' => '/', 'path' => '/x', 'code' => 301 ),
	array( 'source' => '/bad-code', 'path' => '/x', 'code' => 302 ),
	array( 'source' => '/no-dest', 'path' => '', 'code' => 301 ),
);
$R['push1']  = $call( 'redirects', array( 'items' => $items ), 1 );
$R['view1']  = $call( 'redirects', null, 0 );
$R['rows1']  = $T['rm_rows'];
$R['cached'] = ! empty( $T['rm_cached'] );

// Pushing again must not add duplicates, though every row is inactive
$adds = $T['rm_adds'];
$R['push2'] = $call( 'redirects', array( 'items' => array_slice( $items, 0, 3 ) ), 1 );
$R['adds_on_repush'] = $T['rm_adds'] - $adds;
$R['count_after_repush'] = count( $T['rm_rows'] );

// Change a destination
$R['push3'] = $call( 'redirects', array( 'items' => array( array( 'source' => '/old-page', 'path' => '/services/other', 'code' => 301 ) ) ), 1 );
$R['view3'] = $call( 'redirects', null, 0 );

// A redirect someone else made: a conflict, and never touched
$T['rm_rows'][500] = array( 'id' => 500, 'sources' => serialize( array( array( 'ignore' => '', 'pattern' => 'theirs', 'comparison' => 'exact' ) ) ), 'url_to' => 'https://x.test/y', 'header_code' => 301, 'hits' => 3, 'status' => 'active' );
$before_theirs = $T['rm_rows'][500];
$R['conflict']      = $call( 'redirects', array( 'items' => array( array( 'source' => '/theirs', 'path' => '/z', 'code' => 301 ) ) ), 1 );
$R['theirs_same']   = $T['rm_rows'][500] === $before_theirs;
$R['view_other']    = $call( 'redirects', null, 0 );
$R['del_theirs']    = $call( 'redirects/delete', array( 'ids' => array( 500 ) ) );
$R['theirs_still']  = isset( $T['rm_rows'][500] );

// Turning on, the destination rebuilt from where the site is now
$T['site_url'] = 'https://live.example.test';
$R['bad_status'] = $call( 'redirects/status', array( 'status' => 'trashed' ) );
$R['on']   = $call( 'redirects/status', array( 'status' => 'active' ) );
$R['view_on'] = $call( 'redirects', null, 0 );
$R['theirs_status_on'] = $T['rm_rows'][500]['status'];

// The query string row fires only through pre_search, and only while active
$pre = function ( $full ) { return apply_filters_test( 'rank_math/redirection/pre_search', null, explode( '?', $full )[0], $full ); };
$R['pre_query_on']   = $pre( 'page?id=5' );
$R['pre_other_query'] = $pre( 'page?id=6' );
$R['pre_no_query']   = $pre( 'old-page' );
$R['add_query_row']  = apply_filters_test( 'rank_math/redirection/add_query_string', true, array( 'llp_query_row' => true ) );
$R['add_query_plain'] = apply_filters_test( 'rank_math/redirection/add_query_string', true, array( 'id' => 1 ) );
$R['off']  = $call( 'redirects/status', array( 'status' => 'inactive' ) );
$R['view_off'] = $call( 'redirects', null, 0 );
$R['pre_query_off'] = $pre( 'page?id=5' );

// A row deleted in Rank Math's own screen shows as missing, and a push remakes it
$first = array_keys( llp_redirects_list() )[0];
unset( $T['rm_rows'][ $first ] );
$R['view_missing'] = $call( 'redirects', null, 0 );
$R['push_missing'] = $call( 'redirects', array( 'items' => array( array( 'source' => '/old-page', 'path' => '/services/other', 'code' => 301 ) ) ), 1 );
$R['count_list'] = count( llp_redirects_list() );

// Rank Math refuses a save
$T['rm_refuse_save'] = true;
$R['refused_save'] = $call( 'redirects', array( 'items' => array( array( 'source' => '/refused', 'path' => '/x', 'code' => 301 ) ) ), 1 );
$T['rm_refuse_save'] = false;

// The check result, for the launch day screen
$R['check'] = $call( 'redirects/check', array( 'block' => 2, 'warn' => 1, 'at' => '2026-11-05' ) );

// The launch day screen
ob_start();
llp_redirects_page();
$R['page'] = ob_get_clean();
$on = $call( 'redirects/status', array( 'status' => 'active' ) );
ob_start();
llp_redirects_page();
$R['page_on'] = ob_get_clean();
$call( 'redirects/status', array( 'status' => 'inactive' ) );

// Deleting: Copybot's rows only, and everything of Copybot's on request
$R['del_all'] = $call( 'redirects/delete', array( 'all' => true ) );
$R['rows_after_del'] = array_keys( $T['rm_rows'] );
$R['list_after_del'] = llp_redirects_list();

$T['caps']['manage_options'] = false;
$R['perm_get']    = ( $routes['llp-copybot/v1/redirects'][0]['permission_callback'] )();
$R['perm_post']   = ( $routes['llp-copybot/v1/redirects'][1]['permission_callback'] )();
$R['perm_delete'] = ( $routes['llp-copybot/v1/redirects/delete']['permission_callback'] )();
$R['perm_status'] = ( $routes['llp-copybot/v1/redirects/status']['permission_callback'] )();
$T['caps']['manage_options'] = true;
$R['status_route'] = ( $routes['llp-copybot/v1/status']['callback'] )();

$out['redirects'] = $R;
echo json_encode( $out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
