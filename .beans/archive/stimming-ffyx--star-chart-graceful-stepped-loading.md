---
# stimming-ffyx
title: 'Star Chart: graceful stepped loading'
status: completed
type: task
priority: normal
created_at: 2026-11-25T17:30:19Z
updated_at: 2026-11-25T17:41:10Z
---

Tom, 2026-11-25: fully graceful loading for slow machines, after Railgun's playbook. Plan: ~/.claude/plans/does-the-star-chart-greedy-clock-of-13809a3f-957e-4e2d-9c56-758585c42e5f.md

- [x] 1. Load line (buildSteps) and a 15 s intro hold
- [x] 2. The article text loads later
- [x] 3. A quiet glide in: warm the other stars after it settles
- [x] 4. Remember the rung per device
- [x] 5. Guess the rung from the first frame
- [x] 6. A third rung: fewer march steps
- [x] 7. QA hooks: ?rung=N, __solar.rung, __solar.load
- [x] Docs: starchart.md, code.md slow-frame line
- [x] Verify in the browser

## Summary of Changes

- Load line: `buildSteps(6)` under the intro (programs, haze bake, hole bake, quasar bakes, first star's pass, first frame); each bake waits on a GPU fence; the intro holds up to 15 s.
- Found and fixed: the first star's disk pass was not awaited, so a slow compile could lift the intro on black. It now links before the first frame.
- `articles.js` (136 KB) loads in idle time after the first frame; an early `i i` waits for it.
- The other stars' passes warm from the end of the glide, only while the star is still; none ahead of time without parallel compile.
- Rung memory per device, a first-frame guess, recovery for the next visit, `?rung=N` pin, QA getters.
- Rung 3: haze and light-ray marches at 0.56 of their steps (uniforms, no recompile); a still dither on the baked haze.
- Found and fixed: drift frames (30 fps by design) and a Dev frame cap fed the ladder, so any idle page stepped down. Only back-to-back lively, uncapped frames count now.

Verified in the browser pane (hidden, about 15 fps): load marks, article, pin, memory, forced-slow ladder 1 to 3, idle drift holds rung 0, rung 3 renders. Not verified: cold-load timings on real hardware (pane hidden) and the 20 s recovery (the pane never reached fast frames).
