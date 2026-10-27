// Site audit tab (27 Oct 2026), existing-site clients only: crawl results, the page to page map
// mapping (keep, rewrite, add, redirect), the redirect table, the URLs that rank. There is no
// crawl in the code yet, so the tab shows its empty state with the planned columns.
import { h, card, empty, table } from '../ui.js';
export async function render(el, ctx) {
  const cols = [{ key: 'url', label: 'Existing URL' }, { key: 'title', label: 'Title' }, { key: 'ranks', label: 'Ranks for' }, { key: 'map', label: 'Page map page' }, { key: 'action', label: 'Keep / rewrite / add / redirect' }];
  el.innerHTML = card({ title: 'Site audit', sub: 'For clients with an existing site: what the crawl found, how each page maps to the page map, and the redirects.', body:
    empty({ title: 'No crawl yet', text: 'The site audit needs a crawl of the existing site, which is not part of this build. When it lands, the crawl results fill this table.' }) + table({ columns: cols, rows: [], emptyText: 'The crawl results, one row per existing URL.' }) });
}
