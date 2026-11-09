---
# stimming-o6te
title: 'Toy: Lit motorway'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T09:16:39Z
updated_at: 2026-11-09T12:10:00Z
---

Build Lit motorway from docs/plans/motorway.md. It starts in the Lab. One buzzing sodium lamp over a motorway overpass; the zoom pulls out through the dark until the whole Belgian motorway network glows as orange ribbons. Sections strike up pink then orange; traffic streams; haze and fog catch the light.

- [x] Plan: docs/plans/motorway.md
- [x] Task 1: blockout: network, ribbon, lamp sprites, land, close set, sky, fog, tilt-shift and bloom; zoom by slider, scroll, pinch
- [x] Task 1: toys.json entry and Lab menu entry with a pointer-reactive icon
- [x] Task 1: the full network (Tom, 2026-11-09): every A road and ring, 1,760 km lit, 36 interchanges
- [x] Task 1: OSM bake (Tom, 2026-11-09): motorways, trunk and primary roads, true border, faint outline, neighbours fade out; tiled and culled for speed
- [ ] Task 1: stills at 1280 and 375 px; checkpoint with Tom
- [ ] Task 2: strike-up: sections, picking, ripple, warm-up, hot restrike, Switch, end-of-life lamp
- [x] Task 3: traffic from a baked weekday (jam points, rush hours), stop-and-go waves, red jams from altitude, Rush, clock
- [x] City flags: huge amber letters on a fading stripe, NL / FR / DE (EN), no coordinates
- [x] Start scene on the E19 by Mechelen: shaped overpass, guardrails, town domes; procedural wet road surface
- [x] Opening: overhead outline, then the network boots up from Brussels; zoom in to the evening jam by Mechelen
- [x] Far glow: rotated tilt-shift taps, softer bloom from orbit
- [x] Slip roads baked into roads.json: real cloverleafs
- [x] Rush is a day run from 04:00: clock, jam km, day bar; photocells at dawn and dusk; grey day
- [x] Styles: Sodium, LED, Tactical, Thermal; Air in Settings
- [x] Drag pans the map; scroll and pinch zoom toward the pointer
- [ ] Task 3: Traffic setting in Settings
- [x] Task 4: sound: buzz, strike tick, road hiss, altitude wind, blackout thump
- [ ] Task 5: Settings, frame loop, sleep, ladder; browser-pane checks
- [ ] Tom sets the Dutch name and IPA
- [ ] Record the session cost

- [x] Round 4: queue bars, jam heartbeat, sparkline, comparisons, lost hours, record flash
- [x] Trains on the main rail lines with delays; station boards and an excuse ticker in NL/FR/DE

- [x] Round 5: the dashboard becomes a study: panel with chart, scrub, ranked bars, rail share; proportional circles with hover curves

- [x] Round 6: printed-map overlays: atlas city names, hairline jam circles with leader labels, study as type on the map with a bare day line

- [x] Overhaul 1 (Tom's picks, 2026-11-09): Atlas setting, off by default, holds city names, jam circles, study and trains
- [x] Overhaul 2: zooming in always lands on the jam shot; embankments, poplar rows, an E19 sign gantry, overpass traffic
- [x] Overhaul 3: Blackout action; a ragged dark front from a random fault, then Brussels relights it, lamps restriking salmon
- [x] Overhaul 4: 375 px checked in the pane; coast line runs off screen
- [ ] Load time: the intro holds about 25 s in the browser pane while shaders compile; check on a real machine
- [x] Round 7: opens on the signs, slow anchored pull-out; cursor zoom; night only; Glow and Bloom detail; junction aprons fade; cars glide on the GPU between staggered steps
- [ ] Real traffic: `tools/miv/poll.py` samples the Flemish MIV loops (5,003) every 5 min for 24 h from 2026-11-09 12:27 MST into `~/Library/Application Support/stimming-miv/samples.csv`; then bake hourly speed and flow per road into roads.json, replacing the 15 hand jam points

