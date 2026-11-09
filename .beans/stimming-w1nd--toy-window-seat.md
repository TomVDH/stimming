---
# stimming-w1nd
title: 'Toy: Window seat'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-04T20:00:00Z
updated_at: 2026-11-09T10:34:11Z
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
- Round 5 findings (audit of ae3f2fd, 1280 px, all three hours):
  - Frame: the wall is one flat beige plane. The bezel is one smooth box: no gasket, no pane layers. The shade reads as a thin grey bar, not a blind.
  - Sun and moon: each is a 3 to 6 px dot. The flare streak spans the whole screen and the cabin wall, so it is louder than its source.
  - Clouds: the deck is a low-contrast brown noise smear. The storm tower reads as a smoke plume.
  - Towns: the lights barely show. A few dots sit near the wing; the ground reads as muddy haze.
  - Speed: 2.4 km/s, about ten times real. The ground streams past.
  - Perf: one full-screen fragment shader does all the work. Volumetrics need the two-pass split (stimming-kws3).

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
- [ ] Sound: cabin bed done (recorded loop, cabin.mp3, seam cross-faded in memory, gain 0.2); far thunder after each flash and the shade slide still to do
- [x] Menu Lab entry: tilted window with horizon, wing and sun; hover glints the sun with a flare streak
- [x] Remove the `window.__ws` test hook (gone with the three.js swap, 2026-11-09)
- [ ] QA: 1280 and 375 px, clean console, reduced motion, hidden tab stops the loop
- [ ] Record the session cost

## Events (Tom, 2026-11-08)

They happen on their own, every 22 to 55 s: a meteor (one in four a green fireball with a lingering train), a rocket launch (its high plume lit by the sun at dusk and dawn: the twilight jellyfish), and a passing jet with strobes and a moonlit or sunlit contrail. Tap-to-flash lightning stays.

Sights round 3: rocket launches 140-200 km out and heads away on a flatter climb; fireball enters from 30-42 deg, its wake runs past the start, and it breaks into seven fragments at 62 %; impact strikes 110-160 km out with a 30 km dome, 80 km plume, 36 ejecta, a wider sky glow and a shock front that shakes the cabin on arrival. Not yet seen: the pane was hidden.

Seen in the pane: fireball path centred and starts just above the window (16-19 deg); rocket staging puff softened; impact moved to 25-60 km forward so it sits mid-window; dome churns in large billows, cools to orange by 8 s, sits on the ground and fades by 32 s. Open: the plume reads as a pillar, it needs a mushroom cap.

Impact fireball rebuilt: one opaque sphere that rises, cools to smoke and flattens into the mushroom cap (capAt); the deck hides its base; a narrow dim stem rises under it. Seen in the pane at 12 s and 62 s.

Impact fireball: traced as a displaced surface (large Worley lobes), fire in the folds by a heat ramp, smoke on the bumps; ejecta as thin streaks with tails. Seen at 14 s.

Performance: the wing early-out skips the outside where it covers the view; High traces the outside at 0.75 scale; High deck 26 steps, light 4, towers 56. Frame on High, 1816x1752: 50 ms before, 8-17 ms after. Rain on the window: Settings Rain Off, Light or Heavy (beads in three sizes, runs blown aft), after the train ride.

Storm blend fix: storm air hazes the background before the towers; towers haze by their own distance in storm grey; murk lights them, the moon's silver lining fades with Storm; trails and approach lights dim by distance. Sights now come on their own every 4 to 10 minutes (first after 1 to 3); Tom plans a new trigger menu later.

Bar v2 port (2026-11-09): time of day is a stepper top left (seven hours: dawn, morning, noon, golden hour, dusk, blue hour, midnight); Storm slider bottom right; Dim action (key D); Settings: Cloud, Towns, Rain, Aurora, Falling and Flying sights, site Quality. The cabin light is the hour's 787 mood plus daylight through the window. Town lights go out by day (uLit). Glass scratches rebuilt: three hairline layers and cleaning swirls catch the cabin light. window/annex.json added; the shell has no annex yet.

- 2026-11-09 (Tom, via toy-trainride): pane rain now uses shared/glassrain.js (grBeads, grRuns). Rain space is the pane in metres times 0.45 / 0.55, as in glasslab/. Strip 0.15 at flight speed; aft direction and flow unchanged.

- 2026-11-09: the three.js build (stimming-glot) is now the toy; the raw WebGL2 build is legacy.html.
- 2026-11-09 (Tom): the autopilot banks at random (2 to 14 degrees mostly, sometimes -8 to 18; about 2 degrees a second; holds 12 to 45 s). Aileron to 7 degrees, spoilers on the dropping wing, flaps trim with bank. The winglet root sits inside the tip.
- 2026-11-09 (Tom): strobes are hard double pulses (50 ms, 120 ms apart, no afterglow). The bezel, the pane gasket and the wall near the rim take light from a soft quarter-size copy of the outside, so sunset colour, lightning and strobes wash over the frame.
