// metricCard.js — primary metric card (design 6.1). Renders current value +
// engineering unit + statusBadge + optional trend arrow + last-updated
// timestamp + a small 'demo' tag. Applies the 4.2 missing/stale rules:
//   - a STALE reading shows an amber 'Stale (as of …)' marker next to the value
//   - a MISSING reading renders an em-dash + grey 'No data' badge and NEVER a
//     normal/green badge (S-6).
// Presentational only — it receives a Reading + a precomputed status and
// callbacks; it does not fetch and does not compute status itself.

import { statusBadgeHtml } from './statusBadge.js';
import { missingReadingHtml, staleMarkerHtml } from './stateBlock.js';
import { formatValueUnit, formatTimestamp } from '../util/format.js';

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Derive a trend arrow from the last two trend points. Returns a small markup
// string, or '' when fewer than two points are supplied.
function trendArrowHtml(points) {
  if (!Array.isArray(points) || points.length < 2) return '';
  const a = points[points.length - 2];
  const b = points[points.length - 1];
  const prev = a && typeof a.v === 'number' ? a.v : null;
  const curr = b && typeof b.v === 'number' ? b.v : null;
  if (prev == null || curr == null) return '';
  let glyph = '\u2013'; // – flat
  let cls = 'is-flat';
  let label = 'steady';
  if (curr > prev) { glyph = '\u25B2'; cls = 'is-up'; label = 'rising'; }       // ▲
  else if (curr < prev) { glyph = '\u25BC'; cls = 'is-down'; label = 'falling'; } // ▼
  return `<span class="trend-arrow ${cls}" title="Trend: ${label}" aria-label="Trend ${label}">${glyph}</span>`;
}

// render a metric card.
// opts:
//   title    : card title (e.g. 'Space Temperature')
//   reading  : Reading { value, unit, asOf, quality }  (required)
//   status   : 'normal'|'warning'|'critical'|'unknown' from classify() (optional;
//              a missing reading always renders the No-data badge regardless)
//   statusLabel : optional override for the badge label
//   trendPoints : array of {t,v} to derive the trend arrow (optional)
//   valueText   : optional pre-formatted value string (e.g. '2 / 3' for
//                 running/total) used instead of reading.value+unit
//   digits   : decimal digits for numeric values (default 1)
export function renderMetricCard(opts = {}) {
  const r = opts.reading || {};
  const el = document.createElement('div');
  el.className = 'metric-card card';

  const quality = r.quality;
  let valueRow;
  let badge;

  if (quality === 'missing' || r.value == null) {
    // S-6: never a normal badge for a missing reading.
    valueRow = missingReadingHtml(r.asOf);
    badge = '';
  } else {
    const valueStr = opts.valueText != null
      ? escapeHtml(opts.valueText)
      : escapeHtml(formatValueUnit(r.value, r.unit, opts.digits == null ? 1 : opts.digits));
    const stale = quality === 'stale'
      ? ' ' + staleMarkerHtml(r.asOf)
      : '';
    valueRow =
      `<span class="reading-value">${valueStr}</span>` +
      trendArrowHtml(opts.trendPoints) +
      stale;
    // A reading flagged stale is forced to the grey unknown badge (4.2) so it is
    // never presented as a confident normal reading.
    const effStatus = quality === 'stale' ? 'unknown' : (opts.status || 'unknown');
    badge = statusBadgeHtml(effStatus, opts.statusLabel ? { label: opts.statusLabel } : {});
  }

  const lastUpdated = r.asOf
    ? `<span class="metric-updated">Updated ${escapeHtml(formatTimestamp(r.asOf))}</span>`
    : '<span class="metric-updated">Updated —</span>';

  el.innerHTML =
    '<div class="metric-top">' +
    `<span class="metric-title">${escapeHtml(opts.title || '')}</span>` +
    '<span class="demo-tag" title="Illustrative demonstration data">demo</span>' +
    '</div>' +
    `<div class="metric-value-row">${valueRow}</div>` +
    `<div class="metric-foot">${badge}${lastUpdated}</div>`;

  return el;
}
