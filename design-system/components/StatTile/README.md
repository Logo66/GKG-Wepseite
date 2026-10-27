# StatTile

Eine Kennzahl auf dem Dashboard des Backoffice: Bezeichnung, Wert, optionale Veränderung und Kontext.

**Der Consumer liefert:** `label`, `value` (fertig formatiert), optional `delta`, `trend` (`up` | `down`), `hint`.

- Höchstens vier Kacheln pro Ressort-Dashboard – nur Zahlen, aus denen eine Handlung folgt.
- `trend` sagt nur die Richtung; ob gut oder schlecht, steht im Text.
