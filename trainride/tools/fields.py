# Farm fields beside the line from the federal parcel map, baked as fields.png.
# Source: BLW, Landwirtschaftliche Nutzungsflächen, from the geodienste.ch WFS (open use, name the source).
# Run after track.py, in the folder that holds dem/. Fetches dem/fields.json once, then writes fields.png.
# fields.png is 8192 x 512, RGB. Texel (c, r) is route metre (c + 0.5) * L / 8192 - L / 8192 at offset t = 8 r + 4 m.
# R: class * 16 + a seed per parcel. G: metres to the parcel's edge, times 4, up to 8 m.
# B: the parcel's heading against the line, 0 to pi, in 64 steps of 4.
import json, math, os, time, urllib.request, zlib
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import distance_transform_edt
R = 6371000.0; cl = math.cos(math.radians(47.25))
en = lambda lat, lon: ((np.asarray(lon) - 9.0) * cl * math.pi / 180 * R, (np.asarray(lat) - 47.25) * math.pi / 180 * R)
ll = lambda e, n: (47.25 + n / R * 180 / math.pi, 9.0 + e / (cl * R) * 180 / math.pi)
def lv95(lat, lon):
    # swisstopo's approximate formulas; good to about a metre.
    p = (lat * 3600 - 169028.66) / 10000; l = (lon * 3600 - 26782.5) / 10000
    return (2600072.37 + 211455.93 * l - 10938.51 * l * p - 0.36 * l * p * p - 44.54 * l ** 3,
            1200147.07 + 308807.95 * p + 3745.25 * l * l + 76.63 * p * p - 194.56 * l * l * p + 119.79 * p ** 3)
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
NS, NT, DT = 8192, 512, 8.0
# The land texture draws route metre x - L / 8192 at world x; this bake follows the drawn land.
ss = (np.arange(NS) + 0.5) * L / NS - L / 8192
tt = (np.arange(NT) + 0.5) * DT
pe, pn = band(ss, tt)
E95, N95 = lv95(*ll(pe, pn))
CH = 256
WFS = 'https://geodienste.ch/db/lwb_nutzungsflaechen_v2_0_0/deu?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=ms:nutzungsflaechen&OUTPUTFORMAT=geojson'
if not os.path.exists('dem/fields.json'):
    parcels = {}
    for c0 in range(0, NS, CH):
        e, n = E95[c0:c0 + CH], N95[c0:c0 + CH]
        # Tiles of 2 km keep each reply small.
        for e0 in np.arange(e.min() // 2000 * 2000, e.max() + 1, 2000):
            for n0 in np.arange(n.min() // 2000 * 2000, n.max() + 1, 2000):
                key = f'{int(e0)}_{int(n0)}'
                if key in parcels: continue
                if not ((e >= e0) & (e < e0 + 2000) & (n >= n0) & (n < n0 + 2000)).any(): parcels[key] = []; continue
                got, start = [], 0
                while True:
                    url = f'{WFS}&BBOX={e0:.0f},{n0:.0f},{e0 + 2000:.0f},{n0 + 2000:.0f},urn:ogc:def:crs:EPSG::2056&COUNT=5000&STARTINDEX={start}'
                    for attempt in range(4):
                        try:
                            fs = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'stimming-bake'}), timeout=120))['features']; break
                        except Exception as ex:
                            print('retry', key, ex); time.sleep(5 + 5 * attempt)
                    else: raise SystemExit('fetch failed')
                    for f in fs:
                        p, g = f['properties'], f['geometry']
                        if p.get('ist_ueberlagernd') in (True, 'true', 1) or not g or g['type'] not in ('Polygon', 'MultiPolygon'): continue
                        polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
                        got.append([p['nutzungsidentifikator'], p['lnf_code'], p['nutzung'], [[[[round(x, 1), round(y, 1)] for x, y in ring[:]] for ring in poly] for poly in polys]])
                    if len(fs) < 5000: break
                    start += 5000
                parcels[key] = got
                print(f'{key}: {len(got)}'); time.sleep(0.3)
    flat = {}
    for v in parcels.values():
        for q in v: flat[q[0] + ':' + str(q[1])] = q
    json.dump(list(flat.values()), open('dem/fields.json', 'w'))
P = json.load(open('dem/fields.json'))
print(len(P), 'parcels')
# Classes: 0 none, 1 meadow, 2 extensive meadow, 3 pasture, 4 litter meadow, 5 maize, 6 cereal,
# 7 oilseed and pulses, 8 vegetables and roots, 9 vines, 10 orchard, 11 berries, 12 under plastic, 13 hedge or wood.
CODE = {601: 1, 602: 1, 613: 1, 697: 1, 698: 1, 611: 2, 612: 2, 635: 2, 694: 2, 616: 3, 617: 3, 618: 3, 930: 3,
        851: 4, 936: 4, 521: 5, 508: 5, 543: 6, 527: 7, 531: 7, 536: 7, 569: 7, 701: 9, 717: 9,
        702: 10, 703: 10, 704: 10, 731: 10, 712: 10, 714: 10, 721: 10, 724: 10, 705: 11, 709: 11, 710: 11, 725: 11, 797: 11,
        852: 13, 857: 13, 858: 13, 901: 13}
def cls(code):
    if code in CODE: return CODE[code]
    h = code // 100
    if h == 6: return 1
    if h == 5: return 6 if code < 520 else 8
    if h == 7: return 11
    if h == 8: return 12 if code < 850 else 0
    return 0
# Each parcel: class, seed, and its long axis (radians, LV95) from its outline's spread.
info = [(0, 0, 0.0)]
for ident, code, _, polys in P:
    ring = np.array(max((p[0] for p in polys), key=len), float)
    d = ring - ring.mean(0)
    w, v = np.linalg.eigh(d.T @ d)
    info.append((cls(code), zlib.crc32(ident.encode()) % 16, math.atan2(v[1, 1], v[0, 1])))
info = np.array(info)
# Parcels as 2 m pixels in LV95, chunk by chunk; each texel samples its chunk.
PX = 2.0
out = np.zeros((NS, NT, 3), np.uint8)
PID = np.zeros((NS, NT), np.int32); REL = np.zeros((NS, NT))
boxes = [(np.min([np.min(np.array(p[0])[:, 0]) for p in q[3]]), np.max([np.max(np.array(p[0])[:, 0]) for p in q[3]]),
          np.min([np.min(np.array(p[0])[:, 1]) for p in q[3]]), np.max([np.max(np.array(p[0])[:, 1]) for p in q[3]])) for q in P]
# The line's heading at each texel, in LV95.
along = np.arctan2(np.gradient(N95, axis=0), np.gradient(E95, axis=0))
for c0 in range(0, NS, CH):
    e, n = E95[c0:c0 + CH], N95[c0:c0 + CH]
    e0, e1, n0, n1 = e.min() - 60, e.max() + 60, n.min() - 60, n.max() + 60
    w, h = int((e1 - e0) / PX) + 2, int((n1 - n0) / PX) + 2
    img = Image.new('I', (w, h), 0); dr = ImageDraw.Draw(img)
    for i, (q, b) in enumerate(zip(P, boxes)):
        if b[1] < e0 or b[0] > e1 or b[3] < n0 or b[2] > n1: continue
        for poly in q[3]:
            dr.polygon([((x - e0) / PX, (n1 - y) / PX) for x, y in poly[0]], fill=i + 1)
            for hole in poly[1:]: dr.polygon([((x - e0) / PX, (n1 - y) / PX) for x, y in hole], fill=0)
    a = np.asarray(img, np.int32)
    # Edge pixels: any neighbour holds another parcel.
    edge = np.zeros(a.shape, bool)
    edge[1:] |= a[1:] != a[:-1]; edge[:-1] |= a[1:] != a[:-1]
    edge[:, 1:] |= a[:, 1:] != a[:, :-1]; edge[:, :-1] |= a[:, 1:] != a[:, :-1]
    dist = distance_transform_edt(~edge) * PX
    iy, ix = np.clip(((n1 - n) / PX).astype(int), 0, h - 1), np.clip(((e - e0) / PX).astype(int), 0, w - 1)
    pid = a[iy, ix]
    c, sd, ang = info[pid, 0], info[pid, 1], info[pid, 2]
    rel = np.mod(ang - along[c0:c0 + CH], math.pi)
    out[c0:c0 + CH, :, 0] = (c * 16 + sd).astype(np.uint8)
    out[c0:c0 + CH, :, 1] = np.clip(np.round(dist[iy, ix] * 4), 0, 32).astype(np.uint8)
    PID[c0:c0 + CH], REL[c0:c0 + CH] = pid, rel
    print(f'{c0 * L / NS / 1000:5.1f} km')
# One heading per parcel, the axial mean of its texels: a flat value compresses well.
z = np.exp(2j * REL.ravel())
zs = np.bincount(PID.ravel(), z.real, len(info)) + 1j * np.bincount(PID.ravel(), z.imag, len(info))
hd = np.mod(np.angle(zs) / 2, math.pi)
out[..., 2] = (np.round(hd[PID] / math.pi * 64).astype(int) % 64 * 4).astype(np.uint8)
# The ride loops: over the last 3 km the fields thin out, parcel by parcel.
k = ss > L - 3000
fade = ((ss[k] - (L - 3000)) / 3000)[:, None]
out[k, :, 0] = np.where(fade * 16 > out[k, :, 0] % 16, 0, out[k, :, 0])
Image.fromarray(out.transpose(1, 0, 2)).save('fields.png', optimize=True)
cl_ = out[..., 0] // 16
print('class share', [round(float((cl_ == i).mean()), 3) for i in range(14)])
