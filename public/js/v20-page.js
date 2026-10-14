// ── v20 page screen ─────────────────────────────────────────────────────────
// Everything about one generated page: reader view, field editor, claims, dry run,
// push, push log and rollback. The URL names the page (?type=…&key=…); the page
// routes are /v20/pages/:type/:key for every type, and the WordPress routes work
// on the version shown. A new type needs an entry in PAGE_TYPES.
'use strict';

const PAGE_TYPES = {
  homepage: { label: 'Homepage', singleKey: 'homepage' },
};

const params = new URLSearchParams(location.search);
const clientId = params.get('clientId');
const pageType = params.get('type') || 'homepage';
const PT = PAGE_TYPES[pageType] && (() => {
  const key = params.get('key') || PAGE_TYPES[pageType].singleKey;
  const page = `/v20/pages/${encodeURIComponent(pageType)}/${encodeURIComponent(key)}`;
  return {
    ...PAGE_TYPES[pageType], key,
    api: {
      record: page, fields: `${page}/fields`, download: `${page}/download`,
      claimsReview: '/wp/claims-review', accept: '/wp/claims-accepted',
      dryRun: '/wp/dry-run', push: '/wp/push', rollback: '/wp/rollback', log: '/wp/log',
    },
  };
})();
let state = { record: null, recordId: null, dry: null, editFor: null, connection: null };

function h(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
const api = (p, opts) => fetch(`/api/clients/${encodeURIComponent(clientId)}${p}`, opts).then(async r => {
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || r.statusText);
  return d;
});
const send = (method, p, body) => api(p, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
function setLoading(btn, on, label) { if (!btn) return; btn.disabled = on; btn.textContent = on ? label : btn.dataset.label || label; }
function showError(msg) { const el = document.getElementById('pgError'); el.textContent = msg || ''; el.style.display = msg ? 'block' : 'none'; }
function notice(html) { document.getElementById('pgNotice').innerHTML = html || ''; }
const tag = (text, cls) => ` <span class="tag ${cls}">${text}</span>`;
const fmt = s => new Date(s).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ── Tabs ──
function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${name}`));
  if (name === 'edit' && state.editFor !== state.recordId) loadEditor();
  if (name === 'reader') loadReader();
  if (name === 'log') loadLog();
  try { sessionStorage.setItem('v20PageTab', name); } catch {}
}

// ── Load ──
async function load() {
  if (!clientId || !PT) { location.href = '/clients.html'; return; }
  const [client, conn] = await Promise.all([
    fetch(`/api/clients/${encodeURIComponent(clientId)}`).then(r => r.ok ? r.json() : null),
    api('/wp/connection').catch(() => null),
  ]);
  if (!client) { location.href = '/clients.html'; return; }
  state.connection = conn;
  document.title = `${PT.label} · ${client.name} — Local Launchpad`;
  document.getElementById('crumbClient').textContent = client.name;
  document.getElementById('crumbClient').href = `/client.html?id=${encodeURIComponent(clientId)}`;
  document.getElementById('pgTitle').textContent = `${PT.label} (v20)`;
  document.getElementById('settingsLink').href = `/client-settings.html?id=${encodeURIComponent(clientId)}`;
  await loadRecord();
  let tab = 'reader';
  try { tab = sessionStorage.getItem('v20PageTab') || 'reader'; } catch {}
  showTab(tab);
}

async function loadRecord() {
  const { record, history } = await api(PT.api.record);
  state.record = record; state.recordId = history && history[0] ? history[0].id : null; state.dry = null;
  if (!record) {
    document.getElementById('pgMeta').textContent = 'Not generated yet. Generate it from the Generate Pages screen.';
    document.getElementById('pgBody').style.display = 'none';
    return;
  }
  const m = record.meta || {};
  const n = (m.edited_fields || []).length;
  const made = m.edited_at ? `Edited by hand ${fmt(m.edited_at)} (${n} field${n === 1 ? '' : 's'})` : `Generated ${fmt(m.generated_at)}`;
  // No stored validation here: the dry run checks the page with today's rules
  document.getElementById('pgMeta').innerHTML = `${h(made)} · ${history.length} version(s)${record.watermark ? ` · <span class="flag">${h(record.watermark)}</span>` : ''}`;
  const dl = f => `/api/clients/${encodeURIComponent(clientId)}${PT.api.download}?format=${f}&id=${encodeURIComponent(state.recordId)}`;
  document.getElementById('dlMd').href = dl('md');
  document.getElementById('dlJson').href = dl('json');
  renderClaims();
  renderPushIntro();
  if (document.getElementById('panel-reader').classList.contains('active')) loadReader();
  if (document.getElementById('panel-edit').classList.contains('active')) loadEditor();
}

// ── Reader view: the .md download, shown on screen ──
function renderMarkdown(md) {
  const inline = s => h(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span class="link" title="$2">$1</span>');
  const out = []; let list = false;
  for (const line of md.split('\n')) {
    const end = () => { if (list) { out.push('</ul>'); list = false; } };
    if (/^#{1,4} /.test(line)) { end(); const n = line.match(/^#+/)[0].length; out.push(`<h${n + 1}>${inline(line.replace(/^#+ /, ''))}</h${n + 1}>`); }
    else if (/^\s*[-*] /.test(line)) { if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${inline(line.replace(/^\s*[-*] /, ''))}</li>`); }
    else if (/^---+$/.test(line.trim())) { end(); out.push('<hr>'); }
    else if (!line.trim()) end();
    else { end(); out.push(`<p>${inline(line)}</p>`); }
  }
  return out.join('\n');
}
async function loadReader() {
  const el = document.getElementById('readerBody');
  if (!state.recordId) return;
  if (el.dataset.for === state.recordId) return;
  el.innerHTML = '<span class="muted">Loading…</span>';
  try {
    const r = await fetch(`/api/clients/${encodeURIComponent(clientId)}${PT.api.download}?format=md&id=${encodeURIComponent(state.recordId)}`);
    if (!r.ok) throw new Error(await r.text());
    el.innerHTML = renderMarkdown(await r.text());
    el.dataset.for = state.recordId;
  } catch (e) { el.innerHTML = ''; showError(`Couldn't load the reader view: ${e.message}`); }
}

// ── Claims (on the push tab; the ticks are saved on the version) ──
const accepted = () => Array.from(document.querySelectorAll('.claim-tick:checked')).map(cb => state.record.CLAIMS.findings[+cb.dataset.i].quote);
const reviewed = () => { const el = document.getElementById('reviewedTick'); return el ? el.checked : false; };
function renderClaims() {
  const C = state.record.CLAIMS, el = document.getElementById('claimsBody');
  const ok = new Set(((C && C.accepted) || []).map(a => a.quote));
  el.innerHTML = !C ? `<p>No claims review on this version yet. <button class="btn btn-ghost btn-sm" onclick="reviewClaims(this)">Run claims review</button></p>`
    : C.status === 'failed' ? `<p class="error">Claims review failed (${h(C.error)}). <button class="btn btn-ghost btn-sm" onclick="reviewClaims(this)">Run it again</button></p>`
    : !C.findings.length ? '<p class="success">Claims review: clear.</p>'
    : `<p>${C.findings.length} statement(s) the facts on file don't support. Tick each one you accept, or fix it on the Edit fields tab.</p>` +
      C.findings.map((f, i) => `<label class="claim"><input type="checkbox" class="claim-tick" data-i="${i}" ${ok.has(f.quote) ? 'checked' : ''}><span><strong>${h(f.field)}</strong>: "${h(f.quote)}"${f.carried ? tag('accepted on the previous version', 'tag-ok') : ''}${f.note ? tag(h(f.note), 'tag-flag') : ''}${f.on_edited_field ? tag('on a field you edited', 'tag-muted') : ''}<br><span class="muted">${h(f.why)}</span></span></label>`).join('');
  el.onchange = e => {
    if (!e.target.classList.contains('claim-tick')) return;
    send('PUT', PT.api.accept, { recordId: state.recordId, quotes: accepted() }).catch(err => showError(`Couldn't save the tick: ${err.message}`));
    updatePushButton();
  };
}
async function reviewClaims(btn) {
  showError(''); setLoading(btn, true, 'Running the claims review…');
  try { await send('POST', PT.api.claimsReview, { recordId: state.recordId }); await loadRecord(); }
  catch (e) { showError(e.message); setLoading(btn, false, 'Run claims review'); }
}

// ── Field editor ──
const words = t => { const s = String(t || '').replace(/\[CV: [a-z0-9_]+\]/g, 'X').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim(); return s ? s.split(/\s+/).length : 0; };
function wordNote(el) {
  const n = words(el.value), r = JSON.parse(el.dataset.range || 'null');
  const out = r && ((r.min && n < r.min) || n > r.max);
  const note = el.parentElement.querySelector('.words');
  note.textContent = `${n} words${r ? ` (${r.label})` : ''}${el.value !== el.dataset.orig ? ' · changed' : ''}`;
  note.classList.toggle('flag', !!out);
}
async function loadEditor() {
  const body = document.getElementById('editBody');
  if (!state.recordId) return;
  body.innerHTML = '<span class="muted">Loading…</span>';
  try {
    const { recordId, fields, issues: today, issuesError } = await api(`${PT.api.fields}?id=${encodeURIComponent(state.recordId)}`);
    const rec = state.record, issues = today || (rec.VALIDATION && rec.VALIDATION.issues) || [], findings = (rec.CLAIMS && rec.CLAIMS.findings) || [];
    body.innerHTML = `<p class="muted">Headings, FAQ questions, card names, buttons and links are set by code: to change those, change the client values and regenerate. Saving makes a new version and runs the validator and the claims review on the whole page (one model call). The issues shown are ${today ? "today's" : `the stored ones (today's check couldn't run: ${h(issuesError)})`}.</p>` +
      fields.map((f, i) => {
        const notes = [
          ...issues.filter(x => x.field === f.field).map(x => `<div class="${x.type === 'BLOCK' ? 'error' : 'flag'}">${h(x.type)} ${h(x.check)}: ${h(x.message)}</div>`),
          ...findings.filter(x => x.field === f.field).map(x => `<div class="flag">Claim: "${h(x.quote)}" (${h(x.why)})</div>`),
        ].join('');
        return `<div class="field"><div class="field-name">${h(f.field)}</div>${notes}
          <textarea class="edit" data-field="${h(f.field)}" data-range="${h(JSON.stringify(f.range))}" rows="${Math.min(12, Math.max(3, Math.ceil(f.text.length / 90) + 1))}" oninput="wordNote(this)">${h(f.text)}</textarea>
          <div class="words muted"></div></div>`;
      }).join('') +
      `<div class="bar"><button class="btn btn-primary" id="editSave" data-label="Save and re-check" onclick="saveEdits()">Save and re-check</button></div>`;
    body.querySelectorAll('.edit').forEach((el, i) => { el.dataset.orig = fields[i].text; wordNote(el); });
    state.editFor = recordId;
  } catch (e) { body.innerHTML = ''; showError(`Couldn't load the fields: ${e.message}`); }
}
async function saveEdits() {
  showError('');
  const edits = Array.from(document.querySelectorAll('.edit')).filter(el => el.value !== el.dataset.orig).map(el => ({ field: el.dataset.field, text: el.value }));
  if (!edits.length) { showError('Nothing changed.'); return; }
  const btn = document.getElementById('editSave');
  setLoading(btn, true, 'Checking…');
  try {
    const hasClaims = state.record.CLAIMS && Array.isArray(state.record.CLAIMS.findings);
    const r = await send('PUT', PT.api.fields, { recordId: state.editFor, edits, accepted: hasClaims ? accepted() : undefined });
    await loadRecord();
    const V = r.record.VALIDATION, C = r.record.CLAIMS;
    const open = C.status === 'failed' ? 'the claims review failed, run it again' : `${C.findings.length} claim(s), ${(C.accepted || []).length} carried over`;
    notice(`<div class="${V.block ? 'error' : 'success'}">Saved as a new version: ${r.changed.length} field(s) changed · ${V.block} BLOCK, ${V.flag} FLAG · ${open}. Run a dry run before pushing.</div>`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) { showError(e.message); setLoading(btn, false, 'Save and re-check'); }
}

// ── Dry run and push ──
function renderPushIntro() {
  const c = state.connection, el = document.getElementById('siteLine');
  const settings = `/client-settings.html?id=${encodeURIComponent(clientId)}`;
  el.innerHTML = c ? `Site: <strong>${h(c.url)}</strong>${c.staging ? ' (staging)' : ''} · SEO ${h(c.seo)} · <a href="${settings}">change</a>`
    : `<span class="flag">No WordPress site connected for this client.</span> <a href="${settings}">Set it up in client settings</a>.`;
  document.getElementById('dryBtn').disabled = !c;
  document.getElementById('pushBtn').disabled = true;
  document.getElementById('dryResult').innerHTML = '';
}
function validationNote(v) {
  if (!v || v.error) return '';
  const issue = i => `<li><span class="${i.type === 'BLOCK' ? 'error' : 'flag'}">${h(i.type)} ${h(i.check)}</span> · ${h(i.field)}: ${h(i.message)}</li>`;
  const list = (title, items) => items.length ? `<details><summary>${title} (${items.length})</summary><ul>${items.map(issue).join('')}</ul></details>` : '';
  return `<div class="block">Validation with today's rules: <strong>${v.fresh.block} BLOCK</strong>, ${v.fresh.flag} FLAG.
    ${v.differs ? `<span class="flag">This differs from the result stored when this version was saved (${v.stored.block ?? '?'} BLOCK, ${v.stored.flag ?? '?'} FLAG).</span>` : '<span class="muted">Same as the stored result.</span>'}
    ${v.factsChanged ? `<div class="flag">The client values or page decisions have changed since this version was written, so it was checked against today's facts. Regenerate if the page should reflect them.</div>` : ''}
    ${list("New under today's rules", v.added || [])}${list('No longer found', v.cleared || [])}${list('All issues today', v.fresh.issues || [])}</div>`;
}
async function dryRun() {
  showError('');
  const out = document.getElementById('dryResult');
  out.innerHTML = '<span class="muted">Reading the site…</span>';
  try {
    const d = await send('POST', PT.api.dryRun, { recordId: state.recordId, reviewed: reviewed() });
    state.dry = d;
    const changed = d.changes.filter(c => c.change !== 'same');
    const clip = s => (s && s.length > 140 ? s.slice(0, 137) + '…' : (s || '(empty)'));
    out.innerHTML = `
      <div>Dry run on ${h(d.site)}: page ${d.page ? `${d.page.id} (${h(d.page.status)})` : 'not found'} · ${d.summary.added} added, ${d.summary.changed} changed, ${d.summary.removed} removed. Nothing was written.</div>
      ${validationNote(d.validation)}
      ${d.refusals.length ? `<div class="error block">A push would be refused:<ul>${d.refusals.map(x => `<li>${h(x)}</li>`).join('')}</ul></div>` : '<div class="success block">The site is ready: a push would be allowed once every claim is accepted.</div>'}
      <details><summary>${changed.length} field change(s)</summary>
        <table>${changed.map(c => `<tr><td>${h(c.change)}</td><td>${h(c.field)}</td><td class="muted">${h(clip(c.current))}</td><td>${h(clip(c.next))}</td></tr>`).join('')}</table>
      </details>`;
    updatePushButton();
  } catch (e) { out.innerHTML = ''; showError(e.message); }
}
// Push needs a dry run with no refusals (the review tick can come after), every claim ticked, and the tick when today's result has FLAGs
function updatePushButton() {
  const btn = document.getElementById('pushBtn'), d = state.dry, rec = state.record;
  if (!btn || !d || !rec) { if (btn) btn.disabled = true; return; }
  const findings = (rec.CLAIMS && rec.CLAIMS.findings) || [];
  const otherRefusals = d.refusals.filter(x => !/tick "reviewed"/.test(x));
  const todayFlags = d.validation && d.validation.fresh ? d.validation.fresh.flag : (rec.VALIDATION && rec.VALIDATION.flag);
  btn.disabled = !(otherRefusals.length === 0 && accepted().length === findings.length && (!todayFlags || reviewed()));
}
async function push() {
  const d = state.dry;
  if (!d || !confirm(`Push the v20 ${PT.label.toLowerCase()} to ${d.site} (page ${d.page.id}, ${d.page.status})?\n\nA snapshot is taken first, so you can roll it back.`)) return;
  showError('');
  const btn = document.getElementById('pushBtn');
  setLoading(btn, true, 'Pushing…');
  try {
    const r = await send('POST', PT.api.push, { recordId: state.recordId, reviewed: reviewed(), acceptedClaims: accepted(), confirm: true });
    if (r.refusals && r.refusals.length) showError('Push refused: ' + r.refusals.join(' '));
    else if (r.error) showError(`Push failed: ${r.error}`);
    else {
      // The dry run is out of date once the site has changed
      state.dry = null;
      document.getElementById('dryResult').innerHTML = `<div class="${r.ok ? 'success' : 'flag'}">Push: ${h(r.result)}${r.mismatches && r.mismatches.length ? ` (read-back differs: ${h(r.mismatches.join(', '))})` : ''}. Run a new dry run before pushing again. The push log has a Roll back button.</div>`;
    }
  } catch (e) { showError(e.message); }
  finally { setLoading(btn, false, 'Push to WordPress'); updatePushButton(); }
}

// ── Push log and rollback ──
async function loadLog() {
  const el = document.getElementById('logBody');
  try {
    const log = await api(PT.api.log);
    el.innerHTML = log.length ? log.map(l => `
      <div class="log-row">
        <span class="muted">${h(fmt(l.at))}</span>
        <span>${h(l.action)} → <strong>${h(l.result)}</strong>${l.refusals ? `: ${h(l.refusals.join(' '))}` : ''}${l.error ? `: ${h(l.error)}` : ''}</span>
        ${l.action === 'push' && l.snapshotId && /pushed|written/.test(l.result) ? `<button class="btn btn-ghost btn-sm" onclick="rollback('${h(l.snapshotId)}')">Roll back</button>` : ''}
      </div>`).join('') : '<p class="muted">No pushes yet.</p>';
  } catch (e) { el.innerHTML = ''; showError(`Couldn't load the push log: ${e.message}`); }
}
async function rollback(snapshotId) {
  if (!confirm('Roll the site back to what it held before this push?')) return;
  showError('');
  try {
    const r = await send('POST', PT.api.rollback, { snapshotId, confirm: true });
    if (!r.ok) showError(`Rollback: ${r.error || 'read-back differs: ' + (r.mismatches || []).join(', ')}`);
    else {
      state.dry = null; updatePushButton();
      document.getElementById('dryResult').innerHTML = '';
      notice('<div class="success">Rolled back: the site holds what it had before that push. Run a new dry run before pushing again.</div>');
    }
  } catch (e) { showError(e.message); }
  loadLog();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('reviewedTick').addEventListener('change', updatePushButton);
  load().catch(e => showError(e.message));
});
