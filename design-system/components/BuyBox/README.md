# BuyBox

Das Kaufangebot der Jahreskarte: Titel, Preis, was drin ist, der orange Kauf-Button und die Zahlungsarten.

**Der Consumer liefert:** `title`, `price` (Zahl, formatiert als `40.00`), `currency` (Standard CHF), `per`, `perks` (2–4 kurze Sätze), `methods` (Text-Chips), `onBuy`, optional `badge`, `note` (eine Zeile unter den Zahlungsarten).

- Preise immer mit zwei Nachkommastellen und «CHF» davor: CHF 40.00.
- Zahlungsarten als neutrale Text-Chips. Für TWINT, Apple Pay und Google Pay im Live-Betrieb die offiziellen Logos gemäss den Richtlinien der Anbieter verwenden.
- Auf der Jahreskarte steht als `note` immer der Mitglieder-Hinweis: «Für Aktivmitglieder gratis. Für CHF 70 Mitglied werden – Karte inklusive.» So wird der Kauf zur Einladung in den Klub.
- Nach dem Kauf: direkt die PassCard zeigen, nicht nur eine Bestätigungsseite.
