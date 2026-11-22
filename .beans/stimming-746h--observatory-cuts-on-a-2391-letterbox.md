---
# stimming-746h
title: 'Observatory: cuts on a 2.39:1 letterbox'
status: in-progress
type: task
priority: normal
created_at: 2026-11-18T02:51:45Z
updated_at: 2026-11-22T11:10:27Z
parent: stimming-wqq9
---


Tom, 2026-11-17: the cuts want a letterbox, and the scene framed for it. He picked 2.39:1.

- [x] Bars sized to a 2.39:1 picture on any stage; none on a wider stage
- [x] Each shot framed for the band: a cut's fov is the band's vertical fov
- [ ] Tom's look; retune shots with the Dev camera rows

## Check, 2026-11-22
- The five cuts play end to end at `?cuts` on a 1280x720 stage.
- The bars measure 74.9 px each on a 1248x672 canvas: the picture is 2.390:1.
- The bars go when the dip ends.
- Open: a portrait stage shows a thin band, and the `tall` aims never apply.
- Open: the obs-building branch sets DRUM_H to 4.06. After that merge, AXES_Y and FLOOR_Y in view/cuts.ts are stale.
