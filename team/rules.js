'use strict';

// ── The task board, stage 1 (Brandon, 14 Nov 2026): who does each Tracker step ──────────
// Pure rules, no database. The Tracker (ui/tracker.js) already says what waits on a person
// for each client; this says WHICH person, and which SOP the step is done from.
//   ownerOf(step)  the role that does a step: its own line in owners.json, else its prefix,
//                  else the tab it is done on, else the default
//   sopOf(step)    { title, section, url } or null when no SOP covers the step yet
//   tag(needs)     puts owner and sop on each of a tracker's needs
//   tasksOf(rows)  every open task across the clients, one block per client:
//                  the Tracker's needs plus the asks sent with Tell Brandon (owner brandon)
//   counts(blocks) how many open tasks each role has
// A role is a job (owners.json roles); the People list (team/service.js) says who holds it.

const OWNERS = require('./owners.json');
const SOPS = require('./sops.json');
const HAND = require('./hand-steps.json');

const ROLES = Object.keys(OWNERS.roles);

function ownerOf(step) {
  const key = String((step && step.key) || '');
  if (OWNERS.by_step[key]) return OWNERS.by_step[key];
  // A step the automation chain stopped at ("auto_citations") belongs to whoever does that tab
  if (!key.startsWith('auto_')) for (const [prefix, role] of Object.entries(OWNERS.by_prefix)) if (key.startsWith(prefix)) return role;
  return OWNERS.by_tab[step && step.tab] || OWNERS.default;
}

// s: { doc, section, anchor } as the files write it
function resolveSop(s) {
  const doc = s && SOPS.docs[s.doc];
  return doc ? { title: doc.title, section: s.section || '', url: doc.url + (s.anchor ? `#heading=${s.anchor}` : '') } : null;
}
const sopOf = step => resolveSop(SOPS.by_step[String((step && step.key) || '')] || SOPS.by_tab[step && step.tab]);

function tag(needs) {
  // A by hand step and a one off task arrive with their own owner (and SOP): those stand
  for (const n of needs || []) { if (!n.owner) n.owner = ownerOf(n); if (n.sop === undefined) { const sop = sopOf(n); if (sop) n.sop = sop; } }
  return needs;
}

// ── Stage 2: the steps done by hand (hand-steps.json) and one off tasks ──
// gates: what the Tracker knows is finished ({ record, page_map, pushed, ... }); ticks: { key: { by, at } }, the steps
// a person has ticked. A step is offered when everything in its `after` is true, so the list is what can be done today.
function handStepsOf(gates = {}, ticks = {}) {
  const needs = [], done = [];
  let later = 0;
  for (const s of HAND.steps) {
    const t = ticks[s.key];
    if (t) { done.push({ key: `hand_${s.key}_done`, hand: s.key, text: `${s.text}: ticked done${t.by ? ` by ${t.by}` : ''}`, tab: s.tab, at: t.at || null }); continue; }
    const ready = (s.after || []).every(g => (g.startsWith('hand:') ? !!ticks[g.slice(5)] : !!gates[g]));
    if (ready) needs.push({ key: `hand_${s.key}`, hand: s.key, text: s.text, tab: s.tab, why: s.why || '', owner: s.role, sop: resolveSop(s.sop) });
    else later++;
  }
  return { needs, done, later };
}

// tasks: a client's open one off tasks (team/service.js loadFacts). A task is its person's, else its role's.
const day = d => String(d instanceof Date ? d.toISOString() : d || '').slice(0, 10);
function taskSteps(tasks, now) {
  const today = day(now || new Date());
  return (tasks || []).map(t => {
    const overdue = !!t.due && t.due < today;
    return { key: `task_${t.id}`, task: t.id, text: t.text, tab: '', owner: t.role, person_id: t.person_id || null, person: t.person || '', due: t.due || '', urgent: overdue || undefined, sop: null,
      why: `${t.by ? `Added by ${t.by}` : 'Added by hand'}${t.at ? ` on ${day(t.at)}` : ''}${t.person ? `, for ${t.person}` : ''}.${t.due ? ` ${overdue ? 'Was due' : 'Due'} ${t.due}.` : ''}` };
  });
}

// rows: the dashboard's client rows (ui/dashboard.js). role: only that role's tasks; none = everyone's.
// The longest quiet client first, the Tracker's own order inside a client.
function tasksOf(rows, { role = '', personId = null } = {}) {
  const blocks = [];
  for (const c of rows || []) {
    if (c.archived) continue;
    const steps = ((c.tracker && c.tracker.needs) || []).map(n => ({ key: n.key, text: n.text, tab: n.tab, why: n.why || '', owner: n.owner || ownerOf(n), sop: n.sop || (n.sop === null ? null : sopOf(n)), urgent: !!n.urgent, hand: n.hand || undefined, tick: n.tick || undefined, task: n.task || undefined, person_id: n.person_id || undefined, due: n.due || undefined, since: n.since || undefined }));
    for (const a of c.brandon || []) steps.push({ key: 'ask', ask_id: a.id, text: `${a.reason}${a.note ? `: ${String(a.note).slice(0, 160)}` : ''}`, tab: '', why: `${a.by ? `Asked by ${a.by}` : 'Sent with Tell Brandon'}${a.at ? ` on ${String(a.at instanceof Date ? a.at.toISOString() : a.at).slice(0, 10)}` : ''}.`, owner: 'brandon', sop: null, urgent: false, since: a.at || undefined });
    // A one off task given to one person is that person's alone; everything else goes by the job
    const mine = role ? steps.filter(s => (s.person_id ? s.person_id === personId : s.owner === role)) : steps;
    if (!mine.length) continue;
    blocks.push({ client_id: c.id, client: c.name, stage: c.stage || '', last_activity: c.last_activity || null, later: (c.tracker && c.tracker.later) || 0, steps: mine });
  }
  return blocks.sort((a, b) => new Date(a.last_activity || 0) - new Date(b.last_activity || 0));
}

function counts(blocks) {
  const n = Object.fromEntries(ROLES.map(r => [r, 0]));
  for (const b of blocks || []) for (const s of b.steps) n[s.owner] = (n[s.owner] || 0) + 1;
  return n;
}

// Every step key the owners and SOP files name, for the fixture: a renamed Tracker step shows up there
const namedSteps = () => [...new Set([...Object.keys(OWNERS.by_step), ...Object.keys(SOPS.by_step)])];
const handStep = key => HAND.steps.find(s => s.key === key) || null;

module.exports = { ROLES, ROLE_LABELS: OWNERS.roles, SEED_PEOPLE: OWNERS.seed_people, HAND_STEPS: HAND.steps, HAND_GATES: HAND.gates, ownerOf, sopOf, tag, handStepsOf, handStep, taskSteps, tasksOf, counts, namedSteps };
