# Railgun: far ranges, bake and relight

Bean `stimming-75xm`. Tom, 2026-11-16: "will the mountains benefit from being made into cards or baked landscape vs raymarched? I want elegant and smart performance savings where possible."

## Finding

The eye barely moves. Shake, the push zoom, the pointer look and the sight turn the lens; they do not move the eye far.
From one eye, the far country is a function of view direction only.
So the march runs once into a buffer a little wider than the view. Each frame only lights the buffer.

## How the bake works

| Part | What it does |
|---|---|
| Geometry bake | Marches the window (the view, 15% wider; 30% in the sight) at screen density. Stores range and normal per texel, in half floats. 380 steps on every quality. |
| Light bake | The sun's shadow per texel. Runs when the sun moves a tenth of a degree. |
| Baked pass | Each pixel reads the four nearest texels. Texels on the nearest surface weigh most, so a crest stays crisp on the range behind it. Coverage drives alpha-to-coverage, so the silhouettes are anti-aliased. All light, air, haze, blast and rock light stay live. |
| Double buffer | Near the window's edge, the back buffer fills a sixth a frame, then swaps. Past the edge, it bakes at once. |

Rebakes in use (1280 x 720): none idle, one in an 8 s hold, two to five after a shot, three to six in 5 s of sight while the gun tracks. All but the first are spread over six frames.

## Cost (GPU ms, min of 80 frames, Playwright on this Mac)

Other sessions share the GPU, so the absolute numbers move a lot between runs. The ratio holds in every run.

| Config | Far pass, live | Far pass, bake | Frame, live | Frame, bake | Sight frame, live | Sight frame, bake |
|---|---|---|---|---|---|---|
| Standard 1280 | 14 to 18 | 0.7 to 5.5 | 27 to 38 | 9 to 20 | 134 to 209 | 25 |
| Standard 375 | 10 | 3.6 | 17 to 23 | 7 | 63 to 67 | 14 to 17 |
| High 1280 | 16 | 5.1 to 5.3 | 32 to 43 | 16 | 129 to 137 | 22 to 24 |
| High 375 | 17 to 18 | 6.3 to 6.5 | 23 to 38 | 17 to 29 | 109 to 203 | 25 to 119 |

A full rebake costs 18 to 60 ms; spread over six frames that is 3 to 10 ms a frame. A relight costs 2 to 13 ms.

The live pass also got a true ceiling test: a ray that rises past every crest on the curved ground stops. The old test ignored the curve and marched sky pixels to 650 km.

## Alternatives

| Approach | Cost | Silhouette | Light and air | Verdict |
|---|---|---|---|---|
| Live march (today) | 10 to 18 ms every frame, 100+ in the sight | Aliased, per pixel; pale slivers at some range feet | Full | Too dear |
| Cards (pre-rendered ranges on quads) | Very low | Fixed at bake size; soft when the sight zooms | Light is frozen, or the cards must carry normals and depth: then they are this bake, worse | No |
| Baked heightfield mesh | Vertex and overdraw cost; about 1 M triangles to hold crest detail at 200 km | Triangle edges; detail limited by the mesh | Full, but the curve and erosion move to vertices | No: heavy on phones, and detail is tied to the mesh |
| Bake and relight (this) | 1 to 6 ms a frame | Anti-aliased; same shape as the live march | Full | Recommended |

## Next

1. Done: Tom made Bake the default (2026-11-16).
2. Done: erosion in the height (2026-11-16). See below.

## Erosion

- Gullies cut down each face along the fall line, with spurs between them; a slow warp bends and branches them. The spacing follows the crest height.
- The carve is deepest on the mid slopes. Crags notch the crest line.
- A cavity term (height against its mean in a small ring) darkens the cuts and lights the spurs. It lives in the light buffer, so it costs nothing per frame.
- At 80 to 200 km the air hides most face detail, as real air does; the crests and silhouettes carry the change.
- Cost (1280, GPU ms): a full bake 20 to 39, spread over six frames; a relight 6 to 10; the per-frame pass unchanged at about 4. The live march rises from 32 to 45; it is only the fallback for GPUs with no float targets.
- Dev slider `Erosion`, 0 to 2; 0 is the old smooth shape.

## Forms

Tom, 2026-11-16: yes to more varied forms. A seventh value on a range in `RANGES` picks its form.

| Form | Where | Shape |
|---|---|---|
| Mesa line (1) | The low range in the gap right of the middle | Level tops, a sheer cliff, a talus skirt; gaps break it into buttes; hard beds step the cliff in benches |
| Lone cone (2) | New, 175 km out, over the mesas | Concave flanks, a small crater, lobes on the skirt, gullies running out from the top |
| Knife ridge (3) | The big range right of the middle | Hollow flanks meet in a thin edge; the crest saws in close teeth |

- A form needs sky behind it: a form against a hazy range of the same colour does not read.
- The bake marches with a finer stride (0.05% to 0.3% of the range, 640 steps), so thin teeth do not slip between steps.
- Cost (1280, GPU ms): a full bake 31 to 50, spread over six frames; the per-frame pass unchanged at 3 to 4.
- Dev row `Forms`: Crescents turns every form back into a crescent and hides the cone.
- Open: pale speckles on the crest of the round range right of the cone show with erosion and forms off, in Live too; they look like a cloud card's edge, not the ranges.

## Dev

- Dev row `Far ranges`: Bake or Live. Bake is the default (Tom, 2026-11-16); `?far=live` opens on the live march.
- `__qa.far(mode)` reads the bake counters; `__qa.gpuMs('far' | 'all' | 'bake' | 'light', n)` times them.

## Height grid (empty-space skipping)

The vast ranges (a070f00a: peaks to about 80 km, RANGE_CEIL 95 km) made every ray march far longer.

| Part | What it does |
|---|---|
| Fine grid | 256 x 256 cells of 2.6 km about the landscape eye. Each holds its highest ground from 7 x 7 samples over the cell and half a cell round it, plus 6% and 400 m. |
| Coarse grid | 64 x 64 cells; each holds the highest of its 16 fine cells. |
| Leap | Above a cell's bound, the ray leaps to the cell's wall, or to where it could drop to the bound. The ray's rise over the curved ground only grows, so the leap is safe. |
| Rebuild | Only when the shape uniforms change (ranges, LAND, erosion, forms). |

Cost with the vast table (GPU ms, min, shared GPU):

| | Grid off | Grid on |
|---|---|---|
| Full bake, 1280 | 227 | 113 |
| Full bake, 375 x 812 | 124 | 49 |
| Live march, 1280 | 167 | 74 |
| Live march, 375 x 812 | 87 | 40 |

A soft rebake spreads over 8 frames: about 14 ms a frame at 1280. The stills match with the grid on and off. Dev toggle `Far skip`.
