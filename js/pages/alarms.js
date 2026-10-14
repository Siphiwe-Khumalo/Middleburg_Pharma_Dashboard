// alarms.js — Alarm Register page (design 6.4). Active/Acknowledged/Cleared
// tabs; a filter bar (severity, status, date via two native <input type=date>,
// zone) that narrows rows (AC-35); a dataTable with searchable:true (AC-33/34);
// row-select opens the detail modal (reading-vs-threshold, raised/ack times,
// notification delivery area labelled demonstration, S-8/AC-38); an
// 'Acknowledge (demo)' action calling dataService.acknowledgeAlarm which moves
// the alarm to Acknowledged and appends an AuditEntry{type:'ack'} (AC-39).
// Static status dots, no flashing (AC-37).

import { createDataTable } from '../components/dataTable.js';
import { statusBadgeHtml } from '../components/statusBadge.js';
import { stateBlockForEnvelope } from '../components/stateBlock.js';
import { openModal } from '../components/modal.js';
import { formatValueUnit, formatTimestamp, formatDateTimeShort } from '../util/format.js';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const ZONE_NAMES = {
  'zone-main-store': 'Main Store',
  'zone-dispatch': 'Dispatch',
  'zone-storage-b': 'Storage Zone B',
};
const SEV_STATUS = { critical: 'critical', warning: 'warning', info: 'unknown' };
const SEV_LABEL = { critical: 'Critical', warning: 'Warning', info: 'Info' };

function sourceLabel(source) {
  if (!source) return '—';
  if (source.kind === 'zone') return ZONE_NAMES[source.id] || source.id;
  return source.id.toUpperCase();
}

export default {
  route: 'alarms',
  title: 'Alarm Register',

  async render(container, ctx) {
    this._ctx = ctx;
    this._tab = 'active'; // Active / Acknowledged / Cleared
    this._filters = { severity: '', zone: '', from: '', to: '' };
    this._table = null;

    const root = document.createElement('div');
    root.innerHTML =
      '<div class="page-header">' +
        '<h1 class="page-title">Alarm Register</h1>' +
        '<p class="page-subtitle">Active, acknowledged and cleared events</p>' +
      '</div>' +
      '<div class="card">' +
        '<div class="tabs" role="tablist">' +
          '<button type="button" class="tab is-active" data-tab="active" role="tab">Active</button>' +
          '<button type="button" class="tab" data-tab="acknowledged" role="tab">Acknowledged</button>' +
          '<button type="button" class="tab" data-tab="cleared" role="tab">Cleared</button>' +
        '</div>' +
        '<div class="control-bar">' +
          '<label class="inline-field"><span>Severity</span>' +
            '<select class="inline-select" id="alm-sev">' +
              '<option value="">All severities</option>' +
              '<option value="critical">Critical</option>' +
              '<option value="warning">Warning</option>' +
              '<option value="info">Info</option>' +
            '</select>' +
          '</label>' +
          '<label class="inline-field"><span>Zone</span>' +
            '<select class="inline-select" id="alm-zone">' +
              '<option value="">All zones</option>' +
              '<option value="zone-main-store">Main Store</option>' +
              '<option value="zone-dispatch">Dispatch</option>' +
              '<option value="zone-storage-b">Storage Zone B</option>' +
            '</select>' +
          '</label>' +
          '<label class="inline-field"><span>From date</span>' +
            '<input type="date" class="inline-input" id="alm-from" /></label>' +
          '<label class="inline-field"><span>To date</span>' +
            '<input type="date" class="inline-input" id="alm-to" /></label>' +
        '</div>' +
        '<div id="alm-table"></div>' +
      '</div>';
    container.appendChild(root);
    this._root = root;

    root.querySelector('.tabs').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-tab]');
      if (!btn) return;
      this._tab = btn.getAttribute('data-tab');
      root.querySelectorAll('.tab').forEach((t) => t.classList.toggle('is-active', t === btn));
      this._reload();
    });
    root.querySelector('#alm-sev').addEventListener('change', (e) => { this._filters.severity = e.target.value; this._reload(); });
    root.querySelector('#alm-zone').addEventListener('change', (e) => { this._filters.zone = e.target.value; this._reload(); });
    root.querySelector('#alm-from').addEventListener('change', (e) => { this._filters.from = e.target.value; this._reload(); });
    root.querySelector('#alm-to').addEventListener('change', (e) => { this._filters.to = e.target.value; this._reload(); });

    await this._reload();
  },

  _buildFilter() {
    const f = { state: this._tab };
    if (this._filters.severity) f.severity = this._filters.severity;
    if (this._filters.zone) f.zone = this._filters.zone;
    if (this._filters.from) f.from = this._filters.from + 'T00:00:00';
    if (this._filters.to) f.to = this._filters.to + 'T23:59:59';
    return f;
  },

  async _reload() {
    const slot = this._root.querySelector('#alm-table');
    const env = await this._ctx.dataService.getAlarms(this._buildFilter());
    if (!env || (env.status !== 'ok' && env.status !== 'empty')) {
      slot.innerHTML = '';
      this._table = null;
      const block = stateBlockForEnvelope(env, { onRetry: () => this._reload() });
      if (block) slot.appendChild(block);
      return;
    }
    const rows = (env.data || []).map((a) => this._toRow(a));
    if (this._table) {
      this._table.setRows(rows);
    } else {
      slot.innerHTML = '';
      this._table = createDataTable({
        searchable: true,
        searchPlaceholder: 'Search alarms…',
        emptyText: 'No alarms match the current tab and filters.',
        columns: [
          { key: 'severity', label: 'Severity',
            render: (r) => statusBadgeHtml(SEV_STATUS[r.severity] || 'unknown', { label: SEV_LABEL[r.severity] || r.severity }),
            sortValue: (r) => ({ critical: 0, warning: 1, info: 2 }[r.severity] ?? 3),
            searchText: (r) => r.severity },
          { key: 'raisedAt', label: 'Timestamp',
            render: (r) => esc(formatDateTimeShort(r.raisedAt)),
            sortValue: (r) => new Date(r.raisedAt).getTime(),
            searchText: (r) => formatTimestamp(r.raisedAt) },
          { key: 'source', label: 'Source', render: (r) => esc(r.source), searchText: (r) => r.source },
          { key: 'reading', label: 'Reading', render: (r) => esc(r.readingText), sortValue: (r) => r.readingValue, searchText: (r) => r.readingText },
          { key: 'threshold', label: 'Threshold', sortable: false, render: (r) => esc(r.thresholdText), searchText: (r) => r.thresholdText },
          { key: 'ack', label: 'Acknowledgement', sortable: false, render: (r) => esc(r.ackText), searchText: (r) => r.ackText },
          { key: 'details', label: '', sortable: false, render: () => '<span class="map-directions">Details →</span>' },
        ],
        rows,
        initialSortKey: 'raisedAt',
        initialSortDir: 'desc',
        onRowClick: (r) => this._openDetail(r._alarm),
      });
      slot.appendChild(this._table.el);
    }
  },

  _toRow(a) {
    const th = a.threshold || {};
    const ackText = a.ackBy
      ? `${a.ackBy}${a.ackAt ? ' · ' + formatDateTimeShort(a.ackAt) : ''}`
      : (a.state === 'cleared' ? 'Cleared' : 'Unacknowledged');
    return {
      _alarm: a,
      severity: a.severity,
      raisedAt: a.raisedAt,
      source: sourceLabel(a.source),
      readingValue: a.reading && a.reading.value,
      readingText: formatValueUnit(a.reading && a.reading.value, a.reading && a.reading.unit),
      thresholdText: th.min != null ? `${formatValueUnit(th.min, th.unit)} – ${formatValueUnit(th.max, th.unit)}` : '—',
      ackText,
    };
  },

  async _openDetail(a) {
    const th = a.threshold || {};
    const notifyEnv = await this._ctx.dataService.getNotificationStatus();
    const records = (notifyEnv.status === 'ok' && Array.isArray(notifyEnv.data))
      ? notifyEnv.data.filter((n) => n.alarmId === a.id && n.notify && n.notify.demo === true)
      : [];

    const body = document.createElement('div');
    body.innerHTML =
      '<dl class="detail-grid">' +
        `<dt>Severity</dt><dd>${statusBadgeHtml(SEV_STATUS[a.severity] || 'unknown', { label: SEV_LABEL[a.severity] || a.severity })}</dd>` +
        `<dt>State</dt><dd>${esc(a.state)}</dd>` +
        `<dt>Source</dt><dd>${esc(sourceLabel(a.source))}</dd>` +
        `<dt>Current reading</dt><dd>${esc(formatValueUnit(a.reading && a.reading.value, a.reading && a.reading.unit))}</dd>` +
        `<dt>Configured threshold</dt><dd>${th.min != null ? esc(formatValueUnit(th.min, th.unit) + ' – ' + formatValueUnit(th.max, th.unit)) : '—'}</dd>` +
        `<dt>Raised</dt><dd>${esc(formatTimestamp(a.raisedAt))}</dd>` +
        `<dt>Acknowledged</dt><dd>${a.ackAt ? esc(formatTimestamp(a.ackAt) + (a.ackBy ? ' · ' + a.ackBy : '')) : '—'}</dd>` +
        `<dt>Detail</dt><dd>${esc(a.detail)}</dd>` +
      '</dl>' +
      '<div class="notify-area">' +
        '<p class="notify-label">Demonstration delivery status — real WhatsApp/email delivery is not yet configured.</p>' +
        (records.length
          ? records.map((n) =>
              '<div class="notify-row">' +
              `<span class="nr-channel">${esc(n.channel === 'whatsapp' ? 'WhatsApp' : 'Email')}</span>` +
              `<span>${esc(n.status)}</span>` +
              `<span>${esc(formatDateTimeShort(n.at))}</span>` +
              '</div>').join('')
          : '<p class="hint-note">No demonstration delivery records for this alarm.</p>') +
      '</div>';

    const canAck = a.state === 'active';
    const actions = [];
    if (canAck) {
      actions.push({
        label: 'Acknowledge (demo)',
        variant: 'primary',
        onClick: async () => {
          await this._ctx.dataService.acknowledgeAlarm(a.id, 'Demo Operator');
          // Refresh the header badge + table (store subscription re-renders header).
          this._ctx.store.set('_activeAlarmCount',
            Math.max(0, (this._ctx.store.get('_activeAlarmCount') || 0) - 1));
          await this._reload();
        },
      });
    }
    actions.push({ label: 'Close' });

    openModal({ title: `Alarm ${a.id}`, body, actions });
  },

  destroy() {
    this._table = null;
    this._root = null;
    this._ctx = null;
  },
};
