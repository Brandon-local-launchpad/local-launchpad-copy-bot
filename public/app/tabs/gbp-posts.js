// GBP Posts tab (7 Nov 2026, Stage 2 of the bundle.social build): finished posts in batches, from the
// Lead Snap config's prompts. A VA reads, edits and approves a batch here. Nothing publishes from this
// tab: approval is what the publishing job (Stage 3) will look for.

import { h, attr, api, card, toast, confirm, running, empty, fmtDate, pill, wire } from '../ui.js';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayOf = d => WEEKDAY[new Date(`${d}T12:00:00Z`).getUTCDay()];
const nice = d => { const x = new Date(`${d}T12:00:00Z`); return `${dayOf(d)} ${x.getUTCDate()} ${x.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })} ${x.getUTCFullYear()}`; };
const CTA = { CALL: 'Call', BOOK: 'Book', LEARN_MORE: 'Learn more', ORDER: 'Order', SHOP: 'Shop', SIGN_UP: 'Sign up' };

export async function render(el, ctx) {
  const { clientId } = ctx;
  const url = `/api/clients/${clientId}/gbp-posts`;
  let S = null, open = null, timer = null, filter = 'all', alive = true;
  const stopTimer = () => { if (timer) { clearTimeout(timer); timer = null; } };

  const load = async () => {
    try { S = await api(url); } catch (e) { S = { fatal: e.message }; }
    if (S.batches && !S.batches.some(b => b.id === open)) open = S.batches.length ? S.batches[0].id : null;
    draw();
  };
  // While a batch is being written the page checks back; a person's unsaved typing is never redrawn over
  const schedule = () => {
    stopTimer();
    if (!alive || !S || !S.batches || !S.batches.some(b => b.running)) return;
    timer = setTimeout(async () => { if (!el.isConnected) { alive = false; return; } await load(); }, 5000);
  };

  const newCard = () => {
    const needs = S.needs.length ? `<div class="notice warn" data-needs style="margin-bottom:10px"><ul style="margin:0 0 0 18px">${S.needs.map(n => `<li>${h(n)}</li>`).join('')}</ul></div>` : '';
    const link = S.no_link ? `<div class="notice warn small" data-no-link style="margin-bottom:10px">The button has no link yet, because this client has no live domain or booking page saved. You can still write the batch, but it can't be approved until there is one. Links fill in by themselves once it's saved.</div>` : '';
    const few = S.too_few ? `<div class="notice warn small" style="margin-bottom:10px">${h(S.too_few.message)}</div>` : '';
    const opts = S.sizes.map(z => `<option value="${z.size}">${z.size} posts, ${z.weeks} weeks, about ${z.pence}p</option>`).join('');
    const body = `${needs}${link}${few}
      <label class="field" style="display:block;margin-bottom:10px"><span class="small" style="font-weight:500">Batch</span><select class="input" style="width:100%" data-new-size>${opts}</select></label>
      <label class="field" style="display:block;margin-bottom:10px"><span class="small" style="font-weight:500">First post</span><input class="input" type="date" style="width:100%" data-new-start min="${attr(S.today)}" value="${attr(S.default_start || '')}"></label>
      <div class="muted small" style="margin-bottom:10px">Two posts a week, on ${h(S.days.map(d => WEEKDAY[d]).join(' and '))}, at 10am. ${S.offer ? `One Offer post every ${S.offer_days} days: ${h(S.offer)}.` : 'No confirmed offer, so no Offer posts.'}${S.cta ? ` Button: ${h(S.cta)}.` : ''}</div>
      <button class="btn btn-primary" data-act="new" ${S.ok && !S.batches.some(b => b.running) ? '' : 'disabled'}>Write the batch</button>`;
    return card({ title: 'New batch', sub: 'Written from the Lead Snap prompts, checked by the same rules', body });
  };

  const listCard = () => {
    if (!S.batches.length) return '';
    const row = b => `<button class="btn ${b.id === open ? 'btn-primary' : 'btn-ghost'}" style="width:100%;height:auto;margin-bottom:6px;justify-content:space-between;display:flex;flex-wrap:wrap;gap:4px 12px;white-space:normal;text-align:left" data-act="open" data-b="${attr(b.id)}"><span>${b.size} posts from ${h(nice(b.start_date))}</span><span class="small">${h(b.status === 'approved' ? 'Approved' : b.running ? 'Writing' : b.stopped ? 'Stopped' : 'To review')}</span></button>`;
    return card({ title: 'Batches', body: S.batches.map(row).join('') });
  };

  const postCard = (p, b) => {
    const locked = b.status === 'approved' || b.running;
    const inFolder = (S.photos || []).filter(f => p.folder === 'All job photos' ? f.label.toLowerCase() !== 'brand' : p.folder && p.folder.endsWith(` / ${f.label}`));
    const photoOpts = (inFolder.some(f => f.file_id === p.drive_file_id) ? inFolder : [{ file_id: p.drive_file_id, name: p.photo_name, label: '' }, ...inFolder]).map(f => `<option value="${attr(f.file_id)}" ${f.file_id === p.drive_file_id ? 'selected' : ''}>${h(f.name)}${p.folder === 'All job photos' && f.label ? ` (${h(f.label)})` : ''}</option>`).join('');
    const flags = (p.checks || []).filter(c => c.level !== 'pass');
    const state = p.status === 'failed' ? pill('block', 'Not written') : p.status === 'pending' ? pill('none', 'Waiting') : p.fails ? pill('block', `${p.fails} to fix`) : flags.length ? pill('wait', `${flags.length} to read`) : pill('ok', 'Clean');
    const button = p.topic === 'OFFER'
      ? `<div class="small">Offer: <strong>${h(p.offer_title)}</strong>, ${h(nice(p.offer_start))} to ${h(nice(p.offer_end))}. Claim link: ${p.offer_redeem_url ? h(p.offer_redeem_url) : '<span style="color:#991b1b">none</span>'}. Offer posts carry no button.</div>`
      : `<div class="small">Button: <strong>${h(CTA[p.cta_type] || 'none')}</strong>${p.cta_type === 'CALL' ? ' (the GBP phone number)' : p.cta_url ? ` to ${h(p.cta_url)}` : ''}</div>`;
    return `<div class="card" data-post="${attr(p.id)}" data-state="${p.fails ? 'fix' : flags.length ? 'read' : 'clean'}" style="margin-bottom:10px;padding:14px">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;margin-bottom:8px;flex-wrap:wrap"><div><strong>${p.seq}. ${h(nice(p.post_date))}</strong> ${p.topic === 'OFFER' ? pill('run', 'Offer') : ''} <span class="muted small">${h(p.prompt_label)}</span></div>${state}</div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start">
        <div style="flex:1 1 150px;max-width:220px">${p.drive_file_id ? `<img loading="lazy" alt="${attr(p.photo_name || 'Post photo')}" src="${attr(`${url}/photo/${encodeURIComponent(p.drive_file_id)}`)}" style="width:100%;border-radius:8px;display:block;background:var(--border);min-height:90px;object-fit:cover">` : ''}
          <label class="small" style="display:block;margin-top:6px">Photo<select class="input" style="width:100%" data-photo ${locked ? 'disabled' : ''}>${photoOpts}</select></label>
          <label class="small" style="display:block;margin-top:6px">Date<input class="input" type="date" style="width:100%" data-date value="${attr(p.post_date)}" ${locked ? 'disabled' : ''}></label></div>
        <div style="flex:999 1 280px;min-width:0;overflow-wrap:anywhere">${p.status === 'written' ? `<textarea class="input" data-body rows="11" style="width:100%;resize:vertical" ${locked ? 'disabled' : ''}>${h(p.body)}</textarea>` : `<div class="muted small" style="padding:8px 0">${p.error ? `The model call failed: ${h(p.error)}` : 'Not written yet.'}</div>`}
          <div style="margin-top:6px">${button}</div>
          ${flags.length ? `<ul class="small" data-flags style="margin:6px 0 0;padding:0;list-style:none">${flags.map(c => `<li>${pill(c.level === 'fail' ? 'block' : 'wait', c.level === 'fail' ? 'Fix' : 'Read')} ${h(c.label)}${c.detail ? `: <span class="muted">${h(c.detail)}</span>` : ''}</li>`).join('')}</ul>` : ''}
          ${locked ? '' : `<div class="btn-row" style="margin-top:8px"><button class="btn btn-ghost btn-sm" data-act="save-post">Save</button><button class="btn btn-ghost btn-sm" data-act="rewrite">Write again</button></div>`}
        </div></div></div>`;
  };

  const batchCards = () => {
    const b = S.batches.find(x => x.id === open);
    if (!b) return card({ title: 'Posts', body: empty({ title: 'No batch yet', text: 'Write a batch and it comes out here to read, edit and approve.' }) });
    const posts = b.posts;
    const fix = posts.filter(p => p.fails || p.status === 'failed').length;
    const read = posts.filter(p => !p.fails && (p.checks || []).some(c => c.level === 'warn')).length;
    const notYet = posts.filter(p => p.status === 'pending').length;
    const notes = (b.notes || []).length ? `<div class="notice warn small" style="margin-bottom:10px"><ul style="margin:0 0 0 18px">${b.notes.map(n => `<li>${h(n)}</li>`).join('')}</ul></div>` : '';
    const stops = (b.blockers || []).length && !b.running ? `<div class="notice bad small" data-blockers style="margin-bottom:10px"><strong>This can't be approved yet.</strong><ul style="margin:4px 0 0 18px">${[...new Set(b.blockers)].slice(0, 12).map(n => `<li>${h(n)}</li>`).join('')}</ul></div>` : '';
    const prog = b.running ? `<div style="margin-bottom:10px">${running({ now: `Writing post ${b.done + 1} of ${b.size}`, next: 'Then each one is checked. You can leave this page.', done: b.done, total: b.size })}</div>` : b.stopped ? `<div class="notice warn" style="margin-bottom:10px">${b.done} of ${b.size} written, and the run has stopped. <button class="btn btn-ghost btn-sm" data-act="continue">Continue</button></div>` : '';
    const actions = b.status === 'approved'
      ? `<button class="btn btn-ghost" data-act="unapprove">Take approval back</button>`
      : `<button class="btn btn-primary" data-act="approve" ${b.status === 'draft' && !b.blockers.length ? '' : 'disabled'}>Approve batch</button>`;
    const head = card({ title: `${b.size} posts`, sub: `${nice(b.start_date)} onward · written for ${b.pence}p`, actions, body: `${b.status === 'approved' ? `<div class="notice" data-approved style="margin-bottom:10px">Approved ${h(fmtDate(b.approved_at, true))}. Nothing has gone out: publishing arrives in the next stage of this build.</div>` : ''}${prog}${stops}${notes}
      <div class="btn-row" style="margin-bottom:6px;align-items:center;flex-wrap:wrap"><span class="small" data-counts>${fix} to fix, ${read} to read, ${posts.length - fix - read - notYet} clean${notYet ? `, ${notYet} waiting` : ''}</span>
      <select class="input" style="width:auto" data-filter>${[['all', 'Show all'], ['fix', 'To fix'], ['read', 'To read']].map(([v, t]) => `<option value="${v}" ${filter === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
      ${b.status === 'approved' || b.running ? '' : `<label class="small">Move start <input class="input" type="date" data-move min="${attr(S.today)}" value="${attr(b.start_date)}"></label><button class="btn btn-ghost btn-sm" data-act="move">Move dates</button><button class="btn btn-ghost btn-sm" data-act="delete" style="color:#991b1b">Delete batch</button>`}</div>` });
    const shown = posts.filter(p => filter === 'all' || (filter === 'fix' ? (p.fails || p.status === 'failed') : !p.fails && (p.checks || []).some(c => c.level === 'warn')));
    return head + (shown.length ? shown.map(p => postCard(p, b)).join('') : `<div class="muted small" style="padding:8px">None.</div>`);
  };

  const draw = () => {
    if (!S) return;
    if (S.fatal) { el.innerHTML = `<div class="card">${empty({ title: 'The GBP Posts tab could not load', text: S.fatal, action: '<button class="btn btn-ghost" data-act="reload">Retry</button>' })}</div>`; return; }
    // Keep someone's place, and never drop what they are typing
    const y = window.scrollY;
    const typing = el.querySelector('[data-body]:focus');
    if (typing && S.batches.some(b => b.running)) { schedule(); return; }
    el.innerHTML = `<div class="stack"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;align-items:start">${newCard()}${listCard()}</div><div class="stack" data-review>${batchCards()}</div></div>`;
    window.scrollTo(0, y);
    schedule();
  };

  const call = async (path, opts, done) => {
    try { S = await api(`${url}${path}`, opts); if (done) toast(done); }
    catch (e) { toast(e.message, 'bad'); await load(); return; }
    if (!S.batches.some(b => b.id === open)) open = S.batches.length ? S.batches[0].id : null;
    draw();
  };

  el.addEventListener('change', e => { const f = e.target.closest('[data-filter]'); if (f) { filter = f.value; draw(); } });
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    const postEl = b.closest('[data-post]');
    const postId = postEl && postEl.dataset.post;
    if (act === 'reload') return load();
    if (act === 'open') { open = b.dataset.b; filter = 'all'; return draw(); }
    if (act === 'new') {
      const size = el.querySelector('[data-new-size]').value, start = el.querySelector('[data-new-start]').value;
      const z = S.sizes.find(x => String(x.size) === size);
      if (!(await confirm({ title: `Write ${size} posts?`, text: `This costs about ${z.pence}p and takes a few minutes. Nothing goes out: you read and approve the batch first.`, ok: 'Write the batch' }))) return;
      await call('/batches', { method: 'POST', body: { size: Number(size), start } });
      if (S.batches && S.batches[0]) open = S.batches[0].id;
      return draw();
    }
    if (act === 'continue') return call(`/batches/${open}/continue`, { method: 'POST' });
    if (act === 'approve') {
      if (!(await confirm({ title: 'Approve this batch?', text: 'Approving means these posts are ready to go out on their dates once publishing is switched on. You can take the approval back.', ok: 'Approve' }))) return;
      return call(`/batches/${open}/approve`, { method: 'POST', body: {} }, 'Approved');
    }
    if (act === 'unapprove') return call(`/batches/${open}/unapprove`, { method: 'POST' }, 'Back to draft');
    if (act === 'delete') {
      if (!(await confirm({ title: 'Delete this batch?', text: 'Every post in it goes, with any edits, and this cannot be undone. Writing a new batch costs again.', ok: 'Delete', danger: true }))) return;
      return call(`/batches/${open}`, { method: 'DELETE' }, 'Deleted');
    }
    if (act === 'move') return call(`/batches/${open}/start`, { method: 'PUT', body: { start: el.querySelector('[data-move]').value } }, 'Dates moved');
    if (act === 'save-post') {
      const body = { post_date: postEl.querySelector('[data-date]').value, drive_file_id: postEl.querySelector('[data-photo]').value };
      const t = postEl.querySelector('[data-body]'); if (t) body.body = t.value;
      return call(`/posts/${postId}`, { method: 'PUT', body }, 'Saved');
    }
    if (act === 'rewrite') {
      if (!(await confirm({ title: 'Write this post again?', text: 'Any edits to it are lost, and it costs about a penny.', ok: 'Write again' }))) return;
      b.disabled = true; b.textContent = 'Writing…';
      return call(`/posts/${postId}/rewrite`, { method: 'POST' }, 'Written again');
    }
  });
  wire(el);
  await load();
}
