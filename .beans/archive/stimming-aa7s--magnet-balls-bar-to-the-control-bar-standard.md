---
# stimming-aa7s
title: 'Magnet balls: bar to the control bar standard'
status: completed
type: task
priority: normal
created_at: 2026-11-03T20:33:57Z
updated_at: 2026-11-03T20:36:32Z
parent: stimming-vcsu
---

Bring the Magnet balls bar to the Control bar standard in AGENTS.md (a8a95fd).

- [x] Shape chips carry word labels (Ring, Hex)
- [x] Field lines is a labelled toggle chip
- [x] Shuffle chip shows the die icon plus the word
- [x] QA at 1280 and 375 px with a clean console
- [x] Commit through a private index and push

## Summary of Changes

- Ring and Hex chips show words; titles keep the R and H keys.
- Field lines is a text toggle chip with aria-pressed.
- Shuffle shows the Pop field die plus the word. Each throw (click or S) shows a new face and spins the die, except under reduced motion.
- QA: one row at 1280 px; at 375 px the shared bar wraps Shuffle to a second row. Console clean at both.
