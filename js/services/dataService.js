// dataService.js — THE single mock/API seam. The ONLY module that decides
// whether data comes from mock or a (future) real API, by reading store.mode.
//
// demo      -> mock data in an 'ok' envelope (source:'demo')
// connected -> 'error' envelope code:'NOT_CONFIGURED' (never mock fallback, never LIVE) S-4
// offline   -> 'offline' envelope surfacing last-known values flagged stale (S-6)

import { store } from '../store.js';
import * as mock from '../data/mockData.js';

// Build a discriminated Envelope.
function envelope({ status, source = null, data = null, asOf = null, stale = false, message = null, code = null }) {
  return { status, source, data, asOf, stale, message, code };
}

// Optional artificial latency, only when a simulate-loading flag is set.
function maybeDelay() {
  const simulate = store.get('simulateLoading');
  if (!simulate) return Promise.resolve();
  const ms = 150 + Math.floor(Math.random() * 150);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const nowIso = () => new Date().toISOString();

// Shared handling for the connected/offline branches of a "live resource".
// Returns an envelope if the mode is not demo, else null (caller proceeds).
function nonDemoEnvelope(lastKnown) {
  const mode = store.get('mode');
  if (mode === 'connected') {
    // TODO(Niagara): fetch(config.api.baseUrl + '/...') and map to envelope.
    return envelope({
      status: 'error',
      source: 'api',
      data: null,
      code: 'NOT_CONFIGURED',
      message: 'Connected mode requires a configured backend (Niagara/API). Not yet wired.',
    });
  }
  if (mode === 'offline') {
    return envelope({
      status: 'offline',
      source: 'cache',
      data: lastKnown ?? null,
      stale: true,
      message: 'Monitoring link unavailable',
      code: 'COMM_FAILURE',
    });
  }
  return null;
}

async function liveRead(dataFn, lastKnownFn) {
  await maybeDelay();
  const nonDemo = nonDemoEnvelope(lastKnownFn ? lastKnownFn() : null);
  if (nonDemo) return nonDemo;
  const data = dataFn();
  const empty = Array.isArray(data) && data.length === 0;
  return envelope({
    status: empty ? 'empty' : 'ok',
    source: 'demo',
    data,
    asOf: nowIso(),
    stale: false,
  });
}

// Apply an alarm filter {state, severity, zone, from, to} to a list.
function filterAlarms(list, filter = {}) {
  return list.filter((a) => {
    if (filter.state && a.state !== filter.state) return false;
    if (filter.severity && a.severity !== filter.severity) return false;
    if (filter.zone && !(a.source.kind === 'zone' && a.source.id === filter.zone)) return false;
    if (filter.from && new Date(a.raisedAt) < new Date(filter.from)) return false;
    if (filter.to && new Date(a.raisedAt) > new Date(filter.to)) return false;
    return true;
  });
}

// Merge demo-local acknowledgements from the store onto the base alarm set.
function currentAlarms() {
  const acks = store.get('acknowledgements') || {};
  return mock.alarms.map((a) => {
    const ack = acks[a.id];
    if (!ack) return a;
    return { ...a, state: 'acknowledged', ackBy: ack.ackBy, ackAt: ack.ackAt };
  });
}

function appendAudit(entry) {
  const audit = (store.get('audit') || []).slice();
  audit.unshift(entry);
  store.set('audit', audit);
}

export const dataService = {
  getOverviewMetrics() {
    return liveRead(() => mock.overviewMetrics(), () => mock.overviewMetrics());
  },

  getZones() {
    return liveRead(() => mock.zones, () => mock.zones);
  },

  getHvacEquipment() {
    return liveRead(() => mock.equipment, () => mock.equipment);
  },

  getAlarms(filter = {}) {
    return liveRead(() => filterAlarms(currentAlarms(), filter), () => filterAlarms(currentAlarms(), filter));
  },

  async getTrendSeries(opts = {}) {
    const { zoneId = 'zone-main-store', metric = 'temp', state } = opts;
    const env = await liveRead(() => {
      if (state === 'empty') return mock.emptySeries;
      if (state === 'stale') return mock.staleSeries;
      const key = `${zoneId}:${metric}`;
      return mock.series[key] || mock.emptySeries;
    }, () => mock.staleSeries);
    // A Series with no points is an empty result (drives the AC-15 empty state).
    if (env.status === 'ok' && env.data && Array.isArray(env.data.points) && env.data.points.length === 0) {
      env.status = 'empty';
    }
    return env;
  },

  getAuditEntries(filter = {}) {
    return liveRead(() => {
      const live = store.get('audit') || [];
      let all = [...live, ...mock.auditEntries];
      if (filter.type) all = all.filter((e) => e.type === filter.type);
      if (filter.from) all = all.filter((e) => new Date(e.at) >= new Date(filter.from));
      if (filter.to) all = all.filter((e) => new Date(e.at) <= new Date(filter.to));
      return all;
    }, () => mock.auditEntries);
  },

  getNotificationStatus() {
    return liveRead(() => mock.notificationStatus, () => mock.notificationStatus);
  },

  // Demo-local mutation + audit append. Only meaningful in demo mode.
  acknowledgeAlarm(id, actor = 'Demo Operator') {
    const mode = store.get('mode');
    const nonDemo = nonDemoEnvelope(null);
    if (mode !== 'demo' && nonDemo) return Promise.resolve(nonDemo);
    const ackAt = nowIso();
    const acks = { ...(store.get('acknowledgements') || {}) };
    acks[id] = { ackBy: actor, ackAt };
    store.set('acknowledgements', acks);
    appendAudit({
      id: `aud-${Date.now()}`, at: ackAt, type: 'ack', source: id, actor,
      detail: `Acknowledged alarm ${id} (demo).`, illustrative: true,
    });
    const updated = currentAlarms().find((a) => a.id === id) || null;
    return Promise.resolve(envelope({ status: 'ok', source: 'demo', data: updated, asOf: ackAt }));
  },

  // Demo-local mutation + audit append.
  setZoneThreshold(zoneId, patch, actor = 'Demo Operator') {
    const mode = store.get('mode');
    const nonDemo = nonDemoEnvelope(null);
    if (mode !== 'demo' && nonDemo) return Promise.resolve(nonDemo);
    const at = nowIso();
    const overrides = { ...(store.get('overrides') || {}) };
    overrides[zoneId] = { ...(overrides[zoneId] || {}), ...patch };
    store.set('overrides', overrides);
    appendAudit({
      id: `aud-${Date.now()}`, at, type: 'config', source: zoneId, actor,
      detail: `Updated threshold override for ${zoneId} (demo).`, illustrative: true,
    });
    return Promise.resolve(envelope({ status: 'ok', source: 'demo', data: overrides[zoneId], asOf: at }));
  },
};

// Expose for in-browser console verification (design 9 / 10). Not used by app code.
if (typeof window !== 'undefined') {
  window.dataService = dataService;
}
