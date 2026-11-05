// Lead Snap tab (5 Nov 2026): the ready to paste autopost config. Left: Generate, what is
// missing, the photo counts and the other typed fields. Right: the config in Lead Snap's screen
// order, each prompt with its Copy button and photo folder. Set once per client; Generate again
// when a client adds a service or sends new photos.

import { h, attr, api, card, copyBtn, toast, running, empty, fmtDate, pill, wire, qa } from '../ui.js';

export async function render(el, ctx) {
  const { clientId } = ctx;
  const url = `/api/clients/${clientId}/lead-snap`;
  let S = null;
  const load = async () => { try { S = await api(url); } catch (e) { S = { error: e.message, fatal: true }; } draw(); };

  const row = (name, text, meta = '') => `<div class="field" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><span style="font-weight:500">${h(name)}</span><span class="btn-row"><span class="muted small">${h(meta)}</span>${copyBtn(text)}</span></div><div style="white-space:pre-wrap;margin-top:4px">${h(text)}</div></div>`;
  const input = (key, label, value, placeholder = '') => `<label class="field" style="display:block;margin-bottom:10px"><span class="small" style="font-weight:500">${h(label)}</span><input class="input" style="width:100%" data-f="${attr(key)}" value="${attr(value || '')}" placeholder="${attr(placeholder)}"></label>`;

  const generateCard = () => {
    const I = S.intake, R = S.record, P = S.plan, done = R && R.sheet;
    if (!I) return empty({ title: 'Nothing to build from yet', text: S.error || '' });
    const notes = [...I.missing.map(m => `Needed: ${m}`), ...I.warnings, ...(P && I.photosEntered ? P.notes : [])];
    let b = `<div class="btn-row" style="margin-bottom:10px"><button class="btn btn-primary" data-act="generate" ${S.running ? 'disabled' : ''}>${done ? 'Generate again' : 'Generate config'}</button>${R && R.generated_at ? `<span class="muted small">Last run ${h(fmtDate(R.generated_at, true))}</span>` : ''}</div>`;
    if (S.running) b += running({ now: 'Writing the prompts', next: 'Then the checks run; a config that fails is rewritten once' });
    if (notes.length) b += `<div class="notice warn" style="margin-bottom:10px"><ul style="margin:0 0 0 18px">${notes.map(n => `<li>${h(n)}</li>`).join('')}</ul></div>`;
    if (R && R.failure) b += `<div class="notice bad" style="margin-bottom:10px"><strong>${h(R.failure.error)}</strong><ul style="margin:6px 0 0 18px">${R.failure.fails.map(f => `<li>${h(f.message)}</li>`).join('')}</ul></div>`;
    b += `<div class="notice" style="margin-bottom:10px"><div><strong>${h(I.business)}</strong> · ${h(I.niche)} · ${h(I.phone || 'no phone saved')}</div><div class="small" style="margin-top:4px">Areas: ${h(I.areas.join(', '))}</div><div class="small muted">${h(I.areasWhy)}</div><div class="small" style="margin-top:4px">USPs: ${h(I.usps.join('; ') || 'none confirmed')}</div><div class="small" style="margin-top:4px">Call to action: ${h(I.cta.line)} <span class="muted">(${h(I.cta.why)})</span></div></div>`;
    b += `<div class="sec-title">Photos per service</div><div class="muted small" style="margin-bottom:6px">Copybot can't read these yet, so type how many photos each folder holds. ${I.groups.length} whole services from the page map, highest value first. 3 or more earns a prompt of its own (the top 4 at most).</div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Service</th><th>Photos</th></tr></thead><tbody>
      ${I.groups.map(g => `<tr><td>${h(g.label)}${g.services.length > 1 ? `<div class="muted small">${h(g.services.join(', '))}</div>` : ''}</td><td><input class="input" type="number" min="0" style="width:72px" data-count="${attr(g.key)}" value="${I.photosEntered ? attr(g.photos) : ''}"></td></tr>`).join('')}
      <tr><td>Brand: team, van, premises, logo</td><td><input class="input" type="number" min="0" style="width:72px" data-f="brand" value="${I.photosEntered ? attr(I.brand) : ''}"></td></tr></tbody></table></div>
      <div class="sec-title">Only if they apply</div>
      ${input('offer', 'Standing offer the client has confirmed', S.hand.offer, 'Leave blank for no offer prompt')}
      ${input('booking_url', 'Booking page', S.hand.booking_url, 'https://')}
      <label class="field" style="display:block;margin-bottom:10px"><span class="small" style="font-weight:500">Call to action</span><select class="input" style="width:100%" data-f="cta_type">${['', 'Call Now', 'Book', 'Learn More'].map(c => `<option value="${attr(c)}" ${(S.hand.cta_type || '') === c ? 'selected' : ''}>${h(c || 'Choose for me')}</option>`).join('')}</select></label>
      ${input('tone', `Tone (now: ${I.tone})`, S.hand.tone, 'Leave blank to keep it')}
      ${input('avoid', 'Other things to avoid', S.hand.avoid, 'e.g. no prices')}
      <div class="btn-row"><button class="btn btn-ghost" data-act="save">Save</button></div>`;
    if (Object.keys(S.files || {}).length) b += `<div class="small" style="margin-top:10px">Files: ${Object.entries(S.files).map(([f, u]) => `<a href="${attr(u)}" target="_blank">${h(f)}</a>`).join(' · ')}</div>`;
    return b;
  };

  const planCard = () => {
    const P = S.plan;
    if (!P || !S.intake.photosEntered) return '';
    return card({ title: 'The prompts this will write', sub: 'Worked out from the photo counts; nothing is spent until you generate', body: `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Prompt</th><th>Photo folder</th><th>Why</th></tr></thead><tbody>${P.prompts.map(p => `<tr><td>${p.n}</td><td>${h(p.label)}</td><td>${h(p.folder)} (${p.photos})</td><td class="muted small">${h(p.why)}</td></tr>`).join('')}</tbody></table></div>` });
  };

  const outputCards = () => {
    const R = S.record, O = R && R.output;
    if (!O) return card({ title: 'Autopost config', body: empty({ title: 'No config yet', text: 'Type the photo counts, then generate. The config comes out here in Lead Snap\'s screen order.' }) });
    const flags = (R.flags || []).length ? `<div class="notice warn" style="margin-bottom:10px"><ul style="margin:0 0 0 18px">${R.flags.map(f => `<li>${h(f.message)}</li>`).join('')}</ul></div>` : '';
    const out = [card({ title: 'Settings', sub: 'Set these first', actions: copyBtn(R.sheet, 'Copy whole config'), body: flags + row('Frequency', O.settings.frequency) + row('Call to action', O.settings.cta) })];
    for (const p of O.prompts) out.push(card({ title: `Prompt ${p.n}: ${p.label}`, sub: p.why, body: row('Tone', p.tone) + row('Images: select from folder', p.folder, `${p.photos} photos`) + row('Prompt', p.text, `${p.chars} characters`) }));
    out.push(card({ title: 'Photo gaps', sub: 'Send these to the client', body: O.gaps.length ? `<div class="btn-row" style="margin-bottom:8px">${copyBtn(O.gaps.map(g => g.line).join('\n'), 'Copy all')}</div><ul style="margin:0 0 0 18px">${O.gaps.map(g => `<li>${h(g.line)}</li>`).join('')}</ul>` : pill('ok', 'No gaps') }));
    out.push(card({ title: 'VA checklist', sub: 'Lead Snap writes the first post as soon as you save, so read that one before leaving it running', body: `<ul style="margin:0;list-style:none;padding:0">${O.checklist.map(c => `<li><label><input type="checkbox"> ${h(c)}</label></li>`).join('')}</ul>` }));
    return out.join('');
  };

  const draw = () => {
    if (!S) return;
    if (S.fatal) { el.innerHTML = `<div class="card">${empty({ title: 'The Lead Snap tab could not load', text: S.error, action: '<button class="btn btn-ghost" data-act="reload">Retry</button>' })}</div>`; return; }
    el.innerHTML = `<div class="grid grid-2" style="align-items:start"><div class="stack">${card({ title: 'Generate', sub: 'The autopost config, set once per client', body: generateCard() })}${planCard()}</div><div class="stack">${outputCards()}</div></div>`;
  };

  const collect = () => {
    const body = { counts: {} };
    qa('[data-count]', el).forEach(i => { body.counts[i.dataset.count] = i.value; });
    qa('[data-f]', el).forEach(i => { body[i.dataset.f] = i.value; });
    return body;
  };
  const save = async () => { S = await api(`${url}/intake`, { method: 'PUT', body: collect() }); };
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    try {
      if (b.dataset.act === 'reload') return load();
      if (b.dataset.act === 'save') { await save(); draw(); toast('Saved'); return; }
      if (b.dataset.act === 'generate') {
        await save(); S.running = true; draw();
        S = await api(`${url}/generate`, { method: 'POST' }); draw();
        if (S.record && S.record.failure) toast('The config failed its checks', 'bad');
      }
    } catch (err) { toast(err.message, 'bad'); load(); }
  });
  wire(el);
  await load();
}
