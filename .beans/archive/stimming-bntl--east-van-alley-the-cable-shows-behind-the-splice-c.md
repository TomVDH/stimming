---
# stimming-bntl
title: 'East Van Alley: the cable shows behind the splice case''s near end'
status: completed
type: bug
priority: normal
created_at: 2026-11-22T09:09:14Z
updated_at: 2026-11-22T09:13:15Z
parent: stimming-guw5
---

Tom (2026-11-22 01:07): the camera facing end of the wire cylinder -- wire seem behind it vs coming through it.

- [x] Find the cause: the moving layer writes no depth, and the case draws after its cable, so it covers the cable that runs out toward the eye
- [x] Fix: the case carries its cable's radius (hh); where the ray meets the cable first, outside the case, the case discards
- [x] Tom's look on the before and after (01:13: keep)
- [x] Commit

## Summary of Changes

A ROUND rider on a cable carries the cable's radius in hh. Its fragment shader meets the ray with the cable's cylinder; where the cable comes first, outside the case, the case discards. The cable now enters the near end cap.
