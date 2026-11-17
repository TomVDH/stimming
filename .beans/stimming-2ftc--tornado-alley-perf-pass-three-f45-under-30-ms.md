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
