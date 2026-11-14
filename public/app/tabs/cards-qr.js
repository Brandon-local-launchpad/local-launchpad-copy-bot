// The QR codes subtab of the Review & Referral Cards tab (14 Nov 2026, Brandon; qr-codes/). Every
// client gets three QR codes, made by a person in QR.io: Review Funnel, Scan to Claim and View Our
// Services. This subtab prepares what that person needs and, later, checks the finished codes.
// Built so far: the five fields at the top, filled from the client record (stage 1), and 1 Prepare
// (stage 2): the folder name, each code's QR name and destination in read-only boxes with Copy, the
// WhatsApp message and link, and each code's link check. A value typed here stays on this tab only:
// the Record tab is never changed. A field is saved when it is left; a value that is refused (a
// Google link as the review funnel) is kept in the box with the reason. A link not yet checked is
// checked as soon as the tab shows it; one Copybot cannot fetch can be passed by hand. Then 2 Make in
// QR.io (stage 3): the tick list a person follows in QR.io, each value inline with its own Copy, each
// tick kept with who and when; a code's steps open only when its destination has passed. Then
// 3 Upload and check (stage 4): one slot per code for the PNG or SVG from QR.io. Copybot reads the
// code, follows its link and says whether it lands where that slot expects; Re-check does it again.

import { h, attr, api, card, toast, failed, pill, fmtDate, copyText } from '../ui.js';

const ORDER = ['qr_niche_label', 'qr_business_name', 'review_funnel_url', 'whatsapp_number', 'website_url'];
const PLACEHOLDER = {
  qr_niche_label: 'e.g. Landscapers',
  qr_business_name: 'e.g. Eden\'s Edge',
  review_funnel_url: 'https://… (the Review Us funnel, never the Google review link)',
  whatsapp_number: '07xxx xxxxxx',
  website_url: 'https://…',
};
const HINT = {
  review_funnel_url: 'From Phase 6. 1 to 3 stars go to the private form, 4 and 5 stars to Google.',
  whatsapp_number: 'The client\'s mobile with WhatsApp on it. A landline will not work.',
};

// onStatus(status): called after every draw, so the Cards tab can keep the subtab's dot current
export async function mount(el, ctx, { onStatus = null } = {}) {
  const url = `/api/clients/${ctx.clientId}/qr-codes`;
  let V = null, checking = false, busySlot = null;
  const by = () => { try { return localStorage.getItem('ll_user') || ''; } catch (_) { return ''; } };   // the name the shell keeps
  const typed = {}, errors = {};   // what is in a box and not saved; why a value was refused
  const val = k => (k in typed ? typed[k] : V.fields[k].value);

  const meta = key => {
    const f = V.fields[key], out = [];
    if (errors[key]) out.push(`<span data-qr-error style="color:#b91c1c;font-weight:600">${h(errors[key])}</span>`);
    else if (f.problem) out.push(`<span data-qr-problem style="color:#b91c1c">${h(f.problem)}</span>`);
    if (f.overridden) out.push(`<span class="muted">Changed on this tab${f.record ? `; the record gives ${h(f.record)}` : ''}.</span> <a href="#" data-qr="reset" data-key="${attr(key)}">reset to record value</a>`);
    else if (f.source) out.push(`<span class="muted">${h(f.source)}</span>`);
    if (f.note) out.push(`<span class="muted">${h(f.note)}</span>`);
    if (f.warn) out.push(`<span style="color:#92400e">${h(f.warn)}</span>`);
    if (HINT[key] && !errors[key]) out.push(`<span class="muted">${h(HINT[key])}</span>`);
    return out.length ? `<div class="small" style="margin-top:4px">${out.join('<br>')}</div>` : '';
  };
  const field = key => `<div class="field"><label>${h(V.fields[key].label)}</label>
    <input class="input" data-qf="${attr(key)}" value="${attr(val(key))}" placeholder="${attr(PLACEHOLDER[key] || '')}"${errors[key] ? ' aria-invalid="true" style="border-color:#b91c1c"' : ''}>${key === 'website_url' ? temporary() : ''}${meta(key)}</div>`;
  const temporary = () => `<label style="display:inline-flex;gap:8px;align-items:center;font-size:14px;color:var(--text);font-weight:400;margin-top:6px"><input type="checkbox" data-qf="website_temporary"${V.website_temporary ? ' checked' : ''}><span>Temporary URL <span class="muted">(the client's own domain is not live yet)</span></span></label>`;

  // ── 1 Prepare: every value in a read-only box with its own Copy ──
  const box = (label, value, { open = false } = {}) => `<div class="field" style="margin-bottom:10px"><label>${h(label)}</label>
    <div style="display:flex;gap:8px;align-items:center"><input class="input" readonly value="${attr(value)}" data-qr-box="${attr(label)}" style="background:#fafbfc;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px">
      <button type="button" class="btn btn-copy" data-qr="copy" data-text="${attr(value)}">Copy</button>${open ? `<a class="btn btn-copy" href="${attr(value)}" target="_blank" rel="noopener noreferrer">Open link</a>` : ''}</div></div>`;
  const STATE = { ready: ['ok', 'Ready to make'], unchecked: ['run', 'Checking the link'], failed: ['block', 'Link check failed'], locked: ['', 'Locked'] };
  const code = c => {
    const amber = c.state === 'ready' && c.level === 'amber';
    const [kind, label] = amber ? ['wait', 'Ready, temporary URL'] : c.state === 'unchecked' && !checking ? ['', 'Not checked'] : STATE[c.state];
    const checked = c.check && c.check.at ? `<span class="muted"> ${c.check.hand ? `${c.check.by ? `${h(c.check.by)} · ` : ''}` : ''}${h(fmtDate(c.check.at, true))}</span>` : '';
    const colour = c.state === 'failed' || c.state === 'locked' ? '#b91c1c' : amber ? '#92400e' : 'var(--muted)';
    const again = c.key !== 'claim' && c.state !== 'locked' ? `<button type="button" class="btn btn-copy" data-qr="check" data-key="${attr(c.key)}"${checking ? ' disabled' : ''}>Check again</button>` : '';
    const hand = c.state === 'failed' ? `<button type="button" class="btn btn-copy" data-qr="hand" data-key="${attr(c.key)}">I opened it and it works</button>` : '';
    return `<div data-qr-code="${attr(c.key)}" data-state="${attr(c.state)}" style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px"><strong>${h(c.name)}</strong><span class="small muted">${h(c.card)}</span>${pill(kind, label)}</div>
      ${c.qr_name ? box('QR name', c.qr_name) : ''}
      ${c.key === 'claim' && c.destination ? box('WhatsApp message', V.prepare.message) : ''}
      ${c.destination && c.state !== 'locked' ? box(c.key === 'claim' ? 'Destination (WhatsApp link)' : 'Destination', c.destination, { open: true }) : ''}
      <div class="small" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span style="color:${colour}">${h(c.message)}${checked}</span>${again}${hand}</div></div>`;
  };
  const prepare = () => card({
    title: '1 Prepare', sub: 'Copybot makes these. Copy each one into QR.io, so nothing is retyped',
    body: `${V.prepare.folder ? box('Folder name', V.prepare.folder) : '<div class="small" style="color:#b91c1c">Fill in the niche and the business name to get the folder name and the QR names.</div>'}${V.prepare.codes.map(code).join('')}`,
  });

  // ── 2 Make in QR.io: the tick list. **bold** is a button in QR.io, {token} a value with its own Copy ──
  const stepText = s => h(s.text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\{(\w+)\}/g, (m, k) => {
    const value = s.values[k] || '';
    if (k === 'link') return `<a href="${attr(value)}" target="_blank" rel="noopener noreferrer">qr.io/dashboard</a>`;
    return value ? `<code style="background:#f3f4f6;border-radius:4px;padding:1px 5px;font-size:12.5px;word-break:break-all">${h(value)}</code> <button type="button" class="btn btn-copy" data-qr="copy" data-text="${attr(value)}">Copy</button>` : '<span class="muted">(not ready yet)</span>';
  });
  const steps = g => `<ol style="list-style:none;margin:0;padding:0">${g.steps.map((s, i) => `<li style="margin-bottom:10px"><label style="display:flex;gap:10px;align-items:flex-start;font-size:14px;font-weight:400;color:${g.unlocked ? 'var(--text)' : 'var(--muted)'}">
      <input type="checkbox" data-qr-tick="${attr(s.id)}"${s.ticked ? ' checked' : ''}${g.unlocked || s.ticked ? '' : ' disabled'} style="margin-top:3px">
      <span><span class="muted">${i + 1}.</span> ${stepText(s)}${s.ticked ? `<div class="small muted">${s.by ? `${h(s.by)} · ` : ''}${h(fmtDate(s.at, true))}</div>` : ''}</span></label></li>`).join('')}</ol>`;
  const group = (g, title, sub) => `<div data-qr-make="${attr(g.key || 'folder')}" data-unlocked="${g.unlocked ? '1' : '0'}" style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px">
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px"><strong>${h(title)}</strong><span class="small muted">${h(sub)}</span>${pill(!g.unlocked ? '' : g.done === g.total ? 'ok' : g.done ? 'run' : '', !g.unlocked ? 'Locked' : `${g.done} of ${g.total} done`)}</div>
    ${g.unlocked ? '' : `<div class="small" style="color:#b91c1c;margin-bottom:10px">${h(g.message)}</div>`}${steps(g)}</div>`;
  const make = () => card({
    title: '2 Make in QR.io', sub: 'A person does this in QR.io, in this order. Tick each step as you go',
    body: `<div class="small muted">${V.make.done} of ${V.make.total} steps done</div>${group(V.make.folder, 'Once per client', 'the folder')}${V.make.codes.map(c => group(c, c.name, c.card)).join('')}`,
  });

  // ── 3 Upload and check: one slot per code ──
  const SLOT = { ok: ['ok', 'Checked'], static: ['wait', 'Static code'], failed: ['block', 'Not right'], stale: ['wait', 'Check again'], empty: ['', 'No code yet'] };
  const slot = s => {
    const [kind, label] = !s.unlocked && s.state === 'empty' ? ['', 'Locked'] : busySlot === s.key ? ['run', 'Checking'] : SLOT[s.state];
    const colour = s.level === 'red' ? '#b91c1c' : s.level === 'amber' ? '#92400e' : s.level === 'green' ? '#166534' : 'var(--muted)';
    const thumb = s.file && s.file.kept ? `<img src="${attr(`${url}/file/${s.key}?v=${encodeURIComponent(s.checked_at || '')}`)}" alt="${attr(`${s.name} QR code`)}" style="width:84px;height:84px;object-fit:contain;background:#fff;border:1px solid var(--border);border-radius:6px;flex:none">`
      : '<div class="small muted" style="width:84px;height:84px;border:1px dashed var(--border-strong);border-radius:6px;display:flex;align-items:center;justify-content:center;text-align:center;flex:none">No code</div>';
    const off = busySlot ? ' disabled' : '';
    return `<div data-qr-slot="${attr(s.key)}" data-state="${attr(s.state)}" style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px"><strong>${h(s.name)}</strong><span class="small muted">${h(s.card)}</span>${pill(kind, label)}</div>
      ${s.unlocked ? '' : `<div class="small" style="color:#b91c1c;margin-bottom:10px">${h(s.locked_message)}</div>`}
      <div style="display:flex;gap:14px;align-items:flex-start">${thumb}<div style="min-width:0;flex:1">
        ${s.message ? `<div data-qr-result style="color:${colour};font-weight:${s.state === 'empty' ? 400 : 600};font-size:14px;word-break:break-word">${h(s.message)}</div>` : ''}
        ${s.file ? `<div class="small muted" style="margin-top:4px;word-break:break-all">${h(s.file.name)}${s.short_url ? ` · short link ${h(s.short_url)}` : ''}</div>` : ''}
        ${s.checked_at ? `<div class="small muted" style="margin-top:2px">Checked ${h(fmtDate(s.checked_at, true))}${s.by ? ` · uploaded by ${h(s.by)}` : ''}</div>` : ''}
        <div class="btn-row" style="margin-top:8px">
          <label class="btn ${s.file ? 'btn-ghost' : 'btn-primary'}" style="${s.unlocked && !busySlot ? 'cursor:pointer' : 'opacity:.5;pointer-events:none'}">${s.file ? 'Upload a different file' : 'Upload PNG or SVG'}<input type="file" data-qr-file="${attr(s.key)}" accept=".png,.svg,image/png,image/svg+xml" style="display:none"${s.unlocked ? off : ' disabled'}></label>
          ${s.can_recheck ? `<button type="button" class="btn btn-ghost" data-qr="recheck" data-key="${attr(s.key)}"${off}>Re-check</button>` : ''}
          ${s.file && s.file.kept ? `<a class="btn btn-ghost" href="${attr(`${url}/file/${s.key}?download=1`)}">Download</a>` : ''}
          ${s.state !== 'empty' ? `<button type="button" class="btn btn-ghost" data-qr="remove" data-key="${attr(s.key)}"${off}>Remove</button>` : ''}
        </div></div></div></div>`;
  };
  const upload = () => card({
    title: '3 Upload and check', sub: 'Upload each code you downloaded from QR.io. Copybot reads it, follows its link and checks it lands in the right place',
    body: `<div data-qr-ready="${V.upload.ready ? '1' : '0'}" class="small" style="${V.upload.ready ? 'color:#166534;font-weight:600' : 'color:var(--muted)'}">${V.upload.ready ? 'All three codes are checked.' : `${V.upload.slots.filter(s => s.state === 'ok').length} of 3 codes checked`}</div>${V.upload.slots.map(slot).join('')}`,
  });
  // One slot's call at a time: the upload (multipart, so not through api()), Re-check or Remove
  const slotCall = async (key, path, opts) => {
    if (busySlot) return;
    busySlot = key; draw();
    try {
      const r = await fetch(`${url}/upload/${key}${path}`, opts);
      if (r.status === 401) { location.href = '/login.html'; return; }
      const data = await r.json().catch(() => null);
      if (!r.ok) throw new Error((data && data.error) || `${r.status} ${r.statusText}`);
      V = data;
    } catch (err) { console.error('[qr-codes]', err); toast(err.message, 'bad'); }
    busySlot = null; draw();
  };

  // A link with no answer yet is fetched as soon as the tab shows it (keys: only those; all: again)
  const runCheck = async (body = {}) => {
    if (checking) return;
    checking = true; draw();
    try { V = await api(`${url}/check`, { method: 'POST', body }); }
    catch (err) { console.error('[qr-codes]', err); toast(err.message, 'bad'); }
    checking = false; draw();
  };
  const autoCheck = () => { if (V && !checking && V.prepare.codes.some(c => c.state === 'unchecked') && !tried.has(sig())) { tried.add(sig()); runCheck(); } };
  // One automatic try per set of links: a check that could not be saved is not tried in a loop
  const tried = new Set();
  const sig = () => V.prepare.codes.filter(c => c.state === 'unchecked').map(c => c.destination).join(' ');

  function draw() {
    const a = document.activeElement, key = a && el.contains(a) && a.dataset ? a.dataset.qf : null;
    const keep = key && a.type !== 'checkbox' ? { value: a.value, start: a.selectionStart, end: a.selectionEnd } : null;
    if (onStatus && V.status) onStatus(V.status);
    el.innerHTML = `<div class="stack">${card({
      title: 'QR code details', sub: 'Filled from the client record. What you change here stays on this tab: the Record tab is never changed',
      body: `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:0 16px">${field('qr_niche_label')}${field('qr_business_name')}</div>
        ${field('review_funnel_url')}
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:0 16px">${field('whatsapp_number')}${field('website_url')}</div>`,
    })}${prepare()}${make()}${upload()}</div>`;
    if (keep) {
      const n = el.querySelector(`[data-qf="${key}"]`);
      if (n) { n.value = keep.value; n.focus({ preventScroll: true }); try { n.setSelectionRange(keep.start, keep.end); } catch (_) { /* no selection */ } }
    }
  }

  const save = async (key, value) => {
    if (key !== 'website_temporary') typed[key] = value;
    delete errors[key];
    try { V = await api(url, { method: 'PUT', body: { set: { [key]: value } } }); delete typed[key]; }
    catch (err) {
      // A refused value stays in its box with the reason under it
      if (err.status === 400 && ORDER.includes(key)) errors[key] = err.message;
      else { console.error('[qr-codes]', err); delete typed[key]; toast(err.message, 'bad'); }
    }
    draw(); autoCheck();
  };

  el.addEventListener('change', async e => {
    const fileSlot = e.target.dataset && e.target.dataset.qrFile;
    if (fileSlot) {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const form = new FormData();
      form.append('file', f); form.append('by', by());
      return slotCall(fileSlot, '', { method: 'POST', body: form });
    }
    const tickId = e.target.dataset && e.target.dataset.qrTick;
    if (tickId) {
      e.target.disabled = true;
      try { V = await api(`${url}/tick`, { method: 'POST', body: { id: tickId, ticked: e.target.checked, by: by() } }); }
      catch (err) { console.error('[qr-codes]', err); toast(err.message, 'bad'); }
      return draw();
    }
    const key = e.target.dataset && e.target.dataset.qf;
    if (!key) return;
    save(key, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
  });
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-qr]');
    if (!b) return;
    e.preventDefault();
    if (b.dataset.qr === 'reload') return load();
    if (b.dataset.qr === 'recheck') return slotCall(b.dataset.key, '/recheck', { method: 'POST' });
    if (b.dataset.qr === 'remove') return slotCall(b.dataset.key, '', { method: 'DELETE' });
    if (b.dataset.qr === 'copy') return copyText(b.dataset.text, b);
    if (b.dataset.qr === 'check') return runCheck({ keys: [b.dataset.key], all: true });
    if (b.dataset.qr === 'hand') {
      try { V = await api(`${url}/checked-by-hand`, { method: 'POST', body: { key: b.dataset.key, by: by() } }); } catch (err) { console.error('[qr-codes]', err); toast(err.message, 'bad'); }
      return draw();
    }
    if (b.dataset.qr === 'reset') {
      const key = b.dataset.key;
      delete typed[key]; delete errors[key];
      try { V = await api(url, { method: 'PUT', body: { reset: [key] } }); } catch (err) { console.error('[qr-codes]', err); toast(err.message, 'bad'); }
      draw(); autoCheck();
    }
  });

  const load = async () => {
    try { V = await api(url); draw(); autoCheck(); }
    catch (e) { console.error('[qr-codes]', e); el.innerHTML = failed({ title: 'The QR codes tab could not load', reason: e.message, retry: '<button class="btn btn-ghost" data-qr="reload">Retry</button>' }); }
  };
  await load();
}
