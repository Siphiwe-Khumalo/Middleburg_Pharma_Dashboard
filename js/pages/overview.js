// overview.js — Environmental Assurance page (design 6.1).
// Presentational: composes shared components and calls dataService only.
// Covers AC-11..AC-17 plus the facility map (section 7).

import { renderMetricCard } from '../components/metricCard.js';
import { createDataTable } from '../components/dataTable.js';
import { createChart } from '../components/chart.js';
import { createFacilityMap } from '../components/facilityMap.js';
import { statusBadgeHtml } from '../components/statusBadge.js';
import { stateBlockForEnvelope } from '../components/stateBlock.js';
import { classify, effective } from '../config/thresholds.js';
import { formatValueUnit, formatUnit, formatDateTimeShort, relativeTime } from '../util/format.js';

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
function zoneName(id) {
  if (id === 'all') return 'All zones';
  return ZONE_NAMES[id] || id;
}

export default {
  route: 'overview',
  title: 'Environmental Assurance',

  async render(container, ctx) {
    const { dataService, store } = ctx;
    this._ctx = ctx;
    this._chart = null;
    this._map = null;
    this._simState = 'normal';
    this._selectedZone = 'all';

    const root = document.createElement('div');
    root.innerHTML =
      '<div class="page-header-row">' +
        '<div class="page-header">' +
          '<h1 class="page-title">Environmental Assurance</h1>' +
          '<p class="page-subtitle">Warehouse conditions and building systems</p>' +
        '</div>' +
        '<label class="inline-field"><span>Selected zone</span>' +
          '<select class="inline-select" id="ov-zone">' +
            '<option value="all">All zones</option>' +
            '<option value="zone-main-store">Main Store</option>' +
            '<option value="zone-dispatch">Dispatch</option>' +
            '<option value="zone-storage-b">Storage Zone B</option>' +
          '</select>' +
        '</label>' +
      '</div>' +
      '<div class="page-sections">' +
        '<div id="ov-alarm-banner"></div>' +
        '<div class="metric-grid" id="ov-metrics"></div>' +
        '<div class="card">' +
          '<div class="card-head">' +
            '<div><h2 class="section-title">Environmental trend</h2>' +
            '<p class="section-sub">Temperature over the selected period with the acceptable-range band.</p></div>' +
            '<label class="inline-field"><span>Demo state simulator</span>' +
              '<span class="segmented" id="ov-sim" role="group" aria-label="Demo state simulator">' +
                '<button type="button" data-state="normal" class="is-active">Normal</button>' +
                '<button type="button" data-state="loading">Loading</button>' +
                '<button type="button" data-state="empty">Empty</button>' +
                '<button type="button" data-state="error">Error</button>' +
              '</span>' +
            '</label>' +
          '</div>' +
          '<div id="ov-chart"></div>' +
        '</div>' +
        '<div class="card">' +
          '<h2 class="section-title">Storage zones</h2>' +
          '<div id="ov-zone-table"></div>' +
        '</div>' +
        '<div class="card">' +
          '<h2 class="section-title">Recent events</h2>' +
          '<div id="ov-events"></div>' +
        '</div>' +
        '<div class="card">' +
          '<h2 class="section-title">Facility location</h2>' +
          '<div id="ov-map"></div>' +
        '</div>' +
      '</div>';
    container.appendChild(root);

    this._root = root;

    // Zone selector drives the trend chart + which space-temp metric is shown.
    root.querySelector('#ov-zone').addEventListener('change', (e) => {
      this._selectedZone = e.target.value;
      this._renderMetrics();
      this._drawChart();
    });

    // Demo state simulator (AC-15).
    const sim = root.querySelector('#ov-sim');
    sim.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-state]');
      if (!btn) return;
      this._simState = btn.getAttribute('data-state');
      sim.querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', b === btn));
      this._drawChart();
    });

    // Build the chart wrapper + facility map once; data filled after fetch.
    this._chart = createChart({ height: 300 });
    root.querySelector('#ov-chart').appendChild(this._chart.el);
    this._map = createFacilityMap({
      marker: ctx.config.location.marker,
      facilityName: ctx.config.facility.name,
      suppliedAddress: ctx.config.suppliedAddress,
      mapLabel: ctx.config.location.mapLabel,
      attribution: ctx.config.location.attribution,
      directionsUrl: ctx.config.directionsUrl(),
    });
    root.querySelector('#ov-map').appendChild(this._map.el);

    await this._loadAll();
  },

  async _loadAll() {
    const { dataService } = this._ctx;
    const [metricsEnv, zonesEnv, alarmsEnv] = await Promise.all([
      dataService.getOverviewMetrics(),
      dataService.getZones(),
      dataService.getAlarms({ state: 'active' }),
    ]);
    this._metricsEnv = metricsEnv;
    this._zonesEnv = zonesEnv;
    this._activeAlarmsEnv = alarmsEnv;

    this._renderAlarmBanner();
    this._renderMetrics();
    this._renderZoneTable();
    await this._renderEvents();
    this._drawChart();
  },

  _renderAlarmBanner() {
    const slot = this._root.querySelector('#ov-alarm-banner');
    slot.innerHTML = '';
    const env = this._activeAlarmsEnv;
    const list = env && env.status === 'ok' && Array.isArray(env.data) ? env.data : [];
    if (!list.length) return; // absent when none (AC-13)
    const crit = list.filter((a) => a.severity === 'critical').length;
    const warn = list.filter((a) => a.severity === 'warning').length;
    const info = list.filter((a) => a.severity === 'info').length;
    const banner = document.createElement('div');
    banner.className = 'alarm-summary';
    banner.setAttribute('role', 'alert');
    banner.innerHTML =
      `<span class="as-title">${list.length} active alarm${list.length === 1 ? '' : 's'}</span>` +
      '<span class="as-counts">' +
        `<span class="as-count">Critical: <strong>${crit}</strong></span>` +
        `<span class="as-count">Warning: <strong>${warn}</strong></span>` +
        `<span class="as-count">Info: <strong>${info}</strong></span>` +
      '</span>' +
      '<a href="#/alarms">View Alarm Register →</a>';
    slot.appendChild(banner);
  },

  _renderMetrics() {
    const grid = this._root.querySelector('#ov-metrics');
    grid.innerHTML = '';
    const env = this._metricsEnv;
    if (!env || env.status !== 'ok' || !env.data) {
      const block = stateBlockForEnvelope(env, { onRetry: () => this._loadAll() });
      if (block) { grid.classList.remove('metric-grid'); grid.appendChild(block); }
      return;
    }
    grid.classList.add('metric-grid');
    const m = env.data;
    const { store } = this._ctx;

    // Space Temperature — classified against the selected zone (or Main Store
    // when 'All zones' is selected, as a representative primary space).
    const tempZone = this._selectedZone === 'all' ? 'zone-main-store' : this._selectedZone;
    const tempBand = (effective(tempZone, store) || {}).temp;
    const tempStatus = tempBand ? classify(m.spaceTemp.value, tempBand) : 'unknown';
    grid.appendChild(renderMetricCard({
      title: 'Space Temperature' + (this._selectedZone !== 'all' ? ` — ${zoneName(tempZone)}` : ''),
      reading: m.spaceTemp,
      status: tempStatus,
    }));

    // Relative Humidity.
    const rhBand = (effective(tempZone, store) || {}).rh;
    const rhStatus = rhBand ? classify(m.relativeHumidity.value, rhBand) : 'unknown';
    grid.appendChild(renderMetricCard({
      title: 'Relative Humidity',
      reading: m.relativeHumidity,
      status: rhStatus,
    }));

    // HVAC Availability (running / total).
    const av = m.hvacAvailability;
    grid.appendChild(renderMetricCard({
      title: 'HVAC Availability',
      reading: { value: av.running, unit: 'count', asOf: env.asOf, quality: 'good' },
      status: av.running === av.total ? 'normal' : (av.running === 0 ? 'critical' : 'warning'),
      statusLabel: `${av.running} running`,
      valueText: `${av.running} / ${av.total}`,
    }));

    // Active Alarms by severity.
    const al = m.activeAlarms;
    grid.appendChild(renderMetricCard({
      title: 'Active Alarms',
      reading: { value: al.total, unit: 'count', asOf: env.asOf, quality: 'good' },
      status: al.critical > 0 ? 'critical' : (al.warning > 0 ? 'warning' : 'normal'),
      statusLabel: `${al.critical} crit · ${al.warning} warn`,
      valueText: String(al.total),
    }));
  },

  _renderZoneTable() {
    const slot = this._root.querySelector('#ov-zone-table');
    slot.innerHTML = '';
    const env = this._zonesEnv;
    if (!env || env.status !== 'ok' || !Array.isArray(env.data)) {
      const block = stateBlockForEnvelope(env, { onRetry: () => this._loadAll() });
      if (block) slot.appendChild(block);
      return;
    }
    const { store } = this._ctx;
    const rows = env.data.map((z) => {
      const band = effective(z.id, store) || {};
      const tStatus = band.temp ? classify(z.temp.value, band.temp) : 'unknown';
      const rhStatus = band.rh ? classify(z.rh.value, band.rh) : 'unknown';
      // Worst-of the two for the row status.
      const order = { normal: 0, warning: 1, critical: 2, unknown: 1 };
      const rowStatus = order[tStatus] >= order[rhStatus] ? tStatus : rhStatus;
      const range = band.temp
        ? `${band.temp.min}–${band.temp.max}${formatUnit('degC')} (target ${band.temp.target}${formatUnit('degC')})`
        : '—';
      return {
        name: z.name,
        temp: z.temp.value,
        tempText: formatValueUnit(z.temp.value, z.temp.unit),
        rh: z.rh.value,
        rhText: formatValueUnit(z.rh.value, z.rh.unit),
        range,
        status: rowStatus,
        lastUpdate: z.lastUpdate,
      };
    });
    const table = createDataTable({
      caption: 'Illustrative zones — demonstration data, not confirmed site zone names.',
      columns: [
        { key: 'name', label: 'Zone' },
        { key: 'temp', label: 'Temp', render: (r) => esc(r.tempText), sortValue: (r) => r.temp },
        { key: 'rh', label: 'RH', render: (r) => esc(r.rhText), sortValue: (r) => r.rh },
        { key: 'range', label: 'Configured range / target', sortable: false, render: (r) => esc(r.range) },
        { key: 'status', label: 'Status', render: (r) => statusBadgeHtml(r.status) },
        { key: 'lastUpdate', label: 'Last update', render: (r) => esc(relativeTime(r.lastUpdate)), sortValue: (r) => new Date(r.lastUpdate).getTime() },
      ],
      rows,
      initialSortKey: 'name',
    });
    slot.appendChild(table.el);
  },

  async _renderEvents() {
    const slot = this._root.querySelector('#ov-events');
    slot.innerHTML = '';
    const { dataService } = this._ctx;
    const env = await dataService.getAlarms({});
    if (!env || env.status !== 'ok' || !Array.isArray(env.data)) {
      const block = stateBlockForEnvelope(env, { onRetry: () => this._renderEvents() });
      if (block) slot.appendChild(block);
      return;
    }
    const list = env.data.slice()
      .sort((a, b) => new Date(b.raisedAt) - new Date(a.raisedAt))
      .slice(0, 5);
    if (!list.length) {
      slot.innerHTML = '<p class="hint-note">No recent events.</p>';
      return;
    }
    const ul = document.createElement('ul');
    ul.className = 'events-list';
    for (const a of list) {
      const li = document.createElement('li');
      li.className = 'event-row';
      const sev = a.severity === 'critical' ? 'critical' : (a.severity === 'warning' ? 'warning' : 'unknown');
      const ack = a.state === 'acknowledged'
        ? `<span class="event-ack">Acknowledged${a.ackBy ? ' · ' + esc(a.ackBy) : ''}</span>`
        : (a.state === 'cleared' ? '<span class="event-ack">Cleared</span>' : '<span class="event-ack">Unacknowledged</span>');
      li.innerHTML =
        statusBadgeHtml(sev, { label: a.severity.charAt(0).toUpperCase() + a.severity.slice(1) }) +
        '<span class="event-main">' +
          `<span class="event-desc">${esc(a.detail)}</span>` +
          `<span class="event-meta">${esc(formatDateTimeShort(a.raisedAt))} · ${esc(sourceLabel(a.source))}</span>` +
        '</span>' +
        ack;
      ul.appendChild(li);
    }
    slot.appendChild(ul);
  },

  _drawChart() {
    if (!this._chart) return;
    const chart = this._chart;
    const { dataService, store } = this._ctx;
    const sim = this._simState;

    if (sim === 'loading') { chart.showLoading({}); return; }
    if (sim === 'error') { chart.showError({ message: 'Simulated error — trend data could not be loaded.' }); return; }

    const zone = this._selectedZone === 'all' ? 'zone-main-store' : this._selectedZone;
    const state = sim === 'empty' ? 'empty' : undefined;
    dataService.getTrendSeries({ zoneId: zone, metric: 'temp', state }).then((env) => {
      if (env.status === 'empty' || !env.data || !Array.isArray(env.data.points) || !env.data.points.length) {
        chart.showEmpty({ message: 'No trend data for the selected options.' });
        return;
      }
      const band = (effective(zone, store) || {}).temp;
      chart.render({
        series: [{ label: `${zoneName(zone)} temperature`, points: env.data.points, unit: 'degC', color: '#205C45' }],
        bands: band ? [{ min: band.min, max: band.max, color: 'rgba(32,92,69,0.08)' }] : [],
        yLabel: 'Temperature (°C)',
        xLabel: 'Time (SAST)',
      });
    });
  },

  destroy() {
    if (this._chart) { this._chart.destroy(); this._chart = null; }
    if (this._map) { this._map.destroy(); this._map = null; }
    this._root = null;
    this._ctx = null;
  },
};

function sourceLabel(source) {
  if (!source) return '—';
  if (source.kind === 'zone') return ZONE_NAMES[source.id] || source.id;
  return source.id;
}
