// The Publishing part of the GBP Posts tab (Stage 3 of the bundle.social build): connecting a client,
// the switch, the queue with retry and delete, and Photo Drip. It loads on its own, so trouble here
// leaves the posts below working.

import { h, attr, api, card, toast, confirm, dialog, empty, fmtDate, pill } from '../ui.js';
import { tellBrandon } from '../tell-brandon.js';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const nice = d => { const x = new Date(`${d}T12:00:00Z`); return `${WEEKDAY[x.getUTCDay()]} ${x.getUTCDate()} ${x.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })} ${x.getUTCFullYear()}`; };
const PILL = { planned: ['none', 'Planned'], queued: ['none', 'Queued'], sending: ['run', 'Sending'], scheduled: ['run', 'Scheduled'], posted: ['ok', 'Posted'], failed: ['block', 'Failed'], deleted: ['none', 'Deleted'] };

// queueEl (8 Nov 2026): where the Queue card goes, so it can sit under the posts; onData(S) tells the tab
// the connection and Photo Drip state for its status strip
export async function renderPublishing(el, ctx, { queueEl = null, onData = () => {} } = {}) {
  const url = `/api/clients/${ctx.clientId}/publishing`;
  let S = null, show = 'open';
  const load = async () => { try { S = await api(url); } catch (e) { S = { fatal: e.message }; } draw(); };
  const roots = [el, queueEl].filter(Boolean);

  const connectCard = () => {
    const C = S.connection;
    if (!S.enabled) return card({ title: 'Publishing', sub: 'Not switched on yet', body: `<div class="notice" data-publishing-off>Nothing can go out yet. ${S.configured ? 'Publishing is switched off on this server.' : 'The bundle.social key is not set on this server.'} Approved posts wait in the queue below.</div>` });
    const connected = C && C.status === 'connected';
    const problem = C && C.problem ? `<div class="notice bad small" data-connection-problem style="margin-bottom:10px"><strong>Nothing will go out for this client.</strong> ${h(C.problem)}</div>` : '';
    const where = C && C.location_name ? `<div style="margin-bottom:10px" data-location><strong>${h(C.location_name)}</strong>${C.location_address ? `<div class="small muted">${h(C.location_address)}</div>` : ''}<div class="small muted">Through the ${h(C.source_name || '')} login${C.checked_at ? `, last checked ${h(fmtDate(C.checked_at, true))}` : ''}</div></div>` : '<div class="muted small" style="margin-bottom:10px">Not connected. The client never logs in: Copybot uses the agency\'s Google connection.</div>';
    const on = connected && C.publishing_on;
    const sw = connected ? `<button class="btn ${on ? 'btn-ghost' : 'btn-primary'}" data-pub="${on ? 'off' : 'on'}">${on ? 'Switch publishing off' : 'Switch publishing on'}</button> ${on ? pill('ok', 'On') : pill('none', 'Off')}` : '';
    return card({ title: 'Publishing', sub: 'Where this client\'s posts and photos go', body: `${problem}${where}<div class="btn-row"><button class="btn ${connected ? 'btn-ghost' : 'btn-primary'}" data-pub="connect">${C && C.channel_id ? 'Change location' : 'Connect to bundle.social'}</button>${sw}<button class="btn btn-ghost" data-pub="tell" title="The client is not in the list, or the connection has a problem: ask Brandon">Tell Brandon</button></div>${S.last_run ? `<div class="small muted" style="margin-top:8px">Last daily run ${h(fmtDate(S.last_run.started_at, true))}</div>` : ''}` });
  };

  const dripCard = () => {
    const D = S.drip;
    if (!D.found) return card({ title: 'Photo Drip', sub: 'Photos for the GBP Photos section, 2 a week', body: `<div class="muted small">No ${h(D.folder)} folder has been read. Save and read the Drive photo folder under Photos & prompts.</div>` });
    const out = D.ran_out ? `<div class="notice warn" data-drip-out style="margin-bottom:10px"><strong>Photo Drip has run out of new photos.</strong> ${D.last_date ? `The last one is set for ${h(nice(D.last_date))}, and then it stops.` : 'It has stopped.'} A photo is never used twice, so ask the client for more, sort them, then press Read Drive under Photos & prompts.</div>` : '';
    const plan = D.planned ? `<button class="btn btn-primary" data-pub="drip-approve">Approve ${D.planned} planned</button>` : '';
    return card({ title: 'Photo Drip', sub: `2 a week on ${h(D.days.map(d => WEEKDAY[d]).join(' and '))}, category ${h(D.category)}`, body: `${out}<div class="small" data-drip-counts style="margin-bottom:10px">${D.left} new, ${D.planned} planned, ${D.queued} queued, ${D.posted} posted${D.problems ? `, ${D.problems} can't be used` : ''}${!D.left && !D.ran_out && D.last_date ? `. Planned through ${h(nice(D.last_date))}` : ''}</div><div class="btn-row">${D.left ? `<button class="btn ${D.planned ? 'btn-ghost' : 'btn-primary'}" data-pub="drip-plan">Plan ${D.left > 52 ? '52 of ' : ''}${D.left} new photo${D.left === 1 ? '' : 's'}</button>` : ''}${plan}</div>` });
  };

  const queueCard = () => {
    const open = i => !['posted', 'deleted'].includes(i.status);
    const list = S.items.filter(i => show === 'all' || open(i));
    const counts = ['queued', 'scheduled', 'posted', 'failed'].map(k => `${S.counts[k] || 0} ${k}`).join(', ');
    const canSend = S.enabled && S.connection && S.connection.publishing_on;
    const row = i => {
      const [kind, label] = PILL[i.status] || ['none', i.status];
      const actions = [];
      if (canSend && i.status === 'failed') actions.push(`<button class="btn btn-ghost btn-xs" data-item="${attr(i.id)}" data-do="retry">Retry</button>`);
      if (canSend && i.status === 'queued') actions.push(`<button class="btn btn-ghost btn-xs" data-item="${attr(i.id)}" data-do="send">Send now</button>`);
      if (i.status !== 'deleted' && i.status !== 'sending' && (!i.sent || S.enabled)) actions.push(`<button class="btn btn-ghost btn-xs" style="color:#991b1b" data-item="${attr(i.id)}" data-do="delete" data-state="${attr(i.status)}" data-kind="${attr(i.kind)}">${i.status === 'planned' ? 'Remove' : 'Delete'}</button>`);
      return `<tr data-queue-row="${attr(i.status)}"><td class="small" style="white-space:nowrap">${h(nice(i.due_date))}</td><td class="small">${i.kind === 'photo' ? 'Photo' : i.topic === 'OFFER' ? 'Offer' : 'Post'}</td><td class="small">${h(i.label)}${i.link ? ` <a href="${attr(i.link)}" target="_blank" rel="noopener">View</a>` : ''}${i.error ? `<div style="color:#991b1b">${h(i.error)}</div>` : ''}</td><td>${pill(kind, label)}</td><td style="white-space:nowrap">${actions.join(' ')}</td></tr>`;
    };
    const toggle = `<select class="input" style="width:auto" data-pub-show><option value="open" ${show === 'open' ? 'selected' : ''}>Still to go</option><option value="all" ${show === 'all' ? 'selected' : ''}>Everything</option></select>`;
    const body = S.items.length ? `<div class="btn-row" style="margin-bottom:8px;align-items:center"><span class="small" data-queue-counts>${h(counts)}</span>${toggle}</div>${list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Type</th><th>What</th><th>Status</th><th></th></tr></thead><tbody>${list.map(row).join('')}</tbody></table></div>` : '<div class="muted small">Nothing still to go.</div>'}` : empty({ title: 'Nothing queued', text: 'Approved posts and Photo Drip photos come here.' });
    return card({ title: 'Queue', sub: 'The daily job sends posts 3 days ahead, and each photo on its day', body });
  };

  const draw = () => {
    if (!S) return;
    onData(S);
    if (S.fatal) { el.innerHTML = `<div class="card" data-publishing-failed>${empty({ title: 'Publishing could not load', text: S.fatal, action: '<button class="btn btn-ghost" data-pub="reload">Retry</button>' })}</div>`; if (queueEl) queueEl.innerHTML = ''; return; }
    const top = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;align-items:start">${connectCard()}${dripCard()}</div>`;
    if (queueEl) { el.innerHTML = top; queueEl.innerHTML = queueCard(); }
    else el.innerHTML = `<div class="stack" style="margin-bottom:16px">${top}${queueCard()}</div>`;
  };
  const call = async (path, opts, done) => {
    try { S = await api(`${url}${path}`, opts); if (done) toast(done); draw(); }
    catch (e) { toast(e.message, 'bad'); await load(); }
  };

  async function chooseLocation() {
    let got;
    try { got = await api(`${url}/locations`); } catch (e) { toast(e.message, 'bad'); return; }
    const row = l => `<label style="display:flex;gap:8px;padding:8px 0;border-top:1px solid var(--border);align-items:flex-start"><input type="radio" name="loc" value="${attr(l.channel_id)}" data-source="${attr(l.source_team_id)}"><span><strong>${h(l.name)}</strong>${l.match ? ` ${pill('ok', 'Name matches')}` : ''}<div class="small muted">${h(l.address || 'No address')} · ${h(l.source_name)} login</div></span></label>`;
    const trouble = got.sources.filter(s => s.error).map(s => `<div class="notice warn small" style="margin-bottom:8px">${h(s.name)}: ${h(s.error)}</div>`).join('');
    const d = dialog({ title: `Which location is ${got.client}?`, wide: true, body: `${trouble}<input class="input" style="width:100%;margin-bottom:8px" data-loc-search placeholder="Search by name or address"><div data-loc-list style="max-height:50vh;overflow:auto">${got.locations.map(row).join('') || '<div class="muted small">No locations. The client has to add the agency\'s Google login as a manager of its profile first.</div>'}</div><div class="btn-row" style="margin-top:12px"><button class="btn btn-primary" data-loc-ok>Connect this location</button></div>` });
    const root = (d && d.el) || document.querySelector('.dialog, [role="dialog"]') || document.body;
    const search = root.querySelector('[data-loc-search]');
    if (search) search.addEventListener('input', () => { const t = search.value.toLowerCase(); root.querySelectorAll('[data-loc-list] label').forEach(l => { l.style.display = l.textContent.toLowerCase().includes(t) ? '' : 'none'; }); });
    root.querySelector('[data-loc-ok]').addEventListener('click', async () => {
      const pick = root.querySelector('input[name="loc"]:checked');
      if (!pick) { toast('Choose a location first', 'bad'); return; }
      if (d && d.close) d.close();
      await call('/connect', { method: 'POST', body: { source_team_id: pick.dataset.source, channel_id: pick.value } }, 'Connected');
    });
  }

  for (const root of roots) root.addEventListener('change', e => { const s = e.target.closest('[data-pub-show]'); if (s) { show = s.value; draw(); } });
  for (const root of roots) root.addEventListener('click', async e => {
    const b = e.target.closest('[data-pub]');
    if (b) {
      const act = b.dataset.pub;
      if (act === 'reload') return load();
      if (act === 'connect') return chooseLocation();
      if (act === 'tell') { const C = S.connection || {}; return tellBrandon({ clientId: ctx.clientId, clientName: (ctx.client && ctx.client.name) || '', place: 'connect', tab: 'gbp-posts?s=publishing', context: [{ label: 'Connection', value: C.status || 'not connected' }, { label: 'Location', value: [C.location_name, C.location_address].filter(Boolean).join(', ') }, { label: 'Problem', value: C.problem || '' }] }); }
      if (act === 'on') {
        if (!(await confirm({ title: 'Switch publishing on?', text: 'Approved posts and photos will start going out on their dates, to the location above.', ok: 'Switch on' }))) return;
        return call('/switch', { method: 'POST', body: { on: true } }, 'Publishing is on');
      }
      if (act === 'off') return call('/switch', { method: 'POST', body: { on: false } }, 'Publishing is off');
      if (act === 'drip-plan') return call('/drip/plan', { method: 'POST' }, 'Planned');
      if (act === 'drip-approve') {
        if (!(await confirm({ title: 'Approve the Photo Drip plan?', text: 'These photos go up on their dates once publishing is on, and a photo that has gone up is not used again.', ok: 'Approve' }))) return;
        return call('/drip/approve', { method: 'POST' }, 'Approved');
      }
      return undefined;
    }
    const i = e.target.closest('[data-item]');
    if (!i) return undefined;
    const id = i.dataset.item, act = i.dataset.do;
    if (act === 'retry') return call(`/items/${id}/send`, { method: 'POST' }, 'Sent again');
    if (act === 'send') {
      if (!(await confirm({ title: 'Send this now?', text: 'A post is scheduled for its date. A Photo Drip photo goes on the Google profile straight away, where the public can see it.', ok: 'Send now' }))) return undefined;
      return call(`/items/${id}/send`, { method: 'POST' }, 'Sent');
    }
    if (act === 'delete') {
      const live = i.dataset.state === 'posted';
      const text = live ? `This takes the ${i.dataset.kind === 'photo' ? 'photo' : 'post'} off the Google profile, and it can't be undone.` : i.dataset.state === 'scheduled' ? 'This cancels the post, so it will not go out.' : 'It will not go out. A Photo Drip photo removed here is not planned again.';
      if (!(await confirm({ title: live ? 'Take this off Google?' : 'Delete this?', text, ok: 'Delete', danger: true }))) return undefined;
      return call(`/items/${id}`, { method: 'DELETE' }, 'Deleted');
    }
    return undefined;
  });
  await load();
  return { refresh: load };
}
