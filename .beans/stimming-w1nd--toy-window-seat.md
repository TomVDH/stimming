---
# stimming-w1nd
title: 'Toy: Window seat'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-04T20:00:00Z
updated_at: 2026-11-04T21:30:00Z
---

Window seat (idea 56). Tom, 2026-11-04: S tier, diegetic. Airliner first; an orbit seat may follow. Full window frame (bezel, shade).
Round 2 (Tom): checkpoint 1 "looks kind of bad". He wants a slanted angle, the wing in view, better colours, and procedural towns (no map).
It is not the three.js route that Night viaduct takes: one raw WebGL2 fragment shader.

Decisions:
- Seat: left window of an airliner at 11 km, sped up about ten times.
- Round 1 used the NASA night map; round 2 drops it. Towns are procedural: one site per 16 km cell, lamp blocks, highways, rural lamps, field patchwork.
- Hour chips replace the route chips: Dusk, Midnight, Dawn, each an OKLCH sky palette (zenith, band, horizon, ambient).
- The plane banks 7 to 13 degrees; the outside view rolls -13 degrees, so the horizon slants.
- The wing and winglet are two ray-traced quads in aircraft space: grey paint mirroring the sky, a red nav light and a white strobe.
- Storm cells are projected towers (column plus anvil to 11.5 to 14 km); they tilt with the roll.

- [x] Frame: wall, bezel, shade with lip, inner pane with frost and breather hole, head parallax
- [x] Outside: sky palettes, procedural towns, cloud deck lit from below, towers, flashes
- [x] Wing: quads with sky reflection, nav light, strobe; banked and rolled view
- [x] Bar: Dusk, Midnight, Dawn; Storm; Shade; Settings (cloud, towns)
- [x] Drag drifts along; drag the shade lip; tap a tower to flash it
- [x] toys.json entry (Dutch name and IPA are drafts)
- [x] Checkpoint 1: Tom reviewed; asked for wing, slant, colour, procedural
- [ ] Checkpoint 2: Tom reviews the procedural round
- [ ] Sound: cabin drone, far thunder after each flash, shade slide
- [ ] Menu Lab entry with an icon and a GSAP hook
- [ ] Remove the `window.__ws` test hook
- [ ] QA: 1280 and 375 px, clean console, reduced motion, hidden tab stops the loop
- [ ] Record the session cost
