#!/usr/bin/env python3
"""Erzeugt die Kartenkacheln für den Prototyp nach build/tiles/.

  dem/{z}/{x}/{y}.png      Höhendaten (Terrarium-Format) z6–11 – für das 3D-Gelände
  karte/{z}/{x}/{y}.webp   Kartengrund mit 512 px: schattiertes Relief, Höhenstufen, Wald, Fels, Geröll,
                           Gletscher, Siedlungen, Seen und Bäche, Höhenlinien – z7–13

512-px-Kacheln, weil MapLibre in 512er-Einheiten rechnet: Eine 512er-Kachel der Stufe z ist bei Zoom z
scharf, eine 256er erst eine Stufe früher. Darum war die alte Karte ab Zoom 12 unscharf.

Quellen: Höhen aus «Terrain Tiles» auf AWS Open Data (Mapzen/Tilezen; in Europa u. a. EU-DEM, © Copernicus).
Flächen und Gewässer aus Overture Maps (© OpenStreetMap-Mitwirkende, ODbL) – zuerst tools/fetch-overture.py.
Ohne Overture-Daten entsteht das Relief wie früher, mit Seen aus flachen Stellen im Höhenmodell.
Für den Live-Betrieb ist swisstopo (Landeskarte, SWISSIMAGE) vorgesehen – siehe design-system/Technik.md.

Aufruf:  python3 tools/build-tiles.py            (lädt fehlende Höhenkacheln nach build/dem-cache/)
Benötigt numpy, Pillow, shapely (pip install -r tools/requirements.txt).
"""
import json
import math
import os
import sys
import time
import urllib.request

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'build', 'dem-cache')
OVERTURE = os.path.join(ROOT, 'build', 'overture')
OUT = os.path.join(ROOT, 'build', 'tiles')
SOURCE = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'

# Drei Ringe (W, S, E, N): je näher an den Plätzen, desto feiner. So bleibt die Datenmenge klein,
# und am Horizont der 3D-Ansicht endet das Gelände nicht an einer Kante.
WIDE = (8.55, 46.65, 9.60, 47.45)    # Höhen z6–11, Karte z7–10
REGION = (8.80, 46.82, 9.34, 47.28)  # Karte z11–12 – Glarnerland mit Linthebene und Walensee
CORE = (8.94, 46.89, 9.20, 47.23)    # Karte z13 – alle Start- und Landeplätze
DEM_ZOOMS = range(6, 12)
MAP_ZOOMS = range(7, 14)
DEM_MAX = 12
SIZE = 512
PAD = 12


def map_area(z):
    return CORE if z == 13 else REGION if z >= 11 else WIDE


# Höhenstufen (m ü. M.) → Farbe: Talboden, Wiesen, Alpweiden, Fels, Firn
STOPS = [
    (300, (216, 228, 205)),
    (600, (205, 221, 189)),
    (1000, (190, 209, 170)),
    (1500, (182, 196, 158)),
    (1900, (194, 190, 168)),
    (2300, (208, 204, 192)),
    (2700, (228, 230, 228)),
    (3200, (246, 248, 248)),
]
# Flächenfarben (über das Relief gelegt) und Deckkraft
COVER = {
    'wald': ((128, 166, 112), 0.62),
    'gebuesch': ((160, 186, 132), 0.40),
    'fels': ((190, 184, 174), 0.55),
    'geroell': ((214, 209, 198), 0.50),
    'gletscher': ((238, 245, 250), 0.85),
    'sumpf': ((176, 204, 196), 0.40),
    'siedlung': ((226, 216, 204), 0.60),
    'gewerbe': ((216, 210, 216), 0.60),
}
WATER = np.array([150, 196, 214], dtype=np.float64)
SHORE = np.array([104, 156, 186], dtype=np.float64)
CONTOUR = np.array([140, 100, 64], dtype=np.float64)
ICE_CONTOUR = np.array([96, 146, 186], dtype=np.float64)
# Höhenlinien-Abstand und Zählkurve je Zoomstufe
CONTOURS = {10: (200, 1000), 11: (100, 500), 12: (50, 250), 13: (50, 250)}


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


def dem_window(level, x0, y0, w, h):
    """Höhen für das Pixelfenster [x0, x0+w) × [y0, y0+h) der Stufe `level` (256-px-Kacheln).
    Fehlt eine Kachel, kommt sie hochgerechnet aus der gröberen Stufe."""
    out = np.zeros((h, w))
    tx0, ty0, tx1, ty1 = x0 // 256, y0 // 256, (x0 + w - 1) // 256, (y0 + h - 1) // 256
    for ty in range(ty0, ty1 + 1):
        for tx in range(tx0, tx1 + 1):
            g = grid(level, tx, ty)
            if g is None:
                if level <= 6:
                    continue
                g = dem_window(level - 1, tx * 128, ty * 128, 128, 128)
                g = np.asarray(Image.fromarray(g.astype(np.float32), mode='F').resize((256, 256), Image.BICUBIC)).astype(np.float64)
            ax0, ay0 = max(x0, tx * 256), max(y0, ty * 256)
            ax1, ay1 = min(x0 + w, (tx + 1) * 256), min(y0 + h, (ty + 1) * 256)
            out[ay0 - y0:ay1 - y0, ax0 - x0:ax1 - x0] = g[ay0 - ty * 256:ay1 - ty * 256, ax0 - tx * 256:ax1 - tx * 256]
    return out


def elevation_512(z, x, y):
    """Höhen für eine 512er-Kachel samt Rand: aus Stufe z+1 (gleiche Pixeldichte) oder hochgerechnet aus z12."""
    level = min(z + 1, DEM_MAX)
    f = 2 ** (z + 1 - level)
    n = SIZE + 2 * PAD
    if f == 1:
        return dem_window(level, x * SIZE - PAD, y * SIZE - PAD, n, n)
    m = 4  # Rand für die bikubische Interpolation
    sx, sy = x * SIZE // f, y * SIZE // f
    src = dem_window(level, sx - PAD // f - m, sy - PAD // f - m, SIZE // f + 2 * (PAD // f) + 2 * m, SIZE // f + 2 * (PAD // f) + 2 * m)
    big = np.asarray(Image.fromarray(src.astype(np.float32), mode='F').resize((src.shape[1] * f, src.shape[0] * f), Image.BICUBIC)).astype(np.float64)
    o = m * f + (PAD // f) * f - PAD
    return big[o:o + n, o:o + n]


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
    """Ohne Overture-Daten: Seen sind im Höhenmodell vollkommen flach (lokale Spannweite ~0)."""
    hi = elev.copy()
    lo = elev.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            s = np.roll(np.roll(elev, dy, 0), dx, 1)
            hi = np.maximum(hi, s)
            lo = np.minimum(lo, s)
    return (hi - lo) < 0.02


def blur(a, sigma):
    """Separabler Gauss-Filter – glättet die Streifen der offenen Höhendaten vor der Schattierung."""
    r = int(math.ceil(sigma * 2.5))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    pad = np.pad(a, r, mode='edge')
    tmp = sum(k[i] * pad[:, i:i + a.shape[1]] for i in range(2 * r + 1))
    return sum(k[i] * tmp[i:i + a.shape[0], :] for i in range(2 * r + 1))


# ---------- Flächen aus Overture ----------
class Features:
    """Flächen und Gewässer, nach Klasse sortiert und mit Suchbaum für die Kachelabfrage."""

    def __init__(self):
        from shapely.geometry import shape
        from shapely.strtree import STRtree
        self.ok = os.path.exists(os.path.join(OVERTURE, 'land.geojson'))
        self.polys, self.lines = {}, {}
        if not self.ok:
            return
        land_map = {'forest': 'wald', 'wood': 'wald', 'scrub': 'gebuesch', 'heath': 'gebuesch', 'bare_rock': 'fels', 'rock': 'fels',
                    'scree': 'geroell', 'shingle': 'geroell', 'glacier': 'gletscher', 'wetland': 'sumpf'}
        use_map = {'residential': 'siedlung', 'commercial': 'gewerbe', 'industrial': 'gewerbe', 'retail': 'gewerbe', 'quarry': 'geroell'}
        water_polys = ('lake', 'water', 'reservoir', 'river', 'pond', 'basin', 'canal', 'oxbow', 'stream')
        water_lines = {'river': 3.0, 'canal': 1.6, 'stream': 1.0}

        def add(store, key, geom, extra=None):
            store.setdefault(key, []).append((geom, extra))

        def load(name):
            with open(os.path.join(OVERTURE, name + '.geojson')) as f:
                return json.load(f)['features']

        for f in load('land'):
            k = land_map.get(f['properties']['class'])
            if k and f['geometry']['type'] in ('Polygon', 'MultiPolygon'):
                add(self.polys, k, shape(f['geometry']))
        for f in load('land_use'):
            k = use_map.get(f['properties']['class'])
            if k and f['geometry']['type'] in ('Polygon', 'MultiPolygon'):
                add(self.polys, k, shape(f['geometry']))
        for f in load('water'):
            c, t = f['properties']['class'], f['geometry']['type']
            if t in ('Polygon', 'MultiPolygon') and c in water_polys:
                add(self.polys, 'wasser', shape(f['geometry']))
            elif t in ('LineString', 'MultiLineString') and c in water_lines:
                add(self.lines, 'wasser', shape(f['geometry']), water_lines[c])
        self.trees = {}
        for store in (self.polys, self.lines):
            for k, items in store.items():
                self.trees[(id(store), k)] = (STRtree([g for g, _ in items]), items)

    def query(self, store, key, bbox):
        from shapely.geometry import box
        t = self.trees.get((id(store), key))
        if not t:
            return []
        tree, items = t
        return [items[i] for i in tree.query(box(*bbox))]


FEATURES = None


def tile_bbox(z, x, y, pad_px):
    n = 2 ** z
    def lon(px): return px / (SIZE * n) * 360 - 180
    def lat(py): return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * py / (SIZE * n)))))
    return (lon(x * SIZE - pad_px), lat((y + 1) * SIZE + pad_px), lon((x + 1) * SIZE + pad_px), lat(y * SIZE - pad_px))


def projector(z, x, y, scale):
    """lon/lat → Pixel der (gepolsterten, `scale`-fach überabgetasteten) Kachel."""
    world = SIZE * 2 ** z
    ox, oy = x * SIZE - PAD, y * SIZE - PAD
    def p(lon, lat):
        px = (lon + 180) / 360 * world
        py = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * world
        return ((px - ox) * scale, (py - oy) * scale)
    return p


def rasterize(z, x, y, items, scale=2, width=None):
    """Flächen (oder Linien mit `width` in px) als weiche Maske 0…1 in Kachelgrösse samt Rand."""
    n = (SIZE + 2 * PAD) * scale
    img = Image.new('L', (n, n), 0)
    draw = ImageDraw.Draw(img)
    proj = projector(z, x, y, scale)
    deg_px = 360 / (SIZE * 2 ** z)  # Grad pro Pixel (Länge) – zum Vereinfachen der Umrisse
    for geom, extra in items:
        g = geom.simplify(deg_px * 0.35, preserve_topology=False)
        if g.is_empty:
            continue
        parts = list(g.geoms) if hasattr(g, 'geoms') else [g]
        for part in parts:
            if part.geom_type == 'Polygon':
                draw.polygon([proj(*c[:2]) for c in part.exterior.coords], fill=255)
                for hole in part.interiors:
                    draw.polygon([proj(*c[:2]) for c in hole.coords], fill=0)
            elif part.geom_type == 'LineString':
                w = (width if width is not None else extra or 1.0)
                draw.line([proj(*c[:2]) for c in part.coords], fill=255, width=max(1, int(round(w * scale))))
    if scale > 1:
        img = img.resize((SIZE + 2 * PAD, SIZE + 2 * PAD), Image.BOX)
    return np.asarray(img).astype(np.float64) / 255


def contour_alpha(elev, step, width):
    """Weiche Höhenlinien: Abstand zur nächsten Linie in Pixeln, über den Gradienten geschätzt."""
    f = elev / step
    gy, gx = np.gradient(f)
    grad = np.hypot(gx, gy) + 1e-6
    fr = f - np.floor(f)
    d = np.minimum(fr, 1 - fr) / grad
    return np.clip(1 - d / (width / 2), 0, 1), np.round(f)


def render(elev, z, lat, x, y):
    cell = 40075016.686 * math.cos(math.radians(lat)) / (SIZE * 2 ** z)
    zfac = {7: 2.2, 8: 1.9, 9: 1.6, 10: 1.4, 11: 1.25, 12: 1.15, 13: 1.1}[z]
    sigma = {7: 0.6, 8: 0.7, 9: 0.8, 10: 1.0, 11: 1.3, 12: 1.8, 13: 2.6}[z]
    smooth = blur(elev, sigma)
    shade, slope = hillshade(smooth, cell, zfac)
    col = tint(smooth)
    steep = np.clip((np.degrees(slope) - 32) / 18, 0, 1)[..., None]  # Felsen an steilen Flanken
    col = col * (1 - 0.30 * steep) + np.array([172, 166, 156]) * 0.30 * steep
    water = None
    if FEATURES and FEATURES.ok:
        bb = tile_bbox(z, x, y, PAD)
        for key in ('wald', 'gebuesch', 'sumpf', 'siedlung', 'gewerbe', 'geroell', 'fels', 'gletscher'):
            items = FEATURES.query(FEATURES.polys, key, bb)
            if not items:
                continue
            m = rasterize(z, x, y, items)[..., None]
            rgb, a = COVER[key]
            col = col * (1 - a * m) + np.array(rgb) * a * m
        water = rasterize(z, x, y, FEATURES.query(FEATURES.polys, 'wasser', bb))
        if z >= 11:
            streams = FEATURES.query(FEATURES.lines, 'wasser', bb)
            if z == 11:
                streams = [s for s in streams if (s[1] or 1) >= 1.6]  # bei Zoom 11 nur Flüsse und Kanäle
            if streams:
                sw = rasterize(z, x, y, streams, scale=2)
                water = np.maximum(water, sw * (0.85 if z >= 12 else 0.6))
        ice = rasterize(z, x, y, FEATURES.query(FEATURES.polys, 'gletscher', bb)) if z in CONTOURS else None
    else:
        water = flat_mask(elev).astype(np.float64)
        ice = None
    light = (0.45 + 0.75 * shade)[..., None]
    out = col * light
    if z in CONTOURS:
        step, index = CONTOURS[z]
        a, level = contour_alpha(smooth, step, 1.1 if z >= 12 else 1.0)
        is_index = (np.mod(level * step, index) == 0)
        a = a * np.where(is_index, 0.6, 0.36)
        if z >= 12:
            a2, _ = contour_alpha(smooth, step, 1.7)
            a = np.where(is_index, np.maximum(a, a2 * 0.55), a)
        a = a * (1 - water)
        c = CONTOUR if ice is None else CONTOUR * (1 - ice[..., None]) + ICE_CONTOUR * ice[..., None]
        out = out * (1 - a[..., None]) + c * a[..., None]
    if water is not None:
        w = water[..., None]
        # Ufer: Rand der Wassermaske dunkler
        edge = np.clip(water - blur(water, 1.2), 0, 1)[..., None] * 1.6
        out = out * (1 - w) + (WATER * (0.92 + 0.08 * shade[..., None])) * w
        out = out * (1 - np.clip(edge, 0, 0.6)) + SHORE * np.clip(edge, 0, 0.6)
    return np.clip(out, 0, 255).astype(np.uint8)


def map_tile(z, x, y):
    lat = tile_lat(y + 0.5, z)
    elev = elevation_512(z, x, y)
    rgb = render(elev, z, lat, x, y)
    rgb = rgb[PAD:PAD + SIZE, PAD:PAD + SIZE]
    return Image.fromarray(np.ascontiguousarray(rgb), 'RGB')


def main():
    global FEATURES
    t0 = time.time()
    needed = set()
    for z in range(min(DEM_ZOOMS), DEM_MAX + 1):
        needed.update((z, x, y) for x, y in tiles_in(REGION if z == DEM_MAX else WIDE, z))
    for z, x, y in sorted(needed):
        fetch(z, x, y)
    print(f'Höhenkacheln bereit: {len(needed)}')
    FEATURES = Features()
    print('Flächen aus Overture: ' + ('ja' if FEATURES.ok else 'nein (nur Relief) – tools/fetch-overture.py ausführen'))

    only = [int(a) for a in sys.argv[1:]] or None
    count = {'dem': 0, 'karte': 0}
    size = {'dem': 0, 'karte': 0}
    if not only:
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
    for z in MAP_ZOOMS:
        if only and z not in only:
            continue
        for x, y in tiles_in(map_area(z), z):
            im = map_tile(z, x, y)
            dst = os.path.join(OUT, 'karte', str(z), str(x), f'{y}.webp')
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            im.save(dst, 'WEBP', quality=82, method=6)
            count['karte'] += 1
            size['karte'] += os.path.getsize(dst)
        print(f'Karte z{z} fertig ({time.time() - t0:.0f} s)')
    for k in count:
        print(f'{k}: {count[k]} Kacheln, {size[k] / 1e6:.1f} MB')
    print(f'Dauer {time.time() - t0:.0f} s → {os.path.relpath(OUT, ROOT)}/')


if __name__ == '__main__':
    sys.exit(main())
