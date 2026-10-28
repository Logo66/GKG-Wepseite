#!/usr/bin/env python3
"""Erzeugt die Kartenkacheln für den Prototyp nach build/tiles/.

  dem/{z}/{x}/{y}.png      Höhendaten (Terrarium-Format) z6–11 – für das 3D-Gelände
  relief/{z}/{x}/{y}.webp  schattiertes Relief mit Höhenstufen und Seen, z8–13

Quelle der Höhen: «Terrain Tiles» auf AWS Open Data (Mapzen/Tilezen; in Europa u. a.
EU-DEM, © Copernicus). Kein API-Schlüssel nötig. Für den Live-Betrieb ist swisstopo
(SWISSIMAGE, Landeskarte) vorgesehen – siehe design-system/Technik.md.

Aufruf:  python3 tools/build-tiles.py            (lädt fehlende Höhenkacheln nach build/dem-cache/)
Benötigt numpy und Pillow (pip install -r tools/requirements.txt).
"""
import math
import os
import sys
import time
import urllib.request

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'build', 'dem-cache')
OUT = os.path.join(ROOT, 'build', 'tiles')
SOURCE = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'

# Drei Ringe (W, S, E, N): je näher an den Plätzen, desto feiner. So bleibt die Datenmenge klein,
# und am Horizont der 3D-Ansicht endet das Gelände nicht an einer Kante.
WIDE = (8.55, 46.65, 9.60, 47.45)    # Höhen z6–11, Relief z8–11
REGION = (8.80, 46.82, 9.34, 47.28)  # Relief z12 – Glarnerland mit Linthebene und Walensee
CORE = (8.94, 46.89, 9.20, 47.23)    # Relief z13 – alle Start- und Landeplätze
DEM_ZOOMS = range(6, 12)
RELIEF_ZOOMS = range(8, 14)
DEM_MAX = 12


def relief_area(z):
    return CORE if z == 13 else REGION if z == 12 else WIDE

# Höhenstufen (m ü. M.) → Farbe: Talboden, Wiesen, Alpweiden, Fels, Firn
STOPS = [
    (300, (214, 226, 203)),
    (600, (202, 218, 186)),
    (1000, (184, 204, 166)),
    (1500, (176, 190, 152)),
    (1900, (190, 186, 164)),
    (2300, (206, 202, 190)),
    (2700, (228, 230, 228)),
    (3200, (246, 248, 248)),
]
LAKE = np.array([150, 196, 202], dtype=np.float64)


def tile_xy(lon, lat, z):
    n = 2 ** z
    x = int((lon + 180) / 360 * n)
    y = int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)
    return x, y


def tile_lat(y, z):
    n = 2 ** z
    return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))


def tiles_in(bbox, z):
    w, s, e, n = bbox
    x0, y0 = tile_xy(w, n, z)
    x1, y1 = tile_xy(e, s, z)
    return [(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]


def dem_path(z, x, y):
    return os.path.join(CACHE, str(z), str(x), f'{y}.png')


def fetch(z, x, y):
    p = dem_path(z, x, y)
    if os.path.exists(p):
        return p
    os.makedirs(os.path.dirname(p), exist_ok=True)
    url = SOURCE.format(z=z, x=x, y=y)
    for attempt in range(4):
        try:
            data = urllib.request.urlopen(url, timeout=30).read()
            break
        except Exception as err:  # network hiccup: retry with backoff
            if attempt == 3:
                raise SystemExit(f'Download fehlgeschlagen: {url} ({err})')
            time.sleep(2 ** attempt)
    with open(p, 'wb') as f:
        f.write(data)
    return p


_grids = {}


def grid(z, x, y):
    """Höhen in Metern als 256×256-Array (Terrarium: R*256 + G + B/256 − 32768)."""
    key = (z, x, y)
    if key not in _grids:
        p = dem_path(z, x, y)
        if not os.path.exists(p):
            _grids[key] = None
        else:
            a = np.asarray(Image.open(p).convert('RGB')).astype(np.float64)
            _grids[key] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
    return _grids[key]


def neighbourhood(z, x, y, pad):
    """Kachel mit `pad` Pixeln Rand aus den Nachbarkacheln (fehlende Nachbarn: Randwerte wiederholen)."""
    centre = grid(z, x, y)
    big = np.zeros((768, 768))
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            g = grid(z, x + dx, y + dy)
            big[(dy + 1) * 256:(dy + 2) * 256, (dx + 1) * 256:(dx + 2) * 256] = centre if g is None else g
    return big[256 - pad:512 + pad, 256 - pad:512 + pad]


def tint(elev):
    hs = np.array([s[0] for s in STOPS], dtype=np.float64)
    out = np.zeros(elev.shape + (3,))
    for c in range(3):
        out[..., c] = np.interp(elev, hs, [s[1][c] for s in STOPS])
    return out


def hillshade(elev, cell, zfac):
    gy, gx = np.gradient(elev * zfac, cell)
    slope = np.arctan(np.hypot(gx, gy))
    aspect = np.arctan2(-gx, gy)
    total = np.zeros_like(elev)
    # mehrere Lichtrichtungen (NW betont) – wirkt plastischer als eine einzelne Sonne
    for az, wt in ((315, 0.5), (270, 0.2), (0, 0.2), (225, 0.1)):
        a = math.radians(360 - az + 90)
        alt = math.radians(45)
        total += wt * (np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(a - aspect))
    return np.clip(total, 0, 1), slope


def flat_mask(elev, r=2):
    """Seen sind im Höhenmodell vollkommen flach: lokale Spannweite ~0."""
    hi = elev.copy()
    lo = elev.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            s = np.roll(np.roll(elev, dy, 0), dx, 1)
            hi = np.maximum(hi, s)
            lo = np.minimum(lo, s)
    m = (hi - lo) < 0.02
    # kleine flache Flecken entfernen (erodieren), Seeufer wieder füllen (dilatieren)
    for op, n in ((np.minimum, 2), (np.maximum, 3)):
        mm = m.astype(np.uint8)
        for _ in range(n):
            acc = mm.copy()
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                acc = op(acc, np.roll(np.roll(mm, dy, 0), dx, 1))
            mm = acc
        m = mm.astype(bool)
    return m


def blur(a, sigma):
    """Separabler Gauss-Filter – glättet die Streifen der offenen Höhendaten vor der Schattierung."""
    r = int(math.ceil(sigma * 2.5))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    pad = np.pad(a, r, mode='edge')
    tmp = sum(k[i] * pad[:, i:i + a.shape[1]] for i in range(2 * r + 1))
    return sum(k[i] * tmp[i:i + a.shape[0], :] for i in range(2 * r + 1))


def render(elev, z, lat):
    # elev hat (256 + 2·pad) Pixel Kantenlänge; die Zellgrösse bezieht sich auf 256 Pixel pro Kachel
    cell = 40075016.686 * math.cos(math.radians(lat)) / (256 * 2 ** z)
    zfac = {8: 2.2, 9: 1.9, 10: 1.6, 11: 1.4, 12: 1.25, 13: 1.15}[z]
    sigma = {8: 0.6, 9: 0.6, 10: 0.7, 11: 0.9, 12: 1.2, 13: 2.0}[z]
    shade, slope = hillshade(blur(elev, sigma), cell, zfac)
    col = tint(elev)
    steep = np.clip((np.degrees(slope) - 32) / 18, 0, 1)[..., None]  # Felsen an steilen Flanken
    col = col * (1 - 0.35 * steep) + np.array([170, 165, 155]) * 0.35 * steep
    light = (0.42 + 0.78 * shade)[..., None]
    out = col * light
    lake = flat_mask(elev)
    out[lake] = LAKE
    return np.clip(out, 0, 255).astype(np.uint8)


def relief_tile(z, x, y):
    lat = tile_lat(y + 0.5, z)
    pad = 10  # Rand > Reichweite von Seen-Erkennung und Gradient, damit keine Nähte entstehen
    if z <= DEM_MAX:
        if grid(z, x, y) is None:
            return None
        elev = neighbourhood(z, x, y, pad)
    else:
        # feinste Stufe: Höhen aus z12 bikubisch hochrechnen
        f = 2 ** (z - DEM_MAX)
        px, py = x // f, y // f
        if grid(DEM_MAX, px, py) is None:
            return None
        src = neighbourhood(DEM_MAX, px, py, 8)
        sub = 256 // f
        pad = 6
        ox, oy = (x % f) * sub + 8, (y % f) * sub + 8
        crop = src[oy - pad:oy + sub + pad, ox - pad:ox + sub + pad]
        img = Image.fromarray(crop.astype(np.float32), mode='F')
        size = (sub + 2 * pad) * f
        elev = np.asarray(img.resize((size, size), Image.BICUBIC)).astype(np.float64)
        pad = pad * f
    rgb = render(elev, z, lat)
    rgb = rgb[pad:pad + 256, pad:pad + 256]
    return Image.fromarray(np.ascontiguousarray(rgb), 'RGB')


def main():
    t0 = time.time()
    needed = set()
    for z in range(min(DEM_ZOOMS), DEM_MAX + 1):
        needed.update((z, x, y) for x, y in tiles_in(REGION if z == DEM_MAX else WIDE, z))
    for i, (z, x, y) in enumerate(sorted(needed)):
        fetch(z, x, y)
    print(f'Höhenkacheln bereit: {len(needed)}')

    count = {'dem': 0, 'relief': 0}
    size = {'dem': 0, 'relief': 0}
    for z in DEM_ZOOMS:
        for x, y in tiles_in(WIDE, z):
            dst = os.path.join(OUT, 'dem', str(z), str(x), f'{y}.png')
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            with open(dem_path(z, x, y), 'rb') as f:
                data = f.read()
            with open(dst, 'wb') as f:
                f.write(data)
            count['dem'] += 1
            size['dem'] += len(data)
    for z in RELIEF_ZOOMS:
        for x, y in tiles_in(relief_area(z), z):
            im = relief_tile(z, x, y)
            if im is None:
                continue
            dst = os.path.join(OUT, 'relief', str(z), str(x), f'{y}.webp')
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            im.save(dst, 'WEBP', quality=80, method=6)
            count['relief'] += 1
            size['relief'] += os.path.getsize(dst)
        print(f'Relief z{z} fertig')
    for k in count:
        print(f'{k}: {count[k]} Kacheln, {size[k] / 1e6:.1f} MB')
    print(f'Dauer {time.time() - t0:.0f} s → {os.path.relpath(OUT, ROOT)}/')


if __name__ == '__main__':
    sys.exit(main())
