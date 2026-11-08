// The top of the GBP Posts & Photos tab (8 Nov 2026, Brandon: Lead Snap no longer posts, so its tab
// joins this one). Three cards in the order the VA works: Photos (the Drive folder, the counts per
// service, the photo gaps), Post settings (offer, booking page, button, tone, words to avoid) and
// Prompts (written once per client; every batch below is written from them). The data and routes are
// still the Lead Snap autopost ones (/api/clients/:id/lead-snap): only the screen moved.
// What only Lead Snap needed is gone from here: the paste sheet, the copy buttons, the folder tone,
// the VA checklist and Preview posts (a batch now does that job for real).

import { h, attr, api, card, copyBtn, toast, confirm, running, empty, fmtDate, pill, wire, qa } from '../ui.js';

export async function renderSetup(el, ctx, { onChange = () => {} } = {}) {
  const { clientId } = ctx;
  const url = `/api/clients/${clientId}/lead-snap`;
  let S = null;
  const load = async () => { try { S = await api(url); } catch (e) { S = { error: e.message, fatal: true }; } draw(); };

  const input = (key, label, value, placeholder = '') => `<label class="field" style="display:block;margin-bottom:10px"><span class="small" style="font-weight:500">${h(label)}</span><input class="input" style="width:100%" data-f="${attr(key)}" value="${attr(value || '')}" placeholder="${attr(placeholder)}"></label>`;
  const mb = n => `${(n / 1024 / 1024).toFixed(1)} MB`;
  const fileRow = f => `<tr data-drive-file><td>${f.web_link ? `<a href="${attr(f.web_link)}" target="_blank" rel="noopener">${h(f.name)}</a>` : h(f.name)}</td><td class="muted small">${f.width && f.height ? `${f.width} x ${f.height}` : ''}</td><td class="muted small">${mb(f.size_bytes)}</td><td>${f.problem ? `<span class="small" style="color:#991b1b">${h(f.problem)}</span>` : ''}</td></tr>`;
  const fileList = (label, files) => `<details data-drive-folder style="margin-bottom:6px"><summary>${h(label)} <span class="muted small">${files.length} photo${files.length === 1 ? '' : 's'}${files.some(f => f.problem) ? `, ${files.filter(f => f.problem).length} with a problem` : ''}</span></summary>${files.length ? `<div class="tbl-wrap" style="margin-top:6px"><table class="tbl"><thead><tr><th>File</th><th>Dimensions</th><th>Size</th><th></th></tr></thead><tbody>${files.map(fileRow).join('')}</tbody></table></div>` : '<div class="muted small" style="margin:6px 0">Empty.</div>'}</details>`;

  let busyDrive = false, autoRead = false;
  const driveCall = async (path, opts) => {
    busyDrive = true; draw();
    try { S = await api(`${url}/${path}`, opts); onChange(); }
    catch (err) { toast(err.message, 'bad'); }
    busyDrive = false; draw();
  };
  // A read is free, so opening the tab reads the folder when the last read is over an hour old
  const maybeAutoRead = () => {
    const D = S && S.drive;
    if (autoRead || !D || !D.configured || !D.folder_valid) return;
    autoRead = true;
    const age = D.last_try_at ? Date.now() - new Date(D.last_try_at).getTime() : Infinity;
    if (age > 3600000 || D.stale_folder) driveCall('drive-read', { method: 'POST' });
  };

  // The labels, each with its full services, to paste into Claude after /gbp-photo-sort [Drive link],
  // so the skill names each folder exactly as here
  const photoSortText = I => [`Photo folder labels for ${I.business} (folder names, exact):`,
    ...I.groups.map(g => g.services.length > 1 || g.services[0] !== g.label ? `${g.label}: ${g.services.join(', ')}` : g.label),
    'Brand: team, van, premises, logo'].join('\n');
  const tooFew = () => { const F = S.plan && S.intake && S.intake.photosEntered && S.plan.tooFew; return F ? `<div class="notice bad" data-too-few style="margin-bottom:10px"><strong>${h(F.message)}</strong><ul style="margin:6px 0 0 18px">${F.unlock.map(u => `<li>${h(u)}</li>`).join('')}</ul></div>` : ''; };

  // ── 1. Photos ──
  const photosCard = () => {
    const I = S.intake, D = S.drive, O = S.record && S.record.output;
    let b = '';
    if (D) {
      const says = [...(D.problems || []), ...(D.notes || [])];
      b += `<label class="field" style="display:block;margin-bottom:10px"><span class="small" style="font-weight:500">The client's Drive photo folder</span><input class="input" style="width:100%" data-drive-input value="${attr(D.folder)}" placeholder="The Drive link of the folder holding GBP Photos – Posts"></label><div class="btn-row" style="margin-bottom:10px"><button class="btn btn-ghost" data-act="drive-save" ${busyDrive ? 'disabled' : ''}>Save folder</button>${D.folder ? `<button class="btn btn-ghost" data-act="drive-read" ${busyDrive || !D.configured ? 'disabled' : ''}>Read Drive</button>` : ''}<span class="muted small" data-drive-status>${busyDrive ? 'Reading Drive…' : D.folder && D.last_ok_at && !D.stale_folder ? `Read ${h(fmtDate(D.last_ok_at, true))}: ${D.total} photos` : D.folder ? 'Not read yet' : 'Typed counts are in use'}</span></div>`;
      if (!D.configured) b += '<div class="notice warn small" style="margin-bottom:10px">Copybot cannot read Drive on this server yet (GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON is not set), so the typed counts are in use.</div>';
      if (D.error) b += `<div class="notice bad small" data-drive-error style="margin-bottom:10px"><strong>The last read failed.</strong> ${h(D.error)}${D.active ? ' The list below is from the last good read.' : ' The typed counts are in use.'}</div>`;
      if (says.length) b += `<div class="notice warn small" data-drive-notes style="margin-bottom:10px"><ul style="margin:0 0 0 18px">${says.map(n => `<li>${h(n)}</li>`).join('')}</ul></div>`;
    }
    if (I) {
      const counted = D && D.active;
      b += `<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><div class="sec-title">Photos per service</div><span data-photo-sort>${copyBtn(photoSortText(I), 'Copy for photo sort')}</span></div><div class="muted small" style="margin-bottom:6px">${counted ? 'Counted from Drive.' : 'Save the Drive photo folder above and Copybot counts them, or type the counts.'} Each folder is GBP Photos – Posts / [the service name below]. 3 or more photos earns prompts of its own.${I.labelsLocked ? ' These names are locked to the saved prompts: they only change when you write the prompts again.' : ''}</div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Service</th><th>Photos</th></tr></thead><tbody>
      ${I.groups.map(g => `<tr><td>${h(g.label)}${g.services.length > 1 || g.services[0] !== g.label ? `<div class="muted small">${h(g.services.join(', '))}</div>` : ''}</td><td>${counted ? `<span data-drive-count="${attr(g.key)}">${h(g.photos)}</span>` : `<input class="input" type="number" min="0" style="width:72px" data-count="${attr(g.key)}" value="${I.photosEntered ? attr(g.photos) : ''}">`}</td></tr>`).join('')}
      <tr><td>Brand: team, van, premises, logo</td><td>${counted ? `<span data-drive-count="brand">${h(I.brand)}</span>` : `<input class="input" type="number" min="0" style="width:72px" data-f="brand" value="${I.photosEntered ? attr(I.brand) : ''}">`}</td></tr></tbody></table></div>
      ${counted ? '' : '<div class="btn-row" style="margin-top:8px"><button class="btn btn-ghost" data-act="save">Save counts</button></div>'}`;
    }
    if (D && (D.folders.length || D.drip.found)) b += `<div class="sec-title" style="margin-top:12px">What Drive holds</div>${D.folders.map(f => fileList(f.label, f.files)).join('')}${D.drip.found ? fileList(D.drip.label, D.drip.files) : ''}`;
    if (O && O.gaps) b += `<div class="sec-title" style="margin-top:12px">Photo gaps: send these to the client</div>${O.gaps.length ? `<div class="btn-row" style="margin-bottom:8px">${copyBtn(O.gaps.map(g => g.line).join('\n'), 'Copy all')}</div><ul style="margin:0 0 0 18px">${O.gaps.map(g => `<li>${h(g.line)}</li>`).join('')}</ul>` : pill('ok', 'No gaps')}`;
    return card({ title: '1. Photos', sub: 'Read from Drive. Copybot never changes Drive.', body: b || empty({ title: 'Nothing to show yet', text: S.error || '' }) });
  };

  // ── 2. Post settings ──
  const settingsCard = () => {
    const I = S.intake;
    if (!I) return card({ title: '2. Post settings', body: empty({ title: 'Nothing to build from yet', text: S.error || '' }) });
    const b = `<div class="notice" style="margin-bottom:10px"><div><strong>${h(I.business)}</strong> · ${h(I.niche)} · ${h(I.phone || 'no phone saved')}</div><div class="small" style="margin-top:4px">Areas: ${h(I.areas.join(', '))}</div><div class="small muted">${h(I.areasWhy)}</div><div class="small" style="margin-top:4px">USPs: ${h(I.usps.join('; ') || 'none confirmed')}</div><div class="small" style="margin-top:4px">Offer: ${h(I.offer || 'none')}${I.offerSource === 'free_quotes' ? ' <span class="muted">(the client has confirmed free quotes)</span>' : ''}</div><div class="small" style="margin-top:4px">Button: ${h(I.cta.line)} <span class="muted">(${h(I.cta.why)})</span></div></div>
      ${input('offer', 'Standing offer the client has confirmed', S.hand.offer, I.offerSource === 'free_quotes' ? 'Blank uses the free, no-obligation quote' : 'Leave blank for no Offer posts')}
      ${input('booking_url', 'Booking page', S.hand.booking_url, 'https://')}
      <label class="field" style="display:block;margin-bottom:10px"><span class="small" style="font-weight:500">Post button</span><select class="input" style="width:100%" data-f="cta_type">${['', 'Call Now', 'Book', 'Learn More'].map(c => `<option value="${attr(c)}" ${(S.hand.cta_type || '') === c ? 'selected' : ''}>${h(c || 'Choose for me')}</option>`).join('')}</select></label>
      ${input('tone', `Tone (now: ${I.tone})`, S.hand.tone, 'Leave blank to keep it')}
      ${input('avoid', 'Other things to avoid', S.hand.avoid, 'e.g. no prices')}
      <div class="btn-row"><button class="btn btn-ghost" data-act="save">Save</button></div>`;
    return card({ title: '2. Post settings', sub: 'Only change these if they apply', body: b });
  };

  // ── 3. Prompts ──
  const promptsCard = () => {
    const I = S.intake, R = S.record, P = S.plan, O = R && R.output;
    if (!I) return '';
    const notes = [...I.missing.map(m => `Needed: ${m}`), ...I.warnings.filter(w => !/Lead Snap/i.test(w)), ...(P && I.photosEntered ? P.notes : [])];
    let b = `<div class="btn-row" style="margin-bottom:10px"><button class="btn btn-primary" data-act="generate" ${S.running ? 'disabled' : ''}>${O ? 'Write the prompts again' : 'Write the prompts'}</button>${R && R.generated_at ? `<span class="muted small">Last written ${h(fmtDate(R.generated_at, true))}</span>` : ''}</div>`;
    if (S.running) b += running({ now: 'Writing the prompts', next: 'Then the checks run, then one test post from each prompt' });
    b += tooFew();
    if (notes.length) b += `<div class="notice warn" style="margin-bottom:10px"><ul style="margin:0 0 0 18px">${notes.map(n => `<li>${h(n)}</li>`).join('')}</ul></div>`;
    if (R && R.failure) b += `<div class="notice bad" style="margin-bottom:10px"><strong>${h(R.failure.error)}</strong><ul style="margin:6px 0 0 18px">${R.failure.fails.map(f => `<li>${h(f.message)}</li>`).join('')}</ul></div>`;
    if (R && (R.renames || []).length) b += `<div class="notice warn" style="margin-bottom:10px"><strong>Folders renamed.</strong> Rename them in Drive to match, then press Read Drive.<ul style="margin:6px 0 0 18px">${R.renames.map(r => `<li>${h(r.from)} to ${h(r.to)}</li>`).join('')}</ul></div>`;
    if (R && (R.flags || []).length) b += `<div class="notice warn" style="margin-bottom:10px"><ul style="margin:0 0 0 18px">${R.flags.map(f => `<li>${h(f.message)}</li>`).join('')}</ul></div>`;
    if (O) {
      const folders = [...new Set(O.prompts.map(p => p.folder))];
      b += folders.map(folder => {
        const list = O.prompts.filter(p => p.folder === folder);
        return `<details data-prompt-folder style="margin-bottom:6px"><summary><strong>${h(folder)}</strong> <span class="muted small">${list.length} prompt${list.length === 1 ? '' : 's'}, ${list[0].photos} photos</span></summary>${list.map(p => `<div style="margin:8px 0 0 12px"><div class="small" style="font-weight:500">Prompt ${p.n}: ${h(p.label)}${p.area ? ` <span class="muted">· ${h(p.area)}</span>` : ''}</div><div class="small" style="white-space:pre-wrap;margin-top:4px">${h(p.text)}</div></div>`).join('')}</details>`;
      }).join('');
    } else if (P && I.photosEntered) {
      b += `<div class="sec-title">The prompts this will write</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Prompt</th><th>Photo folder</th><th>Why</th></tr></thead><tbody>${P.prompts.map(p => `<tr><td>${p.n}</td><td>${h(p.label)}</td><td>${h(p.folder)} (${p.photos})</td><td class="muted small">${h(p.why)}</td></tr>`).join('')}</tbody></table></div>`;
    } else b += '<div class="muted small">Read the client\'s Drive folder (or type the counts) first. The prompts are worked out from the photos.</div>';
    return card({ title: '3. Prompts', sub: 'Written once per client. Every batch of posts below is written from these. Write them again when the client adds a service or sends new photos.', body: b });
  };

  const draw = () => {
    if (!S) return;
    if (S.fatal) { el.innerHTML = `<div class="card" style="margin-bottom:16px">${empty({ title: 'Photos and prompts could not load', text: S.error, action: '<button class="btn btn-ghost" data-act="reload">Retry</button>' })}</div>`; return; }
    el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;align-items:start;margin-bottom:16px"><div class="stack">${photosCard()}</div><div class="stack">${settingsCard()}${promptsCard()}</div></div>`;
  };

  const collect = () => {
    const body = { counts: {} };
    qa('[data-count]', el).forEach(i => { body.counts[i.dataset.count] = i.value; });
    qa('[data-f]', el).forEach(i => { body[i.dataset.f] = i.value; });
    return body;
  };
  const save = async () => { S = await api(`${url}/intake`, { method: 'PUT', body: collect() }); };
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b || !el.contains(b)) return;
    try {
      if (b.dataset.act === 'reload') return load();
      if (b.dataset.act === 'drive-read') return driveCall('drive-read', { method: 'POST' });
      if (b.dataset.act === 'drive-save') return driveCall('drive-folder', { method: 'PUT', body: { folder: el.querySelector('[data-drive-input]').value } });
      if (b.dataset.act === 'save') { await save(); draw(); onChange(); toast('Saved'); return; }
      if (b.dataset.act === 'generate') {
        await save();
        const renames = (S.intake && S.intake.pending && S.intake.pending.renames) || [];
        if (renames.length && !(await confirm({ title: renames.length === 1 ? 'This renames a photo folder' : `This renames ${renames.length} photo folders`, text: `${renames.map(r => `${r.from} becomes ${r.to}`).join('. ')}. The page map has changed, so the prompts will use the new names. Rename the folders in Drive to match, then press Read Drive.`, ok: 'Rename and write', danger: true }))) { draw(); return; }
        S.running = true; draw();
        S = await api(`${url}/generate`, { method: 'POST', body: { accept_renames: renames.length > 0 } }); draw(); onChange();
        if (S.record && S.record.failure) toast('The prompts failed their checks', 'bad');
      }
    } catch (err) { toast(err.message, 'bad'); load(); }
    return undefined;
  });
  wire(el);
  await load();
  maybeAutoRead();
  return { refresh: load };
}
