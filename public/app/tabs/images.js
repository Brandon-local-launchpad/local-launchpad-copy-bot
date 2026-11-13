// Images tab (13 Nov 2026, images/): a photo for every slot on every page. Code picks (images/pick.js); a
// person swaps and approves here; then each approved page's pictures are shrunk, uploaded and placed on the
// staging site, one page at a time. An empty slot stays empty and is listed.
import { h, attr, api, card, empty, failed, toast, confirm, dialog, busy, plural, fmtDate, pill } from '../ui.js';

const TYPE_LABEL = { homepage: 'Homepage', category: 'Category', service: 'Service', location: 'Location', location_category: 'Location category', town_service: 'Town service' };

export async function render(el, ctx) {
  const { clientId } = ctx;
  const thumb = id => `/api/clients/${clientId}/gbp-posts/photo/${encodeURIComponent(id)}?size=thumb`;
  let S = null, filter = 'all', note = '', failedPlaces = [];

  const photoTip = p => [p.shows || p.name, p.score != null ? `Score ${p.score}` : 'No notes', p.width ? `${p.width} x ${p.height}` : ''].filter(Boolean).join(' · ');
  const slotHtml = (page, s) => {
    const p = s.pick ? S.photos[s.pick] : null;
    return `<div class="img-slot" style="width:150px">
      <div class="small muted" style="margin-bottom:4px">${h(s.label)}</div>
      ${p ? `<img src="${attr(thumb(s.pick))}" alt="${attr(p.shows || p.name)}" title="${attr(photoTip(p))} · click to see it bigger" loading="lazy" data-view="${attr(s.pick)}" style="width:150px;height:100px;object-fit:cover;border-radius:6px;display:block;cursor:zoom-in">`
          : `<div class="small muted" title="${attr(s.why)}" style="width:150px;height:100px;border:1px dashed #c9c9c9;border-radius:6px;display:flex;align-items:center;justify-content:center;text-align:center;padding:6px;box-sizing:border-box">${s.graphic ? 'Site graphic' : 'Empty'}</div>`}
      <div style="margin-top:4px"><button class="btn btn-ghost btn-xs" data-swap="${attr(page.identity)}" data-slot="${attr(s.slot)}">${p ? 'Swap' : 'Choose'}</button>${s.chosen ? ' <span class="small muted">by hand</span>' : ''}</div>
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
    if (!d.read) {
      el.innerHTML = card({ title: 'Images', sub: 'A photo for every slot on every page.', body: empty({ title: 'The Drive photo folder has not been read', text: d.error ? d.error : 'Set the client\'s Drive photo folder and press Read Drive on the GBP Posts & Photos tab. Then come back here.' }) });
      return;
    }
    const shown = S.pages.filter(p => filter === 'all' || (filter === 'empty' ? p.slots.some(s => !s.pick && !s.graphic) : filter === 'todo' ? !p.approved && p.slots.some(s => s.pick) : p.approved));
    const toPlace = S.pages.filter(p => p.approved);
    const canApproveAll = S.pages.some(p => !p.approved && p.slots.some(s => s.pick));
    const lines = [
      `${plural(m.usable, 'usable photo')} of ${m.photos} in Drive. ${d.notes ? `${m.with_notes} have notes from the photo sort.` : 'No photo notes file: photos are picked on size and shape only, and have no alt text. Run the photo sort again to get one.'}`,
      `${m.filled} slots filled, ${m.empty} empty, across ${plural(m.pages, 'page')}. ${m.approved} approved.`,
      m.hero_choice === 'photo' ? `Heroes: the client chose a real photo of their work. ${plural(m.heroes_photo, 'page')} ${m.heroes_photo === 1 ? 'has' : 'have'} one; ${m.heroes_graphic} show the site's graphic because there is no hero quality photo.`
        : m.hero_choice === 'illustration' ? 'Heroes: the client chose an illustration, so every page shows the site\'s graphic. A photo only goes in a hero if you choose one.'
          : 'Heroes: no answer on the onboarding form, so every page shows the site\'s graphic. A photo only goes in a hero if you choose one.',
      m.heroes_wanted && m.heroes_wanted.length ? `Ask the client for a wide, clean shot of the finished work for: ${m.heroes_wanted.join(', ')}.` : '',
      m.no_description ? `${plural(m.no_description, 'photo')} with no description will go up with empty alt text.` : '',
      m.services_with_no_folder.length ? `No photo folder for: ${m.services_with_no_folder.join(', ')}.` : '',
    ].filter(Boolean);
    const tabs = [['all', `All (${S.pages.length})`], ['todo', 'To approve'], ['empty', 'With an empty slot'], ['approved', `Approved (${m.approved})`]];
    el.innerHTML = card({ title: 'Images', sub: `Read from Drive ${h(fmtDate(d.last_ok_at, true))}. Code picks; you swap and approve; then the approved pages go to the site.`, body: `
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
    catch (err) { el.innerHTML = card({ title: 'Images', body: failed({ title: 'The images could not be loaded', reason: err.message }) }); }
  };

  // A photo at full size, with what the photo sort said about it (13 Nov, Brandon: the tiles are too small to judge)
  const full = id => `/api/clients/${clientId}/gbp-posts/photo/${encodeURIComponent(id)}`;
  const openPhoto = id => {
    const p = S.photos[id]; if (!p) return;
    const facts = [
      p.service ? `Folder: ${p.service}` : p.kind === 'drip' ? 'Photo Drip' : '',
      p.type ? `Type: ${p.type}` : '', p.score != null ? `Score: ${p.score} out of 10` : 'No notes from the photo sort',
      p.noted ? `Hero: ${p.hero ? 'yes' : 'no'}` : '', p.width ? `${p.width} x ${p.height}px` : '', p.unusable ? `Can't be used: ${p.unusable}` : '',
    ].filter(Boolean);
    dialog({ title: p.name, wide: true, body: `
      <img src="${attr(full(id))}" alt="${attr(p.shows || p.name)}" style="max-width:100%;max-height:68vh;display:block;margin:0 auto;border-radius:6px">
      <p class="small" style="margin:10px 0 2px">${p.shows ? `<strong>Alt text:</strong> ${h(p.shows)}` : '<span class="muted">No description, so no alt text.</span>'}</p>
      <p class="small muted" style="margin:0">${facts.map(h).join(' · ')}${p.web_link ? ` · <a href="${attr(p.web_link)}" target="_blank" rel="noopener">Open in Drive</a>` : ''}</p>` });
  };

  // The swap dialog: the runners-up first, then every other usable photo; and "leave it empty"
  const openSwap = (identity, slot) => {
    const page = S.pages.find(p => p.identity === identity), s = page.slots.find(x => x.slot === slot);
    // A photo a person put in another slot stays there; one the code put there can be taken, and that slot picks again
    const onPage = new Set(page.slots.filter(x => x.slot !== slot && x.chosen && x.pick).map(x => x.pick));
    const usable = Object.entries(S.photos).filter(([id, p]) => !p.unusable && !onPage.has(id) && id !== s.pick);
    const first = s.runners.filter(id => S.photos[id] && !onPage.has(id));
    const rest = usable.map(([id]) => id).filter(id => !first.includes(id)).sort((a, b) => (S.photos[b].score || 0) - (S.photos[a].score || 0));
    const tile = id => { const p = S.photos[id]; return `<div style="display:flex;flex-direction:column;align-items:flex-start"><button class="btn btn-ghost" data-pick="${attr(id)}" title="${attr(photoTip(p))} · click to use this photo" style="padding:4px;height:auto;display:flex;flex-direction:column;align-items:flex-start"><img src="${attr(thumb(id))}" alt="${attr(p.shows || p.name)}" loading="lazy" style="width:130px;height:88px;object-fit:cover;border-radius:4px;display:block"><span class="small muted" style="display:block;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h(p.service || p.type || p.name)}${p.score != null ? ` · ${p.score}` : ''}</span></button><button class="btn btn-ghost btn-xs" data-view="${attr(id)}" style="margin:2px 0 0 4px">See it bigger</button></div>`; };
    const dlg = dialog({ title: `${page.title}: ${s.label}`, wide: true, body: `
      ${first.length ? `<p class="small"><strong>Next best for this slot</strong></p><div style="display:flex;gap:8px;flex-wrap:wrap">${first.map(tile).join('')}</div>` : ''}
      <p class="small" style="margin-top:12px"><strong>Every other photo</strong></p><div style="display:flex;gap:8px;flex-wrap:wrap;max-height:340px;overflow:auto">${rest.map(tile).join('') || '<span class="small muted">None.</span>'}</div>
      <div class="btn-row" style="margin-top:12px"><button class="btn btn-ghost btn-sm" data-pick="">Leave this slot empty</button></div>` });
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

  el.innerHTML = card({ title: 'Images', body: '<p class="small muted">Loading…</p>' });
  await load();
}
