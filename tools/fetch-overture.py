#!/usr/bin/env python3
"""Lädt die Kartendaten der Region aus Overture Maps (offene Daten, grösstenteils aus OpenStreetMap).

Overture liegt als GeoParquet auf Amazon S3. Das Skript liest von jeder Datei nur das Inhaltsverzeichnis
und danach nur die Zeilengruppen, die die Region berühren (HTTP-Range-Anfragen) – ein paar hundert MB
statt vieler GB. Ergebnis: build/overture/<ebene>.geojson, auf die Region zugeschnitten.

  python3 tools/fetch-overture.py                 # alle Ebenen
  python3 tools/fetch-overture.py segment place   # nur einzelne Ebenen

Lizenz: Overture-Daten aus OpenStreetMap stehen unter ODbL – auf der Karte «© OpenStreetMap-Mitwirkende,
Overture Maps» angeben. Abgeleitete Datensätze (z. B. das Wegnetz für den Routenplaner) ebenfalls unter ODbL.

Braucht: pip install pyarrow shapely requests
"""
import io
import json
import os
import re
import sys
import time

import pyarrow.parquet as pq
import requests
from shapely import wkb
from shapely.geometry import box, mapping

RELEASE = os.environ.get('OVERTURE_RELEASE', '2026-10-21.0')
BUCKET = 'https://overturemaps-us-west-2.s3.us-west-2.amazonaws.com'
# Wie WIDE in tools/build-tiles.py
BBOX = (8.55, 46.65, 9.60, 47.45)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'build', 'overture')

S = requests.Session()
if os.path.exists('/root/.ccr/ca-bundle.crt'):
    S.verify = '/root/.ccr/ca-bundle.crt'


def get(url, **kw):
    for attempt in range(5):
        try:
            r = S.get(url, timeout=60, **kw)
            r.raise_for_status()
            return r
        except requests.RequestException:
            if attempt == 4:
                raise
            time.sleep(2 ** attempt)


class RangeFile(io.RawIOBase):
    """Datei auf S3, gelesen per HTTP-Range – genug für pyarrow."""

    def __init__(self, url):
        self.url, self.pos = url, 0
        r = S.head(url, timeout=60)
        r.raise_for_status()
        self.size = int(r.headers['Content-Length'])

    def seekable(self): return True
    def readable(self): return True
    def tell(self): return self.pos

    def seek(self, off, whence=0):
        self.pos = off if whence == 0 else self.pos + off if whence == 1 else self.size + off
        return self.pos

    def readinto(self, b):
        n = min(len(b), self.size - self.pos)
        if n <= 0:
            return 0
        data = get(self.url, headers={'Range': 'bytes=%d-%d' % (self.pos, self.pos + n - 1)}).content
        b[:len(data)] = data
        self.pos += len(data)
        return len(data)


def keys(prefix):
    out, token = [], None
    while True:
        url = BUCKET + '/?list-type=2&prefix=' + prefix + ('&continuation-token=' + requests.utils.quote(token) if token else '')
        text = get(url).text
        out += [k for k in re.findall(r'<Key>([^<]*)</Key>', text) if k.endswith('.parquet')]
        m = re.search(r'<NextContinuationToken>([^<]*)<', text)
        if not m:
            return out
        token = m.group(1)


# Ebene → (Overture-Pfad, Spalten, Funktion für die Eigenschaften)
def names(row):
    n = row.get('names') or {}
    return n.get('primary')


def props_segment(r):
    routes = [{k: x.get(k) for k in ('name', 'network', 'ref', 'symbol')} for x in (r.get('routes') or [])]
    return {'subtype': r.get('subtype'), 'class': r.get('class'), 'subclass': r.get('subclass'), 'name': names(r),
            'routes': routes or None, 'connectors': [c['connector_id'] for c in (r.get('connectors') or [])],
            'at': [round(c['at'], 6) for c in (r.get('connectors') or [])],
            'surface': ((r.get('road_surface') or [{}])[0] or {}).get('value')}


def props_place(r):
    c = r.get('cartography') or {}
    return {'subtype': r.get('subtype'), 'class': r.get('class'), 'name': names(r), 'population': r.get('population'),
            'prominence': c.get('prominence'), 'min_zoom': c.get('min_zoom')}


def props_base(r):
    tags = dict(r.get('source_tags') or [])
    keep = {k: tags[k] for k in ('natural', 'aerialway', 'power', 'landuse', 'leaf_type', 'ele', 'waterway', 'water') if k in tags}
    return {'subtype': r.get('subtype'), 'class': r.get('class'), 'name': names(r), 'elevation': r.get('elevation'), 'tags': keep or None}


# Nur behalten, was die Karte braucht – Overture enthält z. B. auch jede Sitzbank und jeden Hydranten
def keep(layer, p):
    sub, cls = p.get('subtype'), p.get('class')
    if layer == 'segment':
        return sub in ('road', 'rail')
    if layer == 'place':
        return sub in ('locality', 'neighborhood') and bool(p.get('name'))
    if layer == 'infrastructure':
        return sub in ('aerialway',) or cls in ('power_line', 'minor_line', 'cable', 'station', 'bus_station', 'bus_stop', 'parking')
    if layer == 'land':
        return cls in ('forest', 'wood', 'glacier', 'rock', 'bare_rock', 'scree', 'shingle', 'peak', 'saddle', 'cliff', 'ridge', 'wetland', 'grassland', 'meadow', 'heath', 'scrub')
    if layer == 'land_use':
        return cls in ('forest', 'residential', 'commercial', 'industrial', 'retail', 'airfield', 'aerodrome', 'quarry', 'golf_course', 'pitch', 'recreation_ground', 'winter_sports')
    return True


LAYERS = {
    'segment': ('transportation/type=segment', ['id', 'names', 'subtype', 'class', 'subclass', 'routes', 'connectors', 'road_surface', 'geometry', 'bbox'], props_segment),
    'place': ('divisions/type=division', ['id', 'names', 'subtype', 'class', 'population', 'cartography', 'geometry', 'bbox'], props_place),
    'infrastructure': ('base/type=infrastructure', ['id', 'names', 'subtype', 'class', 'source_tags', 'geometry', 'bbox'], props_base),
    'land': ('base/type=land', ['id', 'names', 'subtype', 'class', 'elevation', 'source_tags', 'geometry', 'bbox'], props_base),
    'water': ('base/type=water', ['id', 'names', 'subtype', 'class', 'source_tags', 'geometry', 'bbox'], props_base),
    'land_use': ('base/type=land_use', ['id', 'names', 'subtype', 'class', 'source_tags', 'geometry', 'bbox'], props_base),
}


def fetch(layer):
    path, cols, props = LAYERS[layer]
    files = keys('release/%s/theme=%s/' % (RELEASE, path))
    region = box(*BBOX)
    feats, scanned, groups = [], 0, 0
    for i, key in enumerate(files):
        f = RangeFile(BUCKET + '/' + key)
        pf = pq.ParquetFile(f)
        md = pf.metadata
        ix = {md.schema.column(j).path: j for j in range(md.num_columns)}
        hit = []
        for g in range(md.num_row_groups):
            rg = md.row_group(g)
            st = {k: rg.column(ix['bbox.' + k]).statistics for k in ('xmin', 'xmax', 'ymin', 'ymax')}
            # Zeilengruppe berührt die Region, wenn xmin <= Ost, xmax >= West, ymin <= Nord, ymax >= Süd
            if (st['xmin'].min <= BBOX[2] and st['xmax'].max >= BBOX[0] and st['ymin'].min <= BBOX[3] and st['ymax'].max >= BBOX[1]):
                hit.append(g)
        scanned += 1
        for g in hit:
            groups += 1
            table = pf.read_row_group(g, columns=[c for c in cols if c in pf.schema_arrow.names])
            for r in table.to_pylist():
                b = r['bbox']
                if b['xmax'] < BBOX[0] or b['xmin'] > BBOX[2] or b['ymax'] < BBOX[1] or b['ymin'] > BBOX[3]:
                    continue
                geom = wkb.loads(r['geometry'])
                if not geom.intersects(region):
                    continue
                if geom.geom_type not in ('Point', 'MultiPoint') and layer != 'segment':
                    geom = geom.intersection(region)
                    if geom.is_empty:
                        continue
                p = props(r)
                if not keep(layer, p):
                    continue
                p['id'] = r['id']
                feats.append({'type': 'Feature', 'geometry': mapping(geom), 'properties': p})
        sys.stdout.write('\r%-15s Datei %d/%d, %d Zeilengruppen, %d Objekte' % (layer, i + 1, len(files), groups, len(feats)))
        sys.stdout.flush()
    print()
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, layer + '.geojson'), 'w') as fh:
        json.dump({'type': 'FeatureCollection', 'release': RELEASE, 'bbox': BBOX, 'features': feats}, fh, separators=(',', ':'))
    return len(feats)


if __name__ == '__main__':
    wanted = sys.argv[1:] or list(LAYERS)
    for name in wanted:
        if name not in LAYERS:
            sys.exit('Unbekannte Ebene: %s (möglich: %s)' % (name, ', '.join(LAYERS)))
        fetch(name)
    print('Fertig: ' + os.path.relpath(OUT, ROOT))
