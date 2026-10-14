// mockData.js — illustrative demonstration telemetry (A2/A3).
// EVERY top-level record carries illustrative:true. Notification records carry
// notify.demo:true (S-8). Zone/equipment identifiers are illustrative only (S-11).
// Imported ONLY by dataService.js — never by pages/components.

import { zoneThresholds } from '../config/thresholds.js';

const now = Date.now();
const iso = (ms) => new Date(ms).toISOString();

// A Reading value-object: { value, unit, asOf, quality }.
function reading(value, unit, asOfMs, quality = 'good') {
  return { value, unit, asOf: asOfMs == null ? null : iso(asOfMs), quality };
}

// ---- Deterministic seeded trend generation -------------------------------
// Simple LCG so series are reproducible across reloads (no Math.random).
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// Build a series of `count` points ending at `now`, stepping back by `stepMs`,
// oscillating around `center` with amplitude `amp` plus bounded noise.
function buildSeries(metric, zoneId, unit, { center, amp, count, stepMs, seed }) {
  const rng = makeRng(seed);
  const points = [];
  for (let i = count - 1; i >= 0; i--) {
    const t = now - i * stepMs;
    const phase = (i / count) * Math.PI * 4;
    const noise = (rng() - 0.5) * amp * 0.6;
    const v = +(center + Math.sin(phase) * amp + noise).toFixed(2);
    points.push({ t: iso(t), v });
  }
  return { metric, zoneId, unit, points, illustrative: true };
}

// ---- Zones ---------------------------------------------------------------
export const zones = [
  {
    id: 'zone-main-store', name: 'Main Store', thresholdRef: 'zone-main-store',
    temp: reading(20.4, 'degC', now - 45 * 1000),
    rh:   reading(48.2, 'pct',  now - 45 * 1000),
    lastUpdate: iso(now - 45 * 1000), illustrative: true,
  },
  {
    id: 'zone-dispatch', name: 'Dispatch', thresholdRef: 'zone-dispatch',
    temp: reading(23.1, 'degC', now - 60 * 1000),
    rh:   reading(52.7, 'pct',  now - 60 * 1000),
    lastUpdate: iso(now - 60 * 1000), illustrative: true,
  },
  {
    id: 'zone-storage-b', name: 'Storage Zone B', thresholdRef: 'zone-storage-b',
    temp: reading(5.3, 'degC', now - 30 * 1000),
    rh:   reading(55.9, 'pct', now - 30 * 1000),
    lastUpdate: iso(now - 30 * 1000), illustrative: true,
  },
];

// ---- HVAC equipment ------------------------------------------------------
export const equipment = [
  {
    id: 'ahu-01', pointMapRef: 'ahu-01', name: 'AHU-01 Main Store Air Handler', type: 'AHU',
    state: 'running',
    readings: {
      supplyTemp: reading(18.6, 'degC', now - 50 * 1000),
      airflow:    reading(2400, 'm3/h', now - 50 * 1000),
      heating:    reading(0, 'pct', now - 50 * 1000),
      cooling:    reading(42, 'pct', now - 50 * 1000),
    },
    alarm: 'normal', lastUpdate: iso(now - 50 * 1000), illustrative: true,
  },
  {
    id: 'ahu-02', pointMapRef: 'ahu-02', name: 'AHU-02 Dispatch Air Handler', type: 'AHU',
    state: 'running',
    readings: {
      supplyTemp: reading(21.2, 'degC', now - 70 * 1000),
      airflow:    reading(1800, 'm3/h', now - 70 * 1000),
      heating:    reading(12, 'pct', now - 70 * 1000),
      cooling:    reading(0, 'pct', now - 70 * 1000),
    },
    alarm: 'warning', lastUpdate: iso(now - 70 * 1000), illustrative: true,
  },
  {
    id: 'cru-01', pointMapRef: 'cru-01', name: 'CRU-01 Storage Zone B Cooling Unit', type: 'CRU',
    state: 'fault',
    readings: {
      supplyTemp: reading(7.9, 'degC', now - 20 * 1000),
      airflow:    reading(0, 'm3/h', now - 20 * 1000),
      heating:    reading(0, 'pct', now - 20 * 1000),
      cooling:    reading(0, 'pct', now - 20 * 1000),
    },
    alarm: 'critical', lastUpdate: iso(now - 20 * 1000), illustrative: true,
  },
];

// ---- Alarms --------------------------------------------------------------
export const alarms = [
  {
    id: 'alm-001', severity: 'critical', state: 'active',
    raisedAt: iso(now - 8 * 60 * 1000),
    source: { kind: 'equipment', id: 'cru-01' },
    reading: reading(7.9, 'degC', now - 20 * 1000),
    threshold: { min: 2, max: 8, unit: 'degC' },
    ackBy: null, ackAt: null,
    detail: 'Storage Zone B cooling unit reporting fault; supply airflow at zero.',
    notify: { whatsapp: 'sent', email: 'sent', demo: true },
    illustrative: true,
  },
  {
    id: 'alm-002', severity: 'warning', state: 'active',
    raisedAt: iso(now - 25 * 60 * 1000),
    source: { kind: 'zone', id: 'zone-dispatch' },
    reading: reading(23.1, 'degC', now - 60 * 1000),
    threshold: { min: 15, max: 30, unit: 'degC' },
    ackBy: null, ackAt: null,
    detail: 'Dispatch zone temperature approaching upper limit.',
    notify: { whatsapp: 'pending', email: 'sent', demo: true },
    illustrative: true,
  },
  {
    id: 'alm-003', severity: 'warning', state: 'acknowledged',
    raisedAt: iso(now - 3 * 60 * 60 * 1000),
    source: { kind: 'equipment', id: 'ahu-02' },
    reading: reading(21.2, 'degC', now - 70 * 1000),
    threshold: { min: 15, max: 30, unit: 'degC' },
    ackBy: 'Demo Operator', ackAt: iso(now - 2 * 60 * 60 * 1000),
    detail: 'AHU-02 heating demand elevated.',
    notify: { whatsapp: 'sent', email: 'sent', demo: true },
    illustrative: true,
  },
  {
    id: 'alm-004', severity: 'info', state: 'cleared',
    raisedAt: iso(now - 26 * 60 * 60 * 1000),
    source: { kind: 'zone', id: 'zone-main-store' },
    reading: reading(14.6, 'degC', now - 25 * 60 * 60 * 1000),
    threshold: { min: 15, max: 25, unit: 'degC' },
    ackBy: 'Demo Operator', ackAt: iso(now - 25 * 60 * 60 * 1000),
    detail: 'Main Store brief temperature dip, auto-cleared.',
    notify: { whatsapp: 'n/a', email: 'n/a', demo: true },
    illustrative: true,
  },
];

// ---- Trend series --------------------------------------------------------
// Deterministically seeded per zone+metric, plus a dedicated empty series and
// an injected-stale series to exercise AC-15.
const H = 60 * 60 * 1000;
export const series = {
  'zone-main-store:temp': buildSeries('temp', 'zone-main-store', 'degC',
    { center: zoneThresholds['zone-main-store'].temp.target, amp: 2.0, count: 48, stepMs: 0.5 * H, seed: 101 }),
  'zone-main-store:rh': buildSeries('rh', 'zone-main-store', 'pct',
    { center: 48, amp: 5, count: 48, stepMs: 0.5 * H, seed: 102 }),
  'zone-dispatch:temp': buildSeries('temp', 'zone-dispatch', 'degC',
    { center: zoneThresholds['zone-dispatch'].temp.target, amp: 3.0, count: 48, stepMs: 0.5 * H, seed: 201 }),
  'zone-dispatch:rh': buildSeries('rh', 'zone-dispatch', 'pct',
    { center: 52, amp: 6, count: 48, stepMs: 0.5 * H, seed: 202 }),
  'zone-storage-b:temp': buildSeries('temp', 'zone-storage-b', 'degC',
    { center: zoneThresholds['zone-storage-b'].temp.target, amp: 1.2, count: 48, stepMs: 0.5 * H, seed: 301 }),
  'zone-storage-b:rh': buildSeries('rh', 'zone-storage-b', 'pct',
    { center: 55, amp: 4, count: 48, stepMs: 0.5 * H, seed: 302 }),
};

// Dedicated empty series (exercises the empty state, AC-15).
export const emptySeries = { metric: 'temp', zoneId: 'zone-main-store', unit: 'degC', points: [], illustrative: true };

// Injected-stale series: last point is well beyond the staleness window.
export const staleSeries = (() => {
  const base = buildSeries('temp', 'zone-main-store', 'degC',
    { center: 20, amp: 1.5, count: 12, stepMs: H, seed: 999 });
  // Shift all timestamps back by ~2 hours so the newest point is stale.
  base.points = base.points.map((p) => ({ t: iso(new Date(p.t).getTime() - 2 * H), v: p.v }));
  base.injectedStale = true;
  return base;
})();

// ---- Audit entries -------------------------------------------------------
export const auditEntries = [
  { id: 'aud-001', at: iso(now - 2 * 60 * 60 * 1000), type: 'ack', source: 'alm-003', actor: 'Demo Operator', detail: 'Acknowledged AHU-02 heating alarm.', illustrative: true },
  { id: 'aud-002', at: iso(now - 6 * 60 * 60 * 1000), type: 'config', source: 'zone-dispatch', actor: 'Demo Operator', detail: 'Reviewed Dispatch threshold band.', illustrative: true },
  { id: 'aud-003', at: iso(now - 12 * 60 * 60 * 1000), type: 'comm', source: 'monitoring-service', actor: null, detail: 'Monitoring link interruption recorded (demo).', illustrative: true },
  { id: 'aud-004', at: iso(now - 20 * 60 * 60 * 1000), type: 'service', source: 'monitoring-service', actor: null, detail: 'Monitoring service restarted (demo).', illustrative: true },
];

// ---- Notification delivery records (S-8) ---------------------------------
export const notificationStatus = [
  { id: 'ntf-001', alarmId: 'alm-001', channel: 'whatsapp', status: 'sent', at: iso(now - 8 * 60 * 1000), notify: { demo: true } },
  { id: 'ntf-002', alarmId: 'alm-001', channel: 'email', status: 'sent', at: iso(now - 8 * 60 * 1000), notify: { demo: true } },
  { id: 'ntf-003', alarmId: 'alm-002', channel: 'whatsapp', status: 'pending', at: iso(now - 25 * 60 * 1000), notify: { demo: true } },
  { id: 'ntf-004', alarmId: 'alm-002', channel: 'email', status: 'sent', at: iso(now - 25 * 60 * 1000), notify: { demo: true } },
];

// ---- Overview metrics (illustrative) -------------------------------------
export function overviewMetrics() {
  const running = equipment.filter((e) => e.state === 'running').length;
  const activeAlarms = alarms.filter((a) => a.state === 'active');
  return {
    spaceTemp: reading(20.4, 'degC', now - 45 * 1000),
    relativeHumidity: reading(48.2, 'pct', now - 45 * 1000),
    hvacAvailability: { running, total: equipment.length },
    activeAlarms: {
      total: activeAlarms.length,
      critical: activeAlarms.filter((a) => a.severity === 'critical').length,
      warning: activeAlarms.filter((a) => a.severity === 'warning').length,
      info: activeAlarms.filter((a) => a.severity === 'info').length,
    },
    illustrative: true,
  };
}
