// facilityMap.js — Leaflet wrapper (design 7). Renders an OSM map centred on
// config.location.marker with a marker + popup, visible attribution, a caption
// of config.location.mapLabel, and a Google Maps directions link. Degrades to
// an address fallback card when Leaflet is unavailable or tiles repeatedly
// error (AC-24). destroy() frees the Leaflet instance to avoid the
// 'map container already initialized' error on re-navigation.
//
// Presentational: receives config via its options; it reads nothing async.

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Build the fallback address card (no decorative static map image, AC-24).
function fallbackCard(cfg) {
  const el = document.createElement('div');
  el.className = 'map-fallback card';
  el.innerHTML =
    '<p class="map-fallback-title">Facility location</p>' +
    `<p class="map-fallback-name">${escapeHtml(cfg.facilityName)}</p>` +
    `<p class="map-fallback-addr">${escapeHtml(cfg.suppliedAddress)}</p>` +
    `<p class="map-label">${escapeHtml(cfg.mapLabel)}</p>` +
    `<p class="map-attribution">${escapeHtml(cfg.attribution)}</p>` +
    `<p><a class="map-directions" href="${escapeHtml(cfg.directionsUrl)}" target="_blank" rel="noopener">Open in Google Maps</a></p>`;
  return el;
}

export function createFacilityMap(opts = {}) {
  const cfg = {
    marker: opts.marker || { lat: -25.7993, lon: 29.4698 },
    facilityName: opts.facilityName || '',
    suppliedAddress: opts.suppliedAddress || '',
    mapLabel: opts.mapLabel || '',
    attribution: opts.attribution || '© OpenStreetMap contributors',
    directionsUrl: opts.directionsUrl || '#',
    zoom: opts.zoom || 16,
  };

  const root = document.createElement('div');
  root.className = 'facility-map-wrap';

  let map = null;
  let resizeObserver = null;
  let tileErrorCount = 0;
  let tileErrorWindowStart = 0;
  let fallenBack = false;

  function mountFallback() {
    if (fallenBack) return;
    fallenBack = true;
    teardownMap();
    root.innerHTML = '';
    root.appendChild(fallbackCard(cfg));
  }

  function teardownMap() {
    if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
    if (map) {
      try { map.remove(); } catch (_) { /* already removed */ }
      map = null;
    }
  }

  function mountMap() {
    // Map surface + caption + directions link.
    const surface = document.createElement('div');
    surface.className = 'facility-map';
    const caption = document.createElement('p');
    caption.className = 'map-label';
    caption.textContent = cfg.mapLabel; // exact string (S-12)
    const dir = document.createElement('p');
    dir.innerHTML =
      `<a class="map-directions" href="${escapeHtml(cfg.directionsUrl)}" target="_blank" rel="noopener">Open in Google Maps</a>`;

    root.innerHTML = '';
    root.appendChild(surface);
    root.appendChild(caption);
    root.appendChild(dir);

    map = L.map(surface, { zoomControl: true }).setView([cfg.marker.lat, cfg.marker.lon], cfg.zoom);

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: cfg.attribution + ' | Leaflet', // visible attribution kept enabled (S-14)
    });

    // Tile-error threshold: 4 consecutive errors within 10s -> fallback.
    tiles.on('tileerror', () => {
      const now = Date.now();
      if (now - tileErrorWindowStart > 10000) { tileErrorWindowStart = now; tileErrorCount = 0; }
      tileErrorCount += 1;
      if (tileErrorCount >= 4) mountFallback();
    });
    tiles.on('tileload', () => { tileErrorCount = 0; });
    tiles.addTo(map);

    L.marker([cfg.marker.lat, cfg.marker.lon])
      .addTo(map)
      .bindPopup(
        `<strong>${escapeHtml(cfg.facilityName)}</strong><br>${escapeHtml(cfg.suppliedAddress)}`
      );

    // Fix grey-tiles-on-hidden-container after mount + on resize.
    setTimeout(() => { if (map) map.invalidateSize(); }, 0);
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => { if (map) map.invalidateSize(); });
      resizeObserver.observe(surface);
    }
  }

  // Guard Leaflet presence inside try/catch; any init failure -> fallback with
  // a single console.warn (never console.error).
  try {
    if (typeof L === 'undefined') {
      // eslint-disable-next-line no-console
      console.warn('[facilityMap] Leaflet is unavailable — rendering address fallback card.');
      mountFallback();
    } else {
      mountMap();
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[facilityMap] Leaflet init failed — rendering address fallback card.');
    mountFallback();
  }

  function destroy() {
    teardownMap();
  }

  return { el: root, destroy };
}
