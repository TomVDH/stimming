# Woods along the line from the national forest rasters, baked as woods.png.
# Source: BAFU, NFI forest mix rate and NFI vegetation height model (Sentinel 2025), 10 m, on the swisstopo STAC.
# Run after track.py, in the folder that holds dem/. Reads only the window around the line, by HTTP range.
# woods.png is 8192 x 256, RGB, on the route map's rows: row j sits at t = -400 + 8 j + b j * j.
# Texel (c, j) is route metre (c + 0.5) * L / 8192 - L / 8192, as the drawn land.
# R: share of the texel under trees, in 16 steps. G: conifer share, in 8 steps.
# B: canopy height in metres, times 5, in 4 m steps; G and B are zero far from woods.
import json, math
import numpy as np
import rasterio
from rasterio.windows import from_bounds
from PIL import Image
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
NS, NT = 8192, 256
b = (18400 - 8 * (NT - 1)) / (NT - 1) ** 2
row = lambda j: -400 + 8 * j + b * j * j
# Each texel averages sub-samples: 4 along the line, and across it one per 10 m of row, up to 12.
SA = 4
ss = (np.arange(NS * SA) + 0.5) * L / (NS * SA) - L / 8192 - L / (2 * NS) + L / (2 * NS * SA)
STAC = 'https://data.geo.admin.ch'
MIX = f'{STAC}/ch.bafu.landesforstinventar-waldmischungsgrad/landesforstinventar-waldmischungsgrad/landesforstinventar-waldmischungsgrad_2056.tif'
VHM = f'{STAC}/ch.bafu.landesforstinventar-vegetationshoehenmodell_sentinel/landesforstinventar-vegetationshoehenmodell_sentinel_2025/landesforstinventar-vegetationshoehenmodell_sentinel_2025_2056.tif'
# One window over the whole drawn land.
pe, pn = band(ss[::64], np.array([-400.0, 18400.0]))
E95, N95 = lv95(*ll(pe, pn))
e0, e1, n0, n1 = E95.min() - 500, E95.max() + 500, N95.min() - 500, N95.max() + 500
def read(url):
    with rasterio.open('/vsicurl/' + url) as r:
        w = from_bounds(e0, n0, e1, n1, r.transform).round_offsets().round_lengths()
        a = r.read(1, window=w)
        t = r.window_transform(w)
        return a, t, r.nodata
mix, tf, nd = read(MIX)
vhm, tf2, nd2 = read(VHM)
assert tf == tf2 and mix.shape == vhm.shape
print('window', mix.shape, 'tree cells', (mix != nd).mean())
tree = mix != nd
con = np.where(tree, 100 - mix.astype(np.float32), 0) / 100
hgt = np.where(vhm == nd2, 0, vhm).astype(np.float32)
# Conifer share and height spread outward from each stand, so filtering at a wood's edge keeps its own values.
idx = distance_transform_edt(~tree, return_distances=False, return_indices=True)
con = con[tuple(idx)]
hgt_t = np.where(tree, hgt, 0)[tuple(idx)]
H, W = mix.shape
out = np.zeros((NT, NS, 3), np.float32)
for j in range(NT):
    t0, t1 = (row(j - 0.5) if j else -400), row(j + 0.5)
    k = int(np.clip(np.ceil((t1 - t0) / 10), 1, 12))
    tt = t0 + (np.arange(k) + 0.5) * (t1 - t0) / k
    pe, pn = band(ss, tt)
    x, y = lv95(*ll(pe, pn))
    cx = np.clip(((x - tf.c) / tf.a).astype(int), 0, W - 1); cy = np.clip(((y - tf.f) / tf.e).astype(int), 0, H - 1)
    tv, cv, hv = tree[cy, cx], con[cy, cx], hgt_t[cy, cx]
    out[j, :, 0] = tv.reshape(NS, SA, k).mean(axis=(1, 2))
    out[j, :, 1] = cv.reshape(NS, SA, k).mean(axis=(1, 2))
    out[j, :, 2] = hv.reshape(NS, SA, k).mean(axis=(1, 2))
    if j % 32 == 0: print('row', j, round(t0), 'm', k, 'taps')
# The ride loops: over the last 3 km the woods ease to the start's, as the land does.
K = int(3000 / (L / NS))
w = (np.arange(K) + 1) / K; w = w * w * (3 - 2 * w)
out[:, -K:] = out[:, -K:] * (1 - w[None, :, None]) + out[:, :1] * w[None, :, None]
from scipy.ndimage import maximum_filter
# Away from any wood, share and height hold one value: a flat field compresses well.
near = maximum_filter(out[..., 0], size=3) > 0
q = np.stack([np.round(out[..., 0] * 15) * 17, np.round(out[..., 1] * 7) * 36, np.round(np.clip(out[..., 2], 0, 48) / 4) * 20], -1)
q[~near, 1:] = 0
Image.fromarray(q.astype(np.uint8)).save('woods.png', optimize=True)
print('cover', out[..., 0].mean(), 'conifer in woods', (out[..., 1] * out[..., 0]).sum() / out[..., 0].sum(), 'height p50', np.median(out[..., 2][out[..., 0] > 0.5]))
