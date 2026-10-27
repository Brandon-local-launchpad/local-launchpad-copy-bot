// Research tab (27 Oct 2026): one row per town: date, neighbourhoods (with sourced detail),
// issues, symptoms, rules; Run per town and Run all missing; open a dossier to read it.
// Reads geo-location-status, the client's research context (towns, codes, module) and each
// dossier's summary. Polls while a run is on. Council areas are listed but never researched.

import { h, attr, api, card, table, status, pill, timeEl, running, toast, dialog, empty, markdownToHtml, busy, info } from '../ui.js';

export async function render(el, ctx) {
  const { clientId } = ctx;
  let timer = null, state = null, moduleName = null;

  const load = async () => {
    const [geo, rc, ds] = await Promise.all([api(`/api/clients/${clientId}/geo-location-status`), api(`/api/clients/${clientId}/research`), api(`/api/clients/${clientId}/dossiers`)]);
    moduleName = moduleName || rc.module;
    const locs = Object.values(geo.locations || {});
    const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const dossiers = ds.dossiers || [];
    const rows = rc.towns.map(t => {
      const loc = locs.find(l => (l.code && l.code === t.code) || norm(l.name) === norm(t.name)) || null;
      const dossier = dossiers.find(d => norm((d.metadata || d).location_name || d.locationName || '') === norm(t.name) || (loc && d.id === loc.assetId)) || null;
      return { ...t, loc, dossier, st: loc ? loc.status : dossier ? 'done' : 'none', assetId: (dossier && dossier.id) || (loc && loc.assetId) || null, at: (dossier && (dossier.uploaded_at || dossier.uploadedAt)) || (loc && loc.uploadedAt) || null };
    });
    // Dossiers not in the town list (an earlier page map) still show
    for (const d of dossiers) { const name = (d.metadata || d).location_name || d.locationName || d.filename; if (!rows.some(r => r.assetId === d.id)) rows.push({ name, code: '', runType: 'TOWN', adminArea: false, loc: null, dossier: d, st: 'done', assetId: d.id, at: d.uploaded_at || d.uploadedAt, extra: true }); }
    const summaries = await Promise.all(rows.map(r => r.assetId ? api(`/api/clients/${clientId}/dossiers/${r.assetId}/summary`).catch(() => null) : null));
    rows.forEach((r, i) => { r.sum = summaries[i]; });
    state = { rows, rc, geo };
    draw();
    clearTimeout(timer);
    if (rows.some(r => r.st === 'running' || r.st === 'pending')) timer = setTimeout(load, 10000);
  };

  const kind = r => r.st === 'done' ? 'ok' : r.st === 'running' ? 'run' : r.st === 'pending' ? 'run' : r.st === 'failed' || r.st === 'error' ? 'block' : 'none';
  const label = r => r.adminArea ? 'council area, not researched' : r.st === 'done' ? 'researched' : r.st === 'running' ? 'researching' : r.st === 'pending' ? 'queued' : r.st === 'failed' || r.st === 'error' ? 'failed' : 'not researched';

  const draw = () => {
    const { rows, rc } = state;
    const runningRows = rows.filter(r => r.st === 'running' || r.st === 'pending');
    const missing = rows.filter(r => !r.adminArea && !r.extra && r.st !== 'done' && r.st !== 'running' && r.st !== 'pending');
    const columns = [
      { key: 'name', label: 'Town', cls: 'no-label', render: r => `<span class="primary">${h(r.name)}</span><span class="sub">${r.runType === 'PRIMARY CITY' ? 'primary city' : 'town'}${r.code ? ` · ${h(r.code)}` : ''}</span>` },
      { key: 'st', label: 'Status', render: r => `${status(kind(r), label(r))}${r.loc && r.loc.error ? `<span class="sub" style="color:#b91c1c">${h(r.loc.error)}</span>` : r.loc && r.loc.statusDetail ? `<span class="sub">${h(r.loc.statusDetail)}</span>` : ''}` },
      { key: 'at', label: 'Date', render: r => timeEl(r.at) },
      { key: 'n', label: 'Neighbourhoods', num: true, render: r => r.sum ? `${r.sum.sourced}<span class="muted"> / ${r.sum.neighbourhoods}</span>` : '<span class="muted">–</span>' },
      { key: 'i', label: 'Issues', num: true, render: r => r.sum ? r.sum.issues : '<span class="muted">–</span>' },
      { key: 's', label: 'Symptoms', num: true, render: r => r.sum ? r.sum.symptoms : '<span class="muted">–</span>' },
      { key: 'r', label: 'Rules', num: true, render: r => r.sum ? r.sum.rules : '<span class="muted">–</span>' },
      { key: 'act', label: '', cls: 'right no-label', render: r => `${r.assetId ? `<button class="btn btn-ghost btn-sm" data-open="${attr(r.assetId)}" data-name="${attr(r.name)}">Open</button> <a class="btn btn-ghost btn-sm" href="/api/clients/${clientId}/dossiers/${attr(r.assetId)}/download">Download</a> ` : ''}${r.adminArea || r.extra ? '' : `<button class="btn btn-ghost btn-sm" data-run="${attr(r.name)}" ${runningRows.length ? 'disabled' : ''}>${r.st === 'done' ? 'Run again' : 'Run'}</button>`}` },
    ];
    const modSel = `<label class="small muted">Module <select class="input" id="module" style="width:auto;padding:4px 8px">${rc.modules.map(m => `<option value="${attr(m)}"${m === moduleName ? ' selected' : ''}>${h(m)}</option>`).join('')}${moduleName ? '' : '<option value="" selected>pick one…</option>'}</select></label>`;
    el.innerHTML = `
      ${runningRows.length ? `<div style="margin-bottom:14px">${running({ now: `Researching ${runningRows.find(r => r.st === 'running') ? runningRows.find(r => r.st === 'running').name : runningRows[0].name}`, next: runningRows.length > 1 ? `Then ${runningRows.filter(r => r.st === 'pending').map(r => r.name).join(', ')}` : 'Then the dossier is saved and the allocation pass runs for the primary city', done: rows.filter(r => r.st === 'done').length, total: rows.filter(r => !r.adminArea && !r.extra).length })}</div>` : ''}
      ${!rc.module ? `<div class="notice warn" style="margin-bottom:14px">No research module matches this client's niche by name. Pick the module to use below; it is remembered for this tab.</div>` : ''}
      <section class="card card-flat">
        <div class="tbl-tools"><strong>Towns</strong> ${info('One row per town in the page map (the primary city first). Neighbourhoods counts those with sourced detail over the total; the allocation pass only uses sourced ones.')}<span class="spacer"></span>${modSel}<button class="btn btn-primary btn-sm" data-run-missing ${runningRows.length || !missing.length ? 'disabled' : ''}>Run all missing (${missing.length})</button></div>
        ${table({ columns, rows, cards: true, emptyText: 'No towns yet: the page map gives the town list (the base town and the service areas).' })}
        <div class="tbl-foot">${rows.filter(r => r.st === 'done').length} of ${rows.filter(r => !r.adminArea).length} researched · each run calls Perplexity once per town</div>
      </section>`;
    el.querySelector('#module').addEventListener('change', e => { moduleName = e.target.value; });
  };

  const run = async towns => {
    if (!moduleName) return toast('Pick a research module first', 'bad');
    try { const r = await api(`/api/clients/${clientId}/research/run`, { method: 'POST', body: { towns, moduleName } }); toast(`Researching ${r.towns.join(', ')}`); setTimeout(load, 800); }
    catch (e) { toast(e.message, 'bad'); }
  };
  el.addEventListener('click', async e => {
    const o = e.target.closest('[data-open]');
    if (o) {
      const d = dialog({ title: `${o.dataset.name} dossier`, body: '<div class="skel" style="width:60%"></div>', wide: true });
      try { const r = await api(`/api/clients/${clientId}/dossiers/${o.dataset.open}`); const text = r.content || r.markdown || r.text || (typeof r === 'string' ? r : JSON.stringify(r, null, 2)); d.el.innerHTML = `<div class="copy" style="font-size:15px">${markdownToHtml(text)}</div>`; }
      catch (err) { d.el.innerHTML = `<div class="state failed"><h3>Could not open the dossier</h3><p>${h(err.message)}</p></div>`; }
      return;
    }
    const r = e.target.closest('[data-run]'); if (r) return run([r.dataset.run]);
    if (e.target.closest('[data-run-missing]')) return run(state.rows.filter(x => !x.adminArea && !x.extra && x.st !== 'done' && x.st !== 'running' && x.st !== 'pending').map(x => x.name));
  });
  await load();
  if (ctx.query.run === 'missing' && state) { const missing = state.rows.filter(x => !x.adminArea && !x.extra && x.st !== 'done' && x.st !== 'running' && x.st !== 'pending').map(x => x.name); if (missing.length) run(missing); else toast('Every town already has a dossier'); }
  return () => clearTimeout(timer);
}
