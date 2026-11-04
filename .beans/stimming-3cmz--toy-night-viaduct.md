---
# stimming-3cmz
title: 'Toy: Night viaduct'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-04T13:00:00Z
updated_at: 2026-11-04T13:00:00Z
---

Build Night viaduct from docs/toy-dev-plan.md, section 4. It starts in the Lab.

- [x] Blockout: valley, viaduct, trees, river, sky, village lights, train, snow, post
- [x] Bar: weather chips, Time slider, + Train, Settings (cars, letterbox, quality)
- [x] Input: tap sends a train, hold slows time, drag looks around, Space and arrows
- [ ] Checkpoint 1: Tom reviews the blockout stills
- [ ] Sound: rumble, rail joints, wind bed, arc crackle, horn
- [ ] Checkpoint 2: Tom reviews motion and sound
- [ ] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] QA: 1280 and 375 px, clean console, reduced motion, hidden tab stops the loop
- [ ] Record the session cost

## Notes

- Headless SwiftShader renders at 2 to 5 fps at 1280 px. A real-device fps check is still needed.
