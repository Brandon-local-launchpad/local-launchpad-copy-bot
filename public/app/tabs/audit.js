// Site audit tab (existing-site clients). Scan old site: one list of every URL the old site has,
// from the crawl, the sitemap, DataForSEO and an optional Search Console file; which pages matter
// and why, real against all sites linking, the top 20, the issues found. Then the URL map: a suggested
// decision and new URL for every old URL, which a person approves or changes. The redirects come in
// the next stage. Reads and writes /api/clients/:id/site-audit.

import { h, attr, api, card, tile, pill, tag, toast, confirm, dialog, busy, info, fmtDate, empty, failed, running, table } from '../ui.js';

const SOURCE = { crawl: 'Crawl', sitemap: 'Sitemap', rankings: 'Rankings', backlinks: 'Backlinks', search_console: 'Search Console' };
const PHASE = {
  starting: 'Starting',
  discover: 'Reading the homepage, robots.txt and the sitemaps',
  dataforseo: 'Asking DataForSEO for rankings and backlinks',
  crawl: 'Reading the pages, about one a second',
  analyse: 'Working out which pages matter',
};
const money = v => `$${Number(v || 0).toFixed(Number(v) < 1 ? 3 : 2)}`;
const hopsOf = u => (u.redirect_chain || []).filter(c => c.status >= 300 && c.status < 400).length;
const traffic = v => (Number(v) >= 10 ? Math.round(Number(v)).toLocaleString('en-GB') : Number(v) > 0 && Number(v) < 0.01 ? 'under 0.01' : String(Math.round(Number(v) * 100) / 100));

const FILTERS = [
  ['all', 'All', () => true],
  ['matters', 'Matters', u => u.matters],
  ['top20', 'Top 20', u => u.top20],
  ['orphans', 'Orphans', u => u.orphan],
  ['media', 'Images & PDFs', u => u.kind !== 'page'],
  ['problems', "Didn't load", u => u.status_code == null || u.status_code >= 400],
  ['waiting', 'Not approved', u => u.plan && u.plan.decision && !u.plan.approved],
  ['check', 'Check these', u => u.plan && (u.plan.check || u.plan.needs_page)],
  ...['Keep', 'Reuse', 'Merge', 'Retire', 'Remove'].map(x => [x, x, u => u.plan && u.plan.decision === x]),
];
const DECISION_KIND = { Keep: 'ok', Reuse: 'run', Merge: 'run', Retire: 'wait', Remove: 'block' };
const ROW_LIMIT = 200;

const SETTINGS = [
  ['spam_threshold', 'A real link scores under', 'The spam score limit. Links at this score or above are junk.'],
  ['outgoing_link_limit', 'A linking page has fewer outgoing links than', 'Pages with this many outgoing links or more count as link farms.'],
  ['min_estimated_traffic', 'Estimated visits must be above', 'A ranking only makes a page matter above this number.'],
  ['top_n', 'Size of the top list', 'The list of URLs with the most clicks or estimated traffic.'],
  ['top_extra_real_domains', 'Add any page with this many real sites linking', 'These join the top list even with no traffic.'],
  ['top_searches', 'Top searches kept per page', 'Used for the content check on staging.'],
  ['page_cap', 'Most URLs to fetch', 'The crawl stops here, with a warning.'],
  ['max_usd', 'Most to spend on DataForSEO per scan, in dollars', 'The scan stops buying at this point, with a warning.'],
  ['backlink_row_cap', 'Most links to read', 'Pages past this count as mattering until checked.'],
  ['keyword_row_cap', 'Most ranking keywords to read', 'Highest traffic first.'],
];

export async function render(el, ctx) {
  const { clientId } = ctx;
  const base = `/api/clients/${clientId}/site-audit`;
  let d = null, timer = null, loadError = '';
  const S = { filter: 'all', settings: false, picked: new Set(), showAll: false };

  const load = async () => {
    try { d = await api(base); loadError = ''; }
    catch (e) { console.error('[site-audit]', e); loadError = e.message; }
    draw();
    clearTimeout(timer);
    if (d && d.running && document.contains(el)) timer = setTimeout(load, 3000);
  };

  function header() {
    const scan = d.scan;
    const canScan = !d.domain.stop && d.configured && !d.running;
    const btn = `<button class="btn btn-primary" id="scan" ${canScan ? '' : 'disabled'}>${scan ? 'Scan again' : 'Scan old site'}</button>`;
    const resume = scan && !d.running && (scan.status === 'interrupted' || scan.status === 'failed') ? `<button class="btn btn-ghost" id="resume">Resume</button>` : '';
    const sub = scan && scan.finished_at ? `Last scan ${h(fmtDate(scan.finished_at, true))}, DataForSEO cost ${money(scan.cost_usd)}` : 'Reads the old site and DataForSEO. Nothing is written to the site.';
    const lines = [];
    if (d.domain.live_domain) lines.push(`<a href="${attr(d.domain.live_domain)}" target="_blank" rel="noopener">${h(d.domain.live_domain)}</a>`);
    if (scan && scan.platform) lines.push(`${h(scan.platform)} ${info(`Read from the site: ${(scan.platform_evidence || []).join(', ')}.`)}`);
    return card({ title: 'Site audit', sub, actions: resume + btn, body: `<p class="muted" style="margin:0">${lines.join(' · ') || 'No live domain yet.'}</p>${d.domain.stop ? `<div class="notice bad" style="margin-top:12px">${h(d.domain.stop)}</div>` : ''}${!d.configured ? `<div class="notice bad" style="margin-top:12px">DataForSEO isn't set up on this server, so a scan can't run.</div>` : ''}` });
  }

  function progress() {
    const s = d.scan;
    const now = s.phase === 'crawl' && s.current_url ? `${PHASE.crawl}: ${s.current_url}` : (PHASE[s.phase] || 'Working');
    return card({ title: 'Scanning', body: running({ now, next: `So far ${money(s.cost_usd)} on DataForSEO. You can leave this page; the scan carries on.`, done: s.phase === 'crawl' && s.pages_total ? s.pages_done : null, total: s.phase === 'crawl' && s.pages_total ? s.pages_total : null }) });
  }

  function warnings() {
    const list = [...((d.scan && d.scan.warnings) || [])];
    if (d.scan && d.scan.error) list.unshift({ kind: 'error', text: d.scan.error });
    if (!list.length) return '';
    return `<div class="stack" style="gap:8px">${list.map(w => `<div class="notice ${w.kind === 'bot_block' || w.kind === 'error' ? 'bad' : 'warn'}">${h(w.text)}</div>`).join('')}</div>`;
  }

  function tiles() {
    const s = d.scan.summary;
    if (!s) return '';
    const src = Object.entries(s.by_source || {}).filter(([, n]) => n).map(([k, n]) => `${SOURCE[k] || k} ${n}`).join(', ');
    return `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
      ${tile({ label: 'Total URLs', value: s.total_urls, tip: 'Compare this with the free Screaming Frog on the first 3 real migrations.', foot: `${s.pages} pages, ${s.media} images and PDFs. ${h(src)}` })}
      ${tile({ label: 'Pages that matter', value: s.matters, foot: `of ${s.total_urls} URLs` })}
      ${tile({ label: 'Top list', value: s.top20, foot: s.top20 ? 'with traffic or real links' : 'nothing has traffic yet' })}
      ${tile({ label: 'Sites linking: real / all', value: `${s.real_domains} / ${s.all_domains}`, tip: 'Junk sites are left out of the real count. Only real ones can make a page matter.', foot: `${s.links.toLocaleString('en-GB')} links` })}
      ${tile({ label: 'Rankings', value: s.keywords, foot: `about ${traffic(s.est_traffic)} estimated visits a month` })}
      ${s.decisions ? tile({ label: 'Decisions approved', value: `${s.decisions.approved} of ${s.decisions.total}`, foot: Object.entries(s.decisions.counts).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(', ') }) : ''}
    </div>`;
  }

  function benchmark() {
    const b = d.scan.benchmark;
    const files = d.search_console.files || [];
    const list = files.length ? ` Uploaded: ${files.map(f => h(f.filename || f.kind)).join(', ')}.` : '';
    const text = b === 'search_console'
      ? `<strong>Benchmark: Search Console.</strong> Clicks come from Google's own numbers.${list}`
      : `<strong>Benchmark: Estimated, no Search Console.</strong> Traffic is DataForSEO's estimate, which is weaker than Google's own numbers. A low traffic page can be missed, so read the list before trusting it.${list}`;
    return card({ body: `<div style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap"><div style="flex:1;min-width:min(260px,100%)">${text}</div><label class="btn btn-ghost" style="cursor:pointer">Upload Search Console file<input type="file" id="gsc" accept=".csv,.zip" style="display:none"></label></div>` });
  }

  function issues() {
    const list = d.scan.issues || [];
    if (!d.scan.summary) return '';
    const body = list.length
      ? `<ul class="stack" style="list-style:none;margin:0;padding:0;gap:10px">${list.map(i => `<li><strong>${h(i.text)}</strong><div class="muted">${h(i.detail)}</div>${i.pages && i.pages.length ? `<div class="muted small">${i.pages.slice(0, 6).map(h).join(', ')}${i.page_count > 6 ? ` and ${i.page_count - 6} more` : ''}</div>` : ''}</li>`).join('')}</ul>`
      : '<p class="muted" style="margin:0">No phone, address, host or address form problems found.</p>';
    return card({ title: `Issues found (${list.length})`, sub: 'These are problems on the old site. Keep them off the new one.', body });
  }

  function statusCell(u) {
    if (u.fetch_state === 'failed') return pill('block', "Didn't load");
    if (u.fetch_state === 'blocked') return pill('wait', 'Blocked');
    if (u.fetch_state === 'cap') return pill('wait', 'Not fetched');
    if (u.fetch_state === 'robots') return pill('wait', 'robots.txt');
    if (u.fetch_state === 'skipped') return '<span class="muted">Not a page</span>';
    if (u.redirect_target) return `${pill('wait', String(u.status_code))} ${info(`Goes to ${u.redirect_target}${hopsOf(u) > 1 ? `, ${hopsOf(u)} redirects` : ''}`)}`;
    if (u.status_code >= 400) return pill('block', String(u.status_code));
    return pill('ok', String(u.status_code || '?'));
  }

  function urlTable() {
    if (!d.urls.length) return '';
    const test = (FILTERS.find(f => f[0] === S.filter) || FILTERS[0])[2];
    const rows = d.urls.filter(test);
    const shownRows = S.showAll ? rows : rows.slice(0, ROW_LIMIT);
    const gsc = d.scan.benchmark === 'search_console';
    const ready = d.page_map_ready;
    const cols = [
      ...(ready ? [{ key: 'pick', label: '', render: u => (u.plan.approved ? '' : `<input type="checkbox" data-pick="${attr(u.id)}" aria-label="Pick ${attr(u.path)}"${S.picked.has(u.id) ? ' checked' : ''}>`) }] : []),
      { key: 'url', label: 'Old URL', render: u => `<div style="max-width:280px;overflow-wrap:anywhere"><a href="#" class="open" data-id="${attr(u.id)}">${h(u.path || u.url)}</a> ${statusCell(u)}${u.title ? `<div class="muted small">${h(u.title)}</div>` : ''}<div class="muted small">${(u.sources || []).map(s => h(SOURCE[s] || s)).join(', ')}${u.orphan ? ` ${tag('wait', 'Orphan')}` : ''}</div></div>` },
      { key: 'real_rd', label: 'Sites: real / all', num: true, render: u => `${u.real_rd} / ${u.all_rd}` },
      { key: 'est_traffic', label: gsc ? 'Clicks' : 'Est. visits', num: true, render: u => (gsc ? u.clicks : traffic(u.est_traffic)) },
      { key: 'matters', label: 'Matters?', render: u => `<div style="min-width:${ready ? 90 : 220}px">${u.matters ? pill('ok', 'Yes') : pill('none', 'No')} ${info((u.matters_why || []).join('. '))}${u.top20 ? ` ${tag('accent', 'Top list')}` : ''}${u.injected ? ` ${tag('block', 'Looks injected')}` : ''}${u.override != null ? ` ${tag('', 'By hand')}` : ''}${ready ? '' : `<div class="muted small">${h((u.matters_why || []).join('. '))}</div>`}</div>` },
      ...(ready ? [
        { key: 'decision', label: 'Decision', render: u => `<select class="input" style="min-width:96px" data-decision="${attr(u.id)}" aria-label="Decision for ${attr(u.path)}">${['Keep', 'Reuse', 'Merge', 'Retire', 'Remove'].map(x => `<option${u.plan.decision === x ? ' selected' : ''}>${x}</option>`).join('')}</select>${u.plan.approved ? `<div style="margin-top:4px">${tag('ok', u.plan.by_hand ? 'Set by hand' : 'Approved')}</div>` : `<div style="margin-top:4px"><button class="btn btn-ghost btn-xs" data-approve="${attr(u.id)}" ${u.plan.proposal ? 'disabled' : ''}>Approve</button></div>`}` },
        { key: 'new_url', label: 'New URL', render: u => `<input class="input" style="min-width:170px" list="pageOptions" data-newurl="${attr(u.id)}" value="${attr(u.plan.new_url)}" placeholder="${u.plan.decision === 'Remove' || u.plan.redirect_type === 'none' || u.plan.redirect_type === '410' ? 'None' : '/page'}" aria-label="New URL for ${attr(u.path)}" ${u.plan.decision === 'Keep' || u.plan.decision === 'Remove' ? 'disabled' : ''}>` },
        { key: 'redirect', label: 'Redirect', render: u => (u.plan.decision === 'Retire' ? `<select class="input" style="min-width:80px" data-redirect="${attr(u.id)}" aria-label="Redirect for ${attr(u.path)}">${[['301', '301'], ['410', '410'], ['none', 'None']].map(([v, l]) => `<option value="${v}"${u.plan.redirect_type === v ? ' selected' : ''}>${l}</option>`).join('')}</select>` : tag(u.plan.redirect_type === '410' ? 'block' : u.plan.redirect_type === '301' ? 'run' : '', u.plan.redirect_type === 'none' ? 'None' : u.plan.redirect_type)) },
        { key: 'reason', label: 'Why', render: u => `<div class="small" style="min-width:220px;max-width:340px">${h(u.plan.reason)}${u.plan.check ? ` ${tag('wait', 'Check this')}` : ''}${u.plan.needs_page ? ` ${tag('wait', 'Needs a page')}` : ''}${u.plan.lifted ? `<div class="notice warn" style="margin-top:4px">${h(u.plan.lifted)}</div>` : ''}${u.plan.differs ? `<div class="muted">Suggested: ${h(u.plan.suggested.decision)}${u.plan.suggested.new_url ? ` to ${h(u.plan.suggested.new_url)}` : ''}.</div>` : ''}${u.plan.approved ? ` <a href="#" class="muted" data-reset="${attr(u.id)}">Back to the suggestion</a>` : ''}</div>` },
      ] : []),
    ];
    const chips = FILTERS.filter(([k, , fn]) => k === 'all' || d.urls.some(fn)).map(([k, label, fn]) => `<button class="btn btn-sm ${S.filter === k ? 'btn-primary' : 'btn-ghost'}" data-filter="${k}">${h(label)} (${d.urls.filter(fn).length})</button>`).join(' ');
    const picked = [...S.picked].filter(id => d.urls.some(u => u.id === id && !u.plan.approved)).length;
    const tools = ready ? `<div class="btn-row" style="flex-wrap:wrap;margin-bottom:12px"><button class="btn btn-primary btn-sm" id="approvePicked" ${picked ? '' : 'disabled'}>Approve selected${picked ? ` (${picked})` : ''}</button><button class="btn btn-ghost btn-sm" id="pickShown">Select all shown</button><button class="btn btn-ghost btn-sm" id="approveAll" ${d.urls.some(u => u.plan.decision && !u.plan.approved) ? '' : 'disabled'}>Approve all suggestions</button><a class="btn btn-ghost btn-sm" href="${attr(base)}/export/old-site-audit.csv" download>Export Old Site Audit CSV</a><a class="btn btn-ghost btn-sm" href="${attr(base)}/export/url-map.csv" download>Export URL map CSV</a></div>` : '';
    const waitNote = ready ? '' : `<div class="notice warn" style="margin-bottom:12px">The suggested decisions wait for the Page Map, because each URL is matched against it. Approve the locations first, and the Page Map builds.</div>`;
    const more = rows.length > shownRows.length ? `<div style="margin-top:12px"><button class="btn btn-ghost btn-sm" id="showAll">Show all ${rows.length}</button></div>` : '';
    const options = `<datalist id="pageOptions">${(d.page_options || []).map(o => `<option value="${attr(o.path)}">${h(o.title)}</option>`).join('')}</datalist>`;
    return card({ title: 'URL map', sub: ready ? 'Every old URL with a suggested decision and new URL. Change any row and it counts as approved. Click a URL for its searches, its links and the saved text.' : 'Every URL on the old site. Click a URL for its searches, its links and the saved text.', body: `${waitNote}<div class="btn-row" style="flex-wrap:wrap;margin-bottom:12px">${chips}</div>${tools}${options}${table({ columns: cols, rows: shownRows, rowId: u => u.id, cards: true, emptyText: 'Nothing in this filter.' })}${more}` });
  }

  // The Page Map moves only when a person says so, because the page's address changes everywhere
  function pageMapCard() {
    const waiting = d.urls.filter(u => u.plan && u.plan.proposal && !u.plan.approved);
    const done = d.page_map_changes || [];
    if (!waiting.length && !done.length) return '';
    const rowsW = waiting.map(u => `<li><strong>Keep ${h(u.path)}.</strong> The Page Map has "${h(u.plan.proposal.title)}" at ${h(u.plan.proposal.from)}. Moving the page to the old address means one page for the service, with no redirect.<div class="btn-row" style="margin-top:6px"><button class="btn btn-primary btn-sm" data-proposal-yes="${attr(u.id)}">Move the page to ${h(u.path)}</button><button class="btn btn-ghost btn-sm" data-proposal-no="${attr(u.id)}">No, redirect to ${h(u.plan.proposal.from)}</button></div></li>`).join('');
    const rowsD = done.map(o => `<li>"${h(o.title || o.identity)}" moved from ${h(o.from_path || '')} to <strong>${h(o.path)}</strong>. <a href="#" data-proposal-undo="${attr(o.identity)}">Undo</a></li>`).join('');
    return card({ title: 'Page Map changes', sub: 'An old URL that matters beats the Page Map address.', body: `<ul class="stack" style="list-style:none;margin:0;padding:0;gap:12px">${rowsW}${rowsD}</ul>` });
  }

  function settingsCard() {
    const body = S.settings
      ? `<div class="form-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:12px">${SETTINGS.map(([k, label, tip]) => `<div class="field"><label>${h(label)} ${info(tip)}</label><input class="input" type="number" min="0" step="any" data-set="${k}" value="${attr(d.settings[k])}"></div>`).join('')}</div><div class="btn-row" style="margin-top:12px;flex-wrap:wrap"><button class="btn btn-primary" id="saveSettings">Save and rework</button><span class="muted small">This reworks the list from what's saved and spends nothing.</span></div>`
      : '';
    return card({ title: 'Settings', sub: 'The spam limit, what counts as mattering, and the limits on a scan.', actions: `<button class="btn btn-ghost" id="toggleSettings">${S.settings ? 'Close' : 'Open'}</button>`, body });
  }

  function draw() {
    if (!document.contains(el)) return;
    if (!d) { el.innerHTML = failed({ title: "The Site audit didn't load", reason: loadError, retry: '<button class="btn btn-ghost" id="retry">Try again</button>' }); const r = el.querySelector('#retry'); if (r) r.onclick = load; return; }
    const parts = [header()];
    if (loadError) parts.push(`<div class="notice bad">${h(loadError)}</div>`);
    if (d.running && d.scan) parts.push(progress());
    if (d.scan) {
      parts.push(warnings());
      if (d.scan.summary) parts.push(tiles(), benchmark(), issues(), pageMapCard(), urlTable(), settingsCard());
      else if (!d.running) parts.push(card({ body: empty({ title: 'No results from that scan', text: 'Resume carries on from where it stopped.' }) }));
    } else {
      parts.push(card({ body: empty({ title: 'No scan yet', text: 'Scan old site reads every page it can find, then asks DataForSEO for rankings and backlinks. It usually costs 6 to 15 cents and writes nothing to the site.' }) }), settingsCard());
    }
    el.innerHTML = `<div class="stack">${parts.filter(Boolean).join('')}</div>`;
    wireUp();
  }

  function wireUp() {
    const on = (sel, fn) => { const x = el.querySelector(sel); if (x) x.addEventListener('click', fn); };
    on('#scan', async e => {
      const again = !!d.scan;
      if (!(await confirm({ title: again ? 'Scan the old site again?' : 'Scan the old site?', text: `This reads ${d.domain.live_domain} about one page a second and buys rankings and backlinks from DataForSEO, usually 6 to 15 cents and never over ${money(d.settings.max_usd)}.${again ? ' Hand set answers are kept.' : ''}`, ok: 'Start the scan' }))) return;
      await busy(e.target, 'Starting', async () => {
        try { d = await api(`${base}/scan`, { method: 'POST', body: {} }); }
        catch (err) { console.error('[site-audit]', err); toast(err.message, 'error'); return; }
        draw(); clearTimeout(timer); timer = setTimeout(load, 2000);
      });
    });
    on('#resume', async e => {
      await busy(e.target, 'Resuming', async () => {
        try { d = await api(`${base}/scan/resume`, { method: 'POST', body: {} }); }
        catch (err) { console.error('[site-audit]', err); toast(err.message, 'error'); return; }
        draw(); clearTimeout(timer); timer = setTimeout(load, 2000);
      });
    });
    el.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => { S.filter = b.dataset.filter; S.showAll = false; draw(); }));
    on('#showAll', () => { S.showAll = true; draw(); });

    // A write, then the new state. A refused edit says why and the row goes back to what's saved.
    const act = async (label, fn) => {
      try {
        const out = await fn();
        if (out) d = out;
        if (label) toast(label);
      } catch (err) { console.error('[site-audit]', err); toast(err.message, 'error'); }
      draw();
    };
    const rowOf = id => d.urls.find(u => u.id === id);
    const saveRow = (id, body) => act('', () => api(`${base}/urls/${encodeURIComponent(id)}/decision`, { method: 'PUT', body }));
    el.querySelectorAll('[data-decision]').forEach(s => s.addEventListener('change', () => {
      const id = s.dataset.decision, u = rowOf(id);
      saveRow(id, { decision: s.value, new_url: u.plan.new_url || (s.value === 'Keep' ? u.path : '') });
    }));
    el.querySelectorAll('[data-newurl]').forEach(i => i.addEventListener('change', () => {
      const id = i.dataset.newurl, u = rowOf(id);
      saveRow(id, { decision: u.plan.decision, new_url: i.value, redirect_type: i.value ? '301' : u.plan.redirect_type === '301' ? 'none' : u.plan.redirect_type });
    }));
    el.querySelectorAll('[data-redirect]').forEach(s => s.addEventListener('change', () => {
      const id = s.dataset.redirect, u = rowOf(id);
      saveRow(id, { decision: 'Retire', new_url: s.value === '301' ? u.plan.new_url || u.plan.suggested.new_url : '', redirect_type: s.value });
    }));
    el.querySelectorAll('[data-reset]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); saveRow(a.dataset.reset, { reset: true }); }));
    el.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', () => act('Approved.', () => api(`${base}/approve`, { method: 'POST', body: { url_ids: [b.dataset.approve] } }))));
    el.querySelectorAll('[data-pick]').forEach(c => c.addEventListener('change', () => { if (c.checked) S.picked.add(c.dataset.pick); else S.picked.delete(c.dataset.pick); draw(); }));
    on('#pickShown', () => {
      const test = (FILTERS.find(f => f[0] === S.filter) || FILTERS[0])[2];
      for (const u of d.urls.filter(test)) if (!u.plan.approved && !u.plan.proposal) S.picked.add(u.id);
      draw();
    });
    const afterApprove = out => { S.picked.clear(); d = out; const { approved, waiting } = out.approval; toast(`${approved} approved.${waiting ? ` ${waiting} wait for a Page Map change.` : ''}`); draw(); };
    on('#approvePicked', async e => {
      await busy(e.target, 'Approving', async () => {
        try { afterApprove(await api(`${base}/approve`, { method: 'POST', body: { url_ids: [...S.picked] } })); }
        catch (err) { console.error('[site-audit]', err); toast(err.message, 'error'); }
      });
    });
    on('#approveAll', async e => {
      const left = d.urls.filter(u => u.plan.decision && !u.plan.approved);
      const check = left.filter(u => u.plan.check || u.plan.needs_page).length;
      if (!(await confirm({ title: `Approve ${left.length} suggestions?`, text: `Each row is approved as it stands, and you can still change any of them afterwards.${check ? ` ${check} are marked to check: the Check these filter shows them.` : ''} Nothing goes to the site.`, ok: 'Approve them' }))) return;
      await busy(e.target, 'Approving', async () => {
        try { afterApprove(await api(`${base}/approve`, { method: 'POST', body: { all: true } })); }
        catch (err) { console.error('[site-audit]', err); toast(err.message, 'error'); }
      });
    });
    el.querySelectorAll('[data-proposal-yes]').forEach(b => b.addEventListener('click', async () => {
      const id = b.dataset.proposalYes, u = rowOf(id);
      if (!(await confirm({ title: `Move "${u.plan.proposal.title}" to ${u.path}?`, text: `The Page Map page moves from ${u.plan.proposal.from} to ${u.path}, every link to it follows, and the old URL stays with no redirect. Copy already written keeps the old link until it's regenerated.`, ok: 'Move the page' }))) return;
      await act('', async () => {
        const out = await api(`${base}/urls/${encodeURIComponent(id)}/page-map-change`, { method: 'POST', body: { accept: true } });
        const stale = (out.page_map_change && out.page_map_change.copy_linking_old) || [];
        toast(stale.length ? `Moved. ${stale.length} written ${stale.length === 1 ? 'page still links' : 'pages still link'} to the old address, so regenerate ${stale.length === 1 ? 'it' : 'them'}.` : 'Moved.');
        return out;
      });
    }));
    el.querySelectorAll('[data-proposal-no]').forEach(b => b.addEventListener('click', () => act('The Page Map stays as it is, and the old URL redirects to it.', () => api(`${base}/urls/${encodeURIComponent(b.dataset.proposalNo)}/page-map-change`, { method: 'POST', body: { accept: false } }))));
    el.querySelectorAll('[data-proposal-undo]').forEach(a => a.addEventListener('click', async e => {
      e.preventDefault();
      if (!(await confirm({ title: 'Undo this Page Map change?', text: 'The page goes back to its planned address, and the old URL goes back to a suggestion.', ok: 'Undo it' }))) return;
      await act('Undone.', () => api(`${base}/page-map-changes/undo`, { method: 'POST', body: { identity: a.dataset.proposalUndo } }));
    }));
    el.querySelectorAll('.open').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openUrl(a.dataset.id); }));
    on('#toggleSettings', () => { S.settings = !S.settings; draw(); });
    on('#saveSettings', async e => {
      const body = {};
      el.querySelectorAll('[data-set]').forEach(i => { body[i.dataset.set] = i.value; });
      await busy(e.target, 'Saving', async () => {
        try { d = await api(`${base}/settings`, { method: 'PUT', body }); toast('Saved, and the list is reworked.'); draw(); }
        catch (err) { console.error('[site-audit]', err); toast(err.message, 'error'); }
      });
    });
    const gsc = el.querySelector('#gsc');
    if (gsc) gsc.addEventListener('change', async () => {
      const file = gsc.files[0];
      if (!file) return;
      try {
        const zip = /\.zip$/i.test(file.name);
        const body = { filename: file.name };
        if (zip) { const bytes = new Uint8Array(await file.arrayBuffer()); let s = ''; for (const b of bytes) s += String.fromCharCode(b); body.zip_base64 = btoa(s); }
        else body.csv = await file.text();
        d = await api(`${base}/search-console`, { method: 'POST', body });
        toast('Search Console file saved. The list is being reworked.');
        draw(); clearTimeout(timer); timer = setTimeout(load, 1500);
      } catch (err) { console.error('[site-audit]', err); toast(err.message, 'error'); }
    });
  }

  async function openUrl(id) {
    let x;
    try { x = await api(`${base}/urls/${encodeURIComponent(id)}`); }
    catch (err) { console.error('[site-audit]', err); toast(err.message, 'error'); return; }
    const u = x.url;
    const facts = [
      ['Status', u.status_code == null ? 'Not fetched' : String(u.status_code)],
      u.redirect_target ? ['Goes to', u.redirect_target] : null,
      (u.redirect_chain || []).length > 1 ? ['Redirects', u.redirect_chain.map(c => `${c.status} ${c.url}`).join(', then ')] : null,
      u.canonical ? ['Canonical', u.canonical] : null,
      u.noindex ? ['Search engines', 'Told not to index it'] : null,
      ['Title', u.title || 'None'], ['H1', u.h1 || 'None'], ['Meta description', u.meta_description || 'None'],
      ['Words', u.word_count == null ? 'Not read' : String(u.word_count)], ['Internal links in', String(u.inlinks)],
      u.top20 ? ['Top list', u.top20_why] : null,
    ].filter(Boolean);
    const searches = (u.top_searches || []).map(s => ({ ...s }));
    const links = x.links;
    const realCount = links.filter(l => l.real).length;
    const dlg = dialog({ title: u.path || u.url, wide: true, body: `
      <div class="stack" style="gap:16px">
        <div>${u.matters ? pill('ok', 'Matters') : pill('none', "Doesn't matter")} <span class="muted">${h((u.matters_why || []).join('. '))}</span>
          <div class="btn-row" style="margin-top:8px"><button class="btn btn-ghost btn-sm" data-over="true">This page matters</button><button class="btn btn-ghost btn-sm" data-over="false">It doesn't matter</button>${x.override && x.override.matters_override != null ? '<button class="btn btn-ghost btn-sm" data-over="null">Clear my answer</button>' : ''}</div></div>
        <table class="tbl"><tbody>${facts.map(([k, v]) => `<tr><th style="width:150px;text-align:left">${h(k)}</th><td style="overflow-wrap:anywhere">${h(v)}</td></tr>`).join('')}</tbody></table>
        <div><h3>Top searches</h3>${searches.length ? `<table class="tbl"><thead><tr><th>Search</th><th class="num">Position</th><th class="num">${searches[0].source === 'Search Console' ? 'Clicks' : 'Est. visits'}</th><th>From</th></tr></thead><tbody>${searches.map(s => `<tr><td>${h(s.search)}</td><td class="num">${s.position == null ? '' : Math.round(s.position)}</td><td class="num">${s.source === 'Search Console' ? s.clicks : s.estimated}</td><td>${h(s.source)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Nothing on record.</p>'}</div>
        <div><h3>Links to this page: ${realCount} real of ${links.length}</h3>${links.length ? `<div class="tbl-wrap" style="max-height:320px;overflow:auto"><table class="tbl"><thead><tr><th>From</th><th>Link text</th><th class="num">Spam score</th><th class="num">Rank</th><th>Verdict</th></tr></thead><tbody>${links.map(l => `<tr><td style="overflow-wrap:anywhere">${/^https?:/i.test(l.url_from) ? `<a href="${attr(l.url_from)}" target="_blank" rel="noopener nofollow noreferrer">${h(l.domain_from)}</a>` : h(l.domain_from)}</td><td style="overflow-wrap:anywhere">${h(String(l.anchor || '').slice(0, 60))}</td><td class="num">${l.spam_score == null ? 'None' : l.spam_score}</td><td class="num">${l.domain_rank == null ? '' : l.domain_rank}</td><td>${l.real ? pill('ok', 'Real') : pill('none', 'Junk')}<div class="muted small">${h(l.reasons.join('. '))}</div></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No links on record.</p>'}</div>
        <div><h3>Saved text</h3>${u.main_text ? `<div style="white-space:pre-wrap;max-height:280px;overflow:auto;border:1px solid var(--border);padding:12px;border-radius:8px">${h(u.main_text)}</div>` : '<p class="muted">No text was read from this URL.</p>'}</div>
      </div>` });
    const root = dlg && dlg.el ? dlg.el : document;
    root.querySelectorAll('[data-over]').forEach(b => b.addEventListener('click', async () => {
      const matters = b.dataset.over === 'null' ? null : b.dataset.over === 'true';
      try {
        d = await api(`${base}/urls/${encodeURIComponent(id)}/matters`, { method: 'PUT', body: { matters } });
        toast('Saved.');
        if (dlg && dlg.close) dlg.close();
        draw();
      } catch (err) { console.error('[site-audit]', err); toast(err.message, 'error'); }
    }));
  }

  el.innerHTML = '<div class="skel" style="height:120px"></div>';
  await load();
}
