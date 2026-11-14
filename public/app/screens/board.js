// The board (the task board, stage 4; Brandon, 14 Nov 2026). Two views of the same facts:
//   /board               every client as a card in the column of the stage it is at, with who
//                        it is waiting on and for how long; ?who=<person id> keeps one person's
//   /board/<client id>   one client: a column per person on the team, that client's open steps
//                        as cards under whoever does them, then what is done
// Nobody moves a card: the stage and the steps come from the dashboard row (ui/dashboard.js,
// ui/tracker.js), so a card goes when its step is done.

import { h, attr, api, failed, empty, plural, wire, toast, timeEl } from '../ui.js';
import { stepHref } from '../tracker.js';
import { loadTeam, teamNow, isMine, ownerName, roleLabel, waitDays, waitTag, sopLink, stepButtons, doneClick } from '../team.js';
import { markDone } from '../tell-brandon.js';

export async function render(root, params, ctx) {
  ctx.setTitle('Board');
  let data = null;
  const people = () => teamNow().people.filter(p => p.active);
  const live = () => data.clients.filter(c => !c.archived).sort((a, b) => a.name.localeCompare(b.name));

  // ── Every client ──
  const card = (c, steps) => {
    // The people this client is waiting on, each with how many steps; a task given to one person shows that person
    const by = new Map();
    for (const s of steps) { const who = s.person_id && s.person ? s.person : ownerName(s.owner); by.set(who, { n: (by.get(who) || { n: 0 }).n + 1, role: s.owner }); }
    const oldest = Math.max(0, ...steps.map(waitDays));
    const tags = [...by.entries()].map(([who, v]) => `<span class="tag owner r-${h(v.role)}">${h(who)} ${v.n}</span>`).join('');
    return `<a class="board-card${steps.length ? '' : ' quiet'}" href="/board/${attr(c.id)}" data-link title="Open this client's board">
      <span class="name">${h(c.name)}</span>
      <span class="tags">${tags || '<span class="tag ok">nothing for a person</span>'}${oldest ? `<span class="tag ${oldest >= 7 ? 'block' : oldest >= 3 ? 'wait' : ''}">${oldest} day${oldest === 1 ? '' : 's'}</span>` : ''}${c.running ? '<span class="tag run">running</span>' : ''}</span>
      ${steps[0] ? `<span class="next">Next: ${h(steps[0].text)}</span>` : ''}</a>`;
  };

  const drawAll = () => {
    const who = ctx.query.who ? people().find(p => String(p.id) === ctx.query.who) : null;
    const clients = data.clients.filter(c => !c.archived);
    const stepsOf = c => { const all = (c.tracker && c.tracker.needs) || []; return who ? all.filter(s => isMine(s, who)) : all; };
    const shown = who ? clients.filter(c => stepsOf(c).length) : clients;
    const tabs = `<div class="tabs"><a class="tab${who ? '' : ' active'}" href="/board" data-link>Everyone</a>${people().map(p => `<a class="tab${who && who.id === p.id ? ' active' : ''}" href="/board?who=${p.id}" data-link>${h(p.name)}</a>`).join('')}</div>`;
    const cols = data.stages.map(stage => {
      const list = shown.filter(c => c.stage === stage).sort((a, b) => new Date(a.last_activity) - new Date(b.last_activity));
      return `<div class="board-col"><h3><span>${h(stage)}</span><span>${list.length}</span></h3>${list.map(c => card(c, stepsOf(c))).join('') || '<p class="muted small" style="margin:4px">Nobody here.</p>'}</div>`;
    }).join('');
    root.innerHTML = `<div class="ph"><div class="ph-title"><h1>Board</h1><div class="ph-meta">${h(plural(shown.length, 'client'))}${who ? ` waiting on ${h(who.name)}` : ''} · a card moves by itself as its client's work is done · click a card for that client's own board</div></div>
        <div class="ph-actions">${picker('')}</div></div>
      ${tabs}
      ${shown.length ? `<div class="board">${cols}</div>` : empty({ title: who ? `Nothing is waiting on ${who.name}` : 'No clients yet', text: 'A client shows here in the column of the stage it is at.' })}`;
  };

  // The client picker, on both views: a client's own board, or back to every client
  const picker = current => `<select class="input" id="boardClient" style="width:auto;max-width:260px"><option value="">${current ? 'All clients' : 'One client\'s board…'}</option>${live().map(c => `<option value="${attr(c.id)}"${c.id === current ? ' selected' : ''}>${h(c.name)}</option>`).join('')}</select>`;

  // ── One client ──
  const taskCard = (c, s) => {
    const where = s.key === 'ask' ? `/clients/${c.id}` : stepHref(c.id, s.tab);
    return `<div class="board-card task${s.urgent ? ' urgent' : ''}"><a class="name" href="${attr(where)}" data-link>${h(s.text)}</a>
      ${s.why ? `<span class="next">${h(s.why)}</span>` : ''}
      <span class="tags">${waitTag(s)}${stepButtons(c.id, s)}${s.key === 'ask' ? ` <button class="btn btn-ghost btn-xs" data-tb-done="${attr(s.ask_id)}">Done</button>` : ''}${sopLink(s.sop) ? ` ${sopLink(s.sop)}` : ''}</span></div>`;
  };

  const drawClient = () => {
    const c = data.clients.find(x => x.id === params.clientId);
    if (!c) { root.innerHTML = empty({ title: 'No such client', text: 'It may have been deleted.', action: '<a class="btn btn-primary" href="/board" data-link>Back to the board</a>' }); return; }
    ctx.setTitle(`${c.name} board`);
    const t = c.tracker || { needs: [], done: [], later: 0 };
    // The Tracker's steps, plus what was sent with Tell Brandon (his, with its own Done)
    const steps = [...t.needs, ...(c.brandon || []).map(a => ({ key: 'ask', ask_id: a.id, text: `${a.reason}${a.note ? `: ${String(a.note).slice(0, 160)}` : ''}`, why: `${a.by ? `Asked by ${a.by}` : 'Sent with Tell Brandon'}.`, owner: 'brandon', since: a.at, sop: null }))];
    const taken = new Set();
    const cols = people().map(p => {
      const mine = steps.filter(s => isMine(s, p));
      mine.forEach(s => taken.add(s));
      return `<div class="board-col"><h3><span>${h(p.name)}${roleLabel(p.role).toLowerCase() === p.name.toLowerCase() ? '' : ` <span class="muted" style="text-transform:none;letter-spacing:0">${h(roleLabel(p.role))}</span>`}</span><span>${mine.length}</span></h3>${mine.map(s => taskCard(c, s)).join('') || '<p class="muted small" style="margin:4px">Nothing waiting.</p>'}</div>`;
    });
    // A step whose job nobody on the People list holds must not vanish
    const orphans = steps.filter(s => !taken.has(s));
    if (orphans.length) cols.push(`<div class="board-col"><h3><span>Nobody yet</span><span>${orphans.length}</span></h3>${orphans.map(s => taskCard(c, s)).join('')}<p class="muted small" style="margin:4px">Give someone this job on Settings.</p></div>`);
    const done = t.done || [];
    cols.push(`<div class="board-col done"><h3><span>Done</span><span>${done.length}</span></h3>${done.map(d => `<a class="board-card quiet" href="${attr(stepHref(c.id, d.tab))}" data-link><span class="next" style="margin:0">${h(d.text)}${d.auto ? ' <span class="tag accent">automatic</span>' : ''}${d.at ? ` <span class="muted">${timeEl(d.at)}</span>` : ''}</span></a>`).join('') || '<p class="muted small" style="margin:4px">Nothing yet.</p>'}</div>`);
    root.innerHTML = `<div class="ph"><div class="ph-title"><div class="small muted"><a href="/board" data-link>Board</a> / ${h(c.name)}</div><h1>${h(c.name)}</h1><div class="ph-meta">${h(c.stage)} · ${h(plural(steps.length, 'step'))} waiting on a person${t.later ? ` · ${t.later} more open up once these are done` : ''}${c.running ? ' · something is running' : ''}</div></div>
        <div class="ph-actions">${picker(c.id)}<a class="btn btn-ghost" href="/clients/${attr(c.id)}" data-link>Open the client</a></div></div>
      <div class="board people">${cols.join('')}</div>`;
  };

  const draw = () => (params.clientId ? drawClient() : drawAll());
  const load = async () => {
    try { [data] = await Promise.all([api('/api/dashboard'), loadTeam()]); }
    catch (e) { root.innerHTML = failed({ title: 'The board could not load', reason: e.message, retry: '<button class="btn btn-ghost" id="retry">Retry</button>' }); root.querySelector('#retry').onclick = load; return; }
    draw();
  };

  const onChange = e => { if (e.target.id === 'boardClient') ctx.navigate(e.target.value ? `/board/${e.target.value}` : '/board'); };
  const onClick = async e => {
    if (await doneClick(e)) return load();
    const d = e.target.closest('[data-tb-done]');
    if (d) { d.disabled = true; try { await markDone(d.dataset.tbDone); await load(); } catch (err) { d.disabled = false; toast(err.message, 'bad'); } }
    return undefined;
  };
  root.addEventListener('change', onChange);
  root.addEventListener('click', onClick);
  wire(root);
  await load();
  return () => { root.removeEventListener('change', onChange); root.removeEventListener('click', onClick); };
}
