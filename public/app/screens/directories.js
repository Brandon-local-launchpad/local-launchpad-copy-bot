// Directories (3 Nov 2026): the citation directory database. Seeded from data/citations/
// (the UK Citations Master List, one CSV per tab); rows can be added, edited and retired
// here. A row edited here keeps its values when the seed files change; a reseed only
// updates rows nobody touched. The DA column is the DataForSEO domain rank.

import { h, attr, api, table, sortRows, pill, tag, toast, confirm, dialog, busy, info, wire, debounce, plural, fmtDate } from '../ui.js';

const TIER = { uk_core: 'UK Core', uk_secondary: 'UK Secondary', location: 'Location', trade_niche: 'Trade / niche' };
const TIER_KIND = { uk_core: 'accent', uk_secondary: 'run', location: 'wait', trade_niche: 'ok' };
const COST = { free: 'Free', paid: 'Paid', membership: 'Membership' };
const DONE = { va: 'VA', client: 'Client', client_decision: 'Client decision' };
const VERIFY = ['email', 'code', 'phone', 'postcard', 'none', 'unknown'];
const opts = (list, cur, labels = {}) => list.map(v => `<option value="${attr(v)}"${v === cur ? ' selected' : ''}>${h(labels[v] || v)}</option>`).join('');

export function appliesText(a, niches = []) {
  if (!a || a.kind === 'all') return 'every client';
  const nicheName = k => (niches.find(n => n.key === k) || {}).label || k;
  if (a.kind === 'niches') return (a.niches || []).map(nicheName).join(', ') || 'no niche';
  if (a.kind === 'not_niches') return `every niche except ${(a.niches || []).map(nicheName).join(', ')}`;
  if (a.kind === 'councils') return `councils: ${(a.councils || []).join(', ')}`;
  if (a.kind === 'towns') return `towns: ${(a.towns || []).join(', ')}`;
  if (a.kind === 'areas') return [a.counties && a.counties.length ? `counties: ${a.counties.join(', ')}` : '', a.towns && a.towns.length ? `towns: ${a.towns.join(', ')}` : ''].filter(Boolean).join('; ') || (a.text ? `area: ${a.text}` : 'no area yet');
  return JSON.stringify(a);
}

export async function render(root, params, ctx) {
  ctx.setTitle('Directories');
  let data = null;
  const state = { q: '', tier: '', cost: '', priority: '', done_by: '', retired: false, sort: { key: 'name', dir: 'asc' } };
  const load = async () => { data = await api('/api/citations/directories'); draw(); };

  const rows = () => {
    let list = data.directories.filter(d => state.retired ? true : !d.retired);
    if (state.q) { const q = state.q.toLowerCase(); list = list.filter(d => d.name.toLowerCase().includes(q) || d.domain.includes(q) || (d.type || '').toLowerCase().includes(q) || appliesText(d.applies_to, data.niches).toLowerCase().includes(q)); }
    for (const k of ['tier', 'cost', 'priority', 'done_by']) if (state[k]) list = list.filter(d => d[k] === state[k]);
    return sortRows(list, state.sort);
  };

  const columns = [
    { key: 'name', label: 'Directory', sortable: true, cls: 'no-label', render: d => `<span class="primary">${d.url && !d.url.includes('<') ? `<a href="${attr(d.url)}" target="_blank" rel="noopener">${h(d.name)}</a>` : h(d.name)}</span> ${tag(TIER_KIND[d.tier], TIER[d.tier])} ${tag('', COST[d.cost])}${d.retired ? ` ${tag('block', 'retired')}` : ''}${d.hand_edited ? ` ${tag('hand', 'edited')}` : ''}<span class="sub">${h(d.type || '')}${d.domain ? ` · ${h(d.domain)}` : d.url ? ` · ${h(d.url)}` : ' · no URL yet'}</span>` },
    { key: 'priority', label: 'Priority', sortable: true, render: d => pill(d.priority === 'P1' ? 'ok' : d.priority === 'P2' ? 'run' : 'none', d.priority) },
    { key: 'da', label: 'DA', sortable: true, num: true, render: d => d.da == null ? '<span class="muted">–</span>' : `<span class="tip" data-tip="${attr(`${d.da_source || ''} ${d.da_at ? fmtDate(d.da_at) : ''}`.trim())}">${d.da}</span>` },
    { key: 'verification_method', label: 'Verification', sortable: true, render: d => h(d.verification_method) },
    { key: 'done_by', label: 'Done by', sortable: true, render: d => h(DONE[d.done_by] || d.done_by) },
    { key: 'applies', label: 'Applies to', render: d => `<span class="small" title="${attr(appliesText(d.applies_to, data.niches))}">${h(appliesText(d.applies_to, data.niches).slice(0, 70))}${appliesText(d.applies_to, data.niches).length > 70 ? '…' : ''}</span>` },
    { key: 'flags', label: 'Flags', render: d => [d.skip_for_service_area ? tag('wait', 'skip for SAB') : '', d.needs_live_check ? tag('', 'live check') : ''].filter(Boolean).join(' ') },
    { key: 'act', label: '', cls: 'right no-label', render: d => `<button class="btn btn-ghost btn-xs" data-edit="${attr(d.id)}">Edit</button> ${d.retired ? `<button class="btn btn-ghost btn-xs" data-unretire="${attr(d.id)}">Unretire</button>` : `<button class="btn btn-ghost btn-xs" data-retire="${attr(d.id)}">Retire</button>`}` },
  ];

  const draw = () => {
    const list = rows();
    const c = data.counts, s = data.seed;
    const seedLine = s.version ? `Seeded ${h(fmtDate(s.seeded_at, true))} from ${s.rows} rows and ${s.places} places${s.version !== s.current ? ' · <strong>the seed files have changed: reseed to load them</strong>' : ''}${s.problems.length ? ` · ${s.problems.length} seed problem${s.problems.length === 1 ? '' : 's'}` : ''}` : 'Not seeded yet';
    root.innerHTML = `
      <div class="ph"><div class="ph-title"><h1>Directories</h1><div class="ph-meta"><span>${c.active} active · ${c.retired} retired · ${Object.entries(c.by_tier).map(([t, n]) => `${TIER[t] || t} ${n}`).join(' · ')}</span>${c.no_da ? `<span class="pill wait">${c.no_da} without DA</span>` : ''}</div></div>
        <div class="ph-actions"><button class="btn btn-primary btn-sm" id="add">Add directory</button><button class="btn btn-ghost btn-sm" id="fillDa" ${c.no_da ? '' : 'disabled'}>Fill DA (DataForSEO)</button><button class="btn btn-ghost btn-sm" id="reseed">Reseed from the CSVs</button></div></div>
      <div class="notice" style="margin-bottom:14px">${seedLine} ${info('The seed is data/citations/ (one CSV per tab of the UK Citations Master List) plus niche-map.json. A reseed updates rows nobody edited here; edited and hand added rows keep their values. DA is the DataForSEO domain rank (0 to 1000).')}${s.problems.length ? `<details class="small" style="margin-top:6px"><summary>Seed problems</summary><ul style="margin:4px 0 0 18px">${s.problems.map(p => `<li>${h(p.tab)}${p.name ? ` · ${h(p.name)}` : ''}: ${h(p.problem)}</li>`).join('')}</ul></details>` : ''}${s.skipped.length ? `<details class="small" style="margin-top:6px"><summary>${s.skipped.length} rows skipped or merged at seed</summary><ul style="margin:4px 0 0 18px">${s.skipped.map(p => `<li>${h(p.tab)} · ${h(p.name)}: ${h(p.reason)}</li>`).join('')}</ul></details>` : ''}</div>
      <section class="card card-flat">
        <div class="tbl-tools">
          <input class="input search" id="q" type="search" placeholder="Search name, domain, type, area" value="${attr(state.q)}" style="max-width:260px">
          <select class="input" style="width:auto" data-f="tier"><option value="">All tiers</option>${opts(Object.keys(TIER), state.tier, TIER)}</select>
          <select class="input" style="width:auto" data-f="priority"><option value="">All priorities</option>${opts(['P1', 'P2', 'P3'], state.priority)}</select>
          <select class="input" style="width:auto" data-f="cost"><option value="">All costs</option>${opts(Object.keys(COST), state.cost, COST)}</select>
          <select class="input" style="width:auto" data-f="done_by"><option value="">Done by anyone</option>${opts(Object.keys(DONE), state.done_by, DONE)}</select>
          <span class="spacer"></span>
          <label class="check small"><input type="checkbox" id="showRetired"${state.retired ? ' checked' : ''}> Show retired</label>
        </div>
        ${table({ columns, rows: list, cards: true, sort: state.sort, emptyText: 'No directory matches.' })}
        <div class="tbl-foot">${h(plural(list.length, 'directory', 'directories'))}</div>
      </section>`;
    root.querySelector('#q').addEventListener('input', debounce(e => { state.q = e.target.value; const pos = e.target.selectionStart; draw(); const q = root.querySelector('#q'); q.focus(); q.setSelectionRange(pos, pos); }, 150));
    root.querySelectorAll('[data-f]').forEach(s => s.addEventListener('change', () => { state[s.dataset.f] = s.value; draw(); }));
    root.querySelector('#showRetired').addEventListener('change', e => { state.retired = e.target.checked; draw(); });
    root.querySelector('#add').addEventListener('click', () => edit(null));
    root.querySelector('#reseed').addEventListener('click', async e => { if (!(await confirm({ title: 'Reseed the directory database?', text: 'Rows nobody edited here are updated from the CSVs; edited and hand added rows keep their values. Nothing is deleted.', ok: 'Reseed' }))) return; try { await busy(e.target, 'Reseeding…', async () => { const r = await api('/api/citations/directories/reseed', { method: 'POST' }); toast(`Seeded: ${r.result.inserted} added, ${r.result.updated} updated, ${r.result.kept} kept`); }); } catch (err) { toast(err.message, 'bad'); } load(); });
    root.querySelector('#fillDa').addEventListener('click', async e => { if (!(await confirm({ title: 'Fill the DA column from DataForSEO?', text: `One bulk rank call for the ${c.no_da} rows without a DA. Costs a few cents.`, ok: 'Fill DA' }))) return; try { await busy(e.target, 'Asking DataForSEO…', async () => { const r = await api('/api/citations/directories/fill-da', { method: 'POST' }); toast(r.result.skipped ? r.result.skipped : `DA filled for ${r.result.filled} of ${r.result.domains} domains ($${Number(r.result.cost || 0).toFixed(4)})`); }); } catch (err) { toast(err.message, 'bad'); } load(); });
  };

  // Add or edit one directory
  const edit = d => {
    const a = (d && d.applies_to) || { kind: 'all' };
    const listOf = k => (a[k] || []).join('\n');
    const dl = dialog({ title: d ? `Edit ${d.name}` : 'Add a directory', wide: true, body: `
      <div class="grid grid-2">
        <div class="field"><label>Name</label><input class="input" name="name" value="${attr(d ? d.name : '')}"></div>
        <div class="field"><label>URL (the add or claim page)</label><input class="input" name="url" value="${attr(d ? d.url : '')}" placeholder="https://"></div>
        <div class="field"><label>Tier</label><select class="input" name="tier">${opts(Object.keys(TIER), d ? d.tier : 'uk_secondary', TIER)}</select></div>
        <div class="field"><label>Type</label><input class="input" name="type" value="${attr(d ? d.type : '')}" placeholder="UK directory, Trade body, Council trader scheme…"></div>
        <div class="field"><label>Priority</label><select class="input" name="priority">${opts(['P1', 'P2', 'P3'], d ? d.priority : 'P2')}</select></div>
        <div class="field"><label>DA (DataForSEO domain rank)</label><input class="input" name="da" type="number" min="0" max="1000" value="${attr(d && d.da != null ? d.da : '')}"></div>
        <div class="field"><label>Cost</label><select class="input" name="cost">${opts(Object.keys(COST), d ? d.cost : 'free', COST)}</select></div>
        <div class="field"><label>Cost detail</label><input class="input" name="cost_text" value="${attr(d ? d.cost_text : '')}" placeholder="Free (paid upgrades)"></div>
        <div class="field"><label>Verification</label><select class="input" name="verification_method">${opts(VERIFY, d ? d.verification_method : 'unknown')}</select></div>
        <div class="field"><label>Done by</label><select class="input" name="done_by">${opts(Object.keys(DONE), d ? d.done_by : 'va', DONE)}</select></div>
        <div class="field"><label>Applies to</label><select class="input" name="applies_kind">${opts(['all', 'niches', 'not_niches', 'councils', 'towns', 'areas'], a.kind, { all: 'Every client', niches: 'These niches only', not_niches: 'Every niche except these', councils: 'Clients with a town in these councils', towns: 'Clients with these towns', areas: 'Clients in these counties or towns' })}</select></div>
        <div class="field" data-applies="niches not_niches"><label>Niches</label><select class="input" name="applies_niches" multiple size="6">${(data.niches || []).map(n => `<option value="${attr(n.key)}"${(a.niches || []).includes(n.key) ? ' selected' : ''}>${h(n.label)}</option>`).join('')}</select></div>
        <div class="field" data-applies="councils"><label>Councils, one per line</label><textarea class="input" name="applies_councils" rows="4">${h(listOf('councils'))}</textarea></div>
        <div class="field" data-applies="towns areas"><label>Towns, one per line</label><textarea class="input" name="applies_towns" rows="4">${h(listOf('towns'))}</textarea></div>
        <div class="field" data-applies="areas"><label>Counties, one per line</label><textarea class="input" name="applies_counties" rows="4">${h(listOf('counties'))}</textarea></div>
        <div class="field"><label class="check"><input type="checkbox" name="skip_for_service_area"${d && d.skip_for_service_area ? ' checked' : ''}> Skip for service area businesses (needs a shopfront)</label></div>
        <div class="field"><label class="check"><input type="checkbox" name="needs_live_check"${d && d.needs_live_check ? ' checked' : ''}> Needs a live check (the site or add route is unconfirmed)</label></div>
        <div class="field"><label>Email sender domains (the listings inbox matches these), one per line</label><textarea class="input" name="sender_domains" rows="2">${h((d && d.sender_domains || []).join('\n'))}</textarea></div>
        <div class="field"><label>Source</label><input class="input" name="source_url" value="${attr(d ? d.source_url : '')}"></div>
      </div>
      <div class="field"><label>Notes</label><textarea class="input" name="notes" rows="3">${h(d ? d.notes : '')}</textarea></div>
      ${d ? `<div class="small muted" style="margin-bottom:10px">Key ${h(d.key)} · from the ${h(d.source_tab || 'hand')} tab · ${d.seeded ? 'seeded' : 'added by hand'}${d.hand_edited ? ', edited here' : ''}${d.retired ? ` · retired: ${h(d.retired_reason || '')}` : ''}</div>` : ''}
      <div class="btn-row"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="save">${d ? 'Save' : 'Add'}</button></div>` });
    const f = dl.el;
    const showApplies = () => { const k = f.querySelector('[name=applies_kind]').value; f.querySelectorAll('[data-applies]').forEach(el => { el.style.display = el.dataset.applies.split(' ').includes(k) ? '' : 'none'; }); };
    f.querySelector('[name=applies_kind]').addEventListener('change', showApplies); showApplies();
    f.querySelector('#save').addEventListener('click', async e => {
      const v = n => f.querySelector(`[name=${n}]`).value.trim();
      const lines = n => v(n).split('\n').map(s => s.trim()).filter(Boolean);
      const kind = v('applies_kind');
      const applies = kind === 'all' ? { kind } : kind === 'niches' || kind === 'not_niches' ? { kind, niches: [...f.querySelector('[name=applies_niches]').selectedOptions].map(o => o.value) } : kind === 'councils' ? { kind, councils: lines('applies_councils') } : kind === 'towns' ? { kind, towns: lines('applies_towns') } : { kind, counties: lines('applies_counties'), towns: lines('applies_towns') };
      const body = { name: v('name'), url: v('url'), tier: v('tier'), type: v('type'), priority: v('priority'), da: v('da'), cost: v('cost'), cost_text: v('cost_text'), verification_method: v('verification_method'), done_by: v('done_by'), applies_to: applies, skip_for_service_area: f.querySelector('[name=skip_for_service_area]').checked, needs_live_check: f.querySelector('[name=needs_live_check]').checked, sender_domains: lines('sender_domains'), source_url: v('source_url'), notes: v('notes') };
      try { await busy(e.target, 'Saving…', () => api(d ? `/api/citations/directories/${d.id}` : '/api/citations/directories', { method: d ? 'PUT' : 'POST', body })); toast(d ? 'Saved' : 'Added'); dl.close(); load(); } catch (err) { toast(err.message, 'bad'); }
    });
  };

  root.addEventListener('click', async e => {
    const ed = e.target.closest('[data-edit]'); if (ed) return edit(data.directories.find(d => d.id === ed.dataset.edit));
    const rt = e.target.closest('[data-retire]');
    if (rt) { const d = data.directories.find(x => x.id === rt.dataset.retire); const reason = prompt(`Retire ${d.name}? Say why (shown on the row):`, ''); if (reason === null) return; try { await api(`/api/citations/directories/${d.id}/retire`, { method: 'POST', body: { reason } }); toast('Retired'); load(); } catch (err) { toast(err.message, 'bad'); } return; }
    const ur = e.target.closest('[data-unretire]');
    if (ur) { try { await api(`/api/citations/directories/${ur.dataset.unretire}/unretire`, { method: 'POST' }); toast('Back in use'); load(); } catch (err) { toast(err.message, 'bad'); } }
  });
  wire(root, { onSort: key => { state.sort = state.sort.key === key ? { key, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }; draw(); } });
  await load();
}
