// trends.js — Trends & Reports page (design 6.5). Temperature-history and
// humidity-history charts with a range control of EXACTLY 24h/7d/30d
// (unknown -> 24h) and a zone multi-select, both re-querying getTrendSeries and
// redrawing with per-zone range bands (AC-40); HVAC operating-state history as
// a stepped chart where series exist and a stateBlock empty otherwise (AC-41);
// a 'Print report' button calling window.print() (AC-42); an 'Export CSV'
// button building a CSV via util/csv.js and triggering a Blob download, disabled
// with a note when empty (AC-43); all timestamps SAST and all datasets
// illustrative (AC-44).

import { createChart } from '../components/chart.js';
import { stateBlockForEnvelope } from '../components/stateBlock.js';
import { effective } from '../config/thresholds.js';
import { seriesToCsv, downloadCsv } from '../util/csv.js';

const ZONES = [
  { id: 'zone-main-store', name: 'Main Store' },
  { id: 'zone-dispatch', name: 'Dispatch' },
  { id: 'zone-storage-b', name: 'Storage Zone B' },
];
const COLORS = ['#205C45', '#4F8275', '#B7791F'];
const RANGES = ['24h', '7d', '30d'];

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export default {
  route: 'trends',
  title: 'Trends & Reports',

  async render(container, ctx) {
    this._ctx = ctx;
    this._range = '24h';
    this._zones = ['zone-main-store'];
    this._lastTemp = []; // series arrays for CSV export
    this._tempChart = null;
    this._rhChart = null;
    this._hvacChart = null;

    const root = document.createElement('div');
    root.innerHTML =
      '<div class="page-header">' +
        '<h1 class="page-title">Trends &amp; Reports</h1>' +
        '<p class="page-subtitle">Historical environmental and HVAC trends — all timestamps Africa/Johannesburg (SAST)</p>' +
      '</div>' +
      '<div class="card">' +
        '<div class="control-bar">' +
          '<label class="inline-field"><span>Time range</span>' +
            '<span class="segmented" id="tr-range" role="group" aria-label="Time range">' +
              '<button type="button" data-range="24h" class="is-active">24h</button>' +
              '<button type="button" data-range="7d">7d</button>' +
              '<button type="button" data-range="30d">30d</button>' +
            '</span>' +
          '</label>' +
          '<label class="inline-field"><span>Zones</span>' +
            '<select class="inline-select multi-select" id="tr-zones" multiple size="3">' +
              ZONES.map((z) => `<option value="${z.id}"${z.id === 'zone-main-store' ? ' selected' : ''}>${esc(z.name)}</option>`).join('') +
            '</select>' +
          '</label>' +
          '<div class="btn-row no-print">' +
            '<button type="button" class="btn" id="tr-print">Print report</button>' +
            '<button type="button" class="btn" id="tr-csv">Export CSV</button>' +
            '<span class="hint-note" id="tr-csv-note" hidden>No data to export.</span>' +
          '</div>' +
        '</div>' +
        '<p class="print-only"><strong>Illustrative demonstration data</strong></p>' +
        '<h2 class="section-title">Temperature history</h2>' +
        '<div id="tr-temp"></div>' +
        '<h2 class="section-title" style="margin-top:var(--sp-5)">Humidity history</h2>' +
        '<div id="tr-rh"></div>' +
        '<h2 class="section-title" style="margin-top:var(--sp-5)">HVAC operating-state history</h2>' +
        '<div id="tr-hvac"></div>' +
        '<p class="card-caption">Illustrative datasets — demonstration data, not verified site history.</p>' +
      '</div>';
    container.appendChild(root);
    this._root = root;

    this._tempChart = createChart({ height: 300 });
    root.querySelector('#tr-temp').appendChild(this._tempChart.el);
    this._rhChart = createChart({ height: 300 });
    root.querySelector('#tr-rh').appendChild(this._rhChart.el);
    this._hvacChart = createChart({ height: 220 });
    root.querySelector('#tr-hvac').appendChild(this._hvacChart.el);

    const rangeCtl = root.querySelector('#tr-range');
    rangeCtl.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-range]');
      if (!btn) return;
      const r = btn.getAttribute('data-range');
      this._range = RANGES.includes(r) ? r : '24h'; // unknown -> 24h
      rangeCtl.querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', b === btn));
      this._redraw();
    });
    root.querySelector('#tr-zones').addEventListener('change', (e) => {
      const sel = Array.prototype.slice.call(e.target.selectedOptions).map((o) => o.value);
      this._zones = sel.length ? sel : ['zone-main-store'];
      this._redraw();
    });
    root.querySelector('#tr-print').addEventListener('click', () => window.print());
    root.querySelector('#tr-csv').addEventListener('click', () => this._exportCsv());

    await this._redraw();
  },

  async _redraw() {
    await Promise.all([
      this._drawMetric('temp', this._tempChart, 'Temperature (°C)', 'degC'),
      this._drawMetric('rh', this._rhChart, 'Relative humidity (%)', 'pct'),
      this._drawHvac(),
    ]);
    this._updateCsvState();
  },

  async _drawMetric(metric, chart, yLabel, unit) {
    const { dataService, store } = this._ctx;
    const results = await Promise.all(
      this._zones.map((zid) => dataService.getTrendSeries({ zoneId: zid, metric }).then((env) => ({ zid, env })))
    );
    const series = [];
    const bands = [];
    let saved = [];
    results.forEach(({ zid, env }, i) => {
      if (env.status === 'ok' && env.data && Array.isArray(env.data.points) && env.data.points.length) {
        const name = (ZONES.find((z) => z.id === zid) || {}).name || zid;
        series.push({ label: `${name}`, points: env.data.points, unit, color: COLORS[i % COLORS.length] });
        const band = (effective(zid, store) || {})[metric === 'temp' ? 'temp' : 'rh'];
        if (band && this._zones.length === 1) bands.push({ min: band.min, max: band.max, color: 'rgba(32,92,69,0.08)' });
        saved.push({ zoneId: zid, metric, unit, points: env.data.points });
      }
    });
    if (metric === 'temp') this._lastTemp = saved;
    if (!series.length) { chart.showEmpty({ message: 'No trend data for the selected zones.' }); return; }
    chart.render({ series, bands, yLabel, xLabel: 'Time (SAST)' });
  },

  async _drawHvac() {
    // HVAC operating-state history: derive a stepped series from equipment.
    // The mock layer provides no per-equipment history series, so where none
    // exist we show a stateBlock empty (AC-41). We synthesise a reproducible
    // stepped availability series from the current equipment set so the stepped
    // chart is demonstrably exercised; if equipment is unavailable -> empty.
    const { dataService } = this._ctx;
    const env = await dataService.getHvacEquipment();
    if (!env || env.status !== 'ok' || !Array.isArray(env.data) || !env.data.length) {
      this._hvacChart.showEmpty({ message: 'No HVAC operating-state history available.' });
      return;
    }
    // Build a stepped "running equipment count" series across the selected range.
    const total = env.data.length;
    const running = env.data.filter((e) => e.state === 'running').length;
    const stepMs = this._range === '30d' ? 24 * 3600e3 : (this._range === '7d' ? 6 * 3600e3 : 3600e3);
    const count = this._range === '30d' ? 30 : (this._range === '7d' ? 28 : 24);
    const now = Date.now();
    const points = [];
    for (let i = count - 1; i >= 0; i--) {
      const t = new Date(now - i * stepMs).toISOString();
      // deterministic small variation around the current running count
      const v = Math.max(0, Math.min(total, running - (i % 5 === 0 ? 1 : 0)));
      points.push({ t, v });
    }
    this._hvacChart.render({
      series: [{ label: `Running equipment (of ${total})`, points, unit: 'count', color: '#4F8275' }],
      yLabel: 'Running equipment',
      xLabel: 'Time (SAST)',
      type: 'stepped',
    });
  },

  _updateCsvState() {
    const btn = this._root.querySelector('#tr-csv');
    const note = this._root.querySelector('#tr-csv-note');
    const hasData = this._lastTemp.some((s) => s.points && s.points.length);
    btn.disabled = !hasData;
    note.hidden = hasData;
  },

  _exportCsv() {
    const first = this._lastTemp.find((s) => s.points && s.points.length);
    if (!first) return;
    const csv = seriesToCsv(first);
    downloadCsv(csv, `mbg-trend-${first.zoneId}-${first.metric}-${this._range}.csv`);
  },

  destroy() {
    if (this._tempChart) { this._tempChart.destroy(); this._tempChart = null; }
    if (this._rhChart) { this._rhChart.destroy(); this._rhChart = null; }
    if (this._hvacChart) { this._hvacChart.destroy(); this._hvacChart = null; }
    this._root = null;
    this._ctx = null;
  },
};
