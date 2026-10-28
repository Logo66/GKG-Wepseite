# DataTable

Die Tabelle des Backoffice für Mitglieder, Zahlungen, Jahreskarten und Inserate – ruhig, gut lesbar, mit Status-Pillen und Ressort-Chips.

**Der Consumer liefert:** `columns` (`key`, `label`, optional `align: 'right'`, `render(row)`), `rows` (mit `id`), optional `caption`, optional `stack`. Für Ressorts `GKG.DataTable.Role`.

- Beträge und Nummern rechtsbündig in Mono (`align: 'right'`).
- Mit `stack` wird unter 600 px jede Zeile zur Karte: Spaltenname links, Wert rechts – kein seitliches Wischen, der Status bleibt sichtbar. ARIA-Rollen halten die Tabelle für Screenreader lesbar.
- Zustände mit `FlightStatus` und eigenem Label («Gültig», «Offen», «Gesperrt»).
- Filter, Suche und Export (CSV/Excel) sitzen über der Tabelle; Paginierung ab 50 Zeilen.
- Jede Ansicht zeigt nur, was das eigene Ressort sehen darf (siehe Abschnitt Technik: Rollen).
