'use strict';

// ── The two CSVs for the client sheet ─────────────────────────────────────────────
// Old Site Audit: what the scan found, one row per old URL. URL map: old URL, decision, new URL,
// redirect type, the reason. Titles and anchors come from other people's sites and the file is
// opened in a spreadsheet, so a cell that would run as a formula is quoted to stay text.

const cell = v => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (head, rows) => [head, ...rows].map(r => r.map(cell).join(',')).join('\r\n') + '\r\n';
const yes = v => (v ? 'Yes' : 'No');
const SOURCE = { crawl: 'Crawl', sitemap: 'Sitemap', rankings: 'Rankings', backlinks: 'Backlinks', search_console: 'Search Console' };

function auditCsv(urls) {
  return toCsv(
    ['Old URL', 'Type', 'Found by', 'Status', 'Redirects to', 'Canonical', 'Noindex', 'Title', 'H1', 'Words', 'Internal links in', 'Orphan', 'Real sites linking', 'All sites linking', 'Clicks', 'Impressions', 'Estimated visits', 'Keywords', 'Matters', 'Why', 'Top list', 'Top 5 searches', 'Decision'],
    urls.map(u => [u.url, u.kind, (u.sources || []).map(s => SOURCE[s] || s).join(', '), u.status_code == null ? u.fetch_state : u.status_code, u.redirect_target || '', u.canonical || '', yes(u.noindex), u.title || '', u.h1 || '', u.word_count == null ? '' : u.word_count, u.inlinks, yes(u.orphan), u.real_rd, u.all_rd, u.clicks, u.impressions, u.est_traffic, u.keywords_count, yes(u.matters), (u.matters_why || []).join('. '), yes(u.top20), (u.top_searches || []).map(t => t.search).join('; '), (u.plan && u.plan.decision) || '']),
  );
}

function urlMapCsv(urls, origin) {
  const full = p => (p ? `${origin}${p}` : '');
  return toCsv(
    ['Old URL', 'Decision', 'New URL', 'Redirect type', 'Matters', 'Top list', 'Reason', 'Approved', 'Approved by'],
    urls.map(u => { const p = u.plan || {}; return [u.url, p.decision || '', full(p.new_url), p.redirect_type === 'none' ? 'None' : p.redirect_type || '', yes(u.matters), yes(u.top20), p.reason || '', yes(p.approved), p.approved_by || '']; }),
  );
}

module.exports = { auditCsv, urlMapCsv, toCsv };
