# Roads beside the line: OSM ways within 540 m on the lake side, baked as a distance map.
# Run after track.py, in the folder that holds dem/. Fetches dem/roads.json once, then writes roads.png.
# roads.png is 8192 x 256: the route's first half over its second half, each 8192 x 128.
# Joined, texel (c, r) is route metre (c + 0.5) * L / 16384 at offset t = 4 r + 2 m.
# Value / 10 - 4 is the distance to the road's edge in metres; below zero is on the road.
import json, math, os, time, urllib.request, urllib.parse
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import distance_transform_edt
R = 6371000.0; cl = math.cos(math.radians(47.25))
en = lambda lat, lon: ((np.asarray(lon) - 9.0) * cl * math.pi / 180 * R, (np.asarray(lat) - 47.25) * math.pi / 180 * R)
ll = lambda e, n: (47.25 + n / R * 180 / math.pi, 9.0 + e / (cl * R) * 180 / math.pi)
# Half widths in metres, by road class.
HW = {'motorway': 5.0, 'trunk': 4.5, 'primary': 4.0, 'secondary': 3.5, 'tertiary': 3.2, 'unclassified': 2.6, 'residential': 2.6,
      'motorway_link': 3.0, 'trunk_link': 3.0, 'primary_link': 3.0, 'secondary_link': 2.8}
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
FR = [frame(250), frame(3500)]
def band(ss, tt):
    # East and north of each (s, t), as the land map places them.
    (eN, nN, lxN, lyN), (eF, nF, lxF, lyF) = [[np.interp(ss, s10, a) for a in f] for f in FR]
    eT, nT = np.interp(ss, s10, E10), np.interp(ss, s10, N10)
    wF = np.clip((tt - 300) / 3700, 0, 1); wF = wF * wF * (3 - 2 * wF)
    lx = lxN[:, None] * (1 - wF) + lxF[:, None] * wF; ly = lyN[:, None] * (1 - wF) + lyF[:, None] * wF
    m = np.hypot(lx, ly)
    return eT[:, None] * (1 - wF) + eF[:, None] * wF + lx / m * tt, nT[:, None] * (1 - wF) + nF[:, None] * wF + ly / m * tt
if not os.path.exists('dem/roads.json'):
    ways = {}
    cls = '|'.join(HW)
    for s0 in np.arange(0, L, 8000.0):
        ss = np.arange(s0 - 200, min(s0 + 8200, L), 150.0).clip(0, L - 1)
        pe, pn = band(ss, np.array([-40.0, 580.0]))
        ring = list(zip(*ll(pe[:, 0], pn[:, 0]))) + list(zip(*ll(pe[::-1, 1], pn[::-1, 1])))
        poly = ' '.join(f'{a:.5f} {b:.5f}' for a, b in ring)
        q = f'[out:json][timeout:120];way["highway"~"^({cls})$"](poly:"{poly}");out geom;'
        for attempt in range(4):
            try:
                req = urllib.request.Request('https://overpass-api.de/api/interpreter', data=urllib.parse.urlencode({'data': q}).encode(), headers={'User-Agent': 'stimming-bake'})
                els = json.load(urllib.request.urlopen(req, timeout=180))['elements']; break
            except Exception as ex:
                print('retry', s0, ex); time.sleep(8 + 8 * attempt)
        else: raise SystemExit('fetch failed')
        for e in els:
            if e.get('tags', {}).get('tunnel') in ('yes', 'building_passage') or 'geometry' not in e: continue
            ways[e['id']] = [e['tags']['highway'], [[round(p['lat'], 6), round(p['lon'], 6)] for p in e['geometry']]]
        print(f'{s0 / 1000:5.0f} km: {len(els)} ways'); time.sleep(2)
    json.dump(list(ways.values()), open('dem/roads.json', 'w'))
ways = [(HW[c], np.stack(en([p[0] for p in g], [p[1] for p in g]), 1)) for c, g in json.load(open('dem/roads.json'))]
print(len(ways), 'ways', sum(np.hypot(*np.diff(w, axis=0).T).sum() for _, w in ways) / 1000, 'km')
NS, NT, DT, FS, FT = 16384, 128, 4.0, 2, 2
# The land texture draws route metre x - L / 8192 at world x; this bake follows the drawn land.
ss = (np.arange(NS * FS) + 0.5) * L / (NS * FS) - L / 8192
tt = (np.arange(NT * FT) + 0.5) * DT / FT
inside = np.zeros((NS * FS, NT * FT), bool)
PX = 1.0; CH = 1024
for c0 in range(0, NS * FS, CH):
    pe, pn = band(ss[c0:c0 + CH], tt)
    e0, e1, n0, n1 = pe.min() - 12, pe.max() + 12, pn.min() - 12, pn.max() + 12
    w, h = int((e1 - e0) / PX) + 2, int((n1 - n0) / PX) + 2
    img = Image.new('L', (w, h), 0); dr = ImageDraw.Draw(img)
    for hw, g in ways:
        if g[:, 0].max() < e0 or g[:, 0].min() > e1 or g[:, 1].max() < n0 or g[:, 1].min() > n1: continue
        dr.line([((x - e0) / PX, (n1 - y) / PX) for x, y in g], fill=255, width=max(2, round(2 * hw / PX)), joint='curve')
    a = np.asarray(img)
    inside[c0:c0 + CH] = a[np.clip(((n1 - pn) / PX).astype(int), 0, h - 1), np.clip(((pe - e0) / PX).astype(int), 0, w - 1)] > 0
ds, dt = L / (NS * FS), DT / FT
sd = distance_transform_edt(~inside, sampling=(ds, dt)) - distance_transform_edt(inside, sampling=(ds, dt))
sd = np.clip(sd, -4, 21.5)
# The ride loops: over the last 3 km the roads fade out, as the land eases to the start's.
K = int(3000 / ds)
w = (np.arange(K) + 1) / K; w = w * w * (3 - 2 * w)
sd[-K:] = sd[-K:] * (1 - w[:, None]) + 21.5 * w[:, None]
sd = sd.reshape(NS, FS, NT, FT).mean(axis=(1, 3))
q = np.clip(np.round((sd + 4) * 10), 0, 255).astype(np.uint8).T
Image.fromarray(np.vstack([q[:, :NS // 2], q[:, NS // 2:]])).save('roads.png', optimize=True)
print('road share', (sd < 0).mean())
