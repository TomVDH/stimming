# Kiwi (`kiwi`)

Lab toy. Bean `stimming-7pgt`. Plan: `docs/plans/kiwi.md`.

One big toony kiwi on a dark ground, under a warm key light from the front left and a hot rim light from behind. Far lamps open into soft discs behind it.

## Play

| Input | Act |
|---|---|
| Press the kiwi | A dent where pressed. Release: it springs back with a hop. |
| Hold | Squeeze: the fruit squashes flat and the fuzz ruffles. Release: a stretch and a boing. |
| Swipe across it | Slice: juice bursts out, the halves slide apart, swing their faces to the eye and rest tilted back. |
| Tap a half | A wobble runs out from the tap. |
| Tap the gap | Join: the halves snap back with a thunk. |
| Keys | Space slices or joins, hold S squeezes |

## Bar v3

Actions Slice (Space) and Squeeze (S, hold). Slider Fuzz, 0 to 1: bald to shaggy. Quality in Settings. How to play has four rows.

## How it works

Three.js 0.170, WebGL2. Every material is a custom shader. The raspberry ideas of raspberry.luruke.com are reworked as our own code; no code is copied (that page shows no licence).

| Part | Method |
|---|---|
| Halves | Two lathe skins, each with its own cut face at x = 0. One half is turned 180 degrees. Skin noise runs in fruit space, so the seam does not show. |
| Juice beads | About 260 instanced ellipsoids per face: fat locules round the core, slim beads in 40 rays. The shader works in each bead's unit-sphere space. It marches four steps along the view chord; at each step a second chord runs to the key and to the rim light. Beer-Lambert over both chords, per colour channel, makes the green. A thin chord lets the glowing bed show through, so the creases glow. |
| Fuzz | 17,000 hairs per half on Standard (7,000 Low, 30,000 High). Each is an instanced ribbon on a cubic curve of four control points, rooted on the skin by a surface sampler. It turns to face the eye. Light wraps round the fibre (Kajiya-Kay); light from behind runs through the tips. A hair under one pixel keeps one pixel and fades by alpha to coverage. The curve trails the motion on a spring and ruffles on a squeeze. |
| Velvet | A sheen term on the skin at grazing angles, and a toon rim band, both scaled by Fuzz. |
| Toon | Three soft bands on the key light; one crisp wet glint on beads, seeds and core. |
| Motion | Damped springs: open, squash with volume kept, hop, lean. A dent and a ring jiggle in the vertex shaders; hairs and beads ride the same dent. Closed halves bounce, never pass through each other. |
| Juice | Up to 120 drops with the bead optics. Each stretches along its flight and flattens where it lands. |
| Finish | A float target with depth, then a disc-gather depth of field (each tap counts if its own blur reaches the centre; a per-pixel turn breaks the spiral), bloom, ACES, a vignette and grain. |
| Baked soft light | Skipped: spherical-harmonic transfer needs an offline bake. A hemisphere fill stands in. |

AgX was tried first. It lifted the dark ground to grey; ACES keeps the ground dark and the colours bold.

## Quality

| Level | Pixel ratio | MSAA | Depth of field | Hairs per half |
|---|---|---|---|---|
| Low (after slow frames) | 1 | none | off | 7,000 |
| Standard | up to 1.5 | 4 | 28 taps | 17,000 |
| High | screen | 4 | 48 taps | 30,000 |

## Sound

Raw Web Audio on the shared kit, muted by default. Press: a wet squelch. Release: a rising boing. Slice: a knife swish, a wet split, then juice ticking down. Join: a thunk at the moment the halves meet. A hidden tab stops every sound.

## Frame loop

Lively at full rate while anything moves; drifting at 30 fps with a slow breath; asleep 60 s after the last input. Reduced motion: no breath and no drift; gestures still answer, with a smaller burst and a softer jiggle.
QA on D3D11 (RTX 3070, headless Edge, 1280 x 800): median 7.7 ms, p95 8.1 ms on Standard during a slice; drifting 32 frames a second; asleep 0.

## Known

- Tom sets the Dutch name; "Kiwi" is a draft.
- The cut is always across the long axis, whatever the swipe's angle.
