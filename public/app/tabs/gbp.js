// GBP tab (27 Oct 2026): today's panels as cards in a two column grid with copy buttons:
// generate (description, services, products), profile fields, NAP, the internal note, the
// review templates, the competitor check, duplicates, the landing page signals, profile
// verification. Rank scans live on the Rankings tab. Behaviour as the old client page.

import { h, attr, api, card, copyBtn, toast, confirm, running, empty, fmtDate, pill, wire, busy } from '../ui.js';

const STEPS = [['description', 'Description'], ['services', 'Services'], ['products', 'Products']];
const link = (u, t) => u ? `<a href="${attr(u)}" target="_blank" rel="noopener">${h(t || u)}</a>` : '';
const fmtTime = s => fmtDate(s, true);

export async function render(el, ctx) {
  const { clientId } = ctx;
  let gbp = null, timer = null;
  const load = async () => { try { gbp = await api(`/api/clients/${clientId}/gbp`); } catch (e) { gbp = { error: e.message }; } draw(); clearTimeout(timer); if (gbp && gbp.running) timer = setTimeout(load, 8000); };

  const field = (name, text, meta = '', flags = []) => `<div class="field" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><span style="font-weight:500">${h(name)}</span><span class="btn-row"><span class="muted small">${h(meta)}</span>${copyBtn(text)}</span></div><div style="white-space:pre-wrap;margin-top:4px">${h(text)}</div>${flags.map(f => `<div class="small" style="color:#b45309">Check: ${h(f.message)}</div>`).join('')}</div>`;

  const draw = () => {
    if (!gbp) return;
    if (gbp.error) { el.innerHTML = `<div class="card">${empty({ title: 'The GBP output could not load', text: gbp.error, action: '<button class="btn btn-ghost" data-act="reload">Retry</button>' })}</div>`; return; }
    const R = gbp.record, rd = gbp.readiness || {}, steps = (R && R.steps) || {};
    const allDone = STEPS.every(([s]) => steps[s] && steps[s].status === 'done');
    const failedStep = STEPS.map(([s]) => s).find(s => steps[s] && steps[s].status === 'failed');
    const C = gbp.competitors || {}, L = gbp.landing, Dp = gbp.duplicates || { duplicates: [], marks: {} }, P = gbp.profile, PC = gbp.profileCheck, LC = gbp.leadsnapCompetitors;
    const lsOff = rd.leadsnap === false;
    const stepPill = (s, l) => { const st = steps[s]; return pill(!st ? 'none' : st.status === 'done' ? 'ok' : 'block', `${l}: ${!st ? 'not run' : st.status === 'done' ? `done${st.validation && st.validation.flags.length ? `, ${st.validation.flags.length} to check` : ''}` : 'failed'}`); };

    // Generate card
    let gen = `<div class="btn-row" style="margin-bottom:10px">
      <button class="btn btn-primary" data-act="generate" ${rd.ok === false || gbp.running ? 'disabled' : ''}>${allDone ? 'Generate again' : R ? 'Generate (resume)' : 'Generate GBP output'}</button>
      ${R ? '<button class="btn btn-ghost btn-sm" data-act="clear">Start again</button>' : ''}
      ${R && R.updated_at ? `<span class="muted small">Last run ${h(fmtTime(R.updated_at))}</span>` : ''}</div>
      <div class="btn-row" style="margin-bottom:10px">${STEPS.map(([s, l]) => stepPill(s, l)).join('')}</div>`;
    if (gbp.running) gen += running({ now: 'Writing the description, then the services, then the products', next: 'Then the validator checks each step; a step that fails stops the run and can be resumed' });
    if (rd.error) gen += `<div class="notice bad">${h(rd.error)}</div>`;
    else gen += `<div class="notice">${h([`${rd.locked} service pages in the page map`, `services target ${rd.minServices}${rd.competitorCount !== null && rd.competitorCount !== undefined ? ` (competitors average ${rd.competitorCount})` : ' (no competitor count saved)'}`, rd.siteUrl ? `site ${rd.siteUrl}` : 'no site URL saved', `${rd.withCopy} service pages with copy`, `prices ${rd.showPrices ? 'shown' : 'hidden'}`].join(' · '))}${(rd.flags || []).length ? `<ul style="margin:6px 0 0 18px">${rd.flags.map(f => `<li>${h(f.msg)}</li>`).join('')}</ul>` : ''}</div>`;
    if (failedStep) { const st = steps[failedStep]; gen += `<div class="notice bad" style="margin-top:10px"><strong>${h(st.error)}</strong><ul style="margin:6px 0 0 18px">${(st.fails || []).map(f => `<li>${h(f.message)}</li>`).join('')}</ul><details><summary>The model's answer</summary><pre class="block">${h(st.raw || '')}</pre></details><div class="btn-row" style="margin-top:8px"><button class="btn btn-ghost btn-sm" data-act="generate">Retry from this step</button></div></div>`; }
    if (Object.keys(gbp.files || {}).length) gen += `<div class="small" style="margin-top:10px">Files: ${Object.entries(gbp.files).map(([f, u]) => `<a href="${attr(u)}" target="_blank">${h(f)}</a>`).join(' · ')}</div>`;

    // Output cards
    const d = steps.description, s = steps.services, p = steps.products;
    const desc = d && d.status === 'done' ? field('Business description', d.output.description, `${[...d.output.description].length} characters`, d.validation.flags) : empty({ title: 'No description yet', text: 'Generate the GBP output to write it.' });
    let services = empty({ title: 'No services yet' });
    if (s && s.status === 'done') {
      const list = s.output.services, cats = [...new Set(list.map(x => x.category))];
      services = `<div class="muted small" style="margin-bottom:8px">${list.length} total, ${list.filter(x => x.type === 'LOCKED').length} from the page map, ${list.filter(x => x.type === 'VARIANT').length} variants</div>` + cats.map(c => `<div class="sec-title" style="display:flex;justify-content:space-between;align-items:center">${h(c)} ${copyBtn(list.filter(x => x.category === c).map(x => x.service).join('\n'), 'Copy names')}</div>` + list.filter(x => x.category === c).map(x => field(x.service, x.description, `${x.type.toLowerCase()} · ${[...x.description].length} characters${x.url ? ' · ' + x.url : ''}`, s.validation.flags.filter(f => f.field === x.service))).join('')).join('');
    }
    let products = empty({ title: 'No products yet' });
    if (p && p.status === 'done') products = p.output.products.map(x => `<div class="field" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;gap:8px"><span style="font-weight:500">${h(x.title)}</span><span class="btn-row"><span class="muted small">${[...x.title].length} characters · ${h(x.category)}</span>${copyBtn(x.title, 'Copy title')}</span></div><div style="display:flex;justify-content:space-between;gap:8px;margin-top:6px"><span class="muted small">description · ${[...x.description].length} characters</span>${copyBtn(x.description)}</div><div style="white-space:pre-wrap">${h(x.description)}</div>${x.url ? `<div style="display:flex;justify-content:space-between;gap:8px;margin-top:4px"><a href="${attr(x.url)}" target="_blank" class="small">${h(x.url)}</a>${copyBtn(x.url, 'Copy URL')}</div>` : ''}${p.validation.flags.filter(f => f.field === x.service).map(f => `<div class="small" style="color:#b45309">Check: ${h(f.message)}</div>`).join('')}</div>`).join('');

    // Profile, NAP, note, templates
    let profile = empty({ title: 'No profile fields yet', text: 'They are built from the client values and the page map.' });
    let nap = '', note = '', templates = '';
    if (P) {
      profile = (P.flags.length ? `<div class="notice warn" style="margin-bottom:10px"><ul style="margin:0 0 0 18px">${P.flags.map(f => `<li>${h(f.msg)}</li>`).join('')}</ul></div>` : '') + P.fields.map(f => field(f.label, f.value || '(blank)', f.lines ? `${f.lines.length} lines` : `${[...(f.value || '')].length} characters`, f.flag ? [{ message: f.flag }] : [])).join('');
      const n = P.nap;
      const napRows = [['Name', n.name], ['Address', n.address || ''], ['Service areas', n.service_areas ? n.service_areas.join('\n') : ''], ['Phone', n.phone], ['Website', n.website], ['Email', n.email], ['Hours', n.hours]].filter(([, v]) => v);
      nap = `<div class="btn-row" style="margin-bottom:8px">${copyBtn(JSON.stringify(n, null, 2), 'Copy nap.json')}</div><dl class="kv">${napRows.map(([k, v]) => `<dt>${h(k)}</dt><dd style="display:flex;justify-content:space-between;gap:8px;white-space:pre-wrap">${h(v)}${copyBtn(v)}</dd>`).join('')}</dl>`;
      note = field('Four lines for the GBP record', P.note);
      templates = field('C1. Review request (text after every job)', P.templates.c1, 'keeps [first name]') + field('C2. Reply to a 1 to 3 star review', P.templates.c2, 'keeps [name] and [job]', [{ message: P.templates.c2_rule }]);
    }

    // Competitors and duplicates
    let comp = `<div class="btn-row" style="margin-bottom:10px"><button class="btn btn-ghost" data-act="competitors" ${rd.ok === false ? 'disabled' : ''}>Run competitor check</button>${C.latest ? `<span class="muted small">Last run ${h(fmtTime(C.latest.at))} · searched "${h(C.latest.keyword)}"${C.runs && C.runs.length > 1 ? ` · ${C.runs.length} runs` : ''}</span>` : '<span class="muted small">Not run yet</span>'}${rd.ownPlaceId ? `<span class="muted small">own place id ${h(rd.ownPlaceId)}</span>` : ''}</div>`;
    if (C.latest) {
      const cmp = C.comparison, chg = id => cmp && cmp.changes.find(x => x.place_id === id);
      comp += `<div class="small muted" style="margin-bottom:6px">Top ${C.latest.competitors.length}${C.reading ? ` · ${h(C.reading.line)}` : ''} · competitor_service_count: ${rd.competitorCount !== null && rd.competitorCount !== undefined ? h(rd.competitorCount) : 'not saved'} (<a href="/clients/${clientId}/record#f-competitor_service_count" data-link>Record</a>)</div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Business</th><th>Places type</th><th title="Type the GBP primary category after a GMB Everywhere look">GBP primary (by hand)</th><th>Rating</th><th>Reviews</th><th>Change</th><th>Links</th></tr></thead><tbody>
        ${C.latest.competitors.map(c => { const ch = chg(c.place_id); const hv = (C.hand || {})[c.place_id]; return `<tr><td>${h(c.name)}</td><td>${h(c.primary_type || '')}</td><td><input class="input" style="width:150px;padding:3px 6px;font-size:12px" value="${attr(hv ? hv.gbp_primary : '')}" placeholder="e.g. Landscaper" data-hand="${attr(c.place_id)}"></td><td>${c.rating === null ? '' : c.rating}</td><td>${c.review_count}</td><td>${ch && ch.change !== null ? (ch.change > 0 ? '+' : '') + ch.change : ''}</td><td>${link(c.website, 'Site')} ${link(c.maps_url, 'Maps')}</td></tr>`; }).join('')}
        <tr style="font-weight:600"><td>Average</td><td></td><td></td><td>${C.latest.average.rating === null ? '' : C.latest.average.rating}</td><td>${C.latest.average.review_count}</td><td>${cmp ? ((cmp.average_change > 0 ? '+' : '') + cmp.average_change + (cmp.reviews_per_month !== null ? ` (${cmp.reviews_per_month} a month over ${cmp.days} days)` : '')) : ''}</td><td class="small muted">${cmp ? `since ${h(fmtTime(cmp.previous_at))}` : ''}</td></tr></tbody></table></div>
        ${C.latest.skipped.length ? `<details class="small" style="margin-top:6px"><summary>${C.latest.skipped.length} result${C.latest.skipped.length > 1 ? 's' : ''} skipped</summary><ul style="margin:4px 0 0 18px">${C.latest.skipped.map(s => `<li>${h(s.name)}: ${h(s.reason)}${s.maps_url ? ' · ' + link(s.maps_url, 'Maps') : ''}</li>`).join('')}</ul></details>` : ''}`;
      if (LC && LC.competitors && LC.competitors.length) comp += `<div class="sec-title">Top ${Math.min(5, LC.competitors.length)} by market share on the "${h(LC.keyword)}" heatmap <span class="muted" style="text-transform:none;font-weight:400">LeadSnap, baseline ${h(fmtDate(LC.at))}</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Business</th><th>Market share</th><th>Average rank</th><th>Top 3 points</th><th>Reviews</th><th></th></tr></thead><tbody>${LC.competitors.slice(0, 5).map(c => `<tr><td>${h(c.name)}</td><td>${c.market_share === null ? '' : c.market_share + '%'}</td><td>${c.average === null ? '' : c.average}</td><td>${c.top_3_points === null ? '' : c.top_3_points}</td><td>${c.review_count === null ? '' : c.review_count}</td><td>${link(c.maps_url, 'Maps')}</td></tr>`).join('')}</tbody></table></div>`;
    }
    const dups = !C.latest ? empty({ title: 'Run the competitor check first', text: 'The duplicate finder runs with it.' }) : `<div class="muted small" style="margin-bottom:6px">${Dp.at ? `Searched ${Dp.queries.map(q => `"${h(q)}"`).join(' and ')}` : ''}</div>` + (Dp.duplicates.length ? Dp.duplicates.map(d => { const m = (Dp.marks || {})[d.place_id]; return `<div class="list-row" style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--border)"><span>${h(d.name)} <span class="muted small">${h(d.address || '')} · matched by ${h(d.matched)}</span> ${link(d.maps_url, 'Maps')}</span><span class="btn-row">${m ? pill(m.mark === 'reported' ? 'ok' : 'none', `${m.mark === 'reported' ? 'Reported' : 'Ignored'} ${fmtDate(m.at)}`) : ''}<button class="btn btn-ghost btn-xs" data-dup="${attr(d.place_id)}" data-mark="${m && m.mark === 'reported' ? '' : 'reported'}">${m && m.mark === 'reported' ? 'Unmark' : 'Reported'}</button><button class="btn btn-ghost btn-xs" data-dup="${attr(d.place_id)}" data-mark="${m && m.mark === 'ignore' ? '' : 'ignore'}">${m && m.mark === 'ignore' ? 'Unignore' : 'Ignore'}</button></span></div>`; }).join('') : '<div class="muted">None found.</div>');

    // Landing page, verification
    const landing = `<div class="btn-row" style="margin-bottom:10px"><button class="btn btn-ghost" data-act="landing" ${rd.ok === false || !rd.siteUrl ? 'disabled' : ''}>Check landing page</button><span class="muted small">${L ? `Last check ${h(fmtTime(L.at))} · ${L.passed} of ${L.of} pass · ${link(L.final_url)}` : rd.siteUrl ? 'Not checked yet' : 'No site URL saved'}</span></div>` + (L ? L.signals.map(s => `<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-top:1px solid var(--border)"><span>${pill(s.pass ? 'ok' : 'wait', s.pass ? 'pass' : 'fail')} ${h(s.label)}</span><span class="muted small" style="max-width:55%;text-align:right">${h(s.found)}</span></div>`).join('') : '');
    const verify = `<div class="btn-row" style="margin-bottom:10px"><button class="btn btn-ghost" data-act="verify" ${rd.ok === false || lsOff ? 'disabled' : ''}>Verify profile</button><span class="muted small">${lsOff ? 'LeadSnap is not configured on the server' : PC ? `Checked ${h(fmtTime(PC.at))} · ${h(PC.location.name)} · completion ${PC.location.completion_percentage === null ? 'unknown' : PC.location.completion_percentage + '%'}${PC.location.suspension_reason ? ` · suspended: ${h(PC.location.suspension_reason)}` : ''}${PC.location.has_pending_edits ? ' · pending edits on Google' : ''}` : 'Not checked yet'}</span></div>` + (PC ? `<div class="small muted" style="margin-bottom:6px">${PC.diffs.length ? `${PC.counts.missing} missing, ${PC.counts.extra} extra, ${PC.counts.mismatch} mismatch` : 'Everything matches'} · services from ${h(PC.services_source || '')}</div>${PC.diffs.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Area</th><th>Kind</th><th>Ours</th><th>Google</th></tr></thead><tbody>${PC.diffs.map(d => `<tr><td>${h(d.area)}</td><td>${pill(d.kind === 'extra' ? 'none' : 'wait', d.kind)}</td><td>${h(d.ours)}</td><td>${h(d.google)}</td></tr>`).join('')}</tbody></table></div>` : ''}${PC.notes.length ? `<div class="small" style="color:#b45309;margin-top:6px">${PC.notes.map(h).join('<br>')}</div>` : ''}` : '');

    el.innerHTML = `
      ${(gbp.scans && gbp.scans.alerts || []).length ? `<div class="notice bad" style="margin-bottom:14px"><strong>Rank drop</strong><ul style="margin:4px 0 0 18px">${gbp.scans.alerts.map(a => `<li>${h(a.line)} (${h(a.previous_month)} to ${h(a.month)})</li>`).join('')}</ul> <a href="/clients/${clientId}/rankings" data-link>Rankings</a></div>` : ''}
      <div class="grid grid-2">
        ${card({ title: 'Generate', sub: 'The description, services and products to paste into the GBP editor, top to bottom', body: gen })}
        ${card({ title: 'Profile fields', sub: 'Paste into the GBP editor, top to bottom', body: profile })}
        ${card({ title: 'Description', body: desc })}
        ${card({ title: 'NAP record', sub: 'nap.json', body: nap || empty({ title: 'No NAP yet' }) })}
        ${card({ title: 'Services', body: services })}
        ${card({ title: 'Internal note', sub: 'note.txt', body: note || empty({ title: 'No note yet' }) })}
        ${card({ title: 'Products', body: products })}
        ${card({ title: 'Review templates', sub: 'Appendix C of the GBP Workflow SOP', body: templates || empty({ title: 'No templates yet' }) })}
        ${card({ title: 'Competitor check', sub: 'SOP 2.1 and 1.3: the top five for "[primary category] [main town]"', body: comp })}
        ${card({ title: 'Possible duplicates of the client\'s listing', body: dups })}
        ${card({ title: 'Landing page signals', sub: 'SOP 2.4: the eight checks on the site\'s homepage', body: landing })}
        ${card({ title: 'Profile verification', sub: 'SOP 3.10: the LeadSnap location against the profile fields, services and hours', body: verify })}
      </div>`;
  };

  const post = async (path, body) => { const d = await api(`/api/clients/${clientId}/gbp/${path}`, { method: body ? 'PUT' : 'POST', body }); gbp = d; draw(); };
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-act], [data-dup]'); if (!b) return;
    try {
      if (b.dataset.dup !== undefined) return await post(`duplicates/${encodeURIComponent(b.dataset.dup)}`, { mark: b.dataset.mark });
      const act = b.dataset.act;
      if (act === 'reload') return load();
      if (act === 'generate') { gbp.running = true; draw(); api(`/api/clients/${clientId}/gbp/generate`, { method: 'POST' }).then(d => { gbp = d; draw(); }).catch(err => { toast(err.message, 'bad'); load(); }); return; }
      if (act === 'clear') { if (!(await confirm({ title: 'Start the GBP output again?', text: 'The saved description, services and products are removed.', ok: 'Start again', danger: true }))) return; return await post('clear'); }
      if (act === 'competitors') return busy(b, 'Searching…', () => post('competitors'));
      if (act === 'landing') return busy(b, 'Checking…', () => post('landing-page'));
      if (act === 'verify') return busy(b, 'Reading the listing…', () => post('verify-profile'));
    } catch (err) { toast(err.message, 'bad'); load(); }
  });
  el.addEventListener('change', async e => { const i = e.target.closest('[data-hand]'); if (i) { try { await post(`competitors/${encodeURIComponent(i.dataset.hand)}`, { gbp_primary: i.value }); toast('Saved'); } catch (err) { toast(err.message, 'bad'); } } });
  wire(el);
  await load();
  return () => clearTimeout(timer);
}
