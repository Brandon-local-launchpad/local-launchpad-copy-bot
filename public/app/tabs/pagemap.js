// Page map tab (27 Oct 2026): the existing view (phases, excludes, link planner, volumes, H1s),
// ported as is from the onboarding record page's Pages panel.
import { loadRecordPanels, recordContainer } from './legacy.js';

export async function render(el, ctx) {
  el.innerHTML = `<section class="card">${recordContainer({ menu: false })}</section>`;
  const RP = await loadRecordPanels();
  await RP.mount(el.querySelector('.legacy'), ctx.clientId, 'pages');
}
