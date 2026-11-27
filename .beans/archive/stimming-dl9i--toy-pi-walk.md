---
# stimming-dl9i
title: 'Toy: Pi walk'
status: completed
type: feature
created_at: 2026-11-22T22:49:15Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

Build Pi walk (idea 51, group B) as a Lab toy: an MVP at high fidelity, Bar v3. Each digit of pi takes one step in one of ten directions; the walk draws itself from the centre, the view zooms out as it grows into a long, branching, coastline-like path. Plan: docs/plans/piwalk.md.

Stack type: Shader (raw WebGL2 on shared/gl.js, bloom from shared/glow.js). The digits come from a Chudnovsky series in BigInt, in a worker.

- [x] Plan at docs/plans/piwalk.md
- [x] Blockout on the stage, screenshot at 1280 x 800 (docs/qa/piwalk/01-blockout.jpg)
- [x] Hero moment: the walk draws itself, the view zooms out, the corner readout
- [x] Sound: one soft note per step, pitched by its digit; muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-piwalk-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/piwalk.md
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Defaults chosen (Tom's open questions: 3D or flat, and the presentation)

- Flat, face on, light on black, as the well-known poster walks (Aragón Artacho's walks on real numbers) are. A walk is a plane figure; a 3D camera adds nothing true.
- Each step is a fine line of light, drawn instanced in one call. Lines add, so crossings and knots glow; a hue-keeping tone curve stops the knots from going flat white.
- Colour follows the index on a calm ramp: indigo, blue, sea teal, pale gold, coral. The ramp spans the walk drawn so far. The head is white-hot and the newest steps burn and cool into the ramp.
- Digit d steps 36 d degrees clockwise from up, like a dial. The 3 is the first step.
- 250,000 true digits, computed in the page (Chudnovsky, BigInt, a module worker, about 0.5 s). No digits file.
- Pace: 5 steps a second at the start, then in proportion to the steps drawn; about 72 s for the whole walk. The view eases out in log space, so the zoom reads as steady.
- The first frame: the walk 40 steps in, so it is already moving.
- The end: a band of light runs down the walk from first step to last, the chord sounds, the head goes out, the loop sleeps.
- Readout top right: the last eleven digits (the newest white) and the count. It is the one piece of copy on the stage; the brief asked for it.
- Interaction: tap or Space pauses and goes on (at the end, starts again); hold or drag rushes up to 12 times; R starts again; Pace slider 0.25 to 4 times.
- Sound: a soft glass mallet note per step, digits 0 to 9 on the A major pentatonic over two octaves; pan with the head; faster runs ring shorter and softer and thin to 14 notes a second; an air bed rises with the pace; an open chord at the last digit.
- Icon: no pick existed. Round piwalk-1 (Current, A, D); A is on the menu. A is sixteen digits of pi from the 1,658th on, as a glossy tube from indigo to coral with a white-hot head. The first digits of pi tangle into a knot at icon size; this run walks a clear meander that never crosses itself.

## QA (headless Chromium, --use-angle=gl, RTX 3070, Tom's PC)

- Q1: node --check passes on the four modules and the menu script. node --test tests/piwalk-digits.test.mjs passes 3 of 3 (Machin check at 20,000 digits).
- Q2: clean console in play (tap, hold, Space, R, slider, run to the end, tap to restart) and on the menu with the tile hovered.
- Q3: captures at 1280 and at 375 x 812 (docs/qa/piwalk/).
- Q4: 0 rAF calls in 2 s after the end settles; paused: 0.
- Q5: hidden: 0 rAF calls in 2 s.
- Q6: reduced motion: clean console, 0 rAF calls paused.
- Q7: 2 actions and 1 slider; 4 How to play rows.
- Q8: Space pauses and goes on (aria-pressed follows), R starts again.
- Q9: the context runs after the gesture and is suspended after the end. Recorded output: RMS about 0.08, window peaks under 0.4.
- Q10: frame time median 16.7 ms, p95 16.7 ms, at the start and at 120,000 steps (vsync bound on this GPU).
