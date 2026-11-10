# Near shore: a signed distance to the lake outlines, in the band beside the line.
# Run after track.py, in the folder that holds dem/. Writes shore.png (8192 x 128, 8 bit).
# Texel (c, r): route metre (c + 0.5) * L / 8192, offset t = 6 r + 3 m. Value: 128 + 4 * metres; land is above 128.
import json, math
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import distance_transform_edt
R = 6371000.0; cl = math.cos(math.radians(47.25))
en = lambda lat, lon: ((np.asarray(lon) - 9.0) * cl * math.pi / 180 * R, (np.asarray(lat) - 47.25) * math.pi / 180 * R)
# Lake outlines in local metres: outer rings fill, inner rings (islands) clear.
NAMES = {'Zürichsee', 'Obersee', 'Walensee'}
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
outer, inner = [], []
for e in json.load(open('dem/geo.json'))['elements']:
    if e.get('tags', {}).get('name') not in NAMES or e['type'] == 'node': continue
    if e['type'] == 'way' and 'geometry' in e: outer.append([(p['lat'], p['lon']) for p in e['geometry']])
    elif 'members' in e:
        outer += rings([[(p['lat'], p['lon']) for p in m['geometry']] for m in e['members'] if m.get('role') == 'outer' and 'geometry' in m])
        inner += rings([[(p['lat'], p['lon']) for p in m['geometry']] for m in e['members'] if m.get('role') == 'inner' and 'geometry' in m])
toEN = lambda r: np.stack(en([p[0] for p in r], [p[1] for p in r]), 1)
outer = [toEN(r) for r in outer]; inner = [toEN(r) for r in inner]
# The track frame, as build.py makes it.
tr = json.load(open('dem/track.json'))
pts = np.array(tr['pts'])
E, N = en(pts[:, 0], pts[:, 1])
cum = np.concatenate([[0], np.cumsum(np.hypot(np.diff(E), np.diff(N)))]); L = cum[-1]
s10 = np.arange(0, L, 10.0); E10 = np.interp(s10, cum, E); N10 = np.interp(s10, cum, N)
def smooth(a, sig):
    k = int(sig * 3 / 10); g = np.exp(-np.arange(-k, k + 1) ** 2 / (2 * (sig / 10) ** 2)); g /= g.sum()
    return np.convolve(np.pad(a, k, mode='edge'), g, 'valid')
def frame(sig):
    e, n = smooth(E10, sig), smooth(N10, sig); de, dn = np.gradient(e), np.gradient(n); m = np.hypot(de, dn)
    return e, n, -dn / m, de / m
NS, NT, DT = 8192, 128, 6.0
FS, FT = 4, 3
# The land texture holds route metre i * L / 4096 at texel i, but draws it at the texel's centre.
# So world x shows route metre x - L / 8192; this bake follows the drawn land.
ss = (np.arange(NS * FS) + 0.5) * L / (NS * FS) - L / 8192
tt = (np.arange(NT * FT) + 0.5) * DT / FT
eN, nN, lxN, lyN = frame(250); eF, nF, lxF, lyF = frame(3500)
I = lambda a: np.interp(ss, s10, a)
eN, nN, lxN, lyN, eF, nF, lxF, lyF = map(I, (eN, nN, lxN, lyN, eF, nF, lxF, lyF))
eT, nT = I(E10), I(N10)
wF = np.clip((tt - 300) / 3700, 0, 1); wF = wF * wF * (3 - 2 * wF)
inside = np.zeros((NS * FS, NT * FT), bool)
PX = 1.5; CH = 1024
for c0 in range(0, NS * FS, CH):
    sl = slice(c0, c0 + CH)
    lx = lxN[sl, None] * (1 - wF) + lxF[sl, None] * wF; ly = lyN[sl, None] * (1 - wF) + lyF[sl, None] * wF
    m = np.hypot(lx, ly); lx /= m; ly /= m
    pe = eT[sl, None] * (1 - wF) + eF[sl, None] * wF + lx * tt; pn = nT[sl, None] * (1 - wF) + nF[sl, None] * wF + ly * tt
    e0, n1 = pe.min() - 10, pn.max() + 10
    w, h = int((pe.max() + 10 - e0) / PX) + 2, int((n1 - (pn.min() - 10)) / PX) + 2
    img = Image.new('L', (w, h), 0); dr = ImageDraw.Draw(img)
    for r in outer: dr.polygon([((x - e0) / PX, (n1 - y) / PX) for x, y in r], fill=255)
    for r in inner: dr.polygon([((x - e0) / PX, (n1 - y) / PX) for x, y in r], fill=0)
    a = np.asarray(img)
    inside[sl] = a[np.clip(((n1 - pn) / PX).astype(int), 0, h - 1), np.clip(((pe - e0) / PX).astype(int), 0, w - 1)] > 0
ds, dt = L / (NS * FS), DT / FT
sd = distance_transform_edt(~inside, sampling=(ds, dt)) - distance_transform_edt(inside, sampling=(ds, dt))
sd = np.clip(sd, -40, 40)
# The ride loops: over the last 3 km the shore eases to the start's, as the land does.
K = int(3000 / ds)
w = (np.arange(K) + 1) / K; w = w * w * (3 - 2 * w)
sd[-K:] = sd[-K:] * (1 - w[:, None]) + sd[0][None, :] * w[:, None]
sd = sd.reshape(NS, FS, NT, FT).mean(axis=(1, 3))
q = np.clip(np.round(128 + 4 * sd), 0, 255).astype(np.uint8)
Image.fromarray(q.T).save('shore.png', optimize=True)
print('water share', (sd < 0).mean(), 'columns with water', (sd < 0).any(axis=1).mean())
