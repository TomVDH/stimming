---
# stimming-os3c
title: 'Subway: last train of the night, PBR, interior, grime, air'
status: completed
type: feature
created_at: 2026-11-23T08:39:45Z
updated_at: 2026-11-27T07:19:52Z
---

Purpose: the last train of the night. Cabin is nearly empty; the grime and the light tell the hour. Scope: (1) PBR surfaces: GGX specular with roughness and metalness per surface kind, replacing Blinn-Phong shin. (2) Interior models: rounded seat cushions and armrests, pole grease rings, a dead-and-flickering roof strip, a 7-segment station clock on the end wall reading the hour. (3) Grime: floor gum and scuffs, dirty glass film, handrail grease, wall dirt low down. (4) Atmosphere: cabin haze, dust in the lamp light, cooler night grade. Touches subway/index.html only. Visual changes shown to Tom per pass.

## Todo

- [x] Purpose: last train of the night (Tom, 2026-11-23)
- [x] Pass 1 PBR: GGX specular, Schlick fresnel, metal flag, roughness from shine plus noise
- [ ] Pass 1: Tom's look; highlight level on poles and glass
- [ ] Pass 2 grime: gum and scuffs on the floor, glass film, handrail grease, low wall dirt
- [ ] Pass 3 interior: rounded seat cushions and armrests, roof strip flicker, 7-segment clock on the end wall
- [ ] Pass 4 air: cabin haze, dust in the lamp light, cooler night grade
- [ ] Browser check at 1280 and 375, console clean (pass 1: 1280, console clean)

## Window and light pass (2026-11-23)

Tom's ask: Train Ride's window look (smears, grime, outside blur), fewer lights, less bloom and glow.

- [x] Glass film: vertical wipe streaks, dust band low down, fine speck; lamp light smears down it
- [x] Outside blur: the tunnel lamp is wider and softer
- [x] Fewer lamps lit: on-chance 0.8 to 0.4 (normal), 0.14 to 0.05 (dark), dense 1.0 to 0.75
- [x] Bloom: strength 0.75 to 0.22, threshold 0.85 to 0.92
- [x] Lamp glow: pane glow and wall pool cut; cabin power 22 to 16
- [x] Browser check: window shot at square view, console clean
- [ ] Tom's look; Train Ride's full glass (drops, fog, bokeh) not ported

## Glass smears pass (2026-11-23)

- [x] Smears: straight vertical runs, one random cell each (0.09 m), random width and start height, running up to the top edge
- [x] Tiling: fine speck on 2D value noise removed; the lattice showed as a grid
- [x] Browser check: Window shot, console clean; lamps were off in this frame, so the smears read faint
- [ ] Tom's look at smears with a lamp passing

## Glass fidelity pass, after Train Ride (2026-11-23)

Tom: the tiling was the glass speck; the wipes must not run straight down; raise the fidelity; reference Train Ride.

- [x] Straight smears out; cloth wipes in: arcs about an elbow below the pane, ragged edges, fibre lines along each arc
- [x] Hand smudges: warped fbm (turns each octave), strongest at hand height; a flat hand print on half the panes
- [x] Dust along the sill with a ragged top edge
- [x] After Train Ride: hairline scratches (three sizes) and cleaning swirls that glint across the line to the lamp; the lamp's image on the pane drives the glints
- [x] Grease blurs the tunnel behind it and scatters lamp light into a veil
- [x] Fix: hash precision banding (stair-steps, contour lines) from large noise coordinates; seeds under 10, cell ids wrap at 512
- [x] Browser check: Window shot, lit frames, console clean
- [x] Glass in its own material: one quad per opening, 4 mm outside the wall; the wall discards inside the openings
- [x] Compile time on D3D11: every shader loop count adds a uniform zero (DYN), so fxc keeps loops and does not fail to unroll and retry twice
- [x] Measured with the pane on screen: first frame 4.1 s; the committed page still had a blank stage after 61 s. An isolated link: cabin shader 0.8 s, glass 0.5 s
- [ ] Frame rate: 33 fps median, 25 mean, in the Window shot at 992 x 720 in the app pane; no baseline for the committed page yet
- [ ] Tom's look
