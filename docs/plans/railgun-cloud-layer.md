# Railgun: one raymarched cloud layer

Status: active · Bean: `stimming-fx4g`

Bean: `stimming-fx4g`. Tom, 2026-11-16: the clouds must show in true proportion and perspective, as the rock's trail does. Card clouds cannot do that.

## The cloud layers today

| Layer | Height | Distance | Drawn as | State |
|---|---|---|---|---|
| Cirrus | 9 km | the whole sky | `wisps()` in the sky dome; a dome map, not a plane | On, always |
| Cloud deck | 5.2 km | the whole sky | `deck()` in the sky dome; a true plane | Off (Dev slider Cloud deck at 0) |
| Heaps | bases 2.0 to 4.2 km | 11 to 27 km | 13 cards (`HEAPS`), a ring 9 degrees up | On |
| Middle heaps | bases 4.5 to 5.8 km | 23 to 34 km | 8 cards (`MIDS`) | On while the deck is off |
| Storm towers | tops 10 to 15 km | 85 to 135 km | 3 cards; raymarched with Storm volumes on | On |
| Supercell | top 18 km | 200 km | 1 card; raymarched with Storm volumes on | On |

Not clouds, but they read as cloud: the rock's trail (raymarched), the soot ball (raymarched, low resolution), the dust domes, the muzzle smoke.

## Why cards fail

- A card turns to face the eye. The eye never sees its underside or its side.
- A card's base is a flat cut.
- A size or a fade by range draws a ring. A ring at one height shows as an arc.
- Many cards overlap near the horizon. 240 cards cost about 250 ms a frame (tried 2026-11-16, taken out).

## The new layer

One raymarched pass replaces the heaps and the middle heaps. The ray finds the cloud itself, so perspective and size are true by construction.

| Part | How |
|---|---|
| Shape | Two shells on the planet's curve: low 1.5 to 2.6 km (heaps), middle 4.5 to 5.5 km (flatter heaps). |
| Cover | A 2D cover map from the baked Perlin-Worley noise (`uVol`, `VOL_NOISE`), at a scale of kilometres. |
| Form | The 3D noise cuts the cover into billows; a height curve gives flat bases and round tops; fine Worley erodes the edges. |
| Drift | The cover map slides with one wind per shell: low 10 m/s, middle 16 m/s. Nothing wraps; the map is endless. |
| Light | The storm volumes' model: two or three sun taps, Beer plus powder, a two-lobe phase. Cores go dark, thin edges take a bright rim, a backlit edge takes a silver lining. |
| Other light | The blast, the bolt and the rock land after the air, as `stormExtra()` does. |
| Air | `aerial()` on the first hit, as every other cloud. |
| Reach | The march stops at about 45 km (low) and 70 km (middle); the haze takes the far end. |
| Cost | Half resolution in the `lowRes()` group, which already reads the gun's depth. 24 to 40 steps, long steps through empty cover, a stop at full cover. Target: 3 ms or less at 1280 on Standard. |
| Order | It draws in the heaps' band, after the rock: the layer lies far below the rock's track. |
| Fallback | Dev row Cloud layer: Volume or Cards. Cards stay until Tom approves the volume. |

## Steps (one look from Tom between each)

1. Low shell only: shape, cover and sun light, behind the Dev row (off by default). Stills at Time 0.72 and 0.33, wide and phone; `__qa.gpuMs('all')` with the row on and off.
2. Rim light and dark cores: tune powder, the phase and the sun taps (Tom, 21:44).
3. Drift.
4. Middle shell.
5. Blast, bolt and rock light.
6. Tom approves: the volume becomes the default, the heap and middle cards go.

After this: the storm redo (where they stand, shapes, light), then the god rays. The god rays then take their shade from the layer's own cover map, not from card spheres.

## Risks

- Half resolution can fringe against the gun. The `lowRes()` group's depth read handles the soot ball today; check it on the layer.
- The far end must not sit in front of the ranges: the reach stops short of the foothills (about 50 km).
- Frame time: measure in a tab of its own. Tom's tab skews every reading.
