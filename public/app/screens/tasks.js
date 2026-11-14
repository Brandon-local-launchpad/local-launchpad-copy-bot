// My tasks (the task board, stage 1; Brandon, 14 Nov 2026): everything waiting on one person,
// client by client, each line opening the place to do it. The tasks are the Tracker's own
// steps (ui/tracker.js) with the owner team/rules.js gives them, plus the asks sent with
// Tell Brandon: nothing is stored, so a task goes when its step is done. ?who=<person id>
// shows that person's list, ?who=all everyone's; with neither it is the person this browser
// belongs to (picked here the first time, kept by the shell).

import { h, attr, api, card, empty, failed, timeEl, plural, wire, toast } from '../ui.js';
import { stepHref } from '../tracker.js';
import { loadTeam, teamNow, me, ownerTag, sopLink, roleLabel } from '../team.js';
import { setUserName } from '../shell.js';
import { markDone } from '../tell-brandon.js';

export async function render(root, params, ctx) {
  ctx.setTitle('My tasks');
  let data = null;

  const people = () => teamNow().people.filter(p => p.active);
  // Who the list is for: a person, or null for everyone
  const showing = () => {
    const who = ctx.query.who || '';
    if (who === 'all') return { all: true, person: null };
    const p = who ? people().find(x => String(x.id) === who) : me();
    return { all: false, person: p || null };
  };

  const stepLine = (b, s, withOwner) => {
    const where = s.key === 'ask' ? `/clients/${b.client_id}` : stepHref(b.client_id, s.tab);
    return `<li class="${s.urgent ? 'first' : ''}"><a href="${attr(where)}" data-link>${h(s.text)}</a>${withOwner ? ` ${ownerTag(s.owner)}` : ''}${sopLink(s.sop) ? ` ${sopLink(s.sop)}` : ''}${s.key === 'ask' ? ` <button class="btn btn-ghost btn-xs" data-tb-done="${attr(s.ask_id)}">Done</button>` : ''}${s.why ? `<span class="sub">${h(s.why)}</span>` : ''}</li>`;
  };

  const draw = () => {
    const { all, person } = showing();
    const mine = me();
    // Nobody picked yet: ask once, then the list is theirs
    if (!all && !person) {
      root.innerHTML = `<div class="ph"><div class="ph-title"><h1>My tasks</h1><div class="ph-meta">Pick your name once and this browser remembers it</div></div></div>
        ${card({ title: 'Who are you?', sub: 'Your list is the steps your job covers, on every client. You can change this on Settings.', body: `<div class="btn-row">${people().map(p => `<button class="btn btn-ghost" data-me="${attr(p.name)}">${h(p.name)}<span class="sub" style="margin-left:6px">${h(roleLabel(p.role))}</span></button>`).join('')}<a class="btn btn-ghost" href="/tasks?who=all" data-link>Just show everyone's</a></div>` })}`;
      return;
    }
    const blocks = data.blocks.map(b => ({ ...b, steps: all ? b.steps : b.steps.filter(s => s.owner === person.role) })).filter(b => b.steps.length);
    const total = blocks.reduce((n, b) => n + b.steps.length, 0);
    const tabs = `<div class="tabs" id="who">${people().map(p => `<a class="tab${!all && person.id === p.id ? ' active' : ''}" href="/tasks?who=${p.id}" data-link>${h(p.name)}${mine && mine.id === p.id ? ' (you)' : ''} <span class="count">${data.counts[p.role] || 0}</span></a>`).join('')}<a class="tab${all ? ' active' : ''}" href="/tasks?who=all" data-link>Everyone <span class="count">${Object.values(data.counts).reduce((a, b) => a + b, 0)}</span></a></div>`;
    const title = all ? 'Everyone\'s tasks' : mine && mine.id === person.id ? 'My tasks' : `${person.name}'s tasks`;
    const sub = all ? 'Every step waiting on a person, with who does it' : `${roleLabel(person.role)}: the steps this job covers, on every client`;
    const body = blocks.length
      ? `<div class="queue">${blocks.map(b => `<div class="queue-row"><div class="queue-who"><a href="/clients/${b.client_id}" data-link><strong>${h(b.client)}</strong></a><span class="sub">${h(b.stage)} · ${timeEl(b.last_activity)}</span></div>
          <ol class="trk-list tasks">${b.steps.map(s => stepLine(b, s, all)).join('')}</ol></div>`).join('')}</div>`
      : empty({ title: all ? 'Nothing is waiting on a person' : `Nothing is waiting on ${mine && mine.id === person.id ? 'you' : person.name}`, text: 'A task shows here as soon as a step opens on a client.' });
    root.innerHTML = `<div class="ph"><div class="ph-title"><h1>${h(title)}</h1><div class="ph-meta">${h(plural(total, 'task'))} on ${h(plural(blocks.length, 'client'))} · ${h(new Date(data.generated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))}</div></div></div>
      ${tabs}
      ${card({ title: all ? 'Open tasks' : 'Waiting on ' + (mine && mine.id === person.id ? 'you' : person.name), sub: `${sub}. The longest quiet client first; each line opens the place to do it, and goes by itself once it is done.`, body })}`;
  };

  const load = async () => {
    try { [data] = await Promise.all([api('/api/tasks'), loadTeam()]); }
    catch (e) { root.innerHTML = failed({ title: 'The tasks could not load', reason: e.message, retry: '<button class="btn btn-ghost" id="retry">Retry</button>' }); root.querySelector('#retry').onclick = load; return; }
    draw();
  };

  const onClick = async e => {
    const pick = e.target.closest('[data-me]');
    if (pick) { setUserName(pick.dataset.me); toast(`This browser is ${pick.dataset.me}'s`); return draw(); }
    const d = e.target.closest('[data-tb-done]');
    if (d) { d.disabled = true; try { await markDone(d.dataset.tbDone); await load(); } catch (err) { d.disabled = false; toast(err.message, 'bad'); } }
  };
  root.addEventListener('click', onClick);
  wire(root);
  await load();
  return () => root.removeEventListener('click', onClick);
}
