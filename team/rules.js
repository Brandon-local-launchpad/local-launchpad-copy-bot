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

const ROLES = Object.keys(OWNERS.roles);

function ownerOf(step) {
  const key = String((step && step.key) || '');
  if (OWNERS.by_step[key]) return OWNERS.by_step[key];
  // A step the automation chain stopped at ("auto_citations") belongs to whoever does that tab
  if (!key.startsWith('auto_')) for (const [prefix, role] of Object.entries(OWNERS.by_prefix)) if (key.startsWith(prefix)) return role;
  return OWNERS.by_tab[step && step.tab] || OWNERS.default;
}

function sopOf(step) {
  const s = SOPS.by_step[String((step && step.key) || '')] || SOPS.by_tab[step && step.tab];
  if (!s) return null;
  const doc = SOPS.docs[s.doc];
  if (!doc) return null;
  return { title: doc.title, section: s.section || '', url: doc.url + (s.anchor ? `#heading=${s.anchor}` : '') };
}

function tag(needs) {
  for (const n of needs || []) { n.owner = ownerOf(n); const sop = sopOf(n); if (sop) n.sop = sop; }
  return needs;
}

// rows: the dashboard's client rows (ui/dashboard.js). role: only that role's tasks; none = everyone's.
// The longest quiet client first, the Tracker's own order inside a client.
function tasksOf(rows, { role = '' } = {}) {
  const blocks = [];
  for (const c of rows || []) {
    if (c.archived) continue;
    const steps = ((c.tracker && c.tracker.needs) || []).map(n => ({ key: n.key, text: n.text, tab: n.tab, why: n.why || '', owner: n.owner || ownerOf(n), sop: n.sop || sopOf(n), urgent: !!n.urgent }));
    for (const a of c.brandon || []) steps.push({ key: 'ask', ask_id: a.id, text: `${a.reason}${a.note ? `: ${String(a.note).slice(0, 160)}` : ''}`, tab: '', why: `${a.by ? `Asked by ${a.by}` : 'Sent with Tell Brandon'}${a.at ? ` on ${String(a.at instanceof Date ? a.at.toISOString() : a.at).slice(0, 10)}` : ''}.`, owner: 'brandon', sop: null, urgent: false });
    const mine = role ? steps.filter(s => s.owner === role) : steps;
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

module.exports = { ROLES, ROLE_LABELS: OWNERS.roles, SEED_PEOPLE: OWNERS.seed_people, ownerOf, sopOf, tag, tasksOf, counts, namedSteps };
