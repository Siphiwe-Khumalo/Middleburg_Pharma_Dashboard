// store.js — tiny observable demo-local state with localStorage persistence.
// Holds: mode, acknowledgements, per-zone threshold overrides, audit entries.
// Persists on every set(); hydrates on boot; corrupt/absent/version-mismatched
// values are discarded silently (no console output) per design 1.1 / 4.6.

const KEY = 'mbg_bms_demo_state_v1';

function defaults() {
  return {
    mode: 'demo',
    acknowledgements: {}, // alarmId -> { ackBy, ackAt }
    overrides: {},        // zoneId  -> threshold patch
    audit: [],            // appended AuditEntry records (demo-local, session-grown)
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaults();
    // Shallow-merge over defaults so a partial/older-shaped object is tolerated.
    return Object.assign(defaults(), parsed);
  } catch (_e) {
    // Corrupt value: discard, reset to defaults, no console output (AC-7).
    return defaults();
  }
}

const state = load();
const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (_e) {
    // Quota/denied: in-memory state continues. No console.error.
  }
}

export const store = {
  get(key) {
    return key === undefined ? state : state[key];
  },
  set(key, value) {
    state[key] = value;
    persist();
    listeners.forEach((fn) => fn(state));
  },
  // Merge-update (useful for nested maps like overrides/acknowledgements).
  update(partial) {
    Object.assign(state, partial);
    persist();
    listeners.forEach((fn) => fn(state));
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  // Exposed for the storage key suffix (version bump support, design 4.6).
  STORAGE_KEY: KEY,
};
