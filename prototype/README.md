# Klickbarer Prototyp

Zeigt dem Vorstand, wie sich die neue Website anfühlt – mit den Bausteinen aus `design-system/`. Nichts ist verbunden: kein Login, keine Zahlung, keine Wallet, keine Kamera.

**Online ansehen:** <https://claude.ai/artifact/PBut5RvbsVV2EpmRsedQFx> (privat – zum Teilen über das «Share»-Menü der Seite freigeben)

## Seiten

| Hash | Seite | Was man ausprobieren kann |
| --- | --- | --- |
| `#start` | Startseite | Hero, Wetter, Gebietsmeldungen, Jahreskarte, Klub, Kollektion |
| `#fluggebiete` | Fluggebiete | Schematische Karte mit Markern antippen, alle Gebiete als Karten |
| `#gebiet-<id>` | Gebietsseite | z. B. `#gebiet-braunwald` mit drei Startplätzen, `#gebiet-hirzli` mit Gefahren |
| `#jahreskarte` | Kauf der Jahreskarte | Angebot → Profil mit Foto → Bezahlen → fertige Karte mit QR |
| `#kontrolle` | Kontrolle am Startplatz | Scan simulieren: gültige oder gesperrte Karte |
| `#wetter`, `#sport`, `#verein` | Inhaltsseiten | Mitgliedschaft, GKG-Cup, Kontakt |
| `#shop` | Shop | Kollektion mit Grösse/Farbe in den Warenkorb, Gebrauchtmarkt |
| `#login` | Mein GKG | Anmeldelink anfordern, persönlicher Bereich |

## Woher die Inhalte kommen

- **Gebietstexte** (Zugang, Regeln, Gefahren): von gkg.ch übernommen (Suchindex, Stand 2025) – vor dem Go-Live mit dem Ressort Fluggebiete prüfen. Höhen und Windrichtungen fehlen bewusst, ausser beim Gumen (1'875 m ü. M.).
- **Beispieldaten:** Wetterwerte, Flugstatus, Gebietsmeldungen, Shop-Sortiment und -Preise, Inserate. Alle Beispiele stehen in [`data.js`](data.js).
- **Karte:** ein Schema, nicht massstäblich. Im echten Produkt kommt eine swisstopo-Karte (siehe `design-system/Technik.md`).

## Lokal bauen und prüfen

```bash
npm install
npm run prototype    # baut build/prototype/ – dann build/prototype/index.html im Browser öffnen
npm run check        # baut und prüft alle Seiten (Desktop/Handy, hell/dunkel) und spielt den Kauf einmal durch
```

`npm run check` legt Bildschirmfotos in `build/prototype-shots/` ab und bricht mit Fehlercode ab, wenn eine Seite einen JavaScript-Fehler wirft, seitlich überläuft oder der Kaufablauf nicht durchläuft.

## Dateien

| Datei | Inhalt |
| --- | --- |
| `index.html` | Seitengerüst (ohne `<html>`/`<body>` – so verlangt es das Artifact; der Build ergänzt das Gerüst für lokal) |
| `app.js` | Alle Seiten und die Navigation (React 18, ohne Build-Schritt) |
| `app.css` | Seitenlayout; Farben, Schriften und Abstände nur über die Tokens |
| `data.js` | Inhalte: Gebiete, Beispiel-Wetter, Meldungen, Produkte, Inserate |
