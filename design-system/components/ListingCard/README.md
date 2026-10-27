# ListingCard

Ein Inserat im Gebrauchtmarkt: Foto, Kategorie, Titel, Preis in CHF, Kerndaten als Chips, Verkäufer/in und Alter.

**Der Consumer liefert:** `category` (Schirm, Gurtzeug, Retter, Instrumente, Bekleidung, Diverses), `title`, `price`, `tags`, `seller` (Vorname + Initial), `posted`, optional `image`, `imageAlt`, `isNew`.

- Für Schirme Pflicht-Chips: Grösse, Gewichtsbereich, Stunden, letzter Check. Für Retter: Packdatum.
- Ohne Foto erscheint das Schirm-Symbol auf `surface-sunken`.
- «Neu» (`thermik`) nur in den ersten 48 Stunden.
- Kontakt erst nach Login – schützt die Verkäufer/innen vor Spam.
