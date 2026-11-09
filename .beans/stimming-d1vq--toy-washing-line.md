---
# stimming-d1vq
title: 'Toy: Washing line'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T07:39:22Z
updated_at: 2026-11-09T08:16:11Z
---

Build Washing line from docs/plans/washline.md. It starts in the Lab, on Bar v2. Plain sheets snap in the wind on one line against the sky; with the sun behind them they glow like stained glass. Unclip the pegs until a sheet flies away. K4 rope is lifted from balloons/ (no chain/ yet); this page adds cloth to K4.

- [x] Task 1: K4 rope (3D) lifted and marked, cloth, pins, wind force, sky, both cloth passes
- [x] Task 1: Q1, Q2, stills with sun in front and behind at 1280 and 375 px; checkpoint with Tom (signed off 2026-11-09)
- [x] Task 2: peg unclip, peg flight, cloth grab, line pluck, free cloth, + Sheet, Release, explosion clamp
- [ ] Task 3: travelling gust field, chips, fabrics, flap detection; backlit overlaps screenshot; checkpoint
- [ ] Task 4: sound: wind, crack, pop, pluck, whoosh; Q9
- [ ] Task 5: Bar v2, Settings, persistence; Q1 to Q10
- [x] toys.json entry and menu Lab entry with a low-fi icon and a GSAP hook
- [ ] Tom sets the Dutch name (draft: Wasdraad)
- [ ] Record the session cost

## Notes

- K4 source: balloons/index.html (verlet strings). chain/ does not exist yet. This copy is the marked K4 with cloth.
- Cloth draws in three order-free passes: max (sun light behind the sheet), multiply (cloth tint), add (front and sky light). Overlaps multiply.
- Blockout checkpoint (2026-11-09): stills sun in front and behind at 1280 and 375 sent; waiting on Tom. Sound is off (silent) until Task 4.

## Look change (Tom, 2026-11-09)

- Tom asked for a painted anime key-art look: deep blue sky, painted cumulus, no cel-toon clouds. Toon cloth shading was cut as unconvincing.
- Washing is now mixed garments with random shape, colour and pattern: sheet, towel, tee, trousers, dress, pillowcase, dishcloth, sock. The shader cuts each outline and draws hems.
- The first 3D blockout is kept as washline/legacy.html (Classic), legacy: true in toys.json.
- Tasks 3 to 5 still open: the overlap still for the checkpoint, sound, watchdog, QA.
