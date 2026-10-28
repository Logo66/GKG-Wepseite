# Option: Thermik-Prognosen von FlightBuddyKI für alle Klubgebiete

**Stand:** 28.10.2026 · **Status:** Vorschlag, vom Vorstand noch nicht beschlossen · **Betrag:** offen (Angebot von FlightBuddyKI ausstehend)

## Idee

Der GKG zahlt FlightBuddyKI eine **Jahrespauschale**. Dafür zeigt gkg.ch an allen Startplätzen des Klubs eine Thermik-Prognose für heute und die nächsten vier Tage. Mitglieder und Gäste sehen sie im Pop-up jedes Startplatzes (Fluggebiete-Karte und Gebietsseiten). Im Prototyp ist das mit Beispielwerten zu sehen.

## Leistung (Vorschlag)

- Prognose für die **11 Startplätze** des GKG; neue Startplätze kommen ohne Aufpreis dazu.
- Stündlich von 9 bis 18 Uhr: stärkstes Steigen (m/s), Obergrenze der Thermik, Wolkenbasis, Einschätzung (keine Thermik bis sehr gut), Wind in der Aufwindschicht, Föhnrisiko und Warnungen mit Zeitfenster.
- Heute und die nächsten 4 Tage, aktualisiert mit jedem Rechenlauf von FlightBuddyKI.
- Hinweis zur Klassifikation und Quellenangabe der Wetterdaten in jeder Antwort.

## Schnittstelle – besteht bereits auf dem BuddyServer

`GET https://flightbuddyki.ch/api/v1/weather/thermik/spot/{spot_id}?date=YYYY-MM-DD`

Antwort (Auszug): `spot_id`, `name`, `date`, `algorithm_version`, `classification_disclaimer`, `slots[]` mit je

| Feld | Bedeutung |
| --- | --- |
| `valid_at` | Zeitpunkt (UTC) |
| `climb_rate_ms_max` | stärkstes Steigen in m/s |
| `climb_top_m` | Obergrenze der Thermik, m ü. M. |
| `lcl_m` | Kondensationsniveau (Wolkenbasis), m ü. M. |
| `quality_class` | `null`, `schwach`, `mittel`, `gut`, `sehr_gut` – Definition von FlightBuddyKI |
| `tagestyp` | `regen`, `grenzlastig`, `xc`, `hobby` |
| `foehn_risk`, `wind_aufwindschicht_kmh` | Föhnrisiko, Wind in der Aufwindschicht |
| `warnings[]` | `type`, `severity` (`info` … `danger`), `title`, `text`, Zeitfenster |

Quelle: Code des BuddyServers (`modules/weather/thermik/api.py`, `models.py`). Die Schnittstelle rechnet heute bis 5 Tage voraus und ist derzeit öffentlich. Für das Klub-Angebot würde FlightBuddyKI dem GKG einen eigenen Schlüssel geben (Header `X-Buddy-Key`, wie im BuddyServer vorgesehen).

## Startplätze als Spots

`docs/flightbuddyki-spots.json` enthält die 11 Startplätze im Spot-Format des BuddyServers (`SpotConfig`): Position, Starthöhe, Ausrichtung, erlaubte Windrichtungen, relevante Höhenschicht. Erzeugt mit `npm run spots` aus `prototype/data.js`. Die IDs `gkg-<platz>` sind ein Vorschlag; `backend/prognose-spots.json` ordnet sie den GKG-Plätzen zu.

- Bei Froni ist die Startrichtung unbekannt; `aspect_deg` ist dort ein Platzhalter.
- Plätze mit dem Hinweis «noch zu bestätigen» (Froni, Obere Bogmen, Hirzli, Ämpächli) vor dem Anlegen mit dem Ressort Fluggebiete prüfen.

## Einbindung bei gkg.ch

- **Server statt Browser:** `backend/wetter.js` holt die Prognose unter `/api/wetter/prognose?platz=<id>&tag=<YYYY-MM-DD>` serverseitig.
  - Zwischenspeicher 30 Minuten.
  - Bei einem Ausfall bis 6 Stunden die letzten Werte, als veraltet markiert.
  - Der Schlüssel bleibt auf dem Server.
- **Einschalten:**

  ```
  GKG_PROGNOSE_AKTIV=1
  FLIGHTBUDDYKI_API_KEY=<Schlüssel von FlightBuddyKI>
  FLIGHTBUDDYKI_URL=https://flightbuddyki.ch   (Standard)
  ```

  Ohne `GKG_PROGNOSE_AKTIV=1` antwortet die Route mit 404 und gkg.ch zeigt keine Prognose.
- **Lokal ausprobieren:** `GKG_PROGNOSE_AKTIV=1 FLIGHTBUDDYKI_API_KEY=… npm run serve`. Der Prototyp holt dann echte Prognosen statt Beispielwerte.
- **Tests:** `npm run test:backend` – Schlüssel nie im Browser, nur bekannte Felder werden weitergegeben, Tag-Fenster wird geprüft.
- **Verwaltung:** Unter «Verträge & Dienste» markiert das Präsidium den Vertrag als beschlossen, und die Kasse verbucht die Pauschale (Konto 5350 Wetterdienste und Prognosen).

## Punkte für das Angebot und den Vertrag

| Punkt | Vorschlag |
| --- | --- |
| Preis | Jahrespauschale für alle Klubgebiete, Betrag gemäss Angebot |
| Laufzeit | Kalenderjahr, jährlich kündbar (z. B. 3 Monate vor Ablauf) |
| Umfang | alle Startplätze des GKG, neue ohne Aufpreis |
| Verfügbarkeit | bestmöglich; Ausfälle zeigt gkg.ch als Hinweis, kein Anspruch auf Rückerstattung bei kurzen Unterbrüchen |
| Haftung | Die Prognose ist eine Entscheidungshilfe; die Entscheidung zu starten liegt immer bei der Pilotin oder dem Piloten. Dieser Hinweis steht auf gkg.ch bei jeder Prognose. |
| Datenschutz | Es fliessen keine Personendaten: gkg.ch fragt nur Platz und Tag ab, serverseitig. |
| Quellen und Lizenzen | Angaben zu Wetterdaten und Berechnung liefert FlightBuddyKI in jeder Antwort; gkg.ch zeigt sie an. |

## Offene Punkte

- **Betrag** der Jahrespauschale – Angebot von FlightBuddyKI.
- **Lizenz der Wetterdaten:** Laut Schnittstelle stammen die Daten aus «ICON-D2 via Open-Meteo (CC BY 4.0)». Nach meinem Kenntnisstand ist die kostenlose Schnittstelle von Open-Meteo nur für nicht-kommerzielle Nutzung gedacht. Ob ein bezahltes Angebot an den Klub eine kommerzielle Lizenz braucht, klärt FlightBuddyKI vor Vertragsabschluss.
- **Spots anlegen** (IDs aus `docs/flightbuddyki-spots.json`) und Schlüssel für den GKG ausstellen – auf Seite FlightBuddyKI.
- **Ausstand:** Gehört jemand aus dem Vorstand zu FlightBuddyKI, tritt die Person beim Entscheid in den Ausstand.
- **Darstellung** mit dem Ressort Sicherheit abstimmen: welche Warnungen hervorgehoben werden, welche Schwellen gelten.
