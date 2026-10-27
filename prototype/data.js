// Inhalte des Prototyps.
// Gebietstexte: aus gkg.ch übernommen (Suchindex, Stand 2025) – vor dem Go-Live mit dem Ressort Fluggebiete prüfen.
// Alles mit "example: true" bzw. in den Listen "weather", "notices", "products", "listings" ist Beispiel.
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
      note: 'Grosse, mittelsteile Startwiese; hinauf mit Taxi oder Sammelbus.',
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
      note: 'Hike & Fly, Acro und Abendflüge. Anspruchsvoller Start mit Rotoren.',
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
      note: 'Wintergebiet. Details folgen vom Ressort Fluggebiete.',
      missing: true
    }
  ],

  // Beispiele – im echten Betrieb aus den Messstationen
  weather: [
    { station: 'Obere Bogmen · Klubstation', status: 'go', wind: 14, gust: 22, direction: 240, temperature: 8, updated: 'vor 3 Min.', source: 'Beispiel' },
    { station: 'Braunwald', status: 'go', wind: 9, gust: 15, direction: 160, temperature: 6, updated: 'vor 6 Min.', source: 'Beispiel' },
    { station: 'Mollis · Landeplatz', status: 'caution', wind: 18, gust: 31, direction: 200, temperature: 14, updated: 'vor 2 Min.', source: 'Beispiel' }
  ],

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
