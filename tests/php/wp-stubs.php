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
	// The post types the staging template site had on 13 Nov 2026, and no entries yet
	'post_types' => array( 'service' => array(), 'location' => array(), 'category-location' => array() ),
	'supports' => array(), 'meta_types' => array(), 'posts' => array(), 'flushes' => 0,
);

// For page-types.php: post types, and entries as array( id => array( 'type', 'status', 'meta' => array() ) )
function post_type_exists( $t ) { return isset( $GLOBALS['llp_test']['post_types'][ $t ] ); }
function register_post_type( $t, $args ) { $GLOBALS['llp_test']['post_types'][ $t ] = $args; return true; }
function add_post_type_support( $t, $feature ) { $GLOBALS['llp_test']['supports'][ $t ][] = $feature; }
function flush_rewrite_rules( $hard = true ) { $GLOBALS['llp_test']['flushes']++; }
function user_trailingslashit( $s ) { return rtrim( $s, '/' ) . '/'; }
function get_post_type( $id ) { return $GLOBALS['llp_test']['posts'][ $id ]['type'] ?? false; }
function get_post_meta( $id, $key, $single = false ) { return $GLOBALS['llp_test']['posts'][ $id ]['meta'][ $key ] ?? ''; }
function get_posts( $a ) {
	$ids = array();
	foreach ( $GLOBALS['llp_test']['posts'] as $id => $p ) {
		if ( 'trash' === $p['status'] || ! in_array( $p['type'], (array) $a['post_type'], true ) ) { continue; }
		if ( ( $p['meta'][ $a['meta_key'] ] ?? null ) !== $a['meta_value'] ) { continue; }
		$ids[] = $id;
	}
	sort( $ids );
	return array_slice( $ids, 0, $a['numberposts'] );
}

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
function register_post_meta( $type, $key, $args ) { $GLOBALS['llp_test']['meta_types'][ $key ][] = $type;$GLOBALS['llp_test']['meta'][ $key ] = $args; return true; }
function register_rest_route( $ns, $route, $args ) { $GLOBALS['llp_test']['routes'][ "$ns$route" ] = $args; return true; }
function rest_ensure_response( $r ) { return $r; }
function wp_list_pluck( $list, $field ) { return array_map( function ( $x ) use ( $field ) { return is_array( $x ) ? $x[ $field ] : $x->$field; }, $list ); }
function add_options_page() { return 'settings_page_llp-client-values'; }
function settings_fields( $g ) {}
function submit_button() {}
class WP_Error { public $code; public $message; public $data; public function __construct( $c = '', $m = '', $d = null ) { $this->code = $c; $this->message = $m; $this->data = $d; } }
class WP_REST_Request { private $json; public function __construct( $json ) { $this->json = $json; } public function get_json_params() { return $this->json; } }

// For redirects.php
function maybe_serialize( $d ) { return is_array( $d ) || is_object( $d ) ? serialize( $d ) : $d; }
function maybe_unserialize( $d ) { if ( is_string( $d ) ) { $u = @unserialize( $d ); if ( false !== $u || 'b:0;' === $d ) { return $u; } } return $d; }
function home_url( $path = '' ) { return ( $GLOBALS['llp_test']['site_url'] ?? 'https://site.test' ) . $path; }
function admin_url( $path = '' ) { return 'https://site.test/wp-admin/' . $path; }
function wp_nonce_field( $a ) { echo '<input type="hidden" name="_wpnonce" value="x">'; }
function check_admin_referer( $a ) { return true; }
function wp_safe_redirect( $u ) { return true; }
function wp_die( $m ) { throw new Exception( $m ); }

// For review-funnel.php: the outside calls are recorded, and answer as the test sets them
function __return_true() { return true; }
function is_email( $e ) { return (bool) preg_match( '/^[^\s@]+@[^\s@]+\.[^\s@]+$/', (string) $e ); }
function esc_url( $u ) { return preg_match( '#^https?://#i', (string) $u ) ? htmlspecialchars( (string) $u, ENT_QUOTES, 'UTF-8', false ) : ''; }
function rest_url( $path = '' ) { return home_url( '/wp-json/' . ltrim( $path, '/' ) ); }
function get_privacy_policy_url() { return $GLOBALS['llp_test']['privacy_url'] ?? ''; }
function wp_json_encode( $d ) { return json_encode( $d ); }
function get_transient( $k ) { return $GLOBALS['llp_test']['transients'][ $k ] ?? false; }
function set_transient( $k, $v, $ttl = 0 ) { $GLOBALS['llp_test']['transients'][ $k ] = $v; return true; }
function wp_remote_post( $url, $args ) {
	$GLOBALS['llp_test']['remote_calls'][] = array( 'url' => $url, 'body' => json_decode( $args['body'], true ) );
	$code = $GLOBALS['llp_test']['remote_code'] ?? 200;
	return 0 === $code ? new WP_Error( 'http_request_failed', 'timed out' ) : array( 'response' => array( 'code' => $code ) );
}
function is_wp_error( $x ) { return $x instanceof WP_Error; }
function wp_remote_retrieve_response_code( $r ) { return is_array( $r ) ? $r['response']['code'] : ''; }
function wp_mail( $to, $subject, $body ) { $GLOBALS['llp_test']['mails'][] = array( 'to' => $to, 'subject' => $subject, 'body' => $body ); return $GLOBALS['llp_test']['mail_ok'] ?? true; }
