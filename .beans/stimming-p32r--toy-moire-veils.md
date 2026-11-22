---
# stimming-p32r
title: 'Toy: Moire veils'
status: in-progress
type: feature
created_at: 2026-11-17T22:10:22Z
updated_at: 2026-11-22T12:50:00Z
parent: stimming-oh7b
---

Idea 117 in docs/toy-ideas.md, group F. Tom picked it on 2026-11-17.

Drag one of two sheer silk layers over the other. Large moire waves ripple across the folds.

Size: S to M (Tom's limit, 2026-11-17). Plan: docs/plans/moire.md.

Batch 2 of the 14-toy run (Tom: "MVP at high fidelity, with icons for the lab and intro as well, bar v3").

## Defaults chosen

- 3D or flat: a fixed, straight-on view of two real folded cloths, lit from behind. Folds in depth and perspective between the layers; no orbit camera. Moire is a flat optical event, so a straight-on view keeps the bands large.
- Material: Voile by default; Silk and Mesh as chips.
- Light: a low evening sun behind both veils; a dim room light in front for sheen.
- Hand: drag slides the front veil on its rail; the cloth near the hand leads. Tap pushes the cloth.
- The bands come from a Fourier model of the weave, filtered per term by its screen gradient, so they hold at every pixel ratio.

## Checklist

- [x] Reference photos of real moire (watered silk, overlapping screens)
- [x] Development plan in docs/plans/moire.md
- [x] Blockout at 1280 x 800 (`docs/qa/moire/blockout-1280.jpg`)
- [x] Hero: slide, pull, ripple, folds, light, glow, sheen, hem, diffraction cross, bloom
- [x] Sound (rustle, rail rings, beats), muted by default
- [x] Bar v3 spec: Cloth, Twist, Gust; Settings; Reset
- [x] Icons: round spike-moire-1 (A on the menu, no pick yet), emblems, intro emblem shared/emblems/moire.svg, favicon, sheet row
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [x] QA Q1 to Q10 at 1280 px and 375 px; docs/toys/moire.md
- [ ] Tom picks the icon (A on the menu now) and sets the Dutch name (draft: Moirésluiers)
- [ ] Tom's sign-off
- [ ] Record the session cost

## QA (2026-11-22, headless Chromium, ANGLE GL)

| # | Result |
|---|---|
| Q1 | `node --check` passes on `moire/main.js`, `moire/veil.js`, the six menu scripts and the icon round |
| Q2 | Clean console at 1280 x 800 through every chip, action, key, drag and tap |
| Q3 | Captures in `docs/qa/moire/` (JPEG): blockout, first frame at 1x and 2x, pull, tap, gust, silk, mesh, twist 0 and 4, fast drag, reduced motion, 375 x 812 with a tap, intro emblem, Lab tile at rest and on hover |
| Q4 | Drifting: 30 rAF calls a second (28 ms timer); 0 calls in 2 s once asleep after 62 s |
| Q5 | 0 frames in 2 s with the page hidden |
| Q6 | Reduced motion: clean console; no breeze; the pull and the tap still answer, damped; the loop stops |
| Q7 | Three controls (Cloth, Gust, Twist); four How to play rows |
| Q8 | Keys 1 to 3, the arrows and G each do their job |
| Q9 | The context runs during a drag, is suspended once the cloth is still (the breeze is silent), and runs again on the next key |
| Q10 | Slow drag at 1280 x 800: median frame 16.7 ms, p90 16.7 ms (dev PC GPU). A phone is not measured |

Moire at 1x and 2x: the same bands in both captures (`first-1280.jpg`, `first-1280-dpr2.jpg`); the threads resolve only at 2x.
