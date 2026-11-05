<?php
// A stand-in for Rank Math's redirection classes, for the plugin's own logic under php-wasm. It follows
// the real code where the plugin depends on it (seo-by-rank-math master, read 5 Nov 2026):
//   update_iff without an id looks among ACTIVE rows only, so inactive rows are never found
//   a relative destination is stored with the site's address (add_destination)
//   a source is stored with its leading slash taken off (sanitize_source_url)
//   410 clears the destination, and only for an integer code (add and update)
// The real thing is only proved on a staging site with Rank Math on it.

namespace RankMath {
	class Helper {
		public static function is_module_active( $id ) { return ! empty( $GLOBALS['llp_test']['rm_module'] ) && 'redirections' === $id; }
	}
}

namespace RankMath\Redirections {
	class Cache {
		public static function purge( $ids ) { $GLOBALS['llp_test']['rm_purged'][] = $ids; return 1; }
	}
	class DB {
		public static function rows() { return $GLOBALS['llp_test']['rm_rows']; }
		public static function get_redirections( $args = array() ) {
			$limit = isset( $args['limit'] ) ? $args['limit'] : 10;
			$rows  = array_values( array_filter( self::rows(), function ( $r ) { return 'trashed' !== $r['status']; } ) );
			return array( 'redirections' => array_slice( $rows, 0, $limit ), 'count' => count( $rows ) );
		}
		public static function get_redirection_by_id( $id, $status = 'all' ) {
			$r = isset( $GLOBALS['llp_test']['rm_rows'][ $id ] ) ? $GLOBALS['llp_test']['rm_rows'][ $id ] : false;
			return $r && ( 'all' === $status || $r['status'] === $status ) ? $r : false;
		}
		public static function add( $args = array() ) {
			unset( $args['id'] );
			$args = array_merge( array( 'sources' => '', 'url_to' => '', 'header_code' => '301', 'hits' => '0', 'status' => 'active' ), $args );
			if ( in_array( $args['header_code'], array( 410, 451 ), true ) ) { $args['url_to'] = ''; }
			$args['sources'] = maybe_serialize( $args['sources'] );
			$id = ++$GLOBALS['llp_test']['rm_next'];
			$args['id'] = $id;
			$GLOBALS['llp_test']['rm_rows'][ $id ] = $args;
			$GLOBALS['llp_test']['rm_adds']++;
			return $id;
		}
		public static function update( $args = array() ) {
			$id = (int) $args['id'];
			if ( ! $id ) { return false; }
			$args = array_merge( array( 'sources' => '', 'url_to' => '', 'header_code' => '301', 'status' => 'active' ), $args );
			$args['sources'] = maybe_serialize( $args['sources'] );
			if ( in_array( $args['header_code'], array( 410, 451 ), true ) ) { $args['url_to'] = ''; }
			Cache::purge( $id );
			$GLOBALS['llp_test']['rm_rows'][ $id ] = array_merge( $GLOBALS['llp_test']['rm_rows'][ $id ], $args );
			return true;
		}
		public static function update_iff( $r ) {
			if ( ! empty( $r['id'] ) ) { self::update( $r ); return $r['id']; }
			$serial = maybe_serialize( $r['sources'] );
			foreach ( self::rows() as $row ) {
				if ( 'active' === $row['status'] && $row['sources'] === $serial ) { $r['id'] = $row['id']; self::update( $r ); return $r['id']; }
			}
			return self::add( $r );
		}
		public static function delete( $ids ) {
			Cache::purge( $ids );
			foreach ( (array) $ids as $id ) { unset( $GLOBALS['llp_test']['rm_rows'][ $id ] ); }
			return count( (array) $ids );
		}
	}
	class Redirection {
		private $data; public $nocache;
		public function __construct( $data, $nocache = false ) { $this->data = $data; $this->nocache = $nocache; }
		public function add_source( $pattern, $comparison, $ignore = '' ) {
			$pattern = trim( $pattern );
			if ( '' === $pattern || '/' === $pattern ) { return; }
			$this->data['sources'][] = array( 'ignore' => $ignore, 'pattern' => ltrim( $pattern, '/' ), 'comparison' => $comparison );
		}
		public function add_destination( $url ) {
			$url = trim( $url );
			$this->data['url_to'] = '' !== $url && '/' === $url[0] ? home_url( $url ) : $url;
		}
		public function save() {
			if ( empty( $this->data['sources'] ) ) { return false; }
			if ( ! empty( $GLOBALS['llp_test']['rm_refuse_save'] ) ) { return false; }
			if ( empty( $this->nocache ) ) { $GLOBALS['llp_test']['rm_cached'] = true; }
			return DB::update_iff( $this->data );
		}
	}
}
