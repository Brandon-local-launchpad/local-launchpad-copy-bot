// The live tracker (10 Nov 2026): what Copybot has done for a client and what waits on a
// person now. The rules are ui/tracker.js on the server (row.tracker on the summary and the
// dashboard); this only draws them. Used by the client page strip and the dashboard queue.

import { h, timeEl, running } from './ui.js';
import { waitingList } from './tell-brandon.js';
import { stepOwnerTag, sopLink, stepButtons } from './team.js';

// Where a step is done: a client tab, or one of the app's own screens
export const stepHref = (clientId, tab) => !tab ? `/clients/${clientId}` : tab === 'clients' ? '/clients' : tab === 'trade-facts' ? '/trade-facts' : `/clients/${clientId}/${tab}`;

// brandon: the client's asks still waiting on Brandon (row.brandon, brandon/service.js)
export function trackerStrip(clientId, t, { open = true, brandon = [] } = {}) {
  const needs = t.needs.length
    ? `<ol class="trk-list">${t.needs.map((n, i) => `<li class="${i === 0 ? 'first' : ''}"><a href="${stepHref(clientId, n.tab)}" data-link>${h(n.text)}</a> ${stepOwnerTag(n)}${stepButtons(clientId, n)}${sopLink(n.sop) ? ` ${sopLink(n.sop)}` : ''}${n.key === 'chase' ? ' <button class="btn btn-ghost btn-xs" data-chase>Open the message</button>' : ''}${n.tick ? ` <button class="btn btn-ghost btn-xs" data-onb-done="${h(n.tick)}">Done</button>` : ''}${n.why ? `<span class="sub">${h(n.why)}</span>` : ''}</li>`).join('')}</ol>`
    : `<p class="muted small">${t.running.length ? 'Nothing to do while this runs.' : 'Nothing is waiting on a person.'}</p>`;
  const done = t.done.length
    ? `<ul class="trk-list done">${t.done.map(d => `<li><a href="${stepHref(clientId, d.tab)}" data-link>${h(d.text)}</a>${d.auto ? ' <span class="tag accent">automatic</span>' : ''}${d.detail ? ` <span class="muted small">${h(d.detail)}</span>` : ''}${d.at ? ` <span class="muted small">${timeEl(d.at)}</span>` : ''}</li>`).join('')}</ul>`
    : '<p class="muted small">Nothing yet.</p>';
  const runs = t.running.length ? `<div class="trk-run">${t.running.map(r => `<div><span class="small muted">${h(r.kind)}</span>${running({ now: r.now, next: r.next, done: r.done, total: r.total })}</div>`).join('')}</div>` : '';
  const head = `<button class="trk-head" id="trkToggle" aria-expanded="${open}"><strong>Tracker</strong>
      <span class="pill ${t.needs.length ? 'wait' : 'ok'}">${t.needs.length ? `${t.needs.length} for a person` : 'nothing for a person'}</span>
      ${t.running.length ? '<span class="pill run">running</span>' : ''}
      ${brandon.length ? `<span class="pill wait">${brandon.length} waiting on Brandon</span>` : ''}
      <span class="pill">${t.done.length} done by Copybot</span>
      ${!open && t.next ? `<span class="small trk-next">Next: ${h(t.next.text)}</span>` : ''}
      <span class="spacer"></span><span class="small muted">${open ? 'Hide' : 'Show'}</span></button>`;
  const a = t.automation || { enabled: false };
  const autoBar = `<div class="trk-auto"><label class="check"><input type="checkbox" id="trkAuto"${a.enabled ? ' checked' : ''}> <strong>Automation ${a.enabled ? 'on' : 'off'}</strong></label>
      <span class="small muted">${a.enabled ? h(a.stopped ? 'Stopped. Sort the step below, then press Try again.' : a.waiting ? `Waiting on: ${a.waiting}` : t.running.length ? 'Working.' : 'Looking for the next step (checked every minute).') : 'Off: every step waits for someone to press its button. On: Copybot starts each step itself and stops at every approval.'}</span>
      ${a.enabled && (a.stopped || t.needs.some(n => n.key.startsWith('auto_'))) ? '<button class="btn btn-ghost btn-sm" id="trkRetry">Try again</button>' : ''}
      <span class="spacer"></span><button class="btn btn-ghost btn-sm" id="trkTask" title="A one off task on this client, for you or someone else">Add a task</button><button class="btn btn-ghost btn-sm" id="trkTell" title="Send Brandon a question about this client: saved here, emailed, and typed into WhatsApp">Tell Brandon</button></div>`;
  return `<div class="card trk">${head}${open ? `${autoBar}${runs}<div class="trk-cols">
      <div><h3>Needs a person</h3>${needs}${t.later ? `<p class="muted small" style="margin-top:8px">${t.later} more step${t.later === 1 ? ' opens' : 's open'} up once these are done.</p>` : ''}${brandon.length ? `<h3 style="margin-top:14px">Waiting on Brandon</h3>${waitingList(brandon.map(a => ({ ...a, client: '' })))}` : ''}</div>
      <div><h3>Done by Copybot</h3>${done}</div></div>` : ''}</div>`;
}
