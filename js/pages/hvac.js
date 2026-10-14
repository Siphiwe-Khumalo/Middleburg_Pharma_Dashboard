// hvac.js — stub page module (full page comes in FEAT-003).
export default {
  route: 'hvac',
  title: 'HVAC Systems',
  async render(container) {
    const el = document.createElement('div');
    el.innerHTML =
      '<div class="page-header">' +
      '<h1 class="page-title">HVAC Systems</h1>' +
      '<p class="page-subtitle">Equipment status and measured values</p>' +
      '</div>' +
      '<div class="card"><p>HVAC Systems placeholder — full content arrives in a later feature.</p></div>';
    container.appendChild(el);
  },
  destroy() {},
};
