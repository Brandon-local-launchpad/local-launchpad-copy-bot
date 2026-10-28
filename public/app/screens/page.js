// The Page view (27 Oct 2026): two columns. Left, the page as the reader view with each
// model field editable in place (click, edit, save: a new version is saved, the validator
// and the claims review run as today, and the field's own result shows inline). Right, the
// review notes: validation (blocks, flags), claims to accept with Accept / Not accepted, the
// quality score with its failed items, the decision flags, and the WordPress push (dry run,
// push, log, rollback). Top bar: name, type, status, Approve, Regenerate, Push, previous
// and next page.

import { h, attr, api, card, status, pill, timeEl, fmtDate, score, toast, confirm, markdownToHtml, busy, info, tag, empty } from '../ui.js';

const LABEL = { homepage: 'Homepage', category: 'Category page', service: 'Service page', location: 'Location page', blog: 'Blog post' };

export async function render(root, params, ctx) {
  const { clientId, type, key } = params;
  const base = `/api/clients/${clientId}/v20/pages/${encodeURIComponent(type)}/${encodeURIComponent(key)}`;
  const wp = p => `/api/clients/${clientId}/wp/${p}`;
  const S = { record: null, recordId: null, history: [], fields: [], issues: [], dry: null, conn: null, md: '', editing: null, order: [] };
  const [client, conn, summary] = await Promise.all([api(`/api/clients/${clientId}`), api(wp('connection')).catch(() => null), api(`/api/clients/${clientId}/summary`).catch(() => null)]);
  S.conn = conn;
  S.order = summary && summary.row.page_list ? summary.row.page_list : [];
  const idx = S.order.findIndex(p => p.type === type && p.key === key);
  const prev = idx > 0 ? S.order[idx - 1] : null, next = idx >= 0 && idx < S.order.length - 1 ? S.order[idx + 1] : null;
  const href = p => `/clients/${clientId}/pages/${p.type}/${encodeURIComponent(p.key)}`;
  const title = S.order[idx] ? S.order[idx].title : type === 'homepage' ? 'Homepage' : key;
  ctx.setTitle(`${title} · ${client.name}`);

  async function loadRecord() {
    const r = await api(base);
    S.record = r.record; S.history = r.history || []; S.recordId = S.history[0] ? S.history[0].id : null; S.dry = null;
    if (S.record) {
      const [md, f] = await Promise.all([fetch(`${base}/download?format=md&id=${encodeURIComponent(S.recordId)}`).then(x => x.ok ? x.text() : ''), api(`${base}/fields?id=${encodeURIComponent(S.recordId)}`).catch(() => ({ fields: [], issues: null }))]);
      S.md = md; S.fields = f.fields || []; S.freshRun = !!f.issues; S.issues = f.issues || (S.record.VALIDATION && S.record.VALIDATION.issues) || []; S.issuesError = f.issuesError || null;
    }
    draw();
  }

  const accepted = () => new Set(((S.record && S.record.CLAIMS && S.record.CLAIMS.accepted) || []).map(a => a.quote));
  const pageStatus = () => {
    const r = S.record; if (!r) return ['none', 'not written'];
    const V = r.VALIDATION || {}, m = r.meta || {};
    const claims = r.CLAIMS && r.CLAIMS.findings ? r.CLAIMS.findings.length - accepted().size : 0;
    if (r.error) return ['block', 'failed']; if (r.blocked || V.block > 0) return ['block', 'blocked'];
    if (S.pushedAt) return ['ok', 'pushed']; if (m.approved_at) return ['ok', 'approved'];
    if (claims > 0) return ['wait', 'waiting on a person']; return ['ok', 'written'];
  };

  // Left: the reader view with the fields marked up
  const norm = s => String(s || '').replace(/\[CV: [a-z0-9_]+\]/g, ' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase();
  function readerHtml() {
    const wrap = document.createElement('div'); wrap.innerHTML = markdownToHtml(S.md);
    const blocks = [...wrap.querySelectorAll('p, li, h1, h2, h3, h4, h5')];
    const used = new Set();
    for (const f of S.fields) {
      const want = norm(f.text); if (!want) continue;
      const words = want.split(' ');
      const probe = words.slice(0, Math.min(8, words.length)).join(' ');
      let best = null;
      for (const b of blocks) { if (used.has(b)) continue; const t = norm(b.textContent); if (t === want || (probe.length > 12 && t.includes(probe)) || (t.length > 20 && want.includes(t))) { best = b; break; } }
      if (best) { used.add(best); best.classList.add('ed'); best.dataset.field = f.field; best.title = 'Click to edit'; f.matched = true; }
    }
    return wrap.innerHTML;
  }
  const fieldIssues = field => S.issues.filter(x => x.field === field);
  const fieldClaims = field => ((S.record.CLAIMS && S.record.CLAIMS.findings) || []).filter(x => x.field === field);
  const issueLine = x => `<span class="${x.type === 'BLOCK' ? 'pill block' : 'pill wait'}">${h(x.type)} ${h(x.check)}</span> ${h(x.message)}`;

  function draw() {
    const r = S.record;
    const [kind, label] = pageStatus();
    const m = r && r.meta || {};
    const V = r && r.VALIDATION || {};
    const C = r && r.CLAIMS;
    const Q = r && r.QUALITY;
    const approved = !!m.approved_at;
    const fieldMapOk = !!(S.conn && S.conn.url);
    const canPush = approved && fieldMapOk && S.dry && S.dry.refusals.filter(x => !/tick "reviewed"/.test(x)).length === 0 && (!C || !C.findings || accepted().size === C.findings.length);
    root.innerHTML = `
      <div class="crumbs"><a href="/clients" data-link>Clients</a> / <a href="/clients/${clientId}/pages" data-link>${h(client.name)}</a> / ${h(title)}</div>
      <div class="ph">
        <div class="ph-title"><h1>${h(title)}</h1><div class="ph-meta"><span>${h(LABEL[type] || type)}</span>${status(kind, label)}${r ? `<span>${m.edited_at ? `edited by hand ${h(fmtDate(m.edited_at, true))}` : `generated ${h(fmtDate(m.generated_at, true))}`} · ${S.history.length} version${S.history.length === 1 ? '' : 's'}</span>` : ''}${approved ? `<span class="pill ok">approved ${h(fmtDate(m.approved_at))}${m.approved_by ? ` by ${h(m.approved_by)}` : ''}</span>` : ''}${r && r.watermark ? `<span class="pill wait">${h(r.watermark)}</span>` : ''}</div></div>
        <div class="ph-actions">
          ${prev ? `<a class="btn btn-ghost btn-sm" href="${href(prev)}" data-link title="${attr(prev.title)}">‹ Previous</a>` : ''}${next ? `<a class="btn btn-ghost btn-sm" href="${href(next)}" data-link title="${attr(next.title)}">Next ›</a>` : ''}
          ${r ? `<a class="btn btn-ghost btn-sm" href="${base}/download?format=md&id=${encodeURIComponent(S.recordId)}">.md</a><a class="btn btn-ghost btn-sm" href="${base}/download?format=json&id=${encodeURIComponent(S.recordId)}">.json</a>` : ''}
          <button class="btn btn-ghost" data-act="regenerate">Regenerate</button>
          ${r ? `<button class="btn ${approved ? 'btn-ghost' : 'btn-primary'}" data-act="approve" ${V.block > 0 || r.blocked ? 'disabled title="Fix the blocks first"' : !approved && C && C.findings && accepted().size < C.findings.length ? `disabled title="${C.findings.length - accepted().size} claim${C.findings.length - accepted().size === 1 ? '' : 's'} still to accept"` : ''}>${approved ? 'Unapprove' : 'Approve'}</button>` : ''}
          <button class="btn btn-primary" data-act="push" ${canPush ? '' : 'disabled'} title="${attr(!approved ? 'Approve the page first' : !fieldMapOk ? 'No WordPress site connected: set it up on the client settings' : !S.dry ? 'Run the dry run first' : 'Push to WordPress')}">Push</button>
        </div>
      </div>
      ${!r ? `<div class="card">${empty({ title: 'Not written yet', text: 'Write it from the Pages tab, or Regenerate here.', action: '<button class="btn btn-primary" data-act="regenerate">Write this page</button>' })}</div>` : `
      <div class="two-col">
        <section class="card">
          <div class="muted small" style="margin-bottom:12px">Click a highlighted passage to edit it. Headings, FAQ questions, card names, buttons and links are set by code: change the client values and regenerate for those. Saving makes a new version and re-checks the whole page.</div>
          <div class="copy" id="reader">${readerHtml()}</div>
          ${S.fields.some(f => !f.matched) ? `<hr class="sep"><div class="sec-title">Other editable fields</div>${S.fields.filter(f => !f.matched).map(f => `<div class="field"><div class="lbl">${h(f.field)}</div><div class="copy"><p class="ed" data-field="${attr(f.field)}" title="Click to edit">${h(f.text)}</p></div></div>`).join('')}` : ''}
        </section>
        <aside class="side stack">
          ${card({ title: S.issuesError || !S.freshRun ? 'Validation' : 'Validation, against today\'s rules', sub: V.status === 'run' ? (S.issuesError ? `stored result at generation: ${V.block} BLOCK · ${V.flag} FLAG (today's check could not run: ${h(S.issuesError)})` : `today: ${S.issues.filter(x => x.type === 'BLOCK').length} BLOCK · ${S.issues.filter(x => x.type === 'FLAG').length} FLAG · at generation: ${V.block} BLOCK · ${V.flag} FLAG${S.issues.filter(x => x.type === 'BLOCK').length !== V.block || S.issues.filter(x => x.type === 'FLAG').length !== V.flag ? ' (the rules have changed since)' : ''}`) : 'not run', body: S.issues.length ? `<ul class="list">${[...S.issues].sort((a, b) => (a.type === 'BLOCK' ? 0 : 1) - (b.type === 'BLOCK' ? 0 : 1)).map(x => `<li><div>${issueLine(x)}<div class="muted small">${h(x.field)}</div></div></li>`).join('')}</ul>` : '<div class="muted">No issues.</div>' })}
          ${card({ title: 'Claims to accept', sub: !C ? 'no claims review on this version yet' : C.status === 'failed' ? `the review failed: ${h(C.error || '')}` : !C.findings.length ? 'clear' : `${C.findings.length - accepted().size} of ${C.findings.length} still to accept`, actions: !C || C.status === 'failed' ? '<button class="btn btn-ghost btn-sm" data-act="claims">Run the claims review</button>' : '', body: C && C.findings && C.findings.length ? C.findings.map((f, i) => { const ok = accepted().has(f.quote); return `<div class="list-row" style="padding:8px 0;border-top:1px solid var(--border)"><div><strong>${h(f.field)}</strong>: "${h(f.quote)}"${f.carried ? ' ' + tag('ok', 'accepted on the previous version') : ''}${f.note ? ' ' + tag('wait', f.note) : ''}</div><div class="muted small">${h(f.why)}</div><div class="btn-row" style="margin-top:6px"><button class="btn btn-sm ${ok ? 'btn-ghost' : 'btn-primary'}" data-claim="${i}" data-accept="${ok ? '0' : '1'}">${ok ? 'Accepted ✓' : 'Accept'}</button>${ok ? `<button class="btn btn-ghost btn-sm" data-claim="${i}" data-accept="0">Not accepted</button>` : `<button class="btn btn-ghost btn-sm" data-edit-field="${attr(f.field)}">Fix the text</button>`}</div></div>`; }).join('') : (C && C.findings && !C.findings.length ? '<div class="muted">Every statement is backed by the facts on file.</div>' : '') })}
          ${card({ title: 'Quality', sub: Q ? `reviewed ${h(fmtDate(Q.at, true))}` : 'the rubric review has not run on this version', body: Q ? `<div style="font-size:28px;font-weight:600;margin-bottom:6px">${score(Q.score)} <span class="muted small" style="font-weight:400">/ 10 · ${Q.done ? 'passes the bar' : 'below the bar (8.5 and every item)'}</span></div>${(Q.failures || []).length ? `<ul class="list">${Q.failures.map(f => `<li><div><strong>${h(f.id)}</strong> ${h(f.why || '')}</div></li>`).join('')}</ul>` : '<div class="muted small">Every rubric item passes.</div>'}${(Q.other_problems || []).length ? `<div class="sec-title">Other problems</div><ul class="list">${Q.other_problems.map(x => `<li>${h(typeof x === 'string' ? x : x.problem || JSON.stringify(x))}</li>`).join('')}</ul>` : ''}${(Q.missing_facts || []).length ? `<div class="sec-title">What the page can't say yet</div><ul class="list">${Q.missing_facts.map(x => `<li><div>${h(x.fact)}<div class="muted small">${h(x.why || '')}</div></div></li>`).join('')}</ul><a class="small" href="/clients/${clientId}/record" data-link>Fill them in on the Record tab</a>` : ''}` : '<div class="muted small">Tick "rubric review" on the Pages tab before a run to score it.</div>' })}
          ${type === 'blog' && r && V.flag > 0 ? `<section class="card card-flat" style="margin-bottom:10px"><label class="check small"><input type="checkbox" id="flagsReadTick" ${m.flags_reviewed_at ? 'checked' : ''}> I've read the ${V.flag} FLAG${V.flag === 1 ? '' : 's'} on this post (the batch approve on the Pages tab skips a post whose FLAGs are unread)${m.flags_reviewed_at ? ` <span class="muted">read ${h(fmtDate(m.flags_reviewed_at, true))}${m.flags_reviewed_by ? ' by ' + h(m.flags_reviewed_by) : ''}</span>` : ''}</label></section>` : ''}
          ${(r.FLAGS || []).length ? card({ title: 'Flags', sub: 'from the decisions and the run', body: `<ul class="list">${r.FLAGS.map(f => `<li><div>${pill('wait', f.code || 'FLAG')} ${h(f.msg || f.message || '')}</div></li>`).join('')}</ul>` }) : ''}
          ${card({ title: 'WordPress', sub: S.conn ? `${h(S.conn.url)}${S.conn.staging ? ' (staging)' : ''} · SEO ${h(S.conn.seo)}` : 'no site connected for this client', body: `
            ${type === 'blog' ? `<div class="notice small" style="margin-bottom:8px">A blog post goes to WordPress as a post in the Guides category${r && r.publish_date ? `, scheduled for ${h(fmtDate(r.publish_date))}` : ', as a draft until the client has a launch date'}. The push comes with stage 7; the dry run and Push below are the pages' and do not apply to a post yet.</div>` : ''}
            <div class="muted small" style="margin-bottom:8px">The dry run checks the page with today's rules against the site and lists every field it would change; nothing is written. Push needs the page approved, every claim accepted, and a dry run with no refusals.</div>
            <label class="check small" style="margin-bottom:8px"><input type="checkbox" id="reviewedTick"> I've read the reader view, including its FLAGs, and it's fit to push</label>
            <div class="btn-row"><button class="btn btn-ghost btn-sm" data-act="dry" ${S.conn ? '' : 'disabled'}>Dry run</button></div>
            <div id="dryResult" style="margin-top:8px"></div>
            <details style="margin-top:10px"><summary class="small muted">Push log</summary><div id="pushLog" class="small">Loading…</div></details>` })}
        </aside>
      </div>`}`;
    if (r) loadLog();
  }

  // Editing in place
  function startEdit(el, field) {
    if (S.editing) cancelEdit();
    const f = S.fields.find(x => x.field === field); if (!f) return;
    S.editing = { el, field, html: el.outerHTML };
    const ta = document.createElement('textarea'); ta.value = f.text; ta.rows = Math.min(14, Math.max(3, Math.ceil(f.text.length / 80) + 1));
    const tools = document.createElement('div'); tools.className = 'ed-tools';
    const words = () => { const n = ta.value.replace(/\[CV: [a-z0-9_]+\]/g, 'X').trim().split(/\s+/).filter(Boolean).length; const rng = f.range; const out = rng && ((rng.min && n < rng.min) || n > rng.max); return `<span class="${out ? 'pill wait' : 'muted'}">${n} words${rng ? ` (${h(rng.label || `${rng.min || 0} to ${rng.max}`)})` : ''}</span>`; };
    const notes = [...fieldIssues(field).map(issueLine), ...fieldClaims(field).map(c => `<span class="pill wait">claim</span> "${h(c.quote)}": ${h(c.why)}`)];
    tools.innerHTML = `<button class="btn btn-primary btn-sm" data-save>Save and re-check</button><button class="btn btn-ghost btn-sm" data-cancel>Cancel</button><span data-words>${words()}</span>`;
    const box = document.createElement('div'); box.className = 'ed-box'; box.appendChild(ta); box.appendChild(tools);
    if (notes.length) { const n = document.createElement('div'); n.className = 'ed-result'; n.innerHTML = notes.join('<br>'); box.appendChild(n); }
    el.replaceWith(box); S.editing.box = box; ta.focus();
    ta.addEventListener('input', () => { tools.querySelector('[data-words]').innerHTML = words(); });
    ta.addEventListener('keydown', e => { if (e.key === 'Escape') cancelEdit(); });
    tools.querySelector('[data-cancel]').addEventListener('click', cancelEdit);
    tools.querySelector('[data-save]').addEventListener('click', b => saveEdit(b.target, field, ta.value, f.text));
  }
  function cancelEdit() { if (!S.editing) return; const d = document.createElement('div'); d.innerHTML = S.editing.html; S.editing.box.replaceWith(d.firstElementChild); S.editing = null; }
  async function saveEdit(btn, field, text, orig) {
    if (text === orig) return cancelEdit();
    await busy(btn, 'Checking…', async () => {
      try {
        const hasClaims = S.record.CLAIMS && Array.isArray(S.record.CLAIMS.findings);
        const r = await api(`${base}/fields`, { method: 'PUT', body: { recordId: S.recordId, edits: [{ field, text }], accepted: hasClaims ? [...accepted()] : undefined } });
        const V = r.record.VALIDATION || {}, C = r.record.CLAIMS || {};
        const mine = (V.issues || []).filter(x => x.field === field);
        toast(`Saved as a new version: ${V.block} BLOCK, ${V.flag} FLAG${mine.length ? `; this field: ${mine.map(x => x.check).join(', ')}` : '; this field is clean'}`, V.block ? 'bad' : '');
        S.editing = null;
        await loadRecord();
        // The field's own result, inline under it
        const el = root.querySelector(`.ed[data-field="${CSS.escape(field)}"]`);
        if (el) { const res = document.createElement('div'); res.className = 'ed-result'; res.innerHTML = mine.length ? mine.map(issueLine).join('<br>') : `<span class="pill ok">clean</span> no issue on this field`; el.insertAdjacentElement('afterend', res); el.scrollIntoView({ block: 'center' }); }
      } catch (e) { toast(e.message, 'bad'); }
    });
  }

  // Dry run, push, log
  function validationNote(v) {
    if (!v || v.error) return '';
    const list = (t, items) => items.length ? `<details><summary>${h(t)} (${items.length})</summary><ul>${items.map(i => `<li>${issueLine(i)} · ${h(i.field)}</li>`).join('')}</ul></details>` : '';
    return `<div class="small" style="margin-top:6px">Validation with today's rules: <strong>${v.fresh.block} BLOCK</strong>, ${v.fresh.flag} FLAG. ${v.differs ? `<span style="color:#b45309">Differs from the stored result (${v.stored.block ?? '?'} BLOCK, ${v.stored.flag ?? '?'} FLAG).</span>` : '<span class="muted">Same as stored.</span>'}${v.factsChanged ? '<div style="color:#b45309">The client values or decisions changed since this version was written: regenerate if the page should reflect them.</div>' : ''}${list("New under today's rules", v.added || [])}${list('No longer found', v.cleared || [])}</div>`;
  }
  async function dryRun(btn) {
    const out = root.querySelector('#dryResult'); out.innerHTML = '<span class="muted small">Reading the site…</span>';
    await busy(btn, 'Reading the site…', async () => {
      try {
        const d = await api(wp('dry-run'), { method: 'POST', body: { recordId: S.recordId, reviewed: root.querySelector('#reviewedTick').checked } });
        S.dry = d;
        const changed = d.changes.filter(c => c.change !== 'same');
        const clip = s => (s && s.length > 120 ? s.slice(0, 117) + '…' : (s || '(empty)'));
        out.innerHTML = `<div class="small">Dry run on ${h(d.site)}: page ${d.page ? `${d.page.id} (${h(d.page.status)})` : 'not found'} · ${d.summary.added} added, ${d.summary.changed} changed, ${d.summary.removed} removed. Nothing was written.</div>${validationNote(d.validation)}${d.refusals.length ? `<div class="notice bad small" style="margin-top:6px">A push would be refused:<ul style="margin:4px 0 0 16px">${d.refusals.map(x => `<li>${h(x)}</li>`).join('')}</ul></div>` : '<div class="notice good small" style="margin-top:6px">The site is ready: a push is allowed once the page is approved and every claim accepted.</div>'}<details class="small"><summary>${changed.length} field change(s)</summary><table class="tbl" style="font-size:12px">${changed.map(c => `<tr><td>${h(c.change)}</td><td>${h(c.field)}</td><td class="muted">${h(clip(c.current))}</td><td>${h(clip(c.next))}</td></tr>`).join('')}</table></details>`;
        const pushBtn = root.querySelector('[data-act="push"]'); const m = S.record.meta || {}; const C = S.record.CLAIMS;
        pushBtn.disabled = !(m.approved_at && d.refusals.filter(x => !/tick "reviewed"/.test(x)).length === 0 && (!C || !C.findings || accepted().size === C.findings.length));
      } catch (e) { out.innerHTML = ''; toast(e.message, 'bad'); }
    });
  }
  async function push(btn) {
    const d = S.dry; if (!d) return;
    if (!(await confirm({ title: `Push to ${d.site}?`, text: `Page ${d.page.id} (${d.page.status}). A snapshot is taken first, so it can be rolled back from the push log.`, ok: 'Push' }))) return;
    await busy(btn, 'Pushing…', async () => {
      try {
        const r = await api(wp('push'), { method: 'POST', body: { recordId: S.recordId, reviewed: root.querySelector('#reviewedTick').checked, acceptedClaims: [...accepted()], confirm: true } });
        if (r.refusals && r.refusals.length) toast('Push refused: ' + r.refusals.join(' '), 'bad');
        else if (r.error) toast(`Push failed: ${r.error}`, 'bad');
        else { toast(`Push: ${r.result}`); S.pushedAt = new Date().toISOString(); S.dry = null; draw(); }
      } catch (e) { toast(e.message, 'bad'); }
    });
  }
  async function loadLog() {
    const el = root.querySelector('#pushLog'); if (!el) return;
    try {
      const log = await api(wp('log'));
      const list = (Array.isArray(log) ? log : log.log || []).filter(l => !l.recordId || S.history.some(v => v.id === l.recordId));
      el.innerHTML = list.length ? list.map(l => `<div style="display:flex;gap:8px;align-items:center;padding:4px 0;border-top:1px solid var(--border)"><span class="muted">${h(fmtDate(l.at, true))}</span><span>${h(l.action)} → <strong>${h(l.result)}</strong>${l.error ? `: ${h(l.error)}` : ''}</span>${l.action === 'push' && l.snapshotId && /pushed|written/.test(l.result) ? `<button class="btn btn-ghost btn-xs" data-rollback="${attr(l.snapshotId)}" style="margin-left:auto">Roll back</button>` : ''}</div>`).join('') : '<div class="muted">No pushes yet.</div>';
      if (list.some(l => l.result === 'pushed' && l.recordId === S.recordId) && !S.pushedAt) { S.pushedAt = list.find(l => l.result === 'pushed' && l.recordId === S.recordId).at; }
    } catch (e) { el.textContent = `Could not load the push log: ${e.message}`; }
  }

  // The FLAGs read tick (a blog post with FLAGs): saved on the record through the approve route
  root.addEventListener('change', async e => {
    if (!e.target || e.target.id !== 'flagsReadTick' || !S.recordId) return;
    const on = !!e.target.checked;
    try { const r = await api(`${base}/approve`, { method: 'POST', body: { recordId: S.recordId, flagsReviewed: on, by: ctx.userName() } }); S.record.meta = { ...(S.record.meta || {}), flags_reviewed_at: r.flags_reviewed_at, flags_reviewed_by: on ? ctx.userName() : null }; toast(on ? 'FLAGs marked as read' : 'FLAGs marked as unread'); draw(); } catch (err) { toast(err.message, 'bad'); }
  });
  root.addEventListener('click', async e => {
    const ed = e.target.closest('.ed'); if (ed && !e.target.closest('textarea, button')) return startEdit(ed, ed.dataset.field);
    const ef = e.target.closest('[data-edit-field]'); if (ef) { const el = root.querySelector(`.ed[data-field="${CSS.escape(ef.dataset.editField)}"]`); if (el) { el.scrollIntoView({ block: 'center' }); startEdit(el, ef.dataset.editField); } return; }
    const cl = e.target.closest('[data-claim]');
    if (cl) {
      const f = S.record.CLAIMS.findings[+cl.dataset.claim]; const set = accepted(); if (cl.dataset.accept === '1') set.add(f.quote); else set.delete(f.quote);
      try { await api(wp('claims-accepted'), { method: 'PUT', body: { recordId: S.recordId, quotes: [...set] } }); S.record.CLAIMS.accepted = [...set].map(q => ({ quote: q })); toast(cl.dataset.accept === '1' ? 'Accepted' : 'Not accepted'); draw(); } catch (err) { toast(err.message, 'bad'); }
      return;
    }
    const rb = e.target.closest('[data-rollback]');
    if (rb) { if (!(await confirm({ title: 'Roll the site back?', text: 'The site goes back to what it held before this push.', ok: 'Roll back', danger: true }))) return; try { const r = await api(wp('rollback'), { method: 'POST', body: { snapshotId: rb.dataset.rollback, confirm: true } }); toast(r.ok ? 'Rolled back' : `Rollback: ${r.error || 'read-back differs'}`, r.ok ? '' : 'bad'); S.dry = null; draw(); } catch (err) { toast(err.message, 'bad'); } return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    try {
      if (act === 'dry') return dryRun(b);
      if (act === 'push') return push(b);
      if (act === 'claims') return busy(b, 'Reviewing…', async () => { await api(wp('claims-review'), { method: 'POST', body: { recordId: S.recordId } }); await loadRecord(); });
      if (act === 'approve') { const on = !(S.record.meta || {}).approved_at; const r = await api(`${base}/approve`, { method: 'POST', body: { recordId: S.recordId, approved: on, by: ctx.userName() } }); S.record.meta = { ...(S.record.meta || {}), approved_at: r.approved_at, approved_by: r.approved_by }; toast(on ? 'Approved' : 'Approval removed'); return draw(); }
      if (act === 'regenerate') {
        if (!(await confirm({ title: `Write ${title} again?`, text: 'The current version is kept in the history. The run takes a minute or two per page.', ok: 'Regenerate' }))) return;
        if (type === 'homepage') { api(`/api/clients/${clientId}/v20/homepage/generate`, { method: 'POST', body: {} }).then(() => { toast('Homepage written'); loadRecord(); }).catch(err => toast(err.message, 'bad')); toast('Writing the homepage'); }
        else { await api(`/api/clients/${clientId}/${type}-pages/run`, { method: 'POST', body: { resume: false, keys: [key] } }); toast('Writing the page: the Pages tab shows its progress'); }
        return ctx.navigate(`/clients/${clientId}/pages?type=${type}`);
      }
    } catch (err) { toast(err.message, 'bad'); }
  });
  await loadRecord();
}
