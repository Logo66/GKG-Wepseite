# WeatherCard

Live-Werte einer Messstation am Start- oder Landeplatz: Wind mit Richtungspfeil, Böen, Temperatur, Wolkenbasis und Flugbarkeits-Status.

**Der Consumer liefert:** `station`, `altitude`, `status`, `wind`, `gust` (km/h), `direction` (Grad, woher der Wind kommt), `temperature` (°C), optional `cloudBase` (m), `updated` («vor 4 Min.»), `source`.

- Der Pfeil zeigt, **wohin** der Wind weht; der Text darunter sagt, **woher** («aus SW»).
- Zahlen in `data-xl` (Mono, Tabellenziffern), damit sie beim Aktualisieren nicht springen.
- Quelle und Zeitstempel sind Pflicht. Ältere Werte als 30 Minuten: Status auf `caution` mit Label «Veraltet».
- Daten kommen aus einer Wetter-API (siehe Abschnitt Technik) – nie fest im Code.
