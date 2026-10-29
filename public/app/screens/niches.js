// Niche library (27 Oct 2026): one page per niche: the calibration pack status, the briefs by
// page type and business type, the work nouns and words, the services library (Brandon's
// verdict per GBP service name), the clients on it. Read only: the files the code reads are
// the only copy (niche-library/<niche>.json and .csv).

import { h, attr, api, card, table, pill, status, empty, fmtDate, wire } from '../ui.js';

export async function render(root, params, ctx) {
  if (!params.niche) return renderList(root, ctx);
  ctx.setTitle('Niche library');
  let d;
  try { d = await api(`/api/niche-library/${encodeURIComponent(params.niche)}`); }
  catch (e) { root.innerHTML = `<div class="card"><div class="state failed"><h3>Niche not found</h3><p>${h(e.message)}</p><a class="btn btn-ghost" href="/niches" data-link>Niche library</a></div></div>`; return; }
  ctx.setTitle(d.label);
  const E = d.entry || {};
  const list = (title, arr) => Array.isArray(arr) && arr.length ? `<div class="sec-title">${h(title)}</div><div class="chips">${arr.map(x => `<span class="chip" style="cursor:default">${h(typeof x === 'string' ? x : x.name || x.label || JSON.stringify(x))}</span>`).join('')}</div>` : '';
  const kv = (title, obj) => obj && typeof obj === 'object' && Object.keys(obj).length ? `<div class="sec-title">${h(title)}</div><dl class="kv">${Object.entries(obj).map(([k, v]) => `<dt>${h(k)}</dt><dd>${h(typeof v === 'string' ? v : Array.isArray(v) ? v.join(', ') : JSON.stringify(v))}</dd>`).join('')}</dl>` : '';
  const briefCard = (title, blocks) => {
    if (!blocks || !Object.keys(blocks).length) return card({ title, body: empty({ title: 'No briefs for this niche yet', text: 'A new niche is a new section in the niche .json and .md, not code.' }) });
    return card({ title, sub: `by business type: ${Object.keys(blocks).join(', ')}`, body: Object.entries(blocks).map(([type, b]) => `<details style="margin-bottom:8px"><summary style="cursor:pointer;font-weight:500">Type ${h(type)}</summary><pre class="block" style="margin-top:6px">${h(JSON.stringify(b, null, 2))}</pre></details>`).join('') });
  };
  const verdict = v => ({ page: 'ok', alias: 'accent', fold: 'wait', exclude: 'none' })[String(v || '').toLowerCase()] || '';
  const svcCols = [{ key: 'name', label: 'GBP service name', render: r => h(r.name || r.service || r.gbp_name || '') }, { key: 'gbp_category', label: 'GBP category', render: r => h(r.gbp_category || r.category || '') }, { key: 'verdict', label: 'Verdict', render: r => { const v = r.verdict || r.decision || r.action || ''; return v ? pill(verdict(v), v) : ''; } }, { key: 'uk_name', label: 'UK page name or target', render: r => h(r.uk_name || r.page_name || r.target || r.fold_into || r.alias_of || '') }, { key: 'note', label: 'Note', render: r => h(r.note || r.notes || '') }];
  root.innerHTML = `
    <div class="crumbs"><a href="/niches" data-link>Niche library</a> / ${h(d.label)}</div>
    <div class="ph"><div class="ph-title"><h1>${h(d.label)}</h1><div class="ph-meta"><span>niche-library/${h(d.stem)}.json</span>${d.entry ? pill('ok', 'entry') : pill('none', 'no entry')}${d.services.length ? pill('ok', `${d.services.length} services`) : pill('none', 'no services library')}${d.pack.exists ? pill('ok', `calibration pack v${d.pack.version || '?'}`) : pill('wait', 'no calibration pack')}${d.trade_facts_block ? pill('ok', 'trade facts block') : pill('none', 'no trade facts block')}</div></div></div>
    <div class="grid grid-2">
      ${card({ title: 'Calibration pack', body: d.pack.exists ? `<dl class="kv"><dt>File</dt><dd>${h(d.pack.file)}</dd><dt>Version</dt><dd>${h(d.pack.version || '?')}</dd><dt>Changed</dt><dd>${h(fmtDate(d.pack.modified, true))}</dd><dt>Size</dt><dd>${Math.round(d.pack.size / 1024)} KB</dd></dl>` : empty({ title: 'No calibration pack', text: 'The homepage and page prompts send the pack as the model\'s style guide. Add <Trade>_Calibration_Pack_vN.md at the repo root.' }) })}
      ${card({ title: 'Clients on this niche', body: d.clients.length ? `<ul class="list">${d.clients.map(c => `<li><a href="/clients/${h(c.id)}" data-link>${h(c.name)}</a>${c.archived ? ' <span class="tag">archived</span>' : ''}</li>`).join('')}</ul>` : empty({ title: 'No clients yet' }) })}
    </div>
    <div class="stack" style="margin-top:16px">
      ${d.entry ? card({ title: 'Words and nouns', sub: 'What the copy may and may not say for this trade', body: kv('Identity', { trade: E.trade, trade_person: E.trade_person, trade_person_plural: E.trade_person_plural, customer_type: E.customer_type, unit_of_work: E.unit_of_work, business_type_default: E.business_type_default, emergency_niche: E.emergency_niche, schema_subtype: E.schema_subtype }) + list('Words to use', E.words_use) + list('Words to avoid', E.words_avoid) + kv('Category work nouns', E.category_work_nouns) + list('Core services', E.core_services) + list('Priority services', E.priority_services) + list('Fears', E.fears) + kv('Service words (GBP name → homeowner words)', E.service_words) }) : card({ title: 'Niche entry', body: empty({ title: 'No niche entry yet', text: 'The landscaper and roofer entries are the model: a new niche is a new .md and its .json.' }) })}
      ${briefCard('Category page briefs', E.category_page_blocks)}
      ${briefCard('Service page briefs', E.service_page_blocks)}
      ${briefCard('Location page briefs', E.location_page_blocks)}
      ${card({ flat: true, title: '', body: `<div class="tbl-tools"><strong>Services library</strong><span class="muted small">Brandon's verdict per Google Business Profile service name: page as the UK name, alias, fold, exclude</span></div>${table({ columns: svcCols, rows: d.services, emptyText: 'No services library for this niche: add niche-library/<niche>.csv.' })}` })}
      ${d.categories.length ? card({ flat: true, body: `<div class="tbl-tools"><strong>Category hubs</strong></div>${table({ columns: [{ key: 'gbp_category', label: 'GBP category' }, { key: 'hub', label: 'Hub' }, { key: 'note', label: 'Note' }], rows: d.categories })}` }) : ''}
    </div>`;
  wire(root);
}

async function renderList(root, ctx) {
  ctx.setTitle('Niche library');
  const { niches } = await api('/api/niche-library');
  const columns = [
    { key: 'label', label: 'Niche', cls: 'no-label', render: n => `<span class="primary">${h(n.label)}</span><span class="sub">${h(n.stem)}</span>` },
    { key: 'ready', label: 'Status', render: n => status(n.ready ? 'ok' : n.has.services ? 'wait' : 'none', n.ready ? 'ready to write' : n.has.services ? 'services only' : 'not set up') },
    { key: 'entry', label: 'Entry', render: n => n.has.entry ? pill('ok', 'yes') : pill('none', 'no') },
    { key: 'services', label: 'Services library', render: n => n.has.services ? pill('ok', 'yes') : pill('none', 'no') },
    { key: 'pack', label: 'Calibration pack', render: n => n.has.pack ? pill('ok', 'yes') : pill('none', 'no') },
    { key: 'tf', label: 'Trade facts block', render: n => n.has.trade_facts_block ? pill('ok', 'yes') : pill('none', 'no') },
    { key: 'clients', label: 'Clients', num: true },
  ];
  root.innerHTML = `<div class="ph"><div class="ph-title"><h1>Niche library</h1><div class="ph-meta">${niches.length} niches · ${niches.filter(n => n.ready).length} ready to write (entry, services library and calibration pack)</div></div></div>
    <section class="card card-flat">${table({ columns, rows: niches, rowHref: n => `/niches/${n.key}`, cards: true })}</section>`;
  wire(root);
}
