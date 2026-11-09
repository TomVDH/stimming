---
# stimming-9f37
title: 'Toy: Frietkot'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T09:14:44Z
updated_at: 2026-11-09T11:01:10Z
---

Build Frietkot at night from docs/plans/frietkot.md. It starts in the Lab. A chip shack stands alone on an empty village square at night: a warm steamy service window, a humming neon strip, a low wide toy-scale shot. Drop fries, shake the basket, pick a sauce, fill a cone.

- [x] Plan: docs/plans/frietkot.md
- [x] Task 1: blockout: square, shack, window light, neon, sky, haze, bloom, tilt-shift; bar wired
- [x] Task 1: stills at 1280 and 375 px; checkpoint with Tom
- [x] Task 2: the fryer: double fry, boil and foam, basket, frites colour
- [x] Task 3: steam: buoyancy, condensation gap, wind, backlit glow
- [x] Task 4: sauce and cone; moths; a passing scooter or car
- [ ] Task 5: sound: sizzle by boil, neon hum, scoop rattle, distant road
- [ ] Task 6: Settings, persistence, 375 px pass, QA
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] Tom sets the Dutch name (draft: Frietkot bij nacht)
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
