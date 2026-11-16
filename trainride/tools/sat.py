# Aerial photo along the line, baked as two colour maps: sat-near.webp and sat-far.webp.
# Source: swisstopo SWISSIMAGE by WMS (wms.geo.admin.ch), open data, credit "© swisstopo".
# Run after track.py, in the folder that holds dem/ and route.json. Caches the WMS images in dem/sat/.
# Each map's columns span the route once: column c is route metre (c + 0.5) * L / cols.
# Row r sits at t = T0 + (r + 0.5) * DT, out from the line on the lake side.
# Near: 5 m columns, 4 m rows, t from -400 to 1200. Far: 10 m columns and rows, t from -400 to 7000.
# A map wider than 8192 is stored as two halves, one over the other.
# Each texel averages a 2 x 2 grid of photo samples, read at half the texel size.
import json, math, io, os, urllib.request
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from PIL import Image
R = 6371000.0; cl = math.cos(math.radians(47.25))
en = lambda lat, lon: ((np.asarray(lon) - 9.0) * cl * math.pi / 180 * R, (np.asarray(lat) - 47.25) * math.pi / 180 * R)
ll = lambda e, n: (47.25 + n / R * 180 / math.pi, 9.0 + e / (cl * R) * 180 / math.pi)
def lv95(lat, lon):
    # swisstopo's approximate formulas; good to about a metre.
    p = (lat * 3600 - 169028.66) / 10000; l = (lon * 3600 - 26782.5) / 10000
    return (2600072.37 + 211455.93 * l - 10938.51 * l * p - 0.36 * l * p * p - 44.54 * l ** 3,
            1200147.07 + 308807.95 * p + 3745.25 * l * l + 76.63 * p * p - 194.56 * l * l * p + 119.79 * p ** 3)
tr = json.load(open('dem/track.json', encoding='utf-8'))
route = json.load(open('route.json', encoding='utf-8'))
L = route['L']
pts = np.array(tr['pts'])
E, N = en(pts[:, 0], pts[:, 1])
cum = np.concatenate([[0], np.cumsum(np.hypot(np.diff(E), np.diff(N)))])
s10 = np.arange(0, cum[-1], 10.0); E10 = np.interp(s10, cum, E); N10 = np.interp(s10, cum, N)
# Today's OSM track can differ in length from the one the route was built on.
# Route metres map to track metres piecewise, anchored on each station.
def at_station(n):
    la, lo = tr['coords'][n]; e0, n0 = en(la, lo)
    return float(s10[int(np.argmin((E10 - e0) ** 2 + (N10 - n0) ** 2))])
anc = [(x, at_station(n)) for n, x in route['stations'] if n in tr['coords']]
ax, at = np.array([a for a, _ in anc]), np.array([b for _, b in anc])
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
os.makedirs('dem/sat', exist_ok=True)
def wms(e0, n0, e1, n1, mpp):
    w, h = int(math.ceil((e1 - e0) / mpp)), int(math.ceil((n1 - n0) / mpp))
    f = f'dem/sat/{round(e0)}_{round(n0)}_{w}_{h}_{mpp}.jpg'
    if not os.path.exists(f):
        url = ('https://wms.geo.admin.ch/?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=ch.swisstopo.swissimage'
               f'&STYLES=&CRS=EPSG:2056&BBOX={e0},{n0},{e0 + w * mpp},{n0 + h * mpp}&WIDTH={w}&HEIGHT={h}&FORMAT=image/jpeg')
        req = urllib.request.Request(url, headers={'User-Agent': 'stimming-bake'})
        data = urllib.request.urlopen(req, timeout=180).read()
        open(f, 'wb').write(data)
    return np.asarray(Image.open(f).convert('RGB'), np.float32), e0, n0 + h * mpp, mpp
def bake(name, dx, t0, t1, dt, seg):
    cols = int(round(L / dx)); dx = L / cols
    ts = t0 + (np.arange(int(round((t1 - t0) / dt))) + 0.5) * dt
    out = np.zeros((len(ts), cols, 3), np.float32)
    # Two sub-samples each way, a quarter texel from the centre.
    sub = [(-0.25, -0.25), (0.25, -0.25), (-0.25, 0.25), (0.25, 0.25)]
    def job(c0):
        c1 = min(cols, c0 + seg)
        acc = np.zeros((len(ts), c1 - c0, 3), np.float32)
        pts = []
        for ox, oy in sub:
            xs = (np.arange(c0, c1) + 0.5 + ox) * dx
            pe, pn = band(np.interp(xs, ax, at), ts + oy * dt)
            pts.append(lv95(*ll(pe, pn)))
        allE = np.concatenate([p[0].ravel() for p in pts]); allN = np.concatenate([p[1].ravel() for p in pts])
        mpp = min(dx, dt) / 2
        img, e0, ntop, mpp = wms(math.floor(allE.min() - 10), math.floor(allN.min() - 10), math.ceil(allE.max() + 10), math.ceil(allN.max() + 10), mpp)
        h, w = img.shape[:2]
        for EE, NN in pts:
            fx = (EE - e0) / mpp - 0.5; fy = (ntop - NN) / mpp - 0.5
            x0 = np.clip(np.floor(fx).astype(int), 0, w - 2); y0 = np.clip(np.floor(fy).astype(int), 0, h - 2)
            u = np.clip(fx - x0, 0, 1)[..., None]; v = np.clip(fy - y0, 0, 1)[..., None]
            acc += (img[y0, x0] * (1 - u) * (1 - v) + img[y0, x0 + 1] * u * (1 - v) + img[y0 + 1, x0] * (1 - u) * v + img[y0 + 1, x0 + 1] * u * v).transpose(1, 0, 2)
        out[:, c0:c1] = acc / len(sub)
        return c0
    with ThreadPoolExecutor(6) as ex:
        for c0 in ex.map(job, range(0, cols, seg)):
            if c0 % (seg * 10) == 0: print(name, 'column', c0, 'of', cols)
    a = np.clip(np.round(out), 0, 255).astype(np.uint8)
    if cols > 8192:
        half = (cols + 1) // 2
        b = np.zeros((a.shape[0] * 2, half, 3), np.uint8)
        b[:a.shape[0]] = a[:, :half]; b[a.shape[0]:, :cols - half] = a[:, half:]
        a = b
    Image.fromarray(a).save(f'{name}.webp', quality=82, method=6)
    print(name, cols, 'columns', len(ts), 'rows', os.path.getsize(f'{name}.webp') // 1024, 'KB')
bake('sat-near', 5.0, -400.0, 1200.0, 4.0, 200)
bake('sat-far', 10.0, -400.0, 7000.0, 10.0, 400)
