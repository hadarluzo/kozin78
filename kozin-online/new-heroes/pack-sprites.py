"""Slice generated, connected sprites and register them without stretching limbs.

Usage: python pack-sprites.py manifest.json
The manifest maps output stems to generated PNGs. No artwork is synthesized here.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent


def extract(path, count):
    pixels = np.array(Image.open(path).convert('RGBA'))
    labels, _ = ndimage.label(pixels[:, :, 3] > 60)
    sizes = np.bincount(labels.ravel())
    ids = (np.argsort(sizes[1:])[-count:] + 1).tolist()
    assert min(sizes[i] for i in ids) > 2000, path
    sprites = []
    for label in ids:
        ys, xs = np.where(labels == label)
        l, t, r, b = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
        keep = ndimage.binary_dilation(labels[t:b, l:r] == label, iterations=2)
        crop = pixels[t:b, l:r].copy()
        crop[:, :, 3] *= keep
        sprites.append((t, l, Image.fromarray(crop)))
    sprites.sort(key=lambda s: s[0])
    ordered = []
    for n in range(0, count, 4):
        ordered.extend(s[2] for s in sorted(sprites[n:n+4], key=lambda s: s[1]))
    return ordered


def head_x(im):
    a = np.array(im)[:, :, 3]
    _, xs = np.where(a[:max(1, round(im.height * .14))] > 160)
    return float(xs.mean()) if len(xs) else im.width / 2


def pack(stem, path):
    intro = stem.endswith('-intro')
    car = stem.startswith('fahima-') and stem.endswith('-power')
    power = stem.endswith('-power')
    count = 20 if intro else 4 if car else 8 if power else 12
    sprites = extract(path, count)
    run_count = 0 if car or intro else 4 if power else 8
    run_scale = 300 / max(im.height for im in sprites[:run_count]) if run_count else 1
    action_scale = 300 / sprites[run_count].height if run_count else 1
    car_scale = min(300 / max(im.height for im in sprites), 410 / max(im.width for im in sprites))
    sheet = Image.new('RGBA', (448 * 4, 384 * ((count + 3) // 4)))
    for n, sprite in enumerate(sprites):
        if intro:
            scale = 300 / max(im.height for im in sprites)
            x = 248 - head_x(sprite) * scale
            y = 335 - sprite.height * scale
        elif car:
            scale = car_scale
            x = 224 - sprite.width * scale / 2
            y = 335 - sprite.height * scale
        else:
            scale = run_scale if n < run_count else action_scale
            scale = min(scale, 410 / sprite.width)
            x = 248 - head_x(sprite) * scale
            x = max(12, min(x, 436 - sprite.width * scale))
            if n < run_count:
                y = 35 - [0, 2, 5, 3, 0, 2, 5, 3][n]
            elif n == run_count + 1:
                y = 75  # Tucked jumping legs stay tucked, never stretched to standing height.
            else:
                y = 335 - sprite.height * scale
        resized = sprite.resize((round(sprite.width * scale), round(sprite.height * scale)), Image.Resampling.LANCZOS)
        sheet.alpha_composite(resized, (n % 4 * 448 + round(x), n // 4 * 384 + round(y)))
    output = ROOT / (stem + '.webp')
    sheet.save(output, quality=88, method=6)
    print(stem, count, output.stat().st_size)


if __name__ == '__main__':
    for stem, path in json.loads(Path(sys.argv[1]).read_text()).items():
        pack(stem, path)
