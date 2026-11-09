"""Cut the baked route at a station and re-close the loop to Zurich HB.

Run from trainride/: python3 tools/cut.py Murg 3500
The route then runs to the station plus the tail, and the last 3 km ease back to the start.
Station distances in route.json become route metres.
"""
import json, struct, sys, zlib

def read_png(path):
    data = open(path, 'rb').read()
    pos, idat, w = 8, b'', 0
    while pos < len(data):
        n, typ = struct.unpack('>I4s', data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + n]
        if typ == b'IHDR':
            w, h, depth, ctype = struct.unpack('>IIBB', body[:10])
            assert depth == 8 and ctype in (2, 6), (depth, ctype)
            bpp = 3 if ctype == 2 else 4
        elif typ == b'IDAT':
            idat += body
        pos += 12 + n
    raw = zlib.decompress(idat)
    stride = w * bpp
    rows, prev, i = [], bytearray(stride), 0
    for _ in range(h):
        f = raw[i]; line = bytearray(raw[i + 1:i + 1 + stride]); i += 1 + stride
        for x in range(stride):
            a = line[x - bpp] if x >= bpp else 0
            b = prev[x]
            c = prev[x - bpp] if x >= bpp else 0
            if f == 1: line[x] = (line[x] + a) & 255
            elif f == 2: line[x] = (line[x] + b) & 255
            elif f == 3: line[x] = (line[x] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c; pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(line); prev = line
    return w, h, bpp, rows

def write_png(path, w, h, rows):
    raw = b''.join(b'\x00' + bytes(r) for r in rows)
    chunk = lambda t, b: struct.pack('>I', len(b)) + t + b + struct.pack('>I', zlib.crc32(t + b) & 0xffffffff)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))

name, tail = sys.argv[1], float(sys.argv[2])
meta = json.load(open('route.json'))
L, last = meta['L'], meta['stations'][-1][1]
# Old station values are graph metres; the map scales them onto L.
sm = lambda d: d * L / last
end = next(sm(d) for n, d in meta['stations'] if n == name)
newL = end + tail
w, h, bpp, rows = read_png('route.png')
ds, dn = L / w, newL / w
out = []
K = int(3000 / dn)
for r in rows:
    q = [r[i * bpp] * 256 + r[i * bpp + 1] for i in range(w)]
    B = [r[i * bpp + 2] for i in range(w)]
    nq, nb = [], []
    for i in range(w):
        u = i * dn / ds; i0 = min(int(u), w - 2); f = u - i0
        nq.append(q[i0] * (1 - f) + q[i0 + 1] * f)
        nb.append(B[i0] if f < 0.5 else B[i0 + 1])
    # The loop closes: the last 3 km ease back to the start.
    wet0, d0 = (1.0 if nb[0] == 255 else 0.0), (0 if nb[0] == 255 else nb[0] / 250)
    for k in range(K):
        t = (k + 1) / K; t = t * t * (3 - 2 * t); i = w - K + k
        wi, di = (1.0 if nb[i] == 255 else 0.0), (0 if nb[i] == 255 else nb[i] / 250)
        nq[i] = nq[i] * (1 - t) + nq[0] * t
        wv, dv = wi * (1 - t) + wet0 * t, di * (1 - t) + d0 * t
        nb[i] = 255 if wv > 0.5 else min(250, round(dv * 250))
    line = bytearray(w * 3)
    for i in range(w):
        v = max(0, min(65535, round(nq[i])))
        line[i * 3:i * 3 + 3] = bytes((v >> 8, v & 255, nb[i]))
    out.append(line)
write_png('route.png', w, h, out)
meta['L'] = round(newL, 1)
meta['stations'] = [[n, round(sm(d), 1)] for n, d in meta['stations'] if sm(d) <= end + 1]
meta['places'] = [p for p in meta['places'] if p[0] < newL - 3000]
json.dump(meta, open('route.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('L', meta['L'], 'stations', len(meta['stations']), 'places', len(meta['places']))
