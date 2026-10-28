#!/usr/bin/env python3
"""Stellt die Klub-Logos frei (weisser Grund → transparent) und legt Web-Fassungen ab.

Die Originale liegen unverändert in design-system/assets/Logos/original/. Für jeden Pixel wird
geprüft, aus welcher Logofarbe und wie viel Weiss er gemischt ist – so bleiben Gelb und Schwarz
voll deckend und nur die weichen Kanten zum Weiss werden transparent.
Aufruf: python3 tools/prepare-logos.py
"""
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, 'design-system', 'assets', 'Logos')

SIGNET_COLORS = [(235, 197, 59), (32, 31, 31)]
SUN_COLORS = [(255, 217, 0), (0, 1, 1), (39, 207, 207)]


def unmix_white(img, colors):
    px = np.asarray(img.convert('RGB')).astype(np.float64)
    best_err = np.full(px.shape[:2], np.inf)
    best_a = np.ones(px.shape[:2])
    best_c = np.zeros(px.shape)
    for c in colors:
        ref = np.array(c, dtype=np.float64)
        span = 255 - ref
        w = span > 30
        a = ((255 - px[..., w]) / span[w]).mean(axis=2)
        a = np.clip(a, 0, 1)
        recon = a[..., None] * ref + (1 - a[..., None]) * 255
        err = np.abs(recon - px).max(axis=2)
        better = err < best_err
        best_err[better], best_a[better] = err[better], a[better]
        best_c[better] = ref
    # Pixel, die sich nicht als «Logofarbe + Weiss» erklären lassen, sind Mischungen zweier
    # Logofarben (z. B. Gelb neben Schwarz): voll deckend, Originalfarbe behalten.
    mixed = best_err > 24
    alpha = np.where(mixed, 1.0, best_a)
    rgb = np.where(mixed[..., None], px, best_c)
    alpha[(px.min(axis=2) > 246)] = 0
    rgba = np.dstack([rgb, alpha * 255]).round().astype(np.uint8)
    return Image.fromarray(rgba, 'RGBA')


def trim(img, pad=8):
    x0, y0, x1, y1 = img.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    return img.crop((max(x0 - pad, 0), max(y0 - pad, 0), min(x1 + pad, img.width), min(y1 + pad, img.height)))


def main():
    signet = Image.open(os.path.join(DIR, 'original', 'gkg-signet-original.png'))
    trim(unmix_white(signet, SIGNET_COLORS)).save(os.path.join(DIR, 'gkg-signet.png'), optimize=True)
    sun = Image.open(os.path.join(DIR, 'original', 'gkg-sonne-original.jpg')).convert('RGB')
    split = 586  # leere Spalte zwischen den beiden Fassungen
    trim(unmix_white(sun.crop((0, 0, split, sun.height)), SUN_COLORS)).save(os.path.join(DIR, 'gkg-sonne-bogen.png'), optimize=True)
    trim(unmix_white(sun.crop((split + 2, 0, sun.width, sun.height)), SUN_COLORS)).save(os.path.join(DIR, 'gkg-sonne-text.png'), optimize=True)
    for f in ('gkg-signet.png', 'gkg-sonne-bogen.png', 'gkg-sonne-text.png'):
        p = os.path.join(DIR, f)
        print(f, Image.open(p).size, f'{os.path.getsize(p) // 1024} KB')


if __name__ == '__main__':
    main()
