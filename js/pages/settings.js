// settings.js — Settings page (design 6.7 + 8.2). Editable per-zone threshold
// form bound to store overrides with validation; on valid save write the
// override, append AuditEntry{type:'config'} (via dataService.setZoneThreshold),
// and rely on store subscription so Overview zone table and Environmental
// ranges update immediately (AC-48). Mode selector Demo/Connected/Offline
// updating store.mode and the header indicator, with the Connected
// NOT_CONFIGURED explanation inline and never fake-live (AC-49/S-4/S-5).
// Read-only facility info + SAST time zone; read-only illustrative sample-point
// mappings; each group tagged demo-local / backend; NO secret fields (AC-50/S-7).

import { effective, zoneThresholds } from '../config/thresholds.js';
import { facility, samplePointMappings, modes } from '../config/config.js';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const ZONES = [
  { id: 'zone-main-store', name: 'Main Store' },
  { id: 'zone-dispatch', name: 'Dispatch' },
  { id: 'zone-storage-b', name: 'Storage Zone B' },
];

const MODE_LABEL = { demo: 'Demo', connected: 'Connected', offline: 'Offline' };
const MODE_EXPLAIN = {
  demo: 'Serving illustrative demonstration data. The app never shows LIVE/CONNECTED while running mock data.',
  connected: 'Connected mode requires a configured backend (Niagara/API). It is NOT yet wired, so live reads return a NOT_CONFIGURED response — never fake-live data.',
  offline: 'Monitoring link treated as unavailable; last-known values are surfaced as stale.',
};

export default {
  route: 'settings',
  title: 'Settings',

  async render(container, ctx) {
    this._ctx = ctx;

    const root = document.createElement('div');
    root.innerHTML =
      '<div class="page-header">' +
        '<h1 class="page-title">Settings</h1>' +
        '<p class="page-subtitle">Demo-local configuration and facility information</p>' +
      '</div>' +
      '<div class="page-sections">' +
        '<div class="card">' +
          '<div class="card-head"><h2 class="section-title">Per-zone thresholds</h2>' +
            '<span class="group-tag is-demo-local">Demo-local (saved in your browser)</span></div>' +
          '<div class="settings-group" id="set-thresholds"></div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-head"><h2 class="section-title">Monitoring mode</h2>' +
            '<span class="group-tag is-demo-local">Demo-local (saved in your browser)</span></div>' +
          '<div class="radio-row" id="set-mode"></div>' +
          '<p class="mode-explain" id="set-mode-explain"></p>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-head"><h2 class="section-title">Facility information</h2>' +
            '<span class="group-tag is-backend">Requires backend</span></div>' +
          '<dl class="info-grid" id="set-facility"></dl>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-head"><h2 class="section-title">Sample point mappings</h2>' +
            '<span class="group-tag is-backend">Requires backend</span></div>' +
          '<p class="section-sub">Read-only, illustrative — not real controller point IDs. Every mapping is writable:false.</p>' +
          '<div id="set-points"></div>' +
        '</div>' +
      '</div>';
    container.appendChild(root);
    this._root = root;

    this._renderThresholdForms();
    this._renderMode();
    this._renderFacility();
    this._renderPoints();
  },

  _renderThresholdForms() {
    const wrap = this._root.querySelector('#set-thresholds');
    wrap.innerHTML = '';
    for (const z of ZONES) {
      const eff = effective(z.id, this._ctx.store) || zoneThresholds[z.id];
      const form = document.createElement('form');
      form.className = 'zone-form';
      form.innerHTML =
        '<div class="zone-form-head">' +
          `<strong>${esc(z.name)}</strong>` +
          '<span class="save-ok" hidden>Saved ✓</span>' +
        '</div>' +
        '<div class="field-grid">' +
          field('temp-min', 'Temp min (°C)', eff.temp.min) +
          field('temp-max', 'Temp max (°C)', eff.temp.max) +
          field('temp-target', 'Temp target (°C)', eff.temp.target) +
          field('rh-min', 'RH min (%)', eff.rh.min) +
          field('rh-max', 'RH max (%)', eff.rh.max) +
        '</div>' +
        '<div><button type="submit" class="btn btn-primary" data-role="save">Save</button></div>';
      form.addEventListener('submit', (e) => { e.preventDefault(); this._save(z.id, form); });
      form.addEventListener('input', () => this._validate(form));
      wrap.appendChild(form);
      this._validate(form); // establish initial Save-enabled state
    }
  },

  // Validate a zone form. On any error: inline field error, Save disabled,
  // returns null. On success returns the parsed patch.
  _validate(form) {
    const get = (k) => form.querySelector(`[data-field="${k}"]`);
    const clearErr = (k) => {
      const f = get(k).closest('.field');
      f.classList.remove('has-error');
      f.querySelector('.field-error').textContent = '';
    };
    const setErr = (k, msg) => {
      const f = get(k).closest('.field');
      f.classList.add('has-error');
      f.querySelector('.field-error').textContent = msg;
    };
    const keys = ['temp-min', 'temp-max', 'temp-target', 'rh-min', 'rh-max'];
    keys.forEach(clearErr);

    const vals = {};
    let ok = true;
    for (const k of keys) {
      const raw = get(k).value.trim();
      const n = Number(raw);
      if (raw === '' || Number.isNaN(n)) { setErr(k, 'Enter a number'); ok = false; }
      else vals[k] = n;
    }
    if (ok) {
      // Absolute bounds: temp −40..60, RH 0..100.
      if (vals['temp-min'] < -40 || vals['temp-max'] > 60) { setErr('temp-min', '−40…60 °C'); ok = false; }
      if (vals['rh-min'] < 0 || vals['rh-max'] > 100) { setErr('rh-min', '0…100 %'); ok = false; }
      if (ok && !(vals['temp-min'] < vals['temp-max'])) { setErr('temp-max', 'Max must exceed min'); ok = false; }
      if (ok && !(vals['rh-min'] < vals['rh-max'])) { setErr('rh-max', 'Max must exceed min'); ok = false; }
      if (ok && (vals['temp-target'] < vals['temp-min'] || vals['temp-target'] > vals['temp-max'])) {
        setErr('temp-target', 'Target within [min,max]'); ok = false;
      }
    }

    const saveBtn = form.querySelector('[data-role="save"]');
    saveBtn.disabled = !ok;
    if (!ok) return null;
    return {
      temp: { min: vals['temp-min'], max: vals['temp-max'], target: vals['temp-target'], unit: 'degC' },
      rh: { min: vals['rh-min'], max: vals['rh-max'], unit: 'pct' },
    };
  },

  async _save(zoneId, form) {
    const patch = this._validate(form);
    if (!patch) return; // invalid: no store write, no audit entry (8.2)
    await this._ctx.dataService.setZoneThreshold(zoneId, patch, 'Demo Operator');
    const ok = form.querySelector('.save-ok');
    if (ok) {
      ok.hidden = false;
      setTimeout(() => { if (ok) ok.hidden = true; }, 2500);
    }
    // store subscription re-renders the header + any subscribed page; Overview
    // and Environmental read effective() so they reflect the new band (AC-48).
  },

  _renderMode() {
    const wrap = this._root.querySelector('#set-mode');
    const explain = this._root.querySelector('#set-mode-explain');
    const current = this._ctx.store.get('mode') || 'demo';
    wrap.innerHTML = modes.map((m) =>
      `<label><input type="radio" name="mode" value="${m}"${m === current ? ' checked' : ''}> ${esc(MODE_LABEL[m] || m)}</label>`
    ).join('');
    explain.textContent = MODE_EXPLAIN[current] || '';
    wrap.addEventListener('change', (e) => {
      if (e.target.name !== 'mode') return;
      const next = e.target.value;
      this._ctx.store.set('mode', next); // updates header indicator (S-4/S-5)
      explain.textContent = MODE_EXPLAIN[next] || '';
    });
  },

  _renderFacility() {
    const dl = this._root.querySelector('#set-facility');
    const rows = [
      ['Facility name', facility.name],
      ['Subtitle', facility.subtitle],
      ['Location', facility.locationLabel],
      ['Client', facility.client],
      ['Time zone', facility.timeZone + ' (SAST)'],
    ];
    dl.innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  },

  _renderPoints() {
    const slot = this._root.querySelector('#set-points');
    const rows = samplePointMappings.map((p) =>
      '<tr>' +
      `<td>${esc(p.ref)}</td>` +
      `<td>${esc(p.label)}</td>` +
      `<td><code>${esc(p.samplePoint)}</code></td>` +
      `<td>${p.writable ? 'writable' : 'read-only'}</td>` +
      '</tr>').join('');
    slot.innerHTML =
      '<div class="table-scroll"><table class="data-table">' +
        '<thead><tr><th>Ref</th><th>Label</th><th>Sample point (illustrative)</th><th>Access</th></tr></thead>' +
        `<tbody>${rows}</tbody>` +
      '</table></div>';
  },

  destroy() {
    this._root = null;
    this._ctx = null;
  },
};

function field(key, label, value) {
  return (
    '<div class="field">' +
    `<label for="f-${key}">${label}</label>` +
    `<input id="f-${key}" data-field="${key}" type="number" step="any" value="${value == null ? '' : value}" />` +
    '<span class="field-error"></span>' +
    '</div>'
  );
}
