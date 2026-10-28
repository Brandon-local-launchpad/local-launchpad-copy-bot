// The dashboard (27 Oct 2026): four tiles, the rankings chart, the clients table. Only
// things that change what the user does next. Running now polls every 5 seconds while
// something runs.

import { h, attr, api, card, tile, table, sortRows, status, pill, timeEl, running, empty, failed, lineChart, exportSvgPng, wire, info, plural } from '../ui.js';
import { clientsTable, STAGE_KIND } from './clients-table.js';

const TIPS = {
  new_today: 'Fillout submissions that arrived today and created a client.',
  new_week: 'Fillout submissions in the last 7 days that created a client.',
  needs_person: 'Clients stuck on a human: claims to accept, blocked pages, a record missing a key field (phone, quote method, primary category, practices), or an unverified trade facts pack gating their service pages. Hover for the split by kind.',
  running: 'Page generations, research runs and rank scans in progress.',
};
const KIND_LABEL = { fields: 'record missing a key field', pack: 'pack unverified', claims: 'claims to accept', blocked: 'pages blocked' };
const KIND_SHORT = { fields: 'record field', pack: 'unverified pack', claims: 'client with claims', blocked: 'client with blocked page' };

export async function render(root, params, ctx) {
  ctx.setTitle('Dashboard');
  let data = null, rankings = null;
  let timer = null;

  const draw = () => {
    const t = data.tiles;
    const split = Object.entries(t.needs_person.by_kind).filter(([, n]) => n).map(([k, n]) => `${n} ${KIND_LABEL[k]}`).join('\n') || 'Nothing waiting on a person';
    const runs = data.running;
    root.innerHTML = `
      <div class="ph"><div class="ph-title"><h1>Dashboard</h1><div class="ph-meta">${h(plural(data.clients.filter(c => !c.archived).length, 'client'))} · ${h(new Date(data.generated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))}</div></div>
        <div class="ph-actions"><a class="btn btn-primary" href="/add-client" data-link>Add client</a></div></div>
      <div class="grid grid-4" id="tiles">
        ${tile({ label: 'New clients today', value: t.new_today, tip: TIPS.new_today, href: '/clients?new=today' })}
        ${tile({ label: 'New clients this week', value: t.new_week, tip: TIPS.new_week, href: '/clients?new=week' })}
        <a class="tile clickable tip" href="/clients?needs=1" data-link data-tip="${attr(split)}"><div class="label">Needs a person${info(TIPS.needs_person)}</div><div class="num">${t.needs_person.count}</div><div class="foot">${h(Object.entries(t.needs_person.by_kind).filter(([, n]) => n).map(([k, n]) => `${n} ${KIND_SHORT[k]}${n === 1 ? '' : 's'}`).join(' · ') || 'nothing waiting')}</div></a>
        <div class="tile" id="runningTile"><div class="label">Running now${info(TIPS.running)}</div>${runningBody(runs)}</div>
      </div>
      <div class="stack" style="margin-top:16px">
        ${card({ title: 'Rankings', sub: 'Top 3% per client, the primary keyword, last 6 months, from the stored LeadSnap scans', actions: '<button class="btn btn-ghost btn-sm" id="exportPng">Export PNG</button>', body: '<div id="chart"></div>' })}
        ${card({ flat: true, title: '', body: '<div id="clientsTable"></div>' })}
      </div>`;
    drawChart();
    clientsTable(root.querySelector('#clientsTable'), data, ctx, { title: 'Clients', filters: { needs: ctx.query.needs === '1' } });
    root.querySelector('#exportPng').addEventListener('click', () => { const svg = root.querySelector('#chart svg'); if (svg) exportSvgPng(svg, 'rankings.png'); });
  };

  const runningBody = runs => {
    if (!runs.length) return `<div class="num small-num">Nothing running</div><div class="foot"></div>`;
    return `<div class="stack" style="margin-top:8px">${runs.slice(0, 3).map(r => `<div><div class="small"><a href="/clients/${r.client_id}/pages" data-link>${h(r.client)}</a> · ${h(r.kind)}</div>${running({ now: r.now, next: r.next, done: r.done, total: r.total })}</div>`).join('')}${runs.length > 3 ? `<div class="foot">and ${runs.length - 3} more</div>` : ''}</div>`;
  };

  const drawChart = () => {
    const el = root.querySelector('#chart'); if (!el) return;
    if (!rankings) { el.innerHTML = '<div class="skel" style="width:60%"></div>'; return; }
    if (!rankings.series.length) { el.innerHTML = empty({ title: 'No rank scans yet', text: 'The chart fills in once a client has a baseline scan on the Rankings tab.' }); return; }
    el.innerHTML = `<div class="chart">${lineChart({ series: rankings.series.map(s => ({ name: s.name, points: s.points })), xs: rankings.months, yMax: 100, unit: '%', yLabel: 'Top 3%' })}</div>`;
  };

  const load = async () => {
    try { data = await api('/api/dashboard'); }
    catch (e) { root.innerHTML = failed({ title: 'The dashboard could not load', reason: e.message, retry: '<button class="btn btn-ghost" id="retry">Retry</button>' }); root.querySelector('#retry').onclick = load; return; }
    draw();
    api('/api/dashboard/rankings').then(r => { rankings = r; drawChart(); }).catch(e => { rankings = { series: [], error: e.message }; drawChart(); });
    schedule();
  };
  const schedule = () => {
    clearTimeout(timer);
    if (!data || !data.running.length) return;
    timer = setTimeout(async () => {
      try { const r = await api('/api/dashboard/running'); data.running = r.running; const el = root.querySelector('#runningTile'); if (el) el.innerHTML = `<div class="label">Running now${info(TIPS.running)}</div>${runningBody(r.running)}`; if (!r.running.length) load(); else schedule(); }
      catch (_) { schedule(); }
    }, 5000);
  };
  wire(root);
  await load();
  return () => clearTimeout(timer);
}
