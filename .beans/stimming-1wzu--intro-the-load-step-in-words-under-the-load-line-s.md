---
# stimming-1wzu
title: 'Intro: the load step in words above the load line (Star Chart first)'
status: in-progress
type: feature
created_at: 2026-11-25T18:20:54Z
updated_at: 2026-11-25T18:20:54Z
parent: stimming-48o4
---

Tom, 2026-11-25: "we want gentle and clear readouts of what's loading"; picked one line under the bar, plain words, a step count (BAKING THE HAZE   3 / 6).

- [x] shared/intro.js: loadNote(text, k, n); a caption above the load line (Tom moved it: under, it crowds the title); a note holds at least 0.4 s; a short wipe on change; reduced motion replaces the word Loading
- [x] shared/stim.js: buildSteps(n, notes) names each step
- [x] Star Chart names its six steps
- [x] A toy with no notes looks as before
- [x] Verify: slow load (CPU throttle or ?slow), reduced motion, 375 px
- [x] Docs: shared/AGENTS.md or stim.js JSDoc, docs/plans/loading.md, starchart.md
- [x] PR with /code-review (5 nits, all fixed)

## Summary of Changes

- `shared/intro.js`: `loadNote(text, k, n)`; the load line carries a caption above it with the step and its count. A note holds 0.4 s and wipes on. Under reduced motion it replaces the word Loading. Words come from `data-t`, so no element's textContent changes.
- `shared/intro.css`: the caption spans the line exactly and wraps upward, balanced; it shows by `data-on`.
- `shared/stim.js`: `buildSteps(n, notes)` feeds the notes.
- Star Chart names its six build steps.
- A toy without notes looks as before. Verified at 1024 and 375 px, side layout, no emblem, reduced motion.
