// Locations tab (30 Oct 2026): the Location Determiner review. The latest run on a map (the
// base as a star, the reach ring solid, the outer limit dashed, towns coloured by tier), the
// counts, the towns by tier with move buttons, a place added by name, the GBP service areas,
// the client confirmation message and the client's reply, Approve. The tiers are the launch
// phases: Tier 1 launches first, Tier 2 in phase 2, area only is named but gets no page.
// Reads and writes /api/clients/:id/locations/* (locations/routes.js); nothing here touches
// the page map or GBP (Stage 6 reads the approved list when the page map is generated).

import { h, attr, api, card, table, status, pill, tag, toast, confirm, busy, info, copyBtn, wire, tile } from '../ui.js';

const LABEL = { tier1: 'Tier 1', tier2: 'Tier 2', area_only: 'Area only', excluded: 'Excluded' };
const KIND = { tier1: 'accent', tier2: 'run', area_only: '', excluded: 'block' };
const COLOUR = { tier1: 'var(--accent)', tier2: 'var(--run)', area_only: 'var(--none)', excluded: 'var(--block)' };
const num = v => v == null ? '' : Number(v).toLocaleString('en-GB');
const fmt = iso => iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

let leafletLoading = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve();
  if (leafletLoading) return leafletLoading;
  if (!document.querySelector('link[data-leaflet]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; l.dataset.leaflet = '1'; document.head.appendChild(l); }
  leafletLoading = new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; s.onload = resolve; s.onerror = () => reject(new Error('Leaflet did not load')); document.head.appendChild(s); });
  return leafletLoading;
}

function gateText(t) {
  if (!t.gate) return t.source === 'manual' ? 'added by hand' : '';
  const g = t.gate;
  const v = g.volume == null ? 'volume ?' : `volume ${g.volume}`;
  const c = g.competitors == null ? '' : `, ${g.competitors} competitor page${g.competitors === 1 ? '' : 's'}`;
  if (t.population_rule) return `population ${num(t.population)} (${v}${c})`;
  return g.pass ? `${g.by} (${v}${c})` : `${v}${c}`;
}

export async function render(el, ctx) {
  const { clientId } = ctx;
  const base = `/api/clients/${clientId}/locations`;
  let view = null, dry = null, map = null, showExcluded = false;

  const load = async () => { view = await api(`${base}/review`); draw(); };
  const post = (path, body) => api(`${base}${path}`, { method: 'POST', body });

  const dryHtml = () => {
    if (!dry) return '';
    if (!dry.ok) return `<div class="notice bad">Dry run: ${dry.problems.map(p => h(p.msg)).join(' ')}</div>`;
    const c = dry.counts, e = dry.estimate;
    return `<div class="notice">Dry run: ${c.candidates} candidates in the volume run (${c.inside_reach} inside reach, ${c.districts_of_base} districts of the base town), ${c.area_only} area only, ${c.excluded} excluded (${c.across_water} across water). ${dry.plan.keyword_count} keywords (${dry.plan.keywords_to_buy} to buy), up to ${dry.plan.serp_to_buy} SERPs to buy. <strong>Estimate up to $${Number(e.total_usd).toFixed(2)}.</strong> Run buys that and saves a new run.</div>`;
  };
  const runBar = () => `<div class="btn-row"><button class="btn btn-ghost btn-sm" id="dryBtn">Dry run (free)</button><button class="btn btn-primary btn-sm" id="runBtn" ${dry && dry.ok ? '' : 'disabled'}>Run (buys)</button>${info('The dry run spends nothing and shows the cost. Run buys the DataForSEO volumes and SERPs the dry run planned and saves a new run; the caches make a rerun cheap.')}</div>`;

  const rowHtml = t => {
    const tags = [t.client_asked ? tag('wait', 'typed by client') : '', t.source === 'manual' ? tag('hand', 'by hand') : '', t.ambiguous ? `<span class="tip" data-tip="${attr((t.namesake_examples || []).join(', ') || 'shared name')}">${tag('wait', `shared name (${t.namesakes})`)}</span>` : '', t.client_declined ? tag('block', 'client declined') : '', t.moved ? tag('ok', 'moved') : '', t.population_rule && !t.moved ? tag('run', 'population') : ''].join(' ');
    return { ...t, tags };
  };
  const moveButtons = t => ['tier1', 'tier2', 'area_only', 'excluded'].map(to => `<button class="btn btn-ghost btn-xs${t.to === to ? ' active' : ''}" data-move="${to}" data-id="${attr(t.place_id)}" ${t.to === to ? 'disabled' : ''}>${{ tier1: 'T1', tier2: 'T2', area_only: 'Area', excluded: 'Excl' }[to]}</button>`).join(' ') + (t.moved ? ` <button class="btn btn-ghost btn-xs" data-move="reset" data-id="${attr(t.place_id)}">Reset</button>` : '');
  const columns = [
    { key: 'name', label: 'Place', cls: 'no-label', render: t => `<span class="primary">${h(t.name)}${t.qualifier ? ` <span class="muted">(${h(t.qualifier)})</span>` : ''}</span> ${t.tags}<span class="sub">${h(t.type)}${t.inside_reach === false ? ' · beyond reach' : ''}</span>` },
    { key: 'population', label: 'Population', num: true, render: t => num(t.population) || '<span class="muted">–</span>' },
    { key: 'miles', label: 'Miles', num: true, render: t => t.miles == null ? '' : h(t.miles) },
    { key: 'namesakes', label: 'Namesakes', num: true, render: t => h(t.namesakes || 0) },
    { key: 'score', label: 'Score', num: true, render: t => t.score == null ? '' : h(t.score) },
    { key: 'gate', label: 'Evidence', render: t => `<span class="muted">${h(gateText(t))}</span>` },
    { key: 'why', label: 'Why', render: t => `<span class="small muted">${h(t.why)}</span>` },
    { key: 'act', label: '', cls: 'right no-label', render: moveButtons },
  ];
  const sectionTable = (to, title, sub) => {
    const rows = view.list.filter(t => t.to === to).map(rowHtml);
    if (!rows.length) return '';
    return `<section class="card card-flat"><div class="tbl-tools"><strong>${h(title)}</strong> <span class="pill ${KIND[to]}">${rows.length}</span><span class="muted small">${h(sub)}</span></div>${table({ columns, rows, cards: true })}</section>`;
  };
  const catsHtml = () => {
    const by = new Map();
    for (const c of view.location_categories) { if (!by.has(c.town)) by.set(c.town, []); by.get(c.town).push(c); }
    if (!by.size) return '<span class="muted">None pass yet.</span>';
    return `<dl class="kv">${[...by].map(([town, list]) => `<dt>${h(town)} ${pill(list[0].phase === 1 ? 'accent' : 'run', `phase ${list[0].phase}`)}</dt><dd>${list.map(c => `${h(c.category)}${c.primary ? '*' : ''} <span class="muted">(${c.by === 'volume' ? `v ${c.volume}` : c.by === 'population' ? 'population' : `c ${c.competitors}`})</span>`).join(', ')}</dd>`).join('')}</dl><div class="small muted" style="margin-top:8px">* the primary category, on the location page's evidence (hub rule)</div>`;
  };

  const draw = () => {
    if (map) { map.remove(); map = null; }
    if (!view.ok) {
      el.innerHTML = card({ title: 'Locations', sub: 'Which towns get location pages, and when.', actions: runBar(), body: `<div class="notice warn">${view.problems.map(p => h(p.msg)).join(' ')}</div>${dryHtml()}` });
      wireRun();
      return;
    }
    const v = view;
    const overCap = v.warnings.some(w => w.code === 'over_cap');
    const header = `
      <div class="notice">Run of ${h(fmt(v.ran_at))}. Base <strong>${h(v.base.name)}</strong> (population ${num(v.base.population)}), point from ${h(v.point.from)}. Travel ${v.travel.miles} miles from ${h(v.travel.from)} → reach ${v.reach_miles} mi, outer limit ${v.outer_limit_miles} mi, Tier 1 band ${v.tier1_band.join(' to ')}, page town cap ${v.page_town_cap}.${v.costs ? ` This run cost $${Number(v.costs.total_usd).toFixed(2)}.` : ''}${v.scan ? ` <span class="muted">Locked scan grid: ${v.scan.reach_miles} mi would move ${v.scan.moves.length} towns (shown only, never applied).</span>` : ''}</div>
      ${v.flags.map(f => `<div class="notice warn">${h(f.code)}: ${h(f.msg)}</div>`).join('')}
      ${v.warnings.map(w => `<div class="notice ${w.code === 'over_cap' ? 'bad' : 'warn'}">${h(w.msg)}</div>`).join('')}
      ${v.approval ? `<div class="notice good">Approved ${h(fmt(v.approval.approved_at))}${v.approval.approved_by ? ` by ${h(v.approval.approved_by)}` : ''}: ${v.approval.counts.tier1} Tier 1, ${v.approval.counts.tier2} Tier 2, ${v.approval.counts.area_only} area only. The page map was regenerated from it and the GBP service areas follow it. Move a town and approve again to change it.</div>` : `<div class="notice">Not approved yet: the page map still uses the record's town list. Move towns, add any missing, send the client message, record the reply, then Approve, which regenerates the page map.</div>`}
      ${dryHtml()}`;
    el.innerHTML = `
      <div class="stack">
        ${card({ title: 'Locations', sub: 'Which towns get location pages, and when. Tier 1 launches first, Tier 2 in phase 2, area only is named on the site and the Google Business Profile but gets no page.', actions: runBar(), body: `<div class="stack" style="--gap:10px">${header}</div>` })}
        <div class="grid grid-2">
          <section class="card">
            <div id="map" style="height:460px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--none-soft)"></div>
            <div class="small muted" style="margin-top:8px;display:flex;gap:14px;flex-wrap:wrap;align-items:center">
              <span><i class="dot" style="background:${COLOUR.tier1}"></i> Tier 1</span><span><i class="dot" style="background:${COLOUR.tier2}"></i> Tier 2</span><span><i class="dot" style="background:${COLOUR.area_only}"></i> area only</span><span><i class="dot" style="background:${COLOUR.excluded}"></i> excluded (when shown)</span>
              <span>★ base · solid ring reach · dashed ring outer limit · small dots are districts · click the map to zoom with the wheel</span>
              <label class="check small"><input type="checkbox" id="showExcl" ${showExcluded ? 'checked' : ''}> show excluded</label>
            </div>
          </section>
          <div class="stack">
            <div class="grid grid-4">
              ${tile({ label: 'Tier 1', value: v.counts.tier1, foot: 'phase 1 pages' })}
              ${tile({ label: 'Tier 2', value: v.counts.tier2, foot: 'phase 2 pages' })}
              ${tile({ label: 'Area only', value: v.counts.area_only, foot: 'no page' })}
              ${tile({ label: 'By hand', value: v.counts.moved + v.counts.manual, foot: `${v.counts.declined} declined by the client` })}
            </div>
            ${card({ title: 'Add a place by hand', sub: 'Matched in the places table nearest the base. A place the run already judged is moved instead.', body: `
              <div class="btn-row" style="position:relative">
                <input class="input" id="addName" placeholder="Town or suburb name" autocomplete="off" style="flex:1;min-width:180px">
                <select class="input" id="addTo" style="width:auto"><option value="tier2">Tier 2</option><option value="tier1">Tier 1</option><option value="area_only">Area only</option></select>
                <button class="btn btn-primary btn-sm" id="addBtn">Add</button>
                <div id="suggest" class="card" style="display:none;position:absolute;left:0;right:0;top:40px;z-index:20;padding:4px;max-height:220px;overflow:auto"></div>
              </div>` })}
            ${card({ title: `GBP service areas (${v.gbp_areas.length} of 20)`, body: `<div class="small" style="line-height:2">${v.gbp_areas.map(g => `${h(g.name)} ${pill(g.from === 'Tier 1' ? 'accent' : g.from === 'Tier 2' ? 'run' : '', g.from)}`).join(' · ')}</div>` })}
            ${card({ title: 'Approve', sub: 'Shows what the list does to the page map, then approves it and regenerates the page map in one go. Moved a town later? Approve again.', body: `<div class="btn-row"><input class="input" id="who" placeholder="Your name" style="width:160px" value="${attr(localStorage.getItem('ll_who') || '')}"><button class="btn btn-primary" id="approveBtn" ${overCap ? 'disabled' : ''}>Approve this list</button></div>` })}
          </div>
        </div>
        ${sectionTable('tier1', 'Tier 1: phase 1 location pages', 'move a town with the buttons; Reset returns it to the run\'s decision')}
        ${sectionTable('tier2', 'Tier 2: phase 2 location pages', '')}
        ${sectionTable('area_only', 'Area only: service areas text and GBP, no page', '')}
        ${showExcluded ? sectionTable('excluded', 'Excluded', 'shared names, across water, council areas, typed places that failed') : ''}
        <div class="grid grid-2">
          ${card({ title: 'Client confirmation message', actions: copyBtn(v.message.text, 'Copy'), body: `<textarea class="input" readonly style="min-height:220px;font-size:13px">${h(v.message.text)}</textarea>` })}
          ${card({ title: 'The client\'s reply', sub: 'Untick the towns the client said they do not work in. They become area only, and the reply is kept as presence evidence.', body: `
            <div class="stack" style="--gap:4px" id="reply">
              ${v.message.towns.map(t => `<label class="check"><input type="checkbox" data-id="${attr(t.place_id)}" ${(v.state.client_reply && v.state.client_reply.declined.includes(t.place_id)) ? '' : 'checked'}> ${h(t.name)} ${pill(t.tier === 1 ? 'accent' : 'run', `Tier ${t.tier}`)}</label>`).join('')}
              ${v.list.filter(t => t.client_declined && !t.tier).map(t => `<label class="check"><input type="checkbox" data-id="${attr(t.place_id)}"> ${h(t.name)} ${pill('', 'declined, area only')}</label>`).join('')}
            </div>
            <div class="btn-row" style="margin-top:10px"><input class="input" id="replyNote" placeholder="Note (how the client replied)" style="flex:1" value="${attr(v.state.client_reply ? v.state.client_reply.note : '')}"><button class="btn btn-ghost btn-sm" id="replyBtn">Save reply</button></div>
            ${v.state.client_reply ? `<div class="small muted" style="margin-top:6px">Reply recorded ${h(fmt(v.state.client_reply.at))}: ${v.state.client_reply.declined.length} declined.</div>` : ''}` })}
        </div>
        ${card({ title: 'Location category pages', sub: 'Per page town, each on its own demand; the primary category on the location page\'s.', body: catsHtml() })}
      </div>`;
    wireRun();
    wireReview();
    drawMap();
  };

  const wireRun = () => {
    const dryBtn = el.querySelector('#dryBtn'), runBtn = el.querySelector('#runBtn');
    if (dryBtn) dryBtn.addEventListener('click', () => busy(dryBtn, 'Running the dry run…', async () => { try { dry = await api(`${base}/dry-run`); } catch (e) { toast(e.message, 'bad'); } draw(); }));
    if (runBtn) runBtn.addEventListener('click', async () => {
      if (!dry || !dry.ok) return;
      if (!(await confirm({ title: 'Buy the volumes and SERPs for this run?', text: `Estimate up to $${Number(dry.estimate.total_usd).toFixed(2)}. The result is saved as a new run; the caches make later reruns cheap.`, ok: 'Run' }))) return;
      await busy(runBtn, 'Running (buying)…', async () => { try { await post('/run', { confirm: true }); dry = null; toast('Run saved'); await load(); } catch (e) { toast(e.message, 'bad'); } });
    });
  };

  const wireReview = () => {
    wire(el);
    el.querySelector('#showExcl').addEventListener('change', e => { showExcluded = e.target.checked; draw(); });
    el.addEventListener('click', async e => {
      const b = e.target.closest('[data-move]'); if (!b) return;
      try { view = await post('/review/move', { place_id: b.dataset.id, to: b.dataset.move }); draw(); } catch (err) { toast(err.message, 'bad'); }
    });
    const addName = el.querySelector('#addName'), sug = el.querySelector('#suggest');
    let timer = null, picked = null;
    addName.addEventListener('input', () => {
      picked = null; clearTimeout(timer);
      const qv = addName.value.trim(); if (qv.length < 2) { sug.style.display = 'none'; return; }
      timer = setTimeout(async () => {
        try {
          const items = await api(`${base}/review/suggest?q=${encodeURIComponent(qv)}`);
          sug.innerHTML = items.length ? items.map(i => `<button class="btn btn-ghost btn-sm" style="width:100%;justify-content:flex-start;border:0" data-pick="${attr(i.place_id)}" data-name="${attr(i.name)}">${h(i.name)}${i.qualifier ? ` (${h(i.qualifier)})` : ''} <span class="muted">${h(i.type)}${i.population ? `, ${num(i.population)}` : ''}${i.miles != null ? `, ${i.miles} mi` : ''}, ${h(String(i.lad_name || '').split(';')[0])}</span></button>`).join('') : '<div class="state">nothing of that name</div>';
          sug.style.display = 'block';
        } catch (_) { sug.style.display = 'none'; }
      }, 250);
    });
    sug.addEventListener('click', e => { const p = e.target.closest('[data-pick]'); if (!p) return; picked = p.dataset.pick; addName.value = p.dataset.name; sug.style.display = 'none'; });
    el.querySelector('#addBtn').addEventListener('click', async e => {
      const name = addName.value.trim(); if (!name) return;
      await busy(e.target, 'Adding…', async () => { try { view = await post('/review/add', picked ? { place_id: picked, to: el.querySelector('#addTo').value } : { name, to: el.querySelector('#addTo').value }); toast(`${name} added`); draw(); } catch (err) { toast(err.message, 'bad'); } });
    });
    el.querySelector('#replyBtn').addEventListener('click', async e => {
      const declined = [...el.querySelectorAll('#reply input[type=checkbox]')].filter(c => !c.checked).map(c => c.dataset.id);
      await busy(e.target, 'Saving…', async () => { try { view = await post('/review/client-reply', { declined, note: el.querySelector('#replyNote').value }); toast('Reply saved'); draw(); } catch (err) { toast(err.message, 'bad'); } });
    });
    // Approve = Stage 6 (30 Oct): the confirm shows what the approval does to the page map; on
    // confirm the approval is saved and the page map regenerated in one action
    el.querySelector('#approveBtn').addEventListener('click', async e => {
      const who = el.querySelector('#who').value.trim(); localStorage.setItem('ll_who', who);
      let s6;
      try { s6 = await busy(e.target, 'Working out the pages…', () => api(`${base}/review/stage6`)); } catch (err) { return toast(err.message, 'bad'); }
      if (!s6.ok) return toast((s6.problems || []).map(p => p.msg).join(' ') || 'The page map cannot be built yet', 'bad');
      const rowsHtml = s6.by_type.map(t => `<tr><td>${h(t.label)}</td><td class="num">${t.add_p1 + t.add_p2}${t.add_p2 ? ` <span class="muted">(${t.add_p2} phase 2)</span>` : ''}</td><td class="num">${t.retire}</td><td class="num">${t.keep_p1 + t.keep_p2}${t.keep_p2 ? ` <span class="muted">(${t.keep_p2} phase 2)</span>` : ''}</td><td class="num">${t.phase_changes || ''}</td></tr>`).join('');
      const worked = s6.worked_on.length ? `<div class="notice warn" style="margin-top:10px"><strong>${s6.worked_on.length} retiring page${s6.worked_on.length === 1 ? ' has' : 's have'} a person's work on ${s6.worked_on.length === 1 ? 'it' : 'them'}</strong> (kept, never deleted; applies = false):<ul style="margin:6px 0 0 18px">${s6.worked_on.slice(0, 12).map(r => `<li>${h(r.label)} ${h(r.title)}: ${h(r.worked.join(', '))}</li>`).join('')}${s6.worked_on.length > 12 ? `<li>… and ${s6.worked_on.length - 12} more</li>` : ''}</ul></div>` : `<div class="small muted" style="margin-top:10px">No retiring page has a person's work on it${s6.retire.some(r => r.research_h1) ? ' (research H1s only)' : ''}.</div>`;
      const body = `
        <div class="small muted" style="margin-bottom:8px">Towns for the page map (${s6.other_towns.length}): ${h(s6.other_towns.join(', '))}. Launch towns: ${h(s6.launch_towns.join(', ') || 'none')}.</div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Type</th><th class="num">Add</th><th class="num">Retire</th><th class="num">Keep</th><th class="num">Phase changes</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>
        <div class="small muted" style="margin-top:8px">Totals: add ${s6.totals.add}, retire ${s6.totals.retire}, keep ${s6.totals.keep}; the plan is ${s6.totals.plan} pages (${s6.totals.phase1} phase 1, ${s6.totals.phase2} phase 2).${s6.renames.length ? ' The rename check flags the leaving towns against the new ones; it is not a rename.' : ''}</div>
        ${worked}
        <div class="small muted" style="margin-top:10px">On confirm: the list is approved${who ? ` by ${h(who)}` : ''}, the page map is regenerated from it (retired pages keep their H1, meta and copy), and the GBP service areas follow the approved list. Approving again later does the same.</div>`;
      const ok = await new Promise(resolve => {
        const ov = document.createElement('div'); ov.className = 'overlay';
        ov.innerHTML = `<div class="dialog wide" role="dialog"><h3>Approve ${view.counts.tier1} Tier 1 and ${view.counts.tier2} Tier 2 towns and regenerate the page map?</h3>${body}<div class="btn-row" style="margin-top:14px"><button class="btn btn-ghost" data-x="0">Cancel</button><button class="btn btn-primary" data-x="1">Approve and regenerate</button></div></div>`;
        ov.addEventListener('click', ev => { const b = ev.target.closest('[data-x]'); if (b) { ov.remove(); resolve(b.dataset.x === '1'); } else if (ev.target === ov) { ov.remove(); resolve(false); } });
        document.body.appendChild(ov);
      });
      if (!ok) return;
      await busy(e.target, 'Approving and regenerating…', async () => {
        try {
          const r = await post('/review/approve', { who });
          view = r.view;
          toast(`Approved. Page map: ${r.generated.totals.add} added, ${r.generated.totals.retire} retired, ${r.generated.totals.keep} kept`);
          draw();
          if (ctx.refresh) ctx.refresh();
        } catch (err) { toast(err.message, 'bad'); }
      });
    });
  };

  const drawMap = async () => {
    const mapEl = el.querySelector('#map');
    if (!mapEl || !view.ok) return;
    try { await loadLeaflet(); } catch (e) { mapEl.innerHTML = `<div class="state">${h(e.message)}</div>`; return; }
    if (!mapEl.isConnected) return;
    const v = view;
    map = L.map(mapEl, { zoomControl: true, scrollWheelZoom: false });
    map.on('click', () => map.scrollWheelZoom.enable());
    map.on('mouseout', () => map.scrollWheelZoom.disable());
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    const centre = [v.point.lat, v.point.lng];
    const mi = 1609.344;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#5e63f0';
    L.circle(centre, { radius: v.reach_miles * mi, color: accent, weight: 2, fill: false }).addTo(map);
    L.circle(centre, { radius: v.outer_limit_miles * mi, color: accent, weight: 1.5, dashArray: '6 8', fill: false }).addTo(map);
    L.marker(centre, { icon: L.divIcon({ className: '', html: '<div style="font-size:22px;line-height:22px;color:#d97706;text-shadow:0 0 3px #fff">★</div>', iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(map).bindPopup(`<strong>${h(v.base.name)}</strong><br>base, point from ${h(v.point.from)}`);
    const colour = { tier1: accent, tier2: '#2563eb', area_only: '#9ca3af', excluded: '#dc2626' };
    const pts = [centre];
    for (const t of v.list) {
      if (t.lat == null || t.lng == null) continue;
      if (t.to === 'excluded' && !showExcluded) continue;
      const r = t.type === 'district' ? 5 : t.to === 'tier1' ? 11 : t.to === 'tier2' ? 9 : 7;
      const m = L.circleMarker([t.lat, t.lng], { radius: r, color: '#1a1d26', weight: 1, fillColor: colour[t.to], fillOpacity: t.to === 'area_only' ? .7 : .95 }).addTo(map);
      m.bindPopup(`<strong>${h(t.name)}</strong> ${h(LABEL[t.to])}<br>${h(t.type)}${t.population ? `, population ${num(t.population)}` : ''}, ${t.miles} mi, ${t.namesakes || 0} namesakes<br><span style="color:#626876">${h(gateText(t))}</span><br><span style="color:#626876">${h(t.why)}</span><div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">${['tier1', 'tier2', 'area_only', 'excluded'].filter(x => x !== t.to).map(x => `<button class="btn btn-ghost btn-xs" data-move="${x}" data-id="${attr(t.place_id)}">${h(LABEL[x])}</button>`).join('')}</div>`);
      if (t.to !== 'excluded') pts.push([t.lat, t.lng]);
    }
    map.fitBounds(L.latLngBounds(pts).pad(0.05));
  };

  el.innerHTML = `<div class="card"><div class="skel" style="width:60%"></div></div>`;
  try { await load(); } catch (e) { el.innerHTML = card({ title: 'Locations', body: `<div class="state failed"><h3>Could not load the review</h3><p>${h(e.message)}</p></div>` }); }
  return () => { if (map) { map.remove(); map = null; } };
}
