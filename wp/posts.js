'use strict';

// ── WordPress posts (the blog push, stage 7) ─────────────────────────────────
// The REST calls a post needs beyond the pages': find a post by its slug in any status,
// create one, update one, and the Guides category (made when the site has none).

const { wpGet, wpPost } = require('./client');
const { GUIDES } = require('./blog-map');

// The post with the slug, any status, with its ACF fields and meta (context=edit: raw values)
async function findPost(site, slug) {
  if (!slug) return null;
  const posts = await wpGet(site, `/wp/v2/posts?slug=${encodeURIComponent(slug)}&status=any&context=edit`);
  return Array.isArray(posts) && posts.length ? posts[0] : null;
}

// The Guides category's id, created when the site has none
async function ensureGuidesCategory(site) {
  const found = await wpGet(site, `/wp/v2/categories?slug=${encodeURIComponent(GUIDES.slug)}`);
  if (Array.isArray(found) && found.length) return { id: found[0].id, created: false };
  const made = await wpPost(site, '/wp/v2/categories', { name: GUIDES.name, slug: GUIDES.slug });
  return { id: made.id, created: true };
}

async function createPost(site, body) { return wpPost(site, '/wp/v2/posts', body); }
async function updatePost(site, id, body) { return wpPost(site, `/wp/v2/posts/${id}`, body); }
async function getPost(site, id) { return wpGet(site, `/wp/v2/posts/${id}?context=edit`); }

module.exports = { findPost, ensureGuidesCategory, createPost, updatePost, getPost };
