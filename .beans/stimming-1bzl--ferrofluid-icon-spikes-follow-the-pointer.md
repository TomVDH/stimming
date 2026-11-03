---
# stimming-1bzl
title: 'Ferrofluid icon: spikes follow the pointer'
status: completed
type: task
priority: normal
created_at: 2026-11-03T22:10:49Z
updated_at: 2026-11-03T22:15:17Z
parent: stimming-2pgq
---

Tom asked for the current Ferrofluid menu icon to be a bit more interactive.

- [x] Spikes lean and stretch toward the pointer on sprung motion
- [x] Pool bead and metal sheen follow the pointer
- [x] Rest shape stays the same as today; no per-frame work at rest
- [x] QA at 1280px and 375px

## Summary of Changes

The Ferrofluid menu icon now treats the pointer as a magnet.

- Spikes lean and stretch toward the pointer on per-spike springs and wobble when they settle.
- The pool bead drifts toward the pointer. Over the pool, the whole crown bristles and the bead swells.
- The metal sheen turns to face the pointer.
- A keyboard focus has no pointer, so a magnet circles the crown.
- The rest shape is the same as before, and the ticker stops at rest.
