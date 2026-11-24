---
# stimming-fe73
title: 'Solar loop: every post row works; clean grain'
status: in-progress
type: task
priority: normal
created_at: 2026-11-24T21:56:43Z
updated_at: 2026-11-24T23:33:58Z
parent: stimming-e35i
---

Tom, 2026-11-24: "can we please get proper post fx settings, grain cleaned up and have them all work please -- a tooltip as to what they do would be nice".

- [x] Measure every post row: one frame drawn twice, each row at its top
- [x] Lens dirt was dead: it now catches the star's light
- [x] Weak rows reach further above 1 (bloom, rays, split, shimmer, haze, bend, dirt); 1 and below unchanged
- [x] Grain: soft clumps, 24 frames a second, out of black space, still asleep
- [x] One-line hints on each post row (shown once the shell's hint field lands)
- [ ] Tooltips: the shell's hint field (shared change, its own bean and PR)
- [ ] Tom looks at it live

- [x] Grain keeps 1.4 CSS pixels when the detail ladder drops the resolution mid-zoom (Tom: "the noise doesn't seem to be at uniform scale")

- [x] The heat shimmer's ripples keep one screen size (about 22 CSS px) and fade far out; before, they were tied to the star and aliased to a seethe as the view pulled back (measured: correlation at 1 px went to -0.6 at x32). Grain measured uniform at every zoom (Tom: "the noise effect does not seem uniform")
