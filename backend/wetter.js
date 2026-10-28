// Wetter für gkg.ch – serverseitig von flightbuddyki.ch geholt und zwischengespeichert.
//
//   GET /api/wetter/stationen                 Windstationen der Region (FANET, Holfuy, MeteoSchweiz)
//   GET /api/wetter/prognose?platz=<id>&tag=  Prognose für einen Startplatz (Option, nur mit Vertrag)
//
// Warum über den eigenen Server: eine Anfrage an flightbuddyki.ch statt einer pro Besucher, bei einem
// Ausfall bleiben die letzten Werte sichtbar (als veraltet markiert), der Schlüssel für die Prognosen
// bleibt auf dem Server, und der BuddyServer muss gkg.ch nicht für Browser freigeben.
//
// Die Handler nehmen einen Web-Request und geben eine Web-Response zurück – so laufen sie unverändert
// als Next.js-Route (app/api/wetter/stationen/route.js: export const GET = req => handler.stations(req)),
// in Node 18+ (tools/serve.js) oder auf einer Edge-Plattform.
//
// Einstellungen (Umgebungsvariablen):
//   FLIGHTBUDDYKI_URL        Standard https://flightbuddyki.ch
//   FLIGHTBUDDYKI_API_KEY    Schlüssel von FlightBuddyKI für die Prognosen (Header X-Buddy-Key), nie im Browser
//   GKG_PROGNOSE_AKTIV       '1', sobald der Vertrag für die Prognosen läuft – sonst antwortet /prognose mit 404
'use strict';

const SPOTS = require('./prognose-spots.json');

// Region wie im Prototyp (prototype/stations.js): 35 km um Glarus
const REGION = { lat: 47.06, lon: 9.07, radius_km: 35, sources: 'fanet,holfuy,swissmetnet', min_age_s: 3600 };
const STATIONS_FRESH_MS = 5 * 60 * 1000;    // so lange gilt der Zwischenspeicher als frisch
const STATIONS_STALE_MS = 2 * 60 * 60 * 1000; // so lange zeigen wir bei einem Ausfall die letzten Werte
const FORECAST_FRESH_MS = 30 * 60 * 1000;
const FORECAST_STALE_MS = 6 * 60 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 8000;
const FORECAST_DAYS = 5; // so weit rechnet FlightBuddyKI voraus (heute + 4)
const SOURCES = ['fanet', 'holfuy', 'swissmetnet'];

function num(v) { return typeof v === 'number' && isFinite(v) ? v : null; }
function str(v, max) { return typeof v === 'string' ? v.slice(0, max || 200) : null; }

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }, headers || {})
  });
}

// Nur bekannte Felder weitergeben – was flightbuddyki.ch sonst noch schickt, landet nicht auf gkg.ch
function cleanStation(s) {
  if (!s || num(s.lat) == null || num(s.lon) == null || SOURCES.indexOf(s.source) < 0) return null;
  return {
    id: str(String(s.id), 80), source: s.source, name: str(s.name, 120), lat: s.lat, lon: s.lon, alt_m: num(s.alt_m),
    wind_dir_deg: num(s.wind_dir_deg), wind_speed_ms: num(s.wind_speed_ms), gust_ms: num(s.gust_ms), temp_c: num(s.temp_c),
    age_s: num(s.age_s), timestamp: str(s.timestamp, 40)
  };
}

const QUALITY = ['null', 'schwach', 'mittel', 'gut', 'sehr_gut'];
const SEVERITY = ['info', 'watch', 'warn', 'danger'];
function cleanSlot(s) {
  if (!s || typeof s.valid_at !== 'string') return null;
  return {
    valid_at: str(s.valid_at, 40), climb_rate_ms_max: num(s.climb_rate_ms_max), climb_top_m: num(s.climb_top_m), lcl_m: num(s.lcl_m),
    quality_class: QUALITY.indexOf(s.quality_class) >= 0 ? s.quality_class : null, quality_score: num(s.quality_score),
    tagestyp: str(s.tagestyp, 20), sun_pct: num(s.sun_pct), foehn_risk: s.foehn_risk === true, wind_aufwindschicht_kmh: num(s.wind_aufwindschicht_kmh),
    warnings: (Array.isArray(s.warnings) ? s.warnings : []).slice(0, 8).map(function (w) {
      return { type: str(w && w.type, 30), severity: SEVERITY.indexOf(w && w.severity) >= 0 ? w.severity : 'info', title: str(w && w.title, 80), text: str(w && w.text, 240) };
    })
  };
}

/**
 * Zwischenspeicher mit «frisch» und «noch brauchbar»: Ist der Eintrag älter als fresh, wird neu geholt;
 * schlägt das fehl, kommt der alte Eintrag zurück (stale: true), solange er jünger als stale ist.
 * Gleichzeitige Anfragen teilen sich einen Abruf.
 */
function createCache(now) {
  const entries = new Map(), pending = new Map();
  return function cached(key, freshMs, staleMs, load) {
    const hit = entries.get(key), t = now();
    if (hit && t - hit.at < freshMs) return Promise.resolve({ value: hit.value, at: hit.at, stale: false });
    if (pending.has(key)) return pending.get(key);
    const p = load().then(function (value) {
      entries.set(key, { value: value, at: now() });
      return { value: value, at: now(), stale: false };
    }, function (err) {
      if (hit && t - hit.at < staleMs) return { value: hit.value, at: hit.at, stale: true, error: err };
      throw err;
    }).finally(function () { pending.delete(key); });
    pending.set(key, p);
    return p;
  };
}

function createWeather(options) {
  const o = options || {};
  const env = o.env || process.env;
  const fetchFn = o.fetch || globalThis.fetch;
  const now = o.now || Date.now;
  const base = String(env.FLIGHTBUDDYKI_URL || 'https://flightbuddyki.ch').replace(/\/$/, '');
  const cached = createCache(now);

  function upstream(path, withKey) {
    const ctrl = new AbortController();
    const timer = setTimeout(function () { ctrl.abort(); }, o.timeoutMs || UPSTREAM_TIMEOUT_MS);
    const headers = { Accept: 'application/json', 'User-Agent': 'gkg.ch-wetter/1' };
    if (withKey && env.FLIGHTBUDDYKI_API_KEY) headers['X-Buddy-Key'] = env.FLIGHTBUDDYKI_API_KEY;
    return fetchFn(base + path, { headers: headers, signal: ctrl.signal })
      .then(function (r) {
        if (!r.ok) { const e = new Error('flightbuddyki.ch antwortet ' + r.status); e.status = r.status; throw e; }
        return r.json();
      })
      .finally(function () { clearTimeout(timer); });
  }

  function stations() {
    const q = '?lat=' + REGION.lat + '&lon=' + REGION.lon + '&radius_km=' + REGION.radius_km + '&sources=' + REGION.sources + '&min_age_s=' + REGION.min_age_s;
    return cached('stations', STATIONS_FRESH_MS, STATIONS_STALE_MS, function () {
      return upstream('/api/v1/weather/stations' + q, false).then(function (d) {
        const list = (d && Array.isArray(d.stations) ? d.stations : []).map(cleanStation).filter(Boolean);
        return { stations: list, fetched_at: d && d.meta && str(d.meta.fetched_at, 40) };
      });
    }).then(function (res) {
      const ageS = Math.round((now() - res.at) / 1000);
      // Bei veralteten Werten wächst das Alter jeder Messung mit
      const list = res.value.stations.map(function (s) { return Object.assign({}, s, { age_s: s.age_s == null ? null : s.age_s + ageS }); });
      return json({ stations: list, meta: { count: list.length, source: 'flightbuddyki.ch', fetched_at: res.value.fetched_at, cached_at: new Date(res.at).toISOString(), stale: res.stale } }, 200, {
        'Cache-Control': res.stale ? 'no-store' : 'public, max-age=60, stale-while-revalidate=240', 'X-GKG-Stale': res.stale ? '1' : '0'
      });
    }, function () {
      return json({ error: 'Die Windstationen sind gerade nicht erreichbar.', stations: [], meta: { count: 0, source: 'flightbuddyki.ch', stale: true } }, 503, { 'Cache-Control': 'no-store', 'Retry-After': '60' });
    });
  }

  function day(offset) {
    const d = new Date(now() + offset * 86400000);
    return d.toISOString().slice(0, 10);
  }

  function forecast(siteId, date) {
    if (env.GKG_PROGNOSE_AKTIV !== '1') return Promise.resolve(json({ error: 'Prognosen sind nicht freigeschaltet.', enabled: false }, 404, { 'Cache-Control': 'no-store' }));
    const spot = SPOTS.spots[siteId];
    if (!spot) return Promise.resolve(json({ error: 'Für diesen Platz gibt es keine Prognose.' }, 404));
    const days = []; for (let i = 0; i < FORECAST_DAYS; i++) days.push(day(i));
    const tag = date || days[0];
    if (days.indexOf(tag) < 0) return Promise.resolve(json({ error: 'tag muss zwischen ' + days[0] + ' und ' + days[days.length - 1] + ' liegen (YYYY-MM-DD).' }, 422));
    return cached('fc:' + spot + ':' + tag, FORECAST_FRESH_MS, FORECAST_STALE_MS, function () {
      return upstream('/api/v1/weather/thermik/spot/' + encodeURIComponent(spot) + '?date=' + tag, true).then(function (d) {
        return {
          slots: (d && Array.isArray(d.slots) ? d.slots : []).map(cleanSlot).filter(Boolean),
          algorithm_version: str(d && d.algorithm_version, 60), disclaimer: str(d && d.classification_disclaimer, 600)
        };
      });
    }).then(function (res) {
      return json({
        platz: siteId, tag: tag, tage: days, provider: 'FlightBuddyKI', attribution: SPOTS.attribution,
        algorithm_version: res.value.algorithm_version, disclaimer: res.value.disclaimer, slots: res.value.slots,
        meta: { cached_at: new Date(res.at).toISOString(), stale: res.stale }
      }, 200, { 'Cache-Control': res.stale ? 'no-store' : 'public, max-age=300' });
    }, function (e) {
      const notThere = e && e.status === 404;
      return json({ error: notThere ? 'Für diesen Tag ist noch keine Prognose gerechnet.' : 'Die Prognose ist gerade nicht erreichbar.' }, notThere ? 404 : 503, { 'Cache-Control': 'no-store' });
    });
  }

  // Einstieg für Next.js oder tools/serve.js: nur GET, nur die zwei festen Pfade – kein offener Proxy
  function handle(request) {
    const url = new URL(request.url);
    if (request.method !== 'GET' && request.method !== 'HEAD') return Promise.resolve(json({ error: 'Nur GET.' }, 405, { Allow: 'GET, HEAD' }));
    if (url.pathname === '/api/wetter/stationen') return stations();
    if (url.pathname === '/api/wetter/prognose') return forecast(url.searchParams.get('platz') || '', url.searchParams.get('tag'));
    return Promise.resolve(json({ error: 'Unbekannter Pfad.' }, 404));
  }

  return { handle: handle, stations: stations, forecast: forecast };
}

module.exports = { createWeather, cleanStation, cleanSlot, REGION };
