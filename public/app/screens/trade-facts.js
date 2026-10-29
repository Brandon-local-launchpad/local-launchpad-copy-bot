// Trade facts (27 Oct 2026): the existing page with the Verify gate, in the new shell. One
// research pack per niche; service pages for a niche are only written from a verified pack.

import { h, attr, api, card, table, pill, status, toast, confirm, dialog, fmtDate, markdownToHtml, wire, info } from '../ui.js';

export async function render(root, params, ctx) {
  ctx.setTitle('Trade facts');
  let who = ctx.userName() || '';
  try { who = who || localStorage.getItem('tradeFactsWho') || ''; } catch (_) {}
  const load = async () => {
    const { packs, coreMissing } = await api('/api/trade-facts');
    const verified = p => !p.exists ? pill('none', 'no pack') : p.verified ? `${pill('ok', 'verified')}<span class="sub">${h(p.verifiedBy)} · ${h(fmtDate(p.verifiedAt, true))}</span>` : p.stale ? `${pill('wait', 'regenerated, not verified')}<span class="sub">last verified by ${h(p.lastVerifiedBy)} on ${h(fmtDate(p.lastVerifiedAt))}</span>` : pill('block', 'not verified');
    const columns = [
      { key: 'niche', label: 'Niche', cls: 'no-label', render: p => `<span class="primary">${h(p.niche)}</span><span class="sub">${p.exists ? h(p.file) : p.hasBlock ? 'block only, not generated yet' : 'no block'}${p.exists && !p.headerOk ? ' · header line missing or malformed' : ''}</span>` },
      { key: 'generated', label: 'Generated', render: p => p.exists ? h(p.generated || '?') : '<span class="muted">–</span>' },
      { key: 'model', label: 'Model', render: p => p.exists ? h(p.model || '?') : '<span class="muted">–</span>' },
      { key: 'verified', label: 'Verified', render: verified },
      { key: 'act', label: '', cls: 'right no-label', render: p => `${p.exists ? `<button class="btn btn-ghost btn-sm" data-read="${attr(p.niche)}">Read</button> ` : ''}${p.exists && !p.verified ? `<button class="btn btn-primary btn-sm" data-verify="${attr(p.niche)}">Verify</button>` : ''}${p.verified ? `<button class="btn btn-ghost btn-sm" data-unverify="${attr(p.niche)}">Unverify</button>` : ''}` },
    ];
    root.innerHTML = `
      <div class="ph"><div class="ph-title"><h1>Trade facts</h1><div class="ph-meta">One research pack per niche; service pages are written only from a verified pack ${info('A pack is verified only while its text matches the fingerprint taken at verification: a re-run of the script makes it unverified again.')}</div></div>
        <div class="ph-actions"><label class="small muted">Verifying as <input class="input" id="who" style="width:140px;padding:5px 8px" value="${attr(who)}" placeholder="your name"></label><button class="btn btn-ghost btn-sm" id="refresh">Refresh</button></div></div>
      ${coreMissing ? '<div class="notice warn" style="margin-bottom:14px">The core prompt is missing: put it at trade-facts/core.md before running the script.</div>' : ''}
      <section class="card card-flat">${table({ columns, rows: packs, cards: true, emptyText: 'No packs or blocks yet. Add a block at trade-facts/blocks/<niche>.md and run the script.' })}</section>`;
    root.querySelector('#who').addEventListener('input', e => { who = e.target.value; try { localStorage.setItem('tradeFactsWho', who); } catch (_) {} });
    root.querySelector('#refresh').addEventListener('click', load);
  };
  root.addEventListener('click', async e => {
    const r = e.target.closest('[data-read]');
    if (r) { const d = dialog({ title: `${r.dataset.read} trade facts pack`, body: '<div class="skel" style="width:60%"></div>', wide: true }); try { const p = await api(`/api/trade-facts/${encodeURIComponent(r.dataset.read)}`); d.el.innerHTML = `<div class="copy" style="font-size:15px">${markdownToHtml(p.text || '')}</div>`; } catch (err) { d.el.innerHTML = `<div class="state failed"><p>${h(err.message)}</p></div>`; } return; }
    const v = e.target.closest('[data-verify]');
    if (v) { const name = who.trim(); if (!name) { toast('Type your name in "Verifying as" first', 'bad'); root.querySelector('#who').focus(); return; } if (!(await confirm({ title: `Mark the ${v.dataset.verify} pack as verified by ${name}?`, text: 'Service pages for this niche will then be written from it.', ok: 'Verify' }))) return; try { const res = await api(`/api/trade-facts/${encodeURIComponent(v.dataset.verify)}/verify`, { method: 'POST', body: { who: name } }); if (res.error) throw new Error(res.error); toast('Verified'); } catch (err) { toast(`Verify failed: ${err.message}`, 'bad'); } return load(); }
    const u = e.target.closest('[data-unverify]');
    if (u) { if (!(await confirm({ title: `Clear the verified flag on the ${u.dataset.unverify} pack?`, text: 'Service pages for this niche are blocked until it is verified again.', ok: 'Unverify', danger: true }))) return; try { await api(`/api/trade-facts/${encodeURIComponent(u.dataset.unverify)}/unverify`, { method: 'POST' }); toast('Unverified'); } catch (err) { toast(err.message, 'bad'); } return load(); }
  });
  wire(root);
  await load();
}
