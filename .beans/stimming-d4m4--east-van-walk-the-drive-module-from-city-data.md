---
# stimming-d4m4
title: 'East Van walk: the Drive module from city data'
status: completed
type: task
created_at: 2026-11-15T05:26:40Z
updated_at: 2026-11-15T05:26:40Z
parent: stimming-guw5
---

Plan docs/superpowers/plans/2026-11-14-eastvan-progressive.md, Task 7.

- [x] driveParts(data, clip): disc for the Corner, rect for the module; node tests
- [x] modules/drive.js: the lane mouth on Commercial Drive, 30 x 30, YAW pi/2
- [x] The licence credit shows when the Drive module is near
- [x] Checked at stop 5 and on the Corner; stills to Tom

## Summary of Changes

- drive.js: driveParts(data, clip) cuts the city data to a disc (the Corner) or a rect (the walk's slice); loadDrive() keeps the Corner.
- modules/drive.js: the lane's mouth on Commercial Drive, 30 x 30 m, turned by YAW pi/2; parts load on the first visit.
- The licence credit shows when the Drive module is near, and on the Corner.
- node tests: the slice stays inside its rect, the lane mouth is open, the disc keeps 24 shops.
