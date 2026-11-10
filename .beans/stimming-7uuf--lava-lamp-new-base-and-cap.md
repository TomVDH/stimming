---
# stimming-7uuf
title: 'Lava lamp: new base and cap'
status: completed
type: task
priority: normal
created_at: 2026-11-10T17:13:25Z
updated_at: 2026-11-10T17:15:03Z
---

Redo the lamp armature in lava/index.html. The glass profile and the wax stay.

- [x] New base and cap shape
- [x] New material
- [x] Hit tests, foot shadow and flip still fit
- [x] QA at 1280, 375x812, 812x375, flipped; 30 fps
- [x] Commit, push, check live

## Summary of Changes

The brushed cone base and cap are now stacks of fat glossy enamel rings: four in the base, three in the cap, cream and the lamp colour in turn. The rings stay inside the old outline, so the hit tests, the foot shadow and the flip are unchanged. Headless QA at 1280x800, 375x812, 812x375 and flipped: 60 fps, console clean.
