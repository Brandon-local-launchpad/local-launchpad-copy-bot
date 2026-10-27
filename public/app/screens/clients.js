// Clients (27 Oct 2026): the dashboard's table full page, niche tabs, the archive toggle,
// and the Fillout clients still to allocate ("Is this client a X?") as a card at the top.

import { h, attr, api, card, toast, confirm, fmtDate, wire } from '../ui.js';
import { clientsTable } from './clients-table.js';

export async function render(root, params, ctx) {
  ctx.setTitle('Clients');
  const [dash, list] = await Promise.all([api('/api/dashboard'), api('/api/clients?archived=1')]);
  const byId = new Map(list.clients.map(c => [c.id, c]));
  const niches = list.niches;
  const nicheOptions = sel => niches.map(n => `<option value="${h(n.key)}"${n.key === sel ? ' selected' : ''}>${h(n.label)}</option>`).join('');
  const isoDate = d => (d ? new Date(d).toISOString().slice(0, 10) : '');

  const draw = () => {
    const pending = list.clients.filter(c => !c.archived_at && (!c.niche_key || c.niche_key === 'other') && c.source === 'fillout' && !c.allocated);
    root.innerHTML = `
      <div class="ph"><div class="ph-title"><h1>Clients</h1><div class="ph-meta">${list.clients.filter(c => !c.archived_at).length} active</div></div>
        <div class="ph-actions"><a class="btn btn-primary" href="/add-client" data-link>Add client</a></div></div>
      ${pending.length ? card({ title: `New from Fillout: ${pending.length} to allocate`, sub: 'Say which niche each one is in. The record, services and page map follow from the niche.', body: pending.map(newCard).join('') }) : ''}
      <div class="card card-flat" style="margin-top:${pending.length ? 16 : 0}px"><div id="tbl"></div></div>`;
    clientsTable(root.querySelector('#tbl'), { ...dash, tabs: list.tabs }, ctx, { title: 'All clients', nicheTabs: true, showArchiveToggle: true, filters: { needs: ctx.query.needs === '1', newOnly: ctx.query.new || '' } });
  };

  function newCard(c) {
    const sug = c.suggested_niche_key ? niches.find(n => n.key === c.suggested_niche_key) : null;
    return `<div class="notice" style="margin-bottom:10px" data-new="${h(c.id)}">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">
        <div><strong><a href="/clients/${h(c.id)}" data-link>${h(c.name)}</a></strong>${c.duplicate_of ? ` <span class="pill wait">possible duplicate of ${h(c.duplicate_of.name || 'another client')}</span>` : ''}<div class="small muted">Form came in ${h(fmtDate(c.submitted_at || c.created_at))}${c.fillout_niche ? ` · form niche: ${h(c.fillout_niche)}` : ''}</div></div>
        <div class="btn-row">
          ${sug ? `<span>Is this client a <strong>${h(sug.label)}</strong>?</span><button class="btn btn-primary btn-sm" data-alloc="${h(sug.key)}">Yes, allocate</button>` : '<span class="muted">No suggestion: pick a niche</span>'}
          <select class="input" style="width:auto" data-pick>${sug ? '' : '<option value="">Choose…</option>'}${nicheOptions(sug ? sug.key : null)}</select>
          <input class="input" style="width:auto" type="date" data-date value="${h(isoDate(c.submitted_at || c.created_at))}" title="Date they came in">
          <button class="btn btn-ghost btn-sm" data-alloc-pick>Allocate to chosen niche</button>
          <button class="btn btn-ghost btn-sm" data-archive>Archive</button>
        </div></div></div>`;
  }

  root.addEventListener('click', async e => {
    const box = e.target.closest('[data-new]'); if (!box) return;
    const id = box.dataset.new;
    const allocate = async key => {
      if (!key) return toast('Pick a niche first', 'bad');
      try {
        const r = await api(`/api/clients/${id}/allocate`, { method: 'POST', body: { niche_key: key, signed_on: box.querySelector('[data-date]').value } });
        Object.assign(byId.get(id), { niche_key: r.niche_key, niche_label: r.niche_label, allocated: true, suggested_niche_key: null });
        if (r.tabs) list.tabs = r.tabs;
        const row = dash.clients.find(c => c.id === id); if (row) { row.niche_key = r.niche_key; row.niche = r.niche_label; }
        toast(`${byId.get(id).name} allocated to ${r.niche_label}`); draw();
      } catch (err) { toast(`Not allocated: ${err.message}`, 'bad'); }
    };
    if (e.target.closest('[data-alloc]')) return allocate(e.target.closest('[data-alloc]').dataset.alloc);
    if (e.target.closest('[data-alloc-pick]')) return allocate(box.querySelector('[data-pick]').value);
    if (e.target.closest('[data-archive]')) {
      if (!(await confirm({ title: `Archive ${byId.get(id).name}?`, text: 'It stays in the database and can be unarchived from the archived list.', ok: 'Archive' }))) return;
      try { await api(`/api/clients/${id}/archive`, { method: 'POST' }); byId.get(id).archived_at = new Date().toISOString(); const row = dash.clients.find(c => c.id === id); if (row) row.archived = true; toast('Archived'); draw(); }
      catch (err) { toast(err.message, 'bad'); }
    }
  });
  draw();
}
