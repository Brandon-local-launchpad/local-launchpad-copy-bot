'use strict';

// ── Page that matters, and the top 20 ─────────────────────────────────────────────
// Brandon's definitions (brief, 5 Nov 2026), with the numbers as settings:
//   matters   any Search Console clicks (if a file was uploaded), or a ranking keyword with
//             estimated traffic above the minimum, or at least 1 real referring domain
//   top 20    the 20 URLs with the most clicks (estimated traffic when there is no Search
//             Console), plus any URL with 3 or more real referring domains not already listed
//   top 5     the page's Search Console queries when the file links them to a page, else its
//             DataForSEO ranked keywords
// Plan decision: an injected page's own keywords and links never count towards mattering
// (a hacked pharma page that ranks must not become "never 410"). A person's override wins.

const RULES = require('./junk-rules.json');
const { countDomains } = require('./spam');

const INJECTED = RULES.injected_page_patterns.map(p => new RegExp(p, 'i'));
const FOREIGN_PREFIX = new RegExp(`^/(${RULES.foreign_path_prefixes.join('|')})(/|$)`, 'i');
const FOREIGN_SCRIPT = /[\p{Script=Han}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]/u;

// Why this URL looks injected, or '' when it doesn't
function injectedReason(path, title = '') {
  let decoded = String(path || '');
  try { decoded = decodeURIComponent(decoded); } catch (_) { decoded = String(path || ''); }
  const hit = INJECTED.find(re => re.test(decoded) || re.test(title));
  if (hit) return 'its address or title is about gambling, pharma or similar';
  if (FOREIGN_SCRIPT.test(decoded) || FOREIGN_SCRIPT.test(title)) return 'its address or title is in a foreign script';
  if (FOREIGN_PREFIX.test(decoded)) return 'it sits under a foreign language path';
  return '';
}
const junkKeyword = k => INJECTED.some(re => re.test(String(k || '').replace(/\s+/g, '-')));

const plural = (n, one, many = `${one}s`) => `${Number(n).toLocaleString('en-GB')} ${n === 1 ? one : many}`;
const round = v => Math.round(Number(v || 0) * 100) / 100;

// urls: [{ url, path, title, override }], links: Map url → [link], keywords: Map url → [{ keyword, position, etv, volume }],
// gsc: { hasFile, pages: Map url → { clicks, impressions }, queries: Map url → [{ query, clicks, impressions, position }] }
// Returns Map url → the analysis, and the benchmark used.
function analysePages({ urls, links, keywords, gsc = { hasFile: false, pages: new Map(), queries: new Map() }, settings }) {
  const out = new Map();
  for (const u of urls) {
    const L = links.get(u.url) || [];
    const K = keywords.get(u.url) || [];
    const counted = countDomains(L, settings);
    const injected = injectedReason(u.path, u.title);
    const page = gsc.pages.get(u.url) || { clicks: 0, impressions: 0 };
    const cleanK = K.filter(k => !junkKeyword(k.keyword));
    const est = cleanK.reduce((s, k) => s + Number(k.etv || 0), 0);
    const ranking = cleanK.filter(k => Number(k.etv || 0) > settings.min_estimated_traffic);
    const why = [];
    let matters = false;
    if (injected) {
      why.push(`Looks injected: ${injected}, so its rankings and links don't count`);
    } else {
      if (page.clicks > 0) { matters = true; why.push(`Search Console shows ${plural(page.clicks, 'click')}`); }
      if (ranking.length) { matters = true; why.push(`Ranks for ${plural(ranking.length, 'search', 'searches')}, ${est < 0.01 ? 'under 0.01' : `about ${round(est)}`} estimated visits a month`); }
      if (counted.real > 0) { matters = true; why.push(`${plural(counted.real, 'real site')} ${counted.real === 1 ? 'links' : 'link'} to it`); }
      if (!matters) why.push(counted.all > 0 ? `${plural(counted.all, 'site')} ${counted.all === 1 ? 'links' : 'link'} to it, but all junk. No rankings or clicks` : 'No clicks, no rankings and no real sites linking');
    }
    if (u.override === true) { matters = true; why.unshift('Marked as mattering by hand'); }
    if (u.override === false) { matters = false; why.unshift('Marked as not mattering by hand'); }
    const fromGsc = gsc.queries.get(u.url) || [];
    const top = fromGsc.length
      ? [...fromGsc].sort((a, b) => (b.clicks - a.clicks) || (b.impressions - a.impressions)).slice(0, settings.top_searches).map(q => ({ search: q.query, clicks: q.clicks, impressions: q.impressions, position: q.position, source: 'Search Console' }))
      : [...cleanK].sort((a, b) => Number(b.etv || 0) - Number(a.etv || 0)).slice(0, settings.top_searches).map(k => ({ search: k.keyword, position: k.position, estimated: round(k.etv), volume: k.volume, source: 'DataForSEO' }));
    out.set(u.url, { all_rd: counted.all, real_rd: counted.real, real_domains: counted.real_domains, clicks: page.clicks, impressions: page.impressions, est_traffic: injected ? 0 : Math.round(est * 10000) / 10000, keywords_count: K.length, matters, matters_why: why, injected: !!injected, top_searches: top, top20: false, top20_why: '' });
  }

  // The top list: the metric first, no filler (a URL with nothing is not "top"), then the 3+ domains rule
  const metric = gsc.hasFile ? 'clicks' : 'est_traffic';
  const ranked = [...out.entries()].filter(([, a]) => !a.injected && a[metric] > 0).sort((x, y) => y[1][metric] - x[1][metric]).slice(0, settings.top_n);
  ranked.forEach(([, a], i) => { a.top20 = true; a.top20_why = `Number ${i + 1} by ${gsc.hasFile ? 'clicks' : 'estimated traffic'}`; });
  for (const [, a] of out) {
    if (!a.top20 && !a.injected && a.real_rd >= settings.top_extra_real_domains) { a.top20 = true; a.top20_why = `${plural(a.real_rd, 'real site')} ${a.real_rd === 1 ? 'links' : 'link'} to it`; }
  }
  return { pages: out, benchmark: gsc.hasFile ? 'search_console' : 'estimated' };
}

module.exports = { analysePages, injectedReason, junkKeyword };
