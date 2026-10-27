// The client page (27 Oct 2026): header (name, niche, business type, stage, the first
// blocker, Run next step, assigned to) and the tabs, each with a status dot. Each tab
// is a module under /app/tabs/ exporting render(el, ctx) and may return a cleanup.

import { h, attr, api, status, pill, dot, timeEl, toast, confirm, tag } from '../ui.js';

const TABS = [
  ['record', 'Record'], ['research', 'Research'], ['page-map', 'Page map'], ['pages', 'Pages'],
  ['gbp', 'GBP'], ['rankings', 'Rankings'], ['images', 'Images'], ['site-audit', 'Site audit'],
];
const MODULES = {
  record: () => import('../tabs/record.js'), research: () => import('../tabs/research.js'), 'page-map': () => import('../tabs/pagemap.js'),
  pages: () => import('../tabs/pages.js'), gbp: () => import('../tabs/gbp.js'), rankings: () => import('../tabs/rankings.js'),
  images: () => import('../tabs/images.js'), 'site-audit': () => import('../tabs/audit.js'),
};
const STAGE_KIND = { Onboarding: 'none', Research: 'none', 'Page map': 'none', Pages: 'run', GBP: 'run', Live: 'ok' };

// The dot on each tab, from the client's summary row
export function tabDots(row, summary) {
  const pt = row.page_types || {};
  const anyRec = Object.values(pt).some(t => t.records);
  const allGood = row.pages.total && row.pages.written === row.pages.total;
  const kinds = new Set(row.needs_kinds || []);
  return {
    record: row.missing_fields.length ? 'wait' : row.stage === 'Onboarding' ? 'none' : 'ok',
    research: row.towns_without_dossier.length ? 'wait' : row.stage === 'Onboarding' || row.stage === 'Research' ? 'none' : 'ok',
    'page-map': row.stage_index >= 3 ? 'ok' : 'none',
    pages: row.running ? 'run' : kinds.has('claims') || kinds.has('blocked') || kinds.has('pack') ? 'wait' : allGood ? 'ok' : anyRec ? 'run' : 'none',
    gbp: row.gbp_done ? 'ok' : row.stage === 'GBP' ? 'run' : 'none',
    rankings: row.has_scans ? 'ok' : 'none',
    images: 'none', 'site-audit': 'none',
  };
}

export async function render(root, params, ctx) {
  const { clientId, tab } = params;
  let client, summary;
  try { [client, summary] = await Promise.all([api(`/api/clients/${clientId}`), api(`/api/clients/${clientId}/summary`)]); }
  catch (e) { root.innerHTML = `<div class="card"><div class="state failed"><h3>Client not found</h3><p>${h(e.message)}</p><a class="btn btn-ghost" href="/clients" data-link>Clients</a></div></div>`; return; }
  const row = summary.row;
  ctx.setTitle(client.name);
  const dots = tabDots(row, summary);
  const blockerTip = row.blockers.length ? row.blockers.map(b => b.text).join('\n') : 'Nothing is blocking this client.';

  const nextLabel = { Onboarding: 'Open the record', Research: 'Research the missing towns', 'Page map': 'Generate the page map', Pages: 'Write the next pages', GBP: 'Generate the GBP output', Live: 'Nothing to run' }[row.stage];
  root.innerHTML = `
    <div class="crumbs"><a href="/clients" data-link>Clients</a> / ${h(client.name)}</div>
    <div class="ph">
      <div class="ph-title"><h1>${h(client.name)}${client.archived_at ? ' <span class="pill">archived</span>' : ''}</h1>
        <div class="ph-meta">
          <span>${h(row.niche || client.trade || '')}</span>
          ${row.business_type ? `<span>type ${h(row.business_type)}</span>` : ''}
          ${status(row.running ? 'run' : row.needs_person ? 'wait' : STAGE_KIND[row.stage], row.stage)}
          <span class="tip" data-tip="${attr(blockerTip)}">${row.blocker ? `<span class="pill ${row.needs_person ? 'wait' : ''}">${h(row.blocker)}</span>` : '<span class="pill ok">no blocker</span>'}</span>
          <span>last activity ${timeEl(row.last_activity)}</span>
          ${client.source === 'fillout' ? `<span class="pill ${client.reviewed_at ? 'ok' : 'wait'}">${client.reviewed_at ? 'record reviewed' : 'record not reviewed'}</span>` : ''}
        </div></div>
      <div class="ph-actions">
        <label class="inline-edit small muted">Assigned to <input class="input" id="assigned" style="width:130px;padding:5px 8px" value="${attr(row.assigned_to || '')}" placeholder="a name"></label>
        <button class="btn btn-primary" id="runNext" ${row.stage === 'Live' || row.running ? 'disabled' : ''}>${row.running ? 'Running…' : h(nextLabel)}</button>
        <div class="menu-wrap" style="position:relative"><button class="btn btn-ghost" id="moreBtn">More ▾</button>
          <div class="card" id="moreMenu" style="display:none;position:absolute;right:0;top:40px;z-index:20;min-width:220px;padding:6px">
            ${client.source === 'fillout' ? `<button class="btn btn-ghost" style="width:100%;justify-content:flex-start;border:0" data-act="reviewed">${client.reviewed_at ? 'Mark record unreviewed' : 'Mark record reviewed'}</button>` : ''}
            <label class="btn btn-ghost" style="width:100%;justify-content:flex-start;border:0">Move to niche <select class="input" id="moveNiche" style="width:auto;padding:3px 6px;margin-left:6px"><option value="">…</option></select></label>
            <button class="btn btn-ghost" style="width:100%;justify-content:flex-start;border:0" data-act="archive">${client.archived_at ? 'Unarchive' : 'Archive'}</button>
            <button class="btn btn-ghost" style="width:100%;justify-content:flex-start;border:0;color:#b91c1c" data-act="delete">Delete client</button>
          </div></div>
      </div>
    </div>
    <div class="tabs" id="tabs">${TABS.filter(([k]) => k !== 'site-audit' || row.existing_site !== false).map(([k, l]) => `<a class="tab${k === tab ? ' active' : ''}" href="/clients/${clientId}/${k}" data-link>${dot(dots[k])}${h(l)}</a>`).join('')}</div>
    <div id="tabBody"></div>`;

  // Header actions
  const assigned = root.querySelector('#assigned');
  assigned.addEventListener('change', async () => { try { const r = await api(`/api/clients/${clientId}/assigned-to`, { method: 'PUT', body: { name: assigned.value } }); assigned.value = r.assigned_to; toast(r.assigned_to ? `Assigned to ${r.assigned_to}` : 'Unassigned'); } catch (e) { toast(e.message, 'bad'); } });
  const more = root.querySelector('#moreMenu');
  root.querySelector('#moreBtn').addEventListener('click', () => { more.style.display = more.style.display === 'none' ? 'block' : 'none'; });
  document.addEventListener('click', e => { if (!e.target.closest('.menu-wrap')) more.style.display = 'none'; }, { capture: true });
  api('/api/niches').then(n => { const sel = root.querySelector('#moveNiche'); sel.innerHTML = '<option value="">…</option>' + n.niches.map(x => `<option value="${h(x.key)}"${x.key === client.niche_key ? ' selected' : ''}>${h(x.label)}</option>`).join(''); }).catch(() => {});
  root.querySelector('#moveNiche').addEventListener('change', async e => {
    if (!e.target.value) return;
    try { const r = await api(`/api/clients/${clientId}/move`, { method: 'POST', body: { niche_key: e.target.value } }); toast(`Moved to ${r.niche_label}`); ctx.navigate(location.pathname, { replace: true }); } catch (err) { toast(err.message, 'bad'); }
  });
  more.addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b) return; more.style.display = 'none';
    try {
      if (b.dataset.act === 'reviewed') { await api(`/api/clients/${clientId}/reviewed`, { method: 'POST', body: { reviewed: !client.reviewed_at } }); toast(client.reviewed_at ? 'Marked unreviewed' : 'Marked reviewed'); }
      if (b.dataset.act === 'archive') {
        if (!client.archived_at && !(await confirm({ title: `Archive ${client.name}?`, text: 'It leaves the clients list; everything is kept and it can be unarchived.', ok: 'Archive' }))) return;
        await api(`/api/clients/${clientId}/${client.archived_at ? 'unarchive' : 'archive'}`, { method: 'POST' }); toast(client.archived_at ? 'Unarchived' : 'Archived');
      }
      if (b.dataset.act === 'delete') {
        if (!(await confirm({ title: `Delete ${client.name}?`, text: 'Every record, page and file for this client is removed. This cannot be undone.', ok: 'Delete', danger: true }))) return;
        await api(`/api/clients/${clientId}`, { method: 'DELETE' }); toast('Deleted'); return ctx.navigate('/clients');
      }
      ctx.navigate(location.pathname, { replace: true });
    } catch (err) { toast(err.message, 'bad'); }
  });
  root.querySelector('#runNext').addEventListener('click', () => runNext(row, clientId, ctx));

  // The tab
  const body = root.querySelector('#tabBody');
  const tabCtx = { clientId, client, summary, row, query: ctx.query, navigate: ctx.navigate, refresh: () => ctx.navigate(location.pathname, { replace: true }) };
  try {
    const mod = await MODULES[tab]();
    return await mod.render(body, tabCtx);
  } catch (e) {
    console.error(e);
    body.innerHTML = `<div class="card"><div class="state failed"><h3>This tab could not load</h3><p>${h(e.message)}</p></div></div>`;
  }
}

// Run next step: whatever the stage says comes next
async function runNext(row, clientId, ctx) {
  const go = t => ctx.navigate(`/clients/${clientId}/${t}`);
  try {
    if (row.stage === 'Onboarding') return go('record');
    if (row.stage === 'Research') return ctx.navigate(`/clients/${clientId}/research?run=missing`);
    if (row.stage === 'Page map') return go('page-map');
    if (row.stage === 'Pages') {
      const pt = row.page_types || {};
      if (pt.homepage && pt.homepage.total && !pt.homepage.written) { api(`/api/clients/${clientId}/v20/homepage/generate`, { method: 'POST', body: {} }).catch(e => toast(e.message, 'bad')); toast('Writing the homepage'); return go('pages'); }
      for (const t of ['category', 'service', 'location']) {
        if (pt[t] && pt[t].total && pt[t].written < pt[t].total) { await api(`/api/clients/${clientId}/${t}-pages/run`, { method: 'POST', body: { resume: true } }); toast(`Writing the ${t} pages`); return go('pages'); }
      }
      return go('pages');
    }
    if (row.stage === 'GBP') { api(`/api/clients/${clientId}/gbp/generate`, { method: 'POST' }).catch(e => toast(e.message, 'bad')); toast('Generating the GBP output'); return go('gbp'); }
  } catch (e) { toast(e.message, 'bad'); }
}
