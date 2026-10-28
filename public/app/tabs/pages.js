// Pages tab (27 Oct 2026): one table for every page type (homepage, category, service,
// location) with a type filter: page, status (not started, running, written, blocked,
// waiting on a person, approved, pushed), quality score, claims to accept, last run.
// Write all / resume / write one through the existing run routes; a row opens the Page view.
// Polls every 8 seconds while a run is on.

import { h, attr, api, card, table, status, pill, timeEl, score, running, toast, confirm, empty, plural } from '../ui.js';

const TYPES = [['homepage', 'Homepage'], ['category', 'Category'], ['service', 'Service'], ['location', 'Location']];
const STATUS_KIND = { 'not started': 'none', running: 'run', queued: 'none', written: 'ok', blocked: 'block', failed: 'block', 'waiting on a person': 'wait', approved: 'ok', pushed: 'ok', skipped: 'none', waiting: 'none' };

export async function render(el, ctx) {
  const { clientId } = ctx;
  let filter = ctx.query.type || 'all';
  let quality = false;
  let timer = null;
  let data = null;

  const load = async () => {
    const [summary, home, cat, svc, loc, log] = await Promise.all([
      api(`/api/clients/${clientId}/summary`),
      api(`/api/clients/${clientId}/v20/homepage`).catch(() => null),
      api(`/api/clients/${clientId}/category-pages`).catch(e => ({ error: e.message })),
      api(`/api/clients/${clientId}/service-pages`).catch(e => ({ error: e.message })),
      api(`/api/clients/${clientId}/location-pages`).catch(e => ({ error: e.message })),
      api(`/api/clients/${clientId}/wp/log?limit=200`).catch(() => ({ log: [] })),
    ]);
    const entries = Array.isArray(log) ? log : (log && (log.log || log.entries)) || [];
    const pushed = new Set(entries.filter(e => e.result === 'pushed' && e.recordId).map(e => e.recordId));
    const views = { category: cat, service: svc, location: loc };
    const rows = [];
    // Homepage: from its record
    const hp = summary.row.page_types && summary.row.page_types.homepage;
    if (hp && hp.total || (home && home.record)) {
      const r = home && home.record, m = r && r.meta || {}, V = r && r.VALIDATION || {};
      const claims = r && r.CLAIMS && r.CLAIMS.findings ? r.CLAIMS.findings.length - (r.CLAIMS.accepted || []).length : 0;
      const hsum = (summary.row.page_list || []).find(x => x.type === 'homepage') || {};
      rows.push(pageRow({ type: 'homepage', key: 'homepage', title: 'Homepage', h1: r && r.home_hero_h1 || '', record: r ? { id: home.id || home.recordId, at: m.edited_at || m.generated_at, error: r.error, blocked: !!r.blocked, block: V.block, flag: V.flag, claims, good: V.status === 'run' && V.block === 0 && !r.blocked && !r.error, score: r.QUALITY ? r.QUALITY.score : null, approved: !!m.approved_at, cost_pence: hsum.cost_pence ?? null } : null, running: summary.running.some(x => x.client_id === clientId && x.kind === 'homepage'), ready: true, pushed }));
    }
    for (const [t, v] of Object.entries(views)) {
      if (v.error && !v.pages) continue;
      for (const p of v.pages || []) {
        const st = v.run && v.run.pages ? v.run.pages.find(x => x.key === p.key) : null;
        const sum = (summary.row.page_list || []).find(x => x.type === t && x.key === p.key) || {};
        const rec = p.record ? { ...p.record, score: sum.score ?? null, cost_pence: sum.cost_pence ?? null } : null;
        rows.push(pageRow({ type: t, key: p.key, title: p.title, h1: p.h1, scope: p.scope, town: p.town, record: rec, running: !!(v.running && v.running.current === p.key), queued: !!(v.running && st && st.status === 'pending'), skipped: st && st.status === 'skipped' ? st.error : null, ready: t === 'service' ? p.parent_written !== false : t === 'location' ? p.ready !== false && !p.admin_area : true, waitingOn: t === 'service' ? (p.parent_written === false ? `category page ${p.parent_key || ''} not written yet` : '') : t === 'location' ? (p.admin_area ? 'council area: not written' : (p.waiting_on || []).join(', ')) : '', pushed }));
      }
    }
    data = { summary, views, rows, home };
    draw();
    clearTimeout(timer);
    if (rows.some(r => r.status === 'running' || r.status === 'queued')) timer = setTimeout(load, 8000);
  };

  function pageRow(p) {
    const r = p.record;
    let st = 'not started';
    if (p.running) st = 'running';
    else if (p.queued) st = 'queued';
    else if (r && r.error) st = 'failed';
    else if (r && (r.blocked || r.block > 0)) st = 'blocked';
    else if (r && p.pushed.has(r.id)) st = 'pushed';
    else if (r && r.approved) st = 'approved';
    else if (r && r.claims > 0) st = 'waiting on a person';
    else if (r && r.good) st = 'written';
    else if (r) st = 'blocked';
    else if (p.skipped) st = 'skipped';
    else if (!p.ready) st = 'waiting';
    const detail = st === 'failed' ? r.error : st === 'blocked' ? (r.blocked ? 'blocked by a gate: a decision could not be made' : `${r.block} BLOCK to fix`) : st === 'waiting on a person' ? `${r.claims} claim${r.claims === 1 ? '' : 's'} to accept` : st === 'skipped' ? p.skipped : st === 'waiting' ? p.waitingOn : st === 'written' && r.flag ? `${r.flag} FLAG to read` : '';
    return { ...p, status: st, detail, score: r ? r.score : null, cost: r ? r.cost_pence : null, claims: r ? r.claims : 0, at: r ? r.at : null, href: r ? `/clients/${clientId}/pages/${p.type}/${encodeURIComponent(p.key)}` : '' };
  }

  const draw = () => {
    const { rows, views } = data;
    const list = filter === 'all' ? rows : rows.filter(r => r.type === filter);
    const counts = Object.fromEntries(TYPES.map(([t]) => [t, rows.filter(r => r.type === t).length]));
    const runningRows = rows.filter(r => r.status === 'running');
    const anyRunning = runningRows.length > 0 || Object.values(views).some(v => v.running);
    // One notice per distinct readiness problem (the three page types often share one)
    const problems = new Map();
    for (const [t, v] of Object.entries(views)) if (v.readiness && v.readiness.ok === false) { const msg = v.readiness.error || 'not ready'; if (!problems.has(msg)) problems.set(msg, []); problems.get(msg).push(t); }
    const readiness = [...problems].map(([msg, ts]) => `<div class="notice bad" style="margin-bottom:10px"><strong>${h(ts.join(', '))} pages:</strong> ${h(msg)}</div>`).join('');
    const columns = [
      { key: 'title', label: 'Page', cls: 'no-label', render: r => `<span class="primary">${h(r.title)}</span><span class="sub">${h(r.h1 || r.key)}${r.town ? ` · ${h(r.town)}` : ''}</span>` },
      { key: 'type', label: 'Type', render: r => `${h(TYPES.find(t => t[0] === r.type)[1])}${r.scope === 'town' ? ' <span class="muted small">(town)</span>' : ''}` },
      { key: 'status', label: 'Status', render: r => `${status(STATUS_KIND[r.status] || 'none', r.status)}${r.detail ? `<span class="sub">${h(r.detail)}</span>` : ''}` },
      { key: 'score', label: 'Quality', num: true, render: r => score(r.score) },
      { key: 'cost', label: 'Cost', num: true, render: r => r.cost === null || r.cost === undefined ? '<span class="muted">–</span>' : `£${(r.cost / 100).toFixed(2)}` },
      { key: 'claims', label: 'Claims', num: true, render: r => r.claims ? `<span class="pill wait">${r.claims}</span>` : '<span class="muted">0</span>' },
      { key: 'at', label: 'Last run', render: r => timeEl(r.at) },
      { key: 'act', label: '', cls: 'right no-label', render: r => r.type === 'homepage'
        ? `<button class="btn btn-ghost btn-sm" data-write="homepage" data-key="homepage" ${anyRunning ? 'disabled' : ''}>${r.record ? 'Write again' : 'Write'}</button>`
        : `<button class="btn btn-ghost btn-sm" data-write="${h(r.type)}" data-key="${attr(r.key)}" ${anyRunning || !r.ready || (views[r.type].readiness && views[r.type].readiness.ok === false) ? 'disabled' : ''}>${r.record ? 'Write again' : 'Write'}</button>` },
    ];
    const runLine = runningRows.length ? runningRows.map(r => { const v = views[r.type]; const list = v && v.run && v.run.pages || []; const done = list.filter(p => ['done', 'kept', 'blocked', 'failed', 'skipped'].includes(p.status)).length; const nxt = list.find(p => p.status === 'pending'); return running({ now: `Writing ${r.title}`, next: nxt ? `Next: ${nxt.title}` : 'Then the run finishes and this table refreshes', done: list.length ? done : null, total: list.length || null }); }).join('') : (anyRunning ? running({ now: 'A run is starting', next: 'The first page appears here in a moment' }) : '');
    const cost = data.summary.row.cost || {};
    const typeLine = TYPES.map(([t, l]) => `${counts[t]} ${l.toLowerCase()}`).join(', ');
    const summaryLine = rows.length ? `<div class="notice" style="margin-bottom:14px;display:flex;gap:16px;flex-wrap:wrap;align-items:center"><span><strong>${plural(rows.length, 'page')}</strong>: ${h(typeLine)}</span><span>${rows.filter(r => r.record).length} written</span><span>spent <strong>£${((cost.spent_pence || 0) / 100).toFixed(2)}</strong>${cost.logged !== undefined && cost.logged < rows.filter(r => r.record).length ? ` <span class="muted">(${cost.logged} of ${rows.filter(r => r.record).length} written pages have a cost on record)</span>` : ''}</span><span>estimated <strong>£${((cost.estimate_pence || 0) / 100).toFixed(2)}</strong> to write the rest <span class="muted">(each type at its average here, else about 60p a page)</span></span></div>` : '';
    el.innerHTML = `
      ${readiness}
      ${summaryLine}
      ${runLine ? `<div style="margin-bottom:14px">${runLine}</div>` : ''}
      <section class="card card-flat">
        <div class="tbl-tools">
          <div class="chips">${[['all', 'All'], ...TYPES].map(([k, l]) => `<button class="chip${filter === k ? ' active' : ''}" data-filter="${k}">${l}${k === 'all' ? ` <span class="muted">${rows.length}</span>` : ` <span class="muted">${counts[k]}</span>`}</button>`).join('')}</div>
          <span class="spacer"></span>
          <label class="check small" title="The rubric review after each page: slower, about 50p a page more"><input type="checkbox" id="quality"${quality ? ' checked' : ''}> rubric review</label>
          <button class="btn btn-primary btn-sm" data-run="resume" ${anyRunning || !rows.length ? 'disabled' : ''}>${rows.some(r => r.record) ? `Write the rest (${rows.filter(r => !r.record || r.status === 'failed' || r.status === 'blocked').length})` : 'Write all'}</button>
          <button class="btn btn-ghost btn-sm" data-run="all" ${anyRunning || !rows.length ? 'disabled' : ''}>Write all again</button>
        </div>
        ${table({ columns, rows: list, rowHref: r => r.href || null, cards: true, emptyText: rows.length ? 'No pages of this type.' : 'No pages in the page map yet. Generate the page map first.' })}
        <div class="tbl-foot">${h(plural(list.length, 'page'))} · ${list.filter(r => r.status === 'written' || r.status === 'approved' || r.status === 'pushed').length} written clean · ${list.filter(r => r.status === 'blocked' || r.status === 'failed').length} blocked or failed · ${list.reduce((n, r) => n + r.claims, 0)} claims to accept</div>
      </section>`;
    el.querySelector('#quality').addEventListener('change', e => { quality = e.target.checked; });
  };

  el.addEventListener('click', async e => {
    const f = e.target.closest('[data-filter]'); if (f) { filter = f.dataset.filter; draw(); return; }
    const w = e.target.closest('[data-write]');
    if (w) {
      e.stopPropagation();
      const type = w.dataset.write, key = w.dataset.key;
      try {
        if (type === 'homepage') { w.disabled = true; w.textContent = 'Writing…'; api(`/api/clients/${clientId}/v20/homepage/generate`, { method: 'POST', body: {} }).then(() => load()).catch(err => { toast(err.message, 'bad'); load(); }); toast('Writing the homepage: a minute or two'); setTimeout(load, 1500); return; }
        await api(`/api/clients/${clientId}/${type}-pages/run`, { method: 'POST', body: { resume: false, keys: [key], quality } });
        toast(`Writing ${key}`); load();
      } catch (err) { toast(err.message, 'bad'); }
      return;
    }
    const r = e.target.closest('[data-run]');
    if (r) {
      const resume = r.dataset.run === 'resume';
      if (!resume && !(await confirm({ title: 'Write every page again?', text: 'Existing records are kept as earlier versions. Category pages run first, then service, then location.', ok: 'Write all again' }))) return;
      const order = ['category', 'service', 'location'];
      const todo = order.filter(t => (data.views[t].pages || []).length && !(data.views[t].readiness && data.views[t].readiness.ok === false));
      const hp = data.rows.find(x => x.type === 'homepage');
      try {
        if (hp && (!resume || !hp.record)) { api(`/api/clients/${clientId}/v20/homepage/generate`, { method: 'POST', body: {} }).catch(() => {}); }
        // The runs go one after another in the background: category first, service once it finishes, then location
        (async () => {
          for (const t of todo) {
            await api(`/api/clients/${clientId}/${t}-pages/run`, { method: 'POST', body: { resume, quality } }).catch(err => toast(`${t} pages: ${err.message}`, 'bad'));
            await waitForRun(t);
          }
          load();
        })();
        toast(resume ? 'Writing the pages that are missing' : 'Writing every page again'); setTimeout(load, 1200);
      } catch (err) { toast(err.message, 'bad'); }
    }
  });
  const waitForRun = async t => { for (let i = 0; i < 720; i++) { await new Promise(r => setTimeout(r, 10000)); const v = await api(`/api/clients/${clientId}/${t}-pages`).catch(() => null); if (!v || !v.running) return; } };

  await load();
  return () => clearTimeout(timer);
}
