// audit.js — stub page module (full page comes in FEAT-003).
export default {
  route: 'audit',
  title: 'Audit Trail',
  async render(container) {
    const el = document.createElement('div');
    el.innerHTML =
      '<div class="page-header">' +
      '<h1 class="page-title">Audit Trail</h1>' +
      '<p class="page-subtitle">Operational event log</p>' +
      '</div>' +
      '<div class="card"><p>Audit Trail placeholder — full content arrives in a later feature.</p></div>';
    container.appendChild(el);
  },
  destroy() {},
};
