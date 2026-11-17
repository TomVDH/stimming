---
# stimming-2ftc
title: 'Tornado alley: perf pass, three F4.5 under 30 ms'
status: in-progress
type: task
priority: high
created_at: 2026-11-17T16:10:23Z
updated_at: 2026-11-17T18:28:38Z
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
