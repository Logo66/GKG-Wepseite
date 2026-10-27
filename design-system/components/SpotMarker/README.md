# SpotMarker

Der Marker eines Fluggebiets auf der interaktiven Karte: Tropfenform in Statusfarbe mit Icon und Namensschild.

**Der Consumer liefert:** `label`, `status`, `active` (ausgewählt), `onClick`. Die Positionierung übernimmt die Karten-Bibliothek (z. B. als HTML-Marker in MapLibre oder Leaflet).

- Ausgewählt: grösser und mit `wing`-Rand; öffnet ein Popup mit der SpotCard.
- Jeder Marker ist ein `<button>` – per Tastatur erreichbar, mit Status im Screenreader-Text.
- Startplätze und Landeplätze unterscheiden sich im Icon, nicht nur in der Farbe (Erweiterung in Phase 2).
