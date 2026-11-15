"""Bake Window seat's Vancouver map: window/van-coast.png and window/van-land.png.

Run: python -I tools/vancouver/bake.py <cache dir>
The cache dir holds the downloads; it stays outside the repo.

Sources:
  Elevation: Mapzen Terrain Tiles on AWS Open Data, terrarium zoom 10.
    Canada's land comes from NRCan CDEM (Open Government Licence - Canada).
  Land cover: ESA WorldCover 2021 v200 (CC BY 4.0), the 40 m overview.
    Read by HTTP range, about 5 MB of two 3 degree tiles.
"""
import math, os, sys, urllib.request
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from cog import open_cog

# The map's box in degrees, and its grids: the coast, then the land at half size.
LON0, LON1, LAT0, LAT1 = -124.3, -121.3, 48.85, 49.90
W, H = 2048, 1100
LW, LH = W // 2, H // 2
# The land file's top height in metres; window/van.js holds the same number.
EMAX = 2700.0
Z, XS, YS = 10, range(158, 167), range(347, 353)
TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
WORLDCOVER = 'https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_{name}_Map.tif'


def elevation(cache):
    """Metres above sea level on the coast grid, from the Web Mercator mosaic."""
    d = os.path.join(cache, 'terrarium')
    os.makedirs(d, exist_ok=True)
    mos = np.zeros((len(YS) * 256, len(XS) * 256), np.float32)
    for j, y in enumerate(YS):
        for i, x in enumerate(XS):
            p = os.path.join(d, f'{x}_{y}.png')
            if not os.path.exists(p):
                urllib.request.urlretrieve(TERRARIUM.format(z=Z, x=x, y=y), p)
            a = np.asarray(Image.open(p).convert('RGB'), np.float32)
            mos[j * 256:(j + 1) * 256, i * 256:(i + 1) * 256] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
    lon = LON0 + (np.arange(W) + 0.5) / W * (LON1 - LON0)
    lat = LAT1 - (np.arange(H) + 0.5) / H * (LAT1 - LAT0)
    n = 2 ** Z
    px = (lon + 180) / 360 * n * 256 - XS[0] * 256 - 0.5
    py = (1 - np.arcsinh(np.tan(np.radians(lat))) / math.pi) / 2 * n * 256 - YS[0] * 256 - 0.5
    X, Y = np.meshgrid(px, py)
    x0, y0 = np.floor(X).astype(int), np.floor(Y).astype(int)
    fx, fy = X - x0, Y - y0
    g = lambda a, b: mos[np.clip(b, 0, mos.shape[0] - 1), np.clip(a, 0, mos.shape[1] - 1)]
    e = (g(x0, y0) * (1 - fx) + g(x0 + 1, y0) * fx) * (1 - fy) + (g(x0, y0 + 1) * (1 - fx) + g(x0 + 1, y0 + 1) * fx) * fy
    # The sea floor exists only in US waters; the sea is level 0 everywhere.
    return np.maximum(e, 0).astype(np.float32)


def cover(cache):
    """WorldCover classes on a 40 m lon/lat grid over the box."""
    parts = []
    for name, west in [('N48W126', -126), ('N48W123', -123)]:
        src, lv = open_cog(WORLDCOVER.format(name=name), os.path.join(cache, 'worldcover'))
        L = lv[2]
        k = L.w / 3.0
        c0, c1 = round(max(LON0 - west, 0) * k), round(min(LON1 - west, 3) * k)
        r0, r1 = round((51 - LAT1) * k), round((51 - LAT0) * k)
        parts.append(L.window(c0, r0, c1, r1))
    return np.hstack(parts)


def share(cov, classes, size):
    """The share of each output pixel that the classes cover."""
    m = np.isin(cov, classes).astype(np.uint8) * 255
    return np.asarray(Image.fromarray(m).resize(size, Image.BOX), np.float32) / 255


def minfilter(a, r):
    out = a.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            out = np.minimum(out, np.roll(np.roll(a, dy, 0), dx, 1))
    return out


def main():
    cache = sys.argv[1]
    out = os.path.join(HERE, '..', '..', 'window')
    elev, cov = elevation(cache), cover(cache)
    water = share(cov, [80], (W, H))
    # Water near sea level is tidal: the sea, the inlets, the lower Fraser.
    # Higher water is a lake or a river reach; the lowest ground nearby gives its level.
    level = minfilter(elev, 3)
    tidal = np.clip((6.0 - level) / 4.0, 0, 1)
    u8 = lambda a: np.clip(np.round(a * 255), 0, 255).astype(np.uint8)
    coast = np.dstack([u8(water * tidal), u8(water * (1 - tidal)), np.zeros((H, W), np.uint8)])
    Image.fromarray(coast).save(os.path.join(out, 'van-coast.png'), optimize=True)
    # Height keeps fine steps near sea level: the square root of the share of EMAX.
    e2 = np.asarray(Image.fromarray(elev, 'F').resize((LW, LH), Image.BOX))
    hgt = u8(np.sqrt(np.clip(e2 / EMAX, 0, 1)))
    # Built-up land and forest keep 16 levels; that halves their size.
    q = lambda a: (np.round(np.clip(a, 0, 1) * 15) * 17).astype(np.uint8)
    # One grey sheet, three tiles top to bottom: height, built-up, forest.
    # Grey tiles pack about a quarter smaller than one RGB picture.
    land = np.vstack([hgt, q(share(cov, [50], (LW, LH))), q(share(cov, [10], (LW, LH)))])
    Image.fromarray(land).save(os.path.join(out, 'van-land.png'), optimize=True)
    for f in ['van-coast.png', 'van-land.png']:
        print(f, os.path.getsize(os.path.join(out, f)))


if __name__ == '__main__':
    main()
