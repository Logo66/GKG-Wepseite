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
| Karte | MapLibre GL oder Leaflet mit swisstopo-Kartendaten | swisstopo-Daten sind seit 2021 frei nutzbar (Nutzungsbedingungen prüfen) |
| Wetter | serverseitiger Abruf, Zwischenspeicher alle ~10 Min. | schont Schnittstellen-Kontingente, Seite bleibt schnell |
| Hosting | Schweiz oder EU, tägliche Backups | Datenschutz (revDSG) |

## Wetterdaten

- **Bestehende Quellen zuerst:** Die heutigen «Windwerte» von gkg.ch, die klubeigene Station Obere Bogmen und die Webcams und Windstation von braunwald.ch werden übernommen – Datenzugang mit den Betreibern klären.
- **MeteoSchweiz Open Data:** Laut MeteoSchweiz werden Mess- und Prognosedaten seit 2025 schrittweise frei veröffentlicht – Umfang und Stationen in der Region prüfen.
- **Holfuy-Stationen:** bei Gleitschirmfliegern verbreitete Windstationen; Datenzugang über eine Schnittstelle mit Schlüssel – Bedingungen beim Betreiber bzw. Stationsbesitzer klären.
- **Prognosen:** Ein Dienst wie Open-Meteo kann Modelldaten liefern – Lizenz für Vereinsnutzung prüfen. Bewährte Spezialdienste (z. B. Windy, Burnair) werden verlinkt statt nachgebaut.
- Jeder Wert zeigt **Quelle und Zeitstempel**. Ist eine Station länger als 30 Minuten still, erscheint «Veraltet».

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

Empfehlung: Entscheid in Phase 0, nachdem geklärt ist, womit der Club heute arbeitet. Bei Variante A umfasst die Buchhaltung: Kontenplan für Vereine, Buchungen mit Beleg-Upload, automatische Buchung jeder Kartenzahlung, Beitragsrechnungen als Schweizer QR-Rechnung, Jahresabschluss und Export (Excel/CSV) für die Revision.

## Klub-Shop

- **Im selben System:** Artikel mit Varianten (Farbe, Grösse), Lagerbestand pro Variante, Warenkorb, Bestellstatus (bezahlt, in Produktion, versandt, abgeholt). Gleiches Login, gleicher Zahlungsanbieter, automatische Buchung – darum empfehlen wir keinen separaten Online-Shop-Dienst.
- **Sammelbestellung:** Artikel tragen einen Stichtag; danach erzeugt das Backoffice eine Bestellliste pro Variante für den Textildrucker.
- **Versand:** Porto als feste Pauschale oder gratis Abholung; Adressetiketten aus dem Backoffice.
- **Alternative:** Ein fertiger Shop-Dienst wäre schneller eingerichtet, hätte aber eigenes Login, eigene Zahlung und keine automatische Buchung in der Klub-Buchhaltung.
- **Mehrwertsteuer:** Ob der Klub mit Shop-Umsätzen MWST-pflichtig wird, hängt vom Gesamtumsatz ab – für ehrenamtlich geführte, nicht gewinnorientierte Sportvereine gilt meines Wissens eine höhere Umsatzgrenze. Mit der Revision bzw. Treuhand prüfen.

## Rollen und Rechte

- Benutzer ↔ Rollen ↔ Berechtigungen; Rollen entsprechen den Ressorts im Projektplan.
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
