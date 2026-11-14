// The boards (the task board; Brandon, 14 Nov 2026). Three views of the same facts:
//   /board               everyone: a card per client in the column of the stage it is at, with
//                        who it is waiting on and for how long
//   /board?who=<id>      one person: columns for that person's own work (team/board.json
//                        `columns`, by job), a card per client in each column it has a step in
//   /board/<client id>   one client: the same six stage columns, each open step a card in the
//                        stage it belongs to, tagged with who does it; then a Done column
// The person and client views end in a Done column: what is finished, in that person's area
// (team/rules.js tagDone gives each finished line its owner) or on that client.
// Nobody moves a card: the stage, the column and the steps come with the dashboard row
// (ui/dashboard.js, ui/tracker.js, team/rules.js), so a card goes when its step is done.

import { h, attr, api, failed, empty, plural, wire, toast, timeEl } from '../ui.js';
import { stepHref } from '../tracker.js';
import { loadTeam, teamNow, isMine, ownerName, roleLabel, waitDays, waitTag, sopLink, stepButtons, stepOwnerTag, doneClick } from '../team.js';
import { markDone } from '../tell-brandon.js';

export async function render(root, params, ctx) {
  ctx.setTitle('Board');
  let data = null;
  const people = () => teamNow().people.filter(p => p.active);
  const board = () => teamNow().board || { stages: data.stages, other: 'Other tasks', columns: {} };
  const live = () => data.clients.filter(c => !c.archived).sort((a, b) => a.name.localeCompare(b.name));
  const quiet = (a, b) => new Date(a.last_activity) - new Date(b.last_activity);
  const waitChip = steps => { const d = Math.max(0, ...steps.map(waitDays)); return d ? `<span class="tag ${d >= 7 ? 'block' : d >= 3 ? 'wait' : ''}">${d} day${d === 1 ? '' : 's'}</span>` : ''; };
  // A client's open steps: the Tracker's, plus what was sent with Tell Brandon (his, in his first column, with its own Done)
  const stepsOf = c => [...((c.tracker && c.tracker.needs) || []), ...(c.brandon || []).map(a => ({ key: 'ask', ask_id: a.id, text: `${a.reason}${a.note ? `: ${String(a.note).slice(0, 160)}` : ''}`, why: `${a.by ? `Asked by ${a.by}` : 'Sent with Tell Brandon'}.`, owner: 'brandon', column: (board().columns.brandon || [])[0] || board().other, since: a.at, sop: null }))];

  const tabs = who => `<div class="tabs"><a class="tab${who ? '' : ' active'}" href="/board" data-link>Everyone</a>${people().map(p => `<a class="tab${who && who.id === p.id ? ' active' : ''}" href="/board?who=${p.id}" data-link>${h(p.name)}</a>`).join('')}</div>`;
  // The client picker, on every view: a client's own board, or back to every client
  const picker = current => `<select class="input" id="boardClient" style="width:auto;max-width:260px"><option value="">${current ? 'All clients' : 'One client’s board…'}</option>${live().map(c => `<option value="${attr(c.id)}"${c.id === current ? ' selected' : ''}>${h(c.name)}</option>`).join('')}</select>`;
  const column = (title, count, body, cls = '') => `<div class="board-col ${cls}"><h3><span>${title}</span><span>${count}</span></h3>${body || '<p class="muted small" style="margin:4px">Nothing here.</p>'}</div>`;

  // ── Everyone: a card per client in its stage ──
  const drawEveryone = () => {
    const clients = data.clients.filter(c => !c.archived);
    const card = c => {
      const steps = stepsOf(c), by = new Map();
      for (const s of steps) { const who = s.person_id && s.person ? s.person : ownerName(s.owner); by.set(who, { n: (by.get(who) || { n: 0 }).n + 1, role: s.owner }); }
      const tags = [...by.entries()].map(([who, v]) => `<span class="tag owner r-${h(v.role)}">${h(who)} ${v.n}</span>`).join('');
      return `<a class="board-card${steps.length ? '' : ' quiet'}" href="/board/${attr(c.id)}" data-link title="Open this client's board">
        <span class="name">${h(c.name)}</span>
        <span class="tags">${tags || '<span class="tag ok">nothing for a person</span>'}${waitChip(steps)}${c.running ? '<span class="tag run">running</span>' : ''}</span>
        ${steps[0] ? `<span class="next">Next: ${h(steps[0].text)}</span>` : ''}</a>`;
    };
    const cols = data.stages.map(stage => { const list = clients.filter(c => c.stage === stage).sort(quiet); return column(h(stage), list.length, list.map(card).join('')); }).join('');
    root.innerHTML = `<div class="ph"><div class="ph-title"><h1>Board</h1><div class="ph-meta">${h(plural(clients.length, 'client'))} · a card moves by itself as its client's work is done · click a card for that client's own board</div></div>
        <div class="ph-actions">${picker('')}</div></div>
      ${tabs(null)}
      ${clients.length ? `<div class="board">${cols}</div>` : empty({ title: 'No clients yet', text: 'A client shows here in the column of the stage it is at.' })}`;
  };

  // ── One person: columns for their own work, a card per client in each column it has a step in ──
  const drawPerson = who => {
    const clients = data.clients.filter(c => !c.archived);
    const mine = new Map(clients.map(c => [c.id, stepsOf(c).filter(s => isMine(s, who))]));
    const names = [...(board().columns[who.role] || [])];
    // A step that fits none of the person's columns (a one off task) still shows, in a last column
    if (clients.some(c => mine.get(c.id).some(s => !names.includes(s.column)))) names.push(board().other);
    const total = clients.reduce((n, c) => n + mine.get(c.id).length, 0);
    const cols = names.map(name => {
      const list = clients.map(c => ({ c, steps: mine.get(c.id).filter(s => (names.includes(s.column) ? s.column : board().other) === name) })).filter(x => x.steps.length).sort((a, b) => quiet(a.c, b.c));
      return column(h(name), list.length, list.map(({ c, steps }) => `<a class="board-card" href="/board/${attr(c.id)}" data-link title="Open this client's board">
        <span class="name">${h(c.name)}</span>
        ${steps.slice(0, 3).map(s => `<span class="next">${h(s.text)}</span>`).join('')}${steps.length > 3 ? `<span class="next muted">and ${steps.length - 3} more</span>` : ''}
        <span class="tags">${waitChip(steps)}${steps.some(s => s.urgent) ? '<span class="tag block">urgent</span>' : ''}</span></a>`).join(''));
    }).join('');
    // Done: what is finished in this person's area on every client, the newest first, then the undated
    const fin = clients.flatMap(c => ((c.tracker && c.tracker.done) || []).filter(d => isMine(d, who)).map(d => ({ c, d })))
      .sort((a, b) => (b.d.at ? new Date(b.d.at).getTime() : 0) - (a.d.at ? new Date(a.d.at).getTime() : 0));
    const SHOW = 40;
    const doneCol = column('Done', fin.length, `${fin.slice(0, SHOW).map(({ c, d }) => doneCard(c, d, false)).join('')}${fin.length > SHOW ? `<p class="muted small" style="margin:4px">and ${fin.length - SHOW} older</p>` : ''}`, 'done');
    root.innerHTML = `<div class="ph"><div class="ph-title"><h1>${h(who.name)}'s board</h1><div class="ph-meta">${h(roleLabel(who.role))} · ${h(plural(total, 'step'))} on ${h(plural(clients.filter(c => mine.get(c.id).length).length, 'client'))} · a client shows in each column it has something waiting in</div></div>
        <div class="ph-actions">${picker('')}</div></div>
      ${tabs(who)}
      <div class="board">${cols}${doneCol}</div>
      ${total ? '' : `<p class="muted" style="margin-top:12px">Nothing is waiting on ${h(who.name)}.</p>`}`;
  };

  // A finished line in a Done column: what was done, by Copybot or a person, and when. On a client's board it says
  // whose area it was in; on a person's board, which client.
  const doneCard = (c, d, withOwner) => `<a class="board-card quiet done" href="${attr(stepHref(c.id, d.tab))}" data-link>
      <span class="next" style="margin:0">${h(d.text)}</span>
      <span class="tags">${withOwner ? stepOwnerTag(d) : `<span class="tag">${h(c.name)}</span>`}${d.auto ? '<span class="tag accent">automatic</span>' : ''}${d.at ? `<span class="small muted">${timeEl(d.at)}</span>` : ''}</span></a>`;

  // ── One client: the six stages, each open step a card in its stage with who does it, then Done ──
  const taskCard = (c, s) => {
    const where = s.key === 'ask' ? `/clients/${c.id}` : stepHref(c.id, s.tab);
    return `<div class="board-card task${s.urgent ? ' urgent' : ''}"><a class="name" href="${attr(where)}" data-link>${h(s.text)}</a>
      ${s.why ? `<span class="next">${h(s.why)}</span>` : ''}
      <span class="tags">${stepOwnerTag(s)}${waitTag(s)}${stepButtons(c.id, s)}${s.key === 'ask' ? ` <button class="btn btn-ghost btn-xs" data-tb-done="${attr(s.ask_id)}">Done</button>` : ''}${sopLink(s.sop) ? ` ${sopLink(s.sop)}` : ''}</span></div>`;
  };
  const drawClient = () => {
    const c = data.clients.find(x => x.id === params.clientId);
    if (!c) { root.innerHTML = empty({ title: 'No such client', text: 'It may have been deleted.', action: '<a class="btn btn-primary" href="/board" data-link>Back to the board</a>' }); return; }
    ctx.setTitle(`${c.name} board`);
    const t = c.tracker || { needs: [], done: [], later: 0 }, stages = board().stages;
    // A step with no stage of its own (a one off task, an ask) sits in the stage the client is at
    const at = x => (stages.includes(x.stage) ? x.stage : stages.includes(c.stage) ? c.stage : stages[0]);
    const steps = stepsOf(c), done = t.done || [];
    const cols = stages.map(stage => {
      const open = steps.filter(s => at(s) === stage);
      return column(`${h(stage)}${stage === c.stage ? ' <span class="tag accent" style="text-transform:none;letter-spacing:0">here now</span>' : ''}`, open.length, open.map(s => taskCard(c, s)).join(''), stage === c.stage ? 'now' : '');
    }).join('') + column('Done', done.length, done.map(d => doneCard(c, d, true)).join(''), 'done');
    root.innerHTML = `<div class="ph"><div class="ph-title"><div class="small muted"><a href="/board" data-link>Board</a> / ${h(c.name)}</div><h1>${h(c.name)}</h1><div class="ph-meta">${h(c.stage)} · ${h(plural(steps.length, 'step'))} waiting on a person${t.later ? ` · ${t.later} more open up once these are done` : ''}${c.running ? ' · something is running' : ''}</div></div>
        <div class="ph-actions">${picker(c.id)}<a class="btn btn-ghost" href="/clients/${attr(c.id)}" data-link>Open the client</a></div></div>
      <div class="board stages">${cols}</div>`;
  };

  const draw = () => {
    if (params.clientId) return drawClient();
    const who = ctx.query.who ? people().find(p => String(p.id) === ctx.query.who) : null;
    return who ? drawPerson(who) : drawEveryone();
  };
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
