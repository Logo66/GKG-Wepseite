// Kleiner Server für build/prototype/ – die 3D-Karte lädt ihre Kacheln per fetch, das geht nicht über file://.
// Dazu laufen die Wetter-Routen des GKG-Backends (backend/wetter.js): /api/wetter/stationen holt die Stationen
// von flightbuddyki.ch, /api/wetter/prognose die Prognosen (nur mit GKG_PROGNOSE_AKTIV=1 und Schlüssel).
// /config.js sagt dem Prototyp, dass er diese Routen nutzen soll. Aufruf: npm run serve  →  http://localhost:8080
const http = require('http');
const fs = require('fs');
const path = require('path');

const { createWeather } = require('../backend/wetter');

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };

// Node-Request → Web-Request → Handler → Node-Response
function api(weather, req, res) {
  weather.handle(new Request('http://' + (req.headers.host || 'localhost') + req.url, { method: req.method })).then(async r => {
    const headers = {};
    r.headers.forEach((v, k) => { headers[k] = v; });
    res.writeHead(r.status, headers);
    res.end(req.method === 'HEAD' ? undefined : Buffer.from(await r.arrayBuffer()));
  }, () => { res.writeHead(500); res.end(); });
}

function start(dir, port, options) {
  const root = path.resolve(dir);
  const o = options || {};
  const weather = o.api === false ? null : createWeather();
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (weather && url.indexOf('/api/wetter/') === 0) return api(weather, req, res);
    if (weather && url === '/config.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-cache' });
      return res.end('// Vom lokalen Server: Wetter über das GKG-Backend\nwindow.GKG_CONFIG = ' + JSON.stringify({ weatherUrl: '/api/wetter/stationen', forecastUrl: '/api/wetter/prognose', forecastLive: process.env.GKG_PROGNOSE_AKTIV === '1' }) + ';\n');
    }
    let file = path.join(root, url === '/' ? 'index.html' : url);
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('nicht gefunden'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}

module.exports = { start };

if (require.main === module) {
  const dir = path.resolve(__dirname, '..', 'build', 'prototype');
  const port = +(process.env.PORT || 8080);
  start(dir, port).then(() => console.log(`Prototyp läuft auf http://localhost:${port}`));
}
