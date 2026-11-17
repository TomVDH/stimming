---
# stimming-7u0q
title: 'Tornado lab: raymarch performance pass'
status: in-progress
type: task
priority: normal
created_at: 2026-11-17T04:53:38Z
updated_at: 2026-11-17T05:01:45Z
parent: stimming-dwwg
---

Tom (2026-11-16) picked option A: keep the approved raymarch look, cut its cost. Target 3x to 5x at the default view. Plan: ~/.claude/plans/tornadyo-alley-refactor-lively-nebula.md

- [x] 0. Bench helper and baseline (F1, F2.5, F4.5)
- [x] 1. Bake the far storm, ground, gloom and rain veil (port of spike-bake)
- [x] 2. Storm shadow once per eight steps (storm light: under 1 ms, left as is)
- [ ] 3. Noise octaves by pixel footprint
- [ ] 4. Half-res volume with temporal upsample
- [ ] 5. Footprint-tied steps and early outs
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
