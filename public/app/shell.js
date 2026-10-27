// The app shell (27 Oct 2026): the sidebar, the router and the screen registry. Each
// screen module exports `render(root, params, ctx)` and may return a cleanup function
// (polling timers stop when the screen changes). Paths are real URLs (History API);
// server.js serves /app/index.html for every app path.

import { h, api, toast } from './ui.js';

const NAV = [
  { path: '/dashboard', label: 'Dashboard', ico: '▦' },
  { path: '/clients', label: 'Clients', ico: '👥', match: /^\/clients(\/|$)/ },
  { path: '/add-client', label: 'Add client', ico: '＋' },
  { path: '/niches', label: 'Niche library', ico: '▤', match: /^\/niches(\/|$)/ },
  { path: '/trade-facts', label: 'Trade facts', ico: '✓' },
  { path: '/prompts', label: 'Prompts', ico: '¶' },
  { path: '/settings', label: 'Settings', ico: '⚙' },
];

const ROUTES = [
  { re: /^\/dashboard\/?$/, load: () => import('./screens/dashboard.js') },
  { re: /^\/clients\/?$/, load: () => import('./screens/clients.js') },
  { re: /^\/add-client\/?$/, load: () => import('./screens/add-client.js') },
  { re: /^\/clients\/([0-9a-f-]{36})\/pages\/([a-z]+)\/(.+)$/, load: () => import('./screens/page.js'), params: m => ({ clientId: m[1], type: m[2], key: decodeURIComponent(m[3]) }) },
  { re: /^\/clients\/([0-9a-f-]{36})(?:\/([a-z-]+))?\/?$/, load: () => import('./screens/client.js'), params: m => ({ clientId: m[1], tab: m[2] || 'record' }) },
  { re: /^\/niches\/?$/, load: () => import('./screens/niches.js') },
  { re: /^\/niches\/([a-z0-9-]+)\/?$/, load: () => import('./screens/niches.js'), params: m => ({ niche: m[1] }) },
  { re: /^\/trade-facts\/?$/, load: () => import('./screens/trade-facts.js') },
  { re: /^\/prompts\/?$/, load: () => import('./screens/prompts.js') },
  { re: /^\/settings\/?$/, load: () => import('./screens/settings.js') },
];

const app = document.getElementById('app');
const view = document.getElementById('view');
let cleanup = null;

// ── Sidebar ───────────────────────────────────────────────────────────────────
function renderNav() {
  const path = location.pathname;
  document.getElementById('nav').innerHTML = NAV.map(n => {
    const active = n.match ? n.match.test(path) : path === n.path;
    return `<a class="sb-link${active ? ' active' : ''}" href="${n.path}" data-link title="${h(n.label)}"><span class="ico">${n.ico}</span><span class="lbl">${h(n.label)}</span></a>`;
  }).join('');
  const current = NAV.find(n => (n.match ? n.match.test(path) : path === n.path));
  document.getElementById('topbarTitle').textContent = current ? current.label : 'Copybot';
}
function setCollapsed(on) { app.classList.toggle('collapsed', on); try { localStorage.setItem('ll_sb', on ? '1' : '0'); } catch (_) {} }
document.getElementById('sbCollapse').addEventListener('click', () => setCollapsed(!app.classList.contains('collapsed')));
document.getElementById('menuBtn').addEventListener('click', () => app.classList.toggle('nav-open'));
document.getElementById('sbScrim').addEventListener('click', () => app.classList.remove('nav-open'));
try { if (localStorage.getItem('ll_sb') === '1') app.classList.add('collapsed'); } catch (_) {}

// The person using the app: a name kept in this browser (Settings sets it); used as the default "assigned to"
export function userName() { try { return localStorage.getItem('ll_user') || ''; } catch (_) { return ''; } }
export function setUserName(name) { try { localStorage.setItem('ll_user', name || ''); } catch (_) {} renderUser(); }
function renderUser() {
  const n = userName();
  document.getElementById('sbName').textContent = n || 'Local Launchpad';
  document.getElementById('sbAvatar').textContent = (n || 'LL').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
renderUser();

// ── Router ────────────────────────────────────────────────────────────────────
export function navigate(path, { replace = false } = {}) {
  if (path === location.pathname + location.search && !replace) return;
  history[replace ? 'replaceState' : 'pushState']({}, '', path);
  route();
}
export function setTitle(t) { document.title = t ? `${t} · Copybot` : 'Copybot'; }

async function route() {
  if (cleanup) { try { cleanup(); } catch (_) {} cleanup = null; }
  app.classList.remove('nav-open');
  renderNav();
  const path = location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/' || path === '/index.html') return navigate('/dashboard', { replace: true });
  const r = ROUTES.find(x => x.re.test(path));
  if (!r) { view.innerHTML = `<div class="card"><div class="state"><h3>No such page</h3><p>${h(path)}</p><a class="btn btn-primary" href="/dashboard" data-link>Dashboard</a></div></div>`; return; }
  const m = path.match(r.re);
  const params = r.params ? r.params(m) : {};
  view.innerHTML = '<div class="card"><div class="skel" style="width:40%"></div><br><div class="skel" style="width:70%"></div><br><div class="skel" style="width:55%"></div></div>';
  window.scrollTo(0, 0);
  try {
    const mod = await r.load();
    const ctx = { navigate, setTitle, query: Object.fromEntries(new URLSearchParams(location.search)), userName };
    const c = await mod.render(view, params, ctx);
    if (typeof c === 'function') cleanup = c;
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="card"><div class="state failed"><h3>This screen could not load</h3><p>${h(e.message)}</p><button class="btn btn-ghost" onclick="location.reload()">Retry</button></div></div>`;
  }
}

document.addEventListener('click', e => {
  const a = e.target.closest('a[data-link], a[href^="/"]:not([target]):not([download])');
  if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('/api/') || href.startsWith('/auth/') || /\.(html|csv|json|md|png|txt|zip)(\?|$)/.test(href)) return;
  e.preventDefault(); navigate(href);
});
window.addEventListener('app:navigate', e => navigate(e.detail));
window.addEventListener('popstate', route);

// Sign out posts the form (the cookie is cleared server side); nothing else to do here
route();
export { api, toast };
