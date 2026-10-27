# GKG Website

Neuaufbau von [gkg.ch](https://www.gkg.ch/) für den **Gleitschirmklub Glarnerland**: modern, frisch, für junge und erfahrene Pilot/innen. Alles von der bestehenden Seite wird übernommen und neu aufgebaut, dazu kommen Jahreskarte mit Wallet-QR, Klub-Shop, Gebrauchtmarkt und ein Backoffice mit eigenem Zugang pro Ressort.

## Stand

| | |
| --- | --- |
| Phase | 0/1 – Klärung und Design. Noch kein Code der eigentlichen Website. |
| Fertig | Design-System (Farben, Schrift, Abstände, 12 Komponenten mit Vorschau), Projektplan, Technik-Konzept |
| Als Nächstes | Offene Fragen mit dem Vorstand klären, Export aus der heutigen Seite (vermutlich ClubDesk), Logo als SVG, Klick-Prototyp |

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
    Cover/preview.html  Titelbild des Design-Systems
docs/
  Quellen.md            Woher die Inhalte stammen (gkg.ch, FlyCard Bassano)
tools/
  render-previews.js    Rendert alle Vorschauen hell und dunkel als Bild
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

## Vorschauen lokal ansehen

Voraussetzung: Node.js 18 oder neuer.

```bash
npm install
npx playwright install chromium   # nur beim ersten Mal, falls noch kein Browser installiert ist
npm run previews
```

Danach liegen alle Komponenten als Bild und HTML in `build/previews/` (je `<Name>.light.png` und `<Name>.dark.png`). Der Befehl bricht mit Fehlercode ab, wenn eine Vorschau einen JavaScript-Fehler wirft.

## Design-System-Artifact

Das Design-System ist zusätzlich als interaktive Seite veröffentlicht: <https://claude.ai/artifact/1pugFVqy18tDkPtWTycSYD> (privat – zum Teilen über das «Share»-Menü der Seite freigeben).

Der Ordner `design-system/` entspricht dem Ordner `project/` im Artifact. **Ab jetzt ist dieses Repository die Hauptquelle:** Änderungen hier machen und danach ins Artifact veröffentlichen lassen – nicht an beiden Orten parallel ändern. `tokens.css`, `manifest.json` und `api/` erzeugt die Artifact-Seite selbst; sie gehören nicht ins Repository.

## Annahmen und Vorbehalte

- Die Inhalte von gkg.ch stammen aus dem Suchindex, weil die Seite aus der Arbeitsumgebung nicht direkt erreichbar war. Bilder, Logo, Statuten, Vorstand und Kalender fehlen noch.
- Die Vermutung, dass gkg.ch auf ClubDesk läuft, beruht nur auf dem Adressmuster der Seiten.
- Angaben zu Anbietern, Gebühren, Wetterdaten und zur FlyCard Bassano sind ungeprüft und in den Dokumenten mit «prüfen» bzw. als Vermutung markiert.
