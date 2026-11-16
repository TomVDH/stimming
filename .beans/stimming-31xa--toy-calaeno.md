---
# stimming-31xa
title: 'Toy: Calaeno'
status: in-progress
type: feature
created_at: 2026-11-15T10:51:38Z
updated_at: 2026-11-15T10:51:38Z
---

New Lab toy. A huge original super plane crosses high overhead, seen from below against the sun. Its contrails use a stripped copy of the Railgun smoke train. One escort flies beside it.

- [x] Page skeleton on Bar v2, three.js 0.170
- [x] Sky, sun and haze (deep blue, wisps, sun rays ported from Railgun)
- [x] The plane: built from Tom's top view (tandem wings, three bodies, twelve pushers)
- [x] The escort
- [x] Plumes: the Railgun train, shading ported word for word
- [x] toys.json entry and Lab menu tile (temp icon)
- [ ] QA at 1280, 375x812 and 812x375
- [ ] Screenshots to Tom
- [ ] Tom's verdict on the view: elevation, heading, lens (Dev sliders)
- [ ] Sound

## Round 2 (Tom, 2026-11-15)

- [x] One contrail per engine, starting at its propeller
- [x] A better contra-rotating propeller (six scimitar blades per row, motion smear, spinner)
- [x] Two sister craft, on a Craft choice (Alcyone, Merope: proposals)
- [x] Six escorts
- [x] Layered, moving sky (wisps, heaps, near scud); deeper blue
- [x] No user camera; a wider frame on a narrow lens

## Round 3 (Tom, 2026-11-16): sky angles, then raymarched clouds

- [x] Alcyone is the default craft; Craft moves to Settings
- [x] Four fixed views on a View choice: Below, Flank, Head-on, Above
- [x] Cloud layers are level sheets at set heights; a sea under the rim
- [ ] Tom's verdict on the four views
- [x] Raymarched clouds, ported from Window seat's deck; frames average with a moving dither
- [x] Craft stand tall: dihedral, fins, pylons, dishes on struts, an arch tail on Alcyone
- [x] Time of day on the bar: day, gold, dusk, moonlit night with stars, lamps and windows
- [x] The sky goes deeper when the key light is out of frame
- [ ] Tom's verdict on the clouds, the craft and the hours

## Round 4 (Tom, 2026-11-16)

- [x] Contrails taper to clear air along their length
- [x] Escorts wobble and fly patrol loops, banking; their trails thin on patrol
- [x] Strobes keep their own clocks; each flash has a glow and a soft flare, no streak
- [x] The final pass reads live values (sun flare, grain clock, frame shape)

## Round 5 (Tom, 2026-11-16)

- [x] Escort trails are ribbons that hang along the path flown
- [x] A clear gap between the propellers and the first smoke
- [x] Propellers: a blur by blade share, ghost blades, spinners
- [x] No window strips: these are not passenger craft
- [x] Cloud cover gathers into fields; the Below view has raymarched cloud above the craft

## Round 6 (Tom, 2026-11-16)

- [x] Cloud heaps broader than tall
- [x] Cloud at every height: deck, a mid layer, cloud mountains past the craft; a clear corridor to the craft
- [x] Escort trails wear the smoke look, with the noise pinned to the air
- [x] The big craft's contrails fade sooner
- [x] Looked at round 6 on screen (2026-11-16)

## Close-out (Tom, 2026-11-16): parked on this branch

All work is on `feature/stimming-31xa`, pushed. `main` holds rounds 1 and 2 only (PRs 62, 63).
Do not merge to `main` until Tom says it is clear: MacBook work lands there first.

Open, in order of weight:

- [ ] Cloud mountains: they stand at set places per view (`sites` in `VIEWS`). Flank shows one, but it reads as one smooth wall. Head-on shows none: its lens is narrow, so a site must sit within ten degrees of the view axis. Above is not rechecked.
- [ ] The mid cloud layer is off: the march steps are too long for a thin sheet, and it shows as stipple. It needs its own sampling.
- [ ] Escort trails comb where a patrol loop is seen end-on.
- [ ] Propellers still read as dark stars at this size.
- [ ] Megaplane exhaust: I read Tom as wanting a softer fade; he has not confirmed.
- [ ] Not measured since round 3: frame rate, 375 x 812, 812 x 375.
- [ ] Sound; a real menu icon (its own chat); Merope got only a light pass on height.
