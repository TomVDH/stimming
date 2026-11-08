---
# stimming-8dc4
title: 'Toy: Sequin brush'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-08T10:58:40Z
updated_at: 2026-11-08T11:09:24Z
---

Build Sequin brush (idea 104): stroke a field of reversible sequins; they flip colour in the trail; a stroke back flips them home. Folder `sequin`. It starts in the Lab. Raw WebGL2. It follows the Look rule: one field of sequins, no props.

- [x] Blockout: a still of the field with one brushed swath, mid-flip sequins at its edge and head
- [x] Checkpoint 1: Tom signs off the blockout
- [x] Field: per-sequin flip state in a texture; flip about the horizontal axis
- [x] Gesture: a stroke up flips to the second face; a stroke down flips home; a tap flips a few
- [x] Light: one key light sweeps; tilted sequins glint in turn
- [x] Bar: face-pair chips, Brush slider, Clear, Settings
- [x] Frame loop: 30 fps or better, idle sleep, hidden stop, reduced motion
- [x] Sound: a shimmer tick per flip, with jitter (built; not yet heard by Tom)
- [x] toys.json entry (Paillettenborstel, draft) and menu Lab entry with an icon and a GSAP hook
- [ ] QA: 1280 and 375 px, clean console, idle stop, hidden tab stops the loop
- [ ] Record the session cost
