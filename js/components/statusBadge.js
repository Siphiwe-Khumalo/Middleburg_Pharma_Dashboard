// statusBadge.js — the SINGLE renderer of status presentation (design 3.2).
// Maps a classification ('normal'|'warning'|'critical'|'unknown') to a
// dot + label text + icon TOGETHER — status is NEVER conveyed by colour
// alone (NFR-6 / AC-37). It consumes the classification produced by
// thresholds.classify(); it does NOT compute status itself.

// Inline status glyphs (restrained, sized via currentColor). Kept here rather
// than in icons.js because they are specific to the badge's dot+label+icon
// contract and must stay paired with the status mapping (single source).
const statusIcon = (paths) =>
  '<svg class="sb-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" ' +
  'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
  'aria-hidden="true">' + paths + '</svg>';

// status -> { class, label, icon }. The soft-bg tints + colours live in
// css/styles.css (.status-badge.is-*); this map owns the semantic trio.
const STATUS = {
  normal: {
    cls: 'is-normal',
    label: 'Normal',
    icon: statusIcon('<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>'),
  },
  warning: {
    cls: 'is-warning',
    label: 'Warning',
    icon: statusIcon('<path d="M12 3l9 16H3z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="16.5" x2="12" y2="16.5"/>'),
  },
  critical: {
    cls: 'is-critical',
    label: 'Critical',
    icon: statusIcon('<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="16.5" x2="12" y2="16.5"/>'),
  },
  unknown: {
    cls: 'is-unknown',
    label: 'Offline / unknown',
    icon: statusIcon('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.9.4-1 .9-1 1.7"/><line x1="12" y1="16.5" x2="12" y2="16.5"/>'),
  },
};

// Build the status-badge markup string.
// status  : 'normal'|'warning'|'critical'|'unknown' (from classify()).
// opts.label : override the default label text (e.g. a 'No data' tag).
// Any unrecognised status falls back to 'unknown' — a missing/invalid status
// is NEVER presented as normal (S-6).
export function statusBadgeHtml(status, opts = {}) {
  const def = STATUS[status] || STATUS.unknown;
  const label = opts.label != null ? opts.label : def.label;
  return (
    `<span class="status-badge ${def.cls}" role="status">` +
    '<span class="sb-dot" aria-hidden="true"></span>' +
    def.icon +
    `<span class="sb-label">${escapeHtml(label)}</span>` +
    '</span>'
  );
}

// Convenience: return a detached element rather than a markup string.
export function renderStatusBadge(status, opts = {}) {
  const wrap = document.createElement('span');
  wrap.innerHTML = statusBadgeHtml(status, opts);
  return wrap.firstElementChild;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
