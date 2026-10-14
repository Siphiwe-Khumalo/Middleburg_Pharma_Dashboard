// environmental.js — Environmental Conditions page (design 6.2).
// Temperature: actual (status-coloured) vs a clearly SEPARATE neutral setpoint
// chip + read-only permitted limits + a visually disabled setpoint control that
// performs NO write (S-9/AC-26). Humidity: monitoring-only, ZERO control
// affordances (S-10/AC-27). A zone selector drives both panels via effective()
// so Storage Zone B shows 2–8°C vs Main Store 15–25°C (AC-28).

import { statusBadgeHtml } from '../components/statusBadge.js';
import { stateBlockForEnvelope } from '../components/stateBlock.js';
import { classify, effective } from '../config/thresholds.js';
import { samplePointMappings } from '../config/config.js';
import { formatValueUnit, formatUnit, formatTimestamp } from '../util/format.js';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const DEMO_NOTE =
  'Demonstration only — adjusting setpoints requires confirmed writable point ' +
  'mappings, permissions, and a connected backend.';

export default {
  route: 'environmental',
  title: 'Environmental Conditions',

  async render(container, ctx) {
    this._ctx = ctx;
    this._zone = 'zone-main-store';

    const root = document.createElement('div');
    root.innerHTML =
      '<div class="page-header-row">' +
        '<div class="page-header">' +
          '<h1 class="page-title">Environmental Conditions</h1>' +
          '<p class="page-subtitle">Temperature and humidity by storage zone</p>' +
        '</div>' +
        '<label class="inline-field"><span>Zone</span>' +
          '<select class="inline-select" id="env-zone">' +
            '<option value="zone-main-store">Main Store</option>' +
            '<option value="zone-dispatch">Dispatch</option>' +
            '<option value="zone-storage-b">Storage Zone B</option>' +
          '</select>' +
        '</label>' +
      '</div>' +
      '<div class="env-grid">' +
        '<div class="card" id="env-temp"></div>' +
        '<div class="card" id="env-rh"></div>' +
      '</div>';
    container.appendChild(root);
    this._root = root;

    root.querySelector('#env-zone').addEventListener('change', (e) => {
      this._zone = e.target.value;
      this._renderPanels();
    });

    await this._load();
  },

  async _load() {
    const env = await this._ctx.dataService.getZones();
    this._zonesEnv = env;
    this._renderPanels();
  },

  _renderPanels() {
    const tempCard = this._root.querySelector('#env-temp');
    const rhCard = this._root.querySelector('#env-rh');
    const env = this._zonesEnv;
    if (!env || env.status !== 'ok' || !Array.isArray(env.data)) {
      const b1 = stateBlockForEnvelope(env, { onRetry: () => this._load() });
      const b2 = stateBlockForEnvelope(env, { onRetry: () => this._load() });
      tempCard.innerHTML = ''; if (b1) tempCard.appendChild(b1);
      rhCard.innerHTML = ''; if (b2) rhCard.appendChild(b2);
      return;
    }
    const zone = env.data.find((z) => z.id === this._zone) || env.data[0];
    const band = effective(zone.id, this._ctx.store) || {};
    this._renderTemperature(tempCard, zone, band.temp);
    this._renderHumidity(rhCard, zone, band.rh);
  },

  _renderTemperature(card, zone, tband) {
    const status = tband ? classify(zone.temp.value, tband) : 'unknown';
    const valueText = formatValueUnit(zone.temp.value, zone.temp.unit);
    // Writable gate — every temp point mapping is writable:false (S-9).
    const writable = samplePointMappings.some((p) => p.ref === zone.id && p.writable === true);
    const target = tband ? tband.target : null;

    card.innerHTML =
      '<h2 class="section-title">Temperature</h2>' +
      '<div class="panel-block">' +
        '<div>' +
          '<p class="actual-label">Actual space temperature</p>' +
          `<div class="actual-value is-${status}">${esc(valueText)}</div>` +
          `<div style="margin-top:var(--sp-2)">${statusBadgeHtml(status)}</div>` +
          `<p class="card-caption">Updated ${esc(formatTimestamp(zone.temp.asOf))}</p>` +
        '</div>' +
        '<div class="setpoint-chip">' +
          '<span class="sp-label">Setpoint (configured)</span>' +
          `<span class="sp-value">${target != null ? esc(formatValueUnit(target, 'degC')) : '—'}</span>` +
          `<span class="sp-limits">Permitted adjustment limits: ${tband ? esc(formatValueUnit(tband.min, 'degC')) + ' to ' + esc(formatValueUnit(tband.max, 'degC')) : '—'} (read-only)</span>` +
        '</div>' +
        '<div class="control-row">' +
          '<div class="stepper" aria-label="Setpoint adjustment (demonstration only)">' +
            '<button type="button" id="env-sp-dec" disabled aria-label="Decrease setpoint">−</button>' +
            `<input type="number" id="env-sp-input" value="${target != null ? esc(target) : ''}" disabled aria-label="Setpoint value" />` +
            '<button type="button" id="env-sp-inc" disabled aria-label="Increase setpoint">+</button>' +
          '</div>' +
          '<button type="button" class="btn" id="env-sp-apply" disabled>Apply setpoint</button>' +
        '</div>' +
        `<p class="demo-note" id="env-sp-note">${esc(DEMO_NOTE)}</p>` +
      '</div>';

    // Belt-and-braces: the control is disabled, but attach a handler that only
    // re-surfaces the note and performs NO write (S-9/AC-26). writable is false,
    // so this branch is never a real control, but we never fake a write anyway.
    const apply = card.querySelector('#env-sp-apply');
    if (apply) {
      apply.addEventListener('click', (e) => {
        e.preventDefault();
        const note = card.querySelector('#env-sp-note');
        if (note) note.textContent = DEMO_NOTE; // no write performed
      });
    }
    // (writable intentionally unused for enabling; kept to document the gate.)
    void writable;
  },

  _renderHumidity(card, zone, rhband) {
    // Monitoring only — ZERO control affordances anywhere (S-10/AC-27).
    const status = rhband ? classify(zone.rh.value, rhband) : 'unknown';
    const valueText = formatValueUnit(zone.rh.value, zone.rh.unit);
    card.innerHTML =
      '<h2 class="section-title">Relative Humidity</h2>' +
      '<p class="section-sub">Monitoring only — this facility has no humidity control.</p>' +
      '<div class="panel-block">' +
        '<div>' +
          '<p class="actual-label">Current relative humidity</p>' +
          `<div class="actual-value is-${status}">${esc(valueText)}</div>` +
          `<div style="margin-top:var(--sp-2)">${statusBadgeHtml(status)}</div>` +
          `<p class="card-caption">Updated ${esc(formatTimestamp(zone.rh.asOf))}</p>` +
        '</div>' +
        '<div class="setpoint-chip">' +
          '<span class="sp-label">Configured acceptable limits</span>' +
          `<span class="sp-value">${rhband ? esc(formatValueUnit(rhband.min, 'pct')) + ' – ' + esc(formatValueUnit(rhband.max, 'pct')) : '—'}</span>` +
          '<span class="sp-limits">Humidity is monitored; no adjustment is available.</span>' +
        '</div>' +
      '</div>';
  },

  destroy() {
    this._root = null;
    this._ctx = null;
    this._zonesEnv = null;
  },
};
