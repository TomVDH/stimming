---
# stimming-nzlq
title: 'Toy: Epicycles'
status: completed
type: feature
created_at: 2026-11-22T19:17:29Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

Build Epicycles (idea 10, group B) as a Lab toy: an MVP at high fidelity, Bar v3. Draw a closed shape; it is resampled and turned into a DFT, and a chain of spinning circles sorted by size redraws it with a glowing pen. A slider sets how many circles, so the shape sharpens from a blob to the full line. Plan: docs/plans/epicycles.md.

Stack type: Shader (raw WebGL2 on shared/gl.js, bloom from shared/glow.js).

- [x] Plan at docs/plans/epicycles.md
- [x] Blockout on the stage, screenshot at 1280 x 800 (docs/qa/epicycles/01-blockout.jpg)
- [x] Hero moment: draw, resample, DFT, circles redraw with a glowing pen
- [x] Circles slider: blob to full line
- [x] Sound: finished, muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-epicycles-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/epicycles.md
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Defaults chosen (Tom's open questions: 3D or flat, and the presentation)

- Flat, face on. Each circle turns in the plane of the drawing; a 3D camera would turn the circles into ellipses and hide that their sum lands on the line.
- Light on black. The pen is a light and its trail is the picture: white-hot head, a gold trail that cools to an amber ember one loop back. Rings and arms are dim cool hairlines; the pen lights the rings near it. No brass, no chalk, no props.
- The drawn line stays as a faint cool guide under the trail, so you see how close the circles come.
- First shape: a fish, its pen two thirds round, so the first frame shows the chain at work. Samples: fish, cat, star, bird, heart.
- The rebuild (on release, tap or R): one circle, then the rest join largest first over 4.6 s on a log scale; a count between two whole numbers grows the next circle from nothing, so the line never jumps. The trail shows the whole loop, so the blob tightens in view; the chain whirls while circles join; a chime marks the last one.
- Slider Circles: 1 to 300 on a log scale, default 160.
- Sound: the shape plays as its own Fourier series, x on the left and y on the right at 110 Hz (an XY scope draws the shape); it brightens as circles join. Stroke hiss follows the pen; a glass chime at lock-on.
- Icon: no pick existed. Round epicycles-1 (Current, A, D); A is on the menu. A is a chain of steel hoops drawing a gold heart: the heart's four largest Fourier circles draw it almost exactly, so the icon is honest.

## QA (headless Chromium, --use-angle=gl, Tom's PC)

- Q1: node --check passes on the four modules and the menu script. `node --test tests/epicycles-fourier.test.mjs` passes 5 of 5.
- Q2, Q3: clean console in play (drag, tap, S, R, slider) and on the menu with the tile hovered; captures at 1280 and 375 x 812.
- Q4: drifting 30 rAF per second; 63 s idle: 0. Q5 hidden: 0. Q6 reduced motion: 0 after settle, full line lit, no spin.
- Q7: two actions and one slider (3 controls); How to play has 4 rows.
- Q8: S loads the next sample and R rebuilds from one circle.
- Q9: the context runs after a stroke and is suspended 12 s later, while the drift goes on.
- Q10: frame times during a rebuild: median 16.7 ms, p95 16.7 ms.
- Not checked: a real touch screen; the tone heard by ear (rendered offline: RMS about 0.04 a channel).

## Notes for Tom

- Toy-owned files outside `epicycles/`: `shared/emblems/epicycles.svg` and `shared/favicons/epicycles.png`, as each Lab toy has.
