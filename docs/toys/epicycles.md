# Epicycles (`epicycles/`)

| | |
|---|---|
| Dutch | Epicykels /ˌeːpiˈsikəls/ (draft) |
| Motto | Circles riding circles. Naturally. |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.8 0.15 70)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 10, group B: draw a shape; spinning circles, a Fourier series, redraw it. Bean `stimming-nzlq`. Plan: [epicycles.md](../plans/epicycles.md), an MVP.

## Rules

- The pen's line is the true path of the circles on the stage. Nothing draws the shape by hand.
- The circles are the shape's DFT terms, largest first. The first circle's centre is the centroid.
- A count between two whole numbers grows the next circle from nothing, so the line never jumps.

## Direction

- Flat, face on. Each circle turns in the plane of the drawing; a 3D camera would turn them into ellipses.
- Light on black. The pen is a small lamp: its head is white-hot, and it lights the haze and the rings near it.
- The trail cools along its age: white at the head, then gold, then a deep amber ember one loop back.
- The rings and arms are hairlines of cool blue-grey, dimmer for each smaller circle.
- The line you drew stays as a faint cool guide under the trail.
- The first shape is a fish, its pen two thirds round, so the first frame shows the chain at work.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Actions | Sample (S), Replay (R) |
| Slider | Circles: 1 to 300 on a log scale; stored as `stimming.epicycles.circles` |
| Settings | Quality (shared) |

| Input | Does |
|---|---|
| Drag | Draws a new shape. The chain dims under the stroke. On release the stroke closes, and the circles rebuild it. A stroke shorter than 60 px keeps the old shape. |
| Tap | Rebuilds the shape from one circle |
| S | The next sample: fish, cat, star, bird, heart |
| R | Rebuilds the shape from one circle |
| Circles slider | Reshapes the whole trail at once, from a blob to the exact line |

## The rebuild

1. The first circle grows in 0.35 s; its pen draws a circle.
2. The other circles join, largest first, over 4.6 s on a log scale. The big circles change the shape most, so they get the most time.
3. The chain whirls at up to 2.8 times its drift speed while circles join, then eases back.
4. The trail shows the whole loop all through, so the blob is seen to tighten onto the line.
5. When the last circle joins, a glass chime sounds.

## Sound

Web Audio, muted by default.

- **The shape's tone.** The path's x plays on the left and its y on the right, at 110 Hz, from two locked oscillators with a PeriodicWave each. On a scope in XY mode the tone draws the shape. Only the kept circles sound, so the tone brightens as circles join. It sounds during a rebuild and a slider move, and fades 1.2 s after.
- **The stroke.** Band-passed noise; its level and pitch follow the pen speed, and it pans with the pen.
- **The chime.** Three glass partials (1, 2.76, 5.4), pitch, level and length jittered, panned to the pen.

## Frame loop

| State | Rule |
|---|---|
| Lively | A stroke, a rebuild, a fade, or 2.5 s after input: full rate |
| Drifting | The pen goes round once in 12 s, at 30 fps |
| Asleep | 60 s after the last input the circles ease to a stop over 2 s. The full trail stays. |
| Reduced motion | No spin. The full line shows evenly lit. A new shape shows its line at once. |
| Sound | The context sleeps 1.5 s after the last sound ends, while the drift goes on. |

## Files

| File | Holds |
|---|---|
| `main.js` | State, bar, the rebuild, the pointer, the frame loop |
| `fourier.js` | Resample, DFT, the FFT path, the chain, the harmonics, the samples |
| `render.js` | Raw WebGL2: strips and shapes of light into one float target, bloom, the grade |
| `sound.js` | The tone, the stroke, the chime |
| `tests/epicycles-fourier.test.mjs` | `node --test`: the circles redraw their shape |

## Icons

Round `icons/spike-epicycles-1.html`. No pick yet; A is on the menu.
A: glossy steel hoops, each riding on the last, whose pen draws a gold heart. The hoops are the heart's four largest Fourier circles. D: the same chain and heart flat on a dark slab.
Intro emblem `shared/emblems/epicycles.svg` from A.

## QA

Captures: `docs/qa/epicycles/`.
