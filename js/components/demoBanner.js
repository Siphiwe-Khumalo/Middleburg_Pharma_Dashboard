// demoBanner.js — the always-present per-page demonstration-data banner (S-3).
// Rendered by the shell into a fixed slot under the header so it cannot be
// forgotten on any page, including not-found.

export function renderDemoBanner() {
  const el = document.createElement('div');
  el.className = 'demo-banner';
  el.setAttribute('role', 'note');
  el.innerHTML =
    '<span aria-hidden="true">●</span>' +
    '<span><strong>Demonstration data</strong> — all readings on this page are ' +
    'illustrative placeholders, not real site measurements.</span>';
  return el;
}
