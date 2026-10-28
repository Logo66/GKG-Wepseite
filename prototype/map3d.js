// GKG 3D-Karte – Start- und Landeplätze im Gelände (MapLibre GL 5).
// Lädt MapLibre erst bei Bedarf. Kacheln kommen aus tiles/ (gebaut mit tools/build-tiles.py);
// mit window.GKG_MAP_CONFIG = { imagery: 'swisstopo' } wird stattdessen das swisstopo-Luftbild verwendet.
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
      layers.push({ id: 'base-mid', type: 'raster', source: 'base-mid', minzoom: 11.5, paint: { 'raster-fade-duration': 200, 'raster-brightness-max': dark ? 0.82 : 1 } });
      layers.push({ id: 'base-hi', type: 'raster', source: 'base-hi', minzoom: 12.5, paint: { 'raster-fade-duration': 200, 'raster-brightness-max': dark ? 0.82 : 1 } });
    }
    var style = {
      version: 8,
      sources: {
        base: swiss
          ? { type: 'raster', tiles: [SWISSIMAGE], tileSize: 256, maxzoom: 19, attribution: '© swisstopo' }
          : { type: 'raster', tiles: [base + 'relief/{z}/{x}/{y}.webp'], tileSize: 256, minzoom: 8, maxzoom: 11, bounds: WIDE, attribution: 'Relief: GKG aus offenen Höhendaten' },
        'base-mid': { type: 'raster', tiles: [base + 'relief/{z}/{x}/{y}.webp'], tileSize: 256, minzoom: 12, maxzoom: 12, bounds: REGION },
        'base-hi': { type: 'raster', tiles: [base + 'relief/{z}/{x}/{y}.webp'], tileSize: 256, minzoom: 13, maxzoom: 13, bounds: CORE },
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

  function boundsOf(sites) {
    var w = 180, s = 90, e = -180, n = -90;
    sites.forEach(function (p) { w = Math.min(w, p.lon); e = Math.max(e, p.lon); s = Math.min(s, p.lat); n = Math.max(n, p.lat); });
    return [[w, s], [e, n]];
  }

  function distance(a, b) {
    var dx = (a.lon - b.lon) * 111320 * Math.cos(a.lat * Math.PI / 180), dy = (a.lat - b.lat) * 110540;
    return Math.sqrt(dx * dx + dy * dy);
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
        maxZoom: cfg().imagery === 'swisstopo' ? 17 : 14.5,
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

      var markers = {}, active = null, terrainOn = true;
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
        destroy: function () { map.remove(); }
      };
      function siteById(id) { return sites.filter(function (s) { return s.id === id; })[0]; }

      return new Promise(function (resolve, reject) {
        var done = false;
        map.once('load', function () { done = true; updateZoomClass(); resolve(api); });
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

  return { create: create, load: load, supported: webglOk, toLV95: toLV95, region: WIDE };
})();
