---
# stimming-bykd
title: 'Tornado alley: build in steps so the intro plays on open'
status: in-progress
type: task
priority: normal
created_at: 2026-11-18T03:59:09Z
updated_at: 2026-11-18T04:15:52Z
parent: stimming-dwwg
blocked_by:
    - stimming-vebz
---

The page freezes on open from GitHub Pages. One long main-thread task (scene compile, noise volume, whole first bake) starves the intro.

- [x] Measure today's block (build to first-frame, longest task)
- [x] Await the async environment
- [x] Noise volume after idle
- [x] First bake: one draw, not whole bake plus four still draws
- [x] Load line steps through buildSteps
- [ ] Verify: intro animates, look unchanged at three sizes, reduced motion, fail path, hidden tab

## Notes
2026-11-17 measurements: scene fragment shader is 227 KB of GLSL. Cold build to first-frame: 160 to 740 ms, one long task of about 200 ms. No stall at 1512x945, 1920x1080 or 2560x1440 at DPR 2 headless. Tom: whole browser dies right on open, in every browser. Next: bisect with URL params on Tom's machine.

## Result
Cold load on localhost, headless Chrome: worst main-thread task 257 ms before, 54 to 67 ms after. Intro goes live at about 115 ms, was 324 ms. Not yet proven on Tom's machine: the crash never reproduced here.
