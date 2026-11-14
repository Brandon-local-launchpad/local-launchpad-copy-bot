// Images tab (13 Nov 2026, images/): a photo for every slot on every page. Code picks (images/pick.js); a
// person swaps and approves here; then each approved page's pictures are shrunk, uploaded and placed on the
// staging site, one page at a time. An empty slot stays empty and is listed.
import { h, attr, api, card, empty, failed, toast, confirm, dialog, busy, plural, fmtDate, pill } from '../ui.js';
import { renderHeroBrief } from './hero-brief.js';

const TYPE_LABEL = { homepage: 'Homepage', category: 'Category', service: 'Service', location: 'Location', location_category: 'Location category', town_service: 'Town service' };

export async function render(el, ctx) {
  const { clientId } = ctx;
  const isAdded = id => String(id).startsWith('up:');
  const thumb = id => (isAdded(id) ? `/api/clients/${clientId}/images/photo/${encodeURIComponent(id)}?size=thumb` : `/api/clients/${clientId}/gbp-posts/photo/${encodeURIComponent(id)}?size=thumb`);
  // A cropped slot is shown as it will look on the site
  const slotThumb = (page, s) => (s.crop ? `/api/clients/${clientId}/images/preview?identity=${encodeURIComponent(page.identity)}&slot=${encodeURIComponent(s.slot)}&width=320&v=${encodeURIComponent([s.pick, s.crop.x, s.crop.y, s.crop.w, s.crop.h].join('_'))}` : thumb(s.pick));
  // Two boxes that load by themselves: the hero graphic brief, then the pictures
  el.innerHTML = '<div id="heroBrief" style="margin-bottom:16px"></div><div id="imgMain"></div>';
  const main = el.querySelector('#imgMain');
  let S = null, filter = 'all', note = '', failedPlaces = [];

  const photoTip = p => [p.shows || p.name, p.score != null ? `Score ${p.score}` : 'No notes', p.width ? `${p.width} x ${p.height}` : ''].filter(Boolean).join(' · ');
  const slotHtml = (page, s) => {
    const p = s.pick ? S.photos[s.pick] : null;
    return `<div class="img-slot" style="width:150px">
      <div class="small muted" style="margin-bottom:4px">${h(s.label)}</div>
      ${p ? `<img src="${attr(slotThumb(page, s))}" alt="${attr(p.shows || p.name)}" title="${attr(photoTip(p))} · click to see it bigger" loading="lazy" data-view="${attr(s.pick)}" style="width:150px;height:100px;object-fit:${s.crop ? 'contain;background:#f1f1f1' : 'cover'};border-radius:6px;display:block;cursor:zoom-in">`
          : `<div class="small muted" title="${attr(s.why)}" style="width:150px;height:100px;border:1px dashed #c9c9c9;border-radius:6px;display:flex;align-items:center;justify-content:center;text-align:center;padding:6px;box-sizing:border-box">${s.graphic ? 'Site graphic' : 'Empty'}</div>`}
      <div style="margin-top:4px"><button class="btn btn-ghost btn-xs" data-swap="${attr(page.identity)}" data-slot="${attr(s.slot)}">${p ? 'Swap' : 'Choose'}</button>${p ? ` <button class="btn btn-ghost btn-xs" data-crop="${attr(page.identity)}" data-slot="${attr(s.slot)}">${s.crop ? 'Cropped' : 'Crop'}</button>` : ''}</div>
      ${p && (p.source === 'stock' || s.chosen) ? `<div class="small muted">${p.source === 'stock' ? 'stock photo' : p.source === 'client' ? 'added by hand' : 'chosen by hand'}</div>` : ''}
    </div>`;
  };
  const pageHtml = page => {
    // A hero on the site's graphic is only worth a line when the client asked for real photos
    const empties = page.slots.filter(s => !s.pick && (!s.graphic || S.summary.hero_choice === 'photo'));
    const state = page.approved ? pill('ok', 'approved') : page.changed_since_approval ? pill('warn', 'changed since approval') : '';
    return `<div class="img-page" style="padding:14px 0;border-top:1px solid #ececec">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        <strong>${h(page.title)}</strong><span class="small muted">${h(TYPE_LABEL[page.type] || page.type)} · ${h(page.path)}</span>${state}
        <span style="flex:1"></span>
        ${page.slots.some(s => s.pick) ? `<button class="btn btn-ghost btn-xs" data-approve="${attr(page.identity)}" data-on="${page.approved ? '0' : '1'}">${page.approved ? 'Un-approve' : 'Approve'}</button>` : ''}
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">${page.slots.map(s => slotHtml(page, s)).join('')}</div>
      ${empties.length ? `<p class="small muted" style="margin:8px 0 0">${empties.map(s => `${h(s.label)}: ${h(s.why)}`).join(' ')}</p>` : ''}
    </div>`;
  };

  const draw = () => {
    if (!S) return;
    const m = S.summary, d = S.drive;
    if (!d.read && !S.pages.length) {
      main.innerHTML = card({ title: 'Images', sub: 'A photo for every slot on every page.', body: empty({ title: 'Nothing to show yet', text: 'This client has no pages in the build yet. Generate the page map first.' }) });
      return;
    }
    const shown = S.pages.filter(p => filter === 'all' || (filter === 'empty' ? p.slots.some(s => !s.pick && !s.graphic) : filter === 'todo' ? !p.approved && p.slots.some(s => s.pick) : p.approved));
    const toPlace = S.pages.filter(p => p.approved);
    const canApproveAll = S.pages.some(p => !p.approved && p.slots.some(s => s.pick));
    const lines = [
      !d.read ? `The Drive photo folder has not been read${d.error ? ` (${d.error})` : ''}: set it and press Read Drive on the GBP Posts & Photos tab. Until then only photos you add by hand can be used.` : `${plural(m.usable, 'usable photo')} of ${m.photos}${m.added ? `, ${m.added} of them added by hand (${m.stock} stock)` : ' in Drive'}. ${d.notes ? `${m.with_notes} have notes from the photo sort.` : 'No photo notes file: photos are picked on size and shape only, and have no alt text. Run the photo sort again to get one.'}`,
      `${m.filled} slots filled, ${m.empty} empty, across ${plural(m.pages, 'page')}. ${m.approved} approved.`,
      m.hero_choice === 'photo' ? `Heroes: the client chose a real photo of their work. ${plural(m.heroes_photo, 'page')} ${m.heroes_photo === 1 ? 'has' : 'have'} one; ${m.heroes_graphic} show the site's graphic because there is no hero quality photo.`
        : m.hero_choice === 'illustration' ? 'Heroes: the client chose an illustration, so every page shows the site\'s graphic. A photo only goes in a hero if you choose one.'
          : 'Heroes: no answer on the onboarding form, so every page shows the site\'s graphic. A photo only goes in a hero if you choose one.',
      m.heroes_wanted && m.heroes_wanted.length ? `Ask the client for a wide, clean shot of the finished work for: ${m.heroes_wanted.join(', ')}.` : '',
      m.no_description ? `${plural(m.no_description, 'photo')} with no description will go up with empty alt text.` : '',
      m.services_with_no_folder.length ? `No photo folder for: ${m.services_with_no_folder.join(', ')}.` : '',
    ].filter(Boolean);
    const tabs = [['all', `All (${S.pages.length})`], ['todo', 'To approve'], ['empty', 'With an empty slot'], ['approved', `Approved (${m.approved})`]];
    main.innerHTML = card({ title: 'Images', sub: `${d.read ? `Read from Drive ${h(fmtDate(d.last_ok_at, true))}. ` : ''}Code picks; you swap, add and crop, then approve; then the approved pages go to the site.`, body: `
      ${lines.map(l => `<p class="small" style="margin:0 0 4px">${h(l)}</p>`).join('')}
      <div class="btn-row" style="margin-top:10px">
        ${canApproveAll ? '<button class="btn btn-ghost btn-sm" data-act="approve-all">Approve every page</button>' : ''}
        ${toPlace.length ? `<button class="btn btn-primary btn-sm" data-act="place">Place images on ${plural(toPlace.length, 'approved page')}</button>` : ''}
        <span class="small muted" id="imgNote">${h(note)}</span>
      </div>
      ${!S.site ? '<p class="small muted">No WordPress site connected yet: set it up on the Pages tab before placing.</p>' : ''}
      ${failedPlaces.length ? `<p class="small" style="margin:10px 0 2px"><strong>Not placed</strong></p><ul class="small" style="margin:0 0 0 18px">${failedPlaces.map(f => `<li>${h(f.title)}: ${h(f.why)}</li>`).join('')}</ul>` : ''}
      <div class="btn-row" style="margin-top:14px">${tabs.map(([k, l]) => `<button class="btn ${filter === k ? 'btn-primary' : 'btn-ghost'} btn-xs" data-filter="${k}">${h(l)}</button>`).join('')}</div>
      ${shown.length ? shown.map(pageHtml).join('') : '<p class="small muted" style="margin-top:14px">No pages here.</p>'}` });
  };

  const load = async () => {
    try { S = await api(`/api/clients/${clientId}/images`); draw(); }
    catch (err) { main.innerHTML = card({ title: 'Images', body: failed({ title: 'The images could not be loaded', reason: err.message }) }); }
  };

  // A photo at full size, with what the photo sort said about it (13 Nov, Brandon: the tiles are too small to judge)
  const full = id => (isAdded(id) ? `/api/clients/${clientId}/images/photo/${encodeURIComponent(id)}` : `/api/clients/${clientId}/gbp-posts/photo/${encodeURIComponent(id)}`);
  const openPhoto = id => {
    const p = S.photos[id]; if (!p) return;
    const facts = [
      p.kind === 'upload' ? (p.source === 'stock' ? 'A stock photo, added by hand' : 'Added by hand, from the client') : p.service ? `Folder: ${p.service}` : p.kind === 'drip' ? 'Photo Drip' : '',
      p.type ? `Type: ${p.type}` : '', p.score != null ? `Score: ${p.score} out of 10` : p.kind === 'upload' ? '' : 'No notes from the photo sort',
      p.noted ? `Hero: ${p.hero ? 'yes' : 'no'}` : '', p.width ? `${p.width} x ${p.height}px` : '', p.unusable ? `Can't be used: ${p.unusable}` : '',
    ].filter(Boolean);
    const dlg = dialog({ title: p.name, wide: true, body: `
      <img src="${attr(full(id))}" alt="${attr(p.shows || p.name)}" style="max-width:100%;max-height:68vh;display:block;margin:0 auto;border-radius:6px">
      ${p.kind === 'upload'
        ? `<div style="display:flex;gap:8px;align-items:center;margin:10px 0 2px"><strong class="small">Alt text:</strong><input class="input" id="altText" value="${attr(p.shows)}" placeholder="What does it show?" style="flex:1"><button class="btn btn-ghost btn-sm" data-savealt="${attr(id)}">Save</button><button class="btn btn-ghost btn-sm" data-writealt="${attr(id)}">Write it for me</button></div>`
        : `<p class="small" style="margin:10px 0 2px">${p.shows ? `<strong>Alt text:</strong> ${h(p.shows)}` : '<span class="muted">No description, so no alt text.</span>'}</p>`}
      <p class="small muted" style="margin:0">${facts.map(h).join(' · ')}${p.web_link ? ` · <a href="${attr(p.web_link)}" target="_blank" rel="noopener">Open in Drive</a>` : ''}</p>` });
    dlg.el.addEventListener('click', async e => {
      const w = e.target.closest('[data-writealt]');
      if (w) {
        try { await busy(w, 'Looking…', async () => { const r = await api(`/api/clients/${clientId}/images/alt/write`, { method: 'POST', body: { file_id: w.dataset.writealt } }); S = r; dlg.el.querySelector('#altText').value = r.alt; toast('Alt text written'); draw(); }); }
        catch (err) { toast(err.message, 'bad'); }
        return;
      }
      const b = e.target.closest('[data-savealt]'); if (!b) return;
      try { await busy(b, 'Saving…', async () => { S = await api(`/api/clients/${clientId}/images/alt`, { method: 'PUT', body: { file_id: b.dataset.savealt, alt: dlg.el.querySelector('#altText').value } }); toast('Saved'); draw(); }); }
      catch (err) { toast(err.message, 'bad'); }
    });
  };

  // Crop (13 Nov, Brandon: the owner photo's framing): drag a box over the part to keep. The box is kept per slot,
  // so the same photo can be cut differently on another page, and the site gets the cropped picture.
  const SHAPES = [['Free', 0], ['Owner photo 4:3', 4 / 3], ['Hero 16:9', 16 / 9], ['Landscape 3:2', 3 / 2], ['Square', 1], ['Portrait 4:5', 4 / 5]];
  const openCrop = (identity, slot) => {
    const page = S.pages.find(p => p.identity === identity), s = page.slots.find(x => x.slot === slot);
    let box = s.crop ? { ...s.crop } : null, ratio = 0, start = null;
    const dlg = dialog({ title: `Crop: ${page.title}, ${s.label}`, wide: true, body: `
      <p class="small muted" style="margin:0 0 8px">Drag a box over the part to keep. The site gets only what is inside it.</p>
      <div class="btn-row" style="margin-bottom:8px">${SHAPES.map(([l, r], i) => `<button class="btn ${i === 0 ? 'btn-primary' : 'btn-ghost'} btn-xs" data-shape="${r}">${h(l)}</button>`).join('')}</div>
      <div id="cropWrap" style="position:relative;display:inline-block;max-width:100%;overflow:hidden;user-select:none;touch-action:none;cursor:crosshair;line-height:0;border-radius:6px">
        <img id="cropImg" src="${attr(full(s.pick))}" draggable="false" alt="" style="max-width:100%;max-height:58vh;display:block">
        <div id="cropBox" style="position:absolute;border:2px solid #fff;box-shadow:0 0 0 9999px rgba(0,0,0,.5);display:none;pointer-events:none"></div>
      </div>
      <div class="btn-row" style="margin-top:10px"><button class="btn btn-primary btn-sm" data-cropact="save">Save crop</button><button class="btn btn-ghost btn-sm" data-cropact="clear">Remove crop</button><span class="small muted" id="cropNote"></span></div>` });
    const wrap = dlg.el.querySelector('#cropWrap'), boxEl = dlg.el.querySelector('#cropBox'), img = dlg.el.querySelector('#cropImg');
    const paint = () => {
      if (!box) { boxEl.style.display = 'none'; return; }
      const r = img.getBoundingClientRect();
      Object.assign(boxEl.style, { display: 'block', left: `${box.x * r.width}px`, top: `${box.y * r.height}px`, width: `${box.w * r.width}px`, height: `${box.h * r.height}px` });
    };
    img.addEventListener('load', paint);
    const at = e => { const r = img.getBoundingClientRect(); return { x: Math.min(Math.max(e.clientX - r.left, 0), r.width), y: Math.min(Math.max(e.clientY - r.top, 0), r.height), W: r.width, H: r.height }; };
    wrap.addEventListener('pointerdown', e => { e.preventDefault(); start = at(e); wrap.setPointerCapture(e.pointerId); });
    wrap.addEventListener('pointermove', e => {
      if (!start) return;
      const p = at(e);
      let w = Math.abs(p.x - start.x), hgt = Math.abs(p.y - start.y);
      // A fixed shape: the height follows the width, and both stay inside the photo
      if (ratio) {
        hgt = w / ratio;
        const roomX = p.x >= start.x ? p.W - start.x : start.x, roomY = p.y >= start.y ? p.H - start.y : start.y;
        if (w > roomX) { w = roomX; hgt = w / ratio; }
        if (hgt > roomY) { hgt = roomY; w = hgt * ratio; }
      }
      const x = p.x >= start.x ? start.x : start.x - w, y = p.y >= start.y ? start.y : start.y - hgt;
      box = { x: x / p.W, y: y / p.H, w: w / p.W, h: hgt / p.H };
      paint();
    });
    const end = () => { start = null; };
    wrap.addEventListener('pointerup', end); wrap.addEventListener('pointercancel', end);
    dlg.el.addEventListener('click', async e => {
      const sh = e.target.closest('[data-shape]');
      if (sh) { ratio = Number(sh.dataset.shape); dlg.el.querySelectorAll('[data-shape]').forEach(b => { b.className = `btn ${b === sh ? 'btn-primary' : 'btn-ghost'} btn-xs`; }); return; }
      const act = e.target.closest('[data-cropact]'); if (!act) return;
      try {
        const body = { identity, slot, crop: act.dataset.cropact === 'clear' ? null : box };
        if (act.dataset.cropact === 'save' && !box) { dlg.el.querySelector('#cropNote').textContent = 'Drag a box on the photo first.'; return; }
        await busy(act, 'Saving…', async () => { S = await api(`/api/clients/${clientId}/images/crop`, { method: 'PUT', body }); dlg.close(); draw(); });
      } catch (err) { toast(err.message, 'bad'); }
    });
  };

  // The swap dialog: the runners-up first, then every other usable photo; and "leave it empty"
  const openSwap = (identity, slot) => {
    const page = S.pages.find(p => p.identity === identity), s = page.slots.find(x => x.slot === slot);
    // A photo a person put in another slot stays there; one the code put there can be taken, and that slot picks again
    const onPage = new Set(page.slots.filter(x => x.slot !== slot && x.chosen && x.pick).map(x => x.pick));
    const usable = Object.entries(S.photos).filter(([id, p]) => !p.unusable && !onPage.has(id) && id !== s.pick);
    const first = s.runners.filter(id => S.photos[id] && !onPage.has(id));
    const added = usable.map(([id]) => id).filter(id => isAdded(id) && !first.includes(id));
    const rest = usable.map(([id]) => id).filter(id => !first.includes(id) && !isAdded(id)).sort((a, b) => (S.photos[b].score || 0) - (S.photos[a].score || 0));
    const tile = id => { const p = S.photos[id]; return `<div style="display:flex;flex-direction:column;align-items:flex-start"><button class="btn btn-ghost" data-pick="${attr(id)}" title="${attr(photoTip(p))} · click to use this photo" style="padding:4px;height:auto;display:flex;flex-direction:column;align-items:flex-start"><img src="${attr(thumb(id))}" alt="${attr(p.shows || p.name)}" loading="lazy" style="width:130px;height:88px;object-fit:cover;border-radius:4px;display:block"><span class="small muted" style="display:block;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h(p.kind === 'upload' ? (p.source === 'stock' ? 'stock' : 'from the client') : p.service || p.type || p.name)}${p.score != null ? ` · ${p.score}` : ''}</span></button><button class="btn btn-ghost btn-xs" data-view="${attr(id)}" style="margin:2px 0 0 4px">See it bigger</button></div>`; };
    const dlg = dialog({ title: `${page.title}: ${s.label}`, wide: true, body: `
      <div id="drop" style="border:2px dashed #b9b9b9;border-radius:8px;padding:14px;text-align:center;margin-bottom:14px">
        <div class="small"><strong>Drop a photo here</strong> to add it and put it in this slot, or <label class="btn btn-ghost btn-xs" style="cursor:pointer">choose a file<input type="file" id="upFile" accept="image/*" style="display:none"></label></div>
        <div style="margin-top:8px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><input class="input" id="upAlt" placeholder="Alt text: leave it blank and Copybot writes it" style="max-width:340px"><select class="input" id="upSource" style="max-width:170px"><option value="stock">A stock photo</option><option value="client">From the client</option></select></div>
        <div class="small muted" id="upNote" style="margin-top:6px">Any size up to 60 MB: Copybot shrinks it as it arrives.</div>
      </div>
      ${added.length ? `<p class="small"><strong>Photos you have added</strong></p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${added.map(tile).join('')}</div>` : ''}
      ${first.length ? `<p class="small"><strong>Next best for this slot</strong></p><div style="display:flex;gap:8px;flex-wrap:wrap">${first.map(tile).join('')}</div>` : ''}
      <p class="small" style="margin-top:12px"><strong>Every other photo</strong></p><div style="display:flex;gap:8px;flex-wrap:wrap;max-height:340px;overflow:auto">${rest.map(tile).join('') || '<span class="small muted">None.</span>'}</div>
      <div class="btn-row" style="margin-top:12px"><button class="btn btn-ghost btn-sm" data-pick="">Leave this slot empty</button></div>` });
    const drop = dlg.el.querySelector('#drop'), upNote = dlg.el.querySelector('#upNote');
    const sendFile = async file => {
      if (!file) return;
      if (!/^image\//.test(file.type || '')) { upNote.textContent = 'That is not a photo. Use a JPG, PNG or WebP.'; return; }
      upNote.textContent = `Adding ${file.name} (${(file.size / 1048576).toFixed(1)} MB)…`;
      try {
        const q = new URLSearchParams({ name: file.name, alt: dlg.el.querySelector('#upAlt').value, source: dlg.el.querySelector('#upSource').value, identity, slot, by: ctx.userName ? ctx.userName() : '' });
        const r = await fetch(`/api/clients/${clientId}/images/upload?${q}`, { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
        if (r.status === 401) { location.href = '/login.html'; return; }
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || `The photo was not added (${r.status}).`);
        S = j; dlg.close(); draw();
        toast(`Added: ${(j.added.original_bytes / 1048576).toFixed(1)} MB shrunk to ${Math.round(j.added.size_bytes / 1024)} KB.${j.added.alt_by === 'copybot' ? ` Alt text: ${j.added.alt}` : ''}${j.added.alt_error ? ` ${j.added.alt_error}` : ''}`, j.added.alt_error ? 'bad' : undefined);
      } catch (err) { upNote.textContent = err.message; toast(err.message, 'bad'); }
    };
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.style.borderColor = '#5b5bd6'; });
    drop.addEventListener('dragleave', () => { drop.style.borderColor = '#b9b9b9'; });
    drop.addEventListener('drop', e => { e.preventDefault(); drop.style.borderColor = '#b9b9b9'; sendFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });
    dlg.el.querySelector('#upFile').addEventListener('change', e => sendFile(e.target.files[0]));
    dlg.el.addEventListener('click', async e => {
      const big = e.target.closest('[data-view]'); if (big) { openPhoto(big.dataset.view); return; }
      const b = e.target.closest('[data-pick]'); if (!b) return;
      try { S = await api(`/api/clients/${clientId}/images/choice`, { method: 'PUT', body: { identity, slot, file_id: b.dataset.pick } }); dlg.close(); draw(); }
      catch (err) { toast(err.message, 'bad'); }
    });
  };

  el.addEventListener('click', async e => {
    const f = e.target.closest('[data-filter]'); if (f) { filter = f.dataset.filter; draw(); return; }
    const sw = e.target.closest('[data-swap]'); if (sw) { openSwap(sw.dataset.swap, sw.dataset.slot); return; }
    const cr = e.target.closest('[data-crop]'); if (cr) { openCrop(cr.dataset.crop, cr.dataset.slot); return; }
    const big = e.target.closest('[data-view]'); if (big) { openPhoto(big.dataset.view); return; }
    const who = ctx.userName ? ctx.userName() : '';
    try {
      const ap = e.target.closest('[data-approve]');
      if (ap) { await busy(ap, 'Saving…', async () => { S = await api(`/api/clients/${clientId}/images/approve`, { method: 'POST', body: { identity: ap.dataset.approve, approved: ap.dataset.on === '1', by: who } }); draw(); }); return; }
      const act = e.target.closest('[data-act]'); if (!act) return;
      if (act.dataset.act === 'approve-all') {
        const n = S.pages.filter(p => !p.approved && p.slots.some(s => s.pick)).length;
        if (!(await confirm({ title: `Approve the pictures on ${plural(n, 'page')}?`, text: 'Only do this once you have looked down the list. Empty slots stay empty.', ok: 'Approve them' }))) return;
        await busy(act, 'Saving…', async () => { S = await api(`/api/clients/${clientId}/images/approve`, { method: 'POST', body: { identity: '*', approved: true, by: who } }); draw(); });
      }
      if (act.dataset.act === 'place') {
        const pages = S.pages.filter(p => p.approved);
        if (!S.site) { toast('Connect the WordPress site on the Pages tab first.', 'bad'); return; }
        if (!(await confirm({ title: `Place images on ${plural(pages.length, 'page')} on ${S.site.url}?`, text: 'Each photo is shrunk, uploaded to the media library once, and put in its slot. This writes to the staging site. Empty slots are not touched, and nothing is deleted.', ok: 'Place them' }))) return;
        act.disabled = true; failedPlaces = [];
        let done = 0, uploaded = 0;
        for (const [i, pg] of pages.entries()) {
          const n = el.querySelector('#imgNote'); if (n) n.textContent = `Placing ${i + 1} of ${pages.length}: ${pg.title}`;
          try {
            const r = await api(`/api/clients/${clientId}/images/place`, { method: 'POST', body: { identity: pg.identity, confirm: true } });
            uploaded += r.uploaded || 0;
            if (r.ok) done++; else failedPlaces.push({ title: pg.title, why: (r.refusals && r.refusals[0]) || r.error || (r.skipped && r.skipped[0]) || (r.mismatches && r.mismatches.length ? `${r.mismatches.length} field(s) read back differently` : 'not placed') });
          } catch (err) { failedPlaces.push({ title: pg.title, why: err.message }); }
        }
        note = `${done} of ${pages.length} placed, ${plural(uploaded, 'photo')} uploaded${failedPlaces.length ? `, ${failedPlaces.length} with a problem` : ''}.`;
        toast(failedPlaces.length ? 'Not every page was placed' : 'Images placed', failedPlaces.length ? 'bad' : undefined);
        draw();
      }
    } catch (err) { toast(err.message, 'bad'); }
  });

  main.innerHTML = card({ title: 'Images', body: '<p class="small muted">Loading…</p>' });
  renderHeroBrief(el.querySelector('#heroBrief'), ctx).catch(err => console.error('[hero-brief]', err));
  await load();
}
