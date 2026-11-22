# Geoboard (`geoboard`) plan

Status: built, Lab (2026-11-22) · Bean: `stimming-7qy1`

Idea 24, group D, a fidget: stretch rubber bands across pegs; pluck them to twang. Sources: the shortlist row in `docs/toy-ideas.md` and row 11 in `docs/plans/fidgets.md` (SIM plus 2D, size M; read String harp and the Fidget board `string` part for the pluck).
Tom's brief for the batch: an MVP at high fidelity, with icons, the intro emblem and Bar v3. One hero moment, finished. No extra modes.

## The hero moment

1. A square board of 5 x 5 nails holds four coloured rubber bands in shapes.
2. Grab a band anywhere: a finger hooks it and lifts it above the nail heads. The band stretches from where it still holds to the finger, and it thins as it stretches.
3. Drag it across the board. Near its anchors the band runs low, so nails there catch it and it wraps them. Near the finger it runs high and passes over the heads. A nail it leaves lets it go.
4. Let go over a nail: the band drops onto it with a tick. That is a new shape.
5. Let go in open space: the band snaps back at once, slaps into line and twangs.
6. Tap a straight run between two nails, or sweep a finger across the runs: each run twangs. Its pitch follows its length and the band's tension.

## Defaults (open questions, answered here)

| Question | Default | Why |
|---|---|---|
| 3D or flat | 3D, three.js 0.170 (Scene type), a high three-quarter view of the whole board | The toy is a band that wraps nails and stretches up to a finger. Height carries it: the band runs low at the nails and rises to the finger, the nails cast long shadows, and the steel heads take the light. The sim itself stays in the plane of the board, so the physics is exact and cheap. |
| Board | A pale birch plywood block with the ply layers on its edges, steel nails with flat heads | The classroom geoboard of the reference photos. Pale wood carries the warm key light on the dark stage; steel heads give glints. |
| Bands | Red, amber, blue and green, satin rubber; a stretched band turns thinner and paler | The colours of classroom bands. Paler with stretch is true of real rubber. |
| First layout | A red tilted square, an amber triangle, a blue long sliver, a green small square, crossing | The first frame is a picture: shapes and crossings that ask to be pulled. |
| Pitch | Frictionless band: one tension for the band. A run's pitch is `C / l * sqrt(λ² - 1/λ)` (neo-Hookean rubber; `l` the run length, `λ` the band's stretch) | Physics: pitch follows length and tension. A long stretched band twangs low per run but rises as you stretch it further. |
| Slider | Tension: a slack band to a tight band (the band's rest length) | It shapes the twang and the thinning, and adds no mode. |

## Tech

- **Sim** (`board.js`, no three.js): each band is a closed loop of contacts: nails (each with the side it wraps), and at most one finger or one free point. The path is the taut path: tangent lines between the circles, and arcs round each nail.
  - Wrap: a run that sweeps over a nail catches it, if the run is below the nail head there.
  - Unwrap: a nail whose turn has flipped sign lets the band go.
  - Release over a nail hooks the band on it. Release in open space makes a free point that the two runs pull back into line (tension, real time, sub-steps); when it crosses the line, it leaves and plucks the merged run with its speed. A band left with fewer than two nails flies back to the nail it came from.
  - Each straight run has six transverse modes (complex amplitudes that rotate and decay), shown in slow motion as in String harp. A soft ghost ribbon shows the blur envelope.
- **Scene** (`scene.js`): desk, a rounded plywood block with grain and ply edges, instanced nails, one band mesh per band (a rounded strip on edge, rebuilt only when it moves), a ghost ribbon for vibration, one warm key spot light with soft shadows, a dim room environment for the steel, bloom with a threshold, vignette and grain.
- **Frame loop:** lively while a band moves or rings. No ambient drift, so the loop stops when all is still. Hidden stops at once.

## Sound

Raw Web Audio on `audioKit()`, muted by default.

- Twang: one plucked voice per run (Karplus-Strong, rendered ahead), at the run's pitch, with a short rubber decay, a pitch glide down from a hard pluck, and a soft buzz that grows with amplitude. Panned by the run's middle.
- Body: the voices pass through a small wooden-box resonance (two peaks and a low shelf).
- Tick: a nail catches or takes the band.
- Creak: rubber that slides on a nail while you drag squeaks with the slide speed.
- Slap: a snap-back ends in a dull slap before the twang.

## Bar (Bar v3)

| Control | Content |
|---|---|
| Actions | Strum (Space: a hand sweeps across every run), Reset (R: the bands go back to the first layout) |
| Slider | Tension |
| How to play | drag a band: stretch it; release on a nail: hook it; release in the open: snap; click a band: pluck; drag across bands: strum; Space; R |

## Reduced motion

Vibration shows at a third of its size and the ghost is faint. Snap-back is a short ease, with no overshoot. Gestures still answer.

## Tasks

1. Blockout: desk, board, nails, bands, light, camera. Screenshot at 1280 x 800.
2. Sim: taut paths, wrap and unwrap, grab, hook, snap-back.
3. Vibration and pluck, strum; sound.
4. Bar v3; Settings (Quality).
5. Icon round `spike-geoboard-1`, emblems, sheet row, menu tile, intro emblem, `toys.json`.
6. QA Q1 to Q10; toy doc `docs/toys/geoboard.md`.
