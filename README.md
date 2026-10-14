# Middelburg Pharmaceutical Facility — BMS Dashboard (Frontend)

**Facility Environmental Monitoring** — a desktop-first Building Management System
(BMS) dashboard for monitoring environmental conditions (temperature, humidity) and
HVAC equipment in a pharmaceutical warehouse associated with a Department of Health
project in Middelburg, Mpumalanga, South Africa. Built for **Spartcon Technologies**.

> **Demonstration build.** Every reading in this app is illustrative placeholder
> data, not real site telemetry. The app runs in **Demo** mode by default and never
> presents mock data as a live/connected feed. It makes no regulatory, certification,
> or endorsement claims and carries no government branding.

---

## 1. Implementation summary

A static, framework-free single-page application built entirely with **HTML5, CSS3,
and vanilla JavaScript (ES modules)** — no build step, no bundler, no package manager
at runtime. The app presents seven pages behind a persistent header + left-sidebar
shell, driven by hash-based routing (`#/overview`, `#/environmental`, …).

- **Shell** — a fixed header (facility name, location, monitoring-service status,
  connection status, Demo/Connected/Offline mode indicator, live Africa/Johannesburg
  clock, notification bell with active-alarm count) and a 7-item sidebar, rendered
  once and never duplicated on navigation.
- **Overview — "Environmental Assurance"** — four metric cards (space temperature,
  relative humidity, HVAC availability, active alarms), a conditional alarm-summary
  banner, a temperature trend chart with an acceptable-range band and a *Demo state
  simulator* (Normal / Loading / Empty / Error), a storage-zone table, a recent-events
  list, and an interactive Leaflet + OpenStreetMap facility map.
- **Environmental Conditions** — per-zone actual-vs-setpoint temperature with an
  unmistakable visual distinction, a **disabled, demonstration-only** setpoint control
  that performs no write, and **monitoring-only** humidity with zero control affordances.
- **HVAC Systems** — responsive equipment cards (identifier, name, operating state,
  space/supply temp, airflow, heating %, cooling %, alarm status, last update) with all
  Start/Stop/mode controls disabled and labelled demonstration-only.
- **Alarm Register** — Active / Acknowledged / Cleared tabs, severity/zone/date filters,
  a searchable sortable table, a detail modal with reading-vs-threshold and a clearly
  labelled demonstration notification-delivery area, and an *Acknowledge (demo)* action
  that updates local state and writes an Audit Trail entry.
- **Trends & Reports** — temperature and humidity history charts (24h / 7d / 30d ranges,
  zone multi-select, per-zone range bands), an HVAC operating-state stepped chart, a
  **Print report** button (print CSS), and **Export CSV** (client-side Blob download).
- **Audit Trail** — a sortable, filterable, searchable log of acknowledgements, config
  changes, notifications, communication interruptions, and service restarts, seeded from
  demo data and growing live as you acknowledge alarms or edit thresholds.
- **Settings** — editable per-zone thresholds (validated, demo-local) reflected app-wide,
  a Demo/Connected/Offline mode selector that updates the header, read-only facility info
  and time zone, and a read-only view of illustrative sample point mappings. No secrets.

All telemetry flows through a single **data-service seam** (`js/services/dataService.js`)
that returns discriminated result envelopes (`ok` / `loading` / `empty` / `error` /
`offline`). Pages are presentational and call only the data service; swapping the mock
source for a real backend is isolated to the service's `connected` branch.

## 2. Files created / modified

**Created in this feature (FEAT-003):**

- `README.md` — this file.
- `js/pages/overview.js`, `environmental.js`, `hvac.js`, `alarms.js`, `trends.js`,
  `audit.js`, `settings.js` — the seven full page modules (replacing the FEAT-001 stubs).

**Modified in this feature:**

- `index.html` — loads the vendored Leaflet and Chart.js as global `<script>`s so pages
  can use `L` and `Chart`.
- `css/styles.css` — added page-level component styles (alarm banner, segmented controls,
  equipment cards, alarm tabs, detail modal grid, settings forms, environmental panels)
  and extended the `@media print` report layout.

**Pre-existing foundation and components (FEAT-001 / FEAT-002), unchanged here:**

- `index.html`, `css/styles.css` (tokens/shell/responsive), `js/app.js`, `js/router.js`,
  `js/store.js`, `js/config/config.js`, `js/config/thresholds.js`, `js/data/mockData.js`,
  `js/services/dataService.js`, `js/util/format.js`, `js/util/csv.js`,
  `js/components/*.js` (statusBadge, stateBlock, icons, metricCard, dataTable, chart,
  facilityMap, modal, demoBanner), and the vendored libraries under `vendor/`.

## 3. How to run

No build step. Serve the directory as static files and open it in a browser:

```bash
cd /projects/sandbox && python3 -m http.server 8080
```

Then open <http://localhost:8080> (the app redirects to `#/overview`).

> If port 8080 is already in use, serve on any other port, e.g.
> `python3 -m http.server 8097` — the app is port-agnostic.

## 4. Dependencies added, and why

Only the two third-party libraries the brief permits are used, and both are **vendored**
locally under `vendor/` (committed primary copies) so the app works with no outbound
network:

- **Leaflet 1.9.4** (`vendor/leaflet/`) — **required** for the interactive facility map
  with OpenStreetMap tiles, marker, popup, and zoom controls. If Leaflet or its tiles
  fail to load, the map degrades to an address fallback card with a working Google Maps
  directions link (no static decorative image).
- **Chart.js 4.4.x** (`vendor/chart/chart.umd.js`) — the lightweight charting library for
  the environmental trend and HVAC-state charts. If Chart.js is absent, the chart wrapper
  renders a "Chart library unavailable" state block (a single `console.warn`, never an
  error).

The Inter font is loaded from the Google Fonts CDN with a system-font fallback in the
CSS (fonts are intentionally **not** vendored); if the CDN is blocked, the system stack
renders without layout breakage. There are no frameworks, bundlers, or runtime package
managers.

## 5. Remaining tasks — Niagara N4 / JACE integration

The frontend is wired for a future backend but does not perform any live reads/writes.
To connect it to a real Niagara N4 / JACE system:

1. Implement the `connected` branch of each method in `js/services/dataService.js`
   (currently a `// TODO(Niagara)` stub returning a `NOT_CONFIGURED` envelope). Point it
   at the real API via `config.api.baseUrl` (currently empty) and map responses into the
   existing `Envelope` / `Reading` shapes so the pages need no changes.
2. Replace the illustrative entries in `js/config/config.js` `samplePointMappings` with
   the real controller point ORDs/IDs, and set `writable:true` only on points that are
   genuinely writable and permission-gated.
3. Enable the setpoint and HVAC Start/Stop/mode controls (Environmental & HVAC pages)
   only once writable point mappings, permissions, and write-back are confirmed; the
   controls are currently disabled and gated on `writable:false`.
4. Replace `js/data/mockData.js` as the demo source; it is imported only by the data
   service, so no page imports it directly.
5. Confirm per-zone thresholds and acceptable ranges in `js/config/thresholds.js` against
   approved site values (current values are illustrative).

## 6. Remaining tasks — real WhatsApp + email notifications

The Alarm Register shows a notification-delivery area, but it is **explicitly labelled
demonstration data** and no real messages are sent. To deliver real alerts:

1. Build the backend notification service (WhatsApp Business API + email/SMTP) — out of
   scope for this frontend-only deliverable.
2. Replace `js/data/mockData.js` `notificationStatus` (and the `notify.demo:true` flag on
   alarms) with real delivery records surfaced through
   `dataService.getNotificationStatus()`.
3. Remove the "Demonstration delivery status — real WhatsApp/email delivery is not yet
   configured" label in the alarm detail modal once genuine delivery status is available.
4. Store no credentials or API tokens in the frontend; secrets belong only in the backend
   service.

## 7. Assumptions requiring project-team confirmation

These were inferred where the brief was silent or where facts had to be fixed. The
project team (Aina / Spartcon) should confirm them:

- **A1 — Unverified warehouse location (please confirm).** The map marker uses the
  resolved corner coordinate **lat −25.7993, lon 29.4698**, geocoded via
  OpenStreetMap / Nominatim between two verified road reference points in Eastdene,
  Middelburg. This is a *resolved approximation of the supplied address, not a confirmed
  warehouse position.* The map is labelled **"Supplied Department of Health address —
  warehouse location to be confirmed."**
- **A2 — Illustrative zone names.** *Main Store*, *Dispatch*, and *Storage Zone B* are
  placeholders, not confirmed site zone names.
- **A3 — Illustrative thresholds and point mappings.** All environmental thresholds and
  controller point mappings are sample values, not approved site values or real IDs.
- **A4 — Charting library.** Chart.js was chosen within the brief's "lightweight charting
  library" allowance.
- **A5 — Hash-based SPA routing** so the header and sidebar render once.
- **A6 — Time zone.** All timestamps are displayed in **Africa/Johannesburg (SAST)**.
- **A7 — No persistence backend.** Demo-local state (acknowledgements, threshold edits,
  mode) lives only in the browser (`localStorage` key `mbg_bms_demo_state_v1`).

---

## Attribution

Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
Map rendering by [Leaflet](https://leafletjs.com/). Charts by
[Chart.js](https://www.chartjs.org/). OpenStreetMap/Leaflet attribution is kept visible
on and beside the map as required by their licenses.
