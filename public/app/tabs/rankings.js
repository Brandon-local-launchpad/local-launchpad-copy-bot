// Rankings tab (27 Oct 2026; Local Falcon 9 Nov 2026): the scan settings, the map with a month
// selector and before and after against the baseline, the Top 3% table, the monthly scans log,
// export PNG. Every run spends credits, so the baseline and reset ask first, showing the points
// paid for, the points kept and the credits; nothing runs on load. The monthly scans run by
// themselves (Copybot's daily job). Scans from another source (LeadSnap) are history, listed
// apart and never compared.

import { h, attr, api, card, toast, confirm, running, empty, fmtDate, pill, info, wire, busy } from '../ui.js';

const fmtTime = s => fmtDate(s, true);
// 1 to 3 green, 4 to 10 amber, 11 to 20 red, grey only for not found in the top 20
const rankClass = r => (r === null || r === undefined || r > 20 ? 'x' : r <= 3 ? 'g' : r <= 10 ? 'a' : 'r');
const rankColour = r => ({ g: '#16a34a', a: '#d97706', r: '#dc2626', x: '#9ca3af' })[rankClass(r)];
const rankLabel = r => (r === null || r === undefined ? '–' : r > 20 ? '20+' : String(r));
const LEGEND = '1 to 3 green · 4 to 10 amber · 11 to 20 red · grey: not found in the top 20';
const idOf = s => (s ? (s.scan_id !== undefined && s.scan_id !== null ? s.scan_id : s.heatmap_id) : null);
const SOURCE = { local_falcon: 'Local Falcon', leadsnap: 'LeadSnap' };
let leafletLoading = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve();
  if (leafletLoading) return leafletLoading;
  if (!document.querySelector('link[data-leaflet]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; l.dataset.leaflet = '1'; document.head.appendChild(l); }
  leafletLoading = new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; s.onload = resolve; s.onerror = () => reject(new Error('Leaflet did not load')); document.head.appendChild(s); });
  return leafletLoading;
}

export async function render(el, ctx) {
  const { clientId } = ctx;
  let gbp = null, timer = null;
  const mapState = {}, maps = {};
  const load = async () => { try { gbp = await api(`/api/clients/${clientId}/gbp`); } catch (e) { gbp = { error: e.message }; } draw(); schedule(); };
  const schedule = () => { clearTimeout(timer); if (gbp && gbp.scans && gbp.scans.pending) timer = setTimeout(refresh, 20000); };
  const refresh = async () => { try { gbp = await api(`/api/clients/${clientId}/gbp/scans/refresh`, { method: 'POST' }); draw(); } catch (_) {} schedule(); };
  const findScan = id => (gbp.scans.scans || []).find(s => String(idOf(s)) === String(id));

  const draw = () => {
    if (!gbp) return;
    if (gbp.error) { el.innerHTML = `<div class="card">${empty({ title: 'The rankings could not load', text: gbp.error })}</div>`; return; }
    const S = gbp.scans || {}, rd = gbp.readiness || {};
    const lf = (S.provider || rd.rank_provider) !== 'leadsnap';
    const src = SOURCE[S.provider || (lf ? 'local_falcon' : 'leadsnap')];
    const off = rd.scans_on === false;
    const noPlace = rd.ok !== false && rd.ownPlaceId === '';
    const offMsg = lf ? 'Local Falcon is not configured on the server (LOCALFALCON_API_KEY).' : 'LeadSnap is not configured on the server (LEADSNAP_API_TOKEN).';
    const hasBaseline = S.scans && S.scans.some(s => s.run_type === 'baseline');
    const st = S.settings;
    const lead = lf ? (gbp.rankCompetitors && gbp.rankCompetitors.leader) : (gbp.leadsnapCompetitors && gbp.leadsnapCompetitors.leader);
    for (const k of Object.keys(maps)) { try { maps[k].remove(); } catch (_) {} delete maps[k]; }

    const actions = `<div class="btn-row">
      ${hasBaseline ? `<button class="btn btn-ghost" data-act="fetch" ${off ? 'disabled' : ''}>Fetch latest scans</button><button class="btn btn-ghost btn-sm" data-act="reset" ${off ? 'disabled' : ''}>Reset baseline</button>` : `<button class="btn btn-primary" data-act="baseline" ${rd.ok === false || off || noPlace ? 'disabled' : ''}>Run baseline scan</button>${noPlace ? `<span class="small" style="color:#b45309">Place ID missing: confirm the Google listing on the <a href="/clients/${clientId}/record" data-link>Record tab</a> first</span>` : off ? `<span class="small" style="color:#b45309">${h(offMsg)}</span>` : rd.ok === false ? `<span class="small" style="color:#b45309">${h(rd.error || 'The client is not ready: see the GBP tab')}</span>` : ''}`}
      ${S.pending ? `<button class="btn btn-ghost btn-sm" data-act="refresh">Check ${S.pending} pending</button>` : ''}
    </div>`;
    const paid = st ? (st.points_paid || st.point_count || 169) : 0, kept = st ? (st.points_kept || st.point_count) : 0;
    const settingsBody = off ? `<div class="notice warn">${h(offMsg)}</div>` : !st ? empty({ title: 'No baseline yet', text: `The baseline scan locks the settings (keyword, area, grid) and starts the monthly scans. It spends ${src} credits, so it asks first.${S.previous_settings ? ` The earlier ${SOURCE[S.previous_settings.provider] || S.previous_settings.provider} settings (locked ${fmtDate(S.previous_settings.locked_at)}) are history.` : ''}` }) : `
      <dl class="kv">
        <dt>Keywords</dt><dd>${st.keywords.map(k => `${h(k.keyword)} <span class="muted small">(${h(k.kind)}, ${h(k.source)})</span>`).join('<br>')}</dd>
        <dt>Area</dt><dd>${h((st.scan_area || 'city').replace('_', ' '))}, ${st.spacing_m || st.grid_radius_m} m between points${st.radius_km ? `, ${st.radius_km} km radius` : ''}</dd>
        <dt>Grid</dt><dd>${lf ? `${paid} points paid for, ${kept} kept inside ${st.hull_towns} town${st.hull_towns > 1 ? 's' : ''} plus ${st.buffer_km} km` : `${st.point_count || st.grid_size * st.grid_size} of ${st.full_grid || 169} points${st.hull_towns ? `, clipped to ${st.hull_towns} town${st.hull_towns > 1 ? 's' : ''} plus ${st.buffer_km} km` : ''}`}</dd>
        <dt>Centre</dt><dd>${st.centre.lat.toFixed(4)}, ${st.centre.lng.toFixed(4)} from ${h(st.centre.from)}</dd>
        <dt>Cost</dt><dd>${st.credits_per_run} credits a run${lf && st.run_day ? ` · monthly on day ${st.run_day}, run by Copybot` : ''}</dd>
        <dt>Locked</dt><dd>${h(fmtDate(st.locked_at || st.built_at))}${S.superseded ? ` · ${S.superseded} earlier scan${S.superseded > 1 ? 's' : ''} kept as history` : ''}</dd>
      </dl>
      ${st.excluded_towns && st.excluded_towns.length ? `<div class="muted small" style="margin-top:6px">Left out of the map: ${st.excluded_towns.map(t => `${h(t.name)} (${h(t.reason)})`).join('; ')}</div>` : ''}
      ${lead ? `<div class="${lead.top3 !== null && (lead.top3 > 90 || lead.top3 < 40) ? 'notice warn' : 'muted small'}" style="margin-top:10px">${h(lead.line)}</div>` : ''}
      ${st.reset_from ? `<div class="muted small" style="margin-top:6px">Reset from the settings locked ${st.reset_from.locked_at ? h(fmtDate(st.reset_from.locked_at)) : 'earlier'} (${st.reset_from.keywords.map(h).join(', ')})</div>` : ''}
      ${st.warnings && st.warnings.length ? `<div class="notice warn" style="margin-top:8px">${st.warnings.map(h).join('<br>')}</div>` : ''}
      ${st.notes && st.notes.length ? `<div class="muted small" style="margin-top:6px">${st.notes.map(h).join('<br>')}</div>` : ''}`;

    // Maps: one per keyword with grid points (the kept points only)
    let mapsHtml = '';
    if (S.table && S.table.length) {
      const withPoints = S.table.filter(t => t.months.some(m => (findScan(idOf(m)) || {}).points));
      for (const t of withPoints) {
        const key = 'map_' + t.keyword.replace(/[^a-z0-9]+/gi, '_');
        const sel = mapState[key] || (mapState[key] = { month: t.months[t.months.length - 1].month, baseline: false });
        const current = t.months.find(m => m.month === sel.month) || t.months[t.months.length - 1];
        const shown = sel.baseline && t.baseline ? t.months.find(m => m.is_baseline) || current : current;
        const scan = findScan(idOf(shown));
        const link = scan && (scan.report_url || scan.share_url);
        mapsHtml += card({ title: h(t.keyword), sub: `${shown.is_baseline ? 'baseline' : h(shown.month)} · Top 3% ${shown.top_3_percentage}% · average ${shown.average}${scan && scan.points_kept ? ` · ${scan.points_kept} of ${scan.points_paid} points kept` : ''}`, actions: `
            <select class="input" style="width:auto;padding:4px 8px" data-month="${key}">${t.months.map(m => `<option value="${h(m.month)}" ${m.month === sel.month ? 'selected' : ''}>${h(m.month)}${m.is_baseline ? ' (baseline)' : ''}</option>`).join('')}</select>
            ${t.baseline && !current.is_baseline ? `<button class="btn btn-ghost btn-sm" data-toggle="${key}">${sel.baseline ? `Show ${h(current.month)}` : 'Show baseline'}</button>` : ''}
            <button class="btn btn-ghost btn-sm" data-export="${key}" data-keyword="${attr(t.keyword)}" data-label="${attr(shown.is_baseline ? 'baseline' : shown.month)}">Export PNG</button>
            ${link ? `<a class="btn btn-ghost btn-sm" href="${attr(link)}" target="_blank" rel="noopener">${scan.report_url ? 'Open report' : 'Open on LeadSnap'}</a>` : ''}`,
          body: `<div id="${key}" class="scanmap" data-scan="${attr(idOf(shown))}" style="height:420px;border-radius:8px;border:1px solid var(--border);background:#eef0f3"></div><div class="muted small" style="margin-top:6px">${LEGEND}</div>` });
      }
    }
    let tableHtml = '';
    if (S.table && S.table.length) {
      const months = [...new Set(S.table.flatMap(r => r.months.map(m => m.month)))].sort();
      tableHtml = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Keyword</th>${months.map(m => `<th>${h(m)}</th>`).join('')}</tr></thead><tbody>
        ${S.table.map(r => `<tr><td>${h(r.keyword)}</td>${months.map(m => { const x = r.months.find(y => y.month === m); if (!x) return '<td></td>'; return `<td><strong>${x.top_3_percentage}%</strong>${x.average !== null ? ` <span class="muted small">(${x.average})</span>` : ''} ${x.is_baseline ? pill('accent', 'baseline') : x.change !== null ? `<span class="small" style="color:${x.change < 0 ? '#b91c1c' : 'var(--muted)'}">${x.change > 0 ? '+' : ''}${x.change}</span>` : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    // The monthly scans: Copybot's own log (Local Falcon), or the LeadSnap schedules
    const claims = S.claims || [];
    const monthly = lf
      ? (claims.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Month</th><th>Keyword</th><th>Run</th><th>Status</th><th>Points paid</th><th>Kept</th><th>Credits</th><th>When</th></tr></thead><tbody>${claims.map(c => `<tr><td>${h(c.month)}</td><td>${h(c.keyword)}</td><td>${h(String(c.run_type).split(' ')[0])}</td><td>${h(c.status)}${c.error ? ` <span class="small" style="color:#b91c1c">${h(c.error)}</span>` : ''}</td><td>${c.points_paid ?? ''}</td><td>${c.points_kept ?? ''}</td><td>${c.credits ?? ''}</td><td>${h(fmtTime(c.created_at))}</td></tr>`).join('')}</tbody></table></div>` : empty({ title: 'No scans yet', text: 'The baseline starts the monthly scans: Copybot runs one a month per keyword on the run day, after checking the credit balance.' }))
      : (S.schedules && S.schedules.items.length ? S.schedules.items.map(i => `<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--border)"><span>${h(i.name)} <span class="muted small">${h(i.keyword || (i.keywords || []).join(', '))} · day ${h(i.repeat_on)} · ${h(i.status)}${i.schedule_id === null || i.schedule_id === undefined ? ' · no id from LeadSnap' : ''}</span></span><button class="btn btn-ghost btn-xs" data-schedule="${attr(i.schedule_id)}" data-sched-act="${i.status === 'paused' ? 'resume' : 'pause'}">${i.status === 'paused' ? 'Resume' : 'Pause'}</button></div>`).join('') : empty({ title: 'No monthly schedule yet', text: 'The baseline scan creates it.' }));
    // Old LeadSnap schedules still active while Local Falcon runs: pause them so they stop spending
    const oldActive = lf && S.schedules ? [...(S.schedules.items || []), ...(S.schedules.previous || []).flatMap(p => p.items || [])].filter(i => i.status !== 'paused') : [];
    const oldSched = oldActive.length ? `<div class="notice warn" style="margin-top:10px">${oldActive.length} LeadSnap schedule${oldActive.length > 1 ? 's are' : ' is'} still active from before the move: ${oldActive.map(i => `${h(i.name)} <button class="btn btn-ghost btn-xs" data-schedule="${attr(i.schedule_id)}" data-sched-act="pause">Pause</button>`).join(' ')}</div>` : '';
    const history = (S.history || []).filter(x => x.status === 'completed');
    const historyHtml = history.length ? card({ title: 'Earlier scans (history)', sub: 'Superseded or from another source: kept, never compared with the scans above', body: `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Source</th><th>Keyword</th><th>Month</th><th>Run</th><th>Top 3%</th><th>Average</th></tr></thead><tbody>${history.map(x => `<tr><td>${h(SOURCE[x.source] || x.source)}</td><td>${h(x.keyword)}</td><td>${h(x.month)}</td><td>${h(x.run_type)}</td><td>${x.top_3_percentage ?? ''}%</td><td>${x.average ?? ''}</td></tr>`).join('')}</tbody></table></div>` }) : '';
    const rankAlerts = S.rank_alerts || [];

    el.innerHTML = `
      ${rankAlerts.length ? `<div class="notice bad" style="margin-bottom:14px"><strong>Rank scans</strong><ul style="margin:4px 0 0 18px">${rankAlerts.map(a => `<li>${h(a.message)} <span class="muted small">${h(a.day)}</span> <button class="btn btn-ghost btn-xs" data-clear-alert="${attr(a.id)}">Clear</button></li>`).join('')}</ul></div>` : ''}
      ${(S.alerts || []).length ? `<div class="notice bad" style="margin-bottom:14px"><strong>Rank drop</strong><ul style="margin:4px 0 0 18px">${S.alerts.map(a => `<li>${h(a.line)} (${h(a.previous_month)} to ${h(a.month)})</li>`).join('')}</ul></div>` : ''}
      ${S.pending ? `<div style="margin-bottom:14px">${running({ now: `${S.pending} scan${S.pending > 1 ? 's are' : ' is'} still running on ${src}`, next: 'This tab checks again every 20 seconds; then the Top 3% is worked out and the map drawn' })}</div>` : ''}
      <div class="grid grid-2">
        ${card({ title: 'Scan settings', sub: `SOP 1.7 baseline and 5.2 monthly, through ${src}; locked after the baseline; every run spends credits`, actions, body: settingsBody })}
        ${card({ title: 'Top 3% by month against the baseline', sub: `Average rank in brackets (not found counts as 21); change from the month before. ${src} scans only`, body: tableHtml || empty({ title: 'No scans yet' }) })}
      </div>
      <div class="stack" style="margin-top:16px">${mapsHtml}</div>
      <div style="margin-top:16px">${card({ title: lf ? 'Monthly scans' : 'Monthly schedules', sub: lf ? 'Run by Copybot once a month per keyword, claimed before each scan so it never runs twice' : 'schedules.json', body: monthly + oldSched })}</div>
      ${historyHtml ? `<div style="margin-top:16px">${historyHtml}</div>` : ''}`;
    setTimeout(drawMaps, 0);
  };

  async function drawMaps() {
    const els = [...el.querySelectorAll('.scanmap')];
    if (!els.length) return;
    try { await loadLeaflet(); } catch (e) { els.forEach(m => { m.textContent = e.message; }); return; }
    for (const m of els) {
      const scan = findScan(m.dataset.scan);
      if (!scan || !scan.points) continue;
      const pts = scan.points.filter(p => typeof p.lat === 'number' && typeof p.lng === 'number');
      const map = L.map(m, { zoomControl: true, attributionControl: true });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
      for (const p of pts) L.marker([p.lat, p.lng], { icon: L.divIcon({ className: '', html: `<div style="width:26px;height:26px;border-radius:50%;background:${rankColour(p.rank)};color:${rankClass(p.rank) === 'x' ? '#fff' : '#111'};font:600 11px Inter,sans-serif;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,.9);box-shadow:0 1px 3px rgba(0,0,0,.3)">${rankLabel(p.rank)}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] }) }).addTo(map);
      if (pts.length) map.fitBounds(L.latLngBounds(pts.map(p => [p.lat, p.lng])).pad(0.08));
      maps[m.id] = map;
    }
  }

  // PNG export: the OpenStreetMap tiles under the grid, drawn on a canvas
  async function exportMap(key, keyword, label) {
    const m = el.querySelector('#' + key);
    const scan = findScan(m.dataset.scan);
    const pts = (scan && scan.points || []).filter(p => typeof p.lat === 'number' && typeof p.lng === 'number');
    if (!pts.length) return toast('No grid points to draw', 'bad');
    const W = 1000, Hh = 1000, T = 256;
    const lats = pts.map(p => p.lat), lngs = pts.map(p => p.lng);
    const bounds = { n: Math.max(...lats), s: Math.min(...lats), e: Math.max(...lngs), w: Math.min(...lngs) };
    const toWorld = (lat, lng, z) => { const n = 2 ** z; const x = (lng + 180) / 360 * n * T; const r = lat * Math.PI / 180; const y = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n * T; return { x, y }; };
    let z = 19;
    for (; z > 1; z--) { const a = toWorld(bounds.n, bounds.w, z), b = toWorld(bounds.s, bounds.e, z); if (b.x - a.x < W * 0.85 && b.y - a.y < Hh * 0.85) break; }
    const a = toWorld(bounds.n, bounds.w, z), b = toWorld(bounds.s, bounds.e, z);
    const ox = (a.x + b.x) / 2 - W / 2, oy = (a.y + b.y) / 2 - Hh / 2;
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = Hh;
    const c = canvas.getContext('2d'); c.fillStyle = '#e5e7eb'; c.fillRect(0, 0, W, Hh);
    const x0 = Math.floor(ox / T), x1 = Math.floor((ox + W) / T), y0 = Math.floor(oy / T), y1 = Math.floor((oy + Hh) / T);
    const loads = [];
    for (let tx = x0; tx <= x1; tx++) for (let ty = y0; ty <= y1; ty++) loads.push(new Promise(resolve => { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => { c.drawImage(img, tx * T - ox, ty * T - oy); resolve(); }; img.onerror = () => resolve(); img.src = `https://tile.openstreetmap.org/${z}/${tx}/${ty}.png`; }));
    await Promise.all(loads);
    for (const p of pts) {
      const w = toWorld(p.lat, p.lng, z); const x = w.x - ox, y = w.y - oy;
      c.beginPath(); c.arc(x, y, 15, 0, Math.PI * 2); c.fillStyle = rankColour(p.rank); c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.9)'; c.stroke();
      c.fillStyle = rankClass(p.rank) === 'x' ? '#fff' : '#111827'; c.font = '700 13px Inter, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(rankLabel(p.rank), x, y + 1);
    }
    c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(0, Hh - 48, W, 48);
    c.fillStyle = '#111827'; c.font = '600 16px Inter, system-ui, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText(`${keyword} · ${label} · Top 3% ${scan.top_3_percentage}% · average ${scan.average}`, 14, Hh - 30);
    c.font = '12px Inter, system-ui, sans-serif'; c.fillStyle = '#374151';
    c.fillText(`${LEGEND} · map © OpenStreetMap contributors`, 14, Hh - 12);
    try { canvas.toBlob(blob => { const a2 = document.createElement('a'); a2.href = URL.createObjectURL(blob); a2.download = `${keyword.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${label}.png`; a2.click(); setTimeout(() => URL.revokeObjectURL(a2.href), 2000); }); }
    catch (e) { toast(`The PNG could not be built (${e.message}); use the report link instead.`, 'bad'); }
  }

  // The confirm text: where the centre came from, the points paid and kept, the credits, the towns left out
  function confirmText(mode, data) {
    const s = data.settings, lf = data.provider !== 'leadsnap';
    const parts = [];
    if (mode === 'reset') parts.push(lf ? 'Every stored scan is kept but marked superseded, the lock is cleared and a new baseline runs on these settings.' : 'The current schedules are paused, every stored scan is kept but marked superseded, the lock is cleared and a new baseline runs on these settings.');
    if (s.warnings && s.warnings.length) parts.push('WARNING: ' + s.warnings.join(' WARNING: '));
    parts.push(`Keyword${s.keywords.length > 1 ? 's' : ''}: ${s.keywords.map(k => k.keyword).join(', ')}.`);
    parts.push(`Centre: ${s.centre.lat.toFixed(4)}, ${s.centre.lng.toFixed(4)}, from ${s.centre.from}.`);
    parts.push(`Area: ${(s.scan_area || 'city').replace('_', ' ')}, ${s.spacing_m} m between points${s.radius_km ? ` (${s.radius_km} km radius)` : ''}.`);
    if (lf) {
      parts.push(`Points: ${s.points_paid} paid for a keyword (the full ${s.grid_size} x ${s.grid_size} grid), ${s.points_kept} kept inside the ${s.hull_towns} service area town${s.hull_towns > 1 ? 's' : ''} plus ${s.buffer_km} km. Only the kept points are drawn and scored.`);
      if (s.excluded_towns && s.excluded_towns.length) parts.push(`Towns left out: ${s.excluded_towns.map(t => `${t.name} (${t.reason})`).join('; ')}.`);
      parts.push(`Place: ${s.place.name || s.place.google_place_id} (${s.place.google_place_id}), matched by place ID only${s.place.saved_on_local_falcon ? '' : '; it is saved to Local Falcon first'}.`);
      parts.push(`Credits: ${data.credits} now (${data.points_paid} points paid, ${data.points_kept} kept), and the same each month when Copybot runs the monthly scan on day ${Math.min(28, new Date().getDate())}.${data.balance && Number.isFinite(data.balance.credits) ? ` Balance: ${data.balance.credits} credits.` : data.balance && data.balance.error ? ` The balance could not be read (${data.balance.error}).` : ''}`);
    } else {
      parts.push(`Grid: ${s.grid_size} x ${s.grid_size}, clipped to the service area towns plus ${s.buffer_km} km: ${s.point_count} of ${s.full_grid} points.`);
      parts.push(`Place: ${s.place.name || s.place.google_place_id} (${s.place.how}).`);
      parts.push(`Credit cost: ${data.credits} credits now and the same each month from the schedule.`);
    }
    if (s.notes && s.notes.length) parts.push('Notes: ' + s.notes.join(' '));
    parts.push('The settings lock after this run.');
    return parts.join(' ');
  }

  async function baseline(mode, btn) {
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Working out the settings…';
    try {
      const data = await api(`/api/clients/${clientId}/gbp/scans/preview${mode === 'reset' ? '?fresh=1' : ''}`, { method: 'POST' });
      const s = data.settings;
      if (!(await confirm({ title: mode === 'reset' ? `Reset the baseline for ${s.client}?` : `Run the baseline scan for ${s.client}?`, text: confirmText(mode, data), ok: `Run it (${data.credits} credits)` }))) { btn.disabled = false; btn.textContent = label; return; }
      btn.textContent = 'Starting the scans…';
      gbp = await api(`/api/clients/${clientId}/gbp/scans/${mode === 'reset' ? 'reset' : 'baseline'}`, { method: 'POST', body: { confirm: true } });
      draw(); schedule();
    } catch (e) { toast(e.message, 'bad'); btn.disabled = false; btn.textContent = label; load(); }
  }

  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-act], [data-toggle], [data-export], [data-schedule], [data-clear-alert]'); if (!b) return;
    try {
      if (b.dataset.toggle) { mapState[b.dataset.toggle].baseline = !mapState[b.dataset.toggle].baseline; return draw(); }
      if (b.dataset.export) return exportMap(b.dataset.export, b.dataset.keyword, b.dataset.label);
      if (b.dataset.clearAlert) { await api(`/api/rank-scans/alerts/${encodeURIComponent(b.dataset.clearAlert)}/clear`, { method: 'POST' }); return load(); }
      if (b.dataset.schedule) { gbp = await api(`/api/clients/${clientId}/gbp/schedules/${encodeURIComponent(b.dataset.schedule)}/${b.dataset.schedAct}`, { method: 'POST' }); return draw(); }
      const act = b.dataset.act;
      if (act === 'baseline' || act === 'reset') return baseline(act, b);
      if (act === 'fetch') return busy(b, 'Fetching…', async () => { gbp = await api(`/api/clients/${clientId}/gbp/scans/fetch`, { method: 'POST' }); draw(); schedule(); });
      if (act === 'refresh') return refresh();
    } catch (err) { toast(err.message, 'bad'); }
  });
  el.addEventListener('change', e => { const s = e.target.closest('[data-month]'); if (s) { mapState[s.dataset.month] = { month: s.value, baseline: false }; draw(); } });
  wire(el);
  await load();
  return () => { clearTimeout(timer); for (const k of Object.keys(maps)) { try { maps[k].remove(); } catch (_) {} } };
}
