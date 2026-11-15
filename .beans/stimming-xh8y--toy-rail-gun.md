---
# stimming-xh8y
title: 'Toy: Phaeton'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-10T08:52:13Z
updated_at: 2026-11-10T09:00:56Z
---

A new Lab toy at `phaeton/`: a rail gun on a salt flat; the slug goes through a row of mixed targets in bullet time. Tom named it Phaeton (2026-11-10). The Lab toy Railgun (`railgun/`, stimming-f793) is a different toy and stays as it is.

Tier 4, three.js 0.170. Plan: `docs/plans/phaeton.md`.

- [x] Brainstorm the direction with Tom
- [x] Plan in docs/plans/phaeton.md
- [x] Blockout at phaeton/index.html
- [x] toys.json entry and Lab menu entry
- [x] Stills to Tom
- [x] Commit through tools/commit.sh

## Not a duplicate

Reopened 2026-11-10. Tom saw the Railgun clash and named this toy Phaeton: a separate Lab toy, own folder.

## Diorama pass (Tom, 2026-11-10)

Tom moved the toy to a side diorama with hands-on diegetic loading (rack, crane, lever, capacitors, lamps), firing sideways. Stage on a plinth. Other modes later.

- [x] Diorama blockout: slab, gun machines, load, lock, charge, fire, vent, track camera
- [x] Task 2: a hit per material
- [x] Task 3: modes: Range, Corridor, Aquarium, Depth
- [ ] Graphics pass: from blockout to finished look
  - [x] Atomic-age restyle of the machines; bloom, tilt-shift, grade
  - [x] Light: contact shadows, rim light, a low sun, a cloud sea under the diorama
  - [x] Materials: edge wear, patina, salt glitter
  - [x] Effects: muzzle plasma, dust ring, heat shimmer, sparks, clear ice
- [x] Sound: machines, charge, fire, hits, snap; muted by default (2026-11-10, not yet heard by Tom)
- [x] Phone: portrait looks down the lane at three-quarters; landscape keeps the side view; bar fits at 375 x 812 and 812 x 375
- [x] Slow-frame ladder: lower pixel ratio, then no tilt blur and 1024 shadows; throttled frames do not count
- [ ] Real fps: the hidden browser pane throttles the GPU, so its numbers are not valid; measure with the pane visible or on a device
