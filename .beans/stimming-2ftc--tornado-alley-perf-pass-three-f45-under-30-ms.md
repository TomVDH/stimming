---
# stimming-2ftc
title: 'Tornado alley: perf pass, three F4.5 under 30 ms'
status: todo
type: task
priority: high
created_at: 2026-11-17T16:10:23Z
updated_at: 2026-11-17T17:23:08Z
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

Three F4.5, ?qa&tor=F4.5,F4.5,F4.5&glass=0&age=20, 1.8 MP, gpuTime(40), pane hidden, OneDrive busy on the CPU. Medians are steady; minimums swing 37 to 42 ms.

| Run | Frame median | Frame min |
|---|---|---|
| As main | 46.9 to 47.7 ms | 39.7 to 42.4 ms |
| Farm off | 46.5 to 47.7 ms | 39.3 to 41.9 ms |
| Farm, infra, debris off | 47.1 to 47.3 ms | 37.0 to 39.0 ms |
| Storm pass alone | 36.2 ms | 31.6 ms |

- The scene objects (farm, infra, debris) cost below the noise: about 0 ms by median.
- The storm pass (funnel.js) is about 75 % of the frame. The 30 ms target needs work there.
- Tried: the farm's sunCover() moved into the mill's own box. No measured gain; reverted.
