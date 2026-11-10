# Writes the corridor polygon: the line, then 4.5 km out on the lake side.
exec(open('build.py').read().split('# Each station sits')[0].replace("Image.fromarray(img).save('route.png', optimize=True)", ""))
np.savez('dem/grid.npz', pe=pe.astype(np.float64), pn=pn.astype(np.float64), tj=tj, ss=ss)
jo = int(np.argmin(np.abs(tj - 4500))); ji = int(np.argmin(np.abs(tj - 15)))
step = 48
ring = [(lat[i, ji], lon[i, ji]) for i in range(0, NS, step)] + [(lat[i, jo], lon[i, jo]) for i in range(NS - 1, -1, -step)]
open('dem/corridor.txt', 'w').write(' '.join(f'{a:.5f} {b:.5f}' for a, b in ring))
print(len(ring), 'points')
