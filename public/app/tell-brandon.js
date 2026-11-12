// Tell Brandon (12 Nov 2026): the button's dialog, shared by every screen it is on. A reason from the
// screen's list (brandon/reasons.json), a line of your own, and the screen's details go to Brandon:
// saved in Copybot (Waiting on Brandon until he marks it done), emailed to him at once, and typed into
// WhatsApp for you to press send. Only ever to Brandon, never to a client.

import { h, attr, api, dialog, toast, copyText } from './ui.js';

const who = by => by || (() => { try { return localStorage.getItem('ll_user') || ''; } catch (_) { return ''; } })();

// clientId, clientName, place (a key of brandon/reasons.json), context [{ label, value }], tab (where the
// link in the message goes), by, onSent()
export async function tellBrandon({ clientId, clientName = '', place = 'client', context = [], tab = '', by = '', onSent = () => {} }) {
  let R;
  try { R = await api(`/api/brandon/reasons?place=${encodeURIComponent(place)}`); } catch (e) { toast(e.message, 'bad'); return; }
  const facts = (context || []).filter(c => c && String(c.value || '').trim());
  const d = dialog({ title: `Tell Brandon${clientName ? `: ${clientName}` : ''}`, wide: true, body: `
    <label class="small" style="display:block;margin-bottom:10px"><strong>What is it about?</strong>
      <select class="input" data-tb-reason style="width:100%;margin-top:4px"><option value="">Choose one</option>${R.reasons.map(r => `<option value="${attr(r)}">${h(r)}</option>`).join('')}</select></label>
    <label class="small" style="display:block;margin-bottom:10px"><strong>Anything to add</strong> <span class="muted">(what you checked, what you need from him)</span>
      <textarea class="input" data-tb-note rows="3" style="width:100%;font:inherit;margin-top:4px"></textarea></label>
    ${facts.length ? `<div class="small muted" style="margin-bottom:4px">Sent with it:</div><ul class="small" style="margin:0 0 10px 18px">${facts.map(c => `<li><strong>${h(c.label)}:</strong> ${h(String(c.value).slice(0, 200))}${String(c.value).length > 200 ? '…' : ''}</li>`).join('')}</ul>` : ''}
    <div class="small muted" style="margin-bottom:10px">It is saved here and emailed to ${h(R.email)} straight away${R.whatsapp ? ', then WhatsApp opens with it typed for you to send' : '. WhatsApp is not set up yet (TELL_BRANDON_WHATSAPP on Railway), so you can copy it instead'}.</div>
    <div class="btn-row"><button class="btn btn-primary" data-tb-send>Send to Brandon</button></div>` });
  const el = d.el;
  el.querySelector('[data-tb-send]').addEventListener('click', async e => {
    const reason = el.querySelector('[data-tb-reason]').value;
    if (!reason) { toast('Choose what it is about', 'bad'); return; }
    e.target.disabled = true; e.target.textContent = 'Sending…';
    try {
      const r = await api(`/api/clients/${clientId}/brandon/asks`, { method: 'POST', body: { place, reason, note: el.querySelector('[data-tb-note]').value, context: facts, tab, by: who(by) } });
      // WhatsApp opens from a click of its own, so no browser blocks it as a popup
      el.innerHTML = `<p class="small" style="margin-bottom:8px">${r.emailed ? `Saved and emailed to ${h(R.email)}.` : 'Saved, but not emailed, so make sure the message below reaches him.'} It shows as Waiting on Brandon until he marks it done.</p>
        <textarea class="input" data-tb-msg rows="10" readonly style="width:100%;font:inherit">${h(r.message)}</textarea>
        <div class="btn-row" style="margin-top:10px">${r.whatsapp ? `<a class="btn btn-primary" href="${attr(r.whatsapp)}" target="_blank" rel="noopener" data-tb-wa>Open WhatsApp and send</a>` : ''}<button class="btn btn-ghost" data-tb-copy>Copy</button></div>`;
      el.querySelector('[data-tb-copy]').addEventListener('click', ev => copyText(r.message, ev.target));
      onSent(r);
    } catch (err) { toast(err.message, 'bad'); e.target.disabled = false; e.target.textContent = 'Send to Brandon'; }
  });
}

// Waiting on Brandon: the open asks, each with Done (Brandon's, or anyone's once it is sorted)
export const waitingList = asks => (asks && asks.length
  ? `<ul class="trk-list">${asks.map(a => `<li>${a.client ? `<strong>${h(a.client)}</strong>: ` : ''}${h(a.reason)}${a.note ? ` <span class="muted small">${h(String(a.note).slice(0, 120))}</span>` : ''} <span class="muted small">${h(a.by || '')}${a.by ? ', ' : ''}${h(String(a.at || a.created_at || '').slice(0, 10))}</span> <button class="btn btn-ghost btn-xs" data-tb-done="${attr(a.id)}">Done</button></li>`).join('')}</ul>`
  : '<p class="muted small">Nothing waiting on Brandon.</p>');

export async function markDone(id, by = '') {
  await api(`/api/brandon/asks/${id}/done`, { method: 'POST', body: { by: who(by) } });
  toast('Marked done');
}
