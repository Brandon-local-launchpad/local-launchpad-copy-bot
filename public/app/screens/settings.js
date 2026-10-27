// Settings (27 Oct 2026): API keys status (set or not, never the value), model routing per
// call type (read only: the brief changes no pipeline), LeadSnap, spend this month from the
// model log, users (the names used for "assigned to"), and who you are in this browser.
import { h, attr, api, card, table, pill, status, toast, tile, info, fmtDate, wire } from '../ui.js';
import { setUserName, userName } from '../shell.js';

export async function render(root, params, ctx) {
  ctx.setTitle('Settings');
  const s = await api('/api/settings');
  const sp = s.spend || {};
  const pounds = p => `£${((Number(p) || 0) / 100).toFixed(2)}`;
  root.innerHTML = `
    <div class="ph"><div class="ph-title"><h1>Settings</h1><div class="ph-meta">What is configured on the server, where each call goes, and what it cost this month</div></div></div>
    <div class="grid grid-4" style="margin-bottom:16px">
      ${tile({ label: 'Spend this month', value: sp.error ? '–' : pounds(sp.total_pence), tip: 'From the model log: every model call since the start of the month, priced per model and converted at 0.78 USD to GBP. Perplexity calls are not in it.', foot: sp.calls ? `${sp.calls} calls · ${h(sp.month)}` : sp.error ? h(sp.error) : 'no calls logged yet' })}
      ${tile({ label: 'API keys set', value: `${s.keys.filter(k => k.set).length}<span class="muted" style="font-size:18px"> / ${s.keys.length}</span>`, tip: 'Keys live in the environment (Railway variables or .env); this page only says whether each is set.' })}
      ${tile({ label: 'LeadSnap', value: s.leadsnap.token ? 'on' : 'off', small: true, tip: 'Rank scans run through LeadSnap. Every heatmap create or run spends credits; nothing here spends any.', foot: s.leadsnap.token ? '<button class="btn btn-ghost btn-xs" id="lsCheck">Check the account</button>' : 'LEADSNAP_API_TOKEN not set' })}
      ${tile({ label: 'Users', value: s.users.length, tip: 'The names used for "assigned to" on clients. Free text: type a name on any client.', foot: h(s.users.join(', ') || 'nobody assigned yet') })}
    </div>
    <div class="grid grid-2">
      ${card({ title: 'You, in this browser', sub: 'The name shown in the sidebar and used as "assigned to" by default', body: `<div class="btn-row"><input class="input" id="me" style="max-width:240px" value="${attr(userName())}" placeholder="your name"><button class="btn btn-primary btn-sm" id="saveMe">Save</button></div>` })}
      ${card({ title: 'API keys', sub: 'Set or not; the values never leave the server', body: `<ul class="list">${s.keys.map(k => `<li>${status(k.set ? 'ok' : 'none', k.set ? 'set' : 'not set')}<span>${h(k.label)}<span class="sub mono">${h(k.key)}</span></span></li>`).join('')}</ul>` })}
      ${card({ title: 'Model routing', sub: 'Which model each call type uses today, read from the code (display only)', body: `<ul class="list">${s.routing.map(r => `<li><span style="flex:1">${h(r.call)}<span class="sub">${h(r.where)}</span></span>${pill('accent', r.model || '?')}</li>`).join('')}</ul>` })}
      ${card({ title: 'Spend by call type and model', sub: sp.month ? `this month (${h(sp.month)})` : '', body: sp.by && sp.by.length ? table({ columns: [{ key: 'call_type', label: 'Call type', render: r => h(r.call_type || 'unlabelled') }, { key: 'model', label: 'Model' }, { key: 'calls', label: 'Calls', num: true }, { key: 'input_tokens', label: 'In', num: true, render: r => r.input_tokens.toLocaleString('en-GB') }, { key: 'output_tokens', label: 'Out', num: true, render: r => r.output_tokens.toLocaleString('en-GB') }, { key: 'pence', label: 'Cost', num: true, render: r => pounds(r.pence) }], rows: sp.by }) : '<div class="muted">No model calls logged yet this month. The log fills in as pages are written.</div>' })}
      ${card({ title: 'Last 20 calls', body: sp.last && sp.last.length ? table({ columns: [{ key: 'at', label: 'When', render: r => h(fmtDate(r.at, true)) }, { key: 'call_type', label: 'Call', render: r => `${h(r.call_type || '')}${r.page_key ? `<span class="sub">${h(r.page_type || '')} ${h(r.page_key)}</span>` : ''}` }, { key: 'model', label: 'Model' }, { key: 'output_tokens', label: 'Out', num: true }, { key: 'cost_pence', label: 'Cost', num: true, render: r => pounds(r.cost_pence) }], rows: sp.last }) : '<div class="muted">Nothing yet.</div>' })}
      ${card({ title: 'Fillout', body: `<dl class="kv"><dt>Form link</dt><dd>${s.fillout_form_url ? h(s.fillout_form_url) : '<span class="muted">FILLOUT_FORM_URL not set: the wizard cannot show the link to send</span>'}</dd><dt>Webhook</dt><dd>${s.keys.find(k => k.key === 'FILLOUT_WEBHOOK_SECRET').set ? 'secret set' : 'secret not set'}</dd></dl>` })}
    </div>`;
  root.querySelector('#saveMe').addEventListener('click', () => { setUserName(root.querySelector('#me').value.trim()); toast('Saved in this browser'); });
  const ls = root.querySelector('#lsCheck');
  if (ls) ls.addEventListener('click', async () => { ls.disabled = true; ls.textContent = 'Checking…'; try { const r = await api('/api/settings/leadsnap'); ls.replaceWith(Object.assign(document.createElement('span'), { className: 'small', textContent: `${r.companies.length} compan${r.companies.length === 1 ? 'y' : 'ies'} on the account` })); } catch (e) { ls.disabled = false; ls.textContent = 'Check the account'; toast(e.message, 'bad'); } });
  wire(root);
}
