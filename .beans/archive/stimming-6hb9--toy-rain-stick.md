---
# stimming-6hb9
title: 'Toy: Rain stick'
status: completed
type: feature
priority: normal
created_at: 2026-11-10T06:26:45Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

Build Rain stick from docs/plans/rainstick.md (rank 2 in docs/plans/fidgets.md). It starts in the Lab. A glass tube of beads and pins: tilt it and the beads trickle down; every hit clicks and lights its pin. Bar v3 (batch 1 of the 14 unbuilt toys, 2026-11-22: "MVP at high fidelity, with icons for the lab and intro as well, bar v3").

## Defaults chosen by the build chat (for Tom)

- Flat side view, not 3D. The physics is 2D, so a flat view shows every bead and every pin; the backlight, glass rim and bead lens spots give the depth.
- No stand in the toy. A flip turns the tube end over end, through upright; a seesaw post would cut through it, and the Look rule cuts props. The plinth and post stay in the icon (D) and the intro emblem.
- MVP scope: glass beads only. Bar: Flip (F) and the Beads slider (80 to 280, stored). The plan's Fill choice (Seeds, Glass, Steel) and the Pins and Glow settings are not built.
- Pin light is a per-pin value that halves in 400 ms (150 ms on reduced motion), drawn as a hot core and halo into the bloom, not a separate R16F buffer.
- Gravity is 180 units/s² (under a tenth of real) so one turn trickles for 10 to 15 s.

## Checklist

- [x] Task 1: tube, pins, beads, tilt (blockout); screenshot docs/qa/rainstick/blockout-1280.jpg
- [x] Task 2: pin voices (glass on brass), voice cap 60/s and crackle bed, tube body at 171.5 Hz, flip whoosh. Offline render: -26 dB RMS in the rush, peak -9 dBFS, silence by 12 s
- [ ] Tom listens
- [x] Task 3: pin glow, bead impostors, glass and walnut caps, bloom chain, grade
- [x] Task 4: persistence (beads), slow-frame step (pixel ratio, bloom level, bead count); Q1 to Q9 pass
- [x] Q10: 60 fps headless (ANGLE GL) at 1280 x 800 during a flip; physics 0.3 ms a frame at 180 beads
- [x] toys.json entry and menu Lab entry with icon D and its GSAP hook; intro emblem shared/emblems/rainstick.svg; favicon; sheet GALLERY row
- [x] docs/toys/rainstick.md
- [ ] Tom sets the Dutch name (draft: Regenstok)
- [ ] Record the session cost
