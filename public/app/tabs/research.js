// Research tab (27 Oct 2026): one row per town: date, neighbourhoods (with sourced detail),
// issues, symptoms, rules; Run per town and Run all missing; open a dossier to read it.
// Plus, from the old Geo Research step (Brandon's review, 28 Oct): the county field (added to
// each town name for the research), the Homepage allocation card (the two neighbourhoods,
// the symptom per FAQ slot, re-run, save picks) and the FAQ questions panel (per page,
// approve all, waiting on a fact), reading the same routes as before.

import { h, attr, api, card, table, status, pill, timeEl, running, toast, dialog, empty, markdownToHtml, busy, info, confirm } from '../ui.js';

export async function render(el, ctx) {
  const { clientId } = ctx;
  let timer = null, faqTimer = null, state = null, moduleName = null, county = null;

  el.innerHTML = `<div id="towns"></div><div class="grid grid-2" style="margin-top:16px"><div id="alloc"></div><div id="faq"></div></div>`;
  const townsEl = el.querySelector('#towns'), allocEl = el.querySelector('#alloc'), faqEl = el.querySelector('#faq');

  // ── Towns ──
  const load = async () => {
    const [geo, rc, ds] = await Promise.all([api(`/api/clients/${clientId}/geo-location-status`), api(`/api/clients/${clientId}/research`), api(`/api/clients/${clientId}/dossiers`)]);
    moduleName = moduleName || rc.module;
    if (county === null) county = rc.county || '';
    const locs = Object.values(geo.locations || {});
    const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const dossiers = ds.dossiers || [];
    const rows = rc.towns.map(t => {
      const loc = locs.find(l => (l.code && l.code === t.code) || norm(l.name) === norm(t.name)) || null;
      const dossier = dossiers.find(d => norm((d.metadata || d).location_name || d.locationName || '') === norm(t.name) || (loc && d.id === loc.assetId)) || null;
      return { ...t, loc, dossier, st: loc ? loc.status : dossier ? 'done' : 'none', assetId: (dossier && dossier.id) || (loc && loc.assetId) || null, at: (dossier && (dossier.uploaded_at || dossier.uploadedAt)) || (loc && loc.uploadedAt) || null };
    });
    for (const d of dossiers) { const name = (d.metadata || d).location_name || d.locationName || d.filename; if (!rows.some(r => r.assetId === d.id)) rows.push({ name, code: '', runType: 'TOWN', adminArea: false, loc: null, dossier: d, st: 'done', assetId: d.id, at: d.uploaded_at || d.uploadedAt, extra: true }); }
    const summaries = await Promise.all(rows.map(r => r.assetId ? api(`/api/clients/${clientId}/dossiers/${r.assetId}/summary`).catch(() => null) : null));
    rows.forEach((r, i) => { r.sum = summaries[i]; });
    state = { rows, rc, geo };
    drawTowns();
    clearTimeout(timer);
    if (rows.some(r => r.st === 'running' || r.st === 'pending')) timer = setTimeout(load, 10000);
  };
  const kind = r => r.st === 'done' ? 'ok' : r.st === 'running' || r.st === 'pending' ? 'run' : r.st === 'failed' || r.st === 'error' ? 'block' : 'none';
  const label = r => r.adminArea ? 'council area, not researched' : r.st === 'done' ? 'researched' : r.st === 'running' ? 'researching' : r.st === 'pending' ? 'queued' : r.st === 'failed' || r.st === 'error' ? 'failed' : 'not researched';

  const drawTowns = () => {
    const { rows, rc } = state;
    const runningRows = rows.filter(r => r.st === 'running' || r.st === 'pending');
    const missing = rows.filter(r => !r.adminArea && !r.extra && r.st !== 'done' && r.st !== 'running' && r.st !== 'pending');
    const columns = [
      { key: 'name', label: 'Town', cls: 'no-label', render: r => `<span class="primary">${h(r.name)}${county ? `<span class="muted">, ${h(county)}</span>` : ''}</span><span class="sub">${r.runType === 'PRIMARY CITY' ? 'primary city' : 'town'}${r.code ? ` · ${h(r.code)}` : ''}</span>` },
      { key: 'st', label: 'Status', render: r => `${status(kind(r), label(r))}${r.loc && r.loc.error ? `<span class="sub" style="color:#b91c1c">${h(r.loc.error)}</span>` : r.loc && r.loc.statusDetail ? `<span class="sub">${h(r.loc.statusDetail)}</span>` : ''}` },
      { key: 'at', label: 'Date', render: r => timeEl(r.at) },
      { key: 'n', label: 'Neighbourhoods', num: true, render: r => r.sum ? `${r.sum.sourced}<span class="muted"> / ${r.sum.neighbourhoods}</span>` : '<span class="muted">–</span>' },
      { key: 'i', label: 'Issues', num: true, render: r => r.sum ? r.sum.issues : '<span class="muted">–</span>' },
      { key: 's', label: 'Symptoms', num: true, render: r => r.sum ? r.sum.symptoms : '<span class="muted">–</span>' },
      { key: 'r', label: 'Rules', num: true, render: r => r.sum ? r.sum.rules : '<span class="muted">–</span>' },
      { key: 'act', label: '', cls: 'right no-label', render: r => `${r.assetId ? `<button class="btn btn-ghost btn-sm" data-open="${attr(r.assetId)}" data-name="${attr(r.name)}">Open</button> <a class="btn btn-ghost btn-sm" href="/api/clients/${clientId}/dossiers/${attr(r.assetId)}/download">Download</a> ` : ''}${r.adminArea || r.extra ? '' : `<button class="btn btn-ghost btn-sm" data-run="${attr(r.name)}" ${runningRows.length ? 'disabled' : ''}>${r.st === 'done' ? 'Run again' : 'Run'}</button>`}` },
    ];
    const modSel = `<label class="small muted">Module <select class="input" id="module" style="width:auto;padding:4px 8px">${rc.modules.map(m => `<option value="${attr(m)}"${m === moduleName ? ' selected' : ''}>${h(m)}</option>`).join('')}${moduleName ? '' : '<option value="" selected>pick one…</option>'}</select></label>`;
    townsEl.innerHTML = `
      ${runningRows.length ? `<div style="margin-bottom:14px">${running({ now: `Researching ${(runningRows.find(r => r.st === 'running') || runningRows[0]).name}`, next: runningRows.length > 1 ? `Then ${runningRows.filter(r => r.st === 'pending').map(r => r.name).join(', ')}` : 'Then the dossier is saved and the allocation pass runs for the primary city', done: rows.filter(r => r.st === 'done').length, total: rows.filter(r => !r.adminArea && !r.extra).length })}</div>` : ''}
      ${!rc.module ? `<div class="notice warn" style="margin-bottom:14px">No research module matches this client's niche by name. Pick the module to use below; it is remembered for this tab.</div>` : ''}
      <section class="card card-flat">
        <div class="tbl-tools"><strong>Towns</strong> ${info('One row per town in the page map (the primary city first). Neighbourhoods counts those with sourced detail over the total; the allocation pass only uses sourced ones. The county is added to each town name for the research, to tell Romsey, Hampshire from any other.')}<label class="small muted">County <input class="input" id="county" style="width:130px;padding:4px 8px" placeholder="e.g. Hampshire" value="${attr(county || '')}"></label><span class="spacer"></span>${modSel}<button class="btn btn-primary btn-sm" data-run-missing ${runningRows.length || !missing.length ? 'disabled' : ''}>Run all missing (${missing.length})</button></div>
        ${table({ columns, rows, cards: true, emptyText: 'No towns yet: the page map gives the town list (the base town and the service areas).' })}
        <div class="tbl-foot">${rows.filter(r => r.st === 'done').length} of ${rows.filter(r => !r.adminArea).length} researched · each run calls Perplexity once per town</div>
      </section>`;
    townsEl.querySelector('#module').addEventListener('change', e => { moduleName = e.target.value; });
    townsEl.querySelector('#county').addEventListener('change', e => { county = e.target.value.trim(); drawTowns(); });
  };
  const run = async towns => {
    if (!moduleName) return toast('Pick a research module first', 'bad');
    try { const r = await api(`/api/clients/${clientId}/research/run`, { method: 'POST', body: { towns, moduleName, county } }); toast(`Researching ${r.towns.join(', ')}`); setTimeout(load, 800); }
    catch (e) { toast(e.message, 'bad'); }
  };
  townsEl.addEventListener('click', async e => {
    const o = e.target.closest('[data-open]');
    if (o) {
      const d = dialog({ title: `${o.dataset.name} dossier`, body: '<div class="skel" style="width:60%"></div>', wide: true });
      try { const r = await api(`/api/clients/${clientId}/dossiers/${o.dataset.open}`); d.el.innerHTML = `<div class="copy" style="font-size:15px">${markdownToHtml(r.content || '')}</div>`; }
      catch (err) { d.el.innerHTML = `<div class="state failed"><h3>Could not open the dossier</h3><p>${h(err.message)}</p></div>`; }
      return;
    }
    const r = e.target.closest('[data-run]'); if (r) return run([r.dataset.run]);
    if (e.target.closest('[data-run-missing]')) return run(state.rows.filter(x => !x.adminArea && !x.extra && x.st !== 'done' && x.st !== 'running' && x.st !== 'pending').map(x => x.name));
  });

  // ── Homepage allocation (the two neighbourhoods and the symptom per FAQ slot) ──
  let alloc = null;
  const loadAlloc = async () => { try { alloc = await api(`/api/clients/${clientId}/allocation`); } catch (e) { alloc = { error: e.message }; } drawAlloc(); };
  const drawAlloc = () => {
    if (!alloc) return;
    if (alloc.error) { allocEl.innerHTML = card({ title: 'Homepage allocation', body: `<div class="notice bad">${h(alloc.error)}</div>` }); return; }
    const v = alloc.view;
    const flags = (alloc.flags || []).map(f => `<div class="small" style="color:#b45309">${h(f.code)}: ${h(f.msg)}</div>`).join('');
    if (!v) { allocEl.innerHTML = card({ title: 'Homepage allocation', sub: 'The two neighbourhoods and the symptom per FAQ slot the homepage names', body: flags || empty({ title: 'No primary city dossier yet', text: 'Research the primary city first; the allocation pass then runs by itself.' }) }); return; }
    const eff = v.effective || { neighbourhoods: [], symptoms: {}, conservation_areas: [] };
    const cons = new Set(eff.conservation_areas || []);
    const lock = v.fromPageMap ? 'disabled title="Set by the page map Assigned columns"' : '';
    const nOpts = sel => '<option value="">(none)</option>' + v.neighbourhoods.map(n => `<option value="${attr(n.id)}" ${n.id === sel ? 'selected' : ''} ${n.eligible ? '' : 'disabled'}>${h(n.name)} (${h(n.type || 'area')})${n.eligible ? '' : ': no sourced detail'}${cons.has(n.id) ? ' · conservation area' : ''}</option>`).join('');
    const src = v.fromPageMap ? 'the page map Assigned columns' : v.saved ? (v.saved.source === 'manual' ? 'manual picks' : 'the allocation pass') : 'nothing saved yet';
    allocEl.innerHTML = card({ title: 'Homepage allocation', sub: `Dossier: ${h(v.dossierLocation)} · from ${h(src)}${v.updatedAt ? ` · ${h(new Date(v.updatedAt).toLocaleString('en-GB'))}` : ''}`,
      actions: `<button class="btn btn-ghost btn-sm" data-alloc-run ${alloc.running ? 'disabled' : ''}>${alloc.running ? 'Running…' : v.saved ? 'Re-run allocation' : 'Run allocation'}</button>${v.fromPageMap ? '' : '<button class="btn btn-primary btn-sm" data-alloc-save>Save picks</button>'}`,
      body: `${alloc.running ? running({ now: 'Choosing the neighbourhoods and symptoms', next: 'Then the picks show here for you to keep or change' }) : ''}
        <div class="field"><label>Neighbourhoods</label><select class="input alloc-n" ${lock} style="margin-bottom:6px">${nOpts((eff.neighbourhoods || [])[0])}</select><select class="input alloc-n" ${lock}>${nOpts((eff.neighbourhoods || [])[1])}</select></div>
        ${v.slots.map(s => `<div class="field"><label>Symptom for ${h(s.slot)}: ${h(s.question)}</label><select class="input alloc-s" data-slot="${attr(s.slot)}" ${lock}><option value="">(none)</option>${s.options.map(o => `<option value="${attr(o.id)}" ${(eff.symptoms || {})[s.slot] === o.id ? 'selected' : ''}>${h(o.text)}</option>`).join('')}</select></div>`).join('')}
        ${v.saved && v.saved.reasons ? `<div class="muted small" style="white-space:pre-wrap">${h(v.saved.reasons)}</div>` : ''}
        ${flags ? `<div style="margin-top:8px">${flags}</div>` : ''}
        ${(v.parseWarnings || []).length ? `<div class="small" style="color:#b45309;margin-top:6px">Dossier read warnings: ${h(v.parseWarnings.join('; '))}</div>` : ''}` });
  };
  allocEl.addEventListener('click', async e => {
    const b = e.target.closest('[data-alloc-run], [data-alloc-save]'); if (!b) return;
    try {
      if (b.hasAttribute('data-alloc-run')) { alloc.running = true; drawAlloc(); alloc = await api(`/api/clients/${clientId}/allocation/run`, { method: 'POST', body: {} }); toast('Allocation run'); return drawAlloc(); }
      const neighbourhoods = [...allocEl.querySelectorAll('.alloc-n')].map(s => s.value).filter(Boolean);
      const symptoms = {}; for (const s of allocEl.querySelectorAll('.alloc-s')) if (s.value) symptoms[s.dataset.slot] = s.value;
      await busy(b, 'Saving…', async () => { alloc = await api(`/api/clients/${clientId}/allocation`, { method: 'PUT', body: { neighbourhoods, symptoms } }); toast('Picks saved'); drawAlloc(); });
    } catch (err) { toast(err.message, 'bad'); loadAlloc(); }
  });

  // ── FAQ questions: per page, approve all, waiting on a fact ──
  let faq = null;
  const faqOpen = new Set();
  const HELD = { costGuide: 'Kept for a Cost Guide page', noPage: 'No page for these', covered: 'Answered by the fixed homepage questions', duplicate: 'Duplicates', dropped: 'Removed' };
  const loadFaq = async () => { try { faq = await api(`/api/clients/${clientId}/faq`); } catch (e) { faq = { error: e.message }; } drawFaq(); };
  const faqGroups = data => {
    const groups = new Map(); const order = { homepage: 0, category: 1, service: 2, location: 3 };
    for (const q of data.questions) {
      const p = q.placement || { held: 'noPage' };
      let key, title, ord, page = !!p.page;
      if (p.page) { key = p.page; title = p.page === 'homepage:homepage' ? 'Homepage' : p.pageTitle; ord = order[p.page.split(':')[0]] ?? 4; }
      else { key = 'held:' + p.held; title = HELD[p.held] || p.held; ord = 9 + Object.keys(HELD).indexOf(p.held); }
      if (!groups.has(key)) groups.set(key, { key, title, ord, page, questions: [] });
      groups.get(key).questions.push(q);
    }
    return [...groups.values()].sort((a, b) => a.ord - b.ord || a.title.localeCompare(b.title));
  };
  const qHtml = (q, data) => {
    const opts = ['<option value="">Auto</option>', ...data.pageOptions.map(o => `<option value="${attr(o.id)}" ${o.id === q.page_override ? 'selected' : ''}>${h(o.label)}</option>`), `<option value="drop" ${q.page_override === 'drop' ? 'selected' : ''}>Remove</option>`].join('');
    const p = q.placement || {};
    const waiting = p.page && p.usable === false && (q.fact || q.new_fact);
    const needs = q.fact || q.new_fact ? `Needs: ${h([q.fact, q.new_fact].filter(Boolean).join(' and '))}${waiting ? ' <span style="color:#b45309">(waiting for it)</span>' : ''}` : 'Needs no client fact';
    const from = q.source === 'client' ? `<strong>From the client's customers</strong>: ${h(q.original)}` : `Research: ${h(q.original)}${q.seen ? ' · seen ' + h(q.seen) : ''}`;
    const why = p.held && p.reason ? ` · ${h(p.reason)}` : (p.note ? ` · ${h(p.note)}` : '') + (p.pinned ? ' · kept: on the saved page' : '');
    return `<div class="faq-q" data-id="${attr(q.id)}" style="border-top:1px solid var(--border);padding:8px 0">
      <div style="display:flex;gap:8px;align-items:center"><input class="input faq-wording" value="${attr(q.wording)}" data-orig="${attr(q.wording)}" style="flex:1;min-width:0;padding:5px 8px"><label class="check small" style="white-space:nowrap"><input type="checkbox" class="faq-approve" data-orig="${q.approved ? '1' : ''}" ${q.approved ? 'checked' : ''} ${q.wording_errors.length ? 'disabled title="Fix the wording first"' : ''}> Approved</label></div>
      ${q.wording_errors.length ? `<div class="small" style="color:#b91c1c">${h(q.wording_errors.join('; '))}</div>` : ''}
      <div class="muted small" style="margin-top:4px">${h(q.id)} · ${h(q.doubt || '?')} · ${from}</div>
      <div class="small muted" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:4px"><span>${needs}${why}</span><select class="input faq-move" data-orig="${attr(q.page_override || '')}" style="width:auto;max-width:240px;padding:3px 6px">${opts}</select></div></div>`;
  };
  const drawFaq = () => {
    if (!faq) return;
    if (faq.error) { faqEl.innerHTML = card({ title: 'FAQ questions', body: `<div class="notice bad">${h(faq.error)}</div>` }); return; }
    const data = faq, job = data.job, lines = [];
    const busyNow = data.running.research || data.running.sort || (job && ['running', 'pending', 'queued'].includes(job.status));
    if (data.running.research || (job && ['running', 'pending', 'queued'].includes(job.status))) lines.push(running({ now: 'FAQ research running on Perplexity', next: 'Then the questions are sorted onto their pages (this can take a while)' }));
    else if (job && job.status && job.status !== 'done') lines.push(`<div class="notice bad">Last FAQ research ${h(job.status.replace('_', ' '))}: ${h(job.error || '')}${job.hasRaw ? ` <a href="/api/clients/${clientId}/faq/raw" target="_blank">Open the raw reply</a> · <button class="btn btn-ghost btn-xs" data-faq="reread">Read the saved reply again</button>` : ''}</div>`);
    if (job && job.status === 'done' && job.hasRaw) lines.push(`<div class="small"><a href="/api/clients/${clientId}/faq/raw" target="_blank" class="muted">Open the raw reply</a></div>`);
    if (data.research) lines.push(`<div class="small">Research saved ${h(new Date(data.research.savedAt).toLocaleString('en-GB'))}: ${data.research.questionCount} questions.</div>`);
    if (data.running.sort) lines.push(running({ now: 'Sorting the questions onto pages', next: 'Then each page group shows its questions' }));
    else if (data.sort) { lines.push(`<div class="small">Sorted ${h(new Date(data.sort.updatedAt).toLocaleString('en-GB'))}.</div>`); if (data.sort.stale) lines.push('<div class="small" style="color:#b45309">Sorted from an older research run: re-run the sorting.</div>'); if (data.sort.customersChanged) lines.push('<div class="small" style="color:#b45309">The customers\' questions on the Record changed since sorting: re-run the sorting.</div>'); }
    else if (data.research) lines.push('<div class="small" style="color:#b45309">Not sorted yet: run the sorting.</div>');
    if (!data.research && !job) { const i = data.inputs || { dossiers: [] }; lines.push(empty({ title: 'No FAQ research yet', text: `It runs by itself after the primary city research, or click Research. It uses ${i.customerQuestions} of the customers' own questions, ${i.onboarding} onboarding answers, ${i.facts} client values and ${i.dossiers && i.dossiers.length ? 'the dossiers for ' + i.dossiers.join(', ') : 'no dossiers yet'}.` })); }
    let body = lines.join('');
    if (data.questions.length) {
      const used = data.homepageUsed;
      const usedHtml = used === null ? '<div class="muted small">Which questions the homepage uses shows once its gates pass.</div>' : used.length ? used.map(u => `<div class="small">${h(u.slot)}: ${h(u.question)}</div>`).join('') : '<div class="muted small">None yet: the homepage uses the niche questions until a question here is approved and its fact supplied.</div>';
      body += faqGroups(data).map(g => {
        const n = g.questions.length, approved = g.questions.filter(q => q.approved).length, waiting = g.questions.filter(q => q.placement && q.placement.page && q.placement.usable === false && (q.fact || q.new_fact)).length, toApprove = g.questions.filter(q => !q.approved && !q.wording_errors.length).length;
        return `<details class="faq-group" data-group="${attr(g.key)}" ${faqOpen.has(g.key) ? 'open' : ''} style="border:1px solid var(--border);border-radius:8px;padding:6px 10px;margin-top:8px"><summary style="cursor:pointer"><strong>${h(g.title)}</strong> <span class="muted small">${g.page ? `${approved} of ${n} approved${waiting ? ` · ${waiting} waiting for a fact` : ''}` : n}</span>${g.page && toApprove ? ` <button class="btn btn-ghost btn-xs" data-approve-group="${attr(g.key)}" style="margin-left:8px">Approve all</button>` : ''}</summary>${g.key === 'homepage:homepage' ? `<div style="margin:8px 0"><strong class="small">Homepage FAQ now</strong>${usedHtml}</div>` : ''}${g.questions.map(q => qHtml(q, data)).join('')}</details>`;
      }).join('');
      const waiting = (data.waitingByFact || []).map(w => `<li><strong>${h(w.label)}</strong>${w.kind === 'not collected yet' ? ' <span style="color:#b45309">(not a client value or practice yet)</span>' : ''}${w.questions ? `<div class="muted small">${w.questions.map(h).join(' · ')}</div>` : ''}</li>`).join('');
      const r = data.research || { ranges: [], rules: [], gaps: [] };
      // The blog topics reserved from the held buckets (B1 with Amendment 1), and the site wide check (28 Oct)
      const B = data.blog;
      if (B) {
        const c = B.counts || {};
        const topicLine = t => `<div class="small" style="border-top:1px solid var(--border);padding:6px 0"><span class="pill">${h(t.post_type.replace('_', ' '))}</span> <strong>${h(t.wording)}</strong>${t.homepage_cost_guide ? ' <span class="tag ok">homepage cost guide</span>' : ''}${t.town ? ` <span class="muted">· ${h(t.town)}</span>` : ''}${t.seasonal ? ` <span class="muted">· ${h(t.seasonal.window)}, publish ${h(t.seasonal.publish)}</span>` : ''}<div class="muted small">${h(t.key)} · ${t.question ? `${h(t.question.id)}${t.question.approved ? '' : ' (not approved)'}` : 'written by code: approve on the queue'} · primary ${h(t.primary || '')} · stack ${t.stack.length}: ${t.stack.map(s => h(s.id)).join(', ') || 'none'} · FAQ ${t.faq.length}: ${t.faq.map(s => h(s.id)).join(', ') || 'none'}${t.dossier_condition ? ` · condition ${h(t.dossier_condition.id)} ${h(t.dossier_condition.title)}` : ''}</div>${t.flags.length ? `<div class="small" style="color:#b45309">${t.flags.map(f => `${h(f.code)}: ${h(f.msg)}`).join('<br>')}</div>` : ''}</div>`;
        body += `<details class="faq-group" data-group="blog" ${faqOpen.has('blog') ? 'open' : ''} style="border:1px solid var(--border);border-radius:8px;padding:6px 10px;margin-top:8px"><summary style="cursor:pointer"><strong>Blog topics reserved</strong> <span class="muted small">${B.error ? 'could not be built' : `${c.topics || 0} of 16 · ${c.cost_guide || 0} cost guides, ${c.decision || 0} decision, ${c.question || 0} question, ${c.local || 0} local · from ${B.pool ? B.pool.total : 0} held question${B.pool && B.pool.total === 1 ? '' : 's'}`}</span></summary>
          ${B.error ? `<div class="notice bad small">${h(B.error)}</div>` : ''}
          <div class="muted small" style="margin:6px 0">The topics, their query stacks and FAQ questions come from "Kept for a Cost Guide page" and "No page for these" only, so no page can use a question a post needs. Dates and links are decided on the queue (stage 3).</div>
          ${(B.flags || []).map(f => `<div class="small" style="color:#b45309">${h(f.code)}: ${h(f.msg)}</div>`).join('')}
          ${(B.topics || []).map(topicLine).join('')}
          ${(B.leftovers || []).length ? `<div class="muted small" style="margin-top:6px">Left in the queue for the Search Console batches: ${B.leftovers.map(h).join(', ')}</div>` : ''}
          ${(B.problems || []).length ? `<div class="notice bad small" style="margin-top:6px">Could not read: ${B.problems.map(h).join('; ')}</div>` : ''}</details>`;
      }
      const SC = data.siteCheck;
      if (SC) {
        const line = (kind, x) => `<div class="small" style="color:#b91c1c;margin-top:6px">${h(kind)} repeated across pages: ${h(x.label ? `${x.item} (${x.label})` : x.item)} on ${x.pages.map(h).join(' and ')}</div>`;
        body += SC.ok ? `<div class="small" style="color:#15803d;margin-top:8px">Site wide check: no question, neighbourhood or symptom repeats across ${SC.counts.pages} pages and posts.</div>`
          : [...SC.questions.map(x => line('Question', x)), ...SC.neighbourhoods.map(x => line('Neighbourhood', x)), ...SC.symptoms.map(x => line('Symptom', x))].join('');
      } else body += (data.siteRepeats || []).map(x => `<div class="small" style="color:#b91c1c;margin-top:6px">Repeated on two pages: ${h(x.question)}</div>`).join('');
      if (waiting) body += `<details style="margin-top:10px"><summary class="small">Waiting on a client fact (ask at onboarding)</summary><ul class="small" style="margin:6px 0 0 18px">${waiting}</ul></details>`;
      body += `<details style="margin-top:6px"><summary class="small muted">Ranges, rules and gaps from the research (for onboarding only, never published)</summary>${r.ranges.length ? `<div class="small" style="margin-top:6px"><strong>Ranges to confirm with the client</strong>${r.ranges.map(x => `<div>${h(x.job)}: ${h(x.range)} <span class="muted">${h(x.area)}${x.dated ? ', ' + h(x.dated) : ''}</span></div>`).join('')}</div>` : ''}${r.rules.length ? `<div class="small" style="margin-top:6px"><strong>Rules customers ask about</strong>${r.rules.map(x => `<div>${h(x.question)}: <span class="muted">${h(x.rule)}</span></div>`).join('')}</div>` : ''}${r.gaps.length ? `<div class="small" style="margin-top:6px"><strong>Gaps</strong>${r.gaps.map(x => `<div class="muted">${h(x)}</div>`).join('')}</div>` : ''}</details>`;
      body += `<div class="btn-row" style="margin-top:12px"><button class="btn btn-primary btn-sm" data-faq="save">Save changes</button></div>`;
    }
    faqEl.innerHTML = card({ title: 'FAQ questions', sub: 'Per page: approve, reword, move; a question waits until its client fact is on the Record', actions: `<button class="btn btn-ghost btn-sm" data-faq="research" ${data.running.research ? 'disabled' : ''}>${data.running.research ? 'Research running…' : data.research ? 'Re-run research' : 'Research'}</button>${data.research ? `<button class="btn btn-ghost btn-sm" data-faq="sort" ${data.running.sort ? 'disabled' : ''}>${data.running.sort ? 'Sorting…' : data.sort ? 'Re-run sorting' : 'Run sorting'}</button>` : ''}`, body });
    faqEl.querySelectorAll('details.faq-group').forEach(d => d.addEventListener('toggle', () => { if (d.open) faqOpen.add(d.dataset.group); else faqOpen.delete(d.dataset.group); }));
    clearTimeout(faqTimer);
    if (busyNow) faqTimer = setTimeout(loadFaq, 15000);
  };
  const saveFaq = async () => {
    const updates = [];
    for (const row of faqEl.querySelectorAll('.faq-q[data-id]')) {
      const u = { id: row.dataset.id }; const w = row.querySelector('.faq-wording'), m = row.querySelector('.faq-move'), a = row.querySelector('.faq-approve');
      if (w.value.trim() !== w.dataset.orig) u.wording = w.value;
      if (m.value !== m.dataset.orig) u.page_override = m.value || null;
      if (a.checked !== !!a.dataset.orig) u.approved = a.checked;
      if (u.wording !== undefined && a.checked) u.approved = true;
      if (Object.keys(u).length > 1) updates.push(u);
    }
    if (!updates.length) return toast('Nothing changed');
    faq = await api(`/api/clients/${clientId}/faq/questions`, { method: 'PUT', body: { updates } }); toast(`Saved ${updates.length} change${updates.length === 1 ? '' : 's'}`); drawFaq();
  };
  faqEl.addEventListener('click', async e => {
    const g = e.target.closest('[data-approve-group]');
    if (g) { e.preventDefault(); const d = [...faqEl.querySelectorAll('details.faq-group')].find(x => x.dataset.group === g.dataset.approveGroup); if (d) for (const cb of d.querySelectorAll('.faq-approve')) if (!cb.disabled) cb.checked = true; try { await saveFaq(); } catch (err) { toast(err.message, 'bad'); } return; }
    const b = e.target.closest('[data-faq]'); if (!b) return;
    try {
      const act = b.dataset.faq;
      if (act === 'save') return busy(b, 'Saving…', saveFaq);
      if (act === 'research') { if (faq.research && !(await confirm({ title: 'Run the FAQ research again?', text: 'It replaces the saved questions when it finishes; approvals carry over where a question is unchanged.', ok: 'Run again' }))) return; faq = await api(`/api/clients/${clientId}/faq/research`, { method: 'POST', body: {} }); return drawFaq(); }
      if (act === 'sort') return busy(b, 'Sorting…', async () => { faq = await api(`/api/clients/${clientId}/faq/sort`, { method: 'POST', body: {} }); drawFaq(); });
      if (act === 'reread') return busy(b, 'Reading…', async () => { faq = await api(`/api/clients/${clientId}/faq/reread`, { method: 'POST', body: {} }); if (faq.reread && !faq.reread.saved) toast(`The saved reply still could not be read: ${faq.reread.error}`, 'bad'); drawFaq(); });
    } catch (err) { toast(err.message, 'bad'); }
  });

  await Promise.all([load(), loadAlloc(), loadFaq()]);
  if (ctx.query.run === 'missing' && state) { const missing = state.rows.filter(x => !x.adminArea && !x.extra && x.st !== 'done' && x.st !== 'running' && x.st !== 'pending').map(x => x.name); if (missing.length) run(missing); else toast('Every town already has a dossier'); }
  return () => { clearTimeout(timer); clearTimeout(faqTimer); };
}
