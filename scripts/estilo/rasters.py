#!/usr/bin/env python3
"""Gera as camadas suaves do estilo "Oficial" (inspirado no mapa impresso de Leonida):

  agua.png    cor da água (oceano turquesa, halo claro na costa, baías e lagos mais claros)
  relevo.png  sombreado de relevo sintético (cinza 128 = neutro), forte no norte montanhoso
  vegetacao.png  máscara de mata (0..255), para as manchas verdes do mapa

Ambas cobrem x 160..832, y 160..800 (unidades do mapa) a PX_POR_UNIDADE px/unidade.
Uso: python3 rasters.py <data/land.json> <saida/>
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

X0, Y0, X1, Y1 = 160, 160, 832, 800
K = 4  # px por unidade
W, H = (X1 - X0) * K, (Y1 - Y0) * K
rng = np.random.default_rng(6)


def land_mask(land):
    img = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(img)
    for poly in land:
        d.polygon([((x - X0) * K, (y - Y0) * K) for x, y in poly[0]], fill=255)
        for hole in poly[1:]:
            if len(hole) > 2:
                d.polygon([((x - X0) * K, (y - Y0) * K) for x, y in hole], fill=0)
    return np.asarray(img).astype(np.float32) / 255


def box(a, r, axis):
    r = int(max(1, r))
    pad = [(0, 0), (0, 0)]
    pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode="edge"), axis=axis)
    n = a.shape[axis]
    if axis == 0:
        return (c[2 * r + 1:2 * r + 1 + n] - c[:n]) / (2 * r + 1)
    return (c[:, 2 * r + 1:2 * r + 1 + n] - c[:, :n]) / (2 * r + 1)


def blur(a, sigma):
    """Gaussiana aproximada por 3 passadas de caixa (sigma em px)."""
    r = max(1, int(round(np.sqrt(12 * sigma * sigma / 3 + 1) / 2)))
    for _ in range(3):
        a = box(box(a, r, 0), r, 1)
    return a


def noise(scale_px, oct_=5, seed_shift=0):
    """Ruído fractal suave (fbm) em [−1, 1]."""
    out = np.zeros((H, W), np.float32)
    amp, tot = 1.0, 0.0
    s = scale_px
    for o in range(oct_):
        gw, gh = max(2, int(W / s) + 2), max(2, int(H / s) + 2)
        g = rng.standard_normal((gh, gw)).astype(np.float32)
        im = Image.fromarray(g, mode="F").resize((W, H), Image.BICUBIC)
        out += amp * np.asarray(im)
        tot += amp
        amp *= 0.5
        s /= 2
    out /= tot
    return np.clip(out / (np.abs(out).max() + 1e-6), -1, 1)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def hexrgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def main(land_path, out):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    land = land_mask(json.loads(Path(land_path).read_text()))

    # ------------------------------------------------------------ água
    near = blur(land, 3.5 * K)      # água cercada de terra (canais, baías, lagos)
    halo = blur(land, 14 * K)       # brilho ao redor da ilha
    far = blur(land, 40 * K)        # mar mais claro perto do arquipélago
    ocean = hexrgb("#01a9c8")
    oceanfar = hexrgb("#0aa2c4")
    glow = hexrgb("#14bcd4")
    bay = hexrgb("#55c3d2")
    c = oceanfar[None, None] + (ocean - oceanfar)[None, None] * smoothstep(0.0, 0.25, far)[..., None]
    c = c + (glow - c) * (smoothstep(0.02, 0.5, halo) * 0.75)[..., None]
    c = c + (bay - c) * smoothstep(0.32, 0.75, near)[..., None]
    n = noise(60 * K, 4)
    c *= (1 + 0.035 * n)[..., None]
    Image.fromarray(np.clip(c, 0, 255).astype(np.uint8), "RGB").save(out / "agua.png", optimize=True)

    # ------------------------------------------------------------ relevo
    ys = (np.arange(H) / K + Y0)[:, None]
    xs = (np.arange(W) / K + X0)[None, :]
    # montanhas no norte (Lummox / Mount Kalaga), colinas em Kelly County, plano no sul
    north = 1 - smoothstep(300, 380, ys)
    kelly = (1 - smoothstep(440, 520, ys)) * (1 - smoothstep(440, 520, xs)) * 0.55
    hills = np.maximum(north * (1 - 0.6 * smoothstep(470, 560, xs)), kelly) * np.ones((H, W), np.float32)
    inland = smoothstep(0.45, 0.95, blur(land, 6 * K))  # suaviza perto da costa
    ridges = 1 - np.abs(noise(70 * K, 6))               # cristas
    elev = 0.6 * ridges + 0.4 * (noise(120 * K, 3) * 0.5 + 0.5)
    gy, gx = np.gradient(elev * 260)
    # luz de noroeste (como em mapas impressos)
    lx, ly, lz = -0.6, -0.6, 0.53
    nz = 1 / np.sqrt(gx * gx + gy * gy + 1)
    shade = (-gx * lx - gy * ly + lz) * nz - lz       # ~ -0.5..0.5, 0 = plano
    amp = (0.12 + 0.88 * hills) * inland              # intensidade por região
    rel = 128 + np.clip(shade, -0.6, 0.6) * 170 * amp
    veg = noise(40 * K, 4)                             # manchas de mata/campo
    rel += veg * 12 * smoothstep(0.2, 0.6, land)
    Image.fromarray(np.clip(rel, 0, 255).astype(np.uint8), "L").save(out / "relevo.png", optimize=True)

    # ------------------------------------------------------------ vegetação (manchas de mata, como o Google Maps)
    patches = smoothstep(-0.05, 0.35, noise(55 * K, 4))
    veg = np.maximum(hills * 0.95, patches * 0.75) * smoothstep(0.55, 0.9, blur(land, 2.5 * K))
    Image.fromarray(np.clip(veg * 255, 0, 255).astype(np.uint8), "L").save(out / "vegetacao.png", optimize=True)
    print("ok", W, H)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
