---
# stimming-6pki
title: 'Menu loops: Tom''s five per-toy notes (ink, trainride, window, pop, soap)'
status: completed
type: task
priority: normal
created_at: 2026-11-16T09:48:53Z
updated_at: 2026-11-16T16:41:58Z
parent: stimming-1rv3
blocked_by:
    - stimming-z7j5
---

Tom's notes on round 1 of the menu loops (2026-11-16). Each setting applies to the still and to the loop.
None is captured yet. The settings below come from each page's code; only Ink water has a trial run.

## Checklist

- [x] `ink`: the dark version. Tom: "ink water is the dark version we're doing".
  - Setting: Settings, Light, Dark field. The page stores it as `stimming.ink.light` = `dark` (`ink/index.html:142`).
  - `SETUP.ink.store` in `tools/capture.mjs` sets it already.
  - The trial run gave a blank picture (still 0.5 KB, loop 4.8 KB) and this page error, many times: `Failed to execute 'setPipeline' on 'GPUComputePassEncoder': parameter 1 is not of type 'GPUComputePipeline'`.
  - The cause is not known. Test one change at a time: the Dark field choice, the 1100 x 1100 viewport, two browsers at one time.
- [x] `trainride`: daytime, by Lake Zurich. Tom: "train ride is daytime by lake zurich".
  - Setting: `?time=noon` (or `morning`, `afternoon`) and `?x=<metres>` (`trainride/index.html:129`, `:4902`).
  - Lake Zurich is the stretch before Pfäffikon SZ (x 32610). Stations in `trainride/route.json`: Kilchberg 7850, Thalwil 11310, Horgen 15990, Wädenswil 23160.
  - With `?x=` the train does not stop at a station first.
  - Look at two or three x values and pick the one with the lake in view.
- [x] `window`: daytime. Tom: "the window seat is also day time so its more clearly visible".
  - Setting: `?hour=noon` (or `morning`, `afternoon`) (`window/index.html:142`).
  - Over Vancouver the noon sun lights the mountain faces the seat sees.
- [x] `pop`: random streaks. Tom: "the pop field do random streaks now it looks machine".
  - Replace the three even sweeps in `LOOPS.pop` with `stroke` steps: uneven length, place, direction and pause.
  - R fills the sheet again before the loop ends.
- [x] `soap`: not the tricolour bar. Tom: "for the soap not the tricolour one pls".
  - Round 1 used key 4, Layers. The other keys: 1 Mint, 2 Amber, 3 Charcoal, 5 Coral, 6 Swirl (`soap/index.html:91`).
  - Swirl has three colours too. First try: Coral (key 5); it stands out on the green mat.
  - Change the key in `POKES.soap` and in `LOOPS.soap`.

## Summary of Changes

| Toy | Set as |
|---|---|
| ink | `SETUP.ink.store`: `stimming.ink.light` = `dark`. Loop is 8 s, one drop each 4 s. |
| trainride | `?time=noon&x=21050`: the open shore past Au ZH, with the lake, a sail and the far shore. |
| window | `?hour=noon&peer=0.06,-0.1,-0.14`: noon, head back and low, so the whole window shows. |
| pop | Five uneven `stroke` steps and two taps in 8 s, then R. |
| soap | Key 5, the Coral bar, in `SETUP.soap.first`. |
