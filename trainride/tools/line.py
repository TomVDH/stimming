# Bakes the line's bridges, the roads over it and its curvature into line.json.
# Run after track.py, in the folder that holds dem/; reads ../route.json for the stations.
# Needs dem/rail.json (fetch.sh), dem/over.json (bridges on roads) and dem/water.json (rivers and canals):
#   way["highway"]["bridge"](bbox); out geom;   and   way["waterway"~"^(river|canal)$"](bbox); out geom;
# line.json: rail [[from, to, kind, name]] in route metres, kind 0 road or path, 1 water, 2 valley;
#   over [[s, width, angle, class]], angle in radians from square, class 0 motorway to 3 path;
#   curve { ds, k }: signed curvature every ds metres, in 1 / 10 km; positive turns toward the window.
import json, math, sys
import numpy as np
R = 6371000.0; cl = math.cos(math.radians(47.25))
en = lambda lat, lon: ((np.asarray(lon) - 9.0) * cl * math.pi / 180 * R, (np.asarray(lat) - 47.25) * math.pi / 180 * R)
tr = json.load(open('dem/track.json'))
pts = np.array(tr['pts'])
E, N = en(pts[:, 0], pts[:, 1])
cum = np.concatenate([[0], np.cumsum(np.hypot(np.diff(E), np.diff(N)))])
meta = json.load(open(sys.argv[1] if len(sys.argv) > 1 else '../route.json', encoding='utf-8'))
L = meta['L']
key = lambda p: (round(p[0], 6), round(p[1], 6))

# Rail bridges: runs of traced edges whose OSM way is a bridge.
edge = {}
for e in json.load(open('dem/rail.json'))['elements']:
    if e['type'] != 'way': continue
    t = e.get('tags', {})
    g = [(p['lat'], p['lon']) for p in e['geometry']]
    for a, b in zip(g, g[1:]):
        edge[frozenset((key(a), key(b)))] = (t.get('bridge') in ('yes', 'viaduct'), t.get('bridge:name') or t.get('name', ''))
runs = []
for i in range(len(pts) - 1):
    br, nm = edge.get(frozenset((key(pts[i]), key(pts[i + 1]))), (False, ''))
    if not br: continue
    # Runs closer than 20 m join: two decks on one pier are one bridge.
    if runs and cum[i] - runs[-1][1] < 20: runs[-1][1] = cum[i + 1]
    else: runs.append([cum[i], cum[i + 1], nm])

# Segment intersection with the track: route metre and the crossing angle.
def crossings(x, y):
    out = []
    for k in range(len(x) - 1):
        ax, ay, bx, by = x[k], y[k], x[k + 1], y[k + 1]
        dx, dy = E[1:] - E[:-1], N[1:] - N[:-1]
        den = (bx - ax) * dy - (by - ay) * dx
        ok = np.abs(den) > 1e-9
        with np.errstate(divide='ignore', invalid='ignore'):
            u = ((E[:-1] - ax) * dy - (N[:-1] - ay) * dx) / den
            v = ((E[:-1] - ax) * (by - ay) - (N[:-1] - ay) * (bx - ax)) / den
        hit = np.where(ok & (u >= 0) & (u <= 1) & (v >= 0) & (v <= 1))[0]
        for i in hit:
            s = cum[i] + v[i] * math.hypot(dx[i], dy[i])
            c = abs((bx - ax) * dx[i] + (by - ay) * dy[i]) / (math.hypot(bx - ax, by - ay) * math.hypot(dx[i], dy[i]) + 1e-9)
            out.append((float(s), math.acos(min(1.0, c))))
    return out

# What each rail bridge crosses: water if a river or canal passes under it.
wet = []
for e in json.load(open('dem/water.json'))['elements']:
    if e['type'] != 'way' or 'geometry' not in e: continue
    x, y = en([p['lat'] for p in e['geometry']], [p['lon'] for p in e['geometry']])
    wet += [s for s, _ in crossings(x, y)]
rail = []
for a, b, nm in runs:
    if b - a < 8 or a < 2200: continue
    kind = 1 if any(a - 15 < s < b + 15 for s in wet) else 2 if b - a > 90 else 0
    rail.append([round(a, 1), round(b, 1), kind, nm])

# Roads over the line: road bridges that cross the track where the track is not itself on a bridge.
CLS = {'motorway': (0, 26), 'trunk': (0, 20), 'motorway_link': (1, 9), 'trunk_link': (1, 9), 'primary': (1, 13), 'secondary': (1, 11),
       'tertiary': (2, 9), 'unclassified': (2, 7), 'residential': (2, 8), 'service': (2, 6), 'living_street': (2, 7),
       'footway': (3, 3), 'path': (3, 3), 'cycleway': (3, 4), 'pedestrian': (3, 5), 'track': (3, 4), 'steps': (3, 3)}
tun = json.load(open('../tunnels.json')) if len(sys.argv) < 3 else json.load(open(sys.argv[2]))
over = []
for e in json.load(open('dem/over.json'))['elements']:
    t = e.get('tags', {})
    if e['type'] != 'way' or 'geometry' not in e or t.get('highway') not in CLS: continue
    if t.get('layer', '1').lstrip('-').isdigit() and int(t.get('layer', '1')) < 0: continue
    x, y = en([p['lat'] for p in e['geometry']], [p['lon'] for p in e['geometry']])
    for s, ang in crossings(x, y):
        if s < 2200 or any(a - 10 < s < b + 10 for a, b, *_ in rail) or any(a - 5 < s < b + 5 for a, b, *_ in tun): continue
        # Platforms keep their canopies clear: no road deck within 190 m of a station mark.
        if any(abs(s - st) < 190 for _, st in meta['stations']): continue
        c, w = CLS[t['highway']]
        try: w = max(w, float(str(t.get('width', '')).split()[0]))
        except (ValueError, IndexError): pass
        # ang is the angle between road and line; a skew bridge is wider along the line.
        over.append([round(s, 1), round(min(w / max(math.sin(ang), 0.35), 60), 1), round(math.pi / 2 - ang, 2), c])
over.sort()
# Dual carriageways cross twice a few metres apart; they make one wide deck.
merged = []
for o in over:
    if merged and o[0] - merged[-1][0] < (o[1] + merged[-1][1]) / 2 + 6:
        m = merged[-1]; a0 = min(m[0] - m[1] / 2, o[0] - o[1] / 2); a1 = max(m[0] + m[1] / 2, o[0] + o[1] / 2)
        merged[-1] = [round((a0 + a1) / 2, 1), round(a1 - a0, 1), m[2], min(m[3], o[3])]
    else: merged.append(o)
over = merged

# Curvature: heading every 10 m, smoothed over some 60 m, differentiated.
s10 = np.arange(0, cum[-1], 10.0)
e10, n10 = np.interp(s10, cum, E), np.interp(s10, cum, N)
def smooth(a, sig):
    k = int(sig * 3 / 10); g = np.exp(-np.arange(-k, k + 1) ** 2 / (2 * (sig / 10) ** 2)); g /= g.sum()
    return np.convolve(np.pad(a, k, mode='edge'), g, 'valid')
e10, n10 = smooth(e10, 60), smooth(n10, 60)
th = np.unwrap(np.arctan2(np.gradient(n10), np.gradient(e10)))
# A left turn raises the heading; the window looks out to the left of travel.
kap = smooth(np.gradient(th) / 10.0, 30)
DS = 20.0
sk = np.arange(0, L, DS)
k = np.interp(sk, s10, kap)
# The ride loops: the last 3 km ease back to the start, as the land does.
k = np.where(sk > L - 3000, k * np.clip((L - sk) / 3000, 0, 1), k)
# The trace leaves Zurich HB through the S-Bahn tunnel; the ride shows the yard, so it runs straight to 2.3 km.
k = k * np.clip((sk - 2300) / 300, 0, 1)
# No curve on this line is tighter than about 280 m.
k = np.clip(k, -1 / 280, 1 / 280)
line = {'rail': rail, 'over': over, 'curve': {'ds': DS, 'k': [round(float(v) * 1e4, 2) for v in k]}}
json.dump(line, open('line.json', 'w'), ensure_ascii=False, separators=(',', ':'))
for a, b, kd, nm in rail: print(f'bridge {a / 1000:7.3f} {b / 1000:7.3f} km {b - a:5.0f} m {"road water valley".split()[kd]:6s} {nm}')
print(len(over), 'roads over;', 'tightest radius', round(1 / max(np.abs(k).max(), 1e-6)), 'm')
