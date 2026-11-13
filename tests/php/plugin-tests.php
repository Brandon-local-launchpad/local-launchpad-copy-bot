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

// ── The Review Us page (review-funnel.php) ───────────────────────────────────
$F  = array();
$T0 = &$GLOBALS['llp_test'];
$T0['options'][ LLP_COPYBOT_OPTION ] = array( 'company_name' => 'Edens Edge <b>Landscaping</b>', 'owner_name' => 'Ethan', 'phone' => '07580 412717', 'email' => 'ethan@edensedge.test', 'review_url' => 'https://search.google.com/local/writereview?placeid=ChIJ_edens' );
$T0['transients'] = array(); $T0['remote_calls'] = array(); $T0['mails'] = array(); $T0['privacy_url'] = 'https://site.test/privacy-policy/';
$fb = function ( $body ) use ( $routes ) { return ( $routes['llp-copybot/v1/review-feedback']['callback'] )( new WP_REST_Request( $body ) ); };
$fn = $routes['llp-copybot/v1/review-funnel'];
$good = array( 'stars' => 2, 'name' => ' Sam <i>Carter</i> ', 'phone' => '07700 900123', 'email' => '', 'feedback' => "The patio was left <b>uneven</b>.\nNobody called back.", 'page_url' => 'https://site.test/review-us/', 'website' => '' );

// Tokens in Elementor text and ordinary page text
$F['elementor_text'] = apply_filters_test( 'elementor/frontend/the_content', '<p>Thanks for choosing [CV: company_name].</p><p>[CV: owner_name]</p><p>[CV: not_set]</p>' );
$F['page_text']      = apply_filters_test( 'the_content', 'Call [CV: phone]' );
$T0['is_admin'] = true;
$F['text_admin']     = apply_filters_test( 'elementor/frontend/the_content', 'Call [CV: phone]' );
$T0['is_admin'] = false;

// The shortcode
$sc = $GLOBALS['llp_test']['shortcodes']['llp_review_funnel'];
$F['html']        = $sc( array() );
$F['html_second'] = $sc( array() );
$T0['options'][ LLP_COPYBOT_OPTION ]['review_url'] = '';
$F['html_no_link'] = $sc( array() );
$T0['options'][ LLP_COPYBOT_OPTION ]['review_url'] = 'https://search.google.com/local/writereview?placeid=ChIJ_edens';

// Where feedback goes: Copybot sets it, admins only, https only
$F['perm_public'] = ( $routes['llp-copybot/v1/review-feedback']['permission_callback'] )();
$T0['caps']['manage_options'] = false;
$F['perm_config'] = array( ( $fn[0]['permission_callback'] )(), ( $fn[1]['permission_callback'] )() );
$T0['caps']['manage_options'] = true;
$F['endpoint_before'] = ( $fn[0]['callback'] )();
$F['endpoint_http']   = ( $fn[1]['callback'] )( new WP_REST_Request( array( 'endpoint' => 'http://copybot.example.test/api/public/review-feedback/abc' ) ) );
$F['endpoint_bad']    = ( $fn[1]['callback'] )( new WP_REST_Request( array( 'nope' => 1 ) ) );

// No endpoint yet: the site emails the client and the team itself
$F['mail_fallback']      = $fb( $good );
$F['mail_fallback_sent'] = $T0['mails'];
$F['remote_before']      = count( $T0['remote_calls'] );

$F['endpoint_set']   = ( $fn[1]['callback'] )( new WP_REST_Request( array( 'endpoint' => 'https://copybot.example.test/api/public/review-feedback/abc' ) ) );
$F['endpoint_after'] = ( $fn[0]['callback'] )();
$F['status']         = ( $routes['llp-copybot/v1/status']['callback'] )();

// Passed to Copybot: tidied, and no email from the site
$T0['mails'] = array();
$F['forwarded']      = $fb( $good );
$F['forwarded_call'] = $T0['remote_calls'];
$F['forwarded_mail'] = count( $T0['mails'] );

// What a send must hold
$F['bad_stars']       = $fb( array_merge( $good, array( 'stars' => 5 ) ) );
$F['bad_feedback']    = $fb( array_merge( $good, array( 'feedback' => '  ' ) ) );
$F['bad_name']        = $fb( array_merge( $good, array( 'name' => '' ) ) );
$F['bad_contact']     = $fb( array_merge( $good, array( 'phone' => '', 'email' => '' ) ) );
$F['bad_email']       = $fb( array_merge( $good, array( 'email' => 'not an email' ) ) );
$F['calls_after_bad'] = count( $T0['remote_calls'] );

// A bot that fills the trap field: told it worked, nothing sent
$F['trap']             = $fb( array_merge( $good, array( 'website' => 'http://spam.test' ) ) );
$F['calls_after_trap'] = count( $T0['remote_calls'] );

// Copybot down: the site's own email. Both down: the customer is told
$T0['mails']       = array();
$T0['remote_code'] = 500;
$F['copybot_down']       = $fb( $good );
$F['copybot_down_mails'] = count( $T0['mails'] );
$T0['remote_code'] = 0;
$T0['mail_ok']     = false;
$F['both_down']    = $fb( $good );
$T0['remote_code'] = 200;
$T0['mail_ok']     = true;

// Five sends an hour from one address
$T0['transients'] = array();
$F['limit']       = array();
for ( $i = 0; $i < 6; $i++ ) {
	$x            = $fb( $good );
	$F['limit'][] = $x instanceof WP_Error ? $x->data['status'] : 200;
}
$T0['transients'] = array();
$out['funnel']    = $F;

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

// ── The inner pages (page-types.php) ─────────────────────────────────────────
$P  = array();
$T1 = &$GLOBALS['llp_test'];
$P['types']        = llp_page_post_types();
$P['status']       = $R['status_route']['page_types'];
$P['registered']   = array_keys( array_filter( $T1['post_types'] ) );
$P['new_args']     = $T1['post_types']['service-category'];
$P['supports']     = $T1['supports'];
$P['path_meta_on'] = $T1['meta_types']['_llp_path'];
$P['seo_meta_on']  = $T1['meta_types']['rank_math_title'];
$P['path_meta']    = array( 'rest' => $T1['meta']['_llp_path']['show_in_rest'], 'clean' => $T1['meta']['_llp_path']['sanitize_callback'], 'auth' => ( $T1['meta']['_llp_path']['auth_callback'] )() );
$P['flushes']      = $T1['flushes'];
// The next page load: the plugin's two post types are not there until init registers them again
unset( $T1['post_types']['service-category'], $T1['post_types']['location-service'] );
do_action_test( 'init' );
$P['flushes_again'] = $T1['flushes'];

// A path as stored
$P['clean'] = array_map( 'llp_page_clean_path', array( '/services/patios', 'Locations/Romsey/Patios/', '/', '', '/a b', '/services//patios', '/services/../x', 'https://x.test/a', array( 'x' ) ) );

// Entries: a service, a town service as a draft, one with no path, one in the bin, a page, and a second entry on a taken path
$T1['posts'] = array(
	41 => array( 'type' => 'service', 'status' => 'publish', 'meta' => array( '_llp_path' => '/services/patios' ) ),
	42 => array( 'type' => 'location-service', 'status' => 'draft', 'meta' => array( '_llp_path' => '/locations/romsey/patios' ) ),
	43 => array( 'type' => 'service', 'status' => 'publish', 'meta' => array() ),
	44 => array( 'type' => 'service', 'status' => 'trash', 'meta' => array( '_llp_path' => '/services/decking' ) ),
	45 => array( 'type' => 'page', 'status' => 'publish', 'meta' => array( '_llp_path' => '/services/fencing' ) ),
	46 => array( 'type' => 'location', 'status' => 'publish', 'meta' => array( '_llp_path' => '/services/patios' ) ),
);
$link = function ( $id ) { return apply_filters_test( 'post_type_link', 'https://site.test/default/' . $id . '/', (object) array( 'ID' => $id, 'post_type' => $GLOBALS['llp_test']['posts'][ $id ]['type'] ) ); };
$T1['site_url'] = 'https://site.test';
$P['links'] = array($link( 41 ), $link( 42 ), $link( 43 ), $link( 45 ) );
$ask = function ( $request, $qv = array( 'pagename' => 'x' ) ) { $GLOBALS['wp'] = (object) array( 'request' => $request ); return apply_filters_test( 'request', $qv ); };
$P['req_service'] = $ask( 'services/patios' );
$P['req_town']    = $ask( 'locations/romsey/patios', array( 'pagename' => 'x', 'preview' => 'true' ) );
$P['req_case']    = $ask( 'Services/Patios' );
$P['req_unknown'] = $ask( 'services/turfing' );
$P['req_bin']     = $ask( 'services/decking' );
$P['req_page']    = $ask( 'services/fencing' );
$P['req_home']    = $ask( '' );
$T1['is_admin']   = true;
$P['req_admin']   = $ask( 'services/patios' );
$T1['is_admin']   = false;

// The routes Copybot makes the pages through
$pg   = $routes['llp-copybot/v1/pages'];
$save = function ( $items ) use ( $pg ) { return ( $pg[1]['callback'] )( new WP_REST_Request( array( 'items' => $items ) ) ); };
$T1['caps']['manage_options'] = false;
$P['pages_perm'] = array( ( $pg[0]['permission_callback'] )(), ( $pg[1]['permission_callback'] )() );
$T1['caps']['manage_options'] = true;
$T1['posts'][41]['title'] = 'Patios';
$T1['posts'][42]['title'] = 'Patios Romsey';
$P['list_before'] = ( $pg[0]['callback'] )();
$P['save1'] = $save( array(
	array( 'post_type' => 'service', 'title' => 'Patios', 'path' => '/services/patios' ),                          // there already, the same
	array( 'post_type' => 'location-service', 'title' => 'Patio Laying Romsey', 'path' => '/locations/romsey/patios' ), // there, a new title
	array( 'post_type' => 'service-category', 'title' => ' <b>Gardener</b> ', 'path' => '/gardener' ),              // new
	array( 'post_type' => 'location', 'title' => 'Romsey', 'path' => '/services/patios' ),                         // the path is a service's
	array( 'post_type' => 'page', 'title' => 'About', 'path' => '/about' ),                                        // not an inner page
	array( 'post_type' => 'service', 'title' => '', 'path' => '/services/turfing' ),                               // no title
	array( 'post_type' => 'service', 'title' => 'Turfing', 'path' => 'services/Turf Laying' ),                     // a bad path
	'nonsense',
) );
$new_id = $P['save1']['items'][2]['id'];
$P['new_entry']   = $T1['posts'][ $new_id ] ?? null;
$P['draft_still'] = $T1['posts'][42]['status'];
$P['save_again']  = $save( array( array( 'post_type' => 'service-category', 'title' => 'Gardener', 'path' => '/gardener' ) ) );
// The page map moved a page: the same entry, by its id, at a new path
$P['save_move']   = $save( array( array( 'post_type' => 'service', 'title' => 'Patios', 'path' => '/services/patio-laying', 'id' => 41 ) ) );
$P['moved_entry'] = $T1['posts'][41];
$P['save_move_taken'] = $save( array( array( 'post_type' => 'service', 'title' => 'Patios', 'path' => '/gardener', 'id' => 41 ) ) );
$P['save_gone']   = $save( array( array( 'post_type' => 'service', 'title' => 'Decking', 'path' => '/services/decking', 'id' => 44 ) ) );
$T1['insert_fails'] = true;
$P['save_fail']   = $save( array( array( 'post_type' => 'service', 'title' => 'Turfing', 'path' => '/services/turfing' ) ) );
$T1['insert_fails'] = false;
$P['save_bad']    = ( $pg[1]['callback'] )( new WP_REST_Request( array( 'nope' => 1 ) ) );
$P['list_after']  = ( $pg[0]['callback'] )();
$out['page_types'] = $P;
echo json_encode( $out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
