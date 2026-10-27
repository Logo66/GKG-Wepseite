# SpotCard

Ein Fluggebiet als Karte: Name, Region, Start- und Landehöhe, geeignete Windrichtungen als Windrose, Niveau und aktueller Status.

**Der Consumer liefert:** `name`, optional `region`, `takeoff`, `landing` (m ü. M., mit Apostroph als Tausendertrenner), `directions` (z. B. `['S','SW']`), `level` (Einsteiger | Fortgeschritten | Profi), `note` (ein bis zwei Sätze), `status`, `statusLabel` (präziseres Wort, z. B. «Alpbetrieb»), `href`, `cta`, `routeHref`.

- Fehlende Werte werden weggelassen, nie geraten: ohne `directions` keine Windrose, ohne Höhen keine Höhenzeilen, ohne `routeHref` kein Route-Button.

- Die Windrose zeigt die acht Himmelsrichtungen auf Deutsch (N, NO, O, SO, S, SW, W, NW); geeignete Sektoren in `sky`.
- «Details & Regeln» führt zur Gebietsseite mit Lufträumen, Landeplatz-Regeln und Kontakt der Gebietsverantwortlichen.
- Echte Gebietsdaten pflegt das Ressort Fluggebiete im Backoffice – in diesem System stehen nur Platzhalter.
