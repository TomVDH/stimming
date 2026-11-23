---
# stimming-0n2b
title: 'Contour map: lakes, rivers, summit marks, smooth tool'
status: completed
type: task
priority: normal
created_at: 2026-11-23T18:58:25Z
updated_at: 2026-11-23T19:40:19Z
parent: stimming-79us
---


Tom, 2026-11-23: "let's ensure we add enough interactivity -- let's refine the water infill effect when creating lakes etc". He picked Summit marks and the Smooth tool.

- [x] Lakes: every hollow fills from its bottom to its spill level (priority flood in a worker)
- [x] The fill: a rising level, an advancing shore with a pale edge, the lake's level on full lakes
- [x] Rivers: a full lake spills; a river runs from its outlet down to the sea or the next lake
- [x] Summit marks: a survey triangle and the height on each peak, live as it rises
- [x] Smooth tool: a third pick (S) that softens and levels the land
- [x] Sound for lakes, rivers, summits and smoothing
- [x] QA, toy doc

## Summary of Changes

- `fill.js` (new): a priority flood with a pit queue gives each cell its spill level; lakes are groups of cells under it, 2.5 m deep and 14 cells at least; each lake's outlet and its river by the steepest fall of the filled surface. It runs as a module worker, about 25 ms a run. `drain()` fills a new land's small pits and keeps its six largest basins.
- `water.js` (new): lake levels per cell (half floats with the rising edge), a fill from bottom to brim in 1.5 s to 6 s, hollows under the brush held dry until release, breached lakes drain as ghosts in about a second, rivers grow at 110 cells a second and meander on flat ground.
- `summits.js` (new): peaks found on a lattice and climbed; a triangle and the live height; gaps cut in the lines.
- Smooth: a third pick (S) and a box-blur brush (`terrain.soften`).
- Shader: sea and lakes as one water layer; depth tints, shore lines and water-lines for both; a pale band at a rising shore.
- Sound: a trickle while lakes rise, a babble while rivers run, a pip for a new summit mark, a rasp for Smooth.
- Bug found and fixed on the way: the brush `smooth()` shadowed the smoothstep helper in the generator.

## QA (headless Chromium, --use-angle=gl, RTX 3070)

- Q1 node --check on the eight modules and the menu script: pass.
- Q2 clean console in play and on the menu (`?all`, tile hovered).
- Q4 0 rAF calls in 2 s after the toy settles, also after New. Q5 hidden: 0. Q6 reduced motion: the flood and lakes fill at once, 0 rAF after settle.
- Q7 one choice (3 options), one slider, one action; 4 How to play rows. Q8 R, D, S, N each do their job.
- Q9 the context runs in play and is suspended 2.6 s after it settles. Output RMS up to 0.14, peaks 0.40.
- Q10 frame time median 16.7 ms, p95 16.7 ms.
- Captures: docs/qa/contour/10-lake-fill.jpg, 11-lakes-rivers-summits.jpg, 12-dam-smooth.jpg.

