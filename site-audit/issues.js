'use strict';

// ── Issues found on the old site, in plain English ────────────────────────────────
// Built from each page's facts (site-audit/html.js) and the check of the four homepage forms:
//   the phone a page shows against its own tap to call link, and both against Client Values;
//   a postcode other than the Client Values one; links to temporary or staging hosts;
//   mixed http and https, www and non www; a homepage form that takes more than one hop.

const NONLIVE = require('./non-live-hosts.json');
const { normPhone, postcodeOf } = require('../citations/nap');

const isNonLive = (host, siteHost) => {
  const h = String(host || '').toLowerCase().replace(/^www\./, '');
  if (!h) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) return true;
  if (NONLIVE.hosts.some(x => h === x || h.endsWith(`.${x}`))) return true;
  return !!siteHost && h.endsWith(`.${siteHost}`) && NONLIVE.subdomain_prefixes.some(p => h === `${p}.${siteHost}` || h.startsWith(`${p}.`) || h.startsWith(`${p}-`));
};
const spaced = d => (d.startsWith('02') && d.length === 11 ? `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}` : d.length === 11 ? `${d.slice(0, 5)} ${d.slice(5)}` : d);
const pagesWord = n => `${n} ${n === 1 ? 'page' : 'pages'}`;
const WHERE = { logo: 'The logo links to', link: 'A link goes to', image: 'An image loads from', canonical: 'The canonical tag points at' };

// pages: [{ url, path, facts }], variants: [{ url, hops, final, status, ok }], cv: client values, siteHost
// URLs that answer an error while many of the site's own pages link to them. Many means the setting's
// number of pages, or that share of the pages read, whichever is fewer, and always at least 2.
// urls: [{ path, status_code, links_out, url }]. Returns [{ path, status, from: [paths] }], worst first.
function deadLinks(urls, { minPages = 5, share = 0.3 } = {}) {
  const read = urls.filter(u => Array.isArray(u.links_out));
  const need = Math.max(2, Math.min(minPages, Math.ceil(read.length * share)));
  const out = [];
  for (const u of urls) {
    if (!(u.status_code >= 400)) continue;
    const from = read.filter(p => p.url !== u.url && p.links_out.includes(u.url)).map(p => p.path);
    if (from.length >= need) out.push({ path: u.path, status: u.status_code, from });
  }
  return out.sort((a, b) => b.from.length - a.from.length);
}

function buildIssues({ pages, variants = [], cv = {}, siteHost = '', origin = '', dead = [] }) {
  const issues = [];
  const add = (kind, text, detail, urls = []) => issues.push({ kind, text, detail, pages: urls.slice(0, 25), page_count: urls.length });

  // A dead end most of the site points at
  for (const d of dead) add('dead_internal_link', `${d.path} answers ${d.status}, and ${pagesWord(d.from.length)} ${d.from.length === 1 ? 'links' : 'link'} to it`, "Visitors following that link hit a dead end today. Check the new site has a page there, and that the template's links are right.", d.from);

  // The page's own phone against its tap to call link
  const pairs = new Map();
  for (const p of pages) {
    const f = p.facts || {};
    const shown = (f.phones || []).map(x => x.digits);
    const tel = f.tel || [];
    if (!shown.length || !tel.length) continue;
    for (const t of tel) {
      if (shown.includes(t)) continue;
      const seen = (f.phones || [])[0];
      const key = `${seen.digits}|${t}`;
      if (!pairs.has(key)) pairs.set(key, { raw: seen.raw, tel: t, urls: [] });
      pairs.get(key).urls.push(p.path);
    }
  }
  for (const { raw, tel, urls } of pairs.values()) add('phone_mismatch', `The page shows ${raw}, but the tap to call link dials ${spaced(tel)} (${pagesWord(urls.length)})`, 'Callers tapping the number reach a different number from the one on the page. Check which is right before anything is copied across.', urls);

  // Against Client Values
  const cvPhone = normPhone(cv.phone || '');
  if (cvPhone) {
    const other = new Map();
    for (const p of pages) {
      const f = p.facts || {};
      const shown = new Map((f.phones || []).map(x => [x.digits, x.raw]));
      for (const t of f.tel || []) if (!shown.has(t)) shown.set(t, spaced(t));
      for (const [d, raw] of shown) {
        if (d === cvPhone) continue;
        if (!other.has(d)) other.set(d, { raw, urls: [] });
        other.get(d).urls.push(p.path);
      }
    }
    for (const { raw, urls } of other.values()) add('phone_vs_record', `${raw} is on the site, but the client's phone on the Record tab is ${cv.phone} (${pagesWord(urls.length)})`, 'Check whether this is an old number or a second line, and update whichever is wrong.', urls);
  }
  const cvPostcode = postcodeOf(cv.address || '');
  if (cvPostcode) {
    const other = new Map();
    for (const p of pages) for (const pc of (p.facts || {}).postcodes || []) if (pc !== cvPostcode) { if (!other.has(pc)) other.set(pc, []); other.get(pc).push(p.path); }
    for (const [pc, urls] of other) add('address_vs_record', `Postcode ${pc} is on the site, but the client's address on the Record tab has ${cvPostcode} (${pagesWord(urls.length)})`, 'Check whether this is an old address.', urls);
  }

  // Temporary and staging hosts
  const hosts = new Map();
  for (const p of pages) for (const o of (p.facts || {}).other_hosts || []) {
    if (!isNonLive(o.host, siteHost)) continue;
    const key = `${o.host}|${o.where}`;
    if (!hosts.has(key)) hosts.set(key, { host: o.host, where: o.where, urls: [] });
    hosts.get(key).urls.push(p.path);
  }
  for (const { host, where, urls } of hosts.values()) add('non_live_host', `${WHERE[where] || WHERE.link} ${host}, a temporary host and not the live site (${pagesWord(urls.length)})`, 'Links like this break when the temporary host goes away. Don\'t carry them onto the new site.', urls);

  // Mixed http and https, www and non www inside the pages
  const http = pages.filter(p => ((p.facts || {}).http_links || 0) > 0);
  if (http.length) add('mixed_http', `Some links use a different http or https form from the live site (${pagesWord(http.length)})`, 'Each one costs a redirect. Use the live form on the new site.', http.map(p => p.path));
  const www = pages.filter(p => ((p.facts || {}).other_www_links || 0) > 0);
  if (www.length) add('mixed_www', `Some links use the other www form from the live site (${pagesWord(www.length)})`, 'Each one costs a redirect. Use the live form on the new site.', www.map(p => p.path));

  // The four homepage forms
  for (const v of variants) {
    if (v.error) { add('variant_fails', `${v.url} didn't answer: ${v.error}`, 'People and links using this form of the address may not reach the site.'); continue; }
    if (v.final !== origin + '/' && v.final !== origin) { add('variant_elsewhere', `${v.url} ends at ${v.final}, not the live homepage`, 'Every form of the address should reach one homepage.'); continue; }
    if (v.hops === 0 && v.url.replace(/\/$/, '') !== origin) add('variant_duplicate', `${v.url} shows the site without redirecting to ${origin}/`, 'Two addresses showing one site split its signals. The new site should redirect one to the other.');
    else if (v.hops > 1) add('variant_chain', `${v.url} takes ${v.hops} redirects to reach the live homepage`, 'One redirect is better. Links using this form lose a little on each hop.');
  }
  return issues;
}

module.exports = { buildIssues, isNonLive, deadLinks };
