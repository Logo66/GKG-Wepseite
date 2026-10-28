# GKG Website

Neuaufbau von [gkg.ch](https://www.gkg.ch/) für den **Gleitschirmklub Glarnerland**: modern, frisch, für junge und erfahrene Pilot/innen. Alles von der bestehenden Seite wird übernommen und neu aufgebaut, dazu kommen Jahreskarte mit Wallet-QR, Klub-Shop, Gebrauchtmarkt und ein Backoffice mit eigenem Zugang pro Ressort.

## Stand

| | |
| --- | --- |
| Phase | 1 – Design und Prototyp. Noch kein Code der eigentlichen Website. |
| Fertig | Design-System in den Logo-Farben (Sonnen-Gelb, Türkis), Projektplan, Technik-Konzept, [klickbarer Prototyp](prototype/README.md) mit 3D-Karte der 15 Start- und Landeplätze, Windstationen von flightbuddyki.ch, Pop-up mit SHV-Infotafel, Verwaltung mit Buchhaltung und Ressort-Rechten, «Mein GKG» für die Mitglieder |
| Als Nächstes | Koordinaten und SHV-Auszüge mit dem Ressort Fluggebiete bestätigen, Weg für die Wetterdaten wählen (GKG-Backend oder Freigabe auf dem BuddyServer), Rechte-Matrix und Kontenplan mit Vorstand und Kasse durchgehen, Prototyp mit dem Vorstand testen, Logo als Vektordatei |

Den vollständigen Plan mit Zeitplan und offenen Fragen findest du in [design-system/Projektplan.md](design-system/Projektplan.md), den technischen Vorschlag in [design-system/Technik.md](design-system/Technik.md).

## Aufbau

```
design-system/          Das Design-System – 1:1 dieselben Dateien wie im Artifact (Ordner project/)
  README.md             Brand-Book: Haltung, Sprache, Farbe, Typografie, Barrierefreiheit
  Projektplan.md        Ziele, Sitemap, Ressorts, Ablauf Jahreskarte, Shop, Phasen, offene Fragen
  Technik.md            Architektur, Wetterdaten, QR/Wallet, Datenschutz, Kosten
  tokens.json           Alle Design-Werte (Farben hell/dunkel, Schrift, Abstände, Radien, Schatten)
  design-system.json    Index des Artifacts (Titel, Bibliotheken) – nicht von Hand ändern
  components/
    bundle.js           Die Komponenten als window.GKG (React 18)
    bundle.css          Styling der Komponenten, lädt die Google Fonts
    index.d.ts          Typen der Komponenten (Dokumentation)
    <Name>/README.md    Richtlinien pro Komponente
    <Name>/preview.html Live-Vorschau pro Komponente
  assets/Logos/         G-Signet und Sonnen-Logo (freigestellt), Originale in original/
    Cover/preview.html  Titelbild des Design-Systems
prototype/              Klickbarer Prototyp: Start, Fluggebiete, Jahreskarte, Kontrolle, Shop
docs/
  Quellen.md            Woher die Inhalte stammen (gkg.ch, FlyCard Bassano)
tools/
  tokens-css.js         Erzeugt CSS-Variablen aus tokens.json
  build-tiles.py        Höhendaten laden, Relief- und Höhenkacheln für die 3D-Karte rechnen
  prepare-logos.py      Klub-Logos freistellen (weisser Grund → transparent)
  render-map-poster.js  Standbild der 3D-Karte rendern
  serve.js              Lokaler Server für den Prototyp
  render-previews.js    Rendert alle Komponenten-Vorschauen hell und dunkel als Bild
  build-prototype.js    Baut den Prototyp nach build/prototype/
  check-prototype.js    Prüft alle Seiten des Prototyps und spielt den Kauf durch
```

## Komponenten

| Bereich | Komponenten |
| --- | --- |
| Navigation | `SiteHeader` |
| Aktionen | `Button` |
| Wetter | `FlightStatus`, `WeatherCard` |
| Fluggebiete | `SpotCard`, `SpotMarker` |
| Jahreskarte | `BuyBox`, `PassCard` |
| Shop | `ProductCard` (Klub-Kollektion), `ListingCard` (Gebrauchtmarkt) |
| Verwaltung | `DataTable`, `StatTile` |

Alle Werte in den Vorschauen sind **Beispieldaten** (Namen wie «Musteralp», erfundene Messwerte und Preise).

## Prototyp

Online: <https://claude.ai/artifact/PBut5RvbsVV2EpmRsedQFx> (privat – zum Teilen über das «Share»-Menü freigeben). Details, Seiten und Datenherkunft: [prototype/README.md](prototype/README.md).

## Lokal arbeiten

Voraussetzung: Node.js 18 oder neuer.

```bash
npm install
npx playwright install chromium   # nur beim ersten Mal, falls noch kein Browser installiert ist
pip install -r tools/requirements.txt   # numpy und Pillow für Kacheln und Logos
npm run tiles       # einmalig: Kartenkacheln rechnen (build/tiles/)
npm run previews    # alle Komponenten hell und dunkel als Bild nach build/previews/
npm run serve       # Prototyp bauen und auf http://localhost:8080 starten
npm run check       # Prototyp bauen und prüfen (Fehler, Überlauf, Kaufablauf, 3D-Karte)
```

`previews` und `check` brechen mit Fehlercode ab, wenn etwas nicht stimmt.

## Design-System-Artifact

Das Design-System ist zusätzlich als interaktive Seite veröffentlicht: <https://claude.ai/artifact/1pugFVqy18tDkPtWTycSYD> (privat – zum Teilen über das «Share»-Menü der Seite freigeben).

Der Ordner `design-system/` entspricht dem Ordner `project/` im Artifact. **Dieses Repository ist die Hauptquelle:** Änderungen hier machen und danach ins Artifact veröffentlichen lassen – nicht an beiden Orten parallel ändern. `tokens.css`, `manifest.json` und `api/` erzeugt die Artifact-Seite selbst; sie gehören nicht ins Repository.

## Annahmen und Vorbehalte

- Die Inhalte von gkg.ch stammen aus dem Suchindex, weil die Seite aus der Arbeitsumgebung nicht direkt erreichbar war. Bilder, Logo, Statuten, Vorstand und Kalender fehlen noch.
- Die Vermutung, dass gkg.ch auf ClubDesk läuft, beruht nur auf dem Adressmuster der Seiten.
- Angaben zu Anbietern, Gebühren, Wetterdaten und zur FlyCard Bassano sind ungeprüft und in den Dokumenten mit «prüfen» bzw. als Vermutung markiert.
- **Dieses Repository ist öffentlich.** Hier gehören nie echte Mitgliederdaten hinein – auch nicht als Test. Alle Personen in `prototype/store.js` sind erfunden.
- flightbuddyki.ch und die SHV-PDFs waren aus der Arbeitsumgebung nicht erreichbar. Die Abfrage der Stationen ist nach der Schnittstelle des BuddyServers gebaut und mit Testdaten geprüft, aber noch nie gegen den echten Dienst gelaufen.
