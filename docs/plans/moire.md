# Moire veils (`moire`) implementation plan

Status: built as a Lab MVP on 2026-11-22, on Bar v3; the toy doc is `docs/toys/moire.md` · Bean: `stimming-p32r`

**Goal:** Two sheer veils hang one behind the other against low evening light. Drag the front veil and broad moire bands race, bend and bloom across the folds. The bands move far faster than the cloth: a slide of one thread width moves them one whole band.

**Source:** idea 117 in [toy-ideas.md](../toy-ideas.md) (Tom's picks, 2026-11-17; group F). Size S to M (Tom's limit). Batch rules in [README.md](README.md). Bar v3 in [bar-v3.md](bar-v3.md).

| | |
|---|---|
| Stack type | Shader: raw WebGL2 on `shared/gl.js`, `shared/glow.js`, `shared/grade.js` |
| Kits | none |
| Size | S to M |

## Defaults chosen (Tom's open question: 3D or flat, and the presentation)

| Question | Default | Why |
|---|---|---|
| 3D or flat | A fixed, straight-on view of two real, folded, lit cloths: folds in depth, perspective between the layers, no orbit camera. | Moire is a flat optical event. A straight-on view keeps the bands large and legible. The depth comes from the folds, the gap between the veils and the light behind them. |
| Material | Voile by default. Silk (shot organza) and Mesh (bronze wire screen) as the other two chips. | Voile is the real object Tom named. The three differ only in numbers in one shader. |
| Light | A low evening sun behind both veils, off centre, with a wide warm halo. A dim cool room light in front gives sheen on the fold crests. | Light through cloth is the subject. One key light, from behind. |
| Hand | Drag slides the front veil on its rail. The cloth near the hand leads; the rest follows on a spring. Tap pushes the cloth and a ring ripple runs out. | The bands magnify the hand's move about thirty times: the hero. |

## The model: moire from the weave, never from the screen

Each veil is a woven grid. Along each thread direction, its openness is a Fourier series: a mean plus two harmonics of the thread phase.
The light through both veils is the product of the two series. Its terms are cosines of the sum and the difference of the two phases.
Each cosine is filtered by its own screen gradient: a term finer than the pixel fades to zero. The difference terms are wide, so they stay.
So the bands come from the modelled weave at every pixel ratio, and the threads themselves show only where the screen can resolve them.

The same product gives the glow: threads of the front veil light up where they sit behind gaps in the rear veil. With coloured threads the bands change colour, not only brightness.

Phase of one veil at a screen point:

1. Unproject the point to the veil's depth (the rear veil sits a few centimetres behind; perspective gives it a slightly finer pitch).
2. Take away the cloth's displacement: the rail slide, the hand's pull, the tap ripple, the breeze.
3. Unroll the folds: the arc length across the pleats.
4. Rotate by the veil's angle (the rear veil by Twist), then scale by the thread pitch.

## Hero moments

1. **Slide.** Drag sideways: bands race up and down the veils, far faster than the hand.
2. **Pull.** The cloth round the hand stretches. The bands bend round it into eyes, as on watered silk. Release: the cloth springs back and the eyes ripple out.
3. **Bloom.** Near zero Twist the bands grow to the full stage and the whole veil breathes light and dark as it slides.

## True details

- The front veil's hem is a double ply of the same cloth, so it carries a fine moire of its own.
- The low sun seen through the weave throws a diffraction cross along each veil's threads, with a spectral smear. Two veils, two crosses.
- A steep fold packs more thread into a pixel: it is denser and glows more.

## Bar v3

| Control | Content |
|---|---|
| Choice | Cloth: Voile (1), Silk (2), Mesh (3) |
| Slider | Twist: the angle between the veils, 0 to 8 degrees |
| Action | Gust (G, hold): a breeze billows both veils |
| Settings | Weave (fine to open); shared Quality; Reset |
| How to play | Drag: slide the front veil · Tap: push the cloth · Arrows: nudge · G: gust |

## Sound (muted by default)

- Rustle: band-passed noise grains, their rate and level follow the cloth's speed, panned with the hand.
- Rail: soft metal ring ticks as the slide crosses each ring spacing, pitch and level jittered.
- Beats: two close tones whose beat rate follows the rate of bands passing under the hand. The acoustic twin of moire.

## Frame loop

Lively while the hand or a spring moves; drifting at 30 fps on the breeze; asleep after 60 s; stopped when hidden. Reduced motion: no breeze, springs damped to no overshoot.

## Tasks

- [x] Blockout: the two veils and the band product; screenshot at 1280 x 800
- [x] Hero: slide, pull, tap ripple, folds, light, glow, sheen, hem, diffraction cross, bloom and grade
- [x] Sound; Bar v3 spec; settings
- [x] Icon round `icons/spike-moire-1.html`, emblems, intro emblem, favicon, sheet row
- [x] `toys.json` entry and the Lab `<li>` with its GSAP hook
- [x] QA Q1 to Q10; `docs/toys/moire.md`
