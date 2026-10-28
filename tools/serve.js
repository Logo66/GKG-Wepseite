// Kleiner statischer Server für build/prototype/ – die 3D-Karte lädt ihre Kacheln per fetch,
// das geht nicht über file://. Aufruf: npm run serve  →  http://localhost:8080
const http = require('http');
const fs = require('fs');
const path = require('path');

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };

function start(dir, port) {
  const root = path.resolve(dir);
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
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
