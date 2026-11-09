---
# stimming-d1vq
title: 'Toy: Washing line'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T07:39:22Z
updated_at: 2026-11-09T10:34:02Z
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

- Summer v4 (Tom: too Wes, line too small; Coen brothers): wide lens, low and close to the near T-post (cropped by the frame), the line runs away to a far post on open prairie. Tall dry grass, barbed-wire fence, windmill and farmhouse on the horizon, big sky, deep focus, natural palette.

- Summer v5 (Tom: wider, flatter; add iso; stay in this style): wide lens set back and level, the line on a gentle slant. Settings > View adds Iso: a true isometric orthographic camera with a soft tilt-shift band; grass replants for each view.
- [ ] Six more themes in this Coen style, one by one, each with Wide and Iso.
  - [x] Winter plains: whiteout haze, red snow fence with drifts, telephone poles on a buried road, bare tree, grain elevator, snowfall, frozen washing (long johns, buffalo-check flannel, rime), footprints, galvanised tub.
  - [x] Harbour village with a fishing boat (Tom's ask): wharf deck on pilings, red shingled fish shed with buoys and a ring, timber piling with rope wraps, lobster traps, rope coil; sea with rolling waves, a lobster boat riding the swell, mooring buoy, gulls; painted houses up the far hill and a lighthouse in sea fog; slicker, Breton shirts, work trousers on the line.
  - [ ] Anime city with a jet dogfight and contrails in a deep blue evening sky (Tom's ask).
  - [ ] Three more from: Delta gold, Desert motel, Suburb dusk, Trailer night, Storm front.

- Tom: each diorama needs its own camera angle and distinctly different anchors and backgrounds. Themes now carry cam (wide) and iso (yaw) settings. Prairie: T-posts, level wide shot from the left. Winter: red barn wall (gable roof, X door, ring) to a bare cottonwood, low camera from the tree side looking up; iso turned the other way.

- Fidelity pass (Tom: shadows, shading, contrast; the line must always contrast): dark cord tinted per theme with a 1.7 px minimum screen width; stronger sun, lower fill; cloth fold darkening; contact shadows; drifting cloud shadows on ground and grass; a per-theme grade (S-curve, saturation, lift, vignette).

- Winter v3 (Tom: winter is not good): clear cold afternoon with a low sun and long blue shadows; line from a white clapboard farmhouse corner (warm lit window, snow on the sill) to a barked cottonwood; shelterbelt of bare trees on the horizon, a small red barn, telephone poles; wind-carved snow relief (normal map) and low drifts; camera at eye height from the tree side into the sun.

- Winter v4 (Tom: strange trees; tie it to a big timber tree by a cabin in northern BC): log cabin corner (notched crossing logs, chinking, lit window, snowy eave, woodpile) to an old fir with furrowed bark; smooth-shaded snowy spruce forest; Coast Mountains in haze; chopping block with an axe; Iso hides the fir crown as a cutaway.

- Winter v5 (Tom: higher fidelity, more distant, cabin far too tall, make it Canadiana): real-scale saddle-notched log cabin (2.4 m eave, end-grain log ends, board gables, snow-loaded roof, icicles, fieldstone chimney with woodsmoke, lit window, Z-braced door, snowshoes, woodpile); red canoe hull-up, red Muskoka chair, point blanket on the line; camera pulled back.

- Winter v6 (Tom: not enough fog or Coen layering; think Fargo): overcast whiteout, exponential fog (thinned for Iso), spruce in rows at set depths grading dark to pale, boughs to the snow (no trunks), telephone poles and a fence line vanishing into white, light snow, muted grade; the lit window is the one warm note.

- Winter v7 (Tom: where is the wood chipper; line closer, cabin behind): a snow-capped towable wood chipper with a chip heap stands by the fir; the line now runs in the foreground from a peeled-log post to the fir, the cabin set back behind it; camera closer.

- Harbour v2 (Tom: clean up the wharf; stop the big buildings; every theme a different setup): no shed; the line runs down a narrow pier between two pilings over open water; one trap stack, a rope coil, a bollard, buoys on the piling; the lobster boat moored alongside; a few small houses and a lighthouse far off in fog; camera off the landward end at a slant, iso from the sea side.

- Harbour v3 (Tom: "how is this coen -- villeneuve?"): Villeneuve grey fog, flat grey sky, calm dark sea, pier into the fog, a container ship as one faint broadside silhouette on the horizon (even deck load, never a skyline), muted grade; the slicker is the one colour.

- Harbour v4 (Tom: fix iso, more Villeneuve scale): camera drops to just over the deck with a wider lens; the pier runs to 90 m into the fog; iso hides the boat and lays a grey mist veil over the sea, so the pier floats in a void.
