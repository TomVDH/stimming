---
# stimming-az9d
title: 'Tornado lab: cheaper ways to draw the funnel'
status: in-progress
type: spike
priority: normal
created_at: 2026-11-17T03:23:51Z
updated_at: 2026-11-17T04:36:57Z
parent: stimming-dwwg
---

Tom (2026-11-16): the lab is a heavy shader and the Claude app stalls while it runs. Spike three ways round it; the current shader is far from perfect, so a spike may change the look.

- [x] 2. Bake the storm backdrop: sky, far storm, ground, gloom and rain into a texture, renewed in strips; the frame marches only the funnel and the near deck. (tornado/spike-bake.*)
- [ ] 1. Shells: the core and the sheaths as rasterised or analytic layers with 2D noise, no march through the funnel. (tornado/spike-shells.*)
- [x] 5. Flipbook: seamless loops baked offline at full quality, one per F step, crossfaded by the F slider. (tornado/spike-flipbook.*)
- [x] Measure each against the lab at the same size; show Tom.

## Spike 2 notes
- The bake keeps the whole picture where a ray misses the funnel's column (backdrop and near deck), and only the backdrop inside it. It renews in 8 strips, one a frame, each strip blended with the last bake. A knob change bakes it all at once.
- Gain, M3 Pro, 800×1000 render, other GPU work running: F1 none, F2.5 about 40%, F4.5 about 30%. The column covers most of the frame at high F, so the funnel march stays the main cost.
- The near deck (region C) costs about as much as the funnel: `?dbg=4` drops it.

## Spike 5 notes
- Six loops, F0 to F5, 1280×720, 5 s, 24 fps, about 690 KB each (tornado/flip/). Baked at Resolution 1, Steps 160, 6 sub-frames each; about 3.5 min of GPU in all.
- The bake holds the camera still for every F and lifts the horizon to 0.43, so the deck and ground match between loops.
- No seam at the loop point. Live cost: two videos, no shader.
- The F crossfade reads as a dissolve: from F1 to F2 two funnels show side by side, since the lean changes. Finer steps (0.5 or 0.25 F) or a held axis in the bake would help.

## Spike 1 notes
- One coarse march (about 0.3 R a segment) through the onion; each sheath's profile is integrated in closed form (erf), noise is read once per crossing, sun shadow is circle chords. Dust takes about 8 segments.
- GPU time at 762×984: F1 16 to 9.6 ms, F2.5 26 to 15 ms, F4.5 43 to 20 ms (1.6× to 2.1×). The funnel alone is about 5× cheaper.
- The far storm's 120-step march (about 7 ms) and the near deck (about 3 ms) now cost the most: spike 2's bake removes most of that.
- Worse than the lab: grainy dust at F4.5, a hard CG edge on the shaded side, a smeared body. `?skip=n` turns parts off for profiling.

## Next
Join spikes 1 and 2: shells for the funnel, the bake for the far storm and the near deck. Keep 5 as a phone fallback.

## Shells, round 2 (Tom: hard cut-offs, a shroud, a flat-turning deck)
- The core's soft edge widens with Turbulence (0.1 + 0.3 × amp): one noise read per crossing gave one clean outline.
- The deck's shadow fades out between 12 and 20 km of sun path; a hard cut drew a level line across the funnel.
- The near deck fades in over 250 m above its region's flat floor; the floor cut the horn flat.
- The near deck no longer turns rigidly with the outer sheath: past half a turn that blend pulled a ring of horn onto the axis, a shroud once a turn.
- The deck swirls: angular speed falls with distance from the wall cloud, with inflow and lift by the funnel; two noise layers take turns every 20 s so it never winds into streaks. Spin sets its speed.
