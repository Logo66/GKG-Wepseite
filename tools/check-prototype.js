// Prüft den gebauten Prototyp: jede Seite auf Desktop- und Handy-Breite, hell und dunkel.
// Meldet JavaScript-Fehler und seitliches Überlaufen, spielt Kauf, Kontrolle, Verwaltung und «Mein GKG» durch
// und legt Bildschirmfotos in build/prototype-shots/ ab. React und MapLibre werden aus node_modules geliefert,
// flightbuddyki.ch durch Testdaten ersetzt (einmal auch abgeschaltet, um die Beispielwerte zu prüfen).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { start } = require('./serve');

const root = path.resolve(__dirname, '..');
const page0 = path.join(root, 'build', 'prototype', 'index.html');
const shots = path.join(root, 'build', 'prototype-shots');
if (!fs.existsSync(page0)) { console.error('Zuerst bauen: npm run prototype'); process.exit(1); }
fs.mkdirSync(shots, { recursive: true });

// Seiten mit Ressort (Verwaltung) bzw. angemeldetem Beispielmitglied («Mein GKG»)
const ROUTES = [
  { r: 'start' }, { r: 'fluggebiete' }, { r: 'gebiet-braunwald' }, { r: 'gebiet-hirzli' }, { r: 'wetter' }, { r: 'sport' }, { r: 'verein' },
  { r: 'shop' }, { r: 'jahreskarte' }, { r: 'kontrolle' },
  { r: 'verwaltung', role: 'praesidium' }, { r: 'verwaltung-mitglieder', role: 'aktuariat' }, { r: 'verwaltung-rechnungen', role: 'kasse' },
  { r: 'verwaltung-buchhaltung', role: 'kasse' }, { r: 'verwaltung-karten', role: 'fluggebiete' }, { r: 'verwaltung-rollen', role: 'admin' },
  { r: 'mein-gkg', member: null }, { r: 'mein-gkg', member: 'M-1001', shot: 'mein-gkg-lea' }, { r: 'mein-gkg-daten', member: 'M-1001' },
  { r: 'mein-gkg-rechnungen', member: 'M-1001' }, { r: 'mein-gkg-karte', member: 'M-1003' }, { r: 'mein-gkg-mitgliedschaft', member: 'M-1001' },
  { r: 'mein-gkg-einstellungen', member: 'M-1001' }
];
const VIEWPORTS = { desktop: { width: 1280, height: 900 }, phone: { width: 390, height: 844 } };
const LIBS = {
  'react/18.3.1/umd/react.production.min.js': 'react/umd/react.production.min.js',
  'react-dom/18.3.1/umd/react-dom.production.min.js': 'react-dom/umd/react-dom.production.min.js'
};
const MAPLIBRE = 'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js';
const PORT = 8173;
const BASE = `http://127.0.0.1:${PORT}/index.html`;

// Testdaten im Format von flightbuddyki.ch/api/v1/weather/stations – erfunden
const STATIONS = {
  stations: [
    { id: 'test-1', source: 'holfuy', name: 'Teststation Nord', lat: 47.194, lon: 9.081, alt_m: 1100, wind_dir_deg: 240, wind_speed_ms: 3.1, gust_ms: 5.2, temp_c: 8.4, humidity_pct: null, pressure_hpa: null, age_s: 130, timestamp: '2026-10-28T12:00:00Z' },
    { id: 'test-2', source: 'fanet', name: 'Teststation Mitte', lat: 47.068, lon: 9.085, alt_m: 1390, wind_dir_deg: 300, wind_speed_ms: 2.2, gust_ms: null, temp_c: 6.0, humidity_pct: null, pressure_hpa: null, age_s: 300, timestamp: '2026-10-28T12:00:00Z' },
    { id: 'test-3', source: 'swissmetnet', name: 'Teststation Tal', lat: 47.03, lon: 9.07, alt_m: 450, wind_dir_deg: null, wind_speed_ms: null, gust_ms: null, temp_c: 12.5, humidity_pct: 70, pressure_hpa: 960, age_s: 600, timestamp: '2026-10-28T12:00:00Z' },
    { id: 'test-4', source: 'holfuy', name: 'Teststation Süd', lat: 46.958, lon: 8.978, alt_m: 1900, wind_dir_deg: 180, wind_speed_ms: 8.6, gust_ms: 11.2, temp_c: 2.1, humidity_pct: null, pressure_hpa: null, age_s: 3000, timestamp: '2026-10-28T11:10:00Z' }
  ],
  meta: { count: 4, bbox: [8.6, 46.7, 9.5, 47.4], fetched_at: '2026-10-28T12:02:00Z' }
};

async function open(browser, vp, scheme, opts = {}) {
  const ctx = await browser.newContext({ viewport: VIEWPORTS[vp], colorScheme: scheme });
  await ctx.route(MAPLIBRE, route => route.fulfill({ path: path.join(root, 'node_modules', 'maplibre-gl', 'dist', 'maplibre-gl.js'), contentType: 'text/javascript' }));
  await ctx.route('https://cdnjs.cloudflare.com/ajax/libs/**', route => {
    const key = Object.keys(LIBS).find(k => route.request().url().endsWith(k));
    if (!key) return route.abort();
    route.fulfill({ path: path.join(root, 'node_modules', LIBS[key]), contentType: 'text/javascript' });
  });
  await ctx.route('https://flightbuddyki.ch/**', route => opts.offline ? route.abort() : route.fulfill({ contentType: 'application/json', body: JSON.stringify(STATIONS) }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {
    if (m.type() !== 'error' || /fonts\.g/.test(m.text())) return;
    if (opts.offline && /ERR_FAILED/.test(m.text())) return; // gewollt: flightbuddyki.ch abgeschaltet
    errors.push(m.text());
  });
  return { ctx, page, errors };
}

// Ressort bzw. Mitglied setzen, ohne die Oberfläche zu bedienen
async function prepare(page, route) {
  if (!route.role && route.member === undefined) return;
  await page.evaluate(r => {
    if (r.role) window.GKGStore.actions.setRole(r.role);
    if (r.member !== undefined) { if (r.member) window.GKGStore.actions.login(r.member); else window.GKGStore.actions.logout(); }
  }, route);
  await page.waitForTimeout(250);
}

const report = [];
let problems = 0;
function result(name, ok, detail) {
  if (!ok) problems++;
  console.log(`${name}: ${ok ? 'ok' : 'PROBLEM'}${detail ? ' (' + detail + ')' : ''}`);
  report.push({ name, ok, detail });
}

(async () => {
  const server = await start(path.dirname(page0), PORT);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const vp of Object.keys(VIEWPORTS)) {
    for (const scheme of ['light', 'dark']) {
      const { ctx, page, errors } = await open(browser, vp, scheme);
      for (const route of ROUTES) {
        errors.length = 0;
        await page.goto('about:blank');
        await page.goto(BASE + '#' + route.r);
        await page.waitForTimeout(500);
        await prepare(page, route);
        await page.waitForTimeout(300);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        const name = route.shot || route.r;
        if (scheme === 'light' || route.r === 'start' || route.r.indexOf('verwaltung') === 0) await page.screenshot({ path: path.join(shots, `${name}.${vp}.${scheme}.png`), fullPage: true });
        const bad = errors.length || overflow > 0;
        if (bad) problems++;
        console.log(`${name.padEnd(24)} ${vp.padEnd(7)} ${scheme.padEnd(5)} ${bad ? 'PROBLEM' : 'ok'}${overflow > 0 ? ' · ' + overflow + 'px zu breit' : ''}${errors.length ? ' · ' + errors.join(' | ') : ''}`);
      }
      await ctx.close();
    }
  }
  console.log('');

  // Kaufablauf (Handy, hell): Pflichtfelder, Zahlung, Karte, Kontrolle – und die Karte landet in der Verwaltung
  {
    const { ctx, page, errors } = await open(browser, 'phone', 'light');
    await page.goto(BASE + '#jahreskarte');
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
    await page.getByRole('button', { name: 'Nächste Karte scannen' }).click();
    await page.getByRole('button', { name: 'Scan simulieren: gesperrte Karte' }).click();
    const blockedScan = await page.locator('.pt-result-big').textContent();
    await page.screenshot({ path: path.join(shots, 'flow-kontrolle.phone.png'), fullPage: true });
    await page.evaluate(() => window.GKGStore.actions.setRole('kasse'));
    await page.goto(BASE + '#verwaltung-buchhaltung');
    await page.waitForTimeout(300);
    const booked = await page.locator('.gkg-table', { hasText: 'Reto Test' }).count();
    await page.goto(BASE + '#start');
    await page.getByRole('button', { name: 'Menü' }).click();
    const menuVisible = await page.getByRole('link', { name: 'Wetter' }).isVisible();
    await page.screenshot({ path: path.join(shots, 'flow-menue.phone.png') });
    result('Kaufablauf', blocked > 0 && holder === 'Reto Test' && scanned === 'Reto Test' && blockedScan === 'Gesperrt' && booked > 0 && menuVisible && !errors.length,
      `Pflichtfeld-Prüfung ${blocked > 0 ? 'greift' : 'fehlt'}, Karte für «${holder}», Kontrolle «${scanned}» / «${blockedScan}», Buchung ${booked ? 'da' : 'fehlt'}, Handy-Menü ${menuVisible ? 'öffnet' : 'öffnet nicht'}${errors.length ? ', Fehler: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }

  // Mein GKG (Handy, hell): Lea ändert ihre Telefonnummer und bezahlt den Beitrag → Karte; Verwaltung sieht beides
  {
    const { ctx, page, errors } = await open(browser, 'phone', 'light');
    await page.goto(BASE + '#mein-gkg');
    await page.getByRole('button', { name: /Lea Keller/ }).click();
    await page.getByRole('link', { name: 'Meine Daten', exact: true }).click();
    await page.fill('#d-phone', '079 000 99 88');
    await page.getByRole('button', { name: 'Speichern', exact: true }).click();
    await page.getByRole('link', { name: 'Rechnungen', exact: true }).click();
    await page.getByRole('button', { name: 'Bezahlen', exact: true }).first().click();
    await page.getByText('Apple Pay', { exact: true }).click();
    await page.screenshot({ path: path.join(shots, 'flow-mitglied-zahlen.phone.png') });
    await page.getByRole('button', { name: 'Mit Apple Pay bezahlen' }).click();
    await page.waitForSelector('.gkg-pass', { timeout: 5000 });
    const holder = await page.locator('.gkg-pass-holder').textContent();
    await page.screenshot({ path: path.join(shots, 'flow-mitglied-karte.phone.png'), fullPage: true });
    await page.getByRole('link', { name: 'Mitgliedschaft', exact: true }).click();
    await page.getByRole('button', { name: 'Wechsel beantragen' }).click();
    await page.evaluate(() => window.GKGStore.actions.setRole('aktuariat'));
    await page.goto(BASE + '#verwaltung');
    await page.waitForTimeout(300);
    const logged = await page.getByText('Lea Keller: Telefon geändert').count();
    await page.goto(BASE + '#verwaltung-mitglieder');
    await page.waitForTimeout(300);
    const request = await page.locator('.pt-requests', { hasText: 'Lea Keller' }).count();
    await page.evaluate(() => window.GKGStore.actions.setRole('kasse'));
    await page.goto(BASE + '#verwaltung-buchhaltung');
    await page.waitForTimeout(300);
    const booked = await page.locator('.gkg-table', { hasText: 'Lea Keller (Apple Pay)' }).count();
    result('Mein GKG', holder === 'Lea Keller' && logged > 0 && request > 0 && booked > 0 && !errors.length,
      `Karte für «${holder}», Änderung im Protokoll ${logged ? 'ja' : 'nein'}, Antrag beim Aktuariat ${request ? 'ja' : 'nein'}, Buchung ${booked ? 'ja' : 'nein'}${errors.length ? ', Fehler: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }

  // Verwaltung (Desktop, hell): Rechte pro Ressort, Zahlung erfassen, Buchung erfassen, Karte sperren
  {
    const { ctx, page, errors } = await open(browser, 'desktop', 'light');
    await page.goto(BASE + '#verwaltung-mitglieder');
    await page.evaluate(() => window.GKGStore.actions.setRole('kasse'));
    await page.waitForTimeout(300);
    const kasseCols = await page.locator('.gkg-table thead th').allTextContents();
    await page.evaluate(() => window.GKGStore.actions.setRole('fluggebiete'));
    await page.goto(BASE + '#verwaltung-buchhaltung');
    await page.waitForTimeout(300);
    const denied = await page.getByRole('heading', { name: 'Kein Zugang' }).count();
    await page.evaluate(() => window.GKGStore.actions.setRole('kasse'));
    await page.goto(BASE + '#verwaltung-rechnungen');
    await page.waitForTimeout(300);
    await page.locator('.gkg-table tbody tr', { hasText: 'Mia Roth' }).getByRole('button').click();
    await page.screenshot({ path: path.join(shots, 'flow-kasse-rechnung.desktop.png') });
    await page.getByRole('button', { name: 'Zahlung verbuchen' }).click();
    await page.waitForTimeout(300);
    await page.getByRole('tab', { name: /Bezahlt/ }).click();
    const paid = await page.locator('.gkg-table tbody tr', { hasText: 'Mia Roth' }).count();
    await page.goto(BASE + '#verwaltung-buchhaltung');
    await page.getByRole('button', { name: 'Buchung erfassen' }).click();
    await page.getByRole('button', { name: 'Buchen' }).click();
    const bookingErrors = await page.locator('dialog[open] .pt-error').count();
    await page.fill('#bk-text', 'Testbuchung Flyer');
    await page.fill('#bk-amount', '120.50');
    await page.getByRole('button', { name: 'Buchen' }).click();
    await page.waitForTimeout(300);
    const booking = await page.locator('.gkg-table', { hasText: 'Testbuchung Flyer' }).count();
    await page.getByRole('tab', { name: 'Bilanz' }).click();
    const balanced = await page.getByText('Bilanz ausgeglichen').count();
    await page.screenshot({ path: path.join(shots, 'flow-kasse-bilanz.desktop.png'), fullPage: true });
    await page.evaluate(() => window.GKGStore.actions.setRole('fluggebiete'));
    await page.goto(BASE + '#verwaltung-karten');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Karte .* sperren/ }).first().click();
    await page.getByRole('button', { name: 'Sperren', exact: true }).click();
    await page.waitForTimeout(300);
    const blockedCards = await page.locator('.gkg-table .gkg-status-stop').count();
    const ok = !kasseCols.includes('Kategorie') && kasseCols.includes('Adresse') && denied > 0 && paid > 0 && bookingErrors >= 2 && booking > 0 && balanced > 0 && blockedCards >= 2 && !errors.length;
    result('Verwaltung', ok, `Kasse sieht Spalten [${kasseCols.join(', ')}], Fluggebiete ohne Buchhaltung ${denied ? 'ja' : 'nein'}, Zahlung ${paid ? 'verbucht' : 'fehlt'}, Pflichtfelder Buchung ${bookingErrors}, Buchung ${booking ? 'da' : 'fehlt'}, Bilanz ${balanced ? 'ausgeglichen' : 'NICHT ausgeglichen'}, gesperrte Karten ${blockedCards}${errors.length ? ', Fehler: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }

  // Beitritt über das Formular → Antrag beim Aktuariat
  {
    const { ctx, page, errors } = await open(browser, 'phone', 'light');
    await page.goto(BASE + '#verein');
    await page.getByRole('button', { name: 'Mitglied werden' }).click();
    await page.getByRole('button', { name: 'Anmeldung senden' }).click();
    const missing = await page.locator('dialog[open] .pt-error').count();
    await page.fill('#j-first', 'Petra');
    await page.fill('#j-last', 'Probe');
    await page.fill('#j-email', 'petra.probe@beispiel.ch');
    await page.fill('#j-zip', '8750');
    await page.fill('#j-city', 'Glarus');
    await page.screenshot({ path: path.join(shots, 'flow-beitritt.phone.png') });
    await page.getByRole('button', { name: 'Anmeldung senden' }).click();
    await page.waitForTimeout(300);
    const closed = await page.locator('dialog[open]').count() === 0;
    await page.evaluate(() => window.GKGStore.actions.setRole('aktuariat'));
    await page.goto(BASE + '#verwaltung-mitglieder');
    await page.waitForTimeout(300);
    const listed = await page.locator('.pt-requests', { hasText: 'Petra Probe' }).count();
    result('Beitritt', missing >= 4 && closed && listed > 0 && !errors.length, `Pflichtfelder ${missing}, Dialog ${closed ? 'zu' : 'offen'}, Antrag ${listed ? 'beim Aktuariat' : 'fehlt'}${errors.length ? ', Fehler: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }

  // Wetter ohne flightbuddyki.ch: Beispielwerte erscheinen, klar markiert
  {
    const { ctx, page, errors } = await open(browser, 'desktop', 'light', { offline: true });
    await page.goto(BASE + '#wetter');
    await page.waitForTimeout(800);
    const note = await page.locator('.pt-wx-note').count();
    const cards = await page.locator('.gkg-card').count();
    const sample = await page.getByText(/^Beispielwerte · /).count();
    await page.screenshot({ path: path.join(shots, 'wetter-offline.desktop.png'), fullPage: true });
    result('Wetter offline', note > 0 && cards >= 6 && sample >= 6 && !errors.length, `Hinweis ${note ? 'da' : 'fehlt'}, ${cards} Karten, ${sample} als Beispiel markiert${errors.length ? ', Fehler: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }

  // 3D-Karte: lädt, zeigt alle Plätze und Windstationen; ein Tipp auf einen Platz öffnet die SHV-Infotafel
  const expected = (fs.readFileSync(path.join(root, 'prototype', 'data.js'), 'utf8').match(/kind: '(start|landing)'/g) || []).length;
  for (const [vp, scheme] of [['desktop', 'light'], ['phone', 'light'], ['desktop', 'dark']]) {
    const m = await open(browser, vp, scheme);
    const t0 = Date.now();
    await m.page.goto(BASE + '#fluggebiete');
    const ready = await m.page.waitForSelector('.pt-map3d-tools', { timeout: 60000 }).then(() => true, () => false);
    const loadMs = Date.now() - t0;
    await m.page.waitForTimeout(5000);
    const markers = await m.page.locator('.pt-mk').count();
    const wx = await m.page.locator('.pt-wx').count();
    await m.page.screenshot({ path: path.join(shots, `karte.${vp}.${scheme}.png`) });
    let picked = null, tafel = null, afterEsc = null, station = null;
    if (ready) {
      await m.page.locator('.pt-mk', { hasText: 'Hüsliberg' }).first().click();
      await m.page.waitForTimeout(2500);
      tafel = await m.page.locator('dialog[open] #shv-t').textContent().catch(() => null);
      await m.page.screenshot({ path: path.join(shots, `karte-infotafel.${vp}.${scheme}.png`) });
      await m.page.keyboard.press('Escape');
      await m.page.waitForTimeout(300);
      afterEsc = await m.page.locator('dialog[open]').count();
      picked = await m.page.locator('.pt-sitepanel .gkg-title').first().textContent().catch(() => null);
      await m.page.screenshot({ path: path.join(shots, `karte-auswahl.${vp}.${scheme}.png`) });
      await m.page.locator('.pt-wx').first().dispatchEvent('click');
      await m.page.waitForTimeout(1500);
      station = await m.page.locator('.pt-sitepanel .gkg-title').first().textContent().catch(() => null);
    }
    const overflow = await m.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const ok = ready && markers === expected && wx === STATIONS.stations.length && picked === 'Hüsliberg' && tafel === 'SHV-Infotafel Schänis' && afterEsc === 0 && /^Teststation/.test(station || '') && overflow <= 0 && !m.errors.length;
    result(`3D-Karte ${vp} ${scheme}`, ok, `bereit ${ready ? 'nach ' + (loadMs / 1000).toFixed(1) + ' s' : 'NEIN'}, ${markers}/${expected} Plätze, ${wx} Stationen, Pop-up «${tafel}», Esc schliesst ${afterEsc === 0 ? 'ja' : 'nein'}, Auswahl «${picked}», Station «${station}»${overflow > 0 ? ', ' + overflow + 'px zu breit' : ''}${m.errors.length ? ', Fehler: ' + m.errors.slice(0, 3).join(' | ') : ''}`);
    await m.ctx.close();
  }

  await browser.close();
  server.close();
  console.log(`\nBildschirmfotos in ${path.relative(root, shots)}/`);
  process.exit(problems ? 1 : 0);
})();
