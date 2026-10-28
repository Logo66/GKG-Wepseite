// Datenhaltung des Prototyps für Verwaltung (admin.js) und «Mein GKG» (member.js).
// Alle Personen, Adressen, Beträge und Buchungen sind erfunden. Der Stand bleibt im Browser
// (localStorage) und lässt sich jederzeit auf die Beispieldaten zurücksetzen.
// Im Live-Betrieb ersetzt das GKG-Backend diese Datei: gleiche Aktionen, aber mit Datenbank,
// Anmeldung pro Ressort und serverseitiger Rechteprüfung.
window.GKGStore = (function () {
  var React = window.React;
  var KEY = 'gkg-prototyp-v1';
  var SEASON = (window.GKG_DATA && window.GKG_DATA.season) || 2027;
  var PRICE = (window.GKG_DATA && window.GKG_DATA.price) || 40;
  var FEES = { Aktiv: 70, Passiv: 50, 'Gönner/in': 0 };

  /* ---------- Ressorts und Rechte ---------- */
  // Jedes Ressort sieht nur, was es für seine Arbeit braucht. Die Kasse sieht von Mitgliedern
  // nur Name und Adresse, das Aktuariat keine Buchhaltung, die Revision liest nur.
  var ROLES = {
    praesidium: { label: 'Präsidium', perms: ['members.read', 'finance.read', 'cards.read', 'log.read', 'contracts.read', 'contracts.write'] },
    aktuariat: { label: 'Aktuariat (Mitglieder)', perms: ['members.read', 'members.write', 'requests.write', 'cards.read'] },
    kasse: { label: 'Kasse (Finanzen)', perms: ['members.address', 'finance.read', 'finance.write', 'cards.read', 'contracts.read'] },
    fluggebiete: { label: 'Ressort Fluggebiete', perms: ['cards.read', 'cards.write'] },
    revision: { label: 'Revision', perms: ['members.address', 'finance.read', 'contracts.read'] },
    admin: { label: 'Webmaster', perms: ['roles.read', 'log.read'] }
  };
  var MODULES = [
    { id: 'uebersicht', label: 'Übersicht', any: [] },
    { id: 'mitglieder', label: 'Mitglieder', any: ['members.read', 'members.address'] },
    { id: 'rechnungen', label: 'Beiträge & Rechnungen', any: ['finance.read'] },
    { id: 'buchhaltung', label: 'Buchhaltung', any: ['finance.read'] },
    { id: 'karten', label: 'Jahreskarten', any: ['cards.read'] },
    { id: 'vertraege', label: 'Verträge & Dienste', any: ['contracts.read'] },
    { id: 'rollen', label: 'Rollen & Zugänge', any: ['roles.read'] }
  ];
  function can(role, perm) { var r = ROLES[role]; return !!r && r.perms.indexOf(perm) >= 0; }
  function canModule(role, id) {
    var m = MODULES.filter(function (x) { return x.id === id; })[0];
    return !!m && (!m.any.length || m.any.some(function (p) { return can(role, p); }));
  }

  /* ---------- Kontenplan (vereinfachter Vereinskontenrahmen) ---------- */
  var ACCOUNTS = [
    { no: '1000', name: 'Kasse', type: 'aktiv' },
    { no: '1020', name: 'Bank', type: 'aktiv' },
    { no: '1030', name: 'Zahlungsanbieter (TWINT, Karten)', type: 'aktiv' },
    { no: '1200', name: 'Warenlager Klub-Kollektion', type: 'aktiv' },
    { no: '2000', name: 'Kreditoren', type: 'passiv' },
    { no: '2800', name: 'Vereinsvermögen', type: 'passiv' },
    { no: '3000', name: 'Mitgliederbeiträge', type: 'ertrag' },
    { no: '3100', name: 'Jahreskarten Gäste', type: 'ertrag' },
    { no: '3200', name: 'Verkauf Klub-Kollektion', type: 'ertrag' },
    { no: '3300', name: 'Spenden und Gönnerbeiträge', type: 'ertrag' },
    { no: '4000', name: 'Einkauf Klub-Kollektion', type: 'aufwand' },
    { no: '5000', name: 'Fluggebiete (Entschädigungen, Unterhalt)', type: 'aufwand' },
    { no: '5100', name: 'Beiträge an Kurse und Sicherheitstrainings', type: 'aufwand' },
    { no: '5200', name: 'Anlässe und GKG-Cup', type: 'aufwand' },
    { no: '5300', name: 'Verwaltung, Website, Software', type: 'aufwand' },
    { no: '5350', name: 'Wetterdienste und Prognosen', type: 'aufwand' },
    { no: '5400', name: 'Zahlungsgebühren', type: 'aufwand' }
  ];
  function account(no) { return ACCOUNTS.filter(function (a) { return a.no === no; })[0]; }

  /* ---------- Beispieldaten ---------- */
  // [Vorname, Nachname, Kategorie, Ort-Index, Mitglied seit, Beitrag-Stand]
  // Beitrag-Stand: 'paid' bezahlt, 'open' offen, 'late' gemahnt, '-' keine Rechnung (Gönner/in)
  var PLACES = [['8750', 'Glarus'], ['8753', 'Mollis'], ['8752', 'Näfels'], ['8762', 'Schwanden'], ['8783', 'Linthal'], ['8767', 'Elm'], ['8865', 'Bilten'], ['8867', 'Niederurnen'], ['8754', 'Netstal'], ['8640', 'Rapperswil']];
  var STREETS = ['Bergstrasse', 'Dorfstrasse', 'Wiesenweg', 'Sonnenhalde', 'Lindenweg', 'Schulhausstrasse', 'Bahnhofstrasse', 'Talstrasse'];
  var PEOPLE = [
    ['Lea', 'Keller', 'Aktiv', 1, 2019, 'open'],
    ['Marco', 'Brunner', 'Passiv', 0, 2011, 'paid'],
    ['Sandra', 'Meier', 'Aktiv', 2, 2008, 'paid'],
    ['Jonas', 'Weber', 'Aktiv', 3, 2021, 'paid'],
    ['Nina', 'Frei', 'Aktiv', 0, 2016, 'paid'],
    ['Reto', 'Huber', 'Aktiv', 4, 1994, 'paid'],
    ['Claudia', 'Graf', 'Aktiv', 8, 2013, 'late'],
    ['Daniel', 'Suter', 'Aktiv', 1, 2002, 'paid'],
    ['Mia', 'Roth', 'Aktiv', 6, 2024, 'open'],
    ['Thomas', 'Kunz', 'Aktiv', 7, 1999, 'paid'],
    ['Laura', 'Vogel', 'Aktiv', 9, 2018, 'paid'],
    ['Peter', 'Wyss', 'Passiv', 5, 1988, 'paid'],
    ['Simon', 'Zimmermann', 'Aktiv', 2, 2010, 'paid'],
    ['Andrea', 'Baumann', 'Aktiv', 0, 2015, 'open'],
    ['Luca', 'Bühler', 'Aktiv', 3, 2023, 'paid'],
    ['Eva', 'Fischer', 'Passiv', 1, 2005, 'open'],
    ['Martin', 'Gerber', 'Aktiv', 4, 2007, 'paid'],
    ['Sarah', 'Hofer', 'Aktiv', 8, 2020, 'paid'],
    ['Urs', 'Moser', 'Gönner/in', 0, 1990, '-'],
    ['Fabienne', 'Schmid', 'Aktiv', 7, 2022, 'paid'],
    ['Beat', 'Steiner', 'Aktiv', 6, 1997, 'late'],
    ['Julia', 'Widmer', 'Passiv', 9, 2014, 'paid'],
    ['Kurt', 'Lüthi', 'Gönner/in', 2, 1987, '-'],
    ['Noah', 'Koch', 'Aktiv', 1, 2025, 'paid']
  ];

  function pad(n, len) { var s = String(n); while (s.length < len) s = '0' + s; return s; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2); }
  function today() { return iso(new Date()); }
  function now() { return new Date().toISOString(); }
  function round2(x) { return Math.round(x * 100) / 100; }

  // Schweizer QR-Referenz: 26 Ziffern + Prüfziffer (Modulo 10 rekursiv)
  var MOD10 = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];
  function mod10(digits) {
    var carry = 0;
    for (var i = 0; i < digits.length; i++) carry = MOD10[(carry + Number(digits.charAt(i))) % 10];
    return (10 - carry) % 10;
  }
  function qrReference(invoiceId) {
    var base = pad(String(invoiceId).replace(/\D/g, ''), 26);
    var ref = base + mod10(base);
    return ref.slice(0, 2) + ' ' + ref.slice(2).replace(/(\d{5})(?=\d)/g, '$1 ');
  }

  function seed() {
    var s = { version: 2, season: SEASON, contracts: contracts(), members: [], invoices: [], journal: [], cards: [], requests: [], log: [], session: { role: 'aktuariat', memberId: null }, seq: { member: 1100, invoice: 0, booking: 0, card: 200, request: 0 } };
    function book(date, text, debit, credit, amount, ref) {
      s.seq.booking++;
      s.journal.push({ id: 'B-' + pad(s.seq.booking, 4), date: date, text: text, debit: debit, credit: credit, amount: round2(amount), ref: ref || null, by: 'Beispiel' });
    }
    // Eröffnung und Rechnung des laufenden Geschäftsjahres (Annahme: Kalenderjahr)
    book('2026-01-01', 'Eröffnung Bank', '1020', '2800', 18640.35);
    book('2026-01-01', 'Eröffnung Kasse', '1000', '2800', 320);
    book('2026-01-01', 'Eröffnung Warenlager Klub-Kollektion', '1200', '2800', 1450);
    book('2026-03-31', 'Mitgliederbeiträge Saison 2026, Sammelbuchung (Beispiel)', '1020', '3000', 11270);
    book('2026-04-15', 'Gäste-Jahreskarten 2026, Sammelbuchung (Beispiel)', '1030', '3100', 1880);
    book('2026-04-20', 'Entschädigung Landeplatz (Beispiel)', '5000', '1020', 1200);
    book('2026-05-12', 'Beiträge an Sicherheitstrainings (Beispiel)', '5100', '1020', 1650);
    book('2026-06-30', 'Zahlungsgebühren 1. Halbjahr', '5400', '1030', 54.6);
    book('2026-07-01', 'Übertrag Zahlungsanbieter auf Bank', '1020', '1030', 1825.4);
    book('2026-08-22', 'GKG-Cup Preise und Apéro (Beispiel)', '5200', '1020', 780.5);
    book('2026-09-05', 'Webhosting und Software (Beispiel)', '5300', '1020', 420);
    book('2026-09-18', 'Verkauf Klub-Kollektion am Klubabend', '1000', '3200', 395);
    book('2026-09-30', 'Spende Gönner/in', '1020', '3300', 200, null);

    PEOPLE.forEach(function (p, i) {
      var id = 'M-' + (1001 + i);
      var place = PLACES[p[3]];
      var m = {
        id: id, first: p[0], last: p[1], category: p[2], since: p[4], status: 'aktiv',
        email: (p[0] + '.' + p[1]).toLowerCase().replace(/ü/g, 'ue').replace(/ä/g, 'ae').replace(/ö/g, 'oe') + '@beispiel.ch',
        phone: '079 000 ' + pad(10 + i, 2) + ' ' + pad(20 + i * 3, 2).slice(-2),
        street: STREETS[i % STREETS.length] + ' ' + (3 + (i * 7) % 40), zip: place[0], city: place[1],
        born: 1955 + (i * 13) % 50,
        consents: { newsletter: i % 3 !== 0, directory: i % 4 === 0, photos: i % 2 === 0 },
        photo: null
      };
      s.members.push(m);
      var fee = FEES[m.category];
      if (p[5] === '-' || !fee) return;
      s.seq.invoice++;
      var inv = { id: 'R-' + SEASON + '-' + pad(s.seq.invoice, 3), memberId: id, kind: 'Mitgliederbeitrag ' + SEASON + ' · ' + m.category, amount: fee, issued: '2026-10-01', due: '2026-11-30', status: 'offen', reminders: 0, paidAt: null, method: null };
      if (p[5] === 'paid') {
        inv.status = 'bezahlt'; inv.paidAt = '2026-10-' + pad(3 + (i % 20), 2); inv.method = i % 3 ? 'TWINT' : 'QR-Rechnung';
        book(inv.paidAt, 'Beitrag ' + SEASON + ' ' + m.first + ' ' + m.last + ' (' + inv.method + ')', inv.method === 'TWINT' ? '1030' : '1020', '3000', fee, inv.id);
      }
      if (p[5] === 'late') { inv.status = 'gemahnt'; inv.reminders = 1; inv.due = '2026-10-20'; inv.issued = '2026-09-01'; }
      s.invoices.push(inv);
      if (inv.status === 'bezahlt' && m.category === 'Aktiv') s.cards.push(newCard(s, m.first + ' ' + m.last, id, 'Aktivmitglied', 'Mitgliederbeitrag', inv.paidAt));
    });
    // Zwei gekaufte Karten: ein Gast und ein Passivmitglied
    [['Anna', 'Muster', 'Gast', null], ['Marco', 'Brunner', 'Passivmitglied', 'M-1002']].forEach(function (g, i) {
      var c = newCard(s, g[0] + ' ' + g[1], g[3], g[2], 'Online-Kauf', '2026-10-1' + (i + 2));
      s.cards.push(c);
      book(c.issued, 'Jahreskarte ' + SEASON + ' ' + g[2] + ' ' + c.holder + ' (TWINT)', '1030', '3100', PRICE, c.id);
    });
    s.cards[3].status = 'gesperrt'; s.cards[3].reason = 'Als verloren gemeldet, Ersatzkarte ausgestellt';
    s.cards.push(newCard(s, s.cards[3].holder, s.cards[3].memberId, 'Aktivmitglied', 'Ersatzkarte', '2026-10-21'));
    s.requests.push({ id: 'A-001', memberId: 'M-1016', type: 'Kategorie', text: 'Wechsel von Passiv zu Aktiv ab Saison ' + SEASON + '.', change: { category: 'Aktiv' }, at: '2026-10-19T18:22:00.000Z', status: 'offen' });
    s.requests.push({ id: 'A-002', memberId: null, type: 'Eintritt', text: 'Neues Mitglied über das Anmeldeformular: Elena Beispiel, 8753 Mollis, Aktiv.', change: { first: 'Elena', last: 'Beispiel', zip: '8753', city: 'Mollis', category: 'Aktiv', email: 'elena.beispiel@beispiel.ch' }, at: '2026-10-24T09:05:00.000Z', status: 'offen' });
    s.seq.request = 2;
    s.log.push({ at: '2026-10-24T09:05:00.000Z', who: 'Anmeldeformular', area: 'members', what: 'Antrag A-002 (Eintritt) von Elena Beispiel' });
    s.log.push({ at: '2026-10-21T16:40:00.000Z', who: 'Ressort Fluggebiete', area: 'cards', what: 'Jahreskarte ' + s.cards[3].id + ' (' + s.cards[3].holder + ') gesperrt: als verloren gemeldet; Ersatzkarte ausgestellt' });
    s.log.push({ at: '2026-10-19T18:22:00.000Z', who: 'Mitglied selbst', area: 'members', what: 'Antrag A-001 (Kategorie) von Eva Fischer' });
    s.log.push({ at: '2026-10-14T20:11:00.000Z', who: 'Mitglied selbst', area: 'members', what: 'Laura Vogel: Strasse, PLZ, Ort geändert' });
    s.log.push({ at: '2026-10-01T08:00:00.000Z', who: 'Kasse (Finanzen)', area: 'finance', what: 'Beitragslauf ' + SEASON + ': ' + s.invoices.length + ' Rechnungen erstellt (Beispiel)' });
    return s;
  }

  // Verträge mit Dienstleistern – heute nur die Option Prognosen von FlightBuddyKI
  function contracts() {
    return [{
      id: 'fbki-prognose', partner: 'FlightBuddyKI', title: 'Thermik-Prognosen für alle Klubgebiete',
      scope: 'Stündliche Prognose (Steigwerte, Basis, Einschätzung, Warnungen wie Föhn) für die 11 Startplätze, heute und die nächsten 4 Tage, auf gkg.ch im Pop-up jedes Startplatzes.',
      model: 'Jahrespauschale für alle Klubgebiete', fee: null, account: '5350', status: 'option', decided: null, doc: 'docs/FlightBuddyKI-Prognosen.md'
    }];
  }

  function newCard(s, holder, memberId, kind, source, date) {
    s.seq.card++;
    return { id: SEASON + '-0' + s.seq.card, holder: holder, memberId: memberId, kind: kind, source: source, issued: date || today(), status: 'gültig', reason: null };
  }

  /* ---------- Speicher ---------- */
  var state = load();
  var listeners = [];
  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (raw) {
        var s = JSON.parse(raw);
        // Stand aus Version 1: Verträge ergänzen
        if (s && s.version === 1 && s.season === SEASON) { s.version = 2; s.contracts = contracts(); }
        if (s && s.version === 2 && s.season === SEASON) return s;
      }
    } catch (e) { /* kein Speicher verfügbar – dann gelten die Beispieldaten */ }
    return seed();
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* privat oder voll: nur im Speicher */ }
  }
  function commit(next) {
    state = next;
    save();
    listeners.forEach(function (fn) { fn(); });
  }
  // Jede Aktion arbeitet auf einer Kopie, damit React die Änderung sicher erkennt
  function change(fn) {
    var next = JSON.parse(JSON.stringify(state));
    var result = fn(next);
    commit(next);
    return result;
  }
  function subscribe(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (x) { return x !== fn; }); }; }
  function get() { return state; }
  function use() { return React.useSyncExternalStore(subscribe, get); }

  function log(s, who, area, what) { s.log.unshift({ at: now(), who: who, area: area, what: what }); if (s.log.length > 200) s.log.length = 200; }
  function member(s, id) { return s.members.filter(function (m) { return m.id === id; })[0]; }
  function fullName(m) { return m ? m.first + ' ' + m.last : '–'; }
  function bookInto(s, entry, who) {
    s.seq.booking++;
    var e = Object.assign({ id: 'B-' + pad(s.seq.booking, 4), date: today(), ref: null, by: who }, entry, { amount: round2(entry.amount) });
    s.journal.push(e);
    return e;
  }
  var METHOD_ACCOUNT = { TWINT: '1030', Kreditkarte: '1030', PostFinance: '1030', 'Apple Pay': '1030', 'Google Pay': '1030', 'QR-Rechnung': '1020', Bank: '1020', Bar: '1000' };

  function payInto(s, invoiceId, method, date, who) {
    var inv = s.invoices.filter(function (x) { return x.id === invoiceId; })[0];
    if (!inv || inv.status === 'bezahlt' || inv.status === 'storniert') return null;
    var m = member(s, inv.memberId);
    inv.status = 'bezahlt'; inv.paidAt = date || today(); inv.method = method;
    bookInto(s, { date: inv.paidAt, text: 'Beitrag ' + s.season + ' ' + fullName(m) + ' (' + method + ')', debit: METHOD_ACCOUNT[method] || '1020', credit: '3000', amount: inv.amount, ref: inv.id }, who);
    var card = null;
    // Aktivmitglieder: Jahreskarte entsteht automatisch mit dem bezahlten Beitrag
    if (m && m.category === 'Aktiv' && !s.cards.some(function (c) { return c.memberId === m.id && c.status === 'gültig'; })) {
      card = newCard(s, fullName(m), m.id, 'Aktivmitglied', 'Mitgliederbeitrag', inv.paidAt);
      s.cards.push(card);
    }
    log(s, who, 'finance', 'Zahlung ' + inv.id + ' (' + fullName(m) + ', CHF ' + inv.amount.toFixed(2) + ', ' + method + ') verbucht' + (card ? '; Jahreskarte ' + card.id + ' ausgestellt' : ''));
    return { invoice: inv, card: card };
  }

  /* ---------- Aktionen ---------- */
  var actions = {
    setRole: function (role) { change(function (s) { s.session.role = role; }); },
    login: function (memberId) { change(function (s) { s.session.memberId = memberId; }); },
    logout: function () { change(function (s) { s.session.memberId = null; }); },
    reset: function () { var role = state.session.role; var s = seed(); s.session.role = role; commit(s); },

    addMember: function (data, who) {
      return change(function (s) {
        s.seq.member++;
        var m = Object.assign({ id: 'M-' + s.seq.member, status: 'aktiv', since: new Date().getFullYear(), consents: { newsletter: false, directory: false, photos: false }, photo: null, phone: '', street: '', born: null }, data);
        s.members.push(m);
        log(s, who, 'members', 'Mitglied ' + m.id + ' ' + fullName(m) + ' erfasst (' + m.category + ')');
        return m;
      });
    },
    // who = Ressort oder «Mitglied selbst»; Änderungen durch Mitglieder sieht das Aktuariat im Protokoll
    updateMember: function (id, patch, who) {
      return change(function (s) {
        var m = member(s, id);
        if (!m) return null;
        var fields = Object.keys(patch).filter(function (k) { return JSON.stringify(m[k]) !== JSON.stringify(patch[k]); });
        if (!fields.length) return m;
        Object.assign(m, patch);
        var labels = { first: 'Vorname', last: 'Nachname', email: 'E-Mail', phone: 'Telefon', street: 'Strasse', zip: 'PLZ', city: 'Ort', category: 'Kategorie', status: 'Status', consents: 'Einwilligungen', photo: 'Foto', born: 'Jahrgang' };
        log(s, who, 'members', fullName(m) + ': ' + fields.map(function (k) { return labels[k] || k; }).join(', ') + ' geändert');
        return m;
      });
    },
    addRequest: function (memberId, type, text, chg, who) {
      return change(function (s) {
        s.seq.request++;
        var r = { id: 'A-' + pad(s.seq.request, 3), memberId: memberId, type: type, text: text, change: chg || null, at: now(), status: 'offen' };
        s.requests.unshift(r);
        log(s, who, 'members', 'Antrag ' + r.id + ' (' + type + ') von ' + fullName(member(s, memberId)));
        return r;
      });
    },
    resolveRequest: function (id, accept, who) {
      return change(function (s) {
        var r = s.requests.filter(function (x) { return x.id === id; })[0];
        if (!r || r.status !== 'offen') return null;
        r.status = accept ? 'angenommen' : 'abgelehnt';
        r.doneAt = now(); r.doneBy = who;
        if (accept && r.type === 'Eintritt' && r.change) {
          s.seq.member++;
          var m = Object.assign({ id: 'M-' + s.seq.member, status: 'aktiv', since: new Date().getFullYear(), consents: { newsletter: false, directory: false, photos: false }, photo: null, phone: '', street: '', born: null }, r.change);
          s.members.push(m);
          r.memberId = m.id;
        } else if (accept && r.change) {
          var mm = member(s, r.memberId);
          if (mm) Object.assign(mm, r.change);
          if (mm && r.type === 'Austritt') mm.status = 'ausgetreten';
        }
        log(s, who, 'members', 'Antrag ' + r.id + ' (' + r.type + ') ' + r.status);
        return r;
      });
    },

    // Beitragslauf: eine Rechnung für jedes aktive Mitglied ohne Beitragsrechnung der Saison
    runBilling: function (who) {
      return change(function (s) {
        var n = 0;
        s.members.forEach(function (m) {
          var fee = FEES[m.category];
          if (m.status !== 'aktiv' || !fee) return;
          if (s.invoices.some(function (i) { return i.memberId === m.id && i.status !== 'storniert' && /^Mitgliederbeitrag/.test(i.kind); })) return;
          s.seq.invoice++; n++;
          var due = new Date(); due.setDate(due.getDate() + 30);
          s.invoices.push({ id: 'R-' + s.season + '-' + pad(s.seq.invoice, 3), memberId: m.id, kind: 'Mitgliederbeitrag ' + s.season + ' · ' + m.category, amount: fee, issued: today(), due: iso(due), status: 'offen', reminders: 0, paidAt: null, method: null });
        });
        log(s, who, 'finance', 'Beitragslauf ' + s.season + ': ' + n + (n === 1 ? ' Rechnung' : ' Rechnungen') + ' erstellt');
        return n;
      });
    },
    payInvoice: function (id, method, date, who) { return change(function (s) { return payInto(s, id, method, date, who); }); },
    remind: function (id, who) {
      return change(function (s) {
        var inv = s.invoices.filter(function (x) { return x.id === id; })[0];
        if (!inv || inv.status === 'bezahlt' || inv.status === 'storniert') return null;
        inv.status = 'gemahnt'; inv.reminders++;
        var due = new Date(); due.setDate(due.getDate() + 20); inv.due = iso(due);
        log(s, who, 'finance', inv.reminders + '. Mahnung ' + inv.id + ' an ' + fullName(member(s, inv.memberId)));
        return inv;
      });
    },
    cancelInvoice: function (id, who) {
      return change(function (s) {
        var inv = s.invoices.filter(function (x) { return x.id === id; })[0];
        if (!inv || inv.status === 'bezahlt') return null;
        inv.status = 'storniert';
        log(s, who, 'finance', 'Rechnung ' + inv.id + ' storniert');
        return inv;
      });
    },
    addBooking: function (entry, who) {
      return change(function (s) {
        var e = bookInto(s, entry, who);
        log(s, who, 'finance', 'Buchung ' + e.id + ': ' + e.text + ' (CHF ' + e.amount.toFixed(2) + ')');
        return e;
      });
    },

    setCardStatus: function (id, status, reason, who) {
      return change(function (s) {
        var c = s.cards.filter(function (x) { return x.id === id; })[0];
        if (!c) return null;
        c.status = status; c.reason = status === 'gesperrt' ? reason : null;
        log(s, who, 'cards', 'Jahreskarte ' + c.id + ' (' + c.holder + ') ' + (status === 'gesperrt' ? 'gesperrt: ' + reason : 'entsperrt'));
        return c;
      });
    },
    // Vertrag: Vorstand beschliesst (status aktiv/option), Kasse verbucht die Pauschale
    setContract: function (id, status, who) {
      return change(function (s) {
        var c = (s.contracts || []).filter(function (x) { return x.id === id; })[0];
        if (!c) return null;
        c.status = status; c.decided = status === 'aktiv' ? today() : null;
        log(s, who, 'contracts', c.partner + ': ' + c.title + ' – ' + (status === 'aktiv' ? 'vom Vorstand beschlossen' : 'zurück auf Option'));
        return c;
      });
    },
    bookContract: function (id, amount, who) {
      return change(function (s) {
        var c = (s.contracts || []).filter(function (x) { return x.id === id; })[0];
        if (!c) return null;
        c.fee = round2(amount);
        var e = bookInto(s, { text: c.partner + ': ' + c.model + ' ' + s.season, debit: c.account, credit: '1020', amount: amount, ref: c.id }, who);
        log(s, who, 'finance', 'Buchung ' + e.id + ': ' + e.text + ' (CHF ' + e.amount.toFixed(2) + ')');
        return e;
      });
    },

    // Online-Kauf auf #jahreskarte: Karte + Buchung auf Zahlungsanbieter / Jahreskarten Gäste
    buyCard: function (data) {
      return change(function (s) {
        var c = newCard(s, data.holder, data.memberId || null, data.kind, 'Online-Kauf', today());
        c.photo = data.photo || null; c.email = data.email;
        s.cards.push(c);
        bookInto(s, { text: 'Jahreskarte ' + s.season + ' ' + data.kind + ' ' + data.holder + ' (' + data.method + ')', debit: METHOD_ACCOUNT[data.method] || '1030', credit: '3100', amount: PRICE, ref: c.id }, 'Online-Kauf');
        log(s, 'Online-Kauf', 'cards', 'Jahreskarte ' + c.id + ' an ' + data.holder + ' (' + data.kind + ') verkauft');
        return c;
      });
    }
  };

  /* ---------- Auswertungen ---------- */
  function balances(s) {
    var b = {};
    ACCOUNTS.forEach(function (a) { b[a.no] = 0; });
    s.journal.forEach(function (e) {
      b[e.debit] = round2((b[e.debit] || 0) + e.amount);
      b[e.credit] = round2((b[e.credit] || 0) - e.amount);
    });
    // Vorzeichen so, dass jedes Konto seinen normalen Saldo positiv zeigt
    ACCOUNTS.forEach(function (a) { if (a.type === 'passiv' || a.type === 'ertrag') b[a.no] = round2(-b[a.no]) || 0; });
    return b;
  }
  function report(s) {
    var b = balances(s), sum = function (type) { return round2(ACCOUNTS.filter(function (a) { return a.type === type; }).reduce(function (t, a) { return t + b[a.no]; }, 0)); };
    var income = sum('ertrag'), expense = sum('aufwand'), assets = sum('aktiv'), liabilities = sum('passiv');
    return { balances: b, income: income, expense: expense, result: round2(income - expense), assets: assets, liabilities: liabilities };
  }

  return {
    use: use, get: get, subscribe: subscribe, actions: actions,
    ROLES: ROLES, MODULES: MODULES, ACCOUNTS: ACCOUNTS, FEES: FEES, can: can, canModule: canModule,
    account: account, member: function (id) { return member(state, id); }, fullName: fullName,
    balances: balances, report: report, qrReference: qrReference, mod10: mod10, today: today
  };
})();
