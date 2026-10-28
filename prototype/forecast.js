// Prognose von FlightBuddyKI für die Startplätze – Option, die der Klub gegen eine Jahrespauschale abschliessen kann.
// Live: GKG-Backend /api/wetter/prognose?platz=&tag= (backend/wetter.js), das die Thermik-Prognose des BuddyServers
// (/api/v1/weather/thermik/spot/{id}?date=) mit dem Schlüssel des Klubs holt. Ohne Vertrag oder ohne Backend zeigt
// der Prototyp erfundene Beispielwerte im selben Format – deutlich beschriftet.
window.GKGForecast = (function () {
  var React = window.React, G = window.GKG, UI = window.GKGUI, S = window.GKGStore;
  var h = React.createElement, Fragment = React.Fragment, useState = React.useState, useEffect = React.useEffect;
  var DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  var QUALITY = { null: ['Keine Thermik', 'stop'], schwach: ['Schwach', 'caution'], mittel: ['Mittel', 'caution'], gut: ['Gut', 'go'], sehr_gut: ['Sehr gut', 'go'] };
  var SEVERITY = { info: 'go', watch: 'caution', warn: 'caution', danger: 'stop' };

  function iso(d) { return d.toISOString().slice(0, 10); }
  function days() { var out = [], t = Date.now(); for (var i = 0; i < 5; i++) out.push(iso(new Date(t + i * 86400000))); return out; }
  function dayLabel(s, i) { if (i === 0) return 'Heute'; if (i === 1) return 'Morgen'; var d = new Date(s + 'T12:00:00Z'); return DAYS[d.getUTCDay()] + ' ' + s.slice(8, 10) + '.' + s.slice(5, 7) + '.'; }
  // Stunde in Schweizer Zeit (die Schnittstelle liefert UTC)
  var HOUR = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Zurich' });
  function hourOf(v) {
    var d = new Date(v);
    if (isNaN(d)) return null;
    var part = HOUR.formatToParts(d).filter(function (x) { return x.type === 'hour'; })[0];
    return part ? Number(part.value) : null;
  }

  // Erfundene Beispielprognose im Format der Schnittstelle – deterministisch je Platz und Tag
  function sample(site, day) {
    var seed = 0, str = site.id + day;
    for (var i = 0; i < str.length; i++) seed = (seed * 31 + str.charCodeAt(i)) >>> 0;
    function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    var strength = 0.6 + rnd() * 2.2, base = Math.round((site.alt + 900 + rnd() * 1200) / 100) * 100;
    var foehn = rnd() < 0.18, rain = !foehn && rnd() < 0.15;
    var slots = [];
    for (var hr = 9; hr <= 18; hr++) {
      var bell = Math.exp(-Math.pow((hr - 14) / 2.4, 2));
      var w = rain ? 0 : Math.round(strength * bell * (0.85 + rnd() * 0.3) * 10) / 10;
      var q = w < 0.3 ? 'null' : w < 0.9 ? 'schwach' : w < 1.6 ? 'mittel' : w < 2.3 ? 'gut' : 'sehr_gut';
      var warnings = [];
      if (foehn && hr >= 11 && hr <= 17) warnings.push({ type: 'foehn', severity: 'warn', title: 'Föhntendenz', text: 'Druckunterschied Süd–Nord erhöht – Föhn möglich, Talwind beachten.' });
      slots.push({
        valid_at: day + 'T' + String(hr - 1).padStart(2, '0') + ':00:00Z', climb_rate_ms_max: w, climb_top_m: w ? Math.min(base + 300, site.alt + 2400) : null,
        lcl_m: rain ? null : base, quality_class: q, quality_score: Math.min(1, w / 3), tagestyp: rain ? 'regen' : strength > 2 ? 'xc' : 'hobby',
        foehn_risk: foehn, wind_aufwindschicht_kmh: Math.round(8 + rnd() * (foehn ? 30 : 14)), warnings: warnings
      });
    }
    return { platz: site.id, tag: day, tage: days(), provider: 'FlightBuddyKI', sample: true,
      attribution: 'Prognose: FlightBuddyKI · Wetterdaten ICON-D2 via Open-Meteo (CC BY 4.0)',
      disclaimer: 'Klassifikation: Flight Buddy KI eigene Definition.', slots: slots };
  }

  function useForecast(site, day) {
    var cfg = window.GKG_CONFIG || {};
    var s = useState(null), data = s[0], setData = s[1];
    useEffect(function () {
      var alive = true;
      setData(null);
      if (!cfg.forecastLive || !cfg.forecastUrl) { setData(sample(site, day)); return; }
      fetch(cfg.forecastUrl + '?platz=' + encodeURIComponent(site.id) + '&tag=' + day)
        .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'Fehler'); return d; }); })
        .then(function (d) { if (alive) setData(d); }, function (e) { if (alive) setData({ error: e.message, slots: [] }); });
      return function () { alive = false; };
    }, [site.id, day]);
    return data;
  }

  function summary(slots) {
    var flyable = slots.filter(function (x) { return (x.climb_rate_ms_max || 0) >= 0.9; });
    var best = slots.reduce(function (b, x) { return !b || (x.climb_rate_ms_max || 0) > (b.climb_rate_ms_max || 0) ? x : b; }, null);
    var hours = flyable.map(function (x) { return hourOf(x.valid_at); }).filter(function (x) { return x != null; });
    return { best: best, from: hours.length ? Math.min.apply(null, hours) : null, to: hours.length ? Math.max.apply(null, hours) + 1 : null };
  }

  // Prognose-Teil im Pop-up eines Startplatzes
  function Panel(p) {
    var site = p.site, list = days();
    var d = useState(list[0]), day = d[0], setDay = d[1];
    var db = S.use();
    var contract = (db.contracts || []).filter(function (c) { return c.id === 'fbki-prognose'; })[0];
    var data = useForecast(site, day);
    var slots = data && data.slots ? data.slots.filter(function (x) { var hr = hourOf(x.valid_at); return hr != null && hr >= 9 && hr <= 18; }) : [];
    var sum = slots.length ? summary(slots) : null;
    var warnings = [];
    slots.forEach(function (x) { (x.warnings || []).forEach(function (w) { if (!warnings.some(function (y) { return y.title === w.title; })) warnings.push(w); }); });
    var maxW = Math.max(3, slots.reduce(function (m, x) { return Math.max(m, x.climb_rate_ms_max || 0); }, 0));
    var active = contract && contract.status === 'aktiv';
    return h('div', { className: 'pt-dlg-part pt-fc' },
      h('h3', { className: 'pt-h4' }, 'Thermik-Prognose', h('span', { className: 'pt-fc-by' }, ' · FlightBuddyKI')),
      (!data || data.sample) && h('p', { className: 'pt-wx-note', role: 'note' }, h('b', null, 'Beispielwerte. '),
        active ? 'Der Vertrag ist aktiv; im Prototyp ist die Schnittstelle aber nicht verbunden.' : 'Option: Prognosen für alle Klubgebiete gegen eine Jahrespauschale – vom Vorstand noch nicht beschlossen. So würde es aussehen.'),
      h(UI.Tabs, { label: 'Tag wählen', value: day, onChange: setDay, items: list.map(function (x, i) { return { id: x, label: dayLabel(x, i) }; }) }),
      !data ? h('p', { className: 'pt-small', role: 'status' }, 'Prognose wird geladen …')
        : data.error ? h('p', { className: 'pt-small', role: 'status' }, data.error)
        : h(Fragment, null,
            sum && h('p', null, sum.from != null ? h(Fragment, null, h('b', null, 'Fliegbar etwa ' + sum.from + '–' + sum.to + ' Uhr'), ' · bis ' + String(sum.best.climb_rate_ms_max).replace('.', ',') + ' m/s um ' + hourOf(sum.best.valid_at) + ' Uhr')
              : h('b', null, 'Kaum Thermik erwartet'),
              sum.best && sum.best.lcl_m ? ' · Basis ca. ' + String(sum.best.lcl_m).replace(/\B(?=(\d{3})+(?!\d))/g, "'") + ' m' : ''),
            h('div', { className: 'pt-fc-bars', role: 'img', 'aria-label': 'Steigwerte je Stunde: ' + slots.map(function (x) { return hourOf(x.valid_at) + ' Uhr ' + (x.climb_rate_ms_max || 0) + ' m/s'; }).join(', ') },
              slots.map(function (x) {
                var q = QUALITY[x.quality_class] || QUALITY['null'];
                return h('div', { key: x.valid_at, className: 'pt-fc-col' },
                  h('span', { className: 'pt-fc-val' }, x.climb_rate_ms_max ? String(x.climb_rate_ms_max).replace('.', ',') : '–'),
                  h('span', { className: 'pt-fc-bar pt-fc-' + q[1], style: { height: Math.max(3, (x.climb_rate_ms_max || 0) / maxW * 64) + 'px' } }),
                  h('span', { className: 'pt-fc-h' }, hourOf(x.valid_at)));
              })),
            h('p', { className: 'pt-small pt-muted' }, 'Balken: stärkstes Steigen je Stunde (m/s). Farbe: Einschätzung von FlightBuddyKI.'),
            warnings.length > 0 && h('ul', { className: 'pt-fc-warn' }, warnings.map(function (w, i) {
              return h('li', { key: i }, h(G.FlightStatus, { status: SEVERITY[w.severity] || 'caution', label: w.title }), ' ' + (w.text || ''));
            })),
            h('p', { className: 'pt-small pt-muted' }, (data.attribution || 'Prognose: FlightBuddyKI') + '. ' + (data.disclaimer ? data.disclaimer + ' ' : '') + 'Eine Prognose ersetzt nie die eigene Beurteilung vor Ort.')));
  }

  return { Panel: Panel, sample: sample };
})();
