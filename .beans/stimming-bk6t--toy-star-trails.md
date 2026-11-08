---
# stimming-bk6t
title: 'Toy: Star trails'
status: completed
type: feature
priority: normal
created_at: 2026-11-04T14:00:00Z
updated_at: 2026-11-08T11:36:55Z
---

Build Star trails from docs/toy-dev-plan.md, section 1. It sits on the main shelf as beta. It follows the Look rule: one horizon line, no props.

- [x] Plate: K1 accumulation and decay, soft line segments with ramped joins
- [x] Sky: gradient, airglow, a turning Milky Way, live twinkling stars, ridge, grain
- [x] Skies: North (pole star), South (empty pole), Equator (stars rise straight up)
- [x] Bar: sky chips, Exposure slider, Clear, Settings (stars, colour, meteors)
- [x] Hold or Space opens the shutter; reduced motion draws the arc at once
- [x] Fidelity: exposure energy per second, star colour, scintillation, bloom, darker sky, light dome, tapered meteors
- [x] Exposure redraws the plate live: short dashes to long sweeps
- [x] Checkpoint 1: Tom reviews the stills
- [x] Sound: shutter click, a pad that opens with exposure, meteor ticks
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [x] QA: 1280 and 375 px, clean console, idle stop, hidden tab stops the loop
- [x] Record the session cost: not metered in the app; the 2026-11-08 polish session ran about two hours

- [x] Icon and emblem: direction A is the menu icon and the intro emblem

## Summary of Changes

Star trails is signed off on 2026-11-08 and sets version 0.6 Sterrensporen.

- Fidelity: exposure energy follows dwell time; star colour, scintillation, two-level bloom, a darker sky, a town glow and tapered meteors.
- Exposure redraws the plate live, from short dashes to long sweeps.
- Sound: a two-click shutter, a pad that opens over the exposure, and meteor ticks.
- Icon: a lit porthole with five trails ringing the pole; the emblem is a heavy ring, three bold trails, the pole and a hill.
- QA: chips, actions, Space, hold, idle stop, hidden stop and resume, reduced motion, 1280 and 375 px, no errors.

The plan's blinking aircraft is not built.
