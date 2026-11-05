'use strict';

// ── DataForSEO for the site audit ─────────────────────────────────────────────────
// Three endpoints, each read to the end or to its cap (measured 5 Nov 2026: the Backlinks API
// charges $0.024 a request + $0.000036 a row, Labs $0.012 + $0.00012, 1,000 rows a request):
//   backlinks/domain_pages_summary/live     every page with links, so a page is never missed when
//                                           the link list hits its cap
//   backlinks/backlinks/live                every link, with spam score and domain rank; the real
//                                           count per page comes from these rows
//   dataforseo_labs/google/ranked_keywords  every ranking URL, highest traffic first
// backlinks/referring_domains is not used: its rank was 0 on every row of the test site.
// Each call takes canSpend(estimate) and stops early, marked capped, when the scan's budget is gone.

const DFS = require('../citations/dataforseo');

const PAGE = 1000;
const BACKLINK_REQUEST = 0.024 + PAGE * 0.000036;
const KEYWORD_REQUEST = 0.012 + PAGE * 0.00012;
const LINKS = { include_subdomains: true, backlinks_status_type: 'live', exclude_internal_backlinks: true };

async function pagesWithLinks(target, { rowCap = 5000, canSpend = () => true, spend = () => {}, opts = {} } = {}) {
  const rows = [];
  let total = 0, capped = false;
  for (let offset = 0; ; offset += PAGE) {
    if (!canSpend(BACKLINK_REQUEST)) { capped = true; break; }
    const r = await DFS.call('backlinks/domain_pages_summary/live', { target, limit: PAGE, offset, ...LINKS }, opts);
    await spend(r.cost, 1, { endpoint: 'domain_pages_summary', rows: r.items.length });
    total = r.result.total_count == null ? total : Number(r.result.total_count);
    for (const i of r.items) rows.push({ url: i.url, backlinks: Number(i.backlinks || 0), referring_domains: Number(i.referring_domains || 0) });
    if (r.items.length < PAGE || rows.length >= total) break;
    if (rows.length >= rowCap) { capped = true; break; }
  }
  return { rows, total, capped };
}

async function allBacklinks(target, { rowCap = 20000, canSpend = () => true, spend = () => {}, opts = {} } = {}) {
  const rows = [];
  let total = 0, capped = false, token = null;
  for (;;) {
    if (!canSpend(BACKLINK_REQUEST)) { capped = true; break; }
    const payload = { target, mode: 'as_is', limit: PAGE, ...LINKS };
    if (token) payload.search_after_token = token;
    const r = await DFS.call('backlinks/backlinks/live', payload, opts);
    await spend(r.cost, 1, { endpoint: 'backlinks', rows: r.items.length });
    total = r.result.total_count == null ? total : Number(r.result.total_count);
    for (const i of r.items) rows.push({ url_to: i.url_to, domain_from: String(i.domain_from || '').toLowerCase(), url_from: i.url_from || '', anchor: i.anchor || '', spam_score: i.backlink_spam_score == null ? null : Number(i.backlink_spam_score), domain_rank: i.domain_from_rank == null ? null : Number(i.domain_from_rank), external_links: i.page_from_external_links == null ? null : Number(i.page_from_external_links), dofollow: !!i.dofollow, target_status: i.url_to_status_code == null ? null : Number(i.url_to_status_code) });
    token = r.result.search_after_token || null;
    if (r.items.length < PAGE || !token || rows.length >= total) break;
    if (rows.length >= rowCap) { capped = true; break; }
  }
  return { rows, total, capped };
}

async function rankedKeywords(target, { rowCap = 5000, canSpend = () => true, spend = () => {}, opts = {} } = {}) {
  const rows = [];
  let total = 0, capped = false;
  for (let offset = 0; ; offset += PAGE) {
    if (!canSpend(KEYWORD_REQUEST)) { capped = true; break; }
    const r = await DFS.call('dataforseo_labs/google/ranked_keywords/live', { target, location_code: 2826, language_code: 'en', limit: PAGE, offset, item_types: ['organic'], order_by: ['ranked_serp_element.serp_item.etv,desc'] }, opts);
    await spend(r.cost, 1, { endpoint: 'ranked_keywords', rows: r.items.length });
    total = r.result.total_count == null ? total : Number(r.result.total_count);
    for (const i of r.items) {
      const s = (i.ranked_serp_element && i.ranked_serp_element.serp_item) || {};
      const k = i.keyword_data || {};
      if (!s.url || !k.keyword) continue;
      rows.push({ url: s.url, keyword: k.keyword, position: s.rank_group == null ? null : Number(s.rank_group), etv: Number(s.etv || 0), volume: k.keyword_info && k.keyword_info.search_volume != null ? Number(k.keyword_info.search_volume) : null });
    }
    if (r.items.length < PAGE || rows.length >= total) break;
    if (rows.length >= rowCap) { capped = true; break; }
  }
  return { rows, total, capped };
}

module.exports = { pagesWithLinks, allBacklinks, rankedKeywords, configured: DFS.configured };
