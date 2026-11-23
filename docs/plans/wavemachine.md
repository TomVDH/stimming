# Wave machine (`wavemachine`) plan

Status: built, Lab (2026-11-23) · Bean: `stimming-40u6`

Idea 128, group A, a lab demonstration: flick a row of rods; the wave runs out and bounces back. Source: the shortlist row in `docs/toy-ideas.md`.
Tom's brief for the batch: an MVP at high fidelity, with icons, the intro emblem and Bar v3. One hero moment, finished. No extra modes.

## The real thing

The classroom torsion wave machine (Bell Labs, 1959). A long row of steel rods, each welded at its middle across one taut torsion wire. Weights sit on the rod ends. The wire runs on a low rail between two end stands.
Turn one rod and the wire twists the next: a twist wave runs down the line. The rod ends trace a travelling sine.
Reference: University of Maryland and University of Colorado demo pages, and classroom photos of the machine on a bench. Rods are 23 to 46 cm; a section is about 92 cm long.

## The hero moment

1. The machine lies on a dark bench under one warm lamp. A pulse is already in flight on the first frame.
2. Grab any rod by its end and drag it up or down: the rod turns on the wire, and the twist pulls its neighbours along.
3. Flick it, or tap it: a clean pulse leaves the rod. A rod in the middle sends two half pulses, one each way.
4. The pulse runs to the far end. The clamp there holds the last rod, so the pulse comes back upside down.
5. It runs back and slowly dies. Flick again while the first returns: the two pass through each other.

## Defaults (open questions, answered here)

| Question | Default | Why |
|---|---|---|
| 3D or flat | 3D, three.js 0.170 (Scene type). A high three-quarter view along the machine from its near end | The wave is a twist. Only depth shows rods that turn about one wire; a flat side view hides the twist and shows a line of dots. In perspective the rod ends trace two sines, one above the other, and the rods' shadows on the bench comb with them. |
| Far end | Clamped: the last rod is held | The pulse returns inverted. That is the moment that says "a reflection happened", and it is the classic lesson. A free end returns the same pulse, which reads as a bounce of the same thing. |
| Near end | Free | The hand works there. A pulse that comes back to the near end reflects upright and goes out again. |
| Rods | 96 chromed steel rods, 46 cm, 18 mm apart, brass end weights | The long-rod section of the reference machines. Brass takes the warm key, so the travelling sine reads as a line of warm glints. |
| Wire | A flat steel band, drawn as a twisted ribbon | The twist shows in its moving highlight. |
| Slider | Weights: small to large end weights | True physics: heavier ends turn slower, so the wave runs slower. The weights grow on the stage. No new mode. |
| Damping | Amplitude time constant about 7 s | Two round trips stay clearly visible, then the line comes to rest. |

## Tech

- **Sim** (`sim.js`, no three.js): a discrete torsion chain. Each rod `i` has an angle and a spin. `I θ''ᵢ = k (θᵢ₊₁ − 2θᵢ + θᵢ₋₁) − c θ'ᵢ + c₂ (θ'ᵢ₊₁ − 2θ'ᵢ + θ'ᵢ₋₁)`. The near end is free; the far rod is clamped at zero. Semi-implicit Euler in 240 Hz sub-steps. The `c₂` term damps grid noise only.
- **Hand**: a held rod follows the pointer, found exactly on the rod's own turning plane. A tap drives that rod through a half-sine flick of 0.22 s, so the pulse is clean.
- **Scene** (`scene.js`): bench, base rail, end stands, wire supports, instanced rods and weights, a twisted ribbon for the wire, one warm key spot light with soft shadows, a dim room environment for the chrome, bloom with a threshold, vignette and grain.
- **Frame loop:** lively while the line moves. No ambient drift; the loop stops when the line is still. Hidden stops at once.

## Sound

Raw Web Audio on `audioKit()`, muted by default.

- Grab: a small steel tick. Release: a short ring of the rod, with bar-mode partials (1, 2.76, 5.40).
- Wave: an air swish from the moving rods. Its level follows the line's kinetic energy; it pans with the energy's centre; its brightness follows the spin.
- Clamp: a dull knock when a strong pulse hits the clamp.
- Wire: a faint creak with the strain at the near end.

## Bar (Bar v3)

| Control | Content |
|---|---|
| Actions | Flick (Space: the first rod flicks), Still (R: the line comes to rest) |
| Slider | Weights |
| How to play | drag a rod end: turn it; flick or click: send a pulse; Space; R |

## Reduced motion

Pulses are smaller. Gestures still answer.

## Tasks

- [x] Blockout, screenshot at 1280 x 800
- [x] Hero to high fidelity; sound
- [x] Bar v3
- [x] Icon round `spike-wavemachine-1`, emblems, sheet row, intro emblem
- [x] `toys.json` entry and Lab tile
- [x] QA Q1 to Q10, `docs/toys/wavemachine.md`
