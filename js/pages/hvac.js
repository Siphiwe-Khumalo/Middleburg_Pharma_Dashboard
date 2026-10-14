// hvac.js — HVAC Systems page (design 6.3). Responsive equipment cards showing
// identifier, name, operating-state badge, measured values (space/supply temp,
// airflow, heating %, cooling %), available alarm status, and last update, with
// a 'Demonstration data — illustrative equipment' caption (AC-30). Any control
// is disabled/demonstration-only performing NO real or simulated action
// (S-9/AC-31). Identifiers are config-sourced; every samplePoint ends
// '(illustrative)' (S-11/AC-32).

import { statusBadgeHtml } from '../components/statusBadge.js';
import { stateBlockForEnvelope } from '../components/stateBlock.js';
import { samplePointMappings } from '../config/config.js';
import { formatValueUnit, formatTimestamp } from '../util/format.js';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const DEMO_NOTE =
  'Demonstration only — Start/Stop and mode controls require confirmed writable ' +
  'point mappings, permissions, and a connected backend.';

// Map an equipment operating state to a status classification for the badge.
const STATE_STATUS = { running: 'normal', stopped: 'unknown', fault: 'critical', unknown: 'unknown' };
const STATE_LABEL = { running: 'Running', stopped: 'Stopped', fault: 'Fault', unknown: 'Unknown' };
const ALARM_LABEL = { normal: 'Normal', warning: 'Warning', critical: 'Critical', unknown: 'Offline / unknown' };

export default {
  route: 'hvac',
  title: 'HVAC Systems',

  async render(container, ctx) {
    this._ctx = ctx;
    const root = document.createElement('div');
    root.innerHTML =
      '<div class="page-header">' +
        '<h1 class="page-title">HVAC Systems</h1>' +
        '<p class="page-subtitle">Heating, cooling, airflow and run status by equipment</p>' +
      '</div>' +
      '<div class="card">' +
        '<div id="hvac-list"></div>' +
        '<p class="card-caption">Demonstration data — illustrative equipment. Point identifiers are illustrative sample mappings (writable:false), not real controller point IDs.</p>' +
      '</div>';
    container.appendChild(root);
    this._root = root;
    await this._load();
  },

  async _load() {
    const slot = this._root.querySelector('#hvac-list');
    slot.innerHTML = '';
    const env = await this._ctx.dataService.getHvacEquipment();
    if (!env || env.status !== 'ok' || !Array.isArray(env.data)) {
      const block = stateBlockForEnvelope(env, { onRetry: () => this._load() });
      if (block) slot.appendChild(block);
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'hvac-grid';
    for (const e of env.data) grid.appendChild(this._card(e));
    slot.appendChild(grid);
  },

  _card(e) {
    const card = document.createElement('div');
    card.className = 'equip-card card';
    const r = e.readings || {};
    // Illustrative sample point(s) for this equipment (S-11): show the first.
    const pts = samplePointMappings.filter((p) => p.ref === e.id);
    const samplePoint = pts.length ? pts[0].samplePoint : 'DEMO/* (illustrative)';
    const stateStatus = STATE_STATUS[e.state] || 'unknown';
    const alarmStatus = e.alarm || 'unknown';

    const reading = (label, rd) =>
      '<div class="equip-reading">' +
        `<span class="er-label">${esc(label)}</span>` +
        `<span class="er-value">${esc(formatValueUnit(rd && rd.value, rd && rd.unit))}</span>` +
      '</div>';

    card.innerHTML =
      '<div class="equip-head">' +
        '<div>' +
          `<div class="equip-id">${esc(e.id.toUpperCase())}</div>` +
          `<div class="equip-name">${esc(e.name)}</div>` +
        '</div>' +
        statusBadgeHtml(stateStatus, { label: STATE_LABEL[e.state] || 'Unknown' }) +
      '</div>' +
      '<div class="equip-readings">' +
        reading('Space / supply temp', r.supplyTemp) +
        reading('Airflow', r.airflow) +
        reading('Heating', r.heating) +
        reading('Cooling', r.cooling) +
      '</div>' +
      '<div class="control-row">' +
        '<span class="er-label">Alarm status</span>' +
        statusBadgeHtml(alarmStatus, { label: ALARM_LABEL[alarmStatus] || 'Offline / unknown' }) +
      '</div>' +
      '<div class="control-row">' +
        `<button type="button" class="btn" disabled>${e.state === 'running' ? 'Stop' : 'Start'}</button>` +
        '<button type="button" class="btn" disabled>Mode…</button>' +
      '</div>' +
      `<p class="demo-note">${esc(DEMO_NOTE)}</p>` +
      '<div class="equip-foot">' +
        `<span>Point: <code>${esc(samplePoint)}</code></span>` +
        `<span>Updated ${esc(formatTimestamp(e.lastUpdate))}</span>` +
      '</div>';

    // Disabled controls perform no action; defensively block clicks too (S-9).
    card.querySelectorAll('button[disabled]').forEach((b) => {
      b.addEventListener('click', (ev) => ev.preventDefault());
    });
    return card;
  },

  destroy() {
    this._root = null;
    this._ctx = null;
  },
};
