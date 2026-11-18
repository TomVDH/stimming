---
# stimming-2b59
title: 'East Van Alley: darker wood, shoes jitter, longer laces, true dangle'
status: completed
type: bug
priority: normal
created_at: 2026-11-18T02:03:44Z
updated_at: 2026-11-18T03:00:35Z
parent: stimming-guw5
---

Tom (2026-11-17): darken wood -- also the shoes jitter and glitch -- strings can stand to be longer -- the shoes dont perfectly dangle.

- [x] Darken the wood (pole, crossarms): albedo x 0.45, weathered grey darker
- [x] Find the cause of the shoe jitter and glitch; fix the cause
- [x] Longer laces: 0.36 and 0.55 m to 0.58 and 0.86 m
- [x] Shoes hang straight down from the lace and swing as a pendulum, settle at rest
- [x] Tom (19:11): the insulator cylinder clips the wire and does not ride or hang from it
- [x] Tom: cables look weird (lashed cables follow their strands; Tom: all good)
- [x] Tom: thicker cables sag more (less taut): telecom 0.9 to 1.35 and 0.95 to 1.15, secondaries 0.7 to 0.95, drops 0.4/0.5 to 0.6/0.7
- [x] Tom (19:12): roughness and displacement texture on the wood
- [x] Tom (19:13): lines clip through the transformer: LV leads drop clear first; fuse leads sag 0.05
- [x] Tom: darken and slightly silhouette the far pole
- [x] Tom: PBR shading on the wires: strand helix glints, dusty rubber jackets
- [x] Tom (19:15): the shoes collide and bump off each other a little
- [x] Tom (19:16): one transformer on the far pole
- [x] Tom: a control for the sun direction (Dev: Sun bearing)
- [x] Tom: volumetric shadows: estimate given (A, B, C); the work moves to stimming-tnjr
- [x] Tom: FPS oscillates: cause explained; the work moves to stimming-tnjr
- [x] Tom (19:16, picture): white blob on the splice case. Cause: wire-kind bands draw as screen capsules whose caps reach out by the radius; bands removed
- [x] Tom (19:19): bake for perf: moves to stimming-tnjr
- [x] Tom: a shadow darkness setting (Dev: Shadow darkness)
- [x] Tom: post settings in Dev (Post group: tone map, film look, contrast, exposure, grain, vignette)
- [x] Tom (19:23): the Car button does not quite work: night only (Tom's pick), starts 16 m back
- [x] Tom: ideas for micro-interactions and atmosphere (listed in chat)
- [x] Tom (19:26): a timelapse on the shared clock (dayClock), sun and moon turning: hold Now (Tom's pick), 2 h/s, one-pass bake while the hour moves
- [x] Tom (19:28): plucking the shoes' wire moves the shoes (the knot rides the pluck)
- [x] Tom (19:28): wood roughness too sharp; softened
- [x] Tom (19:27): bake the clouds: moves to stimming-tnjr
- [x] Tom (19:30): car speed varies; red tail beam behind; routes up the lane or under the shoe wire, either way, at random
- [x] Tom (19:32): AgX, filmic contrast, Portra 400 look
- [x] Tom (19:38): sky too colourful; physical Rayleigh and Mie sky, palette only as twilight glow
- [x] Tom (19:40): photoreal night (moonlit air, city glow, dim clouds) and smooth dusk and dawn blends
- [x] Tom (19:40): the first car comes 1.5 to 6 s after dark
- [x] Tom (19:45): thicker splice case (65 mm)
- [x] Tom (19:46): cars roll through the alley at 2.5 to 5.5 m/s
- [x] Tom (19:50): the case as a neat cylinder: a traced ROUND part that sways with its span
- [x] Tom sees it; commit (Tom, 19:53: all is good)

## Cause

The shoe shader picked its frame up vector from a branch on |axis.y| > 0.9. The lower shoe hangs at 0.854 and swings across 0.9 about every 2 s, so its roll snapped in one frame. The vertex shader now turns the shoe's own up vector with it.

The pose was a hand-set tilt plus sine sums. The mass centre did not sit under the knot, so the shoe never hung plumb. Now each shoe is a pendulum on the CPU: gravity, drag, gusts, the wire's ride at the knot, explicit velocity at 120 Hz substeps. The toe pitch puts the mass centre (0.131, 0.047 m, from the SDF) under the top eyelet.

The splice case clipped its cable: the lashed cable was its own span, with its own wind phase and swing (0.34 against the strand's 1.1). A lashed cable now takes its strand's phase and swing. The case bands now touch the strand.

## Summary of Changes

East Van Alley (`wires/main.js`), pushed in 03932273, 73482b5d, f96f8dc3 and d210951e:
- Darker wood with grain, checks and soft roughness; a dark far pole with one can.
- Shoes: CPU pendulums on longer laces, mass centre under the knot, capsule collision, the pluck moves them; the roll flip is gone.
- Cables: lashed cables follow their strands; leads clear the cans; thicker cables sag more; the splice case is a traced cylinder that sways.
- Car: night only, random routes (lane or under the shoe wire), alley speeds, red rear beam, the first one soon after dark.
- Hold Now for a timelapse on the shared clock; Dev rows for sun bearing, shadow darkness and post (AgX, Portra 400 look).
- Sky: physical Rayleigh and Mie with ozone and Earth's shadow; moonlit night with city glow; the palette only as a twilight glow.

- [x] Tom (19:54): the shoes hang askew, one high and one low: laces 0.54 and 0.84 m
