---
# stimming-h1gn
title: 'Series: East Van, Belgium, Lab sections'
status: completed
type: task
priority: normal
created_at: 2026-11-15T06:49:15Z
updated_at: 2026-11-27T07:19:52Z
---

Tom, 2026-11-14: place series (Belgium, East Van, more later). One series per toy; a place beats a theme. Sections show in the Lab only first. Toys with no series sit in one last section with no name.

- [x] Step 1: series.json (kind, order, eastvan, Belgium name), toys.json tags, East Van badge, AGENTS.md
- [x] Step 2: serieslab/sections.html with five new section styles (Spine, Lead tile, Tray, Ghost word, Pips) and motifs for eastvan, belgian, maths
- [x] Round 2 (Tom, 2026-11-14: more divider styles): F Tab, G Wave, H Beam, I Brace, J Contents
- [x] Style: Tom likes G Wave (2026-11-14); it opens first in the lab
- [x] Place icons redone with no hex: six motifs each for East Van and Belgium in three treatments (Colour, Tones, Solid); sheet at serieslab/places.html, drawings in serieslab/places.js
- [x] Superseded: the places sheet is a rejected direction
- [x] Tom, 2026-11-15: icons must share one style and geometry across all series, highly stylized. Three systems for all six series at serieslab/systems.html (drawings in serieslab/systems.js): Tiles (6 x 6 mosaic), Fold (silhouette with a diagonal fold), Line (one line, one dot)
- [x] Tom, 2026-11-15: all three systems are out ("all bad"); the hex icons and the places sheet are out too
- [x] Funk icons for East Van and Belgium (serieslab/funk.html, drawings in serieslab/funk.js): six skewed subjects each, knobs for wonk, colour and googly eyes
- [x] Depth forms on Tom's ask (slab, shaded, like the isometric blocks): Shaded, Slab, Block, Cube
- [x] Tom, 2026-11-15: the depth forms are the same drawings on other canvases. Native isometric block models at serieslab/iso.html (kit and models in serieslab/iso.js): East Van has Crow, House, Pole, Crane, Skunk, North Shore; Belgium has Frites, Waffle, Tricolour, Beer, Spheres, Gables
- [x] Ten more block models each (Tom, 2026-11-15): East Van adds Containers, Train, Trolley bus, Corner store, Raccoon, Rain, Silos, Couch, Blossom, Sulphur; Belgium adds Chocolate, Pralines, Crate, Belfry, Cobbles, Mussels, Frietkot, Motorway, Sprouts, Fountain
- [x] Tom, 2026-11-15: the voxel dioramas are "cute but not the style". Read icons/sheet.html: the Isometric block is one bold block with face art. New set at serieslab/blocks.html (kit and icons in serieslab/blocks.js, on the sheet's cube geometry): East Van has House, Crow, Containers, Rain, Trolley bus, Peaks; Belgium has Tricolour, Waffle, Frites, Beer, Chocolate, Frietkot
- [x] Dutch-angle photo framings as a second style (Tom's ask): serieslab/shots.html, six shots each, knobs for tilt and frame
- [x] Tom, 2026-11-15: yes to the single-block style, more of these. Ten more each: East Van adds Corner store, Bin, Couch, Blossom, Train, Pole, Nigiri, Log, Ferry, Skunk; Belgium adds Crate, Cobbles, Pralines, Belfry, Gable, Speculoos, Bread machine, Motorway, Canal, Spheres
- [x] Tom, 2026-11-15: East Van takes the Wires shot with a thin border (no print border); Belgium the same, drawn better. Thin frame is the default; Belgium's Frites, Gables, Cobbles and Spheres shots are redrawn (silhouette, vivid dusk sky); the sections lab shows the shots
- [x] Tom, 2026-11-15: the redrawn Belgium shots are still not good. All six replaced by silhouettes on the Wires recipe (one dark shape from below, plain sky, thin lines, one accent): Belfry, Spheres, Windmill, Lamps, Gables, Frites
- [x] Tom, 2026-11-15: add a flag for Belgium, in addition to the six. Flag shot added: the tricolour from straight below, on a pole
- [x] Tom, 2026-11-15: try hexagonal icons and outline crops. Frames added to the shots: Hex, Hex flat, Hex ring (outline apart from the crop), Hex askew (outline turned 10 degrees), Circle; a Line knob (Light or the series colour)
- [x] Tom, 2026-11-15: the crop is Hex ring; East Van is Wires
- [x] Tom, 2026-11-15: Belgium is the Flag, with the flag centred and a different hue from East Van; redrawn on a turquoise sky
- [x] One shot per theme series on the same recipe: Atom, Star trails, Drips, Compass
- [ ] Tom reviews the four theme shots
- [ ] Remove the rejected lab pages (places, systems) once the pick ships
- [x] Step 3: the Lab view (/?lab) shows the series as sections under the Wave divider with Hex ring shot icons; shots live in shared/series/shots.js; series.json names each icon

## Categories proposal (Tom, 2026-11-15: more categories; the vistas get a fancy icon)

- [x] Proposal in serieslab/proposal.js: five new series (Vistas, Poke & pop, Light & glass, Wild, Odd one out) and a series for all 88 toys; shown on both shelves at serieslab/categories.html
- [x] Vistas has the fancy icon: four depth layers and a frame that tilts with the pointer, a gold double ring, sparks, a sheen (shared/series/shots.js, `fancy` and `tiltShots`)
- [x] Shots for the four other new series: Poke, Prism, Dandelion, Saucer
- [x] Tom, 2026-11-15: likes a 3D wobblable depth texture. shared/series/depth.js: the Vista as a colour picture and a depth map, a raw WebGL2 parallax shader with relief light, a spring that wobbles, a kick on press; it draws only while the spring moves. Demo at serieslab/depth.html; the proposal page uses it for Vistas, with the layered SVG as the fallback
- [ ] Tom rules on the categories, the names and the sorting; then series.json and toys.json change

## Tom's rulings, 2026-11-15 (later)

- [x] No gold border and no sparks; every series wears the same thin ring
- [x] No depth icons: shared/series/depth.js and serieslab/depth.html are deleted; the layered tilt icon and its sheen are gone too
- [x] East Van Wires and the Belgium Flag zoomed out a little (a shot may set `zoom`)
- [x] Vista and the eight other shots redesigned as whole, centred subjects: Vista (a film still), Atom, Moon, Blob, Compass, Button, Prism, Dandelion, Saucer; series.json now names Moon and Blob
- [x] Alternate Vistas shots on Tom's ask, agnostic of the toys (his rule): Peak, Viewer, Road, Layers, Frame, Clapper, Glasses, beside the film still. Window, Viaduct, Lighthouse and Launch pointed at toys and are out
- [x] Tom, 2026-11-15: different colours for Vistas. Eight colourways (Teal, Day, Sand, Ember, Mint, Mono, Night, Rose); each Vistas shot wears its own, and the sheet has a Vistas colours knob
- [x] Tom, 2026-11-15: Vistas takes Layers in Mint (serieslab/proposal.js)
- [ ] Tom reviews the other redesigned shots

## Dividers again (Tom, 2026-11-15)

- [x] No counters in the dividers
- [x] A new round of divider styles round the hex icon, on a switch at serieslab/categories.html: Wave, Chain, Thread, Plate, Stack, Underline. The old divider lab (sections.html) is deleted
- [x] The proposal sorts the ten new Lab toys too (98 toys)
- [x] Tom, 2026-11-15: "a bit more Awwwards". Three editorial styles added to the switch: Editorial (hairline, huge name, icon right), Centre, Side (the heading stays at the left while its toys scroll); headings come in on scroll; the proposal frame now scrolls by itself
- [x] Tom, 2026-11-15: the divider is the Wave. A Series switch on the menu turns the dividers on or off and regroups the toys; the main shelf opens flat, the Lab in sections (stimming.series)
- [x] The sorting is applied: series.json has eleven series, toys.json gives every toy one (bench has no tile). The proposal pages are deleted
