// The QR codes subtab of the Review & Referral Cards tab (14 Nov 2026, Brandon; qr-codes/). Every
// client gets three QR codes, made by a person in QR.io: Review Funnel, Scan to Claim and View Our
// Services. This subtab prepares what that person needs and, later, checks the finished codes.
// Built so far (stage 1): the five fields at the top, filled from the client record. A value typed
// here stays on this tab only: the Record tab is never changed. A field is saved when it is left;
// a value that is refused (a Google link as the review funnel) is kept in the box with the reason.

import { h, attr, api, card, toast, failed } from '../ui.js';

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
  let V = null;
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

  function draw() {
    const a = document.activeElement, key = a && el.contains(a) && a.dataset ? a.dataset.qf : null;
    const keep = key && a.type !== 'checkbox' ? { value: a.value, start: a.selectionStart, end: a.selectionEnd } : null;
    el.innerHTML = `<div class="stack">${card({
      title: 'QR code details', sub: 'Filled from the client record. What you change here stays on this tab: the Record tab is never changed',
      body: `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:0 16px">${field('qr_niche_label')}${field('qr_business_name')}</div>
        ${field('review_funnel_url')}
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:0 16px">${field('whatsapp_number')}${field('website_url')}</div>`,
    })}
      <div class="small muted">Next to be built on this tab: 1 Prepare (the folder name, the QR names and the WhatsApp link), 2 Make in QR.io, 3 Upload and check.</div></div>`;
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
    draw();
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
    if (b.dataset.qr === 'reset') {
      const key = b.dataset.key;
      delete typed[key]; delete errors[key];
      try { V = await api(url, { method: 'PUT', body: { reset: [key] } }); } catch (err) { console.error('[qr-codes]', err); toast(err.message, 'bad'); }
      draw();
    }
  });

  const load = async () => {
    try { V = await api(url); draw(); }
    catch (e) { console.error('[qr-codes]', e); el.innerHTML = failed({ title: 'The QR codes tab could not load', reason: e.message, retry: '<button class="btn btn-ghost" data-qr="reload">Retry</button>' }); }
  };
  await load();
}
