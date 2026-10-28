/* @ds-bundle: {"format":4,"namespace":"GKG","components":[{"name":"SiteHeader"},{"name":"Button"},{"name":"FlightStatus"},{"name":"WeatherCard"},{"name":"SpotCard"},{"name":"SpotMarker"},{"name":"BuyBox"},{"name":"PassCard"},{"name":"ListingCard"},{"name":"ProductCard"},{"name":"DataTable"},{"name":"StatTile"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;

  function cx() {
    return Array.prototype.slice.call(arguments).filter(Boolean).join(' ');
  }

  function svg(props, children) {
    return h('svg', Object.assign({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: 'false' }, props), children);
  }

  var Icon = {
    check: function () { return svg(null, h('path', { d: 'M5 12.5l4.5 4.5L19 7.5' })); },
    alert: function () { return svg(null, [h('path', { key: 'a', d: 'M12 6v8' }), h('path', { key: 'b', d: 'M12 18.5v.01' })]); },
    cross: function () { return svg(null, [h('path', { key: 'a', d: 'M6.5 6.5l11 11' }), h('path', { key: 'b', d: 'M17.5 6.5l-11 11' })]); },
    arrow: function () { return svg(null, [h('path', { key: 'a', d: 'M12 20V4' }), h('path', { key: 'b', d: 'M6 10l6-6 6 6' })]); },
    landing: function () { return svg({ strokeWidth: 3 }, h('path', { d: 'M9 5.5v13h7.5' })); },
    wing: function () { return svg({ strokeWidth: 2 }, [h('path', { key: 'a', d: 'M3 10c5-5 13-5 18 0' }), h('path', { key: 'b', d: 'M3 10l9 9 9-9' }), h('path', { key: 'c', d: 'M12 6v13' })]); }
  };

  var STATUS = {
    go: { label: 'Fliegbar', icon: Icon.check },
    caution: { label: 'Grenzwertig', icon: Icon.alert },
    stop: { label: 'Nicht fliegbar', icon: Icon.cross }
  };

  var COMPASS = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
  function compass(deg) { return COMPASS[Math.round(((deg % 360) + 360) % 360 / 45) % 8]; }

  function chf(n) {
    var s = Number(n).toFixed(2).split('.');
    return s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '’') + '.' + s[1];
  }

  /* ---------- Button ---------- */
  function Button(p) {
    var variant = p.variant || 'primary';
    var cls = cx('gkg-btn', 'gkg-btn-' + variant, p.size === 'lg' && 'gkg-btn-lg', p.className);
    var rest = Object.assign({}, p);
    ['variant', 'size', 'className', 'icon', 'children'].forEach(function (k) { delete rest[k]; });
    var kids = [p.icon && Icon[p.icon] ? h(React.Fragment, { key: 'i' }, Icon[p.icon]()) : null, h(React.Fragment, { key: 'c' }, p.children)];
    if (p.href) return h('a', Object.assign(rest, { className: cls }), kids);
    return h('button', Object.assign({ type: 'button' }, rest, { className: cls }), kids);
  }

  /* ---------- FlightStatus ---------- */
  function FlightStatus(p) {
    var s = STATUS[p.status] || STATUS.go;
    return h('span', { className: 'gkg-status gkg-status-' + (STATUS[p.status] ? p.status : 'go') }, s.icon(), p.label || s.label);
  }

  /* ---------- WeatherCard ---------- */
  function WeatherCard(p) {
    var to = ((p.direction || 0) + 180) % 360;
    return h('article', { className: 'gkg-card' },
      h('div', { className: 'gkg-card-body' },
        h('div', { className: 'gkg-card-head' },
          h('div', null,
            h('h3', { className: 'gkg-title' }, p.station),
            p.altitude != null && h('p', { className: 'gkg-meta gkg-data' }, p.altitude + ' m ü. M.')),
          h(FlightStatus, { status: p.status })),
        h('div', { className: 'gkg-wx-grid' },
          h('div', null,
            h('div', { className: 'gkg-wx-lbl' }, 'Wind'),
            h('div', { className: 'gkg-wx-wind' },
              h('span', { className: 'gkg-wx-arrow', title: 'Wind aus ' + compass(p.direction || 0) }, h('span', { style: { display: 'grid', transform: 'rotate(' + to + 'deg)' } }, Icon.arrow())),
              h('div', { className: 'gkg-wx-val' }, p.wind, h('small', null, 'km/h'))),
            h('div', { className: 'gkg-meta' }, 'aus ' + compass(p.direction || 0) + ' (' + p.direction + '°)')),
          h('div', null,
            h('div', { className: 'gkg-wx-lbl' }, 'Böen'),
            h('div', { className: 'gkg-wx-val' }, p.gust, h('small', null, 'km/h'))),
          h('div', null,
            h('div', { className: 'gkg-wx-lbl' }, 'Temperatur'),
            h('div', { className: 'gkg-wx-val' }, p.temperature, h('small', null, '°C'))),
          p.cloudBase != null && h('div', null,
            h('div', { className: 'gkg-wx-lbl' }, 'Basis'),
            h('div', { className: 'gkg-wx-val' }, p.cloudBase, h('small', null, 'm')))),
        h('div', { className: 'gkg-wx-foot' },
          h('span', { className: 'gkg-pulse', 'aria-hidden': true }),
          h('p', { className: 'gkg-meta' }, 'Live · ' + (p.updated || '') + (p.source ? ' · Quelle: ' + p.source : '')))));
  }

  /* ---------- SpotCard ---------- */
  function WindRose(p) {
    var on = (p.directions || []).map(function (d) { return d.toUpperCase(); });
    var c = 36, r1 = 13, r2 = 30, half = 19;
    function pt(r, a) { var t = (a - 90) * Math.PI / 180; return (c + r * Math.cos(t)).toFixed(2) + ' ' + (c + r * Math.sin(t)).toFixed(2); }
    var wedges = COMPASS.map(function (name, i) {
      var a = i * 45, a0 = a - half, a1 = a + half;
      var d = 'M' + pt(r1, a0) + ' L' + pt(r2, a0) + ' A' + r2 + ' ' + r2 + ' 0 0 1 ' + pt(r2, a1) + ' L' + pt(r1, a1) + ' A' + r1 + ' ' + r1 + ' 0 0 0 ' + pt(r1, a0) + 'Z';
      return h('path', { key: name, d: d, className: on.indexOf(name) >= 0 ? 'on' : 'off' });
    });
    return h('svg', { className: 'gkg-rose', viewBox: '0 0 72 72', role: 'img', 'aria-label': 'Geeignete Windrichtungen: ' + (on.join(', ') || 'keine') },
      wedges, h('text', { x: 36, y: 39.5, textAnchor: 'middle' }, 'N'));
  }

  function SpotCard(p) {
    var dirs = p.directions || [], facts = [];
    if (p.takeoff != null) facts.push(['Start', p.takeoff + ' m ü. M.']);
    if (p.landing != null) facts.push(['Landung', p.landing + ' m ü. M.']);
    if (dirs.length) facts.push(['Wind', dirs.join(' · ')]);
    if (p.level) facts.push(['Niveau', p.level, 'gkg-dd-text']);
    return h('article', { className: 'gkg-card' },
      h('div', { className: 'gkg-card-body' },
        h('div', { className: 'gkg-card-head' },
          h('div', null,
            h('h3', { className: 'gkg-title' }, p.name),
            p.region && h('p', { className: 'gkg-meta' }, p.region)),
          p.status && h(FlightStatus, { status: p.status, label: p.statusLabel })),
        (facts.length > 0 || dirs.length > 0) && h('div', { className: 'gkg-spot-top' },
          dirs.length > 0 && h(WindRose, { directions: dirs }),
          facts.length > 0 && h('dl', { className: 'gkg-facts' }, facts.map(function (f) {
            return h(React.Fragment, { key: f[0] }, h('dt', null, f[0]), h('dd', { className: f[2] }, f[1]));
          }))),
        p.note && h('p', { className: 'gkg-spot-note' }, p.note),
        h('div', { className: 'gkg-card-actions' },
          h(Button, { variant: 'primary', href: p.href || '#' }, p.cta || 'Details & Regeln'),
          p.routeHref && h(Button, { variant: 'quiet', href: p.routeHref }, 'Route'))));
  }

  /* ---------- SpotMarker ---------- */
  function SpotMarker(p) {
    var st = STATUS[p.status] ? p.status : 'go';
    var landing = p.kind === 'landing';
    var sr = landing ? 'Landeplatz' : (p.kind === 'start' ? 'Startplatz, ' : '') + STATUS[st].label;
    return h('button', { type: 'button', className: cx('gkg-marker', landing ? 'gkg-marker-landing' : 'gkg-marker-' + st, p.active && 'gkg-marker-active', p.className), onClick: p.onClick, onFocus: p.onFocus, 'aria-pressed': !!p.active },
      h('span', { className: 'gkg-marker-pin', 'aria-hidden': true }, landing ? Icon.landing() : STATUS[st].icon()),
      h('span', { className: 'gkg-marker-label' }, p.label, h('span', { className: 'gkg-vh' }, ' – ' + sr)));
  }

  /* ---------- BuyBox ---------- */
  function BuyBox(p) {
    return h('section', { className: 'gkg-card gkg-buy' },
      h('div', { className: 'gkg-card-body' },
        h('div', { className: 'gkg-card-head' },
          h('h3', { className: 'gkg-title' }, p.title || 'Jahreskarte'),
          p.badge && h('span', { className: 'gkg-badge-new' }, p.badge)),
        h('div', { className: 'gkg-price' },
          h('span', { className: 'gkg-price-cur' }, p.currency || 'CHF'),
          h('span', { className: 'gkg-price-val' }, chf(p.price)),
          p.per && h('span', { className: 'gkg-price-per' }, p.per)),
        p.perks && h('ul', { className: 'gkg-perks' }, p.perks.map(function (x, i) { return h('li', { key: i }, Icon.check(), x); })),
        h(Button, { variant: 'wing', size: 'lg', onClick: p.onBuy }, p.cta || 'Jahreskarte kaufen'),
        p.methods && h('div', { className: 'gkg-methods', 'aria-label': 'Zahlungsarten' }, p.methods.map(function (m) { return h('span', { key: m, className: 'gkg-chip' }, m); })),
        p.note && h('p', { className: 'gkg-meta gkg-buy-note' }, p.note)));
  }

  /* ---------- PassCard ---------- */
  function hash(s) { var x = 2166136261; for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
  function QRSample(p) {
    var n = 25, seed = hash(p.value || 'GKG'), cells = [];
    function rnd() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
    function finder(x, y) { return (x >= 0 && x < 7 && y >= 0 && y < 7) && (x === 0 || x === 6 || y === 0 || y === 6 || (x > 1 && x < 5 && y > 1 && y < 5)); }
    function inFinder(x, y) { return (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9); }
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      var on = inFinder(x, y) ? (finder(x, y) || finder(x - (n - 7), y) || finder(x, y - (n - 7))) : rnd() > 0.52;
      if (on) cells.push(h('rect', { key: x + '-' + y, x: x, y: y, width: 1.02, height: 1.02 }));
    }
    return h('svg', { viewBox: '0 0 ' + n + ' ' + n, role: 'img', 'aria-label': p.label || 'QR-Code' }, cells);
  }

  function initials(name) {
    return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join('');
  }

  function PassCard(p) {
    var fields = p.fields || [];
    return h('article', { className: 'gkg-pass' },
      h('div', { className: 'gkg-pass-band' },
        h('span', { className: 'gkg-pass-mark' }, p.logoSrc && h('img', { className: 'gkg-pass-logo', src: p.logoSrc, alt: '', width: 36, height: 36 }), 'GKG'),
        h('span', { className: 'gkg-pass-kind' }, p.kind || 'Jahreskarte', h('br'), p.season)),
      h('div', { className: 'gkg-pass-body' },
        h('div', { className: 'gkg-pass-person' },
          h('div', { className: 'gkg-pass-photo' }, p.photo ? h('img', { src: p.photo, alt: 'Foto ' + p.holder }) : h('span', { 'aria-hidden': true }, initials(p.holder))),
          h('div', null,
            h('div', { className: 'gkg-wx-lbl' }, 'Inhaber/in'),
            h('div', { className: 'gkg-pass-holder' }, p.holder))),
        h('div', { className: 'gkg-pass-fields' }, fields.map(function (f) {
          return h('div', { key: f[0] }, h('div', { className: 'gkg-wx-lbl' }, f[0]), h('div', { className: 'gkg-data' }, f[1]));
        })),
        h('div', { className: 'gkg-pass-qr' }, p.qr || h(QRSample, { value: p.number, label: 'Muster-QR für Karte ' + p.number })),
        h('p', { className: 'gkg-meta gkg-pass-hint' }, p.hint || ('Karte ' + p.number))),
      p.wallet !== false && h('div', { className: 'gkg-wallet' },
        h(Button, { variant: 'quiet', onClick: p.onAppleWallet }, 'Zu Apple Wallet hinzufügen'),
        h(Button, { variant: 'quiet', onClick: p.onGoogleWallet }, 'In Google Wallet speichern')));
  }

  /* ---------- ListingCard ---------- */
  function ListingCard(p) {
    return h('article', { className: 'gkg-card' },
      h('div', { className: 'gkg-listing-img' },
        p.image ? h('img', { src: p.image, alt: p.imageAlt || p.title }) : Icon.wing(),
        p.isNew && h('span', { className: 'gkg-badge-new' }, 'Neu')),
      h('div', { className: 'gkg-card-body' },
        h('p', { className: 'gkg-meta' }, p.category),
        h('h3', { className: 'gkg-title' }, p.title),
        h('p', { className: 'gkg-listing-price' }, h('span', null, 'CHF'), chf(p.price)),
        h('div', { className: 'gkg-tags' }, (p.tags || []).map(function (t) { return h('span', { key: t, className: 'gkg-chip' }, t); })),
        h('p', { className: 'gkg-meta', style: { marginTop: 'var(--space-4)' } }, [p.seller, p.posted].filter(Boolean).join(' · '))));
  }

  /* ---------- ProductCard ---------- */
  function ProductCard(p) {
    var colors = p.colors || [], sizes = p.sizes || [];
    var cs = React.useState(colors[0] ? colors[0].name : null), color = cs[0], setColor = cs[1];
    var ss = React.useState(null), size = ss[0], setSize = ss[1];
    var gid = React.useId ? React.useId() : String(Math.random());
    var tee = svg({ strokeWidth: 1.5 }, h('path', { d: 'M8.5 3.5L4 5.8 2.5 10l3 1.2V20.5h13V11.2l3-1.2L20 5.8l-4.5-2.3c-.5 1.6-1.9 2.5-3.5 2.5s-3-.9-3.5-2.5z' }));
    return h('article', { className: 'gkg-card' },
      h('div', { className: 'gkg-listing-img' },
        p.image ? h('img', { src: p.image, alt: p.imageAlt || p.name }) : tee,
        p.badge && h('span', { className: 'gkg-badge-new' }, p.badge)),
      h('div', { className: 'gkg-card-body' },
        p.line && h('p', { className: 'gkg-meta' }, p.line),
        h('h3', { className: 'gkg-title' }, p.name),
        h('p', { className: 'gkg-listing-price' }, h('span', null, 'CHF'), chf(p.price)),
        colors.length > 0 && h('fieldset', { className: 'gkg-opt' },
          h('legend', { className: 'gkg-wx-lbl' }, 'Farbe: ', h('span', { style: { color: 'var(--ink)' } }, color)),
          h('div', { className: 'gkg-swatches' }, colors.map(function (c) {
            return h('label', { key: c.name, className: 'gkg-swatch', title: c.name },
              h('input', { type: 'radio', name: gid + '-c', checked: color === c.name, onChange: function () { setColor(c.name); } }),
              h('span', { style: { background: c.value } }), h('span', { className: 'gkg-vh' }, c.name));
          }))),
        sizes.length > 0 && h('fieldset', { className: 'gkg-opt' },
          h('legend', { className: 'gkg-wx-lbl' }, 'Grösse'),
          h('div', { className: 'gkg-sizes' }, sizes.map(function (s) {
            var out = (p.soldOut || []).indexOf(s) >= 0;
            return h('label', { key: s, className: 'gkg-size' },
              h('input', { type: 'radio', name: gid + '-s', disabled: out, checked: size === s, onChange: function () { setSize(s); } }),
              h('span', null, s));
          }))),
        h(Button, { variant: 'primary', className: 'gkg-btn-block', disabled: sizes.length > 0 && !size, onClick: function () { p.onAdd && p.onAdd({ color: color, size: size }); } }, sizes.length > 0 && !size ? 'Grösse wählen' : 'In den Warenkorb'),
        p.hint && h('p', { className: 'gkg-meta', style: { marginTop: 'var(--space-3)' } }, p.hint)));
  }

  /* ---------- DataTable ---------- */
  function DataTable(p) {
    var cols = p.columns || [];
    return h('div', { className: 'gkg-table-wrap' },
      h('table', { className: 'gkg-table' },
        p.caption && h('caption', null, p.caption),
        h('thead', null, h('tr', null, cols.map(function (c) { return h('th', { key: c.key, scope: 'col', className: c.align === 'right' ? 'num' : undefined }, c.label); }))),
        h('tbody', null, (p.rows || []).map(function (r, i) {
          return h('tr', { key: r.id || i }, cols.map(function (c) {
            var v = c.render ? c.render(r) : r[c.key];
            return h('td', { key: c.key, className: c.align === 'right' ? 'num' : undefined }, v);
          }));
        }))));
  }
  DataTable.Role = function Role(p) { return h('span', { className: 'gkg-role' }, p.children); };

  /* ---------- StatTile ---------- */
  function StatTile(p) {
    return h('div', { className: 'gkg-stat' },
      h('div', { className: 'gkg-wx-lbl' }, p.label),
      h('div', { className: 'gkg-stat-val' }, p.value),
      p.delta && h('div', { className: cx('gkg-stat-delta', p.trend === 'down' ? 'down' : 'up') }, (p.trend === 'down' ? '▼ ' : '▲ ') + p.delta),
      p.hint && h('p', { className: 'gkg-meta' }, p.hint));
  }

  /* ---------- SiteHeader ---------- */
  function SiteHeader(p) {
    var items = p.items || [];
    var st = React.useState(false), open = st[0], setOpen = st[1];
    var navId = (React.useId ? React.useId() : 'gkg') + '-nav';
    function close() { setOpen(false); }
    return h('header', { className: cx('gkg-header', open && 'gkg-header-open') },
      h('a', { className: cx('gkg-logo', p.logoSrc && 'gkg-logo-has-mark'), href: p.homeHref || '#', onClick: close },
        p.logoSrc && h('img', { className: 'gkg-logo-mark', src: p.logoSrc, alt: '', width: 40, height: 40 }),
        h('b', null, 'GKG'), h('span', null, p.clubName)),
      h('nav', { id: navId, className: 'gkg-nav-wrap', 'aria-label': 'Hauptnavigation' },
        h('ul', { className: 'gkg-nav' },
          items.map(function (it) {
            return h('li', { key: it.label }, h('a', { href: it.href || '#', onClick: close, 'aria-current': it.label === p.active ? 'page' : undefined }, it.label));
          }),
          h('li', { className: 'gkg-nav-login' }, h('a', { href: p.loginHref || '#', onClick: close }, 'Login')))),
      h('div', { className: 'gkg-header-actions' },
        h(Button, { variant: 'ghost', className: 'gkg-header-login', href: p.loginHref || '#' }, 'Login'),
        h(Button, { variant: 'wing', href: p.ctaHref || '#', onClick: close }, p.cta || 'Jahreskarte'),
        h('button', { type: 'button', className: 'gkg-menu-btn', 'aria-expanded': open, 'aria-controls': navId, onClick: function () { setOpen(!open); } }, open ? 'Schliessen' : 'Menü')));
  }

  var api = { SiteHeader: SiteHeader, Button: Button, FlightStatus: FlightStatus, WeatherCard: WeatherCard, SpotCard: SpotCard, SpotMarker: SpotMarker, BuyBox: BuyBox, PassCard: PassCard, ListingCard: ListingCard, ProductCard: ProductCard, DataTable: DataTable, StatTile: StatTile };
  window.GKG = Object.assign(window.GKG || {}, api);
})();
