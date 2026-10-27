// Placeholder until this screen is built (UI redesign, 27 Oct 2026)
import { card, empty } from '../ui.js';
export async function render(root, params, ctx) {
  ctx.setTitle('trade-facts');
  root.innerHTML = card({ body: empty({ title: 'Not built yet', text: 'The trade-facts screen is next in the build order. The old page still works meanwhile.' }) });
}
