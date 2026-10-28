// Clients (27 Oct 2026): the dashboard's table full page, niche tabs, the archive toggle,
// and the Fillout clients still to allocate ("Is this client a X?") as a card at the top.

import { h, attr, api, card, table, pill, timeEl, toast, confirm, fmtDate, wire, busy } from '../ui.js';
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
      <div class="card card-flat" style="margin-top:${pending.length ? 16 : 0}px"><div id="tbl"></div></div>
      <details class="card" style="margin-top:16px" id="inbox"><summary style="cursor:pointer;font-weight:600">Fillout inbox <span class="muted small" style="font-weight:400">every submission, newest first; Reprocess rebuilds the record from the stored payload (hand edits are kept)</span></summary><div id="inboxBody" style="margin-top:12px"><div class="skel" style="width:50%"></div></div></details>`;
    root.querySelector('#inbox').addEventListener('toggle', e => { if (e.target.open) loadInbox(); }, { once: true });
    clientsTable(root.querySelector('#tbl'), { ...dash, tabs: list.tabs }, ctx, { title: 'All clients', nicheTabs: true, showArchiveToggle: true, filters: { needs: ctx.query.needs === '1', newOnly: ctx.query.new || '' } });
  };

  // The Fillout inbox (the old submissions page): every submission with its state and a Reprocess
  async function loadInbox() {
    const el = root.querySelector('#inboxBody'); if (!el) return;
    try {
      const { submissions } = await api('/api/fillout/submissions');
      if (!submissions.length) { el.innerHTML = '<div class="muted">No submissions yet. Point the Fillout webhook at /api/webhooks/fillout with the shared secret.</div>'; return; }
      const columns = [
        { key: 'businessName', label: 'Business', cls: 'no-label', render: s => `<span class="primary">${s.clientId ? `<a href="/clients/${h(s.clientId)}/record?view=form" data-link>${h(s.businessName || '(no business name)')}</a>` : h(s.businessName || '(no business name)')}</span><span class="sub">${h(s.submissionId)}${s.duplicateOf ? ` · <span class="pill wait">possible duplicate of ${h(s.duplicateOf.name || 'another client')}</span>` : ''}${s.audioFailed ? ` · <span class="pill wait">${s.audioFailed} audio download${s.audioFailed > 1 ? 's' : ''} to retry</span>` : ''}${s.niche && !s.nicheKnown ? ' · <span class="pill wait">no field map for this niche</span>' : ''}${s.archived ? ' · <span class="pill">archived</span>' : ''}</span>` },
        { key: 'niche', label: 'Niche', render: s => h(s.niche || '–') },
        { key: 'receivedAt', label: 'Received', render: s => timeEl(s.receivedAt) },
        { key: 'status', label: 'Status', render: s => `${pill(s.status === 'processed' ? 'ok' : s.status === 'error' ? 'block' : 'none', s.status)}${s.error ? `<span class="sub" style="color:#b91c1c" title="${attr(s.error)}">${h(s.error.split('\n')[0])}</span>` : ''}` },
        { key: 'completeness', label: 'Ready to build', render: s => s.completeness ? `${s.completeness.needed.filled} of ${s.completeness.needed.total}${s.completeness.chase && s.completeness.chase.total ? `<span class="sub">worth chasing ${s.completeness.chase.filled} of ${s.completeness.chase.total}</span>` : ''}` : '<span class="muted">–</span>' },
        { key: 'act', label: '', cls: 'right no-label', render: s => `${s.status !== 'rejected' ? `<button class="btn btn-ghost btn-sm" data-rerun="${h(s.id)}" title="Rebuild the client record from the stored submission. Fields typed in by hand are kept.">${s.status === 'error' || s.audioFailed || s.status === 'received' ? 'Re-run' : 'Reprocess'}</button>` : ''}${s.archived && s.clientId ? ` <button class="btn btn-ghost btn-sm" data-unarchive="${h(s.clientId)}">Unarchive</button>` : ''}` },
      ];
      el.innerHTML = table({ columns, rows: submissions, cards: true });
    } catch (e) { el.innerHTML = `<div class="notice bad">${h(e.message)}</div>`; }
  }
  root.addEventListener('click', async e => {
    const rr = e.target.closest('[data-rerun]');
    if (rr) { try { await busy(rr, 'Running…', () => api(`/api/fillout/submissions/${rr.dataset.rerun}/reprocess`, { method: 'POST' })); toast('Reprocessed'); } catch (err) { toast(`Re-run failed: ${err.message}`, 'bad'); } return loadInbox(); }
    const ua = e.target.closest('[data-unarchive]');
    if (ua) { try { await api(`/api/clients/${ua.dataset.unarchive}/unarchive`, { method: 'POST' }); toast('Unarchived'); } catch (err) { toast(err.message, 'bad'); } return loadInbox(); }
  });

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
