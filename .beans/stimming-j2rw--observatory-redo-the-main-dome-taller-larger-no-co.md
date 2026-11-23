---
# stimming-j2rw
title: 'Observatory: redo the main dome, taller, larger, no cobblestone drum'
status: in-progress
type: task
priority: normal
created_at: 2026-11-22T09:43:50Z
updated_at: 2026-11-23T20:32:01Z
parent: stimming-wqq9
---


Redo the main dome of the observatory in observatory/src/world/observatory.ts and its hero twin in world/hero.ts. Direction from Tom: a smaller complex, but a larger and taller observatory; the stone-block drum goes, plain render instead. Reference: Observatoire des Baronnies Provençales (OSM footprints, scratch sheet). Child of stimming-wqq9.

## Checklist

- [x] Main dome at size 1.7: drum 10.8 m across, 6.9 m high, top 12.5 m (DRUM_R 3.18, DRUM_H 4.06, DOME_R 3.3)
- [x] Drum is plain render in the light model (observatory.ts) and the hero (hero.ts)
- [x] Complex smaller: hall 24 x 8 x 4.5 m, east dome 0.6, roof dome 0.55
- [x] npm run check passes
- [x] Wide shot and hero close shot checked in the browser
- [x] Tom approves the numbers and the look (Tom, 2026-11-22)
- [x] hero-scope.ts DRUM_H copy replaced: the scope root drops to each dome's turn height less SCOPE_TURN

## Notes

DOME_R stays 3.3 because core/mount.ts and view/cuts.ts copy it.
The size grows through the main dome's scale (1.5 to 1.7) and a lower DRUM_H.


- [x] The cuts hide the laser beam (Tom, 2026-11-22); the wide shot keeps it


## Keck direction (Tom, 2026-11-22)

Tom: a big scientific observatory, like the Keck telescopes.

- [x] Light model: big Keck-style enclosure (base, turning skirt, vents, wide opening, shutter rails), 25 m across, 19.6 m tall
- [x] Door lamp and tracking lamp sit on the big base
- [x] Hero build skipped while the main dome is big; cuts use the light model
- [x] Tom approves the size and the look (Tom, 2026-11-22)
- [x] Base raised to 1.7 units (6.2 m); top at 22.2 m (Tom: higher cylinder)
- [x] Keck-style hero model for the cuts (base, doors, louvres, track, skirt, vents, cap, rails, ladders, shutters, inside)
- [x] Outside cut cameras retuned for the big dome: edge and slit eyes on the summit, slit lens 17 degrees, sight lines across the frame clear the mast
- [ ] Inside cut (lift) retuned for the big hero: its floor, wall and keep-out values are the classic hero's
- [x] Open truss telescope visible through the opening (the 1 m reflector in the big dome, stimming-5oab)
