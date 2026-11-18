---
# stimming-uknp
title: 'Observatory: replay the cuts shot by shot'
status: completed
type: task
priority: normal
created_at: 2026-11-18T03:09:13Z
updated_at: 2026-11-18T03:10:16Z
parent: stimming-wqq9
---

Tom, 2026-11-17: an easier way to replay shot per shot.

- [x] The Dev Shot row (1 to 5) replays from that shot's start
- [x] A fresh machine at the pick's state; machine and cuts fast-forward unseen
- [x] A pause holds on the shot's first frame
- [x] The ?cuts review picks a star at least 35° high, so the lift reads
- [x] Live: 4, 2, 5, 3, 1 each land on their shot

## Summary of Changes
loop.ts replayShot and pickStart; setup.ts Shot row onPick; README.

Also: a temporary DEV COMPOSITING STRIP over the bar with ?dev: previous, 1 to 5, next, Replay, Pause. Tom, 2026-11-17: strip it entirely after compositing (block in loop.ts, .dev-shots in index.html).
