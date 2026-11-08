// GBP Posts & Photos tab (7 Nov 2026, Stage 2 of the bundle.social build; 8 Nov the Lead Snap tab joined it,
// and the layout was redone the same day, Brandon). At the top a status strip: each step at a glance, and one
// list of what stops posts going out, each with where to fix it. Then three sections:
//   Posts (the default)    the batches to read, edit and approve, then the Queue
//   Photos & prompts       the Drive folder and counts, post settings, the prompts (gbp-setup.js)
//   Publishing             the connection, the switch, Photo Drip (gbp-publishing.js)
// Approval is what the daily job looks for. Every rule is on the server; this screen only lays it out.

import { h, attr, api, card, toast, confirm, dialog, running, empty, fmtDate, pill, wire } from '../ui.js';
import { renderPublishing } from './gbp-publishing.js';
import { renderSetup } from './gbp-setup.js';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayOf = d => WEEKDAY[new Date(`${d}T12:00:00Z`).getUTCDay()];
const nice = d => { const x = new Date(`${d}T12:00:00Z`); return `${dayOf(d)} ${x.getUTCDate()} ${x.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })} ${x.getUTCFullYear()}`; };
const short = d => { const x = new Date(`${d}T12:00:00Z`); return `${x.getUTCDate()} ${x.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })}`; };
const CTA = { CALL: 'Call now', BOOK: 'Book', LEARN_MORE: 'Learn more', ORDER: 'Order online', SHOP: 'Shop', SIGN_UP: 'Sign up' };
const SECTIONS = [['posts', 'Posts'], ['setup', 'Photos & prompts'], ['publishing', 'Publishing']];
const words = t => (String(t || '').trim().match(/\S+/g) || []).length;
// A batch blocker the status strip already says (no live domain or booking page)
const LINK_LINE = /button has no link|nowhere to claim/i;

export async function render(host, ctx) {
  const { clientId } = ctx;
  let section = SECTIONS.some(([k]) => k === (ctx.query && ctx.query.s)) ? ctx.query.s : 'posts';
  host.innerHTML = `<div data-strip></div>
    <div class="gp-seg" role="tablist">${SECTIONS.map(([k, l]) => `<button role="tab" data-sec-btn="${k}" aria-selected="${k === section}">${l}</button>`).join('')}</div>
    <section data-sec="posts"><div data-posts-host></div><div data-queue-host style="margin-top:16px"></div></section>
    <section data-sec="setup"><div data-setup-host></div></section>
    <section data-sec="publishing"><div data-publishing-host></div></section>`;
  const el = host.querySelector('[data-posts-host]');
  const stripEl = host.querySelector('[data-strip]');
  let SS = null, SB = null;   // the setup's and the publishing part's last answers, for the strip

  const showSection = k => {
    section = k;
    host.querySelectorAll('[data-sec]').forEach(s => { s.hidden = s.dataset.sec !== k; });
    host.querySelectorAll('[data-sec-btn]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.secBtn === k)));
    try { const u = new URL(location.href); if (k === 'posts') u.searchParams.delete('s'); else u.searchParams.set('s', k); history.replaceState(history.state, '', u); } catch (_) {}
  };
  showSection(section);
  host.querySelector('.gp-seg').addEventListener('click', e => { const b = e.target.closest('[data-sec-btn]'); if (b) showSection(b.dataset.secBtn); });

  let publishing = null;
  const publishingEl = host.querySelector('[data-publishing-host]');
  renderPublishing(publishingEl, ctx, { queueEl: host.querySelector('[data-queue-host]'), onData: d => { SB = d; drawStrip(); } })
    .then(p => { publishing = p; }).catch(e => { publishingEl.innerHTML = `<div class="notice bad">Publishing could not load: ${h(e.message)}</div>`; });
  const refreshQueue = () => { if (publishing) publishing.refresh(); };
  let reloadPosts = null;
  const setupEl = host.querySelector('[data-setup-host]');
  renderSetup(setupEl, ctx, { onData: d => { SS = d; drawStrip(); }, onChange: () => { refreshQueue(); if (typeof reloadPosts === 'function') reloadPosts(); } })
    .catch(e => { setupEl.innerHTML = `<div class="notice bad">Photos and prompts could not load: ${h(e.message)}</div>`; });

  const url = `/api/clients/${clientId}/gbp-posts`;
  let S = null, open = null, timer = null, filter = 'all', alive = true, newOpen = false;
  const editing = new Set();
  const stopTimer = () => { if (timer) { clearTimeout(timer); timer = null; } };
  const load = async () => {
    try { S = await api(url); } catch (e) { S = { fatal: e.message }; }
    if (S.batches && !S.batches.some(b => b.id === open)) open = S.batches.length ? S.batches[0].id : null;
    draw();
  };
  reloadPosts = load;
  // While a batch is being written the page checks back; a person's unsaved typing is never redrawn over
  const schedule = () => {
    stopTimer();
    if (!alive || !S || !S.batches || !S.batches.some(b => b.running)) return;
    timer = setTimeout(async () => { if (!el.isConnected) { alive = false; return; } await load(); }, 5000);
  };

  // ── The status strip: each step, then one list of what stops posts going out ──
  function drawStrip() {
    if (!stripEl.isConnected) return;
    const steps = [];
    const step = (sec, label, kind, value) => steps.push(`<button class="gp-step" data-go="${sec}" title="Open ${attr(label)}"><span class="lbl">${h(label)}</span><span class="val"><span class="dot ${kind}"></span><span>${h(value)}</span></span></button>`);
    const D = SS && SS.drive, R = SS && SS.record;
    step('setup', 'Photos', !SS ? 'none' : D && D.active ? 'ok' : 'wait', !SS ? '…' : D && D.active ? `${D.total} in Drive` : D && D.folder ? 'Not read yet' : 'No folder');
    step('setup', 'Prompts', !SS ? 'none' : SS.running ? 'run' : R && R.output ? 'ok' : 'wait', !SS ? '…' : SS.running ? 'Writing now' : R && R.output ? `Written ${fmtDate(R.generated_at)}` : 'Not written');
    const C = SB && SB.connection, connected = C && C.status === 'connected';
    step('publishing', 'Connected', !SB ? 'none' : C && C.problem ? 'block' : connected ? 'ok' : 'wait', !SB ? '…' : C && C.problem ? 'Problem' : connected ? (C.location_name || 'Yes') : SB.enabled ? 'Not yet' : 'Server switch off');
    step('publishing', 'Publishing', !SB ? 'none' : connected && C.publishing_on ? 'ok' : 'none', !SB ? '…' : connected && C.publishing_on ? 'On' : 'Off');
    const bs = (S && S.batches) || [];
    const writing = bs.find(b => b.running), draft = bs.find(b => b.status !== 'approved' && !b.running);
    const lastApproved = bs.filter(b => b.status === 'approved').flatMap(b => b.posts.map(p => p.post_date)).sort().pop();
    step('posts', 'Posts', !S ? 'none' : writing ? 'run' : draft ? 'wait' : lastApproved ? 'ok' : 'none', !S ? '…' : writing ? 'Writing a batch' : draft ? `${draft.size} to review` : lastApproved ? `Approved to ${short(lastApproved)}` : 'No batch yet');
    const Dr = SB && SB.drip;
    step('publishing', 'Photo Drip', !Dr ? 'none' : Dr.ran_out ? 'block' : Dr.queued || Dr.planned ? 'ok' : Dr.left ? 'wait' : 'none', !Dr ? '…' : Dr.ran_out ? 'Run out' : Dr.queued ? `${Dr.queued} queued` : Dr.planned ? `${Dr.planned} to approve` : Dr.left ? `${Dr.left} to plan` : 'No photos');

    // What stops posts going out, once each, with where it's fixed
    const stops = [];
    const add = (text, sec, label, href) => { if (!stops.some(s => s.text === text)) stops.push({ text, sec, label, href }); };
    if (S && S.no_link) add('No live domain or booking page is saved, so the posts have no link and can\'t be approved. They fill in by themselves once it\'s saved.', null, 'Open the Record tab', `/clients/${clientId}/record`);
    for (const n of (S && S.needs) || []) add(n, 'setup', 'Photos & prompts');
    if (SS && SS.intake) for (const m of SS.intake.missing || []) add(`Needed: ${m}`, 'setup', 'Photos & prompts');
    if (SS && SS.plan && SS.intake && SS.intake.photosEntered && SS.plan.tooFew) add(SS.plan.tooFew.message, 'setup', 'Photos & prompts');
    if (C && C.problem) add(C.problem, 'publishing', 'Publishing');
    const list = stops.length ? `<div class="notice bad small gp-blockers" data-stops><strong>Before posts can go out</strong><ul style="list-style:none;margin:6px 0 0;padding:0">${stops.map(s => `<li><span>${h(s.text)}</span>${s.href ? `<a class="btn btn-ghost btn-xs" href="${attr(s.href)}" data-link>${h(s.label)}</a>` : `<button class="btn btn-ghost btn-xs" data-go="${s.sec}">${h(s.label)}</button>`}</li>`).join('')}</ul></div>` : '';
    stripEl.innerHTML = `<div class="card gp-strip" data-status-strip>${steps.join('')}</div>${list}`;
  }
  host.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g && host.contains(g)) { showSection(g.dataset.go); host.scrollIntoView({ block: 'start' }); } });

  // ── Posts ──
  const photoUrl = (id, thumb) => `${url}/photo/${encodeURIComponent(id)}${thumb ? '?size=thumb' : ''}`;
  const img = (id, alt) => `<img loading="lazy" alt="${attr(alt || 'Post photo')}" src="${attr(photoUrl(id, true))}" onerror="this.outerHTML='<div class=&quot;ph-missing&quot;>This photo can\\'t be shown. It may have been moved or removed in Drive.</div>'">`;

  const newCard = () => {
    const few = S.too_few ? `<div class="notice warn small" style="margin-bottom:10px">${h(S.too_few.message)}</div>` : '';
    const opts = S.sizes.map(z => `<option value="${z.size}">${z.size} posts, ${z.weeks} weeks, about ${z.pence}p</option>`).join('');
    const body = `${few}<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0 12px">
      <label class="field" style="display:block;margin-bottom:10px"><span class="small" style="font-weight:500">How many</span><select class="input" style="width:100%" data-new-size>${opts}</select></label>
      <label class="field" style="display:block;margin-bottom:10px"><span class="small" style="font-weight:500">First post</span><input class="input" type="date" style="width:100%" data-new-start min="${attr(S.today)}" value="${attr(S.default_start || '')}"></label></div>
      <div class="muted small" style="margin-bottom:10px">Two posts a week, on ${h(S.days.map(d => WEEKDAY[d]).join(' and '))}, at 10am. ${S.offer ? `One Offer post every ${S.offer_days} days: ${h(S.offer)}.` : 'No confirmed offer, so no Offer posts.'}${S.cta ? ` Button: ${h(S.cta)}.` : ''} Nothing goes out until you approve the batch.</div>
      <div class="btn-row"><button class="btn btn-primary" data-act="new" ${S.ok && !S.batches.some(b => b.running) ? '' : 'disabled'}>Write the batch</button>${S.batches.length ? '<button class="btn btn-ghost" data-act="new-close">Cancel</button>' : ''}</div>`;
    return card({ title: 'New batch', sub: 'Finished posts, written from the prompts', body });
  };

  const batchBar = () => {
    if (!S.batches.length) return '';
    const state = b => (b.status === 'approved' ? 'Approved' : b.running ? 'Writing' : b.stopped ? 'Stopped' : 'To review');
    return `<div class="gp-batchbar">${S.batches.map(b => `<button class="chip ${b.id === open && !newOpen ? 'active' : ''}" data-act="open" data-b="${attr(b.id)}">${b.size} posts from ${h(short(b.start_date))} · ${h(state(b))}</button>`).join('')}<button class="chip ${newOpen ? 'active' : ''}" data-act="new-open">+ New batch</button></div>`;
  };

  const postCard = (p, b) => {
    const locked = b.status === 'approved' || b.running;
    const flags = (p.checks || []).filter(c => c.level !== 'pass');
    const state = p.status === 'failed' ? pill('block', 'Not written') : p.status === 'pending' ? pill('none', 'Waiting') : p.fails ? pill('block', `${p.fails} to fix`) : flags.length ? pill('wait', `${flags.length} to read`) : pill('ok', 'Clean');
    const isEditing = editing.has(p.id) && !locked;
    const text = p.status !== 'written'
      ? `<div class="muted small" style="padding:8px 0">${p.error ? `The model call failed: ${h(p.error)}` : 'Not written yet.'}</div>`
      : isEditing ? `<textarea class="input" data-body>${h(p.body)}</textarea>` : `<div class="gpost-text" data-text>${h(p.body)}</div>`;
    const button = p.topic === 'OFFER'
      ? `<div class="gpost-offer"><div style="font-weight:600">${h(p.offer_title)}</div><div class="muted">${h(nice(p.offer_start))} to ${h(nice(p.offer_end))}</div><div>Claim link: ${p.offer_redeem_url ? h(p.offer_redeem_url) : '<span style="color:var(--block-ink)">none yet</span>'}</div></div>`
      : p.cta_type ? `<span class="gpost-cta" title="${attr(p.cta_type === 'CALL' ? 'Calls the GBP phone number' : p.cta_url || 'No link yet')}">${h(CTA[p.cta_type] || p.cta_type)}</span>${p.cta_type !== 'CALL' && !p.cta_url ? ' <span class="small" style="color:var(--block-ink)">no link yet</span>' : ''}` : '';
    const actions = locked ? '' : isEditing
      ? '<button class="btn btn-primary btn-sm" data-act="save-post">Save</button><button class="btn btn-ghost btn-sm" data-act="cancel-edit">Cancel</button>'
      : `${p.status === 'written' ? '<button class="btn btn-ghost btn-sm" data-act="edit">Edit</button>' : ''}<button class="btn btn-ghost btn-sm" data-act="rewrite">Write again</button>`;
    return `<article class="gpost" data-post="${attr(p.id)}" data-state="${p.fails ? 'fix' : flags.length ? 'read' : 'clean'}">
      <div class="gpost-top"><div><strong>${p.seq}. ${h(nice(p.post_date))}</strong> ${p.topic === 'OFFER' ? pill('run', 'Offer') : ''} <span class="muted small">${h(p.prompt_label)}</span></div>${state}</div>
      <div class="gpost-body">
        <div class="gpost-photo">${p.drive_file_id ? img(p.drive_file_id, p.photo_name) : '<div class="ph-missing">No photo</div>'}${locked ? '' : '<button class="btn btn-ghost btn-sm" data-act="pick-photo">Change photo</button>'}</div>
        <div style="min-width:0">${text}${button ? `<div>${button}</div>` : ''}
          ${flags.length ? `<ul class="small" data-flags style="margin:10px 0 0;padding:0;list-style:none">${flags.map(c => `<li style="margin-bottom:4px">${pill(c.level === 'fail' ? 'block' : 'wait', c.level === 'fail' ? 'Fix' : 'Read')} ${h(c.label)}${c.detail ? `: <span class="muted">${h(c.detail)}</span>` : ''}</li>`).join('')}</ul>` : ''}
          <div class="gpost-meta">${p.status === 'written' ? `<span>${words(p.body)} words</span>` : ''}<label>Goes out <input class="input" type="date" data-date value="${attr(p.post_date)}" ${locked ? 'disabled' : ''}></label>${p.photo_name ? `<span title="The photo's file name in Drive">${h(p.photo_name)}</span>` : ''}<span class="btn-row" style="margin-left:auto">${actions}</span></div>
        </div></div></article>`;
  };

  const batchView = () => {
    const b = S.batches.find(x => x.id === open);
    if (!b) return '';
    const posts = b.posts;
    const isFix = p => p.fails || p.status === 'failed';
    const isRead = p => !p.fails && (p.checks || []).some(c => c.level === 'warn');
    const fix = posts.filter(isFix).length, read = posts.filter(isRead).length, notYet = posts.filter(p => p.status === 'pending').length;
    const dates = posts.map(p => p.post_date).sort();
    const notes = (b.notes || []).length ? `<div class="notice warn small" style="margin-bottom:10px"><ul style="margin:0 0 0 18px">${b.notes.map(n => `<li>${h(n)}</li>`).join('')}</ul></div>` : '';
    const own = [...new Set(b.blockers || [])].filter(n => !(S.no_link && LINK_LINE.test(n)));
    const linkWait = S.no_link && (b.blockers || []).some(n => LINK_LINE.test(n));
    const stops = !b.running && (own.length || linkWait) ? `<div class="notice bad small" data-blockers style="margin-bottom:10px"><strong>This can't be approved yet.</strong><ul style="margin:4px 0 0 18px">${own.slice(0, 12).map(n => `<li>${h(n)}</li>`).join('')}${linkWait ? '<li>It needs the live domain or a booking page: see the top of the page.</li>' : ''}</ul></div>` : '';
    const prog = b.running ? `<div style="margin-bottom:10px">${running({ now: `Writing post ${b.done + 1} of ${b.size}`, next: 'Then each one is checked. You can leave this page.', done: b.done, total: b.size })}</div>` : b.stopped ? `<div class="notice warn" style="margin-bottom:10px">${b.done} of ${b.size} written, and the run has stopped. <button class="btn btn-ghost btn-sm" data-act="continue">Continue</button></div>` : '';
    const actions = b.status === 'approved'
      ? '<button class="btn btn-ghost" data-act="unapprove">Take approval back</button>'
      : `<button class="btn btn-primary" data-act="approve" ${b.status === 'draft' && !b.blockers.length ? '' : 'disabled'}>Approve batch</button>`;
    const chip = (v, label, n) => `<button class="chip ${filter === v ? 'active' : ''}" data-filter="${v}">${label} ${n}</button>`;
    const more = b.status === 'approved' || b.running ? '' : `<details style="display:inline-block"><summary class="chip" style="list-style:none">More</summary><div class="card" style="position:absolute;z-index:6;margin-top:6px;padding:12px;min-width:240px"><label class="small" style="display:block;margin-bottom:8px">Move the whole batch to start on<input class="input" type="date" data-move min="${attr(S.today)}" value="${attr(b.start_date)}" style="width:100%;margin-top:4px"></label><div class="btn-row"><button class="btn btn-ghost btn-sm" data-act="move">Move dates</button><button class="btn btn-ghost btn-sm" data-act="delete" style="color:var(--block-ink)">Delete batch</button></div></div></details>`;
    const head = `<div class="card gp-head" data-batch-head><div class="card-head"><div><h2>${b.size} posts · ${h(short(dates[0] || b.start_date))} to ${h(short(dates[dates.length - 1] || b.start_date))}</h2><div class="sub">${b.status === 'approved' ? `Approved ${h(fmtDate(b.approved_at, true))}` : 'To review'} · written for ${b.pence}p</div></div>${actions}</div>
      <div class="btn-row" style="align-items:center" data-counts>${chip('all', 'All', posts.length)}${chip('fix', 'To fix', fix)}${chip('read', 'To read', read)}${chip('clean', 'Clean', posts.length - fix - read - notYet)}${more}</div></div>`;
    const shown = posts.filter(p => filter === 'all' || (filter === 'fix' ? isFix(p) : filter === 'read' ? isRead(p) : !isFix(p) && !isRead(p) && p.status !== 'pending'));
    const top = `${b.status === 'approved' ? '<div class="notice small" data-approved style="margin-top:12px">Approved. Each post goes out on its date once publishing is on. The Queue below shows where each one has got to.</div>' : ''}${prog || stops || notes ? `<div style="margin-top:12px">${prog}${stops}${notes}</div>` : ''}`;
    return head + top + (shown.length ? shown.map(p => postCard(p, b)).join('') : '<div class="muted small" style="padding:12px">None.</div>');
  };

  const draw = () => {
    if (!S) return;
    drawStrip();
    if (S.fatal) { el.innerHTML = `<div class="card">${empty({ title: 'The posts could not load', text: S.fatal, action: '<button class="btn btn-ghost" data-act="reload">Retry</button>' })}</div>`; return; }
    // Keep someone's place, and never drop what they are typing
    const y = window.scrollY;
    const typing = el.querySelector('[data-body]:focus');
    if (typing && S.batches.some(b => b.running)) { schedule(); return; }
    const showNew = newOpen || !S.batches.length;
    el.innerHTML = `${batchBar()}${showNew ? newCard() : ''}${!showNew ? batchView() : ''}${!S.batches.length ? `<div class="card" style="margin-top:16px">${empty({ title: 'No batch yet', text: 'Write a batch and the posts come out here to read, edit and approve.' })}</div>` : ''}`;
    el.querySelectorAll('[data-body]').forEach(fit);
    window.scrollTo(0, y);
    schedule();
  };
  // A text box as tall as its text, so a post is read whole
  const fit = t => { t.style.height = 'auto'; t.style.height = `${t.scrollHeight + 4}px`; };
  el.addEventListener('input', e => { if (e.target.matches('[data-body]')) fit(e.target); });

  const call = async (path, opts, done) => {
    try { S = await api(`${url}${path}`, opts); if (done) toast(done); }
    catch (e) { toast(e.message, 'bad'); await load(); return false; }
    if (!S.batches.some(b => b.id === open)) open = S.batches.length ? S.batches[0].id : null;
    draw();
    return true;
  };
  const postOf = id => { for (const b of S.batches) { const p = b.posts.find(x => x.id === id); if (p) return p; } return null; };

  // Change photo: that prompt's folder as a grid of thumbnails
  function pickPhoto(postId) {
    const p = postOf(postId); if (!p) return;
    const inFolder = (S.photos || []).filter(f => (p.folder === 'All job photos' ? f.label.toLowerCase() !== 'brand' : p.folder && p.folder.endsWith(` / ${f.label}`)));
    const list = inFolder.some(f => f.file_id === p.drive_file_id) || !p.drive_file_id ? inFolder : [{ file_id: p.drive_file_id, name: p.photo_name, label: '' }, ...inFolder];
    // A photo another post already uses can't be picked: each photo goes on the profile once
    const usedBy = new Map();
    for (const b of S.batches) for (const q of b.posts) if (q.id !== p.id && q.drive_file_id) usedBy.set(q.drive_file_id, `${b.id === open ? 'Post' : 'In another batch, post'} ${q.seq}`);
    const d = dialog({ title: `Photo for post ${p.seq}`, wide: true, body: list.length ? `<div class="muted small" style="margin-bottom:8px">${h(p.folder || 'Photos')}: ${list.length} photo${list.length === 1 ? '' : 's'}. Each photo goes on the profile once, so photos other posts use are greyed out.</div><div class="gp-grid">${list.map(f => { const used = usedBy.get(f.file_id); return `<button data-pick="${attr(f.file_id)}" aria-current="${f.file_id === p.drive_file_id}" ${used ? 'disabled' : ''}><img loading="lazy" alt="${attr(f.name)}" src="${attr(photoUrl(f.file_id, true))}"><div class="cap">${used ? `${h(used)} · ` : ''}${h(f.name)}${p.folder === 'All job photos' && f.label ? ` · ${h(f.label)}` : ''}</div></button>`; }).join('')}</div>` : empty({ title: 'No other photos in this folder', text: 'Add photos to the folder in Drive, then press Read Drive under Photos & prompts.' }) });
    const box = (d && d.el) || document.body;
    box.addEventListener('click', async e => {
      const pick = e.target.closest('[data-pick]'); if (!pick) return;
      if (d && d.close) d.close();
      if (pick.dataset.pick === p.drive_file_id) return;
      await call(`/posts/${postId}`, { method: 'PUT', body: { post_date: p.post_date, drive_file_id: pick.dataset.pick } }, 'Photo changed');
    });
  }

  el.addEventListener('change', async e => {
    const dt = e.target.closest('[data-date]');
    if (dt) {
      const postId = dt.closest('[data-post]').dataset.post, p = postOf(postId);
      if (p && dt.value && dt.value !== p.post_date) await call(`/posts/${postId}`, { method: 'PUT', body: { post_date: dt.value, drive_file_id: p.drive_file_id } }, 'Date changed');
    }
  });
  el.addEventListener('click', async e => {
    const f = e.target.closest('[data-filter]'); if (f) { filter = f.dataset.filter; draw(); return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    const postEl = b.closest('[data-post]');
    const postId = postEl && postEl.dataset.post;
    if (act === 'reload') { await load(); return; }
    if (act === 'open') { open = b.dataset.b; filter = 'all'; newOpen = false; draw(); return; }
    if (act === 'new-open') { newOpen = true; draw(); return; }
    if (act === 'new-close') { newOpen = false; draw(); return; }
    if (act === 'edit') { editing.add(postId); draw(); const t = el.querySelector(`[data-post="${postId}"] [data-body]`); if (t) t.focus(); return; }
    if (act === 'cancel-edit') { editing.delete(postId); draw(); return; }
    if (act === 'pick-photo') { pickPhoto(postId); return; }
    if (act === 'new') {
      const size = el.querySelector('[data-new-size]').value, start = el.querySelector('[data-new-start]').value;
      const z = S.sizes.find(x => String(x.size) === size);
      if (!(await confirm({ title: `Write ${size} posts?`, text: `This costs about ${z.pence}p and takes a few minutes. Nothing goes out: you read and approve the batch first.`, ok: 'Write the batch' }))) return;
      newOpen = false;
      await call('/batches', { method: 'POST', body: { size: Number(size), start } });
      if (S.batches && S.batches[0]) { open = S.batches[0].id; draw(); }
      return;
    }
    if (act === 'continue') { await call(`/batches/${open}/continue`, { method: 'POST' }); return; }
    if (act === 'approve') {
      if (!(await confirm({ title: 'Approve this batch?', text: 'Approving means these posts go out on their dates once publishing is switched on. You can take the approval back until they have gone to bundle.social.', ok: 'Approve' }))) return;
      await call(`/batches/${open}/approve`, { method: 'POST', body: {} }, 'Approved');
      refreshQueue(); return;
    }
    if (act === 'unapprove') { await call(`/batches/${open}/unapprove`, { method: 'POST' }, 'Back to draft'); refreshQueue(); return; }
    if (act === 'delete') {
      if (!(await confirm({ title: 'Delete this batch?', text: 'Every post in it goes, with any edits, and this cannot be undone. Writing a new batch costs again.', ok: 'Delete', danger: true }))) return;
      await call(`/batches/${open}`, { method: 'DELETE' }, 'Deleted'); return;
    }
    if (act === 'move') { await call(`/batches/${open}/start`, { method: 'PUT', body: { start: el.querySelector('[data-move]').value } }, 'Dates moved'); return; }
    if (act === 'save-post') {
      const p = postOf(postId);
      const t = postEl.querySelector('[data-body]');
      if (await call(`/posts/${postId}`, { method: 'PUT', body: { post_date: p.post_date, drive_file_id: p.drive_file_id, body: t ? t.value : p.body } }, 'Saved')) { editing.delete(postId); draw(); }
      return;
    }
    if (act === 'rewrite') {
      if (!(await confirm({ title: 'Write this post again?', text: 'Any edits to it are lost, and it costs about a penny.', ok: 'Write again' }))) return;
      b.disabled = true; b.textContent = 'Writing…';
      editing.delete(postId);
      await call(`/posts/${postId}/rewrite`, { method: 'POST' }, 'Written again');
    }
  });
  wire(el);
  await load();
}
