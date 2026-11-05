'use strict';

// ── One URL, one row ──────────────────────────────────────────────────────────────
// Every source writes a URL its own way: DataForSEO lists http:// and https:// homepages as two
// pages, a crawl sees /contact and /contact/. key() turns them all into one address: the live
// site's scheme and host (www or not, as the homepage settled on), no fragment, no tracking
// parameters, no trailing slash except the homepage. Other query strings stay, because an old
// ?id=5 URL is its own page to redirect. A subdomain keeps its own host.

const TRACKING = /^(utm_.+|gclid|fbclid|msclkid|_ga|_gl|mc_cid|mc_eid)$/i;
const SKIP_PATH = /^\/(wp-json|wp-admin|wp-login\.php|xmlrpc\.php|cdn-cgi|wp-cron\.php)(\/|$)|^\/(widget|v2\/preview)\/|\/(feed|embed|trackback)\/?$/i;
const SKIP_QUERY = /(^|&)(replytocom|add-to-cart|share|preview|s|wc-ajax|rest_route|elementor-preview)=/i;
const ASSET = /\.(css|js|mjs|map|woff2?|ttf|eot|otf|json|xml|xsl|txt|gz|zip|rar|mp3|mp4|mov|webm|avi)$/i;
const IMAGE = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico|tiff?)$/i;
const DOC = /\.(pdf|docx?|xlsx?|pptx?)$/i;
const stripWww = h => String(h || '').toLowerCase().replace(/^www\./, '');

function kindOf(pathname) {
  if (IMAGE.test(pathname)) return 'image';
  if (DOC.test(pathname)) return 'pdf';
  return 'page';
}

function createUrlTools(origin) {
  const base = new URL(origin);
  const siteHost = stripWww(base.hostname);
  const sameSite = h => stripWww(h) === siteHost;
  const ofSite = h => { const x = stripWww(h); return x === siteHost || x.endsWith(`.${siteHost}`); };
  const parse = (raw, from = base.href) => {
    try {
      const u = new URL(String(raw || '').trim(), from);
      return u.protocol === 'http:' || u.protocol === 'https:' ? u : null;
    } catch (_) { return null; }
  };
  function key(raw, from) {
    const u = parse(raw, from);
    if (!u || !ofSite(u.hostname)) return null;
    u.hash = '';
    for (const p of [...u.searchParams.keys()]) if (TRACKING.test(p)) u.searchParams.delete(p);
    if (sameSite(u.hostname)) { u.protocol = base.protocol; u.hostname = base.hostname; u.port = base.port; }
    else u.protocol = 'https:';
    const path = u.pathname.length > 1 ? u.pathname.replace(/\/+$/, '') || '/' : '/';
    return `${u.protocol}//${u.host}${path}${u.search}`;
  }
  // Worth fetching at all? Scripts, feeds, the WordPress back end and search or cart links are not pages
  function crawlable(k) {
    const u = parse(k);
    if (!u) return false;
    if (SKIP_PATH.test(u.pathname) || ASSET.test(u.pathname)) return false;
    return !SKIP_QUERY.test(u.search.replace(/^\?/, ''));
  }
  const pathOf = k => { const u = parse(k); return u ? `${u.pathname}${u.search}` : ''; };
  return { origin: `${base.protocol}//${base.host}`, siteHost, sameSite, ofSite, parse, key, crawlable, pathOf, kind: k => { const u = parse(k); return u ? kindOf(u.pathname) : 'page'; } };
}

// The form the API takes: example.co.uk, no scheme, no www
const targetOf = origin => stripWww(new URL(origin).hostname);

module.exports = { createUrlTools, kindOf, stripWww, targetOf };
