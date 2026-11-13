'use strict';

// ── WordPress REST client (read side for the dry run) ───────────────────────
// Auth: a WordPress Application Password (Basic auth over HTTPS; http only for
// localhost, e.g. the fake server). The homepage is the page set as the site's
// front page, or the page with the slug given.

function authHeader(site) {
  return 'Basic ' + Buffer.from(`${site.user}:${site.appPassword}`).toString('base64');
}

function assertSafeUrl(url) {
  const u = new URL(url);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
  if (u.protocol !== 'https:' && !local) throw new Error(`${url}: WordPress Application Passwords need https.`);
}

async function wpGet(site, path) {
  assertSafeUrl(site.url);
  const r = await fetch(new URL(`/wp-json${path}`, site.url), { headers: { Authorization: authHeader(site), Accept: 'application/json' } });
  const body = await r.text();
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}: ${body.slice(0, 200)}`);
  return JSON.parse(body);
}

async function wpPost(site, path, body) {
  assertSafeUrl(site.url);
  const r = await fetch(new URL(`/wp-json${path}`, site.url), {
    method: 'POST',
    headers: { Authorization: authHeader(site), Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`POST ${path} → ${r.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

// Every page read asks for these fields only (3 Nov 2026, Brandon): a response that includes
// `content` comes back with `acf: []` on an Elementor front page (rendering the content
// moves ACF off the page), so the fields the dry run, the attachment check, the diff and the
// read-back need are named and content is never asked for.
const PAGE_FIELDS = 'id,slug,status,title,acf,meta';
const pageQuery = `context=edit&_fields=${PAGE_FIELDS}`;

// The homepage, with its ACF fields and meta (context=edit returns raw values)
async function findHomepage(site) {
  if (site.homepageSlug) {
    const pages = await wpGet(site, `/wp/v2/pages?slug=${encodeURIComponent(site.homepageSlug)}&status=any&${pageQuery}`);
    return pages[0] || null;
  }
  const settings = await wpGet(site, '/wp/v2/settings');
  if (!settings.page_on_front) return null;
  return readPage(site, settings.page_on_front);
}

// A page by its slug, whatever its status ("/service-terms" or "service-terms")
async function findPageBySlug(site, slug) {
  const pages = await wpGet(site, `/wp/v2/pages?slug=${encodeURIComponent(String(slug).replace(/^\/+/, ''))}&status=any&${pageQuery}`);
  return pages[0] || null;
}

// One page by id, the same fields (the read-back after a push or a rollback). rest: the REST base of
// the entry's post type, for an inner page ("service", "category-location"); the answer carries it
async function readPage(site, id, rest = 'pages') {
  const page = await wpGet(site, `/wp/v2/${rest}/${id}?${pageQuery}`);
  return rest === 'pages' ? page : { ...page, rest };
}

// An inner page (category, service, location) is the entry at the record's page map URL, in whichever of
// the five post types holds it: the plugin's list finds it (page-types.php), then it is read like a page
async function findInnerPage(site, record) {
  const path = record && record.page_slug;
  if (!path) return null;
  let items;
  try { items = (await wpGet(site, '/llp-copybot/v1/pages')).items || []; }
  catch (e) { if (/→ 404/.test(e.message)) return null; throw e; }
  const hit = items.find(i => i.path === path);
  return hit ? readPage(site, hit.id, hit.post_type) : null;
}

module.exports = { findHomepage, findPageBySlug, findInnerPage, readPage, wpGet, wpPost, authHeader, PAGE_FIELDS };
