---
# stimming-ahjx
title: 'Lava lamp: Classic''s room, less shine, pick it up'
status: completed
type: task
created_at: 2026-11-03T21:09:20Z
updated_at: 2026-11-03T21:09:20Z
---

Tom found the lamp too shiny and could not pick it up. Classic's scene was better.

- [x] Port Classic's desk, wall and desk reflection, following the moving lamp
- [x] Remove the big glass streak and wax glints
- [x] Drag the metal to lift and carry the lamp; release drops it with a thud
- [x] Drag beside the lamp still tips it; the desk stops it clipping

## Summary of Changes

`lava/index.html` gains `lampLight`, `seeLamp`, `wallCol`, `deskCol` and `room`. A `lift` gesture and `floorAt` handle the hand and the desk.
