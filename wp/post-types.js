'use strict';

// ── The inner pages' WordPress post types (13 Nov 2026) ──────────────────────
// One line per kind of inner page: which post type it lives in on a client site, and which
// set of ACF groups (wp/acf-schema.js INNER_GROUPS) attaches to it. A base page and its
// town version share a set of fields but have their own post type, because each has its own
// Elementor template.
//
// `service`, `location` and `category-location` are the post types on the staging template
// site. `service-category` and `location-service` were not there on 13 Nov 2026: the plugin
// registers any post type on this list that the site doesn't have (page-types.php), so a
// site can't be missing one. `category` is never a post type name: WordPress uses it.
//
// The plugin reads the generated copy, wp-plugin/llp-copybot/page-post-types.json
// (npm run wp:plugin-data). A new kind of page is a line here, not code.

const POST_TYPES = [
  { page_type: 'category', scope: 'base', post_type: 'service-category',  set: 'cat', label: 'Category pages',          singular: 'Category page' },
  { page_type: 'category', scope: 'town', post_type: 'category-location', set: 'cat', label: 'Location category pages', singular: 'Location category page' },
  { page_type: 'service',  scope: 'base', post_type: 'service',           set: 'svc', label: 'Service pages',           singular: 'Service page' },
  { page_type: 'service',  scope: 'town', post_type: 'location-service',  set: 'svc', label: 'Town service pages',      singular: 'Town service page' },
  { page_type: 'location', scope: 'town', post_type: 'location',          set: 'loc', label: 'Location pages',          singular: 'Location page' },
];

// The post meta the plugin serves a page's URL from: the page map's path, "/services/patios"
const PATH_META = '_llp_path';

const postTypesForSet = set => POST_TYPES.filter(p => p.set === set).map(p => p.post_type);

// The post type of a page type and scope; a location page is always town scope
function postTypeFor(pageType, scope) {
  const hit = POST_TYPES.find(p => p.page_type === pageType && (pageType === 'location' || p.scope === (scope === 'town' ? 'town' : 'base')));
  if (!hit) throw new Error(`No WordPress post type for page type "${pageType}".`);
  return hit.post_type;
}

module.exports = { POST_TYPES, PATH_META, postTypesForSet, postTypeFor };
