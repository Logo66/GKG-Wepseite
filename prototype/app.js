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

  var UI = window.GKGUI, S = window.GKGStore, WX = window.GKGStations;
  var chf = UI.chf, go = UI.go, ext = UI.ext, Wrap = UI.Wrap, PageHead = UI.PageHead, Section = UI.Section, Block = UI.Block, Avatar = UI.Avatar, Dialog = UI.Dialog;
  function areaById(id) { return D.areas.filter(function (a) { return a.id === id; })[0]; }

  function currentRoute() { return (location.hash || '').replace(/^#/, '') || 'start'; }
  function activeLabel(route) {
    if (route === 'fluggebiete' || route.indexOf('gebiet-') === 0) return 'Fluggebiete';
    var hit = NAV.filter(function (n) { return n.href === '#' + route; })[0];
    return hit ? hit.label : null;
  }

  // Wetterstationen von flightbuddyki.ch (oder klar markierte Beispielwerte, siehe stations.js)
  function useStations() {
    var s = useState(null), data = s[0], setData = s[1];
    useEffect(function () { var off = WX.subscribe(setData); WX.load(); return off; }, []);
    return data;
  }
  function km(a, b) {
    var dx = (a.lon - b.lon) * 111.32 * Math.cos(a.lat * Math.PI / 180), dy = (a.lat - b.lat) * 110.54;
    return Math.sqrt(dx * dx + dy * dy);
  }
  // Nächste Station im Umkreis von 6 km – weiter weg sagt der Wind wenig über den Platz
  function stationNear(wx, site) {
    if (!wx || !wx.stations.length) return null;
    var st = WX.nearest(wx.stations, site.lat, site.lon);
    var d = km(st, site);
    return d <= 6 ? { station: st, km: d } : null;
  }
  function StationNote(p) {
    var wx = p.wx;
    if (wx && wx.live && wx.stale) return h('p', { className: 'pt-wx-note', role: 'note' }, h('b', null, 'Letzte bekannte Werte. '), 'flightbuddyki.ch ist gerade nicht erreichbar; das Alter jeder Messung steht auf der Karte.');
    if (!wx || wx.live) return null;
    return h('p', { className: 'pt-wx-note', role: 'note' },
      h('b', null, 'Beispielwerte. '),
      'flightbuddyki.ch ist von hier aus ' + (wx.reason || 'nicht erreichbar') + ' – die Live-Werte erscheinen, sobald der Klub-Server die Daten weitergibt.');
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

      h(Section, { id: 'jetzt', title: 'Jetzt am Startplatz', sub: 'Wind der Stationen in den Fluggebieten – von flightbuddyki.ch.', aside: h('a', { href: '#wetter', className: 'pt-small' }, 'Alle Stationen') },
        h(StationNote, { wx: p.wx }),
        p.wx
          ? h('div', { className: 'pt-grid' }, p.wx.stations.slice().sort(function (a, b) { return (a.ageS || 0) - (b.ageS || 0); }).slice(0, 3).map(function (w) { return h(G.WeatherCard, Object.assign({ key: w.id }, w)); }))
          : h('p', { className: 'pt-muted', role: 'status' }, 'Stationen werden geladen …')),

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

  var LAYER_CHOICES = [['wege', 'Wege und Pfade'], ['hikefly', 'Hike-&-Fly-Routen'], ['strassen', 'Strassen und Bahnen'], ['bahnen', 'Seilbahnen und Leitungen'], ['namen', 'Ortsnamen und Gipfel']];

  // Die 3D-Karte: lädt MapLibre erst hier, zeigt bis dahin ein Standbild bzw. bei Fehlern das Schema.
  // Mit p.wx erscheinen die Windstationen als Pfeile; p.onStation(id) meldet einen Tipp darauf.
  function Map3D(p) {
    var ref = React.useRef(null), apiRef = React.useRef(null), cb = React.useRef(p);
    cb.current = p;
    var st = useState('loading'), state = st[0], setState = st[1];
    var er = useState(''), err = er[0], setErr = er[1];
    var tr = useState(true), terrain = tr[0], setTerrain = tr[1];
    var wo = useState(!p.compact), wxOn = wo[0], setWxOn = wo[1];
    var gr = useState({ wege: true, hikefly: true, strassen: true, bahnen: true, namen: true }), groups = gr[0], setGroups = gr[1];
    var lo = useState(false), layersOpen = lo[0], setLayersOpen = lo[1];
    function setGroup(k, on) { var g = Object.assign({}, groups); g[k] = on; setGroups(g); apiRef.current.setGroup(k, on); }
    useEffect(function () {
      var alive = true;
      window.GKGMap.create(ref.current, {
        sites: D.sites, focusArea: p.focusArea,
        renderMarker: function (el, site, active) { renderMarker(el, site, active, function (id) { cb.current.onSelect(id); }); }
      }).then(function (api) {
        if (!alive) { api.destroy(); return; }
        apiRef.current = api;
        if (p.apiRef) p.apiRef.current = api;
        setState('ready');
        if (cb.current.onReady) cb.current.onReady(api);
      }, function (e) { if (alive) { setErr(e && e.message ? e.message : String(e)); setState('error'); } });
      return function () {
        alive = false;
        if (apiRef.current) apiRef.current.destroy();
        apiRef.current = null;
        if (p.apiRef) p.apiRef.current = null;
      };
    }, []);
    useEffect(function () { if (state === 'ready' && p.selected) apiRef.current.select(p.selected); }, [p.selected, state]);
    useEffect(function () {
      if (state !== 'ready' || !p.wx) return;
      apiRef.current.setStations(p.wx.stations, function (id) { if (cb.current.onStation) cb.current.onStation(id); });
    }, [p.wx, state]);
    useEffect(function () { if (state === 'ready') apiRef.current.showStations(wxOn); }, [wxOn, state]);
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
        h(G.Button, { variant: 'quiet', onClick: function () { setLayersOpen(!layersOpen); }, 'aria-expanded': layersOpen, 'aria-controls': 'layers-' + (p.compact ? 'c' : 'm') }, 'Ebenen'),
        p.onPlan && h(G.Button, { variant: p.planning ? 'primary' : 'quiet', onClick: p.onPlan, 'aria-pressed': !!p.planning }, p.planning ? 'Planer schliessen' : 'Route planen'),
        !p.compact && h(G.Button, { variant: 'quiet', onClick: function () { apiRef.current.overview(); if (p.onOverview) p.onOverview(); } }, 'Übersicht')),
      state === 'ready' && layersOpen && h('fieldset', { className: 'pt-layers', id: 'layers-' + (p.compact ? 'c' : 'm') },
        h('legend', null, 'Auf der Karte zeigen'),
        LAYER_CHOICES.map(function (c) {
          return h('label', { key: c[0], className: 'pt-check' },
            h('input', { type: 'checkbox', checked: !!groups[c[0]], onChange: function (e) { setGroup(c[0], e.target.checked); } }), c[1]);
        }),
        p.wx && h('label', { className: 'pt-check' }, h('input', { type: 'checkbox', checked: wxOn, onChange: function (e) { setWxOn(e.target.checked); } }), 'Windstationen'),
        h('button', { type: 'button', className: 'pt-linkbtn', onClick: function () { setLayersOpen(false); } }, 'Fertig')),
      p.planning && state === 'ready' && h('p', { className: 'pt-map3d-hint', role: 'status' }, 'Tippe auf die Karte: Start, Zwischenpunkte, Ziel.'));
  }

  function SiteFacts(p) {
    var x = p.site;
    return h('dl', { className: 'pt-sitefacts' },
      h('dt', null, x.kind === 'start' ? 'Starthöhe' : 'Höhe'), h('dd', null, fmtAlt(x.alt) + ' m ü. M.'),
      x.kind === 'start' && h(Fragment, null, h('dt', null, 'Startrichtung'), h('dd', null, x.dirs.length ? x.dirs.join(', ') : 'nicht angegeben')),
      x.level && h(Fragment, null, h('dt', null, 'Schwierigkeit'), h('dd', { className: 'pt-dd-text' }, x.level)),
      h('dt', null, 'Koordinaten'), h('dd', null, x.lat.toFixed(5) + ' N, ' + x.lon.toFixed(5) + ' O'),
      h('dt', null, 'LV95'), h('dd', null, lv95(x)),
      h('dt', null, 'Quelle'), h('dd', { className: 'pt-dd-text' }, x.srcUrl ? ext(x.srcUrl, x.src) : x.src),
      x.check && h(Fragment, null, h('dt', null, 'Stand'), h('dd', { className: 'pt-dd-text' }, h(G.FlightStatus, { status: 'caution', label: 'Vom Ressort zu bestätigen' }))));
  }

  function shvFor(site) {
    var id = Object.keys(D.shv).filter(function (k) { return D.shv[k].sites.indexOf(site.id) >= 0; })[0];
    return id ? Object.assign({ id: id }, D.shv[id]) : null;
  }
  function windText(st) {
    var parts = [st.wind == null ? 'kein Wind gemessen' : st.wind + ' km/h'];
    if (st.direction != null) parts[0] += ' aus ' + compass(st.direction);
    if (st.gust != null) parts.push('Böen ' + st.gust + ' km/h');
    return parts.join(', ');
  }
  var COMPASS = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
  function compass(deg) { return COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8]; }

  // Pop-up beim Tipp auf einen Platz: Eckdaten, Wind in der Nähe und die SHV-Infotafel des Gebiets
  function SiteDialog(p) {
    var x = p.site;
    if (!x) return h(Dialog, { open: false, id: 'site-dlg', title: '', onClose: p.onClose });
    var area = areaById(x.areas[0]), tafel = shvFor(x), near = stationNear(p.wx, x);
    var preview = tafel && window.GKG_SHV_PREVIEW && window.GKG_SHV_PREVIEW[tafel.id];
    var others = tafel ? tafel.sites.filter(function (id) { return id !== x.id; }).map(siteById).filter(Boolean) : [];
    return h(Dialog, {
      open: true, id: 'site-dlg', wide: true, onClose: p.onClose,
      eyebrow: (x.kind === 'start' ? 'Startplatz' : 'Landeplatz') + ' · ' + x.areas.map(function (id) { return areaById(id).name; }).join(', '),
      title: x.name,
      footer: function (close) {
        return h('div', { className: 'pt-actions' },
          tafel && h(G.Button, { variant: 'primary', href: tafel.url, target: '_blank', rel: 'noopener' }, 'Infotafel als PDF (SHV)'),
          x.kind === 'landing' && h(G.Button, { variant: 'quiet', href: 'https://www.google.com/maps/dir/?api=1&destination=' + x.lat + ',' + x.lon, target: '_blank', rel: 'noopener' }, 'Route'),
          !p.onArea && h(G.Button, { variant: 'quiet', href: '#gebiet-' + area.id, onClick: close }, 'Gebiet ' + area.name),
          h(G.Button, { variant: 'ghost', onClick: close }, 'Schliessen'));
      }
    },
      h('div', { className: 'pt-site-dlg' },
        h('div', null,
          x.kind === 'start' && h('p', { className: 'pt-actions' }, h(G.FlightStatus, { status: area.status, label: area.statusLabel }), h('span', { className: 'pt-small pt-muted' }, 'Status: Beispiel')),
          x.note && h('p', null, x.note),
          h(SiteFacts, { site: x }),
          near && h('div', { className: 'pt-site-wind' },
            h('h3', { className: 'pt-h4' }, 'Wind in der Nähe'),
            h('p', null, h('b', null, windText(near.station))),
            h('p', { className: 'pt-small pt-muted' }, near.station.station + ' · ' + near.km.toFixed(1).replace('.', ',') + ' km entfernt · ' + near.station.updated + ' · ' + (near.station.live ? 'Quelle: ' + near.station.source : 'Beispielwert'))),
          x.kind === 'start' && h(window.GKGForecast.Panel, { site: x }),
          x.kind === 'start' && h(HikeFly, { site: x, onShowRoute: p.onShowRoute })),
        h('section', { className: 'pt-shv', 'aria-labelledby': 'shv-t' },
          tafel
            ? h(Fragment, null,
                h('h3', { id: 'shv-t', className: 'pt-h4' }, tafel.title),
                preview && h('a', { className: 'pt-shv-preview', href: tafel.url, target: '_blank', rel: 'noopener' },
                  h('img', { src: preview, alt: 'Vorschau ' + tafel.title + ' – öffnet das PDF', loading: 'lazy' })),
                h('p', { className: 'pt-small pt-muted' }, 'Auszug aus der Tafel. Massgebend ist immer die aktuelle Tafel des SHV.'),
                h('ul', { className: 'pt-shv-rules' }, tafel.rules.map(function (r, i) { return h('li', { key: i }, r); })),
                tafel.note && h('p', { className: 'pt-small' }, tafel.note),
                others.length > 0 && h(Fragment, null,
                  h('p', { className: 'pt-small', style: { margin: 'var(--space-4) 0 var(--space-2)' } }, h('b', null, 'Ebenfalls auf dieser Tafel:')),
                  h('ul', { className: 'pt-shv-sites' }, others.map(function (o) {
                    return h('li', { key: o.id }, h('button', { type: 'button', className: 'pt-tab', onClick: function () { p.onPick(o.id); } }, o.name));
                  }))))
            : h(Fragment, null,
                h('h3', { id: 'shv-t', className: 'pt-h4' }, 'SHV-Infotafel'),
                h('p', null, 'Für ' + area.name + ' ist keine SHV-Infotafel bekannt. Das Ressort Fluggebiete ergänzt die Regeln.'),
                h('p', { className: 'pt-small' }, 'Die Infotafeln der anderen Gebiete stehen auf ', ext('https://www.shv-fsvl.ch', 'shv-fsvl.ch'), '.')))));
  }

  function SitePanel(p) {
    var x = p.site, area = areaById(x.areas[0]), near = stationNear(p.wx, x);
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
      h(G.Button, { variant: 'quiet', onClick: p.onInfo }, shvFor(x) ? 'SHV-Infotafel und Details' : 'Details zum Platz'),
      near && h('p', { className: 'pt-small' }, h('b', null, 'Wind in der Nähe: '), windText(near.station), h('span', { className: 'pt-muted' }, ' · ' + near.station.station + (near.station.live ? '' : ' (Beispiel)'))));
  }

  function StationPanel(p) {
    var st = p.station;
    var site = D.sites.slice().sort(function (a, b) { return km(a, st) - km(b, st); })[0];
    return h('div', { className: 'pt-sitepanel' },
      h(G.WeatherCard, Object.assign({ key: st.id }, st)),
      site && h('p', { className: 'pt-small' }, 'Nächster Platz: ', h('button', { type: 'button', className: 'pt-linkbtn', onClick: function () { p.onSite(site.id); } }, site.name), ' (' + km(site, st).toFixed(1).replace('.', ',') + ' km)'),
      st.sourceId === 'swissmetnet' && h('p', { className: 'pt-small pt-muted' }, 'Quelle: MeteoSchweiz'));
  }

  // Vorberechnete Hike-&-Fly-Routen (karte/hikefly.json, tools/build-routes.js)
  function useHikeFly() {
    var s = useState(null), data = s[0], setData = s[1];
    useEffect(function () {
      var alive = true;
      window.GKGMap.loadData('hikefly.json').then(function (d) { if (alive) setData(d); }, function () { if (alive) setData({ routes: [] }); });
      return function () { alive = false; };
    }, []);
    return data;
  }
  function fmtKm(km) { return km.toFixed(1).replace('.', ',') + ' km'; }
  function fmtH(hours) { return window.GKGRoute.hm(hours); }

  function HikeFly(p) {
    var hf = useHikeFly();
    var list = hf ? hf.routes.filter(function (r) { return r.site === p.site.id; }) : [];
    if (!list.length) return null;
    return h('div', { className: 'pt-dlg-part' },
      h('h3', { className: 'pt-h4' }, 'Hike & Fly'),
      h('ul', { className: 'pt-hf' }, list.map(function (r, i) {
        return h('li', { key: i },
          h('p', null, h('b', null, 'ab ' + r.from), ' · ' + fmtKm(r.km) + ' · ↑ ' + fmtAlt(r.up) + ' m'),
          h('p', { className: 'pt-small' }, 'ca. ' + fmtH(r.hours) + ' gemütlich (DIN 33466) · ' + fmtH(r.hoursFast) + ' bei 500 Hm/h'),
          r.gkg && h('p', { className: 'pt-small pt-muted' }, r.gkg),
          r.snapEnd > 60 && h('p', { className: 'pt-small pt-muted' }, 'Die letzten rund ' + Math.round(r.snapEnd / 10) * 10 + ' m zum Startplatz führen über Wiese, ohne eingetragenen Weg.'),
          p.onShowRoute && h(G.Button, { variant: 'quiet', className: 'pt-btn-sm', onClick: function () { p.onShowRoute(r); } }, 'Auf der Karte zeigen'));
      })),
      h('p', { className: 'pt-small pt-muted' }, 'Berechnet auf Wegen aus OpenStreetMap – Vorschlag, vor Ort prüfen. Wildruhezonen, Alpbetrieb und Wegrechte beachten.'));
  }

  // Höhenprofil als SVG
  function Profile(p) {
    var pts = p.profile, W = 320, H = 96, maxD = pts[pts.length - 1][0] || 1;
    var lo = Math.floor(p.min / 100) * 100, hi = Math.ceil(p.max / 100) * 100;
    if (hi - lo < 200) hi = lo + 200;
    function X(d) { return (d / maxD * (W - 40) + 36).toFixed(1); }
    function Y(e) { return (H - 18 - (e - lo) / (hi - lo) * (H - 28)).toFixed(1); }
    var step = Math.max(1, Math.floor(pts.length / 300));
    var line = pts.filter(function (_, i) { return i % step === 0 || i === pts.length - 1; }).map(function (q) { return X(q[0]) + ',' + Y(q[1]); }).join(' ');
    return h('figure', { className: 'pt-profile' },
      h('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Höhenprofil von ' + fmtAlt(Math.round(pts[0][1])) + ' bis ' + fmtAlt(Math.round(pts[pts.length - 1][1])) + ' m, höchster Punkt ' + fmtAlt(Math.round(p.max)) + ' m' },
        h('polygon', { className: 'pt-profile-area', points: X(0) + ',' + (H - 18) + ' ' + line + ' ' + X(maxD) + ',' + (H - 18) }),
        h('polyline', { className: 'pt-profile-line', points: line }),
        h('text', { x: 32, y: 14, textAnchor: 'end' }, fmtAlt(hi)),
        h('text', { x: 32, y: H - 18, textAnchor: 'end' }, fmtAlt(lo)),
        h('text', { x: 36, y: H - 4 }, '0 km'),
        h('text', { x: W - 4, y: H - 4, textAnchor: 'end' }, fmtKm(maxD))));
  }

  var RATES = [[300, 'gemütlich – 300 Hm/h (DIN 33466)'], [400, 'zügig – 400 Hm/h'], [500, 'sportlich – 500 Hm/h'], [600, 'sehr sportlich – 600 Hm/h']];
  function RoutePlanner(p) {
    var pl = p.plan, r = pl.result, hf = useHikeFly();
    var g = useState(false), gpxOpen = g[0], setGpxOpen = g[1];
    var gpx = r && !r.error ? window.GKGRoute.gpx(r, 'GKG Route') : '';
    function download() {
      try {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([gpx], { type: 'application/gpx+xml' }));
        a.download = 'gkg-route.gpx'; document.body.appendChild(a); a.click(); a.remove();
      } catch (e) { p.notify('Herunterladen geht hier nicht – bitte den Text kopieren.'); }
    }
    var classes = r && r.byClass ? Object.keys(r.byClass).map(function (k) { return [k, r.byClass[k]]; }).sort(function (a, b) { return b[1] - a[1]; }) : [];
    var total = classes.reduce(function (t, c) { return t + c[1]; }, 0) || 1;
    return h('div', { className: 'pt-panel pt-planner' },
      h('h2', null, 'Route planen'),
      h('p', { className: 'pt-small' }, 'Tippe auf die Karte für Start, Zwischenpunkte und Ziel – die Route folgt Wegen und Pfaden. Punkte lassen sich verschieben. Ein Tipp auf einen Startplatz setzt ihn als Punkt.'),
      hf && hf.routes.length > 0 && h(UI.Field, { id: 'pl-hf', label: 'Oder Hike & Fly zu einem Startplatz' },
        h('select', { id: 'pl-hf', value: '', onChange: function (e) { var rr = hf.routes[+e.target.value]; if (rr) p.onHikeFly(rr); } },
          h('option', { value: '' }, 'Route wählen …'),
          hf.routes.map(function (rr, i) { return h('option', { key: i, value: i }, siteById(rr.site).name + ' ab ' + rr.from); }))),
      h(UI.Field, { id: 'pl-rate', label: 'Tempo' },
        h('select', { id: 'pl-rate', value: pl.rate, onChange: function (e) { p.onRate(+e.target.value); } },
          RATES.map(function (x) { return h('option', { key: x[0], value: x[0] }, x[1]); }))),
      pl.loading && h('p', { className: 'pt-small', role: 'status' }, 'Wegnetz wird geladen …'),
      h('p', { className: 'pt-small', role: 'status' }, pl.points.length === 0 ? 'Noch kein Punkt gesetzt.' : pl.points.length === 1 ? 'Start gesetzt – jetzt das Ziel antippen.' : pl.points.length + ' Punkte'),
      pl.points.length > 0 && h('div', { className: 'pt-actions' },
        h(G.Button, { variant: 'quiet', className: 'pt-btn-sm', onClick: p.onUndo }, 'Letzten Punkt entfernen'),
        pl.points.length > 1 && h(G.Button, { variant: 'quiet', className: 'pt-btn-sm', onClick: p.onReverse }, 'Umkehren'),
        h(G.Button, { variant: 'ghost', className: 'pt-btn-sm', onClick: p.onClear }, 'Neu')),
      r && r.error && h('p', { className: 'pt-error', role: 'alert' }, r.error),
      r && !r.error && h(Fragment, null,
        h('dl', { className: 'pt-route-stats' },
          h('div', null, h('dt', null, 'Distanz'), h('dd', null, fmtKm(r.km))),
          h('div', null, h('dt', null, 'Aufstieg'), h('dd', null, '↑ ' + fmtAlt(Math.round(r.up)) + ' m')),
          h('div', null, h('dt', null, 'Abstieg'), h('dd', null, '↓ ' + fmtAlt(Math.round(r.down)) + ' m')),
          h('div', null, h('dt', null, 'Gehzeit'), h('dd', null, fmtH(r.hours)))),
        h('p', { className: 'pt-small pt-muted' }, 'Höchster Punkt ' + fmtAlt(Math.round(r.maxEle)) + ' m ü. M. · Zeit nach DIN 33466 beim gewählten Tempo, ohne Pausen.'),
        h(Profile, { profile: r.profile, min: r.minEle, max: r.maxEle }),
        h('p', { className: 'pt-small' }, h('b', null, 'Wegarten: '), classes.slice(0, 4).map(function (c) { return window.GKGRoute.LABEL[c[0]] + ' ' + Math.round(c[1] / total * 100) + ' %'; }).join(' · ')),
        h('div', { className: 'pt-actions' },
          h(G.Button, { variant: 'quiet', className: 'pt-btn-sm', onClick: function () { setGpxOpen(true); } }, 'GPX'),
          h(G.Button, { variant: 'ghost', className: 'pt-btn-sm', onClick: p.onFit }, 'Ganze Route zeigen'))),
      h('p', { className: 'pt-small pt-muted' }, 'Wege aus OpenStreetMap (Overture), ohne Schwierigkeitsgrad. Vor Ort prüfen; Wildruhezonen und Alpbetrieb beachten. Planbar im Glarnerland und in der Linthebene.'),
      h(Dialog, { open: gpxOpen, id: 'gpx', title: 'Route als GPX', eyebrow: 'Für Uhr, Vario oder App', wide: true, onClose: function () { setGpxOpen(false); },
        footer: function (close) { return h('div', { className: 'pt-actions' }, h(G.Button, { variant: 'primary', onClick: download }, 'Herunterladen'), h(G.Button, { variant: 'ghost', onClick: close }, 'Schliessen')); } },
        h('p', { className: 'pt-small' }, 'Falls das Herunterladen nicht klappt: Text markieren und in eine Datei «route.gpx» kopieren.'),
        h('textarea', { className: 'pt-pre', readOnly: true, value: gpx, rows: 10, 'aria-label': 'GPX-Text' })));
  }

  function Legend(p) {
    return h('ul', { className: 'pt-legend', 'aria-label': 'Legende' },
      h('li', null, h('span', { className: 'pt-legend-start', 'aria-hidden': true }), 'Startplatz – Farbe zeigt den Flugstatus (Beispiel)'),
      h('li', null, h('span', { className: 'pt-legend-landing', 'aria-hidden': true }), 'Landeplatz'),
      p.wx && h('li', null, h('span', { className: 'pt-legend-wx', 'aria-hidden': true }), 'Windstation: Pfeil zeigt, wohin der Wind weht; Zahl in km/h' + (p.wx.live ? '' : ' (Beispielwerte)')),
      h('li', null, h('span', { className: 'pt-legend-ln pt-ln-pfad', 'aria-hidden': true }), 'Pfad'),
      h('li', null, h('span', { className: 'pt-legend-ln pt-ln-fahrweg', 'aria-hidden': true }), 'Fahrweg'),
      h('li', null, h('span', { className: 'pt-legend-ln pt-ln-hikefly', 'aria-hidden': true }), 'Hike & Fly (berechnet)'),
      h('li', null, h('span', { className: 'pt-legend-ln pt-ln-seilbahn', 'aria-hidden': true }), 'Seilbahn'),
      h('li', null, h('span', { className: 'pt-legend-ln pt-ln-material', 'aria-hidden': true }), 'Materialseilbahn – Kabel!'),
      h('li', null, h('span', { className: 'pt-legend-ln pt-ln-strom', 'aria-hidden': true }), 'Stromleitung'),
      h('li', null, 'Gelände 1,3-fach überhöht'));
  }

  // Route, die ein Pop-up auf einer Gebietsseite zeigen will – Fluggebiete übernimmt sie beim Öffnen
  var pendingRoute = null;

  function Areas(p) {
    var s = useState(null), sel = s[0], setSel = s[1];
    var d = useState(null), dlg = d[0], setDlg = d[1];
    var pl = useState({ on: false, points: [], rate: 300, result: null, loading: false }), plan = pl[0], setPlan = pl[1];
    var planRef = React.useRef(plan); planRef.current = plan;
    var netRef = React.useRef(null);
    var apiRef = React.useRef(null);

    // Route neu rechnen und auf die Karte bringen
    function compute(next) {
      var api = apiRef.current, net = netRef.current;
      var result = next.points.length > 1 && net ? window.GKGRoute.route(net, next.points, { rate: next.rate }) : null;
      var n = Object.assign({}, next, { result: result, loading: false });
      setPlan(n);
      if (api) {
        api.showRoute(result && !result.error ? result.coords : null);
        api.setWaypoints(n.on ? n.points : [], function (i, ll) { var c = planRef.current, pts = c.points.slice(); pts[i] = ll; compute(Object.assign({}, c, { points: pts })); });
      }
      return n;
    }
    function ensureNet(then) {
      if (netRef.current) return then();
      setPlan(Object.assign({}, planRef.current, { loading: true }));
      (apiRef.current ? apiRef.current.network() : window.GKGMap.loadNetwork()).then(function (net) {
        netRef.current = net; setPlan(Object.assign({}, planRef.current, { loading: false })); then();
      }, function () { setPlan(Object.assign({}, planRef.current, { loading: false, result: { error: 'Das Wegnetz konnte nicht geladen werden.' } })); });
    }
    function togglePlan() {
      if (planRef.current.on) { compute({ on: false, points: [], rate: planRef.current.rate, result: null, loading: false }); return; }
      setSel(null);
      var n = Object.assign({}, planRef.current, { on: true });
      setPlan(n);
      ensureNet(function () { compute(Object.assign({}, planRef.current, { on: true })); });
    }
    function addPoint(ll) {
      var c = planRef.current;
      if (!c.on) return;
      compute(Object.assign({}, c, { points: c.points.concat([ll]) }));
    }
    function startHikeFly(r) {
      setDlg(null); setSel(null);
      var pts = [r.fromC, [siteById(r.site).lon, siteById(r.site).lat]];
      setPlan(Object.assign({}, planRef.current, { on: true, points: pts }));
      ensureNet(function () {
        var n = compute(Object.assign({}, planRef.current, { on: true, points: pts }));
        if (n.result && !n.result.error && apiRef.current) apiRef.current.fitLine(n.result.coords);
      });
    }
    // Karte bereit: Klicks für den Planer abonnieren, eine vom Gebiet mitgebrachte Route zeigen
    function onReady(api) {
      api.onClick(function (ll) { addPoint([ll.lng, ll.lat]); });
      if (pendingRoute) { var r = pendingRoute; pendingRoute = null; startHikeFly(r); }
    }
    var wx = p.wx;
    var site = sel && sel.type === 'site' ? siteById(sel.id) : null;
    var area = sel && sel.type === 'area' ? areaById(sel.id) : null;
    var station = sel && sel.type === 'station' && wx ? wx.stations.filter(function (x) { return x.id === sel.id; })[0] : null;
    var starts = D.sites.filter(function (x) { return x.kind === 'start'; }).length;
    var landings = D.sites.length - starts;
    function pickArea(id) { setSel({ type: 'area', id: id }); if (apiRef.current) apiRef.current.focusArea(id); }
    function pickSite(id) {
      if (planRef.current.on) { var x = siteById(id); addPoint([x.lon, x.lat]); return; }
      setSel({ type: 'site', id: id }); setDlg(id);
    }
    function pickStation(id) {
      setSel({ type: 'station', id: id });
      var st = wx && wx.stations.filter(function (x) { return x.id === id; })[0];
      if (st && apiRef.current) apiRef.current.focusPoint(st.lat, st.lon);
    }
    return h(Fragment, null,
      h(PageHead, { title: 'Fluggebiete', lead: 'Acht Gebiete, ' + starts + ' Startplätze, ' + landings + ' Landeplätze – im Gelände. Vor jedem Flug gilt: Gebietsregeln und SHV-Infotafel beachten.' }),
      h(Wrap, null,
        h('div', { className: 'pt-chips', role: 'group', 'aria-label': 'Gebiet auf der Karte zeigen' },
          D.areas.map(function (a) {
            return h('button', { key: a.id, type: 'button', className: 'pt-tab', 'aria-pressed': !!(area && area.id === a.id), onClick: function () { pickArea(a.id); } }, a.name);
          })),
        h('div', { className: 'pt-map-layout' },
          h('div', null,
            h(Map3D, { apiRef: apiRef, wx: wx, selected: site && !plan.on ? site.id : null, onSelect: pickSite, onStation: pickStation, onOverview: function () { setSel(null); }, onPlan: togglePlan, planning: plan.on, onReady: onReady }),
            h(Legend, { wx: wx }),
            h(StationNote, { wx: wx })),
          h('div', { 'aria-live': 'polite' },
            plan.on ? h(RoutePlanner, {
              plan: plan, notify: p.notify,
              onRate: function (v) { compute(Object.assign({}, planRef.current, { rate: v })); },
              onUndo: function () { var c = planRef.current; compute(Object.assign({}, c, { points: c.points.slice(0, -1) })); },
              onReverse: function () { var c = planRef.current; compute(Object.assign({}, c, { points: c.points.slice().reverse() })); },
              onClear: function () { compute(Object.assign({}, planRef.current, { points: [] })); },
              onFit: function () { var r = planRef.current.result; if (r && r.coords && apiRef.current) apiRef.current.fitLine(r.coords); },
              onHikeFly: startHikeFly
            })
            : site ? h(SitePanel, { site: site, wx: wx, onInfo: function () { setDlg(site.id); } })
              : station ? h(StationPanel, { station: station, onSite: pickSite })
              : area ? h(Fragment, null,
                  h(G.SpotCard, Object.assign({ key: area.id }, spotProps(area))),
                  h('ul', { className: 'pt-sitelist' }, sitesOf(area.id).map(function (x) {
                    return h('li', { key: x.id }, h('button', { type: 'button', onClick: function () { pickSite(x.id); } },
                      h('span', null, x.name), h('span', { className: 'pt-muted' }, (x.kind === 'start' ? 'Start' : 'Landung') + ' · ' + fmtAlt(x.alt) + ' m')));
                  })))
              : h('div', { className: 'pt-panel' },
                  h('h2', null, 'Start- und Landeplätze'),
                  h('p', null, 'Tippe auf einen Tropfen (Startplatz) oder einen Kreis (Landeplatz) – dann erscheinen die Eckdaten und die SHV-Infotafel. Die runden Schilder mit Pfeil sind Windstationen.'),
                  h('p', { className: 'pt-small pt-muted' }, 'Verschieben mit einem Finger bzw. der Maus, drehen und neigen mit zwei Fingern oder mit rechter Maustaste.')))),
        h('p', { className: 'pt-source' }, 'Koordinaten aus den SHV-Infotafeln, der DHV-Geländedatenbank, Paragliding365 und braunwald.ch, jeweils gegen das Höhenmodell geprüft. Plätze mit Hinweis «Vom Ressort zu bestätigen» sind unsicher. Wind: flightbuddyki.ch (WindBuddy/FANET, Holfuy, MeteoSchweiz). Relief aus offenen Höhendaten (Terrain Tiles, u. a. EU-DEM © Copernicus); im Live-Betrieb ist das swisstopo-Luftbild vorgesehen.')),
      h(Section, { id: 'alle', title: 'Alle Gebiete' },
        h('div', { className: 'pt-grid' }, D.areas.map(function (x) { return h(G.SpotCard, Object.assign({ key: x.id }, spotProps(x))); }))),
      h(SiteDialog, { site: dlg ? siteById(dlg) : null, wx: wx, onClose: function () { setDlg(null); }, onPick: function (id) { setDlg(id); setSel({ type: 'site', id: id }); }, onShowRoute: startHikeFly }));
  }

  function SiteTable(p) {
    return h('div', { className: 'pt-table-wrap' }, h('table', { className: 'pt-table' },
      h('thead', null, h('tr', null,
        h('th', { scope: 'col' }, 'Platz'), h('th', { scope: 'col', className: 'num' }, 'Höhe'), h('th', { scope: 'col' }, 'Startrichtung'), h('th', { scope: 'col', className: 'num' }, 'LV95'))),
      h('tbody', null, p.sites.map(function (x) {
        return h('tr', { key: x.id },
          h('td', { className: 'pt-site-cell' },
            h('button', { type: 'button', className: 'pt-linkbtn pt-site-name', onClick: function () { p.onOpen(x.id); } }, x.name),
            h('span', { className: 'pt-small pt-muted' }, (x.kind === 'start' ? 'Startplatz' : 'Landeplatz') + ' · Quelle: ', x.srcUrl ? ext(x.srcUrl, x.src) : x.src),
            x.check && h('span', null, h(G.FlightStatus, { status: 'caution', label: 'Zu bestätigen' }))),
          h('td', { className: 'num' }, fmtAlt(x.alt) + ' m'),
          h('td', null, x.kind === 'start' ? (x.dirs.length ? x.dirs.join(', ') : 'folgt') : '–'),
          h('td', { className: 'num' }, lv95(x)));
      }))));
  }

  function AreaDetail(p) {
    var a = areaById(p.id);
    var d = useState(null), dlg = d[0], setDlg = d[1];
    if (!a) return h(NotFound);
    var notices = D.notices.filter(function (n) { return n.area === a.id; });
    var tafeln = Object.keys(D.shv).filter(function (k) { return sitesOf(a.id).some(function (x) { return D.shv[k].sites.indexOf(x.id) >= 0; }); }).map(function (k) { return D.shv[k]; });
    return h(Fragment, null,
      h(PageHead, { crumb: h(Fragment, null, h('a', { href: '#fluggebiete' }, 'Fluggebiete'), ' / ', a.name), title: a.name, lead: a.region },
        h('div', { className: 'pt-actions', style: { marginTop: 'var(--space-4)' } },
          h(G.FlightStatus, { status: a.status, label: a.statusLabel }),
          h('span', { className: 'pt-small pt-muted' }, 'Status: Beispiel'))),
      h(Wrap, null,
        h('div', { className: 'pt-detail-map' },
          h(Map3D, { compact: true, focusArea: a.id, wx: p.wx, label: '3D-Karte ' + a.name, onSelect: function (id) { setDlg(id); } })),
        h('div', { className: 'pt-detail' },
        h('div', null,
          h('div', { className: 'pt-block' },
            h('h2', null, 'Start- und Landeplätze'),
            h('p', { className: 'pt-small pt-muted', style: { margin: '0 0 var(--space-3)' } }, 'Tippe auf einen Namen für Details und die SHV-Infotafel.'),
            h(SiteTable, { sites: sitesOf(a.id), onOpen: setDlg })),
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
          tafeln.length > 0 && h('div', { className: 'pt-panel' },
            h('h2', null, tafeln.length > 1 ? 'SHV-Infotafeln' : 'SHV-Infotafel'),
            h('ul', { className: 'pt-links' }, tafeln.map(function (t) { return h('li', { key: t.url }, ext(t.url, t.title + ' (PDF)')); })),
            h('p', { className: 'pt-small pt-muted' }, 'Massgebend ist die aktuelle Tafel des SHV.')),
          h('div', { className: 'pt-panel' },
            h('h2', null, 'Vor dem Start'),
            h('p', null, 'Wind, Webcam und Gebietsmeldung prüfen. Die Entscheidung zu starten liegt immer bei dir als Pilot/in.'),
            h('p', null, h('a', { href: '#wetter' }, 'Windwerte ansehen'))),
          h(JahreskarteTeaser)))),
      h(SiteDialog, { site: dlg ? siteById(dlg) : null, wx: p.wx, onArea: true, onClose: function () { setDlg(null); }, onPick: setDlg, onShowRoute: function (r) { pendingRoute = r; go('fluggebiete'); } }));
  }

  /* ---------- Wetter, Sport, Verein ---------- */
  function Weather(p) {
    var wx = p.wx;
    var r = useState(false), busy = r[0], setBusy = r[1];
    function reload() { setBusy(true); WX.load(true).then(function () { setBusy(false); }); }
    var sources = wx ? wx.stations.reduce(function (acc, st) { if (acc.indexOf(st.source) < 0) acc.push(st.source); return acc; }, []) : [];
    return h(Fragment, null,
      h(PageHead, { title: 'Wetter', lead: 'Windwerte der Stationen in und um die Fluggebiete. Die Entscheidung zu starten liegt immer bei dir.' }),
      h(Wrap, null,
        h('div', { className: 'pt-actions', style: { marginBottom: 'var(--space-6)' } },
          h(G.Button, { variant: 'quiet', onClick: reload, disabled: busy }, busy ? 'Wird aktualisiert …' : 'Aktualisieren'),
          h(G.Button, { variant: 'ghost', href: '#fluggebiete' }, 'Auf der Karte zeigen'),
          wx && h('span', { className: 'pt-small pt-muted', role: 'status' }, wx.stations.length + ' Stationen' + (wx.live ? ' · live von flightbuddyki.ch' : ' · Beispielwerte'))),
        h(StationNote, { wx: wx }),
        wx ? h('div', { className: 'pt-grid' }, wx.stations.map(function (w) { return h(G.WeatherCard, Object.assign({ key: w.id }, w)); }))
          : h('p', { className: 'pt-muted', role: 'status' }, 'Stationen werden geladen …'),
        h('p', { className: 'pt-source' },
          'Daten: flightbuddyki.ch (Umkreis 35 km um Glarus) mit WindBuddy-Stationen über FANET, Holfuy und dem Messnetz von MeteoSchweiz. ',
          wx && wx.live && sources.indexOf('MeteoSchweiz') >= 0 ? 'Quelle: MeteoSchweiz. ' : '',
          'Ampel nur zur Orientierung: ab ' + WX.limits.gustCaution + ' km/h Böen oder ' + WX.limits.spreadCaution + ' km/h Böen über dem Mittelwind «Böig», ab ' + WX.limits.windStop + ' km/h Wind oder ' + WX.limits.gustStop + ' km/h Böen «Starker Wind», älter als ' + Math.round(WX.limits.staleS / 60) + ' Min. «Veraltet». Die Schwellen legt das Ressort Sicherheit fest.')),
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

  // Beitritt: landet als Antrag beim Aktuariat (Verwaltung → Mitglieder → Anträge)
  function JoinDialog(p) {
    var blank = { first: '', last: '', email: '', street: '', zip: '', city: '', category: 'Aktiv' };
    var f = useState(blank), form = f[0], setForm = f[1];
    var e = useState({}), errors = e[0], setErrors = e[1];
    function set(k) { return function (ev) { var o = Object.assign({}, form); o[k] = ev.target.value; setForm(o); }; }
    function submit(ev, close) {
      var err = {};
      if (!form.first.trim()) err.first = 'Bitte deinen Vornamen eingeben.';
      if (!form.last.trim()) err.last = 'Bitte deinen Nachnamen eingeben.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) err.email = 'Bitte eine gültige E-Mail-Adresse eingeben.';
      if (!/^\d{4}$/.test(form.zip.trim())) err.zip = 'Bitte eine vierstellige Postleitzahl eingeben.';
      if (!form.city.trim()) err.city = 'Bitte den Ort eingeben.';
      setErrors(err);
      if (Object.keys(err).length) return;
      var data = {}; Object.keys(form).forEach(function (k) { data[k] = form[k].trim(); });
      S.actions.addRequest(null, 'Eintritt', 'Neues Mitglied über das Anmeldeformular: ' + data.first + ' ' + data.last + ', ' + data.zip + ' ' + data.city + ', ' + data.category + '.', data, 'Anmeldeformular');
      setForm(blank);
      close();
      var fee = S.FEES[data.category];
      p.notify('Danke! Das Aktuariat meldet sich.' + (fee ? ' Die Rechnung über CHF ' + chf(fee) + ' folgt nach der Aufnahme.' : ''));
    }
    function field(k, label, type, auto) {
      return h(UI.Field, { id: 'j-' + k, label: label, error: errors[k], input: { type: type || 'text', value: form[k], autoComplete: auto, onChange: set(k) } });
    }
    return h(Dialog, { open: p.open, id: 'join', title: 'Mitglied werden', eyebrow: 'Gleitschirmklub Glarnerland', onClose: p.onClose },
      h(UI.DialogForm, { onSubmit: submit, submit: 'Anmeldung senden' },
        h('div', { className: 'pt-form-row' }, field('first', 'Vorname', 'text', 'given-name'), field('last', 'Nachname', 'text', 'family-name')),
        field('email', 'E-Mail', 'email', 'email'),
        field('street', 'Strasse und Nr.', 'text', 'street-address'),
        h('div', { className: 'pt-form-row' }, field('zip', 'PLZ', 'text', 'postal-code'), field('city', 'Ort', 'text', 'address-level2')),
        h(UI.Field, { id: 'j-cat', label: 'Mitgliedschaft' },
          h('select', { id: 'j-cat', value: form.category, onChange: set('category') },
            D.membership.map(function (m) { var k = m.kind.replace('mitglied', ''); return h('option', { key: m.kind, value: k }, m.kind + (m.fee ? ' – CHF ' + chf(m.fee) : '')); }))),
        h('p', { className: 'pt-hint' }, 'Im Prototyp wird nichts verschickt. Der Antrag erscheint in der Verwaltung beim Aktuariat.')));
  }

  function Verein(p) {
    var j = useState(false), join = j[0], setJoin = j[1];
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
          h(G.Button, { variant: 'primary', onClick: function () { setJoin(true); } }, 'Mitglied werden'),
          h('span', { className: 'pt-small pt-muted' }, 'Schon Mitglied? ', h('a', { href: '#mein-gkg' }, 'Zu «Mein GKG»')))),
      h(JoinDialog, { open: join, onClose: function () { setJoin(false); }, notify: p.notify }),
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
                h(G.Button, { variant: 'primary', href: '#mein-gkg' }, 'Inserat aufgeben'),
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
          var f = c.form, holder = (f.first + ' ' + f.last).trim();
          var saved = S.actions.buyCard({ holder: holder, email: f.email.trim(), photo: f.photo, kind: f.kind, method: c.method, memberId: f.memberId });
          p.setCard({ holder: holder, email: f.email.trim(), photo: f.photo, kind: f.kind, method: c.method, number: saved.id });
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
    var db = S.use();
    var valid = db.cards.filter(function (c) { return c.status === 'gültig'; });
    var mine = p.card && db.cards.filter(function (c) { return c.id === p.card.number; })[0];
    var pick = mine || valid[valid.length - 1];
    var blocked = db.cards.filter(function (c) { return c.status === 'gesperrt'; })[0];
    function show(c) { return c ? { holder: c.holder, number: c.id, kind: c.kind, photo: c.photo || (p.card && p.card.number === c.id ? p.card.photo : null), status: c.status, reason: c.reason } : null; }
    var card = show(result === 'stop' ? blocked : pick) || { holder: '–', number: '–', kind: '', photo: null };
    return h(Fragment, null,
      h(PageHead, { title: 'Kontrolle am Startplatz', lead: 'Kontrolleur/innen öffnen die Kontroll-Seite im Handy-Browser und scannen den QR-Code. Keine App, kein Aufwand für die Pilot/innen.' }),
      h(Wrap, null, h('div', { className: 'pt-split' },
        h('div', null,
          h('h2', { className: 'pt-h3' }, 'Was beim Scan geprüft wird'),
          h('ol', { className: 'pt-steps' },
            h('li', null, h('div', null, h('b', null, 'Echtheit'), 'Die Signatur im QR-Code verrät jede Fälschung.')),
            h('li', null, h('div', null, h('b', null, 'Gültigkeit'), 'Saison und Sperrstatus, online gegen die Klub-Datenbank.')),
            h('li', null, h('div', null, h('b', null, 'Person'), 'Name und Foto erscheinen gross – Weitergeben lohnt sich nicht.'))),
          h('p', { className: 'pt-source' }, (p.card ? 'Gezeigt wird deine eben gekaufte Karte. ' : 'Gezeigt wird eine Beispielkarte. Kauf zuerst eine Karte, dann erscheint hier deine. ') + 'Der Status kommt aus der Klub-Datenbank: Sperrt das Ressort Fluggebiete eine Karte in der Verwaltung, zeigt die Kontrolle sie sofort als gesperrt.'),
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
                  h('div', { className: 'pt-result pt-result-' + (card.status === 'gültig' ? 'go' : 'stop') },
                    h('span', { className: 'pt-result-big' }, card.status === 'gültig' ? 'Gültig' : 'Gesperrt'),
                    h(Avatar, { photo: card.photo, name: card.holder, large: true }),
                    h('p', { className: 'pt-h3' }, card.holder),
                    h('p', { className: 'gkg-data' }, 'Karte ' + card.number + ' · Saison ' + D.season),
                    h('p', null, card.kind),
                    card.status !== 'gültig' && h('p', { className: 'pt-small' }, (card.reason || 'Gesperrt') + '. Bitte Ersatzkarte zeigen lassen.')),
                  h(G.Button, { variant: 'primary', onClick: function () { setResult(null); } }, 'Nächste Karte scannen'))))))));
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
        h('li', null, h('a', { href: '#mein-gkg' }, 'Mein GKG')),
        h('li', null, h('a', { href: '#verwaltung' }, 'Verwaltung (Vorstand und Ressorts)')))),
      h('div', null, h('h2', null, 'Prototyp'),
        h('p', { className: 'pt-small' }, 'Stand 28.10.2026. Status, Gebietsmeldungen, Preise, Inserate, Personen und Buchungen sind Beispieldaten. Wind live von flightbuddyki.ch, sonst Beispielwerte. Gebietstexte stammen von gkg.ch.'),
        h('p', { className: 'pt-small pt-muted' }, 'Impressum und Datenschutz folgen.'))));
  }

  function App() {
    var r = useState(currentRoute()), route = r[0], setRoute = r[1];
    var tState = useState(null), toast = tState[0], setToast = tState[1];
    var cState = useState(null), card = cState[0], setCard = cState[1];
    var kState = useState(newCheckout()), checkout = kState[0], setCheckout = kState[1];
    var bState = useState([]), cart = bState[0], setCart = bState[1];
    var wx = useStations();

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

    var shared = { notify: notify, addToCart: addToCart, cart: cart, card: card, setCard: setCard, checkout: checkout, setCheckout: setCheckout, startCheckout: startCheckout, wx: wx };
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
    else if (route === 'login' || route.indexOf('mein-gkg') === 0) page = h(window.GKGMember.Page, Object.assign({ route: route }, shared));
    else if (route.indexOf('verwaltung') === 0) page = h(window.GKGAdmin.Page, Object.assign({ route: route }, shared));
    else page = h(NotFound);

    return h(Fragment, null,
      h('div', { className: 'pt-ribbon' }, h(Wrap, null, h('b', null, 'Prototyp'), ' · Klickbar, Zahlungen und E-Mails sind nicht verbunden. Personen, Beträge, Status und Inserate sind erfunden.')),
      h('div', { className: 'pt-header' }, h(G.SiteHeader, { logoSrc: 'ds/logos/gkg-signet.png', clubName: 'Gleitschirmklub Glarnerland', items: NAV, active: activeLabel(route), homeHref: '#start', loginHref: '#mein-gkg', ctaHref: '#jahreskarte', cta: 'Jahreskarte' })),
      h('main', { key: route }, page),
      h(Footer),
      toast && h('div', { className: 'pt-toast', role: 'status', key: toast.at }, toast.msg));
  }

  ReactDOM.createRoot(document.getElementById('app')).render(h(App));
})();
