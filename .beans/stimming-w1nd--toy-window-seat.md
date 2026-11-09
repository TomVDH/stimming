---
# stimming-w1nd
title: 'Toy: Window seat'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-04T20:00:00Z
updated_at: 2026-11-09T07:40:42Z
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
- Round 3: the window is real geometry. The camera sits 33 cm from the wall, aft and above, rolled -9 degrees. A march finds the recess wall between rim and pane; the shade slides in a slot. The pointer moves the eye.
- The seat sits over the wing, so the wing fills the lower view. Outside work runs only for glass pixels.
- Round 5 (2026-11-04): Tom approved a quality pass, then parked it for budget. Five child beans hold it, in build order:
  1. stimming-kws3: two-pass render, physical sky, sun, moon, flare, speed
  2. stimming-h1c7: procedural city lights
  3. stimming-fres: volumetric clouds, storm towers, bolts
  4. stimming-x27w: panes, glass wear, bezel, shade
  5. stimming-v9hp: wing flap, aileron, fairings

- [x] Frame: wall, bezel, shade with lip, inner pane with frost and breather hole, head parallax
- [x] Outside: sky palettes, procedural towns, cloud deck lit from below, towers, flashes
- [x] Wing: quads with sky reflection, nav light, strobe; banked and rolled view
- [x] Bar: Dusk, Midnight, Dawn; Storm; Shade; Settings (cloud, towns)
- [x] Drag the shade lip; tap a tower to flash it (drag-to-drift is gone; drag now moves the head)
- [x] toys.json entry (Dutch name and IPA are drafts)
- [x] Checkpoint 1: Tom reviewed; asked for wing, slant, colour, procedural
- [x] Checkpoint 2: Tom: the window still looks awkward; wants an up-close slanted view of the frame
- [x] Checkpoint 3: Tom: still unimpressive, the angle is strange; wants limited camera movement to peer through
- [x] Head movement: drag moves the eye (fore, aft, up, down), scroll or pinch leans in, arrows and +/- too; clamped to a box
- [x] Tom: planet and weather shading looked weird; flares should follow Buoy Business
- [x] Sun at the horizon (Dusk, Dawn) or moon (Midnight); deck lumps and towers lit from it
- [x] Lens flare ported from Beach walker for sun or moon, lightning, strobe and nav light; each shows only when seen through the glass
- [ ] Checkpoint 4: Tom tests live
- [ ] Sound: cabin drone, far thunder after each flash, shade slide
- [x] Menu Lab entry: tilted window with horizon, wing and sun; hover glints the sun with a flare streak
- [ ] Remove the `window.__ws` test hook
- [ ] QA: 1280 and 375 px, clean console, reduced motion, hidden tab stops the loop
- [ ] Record the session cost

## Events (Tom, 2026-11-08)

They happen on their own, every 22 to 55 s: a meteor (one in four a green fireball with a lingering train), a rocket launch (its high plume lit by the sun at dusk and dawn: the twilight jellyfish), and a passing jet with strobes and a moonlit or sunlit contrail. Tap-to-flash lightning stays.

Sights round 3: rocket launches 140-200 km out and heads away on a flatter climb; fireball enters from 30-42 deg, its wake runs past the start, and it breaks into seven fragments at 62 %; impact strikes 110-160 km out with a 30 km dome, 80 km plume, 36 ejecta, a wider sky glow and a shock front that shakes the cabin on arrival. Not yet seen: the pane was hidden.

Seen in the pane: fireball path centred and starts just above the window (16-19 deg); rocket staging puff softened; impact moved to 25-60 km forward so it sits mid-window; dome churns in large billows, cools to orange by 8 s, sits on the ground and fades by 32 s. Open: the plume reads as a pillar, it needs a mushroom cap.
