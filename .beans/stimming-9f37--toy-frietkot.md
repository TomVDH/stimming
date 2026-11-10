---
# stimming-9f37
title: 'Toy: Frietkot'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T09:14:44Z
updated_at: 2026-11-09T23:35:45Z
---

Build Frietkot at night from docs/plans/frietkot.md. It starts in the Lab. A chip shack stands alone on an empty village square at night: a warm steamy service window, a humming neon strip, a low wide toy-scale shot. Drop fries, shake the basket, pick a sauce, fill a cone.

- [x] Plan: docs/plans/frietkot.md
- [x] Task 1: blockout: square, shack, window light, neon, sky, haze, bloom, tilt-shift; bar wired
- [x] Task 1: stills at 1280 and 375 px; checkpoint with Tom
- [x] Task 2: the fryer: double fry, boil and foam, basket, frites colour
- [x] Task 3: steam: buoyancy, condensation gap, wind, backlit glow
- [x] Task 4: sauce and cone; moths; a passing scooter or car
- [x] Task 5: sound: sizzle by boil, neon hum, scoop rattle, distant road
- [x] Task 6: Settings, persistence, 375 px pass, QA
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [x] Tom sets the Dutch name: Frietkot
- [ ] Record the session cost

## Notes

- Blockout (2026-11-09): custom shaders, no RectAreaLight. The window light is a ceiling tube seen through the opening (an aperture mask), so the pool, the haze shaft and the steam glow share one light. The cobble streak is a reflected-ray test against the window and the neon. Outside gain uOut 9 lifts the pool above the lamp's 1/d² falloff.
- Stills at 1280 and 375 px sent; waiting on Tom before Task 2. Handlers are stubs: Drop and Shake flare the window; Fill unlocks after two drops.

- Tom signed off the blockout (2026-11-09). Task 2: the fryer moved to just inside the window and the tiles went teal, because a back-wall fryer is hidden by the sill from the low lens. Drop picks a free basket (blanched fries get their second fry); Shake lifts the basket in the oil, shakes it and kicks the boil; Fill takes golden fries.

- Tom (2026-11-09): vague 2D human shapes (staff, customers, bikes, smokers) with a slight blur and time-lapse; a deeper frietkot after 90s and 2000s frietbaraks. Built as Task 3b: a 5 x 3.6 m shack with mosaic, menu boards and a cooler; a seating room with steamed amber windows and a light box; flat soft figures with echo trails and long shadows.

- Tom (2026-11-09): more traffic, weather, less camera freedom, motorbikes and cars that stop, groups, dog walkers, village lights on and off, a lit tower clock, neon 'Frituur Stefan & Hilde'; three figure looks to pick from. All built as Task 3c. Rain dashes came from half-float overflow; the rain light is clamped.

- Tom (2026-11-09): open clock dial, other neon font, Man bijt hond dog, sloped annex roof, livelier annex shapes, a bike rack where bikes pile up, a parish hall with a party, smoother time-lapse above 24 fps. Built as Task 3d with ?clock, ?font and ?dog variants; picks pending.

- Tom (2026-11-09): longer queue, rack further out, varied smoking, a comic shady deal, staff quality, food photos, slimmer annex sitters who come and go, dimmer hall further left, wider lens with zoom and handheld, a people sheet, the Man bijt hond dog (built as our own mongrel; the logo stays out), new sign 'Frituur Bij Bruno en Anja'. Built as Task 3e.

- Tom (2026-11-09): lean (no font/clock/dog switches), 24 fps stop-motion with grain, sharper Haze, better umbrellas, no floating lights at the hall, shifting weather, youth scenes, steam must not cover the foreground. Built as Task 3f.

- Icon (2026-11-09): the square at icon scale (church and clock, hall party windows, the red frituur with its sign, the fries neon, a reflection). Hover runs the fries chase; a walker steps to the pointer in stop-motion with three ghosts.

- Tom (2026-11-09): renamed to Frietkot. The icon is redrawn to match: the village and church, the parish hall's windows, a sodium streetlight, the red frietkot with its two-line sign and the wall fries neon. Hover strikes the neon, sputters the wall sign and walks a stop-motion figure to the pointer. Dutch name still the draft (Frietkot bij nacht) for Tom.

- Tom (2026-11-09): fuller night skyline, calmer walk, softer bloom, less tilt-shift, better church square, frituur on the golden section, rain fixed. Built: a closed street front of 2-4 storey gables (crow steps, cornices) with more lit windows and far lamps; a west-tower church with the nave behind; a hazy town layer with a spire, water tower and mill; the cottage row removed. Walk swing and bob cut by about 40 %. Bloom knee 0.8, radius 0.32; tilt-shift default 0.4. Wide frames pan the window to 0.618 across. Rain fills the view with depth fade, not a box round the shack.

- Tom (2026-11-09): close out the diorama; pare the bar; an establishing title "Vrijdagavond / Op 't kerkplein". Built: the bar is one Order action (O, or a tap on the shack) that runs blanch, rest, second fry with a shake, and a cone with a random sauce; Wind moved to Settings; Sauce stepper, Drop, Shake and Fill buttons and the People choice removed (ink is the look; ?people still tries line and haze). The title types on as a camcorder caption 0.9 s after the intro, holds, then fades.

- Tom (2026-11-09): subtler hall, proper Z layering, more foreground passers, choppier smoking, fewer moths, softer round bloom. Built: hall windows washed toward warm light at about half brightness, beat only nods, specks sparse, spill 0.7 at 40 % saturation; figures draw far to near with echoes behind each figure; a back pass (z < 1.5) draws before the shaft and steam; spawnNear sends walkers, bikes and mopeds along the near pavement (z 11.6 to 13); the smoker's arm holds four poses at 6 fps; 5 moths, smaller and dimmer; bloom 0.36 strength, 0.75 radius, 0.88 threshold.

- Tom (2026-11-09): painterly, shaded village; soft rim light on the frituur; moths off; strange flashes; a curb with traffic in front; a regional bus. Built: M.village paints the backdrop in brushed fbm tones, warm at the foot and cool above, with twice the square's haze; late windows half as bright with wider soft halos. Shack paint, trim and awning take a soft rim (uRim). Moths are off and out of Settings. A guard pass before the bloom zeroes NaN and caps pixels at 6; window flare 0.3; exposure flicker 1 %. Two granite curbs (z 8.75 and 11.1) hold a smooth asphalt road band; walkers on the square stay behind z 8.4. A yellow-and-white regional bus (kind 11, 12 m, lit windows, amber destination sign, no logo) passes every 70 to 130 s on its lane with a low engine. Not yet watched: whether the flashes are gone.

- Tom (2026-11-09): bus shelter and bins; a better bus with see-through windows that lights the street. Built: a glass shelter on the square's edge left of the shack (x -5.6) with a bench, an unlettered yellow stop sign, and a lit ad box facing the lens that lights the ground and bins (uAd); two dark green bins (by the annex and by the shelter). Buses from the left brake to a 2 to 3.5 s stop at the shelter, sometimes let one off, and pull away; from the right they pass. The bus windows are 55 % opaque, so the square shows through; its cabin lights the street, walls and figures along its length (uBus); brighter livery. The car parking spot moved to x -11.5.

- Tom (2026-11-09): shelter off the front; put it at the back of the square by the village; the bus looked out of style; run it in the background past the parish hall. Built: the shelter and its bin stand on a back road (BUS_Z -55.5) right of the hall; the bus runs that road from x ±70, stops at the shelter when it comes from the left, and lets a walker off along the far pavement. The bus is drawn in ink like the cars: dark body, dim warm windows at 70 % cover, a small amber sign, lamps. The front road keeps cars, bikes and mopeds.

- Tom (2026-11-09): wind made the rain slant nonsense; drop wind; volumetric rain; faint blue glow on the people; a subtle toon rim on the frituur. Built: Wind is out of Settings (steam keeps a fixed light breeze); rain drift is a constant 0.35 m/s, because a gusting drift times the clock jumped every drop sideways. Seven rain curtains (z 9 to -50) add falling streaks near the lens and a moving veil far off, lit by the window and neon. The people's sky rim is neutral grey, not blue. A depth-based toon rim in the guard pass draws a faint warm edge where near objects (under 30 m) meet a far background.

- Tom (2026-11-09): bus stop before the church tower, toward the hall; other sign designs, incl. a bottom-lit panel (neon stays the favourite). Built: the shelter sits at CHURCH_X + 8.5 on the back road; the bus halts there. A Sign stepper in Settings (and ?sign=) picks Neon (default), Lit board (cream board, red heavy capitals, three gooseneck lamps below throwing cones up the face) or Lightbox (backlit white plastic, tube banding, red capitals). Panels redraw the lettering in Gabarito 800; the wet square reflects each in its own colour.

- Tom (2026-11-09): the order interaction is pointless; more ideas later; lit board as the sign. Built: no Order button, no tap-to-order, no hold-to-shake; the key strip shows drag and scroll only. The staff run orders themselves (stepOrders: 6 to 12 s after someone waits, else every 18 to 38 s). The Sign default is Lit board.
- [ ] Next interactivity: Tom to think it over.
- [x] Main shelf as No. 39, Tom's call (2026-11-09).
- [x] Intro emblem: the 3D fry cone from icon spike 4 (C1 Stripe) as a mask (`shared/emblems/frietkot.svg`). The shack scene and the flat cone are out (Tom, 2026-11-09).
- [ ] Menu tile: install the spike 4 cone; Tom picks the paper (C1 to C4).
