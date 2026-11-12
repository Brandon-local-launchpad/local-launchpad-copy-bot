// The review replies approval queue (8 Nov 2026): one list across clients, oldest first. Brandon's brief,
// section 5. Every rule that matters is on the server (reviews/post.js); this screen only asks for it.

import { h, attr, api, card, toast, confirm, dialog, empty, failed, pill, fmtDate, debounce } from '../ui.js';
import { tellBrandon } from '../tell-brandon.js';

const STARS = n => `<span title="${n} star${n === 1 ? '' : 's'}" style="color:${n <= 3 ? '#b45309' : '#15803d'};letter-spacing:1px">${'★'.repeat(n || 0)}<span style="color:#d1d5db">${'★'.repeat(5 - (n || 0))}</span></span>`;
const FLAG = { review_changed: ['wait', 'Review changed'], reply_rejected: ['block', 'Google rejected the reply'], draft_failed: ['wait', 'Draft failed its checks'], post_failed: ['block', 'Post failed'] };
const age = hrs => (hrs < 1 ? 'under an hour' : hrs < 48 ? `${Math.floor(hrs)} hour${Math.floor(hrs) === 1 ? '' : 's'}` : `${Math.floor(hrs / 24)} days`);

const ROUTINE = `<details class="small" style="margin-bottom:12px"><summary style="cursor:pointer"><strong>Before you approve: the routine</strong></summary>
<ol style="margin:8px 0 0 18px;line-height:1.6">
<li>Check the reviewer against the client's CRM, job list or invoices. If unsure, ask the client: "Do you recognise [name] / this job?"</li>
<li><strong>Real customer:</strong> fix anything wrong or too specific, tick "Real customer checked", approve, and tell the client so they're ready for the call.</li>
<li><strong>Not a customer or clearly fake</strong> (no record, a service they don't offer, outside their area, or a batch of 1 star reviews for local competitors on the same day): don't approve the apology. Report it on Google with <em>Report review</em> and the closest reason, screenshot the review and the reviewer's profile, then use the neutral reply within 48 hours.</li>
<li><strong>Abusive, threatening or containing personal information:</strong> report it, choose No reply, and tell the client the same day.</li>
</ol><div style="margin-top:6px">Never call a review fake in public or suggest who wrote it.</div></details>`;

export async function render(root, params, ctx) {
  ctx.setTitle('Review replies');
  let S = null;
  const by = () => (ctx.userName && ctx.userName()) || (() => { try { return localStorage.getItem('ll_user') || ''; } catch (_) { return ''; } })();
  const load = async () => {
    try { S = await api('/api/reviews/queue'); }
    catch (e) { root.innerHTML = failed({ title: 'The queue could not load', reason: e.message, retry: '<button class="btn btn-ghost" data-rv="reload">Retry</button>' }); return; }
    draw();
  };

  const problems = list => (list && list.length ? `<ul class="small" data-problems style="color:#991b1b;margin:6px 0 0 18px">${list.map(p => `<li>${h(p.msg)}</li>`).join('')}</ul>` : '<div class="small" data-problems style="color:#166534;margin-top:6px">Passes the checks.</div>');
  const itemCard = i => {
    const late = i.age_hours >= 48 ? pill('block', `Waiting ${age(i.age_hours)}`) : i.age_hours >= 24 ? pill('wait', `Waiting ${age(i.age_hours)}`) : pill('none', `Waiting ${age(i.age_hours)}`);
    const flag = i.flag && FLAG[i.flag] ? pill(...FLAG[i.flag]) : '';
    const neutral = i.draft && i.draft.source === 'neutral';
    const stopped = i.missing.length ? `<div class="notice bad small" style="margin:8px 0">Replies are stopped for this client: ${h(i.missing.join(', '))}. <a href="/clients/${attr(i.client_id)}/reviews" data-link>Fix on the Reviews tab</a></div>` : '';
    const existing = i.google_reply ? `<div class="notice warn small" style="margin:8px 0"><strong>Google already has a reply on this review:</strong> ${h(i.google_reply)}</div>` : '';
    const err = i.last_error ? `<div class="notice ${i.flag === 'post_failed' || i.flag === 'reply_rejected' ? 'bad' : 'warn'} small" style="margin:8px 0">${h(i.last_error)}</div>` : '';
    const posting = i.status === 'posting';
    return `<div class="card" data-review="${attr(i.id)}" style="${i.age_hours >= 24 ? `border-left:4px solid ${i.age_hours >= 48 ? '#dc2626' : '#f59e0b'}` : ''}">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:6px">
        <a href="/clients/${attr(i.client_id)}/reviews" data-link><strong>${h(i.client_name)}</strong></a>${STARS(i.stars)}<span>${h(i.reviewer_name || 'No name')}</span>
        <span class="small muted">${i.create_time ? h(fmtDate(i.create_time, true)) : ''}</span>${late}${flag}${posting ? pill('run', 'Posting') : ''}
      </div>
      <blockquote style="margin:0 0 8px;padding:8px 12px;border-left:3px solid var(--border);background:#fafbfc;white-space:pre-wrap">${i.comment ? h(i.comment) : '<span class="muted">(no review text)</span>'}</blockquote>
      ${stopped}${existing}${err}
      <label class="small muted" for="t-${attr(i.id)}">${neutral ? 'The neutral reply (fixed text)' : 'Draft reply, edit as needed'}</label>
      <textarea class="input" id="t-${attr(i.id)}" data-text rows="5" style="width:100%;font:inherit">${h(i.draft ? i.draft.text : '')}</textarea>
      <div data-check>${i.draft ? problems(i.draft.problems) : ''}</div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin:10px 0" class="small">
        ${neutral ? `<label><input type="checkbox" data-tick="reported" ${i.reported ? 'checked' : ''}> Reported on Google</label>` : '<label><input type="checkbox" data-tick="real"> Real customer checked</label>'}
        ${i.google_reply ? `<label><input type="checkbox" data-tick="replace" ${i.flag === 'review_changed' || i.flag === 'reply_rejected' ? 'checked' : ''}> Replace existing reply</label>` : ''}
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" data-do="approve" ${!S.posting || posting || i.missing.length ? 'disabled' : ''}>Approve and post</button>
        ${neutral ? '' : '<button class="btn btn-ghost" data-do="neutral">Use neutral reply</button>'}
        <button class="btn btn-ghost" data-do="regenerate" ${posting || i.missing.length ? 'disabled' : ''}>Regenerate</button>
        <button class="btn btn-ghost" data-do="no-reply" ${posting ? 'disabled' : ''}>No reply</button>
        <button class="btn btn-ghost" data-do="tell" title="Ask Brandon about this review: he gets the stars, the name and the text">Tell Brandon</button>
      </div>
    </div>`;
  };

  const draw = () => {
    const over24 = S.items.filter(i => i.age_hours >= 24).length, over48 = S.items.filter(i => i.age_hours >= 48).length;
    const off = S.posting ? '' : '<div class="notice warn" data-posting-off style="margin-bottom:12px">Posting review replies is switched off on this server, so Approve and post is disabled. Drafts still arrive here. It goes on with REVIEW_REPLIES_POSTING=1 on Railway.</div>';
    root.innerHTML = `<div class="ph"><div class="ph-title"><h1>Review replies</h1><div class="ph-meta">${S.items.length} waiting${over24 ? ` · ${over24} over 24 hours` : ''}${over48 ? ` · ${over48} over 48 hours` : ''}</div></div></div>
      ${off}${ROUTINE}
      <div class="stack">${S.items.length ? S.items.map(itemCard).join('') : card({ body: empty({ title: 'Nothing waiting', text: 'New Google reviews arrive here every 6 hours. 1 to 3 star replies always wait here for a person.' }) })}</div>`;
  };

  const replaceItem = item => { const i = S.items.findIndex(x => x.id === item.id); if (i >= 0) S.items[i] = item; draw(); };
  const check = debounce(async (el, id) => {
    try { const r = await api(`/api/reviews/${id}/check`, { method: 'POST', body: { text: el.querySelector('[data-text]').value } }); el.querySelector('[data-check]').innerHTML = problems(r.problems); } catch (_) {}
  }, 500);
  root.addEventListener('input', e => { const t = e.target.closest('[data-text]'); if (t) { const el = t.closest('[data-review]'); check(el, el.dataset.review); } });
  root.addEventListener('click', async e => {
    if (e.target.closest('[data-rv="reload"]')) return load();
    const b = e.target.closest('[data-do]');
    if (!b) return undefined;
    const el = b.closest('[data-review]'); const id = el.dataset.review;
    const item = S.items.find(x => x.id === id);
    const tick = k => { const x = el.querySelector(`[data-tick="${k}"]`); return !!(x && x.checked); };
    const act = b.dataset.do;
    if (act === 'tell') return tellBrandon({ clientId: item.client_id, clientName: item.client_name, place: 'review', tab: 'reviews', by: by(), context: [{ label: 'Stars', value: String(item.stars || '') }, { label: 'Reviewer', value: item.reviewer_name || 'No name' }, { label: 'Review', value: item.comment || '(no text)' }, { label: 'Posted', value: item.create_time ? fmtDate(item.create_time, true) : '' }] });
    b.disabled = true;
    try {
      if (act === 'approve') {
        const text = el.querySelector('[data-text]').value;
        if (!(await confirm({ title: 'Post this reply on Google?', text: `It goes on ${item.client_name}'s Google profile, where the public can see it.`, ok: 'Post' }))) return undefined;
        const r = await api(`/api/reviews/${id}/approve`, { method: 'POST', body: { text, real_customer_checked: tick('real'), reported: tick('reported'), replace_existing: tick('replace'), by: by() } });
        if (r.posted) { toast('Posted'); S.items = S.items.filter(x => x.id !== id); draw(); }
        else { toast(r.reason === 'already replied' ? 'Google already had a reply, so nothing was posted' : `Not posted: ${r.reason}`, 'bad'); await load(); }
      } else if (act === 'neutral') {
        if (!(await confirm({ title: 'Have you reported this review on Google?', text: 'Use Report review on Google with the closest reason, and screenshot the review and the reviewer\'s profile, before posting the neutral reply.', ok: 'Yes, it is reported' }))) return undefined;
        replaceItem((await api(`/api/reviews/${id}/neutral`, { method: 'POST', body: { reported: true, by: by() } })).item);
        toast('The neutral reply is in. Check it, then approve');
      } else if (act === 'regenerate') {
        b.textContent = 'Writing…';
        replaceItem((await api(`/api/reviews/${id}/regenerate`, { method: 'POST', body: { by: by() } })).item);
      } else if (act === 'no-reply') {
        const d = dialog({ title: 'Close without a reply', body: '<label class="small">Why? (required)</label><textarea class="input" data-reason rows="3" style="width:100%;font:inherit" placeholder="For example: abusive, reported on Google, client told"></textarea><div class="btn-row" style="margin-top:10px"><button class="btn btn-primary" data-reason-ok>Close it</button></div>' });
        const box = (d && d.el) || document.querySelector('[role="dialog"]') || document.body;
        box.querySelector('[data-reason-ok]').addEventListener('click', async () => {
          const reason = box.querySelector('[data-reason]').value.trim();
          if (!reason) { toast('Say why', 'bad'); return; }
          try { await api(`/api/reviews/${id}/no-reply`, { method: 'POST', body: { reason, by: by() } }); if (d && d.close) d.close(); toast('Closed'); S.items = S.items.filter(x => x.id !== id); draw(); }
          catch (err) { toast(err.message, 'bad'); }
        });
      }
    } catch (err) { toast(err.message, 'bad'); }
    finally { if (b.isConnected) b.disabled = false; }
    return undefined;
  });
  await load();
}
