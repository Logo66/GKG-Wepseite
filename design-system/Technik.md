# Technik

Ein Vorschlag für den technischen Aufbau. Anbieter und Konditionen ändern sich – alles mit «prüfen» muss vor dem Entscheid in Phase 0 aktuell abgeklärt werden.

## Architektur

| Baustein | Vorschlag | Warum |
| --- | --- | --- |
| Frontend | Next.js (React) | nutzt die GKG-Komponenten dieses Systems direkt; Seiten werden serverseitig erzeugt – schnell und gut für Suchmaschinen |
| Datenbank | PostgreSQL mit Row-Level-Security (z. B. Supabase oder ein Schweizer Hoster) | Ressort-Rechte werden in der Datenbank erzwungen, nicht nur in der Oberfläche |
| Anmeldung | E-Mail-Link oder Passkey; Zwei-Faktor für alle Backoffice-Rollen | kein Passwort-Chaos für Mitglieder, starker Schutz für den Vorstand |
| Zahlung | Payrexx oder Stripe (beide bieten laut Anbieter TWINT an; Gebühren prüfen) | TWINT ist in der Schweiz Pflicht; Kartendaten liegen nie bei uns |
| Wallet | Apple Wallet (.pkpass) und Google Wallet API | QR-Karte direkt im Handy, ohne eigene App |
| Karte | MapLibre GL 5 mit 3D-Gelände (siehe unten) | Open Source, schnell, läuft im Browser ohne Plugin; swisstopo-Daten sind seit 2021 frei nutzbar (Nutzungsbedingungen prüfen) |
| Wetter | serverseitiger Abruf, Zwischenspeicher alle ~10 Min. | schont Schnittstellen-Kontingente, Seite bleibt schnell |
| Hosting | Schweiz oder EU, tägliche Backups | Datenschutz (revDSG) |

## 3D-Karte der Fluggebiete

**Heute im Prototyp:** MapLibre GL 5.24 mit 3D-Gelände (1,3-fach überhöht), Himmel und Dunst, Marker für 11 Start- und 4 Landeplätze, 2D/3D-Umschalter, Gebiete anfliegen, Infopanel mit Höhe, Startrichtung, Koordinaten (WGS84 und LV95) und Quelle.

- **Gelände:** offene Höhendaten «Terrain Tiles» auf AWS (Mapzen/Tilezen, in Europa u. a. EU-DEM © Copernicus), etwa 30 m Auflösung.
- **Bild:** ein eigenes schattiertes Relief mit Höhenstufen und Seen, aus denselben Höhendaten gerechnet (`tools/build-tiles.py`).
- **Kachel-Ringe:** aussen grob, innen fein (z8–11 weit herum, z12 Glarnerland, z13 rund um die Plätze). So endet das Gelände nicht sichtbar am Horizont, und die Datenmenge bleibt klein: Relief 1,0 MB, Höhen 11 MB, wovon jeweils nur die sichtbaren Kacheln geladen werden.

**So lädt sie schnell:**
- MapLibre (rund 1 MB) wird erst geladen, wenn jemand die Fluggebiete öffnet – die Startseite bleibt leicht.
- Bis die Karte bereit ist, steht ein Standbild der Startansicht da (67 KB, hell und dunkel, `npm run poster`).
- Reliefkacheln als WebP (meist 2–10 KB pro Kachel), Höhen nur bis z11.
- Auf dem Handy verschiebt man mit zwei Fingern (Seite bleibt scrollbar), am Desktop zoomt man mit Strg + Mausrad.
- Ohne WebGL oder bei einem Ladefehler erscheint das Schema der Gebiete mit Hinweis.
- Im Test (Software-Grafik ohne GPU) ist die Karte nach 2–4 Sekunden bedienbar; auf echten Geräten mit Grafikchip ist sie schneller (nicht gemessen).

**Für den Live-Betrieb (zu prüfen):**
- **Luftbild statt Relief:** swisstopo SWISSIMAGE über den WMTS-Dienst `wmts.geo.admin.ch` (Web-Mercator) – im Modul vorbereitet mit `window.GKG_MAP_CONFIG = { imagery: 'swisstopo' }`, aber nicht getestet, weil swisstopo aus der Arbeitsumgebung gesperrt war. Nutzungsbedingungen und Quellenangabe «© swisstopo» beachten.
- **Feinere Höhen:** swissALTI3D von swisstopo ist viel genauer als 30 m; ob es dafür einen fertigen Kacheldienst für MapLibre gibt, ist offen. Sonst die Höhenkacheln einmalig selbst aus swissALTI3D erzeugen.
- **Lufträume, Hindernisse, Schutzgebiete** als zusätzliche Ebenen (z. B. Wildruhezonen am Hirzli) – Datenquellen beim SHV und bei swisstopo/BAZL abklären.

## Wetterdaten

- **Quelle: flightbuddyki.ch.** Der BuddyServer von Flight Buddy KI bündelt Windstationen aus drei Netzen und liefert sie über einen öffentlichen Endpunkt ohne Schlüssel: `GET /api/v1/weather/stations?lat=&lon=&radius_km=&sources=fanet,holfuy,swissmetnet`. Pro Station: Name, Position, Höhe, Windrichtung, Wind und Böen (m/s), Temperatur, Alter der Messung. Der Prototyp fragt einen Umkreis von 35 km um Glarus ab (`prototype/stations.js`).
  - **FANET:** WindBuddy-Stationen, die über Funk (FANET) senden.
  - **Holfuy:** verbreitete Windstationen an Startplätzen. Ob die Werte auf gkg.ch öffentlich gezeigt werden dürfen, mit Holfuy bzw. den Stationsbesitzern klären.
  - **SwissMetNet:** Messnetz von MeteoSchweiz (Open Data). Pflicht: «Quelle: MeteoSchweiz» neben den Werten.
- **Browser-Zugriff (CORS):** Der BuddyServer beantwortet Browser-Anfragen nur von freigegebenen Adressen (Umgebungsvariable `CORS_EXTRA_ORIGIN`). Zwei Wege:
  - **Empfohlen – über das GKG-Backend:** Das Backend holt die Stationen alle paar Minuten serverseitig, speichert sie zwischen und liefert sie an die Website. Vorteile: eine Anfrage statt einer pro Besucher, die Website zeigt bei einem Ausfall die letzten Werte mit Zeitstempel, und der BuddyServer muss nichts freigeben.
  - **Direkt aus dem Browser:** `https://www.gkg.ch` beim BuddyServer in `CORS_EXTRA_ORIGIN` aufnehmen. Das entscheidet der Betreiber des BuddyServers; im Rahmen dieser Website wurde dort nichts geändert.
- **Prototyp:** versucht die Live-Abfrage und zeigt sonst klar markierte Beispielwerte («Beispielwerte», gestrichelte Stationen auf der Karte). Als Artifact sind externe Abfragen gesperrt, dort erscheinen immer die Beispielwerte.
- **Ampel nur zur Orientierung:** vorläufige Schwellen in `stations.js` (Böen ab 25 km/h oder 15 km/h über dem Mittelwind «Böig», ab 28 km/h Wind oder 35 km/h Böen «Starker Wind», älter als 30 Minuten «Veraltet»). Die Werte legt das Ressort Sicherheit fest; die Entscheidung zu starten liegt immer bei der Pilotin oder dem Piloten.
- **Bestehende Quellen:** Ob die klubeigene Station Obere Bogmen und die Windstation Braunwald schon über flightbuddyki.ch kommen, prüfen; sonst ergänzen oder verlinken.
- **Prognosen:** Spezialdienste (MeteoSchweiz, Windy, Burnair, skybriefing) werden verlinkt statt nachgebaut.

## SHV-Infotafeln

- Ein Tipp auf einen Start- oder Landeplatz öffnet ein Pop-up: Eckdaten des Platzes, Wind der nächsten Station (bis 6 km), die SHV-Infotafel des Gebiets mit einem Auszug der Regeln und der Link zum offiziellen PDF auf shv-fsvl.ch. Elm hat laut unserem Stand keine Tafel; das Pop-up sagt das.
- **Massgebend ist immer die aktuelle Tafel des SHV.** Der Auszug in `prototype/data.js` (`shv`) ist von Hand gepflegt; das Ressort Fluggebiete prüft ihn vor dem Go-Live und bei jeder neuen Tafel.
- **Vorschaubild:** `tools/fetch-shv.py` lädt die drei PDFs und rechnet die erste Seite in ein WebP um (`pdftoppm`); der Build bindet die Bilder ein, wenn sie vorhanden sind. Ob wir Bilder der Tafeln auf gkg.ch zeigen dürfen, vorher beim SHV nachfragen – bis dahin bleibt es beim Link aufs PDF.
- **Aktualität:** Das Backend prüft die PDFs regelmässig (z. B. wöchentlich über `Last-Modified`) und meldet Änderungen dem Ressort Fluggebiete.

## Jahreskarte, QR und Wallet

- **Nur Jahreskarten:** ein Kartentyp, Gültigkeit je nach Entscheid Saison, Kalenderjahr oder 365 Tage ab Kauf. Aktivmitglieder erhalten die Karte automatisch mit dem bezahlten Beitrag.
- **Profil mit Foto (wie FlyCard Bassano):** Das Foto liegt im Profil, nicht im QR-Code. Der Scanner lädt es nach dem Scan vom Server und zeigt es gross an; im Wallet-Pass erscheint es als kleines Bild.
- **QR-Inhalt:** nur Kartennummer + kryptografische Signatur (z. B. Ed25519). Keine Namen, keine Adressen im Code. Fälschen ist ohne den geheimen Schlüssel nicht möglich.
- **Prüfung:** Die Scanner-Web-App prüft online gegen die Datenbank (so wirken Sperrungen sofort); fällt das Netz am Startplatz aus, prüft sie zumindest die Signatur offline.
- **Apple Wallet:** Mitgliedschaft im Apple Developer Program nötig (derzeit USD 99 pro Jahr nach meinem Stand; für gemeinnützige Organisationen gibt es ein Gesuch um Gebührenerlass – Berechtigung prüfen). Daraus ein Pass-Type-Zertifikat; der Server signiert jede .pkpass-Datei. Für Updates (Sperrung) braucht es einen kleinen Web-Service nach Apple-Vorgabe.
- **Google Wallet:** Herausgeber-Konto in der Google Pay & Wallet Console; Pässe werden per Schnittstelle als «Generic Pass» erstellt und über einen «Speichern»-Link ausgeliefert.
- **Alternative:** Ein Wallet-Dienst (SaaS) übernimmt Zertifikate und Updates gegen eine monatliche Gebühr – weniger Aufwand, laufende Kosten.
- **Gestaltung:** Kopfzeile in `sky` mit «GKG», Felder wie in der PassCard, QR schwarz auf weiss.

## Mitglieder und Buchhaltung – Eigenbau oder Vereinssoftware?

In der Schweiz gibt es fertige Vereinslösungen für Mitglieder und Buchhaltung (z. B. ClubDesk, Webling). Eigenbau lohnt sich vor allem dort, wo es nichts Passendes gibt.

**Vermutung:** gkg.ch läuft heute auf ClubDesk (das Adressmuster `?b=…&c=ND…` passt dazu). Falls ja, sind Mitgliederdaten und eventuell Rechnungen schon dort erfasst – dann ist der Export aus ClubDesk der erste technische Schritt, egal welche Variante gewählt wird.

| Variante | Selbst gebaut | Eingekauft |
| --- | --- | --- |
| A – alles aus einer Hand | Website, Jahreskarte, Shop, Gebrauchtmarkt, Mitglieder, Buchhaltung | – |
| B – Kombination | Website, Jahreskarte, Shop, Gebrauchtmarkt, Ressort-Zugänge | Mitglieder und/oder Buchhaltung in Vereinssoftware, angebunden über Schnittstelle oder Export (Möglichkeiten je Produkt prüfen) |

**Prototyp (Variante A zum Ausprobieren):** `#verwaltung` zeigt Mitglieder mit Anträgen, Beitragslauf und Rechnungen mit QR-Zahlteil, Mahnungen, ein Buchungsjournal mit Erfolgsrechnung und Bilanz, Jahreskarten mit Sperren sowie die Rechte-Matrix. `#mein-gkg` ist die Selbstverwaltung der Mitglieder. Beide arbeiten auf derselben Datenhaltung (`prototype/store.js`, im Browser gespeichert): Zahlt ein Mitglied online, ist die Rechnung bezahlt, die Buchung im Journal und – bei Aktivmitgliedern – die Jahreskarte ausgestellt. Alle Personen und Beträge sind erfunden.

- **Annahmen in der Buchhaltung:** Geschäftsjahr = Kalenderjahr; Beiträge werden bei Zahlungseingang gebucht (Einnahmen-Ausgaben-Prinzip). Für Vereine ohne Pflicht zum Handelsregistereintrag verlangt Art. 957 Abs. 2 OR nur eine Buchhaltung über Einnahmen, Ausgaben und Vermögenslage – wie der GKG heute bucht und welcher Kontenplan gilt, klärt die Kasse.
- **QR-Rechnung:** Die Referenz trägt die Prüfziffer nach Modulo 10 rekursiv. Für echte QR-Referenzen braucht der Klub eine QR-IBAN von seiner Bank; der Zahlteil im Prototyp ist ein Muster.

Empfehlung: Entscheid in Phase 0, nachdem geklärt ist, womit der Club heute arbeitet. Bei Variante A umfasst die Buchhaltung: Kontenplan für Vereine, Buchungen mit Beleg-Upload, automatische Buchung jeder Kartenzahlung, Beitragsrechnungen als Schweizer QR-Rechnung, Jahresabschluss und Export (Excel/CSV) für die Revision.

## Klub-Shop

- **Im selben System:** Artikel mit Varianten (Farbe, Grösse), Lagerbestand pro Variante, Warenkorb, Bestellstatus (bezahlt, in Produktion, versandt, abgeholt). Gleiches Login, gleicher Zahlungsanbieter, automatische Buchung – darum empfehlen wir keinen separaten Online-Shop-Dienst.
- **Sammelbestellung:** Artikel tragen einen Stichtag; danach erzeugt das Backoffice eine Bestellliste pro Variante für den Textildrucker.
- **Versand:** Porto als feste Pauschale oder gratis Abholung; Adressetiketten aus dem Backoffice.
- **Alternative:** Ein fertiger Shop-Dienst wäre schneller eingerichtet, hätte aber eigenes Login, eigene Zahlung und keine automatische Buchung in der Klub-Buchhaltung.
- **Mehrwertsteuer:** Ob der Klub mit Shop-Umsätzen MWST-pflichtig wird, hängt vom Gesamtumsatz ab – für ehrenamtlich geführte, nicht gewinnorientierte Sportvereine gilt meines Wissens eine höhere Umsatzgrenze. Mit der Revision bzw. Treuhand prüfen.

## Rollen und Rechte

- Benutzer ↔ Rollen ↔ Berechtigungen; Rollen entsprechen den Ressorts im Projektplan.
- **Vorschlag (im Prototyp umgesetzt, `store.js`):** Präsidium liest Mitglieder, Finanzen und Karten. Aktuariat bearbeitet Mitglieder und entscheidet Anträge, sieht aber keine Buchhaltung. Kasse bearbeitet Rechnungen und Buchhaltung und sieht von den Mitgliedern nur Name und Adresse. Ressort Fluggebiete sperrt und entsperrt Jahreskarten. Revision liest die Finanzen. Webmaster verwaltet Rollen und sieht das ganze Protokoll.
- Anmeldung mit persönlichem E-Mail-Link; für Kasse und Webmaster zusätzlich ein zweiter Faktor.
- Durchsetzung in der Datenbank (Row-Level-Security): Auch ein Fehler in der Oberfläche gibt keine fremden Daten preis.
- Protokoll (Audit-Log): Wer hat wann was geändert – wichtig für Kasse und Jahreskarten.
- Ressortwechsel an der GV: Rollen werden umgehängt, keine Zugangsdaten weitergegeben.

## Datenschutz und Sicherheit

- Das revidierte Datenschutzgesetz (revDSG) gilt seit 1. September 2023: verständliche Datenschutzerklärung, nur nötige Daten, Auskunft und Löschung auf Anfrage.
- Zahlungsdaten speichern wir nie – sie bleiben beim Zahlungsanbieter.
- Gebrauchtmarkt: Kontaktangaben nur für angemeldete Personen sichtbar.
- Profilfotos sehen nur die Person selbst, das Ressort Jahreskarten und – nach einem Scan – die Kontrolle; Fotos werden gelöscht, wenn das Profil gelöscht wird.
- Regelmässige Updates, tägliche Backups mit Wiederherstellungstest vor dem Go-Live.

## Laufende Kosten (zu beziffern in Phase 0)

- Hosting und Datenbank
- Apple Developer Program (jährlich) bzw. Wallet-Dienst
- Transaktionsgebühren je Zahlung (je nach Anbieter und Zahlart)
- E-Mail-Versand
- Porto und Versandmaterial für den Shop
- Domain gkg.ch (bleibt bestehen)
