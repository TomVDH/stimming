---
# stimming-j2rw
title: 'Observatory: redo the main dome, taller, larger, no cobblestone drum'
status: in-progress
type: task
created_at: 2026-11-22T09:43:50Z
updated_at: 2026-11-22T09:43:50Z
parent: stimming-wqq9
---

Redo the main dome of the observatory in observatory/src/world/observatory.ts and its hero twin in world/hero.ts. Direction from Tom: a smaller complex, but a larger and taller observatory; the stone-block drum goes, plain render instead. Reference: Observatoire des Baronnies Provençales (OSM footprints, scratch sheet). Child of stimming-wqq9.

## Checklist

- [x] Main dome at size 1.7: drum 10.8 m across, 6.9 m high, top 12.5 m (DRUM_R 3.18, DRUM_H 4.06, DOME_R 3.3)
- [x] Drum is plain render in the light model (observatory.ts) and the hero (hero.ts)
- [x] Complex smaller: hall 24 x 8 x 4.5 m, east dome 0.6, roof dome 0.55
- [x] npm run check passes
- [x] Wide shot and hero close shot checked in the browser
- [ ] Tom approves the numbers and the look
- [ ] hero-scope.ts DRUM_H copy (3.4) follows the new value (owner: telescope session)

## Notes

DOME_R stays 3.3 because core/mount.ts and view/cuts.ts copy it.
The size grows through the main dome's scale (1.5 to 1.7) and a lower DRUM_H.
