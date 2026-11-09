---
# stimming-9f37
title: 'Toy: Frietkot'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T09:14:44Z
updated_at: 2026-11-09T09:28:08Z
---

Build Frietkot at night from docs/plans/frietkot.md. It starts in the Lab. A chip shack stands alone on an empty village square at night: a warm steamy service window, a humming neon strip, a low wide toy-scale shot. Drop fries, shake the basket, pick a sauce, fill a cone.

- [x] Plan: docs/plans/frietkot.md
- [x] Task 1: blockout: square, shack, window light, neon, sky, haze, bloom, tilt-shift; bar wired
- [ ] Task 1: stills at 1280 and 375 px; checkpoint with Tom
- [ ] Task 2: the fryer: double fry, boil and foam, basket, frites colour
- [ ] Task 3: steam: buoyancy, condensation gap, wind, backlit glow
- [ ] Task 4: sauce and cone; moths; a passing scooter or car
- [ ] Task 5: sound: sizzle by boil, neon hum, scoop rattle, distant road
- [ ] Task 6: Settings, persistence, 375 px pass, QA
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] Tom sets the Dutch name (draft: Frietkot bij nacht)
- [ ] Record the session cost

## Notes

- Blockout (2026-11-09): custom shaders, no RectAreaLight. The window light is a ceiling tube seen through the opening (an aperture mask), so the pool, the haze shaft and the steam glow share one light. The cobble streak is a reflected-ray test against the window and the neon. Outside gain uOut 9 lifts the pool above the lamp's 1/d² falloff.
- Stills at 1280 and 375 px sent; waiting on Tom before Task 2. Handlers are stubs: Drop and Shake flare the window; Fill unlocks after two drops.
