// config.js — facility identity, location/coords, map label, directions URL,
// freshness windows, modes, empty API config (no secrets, S-7), and
// illustrative sample point mappings (S-11). Imported by dataService and
// Settings/Map only.

export const facility = {
  name: 'Middelburg Pharmaceutical Facility',
  subtitle: 'Facility Environmental Monitoring',
  locationLabel: 'Middelburg, Mpumalanga, South Africa',
  client: 'Spartcon Technologies',
  timeZone: 'Africa/Johannesburg',
};

// Supplied Department of Health address — warehouse location to be confirmed.
export const suppliedAddress =
  'Eastdene, Middelburg, Mpumalanga, South Africa';

// Geocoded via OpenStreetMap / Nominatim. Source: https://nominatim.openstreetmap.org/
// Marker is a RESOLVED APPROXIMATION of the supplied address corner, NOT a confirmed
// warehouse position (see requirements A1 / S-12). Verified road reference points:
//   Jaspis Street      : -25.7985732, 29.4705188  (OSM/Nominatim)
//   Dr. Mandela Drive  : -25.8007651, 29.4679624  (OSM/Nominatim)
export const location = {
  marker: { lat: -25.7993, lon: 29.4698 }, // resolved corner between the two verified roads
  references: {
    jaspisStreet:   { lat: -25.7985732, lon: 29.4705188 },
    drMandelaDrive: { lat: -25.8007651, lon: 29.4679624 },
  },
  mapLabel: 'Supplied Department of Health address — warehouse location to be confirmed',
  attribution: '© OpenStreetMap contributors',
};

// Google Maps directions deep-link (destination = url-encoded supplied address).
export function directionsUrl() {
  return 'https://www.google.com/maps/dir/?api=1&destination='
    + encodeURIComponent(suppliedAddress);
}

export const freshness = { warnAfterSec: 300, staleAfterSec: 900 };

export const modes = ['demo', 'connected', 'offline'];
export const defaults = { mode: 'demo' };

export const api = { baseUrl: '' }; // intentionally empty; no secrets anywhere (S-7)

// ILLUSTRATIVE sample point mappings — NOT real controller point IDs (S-11, FR-6.4).
// Shaped like a Niagara ORD/point map so a later integration can replace values 1:1.
export const samplePointMappings = [
  { ref:'ahu-01', label:'AHU-01 Supply Temp',  samplePoint:'DEMO/AHU01/SupplyTemp (illustrative)',  writable:false },
  { ref:'ahu-01', label:'AHU-01 Airflow',      samplePoint:'DEMO/AHU01/Airflow (illustrative)',     writable:false },
  { ref:'ahu-02', label:'AHU-02 Supply Temp',  samplePoint:'DEMO/AHU02/SupplyTemp (illustrative)',  writable:false },
  { ref:'ahu-02', label:'AHU-02 Airflow',      samplePoint:'DEMO/AHU02/Airflow (illustrative)',     writable:false },
  { ref:'zone-main-store', label:'Main Store Space Temp', samplePoint:'DEMO/Zone/MainStore/Temp (illustrative)', writable:false },
  { ref:'zone-dispatch',   label:'Dispatch Space Temp',   samplePoint:'DEMO/Zone/Dispatch/Temp (illustrative)',  writable:false },
  { ref:'zone-storage-b',  label:'Storage Zone B Space Temp', samplePoint:'DEMO/Zone/StorageB/Temp (illustrative)', writable:false },
];
