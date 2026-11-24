---
# stimming-vafv
title: 'Sorting sounds: many more algorithms and up to 256 rods'
status: in-progress
type: task
created_at: 2026-11-24T00:42:40Z
updated_at: 2026-11-24T00:42:40Z
parent: stimming-98c1
---

Tom, 2026-11-23: "no alpha -- we want a couple more visual refinements here, asome more replayability -- and a loooooot more different sorting algos -- also let's allow us to increase the amount of bars up until 256".

- [x] toys.json stage: null (no alpha)
- [x] About 20 more algorithms, grouped in the picker, with node tests
- [x] Rods setting up to 256 (Settings), speed ceiling for big rows
- [x] Rods, glow and sound hold up at 256
- [ ] Visual refinements: wait on Tom
- [ ] Replayability: wait on Tom
- [x] QA, captures, toy doc, plan

## Summary of Changes

- `sorting/algos.js`: 29 algorithms (23 new) in nine groups; a d-ary heap serves Heap, Ternary heap and Introsort.
- `tests/sorting-algos.test.mjs`: each one sorts rows of 1 to 256 rods (the slow two to 32); the picker lists each once.
- `sorting/main.js`: the picker list from `LIST`; a Rods stepper in Settings (16 to 256, narrow at most 128); speed 3 to 12000 steps a second under a new key `pace`; thin rods keep one device pixel.
- toys.json: stage null.
- QA, headless: 256 rods by Cycle at top speed, frames 16.7 ms median, 16.8 ms p95; idle rAF 0 after the sweep; no console errors; keys 1, 6, 3 pick Bubble, LSD radix, Quick; Rods Next goes 48 to 64 and keeps the sort running. Captures 15 to 19.
- The algorithm list is taller than an 800 px stage; the sheet scrolls.
