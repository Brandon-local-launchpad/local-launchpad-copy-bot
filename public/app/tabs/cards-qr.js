// The QR codes subtab of the Review & Referral Cards tab (14 Nov 2026, Brandon; qr-codes/). Every
// client gets three QR codes, made by a person in QR.io: Review Funnel, Scan to Claim and View Our
// Services. This subtab prepares what that person needs and, later, checks the finished codes.
// Built so far: the five fields at the top, filled from the client record (stage 1), and 1 Prepare
// (stage 2): the folder name, each code's QR name and destination in read-only boxes with Copy, the
// WhatsApp message and link, and each code's link check. A value typed here stays on this tab only:
// the Record tab is never changed. A field is saved when it is left; a value that is refused (a
// Google link as the review funnel) is kept in the box with the reason. A link not yet checked is
// checked as soon as the tab shows it; one Copybot cannot fetch can be passed by hand.

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

export async function mount(el, ctx) {
  const url = `/api/clients/${ctx.clientId}/qr-codes`;
  let V = null, checking = false;
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
    el.innerHTML = `<div class="stack">${card({
      title: 'QR code details', sub: 'Filled from the client record. What you change here stays on this tab: the Record tab is never changed',
      body: `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:0 16px">${field('qr_niche_label')}${field('qr_business_name')}</div>
        ${field('review_funnel_url')}
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:0 16px">${field('whatsapp_number')}${field('website_url')}</div>`,
    })}${prepare()}
      <div class="small muted">Next to be built on this tab: 2 Make in QR.io, 3 Upload and check.</div></div>`;
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

  el.addEventListener('change', e => {
    const key = e.target.dataset && e.target.dataset.qf;
    if (!key) return;
    save(key, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
  });
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-qr]');
    if (!b) return;
    e.preventDefault();
    if (b.dataset.qr === 'reload') return load();
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
