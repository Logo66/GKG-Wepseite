// Inhalte des Prototyps.
// Gebietstexte: aus gkg.ch übernommen (Suchindex, Stand 2025) – vor dem Go-Live mit dem Ressort Fluggebiete prüfen.
// Alles mit "example: true" bzw. in den Listen "notices", "products", "listings" ist Beispiel.
// Wind kommt aus stations.js (flightbuddyki.ch), Mitglieder und Buchhaltung aus store.js.
window.GKG_DATA = {
  season: 2027,
  price: 40,
  membership: [
    { kind: 'Aktivmitglied', fee: 70, note: 'Jahreskarte (Wert CHF 40) inklusive' },
    { kind: 'Passivmitglied', fee: 50, note: 'Für alle, die nicht fliegen und den Klub unterstützen' },
    { kind: 'Gönner/in', fee: null, note: 'Betrag nach eigenem Ermessen' }
  ],

  // Positionen auf der schematischen Karte in Prozent (x von links, y von oben) – nicht massstäblich.
  areas: [
    {
      id: 'mollis', name: 'Mollis', region: 'Glarus Nord', x: 55, y: 36, status: 'go',
      note: 'Startplätze Froni und Froni Winter über Mollis; hinauf mit Taxi oder Sammelbus.',
      access: ['Startplatz: grosse, mittelsteile Wiese.', 'Hinauf mit Taxi oder Sammelbus; Deltapilot/innen können ihr Gerät selbst hochfahren.', 'Anmeldung am Vortag per Telefon oder WhatsApp.'],
      landing: ['Autos auf dem Parkplatz beim Biotop abstellen.', 'Der Landeplatz kann kurzfristig gesperrt sein – 2023 zum Beispiel wegen des Nordostschweizer Schwingfests.'],
      rules: ['SHV-Infotafel zum Fluggebiet Mollis beachten.']
    },
    {
      id: 'huesliberg', name: 'Hüsliberg', region: 'Landeplatz Rufi', x: 37, y: 20, status: 'stop', statusLabel: 'Alpbetrieb',
      note: 'Taxi ab Landeplatz Rufi. Startverbot an hohen Feiertagen, Alpbetrieb im Juni und September.',
      access: ['Ein Taxi-Dienst bringt dich zum Startplatz; Sammelpunkt direkt beim Landeplatz in Rufi.', 'Private Fahrten zum Startplatz sind unerwünscht.'],
      rules: ['Absolutes Startverbot an Karfreitag, Ostersonntag und Pfingstsonntag.', 'Im Juni und im September je drei Wochen Alpbetrieb – der Startplatz ist dann geschlossen. Die Daten werden zwei bis drei Wochen vorher publiziert.', 'Höchstens zwei Flugschulen pro Tag; Koordination durch die Flugschule Robair in Mollis.']
    },
    {
      id: 'altwis', name: 'Altwis', region: 'Landung in Rufi', x: 14, y: 8, status: 'go',
      note: 'Hike & Fly, rund 1 h 30 min Aufstieg. Zufahrt mit dem Auto verboten.',
      access: ['Hike & Fly: Aufstieg zum Startplatz ca. 1 h 30 min.', 'Zufahrt mit dem Auto verboten.'],
      landing: ['Gelandet wird in Rufi auf dem Landeplatz des Hüsliberg.'],
      rules: ['Flugschulen: nur eine Schule pro Tag mit höchstens 10 Schüler/innen; Anmeldung am Vortag obligatorisch.']
    },
    {
      id: 'oberebogmen', name: 'Obere Bogmen', region: 'Landung in Rufi', x: 47, y: 6, status: 'go',
      note: 'Rund 2 h 30 min Wanderung ab Rufi. Klubeigene Windmessstation.',
      access: ['Wanderung ab Landeplatz Rufi ca. 2 h 30 min – bitte den offiziellen Wanderweg benutzen.', 'Ein Taxi zum Hüsliberg verkürzt den Weg.'],
      rules: ['Flugschulen: vorher Rücksprache mit dem GKG-Vorstand per E-Mail.'],
      extras: ['Eigene Windmessstation des Klubs.']
    },
    {
      id: 'hirzli', name: 'Hirzli', region: 'Glarus Nord', x: 22, y: 36, status: 'caution', statusLabel: 'Wildruhezone',
      note: 'Kein offizieller Landeplatz – landen in Näfels/Mollis oder am Hüsliberg.',
      access: ['Aufstieg zum Gipfel ca. 1 h 30 min, verkürzbar mit der Seilbahn.'],
      landing: ['Kein offizieller Landeplatz: landen in Näfels/Mollis oder am Hüsliberg.'],
      hazards: ['Landen bei der Seilbahn Morgenholz ist lebensgefährlich.', 'Landen im Raum Niederurnen ist grundsätzlich unerwünscht.'],
      rules: ['Das Gebiet liegt in einer Wildruhezone – Schutzzeiten beachten.']
    },
    {
      id: 'kerenzerberg', name: 'Kerenzerberg', region: 'Glarus Nord', x: 80, y: 30, status: 'caution', statusLabel: 'Anspruchsvoll',
      note: 'Start «Kerenzer» über Mollis: Hike & Fly, Acro und Abendflüge. Anspruchsvoll wegen Rotoren.',
      access: ['Bus ab Näfels/Mollis Richtung Filzbach, das letzte Stück zu Fuss.'],
      hazards: ['Anspruchsvoller Start: Rotoren und häufig drehender Wind.'],
      rules: ['SHV-Infotafel zum Fluggebiet Mollis beachten.'],
      extras: ['Beliebt für Hike & Fly, Acro und Abendflüge.']
    },
    {
      id: 'braunwald', name: 'Braunwald', region: 'Glarus Süd · 3 Startplätze', x: 36, y: 80, status: 'go',
      note: 'Startplätze Kiosk, Gumen und Gumengrat. Gumen ist auch im Winter offen.',
      landing: ['Schirme nicht auf dem Landeplatz auslegen.', 'Nur auf den offiziellen Parkplätzen parkieren.'],
      extras: ['Webcams und Windstation über braunwald.ch.'],
      starts: [
        { name: 'Kiosk', notes: ['Im Sommer ab Mittag oft unangenehm, wenn der Talwind über den Startplatz streicht.', 'Bei Föhn nicht fliegen.', 'Heli-Transportflüge beim Startplatz: Start zeitweise nicht möglich oder nur mit Wartezeit.', 'Flugschulen: Anmeldung am Vortag, Koordination Flugschule Robair.'] },
        { name: 'Gumen', takeoff: "1'875", notes: ['Erreichbar mit der Standseilbahn Braunwald und der Kombibahn Gumen.', 'Auch im Winter offen; der Hang wird präpariert.'] },
        { name: 'Gumengrat', notes: ['Anmeldung bei der Flugschule Robair obligatorisch.', 'Aufstieg ca. 30 min.', 'Vorsicht: viele Kabel über dem Urnerboden und ein kaum sichtbares Kabel über Linthal.'] }
      ]
    },
    {
      id: 'elm', name: 'Elm', region: 'Glarus Süd · nur Winter', x: 72, y: 84, status: 'caution', statusLabel: 'Nur Winter',
      note: 'Wintergebiet mit Start am Ämpächli. Weitere Details folgen vom Ressort Fluggebiete.',
      access: ['Mit der Gondelbahn von Elm aufs Ämpächli (laut Paragliding365).'],
      missing: true
    }
  ],

  // Start- und Landeplätze. Koordinaten WGS84, Höhe m ü. M.
  // Quellen: SHV-Infotafeln, DHV-Geländedatenbank, Paragliding365, braunwald.ch.
  // Jeder Punkt ist gegen das Höhenmodell geprüft (Abweichung höchstens 50 m).
  // check: true = vom Ressort Fluggebiete besonders zu bestätigen.
  sites: [
    { id: 'froni', kind: 'start', name: 'Froni', areas: ['mollis'], lat: 47.0722, lon: 9.0908, alt: 1350, dirs: [], src: 'SHV-Infotafel Mollis', srcUrl: 'https://www.shv-fsvl.ch/fileadmin/files/redakteure/Allgemein/Sicherheit/SHVInfotafeln/Mollis.pdf', check: true, note: 'Startrichtung in der Quelle nicht angegeben – das Gelände fällt nach Norden.' },
    { id: 'froni-winter', kind: 'start', name: 'Froni Winter', areas: ['mollis'], lat: 47.0724, lon: 9.0937, alt: 1362, dirs: ['NW'], level: 'leicht', src: 'SHV-Infotafel Mollis', srcUrl: 'https://www.shv-fsvl.ch/fileadmin/files/redakteure/Allgemein/Sicherheit/SHVInfotafeln/Mollis.pdf' },
    { id: 'kerenzer', kind: 'start', name: 'Kerenzer', areas: ['kerenzerberg'], lat: 47.1089, lon: 9.0837, alt: 675, dirs: ['NW'], level: 'schwierig (Turbulenzen)', src: 'SHV-Infotafel Mollis', srcUrl: 'https://www.shv-fsvl.ch/fileadmin/files/redakteure/Allgemein/Sicherheit/SHVInfotafeln/Mollis.pdf' },
    { id: 'mollis-lp', kind: 'landing', name: 'Landeplatz Mollis', areas: ['mollis', 'kerenzerberg', 'hirzli'], lat: 47.0837, lon: 9.0688, alt: 443, src: 'SHV-Infotafel Mollis', srcUrl: 'https://www.shv-fsvl.ch/fileadmin/files/redakteure/Allgemein/Sicherheit/SHVInfotafeln/Mollis.pdf', note: 'Flugplatz Mollis: Piste und Verlängerung nicht überfliegen. Laut SHV-Tafel gilt in der blauen Zone höchstens 900 m ü. M., im rot umrandeten Bereich nicht unter 1047 m ü. M.' },
    { id: 'huesliberg', kind: 'start', name: 'Hüsliberg', areas: ['huesliberg'], lat: 47.1897, lon: 9.0747, alt: 1012, dirs: ['S', 'SW', 'W'], src: 'SHV-Infotafel Schänis', srcUrl: 'https://www.shv-fsvl.ch/fileadmin/files/redakteure/Allgemein/Sicherheit/SHVInfotafeln/Schaenis.pdf' },
    { id: 'rufi', kind: 'landing', name: 'Landeplatz Rufi', areas: ['huesliberg', 'altwis', 'oberebogmen', 'hirzli'], lat: 47.1834, lon: 9.0472, alt: 428, src: 'SHV-Infotafel Schänis', srcUrl: 'https://www.shv-fsvl.ch/fileadmin/files/redakteure/Allgemein/Sicherheit/SHVInfotafeln/Schaenis.pdf', note: 'Sammelpunkt für das Taxi zum Hüsliberg.' },
    { id: 'altwis', kind: 'start', name: 'Altwis', areas: ['altwis'], lat: 47.2107, lon: 9.0679, alt: 1055, dirs: ['W', 'NW', 'N'], level: 'leicht', src: 'SHV-Infotafel Schänis', srcUrl: 'https://www.shv-fsvl.ch/fileadmin/files/redakteure/Allgemein/Sicherheit/SHVInfotafeln/Schaenis.pdf' },
    { id: 'bogmen', kind: 'start', name: 'Obere Bogmen', areas: ['oberebogmen'], lat: 47.1863, lon: 9.0942, alt: 1432, dirs: ['S', 'SW', 'W'], src: 'SHV-Infotafel Schänis', srcUrl: 'https://www.shv-fsvl.ch/fileadmin/files/redakteure/Allgemein/Sicherheit/SHVInfotafeln/Schaenis.pdf', check: true, note: 'Nur im markierten Bereich starten. Startrichtung mit dem Ressort abgleichen – das grobe Höhenmodell zeigt hier einen Nordwesthang.' },
    { id: 'hirzli', kind: 'start', name: 'Hirzli', areas: ['hirzli'], lat: 47.13378, lon: 9.00727, alt: 1640, dirs: ['W', 'NW', 'N'], level: 'mittel', src: 'SHV-Infotafel Schänis (Richtung, Schwierigkeit), Position: Paragliding365 (Stand 2016)', srcUrl: 'https://www.shv-fsvl.ch/fileadmin/files/redakteure/Allgemein/Sicherheit/SHVInfotafeln/Schaenis.pdf', check: true, note: 'Position eher ungenau: Das Höhenmodell liegt hier rund 50 m tiefer als angegeben. Während der Jagdzeit gesperrt (laut Paragliding365).' },
    { id: 'kiosk', kind: 'start', name: 'Kiosk', areas: ['braunwald'], lat: 46.9385, lon: 8.9980, alt: 1242, dirs: ['O', 'SO'], src: 'SHV-Infotafel Braunwald, braunwald.ch', srcUrl: 'https://www.shv-fsvl.ch/fileadmin/files/redakteure/Allgemein/Sicherheit/SHVInfotafeln/Braunwald.pdf' },
    { id: 'gumen', kind: 'start', name: 'Gumen (Winter)', areas: ['braunwald'], lat: 46.9551, lon: 8.9843, alt: 1875, dirs: ['SO', 'S', 'SW'], src: 'SHV-Infotafel Braunwald', srcUrl: 'https://www.shv-fsvl.ch/fileadmin/files/redakteure/Allgemein/Sicherheit/SHVInfotafeln/Braunwald.pdf', note: 'Winterstartplatz unterhalb der Bergstation Gumen; nur im markierten Bereich starten.' },
    { id: 'gumengrat', kind: 'start', name: 'Gumengrat', areas: ['braunwald'], lat: 46.9600, lon: 8.98721, alt: 2064, dirs: ['S'], src: 'braunwald.ch, SHV-Infotafel Braunwald', srcUrl: 'https://braunwald.ch/de/map/detail/gleitschirm-startplatz-gumengrat-nur-sommer-e9ede009-5616-4d91-825a-35c421c93eed.html', note: 'Nur im Sommer.' },
    { id: 'rueti', kind: 'landing', name: 'Landeplatz Rüti', areas: ['braunwald'], lat: 46.9311, lon: 9.0065, alt: 630, src: 'SHV-Infotafel Braunwald', srcUrl: 'https://www.shv-fsvl.ch/fileadmin/files/redakteure/Allgemein/Sicherheit/SHVInfotafeln/Braunwald.pdf' },
    { id: 'aempaechli', kind: 'start', name: 'Ämpächli', areas: ['elm'], lat: 46.91889, lon: 9.14917, alt: 1490, dirs: ['SO', 'S', 'SW'], src: 'Paragliding365 (ältere Angabe)', srcUrl: 'https://www.paragliding365.com/index-p-flightarea_details_215.html', check: true, note: 'Mit der Gondelbahn ab Elm. Quelle ist älter – mit dem Ressort abgleichen.' },
    { id: 'elm-lp', kind: 'landing', name: 'Landeplatz Elm', areas: ['elm'], lat: 46.91274, lon: 9.16283, alt: 1019, src: 'DHV-Geländedatenbank', srcUrl: 'https://service.dhv.de/db2/details.php?qi=glp_details&item=1290', check: true }
  ],

  // SHV-Infotafeln: welche Plätze auf welcher Tafel stehen und was dort gilt (Auszug).
  // Massgebend ist immer die aktuelle Tafel des SHV – im Live-Betrieb holt das GKG-Backend
  // die PDFs regelmässig von shv-fsvl.ch und zeigt eine Vorschau (tools/fetch-shv.py).
  shv: {
    mollis: {
      title: 'SHV-Infotafel Mollis', url: 'https://www.shv-fsvl.ch/fileadmin/files/redakteure/Allgemein/Sicherheit/SHVInfotafeln/Mollis.pdf',
      sites: ['froni', 'froni-winter', 'kerenzer', 'mollis-lp'],
      rules: [
        'Flugplatz Mollis: die Piste und ihre Verlängerungslinien nicht überfliegen.',
        'Im rot umrandeten Bereich nicht unter 1047 m ü. M. fliegen.',
        'Im blauen Bereich höchstens bis 900 m ü. M. fliegen.'
      ],
      note: 'Laut SHV nach einem Bericht über Hike & Fly im Kanton Glarus aktualisiert.'
    },
    schaenis: {
      title: 'SHV-Infotafel Schänis', url: 'https://www.shv-fsvl.ch/fileadmin/files/redakteure/Allgemein/Sicherheit/SHVInfotafeln/Schaenis.pdf',
      sites: ['huesliberg', 'altwis', 'bogmen', 'hirzli', 'rufi'],
      rules: [
        'Bei Föhn allgemein kein Flugbetrieb; bei Bise wird das Fluggebiet Hüsliberg überspült.',
        'Startverbote während Alp- und Brutzeiten sowie an Karfreitag, Ostersonntag und Pfingstsonntag – Daten gemäss Tafel.',
        'Landeplatz Rufi ganzjährig offen, ausser an diesen Feiertagen. Die Strasse westlich des Landeplatzes nicht überfliegen.',
        'Im violett markierten Bereich nicht unter 1030 m ü. M. fliegen; den Segelflugbetrieb Schänis nicht stören.',
        'Bogmen: nur im definierten Bereich starten.'
      ]
    },
    braunwald: {
      title: 'SHV-Infotafel Braunwald', url: 'https://www.shv-fsvl.ch/fileadmin/files/redakteure/Allgemein/Sicherheit/SHVInfotafeln/Braunwald.pdf',
      sites: ['kiosk', 'gumen', 'gumengrat', 'rueti'],
      rules: [
        'Landeplatz Rüti: bei Talwind Rechtsvolte, bei Bergwind Linksvolte. Zugang ab Linthal ca. 10 Min. entlang der Linth talauswärts; ganzjährig aktiv.',
        'Gumengrat: höchstens zwei bis drei Starts gleichzeitig. Sensible Alpweide – nur im markierten, abgesperrten Bereich starten und nur mit Windsack.',
        'Gumen Winter: nur im markierten Bereich starten.',
        'Die Karte der Tafel zeigt Kabel, Bergbahnen sowie Jagdbann- und Schutzgebiete mit Start- und Landeverbot.'
      ]
    }
  },

  // Beispiele – im echten Betrieb vom Ressort Fluggebiete erfasst
  notices: [
    { area: 'huesliberg', status: 'stop', label: 'Gesperrt', title: 'Hüsliberg: Alpbetrieb, Startplatz geschlossen', when: 'Beispiel: 7. bis 27. Juni 2027' },
    { area: 'braunwald', status: 'caution', label: 'Hinweis', title: 'Braunwald Kiosk: Heli-Transportflüge beim Startplatz', when: 'Laut gkg.ch (2025) ohne bekannte Zeiten' }
  ],

  // Beispiele – Sortiment und Preise legt der Vorstand fest
  products: [
    { id: 'hoodie', name: 'Hoodie GKG', price: 59, badge: 'Neu', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], soldOut: ['XS'], colors: [{ name: 'Gletscher', value: '#0a6b78' }, { name: 'Nacht', value: '#10222a' }, { name: 'Firn', value: '#f5f7f4' }] },
    { id: 'tshirt', name: 'T-Shirt GKG', price: 29, sizes: ['S', 'M', 'L', 'XL'], colors: [{ name: 'Firn', value: '#f5f7f4' }, { name: 'Schirm-Orange', value: '#ff5a24' }] },
    { id: 'softshell', name: 'Softshell-Jacke GKG', price: 89, sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: [{ name: 'Nacht', value: '#10222a' }] },
    { id: 'cap', name: 'Cap GKG', price: 25, colors: [{ name: 'Schirm-Orange', value: '#ff5a24' }, { name: 'Nacht', value: '#10222a' }] }
  ],

  listings: [
    { category: 'Schirm', title: 'Musterschirm M, EN-B', price: 1450, tags: ['Gr. M', '85–105 kg', 'ca. 90 h', 'Check 2026'], seller: 'Reto B.', posted: 'vor 2 Tagen', isNew: true },
    { category: 'Gurtzeug', title: 'Leichtgurtzeug mit Protektor', price: 380, tags: ['Gr. L', 'Wie neu'], seller: 'Nina T.', posted: 'vor 1 Woche' },
    { category: 'Retter', title: 'Rundkappen-Retter bis 110 kg', price: 290, tags: ['bis 110 kg', 'gepackt 3/2026'], seller: 'Beat K.', posted: 'vor 3 Wochen' }
  ]
};
