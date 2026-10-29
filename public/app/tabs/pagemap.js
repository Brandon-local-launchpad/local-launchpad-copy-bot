// Page map tab (27 Oct 2026): the existing view (phases, excludes, link planner, volumes, H1s),
// ported as is from the onboarding record page's Pages panel.
import { loadRecordPanels, recordContainer } from './legacy.js';

export async function render(el, ctx) {
  // Locations first (30 Oct): until the list is approved the town pages here come from the record and may change
  const row = ctx.row || {};
  const notice = !row.locations_approved ? `<div class="notice warn" style="margin-bottom:14px"><strong>Locations not approved yet: town pages may change.</strong> The location and location category pages below come from the record's town list. Approve the list on the <a href="/clients/${ctx.clientId}/locations" data-link>Locations tab</a>, which regenerates the page map.</div>` : row.locations_changed ? `<div class="notice warn" style="margin-bottom:14px"><strong>Locations changed since approval.</strong> A newer locations run exists: approve again on the <a href="/clients/${ctx.clientId}/locations" data-link>Locations tab</a> to regenerate the town pages.</div>` : '';
  el.innerHTML = `${notice}<section class="card">${recordContainer({ menu: false })}</section>`;
  const RP = await loadRecordPanels();
  await RP.mount(el.querySelector('.legacy'), ctx.clientId, 'pages');
}
