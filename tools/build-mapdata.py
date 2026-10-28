#!/usr/bin/env python3
"""Bereitet die Overture-Daten (tools/fetch-overture.py) für die Karte auf → build/mapdata/:

  orte.json     Beschriftungen: Ortschaften, Gipfel mit Höhe, Pässe, Seen – je mit Mindestzoom,
                damit sich Namen nicht überlappen
  linien.json   Strassen, Bahnen, Seilbahnen, Skilifte, Materialseilbahnen, Stromleitungen (GeoJSON)
  netz.json     Wegnetz für den Routenplaner: Pfade, Fahrwege, Fusswege und kleine Strassen mit Länge,
                Auf- und Abstieg (Höhen aus dem Höhenmodell, build/dem-cache/)

Aufruf: python3 tools/build-mapdata.py      Braucht numpy, Pillow, shapely.
Daten: © OpenStreetMap-Mitwirkende (ODbL), aufbereitet von Overture Maps.
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image
from shapely.geometry import LineString, MultiLineString, box, shape
from shapely.ops import linemerge, substring

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'build', 'overture')
CACHE = os.path.join(ROOT, 'build', 'dem-cache')
OUT = os.path.join(ROOT, 'build', 'mapdata')

VIEW = (8.70, 46.76, 9.45, 47.36)    # wie maxBounds der Karte (prototype/map3d.js)
NET = (8.90, 46.86, 9.25, 47.25)     # Wegnetz für den Routenplaner – Talschaft mit allen Klubgebieten und Rand
Q = 1e5                              # Koordinaten auf 1e-5° gerundet (rund 1 m)

# Wegarten im Netz; Index = Klasse in netz.json (Reihenfolge nicht ändern, routing.js kennt sie)
NET_CLASSES = ['path', 'track', 'footway', 'steps', 'bridleway', 'cycleway', 'pedestrian', 'living_street',
               'residential', 'unclassified', 'service', 'unknown', 'tertiary', 'secondary', 'primary']


def load(name):
    with open(os.path.join(SRC, name + '.geojson')) as f:
        return json.load(f)['features']


def inside(bbox, lon, lat):
    return bbox[0] <= lon <= bbox[2] and bbox[1] <= lat <= bbox[3]


# ---------- Höhenmodell ----------
_tiles = {}


def dem_tile(z, x, y):
    k = (z, x, y)
    if k not in _tiles:
        p = os.path.join(CACHE, str(z), str(x), f'{y}.png')
        if os.path.exists(p):
            a = np.asarray(Image.open(p).convert('RGB')).astype(np.float64)
            _tiles[k] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
        else:
            _tiles[k] = None
    return _tiles[k]


def elevation(lon, lat):
    """Höhe in m, bilinear aus den Terrarium-Kacheln (z12, sonst z11)."""
    for z in (12, 11, 10):
        n = 2 ** z
        fx = (lon + 180) / 360 * n * 256 - 0.5
        fy = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n * 256 - 0.5
        x0, y0 = int(math.floor(fx)), int(math.floor(fy))
        vals = []
        ok = True
        for dy in (0, 1):
            for dx in (0, 1):
                px, py = x0 + dx, y0 + dy
                t = dem_tile(z, px // 256, py // 256)
                if t is None:
                    ok = False
                    break
                vals.append(t[py % 256, px % 256])
            if not ok:
                break
        if ok:
            ax, ay = fx - x0, fy - y0
            return (vals[0] * (1 - ax) + vals[1] * ax) * (1 - ay) + (vals[2] * (1 - ax) + vals[3] * ax) * ay
    return None


def metres(a, b):
    lat = math.radians((a[1] + b[1]) / 2)
    dx = (b[0] - a[0]) * 111320 * math.cos(lat)
    dy = (b[1] - a[1]) * 110540
    return math.hypot(dx, dy)


def local_xy(coords, lat0):
    k = math.cos(math.radians(lat0))
    return [((x) * 111320 * k, y * 110540) for x, y in coords]


def simplify(coords, tol_m):
    """Douglas-Peucker in Metern (lokal flach gerechnet)."""
    if len(coords) < 3:
        return coords
    lat0 = coords[0][1]
    xy = local_xy(coords, lat0)
    ls = LineString(xy).simplify(tol_m, preserve_topology=False)
    keep = set()
    # Punkte der vereinfachten Linie auf die Originalindizes zurückführen
    j = 0
    for p in ls.coords:
        while j < len(xy) and (abs(xy[j][0] - p[0]) > 1e-6 or abs(xy[j][1] - p[1]) > 1e-6):
            j += 1
        if j < len(xy):
            keep.add(j)
    keep.update((0, len(coords) - 1))
    return [coords[i] for i in sorted(keep)]


def climb(coords, step=15.0):
    """Auf- und Abstieg in m entlang der Linie, Höhe alle `step` m."""
    up = down = 0.0
    prev = None
    for i in range(len(coords) - 1):
        a, b = coords[i], coords[i + 1]
        d = metres(a, b)
        n = max(1, int(d // step))
        for k in range(n + (1 if i == len(coords) - 2 else 0)):
            t = k / n
            h = elevation(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
            if h is None:
                continue
            if prev is not None:
                if h > prev:
                    up += h - prev
                else:
                    down += prev - h
            prev = h
    return up, down


def q(v):
    return int(round(v * Q))


# ---------- Beschriftungen ----------
def labels():
    cands = []
    for f in load('place'):
        p = f['properties']
        if p['subtype'] != 'locality' or p['class'] not in ('city', 'town', 'village', 'hamlet') or not p['name']:
            continue
        lon, lat = f['geometry']['coordinates'][:2]
        if not inside(VIEW, lon, lat):
            continue
        pop = p.get('population') or 0
        rank = {'city': 4, 'town': 3, 'village': 2, 'hamlet': 1}[p['class']]
        cands.append({'t': 'ort', 'n': p['name'], 'c': [round(lon, 5), round(lat, 5)], 'r': rank,
                      'prio': rank * 1000 + min(pop, 50000) / 60})
    for f in load('land'):
        p = f['properties']
        if p['class'] not in ('peak', 'saddle') or not p['name'] or f['geometry']['type'] != 'Point':
            continue
        lon, lat = f['geometry']['coordinates'][:2]
        if not inside(VIEW, lon, lat):
            continue
        ele = p.get('elevation')
        if ele is None and p.get('tags') and p['tags'].get('ele'):
            try:
                ele = int(float(str(p['tags']['ele']).replace(',', '.').split()[0]))
            except ValueError:
                ele = None
        if ele is None:
            h = elevation(lon, lat)
            ele = int(round(h)) if h is not None else None
        kind = 'gipfel' if p['class'] == 'peak' else 'pass'
        cands.append({'t': kind, 'n': p['name'], 'c': [round(lon, 5), round(lat, 5)], 'h': ele,
                      'prio': (600 if kind == 'gipfel' else 400) + (ele or 0) / 10})
    for f in load('water'):
        p = f['properties']
        if p['class'] not in ('lake', 'water', 'reservoir') or not p['name'] or f['geometry']['type'] not in ('Polygon', 'MultiPolygon'):
            continue
        g = shape(f['geometry'])
        area_km2 = g.area * 111.32 * 110.54 * math.cos(math.radians(g.centroid.y))
        if area_km2 < 0.05:
            continue
        pt = g.representative_point()
        if not inside(VIEW, pt.x, pt.y):
            continue
        cands.append({'t': 'see', 'n': p['name'], 'c': [round(pt.x, 5), round(pt.y, 5)], 'a': area_km2, 'prio': (2500 if area_km2 > 2 else 900) + area_km2 * 100})
    # Doppelte (gleicher Name, < 300 m) entfernen
    cands.sort(key=lambda c: -c['prio'])
    uniq = []
    for c in cands:
        if any(u['n'] == c['n'] and metres(u['c'], c['c']) < 300 for u in uniq):
            continue
        uniq.append(c)
    # Mindestzoom: von grob nach fein jeweils eintragen, was neben den bereits gesetzten Namen Platz hat
    placed = []
    for z in [x / 2 for x in range(17, 30)]:   # 8.5 … 14.5
        world = 512 * 2 ** z
        boxes = []
        for c in placed:
            boxes.append(c['_box'](world))
        for c in uniq:
            if 'z' in c:
                continue
            if c['t'] == 'ort' and c['r'] == 1 and z < 12:
                continue
            if c['t'] in ('gipfel', 'pass') and z < 10.5:
                continue
            if c['t'] == 'see' and c['a'] < 0.5 and z < 11:
                continue
            w = 7.2 * len(c['n']) + 14
            hgt = 30 if c['t'] in ('gipfel', 'pass') else 22
            if c['t'] == 'ort' and c['r'] >= 3:
                w *= 1.15
            lon, lat = c['c']
            def mk(lon=lon, lat=lat, w=w, hgt=hgt):
                def f(world):
                    x = (lon + 180) / 360 * world
                    y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * world
                    return (x - w / 2 - 6, y - hgt / 2 - 4, x + w / 2 + 6, y + hgt / 2 + 4)
                return f
            fb = mk()
            b = fb(world)
            if any(not (b[2] < o[0] or b[0] > o[2] or b[3] < o[1] or b[1] > o[3]) for o in boxes):
                continue
            c['z'] = z
            c['_box'] = fb
            placed.append(c)
            boxes.append(b)
    out = []
    for c in placed:
        item = {'t': c['t'], 'n': c['n'], 'c': c['c'], 'z': c['z']}
        if c.get('h') is not None:
            item['h'] = c['h']
        if c['t'] == 'ort':
            item['r'] = c['r']
        out.append(item)
    out.sort(key=lambda c: c['z'])
    return out


# ---------- Linien ----------
ROAD_KIND = {'motorway': 'autobahn', 'trunk': 'autobahn', 'primary': 'haupt', 'secondary': 'neben', 'tertiary': 'neben'}
RAIL_KIND = {'standard_gauge': 'bahn', 'narrow_gauge': 'bahn', 'funicular': 'bahn', 'unknown': 'bahn'}
AERIAL_KIND = {'cable_car': 'seilbahn', 'gondola': 'seilbahn', 'chair_lift': 'seilbahn', 'mixed_lift': 'seilbahn',
               't-bar': 'skilift', 'drag_lift': 'skilift', 'platter': 'skilift', 'j-bar': 'skilift', 'rope_tow': 'skilift',
               'goods': 'material'}
POWER_KIND = {'power_line': 'strom', 'minor_line': 'strom', 'cable': None}


def lines():
    view = box(*VIEW)
    groups = {}
    names = []
    for f in load('segment'):
        p = f['properties']
        if p['subtype'] == 'road':
            kind = ROAD_KIND.get(p['class'])
        elif p['subtype'] == 'rail':
            kind = RAIL_KIND.get(p['class'])
        else:
            kind = None
        if not kind:
            continue
        g = shape(f['geometry']).intersection(view)
        if not g.is_empty:
            groups.setdefault(kind, []).append(g)
    for f in load('infrastructure'):
        p = f['properties']
        kind = AERIAL_KIND.get(p['class']) if p['subtype'] == 'aerialway' else POWER_KIND.get(p['class']) if p['subtype'] == 'power' else None
        if not kind or f['geometry']['type'] not in ('LineString', 'MultiLineString'):
            continue
        g = shape(f['geometry']).intersection(view)
        if g.is_empty:
            continue
        if kind in ('seilbahn', 'material', 'skilift'):
            for part in (g.geoms if hasattr(g, 'geoms') else [g]):
                names.append({'k': kind, 'n': p.get('name'), 'g': part})
        else:
            groups.setdefault(kind, []).append(g)
    feats = []
    tol = {'autobahn': 12, 'haupt': 10, 'neben': 8, 'bahn': 8, 'strom': 10}
    for kind, geoms in groups.items():
        parts = []
        for g in geoms:
            parts += list(g.geoms) if hasattr(g, 'geoms') else [g]
        merged = linemerge([p for p in parts if p.geom_type == 'LineString'])
        merged = list(merged.geoms) if hasattr(merged, 'geoms') else [merged]
        for m in merged:
            coords = simplify([tuple(c[:2]) for c in m.coords], tol[kind])
            feats.append({'type': 'Feature', 'properties': {'k': kind}, 'geometry': {'type': 'LineString', 'coordinates': [[round(x, 5), round(y, 5)] for x, y in coords]}})
    for it in names:
        coords = [tuple(c[:2]) for c in it['g'].coords]
        props = {'k': it['k']}
        if it['n']:
            props['n'] = it['n']
        feats.append({'type': 'Feature', 'properties': props, 'geometry': {'type': 'LineString', 'coordinates': [[round(x, 5), round(y, 5)] for x, y in coords]}})
    return {'type': 'FeatureCollection', 'features': feats}


# ---------- Wegnetz ----------
def network():
    region = box(*NET)
    cls_ix = {c: i for i, c in enumerate(NET_CLASSES)}
    edges = []          # [a_id, b_id, cls, coords]
    for f in load('segment'):
        p = f['properties']
        if p['subtype'] != 'road' or p['class'] not in cls_ix:
            continue
        # Zufahrten, Parkplatzgassen und Trottoirs weglassen – parallel dazu gibt es immer eine Strasse
        if p.get('subclass') in ('driveway', 'parking_aisle', 'sidewalk', 'crosswalk'):
            continue
        coords = [tuple(c[:2]) for c in f['geometry']['coordinates']]
        if not LineString(coords).intersects(region):
            continue
        conns, ats = p['connectors'], p['at']
        if len(conns) < 2:
            continue
        line = LineString(coords)
        for i in range(len(conns) - 1):
            a, b = ats[i], ats[i + 1]
            piece = substring(line, a, b, normalized=True) if (a > 0 or b < 1) else line
            if piece.geom_type != 'LineString' or len(piece.coords) < 2:
                continue
            edges.append([conns[i], conns[i + 1], cls_ix[p['class']], [tuple(c) for c in piece.coords]])
    # Knoten mit genau zwei Kanten derselben Klasse zusammenziehen (spart Platz, ändert keine Route)
    inc = {}
    for i, e in enumerate(edges):
        inc.setdefault(e[0], []).append(i)
        inc.setdefault(e[1], []).append(i)
    alive = [True] * len(edges)
    for node, lst in list(inc.items()):
        lst = [i for i in lst if alive[i]]
        if len(lst) != 2:
            continue
        i, j = lst
        if i == j or edges[i][2] != edges[j][2]:
            continue
        ei, ej = edges[i], edges[j]
        # Ausrichten: ei endet an node, ej beginnt an node
        if ei[1] != node:
            ei[0], ei[1], ei[3] = ei[1], ei[0], ei[3][::-1]
        if ej[0] != node:
            ej[0], ej[1], ej[3] = ej[1], ej[0], ej[3][::-1]
        if ei[0] == ej[1]:
            continue  # Schleife – stehen lassen
        ei[1] = ej[1]
        ei[3] = ei[3] + ej[3][1:]
        alive[j] = False
        inc[ej[1]] = [i if x == j else x for x in inc[ej[1]]]
        inc[node] = []
    edges = [e for k, e in enumerate(edges) if alive[k]]
    # Knoten nummerieren
    ids, nodes = {}, []
    def nid(key, pt):
        if key not in ids:
            ids[key] = len(nodes)
            nodes.append(pt)
        return ids[key]
    flat_nodes, flat_edges = [], []
    out_edges = []
    for a, b, c, coords in edges:
        ia, ib = nid(a, coords[0]), nid(b, coords[-1])
        length = sum(metres(coords[k], coords[k + 1]) for k in range(len(coords) - 1))
        if length < 0.5:
            continue
        up, down = climb(coords)
        simple = simplify(coords, 4.0)[1:-1]
        out_edges.append((ia, ib, c, length, up, down, simple))
    # Knoten: Koordinaten und Höhe, delta-codiert
    px = py = 0
    node_h = []
    for lon, lat in nodes:
        h = elevation(lon, lat)
        x, y = q(lon), q(lat)
        node_h.append(int(round(h if h is not None else 0)))
        flat_nodes += [x - px, y - py, node_h[-1]]
        px, py = x, y
    for ia, ib, c, length, up, down, simple in out_edges:
        rec = [ia, ib, c, int(round(length)), int(round(up)), int(round(down)), len(simple)]
        lx, ly = q(nodes[ia][0]), q(nodes[ia][1])
        lh = node_h[ia]
        # Zwischenpunkte relativ zum vorherigen Punkt: Δlon, Δlat, ΔHöhe
        for lon, lat in simple:
            x, y = q(lon), q(lat)
            h = elevation(lon, lat)
            h = int(round(h)) if h is not None else lh
            rec += [x - lx, y - ly, h - lh]
            lx, ly, lh = x, y, h
        flat_edges += rec
    return {'v': 1, 'bbox': NET, 'scale': Q, 'classes': NET_CLASSES, 'nodeCount': len(nodes), 'edgeCount': len(out_edges),
            'nodes': flat_nodes, 'edges': flat_edges,
            'attribution': '© OpenStreetMap-Mitwirkende (ODbL), Overture Maps; Höhen: Terrain Tiles (EU-DEM © Copernicus)'}


def write(name, data):
    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, name)
    with open(p, 'w') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{name}: {os.path.getsize(p) / 1e6:.2f} MB')


def main():
    if not os.path.exists(os.path.join(SRC, 'segment.geojson')):
        sys.exit('Zuerst: python3 tools/fetch-overture.py')
    want = sys.argv[1:] or ['orte', 'linien', 'netz']
    if 'orte' in want:
        lab = labels()
        write('orte.json', {'labels': lab, 'attribution': '© OpenStreetMap-Mitwirkende (ODbL), Overture Maps'})
        print(f'  {len(lab)} Beschriftungen')
    if 'linien' in want:
        write('linien.json', lines())
    if 'netz' in want:
        n = network()
        write('netz.json', n)
        print(f'  {n["nodeCount"]} Knoten, {n["edgeCount"]} Kanten')


if __name__ == '__main__':
    main()
