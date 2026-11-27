---
# stimming-3gc9
title: 'Menu: top-anchor Signal Dial readout so title never jumps'
status: completed
type: task
priority: normal
created_at: 2026-11-27T06:53:55Z
updated_at: 2026-11-27T06:54:21Z
---

Anchor Signal Dial center readout to a fixed top baseline so content grows downward and the title never jumps vertically between toys (Tom, 2026-11-26).

- [x] Switch `.sm-dial-mid` from vertical centering to a fixed top baseline (`align-content: start`, proportional `padding-top`) and lock `.sm-dial-tech` row height in `shared/menu/dial.css`
- [x] Verify narrow/portrait spacing at `<= 860px` and CSS syntax

## Summary of Changes

Switched `.sm-dial-mid` to `align-content: start` with a fixed `padding-top: 22%` (`16%` at `<= 860px`), locked `.sm-dial-tech` to a single-line `1.65em` height, and set `.sm-copy` to top-down flow (`justify-content: flex-start`) so the title sits on one fixed vertical baseline while motto, flags, and Play grow downward.
