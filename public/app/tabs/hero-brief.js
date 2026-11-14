// The hero graphic brief (14 Nov 2026, hero-brief/): the card at the top of the Images tab. For a hero that
// is a graphic, a person makes the picture in ChatGPT; this fills the brief and the prompt from the record so
// they copy one text and paste it. The three brand colours are typed here: nothing else in Copybot holds them.
import { h, attr, api, card, failed, toast, pill, fmtDate, copyText } from '../ui.js';

export async function renderHeroBrief(el, ctx) {
  const { clientId } = ctx;
  let V = null, open = null;

  const field = key => V.fields[key];
  const meta = key => {
    const f = field(key);
    const back = f.typed && f.record != null && f.record !== '' ? ` <button class="btn btn-ghost btn-xs" data-reset="${attr(key)}">Use the usual</button>` : '';
    return f.source || back ? `<div class="small muted" style="margin-top:2px">${h(f.source)}${back}</div>` : '';
  };
  const input = (key, placeholder = '') => `<div class="field"><label>${h(field(key).label)}</label><input class="input" data-f="${attr(key)}" value="${attr(field(key).value)}" placeholder="${attr(placeholder)}">${meta(key)}</div>`;
  const area = (key, placeholder = '') => `<div class="field"><label>${h(field(key).label)}</label><textarea class="input" data-f="${attr(key)}" rows="3" placeholder="${attr(placeholder)}">${h(field(key).value)}</textarea>${meta(key)}</div>`;
  const select = key => `<div class="field"><label>${h(field(key).label)}</label><select class="input" data-f="${attr(key)}">${V.options[key].map(o => `<option${o === field(key).value ? ' selected' : ''}>${h(o)}</option>`).join('')}</select>${meta(key)}</div>`;
  const swatch = key => { const m = /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/i.exec(field(key).value); return m ? `<span title="${attr(m[0])}" style="display:inline-block;width:22px;height:22px;border-radius:4px;border:1px solid #c9c9c9;margin-left:8px;flex:none;background:${attr(m[0])}"></span>` : ''; };
  const colour = key => `<div class="field"><label>${h(field(key).label)}</label><div style="display:flex;align-items:center"><input class="input" data-f="${attr(key)}" value="${attr(field(key).value)}" placeholder="Dark green #0B3D2E">${swatch(key)}</div></div>`;

  const draw = () => {
    if (!V) return;
    const chose = V.hero_choice === 'illustration' ? 'The client chose an illustration on the onboarding form, so the hero is a graphic.'
      : V.hero_choice === 'photo' ? 'The client chose a real photo of their work. Use this only for a page whose hero stays on a graphic.'
        : 'No hero answer on the onboarding form, so the hero is a graphic.';
    // Open by itself when the hero is a graphic; a click on Show or Hide wins after that
    const shown = open == null ? V.hero_choice !== 'photo' : open;
    const state = V.ready ? pill('ok', 'ready to copy') : pill('warn', `${V.missing.length} to fill in`);
    el.innerHTML = card({ title: 'Hero graphic brief', sub: 'The brief and prompt for ChatGPT, filled from the record. Copybot does not make the picture.',
      actions: `<button class="btn btn-ghost btn-sm" data-hb="toggle">${shown ? 'Hide' : 'Show'}</button>`, body: `
      <p class="small" style="margin:0 0 4px">${h(chose)} ${state}</p>
      ${!shown ? '' : `
      ${V.colours_answer ? `<p class="small muted" style="margin:0 0 4px">Colours on the onboarding form: ${h(V.colours_answer)}.</p>` : ''}
      ${V.problems.map(p => `<p class="small" style="margin:0 0 4px;color:#b42318">${h(p)}</p>`).join('')}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-top:12px">
        ${input('niche', 'The trade, or the service for a service page')}${input('location', 'Town, County')}
        ${colour('primary_colour')}${colour('secondary_colour')}${colour('accent_colour')}
        ${select('headline_position')}${select('lighting')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;margin-top:12px">
        ${area('scene', 'What the picture shows, with no people in it')}${area('include', 'Vehicles, tools and materials to show')}${area('avoid', 'Anything this client does not do or would not want shown')}
      </div>
      ${V.missing.length ? `<p class="small" style="margin:12px 0 2px"><strong>Before you copy</strong></p><ul class="small" style="margin:0 0 0 18px">${V.missing.map(m => `<li>${h(m)}</li>`).join('')}</ul>` : ''}
      <div class="btn-row" style="margin-top:12px">
        <button class="btn btn-primary btn-sm" data-hb="copy"${V.ready ? '' : ' disabled'}>Copy the brief and prompt</button>
        <a class="btn btn-ghost btn-sm" href="${attr(V.reference_image)}" target="_blank" rel="noopener">Open the reference image</a>
        <span class="small muted">${V.last_copied ? `Last copied ${h(fmtDate(V.last_copied.at, true))}${V.last_copied.by ? ` by ${h(V.last_copied.by)}` : ''}.` : 'Not copied yet.'}</span>
      </div>
      <p class="small muted" style="margin:8px 0 0">In ChatGPT: add the reference image, paste, send. Then add the picture to the hero slot below with Choose.</p>
      <details style="margin-top:8px"><summary class="small">See the text</summary><pre class="small" style="white-space:pre-wrap;max-height:320px;overflow:auto;margin:8px 0 0">${h(V.text)}</pre></details>`}` });
  };

  const load = async () => {
    try { V = await api(`/api/clients/${clientId}/hero-brief`); draw(); }
    catch (err) { console.error('[hero-brief]', err); el.innerHTML = card({ title: 'Hero graphic brief', body: failed({ title: 'The hero graphic brief could not be loaded', reason: err.message }) }); }
  };
  const put = async body => {
    try { V = await api(`/api/clients/${clientId}/hero-brief`, { method: 'PUT', body }); draw(); }
    catch (err) { console.error('[hero-brief]', err); toast(err.message, 'bad'); }
  };

  el.addEventListener('change', e => {
    const f = e.target.closest('[data-f]'); if (!f || !V) return;
    put({ set: { [f.dataset.f]: f.value } });
  });
  el.addEventListener('click', async e => {
    const r = e.target.closest('[data-reset]'); if (r) { await put({ reset: [r.dataset.reset] }); return; }
    const b = e.target.closest('[data-hb]'); if (!b || !V) return;
    if (b.dataset.hb === 'toggle') { open = !(open == null ? V.hero_choice !== 'photo' : open); draw(); return; }
    if (b.dataset.hb === 'copy') {
      try {
        await copyText(V.text);
        V = await api(`/api/clients/${clientId}/hero-brief/copied`, { method: 'POST', body: { by: ctx.userName ? ctx.userName() : '' } });
        toast('Copied. Paste it into ChatGPT with the reference image.');
        draw();
      } catch (err) { console.error('[hero-brief]', err); toast(err.message, 'bad'); }
    }
  });

  el.innerHTML = card({ title: 'Hero graphic brief', body: '<p class="small muted">Loading…</p>' });
  await load();
}
