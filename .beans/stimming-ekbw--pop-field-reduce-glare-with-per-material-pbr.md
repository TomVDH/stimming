---
# stimming-ekbw
title: 'Pop field: reduce glare with per-material PBR'
status: in-progress
type: task
priority: normal
created_at: 2026-11-27T22:44:38Z
updated_at: 2026-11-27T23:09:21Z
---

Tune each dome material with a physically based light response and reduce glare.

The shader and JavaScript syntax checks pass. Visual review in the in-app browser remains; the browser pane is unavailable in this session. Site type-check currently fails in shared/flare.js outside this toy.

Added randomized material-specific colour ranges for all 18 materials. JavaScript syntax and table coverage checks pass. Visual review remains.

Added a Signal material tray with 18 labeled swatches, keyboard navigation and material selection. Visual review remains.

Tray previews now render the real hex shape and dome shader. Each preview keeps the palette used on selection. JavaScript and shader syntax checks pass; visual review remains.
