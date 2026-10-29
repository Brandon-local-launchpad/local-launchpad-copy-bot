// Pages tab (27 Oct 2026): one table for every page type (homepage, category, service,
// location) with a type filter: page, status (not started, running, written, blocked,
// waiting on a person, approved, pushed), quality score, claims to accept, last run.
// Write all / resume / write one through the existing run routes; a row opens the Page view.
// Polls every 8 seconds while a run is on.

import { h, attr, api, card, table, status, pill, timeEl, score, running, toast, confirm, empty, plural, fmtDate, busy } from '../ui.js';

const TYPES = [['homepage', 'Homepage'], ['category', 'Category'], ['service', 'Service'], ['location', 'Location'], ['blog', 'Blog']];
const STATUS_KIND = { held: 'wait', 'not started': 'none', running: 'run', queued: 'none', written: 'ok', blocked: 'block', failed: 'block', 'waiting on a person': 'wait', approved: 'ok', pushed: 'ok', skipped: 'none', waiting: 'none' };

export async function render(el, ctx) {
  const { clientId } = ctx;
  let filter = ctx.query.type || 'all';
  let quality = false;
  let timer = null;
  let data = null;

  const load = async () => {
    const [summary, home, cat, svc, loc, log] = await Promise.all([
      api(`/api/clients/${clientId}/summary`),
      api(`/api/clients/${clientId}/v20/homepage`).catch(() => null),
      api(`/api/clients/${clientId}/category-pages`).catch(e => ({ error: e.message })),
      api(`/api/clients/${clientId}/service-pages`).catch(e => ({ error: e.message })),
      api(`/api/clients/${clientId}/location-pages`).catch(e => ({ error: e.message })),
      api(`/api/clients/${clientId}/wp/log?limit=200`).catch(() => ({ log: [] })),
    ]);
    const entries = Array.isArray(log) ? log : (log && (log.log || log.entries)) || [];
    const pushed = new Set(entries.filter(e => e.result === 'pushed' && e.recordId).map(e => e.recordId));
    const views = { category: cat, service: svc, location: loc };
    const rows = [];
    // Homepage: from its record
    const hp = summary.row.page_types && summary.row.page_types.homepage;
    if (hp && hp.total || (home && home.record)) {
      const r = home && home.record, m = r && r.meta || {}, V = r && r.VALIDATION || {};
      const claims = r && r.CLAIMS && r.CLAIMS.findings ? r.CLAIMS.findings.length - (r.CLAIMS.accepted || []).length : 0;
      const hsum = (summary.row.page_list || []).find(x => x.type === 'homepage') || {};
      rows.push(pageRow({ type: 'homepage', key: 'homepage', title: 'Homepage', h1: r && r.home_hero_h1 || '', record: r ? { id: home.id || home.recordId, at: m.edited_at || m.generated_at, error: r.error, blocked: !!r.blocked, block: V.block, flag: V.flag, claims, good: V.status === 'run' && V.block === 0 && !r.blocked && !r.error, score: r.QUALITY ? r.QUALITY.score : null, approved: !!m.approved_at, cost_pence: hsum.cost_pence ?? null } : null, running: summary.running.some(x => x.client_id === clientId && x.kind === 'homepage'), ready: true, pushed }));
    }
    for (const [t, v] of Object.entries(views)) {
      if (v.error && !v.pages) continue;
      for (const p of v.pages || []) {
        const st = v.run && v.run.pages ? v.run.pages.find(x => x.key === p.key) : null;
        const sum = (summary.row.page_list || []).find(x => x.type === t && x.key === p.key) || {};
        const rec = p.record ? { ...p.record, score: sum.score ?? null, cost_pence: sum.cost_pence ?? null } : null;
        rows.push(pageRow({ type: t, key: p.key, title: p.title, h1: p.h1, scope: p.scope, town: p.town, record: rec, running: !!(v.running && v.running.current === p.key), queued: !!(v.running && st && st.status === 'pending'), skipped: st && st.status === 'skipped' ? st.error : null, ready: t === 'service' ? p.parent_written !== false : t === 'location' ? p.ready !== false && !p.admin_area : true, waitingOn: t === 'service' ? (p.parent_written === false ? `category page ${p.parent_key || ''} not written yet` : '') : t === 'location' ? (p.admin_area ? 'council area: not written' : (p.waiting_on || []).join(', ')) : '', pushed }));
      }
    }
    data = { summary, views, rows, home };
    draw();
    clearTimeout(timer);
    if (rows.some(r => r.status === 'running' || r.status === 'queued')) timer = setTimeout(load, 8000);
  };

  function pageRow(p) {
    const r = p.record;
    let st = 'not started';
    if (p.running) st = 'running';
    else if (p.queued) st = 'queued';
    else if (r && r.error) st = 'failed';
    else if (r && (r.blocked || r.block > 0)) st = 'blocked';
    else if (r && p.pushed.has(r.id)) st = 'pushed';
    else if (r && r.approved) st = 'approved';
    else if (r && r.claims > 0) st = 'waiting on a person';
    else if (r && r.good) st = 'written';
    else if (r) st = 'blocked';
    else if (p.skipped) st = 'skipped';
    else if (!p.ready) st = 'waiting';
    const detail = st === 'failed' ? r.error : st === 'blocked' ? (r.blocked ? 'blocked by a gate: a decision could not be made' : `${r.block} BLOCK to fix`) : st === 'waiting on a person' ? `${r.claims} claim${r.claims === 1 ? '' : 's'} to accept` : st === 'skipped' ? p.skipped : st === 'waiting' ? p.waitingOn : st === 'written' && r.flag ? `${r.flag} FLAG to read` : '';
    return { ...p, status: st, detail, score: r ? r.score : null, cost: r ? r.cost_pence : null, claims: r ? r.claims : 0, at: r ? r.at : null, href: r ? `/clients/${clientId}/pages/${p.type}/${encodeURIComponent(p.key)}` : '' };
  }

  // The blog queue (stage 3, 28 Oct): the Blog filter shows the reserved topics dated by the
  // schedule, each with its decisions (gates, flags, H1 and title lengths, links, switches,
  // specificity, publish date), the question to approve or edit, and the build button
  // Stage 4: each row's record status (from the queue view's record summary), Write and Write
  // again per post, Write all / the rest through /blog-pages/run; a written post opens the Page view
  let blog = null, blogLoading = false, blogRun = null, blogTimer = null, blogJobLog = null;
  const loadBlog = async () => {
    blogLoading = true;
    try { [blog, blogRun, blogJobLog] = await Promise.all([api(`/api/clients/${clientId}/blog/queue`), api(`/api/clients/${clientId}/blog-pages`).catch(() => null), api(`/api/clients/${clientId}/blog/daily-log`).then(r => r.log || []).catch(() => null)]); } catch (e) { blog = { error: e.message, rows: [], counts: {} }; }
    blogLoading = false;
    clearTimeout(blogTimer);
    if (blogRun && blogRun.running) blogTimer = setTimeout(loadBlog, 8000);
    if (filter === 'blog') draw();
  };
  const blogStatus = r => {
    const rec = r.record, cur = blogRun && blogRun.running && blogRun.running.current === r.slug;
    let st = 'not started';
    if (r.status === 'Held') st = 'held';
    else if (cur) st = 'running';
    else if (rec && rec.error) st = 'failed';
    else if (rec && rec.blocked) st = 'blocked';
    else if (rec && rec.block > 0) st = 'blocked';
    else if (rec && rec.approved) st = 'approved';
    else if (rec && rec.claims > 0) st = 'waiting on a person';
    else if (rec && rec.good) st = 'written';
    else if (rec) st = 'blocked';
    else if (r.gates.length) st = 'waiting';
    const detail = st === 'failed' ? rec.error : st === 'blocked' ? (rec.blocked ? 'blocked by a gate when it ran' : `${rec.block} BLOCK to fix`) : st === 'waiting on a person' ? `${rec.claims} claim${rec.claims === 1 ? '' : 's'} to accept` : st === 'waiting' ? 'gated: the post waits' : st === 'held' ? 'held by the queue: the Search Console batch picks it up' : st === 'written' && rec.flag ? (rec.flags_reviewed ? `${rec.flag} FLAG, read` : `${rec.flag} FLAG to read`) : st === 'approved' && rec.cost_pence != null ? `£${(rec.cost_pence / 100).toFixed(2)}` : '';
    return { st, detail };
  };
  const drawBlogQueue = () => {
    const box = el.querySelector('#blogQueue'); if (!box) return;
    if (!blog) { box.innerHTML = '<section class="card"><div class="muted small">Loading the queue…</div></section>'; if (!blogLoading) loadBlog(); return; }
    if (blog.error) { box.innerHTML = `<section class="card"><div class="state failed"><h3>The blog queue could not load</h3><p>${h(blog.error)}</p></div><div class="btn-row"><button class="btn btn-primary btn-sm" data-blog="build">Build the queue</button></div></section>`; return; }
    const B = blog, c = B.counts || {};
    const gateLine = r => r.gates.length ? r.gates.map(g => `<span class="pill block" title="${attr(g.msg)}">${h(g.code)}</span>`).join(' ') : '<span class="pill ok">ready</span>';
    const flagLine = r => r.flags.map(f => `<span class="pill wait" title="${attr(f.msg)}">${h(f.code)}</span>`).join(' ');
    const sw = r => r.switches ? `table ${r.switches.table ? `on (${h(r.switches.table_type)})` : 'off'} · business ${r.switches.business ? 'on' : 'off'} · safety ${r.switches.safety ? 'ON' : 'off'}${r.switches.cost_mode ? ` · ${h(r.switches.cost_mode)}` : ''}` : '<span class="muted">–</span>';
    const columns = [
      { key: 'post', label: 'Post', cls: 'no-label', render: r => `<span class="primary">${h(r.h1 || r.wording)}${r.homepage_cost_guide ? ' <span class="tag ok">homepage cost guide</span>' : ''}</span><span class="sub">${h(r.slug)} · ${h(r.post_type.replace('_', ' '))} · ${h(r.source || '')}${r.town ? ` · ${h(r.town)}` : ''}${r.question_id ? ` · ${h(r.question_id)}` : ''}</span>` },
      { key: 'wording', label: 'Question', render: r => `<div style="display:flex;gap:6px;align-items:center;min-width:260px"><input class="input blog-wording" data-slug="${attr(r.slug)}" value="${attr(r.wording)}" data-orig="${attr(r.wording)}" style="flex:1;min-width:0;padding:4px 8px"><button class="btn btn-xs ${r.wording_approved ? 'btn-ghost' : 'btn-primary'}" data-blog-approve="${attr(r.slug)}" data-on="${r.wording_approved ? '0' : '1'}">${r.wording_approved ? 'Approved ✓' : 'Approve'}</button></div><span class="sub">${r.h1 ? `H1 ${r.h1_length} chars${r.h1_length > 70 ? ' <span style="color:#b91c1c">(70 at most)</span>' : ''} · title ${r.title_length} chars${r.title_length > 60 ? ' <span style="color:#b91c1c">(60 at most)</span>' : ''}` : h(r.wording_source === 'code' ? 'written by code: approve or edit it' : '')}</span>` },
      { key: 'links', label: 'Links', render: r => r.primary ? `${h(r.primary.url)} <span class="muted small">(${h(r.primary.status)})</span>${r.secondary.map(s => `<span class="sub">+ ${h(s.url)}</span>`).join('')}` : '<span class="muted">–</span>' },
      { key: 'switches', label: 'Switches', render: sw },
      { key: 'spec', label: 'Specific', num: true, render: r => r.specificity ? `<span title="${attr(`have: ${r.specificity.have.join('; ')}; missing: ${r.specificity.missing.join('; ')}`)}">${r.specificity.count} of 6</span>` : '<span class="muted">–</span>' },
      { key: 'stack', label: 'H2s · FAQ', render: r => `${r.stack} · ${r.faq}` },
      { key: 'gates', label: 'Gates', render: gateLine },
      { key: 'date', label: 'Publish', render: r => r.publish_date ? `${h(fmtDate(r.publish_date))}${r.month === 0 ? ' <span class="muted small">launch</span>' : ''}${r.slot_note ? `<span class="sub">${h(r.slot_note)}</span>` : ''}` : `<span class="muted">${r.held_for_date ? 'no launch date' : '–'}</span>` },
      { key: 'flags', label: 'Flags', render: flagLine },
      { key: 'status', label: 'Status', render: r => { const { st, detail } = blogStatus(r); return `${status(st, STATUS_KIND[st] || 'none')}${detail ? `<span class="sub">${h(detail)}</span>` : ''}${r.record && r.record.at ? `<span class="sub">${timeEl(r.record.at)}</span>` : ''}`; } },
      { key: 'write', label: '', cls: 'no-label', render: r => `<button class="btn btn-ghost btn-sm" data-blog-write="${attr(r.slug)}" ${anyBlogRunning || !r.wording_approved || r.status === 'Held' ? 'disabled' : ''} title="${attr(r.gates.length ? 'The post is gated: it runs and is recorded blocked with its gate' : '')}">${r.record ? 'Write again' : 'Write'}</button>${r.record ? `<a class="btn btn-ghost btn-sm" href="/clients/${clientId}/pages/blog/${encodeURIComponent(r.slug)}" style="margin-left:4px">Open</a>` : ''}` },
    ];
    const res = B.reservation;
    const anyBlogRunning = !!(blogRun && blogRun.running);
    const written = B.rows.filter(r => r.record), rest = B.rows.filter(r => r.wording_approved && r.status !== 'Held' && (!r.record || !r.record.good));
    box.innerHTML = `
      ${(B.problems || []).length ? `<div class="notice bad" style="margin-bottom:10px">Could not read: ${B.problems.map(h).join('; ')}</div>` : ''}
      <div class="notice" style="margin-bottom:14px;display:flex;gap:16px;flex-wrap:wrap;align-items:center"><span><strong>${plural(c.rows || 0, 'post')}</strong> in the queue</span><span>${c.ready || 0} ready</span><span>${c.gated || 0} gated</span>${c.held ? `<span>${c.held} held</span>` : ''}<span>${c.to_approve || 0} questions to approve</span><span>${c.dated || 0} dated${B.settings && B.settings.launch_date ? ` from ${h(fmtDate(B.settings.launch_date))}` : ' (no launch date on the Record tab)'}</span>${res ? `<span class="muted">reserved: ${res.counts.topics} topics, ${res.counts.from_bank || 0} from the bank</span>` : ''}</div>
      ${[...(B.schedule_flags || []), ...((res && res.flags) || [])].map(f => `<div class="small" style="color:#b45309;margin-bottom:4px">${h(f.code)}: ${h(f.msg)}</div>`).join('')}
      <section class="card card-flat" style="margin-bottom:14px"><div class="tbl-tools"><span class="muted small"><strong>Daily job</strong>: once a day, with no person: a churned client's scheduled posts back to draft; a scheduled post stating a changed price written again (F-PRICE-CHANGED, back to review); a post due within two days whose primary page is not Live, or not approved, moved back seven days (F-HELD); a post still scheduled on its date published; a cost guide's URL stored for the GBP batch and its pages marked backfill pending. ${blogJobLog && blogJobLog.length ? `Last action ${h(fmtDate(blogJobLog[0].at, true))}.` : 'No actions yet.'}</span><span style="flex:1"></span><button class="btn btn-ghost btn-sm" data-blog="daily-dry">What would it do today?</button><button class="btn btn-ghost btn-sm" data-blog="daily-run">Run the daily job now</button></div>
        ${blogJobLog && blogJobLog.length ? `<div class="small" style="max-height:180px;overflow:auto">${blogJobLog.slice(0, 40).map(l => `<div style="padding:3px 0;border-top:1px solid var(--border)"><span class="muted">${h(fmtDate(l.at, true))}</span> <strong>${h(l.action)}</strong> ${l.slug ? `<code>${h(l.slug)}</code> ` : ''}${h(l.why || '')}${l.to ? ` → ${h(l.to)}` : ''}${l.url ? ` <a href="${attr(l.url)}" target="_blank" rel="noopener">${h(l.url)}</a>` : ''}</div>`).join('')}</div>` : ''}
        <div id="blogDailyOut" class="small" style="margin-top:6px"></div>
      </section>
      <section class="card card-flat">
        <div class="tbl-tools"><span class="muted small">The topics reserved on the Research tab, dated by the schedule (3 at launch, then 2, 4, 3, 2, 1, 1 a month). Edit a question and Approve to clear G-TOPIC; the rest of the decisions are code's.${anyBlogRunning ? ` <strong>Writing ${h(blogRun.running.current || '…')}</strong>` : ''}</span><span class="spacer"></span>
          <button class="btn btn-ghost btn-sm" data-blog="approve-batch" ${written.some(r => r.record.good && !r.record.approved) ? '' : 'disabled'} title="Approves every written post with no BLOCK whose FLAGs are read (or none), every claim accepted; a held or blocked post is left">Approve all without BLOCK or unreviewed FLAG</button>
          <button class="btn btn-primary btn-sm" data-blog="resume" ${anyBlogRunning || !rest.length ? 'disabled' : ''}>${written.length ? `Write the rest (${rest.length})` : 'Write all posts'}</button>
          <button class="btn btn-ghost btn-sm" data-blog="all" ${anyBlogRunning || !B.rows.length ? 'disabled' : ''}>Write all again</button>
          <button class="btn btn-ghost btn-sm" data-blog="build">${B.rows.length ? 'Rebuild the queue' : 'Build the queue'}</button></div>
        ${table({ columns, rows: B.rows, cards: true, emptyText: 'No posts in the queue yet. Build it from the reserved topics.' })}
      </section>`;
  };
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-blog]');
    if (b && b.dataset.blog === 'build') { e.stopPropagation(); await busy(b, 'Building…', async () => { try { blog = await api(`/api/clients/${clientId}/blog/queue/build`, { method: 'POST' }); toast(`Queue built: ${blog.counts.rows} posts`); draw(); } catch (err) { toast(err.message, 'bad'); } }); return; }
    if (b && (b.dataset.blog === 'daily-run' || b.dataset.blog === 'daily-dry')) {
      e.stopPropagation();
      const dry = b.dataset.blog === 'daily-dry';
      if (!dry && !(await confirm({ title: 'Run the daily job now?', text: 'Scheduled posts due today are published on the site; posts whose primary page is not Live or whose record is not approved are moved back seven days; a changed price has its post written again. Every action is logged.', ok: 'Run' }))) return;
      await busy(b, dry ? 'Checking…' : 'Running…', async () => {
        try { const r = await api(`/api/clients/${clientId}/blog/daily-run`, { method: 'POST', body: { dryRun: dry } }); const out = box.querySelector('#blogDailyOut'); if (out) out.innerHTML = `<div class="notice small">${dry ? 'Today the job would do' : 'The job did'} ${r.actions.length} thing${r.actions.length === 1 ? '' : 's'}${r.site ? '' : ' (no WordPress site connected)'}${r.note ? `: ${h(r.note)}` : ''}</div>${r.actions.map(a => `<div style="padding:3px 0"><strong>${h(a.action)}</strong> ${a.slug ? `<code>${h(a.slug)}</code> ` : ''}${h(a.why || '')}${a.to ? ` → ${h(a.to)}` : ''}</div>`).join('')}`; if (!dry) { toast(`Daily job: ${r.actions.length} action(s)`); loadBlog(); } } catch (err) { toast(err.message, 'bad'); }
      });
      return;
    }
    if (b && b.dataset.blog === 'approve-batch') {
      e.stopPropagation();
      try { const r = await api(`/api/clients/${clientId}/blog/approve-batch`, { method: 'POST', body: { by: ctx.userName ? ctx.userName() : '' } }); toast(`${r.approved.length} approved${r.already ? `, ${r.already} already` : ''}${r.skipped.length ? `; ${r.skipped.length} left: ${r.skipped.map(s => s.why).slice(0, 3).join('; ')}` : ''}`, r.approved.length ? '' : 'bad'); loadBlog(); } catch (err) { toast(err.message, 'bad'); }
      return;
    }
    if (b && (b.dataset.blog === 'resume' || b.dataset.blog === 'all')) {
      e.stopPropagation();
      const resume = b.dataset.blog === 'resume';
      if (!resume && !(await confirm({ title: 'Write every post again?', text: 'Existing records are kept as earlier versions. The posts run in queue order; a gated post is recorded blocked with its gate.', ok: 'Write all again' }))) return;
      try { await api(`/api/clients/${clientId}/blog-pages/run`, { method: 'POST', body: { resume, quality } }); toast(resume ? 'Writing the posts that are missing' : 'Writing every post again'); setTimeout(loadBlog, 1200); } catch (err) { toast(err.message, 'bad'); }
      return;
    }
    const bw = e.target.closest('[data-blog-write]');
    if (bw) {
      e.stopPropagation();
      const key = bw.dataset.blogWrite;
      try { await api(`/api/clients/${clientId}/blog-pages/run`, { method: 'POST', body: { resume: false, keys: [key], quality } }); toast(`Writing ${key}`); setTimeout(loadBlog, 1200); } catch (err) { toast(err.message, 'bad'); }
      return;
    }
    const a = e.target.closest('[data-blog-approve]');
    if (a) {
      e.stopPropagation();
      const slug = a.dataset.blogApprove;
      const input = el.querySelector(`.blog-wording[data-slug="${CSS.escape(slug)}"]`);
      const wording = input ? input.value : undefined;
      const on = a.dataset.on === '1';
      try { blog = await api(`/api/clients/${clientId}/blog/queue/${encodeURIComponent(slug.replace(/^\//, ''))}`, { method: 'PUT', body: { wording, approved: on } }); toast(on ? 'Question approved' : 'Approval removed'); draw(); } catch (err) { toast(err.message, 'bad'); }
    }
  });

  const draw = () => {
    const { rows, views } = data;
    const list = filter === 'all' ? rows : rows.filter(r => r.type === filter);
    const counts = Object.fromEntries(TYPES.map(([t]) => [t, t === 'blog' ? (blog && blog.counts ? blog.counts.rows || 0 : 0) : rows.filter(r => r.type === t).length]));
    if (filter === 'blog') {
      el.innerHTML = `<section class="card card-flat" style="margin-bottom:14px"><div class="tbl-tools"><div class="chips">${[['all', 'All'], ...TYPES].map(([k, l]) => `<button class="chip${filter === k ? ' active' : ''}" data-filter="${k}">${l}${k === 'all' ? ` <span class="muted">${rows.length}</span>` : ` <span class="muted">${counts[k]}</span>`}</button>`).join('')}</div></div></section><div id="blogQueue"></div><div id="siteCard" style="margin-top:16px"></div>`;
      drawBlogQueue(); drawSite(); return;
    }
    const runningRows = rows.filter(r => r.status === 'running');
    const anyRunning = runningRows.length > 0 || Object.values(views).some(v => v.running);
    // One notice per distinct readiness problem (the three page types often share one)
    const problems = new Map();
    for (const [t, v] of Object.entries(views)) if (v.readiness && v.readiness.ok === false) { const msg = v.readiness.error || 'not ready'; if (!problems.has(msg)) problems.set(msg, []); problems.get(msg).push(t); }
    const readiness = [...problems].map(([msg, ts]) => `<div class="notice bad" style="margin-bottom:10px"><strong>${h(ts.join(', '))} pages:</strong> ${h(msg)}</div>`).join('');
    const columns = [
      { key: 'title', label: 'Page', cls: 'no-label', render: r => `<span class="primary">${h(r.title)}</span><span class="sub">${h(r.h1 || r.key)}${r.town ? ` · ${h(r.town)}` : ''}</span>` },
      { key: 'type', label: 'Type', render: r => `${h((TYPES.find(t => t[0] === r.type) || [r.type, r.type])[1])}${r.scope === 'town' ? ' <span class="muted small">(town)</span>' : ''}` },
      { key: 'status', label: 'Status', render: r => `${status(STATUS_KIND[r.status] || 'none', r.status)}${r.detail ? `<span class="sub">${h(r.detail)}</span>` : ''}` },
      { key: 'score', label: 'Quality', num: true, render: r => score(r.score) },
      { key: 'cost', label: 'Cost', num: true, render: r => r.cost === null || r.cost === undefined ? '<span class="muted">–</span>' : `£${(r.cost / 100).toFixed(2)}` },
      { key: 'claims', label: 'Claims', num: true, render: r => r.claims ? `<span class="pill wait">${r.claims}</span>` : '<span class="muted">0</span>' },
      { key: 'at', label: 'Last run', render: r => timeEl(r.at) },
      { key: 'act', label: '', cls: 'right no-label', render: r => r.type === 'homepage'
        ? `<button class="btn btn-ghost btn-sm" data-write="homepage" data-key="homepage" ${anyRunning ? 'disabled' : ''}>${r.record ? 'Write again' : 'Write'}</button>`
        : `<button class="btn btn-ghost btn-sm" data-write="${h(r.type)}" data-key="${attr(r.key)}" ${anyRunning || !r.ready || (views[r.type].readiness && views[r.type].readiness.ok === false) ? 'disabled' : ''}>${r.record ? 'Write again' : 'Write'}</button>` },
    ];
    const runLine = runningRows.length ? runningRows.map(r => { const v = views[r.type]; const list = v && v.run && v.run.pages || []; const done = list.filter(p => ['done', 'kept', 'blocked', 'failed', 'skipped'].includes(p.status)).length; const nxt = list.find(p => p.status === 'pending'); return running({ now: `Writing ${r.title}`, next: nxt ? `Next: ${nxt.title}` : 'Then the run finishes and this table refreshes', done: list.length ? done : null, total: list.length || null }); }).join('') : (anyRunning ? running({ now: 'A run is starting', next: 'The first page appears here in a moment' }) : '');
    const cost = data.summary.row.cost || {};
    const typeLine = TYPES.filter(([t]) => t !== 'blog').map(([t, l]) => `${counts[t]} ${l.toLowerCase()}`).join(', ');
    const summaryLine = rows.length ? `<div class="notice" style="margin-bottom:14px;display:flex;gap:16px;flex-wrap:wrap;align-items:center"><span><strong>${plural(rows.length, 'page')}</strong>: ${h(typeLine)}</span><span>${rows.filter(r => r.record).length} written</span><span>spent <strong>£${((cost.spent_pence || 0) / 100).toFixed(2)}</strong>${cost.logged !== undefined && cost.logged < rows.filter(r => r.record).length ? ` <span class="muted">(${cost.logged} of ${rows.filter(r => r.record).length} written pages have a cost on record)</span>` : ''}</span><span>estimated <strong>£${((cost.estimate_pence || 0) / 100).toFixed(2)}</strong> to write the rest <span class="muted">(each type at its average here, else about 60p a page)</span></span></div>` : '';
    el.innerHTML = `
      ${readiness}
      ${summaryLine}
      ${runLine ? `<div style="margin-bottom:14px">${runLine}</div>` : ''}
      <section class="card card-flat">
        <div class="tbl-tools">
          <div class="chips">${[['all', 'All'], ...TYPES].map(([k, l]) => `<button class="chip${filter === k ? ' active' : ''}" data-filter="${k}">${l}${k === 'all' ? ` <span class="muted">${rows.length}</span>` : ` <span class="muted">${counts[k]}</span>`}</button>`).join('')}</div>
          <span class="spacer"></span>
          <label class="check small" title="The rubric review after each page: slower, about 50p a page more"><input type="checkbox" id="quality"${quality ? ' checked' : ''}> rubric review</label>
          <button class="btn btn-primary btn-sm" data-run="resume" ${anyRunning || !rows.length ? 'disabled' : ''}>${rows.some(r => r.record) ? `Write the rest (${rows.filter(r => !r.record || r.status === 'failed' || r.status === 'blocked').length})` : 'Write all'}</button>
          <button class="btn btn-ghost btn-sm" data-run="all" ${anyRunning || !rows.length ? 'disabled' : ''}>Write all again</button>
        </div>
        ${table({ columns, rows: list, rowHref: r => r.href || null, cards: true, emptyText: rows.length ? 'No pages of this type.' : 'No pages in the page map yet. Generate the page map first.' })}
        <div class="tbl-foot">${h(plural(list.length, 'page'))} · ${list.filter(r => r.status === 'written' || r.status === 'approved' || r.status === 'pushed').length} written clean · ${list.filter(r => r.status === 'blocked' || r.status === 'failed').length} blocked or failed · ${list.reduce((n, r) => n + r.claims, 0)} claims to accept</div>
      </section>
      <div id="siteCard" style="margin-top:16px"></div>`;
    el.querySelector('#quality').addEventListener('change', e => { quality = e.target.checked; });
    drawSite();
  };

  // The WordPress site the pages push to, and the v20 switches (the old client settings page)
  let site = null;
  const drawSite = async () => {
    const box = el.querySelector('#siteCard'); if (!box) return;
    if (!site) { try { const [conn, v20] = await Promise.all([api(`/api/clients/${clientId}/wp/connection`).catch(() => null), api(`/api/clients/${clientId}/v20-settings`).catch(() => ({}))]); site = { conn, v20 }; } catch (_) { site = { conn: null, v20: {} }; } }
    const c = site.conn, v = site.v20 || {};
    box.innerHTML = card({ title: 'WordPress site', sub: c ? `Saved ${h(fmtDate(c.updatedAt, true))}${c.staging ? ' · staging' : ''}` : 'No site connected yet: the Page view\'s Push stays off until there is one', body: `
      <div class="grid grid-2">
        <div><div class="field"><label>Site URL</label><input class="input" id="wpUrl" value="${attr(c ? c.url : '')}" placeholder="https://client-site.co.uk"></div>
        <div class="field"><label>WordPress user</label><input class="input" id="wpUser" value="${attr(c ? c.user : '')}" autocomplete="off"></div>
        <div class="field"><label>Application password</label><input class="input" id="wpPassword" type="password" autocomplete="new-password" placeholder="${c && c.hasPassword ? 'Stored (leave blank to keep)' : 'xxxx xxxx xxxx xxxx xxxx xxxx'}"></div></div>
        <div><div class="field"><label>SEO plugin</label><select class="input" id="wpSeo"><option value="rankmath"${!c || c.seo === 'rankmath' ? ' selected' : ''}>Rank Math</option><option value="yoast"${c && c.seo === 'yoast' ? ' selected' : ''}>Yoast</option></select></div>
        <div class="field"><label>Homepage slug (optional)</label><input class="input" id="wpSlug" value="${attr(c ? c.homepageSlug || '' : '')}" placeholder="Leave blank to use the site's front page"></div>
        <label class="check" style="margin-bottom:10px"><input type="checkbox" id="wpStaging"${c && c.staging ? ' checked' : ''}> This is a staging site</label><br>
        <label class="check" style="margin-bottom:6px"><input type="checkbox" id="useV20"${v.use_v20_homepage ? ' checked' : ''}> v20 homepage path (CORE 20)</label><br>
        <label class="check"><input type="checkbox" id="testMode"${v.v20_test_mode ? ' checked' : ''}> Test mode (stand-ins allowed)</label></div>
      </div>
      <div class="btn-row"><button class="btn btn-primary btn-sm" data-site="save">Save</button><button class="btn btn-ghost btn-sm" data-site="test" ${c ? '' : 'disabled'}>Test connection</button><span class="small muted" id="siteStatus"></span></div>` });
  };
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-site]'); if (!b) return;
    const status = m => { const s = el.querySelector('#siteStatus'); if (s) s.textContent = m; };
    try {
      if (b.dataset.site === 'save') {
        await busy(b, 'Saving…', async () => {
          const conn = await api(`/api/clients/${clientId}/wp/connection`, { method: 'PUT', body: { url: el.querySelector('#wpUrl').value, user: el.querySelector('#wpUser').value, appPassword: el.querySelector('#wpPassword').value, seo: el.querySelector('#wpSeo').value, homepageSlug: el.querySelector('#wpSlug').value, staging: el.querySelector('#wpStaging').checked } });
          const v20 = await api(`/api/clients/${clientId}/v20-settings`, { method: 'PUT', body: { use_v20_homepage: el.querySelector('#useV20').checked, v20_test_mode: el.querySelector('#testMode').checked } });
          site = { conn, v20 }; toast('Saved'); drawSite();
        });
      }
      if (b.dataset.site === 'test') await busy(b, 'Testing…', async () => { const t = await api(`/api/clients/${clientId}/wp/test`, { method: 'POST' }); const s = t.status || {}; status(s.error ? `Can't reach the plugin: ${s.error}` : `Connected${t.staging ? ' (staging)' : ''}: plugin ${s.plugin}, ACF Pro ${s.acf_pro ? 'yes' : 'NO'}, SEO ${s.seo}, ${(s.field_groups || []).length} field groups`); });
    } catch (err) { toast(err.message, 'bad'); }
  });

  el.addEventListener('click', async e => {
    const f = e.target.closest('[data-filter]'); if (f) { filter = f.dataset.filter; draw(); return; }
    const w = e.target.closest('[data-write]');
    if (w) {
      e.stopPropagation();
      const type = w.dataset.write, key = w.dataset.key;
      try {
        if (type === 'homepage') { w.disabled = true; w.textContent = 'Writing…'; api(`/api/clients/${clientId}/v20/homepage/generate`, { method: 'POST', body: {} }).then(() => load()).catch(err => { toast(err.message, 'bad'); load(); }); toast('Writing the homepage: a minute or two'); setTimeout(load, 1500); return; }
        await api(`/api/clients/${clientId}/${type}-pages/run`, { method: 'POST', body: { resume: false, keys: [key], quality } });
        toast(`Writing ${key}`); load();
      } catch (err) { toast(err.message, 'bad'); }
      return;
    }
    const r = e.target.closest('[data-run]');
    if (r) {
      const resume = r.dataset.run === 'resume';
      if (!resume && !(await confirm({ title: 'Write every page again?', text: 'Existing records are kept as earlier versions. Category pages run first, then service, then location.', ok: 'Write all again' }))) return;
      const order = ['category', 'service', 'location'];
      const todo = order.filter(t => (data.views[t].pages || []).length && !(data.views[t].readiness && data.views[t].readiness.ok === false));
      const hp = data.rows.find(x => x.type === 'homepage');
      try {
        if (hp && (!resume || !hp.record)) { api(`/api/clients/${clientId}/v20/homepage/generate`, { method: 'POST', body: {} }).catch(() => {}); }
        // The runs go one after another in the background: category first, service once it finishes, then location
        (async () => {
          for (const t of todo) {
            await api(`/api/clients/${clientId}/${t}-pages/run`, { method: 'POST', body: { resume, quality } }).catch(err => toast(`${t} pages: ${err.message}`, 'bad'));
            await waitForRun(t);
          }
          load();
        })();
        toast(resume ? 'Writing the pages that are missing' : 'Writing every page again'); setTimeout(load, 1200);
      } catch (err) { toast(err.message, 'bad'); }
    }
  });
  const waitForRun = async t => { for (let i = 0; i < 720; i++) { await new Promise(r => setTimeout(r, 10000)); const v = await api(`/api/clients/${clientId}/${t}-pages`).catch(() => null); if (!v || !v.running) return; } };

  await load();
  return () => { clearTimeout(timer); clearTimeout(blogTimer); };
}
