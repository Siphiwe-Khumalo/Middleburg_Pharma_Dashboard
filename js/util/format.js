// format.js — timestamp formatting (Africa/Johannesburg), number/unit
// formatting, relative time, and staleness computation.

import { facility } from '../config/config.js';

const TZ = facility.timeZone; // 'Africa/Johannesburg'
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Returns the calendar/clock parts of `date` as observed in Africa/Johannesburg.
function tzParts(date) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = {};
  for (const p of fmt.formatToParts(date)) parts[p.type] = p.value;
  // Normalise "24" hour (some engines) to "00".
  if (parts.hour === '24') parts.hour = '00';
  return parts;
}

// Full timestamp: 'ddd DD MMM YYYY · HH:mm:ss SAST'
export function formatTimestamp(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  const p = tzParts(d);
  return `${p.weekday} ${p.day} ${p.month} ${p.year} · ${p.hour}:${p.minute}:${p.second} SAST`;
}

// Short date: 'DD MMM YYYY'
export function formatDateShort(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  const p = tzParts(d);
  return `${p.day} ${p.month} ${p.year}`;
}

// Short time: 'HH:mm'
export function formatTimeShort(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  const p = tzParts(d);
  return `${p.hour}:${p.minute}`;
}

// Short date-time: 'DD MMM · HH:mm'
export function formatDateTimeShort(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  const p = tzParts(d);
  return `${p.day} ${p.month} · ${p.hour}:${p.minute}`;
}

// Number/unit formatting.
export function formatNumber(value, digits = 1) {
  if (value == null || typeof value !== 'number' || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

const UNIT_LABELS = { degC: '°C', pct: '%', count: '', 'm3/h': 'm³/h' };
export function formatUnit(unit) {
  if (unit == null) return '';
  return UNIT_LABELS[unit] !== undefined ? UNIT_LABELS[unit] : unit;
}

export function formatValueUnit(value, unit, digits = 1) {
  const n = formatNumber(value, digits);
  if (n === '—') return '—';
  const u = formatUnit(unit);
  return u ? `${n}${u === '°C' || u === '%' ? '' : ' '}${u}` : n;
}

// Relative time: 'x min ago' / 'x h ago' / 'just now'.
export function relativeTime(input, now = Date.now()) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  const secs = Math.round((now - d.getTime()) / 1000);
  if (secs < 0) return 'just now';
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.floor(hrs / 24);
  return `${days} d ago`;
}

// computeQuality(asOf, freshness) -> 'good' | 'stale'.
// Older than freshness.staleAfterSec -> 'stale', else 'good'.
export function computeQuality(asOf, freshness, now = Date.now()) {
  if (!asOf) return 'stale';
  const d = asOf instanceof Date ? asOf : new Date(asOf);
  if (Number.isNaN(d.getTime())) return 'stale';
  const ageSec = (now - d.getTime()) / 1000;
  return ageSec > freshness.staleAfterSec ? 'stale' : 'good';
}
