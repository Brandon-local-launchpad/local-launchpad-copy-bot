<?php
// Minimal stand-ins for the WordPress functions llp-copybot.php calls, so the
// plugin can be loaded and exercised under php-wasm without WordPress. They
// follow WordPress's behaviour closely enough for the plugin's own logic; they
// are not WordPress. Hooks, routes and meta registrations are recorded so the
// test can call them.

define( 'ABSPATH', '/' );

$GLOBALS['llp_test'] = array(
	'options' => array(), 'filters' => array(), 'actions' => array(), 'shortcodes' => array(),
	'routes' => array(), 'meta' => array(), 'settings' => array(), 'pages' => array(),
	'is_admin' => false, 'caps' => array( 'manage_options' => true, 'edit_pages' => true, 'activate_plugins' => true ),
	'year' => '2026', 'front' => 7,
);

function get_option( $k, $d = false ) { return array_key_exists( $k, $GLOBALS['llp_test']['options'] ) ? $GLOBALS['llp_test']['options'][ $k ] : ( 'page_on_front' === $k ? $GLOBALS['llp_test']['front'] : $d ); }
function update_option( $k, $v ) { $GLOBALS['llp_test']['options'][ $k ] = $v; return true; }
function add_filter( $hook, $cb, $prio = 10, $args = 1 ) { $GLOBALS['llp_test']['filters'][ $hook ][] = $cb; return true; }
function add_action( $hook, $cb, $prio = 10, $args = 1 ) { $GLOBALS['llp_test']['actions'][ $hook ][] = $cb; return true; }
function apply_filters_test( $hook, $value, ...$args ) { foreach ( $GLOBALS['llp_test']['filters'][ $hook ] ?? array() as $cb ) { $value = $cb( $value, ...$args ); } return $value; }
function do_action_test( $hook ) { foreach ( $GLOBALS['llp_test']['actions'][ $hook ] ?? array() as $cb ) { $cb(); } }
function add_shortcode( $tag, $cb ) { $GLOBALS['llp_test']['shortcodes'][ $tag ] = $cb; }
function shortcode_atts( $pairs, $atts ) { $out = array(); foreach ( $pairs as $k => $d ) { $out[ $k ] = is_array( $atts ) && isset( $atts[ $k ] ) ? $atts[ $k ] : $d; } return $out; }
function esc_html( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8', false ); }
function esc_attr( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8', false ); }
function wp_strip_all_tags( $t ) { return trim( strip_tags( preg_replace( '@<(script|style)[^>]*?>.*?</\\1>@si', '', (string) $t ) ) ); }
function sanitize_textarea_field( $t ) { return trim( strip_tags( (string) $t ) ); }
function sanitize_text_field( $t ) { return trim( preg_replace( '/[\r\n\t ]+/', ' ', strip_tags( (string) $t ) ) ); }
function sanitize_key( $k ) { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $k ) ); }
function esc_url_raw( $u ) { return preg_match( '#^https?://#i', $u ) ? $u : ''; }
function current_time( $f ) { return $GLOBALS['llp_test']['year']; }
function is_admin() { return $GLOBALS['llp_test']['is_admin']; }
function wp_doing_ajax() { return false; }
function current_user_can( $cap ) { return ! empty( $GLOBALS['llp_test']['caps'][ $cap ] ); }
function register_setting( $group, $name, $args ) { $GLOBALS['llp_test']['settings'][ $name ] = $args; }
function register_post_meta( $type, $key, $args ) { $GLOBALS['llp_test']['meta'][ $key ] = $args; return true; }
function register_rest_route( $ns, $route, $args ) { $GLOBALS['llp_test']['routes'][ "$ns$route" ] = $args; return true; }
function rest_ensure_response( $r ) { return $r; }
function wp_list_pluck( $list, $field ) { return array_map( function ( $x ) use ( $field ) { return is_array( $x ) ? $x[ $field ] : $x->$field; }, $list ); }
function add_options_page() { return 'settings_page_llp-client-values'; }
function settings_fields( $g ) {}
function submit_button() {}
class WP_Error { public $code; public $message; public $data; public function __construct( $c = '', $m = '', $d = null ) { $this->code = $c; $this->message = $m; $this->data = $d; } }
class WP_REST_Request { private $json; public function __construct( $json ) { $this->json = $json; } public function get_json_params() { return $this->json; } }
