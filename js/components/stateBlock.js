// stateBlock.js — reusable render blocks for the non-ok states defined by the
// design 4.2 rendering rules: loading (skeleton), empty, error, offline, and
// stale / missing. These are presentational only; the owning page/component
// decides WHICH block to show based on an Envelope.status or a Reading.quality.
//
// Key safety rule (S-6): a 'missing' reading renders an em-dash + a grey
// 'No data' badge (+ 'last seen …' when asOf exists) and NEVER a normal/green
// badge. Error/offline blocks surface the envelope message with a retry
// affordance where a retry is meaningful.

import { statusBadgeHtml } from './statusBadge.js';
import { formatTimestamp } from '../util/format.js';

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function block(cls, inner) {
  const el = document.createElement('div');
  el.className = 'state-block ' + cls;
  el.innerHTML = inner;
  return el;
}

// Loading skeleton — a few neutral shimmer bars (no animation beyond a subtle
// opacity pulse defined in CSS; flat colours only).
export function renderLoading(opts = {}) {
  const rows = Math.max(1, opts.rows || 3);
  let bars = '';
  for (let i = 0; i < rows; i++) {
    bars += '<div class="skeleton-bar"></div>';
  }
  return block(
    'is-loading',
    `<div class="skeleton" aria-busy="true" aria-label="Loading">${bars}</div>`
  );
}

// Empty state — nothing to show (e.g. an empty trend series, AC-15).
export function renderEmpty(opts = {}) {
  const msg = opts.message || 'No data available for the selected options.';
  return block(
    'is-empty',
    `<p class="state-title">Nothing to show</p><p class="state-msg">${escapeHtml(msg)}</p>`
  );
}

// Error state — surfaces the envelope message; adds a Retry button when an
// onRetry callback is supplied (a retry is meaningful).
export function renderError(opts = {}) {
  const msg = opts.message || 'Something went wrong loading this data.';
  const el = block(
    'is-error',
    `<p class="state-title">Unable to load</p><p class="state-msg">${escapeHtml(msg)}</p>` +
    (typeof opts.onRetry === 'function' ? '<button type="button" class="btn-retry">Retry</button>' : '')
  );
  if (typeof opts.onRetry === 'function') {
    el.querySelector('.btn-retry').addEventListener('click', opts.onRetry);
  }
  return el;
}

// Offline state — monitoring link unavailable; shows last-known/stale note and
// a Retry affordance where meaningful.
export function renderOffline(opts = {}) {
  const msg = opts.message || 'Monitoring link unavailable.';
  const el = block(
    'is-offline',
    `<p class="state-title">Offline</p><p class="state-msg">${escapeHtml(msg)}</p>` +
    (opts.asOf ? `<p class="state-meta">Last known: ${escapeHtml(formatTimestamp(opts.asOf))}</p>` : '') +
    (typeof opts.onRetry === 'function' ? '<button type="button" class="btn-retry">Retry</button>' : '')
  );
  if (typeof opts.onRetry === 'function') {
    el.querySelector('.btn-retry').addEventListener('click', opts.onRetry);
  }
  return el;
}

// Generic 'library unavailable' block used by chart.js / facilityMap.js when a
// vendored lib is absent (rendered alongside a single console.warn — never a
// console.error).
export function renderUnavailable(message) {
  return block(
    'is-unavailable',
    `<p class="state-title">Unavailable</p><p class="state-msg">${escapeHtml(message || 'This feature is unavailable.')}</p>`
  );
}

// Inline markup for a MISSING reading (S-6): em-dash + grey 'No data' badge,
// plus a 'last seen …' note when asOf exists. Returns a markup string so it can
// be embedded inside a metric card value row.
export function missingReadingHtml(asOf) {
  return (
    '<span class="reading-missing">' +
    '<span class="reading-value">\u2014</span>' +
    statusBadgeHtml('unknown', { label: 'No data' }) +
    (asOf ? `<span class="reading-lastseen">Last seen ${escapeHtml(formatTimestamp(asOf))}</span>` : '') +
    '</span>'
  );
}

// Inline markup for the amber STALE marker shown next to a stale reading's
// value (4.2). Not a badge replacement — it annotates an otherwise-shown value.
export function staleMarkerHtml(asOf) {
  const when = asOf ? ` (as of ${escapeHtml(formatTimestamp(asOf))})` : '';
  return `<span class="stale-marker">Stale${when}</span>`;
}

// Dispatch helper: given an Envelope, return the matching non-ok block, or null
// for status==='ok' (the caller renders real content in that case).
export function stateBlockForEnvelope(env, opts = {}) {
  if (!env) return renderError({ message: 'No response.', onRetry: opts.onRetry });
  switch (env.status) {
    case 'loading': return renderLoading(opts);
    case 'empty':   return renderEmpty({ message: env.message, ...opts });
    case 'error':   return renderError({ message: env.message, onRetry: opts.onRetry });
    case 'offline': return renderOffline({ message: env.message, asOf: env.asOf, onRetry: opts.onRetry });
    default:        return null; // 'ok'
  }
}
