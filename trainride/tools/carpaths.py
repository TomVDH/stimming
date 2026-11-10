# Car paths: the bigger mapped roads beside the line, as lines the cars drive along.
# Run after roads.py, in the folder that holds dem/. Writes paths.bin: pairs of 16 bit numbers.
# A pair (65535, k) opens a path of class k (0 motorway and trunk, 1 primary, 2 secondary, 3 tertiary, 4 minor).
# Each other pair is one point, 12 m after the last: x = a * L / 65535 metres along the drawn line, t = b / 100 metres out from it.
import json, math, struct
import numpy as np
from scipy.spatial import cKDTree
R = 6371000.0; cl = math.cos(math.radians(47.25))
en = lambda lat, lon: ((np.asarray(lon) - 9.0) * cl * math.pi / 180 * R, (np.asarray(lat) - 47.25) * math.pi / 180 * R)
CLS = {'motorway': 0, 'trunk': 0, 'motorway_link': 0, 'trunk_link': 0, 'primary': 1, 'primary_link': 1, 'secondary': 2, 'secondary_link': 2, 'tertiary': 3, 'unclassified': 4}
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
    (eN, nN, lxN, lyN), (eF, nF, lxF, lyF) = [[np.interp(ss, s10, a) for a in f] for f in FR]
    eT, nT = np.interp(ss, s10, E10), np.interp(ss, s10, N10)
    wF = np.clip((tt - 300) / 3700, 0, 1); wF = wF * wF * (3 - 2 * wF)
    lx = lxN[:, None] * (1 - wF) + lxF[:, None] * wF; ly = lyN[:, None] * (1 - wF) + lyF[:, None] * wF
    m = np.hypot(lx, ly)
    return eT[:, None] * (1 - wF) + eF[:, None] * wF + lx / m * tt, nT[:, None] * (1 - wF) + nF[:, None] * wF + ly / m * tt
# The band's grid, to turn a map point back into metres along the line and out from it.
ss = np.arange(0, L - 3000, 4.0); tt = np.arange(4.0, 500.0, 3.0)
pe, pn = band(ss, tt)
tree = cKDTree(np.stack([pe.ravel(), pn.ravel()], 1))
out = bytearray(); npaths = 0; total = 0.0
for c, g in json.load(open('dem/roads.json')):
    if c not in CLS: continue
    x, y = en([p[0] for p in g], [p[1] for p in g])
    d = np.concatenate([[0], np.cumsum(np.hypot(np.diff(x), np.diff(y)))])
    if d[-1] < 30: continue
    u = np.arange(0, d[-1], 4.0)
    dist, idx = tree.query(np.stack([np.interp(u, d, x), np.interp(u, d, y)], 1))
    s = ss[idx // len(tt)]; t = tt[idx % len(tt)]; ok = dist < 4.5
    # Each run inside the band is one path; it gets a light smoothing, then points 12 m apart.
    i = 0
    while i < len(u):
        if not ok[i]: i += 1; continue
        j = i
        while j < len(u) and ok[j]: j += 1
        if (j - i) * 4.0 >= 90:
            k = np.ones(5) / 5
            sm = np.convolve(np.pad(s[i:j], 2, mode='edge'), k, 'valid'); tm = np.convolve(np.pad(t[i:j], 2, mode='edge'), k, 'valid')
            dd = np.concatenate([[0], np.cumsum(np.hypot(np.diff(sm), np.diff(tm)))])
            q = np.arange(0, dd[-1], 12.0)
            if len(q) >= 6:
                # The land draws route metre x - L / 8192 at world x; the paths follow the drawn land.
                xs = np.interp(q, dd, sm) + L / 8192; ts = np.interp(q, dd, tm)
                out += struct.pack('<HH', 65535, CLS[c])
                for a, b in zip(xs, ts): out += struct.pack('<HH', min(65534, int(round(a / L * 65535))), int(round(b * 100)))
                npaths += 1; total += dd[-1]
        i = j
open('paths.bin', 'wb').write(out)
print(npaths, 'paths', round(total / 1000, 1), 'km', len(out), 'bytes')
