# The land beside the line from swissALTI3D (swisstopo, 2 m), baked as near.png.
# Run after track.py, in the folder that holds dem/ and build.py. Fetches the 1 km tiles it needs to dem/alti/.
# near.png is 8192 x 192, as route.png packs heights: R * 256 + G = (metres above the eye + 500) * 10.
# Texel (c, r) is route metre (c + 0.5) * L / 8192 at offset t = 4 r + 2 m.
import json, math, os, urllib.request
from concurrent.futures import ThreadPoolExecutor
exec(open('build.py').read().split('# Each station sits')[0].replace("Image.fromarray(img).save('route.png', optimize=True)", ""))
from scipy.ndimage import gaussian_filter
ll = lambda e, n: (47.25 + n / R * 180 / math.pi, 9.0 + e / (cl * R) * 180 / math.pi)
def lv95(lat, lon):
    # swisstopo's approximate formulas; good to about a metre.
    p = (lat * 3600 - 169028.66) / 10000; l = (lon * 3600 - 26782.5) / 10000
    return (2600072.37 + 211455.93 * l - 10938.51 * l * p - 0.36 * l * p * p - 44.54 * l ** 3,
            1200147.07 + 308807.95 * p + 3745.25 * l * l + 76.63 * p * p - 194.56 * l * l * p + 119.79 * p ** 3)
NS2, NT2, DT2 = 8192, 192, 4.0
# The land texture draws route metre x - L / 8192 at world x; this bake follows the drawn land.
s2 = (np.arange(NS2) + 0.5) * L / NS2 - L / 8192
t2 = (np.arange(NT2) + 0.5) * DT2
I2 = lambda a: np.interp(s2, s10, a)
(eN2, nN2, lxN2, lyN2), (eF2, nF2, lxF2, lyF2) = [[I2(a) for a in frame(sig)] for sig in (250, 3500)]
eT2, nT2 = I2(E10), I2(N10)
w2 = np.clip((t2 - 300) / 3700, 0, 1); w2 = w2 * w2 * (3 - 2 * w2)
lx2 = lxN2[:, None] * (1 - w2) + lxF2[:, None] * w2; ly2 = lyN2[:, None] * (1 - w2) + lyF2[:, None] * w2
m2 = np.hypot(lx2, ly2)
pe2 = eT2[:, None] * (1 - w2) + eF2[:, None] * w2 + lx2 / m2 * t2; pn2 = nT2[:, None] * (1 - w2) + nF2[:, None] * w2 + ly2 / m2 * t2
E95, N95 = lv95(*ll(pe2, pn2))
# The 1 km tiles under the band, with a margin for the smoothing.
need = set()
for de in (-30, 30):
    for dn in (-30, 30): need |= set(zip(((E95 + de) // 1000).astype(int).ravel().tolist(), ((N95 + dn) // 1000).astype(int).ravel().tolist()))
os.makedirs('dem/alti', exist_ok=True)
miss = [k for k in need if not os.path.exists(f'dem/alti/{k[0]}-{k[1]}.tif')]
if miss:
    # The catalogue lists each tile by year; the newest 2 m file wins.
    urls = {}
    lat, lon = ll(pe2, pn2)
    for c0 in range(0, NS2, 512):
        la, lo = lat[c0:c0 + 512], lon[c0:c0 + 512]
        url = f'https://data.geo.admin.ch/api/stac/v0.9/collections/ch.swisstopo.swissalti3d/items?bbox={lo.min() - 0.002:.5f},{la.min() - 0.002:.5f},{lo.max() + 0.002:.5f},{la.max() + 0.002:.5f}&limit=100'
        while url:
            d = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'stimming-bake'}), timeout=60))
            for f in d['features']:
                _, yr, key = f['id'].split('_')
                e, n = map(int, key.split('-'))
                for a in f['assets'].values():
                    if a['href'].endswith('_2_2056_5728.tif') and (e, n) in need and yr >= urls.get((e, n), ('', ''))[0]: urls[(e, n)] = (yr, a['href'])
            url = next((l['href'] for l in d.get('links', []) if l['rel'] == 'next'), None)
    def get(k):
        if k not in urls: return 0
        b = urllib.request.urlopen(urllib.request.Request(urls[k][1], headers={'User-Agent': 'stimming-bake'}), timeout=120).read()
        open(f'dem/alti/{k[0]}-{k[1]}.tif', 'wb').write(b); return len(b)
    with ThreadPoolExecutor(8) as ex: got = list(ex.map(get, miss))
    print(f'tiles needed {len(need)}, fetched {sum(1 for g in got if g)}, {sum(got) / 1e6:.0f} MB, not in the catalogue {sum(1 for g in got if not g)}')
# Sample the tiles chunk by chunk: mosaic, smooth a little, then bilinear taps.
SIG = 3.0 / 2.0
hN = np.full((NS2, NT2), np.nan, np.float32)
for c0 in range(0, NS2, 256):
    e, n = E95[c0:c0 + 256], N95[c0:c0 + 256]
    ke0, ke1, kn0, kn1 = int((e.min() - 30) // 1000), int((e.max() + 30) // 1000), int((n.min() - 30) // 1000), int((n.max() + 30) // 1000)
    mos = np.full(((kn1 - kn0 + 1) * 500, (ke1 - ke0 + 1) * 500), np.nan, np.float32)
    for ke in range(ke0, ke1 + 1):
        for kn in range(kn0, kn1 + 1):
            p = f'dem/alti/{ke}-{kn}.tif'
            if os.path.exists(p):
                a = np.asarray(Image.open(p), np.float32)
                mos[(kn1 - kn) * 500:(kn1 - kn + 1) * 500, (ke - ke0) * 500:(ke - ke0 + 1) * 500] = np.where(a < -1000, np.nan, a)
    ok = np.isfinite(mos)
    num = gaussian_filter(np.where(ok, mos, 0), SIG); den = gaussian_filter(ok.astype(np.float32), SIG)
    sm = np.where(den > 0.5, num / np.maximum(den, 1e-6), np.nan)
    px = (e - ke0 * 1000) / 2 - 0.5; py = ((kn1 + 1) * 1000 - n) / 2 - 0.5
    hN[c0:c0 + 256] = bil(sm, px, py)
# Heights relative to the eye, as build.py: 6 m above the smoothed rail level.
rail2 = np.interp(s2, ss, rail)
relN = hN - rail2[:, None] - 6.0
# The real trackbed shows in the fine data at the line itself. Our eye rides 3 m above our track.
# Where the real track stands higher or lower than ours, the band moves to meet it, and eases back by its far edge.
trk = relN[:, 0] + 3.0
corr = np.interp(s2, s10, smooth(np.interp(s10, s2, np.clip(np.nan_to_num(trk), -10, 10)), 250))
print('real track above ours: mean', trk.mean(), 'p5/p50/p95', np.percentile(trk, [5, 50, 95]), 'correction p5/p50/p95', np.percentile(corr, [5, 50, 95]))
np.save('dem/near_corr.npy', np.stack([trk, corr]))
wc = np.clip((t2 - 250) / 450, 0, 1); wc = 1 - wc * wc * (3 - 2 * wc)
relN = relN - corr[:, None] * wc[None, :]
# Where a tile is missing, the coarse map stands in.
iF = (s2 / (L / NS)) % NS; jF = (-8 + np.sqrt(64 + 4 * b * (t2 + 400))) / (2 * b)
i0 = np.floor(iF).astype(int) % NS; fi = (iF - np.floor(iF))[:, None]; j0f = np.floor(jF).astype(int); fj = (jF - j0f)[None, :]
old = (rel[i0][:, j0f] * (1 - fi) + rel[(i0 + 1) % NS][:, j0f] * fi) * (1 - fj) + (rel[i0][:, j0f + 1] * (1 - fi) + rel[(i0 + 1) % NS][:, j0f + 1] * fi) * fj
print('no data share', np.isnan(relN).mean(), 'mean abs difference to the coarse map', np.nanmean(np.abs(relN - old)), 'p95', np.nanpercentile(np.abs(relN - old), 95))
relN = np.where(np.isnan(relN), old, relN)
# Cuttings and tunnels: nothing near the line rises above the sill.
relN = np.minimum(relN, (-3.0 + np.maximum(t2 - 25.0, 0) * 0.7)[None, :])
# The ride loops: the last 3 km ease back to the start.
K2 = int(3000 / (L / NS2))
for k in range(K2):
    w = (k + 1) / K2; w = w * w * (3 - 2 * w)
    relN[NS2 - K2 + k] = relN[NS2 - K2 + k] * (1 - w) + relN[0] * w
q2 = np.clip(np.round((relN + 500) * 10), 0, 65535).astype(np.uint16)
im2 = np.zeros((NT2, NS2, 3), np.uint8)
im2[..., 0] = (q2 >> 8).T; im2[..., 1] = (q2 & 255).T
Image.fromarray(im2).save('near.png', optimize=True)
np.save('dem/near_rel.npy', relN); np.save('dem/near_old.npy', old)
