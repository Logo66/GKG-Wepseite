# Button

Ein Button pro Absicht: `primary` (sky) für die Hauptaktion einer Seite, `wing` (orange) nur für Kaufen/Bezahlen, `quiet` für Nebenaktionen, `ghost` für Links mit Button-Funktion.

**Der Consumer liefert:** `children` (Verb zuerst: «Jahreskarte kaufen», nicht «Hier klicken»), `variant`, optional `size="lg"`, `href` (rendert dann ein `<a>`), `icon` (`check`, `arrow`, `alert`, `cross`, `wing`).

- Mindesthöhe `control-height` (48px), Kauf-Button `control-height-lg` (56px).
- Pro Bildschirm höchstens ein `wing`-Button.
- Text auf `wing` ist immer `on-wing` (dunkel) – nie Weiss auf Orange.
- Fokus: `focus-ring`. Deaktiviert nur mit erklärendem Text daneben.
