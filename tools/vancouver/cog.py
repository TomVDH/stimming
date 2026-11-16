"""A minimal Cloud Optimized GeoTIFF reader: ranged HTTP reads, deflate or LZW tiles, 8-bit samples."""
import struct, urllib.request, zlib, os, hashlib
import numpy as np

BLOCK = 1 << 18

class Ranged:
    def __init__(self, url, cache_dir):
        self.url, self.dir, self.blocks, self.got = url, cache_dir, {}, 0
        os.makedirs(cache_dir, exist_ok=True)
        self.tag = hashlib.md5(url.encode()).hexdigest()[:8]
    def _get(self, a, b):
        req = urllib.request.Request(self.url, headers={'Range': f'bytes={a}-{b - 1}'})
        with urllib.request.urlopen(req, timeout=120) as r:
            d = r.read()
        self.got += len(d)
        return d
    def read(self, off, n):
        out = b''
        while n > 0:
            bi = off // BLOCK
            if bi not in self.blocks:
                p = os.path.join(self.dir, f'{self.tag}_{bi}.blk')
                if os.path.exists(p):
                    self.blocks[bi] = open(p, 'rb').read()
                else:
                    self.blocks[bi] = self._get(bi * BLOCK, (bi + 1) * BLOCK)
                    open(p, 'wb').write(self.blocks[bi])
            blk = self.blocks[bi]
            s = off - bi * BLOCK
            take = min(n, len(blk) - s)
            if take <= 0: break
            out += blk[s:s + take]; off += take; n -= take
        return out

TYPES = {1: 'B', 2: 'c', 3: 'H', 4: 'I', 5: 'II', 11: 'f', 12: 'd', 16: 'Q', 17: 'q', 18: 'Q'}

def ifds(src):
    h = src.read(0, 16)
    assert h[:2] == b'II', 'little-endian only'
    big = struct.unpack('<H', h[2:4])[0] == 43
    off = struct.unpack('<Q', h[8:16])[0] if big else struct.unpack('<I', h[4:8])[0]
    out = []
    while off:
        if big:
            n = struct.unpack('<Q', src.read(off, 8))[0]; base = off + 8; esz = 20
        else:
            n = struct.unpack('<H', src.read(off, 2))[0]; base = off + 2; esz = 12
        raw = src.read(base, n * esz + 8)
        tags = {}
        for i in range(n):
            e = raw[i * esz:(i + 1) * esz]
            tag, typ = struct.unpack('<HH', e[:4])
            cnt = struct.unpack('<Q', e[4:12])[0] if big else struct.unpack('<I', e[4:8])[0]
            val = e[12:20] if big else e[8:12]
            f = TYPES.get(typ)
            if not f: continue
            size = struct.calcsize('<' + f) * cnt
            tags[tag] = (f, cnt, val, size, big)
        nxt = raw[n * esz:]
        off = struct.unpack('<Q', nxt[:8])[0] if big else struct.unpack('<I', nxt[:4])[0]
        out.append(tags)
    return out

def val(src, tags, tag):
    if tag not in tags: return None
    f, cnt, v, size, big = tags[tag]
    if size > len(v):
        p = struct.unpack('<Q', v)[0] if big else struct.unpack('<I', v)[0]
        v = src.read(p, size)
    if f == 'c': return v[:cnt]
    return np.frombuffer(v[:size], dtype='<' + {'B': 'u1', 'H': 'u2', 'I': 'u4', 'II': 'u4', 'f': 'f4', 'd': 'f8', 'Q': 'u8', 'q': 'i8'}[f])

def lzw(data, expect):
    # TIFF LZW: MSB-first codes, 9 to 12 bits, clear 256, end 257.
    out = bytearray(); table = [bytes([i]) for i in range(256)] + [b'', b'']
    bits = 9; buf = 0; nb = 0; prev = None
    for byte in data:
        buf = (buf << 8) | byte; nb += 8
        while nb >= bits:
            code = (buf >> (nb - bits)) & ((1 << bits) - 1); nb -= bits
            if code == 256:
                table = table[:258]; bits = 9; prev = None; continue
            if code == 257: return bytes(out)
            if prev is None:
                ent = table[code]
            elif code < len(table):
                ent = table[code]; table.append(prev + ent[:1])
            else:
                ent = prev + prev[:1]; table.append(ent)
            out += ent; prev = ent
            if len(table) >= (1 << bits) - 1 and bits < 12: bits += 1
        if len(out) >= expect: break
    return bytes(out)

class Level:
    def __init__(self, src, tags):
        g = lambda t: val(src, tags, t)
        self.src = src
        self.w, self.h = int(g(256)[0]), int(g(257)[0])
        self.comp = int(g(259)[0]); self.pred = int(g(317)[0]) if g(317) is not None else 1
        self.tw, self.th = int(g(322)[0]), int(g(323)[0])
        self.bits = int(g(258)[0]); self.tags = tags
        self._off = self._cnt = None
    def tiles(self):
        if self._off is None:
            self._off, self._cnt = val(self.src, self.tags, 324), val(self.src, self.tags, 325)
        return self._off, self._cnt
    def tile(self, tx, ty):
        off, cnt = self.tiles()
        i = ty * ((self.w + self.tw - 1) // self.tw) + tx
        if cnt[i] == 0: return np.zeros((self.th, self.tw), np.uint8)
        raw = self.src.read(int(off[i]), int(cnt[i]))
        if self.comp in (8, 32946): d = zlib.decompress(raw)
        elif self.comp == 5: d = lzw(raw, self.tw * self.th)
        elif self.comp == 1: d = raw
        else: raise ValueError(f'compression {self.comp}')
        a = np.frombuffer(d, np.uint8)[:self.tw * self.th].reshape(self.th, self.tw)
        if self.pred == 2: a = np.cumsum(a, axis=1, dtype=np.uint8)
        return a
    def window(self, x0, y0, x1, y1):
        out = np.zeros((y1 - y0, x1 - x0), np.uint8)
        for ty in range(y0 // self.th, (y1 - 1) // self.th + 1):
            for tx in range(x0 // self.tw, (x1 - 1) // self.tw + 1):
                t = self.tile(tx, ty)
                ax, ay = tx * self.tw, ty * self.th
                sx0, sy0, sx1, sy1 = max(x0, ax), max(y0, ay), min(x1, ax + self.tw), min(y1, ay + self.th)
                out[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = t[sy0 - ay:sy1 - ay, sx0 - ax:sx1 - ax]
        return out

def open_cog(url, cache_dir):
    src = Ranged(url, cache_dir)
    return src, [Level(src, t) for t in ifds(src) if 322 in t]
