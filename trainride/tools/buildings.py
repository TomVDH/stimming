# Bakes OSM buildings into route coordinates: buildings.bin, 8 bytes each.
# s along the line, t out from it, footprint, height and the ridge heading.
# Zurich keeps most of its blocks; elsewhere a third survive, so the land leads.
import json, math, random
import numpy as np
g = np.load('dem/grid.npz'); pe, pn, tj, ss = g['pe'], g['pn'], g['tj'], g['ss']
NS, NT = pe.shape
R = 6371000.0; cl = math.cos(math.radians(47.25))
def en(lat, lon): return (np.asarray(lon) - 9.0) * cl * math.pi / 180 * R, (np.asarray(lat) - 47.25) * math.pi / 180 * R
import glob
seen = set(); bld = []
for p in sorted(glob.glob('dem/bld[0-9].json')):
    for e in json.load(open(p))['elements']:
        if e['id'] not in seen: seen.add(e['id']); bld.append(e)
tags = []
for p in sorted(glob.glob('dem/tag[0-9].json')):
    try: tags += json.load(open(p))['elements']
    except (ValueError, FileNotFoundError): pass
lv = {}
try:
    for e in tags:
        t = e.get('tags', {})
        h = None
        try: h = float(str(t.get('height', '')).replace(',', '.').split()[0])
        except (ValueError, IndexError): pass
        if h is None:
            try: h = float(t.get('building:levels')) * 3.0 + 1.5
            except (TypeError, ValueError): pass
        if h: lv[e['id']] = h
except FileNotFoundError: pass
cx, cy, L1, L2, ang, ids = [], [], [], [], [], []
for e in bld:
    if 'geometry' not in e or len(e['geometry']) < 4: continue
    x, y = en([p['lat'] for p in e['geometry']], [p['lon'] for p in e['geometry']])
    x, y = x[:-1], y[:-1]
    mx, my = x.mean(), y.mean()
    # The long axis from the footprint's second moments.
    c = np.cov(np.stack([x - mx, y - my]))
    w, v = np.linalg.eigh(c)
    a = v[:, 1]
    u = (x - mx) * a[0] + (y - my) * a[1]; q = -(x - mx) * a[1] + (y - my) * a[0]
    cx.append(mx); cy.append(my); L1.append(u.max() - u.min()); L2.append(q.max() - q.min()); ang.append(math.atan2(a[1], a[0])); ids.append(e['id'])
cx, cy, L1, L2, ang = map(np.array, (cx, cy, L1, L2, ang))
print('buildings', len(cx))
# Inverse map: grid index (i, j) whose point lands on the building.
def fwd(i, j):
    i = np.clip(i, 0, NS - 1.001); j = np.clip(j, 0, NT - 1.001)
    i0 = np.floor(i).astype(int); j0 = np.floor(j).astype(int); fi = i - i0; fj = j - j0
    f = lambda A: A[i0, j0] * (1 - fi) * (1 - fj) + A[i0 + 1, j0] * fi * (1 - fj) + A[i0, j0 + 1] * (1 - fi) * fj + A[i0 + 1, j0 + 1] * fi * fj
    return f(pe), f(pn)
# Seed from the nearest of a coarse grid of samples.
si, sj = np.meshgrid(np.arange(0, NS, 8), np.arange(0, NT, 4), indexing='ij')
se, sn = pe[si, sj].ravel(), pn[si, sj].ravel()
I = np.zeros(len(cx)); J = np.zeros(len(cx))
for k in range(0, len(cx), 4000):
    d = (cx[k:k + 4000, None] - se[None]) ** 2 + (cy[k:k + 4000, None] - sn[None]) ** 2
    m = d.argmin(1); I[k:k + 4000] = si.ravel()[m]; J[k:k + 4000] = sj.ravel()[m]
for it in range(8):
    e0, n0 = fwd(I, J); e1, n1 = fwd(I + 0.5, J); e2, n2 = fwd(I, J + 0.5)
    a11, a21, a12, a22 = (e1 - e0) / 0.5, (n1 - n0) / 0.5, (e2 - e0) / 0.5, (n2 - n0) / 0.5
    det = a11 * a22 - a12 * a21; det = np.where(np.abs(det) < 1e-9, 1e-9, det)
    rx, ry = cx - e0, cy - n0
    I = I + (a22 * rx - a12 * ry) / det; J = J + (-a21 * rx + a11 * ry) / det
e0, n0 = fwd(I, J); err = np.hypot(e0 - cx, n0 - cy)
s = np.interp(I, np.arange(NS), ss); t = np.interp(J, np.arange(NT), tj)
# The route frame at each building: unit s and t directions in east-north.
e1, n1 = fwd(I + 0.5, J); e2, n2 = fwd(I, J + 0.5)
ds = np.hypot(e1 - e0, n1 - n0) + 1e-9; dt = np.hypot(e2 - e0, n2 - n0) + 1e-9
us = np.stack([(e1 - e0) / ds, (n1 - n0) / ds]); ut = np.stack([(e2 - e0) / dt, (n2 - n0) / dt])
ax, ay = np.cos(ang), np.sin(ang)
# World x follows s; world z is minus t. The ridge heading is atan2(x, z).
wx = ax * us[0] + ay * us[1]; wz = -(ax * ut[0] + ay * ut[1])
yaw = np.mod(np.arctan2(wx, wz), np.pi)
area = L1 * L2
ok = (err < 30) & (t > 22) & (t < 4500) & (L1 > 4) & (L2 > 3)
random.seed(7)
keep = np.zeros(len(cx), bool)
for k in np.nonzero(ok)[0]:
    zurich = s[k] < 5500
    # Zurich keeps its bigger blocks, but not the ones crowding the line.
    if zurich: p = (0.75 if area[k] > 120 else 0.2) * (0.0 if t[k] < 45 else 1.0)
    # Elsewhere a third survive near; a quarter on the far shore.
    else: p = (0.36 if area[k] > 70 else 0.1) * (0.7 if t[k] < 600 else 1.0 if t[k] < 1500 else 0.7)
    keep[k] = random.random() < p
H = np.array([lv.get(i, 0.0) for i in ids])
print('kept', keep.sum(), 'zurich', (keep & (s < 5500)).sum(), 'with height', (keep & (H > 0)).sum(), 'median err', np.median(err[ok]))
k = np.nonzero(keep)[0]
rec = np.zeros((len(k), 8), np.uint8)
su = np.clip(np.round(s[k] / 1.2), 0, 65535).astype(np.uint16)
tu = np.clip(np.round(t[k] * 10), 0, 65535).astype(np.uint16)
rec[:, 0] = su & 255; rec[:, 1] = su >> 8; rec[:, 2] = tu & 255; rec[:, 3] = tu >> 8
rec[:, 4] = np.clip(np.round(L2[k] * 4), 1, 255)        # across, quarter metres
rec[:, 5] = np.clip(np.round(L1[k] * 4), 1, 255)        # along the ridge
rec[:, 6] = np.clip(np.round(H[k] * 4), 0, 255)          # 0: unknown
rec[:, 7] = np.clip(np.round(yaw[k] / np.pi * 256), 0, 255)
rec.tofile('buildings.bin')
print('bytes', rec.nbytes)
