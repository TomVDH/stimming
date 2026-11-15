# Adds the line's tunnels to route.json: [start, end, name] in route metres.
# Run after track.py, in the folder that holds dem/ (dem/rail.json and dem/track.json).
# OSM marks each tunnel as tunnel=yes on the rail way.
import json, math, os, sys
import numpy as np
R = 6371000.0; cl = math.cos(math.radians(47.25))
def en(lat, lon): return (np.asarray(lon) - 9.0) * cl * math.pi / 180 * R, (np.asarray(lat) - 47.25) * math.pi / 180 * R
tr = json.load(open('dem/track.json'))
pts = np.array(tr['pts']); E, N = en(pts[:, 0], pts[:, 1])
cum = np.concatenate([[0], np.cumsum(np.hypot(np.diff(E), np.diff(N)))])
s10 = np.arange(0, cum[-1], 10.0); E10 = np.interp(s10, cum, E); N10 = np.interp(s10, cum, N)
# This trace may differ a little from the baked one.
# The stations pin it: each maps to its route metre in route.json.
route = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'route.json')
meta = json.load(open(route, encoding='utf-8'))
mine, theirs = [], []
for n, s in meta['stations']:
    la, lo = tr['coords'][n]; e0, n0 = en(la, lo)
    mine.append(float(s10[int(np.argmin((E10 - e0) ** 2 + (N10 - n0) ** 2))])); theirs.append(s)
mine, theirs = np.array(mine), np.array(theirs)
print('station drift (m):', np.round(theirs - mine).astype(int).tolist())
# Past the last station the map keeps the last offset.
toRoute = lambda s: np.interp(s, mine, theirs, left=None, right=None) if s <= mine[-1] else s + theirs[-1] - mine[-1]
rail = json.load(open('dem/rail.json'))
spans = []
for e in rail['elements']:
    t = e.get('tags', {})
    if e['type'] != 'way' or t.get('tunnel') not in ('yes', 'building_passage', 'covered'): continue
    x, y = en([p['lat'] for p in e['geometry']], [p['lon'] for p in e['geometry']])
    # A tunnel counts only if its whole length lies on our line.
    d = [np.min((E10 - a) ** 2 + (N10 - b) ** 2) for a, b in zip(x, y)]
    if max(d) > 30 ** 2: continue
    ks = [int(np.argmin((E10 - a) ** 2 + (N10 - b) ** 2)) for a, b in zip(x, y)]
    s0, s1 = float(s10[min(ks)]), float(s10[max(ks)])
    if s1 - s0 < 20: continue
    spans.append([s0, s1, t.get('tunnel:name') or t.get('name') or ''])
# Parallel tracks give each tunnel twice; join spans that overlap or nearly touch.
spans.sort()
out = []
for s0, s1, nm in spans:
    if out and s0 <= out[-1][1] + 30:
        out[-1][1] = max(out[-1][1], s1); out[-1][2] = out[-1][2] or nm
    else: out.append([s0, s1, nm])
tun = [[float(toRoute(a)), float(toRoute(b)), nm] for a, b, nm in out]
# The ride keeps Zurich HB's hall and track field in the open to 2.3 km.
# Platforms stay in the open: tunnels stop 190 m short of each station mark.
for i, t in enumerate(tun): t[0] = max(t[0], 2300.0)
for n, s in meta['stations']:
    for t in tun:
        if t[0] < s + 190 and t[1] > s - 190:
            if s - t[0] > t[1] - s: t[1] = s - 190
            else: t[0] = s + 190
tun = [[round(a, 1), round(b, 1), nm] for a, b, nm in tun if b - a >= 60 and a < meta['L']]
for a, b, nm in tun: print(f'{a / 1000:7.2f} to {b / 1000:7.2f} km  {b - a:6.0f} m  {nm}')
if '--write' in sys.argv:
    meta['tunnels'] = tun
    json.dump(meta, open(route, 'w', encoding='utf-8'), ensure_ascii=False)
    print('wrote', len(tun), 'tunnels')
