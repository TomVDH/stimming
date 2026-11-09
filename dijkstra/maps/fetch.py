#!/usr/bin/env python3
"""Fetch city grabs from OpenStreetMap (Overpass) for Dijkstra flood.

Each grab is a 2200 m square near a city centre, with a seeded random offset.
It keeps streets, buildings, water and parks, in metres at 0.5 m steps.
Map data (c) OpenStreetMap contributors, under the ODbL.

Usage: python3 fetch.py <raw cache dir> [max new grabs]
"""
import gzip, json, math, os, random, sys, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
HALF = 1100         # half the kept square, metres
PAD = 120           # extra fetched round the square, metres
Q = 2               # coordinate step: 1 / Q metres
UA = 'stimming-dijkstra-flood/1.0 (desk toy; github.com/TomVDH/stimming)'
URL = 'https://overpass-api.de/api/interpreter'

CITIES = """Brussels,BE,50.8467,4.3525;Antwerp,BE,51.2194,4.4025;Ghent,BE,51.0543,3.7174;Bruges,BE,51.2093,3.2247;Leuven,BE,50.8798,4.7005;Mechelen,BE,51.0259,4.4776;Amsterdam,NL,52.3728,4.8936;Rotterdam,NL,51.9225,4.4792;Utrecht,NL,52.0907,5.1214;The Hague,NL,52.0799,4.3113;Delft,NL,52.0116,4.3571;Naarden,NL,52.2953,5.1625;Paris,FR,48.8566,2.3522;Paris Etoile,FR,48.8738,2.2950;Lyon,FR,45.7640,4.8357;Marseille,FR,43.2965,5.3698;Bordeaux,FR,44.8378,-0.5792;Lille,FR,50.6292,3.0573;Strasbourg,FR,48.5734,7.7521;Nice,FR,43.7102,7.2620;Toulouse,FR,43.6047,1.4442;London,GB,51.5101,-0.1340;Edinburgh,GB,55.9533,-3.1883;Manchester,GB,53.4808,-2.2426;Bath,GB,51.3811,-2.3590;York,GB,53.9600,-1.0873;Dublin,IE,53.3498,-6.2603;Berlin,DE,52.5200,13.4050;Munich,DE,48.1374,11.5755;Hamburg,DE,53.5511,9.9937;Cologne,DE,50.9375,6.9603;Frankfurt,DE,50.1109,8.6821;Leipzig,DE,51.3397,12.3731;Dresden,DE,51.0504,13.7373;Karlsruhe,DE,49.0094,8.4044;Rothenburg,DE,49.3767,10.1792;Vienna,AT,48.2082,16.3738;Salzburg,AT,47.8095,13.0550;Zurich,CH,47.3769,8.5417;Bern,CH,46.9480,7.4474;Geneva,CH,46.2044,6.1432;Milan,IT,45.4642,9.1900;Venice,IT,45.4408,12.3155;Florence,IT,43.7696,11.2558;Rome,IT,41.9028,12.4964;Naples,IT,40.8518,14.2681;Bologna,IT,44.4949,11.3426;Turin,IT,45.0703,7.6869;Siena,IT,43.3188,11.3308;Palmanova,IT,45.9054,13.3100;Madrid,ES,40.4168,-3.7038;Barcelona,ES,41.3874,2.1686;Eixample,ES,41.3917,2.1649;Seville,ES,37.3891,-5.9845;Valencia,ES,39.4699,-0.3763;Bilbao,ES,43.2630,-2.9350;Granada,ES,37.1773,-3.5986;Toledo,ES,39.8628,-4.0273;Cordoba,ES,37.8882,-4.7794;Lisbon,PT,38.7223,-9.1393;Porto,PT,41.1579,-8.6291;Copenhagen,DK,55.6761,12.5683;Stockholm,SE,59.3293,18.0686;Gothenburg,SE,57.7089,11.9746;Oslo,NO,59.9139,10.7522;Helsinki,FI,60.1699,24.9384;Reykjavik,IS,64.1466,-21.9426;Prague,CZ,50.0755,14.4378;Krakow,PL,50.0647,19.9450;Warsaw,PL,52.2297,21.0122;Budapest,HU,47.4979,19.0402;Bratislava,SK,48.1486,17.1077;Ljubljana,SI,46.0569,14.5058;Zagreb,HR,45.8150,15.9819;Dubrovnik,HR,42.6507,18.0944;Kotor,ME,42.4247,18.7712;Belgrade,RS,44.7866,20.4489;Athens,GR,37.9838,23.7275;Thessaloniki,GR,40.6401,22.9444;Istanbul,TR,41.0082,28.9784;Bucharest,RO,44.4268,26.1025;Sofia,BG,42.6977,23.3219;Riga,LV,56.9496,24.1052;Tallinn,EE,59.4370,24.7536;Vilnius,LT,54.6872,25.2797;Valletta,MT,35.8989,14.5146;Luxembourg,LU,49.6116,6.1319;Nicosia,CY,35.1856,33.3823;New York,US,40.7580,-73.9855;Brooklyn,US,40.6782,-73.9442;Boston,US,42.3601,-71.0589;Philadelphia,US,39.9526,-75.1652;Washington,US,38.9072,-77.0369;Chicago,US,41.8781,-87.6298;San Francisco,US,37.7749,-122.4194;Los Angeles,US,34.0522,-118.2437;Seattle,US,47.6062,-122.3321;Portland,US,45.5152,-122.6784;Denver,US,39.7392,-104.9903;New Orleans,US,29.9511,-90.0715;Savannah,US,32.0809,-81.0912;Austin,US,30.2672,-97.7431;Miami,US,25.7617,-80.1918;Salt Lake City,US,40.7608,-111.8910;Pittsburgh,US,40.4406,-79.9959;Detroit,US,42.3314,-83.0458;Minneapolis,US,44.9778,-93.2650;Sun City,US,33.5975,-112.2718;Toronto,CA,43.6532,-79.3832;Montreal,CA,45.5017,-73.5673;Vancouver,CA,49.2827,-123.1207;Quebec City,CA,46.8139,-71.2080;Mexico City,MX,19.4326,-99.1332;Havana,CU,23.1136,-82.3666;Buenos Aires,AR,-34.6037,-58.3816;La Plata,AR,-34.9214,-57.9545;Montevideo,UY,-34.9011,-56.1645;Santiago,CL,-33.4489,-70.6693;Lima,PE,-12.0464,-77.0428;Bogota,CO,4.5981,-74.0760;Medellin,CO,6.2442,-75.5812;Cartagena,CO,10.4236,-75.5486;Quito,EC,-0.2200,-78.5120;La Paz,BO,-16.4955,-68.1336;Rio de Janeiro,BR,-22.9068,-43.1729;Sao Paulo,BR,-23.5505,-46.6333;Brasilia,BR,-15.7939,-47.8828;Caracas,VE,10.5061,-66.9146;Cairo,EG,30.0444,31.2357;Marrakesh,MA,31.6295,-7.9811;Fes,MA,34.0640,-4.9730;Casablanca,MA,33.5731,-7.5898;Tunis,TN,36.7990,10.1700;Cape Town,ZA,-33.9249,18.4241;Johannesburg,ZA,-26.2041,28.0473;Nairobi,KE,-1.2864,36.8172;Lagos,NG,6.4541,3.3947;Accra,GH,5.5560,-0.1969;Dakar,SN,14.6711,-17.4381;Addis Ababa,ET,9.0300,38.7400;Kigali,RW,-1.9441,30.0619;Stone Town,TZ,-6.1630,39.1890;Shinjuku,JP,35.6938,139.7034;Ginza,JP,35.6717,139.7650;Kyoto,JP,35.0036,135.7681;Osaka,JP,34.6937,135.5023;Seoul,KR,37.5665,126.9780;Busan,KR,35.1796,129.0756;Beijing,CN,39.9042,116.4074;Shanghai,CN,31.2304,121.4737;Hong Kong,HK,22.2819,114.1580;Taipei,TW,25.0330,121.5654;Singapore,SG,1.2830,103.8510;Kuala Lumpur,MY,3.1478,101.6953;Bangkok,TH,13.7563,100.5018;Hanoi,VN,21.0285,105.8542;Ho Chi Minh City,VN,10.7769,106.7009;Manila,PH,14.5995,120.9842;Jakarta,ID,-6.1754,106.8272;Mumbai,IN,18.9388,72.8354;Delhi,IN,28.6315,77.2167;Kolkata,IN,22.5726,88.3639;Bangalore,IN,12.9716,77.5946;Jaipur,IN,26.9124,75.7873;Chandigarh,IN,30.7333,76.7794;Kathmandu,NP,27.7172,85.3240;Dubai,AE,25.2048,55.2708;Tel Aviv,IL,32.0853,34.7818;Jerusalem,IL,31.7767,35.2345;Tehran,IR,35.6892,51.3890;Isfahan,IR,32.6546,51.6680;Tbilisi,GE,41.6934,44.8015;Yerevan,AM,40.1792,44.4991;Almaty,KZ,43.2380,76.9450;Ulaanbaatar,MN,47.9184,106.9177;Sydney,AU,-33.8688,151.2093;Melbourne,AU,-37.8136,144.9631;Brisbane,AU,-27.4698,153.0251;Perth,AU,-31.9505,115.8605;Adelaide,AU,-34.9285,138.6007;Canberra,AU,-35.2809,149.1300;Auckland,NZ,-36.8485,174.7633;Wellington,NZ,-41.2865,174.7762;Christchurch,NZ,-43.5321,172.6362"""

HIGHWAY = {
    'motorway': 0, 'trunk': 0, 'primary': 1, 'secondary': 2, 'tertiary': 3,
    'unclassified': 4, 'residential': 4, 'living_street': 4, 'pedestrian': 5, 'service': 5,
}
SKIP_SERVICE = {'parking_aisle', 'driveway', 'drive-through', 'emergency_access'}


def slug(name):
    return ''.join(c if c.isalnum() else '-' for c in name.lower()).strip('-')


def query(bb):
    s, w, n, e = bb
    b = f'{s:.6f},{w:.6f},{n:.6f},{e:.6f}'
    return f'''[out:json][timeout:180][maxsize:512000000];
(
 way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street)(_link)?$"]({b});
 way["building"]({b});
 way["natural"="water"]({b});
 way["waterway"~"^(river|canal|riverbank)$"]({b});
 way["leisure"~"^(park|garden)$"]({b});
 way["landuse"~"^(grass|forest|recreation_ground|cemetery)$"]({b});
 relation["natural"="water"]({b});
 relation["leisure"="park"]({b});
);
out body;
>;
out skel qt;'''


def overpass(q):
    data = urllib.parse.urlencode({'data': q}).encode()
    wait = 20
    for attempt in range(9):
        try:
            req = urllib.request.Request(URL, data=data, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=240) as r:
                return r.read()
        except Exception as ex:  # The server is often at capacity: back off and retry.
            print(f'  retry {attempt + 1} in {wait}s: {ex}', flush=True)
            time.sleep(wait)
            wait = min(wait * 2, 300)
    raise RuntimeError('overpass failed')


def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    (ax, ay), (bx, by) = pts[0], pts[-1]
    dx, dy = bx - ax, by - ay
    L = math.hypot(dx, dy) or 1e-9
    best, k = -1, 0
    for i in range(1, len(pts) - 1):
        px, py = pts[i]
        d = abs(dy * (px - ax) - dx * (py - ay)) / L
        if d > best:
            best, k = d, i
    if best <= eps:
        return [pts[0], pts[-1]]
    return rdp(pts[:k + 1], eps)[:-1] + rdp(pts[k:], eps)


def ring_rdp(r, eps):
    """Simplify a closed ring in two halves, split at its farthest point."""
    k = max(range(len(r)), key=lambda i: (r[i][0] - r[0][0]) ** 2 + (r[i][1] - r[0][1]) ** 2)
    if k == 0:
        return r
    return rdp(r[:k + 1], eps)[:-1] + rdp(r[k:], eps)


def area(ring):
    return abs(sum(ring[i][0] * ring[i - 1][1] - ring[i - 1][0] * ring[i][1] for i in range(len(ring)))) / 2


def rings_from(ways):
    """Join member ways end to end into closed rings."""
    ways = [list(w) for w in ways if len(w) >= 2]
    rings = []
    while ways:
        cur = ways.pop()
        changed = True
        while cur[0] != cur[-1] and changed:
            changed = False
            for i, w in enumerate(ways):
                if w[0] == cur[-1]: cur += w[1:]
                elif w[-1] == cur[-1]: cur += w[::-1][1:]
                elif w[-1] == cur[0]: cur = w[:-1] + cur
                elif w[0] == cur[0]: cur = w[::-1][:-1] + cur
                else: continue
                ways.pop(i)
                changed = True
                break
        if cur[0] == cur[-1] and len(cur) >= 4:
            rings.append(cur)
    return rings


def flat(pts, q=Q):
    """Delta-encoded integers at 1 / q metres."""
    out, px, py = [], 0, 0
    for x, y in pts:
        qx, qy = round(x * q), round(y * q)
        out += [qx - px, qy - py]
        px, py = qx, qy
    return out


def process(raw, lat0, lon0):
    els = json.loads(raw)['elements']
    kx, ky = 111320 * math.cos(math.radians(lat0)), 110540
    node = {}
    for el in els:
        if el['type'] == 'node':
            node[el['id']] = ((el['lon'] - lon0) * kx, -(el['lat'] - lat0) * ky)
    ways = {el['id']: el for el in els if el['type'] == 'way'}
    lim = HALF + PAD * 0.7
    inside = lambda p: abs(p[0]) < lim and abs(p[1]) < lim

    # Streets: split at junctions, simplify the bends, keep the largest component.
    use = {}
    roads = []
    for w in ways.values():
        t = w.get('tags', {})
        hw = t.get('highway', '').replace('_link', '')
        if hw not in HIGHWAY or t.get('service') in SKIP_SERVICE or t.get('area') == 'yes':
            continue
        ids = [i for i in w['nodes'] if i in node]
        if len(ids) < 2:
            continue
        roads.append((HIGHWAY[hw], ids))
        for i in ids:
            use[i] = use.get(i, 0) + 1
        use[ids[0]] += 1
        use[ids[-1]] += 1
    vid, vx, edges = {}, [], []
    def vert(key, p):
        if key not in vid:
            vid[key] = len(vx)
            vx.append(p)
        return vid[key]
    for cls, ids in roads:
        start = 0
        for k in range(1, len(ids)):
            if use[ids[k]] < 2 and k < len(ids) - 1:
                continue
            chain = [node[i] for i in ids[start:k + 1]]
            if any(inside(p) for p in chain):
                pts = rdp(chain, 1.5)
                prev = vert(('n', ids[start]), pts[0])
                for j in range(1, len(pts)):
                    cur = vert(('n', ids[k]), pts[j]) if j == len(pts) - 1 else vert(('m', ids[start], ids[k], j), pts[j])
                    if cur != prev:
                        edges.append((prev, cur, cls))
                    prev = cur
            start = k
    par = list(range(len(vx)))
    def find(i):
        while par[i] != i:
            par[i] = par[par[i]]
            i = par[i]
        return i
    for a, b, _ in edges:
        par[find(a)] = find(b)
    size = {}
    for i in range(len(vx)):
        size[find(i)] = size.get(find(i), 0) + 1
    if not size:
        return None
    big = max(size, key=size.get)
    keep = [i for i in range(len(vx)) if find(i) == big]
    remap = {old: new for new, old in enumerate(keep)}
    edges = [(remap[a], remap[b], c) for a, b, c in edges if a in remap and b in remap]
    verts = [vx[i] for i in keep]

    # Areas: buildings, water and green, as rings in metres.
    def ring_of(ids, eps):
        pts = [node[i] for i in ids if i in node]
        if len(pts) < 4 or pts[0] != pts[-1]:
            return None
        pts = ring_rdp(pts, eps)
        return pts if len(pts) >= 4 else None
    blds, water, green, rivers = [], [], [], []
    for w in ways.values():
        t = w.get('tags', {})
        if not t:
            continue
        if 'building' in t:
            r = ring_of(w['nodes'], 1.2)
            if r and area(r) > 30 and inside((sum(p[0] for p in r) / len(r), sum(p[1] for p in r) / len(r))):
                blds.append(r)
        elif t.get('natural') == 'water' or t.get('waterway') == 'riverbank':
            r = ring_of(w['nodes'], 1.0)
            if r: water.append([r])
        elif t.get('waterway') in ('river', 'canal'):
            pts = [node[i] for i in w['nodes'] if i in node]
            if len(pts) >= 2 and any(inside(p) for p in pts):
                rivers.append((1 if t['waterway'] == 'river' else 0, rdp(pts, 1.0)))
        elif t.get('leisure') in ('park', 'garden') or t.get('landuse') in ('grass', 'forest', 'recreation_ground', 'cemetery'):
            r = ring_of(w['nodes'], 1.0)
            if r: green.append([r])
    for el in els:
        if el['type'] != 'relation':
            continue
        t = el.get('tags', {})
        dest = water if t.get('natural') == 'water' else green if t.get('leisure') == 'park' else None
        if dest is None:
            continue
        members = [[node[i] for i in ways[m['ref']]['nodes'] if i in node] for m in el.get('members', []) if m['type'] == 'way' and m['ref'] in ways]
        rings = [r for r in (ring_rdp(r, 1.0) for r in rings_from(members)) if len(r) >= 4]
        if rings: dest.append(rings)
    blds.sort(key=area, reverse=True)
    blds = blds[:7000]
    return {
        'v': flat(verts),
        'e': [x for a, b, c in edges for x in (a, b, c)],
        'b': [flat(r, 1) for r in blds],
        'w': [[flat(r) for r in poly] for poly in water],
        'g': [[flat(r) for r in poly] for poly in green],
        'r': [[k] + flat(p) for k, p in rivers],
    }


def main():
    cache = sys.argv[1]
    want = int(sys.argv[2]) if len(sys.argv) > 2 else 999
    os.makedirs(cache, exist_ok=True)
    got = 0
    for row in CITIES.split(';'):
        name, cc, lat, lon = row.split(',')
        lat, lon = float(lat), float(lon)
        sid = slug(name)
        out = os.path.join(HERE, sid + '.json')
        if os.path.exists(out):
            continue
        # A seeded offset makes each grab a random spot near the centre.
        rnd = random.Random(sid)
        ox, oy = rnd.uniform(-320, 320), rnd.uniform(-320, 320)
        kx, ky = 111320 * math.cos(math.radians(lat)), 110540
        lat0, lon0 = lat - oy / ky, lon + ox / kx
        h = HALF + PAD
        bb = (lat0 - h / ky, lon0 - h / kx, lat0 + h / ky, lon0 + h / kx)
        raw_path = os.path.join(cache, sid + '.json.gz')
        t0 = time.time()
        if os.path.exists(raw_path):
            raw = gzip.open(raw_path).read()
        else:
            print(f'{name}: fetching', flush=True)
            raw = overpass(query(bb))
            with gzip.open(raw_path, 'wb') as f:
                f.write(raw)
        try:
            d = process(raw, lat0, lon0)
        except Exception as ex:
            print(f'{name}: process failed: {ex}', flush=True)
            continue
        if not d or len(d['e']) // 3 < 800:
            print(f'{name}: too few streets, skipped', flush=True)
            continue
        d = {'name': name, 'cc': cc, 'lat': round(lat0, 5), 'lon': round(lon0, 5), 'half': HALF, 'q': Q, 'bq': 1, **d}
        with open(out, 'w') as f:
            json.dump(d, f, separators=(',', ':'))
        got += 1
        print(f'{name}: {len(d["e"]) // 3} edges, {len(d["b"])} buildings, {os.path.getsize(out) // 1024} KB, {time.time() - t0:.0f}s', flush=True)
        index()
        if got >= want:
            break
        time.sleep(2)
    index()


def index():
    rows = []
    for fn in sorted(os.listdir(HERE)):
        if fn.endswith('.json') and fn != 'index.json':
            with open(os.path.join(HERE, fn)) as f:
                d = json.load(f)
            rows.append({'id': fn[:-5], 'name': d['name'], 'cc': d['cc']})
    with open(os.path.join(HERE, 'index.json'), 'w') as f:
        json.dump(rows, f, separators=(',', ':'))


if __name__ == '__main__':
    main()
