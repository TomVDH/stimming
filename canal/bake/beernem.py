"""Bake OpenStreetMap tiles of Beernem into canal/beernem.json.

Usage: python3 beernem.py <dir with t*.osm> <out.json>
Fetch the tiles from api.openstreetmap.org/api/0.6/map (bbox per tile).
mw.json in the same dir: Overpass, way[highway~"^motorway"], out geom.
The frame: origin on the canal under the Parkstraat bridge.
-z runs down the canal toward Brugge; +y is up; units are metres.
"""
import glob, json, math, sys
import xml.etree.ElementTree as ET

src, out = sys.argv[1], sys.argv[2]
N, W, R = {}, {}, {}
for f in sorted(glob.glob(f'{src}/t*.osm')):
    for e in ET.parse(f).getroot():
        t = {k.get('k'): k.get('v') for k in e.findall('tag')}
        if e.tag == 'node': N[e.get('id')] = (float(e.get('lat')), float(e.get('lon')), t)
        elif e.tag == 'way': W[e.get('id')] = ([n.get('ref') for n in e.findall('nd')], t)
        elif e.tag == 'relation': R[e.get('id')] = ([(m.get('type'), m.get('ref'), m.get('role')) for m in e.findall('member')], t)

LAT0, LON0 = 51.14, 3.33
KX, KY = 111320 * math.cos(math.radians(LAT0)), 110574
def en(n):
    la, lo, _ = N[n]
    return ((lo - LON0) * KX, (la - LAT0) * KY)

# The canal centreline and the bridge that carries Stationsstraat over it.
canal = [en(n) for n in W['101191133'][0] if n in N]
def inter(a, b, c, d):
    r = (b[0]-a[0], b[1]-a[1]); s = (d[0]-c[0], d[1]-c[1]); q = r[0]*s[1]-r[1]*s[0]
    if abs(q) < 1e-9: return None
    t = ((c[0]-a[0])*s[1]-(c[1]-a[1])*s[0]) / q; u = ((c[0]-a[0])*r[1]-(c[1]-a[1])*r[0]) / q
    return (t, a[0]+t*r[0], a[1]+t*r[1]) if 0 <= t <= 1 and 0 <= u <= 1 else None
O = None
for nd, t in W.values():
    if t.get('name') == 'Parkstraat' and t.get('bridge'):
        p = [en(n) for n in nd if n in N]
        for i in range(len(canal)-1):
            for j in range(len(p)-1):
                h = inter(canal[i], canal[i+1], p[j], p[j+1])
                if h: O, seg = (h[1], h[2]), (canal[i], canal[i+1])
assert O, 'no bridge'
# Down the canal is the end of the segment nearer the north-west.
dx, dy = seg[1][0]-seg[0][0], seg[1][1]-seg[0][1]
if dx > 0: dx, dy = -dx, -dy
L = math.hypot(dx, dy); dx, dy = dx/L, dy/L
# Local: -z along (dx, dy); +x to the right of that heading.
def loc(p):
    ex, ny = p[0]-O[0], p[1]-O[1]
    return (ex*dy - ny*dx, -(ex*dx + ny*dy))
X0, X1, Z0, Z1 = -1500, 1500, -2000, 1000
def P(n): return loc(en(n))
Q = 4  # quarter metres
def pack(pts):
    o, px, pz = [], 0, 0
    for x, z in pts:
        qx, qz = round(x*Q), round(z*Q)
        o += [qx-px, qz-pz]; px, pz = qx, qz
    return o
def inside(pts, m=0):
    return any(X0-m <= x <= X1+m and Z0-m <= z <= Z1+m for x, z in pts)
def ring(nd): return [P(n) for n in nd if n in N]

def rings(rid):
    """Outer rings of a multipolygon relation, joined end to end."""
    segs = [W[r][0][:] for ty, r, ro in R[rid][0] if ty == 'way' and r in W and ro in ('outer', '')]
    res = []
    while segs:
        cur = segs.pop(0)
        grown = True
        while grown and cur[0] != cur[-1]:
            grown = False
            for i, s in enumerate(segs):
                if s[0] == cur[-1]: cur += s[1:]
                elif s[-1] == cur[-1]: cur += s[::-1][1:]
                elif s[-1] == cur[0]: cur = s[:-1] + cur
                elif s[0] == cur[0]: cur = s[::-1][:-1] + cur
                else: continue
                segs.pop(i); grown = True; break
        res.append(cur)
    return res

areas = []  # (tags, nodes)
for wid, (nd, t) in W.items():
    if len(nd) > 2 and nd[0] == nd[-1]: areas.append((t, nd))
for rid, (m, t) in R.items():
    if t.get('type') == 'multipolygon':
        for r in rings(rid): areas.append((t, r))

BT = {'house': 1, 'detached': 1, 'semidetached_house': 1, 'terrace': 2, 'residential': 1, 'apartments': 3,
      'garage': 4, 'garages': 4, 'shed': 4, 'roof': 5, 'carport': 5, 'farm': 1, 'farm_auxiliary': 6, 'barn': 6,
      'greenhouse': 7, 'industrial': 8, 'warehouse': 8, 'commercial': 9, 'retail': 9, 'office': 9,
      'church': 10, 'chapel': 10, 'school': 11, 'public': 11, 'civic': 11, 'train_station': 12,
      'service': 4, 'hut': 4, 'stable': 6, 'construction': 0, 'yes': 0}
LU = {'farmland': 1, 'meadow': 2, 'grass': 3, 'village_green': 3, 'grassland': 3, 'forest': 4, 'wood': 4,
      'scrub': 5, 'residential': 6, 'farmyard': 7, 'industrial': 8, 'commercial': 9, 'retail': 9,
      'cemetery': 10, 'grave_yard': 10, 'orchard': 11, 'allotments': 12, 'pitch': 13, 'park': 14, 'garden': 14,
      'playground': 15, 'sports_centre': 16, 'track': 17, 'parking': 18, 'school': 19, 'swimming_pool': 20,
      'water': 21, 'construction': 22, 'railway': 23, 'brownfield': 22, 'plant_nursery': 11, 'religious': 6}

out_b, out_l, out_w = [], [], []
for t, nd in areas:
    pts = ring(nd)
    if len(pts) < 3 or not inside(pts): continue
    if 'building' in t and t.get('type') != 'multipolygon' or t.get('building'):
        if t.get('building') == 'no': continue
        b = t.get('building', 'yes')
        lv = t.get('building:levels', '0')
        lv = int(float(lv)) if lv.replace('.', '', 1).isdigit() else 0
        h = t.get('height', '0').split()[0]
        h = round(float(h)) if h.replace('.', '', 1).isdigit() else 0
        rs = {'gabled': 1, 'hipped': 2, 'flat': 3, 'skillion': 4, 'pyramidal': 2}.get(t.get('roof:shape'), 0)
        c = BT.get(b, 0)
        if t.get('amenity') == 'place_of_worship': c = 10
        out_b.append([c, lv, h, rs, pack(pts[:-1] if pts[0] == pts[-1] else pts)])
        continue
    if t.get('natural') == 'water' or t.get('water') or t.get('waterway') == 'riverbank':
        out_w.append([1 if t.get('water') == 'canal' else 0, pack(pts)])
        continue
    k = t.get('landuse') or t.get('leisure') or t.get('natural') or t.get('amenity')
    if k in LU: out_l.append([LU[k], pack(pts)])

RC = {'motorway': 1, 'motorway_link': 2, 'trunk': 1, 'trunk_link': 2, 'primary': 3, 'primary_link': 3,
      'secondary': 3, 'secondary_link': 3, 'tertiary': 4, 'tertiary_link': 4, 'unclassified': 5,
      'residential': 6, 'living_street': 6, 'service': 7, 'track': 8, 'cycleway': 9, 'footway': 10,
      'path': 10, 'pedestrian': 11, 'steps': 10, 'bridleway': 10, 'construction': 7}
out_r, out_rail, out_ww, out_tr, out_h = [], [], [], [], []
for wid, (nd, t) in W.items():
    pts = ring(nd)
    if len(pts) < 2 or not inside(pts, 100): continue
    if t.get('highway') in RC and not (t.get('area') == 'yes'):
        fl = (1 if t.get('bridge') else 0) | (2 if t.get('tunnel') else 0) | (4 if t.get('oneway') == 'yes' else 0)
        out_r.append([RC[t['highway']], fl, t.get('name', ''), pack(pts)])
    elif t.get('railway') in ('rail', 'platform'):
        out_rail.append([1 if t['railway'] == 'rail' else 2, 1 if t.get('bridge') else 0, pack(pts)])
    elif t.get('waterway') in ('stream', 'ditch', 'drain', 'canal', 'river'):
        out_ww.append([{'canal': 0, 'river': 1, 'stream': 2}.get(t['waterway'], 3), pack(pts)])
    elif t.get('natural') == 'tree_row':
        out_tr.append(pack(pts))
    elif t.get('barrier') == 'hedge':
        out_h.append(pack(pts))

trees, lamps, poi = [], [], []
for nid, (la, lo, t) in N.items():
    if not t: continue
    x, z = loc(en(nid))
    if not (X0 <= x <= X1 and Z0 <= z <= Z1): continue
    q = [round(x*Q), round(z*Q)]
    if t.get('natural') == 'tree': trees += q
    elif t.get('highway') == 'street_lamp': lamps += q
    kind = t.get('amenity') or t.get('shop') or t.get('railway') or t.get('historic') or t.get('leisure')
    if kind and (t.get('name') or kind in ('fast_food', 'bar', 'pub', 'cafe', 'station', 'memorial', 'bakery')):
        poi.append([kind, t.get('name', ''), *q])
# Named areas too: churches, the town hall, schools, the station.
for t, nd in areas:
    k = t.get('amenity') or t.get('leisure') or t.get('railway')
    if k in ('place_of_worship', 'townhall', 'school', 'kindergarten', 'station', 'sports_centre', 'pitch', 'marketplace'):
        pts = ring(nd)
        if not inside(pts): continue
        cx = sum(p[0] for p in pts) / len(pts); cz = sum(p[1] for p in pts) / len(pts)
        poi.append([k, t.get('name', ''), round(cx*Q), round(cz*Q)])

# The canal table: water centre and half width, across x, every 25 m of z.
cl = [loc(p) for p in canal]
cw = [ring(nd) for t, nd in areas if t.get('water') == 'canal']
def clx(z):
    for (ax, az), (bx, bz) in zip(cl, cl[1:]):
        if (az - z) * (bz - z) <= 0 and az != bz: return ax + (bx - ax) * (z - az) / (bz - az)
    return 0.0
CT = []
for z in range(Z0, Z1 + 1, 25):
    c0, xs = clx(z), []
    for pg in cw:
        for (ax, az), (bx, bz) in zip(pg, pg[1:] + pg[:1]):
            if (az - z) * (bz - z) < 0: xs.append(ax + (bx - ax) * (z - az) / (bz - az))
    xs.sort()
    best = None
    for i in range(0, len(xs) - 1):
        if xs[i] <= c0 <= xs[i + 1] and (best is None or xs[i + 1] - xs[i] < best[1] - best[0]): best = (xs[i], xs[i + 1])
    if best and best[1] - best[0] < 120: CT.append([round((best[0] + best[1]) / 2, 2), round((best[1] - best[0]) / 2, 2)])
    else: CT.append([round(c0, 2), None])
for i, r in enumerate(CT):
    if r[1] is None: r[1] = next(CT[j][1] for j in sorted(range(len(CT)), key=lambda j: abs(j - i)) if CT[j][1] is not None)
# Motorways out to 8 km, from an Overpass export (mw.json) beside the tiles.
out_mw = []
try:
    for e in json.load(open(f'{src}/mw.json'))['elements']:
        t = e.get('tags', {})
        pts = [loc(((g['lon'] - LON0) * KX, (g['lat'] - LAT0) * KY)) for g in e['geometry']]
        if any(abs(x) < 8000 and abs(z) < 8000 for x, z in pts):
            out_mw.append([1 if t.get('highway') == 'motorway' else 2, t.get('ref', ''), pack(pts)])
except FileNotFoundError:
    pass
la, lo = O[1]/KY + LAT0, O[0]/KX + LON0
json.dump({
    'src': 'OpenStreetMap contributors, ODbL', 'origin': [round(la, 6), round(lo, 6)],
    'heading': round(math.degrees(math.atan2(dx, dy)) % 360, 2), 'q': Q,
    'rect': [X0, X1, Z0, Z1], 'ct': {'z0': Z0, 'dz': 25, 'x': [r[0] for r in CT], 'h': [r[1] for r in CT]},
    'b': out_b, 'l': out_l, 'w': out_w, 'r': out_r, 'rail': out_rail, 'ww': out_ww,
    'tr': out_tr, 'hedge': out_h, 'trees': trees, 'lamps': lamps, 'poi': poi, 'mw': out_mw,
}, open(out, 'w'), separators=(',', ':'), ensure_ascii=False)
print('origin', la, lo, 'heading', math.degrees(math.atan2(dx, dy)) % 360,
      'b', len(out_b), 'l', len(out_l), 'w', len(out_w), 'r', len(out_r), 'rail', len(out_rail),
      'trees', len(trees)//2, 'lamps', len(lamps)//2, 'poi', len(poi))
