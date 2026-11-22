---
# stimming-fzek
title: 'Toy: Fjord aurora'
status: in-progress
type: feature
created_at: 2026-11-22T19:19:36Z
updated_at: 2026-11-22T19:19:36Z
parent: stimming-oh7b
---

Build Fjord aurora (idea 18, group C, a cinematic diorama) as a Lab toy: an MVP at high fidelity, Bar v3. A fjord at night: dark mountains, snow, still mirror water, stars, aurora curtains overhead. The Solar wind slider sets the activity; a rise brings a substorm. Plan: docs/plans/aurora.md.

Stack type: Shader (raw WebGL2 on shared/gl.js, bloom from shared/glow.js).

- [x] Plan at docs/plans/aurora.md
- [x] Reference photos of aurora over Norwegian fjords
- [x] Blockout on the stage, screenshot at 1280 x 800
- [x] Hero moment: folded curtains, colour by height, substorm, reflection
- [x] Sound: muted by default, finished
- [x] Bar v3 spec and copy
- [x] Icon round spike-aurora-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/aurora.md
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Defaults chosen (Tom's open questions: 3D or flat, and the presentation)

- 3D sky, flat stage. Curtains are true folded sheets 90 to 300 km up on a round Earth; a ray march crosses each with an exact per-step sheet integral. The camera stands still on the shore, 2 m up, level, looking north, about 80 degrees across; the horizon sits at 36% by an off-axis shift, so the water is an exact mirror.
- Long-exposure colour, after the Lofoten photos (Wikimedia Commons): navy sky, saturated green, pink hem in a storm, faint red tops. Snow takes the aurora light.
- Solar wind slider (default 0.45). A rise of 0.14 over its slow baseline starts a substorm: a surge runs east to west, the folds deepen, the hem turns pink, the curtains climb. Tap or Space: a gust along the near curtain. Drag up or down moves the wind.
- No props: no houses or village lights. Window seat's airglow is an orbit view, so nothing was lifted from it.

## QA (2026-11-22)

- Q1 node --check: four modules and the menu scripts pass.
- Q2 console clean on the toy, the phone view, reduced motion and the Lab hover. Q5 hidden: 0 frames in 2 s.
- Q4 drift 30.75 frames a second; 0 frames after 62 s idle. Q6 reduced motion: 0 idle frames; a gust answers; then 0.
- Q7 one slider, one action; three How rows. Q8 Space sends a gust. Q9 context running after the gesture, suspended at the end.
- Q10 Edge headless on D3D11, RTX 3070, 1280 x 800: frame median 8.6 to 10.4 ms, p95 20.6 ms in a substorm; the render alone 2.6 ms. SwiftShader floor about 290 ms.
- Captures: docs/qa/aurora/ (01 blockout to 09 Lab tile hover).
