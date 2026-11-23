# Jellyfish tank (`jellyfish`) plan

Status: built, Lab (2026-11-22); colours and starfield (2026-11-23) · Bean: `stimming-fzcl`

Idea 80, group F: jellies pulse in a blue-lit tank; tap the glass and they drift away.
Tom, 2026-11-22: "Build it, keep apart". It stays apart from Aquarium (`aquarium/`, a planted fish tank): no fish, no plants, no gravel.
Tom's brief for the batch: an MVP at high fidelity, with icons, the intro emblem and Bar v3. One hero moment, finished. No extra modes.

## The hero moment

1. A round window into a dark gallery wall. Behind it, a round-flow (kreisel) tank of deep blue water, lit from above.
2. Jellies of four kinds pulse their bells: a quick close, a slow open. The current carries them round the tank in a slow circle.
3. Each bell glows at its rim. The four gonad rings and the radial canals show through the bell. A fringe of fine tentacles and four frilly oral arms trail and sway behind it.
4. Tap the glass: a soft ring runs out from the tap across the window and through the water. Marine snow shoves away from it.
5. The nearest jellies flinch: two or three fast, deep pulses that drive them away, bell first. Their tentacles stream behind.
6. They calm, turn back with the current and settle into the flow.

## Defaults (open questions, answered here)

| Question | Default | Why |
|---|---|---|
| 3D or flat | 3D, three.js 0.170 (Scene type), a fixed front view | A translucent bell needs a view angle: the rim glows where the shell is seen edge-on, and that changes as each bell turns and pulses. Tentacles trail in depth. |
| Presentation | One round window in a near-black wall, centred, as a kreisel tank seen in a public aquarium. The window is the glass you tap. | A kreisel tank is a drum: round from the front, with the flow going round it. The round window says "jelly gallery" without a prop, and keeps it apart from Aquarium's rectangle. |
| Light | Deep blue from above: light shafts in the upper water, a brighter top, a dark floor of the drum. Blue spill on the wall round the window. | The gallery look of the reference photos. Light carries the scene. |
| Jellies | Six large jellies of four kinds (sea nettle, moon, purple-striped, egg-yolk) and a starfield of 700 small ones | Tom, 2026-11-23: other kinds, colours, a starfield of small ones, as at the Vancouver Aquarium. |
| Slider | Flow: the speed of the current | It shapes the whole drift and adds no mode. |
| Action | Tap (Space): taps the glass near a jelly | A key form of the hero gesture. |
| Dutch name | Kwallentank (draft) | Tom sets it. |

## Tech

- **Sim** (`sim.js`, no three.js): each jelly has a position, a velocity, a swim axis (bell apex) and a pulse phase. The contraction curve is quick (28% of the cycle) then slow. Thrust comes from the closing bell, along the axis. Water drag pulls the velocity to the current. The current circles the drum axis, strongest near the wall. Soft walls and soft spacing keep jellies apart and inside.
  - Tentacles: sixteen guide chains round the rim and four oral-arm chains per jelly, verlet with drag relative to the water and a rest-shape spring. The renderer spreads each kind's tentacles between the guides.
  - Tap: a pressure ring leaves the tap point. When it reaches a jelly it flinches: phase snaps to the close, the period drops, the stroke deepens, and the axis turns away from the tap. The flinch decays over about 5 s.
- **Scene** (`scene.js`): a full-screen water backdrop, marine snow as points carried round by the current, bells as lathe meshes shaped in the vertex shader, tentacles and oral arms as screen-facing ribbons read from a float texture, additive light. Bloom with a threshold. A grade pass draws the window: the wall, the spill, the glass rim highlight, the tap ripple, vignette and grain.
- **Frame loop:** lively for 1.5 s after input and while a flinch runs; drifting at 30 fps; asleep 60 s after the last input (the motion eases to a stop over 2 s). Hidden stops at once.
- **Reduced motion:** no drift and no ambient pulse. A tap still flinches the near jellies, once and softly, and the scene stops when they settle.

## Sound

Raw Web Audio on `audioKit()`, muted by default.

- Bed: the tank's pump hum (low, steady) and the water's hush, which follows Flow.
- Tap: a knuckle on thick acrylic: a dull thud, a short click and a low boom in the water. It pans with the tap.
- Flinch: a soft swoosh for each flinching jelly as the ring reaches it, panned with the jelly.

## Tasks

1. Blockout: window, backdrop, bells. Screenshot at 1280 x 800.
2. Bells, tentacles, oral arms to high fidelity.
3. Tap: ring, flinch, settle.
4. Sound. Bar v3.
5. Icon round, emblems, Lab entry.
6. QA Q1 to Q10; `docs/toys/jellyfish.md`.
