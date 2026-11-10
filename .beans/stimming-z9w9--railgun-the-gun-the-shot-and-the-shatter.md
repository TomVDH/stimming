---
# stimming-z9w9
title: 'Railgun: the gun, the shot and the shatter'
status: in-progress
type: task
priority: normal
created_at: 2026-11-10T09:08:22Z
updated_at: 2026-11-10T11:08:20Z
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
- [x] The explosion: fireball, shells, shards, embers, hitFlash (VOLFX fireball to 6R, Wilson and shock shells, 1.5x shards with smoke, uBlast)
- [x] The hold: build to 10 s, ready, over-hold, vent at 24 s
- [x] The chorus: an original choir swell that locks into one chord at full charge (Tom to listen)
- [x] QA in the browser pane: clean console, 30 fps through charge and shot (synchronous frame time, p90 under 24 ms at 1280x800, 375x812, 812x375 and rung 3; 46 probe checks pass; reduced motion checked in code)
- [ ] Tom signs off on the stills
- [x] PR to main (TomVDH/stimming#37)
- [ ] Follow-up: orchestral choir rebuild (sections, strings, brass at the apex, hall; foul within 3 s of the over-hold)
- [x] The breech ejects a spent brass case (PBR) before the gun parks; a clank, a thump and a dust burst in the foreground
- [x] Sight mode rides the gun's rangefinder; the lens zooms with the bolt; an old thermal tube with bezel and ladder
- [ ] Follow-up: PBR gun and Pixar-like dunes with fresnel (Tom, 03:26)
- [ ] Decision for Tom: ship railgun/shot.mp3 (game-audio render; push blocked, kept local)

## 04:20 pass (Tom)
- [x] Gun dust, shot dust and case dust are raymarched volumes lit like the comet trail; the sprite puffs are gone
- [x] Debris trails bend along each shard's arc (four train segments per shard)
- [x] The barrel slams back 60 m; the cradle and housing ride back a third
- [x] Reset no longer runs on its own: the chip shows and glows right of Sight after a kill
- [x] The soot cloud lingers to about 40 s; the blast shoves the trail's head aside
- [x] Heaps drift, thin away and form again on their own clocks
