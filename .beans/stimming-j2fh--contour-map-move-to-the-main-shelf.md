---
# stimming-j2fh
title: 'Contour map: move to the main shelf'
status: completed
type: task
priority: normal
created_at: 2026-11-23T18:58:25Z
updated_at: 2026-11-23T19:40:19Z
parent: stimming-79us
---


Tom, 2026-11-23: "lets promote this to main". Series: Science fair (Tom's pick).

- [x] toys.json: number 73, series science, version 1.5
- [x] Menu: the tile moves from the Lab to the main shelf
- [x] A still in shared/stills/
- [x] Toy doc and plan say main shelf

## Summary of Changes

- toys.json: `contour` moves after `wires` with number 73, series science, stage alpha, version 1.5, sub null.
- index.html: the tile moves from the Lab list to the main shelf, after East Van Alley; its hook stays.
- `shared/stills/contour.webp`: 512 px, a square centre crop of the first frame, 20 KB (made with Pillow: cwebp is not on this PC).
- The toy page's intro drops "Stimming Lab".

## Incident

My first move script opened toys.json for writing before its move code ran; the move code failed on mixed line endings (16 CRLF lines at HEAD), so the working copy stayed empty at 11:28. On Tom's word it was restored from HEAD 11146e47. No unreachable git blob held a newer copy, so any uncommitted toys.json lines from another chat between 11:10 and 11:28 are lost. The script now computes and checks every new text before it writes, and keeps each line's own ending.

