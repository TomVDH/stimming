---
# stimming-09z6
title: 'East Van Alley: smooth the wire glints'
status: completed
type: task
priority: normal
created_at: 2026-11-22T09:17:44Z
updated_at: 2026-11-22T09:18:48Z
parent: stimming-guw5
---

Tom (2026-11-22 01:14): smooth wire glints (picked from the polish list).

Cause: the strand helix on bare conductors repeats every 35 mm and six times round the wire. On a wire one or two pixels wide it is far finer than a pixel, so the highlight breaks into dots.

- [x] Fade the helix once it is finer than a pixel; add its spread to the roughness
- [x] Tom's look on the before and after (01:18: keep)
- [x] Commit

## Summary of Changes

The wire pass measures helix cycles per pixel along and across each wire. Past 0.15 the helix fades; at 0.5 it is gone, and the roughness rises to carry its spread. The glint reads as one soft line.
