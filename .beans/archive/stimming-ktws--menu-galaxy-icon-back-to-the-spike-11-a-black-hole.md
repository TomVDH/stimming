---
# stimming-ktws
title: 'Menu: Galaxy icon back to the spike-11 A black hole'
status: completed
type: task
priority: normal
created_at: 2026-11-03T20:07:01Z
updated_at: 2026-11-03T20:10:01Z
parent: stimming-ocok
---

Tom wants the black hole we had: direction A in icons/spike-11.html, the only Galaxy direction kept. 16e3eab redrew it; this restores A.

- [x] Port direction A art and hover into the Galaxy tile and toys.galaxy
- [x] Copy icons/spike/emblems/galaxy-a.svg to shared/emblems/galaxy.svg
- [x] Check the menu loads with a clean console
- [x] Commit through a private index and push

## Summary of Changes

- The Galaxy tile draws direction A: a tilted disk with streaks, two jets, a photon ring and a shadow.
- Hover tilts the disk toward the pointer, grows the jets and flows the streaks; leaving settles to rest.
- `fitIcon` reads an optional `data-box` frame, because rotated groups inflate `getBBox`.
- The brut accent for Galaxy is the disk.
- `shared/emblems/galaxy.svg` is the A emblem.
- The index.html hunks landed in 402ca43, which another session committed with a whole-file add.
