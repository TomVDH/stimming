"""Flatten the lakes in route.png to their surface.

The elevation tiles carry lake beds (down to -170 m), not the water surface.
The line runs a few metres above both lakes, so every lake cell becomes one level.
Any cell deeper than the lakes is lake bed too; it comes up to the shore level.
Run from trainride/: python3 tools/lakes.py
"""
import sys
sys.argv = ['lakes', 'Murg', '0']
src = open('tools/cut.py').read().split('name, tail = sys.argv[1]')[0]
exec(src)

LEVEL = -12.0   # metres below the eye
w, h, bpp, rows = read_png('route.png')
q = lambda r, i: (r[i * bpp] * 256 + r[i * bpp + 1]) / 10 - 500
wet = [[rows[j][i * bpp + 2] == 255 for i in range(w)] for j in range(h)]
out = []
for j in range(h):
    line = bytearray(w * 3)
    for i in range(w):
        r = rows[j]
        v = q(r, i)
        if wet[j][i]:
            v = LEVEL
        elif v < LEVEL:
            # Nothing near the line lies below the lakes; deeper cells are lake bed.
            v = LEVEL + 0.5
        z = max(0, min(65535, round((v + 500) * 10)))
        line[i * 3:i * 3 + 3] = bytes((z >> 8, z & 255, r[i * bpp + 2]))
    out.append(line)
write_png('route.png', w, h, out)
print('lakes flattened to', LEVEL)
