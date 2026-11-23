# Ice breach (`icebreach/`)

| | |
|---|---|
| Dutch | IJsdoorbraak /ˈɛizdoːrˌbraːk/ (draft) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.72 0.08 230)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 240, batch 9, grown to XXL: Tom's pick of 2026-11-23. Bean `stimming-ri97`. Plan: [icebreach.md](../plans/icebreach.md). This is stage 1, the MVP: one shot, one sub, one floe.

## Rules

- One fixed shot, one sub, one floe. Metres and seconds.
- Before the breach the floe is whole: the slabs pose on a cone over the sail and the cracks open in a star. After the breach every slab is a rigid body: buoyancy, the hull's push, the pack's pull back home, slab on slab.
- A release before the breach sends her down again. After the breach she comes up by herself; a tap dives.
- The slabs lock seven seconds after the sub stops, up or down. With the sub down, the hole freezes over in 50 s; then the floe heals whole.

## Direction

- 3D, three.js 0.170. Polar night: a low moon behind the sub and to the left, out of frame; stars; pressure ridges on the horizon in haze.
- A long lens: 17 degrees across from 115 m, the eye 5 m over the floe, as from a pressure ridge.
- References: the ICEX surfacings on Wikimedia Commons (USS Annapolis 2009, USS Connecticut 2018, USS Hampton) and the Akula photos and side plan. Slabs lean on the sail's base and ride its top.
- The sub: the Akula from Buoy Business (`akula.glb`, 546 KB), loaded as havoc loads it: bow to +x, 110 m long, the black core on the axis. The masts over the sail roof split off and rise once she is up. The paint is black anechoic tile, wet from the sea, with water running off as she rises.
- The floe: about 120 Voronoi slabs in a star round the sail, 1.0 m of ice under 0.24 m of snow by default. Snow tops with sastrugi and glints; blue cut faces with brine layers; algae-brown undersides.
- Water: black open water in the hole with rings from the breach; a flood that spills over the floe from the hole (a pipe-model grid at 0.8 m cells), leaves a grey stain, and soaks in; new ice greys the hole over.
- Plume: snow powder from the break and from each knock, and sea smoke off the open water. A K3 fluid with Fire's smoke shading, ported from Ship launch's `mist.js`.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Actions | Surface (hold, Space): she rises, the floe bulges and breaks. Dive (D) |
| Slider | Ice: the ice under the snow, 0.6 to 2.6 m; stored as `stimming.icebreach.ice`. It takes effect while she is down |
| Settings | Quality (shared), Reset (fresh ice, the sub down) |

| Input | Does |
|---|---|
| Hold the stage | Surfaces her; let go before the breach and she goes down |
| Tap the stage | Dives, once she is through |
| Drag | Turns the head a little; it eases back |
| Space, D, R | Surface (hold), dive, fresh ice |

## Sound

Web Audio on the shared kit, muted by default: the ballast's hiss, the floe's groan with a wandering pitch, cracks that ring in a falling chirp (sea ice is a dispersive plate), the breach's boom and volley of cracks, knocks of slabs on the hull and on each other, the rush past the hull, water in the hole, the vents for the dive. Mute and a hidden tab stop every pending sound; the context sleeps after the last one.

## Files

| File | Holds |
|---|---|
| `index.html` | Page skeleton |
| `main.js` | Bar, camera, sub states, frame loop, gestures, plume emitters, sound cues |
| `sub.js` | The Akula load, its measures, the masts, the top heightfield for slab contacts |
| `akula.glb` | The model, from Buoy Business |
| `ice.js` | The Voronoi floe, slab geometry, the bulge, the rigid-body step |
| `mats.js` | Snow and ice, hull, and water materials |
| `flood.js` | The flood grid over the floe |
| `plume.js` | The K3 fluid for powder and sea smoke, its march and composite |
| `sky.js` | Sky, moon, stars, far ridges |
| `sound.js` | Web Audio |

## QA

Captures: `docs/qa/icebreach/` (01 blockout to 12 Lab tile). Headless Edge on D3D11 (RTX 3070), 1280 x 800: under 1 ms of render CPU a frame; the slab step is about 8 ms through the breach and stops when the pack locks. Console clean, sound on and off. At rest the page draws no frames; with reduced motion it stops once the pack locks.

## Open

- Tom's look at the shot, the breach and the flood.
- The Akula GLB's licence is unknown (a Blockbench export from a zip); Tom said to use it on 2026-11-23. See `CREDITS.md`.
- The icon round `icebreach-1` has no pick yet; A is on the menu.
- The flood reads only as a dark band from this eye height.
- Later stages are in the plan; none is built.
