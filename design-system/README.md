GKG ist der Auftritt des Gleitschirmklubs Glarnerland im Netz – seit 1987 einer der grössten Gleitschirmklubs der Ostschweiz: frisch, klar und luftig – so, dass junge Pilotinnen und Piloten neugierig werden und langjährige Mitglieder sich sofort zurechtfinden. Die Marke lebt von drei Dingen, die jeder vom Startplatz kennt: das Gletscherseegrün der Glarner Bergseen (`sky`), das Orange eines Schirms vor dem Himmel (`wing`) und die Limette, die man sich als Thermik-Blase vorstellt (`thermik`).

## Haltung

- **Für zwei Generationen zugleich.** Gross genug zum Lesen (Grundschrift 17px), ruhig genug zum Finden, frech genug in den Titeln. Nie das eine fürs andere opfern.
- **Sicherheit vor Show.** Wetter- und Gebietsinformationen sind sachlich, mit Quelle und Zeitstempel. Status ist eine Orientierung, nie eine Freigabe.
- **Luft ist Teil der Marke.** Viel Weissraum (`space-16` zwischen Abschnitten), wenige Elemente pro Bildschirm.

## Sprache

- **Du-Form**, herzlich und direkt: «Hol dir die Jahreskarte 2027.» – nicht «Erwerben Sie hier Ihre Jahreskarte».
- **Schweizer Rechtschreibung:** «ss» statt «ß»; Tausender mit Apostroph (1'450 m ü. M.); Beträge «CHF 40.00»; Datum 26.10.2026; Zeit 14:20.
- **Kurze Sätze, Verb zuerst** in Buttons: «Jahreskarte kaufen», «Inserat aufgeben», «Route anzeigen».
- **Fachwörter ja, Denglisch sparsam:** Thermik, Basis, Soaring, XC sind in Ordnung; «Cross-Country (XC)» beim ersten Auftreten ausschreiben.
- **Geschlechtergerecht** mit Schrägstrich: Pilot/in, Inhaber/in.
- **Keine Emojis**, keine Ausrufezeichen-Ketten, keine Superlative. Ein trockener Spruch im Hero ist erlaubt: «Ab in die Luft.»

## Farbe

- Seiten stehen auf `surface`; Karten auf `surface-raised` mit `line` als Haarlinie und `shadow-sm`. Die Karte (Map) und Eingabefelder liegen auf `surface-sunken`.
- Text ist `ink`, Nebentext `ink-muted`. Beide erreichen auf allen drei surface-Tönen in beiden Themes mindestens 5.9:1.
- `sky` ist die Primärfarbe: Primär-Buttons (Text `on-sky`), Links (`link`, immer unterstrichen), aktive Navigation (`sky-soft`).
- `wing` (Orange) ist **reserviert fürs Kaufen und Hervorheben**: der Jahreskarten-Button, «Jetzt bezahlen» im Shop-Warenkorb, ein ausgewählter Karten-Marker. Text darauf ist immer `on-wing` (dunkel). Orange als Textfarbe nur als `wing-ink` (Preise).
- `thermik` (Limette) nur als kleine Fläche mit `on-thermik`: Badge «Neu», Live-Puls. Nie als Text, nie als grosse Fläche.
- Flugbarkeit: `go` / `caution` / `stop` auf ihren `-soft`-Flächen – **immer mit Wort und Icon** (Häkchen, Ausrufezeichen, Kreuz), damit auch Farbsehschwache sicher lesen.
- QR-Codes stehen in beiden Themes auf `qr-ground` mit `qr-ink`.
- Das dunkle Theme ist vollwertig (Nachtmodus für Abendrecherche, Wallet im Dunkeln) und folgt der Systemeinstellung.

## Typografie

- Drei Familien, alle über Google Fonts: `display` (Bricolage Grotesque) für Titel, `body` (Atkinson Hyperlegible) für Lesetext und Bedienung, `mono` (IBM Plex Mono) für Messwerte und Beträge.
- Titel: `display-xl` nur im Hero, `display` für h1, `heading` für h2, `title` für Kartentitel.
- Text: `body` (17/27) als Standard, `body-lg` als Lead, `small` (15px) als kleinste Grösse für Lesetext, `label` für Badges und Feldbeschriftungen – in normaler Schreibweise, keine Versalien.
- Zahlen, die sich live ändern (Wind, Böen, Temperatur), stehen in `data-xl` mit Tabellenziffern, damit nichts springt.
- Fliesstext nie breiter als `text-width` (680px).

## Layout & Abstand

- 4px-Raster. Seitenrand `space-4` mobil, `space-8` ab Tablet; Inhalt maximal `content-width` (1200px).
- Abschnitte trennt `space-12` (mobil) bzw. `space-16`; Karten im Grid mit `space-6` Abstand.
- Mobile first: Gestaltet wird zuerst für das Handy am Startplatz. Wetter und Jahreskarte sind von der Startseite mit einem Tipp erreichbar.
- Jedes klickbare Element hat mindestens `tap-target` (44px); Buttons `control-height` (48px), der Kauf-Button `control-height-lg` (56px).

## Formen

- Weiche Radien wie eine Kappe: `radius-lg` (20px) für Karten und den Jahreskarten-Pass, `radius-md` (12px) für Buttons, `radius-sm` (6px) für Felder und Chips, `radius-full` für Status-Pillen und Marker.
- Schatten nur in zwei Stufen: `shadow-sm` für ruhende Karten, `shadow-lg` für Schwebendes (Popup, Dialog, Pass).
- Erkennungsmotiv ist die **Kappe aus Zellen**: ein Bogen aus abgerundeten Rechtecken, wie die Zellen eines Gleitschirms. Einsatz als Grafik im Hero, als Trenner oder als Lade-Animation – nie als Logo-Ersatz.

## Bilder

- Echte Fotos aus dem Club: Startplätze, Landewiesen, Menschen beim Auslegen, Packen, Lachen. Weiter Himmel, viel Horizont.
- Keine Stockfotos, keine Filter, keine Montagen. Bilder im Hero mit `radius-lg` und einem dunklen Verlauf nur dort, wo Text darüber liegt.
- Shop: Kleider getragen zeigen, draussen und von Klubmitgliedern – Freisteller vom Lieferanten nur, bis eigene Fotos da sind.
- Jedes Bild hat einen Alternativtext, der beschreibt, was zu sehen ist («Zwei Pilotinnen legen am Startplatz ihre Schirme aus»).

## Iconografie

- Für die Website-Icons empfehlen wir **Lucide** (Open Source, 24px-Raster, 2px-Linie). Bisher gibt es kein eigenes Icon-Set; die Komponenten zeichnen ihre wenigen Icons (Häkchen, Ausrufezeichen, Kreuz, Pfeil, Schirm) selbst mit `currentColor` – sie erben damit die Textfarbe.
- Windrichtungen auf Deutsch: N, NO, O, SO, S, SW, W, NW.
- Keine Emojis als Icons.

## Logo

- Das bestehende Logo von gkg.ch ist **noch nicht übernommen**: Die Texte der Seite liessen sich lesen, die Bilddateien nicht. Bis das Logo als Vektordatei (SVG) vorliegt, steht die Wortmarke «GKG» in `display` (Bricolage Grotesque, Gewicht 800) mit «Gleitschirmklub Glarnerland» in `label` daneben.
- Das Logo kommt als Asset-Gruppe «Logos» in dieses System, sobald es vorliegt – nie nachzeichnen. Für die Klub-Kollektion braucht es zusätzlich eine einfarbige Version für Druck und Stickerei.

## Bewegung

- Sparsam und kurz (120–200 ms): Hover, Button-Druck, Öffnen eines Popups.
- Live-Werte blenden weich über, statt zu springen. `prefers-reduced-motion` schaltet alle Animationen ab.

## Barrierefreiheit

- Ziel WCAG 2.2 AA: Text mindestens 4.5:1, Bedienelement-Rahmen (`line-strong`) und Fokus mindestens 3:1 – in beiden Themes geprüft.
- Fokus ist `focus-ring`: 2px Abstand in Seitenfarbe, dann 3px `sky`. Nie entfernen.
- Status nie nur über Farbe; Formulare mit sichtbaren Labels über dem Feld, Fehler in `stop` mit Text.
- Die interaktive Karte hat immer eine Listen-Alternative mit denselben Fluggebieten.

## Komponenten nutzen

Die Komponenten liegen in `components/bundle.js` als `window.GKG` (React 18), das Styling in `components/bundle.css` (lädt auch die drei Google Fonts) auf Basis von `tokens.css`. Klassen beginnen mit `gkg-`. Öffentliche Seiten: `SiteHeader`, `Button`, `FlightStatus`, `WeatherCard`, `SpotCard`, `SpotMarker`, `BuyBox`, `PassCard`, `ProductCard` (Klub-Shop), `ListingCard` (Gebrauchtmarkt). Backoffice: `DataTable` (mit `DataTable.Role`) und `StatTile`. Alle Werte in den Vorschauen sind Beispieldaten.
