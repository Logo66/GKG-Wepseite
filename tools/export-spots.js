// Schreibt aus prototype/data.js:
//   backend/prognose-spots.json   welche FlightBuddyKI-Spot-ID zu welchem GKG-Startplatz gehört (für backend/wetter.js)
//   docs/flightbuddyki-spots.json Vorschlag der Startplätze im Spot-Format des BuddyServers (SpotConfig),
//                                 damit FlightBuddyKI die GKG-Plätze für die Prognose anlegen kann
// Aufruf: node tools/export-spots.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'prototype', 'data.js'), 'utf8'), ctx);
const D = ctx.window.GKG_DATA;
const DIR = { N: 0, NO: 45, O: 90, SO: 135, S: 180, SW: 225, W: 270, NW: 315 };

// Mittlere Richtung (Kreismittel) der Startrichtungen = Ausrichtung des Hangs
function aspect(dirs) {
  if (!dirs.length) return null;
  let x = 0, y = 0;
  dirs.forEach(d => { const a = DIR[d] * Math.PI / 180; x += Math.sin(a); y += Math.cos(a); });
  return Math.round(((Math.atan2(x, y) * 180 / Math.PI) + 360) % 360);
}

const starts = D.sites.filter(s => s.kind === 'start');
const mapping = {};
const spots = starts.map(s => {
  const id = 'gkg-' + s.id;
  mapping[s.id] = id;
  const a = aspect(s.dirs);
  const area = D.areas.find(x => x.id === s.areas[0]);
  return {
    id, name: s.name + (s.name.indexOf(area.name) >= 0 ? '' : ' (' + area.name + ')'),
    lat: s.lat, lon: s.lon, start_height_m: s.alt,
    aspect_deg: a == null ? 0 : a,
    relevant_layer_min_m: Math.max(500, Math.floor((s.alt - 100) / 100) * 100),
    relevant_layer_max_m: Math.min(5500, Math.ceil((s.alt + 2000) / 100) * 100),
    allowed_wind_sectors: s.dirs.length ? s.dirs.map(d => DIR[d]) : null,
    elevation_source: 'manual', country: 'CH', region: 'Ostschweiz', aliases: [area.name],
    notes: [s.check ? 'Angaben vom Ressort Fluggebiete noch zu bestätigen.' : null, a == null ? 'Startrichtung unbekannt – aspect_deg ist ein Platzhalter.' : null].filter(Boolean).join(' ') || null,
    attribution: ['Startplatzdaten: Gleitschirmklub Glarnerland (' + s.src + ')']
  };
});

fs.writeFileSync(path.join(root, 'backend', 'prognose-spots.json'), JSON.stringify({
  _hinweis: 'Erzeugt von tools/export-spots.js. Spot-IDs sind ein Vorschlag – gelten erst, wenn FlightBuddyKI die Plätze so angelegt hat.',
  attribution: 'Prognose: FlightBuddyKI · Wetterdaten ICON-D2 via Open-Meteo (CC BY 4.0)',
  spots: mapping
}, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'docs', 'flightbuddyki-spots.json'), JSON.stringify({
  _hinweis: 'Vorschlag des GKG für die Prognose-Spots auf dem BuddyServer (Format SpotConfig). Höhen und Richtungen aus prototype/data.js, gegen das Höhenmodell geprüft. relevant_layer_* nach der Regel des Spot-Loaders (Start − 100 m bis Start + 2000 m).',
  spots
}, null, 2) + '\n');
console.log(spots.length + ' Startplätze exportiert');
