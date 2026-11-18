---
# stimming-2ftc
title: 'Tornado alley: perf pass, three F4.5 under 30 ms'
status: in-progress
type: task
priority: high
created_at: 2026-11-17T16:10:23Z
updated_at: 2026-11-17T21:18:17Z
parent: stimming-dwwg
---

Three F4.5 at default settings take 33 to 36 ms a frame. The target is 30 ms or less.

Cost sources: the 3D farm, infrastructure, the damage field, and the larger funnels at 35 mm.
Rules: one perf change at a time. Do not change the look. Measure back to back on one clean origin. Wet glass off.
Tom judges each change live, in motion (stills missed regressions before).

- [x] Profile the scene and storm passes at 1828 x 984 with three F4.5
- [ ] One change at a time; record ms before and after in this bean
- [ ] Minimum frame at 30 ms or less; console clean
- [ ] Tom checks it live

Also closes the 30 fps item on stimming-ga26.

## Profile (2026-11-17, destruction session)

Three F4.5, ?qa&tor=F4.5,F4.5,F4.5&glass=0&age=20, 1.8 MP. Fault: at age 20 no funnel is down yet (touchdown takes about 38 s); this table shows the deck alone. Use age=50, gpuTime(40), pane hidden, OneDrive busy on the CPU. Medians are steady; minimums swing 37 to 42 ms.

| Run | Frame median | Frame min |
|---|---|---|
| As main | 46.9 to 47.7 ms | 39.7 to 42.4 ms |
| Farm off | 46.5 to 47.7 ms | 39.3 to 41.9 ms |
| Farm, infra, debris off | 47.1 to 47.3 ms | 37.0 to 39.0 ms |
| Storm pass alone | 36.2 ms | 31.6 ms |

- The scene objects (farm, infra, debris) cost below the noise: about 0 ms by median.
- The storm pass (funnel.js) is about 75 % of the frame. The 30 ms target needs work there.
- Tried: the farm's sunCover() moved into the mill's own box. No measured gain; reverted.

## Light reuse at seven tenths of cover (2026-11-17, change 1)

?age=50 (all three funnels down). The machine was shared with other sessions' headless browsers: one build timed 45 to 140 ms. So two measures that load cannot move:

- Noise reads per pixel (deckN, tagged in a shader copy): 44.6 before, 38.4 after (light 13.4 to 11.0, shape 31.2 to 27.4). 14 % fewer.
- Timing, the old and new programs swapped in one page, frame by frame: old/new 1.032; the same program against itself 0.966. So about 3 %, at the noise floor.
- Picture: stills match by eye (docs/qa/tornado-perf/perf1-before.jpg, perf1-after.jpg).

Tried, no gain: deckN's low terms gated by height (exact, ratio 1.011). Too visible: probes on the still deck only (12 % of pixels move 5 %+), no underside probe (51 %).
Reads are not the main cost: 14 % fewer reads saved about 3 %. The next step needs a split of the funnel shells, the deck march and the bake.

## Cost split (2026-11-17, three F4.5 pinned at age 50)

Method: the storm program's source is read from the page; a copy with one part removed is compiled beside it and timed against it frame by frame (gpuTime, 6 pairs of 8 frames). The tornadoes' life is set endless and the clock is held, so all three stay down. Load from other sessions moves single pairs; the medians below have tight pairs.

| Part removed | Frame ratio | Share of frame |
|---|---|---|
| Storm pass, all | 0.335 | about 66 % |
| Deck march (live and bake) | 0.49 | about 51 % |
| Deck light probes (stormLit) | 0.81 | about 19 % |
| Far-field bake strip (one per frame) | 0.825 | about 17 % |
| Funnel shells | 0.857 | about 14 % |
| Rain, sun shafts, dust | inside the noise | small |

The scene pass (wheat, road, line, plain, objects) is the other third: not split yet.

Deck reads, per pixel over the whole frame: 31. Before the ray meets cloud: 13 reads in 10.8 steps. In the cloud: 18, of which about 11 are light probes. The rays under the base step 0.75 x their distance to the cloud; a ray at a few degrees runs nearly parallel to the base, so it takes many short steps. The lowest 6 % of sky over the horizon meets no cloud before the bake, yet takes about 30 steps.

Levers, biggest first (each one change, judged live):

1. The approach under the base: a step bound from the gap to the lowest cloud (base, pits, hanging lumps), so grazing rays jump. Needs a safe floor height.
2. The bake strip: renew it less often. The far breaks would drift more slowly.
3. The light probes: change 1 (light reuse at seven tenths) took 14 % of reads. More needs a cheaper probe.
4. The scene pass: split it the same way.
5. The funnel shells.

## Lever 1 tried: grazing rays jump to a cloud floor (2026-11-17, not kept)

A rising sky ray starts its deck samples where it reaches a floor height; no cloud hangs below it.

- The cloud's real floor, probed on a 60 x 60 km grid (full noise, distance under 0.3 km): 0.12 km above the ground near the tornadoes and the tower. Elsewhere the noise hangs up to 0.9 km under the base (0.45 km at the default base).
- So a safe floor is base - 1.0 km, with discs round each tornado (pit radius x 1.33 + 1.5 km, about 4 km) and the tower (7 + 3 km) where the floor is the ground.
- The rays that cost the most look into the storm: their ground tracks cross a disc early. Safe jump: reads 34.7 to 34.6, steps 15.4 to 13.6. No gain.
- Unsafe upper bound (floor base - 0.65 km, no discs): reads -16 %, frame about -16 %. It would cut through real low cloud by the funnels.

The approach cost comes from deckD()'s far shortcut: under the base it returns distance - 1.1 km, so a ray 1.3 km under the base steps only about 0.2 km x 750. A tighter bound for the noise's reach would lengthen those steps; it changes nothing the eye sees if the bound holds.

## Bake candidates (2026-11-17, models session)

Tom: "lets see what else we can potentially bake to up performance". Scene-pass split, one part removed per copy, each copy alone in the browser and paired with the base (three F4.5, funnels down, glass off). The machine was shared, so the base swung 99 to 132 ms; only the pair ratios count.

| Part removed | Ratios (2 pairs) | Reading |
|---|---|---|
| sunCover() (returns a constant) | 0.927, 0.967 | about 3 to 7 % |
| Ground (wheat, road) | 0.894, 1.043 | inside the noise |
| All objects (farm, line, plain, vehicles, infra, debris) | 0.927, 1.011 | inside the noise |
| plain() | 0.983, 1.000 | about 0 |

Candidates, biggest first:

1. A cloud floor map: the deck's true lowest cloud height over x, z, baked from the full noise and renewed a few rows a frame. Grazing rays jump to it safely. Lever 1's unsafe bound gave about 16 %; a true floor keeps most of that with no cut through low cloud.
2. A deck light volume: stormLit()'s probes baked into a 3D texture, renewed in slices over about 1 s; the march reads one texel. Probes are about 19 % of the frame.
3. The bake strip less often: one strip every 2 to 4 frames, not every frame (about 17 % now). The far breaks drift more slowly.
4. A sun cover map: sunCover() depends only on where the sun's ray meets the deck, so a 2D map at deck height is exact. 28 call sites (every ground pixel, every vehicle sample, trees, fence, farm) become one texture read: about 3 to 7 %.
5. The far plain into the far-field bake: about 0 %; not worth it.

## Tom, 2026-11-17

Performance is awful and needs work. Priority stays high. The storm pass (funnel.js) is the first target. A 500 m near limit (stimming-grp4) puts larger funnels on screen; measure with one funnel at 500 m too.
