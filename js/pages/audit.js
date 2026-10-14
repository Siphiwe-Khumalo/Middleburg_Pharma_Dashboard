// audit.js — Audit Trail page (design 6.6). A dataTable of audit entries (ack,
// config, setpoint-note, notify, comm, service) seeded from mockData and growing
// live as the user acknowledges alarms / edits thresholds; fields timestamp
// (SAST), event type, source, actor, detail; 'Demonstration data — not verified
// production records' caption (AC-46); sortable by timestamp/type, filterable by
// type/date, instantiated with searchable:true (AC-47).

import { createDataTable } from '../components/dataTable.js';
import { stateBlockForEnvelope } from '../components/stateBlock.js';
import { formatDateTimeShort, formatTimestamp } from '../util/format.js';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const TYPE_LABEL = {
  ack: 'Acknowledgement',
  config: 'Configuration change',
  setpoint: 'Setpoint note',
  notify: 'Notification',
  comm: 'Communication interruption',
  service: 'Monitoring service restart',
};

export default {
  route: 'audit',
  title: 'Audit Trail',

  async render(container, ctx) {
    this._ctx = ctx;
    this._table = null;

    const root = document.createElement('div');
    root.innerHTML =
      '<div class="page-header">' +
        '<h1 class="page-title">Audit Trail</h1>' +
        '<p class="page-subtitle">Operational accountability log — all timestamps Africa/Johannesburg (SAST)</p>' +
      '</div>' +
      '<div class="card"><div id="aud-table"></div></div>';
    container.appendChild(root);
    this._root = root;

    // Re-render when demo-local audit grows (ack / threshold edits).
    this._unsub = ctx.store.subscribe(() => this._reload());

    await this._reload();
  },

  async _reload() {
    const slot = this._root.querySelector('#aud-table');
    const env = await this._ctx.dataService.getAuditEntries({});
    if (!env || (env.status !== 'ok' && env.status !== 'empty')) {
      slot.innerHTML = '';
      this._table = null;
      const block = stateBlockForEnvelope(env, { onRetry: () => this._reload() });
      if (block) slot.appendChild(block);
      return;
    }
    const rows = (env.data || []).map((e) => ({
      at: e.at,
      type: e.type,
      typeLabel: TYPE_LABEL[e.type] || e.type,
      source: e.source || '—',
      actor: e.actor || '—',
      detail: e.detail || '',
    }));

    if (this._table) {
      this._table.setRows(rows);
      return;
    }
    slot.innerHTML = '';
    this._table = createDataTable({
      searchable: true,
      searchPlaceholder: 'Search audit log…',
      caption: 'Demonstration data — not verified production records.',
      emptyText: 'No audit entries match the current filters.',
      columns: [
        { key: 'at', label: 'Timestamp',
          render: (r) => esc(formatDateTimeShort(r.at)),
          sortValue: (r) => new Date(r.at).getTime(),
          searchText: (r) => formatTimestamp(r.at) },
        { key: 'type', label: 'Event type',
          render: (r) => esc(r.typeLabel),
          sortValue: (r) => r.typeLabel,
          searchText: (r) => r.typeLabel,
          filter: 'select',
          filterOptions: Object.keys(TYPE_LABEL).map((k) => ({ value: k, label: TYPE_LABEL[k] })),
          filterMatch: (r, v) => r.type === v },
        { key: 'source', label: 'Source', render: (r) => esc(r.source), searchText: (r) => r.source },
        { key: 'actor', label: 'Actor', render: (r) => esc(r.actor), searchText: (r) => r.actor },
        { key: 'detail', label: 'Detail', sortable: false, render: (r) => esc(r.detail), searchText: (r) => r.detail },
      ],
      rows,
      initialSortKey: 'at',
      initialSortDir: 'desc',
    });
    slot.appendChild(this._table.el);
  },

  destroy() {
    if (typeof this._unsub === 'function') { this._unsub(); this._unsub = null; }
    this._table = null;
    this._root = null;
    this._ctx = null;
  },
};
