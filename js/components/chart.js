// chart.js — Chart.js wrapper (design 6.1 / 6.5). Guards `typeof Chart` and,
// if absent, renders a stateBlock 'Chart library unavailable' with a SINGLE
// console.warn and NO console.error (preserves NFR-4/AC-7). When present it:
//   - draws labelled axes + units + hover tooltips
//   - shades the selected zone's effective acceptable-range band(s) via a
//     custom plugin
//   - exposes empty/loading/error overlays (reuses stateBlock)
//   - uses maintainAspectRatio:false inside a fixed-height responsive container
//   - frees the Chart instance on destroy() so the owning page leaks nothing.
//
// Presentational: receives a series + band config + options; never fetches.

import { renderLoading, renderEmpty, renderError, renderUnavailable } from './stateBlock.js';
import { formatDateTimeShort, formatUnit } from '../util/format.js';

// Custom plugin: shade acceptable-range bands as horizontal rectangles on the
// y-axis. Reads bands from chart.config.options.rangeBands = [{min,max,color}].
const rangeBandPlugin = {
  id: 'rangeBands',
  beforeDatasetsDraw(chart) {
    const bands = chart.config.options && chart.config.options.rangeBands;
    if (!Array.isArray(bands) || !bands.length) return;
    const { ctx, chartArea, scales } = chart;
    const y = scales.y;
    if (!y || !chartArea) return;
    ctx.save();
    for (const band of bands) {
      if (band.min == null || band.max == null) continue;
      const top = y.getPixelForValue(band.max);
      const bottom = y.getPixelForValue(band.min);
      const yTop = Math.min(top, bottom);
      const h = Math.abs(bottom - top);
      ctx.fillStyle = band.color || 'rgba(32,92,69,0.08)';
      ctx.fillRect(chartArea.left, yTop, chartArea.right - chartArea.left, h);
    }
    ctx.restore();
  },
};

export function createChart(opts = {}) {
  const root = document.createElement('div');
  root.className = 'chart-wrap';

  // Fixed-height responsive container (maintainAspectRatio:false needs this).
  const canvasBox = document.createElement('div');
  canvasBox.className = 'chart-canvas-box';
  if (opts.height) canvasBox.style.height = typeof opts.height === 'number' ? opts.height + 'px' : opts.height;
  root.appendChild(canvasBox);

  let chart = null;
  let libMissing = false;

  function clearBox() {
    canvasBox.innerHTML = '';
    if (chart) { chart.destroy(); chart = null; }
  }

  // Show a non-chart state (loading/empty/error) using the shared stateBlock.
  function showState(kind, stateOpts = {}) {
    clearBox();
    let node;
    if (kind === 'loading') node = renderLoading({ rows: 4 });
    else if (kind === 'empty') node = renderEmpty(stateOpts);
    else node = renderError(stateOpts);
    canvasBox.appendChild(node);
  }

  // Build datasets + options and (re)instantiate the chart.
  // cfg: {
  //   series: [{ label, points:[{t,v}], unit, color }]
  //   bands:  [{ min, max, color }]   // acceptable-range shading
  //   yLabel, xLabel
  //   type:   'line' (default) | 'stepped'
  // }
  function render(cfg = {}) {
    if (typeof Chart === 'undefined') {
      // Handled library-absence: ONE console.warn, never console.error.
      if (!libMissing) {
        libMissing = true;
        // eslint-disable-next-line no-console
        console.warn('[chart] Chart.js is unavailable — rendering fallback state block.');
      }
      clearBox();
      canvasBox.appendChild(renderUnavailable('Chart library unavailable'));
      return;
    }

    const series = Array.isArray(cfg.series) ? cfg.series : [];
    const hasPoints = series.some((s) => Array.isArray(s.points) && s.points.length);
    if (!hasPoints) { showState('empty', { message: cfg.emptyMessage }); return; }

    clearBox();
    const canvas = document.createElement('canvas');
    canvasBox.appendChild(canvas);

    const stepped = cfg.type === 'stepped';
    const datasets = series.map((s) => ({
      label: s.unit ? `${s.label} (${formatUnit(s.unit)})` : s.label,
      data: s.points.map((p) => ({ x: p.t, y: p.v })),
      borderColor: s.color || '#205C45',
      backgroundColor: 'rgba(32,92,69,0.08)',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: stepped ? 0 : 0.25,
      stepped: stepped ? 'before' : false,
      spanGaps: true,
    }));

    chart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { datasets },
      plugins: [rangeBandPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        rangeBands: cfg.bands || [],
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            type: 'category',
            labels: longestPoints(series).map((p) => formatDateTimeShort(p.t)),
            title: { display: !!cfg.xLabel, text: cfg.xLabel || 'Time (SAST)' },
            grid: { color: '#E1E7E2' },
            ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8, color: '#6B756E' },
          },
          y: {
            title: { display: !!cfg.yLabel, text: cfg.yLabel || '' },
            grid: { color: '#E1E7E2' },
            ticks: { color: '#6B756E' },
          },
        },
        plugins: {
          legend: { display: series.length > 1, labels: { color: '#202923' } },
          tooltip: {
            enabled: true,
            callbacks: {
              label(c) {
                const s = series[c.datasetIndex] || {};
                const u = s.unit ? formatUnit(s.unit) : '';
                return `${s.label}: ${c.parsed.y}${u}`;
              },
            },
          },
        },
      },
    });

    // parsing:false + category x needs explicit indices — map data to x labels.
    const labels = longestPoints(series).map((p) => formatDateTimeShort(p.t));
    chart.data.labels = labels;
    chart.data.datasets.forEach((ds, i) => {
      ds.data = series[i].points.map((p) => p.v);
    });
    chart.options.parsing = true;
    chart.update();
  }

  // Pick the series with the most points to drive the shared x-axis labels.
  function longestPoints(series) {
    let best = [];
    for (const s of series) {
      if (Array.isArray(s.points) && s.points.length > best.length) best = s.points;
    }
    return best;
  }

  function destroy() {
    clearBox();
  }

  return {
    el: root,
    render,
    showLoading: (o) => showState('loading', o),
    showEmpty: (o) => showState('empty', o),
    showError: (o) => showState('error', o),
    destroy,
  };
}
