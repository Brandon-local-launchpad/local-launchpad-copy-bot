// The task board's People list in the browser (14 Nov 2026): read once by the shell before
// the first screen, so the Tracker strip, the dashboard queue and My tasks can all say who
// does a step without each fetching it. The rules are team/rules.js on the server: a step
// arrives with `owner` (a role) and `sop` already on it; this only turns a role into names.

import { h, attr, api, dialog, toast } from './ui.js';

let team = null;
export async function loadTeam() { team = await api('/api/team'); return team; }
export const teamNow = () => team || { roles: {}, people: [] };

const active = () => teamNow().people.filter(p => p.active);
export const roleLabel = role => teamNow().roles[role] || role || '';
// Who does a role's steps: the people holding it, else the job's own name
export const ownerName = role => active().filter(p => p.role === role).map(p => p.name).join(' / ') || roleLabel(role);
export const ownerTag = role => role ? `<span class="tag owner r-${h(role)}" title="${attr(roleLabel(role))}">${h(ownerName(role))}</span>` : '';
export const sopLink = sop => sop && sop.url ? `<a class="sop-link" href="${attr(sop.url)}" target="_blank" rel="noopener" title="${attr(`${sop.title}${sop.section ? `: ${sop.section}` : ''}`)}">How to do this</a>` : '';

// The person using this browser: the name kept by the shell (ll_user), matched to the People list
export function me() {
  let name = '';
  try { name = (localStorage.getItem('ll_user') || '').trim().toLowerCase(); } catch (_) {}
  return name ? active().find(p => p.name.toLowerCase() === name) || null : null;
}

// ── Stage 2: the steps a person ticks Done (by hand steps, one off tasks) and Add a task ──

export const myName = () => { const p = me(); if (p) return p.name; try { return localStorage.getItem('ll_user') || ''; } catch (_) { return ''; } };
// A one off task given to one person is theirs alone; everything else goes by the job
export const isMine = (step, person) => (step.person_id ? step.person_id === person.id : step.owner === person.role);
// Who a step is for: the person a task was given to, else whoever holds the job
export const stepOwnerTag = step => step.person_id && step.person ? `<span class="tag owner r-${h(step.owner)}">${h(step.person)}</span>` : ownerTag(step.owner);
// The Done button of a step only a person can close, and a task's due date
export const stepButtons = (clientId, step) => `${step.due ? ` <span class="tag ${step.urgent ? 'block' : ''}">${step.urgent ? 'was due' : 'due'} ${h(step.due)}</span>` : ''}${step.hand ? ` <button class="btn btn-ghost btn-xs" data-hand-done="${attr(step.hand)}" data-client="${attr(clientId)}">Done</button>` : ''}${step.task ? ` <button class="btn btn-ghost btn-xs" data-task-done="${attr(step.task)}">Done</button>` : ''}`;

// Handles a click on one of those buttons; true when it was one (the caller then reloads)
export async function doneClick(e) {
  const hb = e.target.closest('[data-hand-done]'), tb = e.target.closest('[data-task-done]');
  if (!hb && !tb) return false;
  const b = hb || tb;
  b.disabled = true;
  try {
    if (hb) await api(`/api/clients/${hb.dataset.client}/hand-steps/${hb.dataset.handDone}/done`, { method: 'POST', body: { done: true, by: myName() } });
    else await api(`/api/tasks/${tb.dataset.taskDone}/done`, { method: 'POST', body: { done: true, by: myName() } });
    toast('Ticked done');
  } catch (err) { b.disabled = false; toast(err.message, 'bad'); }
  return true;
}

// Add a task on a client: the words, who it is for, an optional due date
export function addTaskDialog({ clientId, clientName, onAdded }) {
  const people = teamNow().people.filter(p => p.active), mine = me();
  const d = dialog({ title: `Add a task for ${clientName}`, body: `<p class="small muted" style="margin-bottom:10px">For anything Copybot cannot see: a call to make, something to chase. It shows on the Tracker and on that person's My tasks until someone presses Done.</p>
    <label class="small muted">What needs doing</label><textarea class="input" id="tkText" rows="3" style="width:100%;margin:4px 0 10px" placeholder="Ring the client about the price list"></textarea>
    <div class="btn-row"><label class="small muted">Who <select class="input" id="tkWho" style="width:auto">${people.map(p => `<option value="${p.id}"${mine && mine.id === p.id ? ' selected' : ''}>${h(p.name)}</option>`).join('')}</select></label>
    <label class="small muted">Due (optional) <input class="input" type="date" id="tkDue" style="width:auto"></label></div>
    <div class="btn-row" style="margin-top:14px"><button class="btn btn-primary" id="tkAdd">Add the task</button></div>` });
  d.el.querySelector('#tkAdd').addEventListener('click', async () => {
    const text = d.el.querySelector('#tkText').value.trim();
    if (!text) return toast('Say what needs doing', 'bad');
    try { await api(`/api/clients/${clientId}/tasks`, { method: 'POST', body: { text, person_id: Number(d.el.querySelector('#tkWho').value), due: d.el.querySelector('#tkDue').value, by: myName() } }); toast('Task added'); d.close(); if (onAdded) onAdded(); }
    catch (err) { toast(err.message, 'bad'); }
  });
}
