---
# stimming-vz29
title: 'Observatory: dev pause button for the cuts'
status: completed
type: task
priority: normal
created_at: 2026-11-18T02:18:20Z
updated_at: 2026-11-18T03:13:28Z
parent: stimming-wqq9
---

With ?dev, a button in the middle of the stage pauses and resumes the pick sequence (Tom, 2026-11-17).

- [x] Pause freezes the machine, the cuts and the loop; no per-frame work while paused
- [x] Button shows only with ?dev, only while the cuts show
- [x] A skip (tap, Esc) ends a pause
- [x] README notes the switch
- [x] Build, check, tests; live check with ?cuts&dev

## Summary of Changes
loop.ts: a ?dev Pause button mid-stage during the cuts; the loop stops while paused; a skip ends the pause. index.html: its style. README notes it.
