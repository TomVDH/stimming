---
# stimming-z9w9
title: 'Railgun: the gun, the shot and the shatter'
status: in-progress
type: task
priority: normal
created_at: 2026-11-10T09:08:22Z
updated_at: 2026-11-10T10:09:42Z
parent: stimming-f793
---

Take Railgun further in five areas (Tom): the gun, the muzzle effects, the projectile, the incoming threats, the explosion on destruction. A task, not a feature: beans allows no feature under a feature. Branch: claude/railgun-shot-99c65f, PR to main.
The smoke tail is approved ("sublime"): keep its look; any change shows Tom a before/after still first.
Out of scope: sky, cirrus, clouds, sun, time of day (another session on main). Keep hitFlash, hitGlow and uAst.w with the same names and meaning.

## Checklist

- [x] Brainstorm with Tom; stills of the current state (design: docs/plans/railgun.md, Task 10)
- [x] The gun: model, tracking, recoil (brake, cables, spring slew, cradle kick, heat glow, steam)
- [x] Muzzle effects: flash, flares, blast, shock rings, dust front (VOLFX plume, side jets, spike, shell, rolling dust)
- [x] The projectile: the bolt (longer head, ion line that cools to a 25 s contrail)
- [x] The incoming threats: the rock and its approach (a shape per size, ablation sparks, two to four fragments that the shock breaks)
- [ ] The explosion: fireball, shells, shards, embers, hitFlash
- [x] The hold: build to 10 s, ready, over-hold, vent at 24 s
- [x] The chorus: an original choir swell that locks into one chord at full charge (Tom to listen)
- [ ] QA in the browser pane: clean console, 30 fps through charge and shot
- [ ] Tom signs off on the stills
- [ ] PR to main
