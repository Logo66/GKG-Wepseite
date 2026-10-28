// Verwaltung für Vorstand und Ressorts: Mitglieder, Beiträge & Rechnungen, Buchhaltung, Jahreskarten, Rollen.
// Jedes Ressort sieht nur seinen Bereich (Rechte in store.js). Im Prototyp lässt sich das Ressort oben umschalten;
// im Live-Betrieb meldet sich jede Person mit eigenem Zugang an und der Server prüft die Rechte.
window.GKGAdmin = (function () {
  var React = window.React, G = window.GKG, UI = window.GKGUI, S = window.GKGStore;
  var h = React.createElement, Fragment = React.Fragment, useState = React.useState;
  var chf = UI.chf, date = UI.date, Field = UI.Field, Dialog = UI.Dialog;

  function moduleOf(route) { return route.replace(/^verwaltung-?/, '') || 'uebersicht'; }
  function href(mod) { return '#verwaltung' + (mod === 'uebersicht' ? '' : '-' + mod); }
  function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }
  function sum(list) { return list.reduce(function (t, i) { return t + i.amount; }, 0); }
  function datetime(isoStr) {
    var d = new Date(isoStr);
    if (isNaN(d)) return '–';
    return date(isoStr) + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function set(obj, k, v) { var o = Object.assign({}, obj); o[k] = v; return o; }

  function invStatus(inv) {
    if (inv.status === 'bezahlt') return h(G.FlightStatus, { status: 'go', label: 'Bezahlt' });
    if (inv.status === 'storniert') return h(G.DataTable.Role, null, 'Storniert');
    if (inv.status === 'gemahnt') return h(G.FlightStatus, { status: 'stop', label: inv.reminders + '. Mahnung' });
    if (inv.due < S.today()) return h(G.FlightStatus, { status: 'stop', label: 'Überfällig' });
    return h(G.FlightStatus, { status: 'caution', label: 'Offen' });
  }
  function isOpen(inv) { return inv.status === 'offen' || inv.status === 'gemahnt'; }

  /* ---------- Rahmen ---------- */
  function RoleBar(p) {
    var r = useState(false), ask = r[0], setAsk = r[1];
    return h('div', { className: 'pt-admin-bar' },
      h('div', { className: 'pt-field pt-admin-role' },
        h('label', { htmlFor: 'adm-role' }, 'Angemeldet als'),
        h('select', { id: 'adm-role', value: p.role, onChange: function (e) { S.actions.setRole(e.target.value); } },
          Object.keys(S.ROLES).map(function (k) { return h('option', { key: k, value: k }, S.ROLES[k].label); }))),
      h('p', { className: 'pt-hint' }, 'Im Prototyp zum Ausprobieren umschaltbar. Live hat jedes Ressort einen eigenen Zugang, und der Server prüft die Rechte.'),
      h(G.Button, { variant: 'ghost', onClick: function () { setAsk(true); } }, 'Beispieldaten zurücksetzen'),
      h(UI.Confirm, { open: ask, id: 'adm-reset', title: 'Beispieldaten zurücksetzen?', confirm: 'Zurücksetzen', onClose: function () { setAsk(false); }, onConfirm: function () { S.actions.reset(); p.notify('Beispieldaten wiederhergestellt.'); } },
        h('p', null, 'Alle Änderungen in diesem Browser (Mitglieder, Zahlungen, Buchungen, Karten) gehen verloren.')));
  }

  function AdminNav(p) {
    return h('nav', { className: 'pt-chips pt-admin-nav', 'aria-label': 'Bereiche der Verwaltung' },
      S.MODULES.filter(function (m) { return S.canModule(p.role, m.id); }).map(function (m) {
        return h('a', { key: m.id, className: 'pt-tab', href: href(m.id), 'aria-current': p.mod === m.id ? 'page' : undefined }, m.label);
      }));
  }

  function NoAccess(p) {
    return h('div', { className: 'pt-panel' },
      h('h2', null, 'Kein Zugang'),
      h('p', null, S.ROLES[p.role].label + ' sieht diesen Bereich nicht. So bleiben Mitglieder- und Finanzdaten bei den Ressorts, die sie brauchen.'),
      h('p', null, h('a', { href: href('uebersicht') }, 'Zur Übersicht')));
  }

  function Page(p) {
    var db = S.use();
    var role = db.session.role, mod = moduleOf(p.route), who = S.ROLES[role].label;
    var known = S.MODULES.some(function (m) { return m.id === mod; });
    var ctx = { db: db, role: role, who: who, notify: p.notify };
    var body;
    if (!known) body = h(NoAccess, { role: role });
    else if (!S.canModule(role, mod)) body = h(NoAccess, { role: role });
    else if (mod === 'uebersicht') body = h(Overview, ctx);
    else if (mod === 'mitglieder') body = h(Members, ctx);
    else if (mod === 'rechnungen') body = h(Invoices, ctx);
    else if (mod === 'buchhaltung') body = h(Ledger, ctx);
    else if (mod === 'karten') body = h(Cards, ctx);
    else body = h(Roles, ctx);
    return h(Fragment, null,
      h(UI.PageHead, { title: 'Verwaltung', lead: 'Für Vorstand und Ressorts: Mitglieder, Beiträge, Buchhaltung und Jahreskarten an einem Ort.' }),
      h(UI.Wrap, null,
        h(RoleBar, { role: role, notify: p.notify }),
        h(AdminNav, { role: role, mod: mod }),
        h('div', { className: 'pt-admin-body' }, body),
        h('p', { className: 'pt-source' }, 'Alle Personen, Adressen, Beträge und Buchungen sind erfunden. Änderungen bleiben nur in diesem Browser.')));
  }

  /* ---------- Übersicht ---------- */
  function Overview(c) {
    var db = c.db, role = c.role;
    var tiles = [], todo = [];
    var active = db.members.filter(function (m) { return m.status === 'aktiv'; });
    if (S.can(role, 'members.read') || S.can(role, 'members.address')) {
      var n = function (cat) { return active.filter(function (m) { return m.category === cat; }).length; };
      tiles.push(h(G.StatTile, { key: 'm', label: 'Mitglieder', value: String(active.length), hint: n('Aktiv') + ' Aktiv · ' + n('Passiv') + ' Passiv · ' + n('Gönner/in') + ' Gönner/innen' }));
    }
    if (S.can(role, 'members.read')) {
      var req = db.requests.filter(function (r) { return r.status === 'offen'; });
      tiles.push(h(G.StatTile, { key: 'r', label: 'Offene Anträge', value: String(req.length), hint: 'Eintritte, Wechsel, Austritte' }));
      if (req.length && S.can(role, 'requests.write')) todo.push({ text: req.length + (req.length === 1 ? ' Antrag prüfen' : ' Anträge prüfen'), href: href('mitglieder') + '' });
    }
    if (S.can(role, 'finance.read')) {
      var open = db.invoices.filter(isOpen), late = open.filter(function (i) { return i.status === 'gemahnt' || i.due < S.today(); });
      var rep = S.report(db);
      tiles.push(h(G.StatTile, { key: 'o', label: 'Offene Beiträge', value: 'CHF ' + chf(sum(open)), hint: open.length + ' Rechnungen, davon ' + late.length + ' überfällig oder gemahnt' }));
      tiles.push(h(G.StatTile, { key: 'e', label: 'Ergebnis laufendes Jahr', value: 'CHF ' + chf(rep.result), hint: 'Ertrag ' + chf(rep.income) + ' · Aufwand ' + chf(rep.expense) }));
      if (late.length && S.can(role, 'finance.write')) todo.push({ text: late.length + ' überfällige Beiträge mahnen oder klären', href: href('rechnungen') });
    }
    if (S.can(role, 'cards.read')) {
      var valid = db.cards.filter(function (x) { return x.status === 'gültig'; }).length, blocked = db.cards.length - valid;
      tiles.push(h(G.StatTile, { key: 'k', label: 'Jahreskarten ' + db.season, value: String(valid), hint: blocked + ' gesperrt' }));
    }
    var areas = { members: S.can(role, 'members.read') || S.can(role, 'members.address'), finance: S.can(role, 'finance.read'), cards: S.can(role, 'cards.read') };
    var log = db.log.filter(function (l) { return S.can(role, 'log.read') || areas[l.area]; }).slice(0, 12);
    return h(Fragment, null,
      h('div', { className: 'pt-stats' }, tiles),
      h('div', { className: 'pt-detail', style: { marginTop: 'var(--space-8)' } },
        h('div', { className: 'pt-panel' },
          h('h2', null, 'Zuletzt geändert'),
          log.length ? h('ul', { className: 'pt-log' }, log.map(function (l, i) {
            return h('li', { key: i }, h('span', { className: 'pt-small pt-muted' }, datetime(l.at) + ' · ' + l.who), h('span', null, l.what));
          })) : h('p', { className: 'pt-muted' }, 'Noch keine Einträge in deinem Bereich.')),
        h('div', { className: 'pt-panel' },
          h('h2', null, 'Zu erledigen'),
          todo.length ? h('ul', { className: 'pt-links' }, todo.map(function (t, i) { return h('li', { key: i }, h('a', { href: t.href }, t.text)); }))
            : h('p', { className: 'pt-muted' }, 'Nichts offen für ' + c.who + '.'))));
  }

  /* ---------- Mitglieder ---------- */
  var CATS = ['Aktiv', 'Passiv', 'Gönner/in'];

  function Members(c) {
    var db = c.db, role = c.role, full = S.can(role, 'members.read'), write = S.can(role, 'members.write'), fin = S.can(role, 'finance.read');
    var q = useState(''), query = q[0], setQuery = q[1];
    var f = useState('alle'), cat = f[0], setCat = f[1];
    var st = useState('aktiv'), status = st[0], setStatus = st[1];
    var o = useState(null), open = o[0], setOpen = o[1];
    var needle = query.trim().toLowerCase();
    var rows = db.members.filter(function (m) {
      if (status !== 'alle' && m.status !== status) return false;
      if (cat !== 'alle' && m.category !== cat) return false;
      if (!needle) return true;
      return [m.first + ' ' + m.last, m.city, full ? m.email : ''].join(' ').toLowerCase().indexOf(needle) >= 0;
    }).sort(function (a, b) { return a.last.localeCompare(b.last, 'de') || a.first.localeCompare(b.first, 'de'); });
    function fee(m) {
      var inv = db.invoices.filter(function (i) { return i.memberId === m.id && /^Mitgliederbeitrag/.test(i.kind) && i.status !== 'storniert'; })[0];
      return inv ? invStatus(inv) : h('span', { className: 'pt-muted' }, m.category === 'Gönner/in' ? 'freiwillig' : 'keine Rechnung');
    }
    var cols = [{ key: 'name', label: 'Name', render: function (m) { return h('button', { type: 'button', className: 'pt-linkbtn', onClick: function () { setOpen(m.id); } }, m.last + ' ' + m.first); } }];
    if (full) {
      cols.push({ key: 'category', label: 'Kategorie' });
      cols.push({ key: 'city', label: 'Ort', render: function (m) { return m.zip + ' ' + m.city; } });
      cols.push({ key: 'since', label: 'Seit', align: 'right' });
      if (fin) cols.push({ key: 'fee', label: 'Beitrag ' + db.season, render: fee });
      cols.push({ key: 'status', label: 'Status', render: function (m) { return m.status === 'aktiv' ? 'aktiv' : h(G.DataTable.Role, null, 'Ausgetreten'); } });
    } else {
      cols.push({ key: 'addr', label: 'Adresse', render: function (m) { return m.street + ', ' + m.zip + ' ' + m.city; } });
    }
    return h(Fragment, null,
      !full && h('p', { className: 'pt-wx-note', role: 'note' }, h('b', null, c.who + ': '), 'Du siehst von den Mitgliedern nur Name und Adresse – genug für Rechnungen und Mahnungen.'),
      h('div', { className: 'pt-filter' },
        h(Field, { id: 'm-q', label: 'Suchen', input: { type: 'search', value: query, placeholder: full ? 'Name, Ort oder E-Mail' : 'Name oder Ort', onChange: function (e) { setQuery(e.target.value); } } }),
        full && h(Field, { id: 'm-cat', label: 'Kategorie' },
          h('select', { id: 'm-cat', value: cat, onChange: function (e) { setCat(e.target.value); } },
            h('option', { value: 'alle' }, 'Alle'), CATS.map(function (k) { return h('option', { key: k, value: k }, k); }))),
        full && h(Field, { id: 'm-st', label: 'Status' },
          h('select', { id: 'm-st', value: status, onChange: function (e) { setStatus(e.target.value); } },
            h('option', { value: 'aktiv' }, 'Aktiv'), h('option', { value: 'ausgetreten' }, 'Ausgetreten'), h('option', { value: 'alle' }, 'Alle'))),
        write && h(G.Button, { variant: 'primary', onClick: function () { setOpen('neu'); } }, 'Neues Mitglied')),
      h('p', { className: 'pt-small pt-muted', role: 'status' }, rows.length + (rows.length === 1 ? ' Mitglied' : ' Mitglieder')),
      h(G.DataTable, { stack: true, columns: cols, rows: rows }),
      full && h(Requests, c),
      h(MemberDialog, { key: open || 'zu', id: open, db: db, role: role, who: c.who, notify: c.notify, onClose: function () { setOpen(null); } }));
  }

  function MemberDialog(p) {
    var db = p.db, m = p.id && p.id !== 'neu' ? S.member(p.id) : null, isNew = p.id === 'neu';
    var write = S.can(p.role, 'members.write'), full = S.can(p.role, 'members.read');
    var blank = { first: '', last: '', email: '', phone: '', street: '', zip: '', city: '', born: '', category: 'Aktiv', status: 'aktiv' };
    var f = useState(m ? Object.assign({}, blank, m, { born: m.born || '' }) : blank), form = f[0], setForm = f[1];
    var e = useState({}), errors = e[0], setErrors = e[1];
    if (!p.id) return h(Dialog, { open: false, id: 'mem', title: '', onClose: p.onClose });
    function inp(k, label, type, auto) {
      return h(Field, { id: 'mem-' + k, label: label, error: errors[k], input: { type: type || 'text', value: form[k] == null ? '' : form[k], autoComplete: auto, readOnly: !write, onChange: function (ev) { setForm(set(form, k, ev.target.value)); } } });
    }
    function submit(ev, close) {
      var err = {};
      if (!String(form.first).trim()) err.first = 'Vorname fehlt.';
      if (!String(form.last).trim()) err.last = 'Nachname fehlt.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(form.email).trim())) err.email = 'Bitte eine gültige E-Mail-Adresse eingeben.';
      if (!/^\d{4}$/.test(String(form.zip).trim())) err.zip = 'Vierstellige PLZ.';
      if (form.born && !/^(19|20)\d{2}$/.test(String(form.born))) err.born = 'Jahrgang vierstellig, z. B. 1985.';
      setErrors(err);
      if (Object.keys(err).length) return;
      var data = { first: form.first.trim(), last: form.last.trim(), email: form.email.trim(), phone: String(form.phone || '').trim(), street: String(form.street || '').trim(), zip: String(form.zip).trim(), city: String(form.city || '').trim(), born: form.born ? Number(form.born) : null, category: form.category, status: form.status };
      if (isNew) { var nm = S.actions.addMember(data, p.who); p.notify(S.fullName(nm) + ' ist erfasst (' + nm.id + ').'); }
      else { S.actions.updateMember(m.id, data, p.who); p.notify('Änderungen an ' + data.first + ' ' + data.last + ' gespeichert.'); }
      close();
    }
    var invoices = m && S.can(p.role, 'finance.read') ? db.invoices.filter(function (i) { return i.memberId === m.id; }) : [];
    var cards = m && S.can(p.role, 'cards.read') ? db.cards.filter(function (x) { return x.memberId === m.id; }) : [];
    var history = m && full ? db.log.filter(function (l) { return l.area === 'members' && l.what.indexOf(m.first + ' ' + m.last) >= 0; }).slice(0, 6) : [];
    var fields = full
      ? h(Fragment, null,
          h('div', { className: 'pt-form-row' }, inp('first', 'Vorname', 'text', 'off'), inp('last', 'Nachname', 'text', 'off')),
          h('div', { className: 'pt-form-row' }, inp('email', 'E-Mail', 'email', 'off'), inp('phone', 'Telefon', 'tel', 'off')),
          inp('street', 'Strasse und Nr.', 'text', 'off'),
          h('div', { className: 'pt-form-row' }, inp('zip', 'PLZ', 'text', 'off'), inp('city', 'Ort', 'text', 'off')),
          h('div', { className: 'pt-form-row' },
            inp('born', 'Jahrgang', 'text', 'off'),
            h(Field, { id: 'mem-cat', label: 'Kategorie' }, h('select', { id: 'mem-cat', value: form.category, disabled: !write, onChange: function (ev) { setForm(set(form, 'category', ev.target.value)); } }, CATS.map(function (k) { return h('option', { key: k, value: k }, k); }))),
            !isNew && h(Field, { id: 'mem-st', label: 'Status' }, h('select', { id: 'mem-st', value: form.status, disabled: !write, onChange: function (ev) { setForm(set(form, 'status', ev.target.value)); } }, h('option', { value: 'aktiv' }, 'aktiv'), h('option', { value: 'ausgetreten' }, 'ausgetreten')))))
      : h('dl', { className: 'pt-sitefacts' }, h('dt', null, 'Name'), h('dd', { className: 'pt-dd-text' }, S.fullName(m)), h('dt', null, 'Adresse'), h('dd', { className: 'pt-dd-text' }, m.street + ', ' + m.zip + ' ' + m.city));
    var extra = h(Fragment, null,
      m && full && h('div', { className: 'pt-dlg-part' },
        h('h3', { className: 'pt-h4' }, 'Einwilligungen'),
        h('p', { className: 'pt-small' }, ['Newsletter: ' + (m.consents.newsletter ? 'ja' : 'nein'), 'Im Mitgliederverzeichnis: ' + (m.consents.directory ? 'ja' : 'nein'), 'Fotos auf der Website: ' + (m.consents.photos ? 'ja' : 'nein')].join(' · ')),
        h('p', { className: 'pt-small pt-muted' }, 'Ändert das Mitglied selbst in «Mein GKG».')),
      invoices.length > 0 && h('div', { className: 'pt-dlg-part' },
        h('h3', { className: 'pt-h4' }, 'Rechnungen'),
        h('ul', { className: 'pt-log' }, invoices.map(function (i) { return h('li', { key: i.id }, h('span', null, i.id + ' · ' + i.kind + ' · CHF ' + chf(i.amount)), invStatus(i)); }))),
      cards.length > 0 && h('div', { className: 'pt-dlg-part' },
        h('h3', { className: 'pt-h4' }, 'Jahreskarten'),
        h('ul', { className: 'pt-log' }, cards.map(function (x) { return h('li', { key: x.id }, h('span', null, x.id + ' · ' + x.kind), h(G.FlightStatus, { status: x.status === 'gültig' ? 'go' : 'stop', label: x.status === 'gültig' ? 'Gültig' : 'Gesperrt' })); }))),
      history.length > 0 && h('div', { className: 'pt-dlg-part' },
        h('h3', { className: 'pt-h4' }, 'Änderungen'),
        h('ul', { className: 'pt-log' }, history.map(function (l, i) { return h('li', { key: i }, h('span', { className: 'pt-small pt-muted' }, datetime(l.at) + ' · ' + l.who), h('span', null, l.what)); }))));
    return h(Dialog, {
      open: true, id: 'mem', wide: true, onClose: p.onClose,
      eyebrow: isNew ? 'Aktuariat' : m.id + ' · Mitglied seit ' + m.since, title: isNew ? 'Neues Mitglied' : S.fullName(m),
      footer: write ? null : function (close) { return h(G.Button, { variant: 'ghost', onClick: close }, 'Schliessen'); }
    },
      write ? h(UI.DialogForm, { onSubmit: submit, submit: isNew ? 'Mitglied erfassen' : 'Änderungen speichern' }, fields) : fields,
      extra);
  }

  function Requests(c) {
    var db = c.db, write = S.can(c.role, 'requests.write');
    var open = db.requests.filter(function (r) { return r.status === 'offen'; });
    var done = db.requests.filter(function (r) { return r.status !== 'offen'; }).slice(0, 5);
    function name(r) { var m = r.memberId && S.member(r.memberId); return m ? S.fullName(m) : (r.change ? r.change.first + ' ' + r.change.last : '–'); }
    function act(r, accept) {
      S.actions.resolveRequest(r.id, accept, c.who);
      c.notify('Antrag ' + r.id + (accept ? ' angenommen' : ' abgelehnt') + '.' + (accept && r.type === 'Eintritt' ? ' Die Beitragsrechnung erstellt die Kasse mit dem nächsten Beitragslauf.' : ''));
    }
    return h('section', { className: 'pt-block', 'aria-labelledby': 'req-t', style: { marginTop: 'var(--space-12)' } },
      h('h2', { id: 'req-t' }, 'Anträge'),
      h('p', { className: 'pt-small pt-muted', style: { margin: '0 0 var(--space-3)' } }, 'Aus dem Anmeldeformular und aus «Mein GKG». Adressänderungen übernehmen die Mitglieder selbst – sie erscheinen im Protokoll.'),
      open.length ? h('ul', { className: 'pt-requests' }, open.map(function (r) {
        return h('li', { key: r.id, className: 'pt-panel' },
          h('p', { className: 'pt-small pt-muted' }, r.id + ' · ' + r.type + ' · ' + datetime(r.at)),
          h('p', null, r.type === 'Eintritt' ? r.text : h(Fragment, null, h('b', null, name(r)), ' – ' + r.text)),
          write && h('div', { className: 'pt-actions' },
            h(G.Button, { variant: 'primary', onClick: function () { act(r, true); } }, 'Annehmen'),
            h(G.Button, { variant: 'quiet', onClick: function () { act(r, false); } }, 'Ablehnen')));
      })) : h('p', { className: 'pt-muted' }, 'Keine offenen Anträge.'),
      done.length > 0 && h('details', { className: 'pt-details' },
        h('summary', null, 'Erledigte Anträge (' + done.length + ')'),
        h('ul', { className: 'pt-log' }, done.map(function (r) { return h('li', { key: r.id }, h('span', { className: 'pt-small pt-muted' }, r.id + ' · ' + r.type + ' · ' + r.status), h('span', null, name(r))); }))));
  }

  /* ---------- Beiträge & Rechnungen ---------- */
  function Invoices(c) {
    var db = c.db, write = S.can(c.role, 'finance.write');
    var t = useState('offen'), tab = t[0], setTab = t[1];
    var o = useState(null), open = o[0], setOpen = o[1];
    var b = useState(false), billing = b[0], setBilling = b[1];
    var all = db.invoices;
    var groups = {
      offen: all.filter(isOpen), bezahlt: all.filter(function (i) { return i.status === 'bezahlt'; }),
      storniert: all.filter(function (i) { return i.status === 'storniert'; }), alle: all
    };
    var due = db.members.filter(function (m) {
      return m.status === 'aktiv' && S.FEES[m.category] && !all.some(function (i) { return i.memberId === m.id && i.status !== 'storniert' && /^Mitgliederbeitrag/.test(i.kind); });
    });
    var cols = [
      { key: 'id', label: 'Nr.', render: function (i) { return h('button', { type: 'button', className: 'pt-linkbtn', onClick: function () { setOpen(i.id); } }, i.id); } },
      { key: 'member', label: 'Mitglied', render: function (i) { return S.fullName(S.member(i.memberId)); } },
      { key: 'kind', label: 'Art', render: function (i) { return i.kind.replace('Mitgliederbeitrag', 'Beitrag'); } },
      { key: 'amount', label: 'CHF', align: 'right', render: function (i) { return chf(i.amount); } },
      { key: 'due', label: 'Fällig', align: 'right', render: function (i) { return i.status === 'bezahlt' ? date(i.paidAt) : date(i.due); } },
      { key: 'status', label: 'Status', render: invStatus }
    ];
    return h(Fragment, null,
      h('div', { className: 'pt-stats' },
        h(G.StatTile, { label: 'Fakturiert ' + db.season, value: 'CHF ' + chf(sum(all.filter(function (i) { return i.status !== 'storniert'; }))), hint: all.length + ' Rechnungen' }),
        h(G.StatTile, { label: 'Bezahlt', value: 'CHF ' + chf(sum(groups.bezahlt)), hint: groups.bezahlt.length + ' Rechnungen' }),
        h(G.StatTile, { label: 'Offen', value: 'CHF ' + chf(sum(groups.offen)), hint: groups.offen.filter(function (i) { return i.status === 'gemahnt'; }).length + ' gemahnt' })),
      h('div', { className: 'pt-actions', style: { margin: 'var(--space-6) 0' } },
        write && h(G.Button, { variant: 'primary', disabled: !due.length, onClick: function () { setBilling(true); } }, 'Beitragslauf ' + db.season),
        h('span', { className: 'pt-small pt-muted' }, due.length ? due.length + ' aktive Mitglieder ohne Beitragsrechnung ' + db.season : 'Alle beitragspflichtigen Mitglieder haben eine Rechnung ' + db.season + '.')),
      h(UI.Tabs, { label: 'Rechnungen filtern', value: tab, onChange: setTab, items: [{ id: 'offen', label: 'Offen (' + groups.offen.length + ')' }, { id: 'bezahlt', label: 'Bezahlt (' + groups.bezahlt.length + ')' }, { id: 'storniert', label: 'Storniert (' + groups.storniert.length + ')' }, { id: 'alle', label: 'Alle' }] }),
      h(G.DataTable, { stack: true, columns: cols, rows: groups[tab].slice().sort(function (a, b) { return a.id < b.id ? 1 : -1; }) }),
      h('p', { className: 'pt-source' }, 'Beiträge wie auf der Seite «Verein»: Aktiv CHF ' + chf(S.FEES.Aktiv) + ' (Jahreskarte inklusive), Passiv CHF ' + chf(S.FEES.Passiv) + ', Gönner/innen freiwillig. Zahlt ein Aktivmitglied, stellt das System die Jahreskarte automatisch aus.'),
      h(UI.Confirm, { open: billing, id: 'billing', title: 'Beitragslauf ' + db.season, confirm: due.length + (due.length === 1 ? ' Rechnung erstellen' : ' Rechnungen erstellen'), onClose: function () { setBilling(false); }, onConfirm: function () { var n = S.actions.runBilling(c.who); c.notify(n + (n === 1 ? ' Rechnung' : ' Rechnungen') + ' erstellt. Im Live-Betrieb gehen sie per E-Mail mit QR-Rechnung raus.'); } },
        h('p', null, 'Für diese Mitglieder entsteht eine Beitragsrechnung, fällig in 30 Tagen:'),
        h('ul', null, due.map(function (m) { return h('li', { key: m.id }, S.fullName(m) + ' – ' + m.category + ', CHF ' + chf(S.FEES[m.category])); }))),
      h(InvoiceDialog, { key: open || 'zu', id: open, db: db, role: c.role, who: c.who, notify: c.notify, onClose: function () { setOpen(null); } }));
  }

  var PAY_METHODS = ['QR-Rechnung', 'TWINT', 'Bar'];
  function InvoiceDialog(p) {
    var inv = p.id && byId(p.db.invoices, p.id), write = S.can(p.role, 'finance.write');
    var m = useState({ date: S.today(), method: 'QR-Rechnung' }), pay = m[0], setPay = m[1];
    var r = useState(null), ask = r[0], setAsk = r[1];
    if (!inv) return h(Dialog, { open: false, id: 'inv', title: '', onClose: p.onClose });
    var mem = S.member(inv.memberId);
    function submit(ev, close) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(pay.date)) return;
      var res = S.actions.payInvoice(inv.id, pay.method, pay.date, p.who);
      p.notify('Zahlung verbucht: ' + inv.id + ', CHF ' + chf(inv.amount) + '.' + (res && res.card ? ' Jahreskarte ' + res.card.id + ' ausgestellt.' : ''));
      close();
    }
    return h(Dialog, {
      open: true, id: 'inv', wide: true, onClose: p.onClose, eyebrow: 'Rechnung', title: inv.id + ' · ' + S.fullName(mem),
      footer: function (close) {
        return h('div', { className: 'pt-actions' },
          write && isOpen(inv) && h(G.Button, { variant: 'quiet', onClick: function () { setAsk('remind'); } }, (inv.reminders + 1) + '. Mahnung senden'),
          write && isOpen(inv) && h(G.Button, { variant: 'ghost', onClick: function () { setAsk('cancel'); } }, 'Stornieren'),
          h(G.Button, { variant: 'ghost', onClick: close }, 'Schliessen'));
      }
    },
      h('div', { className: 'pt-site-dlg' },
        h('div', null,
          h('dl', { className: 'pt-sitefacts' },
            h('dt', null, 'Art'), h('dd', { className: 'pt-dd-text' }, inv.kind),
            h('dt', null, 'Betrag'), h('dd', null, 'CHF ' + chf(inv.amount)),
            h('dt', null, 'Ausgestellt'), h('dd', null, date(inv.issued)),
            h('dt', null, 'Fällig'), h('dd', null, date(inv.due)),
            h('dt', null, 'Status'), h('dd', { className: 'pt-dd-text' }, invStatus(inv)),
            inv.paidAt && h(Fragment, null, h('dt', null, 'Bezahlt'), h('dd', { className: 'pt-dd-text' }, date(inv.paidAt) + ' · ' + inv.method))),
          write && isOpen(inv) && h('div', { className: 'pt-dlg-part' },
            h('h3', { className: 'pt-h4' }, 'Zahlung erfassen'),
            h(UI.DialogForm, { onSubmit: submit, submit: 'Zahlung verbuchen', cancel: false },
              h('div', { className: 'pt-form-row' },
                h(Field, { id: 'pay-date', label: 'Eingang am', input: { type: 'date', value: pay.date, onChange: function (e) { setPay(set(pay, 'date', e.target.value)); } } }),
                h(Field, { id: 'pay-method', label: 'Zahlungsweg' }, h('select', { id: 'pay-method', value: pay.method, onChange: function (e) { setPay(set(pay, 'method', e.target.value)); } }, PAY_METHODS.map(function (x) { return h('option', { key: x, value: x }, x === 'Bar' ? 'Bar (Kasse)' : x); })))),
              h('p', { className: 'pt-hint' }, 'Bucht automatisch: ' + (pay.method === 'Bar' ? '1000 Kasse' : pay.method === 'TWINT' ? '1030 Zahlungsanbieter' : '1020 Bank') + ' an 3000 Mitgliederbeiträge.')))),
        h(QrBill, { inv: inv, member: mem })),
      h(UI.Confirm, {
        open: !!ask, id: 'inv-ask', title: ask === 'remind' ? 'Mahnung senden?' : 'Rechnung stornieren?', confirm: ask === 'remind' ? 'Mahnung senden' : 'Stornieren', onClose: function () { setAsk(null); },
        onConfirm: function () {
          if (ask === 'remind') { S.actions.remind(inv.id, p.who); p.notify((inv.reminders + 1) + '. Mahnung an ' + S.fullName(mem) + ' vorgemerkt. Im Prototyp geht keine E-Mail raus.'); }
          else { S.actions.cancelInvoice(inv.id, p.who); p.notify('Rechnung ' + inv.id + ' storniert.'); }
        }
      }, h('p', null, ask === 'remind' ? S.fullName(mem) + ' bekommt eine Zahlungserinnerung mit neuer Frist von 20 Tagen.' : 'Die Rechnung bleibt im Protokoll sichtbar, zählt aber nicht mehr als offen.')));
  }

  // Zahlteil der QR-Rechnung als Muster – das echte Dokument erzeugt das Backend nach SIX-Standard
  function QrBill(p) {
    var inv = p.inv, m = p.member;
    return h('figure', { className: 'pt-qrbill', 'aria-label': 'Zahlteil der QR-Rechnung (Muster)' },
      h('figcaption', null, 'Zahlteil · Muster'),
      h('div', { className: 'pt-qrbill-body' },
        h('div', { className: 'pt-qrbill-code', 'aria-hidden': true }, h('span', null, '+'), h('small', null, 'QR-Code (Muster)')),
        h('dl', null,
          h('dt', null, 'Konto / Zahlbar an'), h('dd', null, 'CH00 0000 0000 0000 0000 0 (Muster)', h('br'), 'Gleitschirmklub Glarnerland', h('br'), 'Adresse folgt'),
          h('dt', null, 'Referenz'), h('dd', { className: 'gkg-data' }, S.qrReference(inv.id)),
          h('dt', null, 'Zusätzliche Informationen'), h('dd', null, inv.kind),
          h('dt', null, 'Zahlbar durch'), h('dd', null, S.fullName(m), h('br'), m ? m.street : '', h('br'), m ? m.zip + ' ' + m.city : ''),
          h('dt', null, 'Betrag'), h('dd', { className: 'gkg-data' }, 'CHF ' + chf(inv.amount)))),
      h('p', { className: 'pt-small pt-muted' }, 'Die Referenz trägt die Prüfziffer nach Modulo 10 rekursiv. Live braucht es die QR-IBAN des Klubs von der Bank.'));
  }

  /* ---------- Buchhaltung ---------- */
  function Ledger(c) {
    var db = c.db, write = S.can(c.role, 'finance.write');
    var t = useState('journal'), tab = t[0], setTab = t[1];
    var a = useState('alle'), acc = a[0], setAcc = a[1];
    var n = useState(false), adding = n[0], setAdding = n[1];
    var l = useState(false), showAll = l[0], setShowAll = l[1];
    var rep = S.report(db);
    function accName(no) { var x = S.account(no); return no + ' ' + (x ? x.name : ''); }
    var body;
    if (tab === 'journal') {
      var rows = db.journal.filter(function (e) { return acc === 'alle' || e.debit === acc || e.credit === acc; })
        .slice().sort(function (x, y) { return x.date === y.date ? (x.id < y.id ? 1 : -1) : (x.date < y.date ? 1 : -1); });
      body = h(Fragment, null,
        h('div', { className: 'pt-filter' },
          h(Field, { id: 'j-acc', label: 'Konto' }, h('select', { id: 'j-acc', value: acc, onChange: function (e) { setAcc(e.target.value); } },
            h('option', { value: 'alle' }, 'Alle Konten'), S.ACCOUNTS.map(function (x) { return h('option', { key: x.no, value: x.no }, x.no + ' ' + x.name); }))),
          write && h(G.Button, { variant: 'primary', onClick: function () { setAdding(true); } }, 'Buchung erfassen'),
          h(G.Button, { variant: 'quiet', onClick: function () { c.notify('Der Export für die Revision (CSV oder Excel) folgt im Live-Betrieb – das Format bestimmt die Kasse.'); } }, 'Export für die Revision')),
        acc !== 'alle' && h('p', { className: 'pt-small', role: 'status' }, h('b', null, 'Saldo ' + accName(acc) + ': '), 'CHF ' + chf(rep.balances[acc])),
        h(G.DataTable, { stack: true, rows: showAll ? rows : rows.slice(0, 15), columns: [
          { key: 'date', label: 'Datum', render: function (e) { return date(e.date); } },
          { key: 'id', label: 'Beleg' },
          { key: 'text', label: 'Text' },
          { key: 'debit', label: 'Soll', render: function (e) { return h('span', { title: accName(e.debit) }, e.debit); } },
          { key: 'credit', label: 'Haben', render: function (e) { return h('span', { title: accName(e.credit) }, e.credit); } },
          { key: 'amount', label: 'CHF', align: 'right', render: function (e) { return chf(e.amount); } }
        ] }),
        rows.length > 15 && !showAll && h('p', { style: { marginTop: 'var(--space-4)' } }, h(G.Button, { variant: 'quiet', onClick: function () { setShowAll(true); } }, 'Alle ' + rows.length + ' Buchungen zeigen')));
    } else if (tab === 'erfolg') {
      body = h('div', { className: 'pt-grid pt-grid-wide' },
        h(AccountTable, { title: 'Ertrag', type: 'ertrag', rep: rep, total: rep.income }),
        h(AccountTable, { title: 'Aufwand', type: 'aufwand', rep: rep, total: rep.expense }),
        h('div', { className: 'pt-panel' }, h('h3', null, rep.result >= 0 ? 'Gewinn' : 'Verlust'), h('p', { className: 'pt-big-num' }, 'CHF ' + chf(Math.abs(rep.result))), h('p', { className: 'pt-small pt-muted' }, 'Ertrag minus Aufwand seit der Eröffnung.')));
    } else if (tab === 'bilanz') {
      var balanced = Math.abs(rep.assets - rep.liabilities - rep.result) < 0.005;
      body = h(Fragment, null,
        h('div', { className: 'pt-grid pt-grid-wide' },
          h(AccountTable, { title: 'Aktiven', type: 'aktiv', rep: rep, total: rep.assets }),
          h(AccountTable, { title: 'Passiven', type: 'passiv', rep: rep, total: rep.liabilities + rep.result, extra: { label: 'Ergebnis laufendes Jahr', value: rep.result } })),
        h('p', { className: 'pt-small', role: 'status', style: { marginTop: 'var(--space-4)' } }, balanced ? h(G.FlightStatus, { status: 'go', label: 'Bilanz ausgeglichen' }) : h(G.FlightStatus, { status: 'stop', label: 'Differenz – bitte prüfen' })));
    } else {
      body = h(G.DataTable, { stack: true, rows: S.ACCOUNTS.map(function (x) { return Object.assign({ id: x.no }, x); }), columns: [
        { key: 'no', label: 'Konto' }, { key: 'name', label: 'Bezeichnung' },
        { key: 'type', label: 'Gruppe', render: function (x) { return { aktiv: 'Aktiven', passiv: 'Passiven', ertrag: 'Ertrag', aufwand: 'Aufwand' }[x.type]; } },
        { key: 'bal', label: 'Saldo CHF', align: 'right', render: function (x) { return chf(rep.balances[x.no]); } }
      ] });
    }
    return h(Fragment, null,
      !write && h('p', { className: 'pt-wx-note', role: 'note' }, h('b', null, c.who + ': '), 'nur lesen. Buchungen erfasst die Kasse.'),
      h(UI.Tabs, { label: 'Ansicht', value: tab, onChange: setTab, items: [{ id: 'journal', label: 'Journal' }, { id: 'erfolg', label: 'Erfolgsrechnung' }, { id: 'bilanz', label: 'Bilanz' }, { id: 'konten', label: 'Kontenplan' }] }),
      body,
      h('p', { className: 'pt-source' }, 'Annahmen: Geschäftsjahr = Kalenderjahr; Beiträge werden bei Zahlungseingang gebucht. Für Vereine ohne Pflicht zum Handelsregistereintrag genügt nach Art. 957 Abs. 2 OR eine Buchhaltung über Einnahmen, Ausgaben und Vermögenslage – wie der GKG heute bucht und welcher Kontenplan gilt, klärt die Kasse. Online-Zahlungen landen zuerst auf 1030 und werden bei der Auszahlung auf die Bank übertragen.'),
      h(BookingDialog, { open: adding, who: c.who, notify: c.notify, onClose: function () { setAdding(false); } }));
  }

  function AccountTable(p) {
    var list = S.ACCOUNTS.filter(function (a) { return a.type === p.type; });
    return h('div', { className: 'gkg-table-wrap' }, h('table', { className: 'gkg-table' },
      h('caption', null, p.title),
      h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Konto'), h('th', { scope: 'col', className: 'num' }, 'CHF'))),
      h('tbody', null,
        list.map(function (a) { return h('tr', { key: a.no }, h('td', null, a.no + ' ' + a.name), h('td', { className: 'num' }, chf(p.rep.balances[a.no]))); }),
        p.extra && h('tr', null, h('td', null, p.extra.label), h('td', { className: 'num' }, chf(p.extra.value))),
        h('tr', { className: 'pt-total' }, h('td', null, h('b', null, 'Total')), h('td', { className: 'num' }, h('b', null, chf(p.total)))))));
  }

  function BookingDialog(p) {
    var blank = { date: S.today(), text: '', debit: '5300', credit: '1020', amount: '' };
    var f = useState(blank), form = f[0], setForm = f[1];
    var e = useState({}), errors = e[0], setErrors = e[1];
    function submit(ev, close) {
      var err = {}, amount = Number(String(form.amount).replace(/[’']/g, '').replace(',', '.'));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) err.date = 'Datum fehlt.';
      if (!form.text.trim()) err.text = 'Bitte einen Buchungstext eingeben.';
      if (form.debit === form.credit) err.credit = 'Soll und Haben müssen verschiedene Konten sein.';
      if (!(amount > 0)) err.amount = 'Bitte einen Betrag grösser als 0 eingeben, z. B. 120.50.';
      setErrors(err);
      if (Object.keys(err).length) return;
      var b = S.actions.addBooking({ date: form.date, text: form.text.trim(), debit: form.debit, credit: form.credit, amount: amount }, p.who);
      p.notify('Buchung ' + b.id + ' erfasst.');
      setForm(blank); setErrors({});
      close();
    }
    function accSelect(k, label) {
      return h(Field, { id: 'bk-' + k, label: label, error: errors[k] },
        h('select', { id: 'bk-' + k, value: form[k], 'aria-invalid': errors[k] ? 'true' : undefined, onChange: function (ev) { setForm(set(form, k, ev.target.value)); } },
          S.ACCOUNTS.map(function (a) { return h('option', { key: a.no, value: a.no }, a.no + ' ' + a.name); })));
    }
    return h(Dialog, { open: p.open, id: 'booking', title: 'Buchung erfassen', eyebrow: 'Kasse', onClose: p.onClose },
      h(UI.DialogForm, { onSubmit: submit, submit: 'Buchen' },
        h('div', { className: 'pt-form-row' },
          h(Field, { id: 'bk-date', label: 'Datum', error: errors.date, input: { type: 'date', value: form.date, onChange: function (ev) { setForm(set(form, 'date', ev.target.value)); } } }),
          h(Field, { id: 'bk-amount', label: 'Betrag CHF', error: errors.amount, input: { type: 'text', inputMode: 'decimal', value: form.amount, onChange: function (ev) { setForm(set(form, 'amount', ev.target.value)); } } })),
        h(Field, { id: 'bk-text', label: 'Text', error: errors.text, hint: 'z. B. «Rechnung Druckerei Flyer Klubabend»', input: { type: 'text', value: form.text, onChange: function (ev) { setForm(set(form, 'text', ev.target.value)); } } }),
        h('div', { className: 'pt-form-row' }, accSelect('debit', 'Soll (wohin)'), accSelect('credit', 'Haben (woher)')),
        h('p', { className: 'pt-hint' }, 'Beispiel Ausgabe: Soll 5300 Verwaltung, Haben 1020 Bank. Beispiel Einnahme: Soll 1020 Bank, Haben 3300 Spenden.')));
  }

  /* ---------- Jahreskarten ---------- */
  var REASONS = ['Als verloren gemeldet', 'Missbrauch bei der Kontrolle', 'Rückerstattung', 'Austritt'];
  function Cards(c) {
    var db = c.db, write = S.can(c.role, 'cards.write');
    var q = useState(''), query = q[0], setQuery = q[1];
    var b = useState(null), blockId = b[0], setBlockId = b[1];
    var r = useState(REASONS[0]), reason = r[0], setReason = r[1];
    var needle = query.trim().toLowerCase();
    var rows = db.cards.filter(function (x) { return !needle || (x.holder + ' ' + x.id).toLowerCase().indexOf(needle) >= 0; }).slice().sort(function (a, b2) { return a.id < b2.id ? 1 : -1; });
    var valid = db.cards.filter(function (x) { return x.status === 'gültig'; });
    var count = function (kind) { return valid.filter(function (x) { return x.kind === kind; }).length; };
    var target = blockId && byId(db.cards, blockId);
    var cols = [
      { key: 'id', label: 'Kartennr.' },
      { key: 'holder', label: 'Inhaber/in' },
      { key: 'kind', label: 'Typ' },
      { key: 'source', label: 'Herkunft', render: function (x) { return x.source + ', ' + date(x.issued); } },
      { key: 'status', label: 'Status', render: function (x) { return h(Fragment, null, h(G.FlightStatus, { status: x.status === 'gültig' ? 'go' : 'stop', label: x.status === 'gültig' ? 'Gültig' : 'Gesperrt' }), x.reason && h('span', { className: 'pt-small pt-muted pt-block-line' }, x.reason)); } }
    ];
    if (write) cols.push({ key: 'act', label: 'Aktion', render: function (x) {
      return x.status === 'gültig'
        ? h(G.Button, { variant: 'quiet', className: 'pt-btn-sm', onClick: function () { setReason(REASONS[0]); setBlockId(x.id); }, 'aria-label': 'Karte ' + x.id + ' sperren' }, 'Sperren')
        : h(G.Button, { variant: 'quiet', className: 'pt-btn-sm', onClick: function () { S.actions.setCardStatus(x.id, 'gültig', null, c.who); c.notify('Karte ' + x.id + ' ist wieder gültig.'); }, 'aria-label': 'Karte ' + x.id + ' entsperren' }, 'Entsperren');
    } });
    return h(Fragment, null,
      h('div', { className: 'pt-stats' },
        h(G.StatTile, { label: 'Gültige Karten ' + db.season, value: String(valid.length), hint: count('Aktivmitglied') + ' Aktiv · ' + count('Passivmitglied') + ' Passiv · ' + count('Gast') + ' Gäste' }),
        h(G.StatTile, { label: 'Gesperrt', value: String(db.cards.length - valid.length), hint: 'Die Kontrolle zeigt sie sofort als gesperrt' })),
      h('div', { className: 'pt-filter', style: { marginTop: 'var(--space-6)' } },
        h(Field, { id: 'c-q', label: 'Suchen', input: { type: 'search', value: query, placeholder: 'Name oder Kartennummer', onChange: function (e) { setQuery(e.target.value); } } }),
        h(G.Button, { variant: 'ghost', href: '#kontrolle' }, 'Zur Kontrolle')),
      h(G.DataTable, { stack: true, columns: cols, rows: rows }),
      h('p', { className: 'pt-source' }, 'Aktivmitglieder bekommen die Karte mit dem bezahlten Beitrag, alle anderen kaufen sie online. Tageskarten gibt es nicht.'),
      h(UI.Confirm, {
        open: !!target, id: 'card-block', title: target ? 'Karte ' + target.id + ' sperren?' : '', confirm: 'Sperren', onClose: function () { setBlockId(null); },
        onConfirm: function () { S.actions.setCardStatus(target.id, 'gesperrt', reason, c.who); c.notify('Karte ' + target.id + ' gesperrt.'); }
      },
        target && h('p', null, target.holder + ' · ' + target.kind),
        h(Field, { id: 'card-reason', label: 'Grund' }, h('select', { id: 'card-reason', value: reason, onChange: function (e) { setReason(e.target.value); } }, REASONS.map(function (x) { return h('option', { key: x, value: x }, x); })))));
  }

  /* ---------- Rollen & Zugänge ---------- */
  function Roles(c) {
    var keys = Object.keys(S.ROLES);
    function cell(role, row) {
      var can = function (x) { return S.can(role, x); };
      if (row === 'members') return can('members.write') ? 'bearbeiten' : can('members.read') ? 'lesen' : can('members.address') ? 'Name, Adresse' : '–';
      if (row === 'requests') return can('requests.write') ? 'entscheiden' : can('members.read') ? 'lesen' : '–';
      if (row === 'finance') return can('finance.write') ? 'bearbeiten' : can('finance.read') ? 'lesen' : '–';
      if (row === 'cards') return can('cards.write') ? 'sperren' : can('cards.read') ? 'lesen' : '–';
      if (row === 'roles') return can('roles.read') ? 'verwalten' : '–';
      return can('log.read') ? 'alles' : 'eigener Bereich';
    }
    var rows = [['members', 'Mitgliederdaten'], ['requests', 'Anträge'], ['finance', 'Rechnungen und Buchhaltung'], ['cards', 'Jahreskarten'], ['roles', 'Rollen und Zugänge'], ['log', 'Protokoll']];
    return h(Fragment, null,
      h('div', { className: 'gkg-table-wrap' }, h('table', { className: 'gkg-table' },
        h('caption', null, 'Wer darf was'),
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Bereich'), keys.map(function (k) { return h('th', { key: k, scope: 'col' }, S.ROLES[k].label); }))),
        h('tbody', null, rows.map(function (r) {
          return h('tr', { key: r[0] }, h('th', { scope: 'row' }, r[1]), keys.map(function (k) { var v = cell(k, r[0]); return h('td', { key: k, className: v === '–' ? 'pt-muted' : undefined }, v); }));
        })))),
      h('div', { className: 'pt-grid pt-grid-wide', style: { marginTop: 'var(--space-8)' } },
        h('div', { className: 'pt-panel' },
          h('h3', null, 'Vorschlag für den Live-Betrieb'),
          h('ul', { className: 'pt-plain' },
            h('li', null, 'Anmeldung mit persönlichem E-Mail-Link, für Kasse und Webmaster zusätzlich mit zweitem Faktor.'),
            h('li', null, 'Rollen vergibt der Webmaster auf Beschluss des Vorstands; eine Person kann mehrere Rollen haben.'),
            h('li', null, 'Der Server prüft jedes Recht – die Oberfläche blendet nur aus, was nicht erlaubt ist.'),
            h('li', null, 'Jede Änderung landet mit Person und Zeit im Protokoll.'))),
        h('div', { className: 'pt-panel' },
          h('h3', null, 'Protokoll'),
          h('ul', { className: 'pt-log' }, c.db.log.slice(0, 15).map(function (l, i) { return h('li', { key: i }, h('span', { className: 'pt-small pt-muted' }, datetime(l.at) + ' · ' + l.who), h('span', null, l.what)); })))));
  }

  return { Page: Page, QrBill: QrBill, invStatus: invStatus };
})();
