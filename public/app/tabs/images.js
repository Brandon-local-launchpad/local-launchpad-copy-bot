// Images tab (27 Oct 2026): slots per page with the pick and runners-up, swap, approve: not built yet.
import { card, empty } from '../ui.js';
export async function render(el) {
  el.innerHTML = card({ title: 'Images', sub: 'One slot per page: the pick and its runners-up, swap, approve.', body: empty({ title: 'Images are not built yet', text: 'When the image step lands, each page gets its slots here with the picked image, the runners-up, Swap and Approve.' }) });
}
