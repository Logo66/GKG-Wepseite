// Rechnet die Hike-&-Fly-Routen zu den Startplätzen vor → build/mapdata/hikefly.json
// Gleicher Routenplaner wie im Browser (prototype/routing.js), Wegnetz aus build/mapdata/netz.json.
// Die Ausgangspunkte sind Landeplätze, Tal- und Bergstationen; wo gkg.ch eine Zeit nennt, steht sie zum Vergleich dabei.
// Aufruf: node tools/build-routes.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = require('../prototype/routing.js');

const root = path.resolve(__dirname, '..');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'prototype', 'data.js'), 'utf8'), ctx);
const D = ctx.window.GKG_DATA;
const site = id => D.sites.find(s => s.id === id);

// Ausgangspunkte: Koordinaten der Bahnstationen aus Overture/OpenStreetMap (tools/fetch-overture.py)
const FROM = {
  rufi: { name: 'Landeplatz Rufi', lon: site('rufi').lon, lat: site('rufi').lat },
  mollis: { name: 'Landeplatz Mollis', lon: site('mollis-lp').lon, lat: site('mollis-lp').lat },
  niederurnen: { name: 'Talstation Luftseilbahn Niederurnen', lon: 9.04674, lat: 47.12501 },
  morgenholz: { name: 'Bergstation Morgenholz', lon: 9.02012, lat: 47.12553 },
  gumen: { name: 'Bergstation Gumen', lon: 8.98457, lat: 46.95604 },
  elm: { name: 'Talstation Gondelbahn Elm', lon: 9.16242, lat: 46.91365 }
};
const ROUTES = [
  { site: 'altwis', from: 'rufi', gkg: 'gkg.ch: Aufstieg ca. 1 h 30 min' },
  { site: 'bogmen', from: 'rufi', gkg: 'gkg.ch: Wanderung ab Rufi ca. 2 h 30 min' },
  { site: 'huesliberg', from: 'rufi', gkg: 'Üblich ist das Taxi ab Rufi.' },
  { site: 'hirzli', from: 'morgenholz', gkg: 'gkg.ch: ca. 1 h 30 min, mit der Seilbahn kürzer' },
  { site: 'hirzli', from: 'niederurnen' },
  { site: 'kerenzer', from: 'mollis' },
  { site: 'froni', from: 'mollis', gkg: 'Üblich ist Taxi oder Sammelbus.' },
  { site: 'gumengrat', from: 'gumen', gkg: 'gkg.ch: Aufstieg ca. 30 min' },
  { site: 'aempaechli', from: 'elm', gkg: 'Üblich ist die Gondelbahn.' }
];

const raw = JSON.parse(fs.readFileSync(path.join(root, 'build', 'mapdata', 'netz.json'), 'utf8'));
const net = R.decode(raw);

// Linie für die Karte ausdünnen: Punkt nur, wenn > 12 m vom letzten behaltenen
function thin(coords) {
  const out = [coords[0]];
  for (let i = 1; i < coords.length - 1; i++) {
    const a = out[out.length - 1], b = coords[i];
    const dx = (b[0] - a[0]) * 75900, dy = (b[1] - a[1]) * 110540;
    if (dx * dx + dy * dy > 144) out.push(b);
  }
  out.push(coords[coords.length - 1]);
  return out.map(c => [Math.round(c[0] * 1e5) / 1e5, Math.round(c[1] * 1e5) / 1e5, Math.round(c[2])]);
}

const out = [];
for (const r of ROUTES) {
  const s = site(r.site), f = FROM[r.from];
  const res = R.route(net, [[f.lon, f.lat], [s.lon, s.lat]]);
  if (res.error) { console.warn(`${s.name} ab ${f.name}: ${res.error}`); continue; }
  const fast = R.route(net, [[f.lon, f.lat], [s.lon, s.lat]], { rate: 500 });
  const item = {
    site: r.site, from: f.name, fromC: [f.lon, f.lat], km: +res.km.toFixed(2), up: Math.round(res.up), down: Math.round(res.down),
    hours: +res.hours.toFixed(2), hoursFast: +fast.hours.toFixed(2), snapEnd: Math.round(res.snap[res.snap.length - 1].dist),
    gkg: r.gkg || null, coords: thin(res.coords)
  };
  out.push(item);
  console.log(`${s.name.padEnd(14)} ab ${f.name.padEnd(36)} ${item.km.toFixed(1)} km, ↑${item.up} m ↓${item.down} m, ${R.hm(item.hours)} (500 Hm/h: ${R.hm(item.hoursFast)}), Ziel ${item.snapEnd} m neben Weg${r.gkg ? ' · ' + r.gkg : ''}`);
}
fs.writeFileSync(path.join(root, 'build', 'mapdata', 'hikefly.json'), JSON.stringify({
  hinweis: 'Berechnet auf dem Wegnetz aus OpenStreetMap (Overture). Vorschlag – Weg vor Ort prüfen, Wildruhezonen, Alpbetrieb und Wegrechte beachten.',
  attribution: raw.attribution, routes: out
}));
console.log(out.length + ' Routen → build/mapdata/hikefly.json');
