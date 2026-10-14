// csv.js — build a CSV string from a trend series and trigger a client-side
// Blob download via URL.createObjectURL + a temporary <a download>.

// Escape a CSV field per RFC 4180 (quote when it contains comma/quote/newline).
function escapeField(v) {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// Build a CSV string from a Series ({ metric, zoneId, unit, points:[{t,v}] }).
export function seriesToCsv(series) {
  const header = ['timestamp', 'zone', 'metric', 'value', 'unit'];
  const rows = [header.map(escapeField).join(',')];
  const points = (series && series.points) || [];
  for (const pt of points) {
    rows.push([
      escapeField(pt.t),
      escapeField(series.zoneId),
      escapeField(series.metric),
      escapeField(pt.v),
      escapeField(series.unit),
    ].join(','));
  }
  return rows.join('\r\n');
}

// Trigger a browser download of `csvString` named `filename`.
export function downloadCsv(csvString, filename = 'export.csv') {
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
