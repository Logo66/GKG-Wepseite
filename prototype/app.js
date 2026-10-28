// GKG Website-Prototyp – klickbar, ohne Server. Seiten werden über den Hash gewählt (#fluggebiete, #jahreskarte …).
(function () {
  var React = window.React, G = window.GKG, D = window.GKG_DATA;
  var h = React.createElement, Fragment = React.Fragment, useState = React.useState, useEffect = React.useEffect;

  var NAV = [
    { label: 'Fluggebiete', href: '#fluggebiete' },
    { label: 'Wetter', href: '#wetter' },
    { label: 'Sport', href: '#sport' },
    { label: 'Verein', href: '#verein' },
    { label: 'Shop', href: '#shop' }
  ];

  function chf(n) {
    var s = Number(n).toFixed(2).split('.');
    return s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '’') + '.' + s[1];
  }
  function initials(name) {
    return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join('');
  }
  function go(name) { location.hash = name; }
  function areaById(id) { return D.areas.filter(function (a) { return a.id === id; })[0]; }
  function ext(href, text) { return h('a', { href: href, target: '_blank', rel: 'noopener' }, text); }

  function currentRoute() { return (location.hash || '').replace(/^#/, '') || 'start'; }
  function activeLabel(route) {
    if (route === 'fluggebiete' || route.indexOf('gebiet-') === 0) return 'Fluggebiete';
    var hit = NAV.filter(function (n) { return n.href === '#' + route; })[0];
    return hit ? hit.label : null;
  }

  /* ---------- building blocks ---------- */
  function Wrap(p) { return h('div', { className: 'pt-wrap' }, p.children); }

  function PageHead(p) {
    return h('header', { className: 'pt-page-head' }, h(Wrap, null,
      p.crumb && h('p', { className: 'pt-crumb' }, p.crumb),
      p.eyebrow && h('p', { className: 'pt-eyebrow' }, p.eyebrow),
      h('h1', { className: 'pt-h1' }, p.title),
      p.lead && h('p', { className: 'pt-lead' }, p.lead),
      p.children));
  }

  function Section(p) {
    return h('section', { className: 'pt-section', id: p.id, 'aria-labelledby': p.id ? p.id + '-t' : undefined }, h(Wrap, null,
      (p.title || p.aside) && h('div', { className: 'pt-section-head' },
        h('div', null,
          p.title && h('h2', { className: 'pt-h2', id: p.id ? p.id + '-t' : undefined }, p.title),
          p.sub && h('p', { className: 'pt-muted' }, p.sub)),
        p.aside),
      p.children));
  }

  function Block(p) {
    if (!p.items || !p.items.length) return null;
    return h('div', { className: 'pt-block' + (p.warn ? ' pt-block-warn' : '') },
      h('h2', null, p.title),
      h('ul', null, p.items.map(function (t, i) { return h('li', { key: i }, t); })));
  }

  function Avatar(p) {
    return h('div', { className: 'pt-avatar' + (p.large ? ' pt-avatar-lg' : ''), 'aria-hidden': p.photo ? undefined : true },
      p.photo ? h('img', { src: p.photo, alt: 'Foto ' + p.name }) : initials(p.name));
  }

  function HeroArt() {
    var cells = [];
    for (var i = -4; i <= 4; i++) {
      var t = i * 16 * Math.PI / 180, x = 136 + 96 * Math.sin(t), y = 196 - 96 * Math.cos(t);
      var hgt = 44 - 3 * Math.abs(i), w = 20 - Math.abs(i);
      cells.push(h('rect', { key: i, className: 'pt-art-cell', x: (x - w / 2).toFixed(1), y: (y - hgt / 2).toFixed(1), width: w, height: hgt, rx: 6, transform: 'rotate(' + i * 16 + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')' }));
    }
    return h('svg', { viewBox: '0 0 520 320', role: 'presentation' },
      h('rect', { className: 'pt-art-sky', x: 16, y: 0, width: 240, height: 296, rx: 20 }),
      h('rect', { className: 'pt-art-wing', x: 272, y: 152, width: 128, height: 144, rx: 20 }),
      h('rect', { className: 'pt-art-ink', x: 416, y: 56, width: 96, height: 240, rx: 20 }),
      h('rect', { className: 'pt-art-thermik', x: 320, y: 168, width: 64, height: 64, rx: 32 }),
      h('rect', { className: 'pt-art-thermik', x: 288, y: 240, width: 32, height: 32, rx: 16 }),
      cells);
  }

  function NoticeList(p) {
    return h('ul', { className: 'pt-list' }, p.items.map(function (n, i) {
      return h('li', { key: i },
        h(G.FlightStatus, { status: n.status, label: n.label }),
        h('div', null,
          h('p', null, h('a', { href: '#gebiet-' + n.area }, n.title)),
          h('p', { className: 'pt-small pt-muted' }, n.when)));
    }));
  }

  function JahreskarteTeaser(p) {
    return h('div', { className: 'pt-panel pt-panel-soft' },
      h('h3', null, 'Gratis fliegen mit der Jahreskarte'),
      h('p', null, 'Mit der Jahreskarte ' + D.season + ' fliegst du in allen GKG-Gebieten ohne weitere Gebühren.'),
      h('div', { className: 'pt-actions', style: { marginTop: 'var(--space-4)' } },
        h(G.Button, { variant: 'wing', href: '#jahreskarte' }, 'Jahreskarte ' + D.season)));
  }

  /* ---------- Start ---------- */
  function Start(p) {
    var hoodie = D.products[0], cap = D.products[3];
    return h(Fragment, null,
      h('section', { className: 'pt-hero' }, h(Wrap, null, h('div', { className: 'pt-split' },
        h('div', null,
          h('p', { className: 'pt-eyebrow' }, 'Gleitschirmklub Glarnerland · seit 1987'),
          h('h1', { className: 'pt-hero-title' }, 'Ab in die Luft.'),
          h('p', { className: 'pt-lead' }, 'Acht Fluggebiete, ein Klub mit 185 Mitgliedern – und deine Jahreskarte direkt im Handy.'),
          h('div', { className: 'pt-hero-actions' },
            h(G.Button, { variant: 'wing', size: 'lg', href: '#jahreskarte' }, 'Jahreskarte ' + D.season + ' holen'),
            h(G.Button, { variant: 'quiet', size: 'lg', href: '#fluggebiete' }, 'Fluggebiete ansehen'))),
        h('div', { className: 'pt-hero-art', 'aria-hidden': true }, h(HeroArt))))),

      h(Section, { id: 'jetzt', title: 'Jetzt am Startplatz', sub: 'Beispielwerte – im echten Betrieb live von den Messstationen.', aside: h('a', { href: '#wetter', className: 'pt-small' }, 'Alle Stationen') },
        h('div', { className: 'pt-grid' }, D.weather.slice(0, 2).map(function (w) { return h(G.WeatherCard, Object.assign({ key: w.station }, w)); }))),

      h(Section, { id: 'meldungen', title: 'Gebietsmeldungen', sub: 'Sperrungen und Hinweise, gepflegt vom Ressort Fluggebiete.' },
        h(NoticeList, { items: D.notices })),

      h(Section, { id: 'karte', title: null },
        h('div', { className: 'pt-split' },
          h('div', null,
            h('h2', { className: 'pt-h2', id: 'karte-t' }, 'Deine Jahreskarte ' + D.season),
            h('p', { className: 'pt-lead' }, 'Einmal Profil anlegen, bezahlen, fertig. Die Karte liegt danach im Handy – Kontrollen am Start- und Landeplatz laufen über den QR-Code.'),
            h('ol', { className: 'pt-steps' },
              h('li', null, h('div', null, h('b', null, 'Profil mit Foto anlegen'), 'Einmalig. Im nächsten Jahr verlängerst du mit einem Klick.')),
              h('li', null, h('div', null, h('b', null, 'Bezahlen'), 'Mit TWINT, Karte, Apple Pay oder Google Pay.')),
              h('li', null, h('div', null, h('b', null, 'Karte ins Handy'), 'In Apple Wallet oder Google Wallet, dazu die Quittung per E-Mail.'))),
            h('p', { className: 'pt-small pt-muted', style: { marginTop: 'var(--space-6)' } }, 'Aktivmitglieder erhalten die Jahreskarte automatisch mit dem Mitgliederbeitrag.')),
          h(G.BuyBox, {
            title: 'Jahreskarte ' + D.season, badge: 'Neu digital', price: D.price, per: 'pro Saison',
            perks: ['Gratis fliegen in allen GKG-Fluggebieten', 'QR-Code in Apple Wallet oder Google Wallet', 'Quittung per E-Mail'],
            methods: ['TWINT', 'Kreditkarte', 'PostFinance', 'Apple Pay', 'Google Pay'],
            note: h(Fragment, null, 'Für Aktivmitglieder gratis. ', h('a', { href: '#verein' }, 'Für CHF 70 Mitglied werden'), ' – Karte inklusive.'),
            onBuy: function () { p.startCheckout(); }
          }))),

      h(Section, { id: 'klub', title: 'Seit 1987 in der Luft', sub: 'Ein Klub für alle, die fliegen – vom ersten Höhenflug bis zum Streckenflug.' },
        h('div', { className: 'pt-split pt-split-rev' },
        h('div', { className: 'pt-logo-tile' }, h('img', { src: 'ds/logos/gkg-sonne-bogen.png', alt: 'Logo Gleitschirmklub Glarnerland: Sonne aus sieben Gleitschirmen mit www.gkg.ch', width: 585, height: 540 })),
        h('div', null,
        h('dl', { className: 'pt-facts' },
          h('div', null, h('dt', null, '185 Mitglieder'), h('dd', null, 'Einer der grössten Gleitschirmklubs der Ostschweiz')),
          h('div', null, h('dt', null, 'GKG-Cup'), h('dd', null, 'Interner Streckenflug-Wettbewerb seit 2019')),
          h('div', null, h('dt', null, 'Kursbeiträge'), h('dd', null, 'Der Klub zahlt an SHV-Kurse und Sicherheitstrainings'))),
        h('div', { className: 'pt-actions', style: { marginTop: 'var(--space-8)' } },
          h(G.Button, { variant: 'primary', href: '#verein' }, 'Mitglied werden'),
          h(G.Button, { variant: 'quiet', href: '#sport' }, 'Sport & GKG-Cup'))))),

      h(Section, { id: 'kollektion', title: 'Klub-Kollektion', sub: 'Kleider mit Klub-Logo. Sortiment und Preise sind Beispiele.', aside: h('a', { href: '#shop', className: 'pt-small' }, 'Zum Shop') },
        h('div', { className: 'pt-grid' },
          h(G.ProductCard, Object.assign({ key: hoodie.id, line: 'Klub-Kollektion', hint: 'Sammelbestellung · Abholung am Klubabend oder Versand', onAdd: function (c) { p.addToCart(hoodie, c); } }, hoodie)),
          h(G.ProductCard, Object.assign({ key: cap.id, line: 'Klub-Kollektion', hint: 'Einheitsgrösse', onAdd: function (c) { p.addToCart(cap, c); } }, cap)))));
  }

  /* ---------- Fluggebiete ---------- */
  function AreaMap(p) {
    return h('div', { className: 'pt-map', role: 'group', 'aria-label': 'Schematische Karte der Fluggebiete' },
      h('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': true },
        h('path', { className: 'contour', d: 'M0 48 C 14 44, 24 52, 40 46 S 70 40, 100 44' }),
        h('path', { className: 'contour', d: 'M0 66 C 18 60, 30 70, 44 64 S 78 58, 100 64' }),
        h('path', { className: 'contour', d: 'M60 8 C 72 4, 86 10, 100 6' }),
        h('path', { className: 'lake', d: 'M58 20 C 66 16, 82 16, 100 18 L 100 25 C 84 24, 68 26, 59 25 Z' }),
        h('path', { className: 'river', d: 'M0 27 C 20 26, 40 25, 58 23' }),
        h('path', { className: 'river', d: 'M42 100 C 45 88, 50 74, 51 60 C 52 46, 56 32, 58 24' }),
        h('path', { className: 'river', d: 'M51 62 C 60 70, 68 78, 78 94' })),
      h('span', { className: 'pt-map-label', style: { left: '74%', top: '11%' } }, 'Walensee'),
      h('span', { className: 'pt-map-label', style: { left: '54%', top: '50%' } }, 'Linth'),
      D.areas.map(function (a) {
        var active = a.id === p.selected;
        return h('div', { key: a.id, className: 'pt-map-pin' + (active ? ' is-active' : ''), style: { left: a.x + '%', top: a.y + '%' } },
          h(G.SpotMarker, { label: a.name, status: a.status, active: active, onClick: function () { p.onSelect(a.id); } }));
      }));
  }

  function spotProps(a) {
    return { name: a.name, region: a.region, status: a.status, statusLabel: a.statusLabel, note: a.note, href: '#gebiet-' + a.id };
  }

  function siteById(id) { return D.sites.filter(function (x) { return x.id === id; })[0]; }
  function sitesOf(areaId) { return D.sites.filter(function (x) { return x.areas.indexOf(areaId) >= 0; }); }
  function fmtAlt(m) { return String(m).replace(/\B(?=(\d{3})+(?!\d))/g, "'"); }
  function lv95(x) { var c = window.GKGMap.toLV95(x.lat, x.lon); return fmtAlt(c[0]) + ' / ' + fmtAlt(c[1]); }

  function renderMarker(el, site, active, onSelect) {
    if (!el._root) el._root = ReactDOM.createRoot(el);
    var area = areaById(site.areas[0]);
    el._root.render(h(G.SpotMarker, {
      label: site.name, kind: site.kind, status: site.kind === 'start' ? area.status : undefined, active: active,
      onClick: function (e) { e.stopPropagation(); onSelect(site.id); }
    }));
  }

  // Die 3D-Karte: lädt MapLibre erst hier, zeigt bis dahin ein Standbild bzw. bei Fehlern das Schema
  function Map3D(p) {
    var ref = React.useRef(null), apiRef = React.useRef(null);
    var st = useState('loading'), state = st[0], setState = st[1];
    var er = useState(''), err = er[0], setErr = er[1];
    var tr = useState(true), terrain = tr[0], setTerrain = tr[1];
    useEffect(function () {
      var alive = true;
      window.GKGMap.create(ref.current, {
        sites: D.sites, focusArea: p.focusArea,
        renderMarker: function (el, site, active) { renderMarker(el, site, active, p.onSelect); }
      }).then(function (api) {
        if (!alive) { api.destroy(); return; }
        apiRef.current = api;
        if (p.apiRef) p.apiRef.current = api;
        setState('ready');
      }, function (e) { if (alive) { setErr(e && e.message ? e.message : String(e)); setState('error'); } });
      return function () {
        alive = false;
        if (apiRef.current) apiRef.current.destroy();
        apiRef.current = null;
        if (p.apiRef) p.apiRef.current = null;
      };
    }, []);
    useEffect(function () { if (state === 'ready' && p.selected) apiRef.current.select(p.selected); }, [p.selected, state]);
    function toggle() { var on = !terrain; setTerrain(on); apiRef.current.setTerrain(on); }
    return h('div', { className: 'pt-map3d-shell' + (p.compact ? ' is-compact' : '') },
      h('div', { className: 'pt-map3d', ref: ref, role: 'region', 'aria-label': p.label || '3D-Karte der Start- und Landeplätze' }),
      state !== 'ready' && h('div', { className: 'pt-map3d-cover' + (state === 'error' ? ' is-error' : '') },
        state === 'loading' && !p.compact && h('picture', { 'aria-hidden': true },
          h('source', { srcSet: 'map-poster-dark.jpg', media: '(prefers-color-scheme: dark)' }),
          h('img', { src: 'map-poster.jpg', alt: '', onError: function (e) { e.currentTarget.hidden = true; } })),
        state === 'loading'
          ? h('p', { className: 'pt-map3d-msg', role: 'status' }, '3D-Karte wird geladen …')
          : h('div', { className: 'pt-map3d-fallback' },
              h('p', { className: 'pt-map3d-msg', role: 'alert' }, err + ' Hier das Schema der Gebiete:'),
              h(AreaMap, { selected: p.focusArea, onSelect: function (id) { go('gebiet-' + id); } }))),
      state === 'ready' && h('div', { className: 'pt-map3d-tools' },
        h(G.Button, { variant: 'quiet', onClick: toggle, 'aria-pressed': terrain }, terrain ? '2D-Ansicht' : '3D-Ansicht'),
        !p.compact && h(G.Button, { variant: 'quiet', onClick: function () { apiRef.current.overview(); if (p.onOverview) p.onOverview(); } }, 'Übersicht')));
  }

  function SiteFacts(p) {
    var x = p.site;
    return h('dl', { className: 'pt-sitefacts' },
      h('dt', null, 'Koordinaten'), h('dd', null, x.lat.toFixed(5) + ' N, ' + x.lon.toFixed(5) + ' O'),
      h('dt', null, 'LV95'), h('dd', null, lv95(x)),
      h('dt', null, 'Quelle'), h('dd', { className: 'pt-dd-text' }, x.srcUrl ? ext(x.srcUrl, x.src) : x.src),
      x.check && h(Fragment, null, h('dt', null, 'Stand'), h('dd', { className: 'pt-dd-text' }, h(G.FlightStatus, { status: 'caution', label: 'Vom Ressort zu bestätigen' }))));
  }

  function SitePanel(p) {
    var x = p.site, area = areaById(x.areas[0]);
    var region = (x.kind === 'start' ? 'Startplatz' : 'Landeplatz') + ' · ' + x.areas.map(function (id) { return areaById(id).name; }).join(', ');
    return h('div', { className: 'pt-sitepanel' },
      h(G.SpotCard, {
        key: x.id, name: x.name, region: region,
        status: x.kind === 'start' ? area.status : undefined, statusLabel: x.kind === 'start' ? area.statusLabel : undefined,
        takeoff: x.kind === 'start' ? fmtAlt(x.alt) : undefined, landing: x.kind === 'landing' ? fmtAlt(x.alt) : undefined,
        directions: x.dirs, level: undefined, note: x.note,
        href: '#gebiet-' + x.areas[0], cta: 'Gebiet ' + area.name,
        routeHref: x.kind === 'landing' ? 'https://www.google.com/maps/dir/?api=1&destination=' + x.lat + ',' + x.lon : undefined
      }),
      x.level && h('p', { className: 'pt-small' }, h('b', null, 'Schwierigkeit: '), x.level),
      h(SiteFacts, { site: x }));
  }

  function Legend() {
    return h('ul', { className: 'pt-legend', 'aria-label': 'Legende' },
      h('li', null, h('span', { className: 'pt-legend-start', 'aria-hidden': true }), 'Startplatz – Farbe zeigt den Flugstatus (Beispiel)'),
      h('li', null, h('span', { className: 'pt-legend-landing', 'aria-hidden': true }), 'Landeplatz'),
      h('li', null, 'Gelände 1,3-fach überhöht'));
  }

  function Areas() {
    var s = useState(null), sel = s[0], setSel = s[1];
    var apiRef = React.useRef(null);
    var site = sel && sel.type === 'site' ? siteById(sel.id) : null;
    var area = sel && sel.type === 'area' ? areaById(sel.id) : null;
    var starts = D.sites.filter(function (x) { return x.kind === 'start'; }).length;
    var landings = D.sites.length - starts;
    function pickArea(id) { setSel({ type: 'area', id: id }); if (apiRef.current) apiRef.current.focusArea(id); }
    return h(Fragment, null,
      h(PageHead, { title: 'Fluggebiete', lead: 'Acht Gebiete, ' + starts + ' Startplätze, ' + landings + ' Landeplätze – im Gelände. Vor jedem Flug gilt: Gebietsregeln und SHV-Infotafel beachten.' }),
      h(Wrap, null,
        h('div', { className: 'pt-chips', role: 'group', 'aria-label': 'Gebiet auf der Karte zeigen' },
          D.areas.map(function (a) {
            return h('button', { key: a.id, type: 'button', className: 'pt-tab', 'aria-pressed': !!(area && area.id === a.id), onClick: function () { pickArea(a.id); } }, a.name);
          })),
        h('div', { className: 'pt-map-layout' },
          h('div', null,
            h(Map3D, { apiRef: apiRef, selected: site ? site.id : null, onSelect: function (id) { setSel({ type: 'site', id: id }); }, onOverview: function () { setSel(null); } }),
            h(Legend)),
          h('div', { 'aria-live': 'polite' },
            site ? h(SitePanel, { site: site })
              : area ? h(Fragment, null,
                  h(G.SpotCard, Object.assign({ key: area.id }, spotProps(area))),
                  h('ul', { className: 'pt-sitelist' }, sitesOf(area.id).map(function (x) {
                    return h('li', { key: x.id }, h('button', { type: 'button', onClick: function () { setSel({ type: 'site', id: x.id }); } },
                      h('span', null, x.name), h('span', { className: 'pt-muted' }, (x.kind === 'start' ? 'Start' : 'Landung') + ' · ' + fmtAlt(x.alt) + ' m')));
                  })))
              : h('div', { className: 'pt-panel' },
                  h('h2', null, 'Start- und Landeplätze'),
                  h('p', null, 'Tippe auf einen Tropfen (Startplatz) oder einen Kreis (Landeplatz), oder wähle oben ein Gebiet.'),
                  h('p', { className: 'pt-small pt-muted' }, 'Verschieben mit einem Finger bzw. der Maus, drehen und neigen mit zwei Fingern oder mit rechter Maustaste.')))),
        h('p', { className: 'pt-source' }, 'Koordinaten aus den SHV-Infotafeln, der DHV-Geländedatenbank, Paragliding365 und braunwald.ch, jeweils gegen das Höhenmodell geprüft. Plätze mit Hinweis «Vom Ressort zu bestätigen» sind unsicher. Relief aus offenen Höhendaten (Terrain Tiles, u. a. EU-DEM © Copernicus); im Live-Betrieb ist das swisstopo-Luftbild vorgesehen.')),
      h(Section, { id: 'alle', title: 'Alle Gebiete' },
        h('div', { className: 'pt-grid' }, D.areas.map(function (x) { return h(G.SpotCard, Object.assign({ key: x.id }, spotProps(x))); }))));
  }

  function SiteTable(p) {
    return h('div', { className: 'pt-table-wrap' }, h('table', { className: 'pt-table' },
      h('thead', null, h('tr', null,
        h('th', { scope: 'col' }, 'Platz'), h('th', { scope: 'col', className: 'num' }, 'Höhe'), h('th', { scope: 'col' }, 'Startrichtung'), h('th', { scope: 'col', className: 'num' }, 'LV95'))),
      h('tbody', null, p.sites.map(function (x) {
        return h('tr', { key: x.id },
          h('td', { className: 'pt-site-cell' },
            h('b', null, x.name),
            h('span', { className: 'pt-small pt-muted' }, (x.kind === 'start' ? 'Startplatz' : 'Landeplatz') + ' · Quelle: ', x.srcUrl ? ext(x.srcUrl, x.src) : x.src),
            x.check && h('span', null, h(G.FlightStatus, { status: 'caution', label: 'Zu bestätigen' }))),
          h('td', { className: 'num' }, fmtAlt(x.alt) + ' m'),
          h('td', null, x.kind === 'start' ? (x.dirs.length ? x.dirs.join(', ') : 'folgt') : '–'),
          h('td', { className: 'num' }, lv95(x)));
      }))));
  }

  function AreaDetail(p) {
    var a = areaById(p.id);
    if (!a) return h(NotFound);
    var notices = D.notices.filter(function (n) { return n.area === a.id; });
    return h(Fragment, null,
      h(PageHead, { crumb: h(Fragment, null, h('a', { href: '#fluggebiete' }, 'Fluggebiete'), ' / ', a.name), title: a.name, lead: a.region },
        h('div', { className: 'pt-actions', style: { marginTop: 'var(--space-4)' } },
          h(G.FlightStatus, { status: a.status, label: a.statusLabel }),
          h('span', { className: 'pt-small pt-muted' }, 'Status: Beispiel'))),
      h(Wrap, null,
        h('div', { className: 'pt-detail-map' },
          h(Map3D, { compact: true, focusArea: a.id, label: '3D-Karte ' + a.name, onSelect: function () {} })),
        h('div', { className: 'pt-detail' },
        h('div', null,
          h('div', { className: 'pt-block' },
            h('h2', null, 'Start- und Landeplätze'),
            h(SiteTable, { sites: sitesOf(a.id) })),
          a.missing && h('div', { className: 'pt-panel pt-block' }, h('h2', null, 'Inhalte folgen'), h('p', null, 'Für dieses Gebiet waren auf gkg.ch keine Details lesbar. Das Ressort Fluggebiete ergänzt Zugang und Regeln.')),
          a.starts && h('div', { className: 'pt-block' },
            h('h2', null, 'Startplätze im Detail'),
            h('div', { className: 'pt-starts' }, a.starts.map(function (st) {
              return h('section', { key: st.name, className: 'pt-start' },
                h('h3', null, st.name, st.takeoff && h('span', null, st.takeoff + ' m ü. M.')),
                h('ul', null, st.notes.map(function (n, i) { return h('li', { key: i }, n); })));
            }))),
          h(Block, { title: 'Anreise & Aufstieg', items: a.access }),
          h(Block, { title: 'Landeplatz', items: a.landing }),
          h(Block, { title: 'Regeln', items: a.rules }),
          h(Block, { title: 'Gefahren', items: a.hazards, warn: true }),
          h(Block, { title: 'Gut zu wissen', items: a.extras }),
          h('p', { className: 'pt-source' }, 'Gebietstexte aus gkg.ch (Stand 2025). Koordinaten aus SHV-Infotafeln, DHV und Paragliding365, gegen das Höhenmodell geprüft. Vor dem Go-Live bestätigt das Ressort Fluggebiete alle Angaben.')),
        h('aside', { className: 'pt-aside' },
          notices.length > 0 && h('div', { className: 'pt-panel' }, h('h2', null, 'Aktuelle Meldung'), h(NoticeList, { items: notices })),
          h('div', { className: 'pt-panel' },
            h('h2', null, 'Vor dem Start'),
            h('p', null, 'Wind, Webcam und Gebietsmeldung prüfen. Die Entscheidung zu starten liegt immer bei dir als Pilot/in.'),
            h('p', null, h('a', { href: '#wetter' }, 'Windwerte ansehen'))),
          h(JahreskarteTeaser)))));
  }

  /* ---------- Wetter, Sport, Verein ---------- */
  function Weather() {
    return h(Fragment, null,
      h(PageHead, { title: 'Wetter', lead: 'Windwerte der Stationen in den Fluggebieten. Die Entscheidung zu starten liegt immer bei dir.' }),
      h(Wrap, null,
        h('div', { className: 'pt-grid' }, D.weather.map(function (w) { return h(G.WeatherCard, Object.assign({ key: w.station }, w)); })),
        h('p', { className: 'pt-source' }, 'Beispielwerte. Im echten Betrieb kommen die Werte von den Stationen, die heute auf gkg.ch verlinkt sind (u. a. die Klubstation Obere Bogmen und braunwald.ch), und werden alle paar Minuten aktualisiert.')),
      h(Section, { id: 'links', title: 'Prognosen & Links' },
        h('div', { className: 'pt-panel' }, h('ul', { className: 'pt-links' },
          h('li', null, ext('https://www.meteoschweiz.admin.ch', 'MeteoSchweiz'), h('span', { className: 'pt-muted' }, ' – Prognosen und Warnungen')),
          h('li', null, ext('https://www.skybriefing.com', 'skybriefing (DABS)'), h('span', { className: 'pt-muted' }, ' – Luftraum-Tagesbulletin')),
          h('li', null, ext('https://www.windy.com', 'Windy'), h('span', { className: 'pt-muted' }, ' – Windmodelle')),
          h('li', null, ext('https://www.burnair.cloud', 'Burnair'), h('span', { className: 'pt-muted' }, ' – Thermik und Flugwetter')),
          h('li', null, ext('https://www.braunwald.ch', 'braunwald.ch'), h('span', { className: 'pt-muted' }, ' – Webcams und Windstation Braunwald'))))));
  }

  function Sport() {
    return h(Fragment, null,
      h(PageHead, { title: 'Sport', lead: 'Streckenfliegen, der GKG-Cup und Sicherheit – der Klub fördert alle, die weiterkommen wollen.' }),
      h(Wrap, null, h('div', { className: 'pt-grid pt-grid-wide' },
        h('div', { className: 'pt-panel' }, h('h2', null, 'GKG-Cup'), h('p', null, 'Der interne Streckenflug-Wettbewerb des Klubs, seit 2019. Offen für alle Niveaus – vom Genussflug bis zur grossen Strecke.'), h('p', { className: 'pt-muted pt-small' }, 'Rangliste folgt, gepflegt vom Ressort Sport.')),
        h('div', { className: 'pt-panel' }, h('h2', null, 'Cross Country'), h('p', null, 'Der GKG fliegt in der Swiss League mit. In der Saison 2024 belegte der Klub Rang 4 von 93 Klubs.')),
        h('div', { className: 'pt-panel' }, h('h2', null, 'Sicherheit'), h('p', null, 'Der Klub beteiligt sich an SHV-zertifizierten Kursen. Wer ein Sicherheitstraining erfolgreich besucht, bekommt einen Teil der Kosten zurück.')),
        h('div', { className: 'pt-panel' }, h('h2', null, 'Förderung'), h('p', null, 'Talentierte Pilot/innen unterstützt der Klub finanziell, zum Beispiel für Swiss League und SIKU.')))));
  }

  function CopyText(p) {
    function copy(e) {
      var code = e.currentTarget.parentNode.querySelector('code');
      function fallback() {
        var r = document.createRange(); r.selectNodeContents(code);
        var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
        p.notify('Adresse markiert – jetzt kopieren.');
      }
      try {
        navigator.clipboard.writeText(p.text).then(function () { p.notify('Adresse kopiert.'); }, fallback);
      } catch (err) { fallback(); }
    }
    return h('span', { className: 'pt-copy' }, h('code', null, p.text), h(G.Button, { variant: 'quiet', onClick: copy }, 'Kopieren'));
  }

  function Verein(p) {
    return h(Fragment, null,
      h(PageHead, { title: 'Verein', lead: 'Der Gleitschirmklub Glarnerland wurde 1987 gegründet und zählt 185 Mitglieder.' }),
      h(Wrap, null,
        h('h2', { className: 'pt-h2', style: { marginBottom: 'var(--space-4)' } }, 'Mitgliedschaft'),
        h('div', { className: 'pt-table-wrap' }, h('table', { className: 'pt-table' },
          h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Mitgliedschaft'), h('th', { scope: 'col', className: 'num' }, 'Beitrag'), h('th', { scope: 'col' }, 'Was dazugehört'))),
          h('tbody', null, D.membership.map(function (m) {
            return h('tr', { key: m.kind }, h('td', null, h('b', null, m.kind)), h('td', { className: 'num' }, m.fee == null ? 'frei' : 'CHF ' + chf(m.fee)), h('td', null, m.note));
          })))),
        h('div', { className: 'pt-actions', style: { marginTop: 'var(--space-6)' } },
          h(G.Button, { variant: 'primary', onClick: function () { p.notify('Das Anmeldeformular folgt in Phase 4 (Mitgliederverwaltung).'); } }, 'Mitglied werden'))),
      h(Section, { id: 'kontakt', title: 'Vorstand & Kontakt' },
        h('div', { className: 'pt-grid' },
          h('div', { className: 'pt-panel' }, h('h3', null, 'Vorstand'), h('p', null, 'Präsident: R. Wiget'), h('p', { className: 'pt-muted pt-small' }, 'Die weiteren Ressorts folgen mit dem Export von gkg.ch.')),
          h('div', { className: 'pt-panel' }, h('h3', null, 'Kontakt'), h('p', null, h(CopyText, { text: 'info@gkg.ch', notify: p.notify }))),
          h('div', { className: 'pt-panel' }, h('h3', null, 'Agenda'), h('p', null, 'Klubabende, GV und Anlässe kommen aus dem Klubkalender.'), h('p', { className: 'pt-muted pt-small' }, 'Folgt mit dem Export von gkg.ch.')))));
  }

  /* ---------- Shop ---------- */
  function Shop(p) {
    var t = useState('kollektion'), tab = t[0], setTab = t[1];
    var total = p.cart.reduce(function (s, i) { return s + i.price; }, 0);
    function tabBtn(id, label) {
      return h('button', { type: 'button', role: 'tab', id: 'tab-' + id, className: 'pt-tab', 'aria-selected': tab === id, 'aria-controls': 'panel-' + id, onClick: function () { setTab(id); } }, label);
    }
    return h(Fragment, null,
      h(PageHead, { title: 'Shop', lead: 'Kleider mit Klub-Logo und ein Gebrauchtmarkt für Material unter Pilot/innen.' }),
      h(Wrap, null,
        h('div', { className: 'pt-tabs', role: 'tablist', 'aria-label': 'Shop-Bereiche' }, tabBtn('kollektion', 'Klub-Kollektion'), tabBtn('markt', 'Gebrauchtmarkt')),
        tab === 'kollektion'
          ? h('div', { role: 'tabpanel', id: 'panel-kollektion', 'aria-labelledby': 'tab-kollektion' },
              h('div', { className: 'pt-grid' }, D.products.map(function (pr) {
                return h(G.ProductCard, Object.assign({ key: pr.id, line: 'Klub-Kollektion', hint: pr.sizes ? 'Sammelbestellung · Abholung am Klubabend oder Versand' : 'Einheitsgrösse', onAdd: function (c) { p.addToCart(pr, c); } }, pr));
              })),
              h('p', { className: 'pt-source' }, 'Sortiment, Farben und Preise sind Beispiele. Fotos folgen, sobald das Logo als Vektordatei vorliegt.'))
          : h('div', { role: 'tabpanel', id: 'panel-markt', 'aria-labelledby': 'tab-markt' },
              h('div', { className: 'pt-actions', style: { marginBottom: 'var(--space-6)' } },
                h(G.Button, { variant: 'primary', href: '#login' }, 'Inserat aufgeben'),
                h('span', { className: 'pt-small pt-muted' }, 'Inserieren und Kontakt nur mit Login.')),
              h('div', { className: 'pt-grid' }, D.listings.map(function (l) { return h(G.ListingCard, Object.assign({ key: l.title }, l)); })),
              h('p', { className: 'pt-source' }, 'Beispielinserate.')),
        p.cart.length > 0 && h('div', { className: 'pt-cartbar' }, h('div', { className: 'pt-cartbar-inner' },
          h('span', null, h('b', null, 'Warenkorb: '), p.cart.length + (p.cart.length === 1 ? ' Artikel' : ' Artikel') + ' · CHF ' + chf(total)),
          h(G.Button, { variant: 'wing', onClick: function () { p.notify('Die Kasse ist im Prototyp nicht verbunden. Bezahlt wird später wie bei der Jahreskarte.'); } }, 'Zur Kasse')))));
  }

  /* ---------- Jahreskarte ---------- */
  var STEPS = ['Angebot', 'Profil', 'Bezahlen', 'Fertig'];
  var METHODS = ['TWINT', 'Kreditkarte', 'PostFinance', 'Apple Pay', 'Google Pay'];

  function Stepper(p) {
    return h('ol', { className: 'pt-stepper', 'aria-label': 'Schritte' }, STEPS.map(function (s, i) {
      var n = i + 1;
      return h('li', { key: s, className: n < p.step ? 'is-done' : n === p.step ? 'is-current' : '', 'aria-current': n === p.step ? 'step' : undefined }, s);
    }));
  }

  function ProfileForm(p) {
    var f = p.form, e = useState({}), errors = e[0], setErrors = e[1];
    function set(k, v) { p.setForm(Object.assign({}, f, (function () { var o = {}; o[k] = v; return o; })())); }
    function onPhoto(ev) {
      var file = ev.target.files && ev.target.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) { setErrors(Object.assign({}, errors, { photo: 'Bitte ein Bild wählen (JPG oder PNG).' })); return; }
      var r = new FileReader();
      r.onload = function () { set('photo', r.result); setErrors(Object.assign({}, errors, { photo: null })); };
      r.readAsDataURL(file);
    }
    function submit(ev) {
      ev.preventDefault();
      var err = {};
      if (!f.first.trim()) err.first = 'Bitte deinen Vornamen eingeben.';
      if (!f.last.trim()) err.last = 'Bitte deinen Nachnamen eingeben.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) err.email = 'Bitte eine gültige E-Mail-Adresse eingeben, z. B. name@beispiel.ch.';
      if (!f.terms) err.terms = 'Bitte die Bedingungen bestätigen.';
      setErrors(err);
      if (!Object.keys(err).length) p.next();
    }
    function field(id, key, label, type, hint) {
      return h('div', { className: 'pt-field' },
        h('label', { htmlFor: id }, label),
        h('input', { id: id, type: type, value: f[key], autoComplete: key === 'email' ? 'email' : key === 'first' ? 'given-name' : 'family-name', 'aria-invalid': errors[key] ? 'true' : undefined, 'aria-describedby': errors[key] ? id + '-err' : undefined, onChange: function (ev) { set(key, ev.target.value); } }),
        hint && h('p', { className: 'pt-hint' }, hint),
        errors[key] && h('p', { className: 'pt-error', id: id + '-err' }, errors[key]));
    }
    var name = (f.first + ' ' + f.last).trim();
    return h('form', { className: 'pt-form', noValidate: true, onSubmit: submit },
      h('p', { className: 'pt-hint' }, 'Mit Beispielwerten vorausgefüllt – du kannst sie überschreiben.'),
      h('div', { className: 'pt-form-row' }, field('f-first', 'first', 'Vorname', 'text'), field('f-last', 'last', 'Nachname', 'text')),
      field('f-email', 'email', 'E-Mail', 'email', 'Hierhin kommen Quittung und Wallet-Link.'),
      h('div', { className: 'pt-field' },
        h('span', { className: 'pt-field-label', style: { font: '700 15px/20px var(--font-body)' } }, 'Foto für die Kontrolle'),
        h('div', { className: 'pt-photo' },
          h(Avatar, { photo: f.photo, name: name || '?' }),
          h('span', { className: 'pt-file' }, h(G.Button, { variant: 'quiet', tabIndex: -1, 'aria-hidden': true }, f.photo ? 'Foto ändern' : 'Foto hochladen'),
            h('input', { id: 'f-photo', type: 'file', accept: 'image/*', 'aria-label': 'Foto hochladen', onChange: onPhoto }))),
        h('p', { className: 'pt-hint' }, 'Ein Handy-Selfie reicht. Kontrolleur/innen sehen es beim Scan – wie bei der FlyCard in Bassano.'),
        errors.photo && h('p', { className: 'pt-error' }, errors.photo)),
      h('div', { className: 'pt-field' },
        h('label', { htmlFor: 'f-kind' }, 'Ich bin'),
        h('select', { id: 'f-kind', value: f.kind, onChange: function (ev) { set('kind', ev.target.value); } },
          h('option', { value: 'Gast' }, 'Gast (nicht Mitglied)'),
          h('option', { value: 'Passivmitglied' }, 'Passivmitglied'),
          h('option', { value: 'Gönner/in' }, 'Gönner/in')),
        h('p', { className: 'pt-hint' }, 'Aktivmitglieder müssen nichts kaufen – ihre Karte kommt automatisch.')),
      h('div', { className: 'pt-field' },
        h('div', { className: 'pt-check' },
          h('input', { id: 'f-terms', type: 'checkbox', checked: f.terms, 'aria-invalid': errors.terms ? 'true' : undefined, onChange: function (ev) { set('terms', ev.target.checked); } }),
          h('label', { htmlFor: 'f-terms', style: { fontWeight: 400 } }, 'Ich halte mich an die Gebietsregeln und zeige die Karte bei Kontrollen vor. Ohne gültige Karte kann ich vom Gelände weggewiesen werden.')),
        errors.terms && h('p', { className: 'pt-error' }, errors.terms)),
      h('div', { className: 'pt-actions' },
        h(G.Button, { variant: 'primary', type: 'submit' }, 'Weiter zur Zahlung'),
        h(G.Button, { variant: 'ghost', onClick: p.back }, 'Zurück')));
  }

  function Payment(p) {
    var f = p.form, s = useState(false), paying = s[0], setPaying = s[1];
    function pay() {
      setPaying(true);
      setTimeout(function () { p.done(); }, 900);
    }
    return h('div', { className: 'pt-split' },
      h('div', { className: 'pt-panel' },
        h('h2', null, 'Übersicht'),
        h('dl', { className: 'pt-summary' },
          h('dt', null, 'Jahreskarte ' + D.season), h('dd', null, 'CHF ' + chf(D.price)),
          h('dt', null, 'Inhaber/in'), h('dd', { style: { fontFamily: 'var(--font-body)' } }, f.first + ' ' + f.last),
          h('dt', { className: 'total' }, 'Total'), h('dd', { className: 'total' }, 'CHF ' + chf(D.price)))),
      h('div', null,
        h('fieldset', { className: 'pt-options' },
          h('legend', { className: 'pt-h3', style: { marginBottom: 'var(--space-3)' } }, 'Bezahlen mit'),
          METHODS.map(function (m) {
            var id = 'pay-' + m.toLowerCase().replace(/\s+/g, '-');
            return h('label', { key: m, className: 'pt-option', htmlFor: id },
              h('input', { id: id, type: 'radio', name: 'pay', checked: p.method === m, onChange: function () { p.setMethod(m); } }), m);
          })),
        h('div', { className: 'pt-actions', style: { marginTop: 'var(--space-6)' } },
          h(G.Button, { variant: 'wing', size: 'lg', disabled: paying, onClick: pay }, paying ? 'Zahlung läuft …' : 'CHF ' + chf(D.price) + ' bezahlen'),
          h(G.Button, { variant: 'ghost', disabled: paying, onClick: p.back }, 'Zurück')),
        h('p', { className: 'pt-hint', style: { marginTop: 'var(--space-3)' } }, 'Im Prototyp wird nichts belastet.')));
  }

  function Done(p) {
    var c = p.card;
    return h('div', { className: 'pt-done' },
      h(G.PassCard, {
        logoSrc: 'ds/logos/gkg-signet.png', holder: c.holder, photo: c.photo, kind: 'Start- & Landeplatz', season: 'Jahreskarte ' + D.season, number: c.number,
        fields: [['Gültig', 'Saison ' + D.season], ['Kartennr.', c.number], ['Typ', c.kind], ['Bezahlt', 'CHF ' + chf(D.price) + ' · ' + c.method]],
        onAppleWallet: function () { p.notify('Apple Wallet ist im Prototyp nicht verbunden.'); },
        onGoogleWallet: function () { p.notify('Google Wallet ist im Prototyp nicht verbunden.'); }
      }),
      h('div', null,
        h('h2', { className: 'pt-h2' }, 'Deine Jahreskarte ist bereit'),
        h('p', { className: 'pt-lead' }, 'Speichere sie jetzt in deinem Handy. Die Quittung geht an ' + c.email + '.'),
        h('p', { className: 'pt-hint' }, 'Im Prototyp wird keine E-Mail verschickt und der QR-Code ist ein Muster.'),
        h('ol', { className: 'pt-steps' },
          h('li', null, h('div', null, h('b', null, 'Ins Wallet legen'), 'Ein Tipp auf «Zu Apple Wallet hinzufügen» oder «In Google Wallet speichern».')),
          h('li', null, h('div', null, h('b', null, 'Bei Kontrollen zeigen'), 'Am Start- oder Landeplatz den QR-Code vorweisen.')),
          h('li', null, h('div', null, h('b', null, 'Nächstes Jahr verlängern'), 'Wir erinnern dich vor Saisonbeginn per E-Mail.'))),
        h('div', { className: 'pt-actions', style: { marginTop: 'var(--space-8)' } },
          h(G.Button, { variant: 'primary', href: '#kontrolle' }, 'So sieht die Kontrolle aus'),
          h(G.Button, { variant: 'quiet', onClick: p.restart }, 'Weitere Karte kaufen'))));
  }

  function Checkout(p) {
    var c = p.checkout;
    function setStep(n) { p.setCheckout(Object.assign({}, c, { step: n })); window.scrollTo(0, 0); }
    var body;
    if (c.step === 1) {
      body = h('div', { className: 'pt-split' },
        h(G.BuyBox, {
          title: 'Jahreskarte ' + D.season, badge: 'Neu digital', price: D.price, per: 'pro Saison',
          perks: ['Gratis fliegen in allen GKG-Fluggebieten', 'QR-Code in Apple Wallet oder Google Wallet', 'Quittung per E-Mail'],
          methods: METHODS,
          note: h(Fragment, null, 'Für Aktivmitglieder gratis. ', h('a', { href: '#verein' }, 'Für CHF 70 Mitglied werden'), ' – Karte inklusive.'),
          onBuy: function () { setStep(2); }
        }),
        h('div', { className: 'pt-aside' },
          h('div', { className: 'pt-panel pt-panel-soft' }, h('h3', null, 'Aktivmitglied?'), h('p', null, 'Deine Jahreskarte kommt automatisch, sobald der Mitgliederbeitrag von CHF 70 bezahlt ist.')),
          h('div', { className: 'pt-panel' }, h('h3', null, 'Gut zu wissen'), h('ul', { style: { margin: 'var(--space-2) 0 0', paddingLeft: '1.2em', display: 'grid', gap: 'var(--space-2)' } },
            h('li', null, 'Es gibt nur Jahreskarten – keine Tageskarten.'),
            h('li', null, 'Kontrollen an Start- und Landeplätzen, mit Foto-Abgleich.'),
            h('li', null, 'Ob die Karte für die Saison, das Kalenderjahr oder 365 Tage ab Kauf gilt, entscheidet der Vorstand.')))));
    } else if (c.step === 2) {
      body = h(ProfileForm, { form: c.form, setForm: function (f) { p.setCheckout(Object.assign({}, c, { form: f })); }, next: function () { setStep(3); }, back: function () { setStep(1); } });
    } else if (c.step === 3) {
      body = h(Payment, {
        form: c.form, method: c.method,
        setMethod: function (m) { p.setCheckout(Object.assign({}, c, { method: m })); },
        back: function () { setStep(2); },
        done: function () {
          var f = c.form;
          p.setCard({ holder: (f.first + ' ' + f.last).trim(), email: f.email.trim(), photo: f.photo, kind: f.kind, method: c.method, number: D.season + '-0' + String(100 + Math.floor(Math.random() * 900)) });
          setStep(4);
        }
      });
    } else {
      body = p.card ? h(Done, { card: p.card, notify: p.notify, restart: function () { p.setCheckout(newCheckout()); window.scrollTo(0, 0); } }) : null;
    }
    return h(Fragment, null,
      h(PageHead, { title: 'Jahreskarte ' + D.season, lead: 'Nach dem Vorbild der FlyCard in Bassano: Profil mit Foto anlegen, bezahlen, Karte ins Handy.' }),
      h(Wrap, null, h(Stepper, { step: c.step }), body));
  }

  function newCheckout() {
    return { step: 1, method: 'TWINT', form: { first: 'Anna', last: 'Muster', email: 'anna.muster@beispiel.ch', kind: 'Gast', photo: null, terms: false } };
  }

  /* ---------- Kontrolle ---------- */
  function Control(p) {
    var s = useState(null), result = s[0], setResult = s[1];
    var card = p.card || { holder: 'Anna Muster', number: D.season + '-0142', kind: 'Gast', photo: null };
    return h(Fragment, null,
      h(PageHead, { title: 'Kontrolle am Startplatz', lead: 'Kontrolleur/innen öffnen die Kontroll-Seite im Handy-Browser und scannen den QR-Code. Keine App, kein Aufwand für die Pilot/innen.' }),
      h(Wrap, null, h('div', { className: 'pt-split' },
        h('div', null,
          h('h2', { className: 'pt-h3' }, 'Was beim Scan geprüft wird'),
          h('ol', { className: 'pt-steps' },
            h('li', null, h('div', null, h('b', null, 'Echtheit'), 'Die Signatur im QR-Code verrät jede Fälschung.')),
            h('li', null, h('div', null, h('b', null, 'Gültigkeit'), 'Saison und Sperrstatus, online gegen die Klub-Datenbank.')),
            h('li', null, h('div', null, h('b', null, 'Person'), 'Name und Foto erscheinen gross – Weitergeben lohnt sich nicht.'))),
          h('p', { className: 'pt-source' }, p.card ? 'Gezeigt wird deine eben gekaufte Karte.' : 'Gezeigt wird eine Beispielkarte. Kauf zuerst eine Karte, dann erscheint hier deine.'),
          h('p', { className: 'pt-hint' }, 'Die Kamera ist im Prototyp nicht verbunden – der Scan wird simuliert.')),
        h('div', { className: 'pt-phone' }, h('div', { className: 'pt-phone-screen' },
          h('div', { className: 'pt-phone-bar' }, h('span', null, 'GKG Kontrolle'), h('span', null, 'Hüsliberg')),
          h('div', { className: 'pt-phone-body', 'aria-live': 'polite' },
            result == null
              ? h(Fragment, null,
                  h('div', { className: 'pt-scan' }, h('p', null, 'QR-Code in den Rahmen halten')),
                  h(G.Button, { variant: 'primary', onClick: function () { setResult('go'); } }, 'Scan simulieren: gültige Karte'),
                  h(G.Button, { variant: 'quiet', onClick: function () { setResult('stop'); } }, 'Scan simulieren: gesperrte Karte'))
              : h(Fragment, null,
                  h('div', { className: 'pt-result pt-result-' + result },
                    h('span', { className: 'pt-result-big' }, result === 'go' ? 'Gültig' : 'Gesperrt'),
                    h(Avatar, { photo: card.photo, name: card.holder, large: true }),
                    h('p', { className: 'pt-h3' }, card.holder),
                    h('p', { className: 'gkg-data' }, 'Karte ' + card.number + ' · Saison ' + D.season),
                    h('p', null, card.kind),
                    result === 'stop' && h('p', { className: 'pt-small' }, 'Als verloren gemeldet (Beispiel). Bitte Ersatzkarte zeigen lassen.')),
                  h(G.Button, { variant: 'primary', onClick: function () { setResult(null); } }, 'Nächste Karte scannen'))))))));
  }

  /* ---------- Login ---------- */
  function Login(p) {
    var s = useState(''), email = s[0], setEmail = s[1];
    var t = useState(false), sent = t[0], setSent = t[1];
    var e = useState(null), err = e[0], setErr = e[1];
    function submit(ev) {
      ev.preventDefault();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErr('Bitte eine gültige E-Mail-Adresse eingeben.'); return; }
      setErr(null); setSent(true);
    }
    return h(Fragment, null,
      h(PageHead, { title: 'Mein GKG', lead: 'Anmelden ohne Passwort: Du bekommst einen Anmeldelink per E-Mail.' }),
      h(Wrap, null,
        !sent && h('form', { className: 'pt-form', noValidate: true, onSubmit: submit },
          h('div', { className: 'pt-field' },
            h('label', { htmlFor: 'l-email' }, 'E-Mail'),
            h('input', { id: 'l-email', type: 'email', autoComplete: 'email', value: email, 'aria-invalid': err ? 'true' : undefined, onChange: function (ev) { setEmail(ev.target.value); } }),
            err && h('p', { className: 'pt-error' }, err)),
          h('div', { className: 'pt-actions' }, h(G.Button, { variant: 'primary', type: 'submit' }, 'Anmeldelink anfordern'))),
        sent && h(Fragment, null,
          h('p', { className: 'pt-hint', style: { marginBottom: 'var(--space-6)' } }, 'Im Prototyp wird keine E-Mail verschickt. So sieht dein Bereich nach der Anmeldung aus:'),
          h('div', { className: 'pt-grid' },
            h('div', { className: 'pt-panel' }, h('h3', null, 'Meine Jahreskarte'),
              p.card ? h(Fragment, null, h('p', null, 'Karte ' + p.card.number + ' · Saison ' + D.season), h(G.FlightStatus, { status: 'go', label: 'Gültig' }))
                : h(Fragment, null, h('p', null, 'Noch keine Karte für ' + D.season + '.'), h('p', null, h(G.Button, { variant: 'wing', href: '#jahreskarte' }, 'Jahreskarte holen')))),
            h('div', { className: 'pt-panel' }, h('h3', null, 'Meine Bestellungen'), h('p', null, p.cart.length ? p.cart.length + ' Artikel im Warenkorb' : 'Keine Bestellungen.')),
            h('div', { className: 'pt-panel' }, h('h3', null, 'Meine Inserate'), h('p', null, 'Keine Inserate.'), h('p', null, h('a', { href: '#shop' }, 'Zum Gebrauchtmarkt')))))));
  }

  function NotFound() {
    return h(PageHead, { title: 'Seite nicht gefunden', lead: 'Diese Seite gibt es im Prototyp nicht.' }, h('p', null, h('a', { href: '#start' }, 'Zur Startseite')));
  }

  /* ---------- Frame ---------- */
  function Footer() {
    return h('footer', { className: 'pt-footer' }, h('div', { className: 'pt-wrap' },
      h('div', null,
        h('div', { className: 'pt-logo-tile pt-logo-tile-sm' }, h('img', { src: 'ds/logos/gkg-sonne-text.png', alt: 'Logo Gleitschirmklub Glarnerland: Sonne aus sieben Gleitschirmen', width: 426, height: 580 })),
        h('p', { className: 'pt-muted', style: { marginTop: 'var(--space-3)' } }, 'info@gkg.ch')),
      h('nav', { 'aria-label': 'Fusszeile' }, h('h2', null, 'Klub'), h('ul', { className: 'pt-links' },
        h('li', null, h('a', { href: '#verein' }, 'Verein & Mitgliedschaft')),
        h('li', null, h('a', { href: '#sport' }, 'Sport & GKG-Cup')),
        h('li', null, h('a', { href: '#kontrolle' }, 'Kontrolle am Startplatz')),
        h('li', null, h('a', { href: '#login' }, 'Mein GKG')))),
      h('div', null, h('h2', null, 'Prototyp'),
        h('p', { className: 'pt-small' }, 'Stand 27.10.2026. Wetterwerte, Status, Gebietsmeldungen, Preise und Inserate sind Beispieldaten. Gebietstexte stammen von gkg.ch.'),
        h('p', { className: 'pt-small pt-muted' }, 'Impressum und Datenschutz folgen.'))));
  }

  function App() {
    var r = useState(currentRoute()), route = r[0], setRoute = r[1];
    var tState = useState(null), toast = tState[0], setToast = tState[1];
    var cState = useState(null), card = cState[0], setCard = cState[1];
    var kState = useState(newCheckout()), checkout = kState[0], setCheckout = kState[1];
    var bState = useState([]), cart = bState[0], setCart = bState[1];

    useEffect(function () {
      function onHash() { setRoute(currentRoute()); window.scrollTo(0, 0); }
      window.addEventListener('hashchange', onHash);
      return function () { window.removeEventListener('hashchange', onHash); };
    }, []);
    useEffect(function () {
      if (!toast) return;
      var id = setTimeout(function () { setToast(null); }, 4000);
      return function () { clearTimeout(id); };
    }, [toast]);

    function notify(msg) { setToast({ msg: msg, at: Date.now() }); }
    function addToCart(product, choice) {
      setCart(cart.concat([{ name: product.name, price: product.price, color: choice.color, size: choice.size }]));
      notify(product.name + [choice.size, choice.color].filter(Boolean).map(function (x) { return ' · ' + x; }).join('') + ' liegt im Warenkorb.');
    }
    function startCheckout() { setCheckout(Object.assign(newCheckout(), { step: 2 })); go('jahreskarte'); }

    var shared = { notify: notify, addToCart: addToCart, cart: cart, card: card, setCard: setCard, checkout: checkout, setCheckout: setCheckout, startCheckout: startCheckout };
    var page;
    if (route === 'start') page = h(Start, shared);
    else if (route === 'fluggebiete') page = h(Areas, shared);
    else if (route.indexOf('gebiet-') === 0) page = h(AreaDetail, Object.assign({ id: route.slice(7) }, shared));
    else if (route === 'wetter') page = h(Weather, shared);
    else if (route === 'sport') page = h(Sport, shared);
    else if (route === 'verein') page = h(Verein, shared);
    else if (route === 'shop') page = h(Shop, shared);
    else if (route === 'jahreskarte') page = h(Checkout, shared);
    else if (route === 'kontrolle') page = h(Control, shared);
    else if (route === 'login') page = h(Login, shared);
    else page = h(NotFound);

    return h(Fragment, null,
      h('div', { className: 'pt-ribbon' }, h(Wrap, null, h('b', null, 'Prototyp'), ' · Klickbar, aber nicht verbunden. Wetter, Status, Preise und Inserate sind Beispieldaten.')),
      h('div', { className: 'pt-header' }, h(G.SiteHeader, { logoSrc: 'ds/logos/gkg-signet.png', clubName: 'Gleitschirmklub Glarnerland', items: NAV, active: activeLabel(route), homeHref: '#start', loginHref: '#login', ctaHref: '#jahreskarte', cta: 'Jahreskarte' })),
      h('main', { key: route }, page),
      h(Footer),
      toast && h('div', { className: 'pt-toast', role: 'status', key: toast.at }, toast.msg));
  }

  ReactDOM.createRoot(document.getElementById('app')).render(h(App));
})();
