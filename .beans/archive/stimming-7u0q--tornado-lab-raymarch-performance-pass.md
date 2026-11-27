---
# stimming-7u0q
title: 'Tornado lab: raymarch performance pass'
status: scrapped
type: task
priority: normal
created_at: 2026-11-17T04:53:38Z
updated_at: 2026-11-17T05:19:43Z
parent: stimming-dwwg
---

Tom (2026-11-16) picked option A: keep the approved raymarch look, cut its cost. Target 3x to 5x at the default view. Plan: ~/.claude/plans/tornadyo-alley-refactor-lively-nebula.md

- [x] 0. Bench helper and baseline (F1, F2.5, F4.5)
- [x] 1. Bake the far storm, ground, gloom and rain veil (port of spike-bake)
- [x] 2. Storm shadow once per eight steps (storm light: under 1 ms, left as is)
- [ ] 3. Noise octaves by pixel footprint
- [ ] 4. Half-res volume with temporal upsample
- [x] 5. Footprint-tied steps, empty-air skip, early out at T 0.02
- [ ] 6. Carry to tornado/main.js after Tom signs off

## Baseline (2026-11-16)
`__bench` best of 6, M3 Pro, 1024×768 render (Resolution 0.5), Steps 60, shared GPU: F1 13.2 ms, F2.5 20.5 ms, F4.5 30.6 ms. Single runs swing 2× to 8× while other chats draw: take the best of several.

## Step 1: bake
Port of spike-bake: the far storm, ground, gloom, rain veil, and (outside the funnel's column) the near deck bake into a texture, renewed in 8 strips. `?live` draws them every frame. Best of 6: F1 12.2 ms, F2.5 16.5 ms, F4.5 26.7 ms; live in the same run 15.4, 22.8, 35.2 (20 to 28% less). Baked against live: mean difference 0.6 of 255.

## Cost by part (removed one at a time; base F1 11.1, F2.5 16.7, F4.5 25.7 ms)
| Removed | Saves F1 / F2.5 / F4.5 ms |
|---|---|
| Dust and rain (vol) | 2.8 / 6.7 / 12 |
| Funnel noise (funnelD) | 4 / 7 / 11 |
| Storm shadow (cloudShade) | 2.4 / 5.3 / 7.8 |
| Near deck in the column | 4.7 / 6.2 / 7 |
| Funnel at 2 octaves, not 4 | 2 / 2.5 / 4 |
| stormLit at the top, sunDepth | under 1 each |

## Step 2: storm shadow
A per-pixel distance test saved nothing: a pixel group runs in lockstep. The lookup now runs once per eight steps by step count, which a group shares. Best of 10 interleaved: F1 9.3 vs 8.8, F2.5 12.5 vs 12.7, F4.5 19.5 vs 22.1 ms (noise about ±0.5). Same picture (mean difference 0.6 of 255). GPU timer queries swing as much as wall time on this shared GPU.

## Step 4: interleaved volume (Tom: "Yes, commit it")
Each frame marches 1 pixel of each 2×2 block (4-frame cycle) into a quarter target. A resolve pass keeps the other 3 from history, clamped to the nearest fresh samples, so the spin leaves no ghost. A fresh pixel takes 1 − (1 − blend)⁴. The final pass lays the volume over the baked backdrop. ?full marches every pixel. Paused, against ?full at the same resolution: mean difference 0.6, bias under 0.2 of 255.
The default Resolution goes from 0.5 to 0.7. Best of 12, against the last commit at 0.5: F1 10.9 → 8.1, F2.5 13.6 → 10.4, F4.5 21.4 → 14.4 ms. At 0.5 interleaved: about 5.3 / 6.5 / 8.5 ms. Clip: docs/qa/tornado-perf/interleave-F2.5-sbs.mp4 (left: last commit at 0.5; right: interleaved at 0.7).

## Steps 3 and 5
- `?dbg=6` paints the march's step count. Empty air in the funnel's column took 60 steps per pixel. Now the distance to the funnel, the dust or the rain ring sets the step there; a ray that climbs toward the flare uses the horn's full width.
- Inside the funnel a step is never shorter than a pixel. The march ends at T 0.02 (was 0.01).
- Best of 12 against the last commit: F1 8.6 → 7.6, F2.5 10.0 → 9.9, F4.5 14.9 → 14.3 ms. Same picture: mean difference 0.62 of 255, no bias.
- Not kept: 2 noise octaves in place of 4 saves about 1 ms. Plain noise on faint sheath flanks saved nothing and moved the look.
- What is left at F4.5 (about 15 ms): funnel noise 6, dust 4, lighting 3, near deck 3, everything outside the march 2.8.

## Reasons for Scrapping
Tom (2026-11-16): "you introduced SEVERAL regressions". He picked a full revert. tornado/lab.js and lab.html are back to b69652aa (the approved lab). The lab chat takes performance from there; the notes above list each change, its numbers and its switches. QA clip stays in docs/qa/tornado-perf/.
Lesson: paused stills and pixel diffs at t=40 missed what Tom saw in the live lab. Judge each change live, in motion, at the default view, with Tom, before the next one.
