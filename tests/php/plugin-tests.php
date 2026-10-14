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

echo json_encode( $out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
