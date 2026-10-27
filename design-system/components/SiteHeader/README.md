# SiteHeader

Die Hauptnavigation jeder öffentlichen Seite: Wortmarke, fünf Menüpunkte, Login und der orange Button «Jahreskarte».

**Der Consumer liefert:** `items` (Label + `href`), `active` (Label der aktuellen Seite), `clubName`, optional `cta`/`ctaHref`, `loginHref`.

- Maximal fünf Menüpunkte: Fluggebiete, Wetter, Sport, Verein, Shop (aus der heutigen Struktur von gkg.ch abgeleitet; «Shop» umfasst Klub-Kollektion und Gebrauchtmarkt). Alles andere gehört in den Footer.
- Der Jahreskarten-Button ist das einzige `wing`-Element im Header – nie einen zweiten Akzent daneben.
- Unter 900px klappt die Navigation hinter den Button «Menü» (mit `aria-expanded`); Login wandert ins Menü, der Jahreskarten-Button bleibt sichtbar. Unter 520px entfällt der Vereinsname neben der Wortmarke.
- Die aktuelle Seite trägt `aria-current="page"` und `sky-soft`.
