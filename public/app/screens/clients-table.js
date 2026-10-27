// The clients table (27 Oct 2026), shared by the dashboard and the Clients screen:
// client, niche, stage, first blocker, last activity, assigned to. Search by name,
// archived hidden by default, the "Needs a person" filter, optional niche tabs.
// Row click opens the client.

import { h, attr, api, table, sortRows, status, pill, timeEl, wire, debounce, plural, toast } from '../ui.js';

export const STAGE_KIND = { Onboarding: 'none', Research: 'none', 'Page map': 'none', Pages: 'run', GBP: 'run', Live: 'ok' };

export function clientsTable(el, data, ctx, { title = 'Clients', filters = {}, nicheTabs = false, showArchiveToggle = false } = {}) {
  const state = { q: '', needs: !!filters.needs, newOnly: filters.newOnly || '', archived: false, niche: 'all', sort: { key: 'last_activity', dir: 'desc' } };
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000, dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);

  const rows = () => {
    let list = data.clients.filter(c => state.archived ? c.archived : !c.archived);
    if (state.q) { const q = state.q.toLowerCase(); list = list.filter(c => c.name.toLowerCase().includes(q) || (c.niche || '').toLowerCase().includes(q) || (c.assigned_to || '').toLowerCase().includes(q)); }
    if (state.needs) list = list.filter(c => c.needs_person);
    if (state.newOnly === 'today') list = list.filter(c => c.first_submission_at && new Date(c.first_submission_at) >= dayStart);
    if (state.newOnly === 'week') list = list.filter(c => c.first_submission_at && new Date(c.first_submission_at) >= weekAgo);
    if (nicheTabs && state.niche !== 'all') list = list.filter(c => (c.niche_key || 'other') === state.niche);
    return sortRows(list, state.sort);
  };

  const columns = [
    { key: 'name', label: 'Client', sortable: true, cls: 'no-label', render: c => `<span class="primary">${h(c.name)}</span>${c.business_type ? `<span class="sub">type ${h(c.business_type)}</span>` : ''}` },
    { key: 'niche', label: 'Niche', sortable: true, render: c => h(c.niche) },
    { key: 'stage_index', label: 'Stage', sortable: true, render: c => status(c.running ? 'run' : c.needs_person ? 'wait' : STAGE_KIND[c.stage] || 'none', c.stage) },
    { key: 'blocker', label: 'Blocker', sortable: true, render: c => c.blocker ? `<span class="tip" data-tip="${attr(c.blockers.map(b => b.text).join('\n'))}">${h(c.blocker)}</span>` : '<span class="muted">none</span>' },
    { key: 'last_activity', label: 'Last activity', sortable: true, render: c => timeEl(c.last_activity) },
    { key: 'assigned_to', label: 'Assigned to', sortable: true, render: c => c.assigned_to ? h(c.assigned_to) : '<span class="muted">–</span>' },
  ];

  const draw = () => {
    const list = rows();
    const counts = data.tabs || [];
    const tabs = nicheTabs ? `<div class="tabs" style="margin:0;padding:0 20px;border-bottom:1px solid var(--border)">${[{ key: 'all', label: 'All', n: data.clients.filter(c => state.archived ? c.archived : !c.archived).length }, ...counts.filter(t => t.key !== 'all').map(t => ({ key: t.key, label: t.label, n: t.count }))].map(t => `<button class="tab${state.niche === t.key ? ' active' : ''}" data-niche="${h(t.key)}">${h(t.label)}<span class="count">${t.n}</span></button>`).join('')}</div>` : '';
    el.innerHTML = `
      <div class="tbl-tools">
        <strong>${h(title)}</strong>
        <input class="input search" id="q" type="search" placeholder="Search by name" value="${attr(state.q)}">
        <div class="chips">
          <button class="chip${state.needs ? ' active' : ''}" data-chip="needs">Needs a person</button>
          ${state.newOnly ? `<button class="chip active" data-chip="new">New ${state.newOnly === 'today' ? 'today' : 'this week'} ×</button>` : ''}
        </div>
        <span class="spacer"></span>
        ${showArchiveToggle ? `<label class="check"><input type="checkbox" id="arch"${state.archived ? ' checked' : ''}> Show archived</label>` : ''}
      </div>
      ${tabs}
      ${table({ columns, rows: list, rowHref: c => `/clients/${c.id}`, cards: true, sort: state.sort, emptyText: state.needs ? 'Nothing is waiting on a person.' : state.q ? 'No client matches.' : 'No clients yet. Add one to start.' })}
      <div class="tbl-foot">${h(plural(list.length, 'client'))}${state.archived ? ' archived' : ''}</div>`;
    el.querySelector('#q').addEventListener('input', debounce(e => { state.q = e.target.value; redraw(true); }, 150));
    el.querySelectorAll('[data-chip]').forEach(b => b.addEventListener('click', () => { if (b.dataset.chip === 'needs') state.needs = !state.needs; if (b.dataset.chip === 'new') state.newOnly = ''; draw(); }));
    el.querySelectorAll('[data-niche]').forEach(b => b.addEventListener('click', () => { state.niche = b.dataset.niche; draw(); }));
    const arch = el.querySelector('#arch'); if (arch) arch.addEventListener('change', () => { state.archived = arch.checked; draw(); });
  };
  // Keep the search box focused while typing
  const redraw = keepFocus => { const pos = keepFocus && el.querySelector('#q') ? el.querySelector('#q').selectionStart : null; draw(); if (pos !== null) { const q = el.querySelector('#q'); q.focus(); q.setSelectionRange(pos, pos); } };
  if (!el.dataset.wired) { wire(el, { onSort: key => { state.sort = state.sort.key === key ? { key, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'last_activity' ? 'desc' : 'asc' }; draw(); } }); el.dataset.wired = '1'; }
  draw();
  return { state, draw };
}
