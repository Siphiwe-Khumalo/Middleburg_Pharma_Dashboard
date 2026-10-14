// settings.js — stub page module (full page comes in FEAT-003).
export default {
  route: 'settings',
  title: 'Settings',
  async render(container) {
    const el = document.createElement('div');
    el.innerHTML =
      '<div class="page-header">' +
      '<h1 class="page-title">Settings</h1>' +
      '<p class="page-subtitle">Thresholds, mode and facility information</p>' +
      '</div>' +
      '<div class="card"><p>Settings placeholder — full content arrives in a later feature.</p></div>';
    container.appendChild(el);
  },
  destroy() {},
};
