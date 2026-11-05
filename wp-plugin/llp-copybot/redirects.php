<?php
/**
 * Copybot redirects: old site URLs into Rank Math's redirections.
 *
 * Copybot pushes each redirect inactive. It goes live only when a person turns the set on, on
 * launch day (Settings, Copybot redirects), or for a moment during Copybot's staging test.
 *
 * Rank Math has no tag column, so the tag is this plugin's own list: the option below holds each
 * Rank Math id Copybot made, with the old URL and the destination path. A redirect not on that
 * list is never edited or deleted, and one for the same URL is reported as a conflict.
 *
 * Three things in Rank Math's code shape this (5 Nov 2026, seo-by-rank-math master):
 * - Without an id, DB::update_iff only looks among active rows, so pushing an inactive redirect
 *   twice would add a duplicate. This always passes the saved id.
 * - A relative destination is stored with the current site's address, so on staging it holds the
 *   staging host. The path is kept here, and the destination rebuilt whenever redirects turn on.
 * - An exact source with a query string never fires: the Redirector compares against the address
 *   with the query taken off. So those rows are matched here, on rank_math/redirection/pre_search,
 *   only while their Rank Math row is active.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'LLP_COPYBOT_REDIRECTS', 'llp_copybot_redirects' );
define( 'LLP_COPYBOT_REDIRECT_CHECK', 'llp_copybot_redirect_check' );

/** What the site has: is Rank Math there, with its Redirections module on? */
function llp_redirects_ready() {
	$classes = class_exists( '\RankMath\Redirections\DB' ) && class_exists( '\RankMath\Redirections\Redirection' );
	$module  = class_exists( '\RankMath\Helper' ) && method_exists( '\RankMath\Helper', 'is_module_active' ) && \RankMath\Helper::is_module_active( 'redirections' );
	return array(
		'rank_math' => defined( 'RANK_MATH_VERSION' ),
		'module'    => (bool) $module,
		'ready'     => $classes && $module,
	);
}

function llp_redirects_refusal() {
	$r = llp_redirects_ready();
	if ( $r['ready'] ) {
		return null;
	}
	$why = $r['rank_math'] ? "Rank Math's Redirections module is off. Turn it on under Rank Math, Dashboard, Modules." : 'Rank Math is not active on this site.';
	return new WP_Error( 'llp_no_redirections', $why, array( 'status' => 409 ) );
}

/** Copybot's list: [ Rank Math id => [ source, path, code ] ]. */
function llp_redirects_list() {
	$list = get_option( LLP_COPYBOT_REDIRECTS, array() );
	return is_array( $list ) ? $list : array();
}
function llp_redirects_save_list( $list ) {
	update_option( LLP_COPYBOT_REDIRECTS, $list, false );
}

/** An old URL as it is kept here: a leading slash, no trailing slash, query string kept. */
function llp_redirect_source( $raw ) {
	$raw   = trim( (string) $raw );
	$parts = explode( '?', $raw, 2 );
	$path  = '/' . trim( $parts[0], '/' );
	return isset( $parts[1] ) && '' !== $parts[1] ? $path . '?' . $parts[1] : $path;
}

/** Every Rank Math redirect that isn't trashed: [ id => [ source, status, url_to, code ] ]. */
function llp_redirects_all() {
	$found = \RankMath\Redirections\DB::get_redirections( array( 'limit' => 100000, 'status' => 'any', 'orderby' => 'id', 'order' => 'ASC' ) );
	$out   = array();
	foreach ( (array) $found['redirections'] as $row ) {
		$sources = maybe_unserialize( $row['sources'] );
		$pattern = is_array( $sources ) && isset( $sources[0]['pattern'] ) ? $sources[0]['pattern'] : '';
		$out[ (int) $row['id'] ] = array(
			'source' => llp_redirect_source( $pattern ),
			'status' => $row['status'],
			'url_to' => $row['url_to'],
			'code'   => (int) $row['header_code'],
			'hits'   => isset( $row['hits'] ) ? (int) $row['hits'] : 0,
		);
	}
	return $out;
}

/** What the site holds: Copybot's rows, anything of Rank Math's that would clash, and the counts. */
function llp_redirects_view() {
	$ready = llp_redirects_ready();
	if ( ! $ready['ready'] ) {
		return array( 'ready' => $ready, 'items' => array(), 'other' => array(), 'active' => 0, 'inactive' => 0, 'check' => get_option( LLP_COPYBOT_REDIRECT_CHECK, null ) );
	}
	$list   = llp_redirects_list();
	$all    = llp_redirects_all();
	$items  = array();
	$active = 0;
	foreach ( $list as $id => $mine ) {
		$now = isset( $all[ $id ] ) ? $all[ $id ] : null;
		if ( $now && 'active' === $now['status'] ) {
			$active++;
		}
		$items[] = array(
			'id'      => (int) $id,
			'source'  => $mine['source'],
			'path'    => $mine['path'],
			'code'    => (int) $mine['code'],
			'status'  => $now ? $now['status'] : 'missing',
			'url_to'  => $now ? $now['url_to'] : '',
			'stored'  => $now ? $now['source'] : '',
			'hits'    => $now ? $now['hits'] : 0,
		);
	}
	$other = array();
	foreach ( $all as $id => $row ) {
		if ( ! isset( $list[ $id ] ) ) {
			$other[] = array( 'id' => $id, 'source' => $row['source'], 'status' => $row['status'] );
		}
	}
	return array( 'ready' => $ready, 'items' => $items, 'other' => $other, 'active' => $active, 'inactive' => count( $items ) - $active, 'check' => get_option( LLP_COPYBOT_REDIRECT_CHECK, null ) );
}

/** One redirect through Rank Math's own class. Returns its id, or false. */
function llp_redirect_write( $id, $source, $path, $code, $status ) {
	$data = array(
		'id'          => (int) $id,
		'header_code' => (int) $code,
		'status'      => $status,
		'sources'     => array(),
	);
	$r = new \RankMath\Redirections\Redirection( $data, true ); // true: no redirect cache rows
	$r->add_source( $source, 'exact' );
	if ( 410 !== (int) $code ) {
		$r->add_destination( $path );
	}
	return $r->save();
}

/** Create or update a batch, always inactive. A URL Rank Math already has from someone else is a conflict. */
function llp_redirects_upsert( $items ) {
	$list    = llp_redirects_list();
	$all     = llp_redirects_all();
	$by_mine = array();
	foreach ( $list as $id => $mine ) {
		$by_mine[ $mine['source'] ] = (int) $id;
	}
	$others = array();
	foreach ( $all as $id => $row ) {
		if ( ! isset( $list[ $id ] ) ) {
			$others[ $row['source'] ] = $id;
		}
	}
	$out = array( 'created' => 0, 'updated' => 0, 'conflicts' => array(), 'errors' => array() );
	foreach ( $items as $item ) {
		$source = llp_redirect_source( isset( $item['source'] ) ? $item['source'] : '' );
		$code   = isset( $item['code'] ) ? (int) $item['code'] : 301;
		$path   = isset( $item['path'] ) ? (string) $item['path'] : '';
		if ( '/' === $source || ! in_array( $code, array( 301, 410 ), true ) || ( 301 === $code && '' === $path ) ) {
			$out['errors'][] = array( 'source' => $source, 'error' => 'Not a redirect this plugin can make.' );
			continue;
		}
		if ( isset( $others[ $source ] ) ) {
			$out['conflicts'][] = array( 'source' => $source, 'id' => $others[ $source ] );
			continue;
		}
		$known = isset( $by_mine[ $source ] ) && isset( $all[ $by_mine[ $source ] ] ) ? $by_mine[ $source ] : 0;
		$id    = llp_redirect_write( $known, $source, $path, $code, 'inactive' );
		if ( ! $id ) {
			$out['errors'][] = array( 'source' => $source, 'error' => 'Rank Math did not save it.' );
			continue;
		}
		if ( isset( $by_mine[ $source ] ) && (int) $by_mine[ $source ] !== (int) $id ) {
			unset( $list[ $by_mine[ $source ] ] );
		}
		$list[ (int) $id ] = array( 'source' => $source, 'path' => $path, 'code' => $code );
		$by_mine[ $source ] = (int) $id;
		$out[ $known ? 'updated' : 'created' ]++;
	}
	llp_redirects_save_list( $list );
	return $out;
}

/** Delete Copybot's rows only: the ids given, or all of them. */
function llp_redirects_delete( $ids, $all = false ) {
	$list   = llp_redirects_list();
	$mine   = $all ? array_keys( $list ) : array_values( array_filter( array_map( 'intval', (array) $ids ), function ( $id ) use ( $list ) {
		return isset( $list[ $id ] );
	} ) );
	if ( $mine ) {
		\RankMath\Redirections\DB::delete( $mine );
		foreach ( $mine as $id ) {
			unset( $list[ $id ] );
		}
		llp_redirects_save_list( $list );
	}
	return array( 'deleted' => count( $mine ) );
}

/**
 * Turn Copybot's rows on or off. On rebuilds each destination from this site's address, so a set made
 * on staging points at the live domain once the site has moved there.
 */
function llp_redirects_set_status( $status ) {
	$list = llp_redirects_list();
	$done = 0;
	$all  = llp_redirects_all();
	foreach ( $list as $id => $mine ) {
		if ( ! isset( $all[ $id ] ) ) {
			continue;
		}
		if ( llp_redirect_write( $id, $mine['source'], $mine['path'], $mine['code'], $status ) ) {
			$done++;
		}
	}
	return array( 'status' => $status, 'changed' => $done, 'total' => count( $list ) );
}

// An old URL with a query string: Rank Math's own matching can't fire it (see the top of this file)
add_filter(
	'rank_math/redirection/pre_search',
	function ( $pre, $uri = '', $full_uri = '' ) {
		if ( null !== $pre || ! is_string( $full_uri ) || false === strpos( $full_uri, '?' ) || ! class_exists( '\RankMath\Redirections\DB' ) ) {
			return $pre;
		}
		$want = llp_redirect_source( $full_uri );
		foreach ( llp_redirects_list() as $id => $mine ) {
			if ( $mine['source'] !== $want ) {
				continue;
			}
			$row = \RankMath\Redirections\DB::get_redirection_by_id( $id, 'active' );
			if ( $row ) {
				$row['llp_query_row'] = true;
				return $row;
			}
		}
		return $pre;
	},
	10,
	3
);
// That row's query string was what matched: it isn't passed on to the destination
add_filter(
	'rank_math/redirection/add_query_string',
	function ( $add, $matched = array() ) {
		return is_array( $matched ) && ! empty( $matched['llp_query_row'] ) ? false : $add;
	},
	10,
	2
);

add_action(
	'rest_api_init',
	function () {
		$admin = function () {
			return current_user_can( 'manage_options' );
		};
		$guarded = function ( $fn ) {
			return function ( $request = null ) use ( $fn ) {
				$no = llp_redirects_refusal();
				return $no ? $no : rest_ensure_response( $fn( $request ) );
			};
		};
		register_rest_route(
			'llp-copybot/v1',
			'/redirects',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => function () {
						return rest_ensure_response( llp_redirects_view() );
					},
					'permission_callback' => $admin,
				),
				array(
					'methods'             => 'POST',
					'callback'            => $guarded(
						function ( $request ) {
							$body = $request->get_json_params();
							return llp_redirects_upsert( is_array( $body ) && isset( $body['items'] ) && is_array( $body['items'] ) ? $body['items'] : array() );
						}
					),
					'permission_callback' => $admin,
				),
			)
		);
		register_rest_route(
			'llp-copybot/v1',
			'/redirects/delete',
			array(
				'methods'             => 'POST',
				'callback'            => $guarded(
					function ( $request ) {
						$body = $request->get_json_params();
						return llp_redirects_delete( is_array( $body ) && isset( $body['ids'] ) ? $body['ids'] : array(), is_array( $body ) && ! empty( $body['all'] ) );
					}
				),
				'permission_callback' => $admin,
			)
		);
		register_rest_route(
			'llp-copybot/v1',
			'/redirects/status',
			array(
				'methods'             => 'POST',
				'callback'            => function ( $request ) {
					$no = llp_redirects_refusal();
					if ( $no ) {
						return $no;
					}
					$body   = $request->get_json_params();
					$status = is_array( $body ) && isset( $body['status'] ) ? $body['status'] : '';
					if ( ! in_array( $status, array( 'active', 'inactive' ), true ) ) {
						return new WP_Error( 'llp_bad_status', 'Send active or inactive.', array( 'status' => 400 ) );
					}
					return rest_ensure_response( llp_redirects_set_status( $status ) );
				},
				'permission_callback' => $admin,
			)
		);
		register_rest_route(
			'llp-copybot/v1',
			'/redirects/check',
			array(
				'methods'             => 'POST',
				'callback'            => function ( $request ) {
					$body = $request->get_json_params();
					$keep = array(
						'block' => is_array( $body ) && isset( $body['block'] ) ? (int) $body['block'] : 0,
						'warn'  => is_array( $body ) && isset( $body['warn'] ) ? (int) $body['warn'] : 0,
						'at'    => is_array( $body ) && isset( $body['at'] ) ? sanitize_text_field( $body['at'] ) : '',
					);
					update_option( LLP_COPYBOT_REDIRECT_CHECK, $keep, false );
					return rest_ensure_response( $keep );
				},
				'permission_callback' => $admin,
			)
		);
	}
);

// ── Settings → Copybot redirects: the launch day switch ─────────────────────────

add_action(
	'admin_menu',
	function () {
		add_options_page( 'Copybot redirects', 'Copybot redirects', 'manage_options', 'llp-redirects', 'llp_redirects_page' );
	}
);

add_action(
	'admin_post_llp_redirects_switch',
	function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( 'Not allowed.' );
		}
		check_admin_referer( 'llp_redirects_switch' );
		$status = isset( $_POST['llp_status'] ) && 'active' === $_POST['llp_status'] ? 'active' : 'inactive';
		if ( ! llp_redirects_refusal() ) {
			llp_redirects_set_status( $status );
		}
		wp_safe_redirect( admin_url( 'options-general.php?page=llp-redirects' ) );
		exit;
	}
);

function llp_redirects_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$view = llp_redirects_view();
	echo '<div class="wrap"><h1>Copybot redirects</h1>';
	$no = llp_redirects_refusal();
	if ( $no ) {
		echo '<div class="notice notice-error"><p>' . esc_html( $no->message ) . '</p></div></div>';
		return;
	}
	printf( '<p>%d redirects from Copybot: <strong>%d on</strong>, %d off. They are off until launch. Their destinations are rebuilt from this site\'s address when they turn on.</p>', count( $view['items'] ), (int) $view['active'], (int) $view['inactive'] );
	if ( is_array( $view['check'] ) ) {
		printf( '<p>Copybot\'s last pre launch check (%s): <strong>%d BLOCK</strong>, %d WARN.</p>', esc_html( $view['check']['at'] ), (int) $view['check']['block'], (int) $view['check']['warn'] );
		if ( $view['check']['block'] > 0 ) {
			echo '<div class="notice notice-warning"><p>The last check found BLOCK issues. Fix them in Copybot and run it again before turning these on.</p></div>';
		}
	}
	echo '<form method="post" action="' . esc_attr( admin_url( 'admin-post.php' ) ) . '">';
	echo '<input type="hidden" name="action" value="llp_redirects_switch">';
	wp_nonce_field( 'llp_redirects_switch' );
	$on = $view['active'] > 0;
	echo '<input type="hidden" name="llp_status" value="' . ( $on ? 'inactive' : 'active' ) . '">';
	submit_button( $on ? 'Turn off Copybot redirects' : 'Turn on Copybot redirects' );
	echo '</form></div>';
}
