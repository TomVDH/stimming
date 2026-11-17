---
# stimming-7u0q
title: 'Tornado lab: raymarch performance pass'
status: in-progress
type: task
priority: normal
created_at: 2026-11-17T04:53:38Z
updated_at: 2026-11-17T04:56:24Z
parent: stimming-dwwg
---

Tom (2026-11-16) picked option A: keep the approved raymarch look, cut its cost. Target 3x to 5x at the default view. Plan: ~/.claude/plans/tornadyo-alley-refactor-lively-nebula.md

- [x] 0. Bench helper and baseline (F1, F2.5, F4.5)
- [ ] 1. Bake the far storm, ground, gloom and rain veil (port of spike-bake)
- [ ] 2. Storm light and cloud shade once per ray, not per step
- [ ] 3. Noise octaves by pixel footprint
- [ ] 4. Half-res volume with temporal upsample
- [ ] 5. Footprint-tied steps and early outs
- [ ] 6. Carry to tornado/main.js after Tom signs off

## Baseline (2026-11-16)
`__bench` best of 6, M3 Pro, 1024×768 render (Resolution 0.5), Steps 60, shared GPU: F1 13.2 ms, F2.5 20.5 ms, F4.5 30.6 ms. Single runs swing 2× to 8× while other chats draw: take the best of several.
