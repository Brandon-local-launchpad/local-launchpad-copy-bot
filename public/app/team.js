// The task board's People list in the browser (14 Nov 2026): read once by the shell before
// the first screen, so the Tracker strip, the dashboard queue and My tasks can all say who
// does a step without each fetching it. The rules are team/rules.js on the server: a step
// arrives with `owner` (a role) and `sop` already on it; this only turns a role into names.

import { h, attr, api } from './ui.js';

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
