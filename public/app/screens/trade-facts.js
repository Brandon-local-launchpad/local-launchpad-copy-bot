// Trade facts (27 Oct 2026): the existing page with the Verify gate, in the new shell. One
// research pack per niche; service pages for a niche are only written from a verified pack.
// Blog question banks (28 Oct): one Perplexity run per trade, pasted or run from here and
// approved the same way; the blog topic queue reads an approved bank only.

import { h, attr, api, card, table, pill, status, toast, confirm, dialog, fmtDate, markdownToHtml, wire, info, busy } from '../ui.js';

export async function render(root, params, ctx) {
  ctx.setTitle('Trade facts');
  let who = ctx.userName() || '';
  try { who = who || localStorage.getItem('tradeFactsWho') || ''; } catch (_) {}
  let bankTimer = null;
  const load = async () => {
    const [{ packs, coreMissing }, bankRes] = await Promise.all([api('/api/trade-facts'), api('/api/blog-bank').catch(e => ({ error: e.message, banks: [] }))]);
    const verified = p => !p.exists ? pill('none', 'no pack') : p.verified ? `${pill('ok', 'verified')}<span class="sub">${h(p.verifiedBy)} · ${h(fmtDate(p.verifiedAt, true))}</span>` : p.stale ? `${pill('wait', 'regenerated, not verified')}<span class="sub">last verified by ${h(p.lastVerifiedBy)} on ${h(fmtDate(p.lastVerifiedAt))}</span>` : pill('block', 'not verified');
    const columns = [
      { key: 'niche', label: 'Niche', cls: 'no-label', render: p => `<span class="primary">${h(p.niche)}</span><span class="sub">${p.exists ? h(p.file) : p.hasBlock ? 'block only, not generated yet' : 'no block'}${p.exists && !p.headerOk ? ' · header line missing or malformed' : ''}</span>` },
      { key: 'generated', label: 'Generated', render: p => p.exists ? h(p.generated || '?') : '<span class="muted">–</span>' },
      { key: 'model', label: 'Model', render: p => p.exists ? h(p.model || '?') : '<span class="muted">–</span>' },
      { key: 'verified', label: 'Verified', render: verified },
      { key: 'act', label: '', cls: 'right no-label', render: p => `${p.exists ? `<button class="btn btn-ghost btn-sm" data-read="${attr(p.niche)}">Read</button> ` : ''}${p.exists && !p.verified ? `<button class="btn btn-primary btn-sm" data-verify="${attr(p.niche)}">Verify</button>` : ''}${p.verified ? `<button class="btn btn-ghost btn-sm" data-unverify="${attr(p.niche)}">Unverify</button>` : ''}` },
    ];
    // The blog question banks: one per trade, pasted or run, approved once
    const banks = bankRes.banks || [];
    const approvedCell = b => !b.exists ? pill('none', 'no bank') : b.running ? `${pill('run', 'running')}<span class="sub">${h((b.run && b.run.note) || 'on Perplexity')}</span>` : b.paa && b.paa.running ? `${pill('run', 'People also ask')}<span class="sub">${h((b.paa.run && b.paa.run.note) || 'on DataForSEO')}</span>` : b.paa && b.paa.run && b.paa.run.status === 'failed' ? `${pill('block', 'PAA failed')}<span class="sub">${h(b.paa.run.error || '')}</span>` : !b.valid ? `${pill('block', 'not usable')}<span class="sub">${h(b.error || '')}</span>` : b.approved ? `${pill('ok', 'approved')}<span class="sub">${h(b.approvedBy)} · ${h(fmtDate(b.approvedAt, true))}</span>` : b.stale ? pill('wait', 'changed since approval') : pill('block', 'not approved');
    const bankColumns = [
      { key: 'trade', label: 'Trade', cls: 'no-label', render: b => `<span class="primary">${h(b.trade)}</span><span class="sub">${b.exists ? `${h(b.source || '')} · ${h(b.from === 'database' ? 'saved in Copybot' : b.from || '')}` : 'no bank yet: run it, or paste the reply from the Perplexity app'}${b.run && b.run.status === 'failed' ? ` · <span style="color:#b91c1c">last run failed: ${h(b.run.error || '')}</span>` : ''}</span>` },
      { key: 'generated', label: 'Generated', render: b => b.exists ? h(b.generated || '?') : '<span class="muted">–</span>' },
      { key: 'counts', label: 'Topics', render: b => b.counts ? `${b.counts.topics} topics, ${b.counts.related} questions${b.counts.cost_topics || b.counts.seasonal_topics ? ` · v2: ${b.counts.cost_topics} cost topics (${b.counts.cost_related}), ${b.counts.seasonal_topics} seasonal (${b.counts.seasonal_related})` : ''}${b.paa && b.paa.last ? ` · People also ask ${h(b.paa.last.date || '')}: ${b.paa.last.kept} kept of ${b.paa.last.found}, ${Number(b.paa.last.cost || 0).toFixed(2)}${b.paa.last.modelPence != null ? ` + ${b.paa.last.modelPence}p` : ''}` : ''}<span class="sub">${b.counts.cost} cost, ${b.counts.decision} decision, ${b.counts.question} question · ${b.counts.ranked} ranked · ${b.counts.rules} rules${b.warnings.length ? ` · <span style="color:#b45309">${b.warnings.length} warning${b.warnings.length === 1 ? '' : 's'}</span>` : ''}</span>` : '<span class="muted">–</span>' },
      { key: 'approved', label: 'Approved', render: approvedCell },
      { key: 'act', label: '', cls: 'right no-label', render: b => `${b.exists ? `<button class="btn btn-ghost btn-sm" data-bank-read="${attr(b.trade)}">Read</button> ` : ''}<button class="btn btn-ghost btn-sm" data-bank-paste="${attr(b.trade)}">Paste</button> <button class="btn btn-ghost btn-sm" data-bank-run="${attr(b.trade)}" ${b.running ? 'disabled' : ''}>Run</button> ${b.file && !b.file.same ? `<button class="btn btn-ghost btn-sm" data-bank-load-file="${attr(b.trade)}" title="${attr(`Replace this bank with the file in the deploy (blog-bank/${b.trade}.md: ${(b.file.header && b.file.header.model) || 'no header'}), unapproved`)}">Load file</button> ` : ''}${b.exists ? `<button class="btn btn-ghost btn-sm" data-bank-paa="${attr(b.trade)}" ${!b.paa || !b.paa.available || b.paa.running || b.running ? 'disabled' : ''} title="${attr(!b.paa || !b.paa.available ? 'DataForSEO is not set up: DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD on the server' : 'Replace the related questions with Google People also ask (DataForSEO)')}">People also ask</button> ` : ''}${b.paa && b.paa.last ? `<button class="btn btn-ghost btn-sm" data-bank-paa-report="${attr(b.trade)}">PAA report</button> ` : ''}${b.exists && b.valid && !b.approved ? `<button class="btn btn-primary btn-sm" data-bank-approve="${attr(b.trade)}">Approve</button>` : ''}${b.approved ? `<button class="btn btn-ghost btn-sm" data-bank-unapprove="${attr(b.trade)}">Unapprove</button>` : ''}` },
    ];
    root.innerHTML = `
      <div class="ph"><div class="ph-title"><h1>Trade facts</h1><div class="ph-meta">One research pack per niche; service pages are written only from a verified pack ${info('A pack is verified only while its text matches the fingerprint taken at verification: a re-run of the script makes it unverified again.')}</div></div>
        <div class="ph-actions"><label class="small muted">Verifying as <input class="input" id="who" style="width:140px;padding:5px 8px" value="${attr(who)}" placeholder="your name"></label><button class="btn btn-ghost btn-sm" id="refresh">Refresh</button></div></div>
      ${coreMissing ? '<div class="notice warn" style="margin-bottom:14px">The core prompt is missing: put it at trade-facts/core.md before running the script.</div>' : ''}
      <section class="card card-flat">${table({ columns, rows: packs, cards: true, emptyText: 'No packs or blocks yet. Add a block at trade-facts/blocks/<niche>.md and run the script.' })}</section>
      <div class="ph" style="margin-top:22px"><div class="ph-title"><h2 style="margin:0">Blog question banks</h2><div class="ph-meta">One Perplexity run per trade (prompts/Blog_Question_Bank_Perplexity_Prompt.md); the blog topic queue reads an approved bank only ${info('Run sends the prompt through the Perplexity API when the key is set on the server. Paste takes the reply from the Perplexity app. Approval is a fingerprint of the text: a new paste or run makes the bank unapproved again.')}</div></div></div>
      ${bankRes.error ? `<div class="notice bad" style="margin-bottom:14px">The banks could not be listed: ${h(bankRes.error)}</div>` : ''}
      <section class="card card-flat">${table({ columns: bankColumns, rows: banks, cards: true, emptyText: 'No banks yet.' })}</section>`;
    root.querySelector('#who').addEventListener('input', e => { who = e.target.value; try { localStorage.setItem('tradeFactsWho', who); } catch (_) {} });
    root.querySelector('#refresh').addEventListener('click', load);
    clearTimeout(bankTimer);
    if (banks.some(b => b.running || (b.paa && b.paa.running))) bankTimer = setTimeout(load, 15000);
  };
  const needName = () => { const name = who.trim(); if (!name) { toast('Type your name in "Verifying as" first', 'bad'); root.querySelector('#who').focus(); } return name; };
  root.addEventListener('click', async e => {
    const r = e.target.closest('[data-read]');
    if (r) { const d = dialog({ title: `${r.dataset.read} trade facts pack`, body: '<div class="skel" style="width:60%"></div>', wide: true }); try { const p = await api(`/api/trade-facts/${encodeURIComponent(r.dataset.read)}`); d.el.innerHTML = `<div class="copy" style="font-size:15px">${markdownToHtml(p.text || '')}</div>`; } catch (err) { d.el.innerHTML = `<div class="state failed"><p>${h(err.message)}</p></div>`; } return; }
    const v = e.target.closest('[data-verify]');
    if (v) { const name = needName(); if (!name) return; if (!(await confirm({ title: `Mark the ${v.dataset.verify} pack as verified by ${name}?`, text: 'Service pages for this niche will then be written from it.', ok: 'Verify' }))) return; try { const res = await api(`/api/trade-facts/${encodeURIComponent(v.dataset.verify)}/verify`, { method: 'POST', body: { who: name } }); if (res.error) throw new Error(res.error); toast('Verified'); } catch (err) { toast(`Verify failed: ${err.message}`, 'bad'); } return load(); }
    const u = e.target.closest('[data-unverify]');
    if (u) { if (!(await confirm({ title: `Clear the verified flag on the ${u.dataset.unverify} pack?`, text: 'Service pages for this niche are blocked until it is verified again.', ok: 'Unverify', danger: true }))) return; try { await api(`/api/trade-facts/${encodeURIComponent(u.dataset.unverify)}/unverify`, { method: 'POST' }); toast('Unverified'); } catch (err) { toast(err.message, 'bad'); } return load(); }
    // The blog question banks
    const br = e.target.closest('[data-bank-read]');
    if (br) { const d = dialog({ title: `${br.dataset.bankRead} blog question bank`, body: '<div class="skel" style="width:60%"></div>', wide: true }); try { const b = await api(`/api/blog-bank/${encodeURIComponent(br.dataset.bankRead)}`); d.el.innerHTML = `${b.warnings.length ? `<div class="notice warn small" style="margin-bottom:10px"><strong>${b.warnings.length} warning${b.warnings.length === 1 ? '' : 's'} from the parser</strong><ul style="margin:4px 0 0 18px">${b.warnings.map(w => `<li>${h(w)}</li>`).join('')}</ul></div>` : ''}<div class="copy" style="font-size:15px">${markdownToHtml(b.text || '')}</div>`; } catch (err) { d.el.innerHTML = `<div class="state failed"><p>${h(err.message)}</p></div>`; } return; }
    const bp = e.target.closest('[data-bank-paste]');
    if (bp) {
      const trade = bp.dataset.bankPaste;
      const d = dialog({ title: `Paste the ${trade} bank reply`, body: `<div class="muted small" style="margin-bottom:8px">The whole reply from the Perplexity app, from "## 1. TOPICS" to the end of GAPS. <a href="/api/blog-bank/prompt/${encodeURIComponent(trade)}" target="_blank">The prompt to run</a>. It replaces the bank on file and clears its approval.</div><textarea class="input" id="bankText" rows="16" placeholder="## 1. TOPICS&#10;### [BT-1] | …"></textarea><div class="btn-row" style="margin-top:10px"><button class="btn btn-primary btn-sm" id="bankSave">Save the bank</button><span class="small muted" id="bankMsg"></span></div>`, wide: true });
      d.el.querySelector('#bankSave').addEventListener('click', ev => busy(ev.target, 'Reading…', async () => {
        try { const s = await api(`/api/blog-bank/${encodeURIComponent(trade)}/paste`, { method: 'POST', body: { text: d.el.querySelector('#bankText').value } }); toast(`Saved: ${s.counts.topics} topics, ${s.counts.related} related questions${s.warnings.length ? `, ${s.warnings.length} warning(s)` : ''}`); d.close(); load(); }
        catch (err) { d.el.querySelector('#bankMsg').textContent = err.message; toast(err.message, 'bad'); }
      }));
      return;
    }
    const brun = e.target.closest('[data-bank-run]');
    if (brun) { if (!(await confirm({ title: `Run the ${brun.dataset.bankRun} bank on Perplexity?`, text: 'One Deep Research call, a few minutes. It replaces the bank on file and clears its approval.', ok: 'Run' }))) return; try { await api(`/api/blog-bank/${encodeURIComponent(brun.dataset.bankRun)}/run`, { method: 'POST' }); toast('Running: this page refreshes while it runs'); } catch (err) { toast(err.message, 'bad'); } return load(); }
    const blf = e.target.closest('[data-bank-load-file]');
    if (blf) { if (!(await confirm({ title: `Replace the ${blf.dataset.bankLoadFile} bank with the file in the deploy?`, text: 'The bank on file here is replaced by blog-bank/' + blf.dataset.bankLoadFile + '.md (the last local run) and its approval cleared.', ok: 'Load' }))) return; try { const s = await api(`/api/blog-bank/${encodeURIComponent(blf.dataset.bankLoadFile)}/load-file`, { method: 'POST' }); toast(`Loaded: ${s.counts.topics} topics, ${s.counts.cost_topics} cost topics, ${s.counts.seasonal_topics} seasonal topics`); load(); } catch (err) { toast(err.message, 'bad'); } return; }
    const bpaa = e.target.closest('[data-bank-paa]');
    if (bpaa) { if (!(await confirm({ title: `Replace the ${bpaa.dataset.bankPaa} bank's related questions with People also ask?`, text: 'One DataForSEO search per target question (Google UK, the standard queue, People also ask two clicks deep; a fraction of a cent each). Perplexity\'s targets, rules and windows stay; its related questions go. The bank is saved unapproved and the report kept.', ok: 'Run' }))) return; try { await api(`/api/blog-bank/${encodeURIComponent(bpaa.dataset.bankPaa)}/paa`, { method: 'POST' }); toast('People also ask pass started'); load(); } catch (err) { toast(err.message, 'bad'); } return; }
    const bpr = e.target.closest('[data-bank-paa-report]');
    if (bpr) { const d = dialog({ title: `${bpr.dataset.bankPaaReport}: People also ask report`, body: '<div class="skel" style="width:60%"></div>', wide: true }); try { const r = await api(`/api/blog-bank/${encodeURIComponent(bpr.dataset.bankPaaReport)}/paa-report`); d.el.innerHTML = `<pre class="small" style="white-space:pre-wrap;max-height:70vh;overflow:auto">${h(r.text)}</pre>`; } catch (err) { d.el.textContent = err.message; } return; }
    const ba = e.target.closest('[data-bank-approve]');
    if (ba) { const name = needName(); if (!name) return; if (!(await confirm({ title: `Approve the ${ba.dataset.bankApprove} bank as ${name}?`, text: 'The blog topic queue for every client in this trade will then draw on it.', ok: 'Approve' }))) return; try { await api(`/api/blog-bank/${encodeURIComponent(ba.dataset.bankApprove)}/approve`, { method: 'POST', body: { who: name } }); toast('Approved'); } catch (err) { toast(`Approve failed: ${err.message}`, 'bad'); } return load(); }
    const bu = e.target.closest('[data-bank-unapprove]');
    if (bu) { if (!(await confirm({ title: `Clear the approval on the ${bu.dataset.bankUnapprove} bank?`, text: 'The blog topic queue stops drawing on it until it is approved again.', ok: 'Unapprove', danger: true }))) return; try { await api(`/api/blog-bank/${encodeURIComponent(bu.dataset.bankUnapprove)}/unapprove`, { method: 'POST' }); toast('Unapproved'); } catch (err) { toast(err.message, 'bad'); } return load(); }
  });
  wire(root);
  await load();
  return () => clearTimeout(bankTimer);
}
