// Tests für backend/wetter.js – flightbuddyki.ch wird nachgestellt, die Uhr ist steuerbar.
// Aufruf: npm run test:backend
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createWeather } = require('./wetter');

const STATION = { id: 's1', source: 'holfuy', name: 'Teststation', lat: 47.19, lon: 9.08, alt_m: 1100, wind_dir_deg: 240, wind_speed_ms: 3.1, gust_ms: 5.2, temp_c: 8.4, age_s: 100, timestamp: '2026-10-28T12:00:00Z', secret: 'nicht weitergeben' };

function fake(routes) {
  const calls = [];
  const fn = async function (url, init) {
    calls.push({ url, headers: init.headers });
    const r = routes(url, calls.length);
    if (r instanceof Error) throw r;
    return new Response(JSON.stringify(r.body), { status: r.status || 200 });
  };
  fn.calls = calls;
  return fn;
}
function clock(t) { const c = () => c.t; c.t = t; return c; }
const get = (w, path) => w.handle(new Request('https://www.gkg.ch' + path));

test('Stationen: holt einmal, gibt nur bekannte Felder weiter, Region ist fest', async () => {
  const f = fake(() => ({ body: { stations: [STATION, { id: 'x', source: 'unbekannt', lat: 1, lon: 1 }], meta: { fetched_at: '2026-10-28T12:01:00Z' } } }));
  const w = createWeather({ fetch: f, now: clock(1e12), env: {} });
  const r = await get(w, '/api/wetter/stationen?lat=0&lon=0&radius_km=9999');
  const body = await r.json();
  assert.equal(r.status, 200);
  assert.equal(body.stations.length, 1);
  assert.equal(body.stations[0].secret, undefined);
  assert.equal(body.meta.stale, false);
  assert.match(f.calls[0].url, /^https:\/\/flightbuddyki\.ch\/api\/v1\/weather\/stations\?lat=47\.06&lon=9\.07&radius_km=35&/);
  assert.equal(f.calls[0].headers['X-Buddy-Key'], undefined);
});

test('Stationen: Zwischenspeicher 5 Minuten, gleichzeitige Anfragen teilen sich einen Abruf', async () => {
  const f = fake(() => ({ body: { stations: [STATION] } }));
  const now = clock(1e12);
  const w = createWeather({ fetch: f, now, env: {} });
  await Promise.all([get(w, '/api/wetter/stationen'), get(w, '/api/wetter/stationen'), get(w, '/api/wetter/stationen')]);
  assert.equal(f.calls.length, 1);
  now.t += 4 * 60 * 1000;
  await get(w, '/api/wetter/stationen');
  assert.equal(f.calls.length, 1);
  now.t += 2 * 60 * 1000;
  await get(w, '/api/wetter/stationen');
  assert.equal(f.calls.length, 2);
});

test('Stationen: bei Ausfall die letzten Werte, als veraltet markiert und mit gewachsenem Alter', async () => {
  let down = false;
  const f = fake(() => down ? new Error('weg') : { body: { stations: [STATION] } });
  const now = clock(1e12);
  const w = createWeather({ fetch: f, now, env: {} });
  await get(w, '/api/wetter/stationen');
  down = true;
  now.t += 10 * 60 * 1000;
  const r = await get(w, '/api/wetter/stationen');
  const body = await r.json();
  assert.equal(r.status, 200);
  assert.equal(body.meta.stale, true);
  assert.equal(r.headers.get('X-GKG-Stale'), '1');
  assert.equal(body.stations[0].age_s, 100 + 600);
  now.t += 3 * 60 * 60 * 1000;
  const late = await get(w, '/api/wetter/stationen');
  assert.equal(late.status, 503);
});

test('Prognose: ohne Vertrag gesperrt', async () => {
  const f = fake(() => ({ body: {} }));
  const w = createWeather({ fetch: f, now: clock(Date.parse('2026-10-28T08:00:00Z')), env: {} });
  const r = await get(w, '/api/wetter/prognose?platz=huesliberg');
  assert.equal(r.status, 404);
  assert.equal((await r.json()).enabled, false);
  assert.equal(f.calls.length, 0);
});

test('Prognose: mit Vertrag – richtiger Spot, Schlüssel nur zum Server, Tag geprüft, Felder bereinigt', async () => {
  const f = fake(() => ({ body: { spot_id: 'gkg-huesliberg', algorithm_version: 'fbki-thermik-0.7.0', classification_disclaimer: 'Klassifikation: FBKI', slots: [{ valid_at: '2026-10-28T11:00:00+00:00', climb_rate_ms_max: 1.8, climb_top_m: 2100, lcl_m: 2300, quality_class: 'gut', quality_score: 0.7, foehn_risk: false, warnings: [{ type: 'foehn', severity: 'warn', title: 'Föhn', text: 'Südföhn möglich', extra: 1 }], diagnostic: { intern: true } }] } }));
  const w = createWeather({ fetch: f, now: clock(Date.parse('2026-10-28T08:00:00Z')), env: { GKG_PROGNOSE_AKTIV: '1', FLIGHTBUDDYKI_API_KEY: 'geheim' } });
  const r = await get(w, '/api/wetter/prognose?platz=huesliberg');
  const body = await r.json();
  assert.equal(r.status, 200);
  assert.equal(f.calls[0].url, 'https://flightbuddyki.ch/api/v1/weather/thermik/spot/gkg-huesliberg?date=2026-10-28');
  assert.equal(f.calls[0].headers['X-Buddy-Key'], 'geheim');
  assert.equal(JSON.stringify(body).indexOf('geheim'), -1);
  assert.equal(body.slots[0].climb_rate_ms_max, 1.8);
  assert.equal(body.slots[0].diagnostic, undefined);
  assert.equal(body.slots[0].warnings[0].extra, undefined);
  assert.deepEqual(body.tage, ['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
  assert.equal((await get(w, '/api/wetter/prognose?platz=huesliberg&tag=2026-11-05')).status, 422);
  assert.equal((await get(w, '/api/wetter/prognose?platz=rufi')).status, 404);
});

test('Nur GET und nur die festen Pfade', async () => {
  const w = createWeather({ fetch: fake(() => ({ body: {} })), now: clock(1e12), env: {} });
  assert.equal((await w.handle(new Request('https://www.gkg.ch/api/wetter/stationen', { method: 'POST' }))).status, 405);
  assert.equal((await get(w, '/api/wetter/../../etc/passwd')).status, 404);
  assert.equal((await get(w, '/api/wetter/beliebig?url=https://evil.example')).status, 404);
});
