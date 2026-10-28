// Wetterstationen von flightbuddyki.ch (BuddyServer, öffentlicher Endpunkt ohne Schlüssel):
//   GET /api/v1/weather/stations?lat=&lon=&radius_km=&sources=fanet,holfuy,swissmetnet
//   → { stations: [{ id, source, name, lat, lon, alt_m, wind_dir_deg, wind_speed_ms, gust_ms,
//                    temp_c, humidity_pct, pressure_hpa, age_s, timestamp }], meta: { count, bbox, fetched_at } }
// Live-Betrieb: Das GKG-Backend (backend/wetter.js) holt die Daten serverseitig und gibt sie zwischengespeichert
// unter /api/wetter/stationen weiter – GKG_CONFIG.weatherUrl zeigt dorthin (lokal: npm run serve).
// Ohne Backend versucht der Prototyp es direkt bei flightbuddyki.ch; der Server erlaubt Browser-Anfragen
// aber nur von freigegebenen Adressen. Ist nichts erreichbar (z. B. im Artifact), erscheinen Beispielwerte, klar markiert.
window.GKGStations = (function () {
  var DEFAULT_API = 'https://flightbuddyki.ch';
  var CENTER = { lat: 47.06, lon: 9.07 };
  var RADIUS_KM = 35;
  var TTL_MS = 5 * 60 * 1000;
  var SOURCE_LABEL = { fanet: 'WindBuddy (FANET)', holfuy: 'Holfuy', swissmetnet: 'MeteoSchweiz' };

  // Vorläufige Schwellen – legt das Ressort Sicherheit fest. Nur Orientierung, keine Freigabe.
  var LIMITS = { staleS: 1800, windStop: 28, gustStop: 35, gustCaution: 25, spreadCaution: 15 };

  // Beispielwerte nahe den Startplätzen – nur sichtbar, wenn flightbuddyki.ch nicht erreichbar ist.
  // Erfundene Werte und Standorte (etwas neben den Plätzen, damit die Marker sich nicht verdecken).
  var SAMPLE = [
    { id: 'beispiel-huesliberg', source: 'fanet', name: 'Beispielstation Hüsliberg', lat: 47.1922, lon: 9.0790, alt_m: 1030, wind_dir_deg: 235, wind_speed_ms: 3.6, gust_ms: 5.8, temp_c: 9.4, age_s: 140 },
    { id: 'beispiel-froni', source: 'fanet', name: 'Beispielstation Froni', lat: 47.0700, lon: 9.0870, alt_m: 1380, wind_dir_deg: 320, wind_speed_ms: 2.5, gust_ms: 4.4, temp_c: 7.1, age_s: 260 },
    { id: 'beispiel-bogmen', source: 'holfuy', name: 'Beispielstation Obere Bogmen', lat: 47.1885, lon: 9.0985, alt_m: 1450, wind_dir_deg: 250, wind_speed_ms: 4.4, gust_ms: 7.2, temp_c: 6.2, age_s: 380 },
    { id: 'beispiel-gumen', source: 'holfuy', name: 'Beispielstation Gumen', lat: 46.9575, lon: 8.9800, alt_m: 1900, wind_dir_deg: 170, wind_speed_ms: 5.3, gust_ms: 9.7, temp_c: 3.8, age_s: 90 },
    { id: 'beispiel-mollis', source: 'swissmetnet', name: 'Beispielstation Mollis', lat: 47.0790, lon: 9.0630, alt_m: 440, wind_dir_deg: 200, wind_speed_ms: 5.0, gust_ms: 8.6, temp_c: 13.9, age_s: 600 },
    { id: 'beispiel-elm', source: 'swissmetnet', name: 'Beispielstation Elm', lat: 46.9160, lon: 9.1700, alt_m: 980, wind_dir_deg: 150, wind_speed_ms: 1.9, gust_ms: 3.1, temp_c: 8.0, age_s: 2400 }
  ];

  var cache = null, pending = null, listeners = [];

  function cfg() { return window.GKG_CONFIG || {}; }
  function api() { return String(window.GKG_WEATHER_API || DEFAULT_API).replace(/\/$/, ''); }
  function url() {
    if (cfg().weatherUrl) return cfg().weatherUrl;
    return api() + '/api/v1/weather/stations?lat=' + CENTER.lat + '&lon=' + CENTER.lon + '&radius_km=' + RADIUS_KM + '&sources=fanet,holfuy,swissmetnet&min_age_s=3600';
  }
  function kmh(ms) { return ms == null ? null : Math.round(ms * 3.6); }
  function ago(s) {
    if (s == null) return '';
    if (s < 90) return 'vor 1 Min.';
    if (s < 3600) return 'vor ' + Math.round(s / 60) + ' Min.';
    return 'vor ' + Math.round(s / 3600) + ' Std.';
  }

  function classify(wind, gust, age) {
    if (age != null && age > LIMITS.staleS) return { status: 'caution', label: 'Veraltet' };
    if ((wind != null && wind >= LIMITS.windStop) || (gust != null && gust >= LIMITS.gustStop)) return { status: 'stop', label: 'Starker Wind' };
    if ((gust != null && gust >= LIMITS.gustCaution) || (gust != null && wind != null && gust - wind >= LIMITS.spreadCaution)) return { status: 'caution', label: 'Böig' };
    if (wind == null) return { status: 'caution', label: 'Kein Wind gemessen' };
    return { status: 'go', label: 'Wind schwach' };
  }

  function normalise(raw, live) {
    var wind = kmh(raw.wind_speed_ms), gust = kmh(raw.gust_ms);
    var c = classify(wind, gust, raw.age_s);
    // Felder so benannt, dass sie direkt in die WeatherCard passen (source = lesbare Quelle)
    return {
      id: String(raw.id), sourceId: raw.source, source: SOURCE_LABEL[raw.source] || raw.source,
      station: raw.name || ('Station ' + raw.id), lat: raw.lat, lon: raw.lon,
      altitude: raw.alt_m != null ? String(Math.round(raw.alt_m)).replace(/\B(?=(\d{3})+(?!\d))/g, "'") : undefined,
      wind: wind, gust: gust, direction: raw.wind_dir_deg, temperature: raw.temp_c == null ? null : Math.round(raw.temp_c),
      updated: ago(raw.age_s), ageS: raw.age_s, status: c.status, statusLabel: c.label, live: live
    };
  }

  function sample(reason) {
    return { live: false, reason: reason, fetchedAt: null, stations: SAMPLE.map(function (s) { return normalise(s, false); }) };
  }

  function emit() { listeners.forEach(function (fn) { try { fn(cache); } catch (e) { /* ein fehlerhafter Abonnent stoppt die anderen nicht */ } }); }

  function load(force) {
    if (!force && cache && cache.loadedAt && Date.now() - cache.loadedAt < TTL_MS) return Promise.resolve(cache);
    if (pending) return pending;
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 6000);
    pending = fetch(url(), { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined, headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        var list = (d && d.stations || []).filter(function (s) { return typeof s.lat === 'number' && typeof s.lon === 'number'; });
        if (!list.length) return sample('flightbuddyki.ch meldet keine Station in der Region');
        // stale: Das Backend konnte flightbuddyki.ch nicht erreichen und zeigt die letzten Werte
        return { live: true, stale: !!(d.meta && d.meta.stale), fetchedAt: d.meta && d.meta.fetched_at, stations: list.map(function (s) { return normalise(s, true); }) };
      })
      .catch(function (e) { return sample(e && e.name === 'AbortError' ? 'Zeitüberschreitung' : 'nicht erreichbar'); })
      .then(function (res) {
        clearTimeout(timer);
        res.loadedAt = Date.now();
        res.stations.sort(function (a, b) { return a.station.localeCompare(b.station, 'de'); });
        cache = res; pending = null; emit();
        return res;
      });
    return pending;
  }

  function subscribe(fn) {
    listeners.push(fn);
    if (cache) fn(cache);
    return function () { listeners = listeners.filter(function (x) { return x !== fn; }); };
  }

  function nearest(list, lat, lon) {
    var best = null, bd = Infinity;
    list.forEach(function (s) {
      var dx = (s.lon - lon) * Math.cos(lat * Math.PI / 180), dy = s.lat - lat, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = s; }
    });
    return best;
  }

  return { load: load, subscribe: subscribe, nearest: nearest, url: url, limits: LIMITS, sourceLabel: SOURCE_LABEL };
})();
