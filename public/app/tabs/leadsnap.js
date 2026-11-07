// Lead Snap tab (5 Nov 2026): the ready to paste autopost config. Left: Generate, what is
// missing, the photo counts and the other typed fields. Right: the config in Lead Snap's screen
// order, each prompt with its Copy button and photo folder. Set once per client; Generate again
// when a client adds a service or sends new photos. Drive (7 Nov 2026): with the Drive photo folder
// read, the counts and file lists are real; the typed counts stay as the fallback.

import { h, attr, api, card, copyBtn, toast, confirm, running, empty, fmtDate, pill, wire, qa } from '../ui.js';

export async function render(el, ctx) {
  const { clientId } = ctx;
  const url = `/api/clients/${clientId}/lead-snap`;
  let S = null;
  const load = async () => { try { S = await api(url); } catch (e) { S = { error: e.message, fatal: true }; } draw(); };

  const row = (name, text, meta = '') => `<div class="field" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><span style="font-weight:500">${h(name)}</span><span class="btn-row"><span class="muted small">${h(meta)}</span>${copyBtn(text)}</span></div><div style="white-space:pre-wrap;margin-top:4px">${h(text)}</div></div>`;
  const input = (key, label, value, placeholder = '') => `<label class="field" style="display:block;margin-bottom:10px"><span class="small" style="font-weight:500">${h(label)}</span><input class="input" style="width:100%" data-f="${attr(key)}" value="${attr(value || '')}" placeholder="${attr(placeholder)}"></label>`;

  const mb = n => `${(n / 1024 / 1024).toFixed(1)} MB`;
  const fileRow = f => `<tr data-drive-file><td>${f.web_link ? `<a href="${attr(f.web_link)}" target="_blank" rel="noopener">${h(f.name)}</a>` : h(f.name)}</td><td class="muted small">${f.width && f.height ? `${f.width} x ${f.height}` : ''}</td><td class="muted small">${mb(f.size_bytes)}</td><td>${f.problem ? `<span class="small" style="color:#991b1b">${h(f.problem)}</span>` : ''}</td></tr>`;
  const fileList = (label, files) => `<details data-drive-folder style="margin-bottom:6px"><summary>${h(label)} <span class="muted small">${files.length} photo${files.length === 1 ? '' : 's'}${files.some(f => f.problem) ? `, ${files.filter(f => f.problem).length} with a problem` : ''}</span></summary>${files.length ? `<div class="tbl-wrap" style="margin-top:6px"><table class="tbl"><thead><tr><th>File</th><th>Dimensions</th><th>Size</th><th></th></tr></thead><tbody>${files.map(fileRow).join('')}</tbody></table></div>` : '<div class="muted small" style="margin:6px 0">Empty.</div>'}</details>`;

  // The Drive card: its own errors show here, and the typed counts carry on working underneath
  const driveCard = () => {
    const D = S.drive; if (!D) return '';
    const says = [...(D.problems || []), ...(D.notes || [])];
    let b = `<label class="field" style="display:block;margin-bottom:10px"><span class="small" style="font-weight:500">Drive photo folder</span><input class="input" style="width:100%" data-drive-input value="${attr(D.folder)}" placeholder="The Drive link of the folder holding GBP Photos – Posts"></label><div class="btn-row" style="margin-bottom:10px"><button class="btn btn-ghost" data-act="drive-save" ${busyDrive ? 'disabled' : ''}>Save folder</button>${D.folder ? `<button class="btn btn-ghost" data-act="drive-read" ${busyDrive || !D.configured ? 'disabled' : ''}>Read Drive</button>` : ''}<span class="muted small" data-drive-status>${busyDrive ? 'Reading Drive…' : D.folder && D.last_ok_at && !D.stale_folder ? `Read ${h(fmtDate(D.last_ok_at, true))}: ${D.total} photos` : D.folder ? 'Not read yet' : 'Typed counts are in use'}</span></div>`;
    if (!D.configured) b += '<div class="notice warn small" style="margin-bottom:10px">Copybot cannot read Drive on this server yet (GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON is not set), so the typed counts are in use.</div>';
    if (D.error) b += `<div class="notice bad small" data-drive-error style="margin-bottom:10px"><strong>The last read failed.</strong> ${h(D.error)}${D.active ? ' The list below is from the last good read.' : ' The typed counts are in use.'}</div>`;
    if (says.length) b += `<div class="notice warn small" data-drive-notes style="margin-bottom:10px"><ul style="margin:0 0 0 18px">${says.map(n => `<li>${h(n)}</li>`).join('')}</ul></div>`;
    if (D.folders.length || D.drip.found) b += D.folders.map(f => fileList(f.label, f.files)).join('') + (D.drip.found ? fileList(D.drip.label, D.drip.files) : '');
    return card({ title: 'Photos in Drive', sub: 'Read only. Copybot never changes Drive.', body: b });
  };
  let busyDrive = false, autoRead = false;
  const driveCall = async (path, opts) => {
    busyDrive = true; draw();
    try { S = await api(`${url}/${path}`, opts); }
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

  // Too few prompts: the plan as it stands now, so it clears as soon as new photo counts are saved
  const tooFew = () => { const F = S.plan && S.intake && S.intake.photosEntered && S.plan.tooFew; return F ? `<div class="notice bad" data-too-few style="margin-bottom:10px"><strong>${h(F.message)}</strong><ul style="margin:6px 0 0 18px">${F.unlock.map(u => `<li>${h(u)}</li>`).join('')}</ul></div>` : ''; };

  // Preview posts: the button with its cost, and what the last run found
  const previewBar = () => {
    const P = S.preview || {}, E = P.estimate, L = P.saved;
    if (!E) return '';
    const last = L ? `Last preview ${h(fmtDate(L.at, true))}: ${L.summary.clean} of ${L.summary.samples} samples clean, ${L.summary.warned} with warnings${L.summary.claim_failed ? `, <strong style="color:#991b1b">${L.summary.claim_failed} with an unconfirmed claim</strong>` : ''}${L.summary.failed ? `, ${L.summary.failed} failed` : ''}${L.summary.opening_pairs ? `. ${L.summary.opening_pairs} pairs of posts from different prompts share an opening` : ''}. It cost ${L.pence}p.` : '';
    return `<div class="notice" data-preview-bar style="margin-bottom:10px"><div class="btn-row"><button class="btn btn-ghost" data-act="preview" ${P.running ? 'disabled' : ''}>${L ? 'Preview posts again' : 'Preview posts'}</button><span class="small">${E.samples} sample posts (${E.per_prompt} per prompt), about ${E.pence}p. Nothing goes to Lead Snap.</span></div>${P.running ? `<div style="margin-top:8px">${running({ now: 'Writing the sample posts', next: 'Then each one is checked' })}</div>` : ''}${last ? `<div class="small" style="margin-top:6px">${last}</div>` : ''}${L && L.areas && !P.stale ? `<div class="small muted" style="margin-top:4px" data-area-spread>Towns named across the samples: ${Object.entries(L.areas.named).filter(([, n]) => n).map(([t, n]) => `${h(t)} ${n}`).join(', ')}. ${L.areas.on_area} of ${L.areas.samples} name their own area.</div>` : ''}${P.stale ? '<div class="small" style="margin-top:4px;color:#b45309">These samples are from an earlier config. Preview again to test this one.</div>' : ''}</div>`;
  };
  const samplesFor = n => {
    const L = S.preview && S.preview.saved; const p = L && L.prompts.find(x => x.n === n);
    if (!p || S.preview.stale) return '';
    const one = s => s.error ? `<div class="notice bad small" style="margin-bottom:6px">Sample ${s.n} failed: ${h(s.error)}</div>` : `<details style="margin-bottom:6px" data-sample><summary>Sample ${s.n} · ${s.words} words ${s.fails ? pill('block', 'FAIL: unconfirmed claim') : pill(s.warnings ? 'wait' : 'ok', s.warnings ? `${s.warnings} to check` : 'pass')}</summary><div style="white-space:pre-wrap;margin:6px 0">${h(s.text)}</div><div style="display:flex;gap:6px;justify-content:flex-end">${copyBtn(s.text)}</div><ul class="small" style="margin:6px 0 0;padding:0;list-style:none">${s.checks.map(c => `<li>${pill(c.level === 'fail' ? 'block' : c.level === 'warn' ? 'wait' : 'ok', c.level)} ${h(c.label)}${c.detail ? `: <span class="muted">${h(c.detail)}</span>` : ''}</li>`).join('')}</ul></details>`;
    return `<div class="sec-title">Sample posts</div>${p.samples.map(one).join('')}`;
  };

  const folderAlike = folder => {
    const L = S.preview && S.preview.saved;
    const f = L && !S.preview.stale && (L.folders || []).find(x => x.folder === folder);
    if (!f) return '';
    const open = f.warnings.length ? `<div class="notice warn" data-folder-alike style="margin-bottom:10px"><strong>Prompts in this folder open the same way.</strong> P3.1 means prompt 3, sample 1.<ul style="margin:4px 0 0 18px">${f.warnings.map(w => `<li>${h(w.message)}</li>`).join('')}</ul></div>` : '';
    const info = f.phrase_pairs ? `<div class="muted small" data-folder-phrases style="margin-bottom:10px">For information: leaving out facts and calls to action, ${f.phrase_pairs} of ${f.compared} pairs share 8 or more words in a row, the longest ${f.longest}.</div>` : '';
    return open + info;
  };

  // Copy for photo sort (7 Nov 2026): the labels, each with its full services, to paste into
  // Claude after /gbp-photo-sort [Drive link], so the skill names each folder exactly as here
  const photoSortText = I => [`Lead Snap labels for ${I.business} (folder names, exact):`,
    ...I.groups.map(g => g.services.length > 1 || g.services[0] !== g.label ? `${g.label}: ${g.services.join(', ')}` : g.label),
    'Brand: team, van, premises, logo'].join('\n');

  const generateCard = () => {
    const I = S.intake, R = S.record, P = S.plan, done = R && R.sheet;
    if (!I) return empty({ title: 'Nothing to build from yet', text: S.error || '' });
    const notes = [...I.missing.map(m => `Needed: ${m}`), ...I.warnings, ...(P && I.photosEntered ? P.notes : [])];
    let b = `<div class="btn-row" style="margin-bottom:10px"><button class="btn btn-primary" data-act="generate" ${S.running ? 'disabled' : ''}>${done ? 'Generate again' : 'Generate config'}</button>${R && R.generated_at ? `<span class="muted small">Last run ${h(fmtDate(R.generated_at, true))}</span>` : ''}</div>`;
    if (S.running) b += running({ now: 'Writing the prompts', next: "Then the checks run, then a test post from each prompt for its Don't start with line" });
    b += tooFew();
    if (notes.length) b += `<div class="notice warn" style="margin-bottom:10px"><ul style="margin:0 0 0 18px">${notes.map(n => `<li>${h(n)}</li>`).join('')}</ul></div>`;
    if (R && R.failure) b += `<div class="notice bad" style="margin-bottom:10px"><strong>${h(R.failure.error)}</strong><ul style="margin:6px 0 0 18px">${R.failure.fails.map(f => `<li>${h(f.message)}</li>`).join('')}</ul></div>`;
    b += `<div class="notice" style="margin-bottom:10px"><div><strong>${h(I.business)}</strong> · ${h(I.niche)} · ${h(I.phone || 'no phone saved')}</div><div class="small" style="margin-top:4px">Areas: ${h(I.areas.join(', '))}</div><div class="small muted">${h(I.areasWhy)}</div><div class="small" style="margin-top:4px">USPs: ${h(I.usps.join('; ') || 'none confirmed')}</div><div class="small" style="margin-top:4px">Offer: ${h(I.offer || 'none')}${I.offerSource === 'free_quotes' ? ' <span class="muted">(the client has confirmed free quotes)</span>' : ''}</div><div class="small" style="margin-top:4px">Call to action: ${h(I.cta.line)} <span class="muted">(${h(I.cta.why)})</span></div></div>`;
    b += `<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><div class="sec-title">Photos per service</div><span data-photo-sort>${copyBtn(photoSortText(I), 'Copy for photo sort')}</span></div><div class="muted small" style="margin-bottom:6px">${S.drive && S.drive.active ? 'Counted from Drive.' : 'Type how many photos each folder holds, or save the Drive photo folder and Copybot counts them.'} Each folder is GBP Photos – Posts / [the service name below]. ${I.groups.length} whole services from the page map, highest value first. 3 or more earns prompts of its own.${I.labelsLocked ? ' These names are locked to the saved config: they only change when you press Generate again.' : ''}</div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Service</th><th>Photos</th></tr></thead><tbody>
      ${I.groups.map(g => `<tr><td>${h(g.label)}${g.services.length > 1 || g.services[0] !== g.label ? `<div class="muted small">${h(g.services.join(', '))}</div>` : ''}</td><td>${S.drive && S.drive.active ? `<span data-drive-count="${attr(g.key)}">${h(g.photos)}</span>` : `<input class="input" type="number" min="0" style="width:72px" data-count="${attr(g.key)}" value="${I.photosEntered ? attr(g.photos) : ''}">`}</td></tr>`).join('')}
      <tr><td>Brand: team, van, premises, logo</td><td>${S.drive && S.drive.active ? `<span data-drive-count="brand">${h(I.brand)}</span>` : `<input class="input" type="number" min="0" style="width:72px" data-f="brand" value="${I.photosEntered ? attr(I.brand) : ''}">`}</td></tr></tbody></table></div>
      <div class="sec-title">Only if they apply</div>
      ${input('offer', 'Standing offer the client has confirmed', S.hand.offer, I.offerSource === 'free_quotes' ? 'Blank uses the free, no-obligation quote' : 'Leave blank for no offer prompt')}
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
    const moved = (R.renames || []).length ? `<div class="notice warn" style="margin-bottom:10px"><strong>Folders renamed in this config.</strong> Rename them in Drive and reselect their photos in Lead Snap.<ul style="margin:6px 0 0 18px">${R.renames.map(r => `<li>${h(r.from)} to ${h(r.to)}</li>`).join('')}</ul></div>` : '';
    const out = [card({ title: 'Settings', sub: 'Set these first', actions: copyBtn(R.sheet, 'Copy whole config'), body: tooFew() + moved + previewBar() + flags + row('Frequency', O.settings.frequency) + row('Call to action', O.settings.cta) })];
    // One card per photo folder: the VA selects its photos once and reuses them for every prompt in it
    const folders = [...new Set(O.prompts.map(p => p.folder))];
    for (const folder of folders) {
      const list = O.prompts.filter(p => p.folder === folder);
      const body = `<div class="notice" style="margin-bottom:10px;display:flex;justify-content:space-between;gap:8px;align-items:baseline"><span>Select these ${list[0].photos} photos once and reuse them for ${list.length === 1 ? 'this prompt' : `these ${list.length} prompts`}. Tone: ${h(list[0].tone)}</span>${copyBtn(folder, 'Copy folder')}</div>${folderAlike(folder)}` + list.map(p => row(`Prompt ${p.n}: ${p.label}`, p.text, [p.area, `${p.chars} characters`].filter(Boolean).join(' · ')) + samplesFor(p.n)).join('<hr style="border:0;border-top:1px solid var(--border);margin:12px 0">');
      out.push(card({ title: folder, sub: `${list.length} prompt${list.length === 1 ? '' : 's'}`, cls: 'ls-folder', body }));
    }
    out.push(card({ title: 'Photo gaps', sub: 'Send these to the client', body: O.gaps.length ? `<div class="btn-row" style="margin-bottom:8px">${copyBtn(O.gaps.map(g => g.line).join('\n'), 'Copy all')}</div><ul style="margin:0 0 0 18px">${O.gaps.map(g => `<li>${h(g.line)}</li>`).join('')}</ul>` : pill('ok', 'No gaps') }));
    out.push(card({ title: 'VA checklist', sub: 'Lead Snap writes the first post as soon as you save, so read that one before leaving it running', body: `<ul style="margin:0;list-style:none;padding:0">${O.checklist.map(c => `<li><label><input type="checkbox"> ${h(c)}</label></li>`).join('')}</ul>` }));
    return out.join('');
  };

  const draw = () => {
    if (!S) return;
    if (S.fatal) { el.innerHTML = `<div class="card">${empty({ title: 'The Lead Snap tab could not load', text: S.error, action: '<button class="btn btn-ghost" data-act="reload">Retry</button>' })}</div>`; return; }
    el.innerHTML = `<div class="grid grid-2" style="align-items:start"><div class="stack">${card({ title: 'Generate', sub: 'The autopost config, set once per client', body: generateCard() })}${driveCard()}${planCard()}</div><div class="stack">${outputCards()}</div></div>`;
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
      if (b.dataset.act === 'drive-read') return driveCall('drive-read', { method: 'POST' });
      if (b.dataset.act === 'drive-save') return driveCall('drive-folder', { method: 'PUT', body: { folder: el.querySelector('[data-drive-input]').value } });
      if (b.dataset.act === 'save') { await save(); draw(); toast('Saved'); return; }
      if (b.dataset.act === 'preview') {
        S.preview.running = true; draw();
        S = await api(`${url}/preview`, { method: 'POST' }); draw();
        toast('Preview finished');
        return;
      }
      if (b.dataset.act === 'generate') {
        await save();
        const renames = (S.intake && S.intake.pending && S.intake.pending.renames) || [];
        if (renames.length && !(await confirm({ title: renames.length === 1 ? 'This renames a folder' : `This renames ${renames.length} folders`, text: `${renames.map(r => `${r.from} becomes ${r.to}`).join('. ')}. The page map has changed, so the config will use the new names. Rename the folders in Drive and reselect their photos in Lead Snap. The photo counts carry over.`, ok: 'Rename and generate', danger: true }))) { draw(); return; }
        S.running = true; draw();
        S = await api(`${url}/generate`, { method: 'POST', body: { accept_renames: renames.length > 0 } }); draw();
        if (S.record && S.record.failure) toast('The config failed its checks', 'bad');
      }
    } catch (err) { toast(err.message, 'bad'); load(); }
  });
  wire(el);
  await load();
  maybeAutoRead();
}
