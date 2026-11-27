---
# stimming-u2fq
title: 'Observatory: the first cut sometimes shows the light model'
status: completed
type: bug
created_at: 2026-11-18T02:26:43Z
updated_at: 2026-11-18T02:26:43Z
parent: stimming-wqq9
---

Tom, 2026-11-17: the full model does not always load in the first cut.

Cause: cuts.ts chose the model at the pick, before the dip to black. The ?cuts review picks about 1 s after load, often before the hero is ready.

- [x] Choose the model at the cut's first close frame
- [x] The ?cuts review waits for the hero before its first pick, 8 s at most
- [x] Live check: hero ready 1.08 s, first cut 1.83 s

## Summary of Changes
view/cuts.ts chooses the model on the first close frame. loop.ts holds the review's first pick until hero.ready.
