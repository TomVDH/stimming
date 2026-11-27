---
# stimming-kg9m
title: 'Toy: Cuttlefish skin'
status: completed
type: feature
priority: normal
created_at: 2026-11-15T08:50:57Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

New Lab toy (lab batch 10, group F: quiet to use, rich to look at). Idea 340: colour cells pulse in waves that follow your pointer. A close view of living cuttlefish skin: chromatophores (yellow, red-brown, black pigment sacs) open and close over a shimmering iridescent layer. At rest, dark bands drift over the skin (passing cloud). The pointer is a thing the animal watches. Tier: raw WebGL2 (an activation field in a texture, a cell shader). Bar v2.

- [x] Blockout: page skeleton, Bar v2, activation field, cell shader
- [x] Look: chromatophore layers, iridophore sheen, leucophore base, grade
- [x] Displays: Cloud, Mottle, Zebra, Flash; pointer waves, flash on a quick move, copy on hold
- [x] Sound: faint, wet, synthesized, muted by default
- [x] Performance: idle stop, whenVisible, detail level, slow-frame step, reduced motion
- [x] QA in the browser pane: console, gesture, controls, sound, 1280, 375 x 812, 812 x 375
- [x] Toy doc docs/toys/cuttle.md
- [x] Handoff files: toys-entry.json, menu-li.html, menu-icon.js

## Summary of Changes

- `cuttle/index.html`: a new Lab toy on Bar v2, raw WebGL2. Three lattices of chromatophores (brown-black, red, yellow), one state texel per cell on a damped spring with its own stiffness, bias, wander and twitch. Instanced discs add optical depth into one buffer; a composite lays leucophore white, dusky flesh, an iridescent film, a soft halo and shadow, a pool of light, wet glints, ink, vignette and grain.
- Displays: Cloud (bands roll across), Mottle (blotches, white squares, a rust and gold patchwork, raised papillae), Zebra (pulsing bars), Flash (pale and iridescent, a dark flush every few seconds). A new display spreads out from the pointer.
- Gestures: moving sends rings of colour; a click sends a strong pulse; holding still grows a stare (eye spot, white square, or bars curled into rings); a fast flick startles the skin pale, then dark. Ink jets a sepia cloud that curls away while the skin flushes dark, then blanches.
- Sound: faint wet voices on `audioKit`, muted by default.
- Performance: `detail()` pixel ratio and slow-frame step; idle sleep after 90 s (20 s with reduced motion); `whenVisible`. 4.4 ms a frame median at 2496 x 1504 (High) in the pane.
- `docs/toys/cuttle.md`: the toy doc.
- Handoff files for the menu tile, its GSAP hover block and the `toys.json` entry are in the lab10 scratchpad folder.
