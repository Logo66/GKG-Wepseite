#!/usr/bin/env python3
"""Holt die SHV-Infotafeln der GKG-Gebiete von shv-fsvl.ch und rendert Seite 1 als Vorschaubild.

  build/shv/<id>.pdf    die Tafel, wie sie der SHV veröffentlicht
  build/shv/<id>.webp   Vorschau (Seite 1, ca. 1400 px breit) für das Pop-up im Prototyp

Im Live-Betrieb läuft das täglich auf dem GKG-Server (nur neu laden, wenn sich die Datei
geändert hat). Rechte: Die Tafeln gehören dem SHV – Verwendung auf gkg.ch mit dem SHV klären,
Quelle immer nennen und auf das Original verlinken.

Aufruf:  python3 tools/fetch-shv.py               (lädt von shv-fsvl.ch)
         python3 tools/fetch-shv.py --pdf mollis=pfad/zur/datei.pdf   (lokale Datei verwenden)
Benötigt pdftoppm (poppler-utils) und Pillow.
"""
import os
import subprocess
import sys
import tempfile
import urllib.request

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'build', 'shv')
BASE = 'https://www.shv-fsvl.ch/fileadmin/files/redakteure/Allgemein/Sicherheit/SHVInfotafeln/'
TAFELN = {'mollis': 'Mollis.pdf', 'schaenis': 'Schaenis.pdf', 'braunwald': 'Braunwald.pdf'}


def render(pdf, dst):
    with tempfile.TemporaryDirectory() as tmp:
        prefix = os.path.join(tmp, 'p')
        subprocess.run(['pdftoppm', '-f', '1', '-l', '1', '-r', '110', '-png', pdf, prefix], check=True)
        png = [f for f in os.listdir(tmp) if f.endswith('.png')][0]
        im = Image.open(os.path.join(tmp, png)).convert('RGB')
        if im.width > 1400:
            im = im.resize((1400, round(im.height * 1400 / im.width)), Image.LANCZOS)
        im.save(dst, 'WEBP', quality=82, method=6)
        return im.size


def main(argv):
    local = dict(a.split('=', 1) for a in argv[argv.index('--pdf') + 1:]) if '--pdf' in argv else {}
    os.makedirs(OUT, exist_ok=True)
    ok = 0
    for tid, name in TAFELN.items():
        pdf = os.path.join(OUT, tid + '.pdf')
        try:
            if tid in local:
                with open(local[tid], 'rb') as f:
                    data = f.read()
            elif not local:
                req = urllib.request.Request(BASE + name, headers={'User-Agent': 'GKG-Website (info@gkg.ch)'})
                data = urllib.request.urlopen(req, timeout=30).read()
            else:
                continue
            with open(pdf, 'wb') as f:
                f.write(data)
            size = render(pdf, os.path.join(OUT, tid + '.webp'))
            print(f'{tid}: {len(data) // 1024} KB PDF → Vorschau {size[0]}×{size[1]}')
            ok += 1
        except Exception as err:  # eine fehlende Tafel stoppt die anderen nicht
            print(f'{tid}: nicht geladen ({err})')
    print(f'{ok} von {len(TAFELN) if not local else len(local)} Tafeln → {os.path.relpath(OUT, ROOT)}/')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
