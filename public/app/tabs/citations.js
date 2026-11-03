// Citations tab (3 Nov 2026): the client's directory listings, the WEBRIS Directory Listing
// Manager look inside Copybot's shell. The header card (name, website, phone, address, the
// locations, the listings email, Scan directories), the stat tiles, the NAP issues banner,
// the filters, one table per tier with a count badge, and per row: Listed?, the listing URL
// (inline), NAP OK? with Verify, the status pill, the status action, done by, the 1Password
// item name, last scanned, Scan and Edit. Reads and writes /api/clients/:id/citations/*.

import { h, attr, api, card, pill, tag, toast, confirm, dialog, busy, info, copyBtn, wire, fmtDate, relTime, empty } from '../ui.js';

const TIER_KIND = { uk_core: 'accent', uk_secondary: 'run', location: 'wait', trade_niche: 'ok' };
const COST = { free: 'Free', paid: 'Paid', membership: 'Membership' };
const DONE = { va: 'VA', client: 'Client', client_decision: 'Client decision' };
const STATUS_KIND = { live: 'ok', wrong_location: 'block', needs_fixing: 'wait', waiting_on_client: 'wait', client_declined: 'none', submitted: 'run', awaiting_email: 'run', awaiting_approval: 'run', not_started: 'none' };
const opts = (list, cur, labels = {}) => list.map(v => `<option value="${attr(v)}"${v === cur ? ' selected' : ''}>${h(labels[v] || v)}</option>`).join('');

export async function render(el, ctx) {
  const { clientId } = ctx;
  const base = `/api/clients/${clientId}/citations`;
  let d = null, timer = null;
  const state = { tier: '', status: '', done_by: '' };
  const load = async () => { try { d = await api(base); } catch (e) { d = { error: e.message }; } draw(); clearTimeout(timer); if (d && d.scan && d.scan.running) timer = setTimeout(load, 4000); };
  const put = async (directoryId, body) => { d = await api(`${base}/rows/${encodeURIComponent(directoryId)}`, { method: 'PUT', body }); draw(); };

  const statusLabel = s => (d.options.statuses.find(([k]) => k === s) || [s, s])[1];
  const listedCell = r => r.row.listed === 'yes' ? pill('ok', d.location.count > 1 ? `${1} of ${d.location.count} loc` : 'Yes') : r.row.listed === 'no' ? pill('wait', 'Not found') : '<span class="muted small">Unchecked</span>';
  const napCell = r => {
    const s = r.row.nap_status;
    const main = s === 'match' ? pill('ok', 'Yes') : s === 'mismatch' ? `<span class="tip" data-tip="${attr((r.row.nap_diffs || []).map(x => `${x.field}: ${x.found || '(nothing)'} vs ${x.expected || '(blank)'}`).join('\n'))}">${pill('block', 'Mismatch')}</span>` : s === 'needs_review' ? pill('wait', 'Needs review') : '<span class="muted small">Unchecked</span>';
    return `${main} <a href="#" class="small" data-verify="${attr(r.directory.id)}">Verify</a>`;
  };
  const statusCell = r => {
    const s = r.row.status;
    if (s === 'not_started' && r.row.listed === 'no') return pill('wait', 'Not found');
    return pill(STATUS_KIND[s] || 'none', statusLabel(s));
  };
  const urlCell = r => `<span class="url-edit" data-url="${attr(r.directory.id)}">${r.row.live_url ? `<a href="${attr(r.row.live_url)}" target="_blank" rel="noopener" title="${attr(r.row.live_url)}">${h(r.row.live_url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 28))}${r.row.live_url.replace(/^https?:\/\/(www\.)?/, '').length > 28 ? '…' : ''}</a>${r.row.live_url_source === 'onboarding' ? ` ${tag('', 'from onboarding')}` : ''}` : '<span class="muted">–</span>'} <button class="btn btn-ghost btn-xs" data-edit-url="${attr(r.directory.id)}" title="Edit the listing URL">✎</button></span>`;

  const rowHtml = r => {
    const dir = r.directory, row = r.row;
    return `<tr data-row="${attr(dir.id)}">
      <td class="no-label" data-label="Directory"><span class="primary">${dir.url && !dir.url.includes('<') ? `<a href="${attr(dir.url)}" target="_blank" rel="noopener">${h(dir.name)}</a>` : h(dir.name)}</span> ${tag(TIER_KIND[dir.tier], d.tiers.find(t => t.tier === dir.tier).label)} ${tag('', COST[dir.cost])}${dir.needs_live_check ? ` ${tag('wait', 'live check')}` : ''}<span class="sub">${h(dir.priority)} · ${h(dir.type || '')}${dir.da != null ? ` · DA ${dir.da}` : ''} · ${h(dir.verification_method)}${dir.notes ? ` ${info(dir.notes)}` : ''}</span></td>
      <td data-label="Listed?">${listedCell(r)}</td>
      <td data-label="Listing URL">${urlCell(r)}</td>
      <td data-label="NAP OK?">${napCell(r)}</td>
      <td data-label="Status">${statusCell(r)}</td>
      <td data-label="Action"><select class="input" style="width:auto;padding:3px 6px;font-size:12px" data-status="${attr(dir.id)}"><option value="">Set status…</option>${opts(d.options.statuses.map(([k]) => k), '', Object.fromEntries(d.options.statuses))}</select></td>
      <td data-label="Done by"><select class="input" style="width:auto;padding:3px 6px;font-size:12px" data-done="${attr(dir.id)}">${opts(['va', 'client', 'client_decision'], row.done_by_effective, DONE)}</select>${row.done_by ? '' : '<span class="sub">directory default</span>'}</td>
      <td data-label="1Password"><input class="input" style="width:150px;padding:3px 6px;font-size:12px" data-op="${attr(dir.id)}" value="${attr(row.onepassword_item)}" placeholder="${attr(`${d.client.name} — ${dir.name}`)}"></td>
      <td data-label="Last scanned" class="small muted">${row.last_scanned_at ? `<span class="tip" data-tip="${attr(fmtDate(row.last_scanned_at, true))}">${h(relTime(row.last_scanned_at))}</span>` : '–'}</td>
      <td class="right no-label"><button class="btn btn-ghost btn-xs" data-scan-row="${attr(dir.id)}">Scan</button> <button class="btn btn-ghost btn-xs" data-edit="${attr(dir.id)}">Edit</button></td>
    </tr>`;
  };

  const tileHtml = (label, value, foot, { bar = null, kind = '' } = {}) => `<div class="tile"><div class="label">${h(label)}</div><div class="num" style="${kind === 'bad' ? 'color:var(--block)' : kind === 'warn' ? 'color:var(--wait)' : ''}">${h(value)}${bar !== null ? `<span style="display:inline-block;vertical-align:middle;margin-left:10px;width:90px;height:7px;border-radius:4px;background:var(--none-soft);overflow:hidden"><span style="display:block;height:100%;width:${Math.max(0, Math.min(100, bar))}%;background:${bar >= 70 ? 'var(--accent)' : bar >= 35 ? 'var(--wait)' : 'var(--block)'}"></span></span>` : ''}</div><div class="foot">${h(foot)}</div></div>`;

  const draw = () => {
    if (!d) return;
    if (d.error) { el.innerHTML = `<div class="card">${empty({ title: 'The citations could not load', text: d.error, action: '<button class="btn btn-ghost" data-act="reload">Retry</button>' })}</div>`; return; }
    const S = d.stats, n = d.nap;
    const filtered = rows => rows.filter(r => (!state.status || r.row.status === state.status) && (!state.done_by || r.row.done_by_effective === state.done_by));
    const header = `
      <div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr));gap:16px 24px">
        <div><div class="small muted">Website</div>${n.website ? `<a href="${attr(n.website)}" target="_blank" rel="noopener">${h(n.website)}</a>` : '<span class="muted">no site URL saved</span>'}</div>
        <div><div class="small muted">Phone</div>${h(n.phone || '(blank)')}</div>
        <div><div class="small muted">Address</div>${n.address ? h(n.address) : `<span class="muted">service area business, address hidden</span>`}</div>
        <div><div class="small muted">Listings email</div><span style="display:flex;gap:6px;align-items:center">${h(d.email)} ${copyBtn(d.email)}</span></div>
      </div>
      <div class="small" style="margin-top:12px"><span class="muted">All locations:</span> ${h(d.location.label)}${d.base_town ? ` (${h(d.base_town)}, base)` : ''}${d.territory.approved ? d.territory.towns.filter(t => t !== d.base_town).map(t => ` · ${h(t)}`).join('') : ' · <span class="muted">other towns once the locations are approved</span>'}</div>
      ${d.territory.approved ? `<div class="small muted" style="margin-top:4px">Councils ${h(d.territory.councils.join(', ') || 'none found')} · counties ${h(d.territory.counties.join(', ') || 'none found')}</div>` : ''}
      ${!n.name || !n.phone ? `<div class="notice warn" style="margin-top:10px">The master NAP record is missing ${[!n.name ? 'the business name' : '', !n.phone ? 'the phone' : ''].filter(Boolean).join(' and ')}: fill in the client values first. Every listing must match it character for character.</div>` : ''}`;
    const scanBar = d.scan ? (d.scan.running ? `<div class="notice" style="margin-bottom:14px">Scanning… ${d.scan.rows_done} of ${d.scan.rows_total} directories, ${d.scan.found} found so far, $${Number(d.scan.cost_usd || 0).toFixed(3)} spent.</div>` : d.scan.finished_at ? `<div class="small muted" style="margin-bottom:14px">Last scan ${h(fmtDate(d.scan.finished_at, true))}: ${d.scan.rows_done} directories, ${d.scan.found} found, $${Number(d.scan.cost_usd || 0).toFixed(3)} in DataForSEO calls${d.scan.error ? ` · <span style="color:#b91c1c">${h(d.scan.error)}</span>` : ''}</div>` : '') : '';
    el.innerHTML = `
      ${card({ title: h(n.name || d.client.name), sub: 'The master NAP record from the client values (the same record as the GBP tab)', actions: `<div class="btn-row"><button class="btn btn-ghost btn-sm" data-act="gaps">Find gaps</button><button class="btn btn-primary" data-act="scan" ${d.scan && d.scan.running ? 'disabled' : ''}>${d.scan && d.scan.running ? 'Scanning…' : 'Scan directories'}</button></div>`, body: header })}
      <div style="height:16px"></div>
      ${scanBar}
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:16px">
        ${tileHtml('Core completion', `${S.core.pct}%`, `${S.core.done} of ${S.core.of} UK Core listed`, { bar: S.core.pct })}
        ${tileHtml('Overall completion', `${S.overall.pct}%`, `${S.overall.done} of ${S.overall.of} listed`, { bar: S.overall.pct })}
        ${tileHtml('Wrong location', String(S.wrong_location), S.wrong_location ? 'listings in the wrong town' : 'none found', { kind: S.wrong_location ? 'bad' : '' })}
        ${tileHtml('NAP status', String(S.nap.mismatch), `${S.nap.mismatch} mismatch, ${S.nap.unchecked} unchecked`, { kind: S.nap.mismatch ? 'bad' : '' })}
        ${tileHtml('Low confidence', String(S.needs_review), 'needs review', { kind: S.needs_review ? 'warn' : '' })}
        ${tileHtml('Waiting on client', String(S.waiting_on_client), S.waiting_on_client ? 'rows the client must act on' : 'nothing with the client', { kind: S.waiting_on_client ? 'warn' : '' })}
      </div>
      ${S.banner.length ? `<div class="notice bad" style="margin-bottom:16px"><strong>NAP issues: ${S.banner.length} mismatch${S.banner.length === 1 ? '' : 'es'}</strong><ul style="margin:6px 0 0 18px">${S.banner.map(b => `<li>${tag('block', 'mismatch')} <strong>${h(b.directory)}</strong>: ${h(b.lines.join('; ') || 'NAP mismatch')}</li>`).join('')}</ul></div>` : ''}
      ${d.gaps && d.gaps.gaps ? gapsHtml(d.gaps) : ''}
      <div class="btn-row" style="margin-bottom:14px">
        <select class="input" style="width:auto" data-f="tier"><option value="">All directories</option>${d.tiers.map(t => `<option value="${t.tier}"${state.tier === t.tier ? ' selected' : ''}>${h(t.label)} (${t.count})</option>`).join('')}</select>
        <select class="input" style="width:auto" data-f="status"><option value="">All statuses</option>${opts(d.options.statuses.map(([k]) => k), state.status, Object.fromEntries(d.options.statuses))}</select>
        <select class="input" style="width:auto" data-f="done_by"><option value="">All actions (done by)</option>${opts(['va', 'client', 'client_decision'], state.done_by, DONE)}</select>
        ${d.service_area ? `<span class="small muted">${info('Service area business: directories that need a shopfront (Apple Business Connect, TomTom, HERE) are hidden.')} shopfront only directories hidden</span>` : ''}
      </div>
      ${d.tiers.filter(t => !state.tier || t.tier === state.tier).map(t => {
        const rows = filtered(t.rows);
        return `<section class="card card-flat" style="margin-bottom:16px"><div class="tbl-tools"><strong>${h(t.label)}</strong><span class="pill ${t.count && t.listed === t.count ? 'ok' : ''}">${t.listed}/${t.count}</span>${t.waiting ? `<span class="muted small">${h(t.waiting)}</span>` : ''}<span class="spacer"></span></div>
          ${t.count ? `<div class="tbl-wrap"><table class="tbl cards"><thead><tr><th>Directory</th><th>Listed?</th><th>Listing URL</th><th>NAP OK?</th><th>Status</th><th>Action</th><th>Done by</th><th>1Password item</th><th>Last scanned</th><th></th></tr></thead><tbody>${rows.length ? rows.map(rowHtml).join('') : `<tr><td colspan="10" class="no-label"><div class="state">No row matches the filters.</div></td></tr>`}</tbody></table></div>` : `<div class="state">${h(t.waiting ? (t.waiting === 'approve the locations first' ? 'Approve the locations first: the location directories come from the approved town list.' : t.waiting) : 'No directories in this tier for this client.')}</div>`}</section>`;
      }).join('')}`;
    el.querySelectorAll('[data-f]').forEach(s => s.addEventListener('change', () => { state[s.dataset.f] = s.value; draw(); }));
  };

  const gapsHtml = g => `<section class="card" style="margin-bottom:16px"><div class="card-head"><h2>Competitor gaps</h2><span class="sub">${h(g.competitors.length)} competitors for "${h(g.keyword)}" · ${h(fmtDate(g.at, true))} · $${Number(g.cost_usd || 0).toFixed(3)} DataForSEO${g.model_cost_usd ? ` + $${Number(g.model_cost_usd).toFixed(3)} model` : ''}</span></div>
    <div class="small muted" style="margin-bottom:8px">${g.competitors.map(c => h(c.name) + (c.website ? ` (${h(c.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))})` : '')).join(' · ')}</div>
    ${g.gaps.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Directory</th><th>Have it</th><th>DA</th><th>Cost</th><th>In the database</th><th></th></tr></thead><tbody>${g.gaps.map(x => `<tr><td><span class="primary">${h(x.name || x.domain)}</span><span class="sub">${h(x.domain)}${x.example_url ? ` · <a href="${attr(x.example_url)}" target="_blank" rel="noopener">example</a>` : ''}</span></td><td>${x.competitors_with} of ${g.competitors.length}</td><td>${x.da == null ? '–' : h(x.da)}</td><td>${h(x.cost ? COST[x.cost] || x.cost : 'unknown')}</td><td>${x.directory_id ? pill('ok', 'yes') : pill('none', 'new')}</td><td class="right">${x.directory_id ? '' : `<button class="btn btn-ghost btn-xs" data-add-gap="${attr(x.domain)}">Add to database</button>`}</td></tr>`).join('')}</tbody></table></div>` : '<div class="muted">The client already has every directory the competitors have.</div>'}
    ${g.dropped && g.dropped.length ? `<details class="small" style="margin-top:8px"><summary>${g.dropped.length} domains dropped (not UK, spam, or not a directory)</summary><div class="muted" style="margin-top:4px">${g.dropped.map(x => `${h(x.domain)} (${h(x.reason)})`).join(' · ')}</div></details>` : ''}</section>`;

  // Edit one row: everything on it
  const editRow = r => {
    const dir = r.directory, row = r.row;
    const dl = dialog({ title: `${dir.name}`, wide: true, body: `
      <div class="small muted" style="margin-bottom:10px">${h(dir.type || '')} · ${h(dir.priority)} · ${h(COST[dir.cost])}${dir.cost_text ? ` (${h(dir.cost_text)})` : ''} · verification ${h(dir.verification_method)} · ${dir.url && !dir.url.includes('<') ? `<a href="${attr(dir.url)}" target="_blank" rel="noopener">add or claim page</a>` : h(dir.url || 'no URL')}${dir.notes ? `<br>${h(dir.notes)}` : ''}</div>
      <div class="grid grid-2">
        <div class="field"><label>Listed?</label><select class="input" name="listed">${opts(['unchecked', 'yes', 'no'], row.listed, { unchecked: 'Unchecked', yes: 'Yes', no: 'No' })}</select></div>
        <div class="field"><label>Listing URL</label><input class="input" name="live_url" value="${attr(row.live_url)}" placeholder="https://"></div>
        <div class="field"><label>NAP OK?</label><select class="input" name="nap_status">${opts(['unchecked', 'match', 'mismatch', 'needs_review'], row.nap_status, { unchecked: 'Unchecked', match: 'Match', mismatch: 'Mismatch', needs_review: 'Needs review' })}</select></div>
        <div class="field"><label>Status</label><select class="input" name="status">${opts(d.options.statuses.map(([k]) => k), row.status, Object.fromEntries(d.options.statuses))}</select></div>
        <div class="field"><label>Done by</label><select class="input" name="done_by"><option value="">Directory default (${h(DONE[dir.done_by])})</option>${opts(['va', 'client', 'client_decision'], row.done_by || '', DONE)}</select></div>
        <div class="field"><label>1Password item name</label><input class="input" name="onepassword_item" value="${attr(row.onepassword_item)}" placeholder="${attr(`${d.client.name} — ${dir.name}`)}"></div>
        <div class="field"><label>Login email</label><input class="input" name="login_email" value="${attr(row.login_email)}" placeholder="${attr(d.email)}"></div>
      </div>
      ${row.nap_diffs && row.nap_diffs.length ? `<div class="notice bad" style="margin-bottom:12px"><strong>NAP differences</strong><ul style="margin:4px 0 0 18px">${row.nap_diffs.map(x => `<li>${h(x.field)}: listing shows "${h(x.found || '')}", expected "${h(x.expected || '')}"</li>`).join('')}</ul></div>` : ''}
      ${row.scan ? `<details class="small" style="margin-bottom:12px"><summary>Last scan: ${h(row.scan.how || '')}${row.scan.confidence ? `, confidence ${h(row.scan.confidence)}` : ''}</summary><pre class="block" style="margin-top:6px">${h(JSON.stringify(row.scan, null, 2))}</pre></details>` : ''}
      <div class="field"><label>Notes</label><textarea class="input" name="notes" rows="3">${h(row.notes)}</textarea></div>
      <div class="btn-row"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="save">Save</button></div>` });
    dl.el.querySelector('#save').addEventListener('click', async e => {
      const v = n => dl.el.querySelector(`[name=${n}]`).value.trim();
      try { await busy(e.target, 'Saving…', () => put(dir.id, { listed: v('listed'), live_url: v('live_url'), nap_status: v('nap_status'), status: v('status'), done_by: v('done_by'), onepassword_item: v('onepassword_item'), login_email: v('login_email'), notes: v('notes') })); toast('Saved'); dl.close(); } catch (err) { toast(err.message, 'bad'); }
    });
  };
  const findRow = id => d.tiers.flatMap(t => t.rows).find(r => r.directory.id === id);

  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-act], [data-edit], [data-edit-url], [data-verify], [data-scan-row], [data-add-gap]'); if (!b) return;
    try {
      if (b.dataset.act === 'reload') return load();
      if (b.dataset.act === 'scan') { if (!(await confirm({ title: 'Scan every directory for this client?', text: 'One DataForSEO search per directory (two when the name finds nothing), one backlinks call, and a fetch of each listing found. A few cents per scan; the cost is logged.', ok: 'Scan' }))) return; d.scan = { running: true, rows_done: 0, rows_total: 0, found: 0, cost_usd: 0 }; draw(); api(`${base}/scan`, { method: 'POST', body: {} }).then(r => { d = r; draw(); if (d.scan && d.scan.running) timer = setTimeout(load, 4000); }).catch(err => { toast(err.message, 'bad'); load(); }); return; }
      if (b.dataset.act === 'gaps') { if (!(await confirm({ title: 'Find the competitor gaps?', text: 'The top three map pack competitors for the primary keyword in the base town, their referring domains from DataForSEO, filtered to UK directories (known domains first, then a cheap model call). A few cents; logged.', ok: 'Find gaps' }))) return; return busy(b, 'Finding…', async () => { d = await api(`${base}/gaps`, { method: 'POST', body: {} }); draw(); }); }
      if (b.dataset.edit) return editRow(findRow(b.dataset.edit));
      if (b.dataset.editUrl !== undefined) { const r = findRow(b.dataset.editUrl); const v = prompt(`Listing URL on ${r.directory.name}:`, r.row.live_url || ''); if (v === null) return; await put(r.directory.id, { live_url: v.trim(), ...(v.trim() ? { listed: 'yes' } : {}) }); toast('Saved'); return; }
      if (b.dataset.verify !== undefined) { e.preventDefault(); const r = findRow(b.dataset.verify); if (!r.row.live_url) { toast('Add the listing URL first, then Verify checks its NAP', 'bad'); return; } return busy(b, 'Checking…', async () => { d = await api(`${base}/scan`, { method: 'POST', body: { directory_id: r.directory.id } }); draw(); }); }
      if (b.dataset.scanRow !== undefined) return busy(b, 'Scanning…', async () => { d = await api(`${base}/scan`, { method: 'POST', body: { directory_id: b.dataset.scanRow } }); draw(); });
      if (b.dataset.addGap !== undefined) {
        const gap = d.gaps.gaps.find(x => x.domain === b.dataset.addGap);
        const dl = dialog({ title: `Add ${gap.name || gap.domain} to the directory database`, body: `<div class="field"><label>Name</label><input class="input" name="name" value="${attr(gap.name || gap.domain)}"></div><div class="field"><label>URL</label><input class="input" name="url" value="${attr(gap.example_url || `https://${gap.domain}/`)}"></div><div class="grid grid-2"><div class="field"><label>Tier</label><select class="input" name="tier">${opts(['uk_secondary', 'uk_core', 'location', 'trade_niche'], 'uk_secondary', { uk_core: 'UK Core', uk_secondary: 'UK Secondary', location: 'Location', trade_niche: 'Trade / niche' })}</select></div><div class="field"><label>Priority</label><select class="input" name="priority">${opts(['P1', 'P2', 'P3'], 'P2')}</select></div></div><div class="btn-row"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="ok">Add</button></div>` });
        dl.el.querySelector('#ok').addEventListener('click', async ev => { const v = n => dl.el.querySelector(`[name=${n}]`).value.trim(); try { await busy(ev.target, 'Adding…', async () => { d = await api(`${base}/gaps/add`, { method: 'POST', body: { domain: gap.domain, name: v('name'), url: v('url'), tier: v('tier'), priority: v('priority') } }); draw(); }); toast('Added to the database'); dl.close(); } catch (err) { toast(err.message, 'bad'); } });
      }
    } catch (err) { toast(err.message, 'bad'); }
  });
  el.addEventListener('change', async e => {
    const s = e.target.closest('[data-status], [data-done], [data-op]'); if (!s) return;
    try {
      if (s.dataset.status !== undefined) { if (!s.value) return; await put(s.dataset.status, { status: s.value }); toast(`Status: ${statusLabel(s.value)}`); }
      else if (s.dataset.done !== undefined) { await put(s.dataset.done, { done_by: s.value }); toast('Saved'); }
      else if (s.dataset.op !== undefined) { await put(s.dataset.op, { onepassword_item: s.value }); toast('Saved'); }
    } catch (err) { toast(err.message, 'bad'); load(); }
  });
  wire(el);
  await load();
  return () => clearTimeout(timer);
}
