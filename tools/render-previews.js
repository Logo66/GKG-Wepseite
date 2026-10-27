// Rendert jede Komponenten-Vorschau aus design-system/components/*/preview.html
// im hellen und im dunklen Theme und legt HTML + PNG in build/previews ab.
// tokens.css wird dafür aus design-system/tokens.json erzeugt (nur für die Vorschau,
// im Design-System-Artifact erzeugt die Seite diese Datei selbst).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { buildTokensCss } = require('./tokens-css');

const root = path.resolve(__dirname, '..');
const ds = path.join(root, 'design-system');
const out = path.join(root, 'build', 'previews');
fs.mkdirSync(out, { recursive: true });

const themes = JSON.parse(fs.readFileSync(path.join(ds, 'tokens.json'), 'utf8')).color.themes.map(t => t.id);
const css = buildTokensCss(path.join(ds, 'tokens.json'), 'attribute');
const tokensCss = path.join(root, 'build', 'tokens.css');
fs.writeFileSync(tokensCss, css);

const nm = path.join(root, 'node_modules');
const inject =
  `<link rel="stylesheet" href="file://${tokensCss}">` +
  `<link rel="stylesheet" href="file://${ds}/components/bundle.css">` +
  `<script src="file://${nm}/react/umd/react.production.min.js"></script>` +
  `<script src="file://${nm}/react-dom/umd/react-dom.production.min.js"></script>` +
  `<script src="file://${ds}/components/bundle.js"></script>`;

(async () => {
  const browser = await chromium.launch();
  const comps = fs.readdirSync(path.join(ds, 'components'))
    .filter(d => fs.existsSync(path.join(ds, 'components', d, 'preview.html')));
  let failed = 0;
  for (const name of comps) {
    const src = fs.readFileSync(path.join(ds, 'components', name, 'preview.html'), 'utf8');
    const marker = src.split('\n')[0];
    const height = +(/height=(\d+)/.exec(marker) || [0, 200])[1];
    const width = +(/width=(\d+)/.exec(marker) || [0, 960])[1];
    for (const th of themes) {
      const html = src.replace(/<html([^>]*)>/, `<html$1 data-theme="${th}">`).replace('<head>', '<head>' + inject);
      const file = path.join(out, `${name}.${th}.html`);
      fs.writeFileSync(file, html);
      const page = await browser.newPage({ viewport: { width, height } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await page.goto('file://' + file);
      await page.waitForTimeout(1000);
      const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.screenshot({ path: path.join(out, `${name}.${th}.png`), fullPage: true });
      if (errors.length) failed++;
      console.log(`${name.padEnd(13)} ${th.padEnd(5)} Höhe ${String(docHeight).padStart(4)} (Karte ${height})  ${errors.length ? 'FEHLER: ' + errors.join(' | ') : 'ok'}`);
      await page.close();
    }
  }
  await browser.close();
  console.log(`\nBilder und HTML in ${path.relative(root, out)}/`);
  process.exit(failed ? 1 : 0);
})();
