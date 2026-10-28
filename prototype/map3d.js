// GKG 3D-Karte – Start- und Landeplätze im Gelände (MapLibre GL 5).
// Lädt MapLibre erst bei Bedarf. Kartengrund aus tiles/ (512-px-Kacheln, tools/build-tiles.py), Linien, Namen,
// Wegnetz und Hike-&-Fly-Routen aus karte/ (tools/build-mapdata.py, tools/build-routes.js).
// Mit window.GKG_MAP_CONFIG = { imagery: 'swisstopo' } wird stattdessen das swisstopo-Luftbild verwendet.
window.GKGMap = (function () {
  var LIB = 'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js';
  // Kachel-Ringe wie in tools/build-tiles.py: aussen grob, innen fein
  var WIDE = [8.55, 46.65, 9.60, 47.45];
  var REGION = [8.80, 46.82, 9.34, 47.28];
  var CORE = [8.94, 46.89, 9.20, 47.23];
  var SWISSIMAGE = 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg';
  var AWS_DEM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
  var PITCH = 60;
  var LOCALE = {
    'NavigationControl.ResetBearing': 'Nach Norden ausrichten',
    'NavigationControl.ZoomIn': 'Hineinzoomen',
    'NavigationControl.ZoomOut': 'Herauszoomen',
    'CooperativeGesturesHandler.WindowsHelpText': 'Zum Zoomen Strg + Mausrad verwenden',
    'CooperativeGesturesHandler.MacHelpText': 'Zum Zoomen ⌘ + Mausrad verwenden',
    'CooperativeGesturesHandler.MobileHelpText': 'Mit zwei Fingern verschieben',
    'TerrainControl.Enable': '3D-Gelände einschalten',
    'TerrainControl.Disable': '3D-Gelände ausschalten',
    'Map.Title': 'Karte der Fluggebiete',
    'Marker.Title': 'Markierung'
  };

  var loading = null;
  function cfg() { return window.GKG_MAP_CONFIG || {}; }

  function load() {
    if (window.maplibregl) return Promise.resolve(window.maplibregl);
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = cfg().lib || LIB;
      s.async = true;
      s.onload = function () { window.maplibregl ? resolve(window.maplibregl) : reject(new Error('MapLibre fehlt')); };
      s.onerror = function () { loading = null; reject(new Error('MapLibre konnte nicht geladen werden')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  function webglOk() {
    try {
      var c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) { return false; }
  }

  function tileBase() {
    var b = cfg().tiles || 'tiles/';
    return /^https?:/.test(b) ? b : new URL(b, document.baseURI).href;
  }

  function token(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim();
    return v || fallback;
  }

  function isDark() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t) return t === 'dark';
    return !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  }

  function buildStyle() {
    var base = tileBase(), swiss = cfg().imagery === 'swisstopo';
    var dark = isDark();
    var layers = [
      { id: 'ground', type: 'background', paint: { 'background-color': token('surface-sunken', '#e9ede6') } },
      { id: 'base', type: 'raster', source: 'base', paint: { 'raster-fade-duration': 200, 'raster-brightness-max': dark ? 0.82 : 1 } }
    ];
    if (!swiss) {
      layers.push({ id: 'base-mid', type: 'raster', source: 'base-mid', minzoom: 11, paint: { 'raster-fade-duration': 200, 'raster-brightness-max': dark ? 0.82 : 1 } });
      layers.push({ id: 'base-hi', type: 'raster', source: 'base-hi', minzoom: 13, paint: { 'raster-fade-duration': 200, 'raster-brightness-max': dark ? 0.82 : 1 } });
    }
    var style = {
      version: 8,
      sources: {
        base: swiss
          ? { type: 'raster', tiles: [SWISSIMAGE], tileSize: 256, maxzoom: 19, attribution: '© swisstopo' }
          : { type: 'raster', tiles: [base + 'karte/{z}/{x}/{y}.webp'], tileSize: 512, minzoom: 7, maxzoom: 10, bounds: WIDE, attribution: 'Karte: GKG aus offenen Daten' },
        'base-mid': { type: 'raster', tiles: [base + 'karte/{z}/{x}/{y}.webp'], tileSize: 512, minzoom: 11, maxzoom: 12, bounds: REGION },
        'base-hi': { type: 'raster', tiles: [base + 'karte/{z}/{x}/{y}.webp'], tileSize: 512, minzoom: 13, maxzoom: 13, bounds: CORE },
        dem: swiss
          ? { type: 'raster-dem', tiles: [AWS_DEM], tileSize: 256, encoding: 'terrarium', maxzoom: 13 }
          : { type: 'raster-dem', tiles: [base + 'dem/{z}/{x}/{y}.png'], tileSize: 256, encoding: 'terrarium', minzoom: 6, maxzoom: 11, bounds: WIDE, attribution: 'Höhen: Terrain Tiles (Mapzen/AWS), u. a. EU-DEM © Copernicus' }
      },
      layers: layers,
      terrain: { source: 'dem', exaggeration: 1.3 },
      sky: {
        'sky-color': dark ? '#0b2430' : '#7fb8cf',
        'horizon-color': dark ? '#1c3a45' : '#e3eff1',
        'fog-color': dark ? '#16303a' : '#e8f1f1',
        'sky-horizon-blend': 0.7,
        'horizon-fog-blend': 0.7,
        'fog-ground-blend': 0.35,
        'atmosphere-blend': 0
      }
    };
    if (swiss) { delete style.sources['base-mid']; delete style.sources['base-hi']; }
    return style;
  }

  // Kartendaten aus karte/ – einmal geladen, dann aus dem Speicher
  var dataCache = {};
  function loadData(file) {
    if (!dataCache[file]) {
      var b = cfg().data || 'karte/';
      var url = /^https?:/.test(b) ? b + file : new URL(b + file, document.baseURI).href;
      dataCache[file] = fetch(url).then(function (r) { if (!r.ok) throw new Error(file + ': ' + r.status); return r.json(); });
      dataCache[file].catch(function () { delete dataCache[file]; });
    }
    return dataCache[file];
  }
  var netPromise = null;
  function loadNetwork() {
    if (!netPromise) {
      netPromise = loadData('netz.json').then(function (raw) { return window.GKGRoute.decode(raw); });
      netPromise.catch(function () { netPromise = null; });
    }
    return netPromise;
  }

  function zw(a, b, c, d) { return ['interpolate', ['linear'], ['zoom'], a, b, c, d]; }
  function kind(k) { return ['==', ['get', 'k'], k]; }
  function line(id, group, source, k, minzoom, paint, layout) {
    var def = { id: id, type: 'line', source: source, minzoom: minzoom || 0,
      layout: Object.assign({ 'line-join': 'round', 'line-cap': paint['line-dasharray'] ? 'butt' : 'round' }, layout || {}), paint: paint };
    if (k) def.filter = kind(k);
    return { id: id, g: group, def: def };
  }
  // Ebenen von unten nach oben; g = Gruppe zum Ein- und Ausblenden
  var WAY_LAYERS = [
    line('wg-gasse-case', 'wege', 'wege', 'gasse', 12.5, { 'line-color': '#b9b0a4', 'line-width': zw(12.5, 1.6, 14, 4.2) }),
    line('wg-gasse', 'wege', 'wege', 'gasse', 12.5, { 'line-color': '#ffffff', 'line-width': zw(12.5, 0.8, 14, 3) }),
    line('wg-fahrweg', 'wege', 'wege', 'fahrweg', 11.5, { 'line-color': '#8c6a43', 'line-width': zw(11.5, 0.8, 14, 2) }),
    line('wg-fussweg', 'wege', 'wege', 'fussweg', 12.5, { 'line-color': '#7a5236', 'line-width': zw(12.5, 0.9, 14, 1.8), 'line-dasharray': [1, 1.3] }),
    line('wg-pfad', 'wege', 'wege', 'pfad', 11.5, { 'line-color': '#b23a22', 'line-width': zw(11.5, 1, 14, 2.3), 'line-dasharray': [2.4, 1.4] })
  ];
  var LINE_LAYERS = [
    line('rd-neben-case', 'strassen', 'linien', 'neben', 10, { 'line-color': '#9d9585', 'line-width': zw(10, 1.6, 14, 6.5) }),
    line('rd-neben', 'strassen', 'linien', 'neben', 10, { 'line-color': '#ffffff', 'line-width': zw(10, 0.8, 14, 4.6) }),
    line('rd-haupt-case', 'strassen', 'linien', 'haupt', 0, { 'line-color': '#9b7424', 'line-width': zw(8.5, 1.4, 14, 8.5) }),
    line('rd-haupt', 'strassen', 'linien', 'haupt', 0, { 'line-color': '#ffd779', 'line-width': zw(8.5, 0.7, 14, 6.2) }),
    line('rd-auto-case', 'strassen', 'linien', 'autobahn', 0, { 'line-color': '#8c4a12', 'line-width': zw(8.5, 2, 14, 10) }),
    line('rd-auto', 'strassen', 'linien', 'autobahn', 0, { 'line-color': '#f3a24b', 'line-width': zw(8.5, 1.2, 14, 7.5) }),
    line('rl-bahn', 'strassen', 'linien', 'bahn', 9, { 'line-color': '#3f3f3f', 'line-width': zw(9, 1, 14, 3.2) }),
    line('rl-bahn-dash', 'strassen', 'linien', 'bahn', 12, { 'line-color': '#ffffff', 'line-width': zw(12, 0.6, 14, 1.6), 'line-dasharray': [3, 3] }),
    line('ln-strom', 'bahnen', 'linien', 'strom', 11.5, { 'line-color': '#5f6b73', 'line-width': zw(11.5, 0.7, 14, 1.5), 'line-dasharray': [5, 2.5], 'line-opacity': 0.85 }),
    line('ln-skilift', 'bahnen', 'linien', 'skilift', 11.5, { 'line-color': '#333333', 'line-width': zw(11.5, 0.8, 14, 1.5), 'line-dasharray': [2, 1] }),
    line('ln-seilbahn', 'bahnen', 'linien', 'seilbahn', 9.5, { 'line-color': '#111111', 'line-width': zw(9.5, 1, 14, 2.6) }),
    line('ln-material', 'bahnen', 'linien', 'material', 11, { 'line-color': '#c0392b', 'line-width': zw(11, 1, 14, 2.4), 'line-dasharray': [3, 1.5] }),
    line('hf-case', 'hikefly', 'hikefly', null, 10, { 'line-color': '#3a2f00', 'line-width': zw(10, 3.4, 14, 8), 'line-opacity': 0.55 }),
    line('hf-line', 'hikefly', 'hikefly', null, 10, { 'line-color': '#ffd400', 'line-width': zw(10, 1.8, 14, 4.6) }),
    line('rt-case', 'route', 'route', null, 0, { 'line-color': '#ffffff', 'line-width': zw(9, 5, 14, 10) }),
    line('rt-line', 'route', 'route', null, 0, { 'line-color': '#d9480f', 'line-width': zw(9, 3, 14, 6) })
  ];
  var EMPTY = { type: 'FeatureCollection', features: [] };

  function labelEl(l) {
    var d = document.createElement('div');
    d.className = 'pt-lb pt-lb-' + l.t + (l.r ? ' pt-lb-r' + l.r : '');
    d.setAttribute('aria-hidden', 'true');
    if (l.t === 'gipfel' || l.t === 'pass') {
      var sym = document.createElement('span'); sym.className = 'pt-lb-sym'; d.appendChild(sym);
      var n = document.createElement('span'); n.className = 'pt-lb-n'; n.textContent = l.n; d.appendChild(n);
      if (l.h != null) { var hh = document.createElement('span'); hh.className = 'pt-lb-h'; hh.textContent = String(l.h).replace(/\B(?=(\d{3})+(?!\d))/g, "'"); d.appendChild(hh); }
    } else d.textContent = l.n;
    return d;
  }

  function boundsOf(sites) {
    var w = 180, s = 90, e = -180, n = -90;
    sites.forEach(function (p) { w = Math.min(w, p.lon); e = Math.max(e, p.lon); s = Math.min(s, p.lat); n = Math.max(n, p.lat); });
    return [[w, s], [e, n]];
  }

  function distance(a, b) {
    var dx = (a.lon - b.lon) * 111320 * Math.cos(a.lat * Math.PI / 180), dy = (a.lat - b.lat) * 110540;
    return Math.sqrt(dx * dx + dy * dy);
  }

  var COMPASS = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
  function compass(deg) { return COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8]; }

  // Windstation: Pfeil zeigt, wohin der Wind weht; Zahl = Wind in km/h; Farbe = Lage (go/caution/stop)
  function stationEl(st, onPick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'pt-wx pt-wx-' + st.status + (st.live ? '' : ' is-sample');
    var label = st.station + ': ' + (st.wind == null ? 'kein Wind gemessen' : st.wind + ' km/h') + (st.direction != null ? ' aus ' + compass(st.direction) : '') + ', ' + st.statusLabel;
    b.setAttribute('aria-label', label);
    b.title = label;
    if (st.direction != null) {
      var arrow = document.createElement('span');
      arrow.className = 'pt-wx-arrow';
      arrow.style.transform = 'rotate(' + ((st.direction + 180) % 360) + 'deg)';
      arrow.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l6 9h-4v9h-4v-9H6z"/></svg>';
      b.appendChild(arrow);
    }
    var val = document.createElement('span');
    val.className = 'pt-wx-val';
    val.textContent = st.wind == null ? '–' : String(st.wind);
    b.appendChild(val);
    b.addEventListener('click', function (e) { e.stopPropagation(); onPick(st.id); });
    return b;
  }

  // Marker-Spitze genau auf der Koordinate: Tropfen ~48 px unter Oberkante, Landemarker in der Mitte
  function offsetFor(kind, active) {
    if (kind === 'landing') return [0, active ? -21 : -17];
    return [0, active ? -63 : -48];
  }

  /**
   * create(container, options) → Promise<api>
   * options: sites, onSelect(siteId), focusArea (Gebiet-ID für die Startansicht), renderMarker(el, site, active)
   */
  function create(container, o) {
    if (!webglOk()) return Promise.reject(new Error('Dieses Gerät kann keine 3D-Karten darstellen (WebGL fehlt).'));
    return load().then(function (ml) {
      var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      var sites = o.sites;
      var focusSites = o.focusArea ? sites.filter(function (s) { return s.areas.indexOf(o.focusArea) >= 0; }) : sites;
      var bearing = o.focusArea ? 0 : 168;
      var map = new ml.Map({
        container: container,
        style: buildStyle(),
        bounds: boundsOf(focusSites),
        fitBoundsOptions: { padding: 60, bearing: bearing },
        pitch: PITCH,
        bearing: bearing,
        maxPitch: 75,
        minZoom: 8.5,
        maxZoom: cfg().imagery === 'swisstopo' ? 17 : 14.2,
        maxBounds: [[8.70, 46.76], [9.45, 47.36]],
        cooperativeGestures: true,
        attributionControl: { compact: true },
        locale: LOCALE,
        renderWorldCopies: false,
        fadeDuration: 150
      });
      map.addControl(new ml.NavigationControl({ visualizePitch: true }), 'top-right');

      // Beschriftung: weit weg nur Marker; nahe beieinander liegende Plätze teilen sich ein Schild
      var quiet = {};
      sites.forEach(function (s, i) {
        for (var j = 0; j < i; j++) if (sites[j].kind === s.kind && distance(sites[j], s) < 450) quiet[s.id] = true;
      });
      function updateZoomClass() { container.classList.toggle('is-far', map.getZoom() < 11.2); }
      map.on('zoom', updateZoomClass);

      var markers = {}, active = null, terrainOn = true, wx = [];
      var groups = { strassen: true, bahnen: true, wege: true, hikefly: true, namen: true, route: true };
      var labels = [], shownLabels = new Map(), waypointMarkers = [], clickHandlers = [];

      function applyGroup(g) {
        WAY_LAYERS.concat(LINE_LAYERS).forEach(function (l) {
          if (l.g === g && map.getLayer(l.id)) map.setLayoutProperty(l.id, 'visibility', groups[g] ? 'visible' : 'none');
        });
        if (g === 'namen') updateLabels();
      }
      function addLines() {
        map.addSource('linien', { type: 'geojson', data: EMPTY, attribution: '© OpenStreetMap-Mitwirkende, Overture Maps' });
        map.addSource('hikefly', { type: 'geojson', data: EMPTY });
        map.addSource('route', { type: 'geojson', data: EMPTY });
        LINE_LAYERS.forEach(function (l) { map.addLayer(l.def); });
        loadData('linien.json').then(function (d) { if (map.getSource('linien')) map.getSource('linien').setData(d); }, function () {});
        loadData('hikefly.json').then(function (d) {
          if (!map.getSource('hikefly')) return;
          map.getSource('hikefly').setData({ type: 'FeatureCollection', features: d.routes.map(function (r) {
            return { type: 'Feature', properties: { site: r.site, from: r.from }, geometry: { type: 'LineString', coordinates: r.coords.map(function (c) { return [c[0], c[1]]; }) } };
          }) });
        }, function () {});
        loadData('orte.json').then(function (d) { labels = d.labels; updateLabels(); }, function () {});
      }
      // Wegnetz erst laden, wenn man nah genug ist (oder der Routenplaner es braucht) – 2,5 MB
      var waysAdded = false;
      function addWays() {
        if (waysAdded || !window.GKGRoute) return;
        waysAdded = true;
        loadNetwork().then(function (net) {
          if (!map.getStyle()) return;
          map.addSource('wege', { type: 'geojson', data: window.GKGRoute.toGeoJSON(net) });
          WAY_LAYERS.forEach(function (l) { map.addLayer(l.def, 'rd-neben-case'); });
          applyGroup('wege');
        }, function () { waysAdded = false; });
      }
      function maybeWays() { if (groups.wege && map.getZoom() >= 11.2) addWays(); }

      // Namen als HTML – nur die im Bild und ab ihrem Mindestzoom (sonst wären es 2000 Elemente)
      function updateLabels() {
        var zoom = map.getZoom(), want = new Set();
        if (groups.namen && labels.length) {
          var b = map.getBounds(), w = b.getWest() - 0.02, e = b.getEast() + 0.02, s = b.getSouth() - 0.02, n = b.getNorth() + 0.02;
          // In der geneigten Ansicht keine Namen am Horizont, in der Übersicht nur die Region selbst
          var horizon = map.getPitch() > 30 ? container.clientHeight * 0.22 : -1;
          for (var i = 0; i < labels.length; i++) {
            var l = labels[i];
            if (l.z > zoom + 0.01) break;
            if (l.c[0] < w || l.c[0] > e || l.c[1] < s || l.c[1] > n) continue;
            if (zoom < 10.5 && (l.c[0] < REGION[0] || l.c[0] > REGION[2] || l.c[1] < REGION[1] || l.c[1] > REGION[3])) continue;
            if (horizon > 0 && map.project(l.c).y < horizon) continue;
            want.add(i);
          }
        }
        shownLabels.forEach(function (m, i) { if (!want.has(i)) { m.remove(); shownLabels.delete(i); } });
        want.forEach(function (i) {
          if (shownLabels.has(i)) return;
          var l = labels[i], peak = l.t === 'gipfel' || l.t === 'pass';
          shownLabels.set(i, new ml.Marker({ element: labelEl(l), anchor: peak ? 'top' : 'center', offset: peak ? [0, -6] : [0, 0] }).setLngLat(l.c).addTo(map));
        });
      }
      map.on('moveend', function () { updateLabels(); maybeWays(); });
      map.on('click', function (e) { clickHandlers.forEach(function (fn) { fn(e.lngLat); }); });
      sites.forEach(function (s) {
        var el = document.createElement('div');
        el.className = 'pt-mk' + (quiet[s.id] ? ' pt-mk-quiet' : '');
        o.renderMarker(el, s, false);
        markers[s.id] = new ml.Marker({ element: el, anchor: 'top', offset: offsetFor(s.kind, false) }).setLngLat([s.lon, s.lat]).addTo(map);
      });

      function fly(cam) {
        if (reduced) map.jumpTo(cam); else map.flyTo(Object.assign({ speed: 1.1, curve: 1.5, essential: true }, cam));
      }
      function cameraFor(list, b) {
        var cam = map.cameraForBounds(boundsOf(list), { padding: { top: 80, bottom: 80, left: 60, right: 60 }, bearing: b }) || {};
        return { center: cam.center, zoom: Math.min((cam.zoom || 11) - (terrainOn ? 0.35 : 0), 13.2), bearing: b, pitch: terrainOn ? PITCH : 0 };
      }

      var api = {
        map: map,
        select: function (id) {
          if (active && markers[active]) { o.renderMarker(markers[active].getElement(), siteById(active), false); markers[active].setOffset(offsetFor(siteById(active).kind, false)); markers[active].getElement().classList.remove('is-active'); }
          active = id;
          var s = id && siteById(id);
          if (!s) return;
          o.renderMarker(markers[id].getElement(), s, true);
          markers[id].setOffset(offsetFor(s.kind, true));
          markers[id].getElement().classList.add('is-active');
          fly({ center: [s.lon, s.lat], zoom: Math.max(map.getZoom(), 12.6), pitch: terrainOn ? PITCH : 0 });
        },
        focusArea: function (areaId) {
          var list = sites.filter(function (s) { return s.areas.indexOf(areaId) >= 0; });
          if (list.length) fly(cameraFor(list, map.getBearing()));
        },
        overview: function () { fly(cameraFor(sites, 168)); },
        setTerrain: function (on) {
          terrainOn = on;
          map.setTerrain(on ? { source: 'dem', exaggeration: 1.3 } : null);
          fly({ pitch: on ? PITCH : 0, bearing: on ? map.getBearing() : 0 });
        },
        isTerrain: function () { return terrainOn; },
        setStations: function (list, onPick) {
          wx.forEach(function (m) { m.remove(); });
          wx = list.map(function (st) {
            return new ml.Marker({ element: stationEl(st, onPick), anchor: 'center' }).setLngLat([st.lon, st.lat]).addTo(map);
          });
        },
        showStations: function (on) { container.classList.toggle('hide-wx', !on); },
        focusPoint: function (lat, lon) { fly({ center: [lon, lat], zoom: Math.max(map.getZoom(), 12.2), pitch: terrainOn ? PITCH : 0 }); },
        setGroup: function (g, on) { groups[g] = !!on; if (g === 'wege' && on) addWays(); applyGroup(g); },
        groups: function () { return Object.assign({}, groups); },
        network: function () { addWays(); return loadNetwork(); },
        onClick: function (fn) { clickHandlers.push(fn); return function () { clickHandlers = clickHandlers.filter(function (x) { return x !== fn; }); }; },
        // Route des Planers: Linie und nummerierte Wegpunkte (verschiebbar, onDrag(i, lngLat))
        showRoute: function (coords) {
          var src = map.getSource('route');
          if (src) src.setData(coords && coords.length > 1 ? { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords.map(function (c) { return [c[0], c[1]]; }) } } : EMPTY);
        },
        setWaypoints: function (points, onDrag) {
          waypointMarkers.forEach(function (m) { m.remove(); });
          waypointMarkers = points.map(function (p, i) {
            var el = document.createElement('div');
            el.className = 'pt-wp' + (i === 0 ? ' is-start' : i === points.length - 1 && points.length > 1 ? ' is-end' : '');
            el.textContent = i === 0 ? 'A' : i === points.length - 1 && points.length > 1 ? 'B' : String(i);
            el.setAttribute('aria-label', (i === 0 ? 'Start' : i === points.length - 1 && points.length > 1 ? 'Ziel' : 'Zwischenpunkt ' + i) + ' – verschiebbar');
            var m = new ml.Marker({ element: el, draggable: !!onDrag }).setLngLat([p[0], p[1]]).addTo(map);
            if (onDrag) m.on('dragend', function () { var ll = m.getLngLat(); onDrag(i, [ll.lng, ll.lat]); });
            return m;
          });
        },
        fitLine: function (coords) {
          if (!coords || coords.length < 2) return;
          var w = 180, s = 90, e = -180, n = -90;
          coords.forEach(function (c) { w = Math.min(w, c[0]); e = Math.max(e, c[0]); s = Math.min(s, c[1]); n = Math.max(n, c[1]); });
          var cam = map.cameraForBounds([[w, s], [e, n]], { padding: { top: 100, bottom: 70, left: 60, right: 70 }, bearing: map.getBearing() }) || {};
          fly({ center: cam.center, zoom: Math.min((cam.zoom || 12) - (terrainOn ? 0.3 : 0), 14), bearing: map.getBearing(), pitch: terrainOn ? PITCH : 0 });
        },
        destroy: function () { map.remove(); }
      };
      function siteById(id) { return sites.filter(function (s) { return s.id === id; })[0]; }

      return new Promise(function (resolve, reject) {
        var done = false;
        map.once('load', function () { done = true; updateZoomClass(); addLines(); maybeWays(); resolve(api); });
        map.on('error', function (e) { if (!done && e && e.error && /style|WebGL/i.test(String(e.error.message))) { done = true; reject(e.error); } });
      });
    });
  }

  // WGS84 → LV95 (Näherungsformeln swisstopo, Genauigkeit ca. 1 m)
  function toLV95(lat, lon) {
    var p = (lat * 3600 - 169028.66) / 10000, l = (lon * 3600 - 26782.5) / 10000;
    var e = 2600072.37 + 211455.93 * l - 10938.51 * l * p - 0.36 * l * p * p - 44.54 * l * l * l;
    var n = 1200147.07 + 308807.95 * p + 3745.25 * l * l + 76.63 * p * p - 194.56 * l * l * p + 119.79 * p * p * p;
    return [Math.round(e), Math.round(n)];
  }

  return { create: create, load: load, supported: webglOk, toLV95: toLV95, region: WIDE, loadData: loadData, loadNetwork: loadNetwork };
})();
