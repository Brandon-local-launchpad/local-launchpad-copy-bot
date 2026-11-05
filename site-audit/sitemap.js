'use strict';

// ── robots.txt and sitemaps ───────────────────────────────────────────────────────
// parseRobots: the sitemaps it names, and the rules that apply to Copybot (its own group, else *).
// parseSitemap: an index or a list of URLs. The name says nothing: the test site's
// sitemap_index.xml is a plain list, so the content decides.

function parseRobots(text) {
  const sitemaps = [];
  const groups = [];
  let cur = null, lastWasAgent = false;
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === 'sitemap') { if (v) sitemaps.push(v); continue; }
    if (k === 'user-agent') {
      if (!lastWasAgent) { cur = { agents: [], rules: [], delay: null }; groups.push(cur); }
      cur.agents.push(v.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!cur) continue;
    if (k === 'disallow' || k === 'allow') { if (v) cur.rules.push({ allow: k === 'allow', path: v }); }
    else if (k === 'crawl-delay') { const d = parseFloat(v); if (Number.isFinite(d)) cur.delay = d; }
  }
  const group = groups.find(g => g.agents.some(a => a.includes('copybot'))) || groups.find(g => g.agents.includes('*')) || { rules: [], delay: null };
  return { sitemaps: [...new Set(sitemaps)], rules: group.rules, crawlDelay: group.delay };
}

const toRe = p => new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
// The longest matching rule wins; allow wins a tie (the standard reading)
function allowedBy(rules, path) {
  let best = null;
  for (const r of rules || []) {
    let hit = false;
    try { hit = toRe(r.path).test(path); } catch (_) { hit = false; }
    if (hit && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r;
  }
  return !best || best.allow;
}

const decode = s => String(s).replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim();
function parseSitemap(xml) {
  const s = String(xml || '');
  if (/<sitemapindex[\s>]/i.test(s)) return { type: 'index', locs: [...s.matchAll(/<sitemap[\s>][\s\S]*?<loc>([\s\S]*?)<\/loc>/gi)].map(m => decode(m[1])) };
  if (/<urlset[\s>]/i.test(s)) return { type: 'urlset', locs: [...s.matchAll(/<url[\s>][\s\S]*?<loc>([\s\S]*?)<\/loc>/gi)].map(m => decode(m[1])) };
  return { type: 'unknown', locs: [] };
}

module.exports = { parseRobots, allowedBy, parseSitemap };
