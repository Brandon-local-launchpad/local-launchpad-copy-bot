<?php
// Prints the plugin's own [llp_review_funnel] star box, for the fake WordPress site's
// /review-us/ page (tests/fake-wp, tests/php/review-box.js). The same PHP a real site
// runs, with the WordPress stand-ins; the values come from /tests/review-box.json.
require __DIR__ . '/wp-stubs.php';
require '/plugin/llp-copybot.php';

$in = json_decode( file_get_contents( '/tests/review-box.json' ), true );
$GLOBALS['llp_test']['options'][ LLP_COPYBOT_OPTION ] = $in['values'];
$GLOBALS['llp_test']['site_url']                      = $in['site_url'];
$GLOBALS['llp_test']['privacy_url']                   = $in['site_url'] . '/privacy-policy/';

echo json_encode(
	array(
		'intro' => apply_filters_test( 'elementor/frontend/the_content', $in['intro'] ),
		'box'   => $GLOBALS['llp_test']['shortcodes']['llp_review_funnel']( array() ),
	)
);
