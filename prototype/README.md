# Klickbarer Prototyp

Zeigt dem Vorstand, wie sich die neue Website anfühlt – mit den Bausteinen aus `design-system/`. Nichts ist verbunden: kein Login, keine Zahlung, keine Wallet, keine Kamera.

**Online ansehen:** <https://claude.ai/artifact/PBut5RvbsVV2EpmRsedQFx> (privat – zum Teilen über das «Share»-Menü der Seite freigeben)

## Seiten

| Hash | Seite | Was man ausprobieren kann |
| --- | --- | --- |
| `#start` | Startseite | Hero, Wetter, Gebietsmeldungen, Jahreskarte, Klub, Kollektion |
| `#fluggebiete` | Fluggebiete | 3D-Karte mit 11 Start- und 4 Landeplätzen: antippen, Gebiet anfliegen, 2D/3D umschalten |
| `#gebiet-<id>` | Gebietsseite | 3D-Karte des Gebiets, Tabelle der Plätze mit Höhe, Startrichtung, LV95 und Quelle; z. B. `#gebiet-braunwald` |
| `#jahreskarte` | Kauf der Jahreskarte | Angebot → Profil mit Foto → Bezahlen → fertige Karte mit QR |
| `#kontrolle` | Kontrolle am Startplatz | Scan simulieren: gültige oder gesperrte Karte |
| `#wetter`, `#sport`, `#verein` | Inhaltsseiten | Mitgliedschaft, GKG-Cup, Kontakt |
| `#shop` | Shop | Kollektion mit Grösse/Farbe in den Warenkorb, Gebrauchtmarkt |
| `#login` | Mein GKG | Anmeldelink anfordern, persönlicher Bereich |

## Woher die Inhalte kommen

- **Gebietstexte** (Zugang, Regeln, Gefahren): von gkg.ch übernommen (Suchindex, Stand 2025) – vor dem Go-Live mit dem Ressort Fluggebiete prüfen. Höhen und Windrichtungen fehlen bewusst, ausser beim Gumen (1'875 m ü. M.).
- **Beispieldaten:** Wetterwerte, Flugstatus, Gebietsmeldungen, Shop-Sortiment und -Preise, Inserate. Alle Beispiele stehen in [`data.js`](data.js).
- **Start- und Landeplätze:** Koordinaten aus SHV-Infotafeln, DHV-Geländedatenbank, Paragliding365 und braunwald.ch, jeweils gegen das Höhenmodell geprüft. Fünf Plätze tragen den Hinweis «Vom Ressort zu bestätigen». Quellen: [`docs/Quellen.md`](../docs/Quellen.md).
- **3D-Karte:** Gelände aus offenen Höhendaten, Relief selbst gerechnet. Im Live-Betrieb ist das swisstopo-Luftbild vorgesehen (siehe `design-system/Technik.md`). Ohne WebGL erscheint das Schema der Gebiete.

## Lokal bauen und prüfen

```bash
npm install
pip install -r tools/requirements.txt
npm run tiles        # einmalig: Höhendaten laden und Reliefkacheln rechnen (build/tiles/, ca. 20 s)
npm run serve        # baut build/prototype/ und startet http://localhost:8080
npm run check        # baut und prüft alle Seiten (Desktop/Handy, hell/dunkel), den Kauf und die 3D-Karte
npm run poster       # Standbild der Karte neu rendern (nach Änderungen an Kamera, Kacheln oder Farben)
```

Die 3D-Karte braucht einen lokalen Server (`npm run serve`), weil Browser Kacheln nicht über `file://` laden.

`npm run check` legt Bildschirmfotos in `build/prototype-shots/` ab und bricht mit Fehlercode ab, wenn eine Seite einen JavaScript-Fehler wirft, seitlich überläuft, der Kaufablauf nicht durchläuft oder die 3D-Karte nicht alle Plätze zeigt.

## Dateien

| Datei | Inhalt |
| --- | --- |
| `index.html` | Seitengerüst (ohne `<html>`/`<body>` – so verlangt es das Artifact; der Build ergänzt das Gerüst für lokal) |
| `app.js` | Alle Seiten und die Navigation (React 18, ohne Build-Schritt) |
| `app.css` | Seitenlayout; Farben, Schriften und Abstände nur über die Tokens |
| `data.js` | Inhalte: Gebiete, Start- und Landeplätze mit Koordinaten und Quelle, Beispiel-Wetter, Meldungen, Produkte, Inserate |
| `map3d.js` | 3D-Karte (MapLibre): Laden bei Bedarf, Gelände, Marker, Kamera, Umrechnung nach LV95 |
| `map-poster.jpg`, `map-poster-dark.jpg` | Standbild der Karte für den ersten Moment |
