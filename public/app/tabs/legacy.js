// Loads the ported onboarding record panels (public/app/legacy/record-panels.js, a classic
// script with window.RecordPanels) once, with their scoped stylesheet.
let loading = null;
export function loadRecordPanels() {
  if (window.RecordPanels) return Promise.resolve(window.RecordPanels);
  if (loading) return loading;
  if (!document.querySelector('link[data-legacy-css]')) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/app/legacy/record.css'; l.dataset.legacyCss = '1'; document.head.appendChild(l);
  }
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script'); s.src = '/app/legacy/record-panels.js';
    s.onload = () => resolve(window.RecordPanels); s.onerror = () => reject(new Error('The record panels did not load'));
    document.head.appendChild(s);
  });
  return loading;
}

// The container the old script expects: the header bits (score ring, saved, review and archive
// buttons), the H1 progress bar, the menu and the main panel
export function recordContainer({ menu = true } = {}) {
  return `<div class="legacy">
    <div class="btn-row" style="margin-bottom:12px;${menu ? '' : 'display:none'}">
      <span class="score" id="score" style="display:none"><span class="ring" id="ring"></span><span id="scoreText"></span></span>
      <span class="saved" id="saved"></span>
      <span class="spacer" style="flex:1"></span>
      <button class="btn btn-ghost btn-sm" id="reviewBtn" onclick="toggleReviewed()" style="display:none"></button>
      <button class="btn btn-ghost btn-sm" id="reprocessBtn" onclick="reprocess()" style="display:none" title="Rebuild this record from the stored submission. Typed-in fields are kept.">Reprocess</button>
      <button class="btn btn-ghost btn-sm" id="archiveBtn" onclick="toggleArchived()" style="display:none"></button>
    </div>
    <div id="h1bar" class="h1bar" hidden></div>
    <div class="wrap${menu ? '' : ' no-menu'}">
      <aside${menu ? '' : ' style="display:none"'}><select class="menu-select" id="menuSelect" onchange="go(this.value)"></select><div class="menu-list" id="menu"></div></aside>
      <main id="main"><div class="empty">Loading…</div></main>
    </div></div>`;
}
