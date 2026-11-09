import json, math
import numpy as np
from PIL import Image, ImageDraw
Z = 13; X0, X1, Y0, Y1 = 4287, 4311, 2863, 2879
W, H = (X1 - X0 + 1) * 256, (Y1 - Y0 + 1) * 256
dem = np.zeros((H, W), np.float32)
for x in range(X0, X1 + 1):
    for y in range(Y0, Y1 + 1):
        a = np.asarray(Image.open(f'dem/t13/{x}_{y}.png').convert('RGB')).astype(np.float32)
        dem[(y - Y0) * 256:(y - Y0 + 1) * 256, (x - X0) * 256:(x - X0 + 1) * 256] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
def merc(lat, lon):
    n = 2 ** Z
    return (np.asarray(lon) + 180) / 360 * n * 256 - X0 * 256, (1 - np.arcsinh(np.tan(np.radians(lat))) / np.pi) / 2 * n * 256 - Y0 * 256
def bil(img, px, py):
    px = np.clip(px, 0, img.shape[1] - 1.001); py = np.clip(py, 0, img.shape[0] - 1.001)
    x0 = np.floor(px).astype(int); y0 = np.floor(py).astype(int); fx = px - x0; fy = py - y0
    return (img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x0 + 1] * fx * (1 - fy) + img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x0 + 1] * fx * fy)
# Lakes: rasterise the OSM outlines on the mosaic grid with their real levels.
geo = json.load(open('dem/geo.json'))
LEVEL = {'Zürichsee': 406.0, 'Obersee': 406.0, 'Walensee': 419.0, 'Greifensee': 435.0, 'Pfäffikersee': 537.0, 'Türlersee': 643.0, 'Lützelsee': 500.0}
lakeImg = Image.new('F', (W, H), 0.0); dr = ImageDraw.Draw(lakeImg)
def rings(ways):
    ways = [w[:] for w in ways if len(w) > 1]; out = []
    while ways:
        r = ways.pop(0)
        while r[0] != r[-1]:
            for i, w in enumerate(ways):
                if w[0] == r[-1]: r += w[1:]; ways.pop(i); break
                if w[-1] == r[-1]: r += w[::-1][1:]; ways.pop(i); break
            else: break
        out.append(r)
    return out
for e in geo['elements']:
    nm = e.get('tags', {}).get('name')
    if nm not in LEVEL or e['type'] == 'node' or ('members' not in e and 'geometry' not in e): continue
    if e['type'] == 'way': outer = [[(p['lat'], p['lon']) for p in e['geometry']]]; inner = []
    else:
        outer = rings([[(p['lat'], p['lon']) for p in m['geometry']] for m in e['members'] if m.get('role') == 'outer' and 'geometry' in m])
        inner = rings([[(p['lat'], p['lon']) for p in m['geometry']] for m in e['members'] if m.get('role') == 'inner' and 'geometry' in m])
    for r in outer:
        px, py = merc([p[0] for p in r], [p[1] for p in r]); dr.polygon(list(zip(px, py)), fill=LEVEL[nm])
    for r in inner:
        px, py = merc([p[0] for p in r], [p[1] for p in r]); dr.polygon(list(zip(px, py)), fill=0.0)
lake = np.asarray(lakeImg, np.float32)
wet = (lake > 0).astype(np.float32)
dem = np.where(wet > 0, lake, dem)
# Towns: soft splats from OSM places on a coarse grid.
RAD = {'city': (2200, 1.0), 'town': (800, 0.9), 'suburb': (550, 0.8), 'village': (380, 0.7), 'hamlet': (130, 0.45)}
dens = np.zeros((H // 4, W // 4), np.float32)
mpp = 2 * math.pi * 6378137 * math.cos(math.radians(47.25)) / (2 ** Z * 256) * 4
gy, gx = np.mgrid[0:H // 4, 0:W // 4]
for e in geo['elements']:
    p = e.get('tags', {}).get('place')
    if p not in RAD or e['type'] != 'node': continue
    r, w = RAD[p]; px, py = merc(e['lat'], e['lon']); px /= 4; py /= 4; rr = r / mpp
    x0, x1, y0, y1 = int(px - 3 * rr), int(px + 3 * rr) + 1, int(py - 3 * rr), int(py + 3 * rr) + 1
    x0, y0 = max(x0, 0), max(y0, 0)
    sub = dens[y0:y1, x0:x1]
    if sub.size == 0: continue
    sub += w * np.exp(-((gx[y0:y1, x0:x1] - px) ** 2 + (gy[y0:y1, x0:x1] - py) ** 2) / (rr * rr))
dens = np.clip(dens, 0, 1)
# Track: resample at 10 m in local metres.
tr = json.load(open('dem/track.json'))
pts = np.array(tr['pts']); R = 6371000.0; cl = math.cos(math.radians(47.25))
E = (pts[:, 1] - 9.0) * cl * math.pi / 180 * R; N = (pts[:, 0] - 47.25) * math.pi / 180 * R
seglen = np.hypot(np.diff(E), np.diff(N)); cum = np.concatenate([[0], np.cumsum(seglen)]); L = cum[-1]
s10 = np.arange(0, L, 10.0); E10 = np.interp(s10, cum, E); N10 = np.interp(s10, cum, N)
def smooth(a, sig):
    k = int(sig * 3 / 10); g = np.exp(-np.arange(-k, k + 1) ** 2 / (2 * (sig / 10) ** 2)); g /= g.sum()
    p = np.pad(a, k, mode='edge'); return np.convolve(p, g, 'valid')
def frame(sig):
    e, n = smooth(E10, sig), smooth(N10, sig); de, dn = np.gradient(e), np.gradient(n); m = np.hypot(de, dn)
    return e, n, -dn / m, de / m   # base and the left normal
NS, NT = 4096, 256
b = (18400 - 8 * (NT - 1)) / (NT - 1) ** 2
tj = -400 + 8 * np.arange(NT) + b * np.arange(NT) ** 2
ss = np.arange(NS) * L / NS
eN, nN, lxN, lyN = frame(250); eF, nF, lxF, lyF = frame(3500)
I = lambda a: np.interp(ss, s10, a)
eN, nN, lxN, lyN, eF, nF, lxF, lyF = map(I, (eN, nN, lxN, lyN, eF, nF, lxF, lyF))
eT, nT = I(E10), I(N10)
wF = np.clip((tj - 300) / 3700, 0, 1); wF = wF * wF * (3 - 2 * wF)
S, T = np.meshgrid(np.arange(NS), np.arange(NT), indexing='ij')
lx = lxN[S] * (1 - wF[T]) + lxF[S] * wF[T]; ly = lyN[S] * (1 - wF[T]) + lyF[S] * wF[T]
m = np.hypot(lx, ly); lx /= m; ly /= m
be = eT[S] * (1 - wF[T]) + eF[S] * wF[T]; bn = nT[S] * (1 - wF[T]) + nF[S] * wF[T]
pe = be + lx * tj[T]; pn = bn + ly * tj[T]
lat = 47.25 + pn / R * 180 / math.pi; lon = 9.0 + pe / (cl * R) * 180 / math.pi
px, py = merc(lat, lon)
hg = bil(dem, px, py); wg = bil(wet, px, py); dg = bil(dens, px / 4, py / 4) * (1 - np.clip(wg * 2, 0, 1))
# The eye rides 6 m above the smoothed rail level.
j0 = int(np.argmin(np.abs(tj)))
rail = smooth(np.interp(s10, ss, hg[:, j0 + 2]), 300); rail = np.interp(ss, s10, rail)
rel = hg - rail[:, None] - 6.0
# Cuttings and tunnels: nothing near the line rises above the sill.
lim = np.where(tj < 0, -4.0, -3.0 + np.maximum(tj - 25.0, 0) * 0.7)
rel = np.minimum(rel, lim[None, :])
# The ride loops: the last 3 km ease back to the start.
K = int(3000 / (L / NS))
for k in range(K):
    w = (k + 1) / K; w = w * w * (3 - 2 * w)
    i = NS - K + k
    rel[i] = rel[i] * (1 - w) + rel[0] * w; wg[i] = wg[i] * (1 - w) + wg[0] * w; dg[i] = dg[i] * (1 - w) + dg[0] * w
q = np.clip(np.round((rel + 500) * 10), 0, 65535).astype(np.uint16)
img = np.zeros((NT, NS, 3), np.uint8)
img[..., 0] = (q >> 8).T; img[..., 1] = (q & 255).T
img[..., 2] = np.where(wg.T > 0.5, 255, np.clip(np.round(dg.T * 250), 0, 250)).astype(np.uint8)
Image.fromarray(img).save('route.png', optimize=True)
st = [(n, round(float(s), 1)) for n, s in tr['stations']]
meta = {'L': round(float(L), 1), 'NS': NS, 'NT': NT, 'b': b, 'stations': st}
json.dump(meta, open('route-meta.json', 'w'), ensure_ascii=False)
print('L', L, 'rel range', rel.min(), rel.max(), 'water frac', (wg > 0.5).mean(), 'dens mean', dg.mean())
print(json.dumps(meta, ensure_ascii=False)[:600])
# Places in route coordinates: the nearest grid sample to each town or village.
sub = (slice(None, None, 2), slice(None, None, 2))
glat, glon = lat[sub].ravel(), lon[sub].ravel()
gs, gt = np.meshgrid(ss, tj, indexing='ij'); gs, gt = gs[sub].ravel(), gt[sub].ravel()
places = []
for e in geo['elements']:
    p = e.get('tags', {}).get('place')
    if e['type'] != 'node' or p not in ('city', 'town', 'village', 'suburb'): continue
    d2 = ((glat - e['lat']) * 111000) ** 2 + ((glon - e['lon']) * 111000 * cl) ** 2
    i = int(np.argmin(d2))
    if d2[i] > 400 ** 2 or gt[i] < 60: continue
    places.append([round(float(gs[i])), round(float(gt[i])), p[0], e['tags'].get('name', '')])
meta['places'] = places
json.dump(meta, open('route-meta.json', 'w'), ensure_ascii=False)
print('places', len(places))
