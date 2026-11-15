# Tunnels on the line, from the OSM ways the traced track follows, written as tunnels.json.
# Run after track.py, in the folder that holds dem/. Reads ../route.json for the stations.
# tunnels.json lists [start, end, name] in route metres, as the stations are.
import json, math, sys
import numpy as np
R = 6371000.0; cl = math.cos(math.radians(47.25))
en = lambda lat, lon: ((np.asarray(lon) - 9.0) * cl * math.pi / 180 * R, (np.asarray(lat) - 47.25) * math.pi / 180 * R)
tr = json.load(open('dem/track.json'))
pts = np.array(tr['pts'])
E, N = en(pts[:, 0], pts[:, 1])
cum = np.concatenate([[0], np.cumsum(np.hypot(np.diff(E), np.diff(N)))])
key = lambda p: (round(p[0], 6), round(p[1], 6))
# Each OSM edge keeps its way's tunnel tag and name.
edge = {}
for e in json.load(open('dem/rail.json'))['elements']:
    if e['type'] != 'way': continue
    t = e.get('tags', {})
    g = [(p['lat'], p['lon']) for p in e['geometry']]
    for a, b in zip(g, g[1:]):
        edge[frozenset((key(a), key(b)))] = (t.get('tunnel') in ('yes', 'building_passage'), t.get('tunnel:name') or t.get('name', ''))
runs = []
for i in range(len(pts) - 1):
    tun, nm = edge.get(frozenset((key(pts[i]), key(pts[i + 1]))), (False, ''))
    if not tun: continue
    # Runs closer than 40 m join: a short gap is a cutting between two bores.
    if runs and cum[i] - runs[-1][1] < 40: runs[-1][1] = cum[i + 1]; runs[-1][2] = runs[-1][2] or nm
    else: runs.append([cum[i], cum[i + 1], nm])
st = [s for _, s in json.load(open(sys.argv[1] if len(sys.argv) > 1 else '../route.json'))['stations']]
out = []
for a, b, nm in runs:
    # Zurich HB's hall and track field stand in the open, to 2.1 km.
    a = max(a, 2100.0)
    # A platform needs open air: each mouth keeps 200 m from a station.
    for s in st:
        if a - 200 < s < b + 200:
            if s < (a + b) / 2: a = max(a, s + 200)
            else: b = min(b, s - 200)
    if b - a >= 80: out.append([round(a, 1), round(b, 1), nm])
json.dump(out, open('tunnels.json', 'w'), ensure_ascii=False)
for a, b, nm in out: print(f'{a / 1000:7.3f} {b / 1000:7.3f} km {b - a:6.0f} m {nm}')
