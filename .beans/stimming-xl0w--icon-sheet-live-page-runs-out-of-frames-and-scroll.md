---
# stimming-xl0w
title: 'Icon sheet: live page runs out of frames and scrolls itself'
status: completed
type: bug
created_at: 2026-11-25T05:49:43Z
updated_at: 2026-11-25T05:49:43Z
---

Tom (2026-11-24): "lets not g with shape masks -- isntead let's get the most recent icon sheet out -- with all possible variations - -rmember I asked for us to be able to negative sleect (so theyd be removed) as wel las postiively sleect".

The live sheet (tomvdh.github.io/stimming/icons/sheet.html) put 218 old-menu snapshot frames in the page at once. Chrome failed with ERR_INSUFFICIENT_RESOURCES, so most round cards stayed grey. Each snapshot opened at `#<toy>`; that fragment scrolled the sheet to the frame, so the page ran down by itself.

## Checklist
- [x] Earlier menu tiles load near the view, three at a time, and unload far off
- [x] All-rounds galleries unload far off and mount again near; marks stay
- [x] Snapshots take the tile as `?tile=<id>`; the sheet passes no fragment
- [x] Check: no self-scroll, about 25 frames at any point, keep, cut and clear work after a remount
- [x] Push to main

## Summary of Changes

`icons/sheet.html` loads live frames only near the view and unloads them far off. The 51 snapshots in `icons/history/live/` read the tile from `?tile=`, so no fragment scrolls the sheet.
