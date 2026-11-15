"""Bake the 2022 LiDAR round the corner of Commercial Drive and East 4th into eastvan/data/lidar.json.

Usage: python3 lidar.py <tile .zip or .las> <eastvan/data/drive.json> <out.json>
Source: City of Vancouver Open Data Portal, LiDAR 2022, tile 494000_5457000,
Open Government Licence - Vancouver. Plain Python: no numpy on this machine.
The frame matches drive.json: e runs east, n runs north, in metres from the corner.
"""
import json, math, struct, sys, zipfile

LON0, LAT0 = -123.069671, 49.266989
R = 62          # keep points this far from the corner
CELL = 0.5      # grid cell, metres
GROUND, VEG_HIGH, BUILDING = 2, 5, 6


def utm10(lon, lat):
    """WGS84 lon/lat to UTM zone 10 north (NAD83 differs by under a metre here)."""
    a, f, k0 = 6378137.0, 1 / 298.257223563, 0.9996
    e2 = f * (2 - f); ep2 = e2 / (1 - e2)
    lam0 = math.radians(-123)
    phi, lam = math.radians(lat), math.radians(lon)
    N = a / math.sqrt(1 - e2 * math.sin(phi) ** 2)
    T, C = math.tan(phi) ** 2, ep2 * math.cos(phi) ** 2
    A = math.cos(phi) * (lam - lam0)
    M = a * ((1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * phi
             - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * math.sin(2 * phi)
             + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * math.sin(4 * phi)
             - (35 * e2 ** 3 / 3072) * math.sin(6 * phi))
    x = k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5 / 120) + 500000
    y = k0 * (M + N * math.tan(phi) * (A ** 2 / 2 + (5 - T + 9 * C + 4 * C ** 2) * A ** 4 / 24
                                        + (61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6 / 720))
    return x, y


def open_las(path):
    if path.endswith('.zip'):
        z = zipfile.ZipFile(path)
        name = next(n for n in z.namelist() if n.lower().endswith('.las'))
        return z.open(name)
    return open(path, 'rb')


def points(path):
    """Yields (x, y, z, class) for every point, read in chunks."""
    f = open_las(path)
    h = f.read(375)
    if h[:4] != b'LASF':
        sys.exit('not a LAS file')
    major, minor = h[24], h[25]
    offset = struct.unpack_from('<I', h, 96)[0]
    fmt = h[104] & 0x3f
    rec = struct.unpack_from('<H', h, 105)[0]
    count = struct.unpack_from('<I', h, 107)[0]
    if major == 1 and minor >= 4:
        count = struct.unpack_from('<Q', h, 247)[0] or count
    sx, sy, sz, ox, oy, oz = struct.unpack_from('<6d', h, 131)
    # Skip to the first point: a zip member streams, so read forward.
    f.read(offset - 375)
    cls_at, cls_mask = (16, 0xff) if fmt >= 6 else (15, 0x1f)
    chunk = 200000
    left = count
    while left:
        n = min(chunk, left)
        buf = f.read(n * rec)
        for i in range(0, len(buf) - rec + 1, rec):
            X, Y, Z = struct.unpack_from('<3i', buf, i)
            yield X * sx + ox, Y * sy + oy, Z * sz + oz, buf[i + cls_at] & cls_mask
        left -= n
        print(f'  {count - left:,} / {count:,} points', file=sys.stderr, end='\r')
    print(file=sys.stderr)


def inside(pt, ring):
    x, y, c = pt[0], pt[1], False
    for i in range(len(ring)):
        a, b = ring[i], ring[i - 1]
        if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
            c = not c
    return c


def main(src, drive, out):
    E0, N0 = utm10(LON0, LAT0)
    roof, veg, ground = {}, {}, {}
    for x, y, z, c in points(src):
        e, n = x - E0, y - N0
        if e * e + n * n > R * R:
            continue
        key = (round(e / CELL), round(n / CELL))
        if c == BUILDING:
            roof[key] = max(roof.get(key, -1e9), z)
        elif c == VEG_HIGH:
            veg[key] = max(veg.get(key, -1e9), z)
        elif c == GROUND:
            g = (round(e / 4), round(n / 4))
            ground.setdefault(g, []).append(z)
    gz = {k: sorted(v)[len(v) // 2] for k, v in ground.items()}
    base = sorted(gz.values())[len(gz) // 2]
    # Height above the nearest ground sample, so slopes do not tilt the roofs.
    def above(key, z):
        g = (round(key[0] * CELL / 4), round(key[1] * CELL / 4))
        for r in range(0, 6):
            for dx in range(-r, r + 1):
                for dy in range(-r, r + 1):
                    if (g[0] + dx, g[1] + dy) in gz:
                        return z - gz[(g[0] + dx, g[1] + dy)]
        return z - base
    d = json.load(open(drive))
    # The footprints and the points can sit a metre apart: find the best shift.
    rings = [b['ring'] for b in d['b']]
    sample = list(roof)[::7]
    best = (0, 0, -1)
    for dx in [i * 0.5 for i in range(-6, 7)]:
        for dy in [i * 0.5 for i in range(-6, 7)]:
            hit = sum(1 for k in sample if any(inside((k[0] * CELL + dx, k[1] * CELL + dy), r) for r in rings[:60]))
            if hit > best[2]:
                best = (dx, dy, hit)
    dx, dy = best[0], best[1]
    print(f'shift {dx}, {dy}: {best[2]} of {len(sample)} sample cells fall in a footprint', file=sys.stderr)
    # Each building takes the roof cells inside its footprint.
    out_b = []
    for b in d['b']:
        ring = b['ring']
        es, ns = [p[0] for p in ring], [p[1] for p in ring]
        cells = []
        for (i, j), z in roof.items():
            e, n = i * CELL + dx, j * CELL + dy
            if min(es) <= e <= max(es) and min(ns) <= n <= max(ns) and inside((e, n), ring):
                cells.append([round(e, 2), round(n, 2), round(above((i, j), z), 2)])
        if cells:
            out_b.append({'id': b['id'], 'cells': cells})
    # Canopies: the tallest vegetation near each tree record.
    trees = []
    for t in d['trees']:
        te, tn = t['at']
        if te * te + tn * tn > R * R:
            continue
        hs = [(above(k, z), k) for k, z in veg.items() if (k[0] * CELL + dx - te) ** 2 + (k[1] * CELL + dy - tn) ** 2 < 49]
        if hs:
            top = max(h for h, _ in hs)
            spread = max(math.hypot(k[0] * CELL + dx - te, k[1] * CELL + dy - tn) for h, k in hs if h > top * 0.5)
            trees.append({'at': t['at'], 'h': round(top, 1), 'r': round(max(1, spread), 1)})
    json.dump({'credit': 'Contains information licensed under the Open Government Licence – Vancouver.', 'cell': CELL,
               'shift': [dx, dy], 'b': out_b, 'trees': trees}, open(out, 'w'), separators=(',', ':'))
    print(f'{out}: {len(out_b)} buildings, {sum(len(b["cells"]) for b in out_b)} roof cells, {len(trees)} canopies', file=sys.stderr)


if __name__ == '__main__':
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    main(*sys.argv[1:4])
