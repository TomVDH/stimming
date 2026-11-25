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
- [ ] PR with /code-review
