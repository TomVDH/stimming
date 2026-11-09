import json, math, heapq
d = json.load(open('dem/rail.json'))
st = {}
ways = []
for e in d['elements']:
    if e['type'] == 'node':
        n = e['tags'].get('name')
        if n: st.setdefault(n, (e['lat'], e['lon']))
    elif e['type'] == 'way':
        ways.append([(p['lat'], p['lon']) for p in e['geometry']])
seq = ['Zürich HB', 'Zürich Enge', 'Zürich Wollishofen', 'Kilchberg', 'Rüschlikon', 'Thalwil', 'Oberrieden', 'Horgen', 'Au ZH', 'Wädenswil', 'Richterswil', 'Bäch', 'Freienbach SBB', 'Pfäffikon SZ', 'Altendorf', 'Lachen', 'Siebnen-Wangen', 'Reichenburg', 'Bilten', 'Ziegelbrücke', 'Weesen', 'Mühlehorn', 'Murg', 'Unterterzen', 'Walenstadt']
for s in seq:
    print(s, st.get(s) or [k for k in st if s.split()[0] in k][:5])

seq = ['Zürich Hauptbahnhof', 'Zürich Enge', 'Zürich Wollishofen', 'Kilchberg', 'Rüschlikon', 'Thalwil', 'Oberrieden', 'Horgen', 'Wädenswil', 'Richterswil', 'Bäch SZ', 'Freienbach SBB', 'Pfäffikon SZ', 'Altendorf', 'Lachen SZ', 'Siebnen-Wangen', 'Reichenburg', 'Bilten', 'Ziegelbrücke', 'Weesen', 'Mühlehorn', 'Murg', 'Unterterzen', 'Walenstadt']
R = 6371000.0
def xy(p):  # local metres around the area centre
    return ((p[1] - 9.0) * math.cos(math.radians(47.25)) * math.pi / 180 * R, (p[0] - 47.25) * math.pi / 180 * R)
key = lambda p: (round(p[0], 6), round(p[1], 6))
G = {}
for w in ways:
    for a, b in zip(w, w[1:]):
        ka, kb = key(a), key(b)
        ax, ay = xy(a); bx, by = xy(b)
        dd = math.hypot(ax - bx, ay - by)
        G.setdefault(ka, []).append((kb, dd)); G.setdefault(kb, []).append((ka, dd))
nodes = list(G)
NX = {k: xy(k) for k in nodes}
# Gaps in the map data: bridge any two nodes within 150 m, at a cost.
cell = {}
for k in nodes: cell.setdefault((int(NX[k][0] // 150), int(NX[k][1] // 150)), []).append(k)
for k in nodes:
    cx, cy = int(NX[k][0] // 150), int(NX[k][1] // 150)
    for i in (-1, 0, 1):
        for j in (-1, 0, 1):
            for m in cell.get((cx + i, cy + j), []):
                if m <= k: continue
                dd = math.hypot(NX[k][0] - NX[m][0], NX[k][1] - NX[m][1])
                if dd < 150: G[k].append((m, dd * 4 + 20)); G[m].append((k, dd * 4 + 20))
def nearest(p):
    x, y = xy(p); return min(nodes, key=lambda k: (NX[k][0] - x) ** 2 + (NX[k][1] - y) ** 2)
def path(a, b):
    dist = {a: 0}; prev = {}; q = [(0, a)]
    while q:
        c, u = heapq.heappop(q)
        if u == b: break
        if c > dist[u]: continue
        for v, w in G[u]:
            nc = c + w
            if nc < dist.get(v, 1e18): dist[v] = nc; prev[v] = u; heapq.heappush(q, (nc, v))
    out = [b]
    while out[-1] != a: out.append(prev[out[-1]])
    return out[::-1], dist[b]
pts = []; stations = []
total = 0
for s0, s1 in zip(seq, seq[1:]):
    a, b = nearest(st[s0]), nearest(st[s1])
    p, L = path(a, b)
    if not pts: stations.append((s0, 0.0))
    pts += p if not pts else p[1:]
    total += L
    stations.append((s1, total))
    print(f'{s1:22s} {total/1000:7.2f} km  (+{L/1000:.2f})')
json.dump({'pts': pts, 'stations': stations}, open('dem/track.json', 'w'))
lats = [p[0] for p in pts]; lons = [p[1] for p in pts]
print(len(pts), min(lats), max(lats), min(lons), max(lons))
