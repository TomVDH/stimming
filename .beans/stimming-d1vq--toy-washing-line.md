---
# stimming-d1vq
title: 'Toy: Washing line'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T07:39:22Z
updated_at: 2026-11-09T09:15:21Z
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

## Seven scenes blockout (Tom, 2026-11-09)

Scene is the bar choice (stepper); Wind moved to Settings. ?env=<id> picks a scene; the last one is remembered.

| Scene | Sky and land | Weather | Wardrobe and textiles |
|---|---|---|---|
| Summer | anime blue, cumulus bank, sea haze | none | sheets, tees, trousers, towels, dresses |
| Riviera | warm afternoon, rooftops in haze | none | white linens, breton stripes, lemon, terracotta |
| Monsoon | grey-green overcast, hills | rain; wet cloth darkens and turns see-through | sarongs in batik and border cloth |
| Snow | lilac overcast, pines | snow | knit sweaters with a Nordic band, fringed scarves, mittens, socks |
| Dusk | magenta to orange, town with poles and wires | none | robes, gingham, dots, ikat |
| Night | navy, stars, moon, hills | none; string lights warm the cloth | pale cotton, dots, gingham |
| Desert | bleached blue, dunes | dust | indigo and saffron ikat, scarves, robes |

- Open: dunes read flat; each scene still needs tuning after Tom picks.

## Dioramas, one by one (Tom, 2026-11-09)

Tom asked for higher-fidelity mini dioramas with their own camera angles, one scene at a time. washline/diorama.html (noindex) holds them; the seven-scene page stays as it is.

- [x] Summer: floating lawn slab with soil strata, 30k to 70k wind-blown grass blades, daisies, two posts with hooks, wicker basket, cotton cord line, wooden pegs with steel springs.
  Physical cloth (sheen, weave normal maps: plain, twill, jersey, terry), per-piece canvas textures with seams, topstitching, collar rib, belt loops and hems, real sun shadows, back light darkened by pieces in front, 4x MSAA, tilt-shift, orbit by dragging the sky.
- [ ] Riviera, Monsoon, Snow, Dusk, Night, Desert dioramas, after Tom signs off Summer.

- Summer v2 (Tom: static, anchors off camera): fixed camera; the line runs from a rendered house wall (eye bolt, brick plinth, sash window, downpipe, gravel strip) to a tall drying pole, both running off frame. Lawn with mowing stripes to a leafy hedge; trees in distance haze; the painted sky behind.

- Summer v3 (Tom: iso or Wes Anderson framing): Wes Anderson cut. Dead-centre level long-lens shot; symmetric pink facade with mint shutters, door, awning, pots and box hedges; two white poles rise out of frame; washing hangs in mirrored pairs on a pastel palette; deep focus.
