#!/usr/bin/env python3
"""Measure how far down a reader screenshot the controls reach.

Usage: python3 scripts/reader-measure.py <screenshot.png> [...]

Scans the left 3 pt margin (inside the screen's 16 pt page padding, so no
cards) from the top for the first row that is the page colour (COLORS.creamBg
#FAF6EF, light mode) after the header band, and reports it in points. iPhone
17 Pro Max screenshots are 1320 px wide = 440 pt (3x).
"""
import sys
from PIL import Image

PAGE = (0xFA, 0xF6, 0xEF)


def close(a, b, tol=6):
    return all(abs(x - y) <= tol for x, y in zip(a, b))


for path in sys.argv[1:]:
    im = Image.open(path).convert('RGB')
    scale = im.width / 440
    x = round(3 * scale)
    start = round(70 * scale)  # skip status bar / dynamic island
    edge = None
    for y in range(start, im.height):
        if close(im.getpixel((x, y)), PAGE) and close(im.getpixel((x, min(y + 6, im.height - 1))), PAGE):
            edge = y
            break
    pts = round(edge / scale) if edge is not None else None
    total = round(im.height / scale)
    share = f'{100 * pts / total:.0f}%' if pts else 'n/a'
    print(f'{path.split("/")[-1]}: controls end at {pts} pt of {total} pt ({share})')
