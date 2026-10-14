// app.js — shell render (header + sidebar + demo-banner slot), store wiring,
// header clock, hamburger/overlay drawer, and the hash router bootstrap.
// Header + sidebar are rendered ONCE and never re-created on navigation (AC-4).

import { store } from './store.js';
import { dataService } from './services/dataService.js';
import * as config from './config/config.js';
import * as formatters from './util/format.js';
import { createRouter } from './router.js';
import { renderDemoBanner } from './components/demoBanner.js';
import { icons } from './components/icons.js';
import { classify, effective } from './config/thresholds.js';

// Expose pure functions + singletons for in-browser console verification
// (design §9/§10). Not used by application code paths.
if (typeof window !== 'undefined') {
  window.store = store;
  window.classify = classify;
  window.effective = effective;
  window.directionsUrl = config.directionsUrl;
  window.computeQuality = formatters.computeQuality;
  window.config = config;
  // dataService.* methods for console checks (dataService also self-exposes).
  window.getOverviewMetrics = (...a) => dataService.getOverviewMetrics(...a);
  window.getZones = (...a) => dataService.getZones(...a);
  window.getNotificationStatus = (...a) => dataService.getNotificationStatus(...a);
}

const NAV = [
  { key: 'overview',      label: 'Overview',               icon: 'overview' },
  { key: 'environmental', label: 'Environmental Conditions', icon: 'environmental' },
  { key: 'hvac',          label: 'HVAC Systems',           icon: 'hvac' },
  { key: 'alarms',        label: 'Alarm Register',         icon: 'alarms' },
  { key: 'trends',        label: 'Trends & Reports',       icon: 'trends' },
  { key: 'audit',         label: 'Audit Trail',            icon: 'audit' },
  { key: 'settings',      label: 'Settings',               icon: 'settings' },
];

// Per-mode header string mapping. The connection status NEVER reads
// LIVE/CONNECTED while serving demo data (S-4) — owned by this single path.
function headerStateFor(mode) {
  switch (mode) {
    case 'connected':
      return {
        service: { cls: 'is-unavailable', label: 'Monitoring: Unavailable — backend not configured' },
        conn: 'Not connected — backend not configured',
        modeLabel: 'Connected',
      };
    case 'offline':
      return {
        service: { cls: 'is-unavailable', label: 'Monitoring: Unavailable' },
        conn: 'Offline — link unavailable',
        modeLabel: 'Offline',
      };
    case 'demo':
    default:
      return {
        service: { cls: 'is-operational', label: 'Monitoring: Operational (demo)' },
        conn: 'Demo — illustrative data',
        modeLabel: 'Demo',
      };
  }
}

function boot() {
  const header = document.querySelector('.app-header');
  const sidebarNav = document.querySelector('.app-sidebar ul');
  const navToggle = document.querySelector('.nav-toggle');
  const sidebar = document.querySelector('.app-sidebar');
  const scrim = document.querySelector('.scrim');
  const bannerSlot = document.getElementById('demo-banner-slot');
  const view = document.getElementById('view');

  // --- Demo banner (S-3): single always-present instance under the header.
  bannerSlot.appendChild(renderDemoBanner());

  // --- Sidebar nav (rendered once).
  sidebarNav.innerHTML = NAV.map((n) =>
    `<li><a class="nav-item" href="#/${n.key}" data-route="${n.key}">` +
    `${icons[n.icon]}<span class="nav-label">${n.label}</span></a></li>`
  ).join('');

  function setActiveNav(key) {
    sidebarNav.querySelectorAll('.nav-item').forEach((a) => {
      a.classList.toggle('is-active', a.getAttribute('data-route') === key);
    });
  }

  // --- Header render (the single S-4 invariant owner).
  function renderHeader() {
    const mode = store.get('mode') || 'demo';
    const s = headerStateFor(mode);
    let activeCount = 0;
    const alarmsEnv = store.get('_activeAlarmCount');
    activeCount = typeof alarmsEnv === 'number' ? alarmsEnv : 0;

    header.innerHTML =
      '<div class="hdr-left">' +
        `<button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">${icons.menu}</button>` +
        '<div class="hdr-identity">' +
          `<span class="hdr-facility">${config.facility.name}</span>` +
          `<span class="hdr-location">${config.facility.locationLabel}</span>` +
        '</div>' +
      '</div>' +
      '<div class="hdr-right">' +
        `<span class="hdr-pill hdr-service"><span class="hdr-dot ${s.service.cls}"></span>${s.service.label}</span>` +
        `<span class="hdr-pill hdr-conn"><span class="hdr-dot is-unavailable"></span>${s.conn}</span>` +
        `<span class="hdr-pill hdr-mode">${s.modeLabel}</span>` +
        `<time class="hdr-clock"></time>` +
        `<button class="hdr-bell" aria-label="Active alarms">${icons.bell}` +
          (activeCount > 0 ? `<span class="hdr-bell-badge">${activeCount}</span>` : '') +
        '</button>' +
      '</div>';

    updateClock();
    wireHeaderControls();
  }

  // --- Live clock (header persists; interval lives for app lifetime).
  function updateClock() {
    const clock = header.querySelector('.hdr-clock');
    if (clock) clock.textContent = formatters.formatTimestamp(new Date());
  }
  setInterval(updateClock, 1000);

  // --- Drawer open/close with focus management + scrim/Escape/nav dismiss.
  let lastToggle = null;
  function openDrawer() {
    sidebar.classList.add('is-open');
    scrim.classList.add('is-open');
    lastToggle = header.querySelector('.nav-toggle');
    if (lastToggle) lastToggle.setAttribute('aria-expanded', 'true');
    const first = sidebar.querySelector('.nav-item');
    if (first) first.focus();
  }
  function closeDrawer() {
    sidebar.classList.remove('is-open');
    scrim.classList.remove('is-open');
    const toggle = header.querySelector('.nav-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    if (lastToggle) { lastToggle.focus(); lastToggle = null; }
  }

  function wireHeaderControls() {
    const toggle = header.querySelector('.nav-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        if (sidebar.classList.contains('is-open')) closeDrawer();
        else openDrawer();
      });
    }
    const bell = header.querySelector('.hdr-bell');
    if (bell) bell.addEventListener('click', () => { location.hash = '#/alarms'; });
  }

  scrim.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('is-open')) closeDrawer();
  });
  sidebarNav.addEventListener('click', (e) => {
    if (e.target.closest('.nav-item')) closeDrawer();
  });

  // --- Keep the header's active-alarm badge in sync with the data layer.
  async function refreshAlarmCount() {
    const env = await dataService.getAlarms({ state: 'active' });
    const count = env.status === 'ok' && Array.isArray(env.data) ? env.data.length : 0;
    if (store.get('_activeAlarmCount') !== count) {
      store.set('_activeAlarmCount', count); // triggers header re-render via subscription
    } else {
      renderHeader();
    }
  }

  // Re-render header on any store change (mode / alarm / ack state).
  store.subscribe(() => renderHeader());

  // --- Router.
  const ctx = { dataService, config, store, formatters };
  const router = createRouter({
    view,
    ctx,
    onRouteChange: (key) => { setActiveNav(key); refreshAlarmCount(); },
  });

  renderHeader();
  refreshAlarmCount();
  router.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
