// «Mein GKG»: Mitglieder verwalten sich selbst – Daten, Rechnungen, Jahreskarte, Mitgliedschaft, Einwilligungen.
// Änderungen landen in derselben Datenhaltung wie die Verwaltung (store.js): Das Aktuariat sieht sie im Protokoll,
// bezahlte Beiträge erscheinen bei der Kasse, die Jahreskarte bei der Kontrolle.
window.GKGMember = (function () {
  var React = window.React, G = window.GKG, UI = window.GKGUI, S = window.GKGStore, D = window.GKG_DATA;
  var h = React.createElement, Fragment = React.Fragment, useState = React.useState;
  var chf = UI.chf, date = UI.date, Field = UI.Field, Dialog = UI.Dialog;
  var SELF = 'Mitglied selbst';
  var TABS = [
    { id: '', label: 'Übersicht' }, { id: 'daten', label: 'Meine Daten' }, { id: 'rechnungen', label: 'Rechnungen' },
    { id: 'karte', label: 'Jahreskarte' }, { id: 'mitgliedschaft', label: 'Mitgliedschaft' }, { id: 'einstellungen', label: 'Einstellungen' }
  ];
  var DEMO = [['M-1001', 'Aktivmitglied, Beitrag noch offen'], ['M-1003', 'Aktivmitglied, alles bezahlt'], ['M-1002', 'Passivmitglied mit gekaufter Karte']];
  var ONLINE = ['TWINT', 'Kreditkarte', 'PostFinance', 'Apple Pay', 'Google Pay'];

  function tabOf(route) { return route === 'login' ? '' : route.replace(/^mein-gkg-?/, ''); }
  function href(id) { return '#mein-gkg' + (id ? '-' + id : ''); }
  function set(obj, k, v) { var o = Object.assign({}, obj); o[k] = v; return o; }
  function mine(list, id) { return list.filter(function (x) { return x.memberId === id; }); }
  function isOpen(inv) { return inv.status === 'offen' || inv.status === 'gemahnt'; }

  // Foto fürs Profil verkleinern (quadratisch, 240 px), damit es klein bleibt
  function shrink(file, done, fail) {
    var r = new FileReader();
    r.onerror = fail;
    r.onload = function () {
      var img = new Image();
      img.onerror = fail;
      img.onload = function () {
        var size = 240, c = document.createElement('canvas'), k = Math.min(img.width, img.height);
        c.width = size; c.height = size;
        c.getContext('2d').drawImage(img, (img.width - k) / 2, (img.height - k) / 2, k, k, 0, 0, size, size);
        try { done(c.toDataURL('image/jpeg', 0.82)); } catch (e) { fail(e); }
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  }

  // Abschnitt innerhalb der Seite (UI.Section bringt einen eigenen Rand mit und passt hier nicht)
  function Sub(p) {
    return h('section', { className: 'pt-subsection', 'aria-labelledby': p.id + '-t' },
      h('h2', { className: 'pt-h3', id: p.id + '-t' }, p.title), p.children);
  }

  /* ---------- Anmeldung ---------- */
  function Login(p) {
    var db = p.db;
    var s = useState(''), email = s[0], setEmail = s[1];
    var e = useState(null), err = e[0], setErr = e[1];
    var t = useState(null), sent = t[0], setSent = t[1];
    function submit(ev) {
      ev.preventDefault();
      var v = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setErr('Bitte eine gültige E-Mail-Adresse eingeben.'); return; }
      setErr(null);
      var m = db.members.filter(function (x) { return x.email.toLowerCase() === v && x.status === 'aktiv'; })[0];
      setSent({ email: v, member: m || null });
    }
    return h(Fragment, null,
      h(UI.PageHead, { title: 'Mein GKG', lead: 'Deine Mitgliedschaft selbst verwalten: Adresse, Rechnungen, Jahreskarte. Anmelden ohne Passwort – du bekommst einen Link per E-Mail.' }),
      h(UI.Wrap, null, h('div', { className: 'pt-split' },
        h('div', null,
          !sent && h('form', { className: 'pt-form', noValidate: true, onSubmit: submit },
            h(Field, { id: 'l-email', label: 'E-Mail', error: err, input: { type: 'email', autoComplete: 'email', value: email, onChange: function (ev) { setEmail(ev.target.value); } } }),
            h('div', { className: 'pt-actions' }, h(G.Button, { variant: 'primary', type: 'submit' }, 'Anmeldelink anfordern'))),
          sent && h('div', { className: 'pt-panel', role: 'status' },
            h('h2', null, 'Schau in dein Postfach'),
            h('p', null, 'Wenn ' + sent.email + ' zu einem Mitglied gehört, ist der Link unterwegs. Er gilt 15 Minuten.'),
            h('p', { className: 'pt-hint' }, 'Im Prototyp wird keine E-Mail verschickt.'),
            h('div', { className: 'pt-actions', style: { marginTop: 'var(--space-4)' } },
              sent.member && h(G.Button, { variant: 'primary', onClick: function () { S.actions.login(sent.member.id); } }, 'Link öffnen (Simulation)'),
              h(G.Button, { variant: 'ghost', onClick: function () { setSent(null); } }, 'Andere Adresse')),
            !sent.member && h('p', { className: 'pt-small', style: { marginTop: 'var(--space-3)' } }, 'Diese Adresse gehört zu keinem Beispielmitglied. Probiere eines der Beispiele rechts.'))),
        h('div', { className: 'pt-panel pt-panel-soft' },
          h('h2', null, 'Als Beispielmitglied ansehen'),
          h('p', null, 'Erfundene Personen – so sieht «Mein GKG» nach der Anmeldung aus.'),
          h('ul', { className: 'pt-sitelist' }, DEMO.map(function (d) {
            var m = S.member(d[0]);
            return m && h('li', { key: d[0] }, h('button', { type: 'button', onClick: function () { S.actions.login(d[0]); } }, h('span', null, S.fullName(m)), h('span', { className: 'pt-muted' }, d[1])));
          })),
          h('p', { className: 'pt-small pt-muted', style: { marginTop: 'var(--space-4)' } }, 'Gäste ohne Mitgliedschaft brauchen kein Konto: Sie kaufen die Jahreskarte direkt.')))));
  }

  /* ---------- Seiten ---------- */
  function Page(p) {
    var db = S.use();
    var id = db.session.memberId, m = id && S.member(id);
    if (!m) return h(Login, { db: db });
    var tab = tabOf(p.route);
    if (!TABS.some(function (t) { return t.id === tab; })) tab = '';
    var ctx = { db: db, m: m, notify: p.notify, startCheckout: p.startCheckout, setCheckout: p.setCheckout, cart: p.cart };
    var body = tab === 'daten' ? h(Data, Object.assign({ key: m.id }, ctx))
      : tab === 'rechnungen' ? h(Bills, ctx)
      : tab === 'karte' ? h(Card, ctx)
      : tab === 'mitgliedschaft' ? h(Membership, ctx)
      : tab === 'einstellungen' ? h(Settings, ctx)
      : h(Home, ctx);
    return h(Fragment, null,
      h(UI.PageHead, { eyebrow: 'Mein GKG', title: 'Hallo ' + m.first, lead: m.category + (m.category === 'Gönner/in' ? '' : 'mitglied') + ' seit ' + m.since + ' · Mitgliedernummer ' + m.id },
        h('div', { className: 'pt-actions', style: { marginTop: 'var(--space-4)' } },
          h(G.Button, { variant: 'ghost', onClick: function () { S.actions.logout(); UI.go('mein-gkg'); } }, 'Abmelden'))),
      h(UI.Wrap, null,
        h('nav', { className: 'pt-chips pt-admin-nav', 'aria-label': 'Bereiche von Mein GKG' },
          TABS.map(function (t) { return h('a', { key: t.id || 'home', className: 'pt-tab', href: href(t.id), 'aria-current': tab === t.id ? 'page' : undefined }, t.label); })),
        h('div', { className: 'pt-admin-body' }, body),
        h('p', { className: 'pt-source' }, 'Beispielmitglied mit erfundenen Daten. Änderungen bleiben in diesem Browser und erscheinen sofort in der Verwaltung.')));
  }

  function feeInvoice(db, m) { return mine(db.invoices, m.id).filter(function (i) { return /^Mitgliederbeitrag/.test(i.kind) && i.status !== 'storniert'; })[0]; }
  function validCard(db, m) { return mine(db.cards, m.id).filter(function (c) { return c.status === 'gültig'; })[0]; }

  function Home(c) {
    var db = c.db, m = c.m, inv = feeInvoice(db, m), card = validCard(db, m);
    var reqs = mine(db.requests, m.id).slice(0, 4);
    return h(Fragment, null,
      h('div', { className: 'pt-grid' },
        h('div', { className: 'pt-panel' },
          h('h2', null, 'Beitrag ' + db.season),
          inv ? h(Fragment, null,
              h('p', null, window.GKGAdmin.invStatus(inv)),
              h('p', null, 'CHF ' + chf(inv.amount) + (inv.status === 'bezahlt' ? ' · bezahlt am ' + date(inv.paidAt) : ' · fällig am ' + date(inv.due))),
              isOpen(inv) && h('p', null, h(G.Button, { variant: 'wing', href: href('rechnungen') }, 'Jetzt bezahlen')))
            : h('p', null, m.category === 'Gönner/in' ? 'Als Gönner/in bestimmst du deinen Beitrag selbst.' : 'Noch keine Rechnung für ' + db.season + '.')),
        h('div', { className: 'pt-panel' },
          h('h2', null, 'Jahreskarte ' + db.season),
          card ? h(Fragment, null, h('p', null, h(G.FlightStatus, { status: 'go', label: 'Gültig' })), h('p', null, 'Karte ' + card.id), h('p', null, h('a', { href: href('karte') }, 'Karte zeigen')))
            : m.category === 'Aktiv' ? h('p', null, 'Kommt automatisch, sobald dein Beitrag bezahlt ist.')
            : h(Fragment, null, h('p', null, 'Als ' + m.category + (m.category === 'Passiv' ? 'mitglied' : '') + ' kaufst du die Karte für CHF ' + chf(D.price) + '.'), h('p', null, h(G.Button, { variant: 'wing', onClick: function () { buy(c); } }, 'Jahreskarte kaufen')))),
        h('div', { className: 'pt-panel' },
          h('h2', null, 'Meine Adresse'),
          h('p', null, m.street || '–', h('br'), m.zip + ' ' + m.city),
          h('p', { className: 'pt-small pt-muted' }, m.email + (m.phone ? ' · ' + m.phone : '')),
          h('p', null, h('a', { href: href('daten') }, 'Daten ändern')))),
      reqs.length > 0 && h(Sub, { id: 'antraege', title: 'Meine Anträge' },
        h('ul', { className: 'pt-log pt-panel' }, reqs.map(function (r) {
          return h('li', { key: r.id }, h('span', null, r.type + ': ' + r.text), r.status === 'offen' ? h(G.FlightStatus, { status: 'caution', label: 'In Bearbeitung' }) : h(G.FlightStatus, { status: r.status === 'angenommen' ? 'go' : 'stop', label: r.status === 'angenommen' ? 'Angenommen' : 'Abgelehnt' }));
        }))),
      h(Sub, { id: 'mehr', title: 'Marktplatz und Bestellungen' },
        h('div', { className: 'pt-grid' },
          h('div', { className: 'pt-panel' }, h('h3', null, 'Meine Inserate'), h('p', null, 'Keine Inserate.'), h('p', null, h('a', { href: '#shop' }, 'Zum Gebrauchtmarkt'))),
          h('div', { className: 'pt-panel' }, h('h3', null, 'Meine Bestellungen'), h('p', null, c.cart && c.cart.length ? c.cart.length + ' Artikel im Warenkorb' : 'Keine Bestellungen.')))));
  }

  // Kauf der Jahreskarte mit vorausgefülltem Profil (Passivmitglieder, Gönner/innen)
  function buy(c) {
    var m = c.m;
    c.setCheckout({ step: 2, method: 'TWINT', form: { first: m.first, last: m.last, email: m.email, kind: m.category === 'Passiv' ? 'Passivmitglied' : 'Gönner/in', photo: m.photo, terms: false, memberId: m.id } });
    UI.go('jahreskarte');
  }

  function Data(c) {
    var m = c.m;
    var f = useState({ email: m.email, phone: m.phone || '', street: m.street || '', zip: m.zip, city: m.city }), form = f[0], setForm = f[1];
    var e = useState({}), errors = e[0], setErrors = e[1];
    var n = useState({ first: m.first, last: m.last }), name = n[0], setName = n[1];
    var pe = useState(null), photoErr = pe[0], setPhotoErr = pe[1];
    var open = mine(c.db.requests, m.id).filter(function (r) { return r.status === 'offen' && r.type === 'Name'; })[0];
    function inp(k, label, type, auto) {
      return h(Field, { id: 'd-' + k, label: label, error: errors[k], input: { type: type, value: form[k], autoComplete: auto, onChange: function (ev) { setForm(set(form, k, ev.target.value)); } } });
    }
    function save(ev) {
      ev.preventDefault();
      var err = {};
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) err.email = 'Bitte eine gültige E-Mail-Adresse eingeben.';
      if (!/^\d{4}$/.test(form.zip.trim())) err.zip = 'Bitte eine vierstellige Postleitzahl eingeben.';
      if (!form.city.trim()) err.city = 'Bitte den Ort eingeben.';
      if (form.phone.trim() && !/^[+\d][\d\s]{6,}$/.test(form.phone.trim())) err.phone = 'Bitte nur Ziffern und Leerzeichen, z. B. 079 123 45 67.';
      setErrors(err);
      if (Object.keys(err).length) return;
      var patch = {}; Object.keys(form).forEach(function (k) { patch[k] = form[k].trim(); });
      S.actions.updateMember(m.id, patch, SELF);
      c.notify('Gespeichert. Das Aktuariat sieht die Änderung im Protokoll.');
    }
    function askName(ev) {
      ev.preventDefault();
      if (!name.first.trim() || !name.last.trim() || (name.first.trim() === m.first && name.last.trim() === m.last)) return;
      S.actions.addRequest(m.id, 'Name', 'Neuer Name: ' + name.first.trim() + ' ' + name.last.trim() + '.', { first: name.first.trim(), last: name.last.trim() }, SELF);
      c.notify('Antrag gesendet. Das Aktuariat übernimmt den neuen Namen.');
    }
    function onPhoto(ev) {
      var file = ev.target.files && ev.target.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) { setPhotoErr('Bitte ein Bild wählen (JPG oder PNG).'); return; }
      shrink(file, function (url) { setPhotoErr(null); S.actions.updateMember(m.id, { photo: url }, SELF); c.notify('Foto gespeichert. Es erscheint auf deiner Jahreskarte.'); },
        function () { setPhotoErr('Das Bild liess sich nicht lesen. Bitte ein anderes wählen.'); });
    }
    return h('div', { className: 'pt-split' },
      h('form', { className: 'pt-form', noValidate: true, onSubmit: save, 'aria-labelledby': 'd-t' },
        h('h2', { id: 'd-t', className: 'pt-h3' }, 'Kontakt und Adresse'),
        h('div', { className: 'pt-form-row' }, inp('email', 'E-Mail', 'email', 'email'), inp('phone', 'Telefon', 'tel', 'tel')),
        inp('street', 'Strasse und Nr.', 'text', 'street-address'),
        h('div', { className: 'pt-form-row' }, inp('zip', 'PLZ', 'text', 'postal-code'), inp('city', 'Ort', 'text', 'address-level2')),
        h('p', { className: 'pt-hint' }, 'Gilt sofort. Rechnungen und Post gehen ab jetzt an diese Adresse.'),
        h('div', { className: 'pt-actions' }, h(G.Button, { variant: 'primary', type: 'submit' }, 'Speichern'))),
      h('div', { className: 'pt-aside' },
        h('div', { className: 'pt-panel' },
          h('h2', null, 'Foto für die Jahreskarte'),
          h('div', { className: 'pt-photo', style: { marginTop: 'var(--space-3)' } },
            h(UI.Avatar, { photo: m.photo, name: S.fullName(m) }),
            h('span', { className: 'pt-file' }, h(G.Button, { variant: 'quiet', tabIndex: -1, 'aria-hidden': true }, m.photo ? 'Foto ändern' : 'Foto hochladen'),
              h('input', { id: 'd-photo', type: 'file', accept: 'image/*', 'aria-label': 'Foto hochladen', onChange: onPhoto }))),
          photoErr && h('p', { className: 'pt-error' }, photoErr),
          h('p', { className: 'pt-small pt-muted' }, 'Kontrolleur/innen sehen es beim Scan.')),
        h('form', { className: 'pt-panel pt-form', noValidate: true, onSubmit: askName },
          h('h2', null, 'Name ändern'),
          open ? h('p', null, h(G.FlightStatus, { status: 'caution', label: 'In Bearbeitung' }), ' ' + open.text)
            : h(Fragment, null,
                h('p', { className: 'pt-small pt-muted' }, 'Zum Beispiel nach einer Heirat. Das Aktuariat prüft und übernimmt den Namen.'),
                h('div', { className: 'pt-form-row' },
                  h(Field, { id: 'n-first', label: 'Vorname', input: { type: 'text', value: name.first, onChange: function (ev) { setName(set(name, 'first', ev.target.value)); } } }),
                  h(Field, { id: 'n-last', label: 'Nachname', input: { type: 'text', value: name.last, onChange: function (ev) { setName(set(name, 'last', ev.target.value)); } } })),
                h('div', { className: 'pt-actions' }, h(G.Button, { variant: 'quiet', type: 'submit' }, 'Änderung beantragen'))))));
  }

  function Bills(c) {
    var db = c.db, m = c.m, list = mine(db.invoices, m.id).slice().sort(function (a, b) { return a.id < b.id ? 1 : -1; });
    var o = useState(null), payId = o[0], setPayId = o[1];
    var q = useState(null), qrId = q[0], setQrId = q[1];
    var inv = payId && list.filter(function (i) { return i.id === payId; })[0];
    var qr = qrId && list.filter(function (i) { return i.id === qrId; })[0];
    return h(Fragment, null,
      list.length ? h(G.DataTable, { stack: true, rows: list, columns: [
        { key: 'id', label: 'Nr.' },
        { key: 'kind', label: 'Art' },
        { key: 'amount', label: 'CHF', align: 'right', render: function (i) { return chf(i.amount); } },
        { key: 'due', label: 'Fällig', align: 'right', render: function (i) { return i.status === 'bezahlt' ? date(i.paidAt) : date(i.due); } },
        { key: 'status', label: 'Status', render: window.GKGAdmin.invStatus },
        { key: 'act', label: 'Aktion', render: function (i) {
          return isOpen(i) ? h('div', { className: 'pt-actions' },
            h(G.Button, { variant: 'wing', className: 'pt-btn-sm', onClick: function () { setPayId(i.id); } }, 'Bezahlen'),
            h(G.Button, { variant: 'quiet', className: 'pt-btn-sm', onClick: function () { setQrId(i.id); } }, 'QR-Rechnung'))
            : h('span', { className: 'pt-muted' }, i.method ? 'mit ' + i.method : '–');
        } }
      ] }) : h('p', { className: 'pt-muted' }, 'Keine Rechnungen.'),
      h('p', { className: 'pt-source' }, 'Online bezahlen geht mit TWINT, Karte oder Wallet; die QR-Rechnung kannst du im E-Banking scannen. Im Prototyp wird nichts belastet.'),
      h(PayDialog, { key: payId || 'zu', inv: inv, m: m, db: db, notify: c.notify, onClose: function () { setPayId(null); } }),
      h(Dialog, { open: !!qr, id: 'my-qr', title: 'QR-Rechnung', eyebrow: qr ? qr.id : '', wide: true, onClose: function () { setQrId(null); }, footer: function (close) { return h(G.Button, { variant: 'ghost', onClick: close }, 'Schliessen'); } },
        qr && h(window.GKGAdmin.QrBill, { inv: qr, member: m })));
  }

  function PayDialog(p) {
    var s = useState('TWINT'), method = s[0], setMethod = s[1];
    var b = useState(false), busy = b[0], setBusy = b[1];
    if (!p.inv) return h(Dialog, { open: false, id: 'pay', title: '', onClose: p.onClose });
    var inv = p.inv;
    function pay(close) {
      setBusy(true);
      setTimeout(function () {
        var res = S.actions.payInvoice(inv.id, method, null, SELF + ' (online)');
        close();
        p.notify('Danke! CHF ' + chf(inv.amount) + ' bezahlt.' + (res && res.card ? ' Deine Jahreskarte ' + res.card.id + ' ist bereit.' : ''));
        if (res && res.card) UI.go('mein-gkg-karte');
      }, 700);
    }
    return h(Dialog, {
      open: true, id: 'pay', title: 'CHF ' + chf(inv.amount) + ' bezahlen', eyebrow: inv.kind, onClose: p.onClose,
      footer: function (close) {
        return h('div', { className: 'pt-actions' },
          h(G.Button, { variant: 'wing', disabled: busy, onClick: function () { pay(close); } }, busy ? 'Zahlung läuft …' : 'Mit ' + method + ' bezahlen'),
          h(G.Button, { variant: 'ghost', disabled: busy, onClick: close }, 'Abbrechen'));
      }
    },
      h('fieldset', { className: 'pt-options' },
        h('legend', { className: 'pt-small', style: { fontWeight: 700, marginBottom: 'var(--space-2)' } }, 'Bezahlen mit'),
        ONLINE.map(function (x) {
          var id = 'pm-' + x.toLowerCase().replace(/\s+/g, '-');
          return h('label', { key: x, className: 'pt-option', htmlFor: id }, h('input', { id: id, type: 'radio', name: 'pm', checked: method === x, onChange: function () { setMethod(x); } }), x);
        })),
      p.m.category === 'Aktiv' && /^Mitgliederbeitrag/.test(inv.kind) && h('p', { className: 'pt-hint', style: { marginTop: 'var(--space-3)' } }, 'Mit dem Beitrag bekommst du gleich die Jahreskarte ' + p.db.season + '.'));
  }

  function Card(c) {
    var db = c.db, m = c.m, cards = mine(db.cards, m.id), card = validCard(db, m), inv = feeInvoice(db, m);
    return h(Fragment, null,
      card ? h('div', { className: 'pt-done' },
          h(G.PassCard, {
            logoSrc: 'ds/logos/gkg-signet.png', holder: card.holder, photo: m.photo || undefined, kind: 'Start- & Landeplatz', season: 'Jahreskarte ' + db.season, number: card.id,
            fields: [['Gültig', 'Saison ' + db.season], ['Kartennr.', card.id], ['Typ', card.kind], ['Ausgestellt', date(card.issued)]],
            onAppleWallet: function () { c.notify('Apple Wallet ist im Prototyp nicht verbunden.'); },
            onGoogleWallet: function () { c.notify('Google Wallet ist im Prototyp nicht verbunden.'); }
          }),
          h('div', null,
            h('h2', { className: 'pt-h2' }, 'Deine Jahreskarte ' + db.season),
            h('p', { className: 'pt-lead' }, 'Leg sie ins Wallet und zeig den QR-Code bei Kontrollen am Start- oder Landeplatz.'),
            !m.photo && h('p', null, 'Noch ohne Foto. ', h('a', { href: href('daten') }, 'Foto hochladen'), ' – das hilft bei der Kontrolle.'),
            h('p', { className: 'pt-hint' }, 'Der QR-Code ist ein Muster.')))
        : h('div', { className: 'pt-panel' },
            h('h2', null, 'Noch keine gültige Karte für ' + db.season),
            m.category === 'Aktiv'
              ? h(Fragment, null, h('p', null, 'Als Aktivmitglied bekommst du die Karte mit dem Mitgliederbeitrag.'), inv && isOpen(inv) && h('p', null, h(G.Button, { variant: 'wing', href: href('rechnungen') }, 'Beitrag CHF ' + chf(inv.amount) + ' bezahlen')))
              : h(Fragment, null, h('p', null, 'Die Jahreskarte kostet CHF ' + chf(D.price) + '. Dein Profil ist schon ausgefüllt.'), h('p', null, h(G.Button, { variant: 'wing', onClick: function () { buy(c); } }, 'Jahreskarte kaufen')))),
      cards.filter(function (x) { return x.status !== 'gültig'; }).length > 0 && h(Sub, { id: 'alte', title: 'Gesperrte Karten' },
        h('ul', { className: 'pt-log pt-panel' }, cards.filter(function (x) { return x.status !== 'gültig'; }).map(function (x) {
          return h('li', { key: x.id }, h('span', null, x.id + (x.reason ? ' · ' + x.reason : '')), h(G.FlightStatus, { status: 'stop', label: 'Gesperrt' }));
        }))));
  }

  function Membership(c) {
    var db = c.db, m = c.m, reqs = mine(db.requests, m.id).filter(function (r) { return r.status === 'offen'; });
    var pendingCat = reqs.filter(function (r) { return r.type === 'Kategorie'; })[0], pendingOut = reqs.filter(function (r) { return r.type === 'Austritt'; })[0];
    var others = ['Aktiv', 'Passiv', 'Gönner/in'].filter(function (x) { return x !== m.category; });
    var s = useState(others[0]), target = s[0], setTarget = s[1];
    var a = useState(false), ask = a[0], setAsk = a[1];
    var fee = S.FEES[m.category];
    function change(ev) {
      ev.preventDefault();
      S.actions.addRequest(m.id, 'Kategorie', 'Wechsel von ' + m.category + ' zu ' + target + ' ab Saison ' + (db.season + 1) + '.', { category: target }, SELF);
      c.notify('Antrag gesendet. Das Aktuariat bestätigt den Wechsel per E-Mail.');
    }
    return h('div', { className: 'pt-grid pt-grid-wide' },
      h('div', { className: 'pt-panel' },
        h('h2', null, 'Deine Mitgliedschaft'),
        h('dl', { className: 'pt-summary', style: { marginTop: 'var(--space-3)' } },
          h('dt', null, 'Kategorie'), h('dd', { style: { fontFamily: 'var(--font-body)' } }, m.category),
          h('dt', null, 'Mitglied seit'), h('dd', null, String(m.since)),
          h('dt', null, 'Beitrag pro Jahr'), h('dd', null, fee ? 'CHF ' + chf(fee) : 'freiwillig')),
        m.category === 'Aktiv' && h('p', { className: 'pt-small' }, 'Die Jahreskarte (Wert CHF ' + chf(D.price) + ') ist im Beitrag enthalten.')),
      h('form', { className: 'pt-panel pt-form', noValidate: true, onSubmit: change },
        h('h2', null, 'Kategorie wechseln'),
        pendingCat ? h('p', null, h(G.FlightStatus, { status: 'caution', label: 'In Bearbeitung' }), ' ' + pendingCat.text)
          : h(Fragment, null,
              h(Field, { id: 'ms-cat', label: 'Neue Kategorie' }, h('select', { id: 'ms-cat', value: target, onChange: function (ev) { setTarget(ev.target.value); } },
                others.map(function (x) { return h('option', { key: x, value: x }, x + (S.FEES[x] ? ' – CHF ' + chf(S.FEES[x]) : ' – freiwillig')); }))),
              h('p', { className: 'pt-hint' }, 'Gilt ab der nächsten Saison. Das Aktuariat bestätigt.'),
              h('div', { className: 'pt-actions' }, h(G.Button, { variant: 'quiet', type: 'submit' }, 'Wechsel beantragen')))),
      h('div', { className: 'pt-panel' },
        h('h2', null, 'Austritt'),
        pendingOut ? h('p', null, h(G.FlightStatus, { status: 'caution', label: 'In Bearbeitung' }), ' ' + pendingOut.text)
          : h(Fragment, null,
              h('p', null, 'Schade, wenn du gehst. Der Austritt gilt auf Ende der Saison ' + db.season + '.'),
              h('p', { className: 'pt-small pt-muted' }, 'Annahme: Frist und Form regeln die Statuten des GKG – vor dem Go-Live prüfen.'),
              h('p', null, h(G.Button, { variant: 'ghost', onClick: function () { setAsk(true); } }, 'Austritt erklären')))),
      h(UI.Confirm, {
        open: ask, id: 'leave', title: 'Austritt erklären?', confirm: 'Ja, austreten', onClose: function () { setAsk(false); },
        onConfirm: function () { S.actions.addRequest(m.id, 'Austritt', 'Austritt auf Ende der Saison ' + db.season + '.', {}, SELF); c.notify('Austritt erklärt. Das Aktuariat bestätigt per E-Mail.'); }
      }, h('p', null, 'Deine Jahreskarte bleibt bis Ende der Saison ' + db.season + ' gültig. Bereits bezahlte Beiträge werden nicht zurückerstattet (Annahme, Statuten prüfen).')));
  }

  function Settings(c) {
    var m = c.m, db = c.db;
    var x = useState(false), show = x[0], setShow = x[1];
    var items = [['newsletter', 'Newsletter per E-Mail', 'Klubabende, GV, GKG-Cup und Gebietsmeldungen.'], ['directory', 'Im Mitgliederverzeichnis sichtbar', 'Andere Mitglieder sehen Name und Ort, nicht aber Adresse oder Telefon.'], ['photos', 'Fotos von Anlässen auf der Website', 'Bilder, auf denen du gut erkennbar bist.']];
    function toggle(k, v) { S.actions.updateMember(m.id, { consents: set(m.consents, k, v) }, SELF); c.notify('Einstellung gespeichert.'); }
    var data = { mitglied: m, rechnungen: mine(db.invoices, m.id), jahreskarten: mine(db.cards, m.id), antraege: mine(db.requests, m.id) };
    return h('div', { className: 'pt-grid pt-grid-wide' },
      h('fieldset', { className: 'pt-panel pt-consents' },
        h('legend', { className: 'pt-h3' }, 'Einwilligungen'),
        items.map(function (it) {
          return h('div', { key: it[0], className: 'pt-check' },
            h('input', { id: 'cs-' + it[0], type: 'checkbox', checked: !!m.consents[it[0]], onChange: function (ev) { toggle(it[0], ev.target.checked); } }),
            h('label', { htmlFor: 'cs-' + it[0] }, h('b', null, it[1]), h('span', { className: 'pt-small pt-muted', style: { display: 'block', fontWeight: 400 } }, it[2])));
        }),
        h('p', { className: 'pt-small pt-muted' }, 'Jederzeit änderbar. Die Kasse und das Aktuariat brauchen deine Adresse trotzdem für Rechnungen.')),
      h('div', { className: 'pt-panel' },
        h('h2', null, 'Deine Daten'),
        h('p', null, 'Du kannst jederzeit sehen, was der Klub über dich gespeichert hat.'),
        h('div', { className: 'pt-actions', style: { marginTop: 'var(--space-4)' } },
          h(G.Button, { variant: 'quiet', onClick: function () { setShow(true); } }, 'Meine Daten anzeigen'),
          h(G.Button, { variant: 'ghost', onClick: function () { S.actions.logout(); UI.go('mein-gkg'); } }, 'Abmelden'))),
      h(Dialog, { open: show, id: 'mydata', title: 'Gespeicherte Daten', eyebrow: 'Mein GKG', wide: true, onClose: function () { setShow(false); }, footer: function (close) { return h(G.Button, { variant: 'ghost', onClick: close }, 'Schliessen'); } },
        h('p', { className: 'pt-small' }, 'Im Live-Betrieb als Datei zum Herunterladen (Auskunftsrecht nach Datenschutzgesetz).'),
        h('pre', { className: 'pt-pre', tabIndex: 0 }, JSON.stringify(data, function (k, v) { return k === 'photo' && v ? '(Bild)' : v; }, 2))));
  }

  return { Page: Page };
})();
