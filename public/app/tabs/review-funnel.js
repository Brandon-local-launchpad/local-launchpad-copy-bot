// The Review Us page card on the Reviews tab (12 Nov 2026, Brandon). The page on the client's site:
// 4 or 5 stars goes to their Google review page, 1 to 3 stars opens a private form. This card shows
// the Google link the page will use and where it came from, who the private feedback is emailed to,
// the one button that sends the page's settings to the site, and every private feedback message,
// with whether the client was told. It loads by itself: a failure here does not stop the rest of
// the tab, and the other way round.

import { h, attr, api, card, toast, confirm, empty, failed, pill, fmtDate } from '../ui.js';

const stars = n => `<span style="color:#b45309">${'★'.repeat(n || 0)}</span>`;

export async function mountFunnel(host, ctx, by) {
  const url = `/api/clients/${ctx.clientId}/review-funnel`;
  let V = null;

  const line = (label, value) => `<div style="display:grid;grid-template-columns:minmax(120px,190px) 1fr;gap:4px 12px;margin-bottom:8px"><div class="small muted">${h(label)}</div><div class="small">${value}</div></div>`;

  const setUp = () => {
    const link = V.link.url
      ? `<a href="${attr(V.link.url)}" target="_blank" rel="noopener">${h(V.link.url)}</a> ${V.link.source === 'typed' ? pill('none', 'Typed on the Record tab') : pill('ok', 'Built from the Google listing')}`
      : `${pill('block', 'None')} Confirm the Google listing on the Record tab and it is built from that. Until then 4 and 5 stars get a thank you and no Google button.`;
    const client = V.client_email ? h(V.client_email) : `${pill('block', 'No email on the record')} Feedback goes to the team only until the client's email is on the Record tab.`;
    const site = V.site ? `<a href="${attr(V.site.url)}/review-us/" target="_blank" rel="noopener">${h(V.site.url)}</a>${V.site.staging ? ` ${pill('none', 'Staging')}` : ''}` : `${pill('none', 'Not connected')} Connect the client's WordPress site first (the WordPress card).`;
    const sent = !V.sent ? pill('wait', 'Not sent to the site yet')
      : `${V.changed ? pill('wait', 'Changed since it was sent: send again') : pill('ok', 'Sent')} <span class="muted">${h(fmtDate(V.sent.at, true))}${V.sent.by ? ` by ${h(V.sent.by)}` : ''}, to ${h(V.sent.to)}</span>`;
    const mail = V.mail_on ? '' : '<div class="notice bad small" style="margin:8px 0">Email is not connected on this server, so nobody is emailed. Feedback is still kept here.</div>';
    return `${line('Google review link', link)}${line('Private feedback goes to', client)}${line('Copy to', h(V.team_email))}${line('Site', site)}${line('Settings on the site', sent)}${mail}
      <div class="small muted" style="margin-top:8px">On the site the page needs Copybot plugin 0.5.0 or later, and the <code>[llp_review_funnel]</code> shortcode where the star box goes.</div>
      <div class="btn-row" style="margin-top:10px"><button class="btn btn-primary" data-rf="send" ${V.site ? '' : 'disabled'}>${V.sent ? 'Send to the site again' : 'Send to the site'}</button></div>`;
  };

  const feedback = () => {
    if (!V.feedback.length) return empty({ title: 'No private feedback yet', text: 'A customer who taps 1 to 3 stars and fills in the form shows here.' });
    const state = f => {
      if (f.client_emailed_at) return `${pill('ok', 'Client emailed')}<div class="small muted">${h(f.client_email)} · ${h(fmtDate(f.client_emailed_at, true))}</div>`;
      if (f.handled_at) return `${pill('ok', 'Passed on by hand')}<div class="small muted">${f.handled_by ? `${h(f.handled_by)} · ` : ''}${h(fmtDate(f.handled_at, true))}</div>`;
      return `${pill('block', 'The client has not had this')}<div class="small" style="color:#b91c1c">${h(f.client_error || 'Not sent.')}</div>
        <div class="btn-row" style="margin-top:6px"><button class="btn btn-ghost" data-rf="resend" data-id="${attr(f.id)}">Send again</button><button class="btn btn-ghost" data-rf="handled" data-id="${attr(f.id)}">I passed it on</button></div>`;
    };
    const team = f => (f.team_emailed_at ? '' : `<div class="small" style="color:#b91c1c;margin-top:4px">The team copy did not send${f.team_error ? `: ${h(f.team_error)}` : '.'}</div>`);
    const row = f => `<tr><td style="white-space:nowrap">${stars(f.stars)}<div class="small muted">${h(fmtDate(f.received_at, true))}</div></td>
      <td class="small"><strong>${h(f.name)}</strong><div>${f.phone ? h(f.phone) : '<span class="muted">No phone</span>'}</div><div>${f.email ? h(f.email) : '<span class="muted">No email</span>'}</div></td>
      <td class="small" style="white-space:pre-wrap">${h(f.feedback)}</td><td>${state(f)}${team(f)}</td></tr>`;
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Stars</th><th>Customer</th><th>What they said</th><th>Client told</th></tr></thead><tbody>${V.feedback.map(row).join('')}</tbody></table></div>`;
  };

  const draw = () => {
    const waiting = V.feedback.filter(f => f.waiting).length;
    host.innerHTML = card({
      title: 'Review Us page', sub: '4 and 5 stars go to Google. 1 to 3 stars come here in private, and the client is emailed',
      body: `${setUp()}
        <hr style="border:0;border-top:1px solid var(--border);margin:14px 0 12px">
        <div class="small" style="margin-bottom:8px"><strong>Private feedback</strong>${waiting ? ` ${pill('block', `${waiting} the client has not had`)}` : ''}</div>
        ${feedback()}`,
    });
  };

  const load = async () => {
    try { V = await api(url); draw(); }
    catch (e) { console.error('[review-funnel]', e); host.innerHTML = failed({ title: 'The Review Us page card could not load', reason: e.message, retry: '<button class="btn btn-ghost" data-rf="reload">Retry</button>' }); }
  };

  host.addEventListener('click', async e => {
    const b = e.target.closest('[data-rf]');
    if (!b) return;
    const act = b.dataset.rf;
    if (act === 'reload') { await load(); return; }
    if (act === 'send') {
      const what = `the company name (${V.values.company_name || 'blank'}), the owner name (${V.values.owner_name || 'blank, so nothing is shown'}) and the Google review link (${V.link.url ? (V.link.source === 'typed' ? 'the one typed on the Record tab' : 'built from the Google listing') : 'none yet, so 4 and 5 stars get a thank you only'})`;
      if (!(await confirm({ title: `Send the Review Us settings to ${V.site.url}?`, text: `This writes to the client's site: the address private feedback is sent to, ${what}. Nothing else on the site is changed.`, ok: 'Send to the site' }))) return;
    }
    b.disabled = true;
    const label = b.textContent;
    try {
      if (act === 'send') { b.textContent = 'Sending…'; V = await api(`${url}/send-to-site`, { method: 'POST', body: { confirm: true, by: by() } }); toast('Sent to the site'); draw(); }
      if (act === 'resend') {
        b.textContent = 'Sending…';
        V = await api(`${url}/feedback/${encodeURIComponent(b.dataset.id)}/resend`, { method: 'POST' });
        const f = V.feedback.find(x => x.id === b.dataset.id);
        toast(f && f.client_emailed_at ? 'Sent to the client' : `Still not sent: ${(f && f.client_error) || 'no reason given'}`, f && f.client_emailed_at ? '' : 'bad');
        draw();
      }
      if (act === 'handled') { V = await api(`${url}/feedback/${encodeURIComponent(b.dataset.id)}/handled`, { method: 'POST', body: { by: by() } }); toast('Marked as passed on'); draw(); }
    } catch (err) { console.error('[review-funnel]', err); toast(err.message, 'bad'); }
    finally { if (b.isConnected) { b.disabled = false; b.textContent = label; } }
  });

  await load();
}
