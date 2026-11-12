// The Reviews tab (8 Nov 2026): one client's review replies set-up. Brandon's brief, sections 4, 5 and 7:
// the eight template fields (red while blank; the direct phone and email need confirming), the go-live
// date, automatic posting for 4 and 5 stars, the approver, the backlog, and the
// reviews as last synced. The queue across clients is the Review replies screen.

import { h, attr, api, card, toast, confirm, empty, failed, pill, fmtDate } from '../ui.js';

const STATUS = { new: ['none', 'Waiting to be drafted'], drafting: ['run', 'Drafting'], queued: ['wait', 'In the queue'], posting: ['run', 'Posting'], posted: ['ok', 'Replied'], backlog: ['none', 'Backlog'], already_replied: ['none', 'Already replied'], no_reply: ['none', 'No reply'] };
const stars = n => `<span style="color:${n <= 3 ? '#b45309' : '#15803d'}">${'★'.repeat(n || 0)}</span>`;

export async function render(el, ctx) {
  const url = `/api/clients/${ctx.clientId}/reviews`;
  const by = () => (() => { try { return localStorage.getItem('ll_user') || ''; } catch (_) { return ''; } })();   // the name the shell keeps (shell.js userName)
  let S = null;
  const load = async () => {
    try { S = await api(url); }
    catch (e) { el.innerHTML = failed({ title: 'Reviews could not load', reason: e.message, retry: '<button class="btn btn-ghost" data-rv="reload">Retry</button>' }); return; }
    draw();
  };

  const statusCard = () => {
    const C = S.connection;
    const conn = C && C.status === 'connected' ? `${pill('ok', 'Connected')} <strong>${h(C.location_name || '')}</strong>` : `${pill('block', 'Not connected')} <span class="small">Connect the client on the GBP Posts tab, under Publishing. Reviews use the same bundle.social team.</span>`;
    const run = S.last_run && S.last_run.mine;
    const notes = run && run.notes && run.notes.length ? `<ul class="small" style="margin:6px 0 0 18px">${run.notes.map(n => `<li>${h(n)}</li>`).join('')}</ul>` : '';
    const low = S.low_capacity ? `<div class="notice warn small" style="margin-top:8px">Only ${S.capacity} of this month's review imports are left for this location.</div>` : '';
    const c = S.counts || {};
    const counts = `${c.queued || 0} in the queue · ${c.posted || 0} replied · ${c.backlog || 0} backlog · ${c.already_replied || 0} already replied${c.new ? ` · ${c.new} waiting to be drafted` : ''}`;
    const backlog = S.backlog ? `<button class="btn btn-ghost" data-rv="backlog" ${S.missing.length ? 'disabled' : ''}>Draft all ${S.backlog} backlog for approval</button>` : '';
    return card({
      title: 'Review replies', sub: 'New Google reviews every 6 hours through bundle.social',
      body: `<div style="margin-bottom:8px">${conn}</div>
        <div class="small" style="margin-bottom:6px">${h(counts)}</div>
        <div class="small muted">Posting on this server: ${S.posting ? 'on' : 'off (REVIEW_REPLIES_POSTING)'}${S.last_run ? ` · last sync ${h(fmtDate(S.last_run.started_at, true))}` : ' · not synced yet'}${S.capacity != null ? ` · ${S.capacity} imports left this month` : ''}</div>
        ${notes}${low}
        ${S.backlog ? `<div class="small muted" style="margin-top:8px">Backlog: unanswered reviews from before the live from date. They are never drafted or posted on their own.</div>` : ''}
        <div class="btn-row" style="margin-top:10px">${backlog}<button class="btn btn-ghost" data-rv="sync" ${!S.bundle || !(C && C.status === 'connected') ? 'disabled' : ''}>Sync now</button><a class="btn btn-ghost" href="/reviews" data-link>Open the queue</a></div>`,
    });
  };

  const settingsCard = () => {
    const s = S.settings;
    const field = f => {
      const v = s[f.key] || '';
      const blank = !String(v).trim();
      const suggested = S.from_suggestion.includes(f.key);
      const confirmKey = f.key === 'direct_phone' ? 'phone_confirmed' : f.key === 'direct_email' ? 'email_confirmed' : null;
      return `<label style="display:block;margin-bottom:10px"><span class="small"><strong>${h(f.label)}</strong> <span class="muted">${h(f.hint)}</span>${suggested ? ` ${pill('accent', 'Suggested, not saved')}` : ''}</span>
        <input class="input" name="${attr(f.key)}" value="${attr(v)}" style="width:100%;${blank ? 'border-color:#dc2626;background:#fef2f2' : ''}">
        ${blank ? '<span class="small" style="color:#dc2626">Required: no replies are drafted until it is filled in.</span>' : ''}
        ${confirmKey ? `<span class="small" style="display:block;margin-top:4px"><input type="checkbox" name="${confirmKey}" ${s[confirmKey] ? 'checked' : ''}> Confirmed with the client as their direct ${f.key === 'direct_phone' ? 'line' : 'email'}${!s[confirmKey] && !blank ? ' <span style="color:#dc2626">(not confirmed yet)</span>' : ''}</span>` : ''}</label>`;
    };
    const missing = S.missing.length ? `<div class="notice bad small" data-missing style="margin-bottom:12px"><strong>No replies are drafted for this client yet:</strong> ${h(S.missing.join(', '))}.</div>` : '<div class="notice good small" style="margin-bottom:12px">Every field is filled in.</div>';
    return card({
      title: 'Template fields and switches', sub: 'Saved here, read by the sync and every draft',
      body: `<form data-settings>${missing}
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:0 16px">${S.fields.map(field).join('')}</div>
        <hr style="border:0;border-top:1px solid var(--border);margin:8px 0 12px">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:0 16px">
          <label style="display:block;margin-bottom:10px"><span class="small"><strong>Live from</strong> <span class="muted">The go-live date. Older reviews are backlog.</span></span><input class="input" type="date" name="live_from" value="${attr(s.live_from || '')}" style="width:100%;${s.live_from ? '' : 'border-color:#dc2626'}"></label>
          <label style="display:block;margin-bottom:10px"><span class="small"><strong>Approver name</strong></span><input class="input" name="approver_name" value="${attr(s.approver_name || '')}" style="width:100%"></label>
          <label style="display:block;margin-bottom:10px"><span class="small"><strong>Approver email</strong> <span class="muted">Told when replies wait, and at 48 hours</span></span><input class="input" type="email" name="approver_email" value="${attr(s.approver_email || '')}" style="width:100%"></label>
        </div>
        <label class="small" style="display:block;margin:0 0 12px"><input type="checkbox" name="auto_post" ${s.auto_post ? 'checked' : ''}> Post 4 and 5 star replies automatically when the draft passes its checks. ${s.auto_post ? pill('ok', 'Automatic') : pill('none', 'Off: everything waits in the queue')} <span class="muted">1 to 3 stars always wait for a person.</span></label>
        <div class="btn-row"><button class="btn btn-primary" type="submit">Save</button></div></form>`,
    });
  };

  const recentCard = () => {
    if (!S.recent.length) return card({ title: 'Reviews', body: empty({ title: 'No reviews yet', text: 'They appear after the first sync.' }) });
    const row = r => { const [k, l] = STATUS[r.status] || ['none', r.status]; return `<tr><td style="white-space:nowrap">${stars(r.stars)}</td><td class="small">${h(r.reviewer_name || '')}<div class="muted">${r.create_time ? h(fmtDate(r.create_time)) : ''}</div></td><td class="small">${r.comment ? h(r.comment.length > 160 ? `${r.comment.slice(0, 160)}…` : r.comment) : '<span class="muted">(no text)</span>'}${r.google_reply ? `<div class="muted" style="margin-top:4px">Reply: ${h(r.google_reply.length > 120 ? `${r.google_reply.slice(0, 120)}…` : r.google_reply)}</div>` : ''}</td><td>${pill(k, l)}</td></tr>`; };
    return card({ title: 'Reviews', sub: 'The newest 40, as last synced', body: `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Stars</th><th>Reviewer</th><th>Review</th><th>Status</th></tr></thead><tbody>${S.recent.map(row).join('')}</tbody></table></div>` });
  };

  const draw = () => { el.innerHTML = `<div class="stack">${statusCard()}${settingsCard()}${recentCard()}</div>`; };

  el.addEventListener('submit', async e => {
    const form = e.target.closest('[data-settings]');
    if (!form) return;
    e.preventDefault();
    const body = { by: by() };
    for (const f of S.fields) body[f.key] = form.elements[f.key].value;
    for (const k of ['live_from', 'approver_name', 'approver_email']) body[k] = form.elements[k].value;
    for (const k of ['phone_confirmed', 'email_confirmed', 'auto_post']) body[k] = form.elements[k].checked;
    if (body.auto_post && !S.settings.auto_post && !(await confirm({ title: 'Post 4 and 5 star replies automatically?', text: 'Replies that pass their checks will go on Google without a person seeing them first. Check the first batch in the queue before switching this on.', ok: 'Switch on' }))) return;
    try { S = await api(`${url}/settings`, { method: 'PUT', body }); toast('Saved'); draw(); }
    catch (err) { toast(err.message, 'bad'); }
  });
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-rv]');
    if (!b) return;
    const act = b.dataset.rv;
    if (act === 'reload') { await load(); return; }
    b.disabled = true;
    try {
      if (act === 'sync') { b.textContent = 'Syncing…'; S = (await api(`${url}/sync`, { method: 'POST' })).view; toast('Synced'); draw(); }
      if (act === 'backlog') {
        if (!(await confirm({ title: `Draft ${S.backlog} older reviews?`, text: 'Each one is drafted and put in the approval queue. Nothing is posted.', ok: 'Draft them' }))) return;
        b.textContent = 'Drafting…';
        const r = await api(`${url}/backlog/draft`, { method: 'POST', body: { by: by() } });
        S = r.view; toast(`${r.drafted} drafted for approval`); draw();
      }
    } catch (err) { toast(err.message, 'bad'); }
    finally { if (b.isConnected) { b.disabled = false; } }
  });
  await load();
}
