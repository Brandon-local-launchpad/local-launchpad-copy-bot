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

// The homepage, with its ACF fields and meta (context=edit returns raw values)
async function findHomepage(site) {
  if (site.homepageSlug) {
    const pages = await wpGet(site, `/wp/v2/pages?slug=${encodeURIComponent(site.homepageSlug)}&status=any&context=edit`);
    return pages[0] || null;
  }
  const settings = await wpGet(site, '/wp/v2/settings');
  if (!settings.page_on_front) return null;
  return wpGet(site, `/wp/v2/pages/${settings.page_on_front}?context=edit`);
}

module.exports = { findHomepage, wpGet, authHeader };
