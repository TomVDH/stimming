# Epicycles (`epicycles`) implementation plan

Status: built as a Lab MVP (2026-11-22) · Bean: `stimming-nzlq` · Toy doc: [epicycles.md](../toys/epicycles.md)

**Goal:** Draw a closed shape. A chain of spinning circles, a Fourier series, redraws it with a glowing pen.

**Architecture:** Flat, raw WebGL2 on `shared/gl.js`, bloom from `shared/glow.js`. The CPU resamples the stroke to 512 points by arc length and takes its DFT. The terms sort by radius. An inverse FFT of the kept terms gives the pen's whole path for any circle count. The GPU draws three layers into one float target: the guide line, the rings and arms, the trail. Then bloom and a grade.

**Spec:** idea 10 in [toy-ideas.md](../toy-ideas.md), group B; batch rules in [README.md](README.md); Bar v3 in [bar-v3.md](bar-v3.md).

| | |
|---|---|
| Size, estimate | S to M · $15 to $25 |
| Kits | None. The grade copies Double slit's `FINAL` pass. |
| Before the build | nothing |

## Defaults (Tom's open question: 3D or flat, and the presentation)

- **Flat, face on.** The maths lives on a plane: each circle turns in the plane of the drawing. A 3D camera would turn circles into ellipses and hide that the sum lands on your line.
- **Light on black.** The pen is a light; its trail is the picture. The circles are hairline rings that catch a little light; the arms are fine lines. No brass, no chalk, no props (Look rule).
- **Warm pen, cool rings.** The pen head is white-hot. The trail cools along its age from warm gold to a deep amber ember. Rings and arms are a dim cool grey-blue, so the trail always leads.
- **Your line stays as a guide.** The stroke you drew stays as a faint cool line under the trail, so you see how close the circles come.
- **The first shape is a fish,** half traced at load, so the first frame shows the chain at work. A fish reads at once, has a sharp tail that shows the corners sharpen, and is no brand.

## The maths

- The stroke closes with a straight line back to its start, then resamples to N = 512 points by arc length.
- DFT: `c_k = (1/N) Σ z_n e^{-2πi k n / N}` for k from -255 to 256. `c_0` is the centroid: the fixed anchor of the chain.
- The terms sort by `|c_k|`, largest first. Circle j has radius `|c_k|` and turns k times per loop.
- A count is a real number: `n + f` keeps n terms whole and scales term n + 1 by f. So a new circle grows from nothing and the path morphs without a jump.
- The path for a count: put the kept terms in a 2048-bin spectrum, inverse FFT. That is the exact path of the pen.

## The shot

Black with a faint cool haze. The shape sits in the free stage between the bar parts, at about 80% of its short side.
The pen head lights the space around it a little. Bloom with a threshold, film grain, a soft vignette.

## Hero moments

1. **Draw.** Press and drag: your stroke draws as a bright line of light under your finger. A soft hiss follows your speed.
2. **The rebuild.** Release: your line dims to the guide. One circle appears and its pen draws a circle. Circles join, biggest first, each growing from nothing, and the whole path tightens from a blob onto your line in about 5 s. You hear the shape: its own Fourier series sounds as a tone that brightens as circles join.
3. **Scrub.** The Circles slider takes the count from 1 to 300 on a log scale. The whole trail reshapes at once.

## Loop

- **Untouched:** the pen traces the shape once every 12 s (drifting, 30 fps). After 60 s idle the circles ease to a stop over 2 s and the loop sleeps. The trail stays.
- **Rebuild:** the trail shows the whole loop, so the blob is seen to tighten. The chain whirls at up to 2.8 times its drift speed while circles join. A chime marks the last circle.
- **Tap:** replays the rebuild from one circle.
- **Drag:** draws a new shape. A stroke shorter than 60 px is ignored.

## Bar (Bar v3)

| Slot | Content |
|---|---|
| Slider | Circles: 1 to 300 on a log scale, stored as `stimming.epicycles.circles` |
| Actions | Sample (S): the next sample shape; Replay (R): the rebuild again |
| How to play | Drag draws, tap replays, S, R |
| Settings | Quality (shared) |

## Sound (Web Audio, muted by default)

- **The shape's tone.** The x of the path plays on the left, the y on the right, as two locked oscillators with a PeriodicWave each, at 110 Hz. On an oscilloscope in XY mode, the sound draws the shape. Only the kept circles sound, so the tone brightens as the shape sharpens. It swells in on a rebuild or a slider move and fades 1.2 s after.
- **The stroke.** Band-passed noise whose level and brightness follow the pen speed, panned with the pen.
- **The lock-on.** When the last circle joins, a soft glass chime, pitch, level and length jittered, panned to the pen.

## Reduced motion

No spin. The full path shows evenly lit, the chain at rest. A new shape fades in its rebuilt path at once; the slider still reshapes it.

## Tasks

- [x] Blockout: rings, arms, trail; screenshot 1280 x 800 (`docs/qa/epicycles/01-blockout.jpg`)
- [x] DFT, FFT path, fractional count, rebuild sweep; `tests/epicycles-fourier.test.mjs`
- [x] Draw gesture, samples, slider
- [x] Look: pen light, trail colour by age, guide, bloom, grade
- [x] Sound
- [x] Icons, emblems, Lab tile, toys.json
- [x] QA Q1 to Q10
