'use strict';

// ── Reading one page's HTML ───────────────────────────────────────────────────────
// What the audit needs from a page, read from the raw HTML with no JavaScript run:
// title, H1, meta description, canonical, noindex, the links, the main text, and the facts the
// issues are built from (displayed phones, tel: links, postcodes, links to other hosts).

const cheerio = require('cheerio');
const { normPhone, POSTCODE_RE } = require('../citations/nap');
const URL_PATTERNS = require('./url-patterns.json');

const BLOCK = new Set(['address', 'article', 'aside', 'blockquote', 'br', 'dd', 'div', 'dl', 'dt', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'td', 'th', 'tr', 'ul']);
const NEVER = new Set(['script', 'style', 'noscript', 'template', 'svg', 'iframe']);
const CHROME = 'nav, header, footer, aside, form, [role="navigation"], [role="banner"], [role="contentinfo"], [data-elementor-type="header"], [data-elementor-type="footer"], .elementor-location-header, .elementor-location-footer, #cookie-notice, .cookie-notice';
const MAIN = ['main', '[role="main"]', '[data-elementor-type="wp-page"]', '[data-elementor-type="single-page"]', 'article', '.entry-content', '#content', '#main'];

function collect(node, out) {
  if (!node) return;
  if (node.type === 'text') { out.push(node.data); return; }
  if (node.type !== 'tag' && node.type !== 'root') return;
  if (NEVER.has(node.name)) return;
  const block = BLOCK.has(node.name);
  out.push(block ? '\n' : ' ');
  for (const c of node.children || []) collect(c, out);
  out.push(block ? '\n' : ' ');
}
const textOf = el => {
  const out = [];
  el.each((_, n) => collect(n, out));
  return out.join('').split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
};
const words = t => (String(t || '').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;

// A UK phone number as written on a page, kept as written for a person to recognise
const PHONE = /(?<![\d+])(?:\+44[\s-]?(?:\(0\)[\s-]?)?|0044[\s-]?|0)[1-9](?:[\s\-().]?\d){8,9}(?!\d)/g;
const validPhone = d => (d.length === 10 || d.length === 11) && /^0[123578]/.test(d);
const postcodesOf = text => [...new Set([...String(text || '').matchAll(new RegExp(POSTCODE_RE.source, 'gi'))].map(m => `${m[1]}${m[2]}`.toUpperCase()))];

function looksLikeLogo($, a) {
  const el = $(a);
  const img = el.find('img').first();
  const hay = [el.attr('class'), el.attr('id'), el.attr('aria-label'), img.attr('class'), img.attr('alt'), img.attr('src'), el.closest('.elementor-widget-theme-site-logo, .site-logo, .custom-logo-link, .logo').length ? 'logo' : ''].join(' ');
  return /logo/i.test(hay);
}

// tools: site-audit/urls.js createUrlTools. url: the page's own address.
function parsePage(html, url, tools) {
  const $ = cheerio.load(String(html || ''));
  const title = $('title').first().text().replace(/\s+/g, ' ').trim();
  const h1 = textOf($('h1').first()).replace(/\n/g, ' ');
  const metaOf = name => { let v = ''; $('meta').each((_, m) => { if (!v && String($(m).attr('name') || '').toLowerCase() === name) v = String($(m).attr('content') || '').trim(); }); return v; };
  const metaDescription = metaOf('description');
  const robots = metaOf('robots').toLowerCase();
  let canonicalRaw = '';
  $('link').each((_, l) => { if (!canonicalRaw && String($(l).attr('rel') || '').toLowerCase() === 'canonical') canonicalRaw = String($(l).attr('href') || '').trim(); });
  const canonicalUrl = canonicalRaw ? tools.parse(canonicalRaw, url) : null;

  const internal = new Set();
  const hosts = new Map(); // other host → where it was seen
  let httpLinks = 0, otherWww = 0;
  const rank = { logo: 3, link: 2, image: 1, canonical: 1 };
  const noteHost = (host, where) => {
    const k = String(host || '').toLowerCase();
    if (!k) return;
    const was = hosts.get(k);
    if (!was || rank[where] > rank[was]) hosts.set(k, where);
  };
  const base = new URL(tools.origin);
  const self = tools.key(url);
  $('a[href]').each((_, a) => {
    const href = String($(a).attr('href') || '').trim();
    if (!href || /^(#|mailto:|tel:|sms:|javascript:|whatsapp:)/i.test(href)) return;
    const u = tools.parse(href, url);
    if (!u) return;
    if (tools.sameSite(u.hostname)) {
      if (u.protocol !== base.protocol) httpLinks++;
      if (u.hostname.toLowerCase() !== base.hostname.toLowerCase()) otherWww++;
      const k = tools.key(u.href);
      if (k && k !== self) internal.add(k);
    } else noteHost(u.hostname, looksLikeLogo($, a) ? 'logo' : 'link');
  });
  $('img[src]').each((_, i) => {
    const u = tools.parse($(i).attr('src'), url);
    if (u && !tools.sameSite(u.hostname)) noteHost(u.hostname, 'image');
  });
  if (canonicalUrl && !tools.sameSite(canonicalUrl.hostname)) noteHost(canonicalUrl.hostname, 'canonical');

  const tel = [];
  $('a[href]').each((_, a) => {
    const href = String($(a).attr('href') || '').trim();
    if (!/^tel:/i.test(href)) return;
    let v = href.slice(4);
    try { v = decodeURIComponent(v); } catch (_) {}
    const d = normPhone(v);
    if (validPhone(d) && !tel.includes(d)) tel.push(d);
  });

  // The whole body for phones and postcodes (they usually sit in the header and footer); no script or style
  const bodyText = textOf($('body').length ? $('body') : $.root());
  const shown = new Map();
  for (const m of bodyText.matchAll(PHONE)) {
    const d = normPhone(m[0]);
    if (validPhone(d) && !shown.has(d)) shown.set(d, m[0].replace(/\s+/g, ' ').trim());
  }

  // The main text: the page's main element, else the body with the header, footer and menus taken out
  const page = cheerio.load(String(html || ''));
  page(CHROME).remove();
  let mainEl = null;
  for (const sel of MAIN) { const el = page(sel).first(); if (el.length && words(textOf(el)) >= 20) { mainEl = el; break; } }
  const mainText = textOf(mainEl || (page('body').length ? page('body') : page.root()));

  return {
    title, h1, metaDescription, canonical: canonicalUrl ? canonicalUrl.href : canonicalRaw, noindex: /noindex/.test(robots),
    links: [...internal],
    mainText, wordCount: words(mainText), bodyWords: words(bodyText),
    facts: {
      tel,
      phones: [...shown].map(([digits, raw]) => ({ digits, raw })),
      postcodes: postcodesOf(bodyText),
      other_hosts: [...hosts].map(([host, where]) => ({ host, where })),
      http_links: httpLinks, other_www_links: otherWww,
    },
  };
}

// The platform, from the page itself (DataForSEO's field is wrong: it called the test site "methode")
function detectPlatform(html, headers = {}) {
  const s = String(html || '');
  const header = k => { try { return (headers.get ? headers.get(k) : headers[k]) || ''; } catch (_) { return ''; } };
  const generator = [...s.matchAll(/<meta[^>]+name=["']generator["'][^>]*content=["']([^"']+)/gi)].map(m => m[1]).join(' | ');
  const tests = [
    ['WordPress', [[/\/wp-content\//i, 'files under /wp-content/'], [/\/wp-includes\//i, 'files under /wp-includes/'], [/\/wp-json\//i, 'a /wp-json/ link'], [/generator["'][^>]*content=["']WordPress/i, 'the generator tag']]],
    ['Wix', [[/wixstatic\.com/i, 'images on wixstatic.com'], [/generator["'][^>]*content=["']Wix/i, 'the generator tag'], [/_wix(Code|Fonts|_)/, 'Wix scripts']]],
    ['Squarespace', [[/static1\.squarespace\.com|assets\.squarespace\.com/i, 'files on squarespace.com'], [/Static\.SQUARESPACE_CONTEXT/, 'the Squarespace context script'], [/generator["'][^>]*content=["']Squarespace/i, 'the generator tag']]],
    // After the builders above: their sites often carry a LeadConnector chat widget, which proves nothing
    ['GoHighLevel', URL_PATTERNS.platforms.GoHighLevel.markers.map(m => [new RegExp(m.pattern, 'i'), m.why])],
    ['GoDaddy builder', [[/generator["'][^>]*content=["'][^"']*(Go ?Daddy|Starfield)/i, 'the generator tag'], [/img\d*\.wsimg\.com/i, 'images on wsimg.com'], [/GoDaddy Website Builder/i, 'the page text']]],
  ];
  for (const [name, marks] of tests) {
    const hit = marks.filter(([re]) => re.test(s)).map(([, why]) => why);
    if (name === 'Wix' && header('x-wix-request-id')) hit.push('a Wix response header');
    if (hit.length) return { platform: name, evidence: hit };
  }
  return { platform: 'Other', evidence: generator ? [`the generator tag says "${generator.slice(0, 80)}"`] : ['no known markers on the homepage'] };
}

// A page that answers 200 and says it isn't there: not a homepage
function looksNotFound(html) {
  const s = String(html || '');
  const title = (s.match(/<title[^>]*>([^<]*)/i) || [])[1] || '';
  const visible = s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ');
  return words(visible) < 150 && (/\b404\b|not found/i.test(title) || /page (was )?not found|page (does not|doesn't) exist/i.test(visible));
}

// A challenge or refusal instead of the page: the reason in plain English, else ''
function blockReason(status, html) {
  const s = String(html || '');
  if (status === 403 || status === 401) return `the site answered ${status}, which means it refused the request`;
  if (status === 429) return 'the site answered 429, which means too many requests';
  // Read the words a person sees, not the scripts: Cloudflare puts its challenge script on normal
  // pages, and a contact form's reCAPTCHA says "captcha" (the test site's /contact, 5 Nov).
  const visible = s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ');
  const count = words(visible);
  const shown = status === 503 || status === 200 || status === 202;
  if (shown && count < 150 && /just a moment|attention required|verify you are human|are you human|checking your browser|access denied|ddos protection|complete the security check/i.test(visible)) return 'the site showed a "prove you are human" page';
  if (shown && count < 30 && /cf-chl|challenge-platform|captcha/i.test(s)) return 'the site showed a "prove you are human" page';
  if (status === 503) return 'the site answered 503, which means it was unavailable';
  return '';
}

module.exports = { parsePage, detectPlatform, blockReason, looksNotFound, textOf, words };
