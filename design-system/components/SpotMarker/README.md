# SpotMarker

Der Marker eines Fluggebiets auf der interaktiven Karte: Tropfenform in Statusfarbe mit Icon und Namensschild.

**Der Consumer liefert:** `label`, `status`, `kind` (`start` oder `landing`; ohne Angabe ein ganzes Fluggebiet), `active` (ausgewählt), `onClick`, optional `onFocus`, `className`. Die Positionierung übernimmt die Karten-Bibliothek (z. B. als HTML-Marker in MapLibre oder Leaflet).

- Ausgewählt: grösser und mit `wing`-Rand; öffnet ein Popup mit der SpotCard.
- Jeder Marker ist ein `<button>` – per Tastatur erreichbar, mit Status im Screenreader-Text.
- Startplätze sind Tropfen in Statusfarbe, Landeplätze runde Marker in `ink` mit einem «L» – sie unterscheiden sich in Form und Icon, nicht nur in der Farbe.
- Auf der 3D-Karte sitzt die Spitze des Tropfens bzw. die Mitte des Landemarkers genau auf der Koordinate.
