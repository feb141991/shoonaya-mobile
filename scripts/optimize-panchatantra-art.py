#!/usr/bin/env python3
"""Convert generated Panchatantra storybook images to bundle-ready WebP.

Usage:
  python3 scripts/optimize-panchatantra-art.py path/to/scene.png [more files...]

For each input (PNG or JPEG) this writes assets/panchatantra/<name>.webp at
quality 80 (method 6), downscaling only if wider than MAX_WIDTH, and prints the
before/after size and a PSNR fidelity score. It refuses to write a file over
BUDGET_BYTES, so an image that cannot meet the budget is caught here rather
than in review. Originals are never deleted; remove them yourself once wired.

Settings were chosen on 2026-10-07 against the 93 tier-2 images: 95.4 MB of
JPEG became 18.1 MB of WebP (81% smaller), lowest PSNR 33.1 dB, no visible
difference at 2x zoom. See docs/artwork/panchatantra-storybook/IMAGE_SPEC.md.
"""
import math
import os
import sys

from PIL import Image, ImageChops, ImageStat

QUALITY = 80
MAX_WIDTH = 1376          # widest existing scene; fills a phone screen at 3x
BUDGET_BYTES = 600 * 1024  # same limit __tests__/panchatantra-asset-budget.test.ts enforces
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'panchatantra')


def psnr(a, b):
    rms = ImageStat.Stat(ImageChops.difference(a, b)).rms
    mse = sum(x * x for x in rms) / 3
    return float('inf') if mse == 0 else 10 * math.log10(255 ** 2 / mse)


def convert(path):
    src = Image.open(path).convert('RGB')
    if src.width > MAX_WIDTH:
        src = src.resize((MAX_WIDTH, round(src.height * MAX_WIDTH / src.width)), Image.LANCZOS)
    name = os.path.splitext(os.path.basename(path))[0] + '.webp'
    out = os.path.join(OUT_DIR, name)
    tmp = out + '.tmp'
    src.save(tmp, 'WEBP', quality=QUALITY, method=6)
    size = os.path.getsize(tmp)
    if size > BUDGET_BYTES:
        os.remove(tmp)
        return f'REJECTED {name}: {size // 1024} KB is over the {BUDGET_BYTES // 1024} KB budget'
    os.replace(tmp, out)
    score = psnr(src, Image.open(out).convert('RGB'))
    return f'{name}: {os.path.getsize(path) // 1024} KB -> {size // 1024} KB, {src.width}x{src.height}, PSNR {score:.1f} dB'


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    failed = False
    for arg in sys.argv[1:]:
        line = convert(arg)
        failed |= line.startswith('REJECTED')
        print(line)
    sys.exit(1 if failed else 0)
