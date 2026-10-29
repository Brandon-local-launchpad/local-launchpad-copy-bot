// Prompts (27 Oct 2026): the CORE files, read only, with version and date.
import { h, attr, api, card, table, pill, dialog, fmtDate, timeEl, wire } from '../ui.js';

export async function render(root, params, ctx) {
  ctx.setTitle('Prompts');
  const { prompts } = await api('/api/prompts');
  const columns = [
    { key: 'title', label: 'Prompt', cls: 'no-label', render: p => `<span class="primary">${h(p.title)}</span><span class="sub">prompts/${h(p.name)}</span>` },
    { key: 'core', label: 'Version', render: p => p.core === null ? '<span class="muted">–</span>' : pill('accent', typeof p.core === 'number' ? `CORE (${p.core})` : 'CORE') },
    { key: 'modified', label: 'Last change', render: p => `${timeEl(p.modified)}<span class="sub">${h(fmtDate(p.modified))}</span>` },
    { key: 'words', label: 'Words', num: true },
    { key: 'act', label: '', cls: 'right no-label', render: p => `<button class="btn btn-ghost btn-sm" data-open="${attr(p.name)}">Read</button>` },
  ];
  root.innerHTML = `<div class="ph"><div class="ph-title"><h1>Prompts</h1><div class="ph-meta">${prompts.length} files in prompts/ · read only here: a change is a commit, the file the code reads is the only copy</div></div></div>
    <section class="card card-flat">${table({ columns, rows: prompts, cards: true })}</section>`;
  root.addEventListener('click', async e => {
    const b = e.target.closest('[data-open]'); if (!b) return;
    const d = dialog({ title: b.dataset.open, body: '<div class="skel" style="width:60%"></div>', wide: true });
    try { const p = await api(`/api/prompts/${encodeURIComponent(b.dataset.open)}`); d.el.innerHTML = `<pre class="block" style="max-height:70vh;font-size:13px;line-height:1.5">${h(p.text)}</pre>`; } catch (err) { d.el.innerHTML = `<div class="state failed"><p>${h(err.message)}</p></div>`; }
  });
  wire(root);
}
