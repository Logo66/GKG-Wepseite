# Klickbarer Prototyp

Zeigt dem Vorstand, wie sich die neue Website anfühlt – mit den Bausteinen aus `design-system/`. Zahlung, E-Mail, Wallet und Kamera sind nicht verbunden. Der Wind kommt live von flightbuddyki.ch, wenn der Dienst erreichbar ist, sonst erscheinen klar markierte Beispielwerte. Verwaltung und «Mein GKG» arbeiten mit erfundenen Personen; Änderungen bleiben im Browser (localStorage) und lassen sich in der Verwaltung zurücksetzen.

**Online ansehen:** <https://claude.ai/artifact/PBut5RvbsVV2EpmRsedQFx> (privat – zum Teilen über das «Share»-Menü der Seite freigeben)

## Seiten

| Hash | Seite | Was man ausprobieren kann |
| --- | --- | --- |
| `#start` | Startseite | Hero, Wind der Stationen, Gebietsmeldungen, Jahreskarte, Klub, Kollektion |
| `#fluggebiete` | Fluggebiete | 3D-Karte mit 11 Start- und 4 Landeplätzen und den Windstationen: Platz antippen → Pop-up mit Eckdaten, Wind in der Nähe und SHV-Infotafel; Station antippen → Messwerte; Wind ein/aus, 2D/3D |
| `#gebiet-<id>` | Gebietsseite | 3D-Karte des Gebiets, Tabelle der Plätze (Name antippen → Pop-up), Link zur SHV-Tafel; z. B. `#gebiet-braunwald` |
| `#wetter` | Wetter | Alle Stationen im Umkreis von 35 km, Aktualisieren, Quellen und Ampel-Schwellen |
| `#jahreskarte` | Kauf der Jahreskarte | Angebot → Profil mit Foto → Bezahlen → fertige Karte mit QR; Karte und Buchung landen in der Verwaltung |
| `#kontrolle` | Kontrolle am Startplatz | Scan simulieren: gültige oder gesperrte Karte – Status aus der Klub-Datenbank |
| `#verein` | Verein | Mitgliedschaft, Beitrittsformular (wird zum Antrag beim Aktuariat), Kontakt |
| `#sport`, `#shop` | Inhaltsseiten, Shop | GKG-Cup, Kollektion mit Grösse/Farbe, Gebrauchtmarkt |
| `#verwaltung` | Verwaltung | Ressort oben wählen: Übersicht, Mitglieder mit Anträgen, Beiträge & Rechnungen (Beitragslauf, Zahlung erfassen, Mahnung, QR-Zahlteil), Buchhaltung (Journal, Erfolgsrechnung, Bilanz, Kontenplan), Jahreskarten (sperren), Rollen & Zugänge. Unterseiten `#verwaltung-mitglieder`, `-rechnungen`, `-buchhaltung`, `-karten`, `-rollen` |
| `#mein-gkg` | Mein GKG | Als Beispielmitglied anmelden: Adresse und Foto ändern, Beitrag online bezahlen → Jahreskarte, Kategorie wechseln, Austritt, Einwilligungen, gespeicherte Daten ansehen |

## Woher die Inhalte kommen

- **Gebietstexte** (Zugang, Regeln, Gefahren): von gkg.ch übernommen (Suchindex, Stand 2025) – vor dem Go-Live mit dem Ressort Fluggebiete prüfen. Höhen und Windrichtungen fehlen bewusst, ausser beim Gumen (1'875 m ü. M.).
- **Wind:** live von [flightbuddyki.ch](https://flightbuddyki.ch) (WindBuddy über FANET, Holfuy, MeteoSchweiz), siehe [`stations.js`](stations.js). Ohne Verbindung sechs erfundene Beispielstationen, als solche beschriftet.
- **SHV-Infotafeln:** Auszug der Regeln von Hand in `data.js` (`shv`), Link zum offiziellen PDF. Massgebend ist die aktuelle Tafel des SHV.
- **Beispieldaten:** Flugstatus, Gebietsmeldungen, Shop-Sortiment und -Preise, Inserate in [`data.js`](data.js); Mitglieder, Rechnungen, Buchungen und Karten in [`store.js`](store.js) – alles erfunden.
- **Start- und Landeplätze:** Koordinaten aus SHV-Infotafeln, DHV-Geländedatenbank, Paragliding365 und braunwald.ch, jeweils gegen das Höhenmodell geprüft. Fünf Plätze tragen den Hinweis «Vom Ressort zu bestätigen». Quellen: [`docs/Quellen.md`](../docs/Quellen.md).
- **3D-Karte:** Gelände aus offenen Höhendaten, Relief selbst gerechnet. Im Live-Betrieb ist das swisstopo-Luftbild vorgesehen (siehe `design-system/Technik.md`). Ohne WebGL erscheint das Schema der Gebiete.

## Lokal bauen und prüfen

```bash
npm install
pip install -r tools/requirements.txt
npm run tiles        # einmalig: Höhendaten laden und Reliefkacheln rechnen (build/tiles/, ca. 20 s)
npm run serve        # baut build/prototype/ und startet http://localhost:8080
npm run check        # baut und prüft alle Seiten (Desktop/Handy, hell/dunkel) und die Abläufe
npm run poster       # Standbild der Karte neu rendern (nach Änderungen an Kamera, Kacheln oder Farben)
```

Die 3D-Karte braucht einen lokalen Server (`npm run serve`), weil Browser Kacheln nicht über `file://` laden.

`npm run check` legt Bildschirmfotos in `build/prototype-shots/` ab und bricht mit Fehlercode ab, wenn eine Seite einen JavaScript-Fehler wirft oder seitlich überläuft, oder wenn einer dieser Abläufe scheitert: Kauf und Kontrolle, Mitglied zahlt selbst, Kasse verbucht und bucht, Karte sperren, Rechte pro Ressort, Beitritt, Wetter ohne flightbuddyki.ch, 3D-Karte mit Pop-up und Stationen. flightbuddyki.ch wird dabei durch Testdaten ersetzt.

Vorschaubilder der SHV-Tafeln (optional, Rechte vorher klären): `python3 tools/fetch-shv.py` – braucht Zugriff auf shv-fsvl.ch und `pdftoppm`.

## Dateien

| Datei | Inhalt |
| --- | --- |
| `index.html` | Seitengerüst (ohne `<html>`/`<body>` – so verlangt es das Artifact; der Build ergänzt das Gerüst für lokal) |
| `app.js` | Öffentliche Seiten, Navigation, 3D-Karte, Pop-up mit SHV-Infotafel (React 18, ohne Build-Schritt) |
| `ui.js` | Gemeinsame Bausteine: Seitenkopf, Abschnitt, Dialog, Formularfeld, Tabs, Formatierung |
| `stations.js` | Windstationen von flightbuddyki.ch: Abfrage, Umrechnung in km/h, Ampel, Beispielwerte als Rückfall |
| `store.js` | Datenhaltung für Verwaltung und Mein GKG: Mitglieder, Rechnungen, Buchungen, Karten, Anträge, Protokoll, Rechte |
| `admin.js` | Verwaltung für Vorstand und Ressorts |
| `member.js` | Mein GKG – Selbstverwaltung der Mitglieder |
| `app.css` | Seitenlayout; Farben, Schriften und Abstände nur über die Tokens |
| `data.js` | Inhalte: Gebiete, Start- und Landeplätze mit Koordinaten und Quelle, SHV-Infotafeln, Meldungen, Produkte, Inserate |
| `map3d.js` | 3D-Karte (MapLibre): Laden bei Bedarf, Gelände, Marker, Windstationen, Kamera, Umrechnung nach LV95 |
| `map-poster.jpg`, `map-poster-dark.jpg` | Standbild der Karte für den ersten Moment |
