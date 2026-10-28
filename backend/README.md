# Backend (Bausteine)

Teile des künftigen GKG-Backends, die heute schon gebraucht werden. Laut Technik-Konzept wird die Website mit Next.js gebaut; die Handler nehmen deshalb einen Web-`Request` und geben eine Web-`Response` zurück und laufen ohne Anpassung als Next.js-Route, in Node 18+ oder auf einer Edge-Plattform.

## Wetter (`wetter.js`)

| Route | Was | Zwischenspeicher |
| --- | --- | --- |
| `GET /api/wetter/stationen` | Windstationen der Region von flightbuddyki.ch (FANET, Holfuy, MeteoSchweiz) | 5 min frisch, bei Ausfall bis 2 h die letzten Werte (als veraltet markiert) |
| `GET /api/wetter/prognose?platz=<id>&tag=<YYYY-MM-DD>` | Thermik-Prognose von FlightBuddyKI für einen Startplatz – nur mit Vertrag | 30 min frisch, bei Ausfall bis 6 h |

Region und Pfade sind fest – kein offener Proxy. Weitergegeben werden nur bekannte Felder; der Schlüssel für FlightBuddyKI bleibt auf dem Server.

**Einstellungen** (Umgebungsvariablen):

| Variable | Bedeutung |
| --- | --- |
| `FLIGHTBUDDYKI_URL` | Standard `https://flightbuddyki.ch` |
| `FLIGHTBUDDYKI_API_KEY` | Schlüssel von FlightBuddyKI für die Prognosen (Header `X-Buddy-Key`) |
| `GKG_PROGNOSE_AKTIV` | `1`, sobald der Vertrag läuft – sonst antwortet `/prognose` mit 404 |

**In Next.js** (z. B. `app/api/wetter/stationen/route.js`):

```js
import { createWeather } from '../../../../backend/wetter';
const weather = createWeather();
export const GET = req => weather.handle(req);
```

**Lokal:** `npm run serve` startet den Prototyp mit diesen Routen. **Tests:** `npm run test:backend`.

`prognose-spots.json` ordnet jedem GKG-Startplatz die Spot-ID bei FlightBuddyKI zu (erzeugt mit `npm run spots`, Vorschlag bis FlightBuddyKI die Spots angelegt hat).
