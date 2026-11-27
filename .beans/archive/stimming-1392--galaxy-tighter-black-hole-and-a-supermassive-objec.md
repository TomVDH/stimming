---
# stimming-1392
title: 'Galaxy: tighter black hole, and a Supermassive object'
status: completed
type: task
priority: normal
created_at: 2026-11-03T23:54:24Z
updated_at: 2026-11-03T23:59:47Z
parent: stimming-ocok
---

Tom: the disk stands too far off the event horizon, and the Add tray needs a supermassive object. The lens strength ignores the horizon size and grows as the camera moves in.

- [x] Tie the lens to the horizon radius, at any zoom
- [x] Add Supermassive to the Add tray; it places a hole at once
- [x] Check 1280 and 375 px with a clean console
- [x] Commit through a private index and push

## Summary of Changes

- The lens strength is now 2 horizon radii, the physical value, and it holds at any zoom.
- The far side of the disk no longer lifts into a wide arch, so the disk hugs the horizon and the ring sits inside the eye.
- Stars behind the hole bend less, for the same reason.
- Supermassive is the 17th object in the Add tray. It places a hole at once, without mergers, and it grows to the top mass.
