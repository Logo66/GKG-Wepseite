// Routenplaner auf dem Wegnetz der Region (karte/netz.json, gebaut mit tools/build-mapdata.py).
// Läuft im Browser (window.GKGRoute) und in Node (tools/build-routes.js rechnet damit die Hike-&-Fly-Routen vor).
//
// Gehzeit nach DIN 33466: 4 km/h in der Ebene, 300 Hm/h aufwärts, 500 Hm/h abwärts;
// Zeit = grösserer Anteil + halber kleinerer Anteil. Mit `rate` (Hm/h aufwärts) lässt sich das Tempo anpassen –
// alle drei Geschwindigkeiten skalieren dann im gleichen Verhältnis.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.GKGRoute = api;
})(typeof self !== 'undefined' ? self : this, function () {
  // Aufschlag beim Suchen: lieber Pfad und Fahrweg als Strasse. Die angezeigte Zeit rechnet ohne Aufschlag.
  var PREFER = { path: 1, track: 1, footway: 1, steps: 1.05, bridleway: 1, cycleway: 1.1, pedestrian: 1.05, living_street: 1.05,
    residential: 1.15, unclassified: 1.15, service: 1.1, unknown: 1.2, tertiary: 1.5, secondary: 2.2, primary: 3.5 };
  var LABEL = { path: 'Pfad', track: 'Fahrweg', footway: 'Fussweg', steps: 'Treppe', bridleway: 'Reitweg', cycleway: 'Radweg', pedestrian: 'Fussgängerzone',
    living_street: 'Begegnungszone', residential: 'Quartierstrasse', unclassified: 'Nebenstrasse', service: 'Zufahrt', unknown: 'Weg', tertiary: 'Verbindungsstrasse',
    secondary: 'Hauptstrasse', primary: 'Hauptstrasse' };
  // Gruppen für die Darstellung auf der Karte
  var GROUP = { path: 'pfad', bridleway: 'pfad', track: 'fahrweg', footway: 'fussweg', steps: 'fussweg', pedestrian: 'fussweg',
    cycleway: 'gasse', living_street: 'gasse', residential: 'gasse', unclassified: 'gasse', service: 'gasse', unknown: 'gasse',
    tertiary: null, secondary: null, primary: null };

  function din(km, up, down, rate) {
    var f = (rate || 300) / 300;
    var th = km / (4 * f), tv = up / (300 * f) + down / (500 * f);
    return Math.max(th, tv) + Math.min(th, tv) / 2;
  }

  function decode(raw) {
    var s = raw.scale, nN = raw.nodeCount, nE = raw.edgeCount;
    var lon = new Float64Array(nN), lat = new Float64Array(nN), ele = new Float32Array(nN);
    var x = 0, y = 0, k = 0, i;
    for (i = 0; i < nN; i++) { x += raw.nodes[k]; y += raw.nodes[k + 1]; lon[i] = x / s; lat[i] = y / s; ele[i] = raw.nodes[k + 2]; k += 3; }
    var A = new Int32Array(nE), B = new Int32Array(nE), C = new Uint8Array(nE), L = new Float32Array(nE), U = new Float32Array(nE), Dn = new Float32Array(nE);
    var gs = new Int32Array(nE), gl = new Int32Array(nE), gLon = [], gLat = [], gEle = [];
    var e = raw.edges; k = 0;
    for (i = 0; i < nE; i++) {
      A[i] = e[k]; B[i] = e[k + 1]; C[i] = e[k + 2]; L[i] = e[k + 3]; U[i] = e[k + 4]; Dn[i] = e[k + 5];
      var n = e[k + 6]; k += 7;
      gs[i] = gLon.length; gl[i] = n;
      var px = Math.round(lon[A[i]] * s), py = Math.round(lat[A[i]] * s), ph = ele[A[i]];
      for (var j = 0; j < n; j++) { px += e[k]; py += e[k + 1]; ph += e[k + 2]; gLon.push(px / s); gLat.push(py / s); gEle.push(ph); k += 3; }
    }
    // Nachbarschaftsliste (CSR)
    var deg = new Int32Array(nN + 1);
    for (i = 0; i < nE; i++) { deg[A[i] + 1]++; deg[B[i] + 1]++; }
    for (i = 0; i < nN; i++) deg[i + 1] += deg[i];
    var fill = deg.slice(0, nN), adj = new Int32Array(2 * nE);
    for (i = 0; i < nE; i++) { adj[fill[A[i]]++] = i; adj[fill[B[i]]++] = i; }
    // Zusammenhangskomponenten – beim Einrasten nur ins grosse Netz, nicht auf abgeschnittene Wegstücke
    var comp = new Int32Array(nN).fill(-1), sizes = [], stack = [];
    for (i = 0; i < nN; i++) {
      if (comp[i] >= 0) continue;
      var id = sizes.length, size = 0; comp[i] = id; stack.push(i);
      while (stack.length) {
        var v = stack.pop(); size++;
        for (var a = deg[v]; a < deg[v + 1]; a++) { var ed = adj[a], w = A[ed] === v ? B[ed] : A[ed]; if (comp[w] < 0) { comp[w] = id; stack.push(w); } }
      }
      sizes.push(size);
    }
    var net = { raw: raw, classes: raw.classes, n: nN, m: nE, lon: lon, lat: lat, ele: ele, A: A, B: B, C: C, L: L, U: U, D: Dn, gs: gs, gl: gl,
      gLon: Float64Array.from(gLon), gLat: Float64Array.from(gLat), gEle: Float32Array.from(gEle), off: deg, adj: adj, comp: comp, compSize: sizes, grid: null };
    buildGrid(net);
    return net;
  }

  var CELL = 0.005;
  function key(lon, lat) { return Math.floor(lon / CELL) + ':' + Math.floor(lat / CELL); }
  function buildGrid(net) {
    var g = {};
    for (var i = 0; i < net.n; i++) { var k = key(net.lon[i], net.lat[i]); (g[k] || (g[k] = [])).push(i); }
    net.grid = g;
  }
  function metres(lon1, lat1, lon2, lat2) {
    var dx = (lon2 - lon1) * 111320 * Math.cos((lat1 + lat2) / 2 * Math.PI / 180), dy = (lat2 - lat1) * 110540;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Nächster Knoten im grossen Netz (≥ 200 Knoten) innerhalb maxM Metern
  function snap(net, lon, lat, maxM) {
    var best = -1, bd = Infinity, cx = Math.floor(lon / CELL), cy = Math.floor(lat / CELL), r = Math.ceil((maxM || 400) / 350);
    for (var dx = -r; dx <= r; dx++) for (var dy = -r; dy <= r; dy++) {
      var list = net.grid[(cx + dx) + ':' + (cy + dy)];
      if (!list) continue;
      for (var i = 0; i < list.length; i++) {
        var v = list[i];
        if (net.compSize[net.comp[v]] < 200) continue;
        var d = metres(lon, lat, net.lon[v], net.lat[v]);
        if (d < bd) { bd = d; best = v; }
      }
    }
    return best >= 0 && bd <= (maxM || 400) ? { node: best, dist: bd } : null;
  }

  // Binärer Heap für Dijkstra
  function Heap() { this.k = []; this.v = []; }
  Heap.prototype.push = function (key, val) {
    var k = this.k, v = this.v, i = k.length; k.push(key); v.push(val);
    while (i > 0) { var p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; }
    k[i] = key; v[i] = val;
  };
  Heap.prototype.pop = function () {
    var k = this.k, v = this.v, top = v[0], lastK = k.pop(), lastV = v.pop(), n = k.length;
    if (n) {
      var i = 0;
      while (true) {
        var l = 2 * i + 1, r = l + 1, m = i, mk = lastK;
        if (l < n && k[l] < mk) { m = l; mk = k[l]; }
        if (r < n && k[r] < mk) { m = r; mk = k[r]; }
        if (m === i) break;
        k[i] = k[m]; v[i] = v[m]; i = m;
      }
      k[i] = lastK; v[i] = lastV;
    }
    return top;
  };
  Heap.prototype.size = function () { return this.k.length; };

  function edgeHours(net, e, forward, rate) {
    var up = forward ? net.U[e] : net.D[e], down = forward ? net.D[e] : net.U[e];
    return din(net.L[e] / 1000, up, down, rate);
  }

  function shortest(net, from, to) {
    var dist = new Float64Array(net.n).fill(Infinity), via = new Int32Array(net.n).fill(-1), h = new Heap();
    dist[from] = 0; h.push(0, from);
    while (h.size()) {
      var u = h.pop();
      if (u === to) break;
      var du = dist[u];
      for (var a = net.off[u]; a < net.off[u + 1]; a++) {
        var e = net.adj[a], fwd = net.A[e] === u, w = fwd ? net.B[e] : net.A[e];
        var c = du + edgeHours(net, e, fwd, 300) * (PREFER[net.classes[net.C[e]]] || 1.2);
        if (c < dist[w]) { dist[w] = c; via[w] = e; h.push(c, w); }
      }
    }
    if (!isFinite(dist[to])) return null;
    var path = [], v = to;
    while (v !== from) { var e2 = via[v]; path.push(e2); v = net.A[e2] === v ? net.B[e2] : net.A[e2]; }
    return path.reverse();
  }

  // Punkte einer Kante in Laufrichtung
  function edgePoints(net, e, fromNode) {
    var pts = [[net.lon[net.A[e]], net.lat[net.A[e]], net.ele[net.A[e]]]];
    for (var j = 0; j < net.gl[e]; j++) { var g = net.gs[e] + j; pts.push([net.gLon[g], net.gLat[g], net.gEle[g]]); }
    pts.push([net.lon[net.B[e]], net.lat[net.B[e]], net.ele[net.B[e]]]);
    return net.A[e] === fromNode ? pts : pts.reverse();
  }

  /**
   * Route über Wegpunkte [[lon, lat], …]. Ergebnis: Koordinaten [lon, lat, Höhe], Distanz, Auf-/Abstieg,
   * Zeit (Stunden) für das gewählte Tempo, Höhenprofil und Anteile je Wegart – oder { error }.
   */
  function route(net, points, opts) {
    var o = opts || {}, rate = o.rate || 300;
    if (!points || points.length < 2) return { error: 'Mindestens Start und Ziel wählen.' };
    var snapped = [];
    for (var i = 0; i < points.length; i++) {
      var s = snap(net, points[i][0], points[i][1], o.maxSnap || 400);
      if (!s) return { error: (i === 0 ? 'Beim Start' : i === points.length - 1 ? 'Beim Ziel' : 'Bei Punkt ' + (i + 1)) + ' liegt kein Weg in der Nähe (400 m).', index: i };
      snapped.push(s);
    }
    var coords = [], km = 0, up = 0, down = 0, hours = 0, byClass = {}, legs = [];
    for (var l = 0; l < snapped.length - 1; l++) {
      var a = snapped[l].node, b = snapped[l + 1].node;
      if (a === b) continue;
      if (net.comp[a] !== net.comp[b]) return { error: 'Zwischen Punkt ' + (l + 1) + ' und ' + (l + 2) + ' gibt es im Wegnetz keine Verbindung.' };
      var path = shortest(net, a, b);
      if (!path) return { error: 'Keine Route gefunden.' };
      var node = a, leg = { km: 0, up: 0, down: 0, hours: 0 };
      for (var p = 0; p < path.length; p++) {
        var e = path[p], fwd = net.A[e] === node;
        var pts = edgePoints(net, e, node);
        if (coords.length) pts.shift();
        Array.prototype.push.apply(coords, pts);
        var eu = fwd ? net.U[e] : net.D[e], ed = fwd ? net.D[e] : net.U[e], ek = net.L[e] / 1000;
        leg.km += ek; leg.up += eu; leg.down += ed; leg.hours += din(ek, eu, ed, rate);
        var cls = net.classes[net.C[e]];
        byClass[cls] = (byClass[cls] || 0) + net.L[e];
        node = fwd ? net.B[e] : net.A[e];
      }
      legs.push(leg); km += leg.km; up += leg.up; down += leg.down; hours += leg.hours;
    }
    if (!coords.length) return { error: 'Start und Ziel liegen am selben Punkt.' };
    // Höhenprofil: [Distanz km, Höhe m]
    var profile = [[0, coords[0][2]]], d = 0, maxE = coords[0][2], minE = coords[0][2];
    for (var c = 1; c < coords.length; c++) {
      d += metres(coords[c - 1][0], coords[c - 1][1], coords[c][0], coords[c][1]) / 1000;
      profile.push([d, coords[c][2]]);
      maxE = Math.max(maxE, coords[c][2]); minE = Math.min(minE, coords[c][2]);
    }
    return { coords: coords, km: km, up: up, down: down, hours: hours, rate: rate, maxEle: maxE, minEle: minE, profile: profile, byClass: byClass, legs: legs,
      snap: snapped.map(function (s) { return { lon: net.lon[s.node], lat: net.lat[s.node], dist: s.dist }; }) };
  }

  function hm(hours) {
    var m = Math.round(hours * 60 / 5) * 5, h = Math.floor(m / 60);
    return (h ? h + ' h ' : '') + String(m % 60).padStart(h ? 2 : 1, '0') + ' min';
  }

  function gpx(r, name) {
    function esc(t) { return String(t).replace(/[<>&"]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]; }); }
    var pts = r.coords.map(function (c) { return '<trkpt lat="' + c[1].toFixed(6) + '" lon="' + c[0].toFixed(6) + '"><ele>' + Math.round(c[2]) + '</ele></trkpt>'; }).join('\n      ');
    return '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="gkg.ch Routenplaner" xmlns="http://www.topografix.com/GPX/1/1">\n' +
      '  <metadata><name>' + esc(name) + '</name><copyright author="OpenStreetMap-Mitwirkende"><license>https://opendatacommons.org/licenses/odbl/</license></copyright></metadata>\n' +
      '  <trk><name>' + esc(name) + '</name><trkseg>\n      ' + pts + '\n  </trkseg></trk>\n</gpx>\n';
  }

  // Wegnetz als GeoJSON für die Karte: je Gruppe eine MultiLineString
  function toGeoJSON(net) {
    var groups = {};
    for (var e = 0; e < net.m; e++) {
      var g = GROUP[net.classes[net.C[e]]];
      if (!g) continue;
      var pts = edgePoints(net, e, net.A[e]).map(function (p) { return [p[0], p[1]]; });
      (groups[g] || (groups[g] = [])).push(pts);
    }
    return { type: 'FeatureCollection', features: Object.keys(groups).map(function (g) { return { type: 'Feature', properties: { k: g }, geometry: { type: 'MultiLineString', coordinates: groups[g] } }; }) };
  }

  return { decode: decode, route: route, snap: snap, din: din, hm: hm, gpx: gpx, toGeoJSON: toGeoJSON, LABEL: LABEL, GROUP: GROUP };
});
