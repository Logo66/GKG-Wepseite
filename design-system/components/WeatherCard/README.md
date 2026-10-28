# WeatherCard

Live-Werte einer Messstation am Start- oder Landeplatz: Wind mit Richtungspfeil, Böen, Temperatur, Wolkenbasis und Flugbarkeits-Status.

**Der Consumer liefert:** `station`, `altitude`, `status`, optional `statusLabel` («Böig», «Veraltet»), `wind`, `gust` (km/h), `direction` (Grad, woher der Wind kommt), `temperature` (°C), optional `cloudBase` (m), `updated` («vor 4 Min.»), `source`, `live` (`false` bei Beispielwerten).

- Fehlt ein Messwert, steht «–»; ohne Richtung entfällt der Pfeil. Nie einen Wert schätzen.
- Mit `live={false}` steht «Beispielwerte» statt «Live», und der Puls entfällt – Beispiele dürfen nie wie Messwerte aussehen.

- Der Pfeil zeigt, **wohin** der Wind weht; der Text darunter sagt, **woher** («aus SW»).
- Zahlen in `data-xl` (Mono, Tabellenziffern), damit sie beim Aktualisieren nicht springen.
- Quelle und Zeitstempel sind Pflicht. Ältere Werte als 30 Minuten: Status auf `caution` mit Label «Veraltet».
- Daten kommen von `flightbuddyki.ch/api/v1/weather/stations` (FANET/WindBuddy, Holfuy, SwissMetNet) – nie fest im Code. Quelle immer nennen; MeteoSchweiz-Daten verlangen die Angabe «Quelle: MeteoSchweiz».
