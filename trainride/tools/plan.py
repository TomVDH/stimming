"""Dev map: a top-down view of the line over the baked ground.
Writes plan-relief.jpg (hillshade, lakes) and plan.json (track, stations, lakes in image pixels).
Run in the bake folder after track.py and build.py: python3 plan.py
"""
import json, math
import numpy as np
from PIL import Image
src = open('build.py').read()
exec(src[:src.index('# Towns: soft splats')])   # dem, lake, wet, merc, X0.. from the bake
tr = json.load(open('dem/track.json'))
pts = np.array(tr['pts'])
px, py = merc(pts[:, 0], pts[:, 1])
x0, x1 = int(px.min()) - 600, int(px.max()) + 600
y0, y1 = int(py.min()) - 600, int(py.max()) + 600
x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, dem.shape[1]), min(y1, dem.shape[0])
d = dem[y0:y1, x0:x1]
# Hillshade from the north-west, then tinted by height; lakes in blue.
gy, gx = np.gradient(d)
mpp = 2 * math.pi * 6378137 * math.cos(math.radians(47.25)) / (2 ** Z * 256)
nx, ny = -gx / mpp, -gy / mpp
nz = np.ones_like(d)
n = np.sqrt(nx * nx + ny * ny + nz * nz)
L = np.array([-0.5, -0.5, 0.7]); L /= np.linalg.norm(L)
hs = np.clip((nx * L[0] + ny * L[1] + nz * L[2]) / n, 0, 1)
t = np.clip((d - 400) / 1800, 0, 1)
base = np.stack([0.42 + 0.35 * t, 0.52 + 0.25 * t, 0.36 + 0.4 * t], -1)
img = base * (0.35 + 0.75 * hs[..., None])
w = wet[y0:y1, x0:x1] > 0
img[w] = [0.22, 0.4, 0.55]
S = 3   # downsample for the page
im = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).resize(((x1 - x0) // S, (y1 - y0) // S), Image.LANCZOS)
im.save('plan-relief.jpg', quality=85)
stn = [[n, (merc(*tr['coords'][n])[0] - x0) / S, (merc(*tr['coords'][n])[1] - y0) / S] for n, _ in tr['stations']]
json.dump({'w': im.width, 'h': im.height, 'track': [[round((a - x0) / S, 1), round((b - y0) / S, 1)] for a, b in zip(px[::3], py[::3])],
           'stations': stn, 'km': round(float(json.load(open('route-meta.json'))['L']) / 1000, 1)}, open('plan.json', 'w'), ensure_ascii=False)
print('plan', im.size, len(stn))
