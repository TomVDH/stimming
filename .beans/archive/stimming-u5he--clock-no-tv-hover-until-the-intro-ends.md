---
# stimming-u5he
title: 'Clock: no TV hover until the intro ends'
status: completed
type: task
created_at: 2026-11-16T19:47:06Z
updated_at: 2026-11-16T19:47:06Z
---

Tom, 2026-11-16: "ensure that the tv hover effect cannot play until the intro animation is complete".

- [x] The toys take no hover or focus while the comet runs and the tube blinks
- [x] A toy already under the pointer when the intro ends shows at once
- [x] The same hold during a Re-roll's comet

## Summary of Changes

- `shared/menu/clock.js`: a `shy` hold blocks hover and focus during the comet and the tube's blink; `release()` shows a toy already under the pointer. Tested headless: a hover at 1.9 s shows nothing; at 5.4 s the hovered toy shows; a Re-roll holds the same way.
