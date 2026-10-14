// thresholds.js — PER-ZONE threshold bands (NOT shared) and status computation.
// Zones deliberately use DIFFERENT ranges (AC-28). Illustrative values (A3).
// There is NO global default band: every consumer must pass a zoneId.

export const zoneThresholds = {
  'zone-main-store': { temp:{ min:15, max:25, target:20, unit:'degC' }, rh:{ min:35, max:60, unit:'pct' } },
  'zone-dispatch':   { temp:{ min:15, max:30, target:22, unit:'degC' }, rh:{ min:30, max:65, unit:'pct' } },
  'zone-storage-b':  { temp:{ min:2,  max:8,  target:5,  unit:'degC' }, rh:{ min:40, max:70, unit:'pct' } }, // cold-chain-style, different range
};

// Status computation shared by badges/charts/metric cards.
// Returns 'normal' | 'warning' | 'critical' | 'unknown'.
export function classify(value, band /* {min,max} */, warnMarginPct = 0.1) {
  // 1) Missing/invalid readings are NEVER normal (S-6) -> grey unknown badge.
  if (value == null || typeof value !== 'number' || Number.isNaN(value)) return 'unknown';
  // 2) Degenerate band (min===max, or min>max): only an exact match is normal,
  //    everything else is critical; no meaningful warning margin exists.
  if (!(band.max > band.min)) return value === band.min ? 'normal' : 'critical';
  // 3) INWARD warning margin: warning is a zone just INSIDE each boundary,
  //    width = (max - min) * warnMarginPct. Critical is strictly OUTSIDE [min,max].
  const margin = (band.max - band.min) * warnMarginPct;
  if (value < band.min || value > band.max) return 'critical';               // outside range
  if (value < band.min + margin || value > band.max - margin) return 'warning'; // near an edge, inside
  return 'normal';                                                            // comfortably inside
}

// Effective thresholds for a zone: store override wins over the base band.
// NO global default — an unknown zoneId yields undefined.
export function effective(zoneId, store) {
  const overrides = (store && store.get && store.get('overrides')) || {};
  return overrides[zoneId] ?? zoneThresholds[zoneId];
}
