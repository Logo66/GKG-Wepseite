# PassCard

Die digitale Jahreskarte (Start- & Landeplatzkarte) – so sieht sie nach dem Kauf im Browser aus und so wird sie als Pass in Apple Wallet und Google Wallet gestaltet.

**Der Consumer liefert:** `logoSrc` (G-Signet), `holder`, `photo` (Porträt aus dem Profil; ohne Foto erscheinen die Initialen), `season`, `number`, `fields` (Paare `[Label, Wert]`, max. vier), `qr` (das echte QR-Element aus dem Backend; ohne `qr` erscheint ein Muster), `onAppleWallet`, `onGoogleWallet`, optional `wallet={false}`.

- Das Foto macht die Karte persönlich (wie bei der FlyCard in Bassano): Der Scanner zeigt es gross, damit Kontrolleur/innen vergleichen können.
- Der QR-Code liegt in beiden Themes auf `qr-ground` (Weiss) mit `qr-ink` – Scanner lesen nur hohen Kontrast zuverlässig.
- Der QR enthält nur eine signierte Karten-ID, keine Personendaten (siehe Abschnitt Technik).
- Die Wallet-Buttons sind hier neutrale Platzhalter. Live gelten die offiziellen Badges «Add to Apple Wallet» und «Add to Google Wallet» gemäss Apple- bzw. Google-Richtlinien.
- Der sky-Balken mit «GKG» entspricht der Kopfzeile des Wallet-Passes (Hintergrundfarbe `sky`, Text `on-sky`).
