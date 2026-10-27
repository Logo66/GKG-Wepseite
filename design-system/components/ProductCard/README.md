# ProductCard

Ein Artikel im Klub-Shop (Kleider und Accessoires mit Klub-Logo): Foto, Name, Preis, Farbwahl, Grössenwahl und «In den Warenkorb».

**Der Consumer liefert:** `name`, `price`, optional `line` (z. B. «Klub-Kollektion»), `image`/`imageAlt`, `badge`, `colors` (`{ name, value }` – `value` ist die echte Textilfarbe als Hex, kein Token), `sizes`, `soldOut` (ausverkaufte Grössen), `hint` (Lieferung/Abholung), `onAdd({ color, size })`.

- Der Button ist `primary` (sky), nicht `wing`: In einem Raster stehen viele Artikel, und `wing` gibt es pro Bildschirm nur einmal – im Warenkorb beim «Jetzt bezahlen».
- Ohne gewählte Grösse heisst der Button «Grösse wählen» und ist gesperrt; ausverkaufte Grössen sind durchgestrichen und gestrichelt, nicht nur blasser.
- Farben haben immer einen Namen («Gletscher», «Nacht») – sichtbar über der Auswahl und für Screenreader.
- Produktfotos zeigen die Kleider getragen, draussen, von Klubmitgliedern – keine Freisteller vom Lieferanten, sobald eigene Fotos da sind.
