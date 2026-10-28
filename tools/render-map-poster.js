// Rendert das Standbild der 3D-Karte (prototype/map-poster.jpg und map-poster-dark.jpg).
// Es erscheint sofort beim Öffnen der Fluggebiete, bis die interaktive Karte geladen ist.
// Aufruf nach jedem Wechsel von Kacheln, Kamera oder Farben: npm run poster
const path = require('path');
const { chromium } = require('playwright');
const { start } = require('./serve');

const root = path.resolve(__dirname, '..');
const PORT = 8174;
const MAPLIBRE = 'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js';
const LIBS = {
  'react/18.3.1/umd/react.production.min.js': 'react/umd/react.production.min.js',
  'react-dom/18.3.1/umd/react-dom.production.min.js': 'react-dom/umd/react-dom.production.min.js'
};

(async () => {
  const server = await start(path.join(root, 'build', 'prototype'), PORT);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme, deviceScaleFactor: 1 });
    await ctx.route(MAPLIBRE, r => r.fulfill({ path: path.join(root, 'node_modules', 'maplibre-gl', 'dist', 'maplibre-gl.js'), contentType: 'text/javascript' }));
    await ctx.route('https://cdnjs.cloudflare.com/ajax/libs/**', r => {
      const key = Object.keys(LIBS).find(k => r.request().url().endsWith(k));
      return key ? r.fulfill({ path: path.join(root, 'node_modules', LIBS[key]), contentType: 'text/javascript' }) : r.abort();
    });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/index.html#fluggebiete`);
    await page.waitForSelector('.pt-map3d-tools', { timeout: 60000 });
    await page.waitForTimeout(8000);
    await page.addStyleTag({ content: '.pt-mk, .pt-wx, .pt-lb, .maplibregl-control-container, .pt-map3d-tools { display: none !important; }' });
    await page.waitForTimeout(300);
    const file = path.join(root, 'prototype', scheme === 'dark' ? 'map-poster-dark.jpg' : 'map-poster.jpg');
    await page.locator('.pt-map3d').screenshot({ path: file, type: 'jpeg', quality: 72 });
    console.log('Standbild: ' + path.relative(root, file));
    await ctx.close();
  }
  await browser.close();
  server.close();
})();
