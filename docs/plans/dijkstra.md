# Dijkstra flood (`dijkstra`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Watch the shortest-path algorithm think, as light. Tap a node: light floods out through a glowing web in exact Dijkstra order. Drag a target: the shortest path snaps on, hot and pulsing, and re-routes as you move.

**Architecture:** raw WebGL2, as Lichtenberg burn. The CPU builds the web (Poisson disc, Delaunay, Voronoi) and runs Dijkstra once per flood, in well under a millisecond. The GPU animates the flood from one number, the wave clock `W`: every face, edge and node computes its own arrival time and lights when `W` passes it. Bloom finishes the frame.

**Tech stack:** raw WebGL2, Web Audio through `audioKit()` (Tone.js only if the chord needs it).

**Spec:** Tom, 2026-11-09: "I want a VERY snazzy dijkstra algo toy". Batch rules in [README.md](README.md). Bar v2 in [bar-v2.md](bar-v2.md).

| | |
|---|---|
| Size, estimate | M · $20 to $35 |
| Kits | bloom and pass helpers copied from Lichtenberg burn; no kit lift |
| Before the build | nothing |

## The webs (Tom, 2026-11-09)

Tom asked for different looks: city grids, circuit boards and natural networks. The top-left choice picks one of four webs. Each has its own generator, ramp, ground and stroke style.

| Web | Generator | Look | Faces |
|---|---|---|---|
| **Cells** (default) | Voronoi of a Poisson disc; cell size varies by noise | Ivory to teal to indigo; hairline isochrone contours | Glass panes tinted by distance |
| **Streets** | A real city grab from OpenStreetMap (see below); the noise-warped grid is the fallback when no grab loads | A night city: sodium streets light the ground, roofs, water and parks round them | Buildings, water and green as shaded masks |
| **Circuit** | A lattice with 0 and 45 degree traces; chips with pins; power rails every seventh row (wide, 0.7 cost) | Pale gold to olive to teal on a dark green mask; dull copper unlit; hard-edged traces; vias on junctions and ends | Chips; a status light shows when current arrives |
| **Roots** | A relative neighbourhood graph of a Poisson disc plus a few loops; links curve; trunks thicken by the tips they feed and carry light faster | Pale green to teal to slate on soft soil | None |

Why Cells stays the default: degree-3 junctions make paths wind, and the panes give the heat map an area.
All four are built at the stage's own aspect in under 30 ms at 1280 px.

## Streets: real city grabs (Tom, 2026-11-09)

Tom: "realistic streets based on random OpenStreetMap grabs; cache at least 120".

- `dijkstra/maps/fetch.py` asks Overpass for a 1300 m square near each of about 190 city centres, with a seeded random offset.
- It keeps streets (motorway to service, no parking aisles), buildings (the largest 3500), water (with islands as holes), rivers, canals and green.
- Streets split at junctions; bends simplify (RDP, 1 m) and become hidden joints. Only the largest connected part stays.
- Coordinates are integer deltas at 0.5 m (buildings at 1 m). One grab is about 200 KB raw, 75 KB gzipped.
- `maps/index.json` lists the grabs. The page picks one at random; Shuffle flies to another city.
- Road class sets width and speed: motorway 2.6 px and 0.5 cost, down to service 0.7 px and 1.15 cost.
- Credit: a quiet `CITY · © OPENSTREETMAP` link at the bottom right, as the ODbL needs.

**Shading.** Areas fill an RGBA8 mask through the stencil (even-odd fans): R buildings, G water, B green, A a tone per building. Four blurred levels follow. The final pass shades a night city:

| Surface | Shading |
|---|---|
| Ground | Moonlight with occlusion near buildings and a moon shadow down-right; the street light spills onto it |
| Roofs | A tone each; a bevel lit on the moon side; eaves catch the street light |
| Water | Near black; it mirrors the street light in moving ripples |
| Green | A dark canopy texture, lit softly |

The bloom chain has no threshold on a city, so lit streets light their surroundings. Before the flood the city is moonlit and dark; the flood switches the streets on.

## Look: demure and elegant (Tom, 2026-11-09)

Tom: "way too flashy; we want demure and elegant", with more fidelity.

- Strokes are hairlines at the screen's own pixels (pixel budget 4.2 M). Only avenues, rails and trunks are wider.
- Ramps are muted OKLCH, chroma 0.08 or less.
- The front is a hairline isochrone with a faint trailing tint, not a white band.
- Ignition is a soft brightening; queued nodes show a hairline ring; scouts and meeting points are faint.
- The path is a fine warm line with slow pulses. Bloom has a high threshold and a low default.

## The shot

A dark stage. A fine web covers it, edge to edge, in faint cold hairlines.
One source glows. Light has flooded out from it, so lines near it are ivory and far lines settle into the web's far colour, with faint contour lines.
A shortest path runs from the source to a target ring as a fine warm line with slow pulses.
The first frame is that picture, with the wave at 55 % of the web. When the intro clears, the wave runs on and the path locks with a chord.

## Hero moments

1. **The flood.** Tap a node. Light leaves it at once and pours outward through the web. The front is a hairline isochrone sweeping across the faces; behind it the faces settle to their heat colour.
2. **Ignition.** Each node brightens softly as the front reaches it, in exact Dijkstra pop order, then settles to its distance colour.
3. **Relax scouts.** As a node settles, a thin fast spark runs out along each of its edges to the neighbour: the relaxation. The neighbour starts to shimmer: it is in the queue.
4. **Fronts collide.** On an edge outside the path tree, light enters from both ends and meets inside the edge. A small spark marks the exact meeting point.
5. **The lock.** When the front reaches the target, the path snaps on from source to target in 0.2 s with a flash, then pulses ride along it. A chord sounds.
6. **Re-route.** Drag the target. The path jumps to each new shortest route at once, with a brief flash on the new segments.

## Loop

- **Tap:** a new source at the nearest node. The web re-floods from it. The target stays, and the path locks again when the front arrives.
- **Drag:** the target follows the pointer, node to node. The path re-routes from the finished distance field, with no re-flood.
- **Hold, then drag:** paint mud on the web. Edges under the brush get heavier, the web re-floods from the source, and the path bends around the mud.
- **Space:** re-flood from the current source.

## Physical and algorithmic details (the pizzazz)

- **Pop order is exact.** A node ignites when `W` passes its distance, which is exactly the order Dijkstra pops it from the queue.
- **Light runs at the edge's cost.** Along an edge from `a` to `b`, the arrival time at fraction `s` is `min(dA + s·w, dB + (1 − s)·w)`. Muddy edges carry light slowly, so the front visibly drags through mud.
- **Meeting sparks are true.** On a non-tree edge the fronts meet at `s* = (dB − dA + w) / 2w`.
- **Tentative distances settle.** A queued node shows its tentative distance as a ring colour. When a better route relaxes it, the ring colour jumps to the final value. When it pops, the ring collapses into the ignition flash.
- **Contours are exact isochrones.** The faint lines on the panes sit at equal distance steps, so they read as the wavefront's past positions.

## Search (Settings)

Three, each kept because it adds joy, not only teaching.

| Mode | What | Why it stays |
|---|---|---|
| **Flood** | Dijkstra from one source | The core toy. |
| **Seek** | A* to the target, with the straight-line heuristic | The light leans toward the target as a narrow beam. A ghost outline shows how far Dijkstra would have spread, so the saving is visible. |
| **Race** | Up to three sources, each its own hue | The fronts race and lock into territories. Seams glow where they collide. Tap adds a source; the fourth tap replaces the oldest. |

**Drift** (an animated weight field) is a Settings toggle, not a mode. A slow noise field breathes the edge costs; Dijkstra re-runs each frame on the settled web, so the heat map shimmers and the path wriggles. It is calm ambience, so it sits behind a toggle.

## Bar (Bar v2)

| Slot | Control | Content |
|---|---|---|
| Top left | Choice (segments) | Web: Cells, Streets, Circuit, Roots |
| Bottom left | Actions | Shuffle (a new web, key `S`), Clear (wipe the mud, key `C`) |
| Bottom right | Slider | Speed: how fast the front travels |
| Bottom centre | Keys | `[CLICK] source` · `[DRAG] target` · `[HOLD + DRAG] mud` · `[SPACE] flood` |

Four visible controls: one choice, two actions, one slider.

**Settings sheet:** Search (Flood, Seek, Race), Contours (Off, On), Drift (Off, On), Glow (slider). All persist; the Web choice persists too. Site Quality row. Reset in the footer (Clear is shown).

## Tech

**Web.**

1. Poisson disc sites: dart throwing on a spatial hash. Radius `r(x, y)` runs 34 to 64 CSS px by value noise, so the web has knots and fields. A phone uses 26 to 48.
2. Guard sites on a ring outside the stage bound the edge cells.
3. Bowyer-Watson Delaunay, O(n²), fine for under 1,000 sites.
4. Voronoi: one node per triangle at its circumcentre; one edge per shared triangle side. Nodes far outside the stage drop out.
5. Faces: each inside site's cell is a fan from the site to its circumcentres in angle order.
6. Streets, Circuit and Roots: see The webs.

**Weights.** `w = length · (1 + mud)`. Mud lives in a CPU grid of 8 CSS px cells, sampled at the edge's midpoint and quarter points, and in an R8 texture for the look.

**Dijkstra.** A binary heap over node ids. It records `dist`, `parent`, `tEnter` (the distance of the first settled neighbour) and `tent0` (the first tentative distance). A* records the same in f order. Race runs one multi-source pass and records the winning source per node.

**Wave clock.** `W += speed · dt`. The flood ends at `W > max dist + tail`; then the loop drifts or sleeps.

| Pass | Target | Blend | What |
|---|---|---|---|
| Faces | scene (RGBA16F) | none | fan triangles; arrival time per vertex, rim weight per vertex; heat colour from a 256-texel OKLCH LUT; the front band; contours |
| Edges | scene | add | instanced capsules; arrival time per fragment; head flare; relax scouts; meeting sparks; unlit edges faint and cold |
| Nodes | scene | add | instanced quads; dim dots, queue shimmer rings with tentative colour, ignition flash |
| Path | scene | add | instanced capsules along the path; snap sweep, flash, travelling pulses |
| Markers | scene | add | source halo, target reticle |
| Bloom | 5 mips | | threshold, 13-tap down, tent up (from Lichtenberg burn) |
| Final | screen | | tone map, vignette, grain |

**First frame.** A seeded web, source and target. `W` sits at 55 % of the web, drawn once before `ready`.

## Sound

- **Pops:** each ignition plays a soft pluck pitched by distance on a pentatonic scale, high near the source and falling outward, so a flood is a falling arpeggio wave. At most three a frame; panned by x; level and pitch jittered.
- **Scouts:** a faint tick per relax burst, very quiet.
- **Lock:** a chord on the path lock, voiced by the path's length: a short path is bright, a long one low and wide.
- **Re-route:** a short glassy blip per path change while dragging.
- **Mud:** a low soft thud per brush step.
- Mute by default; the kit sleeps after the flood ends.

## Finesse

- The tap answers in the same frame: the source lights before the first node pops.
- The front is never a flat ring: it frays in knots and drags in mud.
- Pulses ride the path at constant speed in screen space, whatever the path's cost.
- The bloom never washes the screen: a threshold and a cap on the ignition flash.
- No two webs match: Shuffle reseeds sites and density noise.

## 375 px recompose

The web is built at the phone's own aspect, with smaller cells, so it keeps about 90 sites. The first-frame source and target move to suit portrait.
Touch: tap sets the source; drag moves the target; hold then drag paints mud.
The choice moves bottom left as a stepper, Shuffle and Clear bottom right, Speed into Settings.

## Reduced motion and idle

- **Reduced motion:** no shimmer and no flicker; ignition flashes are soft; the path draws without the sweep; pulses move at half speed.
- **Idle:** lively while the wave runs or a drag is live; drifting (30 fps) while the path pulses or Drift runs; asleep 60 s after the last input, after a 2 s ease. Hidden stops at once.

## Review focus

1. **Float targets:** no `EXT_color_buffer_float` shows `.fail`.
2. **Web build time:** under 30 ms at 1280 px. Shuffle builds the new web in one frame.
3. **Resize:** the web rebuilds at the new aspect; source and target keep their relative place; the flood shows as finished.
4. **Disconnected nodes:** never happen in a Voronoi web inside the stage, but a node with no path gets no light and no target.
5. **Ignition flash:** cap it, so a dense knot does not white out the bloom.

## Tasks

### Task 1: Blockout (checkpoint)

**Files:** Create `dijkstra/index.html` and the bean; add the `toys.json` entry and the menu Lab `<li>` with its `toys.dijkstra` hook.

**Produces:** the web builder, Dijkstra, the wave clock, the faces, edges, nodes, path and marker passes, bloom and the final pass. Tap and drag work.

- [x] Poisson sites, Delaunay, Voronoi web, faces.
- [x] Dijkstra; wave clock; faces, edges, nodes, path, markers, bloom, final.
- [x] Tap sets the source; drag moves the target; Space re-floods. Bar v2 shell with the choice, Speed, Shuffle and Clear wired (Seek and Race fall back to Flood for now).
- [x] First frame: seeded web, source and target, wave at 55 %.
- [x] Syntax check, clean console, stills at 1280 and 375 px. **Checkpoint with Tom.**
- [x] Commit: `Dijkstra flood: blockout, light floods a Voronoi web`.
- [x] Round 2 (Tom): four webs (Cells, Streets, Circuit, Roots) on the top-left choice; Search moves to Settings; the demure, high-fidelity look.
- [ ] Round 3 (Tom): Streets from 120 or more cached OpenStreetMap grabs; the shaded night city. Stills. **Checkpoint with Tom.**

### Task 2: Finesse and mud

- [ ] Relax scouts, meeting sparks, queue shimmer with tentative colour, ignition cap, path snap and re-route flash.
- [ ] Hold-then-drag mud brush; mud look; re-flood; Clear sweeps the mud away.
- [ ] Stills of the flood, a lock, a re-route and mud.
- [ ] Commit: `Dijkstra flood: scouts, sparks and mud`.

### Task 3: Seek and Race

- [ ] Seek: A* order, the beam, the Dijkstra ghost outline.
- [ ] Race: multi-source pass, source hues, territory seams.
- [ ] Commit: `Dijkstra flood: Seek and Race`.

### Task 4: Sound

- [ ] Pops, scouts, lock chord, re-route blips, mud thuds. Q9.
- [ ] Commit: `Dijkstra flood: the arpeggio wave`.

### Task 5: Settings, frame loop and QA

- [ ] Search, Contours, Drift, Glow; persistence. Frame loop states, watchdog ladder, reduced motion.
- [ ] Q1 to Q10 in the browser pane. Tick the bean and record the cost. Commit.

## Kit handoff

The web builder (Poisson, Delaunay, Voronoi) and the wave-clock passes, marked as sections, suit a later graph or flow toy.
