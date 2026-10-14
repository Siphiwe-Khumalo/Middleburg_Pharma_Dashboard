// environmental.js — stub page module (full page comes in FEAT-003).
export default {
  route: 'environmental',
  title: 'Environmental Conditions',
  async render(container) {
    const el = document.createElement('div');
    el.innerHTML =
      '<div class="page-header">' +
      '<h1 class="page-title">Environmental Conditions</h1>' +
      '<p class="page-subtitle">Temperature and humidity by zone</p>' +
      '</div>' +
      '<div class="card"><p>Environmental Conditions placeholder — full content arrives in a later feature.</p></div>';
    container.appendChild(el);
  },
  destroy() {},
};
