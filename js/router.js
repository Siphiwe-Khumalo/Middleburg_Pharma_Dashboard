// router.js — hash parsing, route table, page lifecycle (render/destroy),
// and in-app not-found view. Swaps only <main>; header/sidebar persist.

import overview from './pages/overview.js';
import environmental from './pages/environmental.js';
import hvac from './pages/hvac.js';
import alarms from './pages/alarms.js';
import trends from './pages/trends.js';
import audit from './pages/audit.js';
import settings from './pages/settings.js';

export const routes = {
  overview,
  environmental,
  hvac,
  alarms,
  trends,
  audit,
  settings,
};

// Parse location.hash -> route key. '' or '#/' -> 'overview'. Unknown -> null.
export function parseHash(hash) {
  const raw = (hash || '').replace(/^#\/?/, '').split('?')[0].trim();
  if (raw === '') return 'overview';
  return Object.prototype.hasOwnProperty.call(routes, raw) ? raw : null;
}

function notFoundPage(key) {
  return {
    route: 'not-found',
    title: 'Page not found',
    async render(container) {
      const el = document.createElement('div');
      el.innerHTML =
        '<div class="card not-found">' +
        '<h1 class="page-title">Page not found</h1>' +
        `<p class="page-subtitle">No page is mapped to <code>#/${key || ''}</code>.</p>` +
        '<p><a href="#/overview">Return to Overview</a></p>' +
        '</div>';
      container.appendChild(el);
    },
    destroy() {},
  };
}

export function createRouter({ view, ctx, onRouteChange }) {
  let current = null;

  async function navigate() {
    const key = parseHash(location.hash);
    const page = key ? routes[key] : notFoundPage(location.hash.replace(/^#\/?/, ''));

    if (current && typeof current.destroy === 'function') {
      current.destroy();
    }
    view.innerHTML = '';
    current = page;
    await page.render(view, ctx);
    if (typeof onRouteChange === 'function') onRouteChange(key, page);
  }

  function start() {
    window.addEventListener('hashchange', navigate);
    if (!location.hash) location.hash = '#/overview';
    else navigate();
  }

  return { start, navigate };
}
