---
# stimming-w1nd
title: 'Toy: Window seat'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-04T20:00:00Z
updated_at: 2026-11-04T20:00:00Z
---

Window seat (idea 56). Tom, 2026-11-04: S tier, diegetic. Airliner first; an orbit seat may follow. Full window frame (bezel, shade). City lights from the NASA night map.
It is not the three.js route that Night viaduct takes: one raw WebGL2 fragment shader.

Decisions:
- Seat: left window of an airliner at 11 km, sped up about ten times.
- Map: `window/night.jpg`, 4096 x 2048, from the three-globe example (NASA night Earth, public domain). Towns are the red channel; moonlit land is blue.
- The map is about 10 km per pixel, so it sets town density; the shader draws the street lights, town clusters and road ribbons.
- Storm cells are projected towers (column plus anvil to 11.5 to 14 km), lit by the moon, by the towns below and by internal flashes.

- [x] Frame: wall, bezel, shade with lip, inner pane with frost and breather hole, head parallax
- [x] Outside: sky and stars, moonlit land, town lights, cloud deck lit from below, towers, flashes
- [x] Bar: Low Countries, Nile, Seaboard; Storm; Shade; Settings (cloud, moon)
- [x] Drag drifts along; drag the shade lip; tap a tower to flash it
- [x] toys.json entry (Dutch name and IPA are drafts)
- [ ] Checkpoint 1: Tom reviews the stills
- [ ] Sound: cabin drone, far thunder after each flash, shade slide
- [ ] Menu Lab entry with an icon and a GSAP hook
- [ ] Remove the `window.__ws` test hook
- [ ] QA: 1280 and 375 px, clean console, reduced motion, hidden tab stops the loop
- [ ] Record the session cost
