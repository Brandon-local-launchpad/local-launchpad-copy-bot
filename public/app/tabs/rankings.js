// Rankings tab (27 Oct 2026): the scan settings, the map with a month selector and before
// and after against the baseline, the Top 3% table, the schedules, export PNG. Every run
// spends LeadSnap credits, so the baseline and reset ask first; nothing runs on load.
// Behaviour as the old client page's rank scans section.

import { h, attr, api, card, toast, confirm, running, empty, fmtDate, pill, info, wire, busy } from '../ui.js';

const fmtTime = s => fmtDate(s, true);
const rankClass = r => (r === null || r === undefined || r >= 20 ? 'x' : r <= 3 ? 'g' : r <= 10 ? 'a' : 'r');
const rankColour = r => ({ g: '#16a34a', a: '#d97706', r: '#dc2626', x: '#9ca3af' })[rankClass(r)];
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

  const draw = () => {
    if (!gbp) return;
    if (gbp.error) { el.innerHTML = `<div class="card">${empty({ title: 'The rankings could not load', text: gbp.error })}</div>`; return; }
    const S = gbp.scans, rd = gbp.readiness || {}, lsOff = rd.leadsnap === false;
    const hasBaseline = S && S.scans && S.scans.some(s => s.run_type === 'baseline');
    const st = S && S.settings;
    const lead = gbp.leadsnapCompetitors && gbp.leadsnapCompetitors.leader;
    for (const k of Object.keys(maps)) { try { maps[k].remove(); } catch (_) {} delete maps[k]; }

    const actions = `<div class="btn-row">
      ${hasBaseline ? `<button class="btn btn-ghost" data-act="fetch" ${lsOff ? 'disabled' : ''}>Fetch latest scans</button><button class="btn btn-ghost btn-sm" data-act="reset" ${lsOff ? 'disabled' : ''}>Reset baseline</button>` : `<button class="btn btn-primary" data-act="baseline" ${rd.ok === false || lsOff ? 'disabled' : ''}>Run baseline scan</button>`}
      ${S && S.pending ? `<button class="btn btn-ghost btn-sm" data-act="refresh">Check ${S.pending} pending</button>` : ''}
    </div>`;
    const settingsBody = lsOff ? `<div class="notice warn">LeadSnap is not configured on the server (LEADSNAP_API_TOKEN).</div>` : !st ? empty({ title: 'No baseline yet', text: 'The baseline scan locks the settings (keyword, area, grid) and starts the monthly schedule. It spends credits, so it asks first.' }) : `
      <dl class="kv">
        <dt>Keywords</dt><dd>${st.keywords.map(k => `${h(k.keyword)} <span class="muted small">(${h(k.kind)}, ${h(k.source)})</span>`).join('<br>')}</dd>
        <dt>Area</dt><dd>${h((st.scan_area || 'city').replace('_', ' '))}, ${st.spacing_m || st.grid_radius_m} m between points</dd>
        <dt>Grid</dt><dd>${st.point_count || st.grid_size * st.grid_size} of ${st.full_grid || 169} points${st.hull_towns ? `, clipped to ${st.hull_towns} town${st.hull_towns > 1 ? 's' : ''} plus ${st.buffer_km} km` : ''}${st.points_from ? ` · points from ${h(st.points_from)}` : ''}</dd>
        <dt>Centre</dt><dd>${st.centre.lat.toFixed(4)}, ${st.centre.lng.toFixed(4)} from ${h(st.centre.from)}</dd>
        <dt>Cost</dt><dd>${st.credits_per_run} credits a run</dd>
        <dt>Locked</dt><dd>${h(fmtDate(st.locked_at || st.built_at))}${S.schedules && S.schedules.last_fetch_at ? ` · last fetch ${h(fmtTime(S.schedules.last_fetch_at))}` : ''}${S.superseded ? ` · ${S.superseded} superseded scan${S.superseded > 1 ? 's' : ''} kept from before the reset` : ''}</dd>
      </dl>
      ${lead ? `<div class="${lead.top3 !== null && (lead.top3 > 90 || lead.top3 < 40) ? 'notice warn' : 'muted small'}" style="margin-top:10px">${h(lead.line)}</div>` : ''}
      ${st.reset_from ? `<div class="muted small" style="margin-top:6px">Reset from the settings locked ${st.reset_from.locked_at ? h(fmtDate(st.reset_from.locked_at)) : 'earlier'} (${st.reset_from.keywords.map(h).join(', ')})</div>` : ''}
      ${st.warnings && st.warnings.length ? `<div class="notice warn" style="margin-top:8px">${st.warnings.map(h).join('<br>')}</div>` : ''}
      ${st.notes && st.notes.length ? `<div class="muted small" style="margin-top:6px">${st.notes.map(h).join('<br>')}</div>` : ''}`;

    // Maps: one per keyword with grid points
    let mapsHtml = '';
    if (S && S.table && S.table.length) {
      const withPoints = S.table.filter(t => t.months.some(m => (S.scans.find(s => s.heatmap_id === m.heatmap_id) || {}).points));
      for (const t of withPoints) {
        const key = 'map_' + t.keyword.replace(/[^a-z0-9]+/gi, '_');
        const sel = mapState[key] || (mapState[key] = { month: t.months[t.months.length - 1].month, baseline: false });
        const current = t.months.find(m => m.month === sel.month) || t.months[t.months.length - 1];
        const shown = sel.baseline && t.baseline ? t.months.find(m => m.is_baseline) || current : current;
        const scan = S.scans.find(s => s.heatmap_id === shown.heatmap_id);
        mapsHtml += card({ title: h(t.keyword), sub: `${shown.is_baseline ? 'baseline' : h(shown.month)} · Top 3% ${shown.top_3_percentage}% · average ${shown.average}`, actions: `
            <select class="input" style="width:auto;padding:4px 8px" data-month="${key}">${t.months.map(m => `<option value="${h(m.month)}" ${m.month === sel.month ? 'selected' : ''}>${h(m.month)}${m.is_baseline ? ' (baseline)' : ''}</option>`).join('')}</select>
            ${t.baseline && !current.is_baseline ? `<button class="btn btn-ghost btn-sm" data-toggle="${key}">${sel.baseline ? `Show ${h(current.month)}` : 'Show baseline'}</button>` : ''}
            <button class="btn btn-ghost btn-sm" data-export="${key}" data-keyword="${attr(t.keyword)}" data-label="${attr(shown.is_baseline ? 'baseline' : shown.month)}">Export PNG</button>
            ${scan && scan.share_url ? `<a class="btn btn-ghost btn-sm" href="${attr(scan.share_url)}" target="_blank">Open on LeadSnap</a>` : ''}`,
          body: `<div id="${key}" class="scanmap" data-heatmap="${h(shown.heatmap_id)}" style="height:420px;border-radius:8px;border:1px solid var(--border);background:#eef0f3"></div><div class="muted small" style="margin-top:6px">1 to 3 green · 4 to 10 amber · 11 to 19 red · grey: not in the top 20</div>` });
      }
    }
    let tableHtml = '';
    if (S && S.table && S.table.length) {
      const months = [...new Set(S.table.flatMap(r => r.months.map(m => m.month)))].sort();
      tableHtml = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Keyword</th>${months.map(m => `<th>${h(m)}</th>`).join('')}</tr></thead><tbody>
        ${S.table.map(r => `<tr><td>${h(r.keyword)}</td>${months.map(m => { const x = r.months.find(y => y.month === m); if (!x) return '<td></td>'; return `<td><strong>${x.top_3_percentage}%</strong>${x.average !== null ? ` <span class="muted small">(${x.average})</span>` : ''} ${x.is_baseline ? pill('accent', 'baseline') : x.change !== null ? `<span class="small" style="color:${x.change < 0 ? '#b91c1c' : 'var(--muted)'}">${x.change > 0 ? '+' : ''}${x.change}</span>` : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    const schedules = S && S.schedules && S.schedules.items.length ? S.schedules.items.map(i => `<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--border)"><span>${h(i.name)} <span class="muted small">${h(i.keyword || (i.keywords || []).join(', '))} · day ${h(i.repeat_on)} · ${h(i.status)}${i.schedule_id === null || i.schedule_id === undefined ? ' · no id from LeadSnap' : ''}</span></span><button class="btn btn-ghost btn-xs" data-schedule="${attr(i.schedule_id)}" data-sched-act="${i.status === 'paused' ? 'resume' : 'pause'}">${i.status === 'paused' ? 'Resume' : 'Pause'}</button></div>`).join('') : empty({ title: 'No monthly schedule yet', text: 'The baseline scan creates it.' });

    el.innerHTML = `
      ${(S && S.alerts || []).length ? `<div class="notice bad" style="margin-bottom:14px"><strong>Rank drop</strong><ul style="margin:4px 0 0 18px">${S.alerts.map(a => `<li>${h(a.line)} (${h(a.previous_month)} to ${h(a.month)})</li>`).join('')}</ul></div>` : ''}
      ${S && S.pending ? `<div style="margin-bottom:14px">${running({ now: `${S.pending} heatmap${S.pending > 1 ? 's are' : ' is'} still running on LeadSnap`, next: 'This tab checks again every 20 seconds; then the Top 3% is read back and the map drawn' })}</div>` : ''}
      <div class="grid grid-2">
        ${card({ title: 'Scan settings', sub: 'SOP 1.7 baseline and 5.2 monthly, through LeadSnap; locked after the baseline; every run spends credits', actions, body: settingsBody })}
        ${card({ title: 'Top 3% by month against the baseline', sub: 'Average rank in brackets; change from the month before', body: tableHtml || empty({ title: 'No scans yet' }) })}
      </div>
      <div class="stack" style="margin-top:16px">${mapsHtml}</div>
      <div style="margin-top:16px">${card({ title: 'Monthly schedules', sub: 'schedules.json', body: schedules })}</div>`;
    setTimeout(drawMaps, 0);
  };

  async function drawMaps() {
    const els = [...el.querySelectorAll('.scanmap')];
    if (!els.length) return;
    try { await loadLeaflet(); } catch (e) { els.forEach(m => { m.textContent = e.message; }); return; }
    for (const m of els) {
      const scan = gbp.scans.scans.find(s => String(s.heatmap_id) === m.dataset.heatmap);
      if (!scan || !scan.points) continue;
      const pts = scan.points.filter(p => typeof p.lat === 'number' && typeof p.lng === 'number');
      const map = L.map(m, { zoomControl: true, attributionControl: true });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
      for (const p of pts) L.marker([p.lat, p.lng], { icon: L.divIcon({ className: '', html: `<div style="width:26px;height:26px;border-radius:50%;background:${rankColour(p.rank)};color:${rankClass(p.rank) === 'x' ? '#fff' : '#111'};font:600 11px Inter,sans-serif;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,.9);box-shadow:0 1px 3px rgba(0,0,0,.3)">${p.rank === null || p.rank === undefined ? '–' : p.rank >= 20 ? '20+' : p.rank}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] }) }).addTo(map);
      if (pts.length) map.fitBounds(L.latLngBounds(pts.map(p => [p.lat, p.lng])).pad(0.08));
      maps[m.id] = map;
    }
  }

  // PNG export: the OpenStreetMap tiles under the grid, drawn on a canvas
  async function exportMap(key, keyword, label) {
    const m = el.querySelector('#' + key);
    const scan = gbp.scans.scans.find(s => String(s.heatmap_id) === m.dataset.heatmap);
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
      c.fillText(p.rank === null || p.rank === undefined ? '–' : p.rank >= 20 ? '20+' : String(p.rank), x, y + 1);
    }
    c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(0, Hh - 48, W, 48);
    c.fillStyle = '#111827'; c.font = '600 16px Inter, system-ui, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText(`${keyword} · ${label} · Top 3% ${scan.top_3_percentage}% · average ${scan.average}`, 14, Hh - 30);
    c.font = '12px Inter, system-ui, sans-serif'; c.fillStyle = '#374151';
    c.fillText('1 to 3 green · 4 to 10 amber · 11 to 20 red · map © OpenStreetMap contributors', 14, Hh - 12);
    try { canvas.toBlob(blob => { const a2 = document.createElement('a'); a2.href = URL.createObjectURL(blob); a2.download = `${keyword.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${label}.png`; a2.click(); setTimeout(() => URL.revokeObjectURL(a2.href), 2000); }); }
    catch (e) { toast(`The PNG could not be built (${e.message}); use the LeadSnap link instead.`, 'bad'); }
  }

  async function baseline(mode, btn) {
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Working out the settings…';
    try {
      const data = await api(`/api/clients/${clientId}/gbp/scans/preview${mode === 'reset' ? '?fresh=1' : ''}`, { method: 'POST' });
      const s = data.settings;
      const text = `${mode === 'reset' ? 'The current schedules are paused, every stored scan is kept but marked superseded, the lock is cleared and a new baseline runs on these settings.' : ''}${s.warnings && s.warnings.length ? ' WARNING: ' + s.warnings.join(' WARNING: ') : ''} Keyword${s.keywords.length > 1 ? 's' : ''}: ${s.keywords.map(k => k.keyword).join(', ')}. Area: ${(s.scan_area || 'city').replace('_', ' ')}, ${s.spacing_m} m between points. Grid: ${s.grid_size} x ${s.grid_size}, clipped to the service area towns plus ${s.buffer_km} km: ${s.point_count} of ${s.full_grid} points. Centre: ${s.centre.lat.toFixed(4)}, ${s.centre.lng.toFixed(4)} from ${s.centre.from}. Place: ${s.place.name || s.place.google_place_id} (${s.place.how}).${s.notes && s.notes.length ? ' Notes: ' + s.notes.join(' ') : ''} Credit cost: ${data.credits} credits now and the same each month from the schedule. The settings lock after this run.`;
      if (!(await confirm({ title: mode === 'reset' ? `Reset the baseline for ${s.client}?` : `Run the baseline scan for ${s.client}?`, text, ok: 'Run it' }))) { btn.disabled = false; btn.textContent = label; return; }
      btn.textContent = 'Creating heatmaps…';
      gbp = await api(`/api/clients/${clientId}/gbp/scans/${mode === 'reset' ? 'reset' : 'baseline'}`, { method: 'POST', body: { confirm: true } });
      draw(); schedule();
    } catch (e) { toast(e.message, 'bad'); load(); }
  }

  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-act], [data-toggle], [data-export], [data-schedule]'); if (!b) return;
    try {
      if (b.dataset.toggle) { mapState[b.dataset.toggle].baseline = !mapState[b.dataset.toggle].baseline; return draw(); }
      if (b.dataset.export) return exportMap(b.dataset.export, b.dataset.keyword, b.dataset.label);
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
