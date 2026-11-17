---
# stimming-z7j5
title: 'Loop tools: finish and test the round 2 capture defaults'
status: completed
type: task
priority: normal
created_at: 2026-11-16T09:48:52Z
updated_at: 2026-11-16T16:41:58Z
parent: stimming-1rv3
---

Round 2 of the menu's loops and stills stopped early (Tom, 2026-11-16: "close out now make beans for the rest").
The three capture scripts are changed but not finished. Finish and test them before any renew run.

## State of the scripts (uncommitted, in this worktree)

`tools/capture.mjs`
- `VIEW` is 1100 x 1100 (was 1000 x 800). A v1 stage is then 1068 x 1052.
- `SETUP` replaces `CROP`: per toy `view`, `query`, `store`, `first`, `crop`, `at`. Only `ink` has an entry.
- The old `CROP` values are gone: `pop` 0.86 and `putty` 0.84. Put them back as `SETUP` entries if the new framing needs them.
- New helpers: `view(id)`, `context(browser, id, video)`. `square()` reads `crop` and `at` and stays inside the stage.
- New verbs: `wheel` and `stroke` (a pressed path through points, eased).
- `open()` adds the toy's query and survives a failed `goto`.

`tools/loops.mjs`
- A recipe can set `len` (5 to 9 s). Encode: `-preset veryslow`, High profile, one key frame, CRF 32, ladder to 40, then 20 fps. Budget 40 to 110 KB.
- `index.json` is written by rename, so it is always valid.
- The `LOOPS` table still holds the round 1 recipes.

`tools/stills.mjs`
- New `STILLS_OUT` for a trial run. It runs the toy's `SETUP.first` steps.

## Tested

- `node --check` passes for the three files.
- One run of both scripts on `ink`, into a scratch folder: both finish and write files.
- That run gave a blank picture: see the Ink line in the notes bean.

## Checklist

- [x] Decide the default viewport. Compare 1100 x 1100 with 1000 x 800 on six toys.
- [x] Fidget board: the intro stayed at 1100 x 1100 (stage 1068 x 924). Find why.
- [x] Fill `SETUP` for every toy that needs a zoom or a new centre.
- [x] Run every toy once through the final tables and read the output (seven batches, into a scratch folder; no single 42-toy run).
- [x] Update the script headers if a default changes.

## Findings to reuse

- A larger viewport zooms out only a toy with fixed pixel sizes. A toy that fits its subject to the stage needs its own zoom.
- These pages take the wheel: pins, galaxy, prism, ferro, pool, tvtree, window, frietkot, trainride.
- These pages read the address: pop, shadyos, window, chamber, fireworks, launch, frietkot, railgun, trainride.
- The dev server drops a connection now and then, even with three browsers.
- No file in `shared/loops/` or `shared/stills/` changed in this session.

## Summary of Changes

- The default viewport is 1100 x 1100: a v1 stage is then 1068 x 1052, so the crop keeps nearly the whole stage.
- `SETUP` in `tools/capture.mjs` holds eight entries: pop, soap, putty, walker, window, ink, dijkstra, trainride. It also takes `seed`, which fixes the page's random numbers.
- Fidget board: the stuck intro was a dropped connection. The next run was clean; the square stage gives its stacked layout.
- Ink water's blank picture: two pages of one WebGPU toy ran at one time. The script headers now say to run the two scripts one after the other.
- Encode: CRF 32 with a ladder, `-preset veryslow`, High profile, one key frame. No loop needed 20 fps or a CRF above 32.
