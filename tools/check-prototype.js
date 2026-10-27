// Prüft den gebauten Prototyp: jede Seite auf Desktop- und Handy-Breite, hell und dunkel.
// Meldet JavaScript-Fehler und seitliches Überlaufen, spielt den Kauf der Jahreskarte einmal durch
// und legt Bildschirmfotos in build/prototype-shots/ ab. React wird aus node_modules geliefert.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const page0 = path.join(root, 'build', 'prototype', 'index.html');
const shots = path.join(root, 'build', 'prototype-shots');
if (!fs.existsSync(page0)) { console.error('Zuerst bauen: npm run prototype'); process.exit(1); }
fs.mkdirSync(shots, { recursive: true });

const ROUTES = ['start', 'fluggebiete', 'gebiet-braunwald', 'gebiet-hirzli', 'wetter', 'sport', 'verein', 'shop', 'jahreskarte', 'kontrolle', 'login'];
const VIEWPORTS = { desktop: { width: 1280, height: 900 }, phone: { width: 390, height: 844 } };
const LIBS = {
  'react/18.3.1/umd/react.production.min.js': 'react/umd/react.production.min.js',
  'react-dom/18.3.1/umd/react-dom.production.min.js': 'react-dom/umd/react-dom.production.min.js'
};

async function open(browser, vp, scheme) {
  const ctx = await browser.newContext({ viewport: VIEWPORTS[vp], colorScheme: scheme });
  await ctx.route('https://cdnjs.cloudflare.com/ajax/libs/**', route => {
    const key = Object.keys(LIBS).find(k => route.request().url().endsWith(k));
    if (!key) return route.abort();
    route.fulfill({ path: path.join(root, 'node_modules', LIBS[key]), contentType: 'text/javascript' });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(m.text()); });
  return { ctx, page, errors };
}

(async () => {
  const browser = await chromium.launch();
  let problems = 0;
  for (const vp of Object.keys(VIEWPORTS)) {
    for (const scheme of ['light', 'dark']) {
      const { ctx, page, errors } = await open(browser, vp, scheme);
      for (const r of ROUTES) {
        errors.length = 0;
        await page.goto('about:blank');
        await page.goto('file://' + page0 + '#' + r);
        await page.waitForTimeout(600);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (scheme === 'light' || r === 'start') await page.screenshot({ path: path.join(shots, `${r}.${vp}.${scheme}.png`), fullPage: true });
        const bad = errors.length || overflow > 0;
        if (bad) problems++;
        console.log(`${r.padEnd(17)} ${vp.padEnd(7)} ${scheme.padEnd(5)} ${bad ? 'PROBLEM' : 'ok'}${overflow > 0 ? ' · ' + overflow + 'px zu breit' : ''}${errors.length ? ' · ' + errors.join(' | ') : ''}`);
      }
      await ctx.close();
    }
  }

  // Kaufablauf einmal durchspielen (Handy, hell)
  const { ctx, page, errors } = await open(browser, 'phone', 'light');
  await page.goto('file://' + page0 + '#jahreskarte');
  await page.getByRole('button', { name: 'Jahreskarte kaufen' }).click();
  await page.fill('#f-first', 'Reto');
  await page.fill('#f-last', 'Test');
  await page.getByRole('button', { name: 'Weiter zur Zahlung' }).click();
  const blocked = await page.locator('.pt-error').count();
  await page.check('#f-terms');
  await page.getByRole('button', { name: 'Weiter zur Zahlung' }).click();
  await page.getByText('TWINT', { exact: true }).click();
  await page.getByRole('button', { name: /bezahlen$/ }).click();
  await page.waitForSelector('.gkg-pass', { timeout: 5000 });
  const holder = await page.locator('.gkg-pass-holder').textContent();
  await page.screenshot({ path: path.join(shots, 'flow-fertig.phone.png'), fullPage: true });
  await page.getByRole('link', { name: 'So sieht die Kontrolle aus' }).click();
  await page.getByRole('button', { name: 'Scan simulieren: gültige Karte' }).click();
  const scanned = await page.locator('.pt-result .pt-h3').textContent();
  await page.screenshot({ path: path.join(shots, 'flow-kontrolle.phone.png'), fullPage: true });
  await page.goto('file://' + page0 + '#start');
  await page.getByRole('button', { name: 'Menü' }).click();
  const menuVisible = await page.getByRole('link', { name: 'Wetter' }).isVisible();
  await page.screenshot({ path: path.join(shots, 'flow-menue.phone.png') });
  const flowOk = blocked > 0 && holder === 'Reto Test' && scanned === 'Reto Test' && menuVisible && !errors.length;
  if (!flowOk) problems++;
  console.log(`\nKaufablauf: ${flowOk ? 'ok' : 'PROBLEM'} (Pflichtfeld-Prüfung ${blocked > 0 ? 'greift' : 'fehlt'}, Karte für «${holder}», Kontrolle zeigt «${scanned}», Handy-Menü ${menuVisible ? 'öffnet' : 'öffnet nicht'}${errors.length ? ', Fehler: ' + errors.join(' | ') : ''})`);
  await ctx.close();
  await browser.close();
  console.log(`Bildschirmfotos in ${path.relative(root, shots)}/`);
  process.exit(problems ? 1 : 0);
})();
