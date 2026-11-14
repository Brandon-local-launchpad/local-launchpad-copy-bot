// The Review & Referral Cards tab (13 Nov 2026, Brandon). Every client gets a matched print kit: an
// A5 Google review card and an 85 × 55 mm referral card, made by Claude's /customer-revref-cards
// skill from a client brief. This tab builds that brief from the client record (card-brief/), lets a
// person fill the gaps and pick the design, shows what is still missing, and has Copy brief: the
// text is pasted into a new Claude chat. Copybot does not make the cards and sends nothing to Claude.
// Three sub-tabs: Brief (the readiness bar, the form, the preview and Copy, the sign-off), QR codes
// (cards-qr.js: what a person needs to make the three codes in QR.io) and
// Templates (the five designs with their example images, the same for every client).
// A value typed over one the record filled is kept on this tab only, never written to the Record tab.

import { h, attr, api, card, toast, failed, pill, fmtDate, copyText } from '../ui.js';
import { mount as mountQr } from './cards-qr.js';

const BOX = { review: [168, 230], referral: [215, 150] };   // the example images' sizes on the gallery, each at its real proportions

export async function render(el, ctx) {
  const url = `/api/clients/${ctx.clientId}/card-brief`;
  const by = () => { try { return localStorage.getItem('ll_user') || ''; } catch (_) { return ''; } };   // the name the shell keeps (shell.js userName)
  let V = null, sub = ctx.query && ['templates', 'qr'].includes(ctx.query.view) ? ctx.query.view : 'brief', copiedNote = false;
  let pending = {}, timer = null, chain = Promise.resolve();
  let box = null;   // the lightbox, when open

  // A field's value: what was just typed and not saved yet, else what the server holds
  const val = k => (k in pending ? pending[k] : V.fields[k].value);

  // ── Saving: everything typed goes in one PUT a moment after the last key ──
  const flush = () => {
    clearTimeout(timer); timer = null;
    const set = pending;
    if (!Object.keys(set).length) return chain;
    chain = chain.then(async () => {
      try {
        const r = await api(url, { method: 'PUT', body: { set } });
        for (const k of Object.keys(set)) if (pending[k] === set[k]) delete pending[k];
        V = r; copiedNote = false; draw();
      } catch (err) {
        for (const k of Object.keys(set)) if (pending[k] === set[k]) delete pending[k];
        console.error('[cards]', err); toast(err.message, 'bad'); draw();
      }
    });
    pending = { ...set };
    return chain;
  };
  const put = (key, value, now = false) => { pending = { ...pending, [key]: value }; clearTimeout(timer); if (now) flush(); else timer = setTimeout(flush, 500); };
  const reset = async key => {
    await flush();
    delete pending[key];
    try { V = await api(url, { method: 'PUT', body: { reset: [key] } }); copiedNote = false; draw(); } catch (err) { console.error('[cards]', err); toast(err.message, 'bad'); }
  };

  // ── The form's parts ──
  const meta = key => {
    const f = V.fields[key], out = [];
    if ('record' in f) {
      if (f.overridden) out.push(`<span class="muted">Changed on this tab${f.record ? `; the record says ${h(f.record)}` : ''}.</span> <a href="#" data-cb="reset" data-key="${attr(key)}">reset to record value</a>`);
      else if (f.source) out.push(`<span class="muted">${h(f.source)}</span>`);
      if (f.note) out.push(`<span style="color:#92400e">${h(f.note)}</span>`);
    }
    if (f.warn) out.push(`<span style="color:#92400e">${h(f.warn)}</span>`);
    return out.length ? `<div class="small" style="margin-top:4px">${out.join('<br>')}</div>` : '';
  };
  const help = t => (t ? `<div class="small muted" style="margin-top:4px">${t}</div>` : '');
  const text = (key, label, { placeholder = '', hint = '', type = 'text', extra = '' } = {}) => `<div class="field"><label>${h(label)}</label>
    <input class="input" type="${type}" data-f="${attr(key)}" value="${attr(val(key))}" placeholder="${attr(placeholder)}"${type === 'number' ? ' min="0" step="1"' : ''}>${extra}${meta(key)}${help(hint)}</div>`;
  const select = (key, label, options, { hint = '' } = {}) => `<div class="field"><label>${h(label)}</label>
    <select class="input" data-f="${attr(key)}">${options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${attr(v)}"${v === val(key) ? ' selected' : ''}>${h(l)}</option>`; }).join('')}</select>${meta(key)}${help(hint)}</div>`;
  const grid = (...cells) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:0 16px">${cells.join('')}</div>`;
  const section = (title, body) => `<h3 style="font-size:14px;margin:18px 0 10px">${h(title)}</h3>${body}`;
  const swatch = key => { const v = String(val(key) || '').trim(); const ok = /^#[0-9a-f]{6}$/i.test(v); return `<span title="${ok ? attr(v) : 'No colour yet'}" style="display:inline-block;width:26px;height:26px;border-radius:6px;border:1px solid var(--border-strong);vertical-align:middle;margin-left:8px;background:${ok ? attr(v) : 'repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6 4px,#fff 4px,#fff 8px)'}"></span>`; };
  const colour = (key, label) => `<div class="field"><label>${h(label)}</label><div style="display:flex;align-items:center"><input class="input" data-f="${attr(key)}" value="${attr(val(key))}" placeholder="#RRGGBB" style="max-width:150px">${swatch(key)}</div>${meta(key)}</div>`;

  const missingBox = kind => `<div style="width:${BOX[kind][0]}px;height:${BOX[kind][1]}px;max-width:100%;background:#eceef1;border:1px dashed var(--border-strong);border-radius:6px;display:flex;align-items:center;justify-content:center;text-align:center;padding:8px" class="small muted">Example not added yet</div>`;

  const tiles = () => {
    const cur = val('template');
    const tile = (id, name, img) => `<button type="button" data-cb="template" data-id="${attr(id)}" aria-pressed="${cur === id}" style="width:118px;padding:8px;border-radius:10px;cursor:pointer;text-align:center;background:${cur === id ? 'var(--accent-soft)' : 'var(--card)'};border:2px solid ${cur === id ? 'var(--accent)' : 'var(--border)'}">
      <div style="height:128px;display:flex;align-items:center;justify-content:center;margin-bottom:6px">${img}</div>
      <div class="small" style="font-weight:600;color:var(--text)">${h(name)}</div></button>`;
    const thumb = t => { const i = t.images[0]; return i.url ? `<img src="${attr(i.url)}" alt="${attr(`${t.id} ${t.name}, review card front`)}" data-kind="review" data-small="1" style="max-height:128px;max-width:100%;border-radius:4px">` : '<div class="small muted" style="padding:6px">Example not added yet</div>'; };
    return `<div class="field"><label>Template</label>
      <div style="display:flex;gap:10px;flex-wrap:wrap">${V.templates.map(t => tile(t.id, `${t.id} ${t.name}`, thumb(t))).join('')}${tile('', 'Designer\'s choice', '<div class="small muted" style="border:1px dashed var(--border-strong);border-radius:6px;height:120px;width:88px;display:flex;align-items:center;justify-content:center;padding:6px">Claude picks</div>')}</div>
      <div class="small" style="margin-top:6px"><a href="#" data-cb="sub" data-sub="templates">Compare templates</a></div></div>`;
  };

  const feel = () => `<div class="field"><label>Feel (up to 2)</label><div class="chips">${V.options.feels.map(f => `<button type="button" class="chip${val('feel').includes(f) ? ' active' : ''}" data-cb="feel" data-feel="${attr(f)}">${h(f)}</button>`).join('')}</div></div>`;

  const form = () => {
    const wa = `<div style="margin-top:6px"><button type="button" class="btn btn-ghost" data-cb="whatsapp">Make WhatsApp link from mobile</button></div>`;
    const sole = `<div class="field"><label>Sole trader or team?</label><div style="display:flex;gap:16px;flex-wrap:wrap">${V.options.sole.map(o => `<label style="display:inline-flex;gap:6px;align-items:center;font-size:14px;color:var(--text);font-weight:400"><input type="radio" name="cb-sole" data-f="sole_or_team" value="${attr(o)}"${val('sole_or_team') === o ? ' checked' : ''}>${h(o)}</label>`).join('')}</div></div>`;
    const logoOn = val('logo_supplied') === 'yes';
    return card({
      title: 'Card details', sub: 'Filled from the client record. What you change here stays on this tab: the Record tab is never changed',
      body: `
        ${section('1. Business', `
          ${text('business_name', 'Business name (exactly as on Google Business Profile)')}
          ${grid(text('short_name', 'Short name for the wordmark (if different)', { placeholder: 'e.g. BrightSpark' }), text('area', 'Area / town'))}
          ${grid(select('trade', 'Trade', [['', 'Choose…'], ...V.options.trades]), val('trade') === 'other' ? text('trade_other', 'Other trade', { placeholder: 'e.g. Pressure washing service' }) : '')}
          ${sole}`)}
        ${section('2. Contact (referral card back)', grid(
          text('contact_first_name', 'First name to call/text'),
          text('mobile', 'Mobile number', { placeholder: '07xxx xxxxxx' })))}
        ${section('3. Links & QR codes', `
          ${text('review_link', 'Google review link (review card QR)', { hint: 'GBP → Ask for reviews → copy link' })}
          ${text('claim_link', '"Scan to claim" link (referral QR 1)', { hint: 'WhatsApp chat link, booking or contact page', extra: wa })}
          ${text('services_link', '"View our services" link (referral QR 2)')}
          <div class="field"><label>QR files supplied?</label><div class="small">no — generate from the links <span class="muted">(the skill makes the QR codes and test-scans them)</span></div></div>`)}
        ${section('4. Brand', `
          ${grid(select('logo_supplied', 'Logo supplied?', [['no', 'No: use a text wordmark'], ['yes', 'Yes']]),
            logoOn ? select('logo_type', 'Logo file type', V.options.logo_types) : '',
            logoOn ? select('logo_on_dark', 'Works on dark backgrounds?', [['yes', 'Yes'], ['no', 'No']]) : '')}
          ${grid(colour('colour_main', 'Main / accent colour'), colour('colour_dark', 'Dark colour'), text('colour_avoid', 'Colours to avoid'))}`)}
        ${section('5. Style', `
          ${tiles()}
          ${feel()}
          ${grid(select('job_photo', 'Job photo supplied?', [['no', 'No'], ['yes', 'Yes']], { hint: val('template') === '3d' && !V.fields.job_photo.warn ? 'Needed for 3d Job Photo.' : '' }))}`)}
        ${section('6. Copy tweaks', `
          ${grid(text('example_job', 'Review example job', { placeholder: 'e.g. fitted our new bathroom' }), text('pun', 'Review trade pun ("keep our standards ___.")', { placeholder: 'switched on.' }))}
          ${text('must_say', 'Must say', { placeholder: 'e.g. NICEIC Approved Contractor (small, footer)' })}
          ${text('must_not_say', 'Must not say')}`)}
        ${section('7. Print', `
          ${grid(text('qty_review', 'Quantity: review cards', { type: 'number' }), text('qty_referral', 'Quantity: referral cards', { type: 'number' }), text('deadline', 'Deadline', { type: 'date' }))}
          ${text('printer', 'Printer / CMYK needed?')}
          ${grid(text('paper_review', 'Paper & finish: review card'), text('paper_referral', 'Paper & finish: referral card'))}
          <div class="field"><label style="display:inline-flex;gap:8px;align-items:center;font-size:14px;color:var(--text);font-weight:400"><input type="checkbox" data-f="test_client"${val('test_client') ? ' checked' : ''}>Test client <span class="muted">(the brief says it is a fictional business, not for print)</span></label></div>`)}`,
    });
  };

  const bar = () => {
    const r = V.readiness;
    return `<div class="notice ${r.level === 'red' ? 'bad' : r.level === 'amber' ? 'warn' : 'good'}" role="status" data-level="${attr(r.level)}" style="font-weight:600;margin-bottom:16px">${h(r.text)}${r.level === 'amber' ? '<div class="small" style="font-weight:400;margin-top:2px">The skill fills these with marked TEST placeholders and lists them to swap before print. You can still copy.</div>' : ''}</div>`;
  };

  const preview = () => {
    const red = V.readiness.level === 'red';
    const unsaved = Object.keys(pending).length;
    return card({
      title: 'Brief', sub: 'The exact text that is copied. Paste it into a new Claude chat',
      body: `<pre data-cb-part="preview" style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word;background:#fafbfc;border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin:0 0 12px;max-height:480px;overflow:auto">${h(V.brief)}</pre>
        <div class="btn-row"><button class="btn btn-primary" data-cb="copy"${red ? ' disabled' : ''}>Copy brief</button><button class="btn btn-ghost" data-cb="download"${red ? ' disabled' : ''}>Download .md</button>
          ${copiedNote ? '<span class="small" style="color:#166534;font-weight:600">Copied. Open a new Claude chat and paste.</span>' : unsaved ? '<span class="small muted">Saving…</span>' : ''}</div>
        ${V.attach ? '<div class="small" style="margin-top:10px"><strong>Attach the logo / job photo files to the Claude chat as well. They can\'t be pasted as text.</strong></div>' : ''}
        <div class="small muted" style="margin-top:10px">${V.last_copied ? `Last copied: ${h(fmtDate(V.last_copied.at, true))}${V.last_copied.by ? ` by ${h(V.last_copied.by)}` : ''}` : 'Not copied yet'}</div>`,
    });
  };

  const signoff = () => card({
    title: 'Sign-off', sub: 'Each tick keeps who ticked it and when',
    body: V.signoff.map(s => `<label style="display:flex;gap:10px;align-items:flex-start;margin-bottom:10px;font-size:14px"><input type="checkbox" data-signoff="${attr(s.key)}"${s.ticked ? ' checked' : ''} style="margin-top:3px"><span>${h(s.label)}${s.ticked ? `<div class="small muted">${s.by ? `${h(s.by)} · ` : ''}${h(fmtDate(s.at, true))}</div>` : ''}</span></label>`).join(''),
  });

  // ── The Templates gallery ──
  const gallery = () => {
    const cur = V.fields.template.value;
    const img = (t, i, n) => `<figure style="margin:0">${i.url
      ? `<img src="${attr(i.url)}" alt="${attr(`${t.id} ${t.name}: ${i.label.toLowerCase()}`)}" data-cb="zoom" data-id="${attr(t.id)}" data-n="${n}" data-kind="${attr(i.kind)}" loading="lazy" style="height:${BOX[i.kind][1]}px;width:auto;max-width:100%;border-radius:6px;cursor:zoom-in;display:block">`
      : missingBox(i.kind)}<figcaption class="small muted" style="margin-top:4px">${h(i.label)}</figcaption></figure>`;
    return `<div class="small muted" style="margin-bottom:14px">Examples show demo businesses. Your client's name, colours and logo replace them.</div>
      <div class="stack">${V.templates.map(t => card({
        title: `${h(t.id)} ${h(t.name)}${cur === t.id ? ` ${pill('ok', 'Selected')}` : ''}`,
        sub: `${h(t.look)} · Best for: ${h(t.best_for)}`,
        actions: `<button class="btn ${cur === t.id ? 'btn-ghost' : 'btn-primary'}" data-cb="use" data-id="${attr(t.id)}">Use this template</button>`,
        body: `<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end">${t.images.map((i, n) => img(t, i, n)).join('')}</div>`,
        id: `cb-template-${t.id}`,
      })).join('')}</div>`;
  };

  // ── The lightbox: one template's images, stepped through with the arrows ──
  const closeBox = () => { if (box) { box.el.remove(); box = null; } };
  const drawBox = () => {
    const t = V.templates.find(x => x.id === box.id);
    const shots = t.images.filter(i => i.url);
    box.n = ((box.n % shots.length) + shots.length) % shots.length;
    const s = shots[box.n];
    const arrow = (dir, label) => `<button type="button" data-box="${dir}" aria-label="${label}" style="background:rgba(255,255,255,.14);color:#fff;border:0;border-radius:999px;width:44px;height:44px;font-size:22px;cursor:pointer;flex:none"${shots.length < 2 ? ' disabled' : ''}>${dir === 'prev' ? '‹' : '›'}</button>`;
    box.el.innerHTML = `<div style="color:#fff;font-size:14px;margin-bottom:10px">${h(t.id)} ${h(t.name)} · ${h(s.label)} <span style="opacity:.7">(${box.n + 1} of ${shots.length})</span></div>
      <div style="display:flex;align-items:center;gap:14px;max-width:100%">${arrow('prev', 'Previous image')}<img src="${attr(s.url)}" alt="${attr(`${t.id} ${t.name}: ${s.label.toLowerCase()}`)}" style="max-height:80vh;max-width:calc(100vw - 160px);border-radius:8px;display:block">${arrow('next', 'Next image')}</div>
      <button type="button" data-box="close" style="margin-top:12px;background:none;border:1px solid rgba(255,255,255,.5);color:#fff;border-radius:8px;padding:6px 14px;cursor:pointer">Close</button>`;
  };
  const openBox = (id, slot) => {
    const t = V.templates.find(x => x.id === id);
    const shots = t.images.filter(i => i.url);
    if (!shots.length) return;
    closeBox();
    const node = document.createElement('div');
    node.setAttribute('role', 'dialog'); node.setAttribute('aria-modal', 'true');
    node.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(15,17,21,.9);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px';
    node.addEventListener('click', e => {
      const b = e.target.closest('[data-box]');
      if (!b) { if (e.target === node) closeBox(); return; }
      if (b.dataset.box === 'close') return closeBox();
      box.n += b.dataset.box === 'next' ? 1 : -1; drawBox();
    });
    document.body.appendChild(node);
    box = { el: node, id, n: Math.max(0, shots.indexOf(t.images[slot])) };
    drawBox();
  };
  const onKey = e => {
    if (!box) return;
    if (e.key === 'Escape') closeBox();
    if (e.key === 'ArrowRight') { box.n += 1; drawBox(); }
    if (e.key === 'ArrowLeft') { box.n -= 1; drawBox(); }
  };
  document.addEventListener('keydown', onKey);

  // ── Drawing. The field being typed in keeps its focus and what is in it ──
  function draw(after) {
    const a = document.activeElement, key = a && el.contains(a) && a.dataset ? a.dataset.f : null;
    const typed = key && a.type !== 'radio' && a.type !== 'checkbox' ? { value: a.value, start: a.selectionStart, end: a.selectionEnd } : null;
    const tab = (k, l) => `<button type="button" class="tab${sub === k ? ' active' : ''}" data-cb="sub" data-sub="${k}">${l}</button>`;
    el.innerHTML = `<div class="tabs" style="margin-bottom:16px">${tab('brief', 'Brief')}${tab('templates', 'Templates')}${tab('qr', 'QR codes')}</div>
      ${sub === 'brief' ? `${bar()}<div class="stack">${form()}${preview()}${signoff()}</div>` : sub === 'templates' ? gallery() : '<div data-qr-root></div>'}`;
    // The QR codes subtab draws itself (cards-qr.js) and keeps its own values
    const qr = el.querySelector('[data-qr-root]');
    if (qr) mountQr(qr, ctx).catch(err => { console.error('[cards]', err); toast(err.message, 'bad'); });
    // An image that will not load is shown as not added, at the same size
    el.querySelectorAll('img[data-kind]').forEach(i => i.addEventListener('error', () => { const d = document.createElement('div'); d.innerHTML = i.dataset.small ? '<div class="small muted" style="padding:6px">Example not added yet</div>' : missingBox(i.dataset.kind); i.replaceWith(d.firstElementChild); }, { once: true }));
    if (typed) {
      const n = el.querySelector(`[data-f="${key}"]`);
      if (n) { n.value = typed.value; n.focus({ preventScroll: true }); try { n.setSelectionRange(typed.start, typed.end); } catch (_) { /* a date or number field has no selection */ } }
    }
    if (after) after();
  }

  const load = async () => {
    try { V = await api(url); draw(); }
    catch (e) { console.error('[cards]', e); el.innerHTML = failed({ title: 'The Review & Referral Cards tab could not load', reason: e.message, retry: '<button class="btn btn-ghost" data-cb="reload">Retry</button>' }); }
  };

  el.addEventListener('input', e => {
    const f = e.target.dataset && e.target.dataset.f;
    if (!f || e.target.tagName === 'SELECT' || e.target.type === 'radio' || e.target.type === 'checkbox' || e.target.type === 'date') return;
    put(f, e.target.value);
  });
  el.addEventListener('change', async e => {
    const t = e.target;
    if (t.dataset && t.dataset.signoff) {
      t.disabled = true;
      try { V = await api(`${url}/signoff`, { method: 'POST', body: { key: t.dataset.signoff, ticked: t.checked, by: by() } }); }
      catch (err) { console.error('[cards]', err); toast(err.message, 'bad'); }
      return draw();
    }
    const f = t.dataset && t.dataset.f;
    if (!f) return;
    if (t.type === 'checkbox') return put(f, t.checked, true);
    if (t.tagName === 'SELECT' || t.type === 'radio' || t.type === 'date') return put(f, t.value, true);
    put(f, t.value, true);   // a text field left: saved at once
  });
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-cb]');
    if (!b) return;
    const act = b.dataset.cb;
    if (b.tagName === 'A') e.preventDefault();
    if (act === 'reload') return load();
    if (act === 'sub') { sub = b.dataset.sub; return draw(() => window.scrollTo({ top: 0 })); }
    if (act === 'reset') return reset(b.dataset.key);
    if (act === 'template') return put('template', b.dataset.id, true);
    if (act === 'feel') {
      const cur = val('feel'), f = b.dataset.feel;
      if (!cur.includes(f) && cur.length >= 2) return toast('Two at most. Take one off first.', 'bad');
      return put('feel', cur.includes(f) ? cur.filter(x => x !== f) : [...cur, f], true);
    }
    if (act === 'whatsapp') {
      await flush(); await chain;
      if (!V.whatsapp) return toast('There is no UK mobile number to make the link from.', 'bad');
      return put('claim_link', V.whatsapp, true);
    }
    if (act === 'use') {
      put('template', b.dataset.id, true); await chain;
      sub = 'brief';
      return draw(() => { const tile = el.querySelector(`[data-cb="template"][data-id="${b.dataset.id}"]`); if (tile) { tile.scrollIntoView({ block: 'center' }); tile.focus({ preventScroll: true }); } });
    }
    if (act === 'zoom') return openBox(b.dataset.id, Number(b.dataset.n));
    if (act === 'copy' || act === 'download') {
      await flush(); await chain;
      if (V.readiness.level === 'red') return toast(V.readiness.text, 'bad');
      if (act === 'download') {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([V.brief], { type: 'text/markdown;charset=utf-8' })); a.download = V.filename;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        return;
      }
      await copyText(V.brief);
      try { V = await api(`${url}/copied`, { method: 'POST', body: { by: by() } }); } catch (err) { console.error('[cards]', err); }
      copiedNote = true; toast('Copied. Open a new Claude chat and paste.'); draw();
    }
  });

  await load();
  return () => { clearTimeout(timer); flush(); document.removeEventListener('keydown', onKey); closeBox(); };
}
