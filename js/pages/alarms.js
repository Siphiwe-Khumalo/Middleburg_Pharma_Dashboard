// alarms.js — stub page module (full page comes in FEAT-003).
export default {
  route: 'alarms',
  title: 'Alarm Register',
  async render(container) {
    const el = document.createElement('div');
    el.innerHTML =
      '<div class="page-header">' +
      '<h1 class="page-title">Alarm Register</h1>' +
      '<p class="page-subtitle">Active, acknowledged and cleared events</p>' +
      '</div>' +
      '<div class="card"><p>Alarm Register placeholder — full content arrives in a later feature.</p></div>';
    container.appendChild(el);
  },
  destroy() {},
};
