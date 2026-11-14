// The board (the task board, stage 4; Brandon, 14 Nov 2026): every client as a card in the
// column of the stage it is at, with who it is waiting on and for how long. Nobody moves a
// card: the stage and the tasks come from the dashboard row (ui/dashboard.js, ui/tracker.js).
// ?who=<person id> keeps only the clients waiting on that person.

import { h, attr, api, failed, empty, plural, wire } from '../ui.js';
import { loadTeam, teamNow, isMine, ownerName, waitDays } from '../team.js';

export async function render(root, params, ctx) {
  ctx.setTitle('Board');
  let data = null;
  const people = () => teamNow().people.filter(p => p.active);

  const card = (c, steps) => {
    // The people this client is waiting on, each with how many steps; a task given to one person shows that person
    const by = new Map();
    for (const s of steps) { const who = s.person_id && s.person ? s.person : ownerName(s.owner); by.set(who, { n: (by.get(who) || { n: 0 }).n + 1, role: s.owner }); }
    const oldest = Math.max(0, ...steps.map(waitDays));
    const tags = [...by.entries()].map(([who, v]) => `<span class="tag owner r-${h(v.role)}">${h(who)} ${v.n}</span>`).join('');
    return `<a class="board-card${steps.length ? '' : ' quiet'}" href="/clients/${attr(c.id)}" data-link>
      <span class="name">${h(c.name)}</span>
      <span class="tags">${tags || '<span class="tag ok">nothing for a person</span>'}${oldest ? `<span class="tag ${oldest >= 7 ? 'block' : oldest >= 3 ? 'wait' : ''}">${oldest} day${oldest === 1 ? '' : 's'}</span>` : ''}${c.running ? '<span class="tag run">running</span>' : ''}</span>
      ${steps[0] ? `<span class="next">Next: ${h(steps[0].text)}</span>` : ''}</a>`;
  };

  const draw = () => {
    const who = ctx.query.who ? people().find(p => String(p.id) === ctx.query.who) : null;
    const clients = data.clients.filter(c => !c.archived);
    const stepsOf = c => { const all = (c.tracker && c.tracker.needs) || []; return who ? all.filter(s => isMine(s, who)) : all; };
    const shown = who ? clients.filter(c => stepsOf(c).length) : clients;
    const tabs = `<div class="tabs"><a class="tab${who ? '' : ' active'}" href="/board" data-link>Everyone</a>${people().map(p => `<a class="tab${who && who.id === p.id ? ' active' : ''}" href="/board?who=${p.id}" data-link>${h(p.name)}</a>`).join('')}</div>`;
    const cols = data.stages.map(stage => {
      const list = shown.filter(c => c.stage === stage).sort((a, b) => new Date(a.last_activity) - new Date(b.last_activity));
      return `<div class="board-col"><h3><span>${h(stage)}</span><span>${list.length}</span></h3>${list.map(c => card(c, stepsOf(c))).join('') || '<p class="muted small" style="margin:4px">Nobody here.</p>'}</div>`;
    }).join('');
    root.innerHTML = `<div class="ph"><div class="ph-title"><h1>Board</h1><div class="ph-meta">${h(plural(shown.length, 'client'))}${who ? ` waiting on ${h(who.name)}` : ''} · a card moves by itself as its client's work is done</div></div></div>
      ${tabs}
      ${shown.length ? `<div class="board">${cols}</div>` : empty({ title: who ? `Nothing is waiting on ${who.name}` : 'No clients yet', text: 'A client shows here in the column of the stage it is at.' })}`;
  };

  const load = async () => {
    try { [data] = await Promise.all([api('/api/dashboard'), loadTeam()]); }
    catch (e) { root.innerHTML = failed({ title: 'The board could not load', reason: e.message, retry: '<button class="btn btn-ghost" id="retry">Retry</button>' }); root.querySelector('#retry').onclick = load; return; }
    draw();
  };
  wire(root);
  await load();
}
