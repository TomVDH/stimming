---
# stimming-khc0
title: 'Shell: Dev opens as a tuning popover beside the stage, not a full sheet'
status: in-progress
type: task
priority: normal
created_at: 2026-11-24T05:52:45Z
updated_at: 2026-11-24T06:09:41Z
---

Tom, 2026-11-23: the Dev menu occludes the entire screen. He wants the visual and tuning settings in a standardized popover layout, or the list as the place a popover spawns from.

Bar v3 (shared/signal.js, shared/signal.css) opens Dev as a popover docked at a stage edge. No glass over the stage. Rows keep their groups in a compact label, control, value layout. Every toy with dev rows gets it with no toy change. Replaces the toy-local stopgap in solarloop/index.html (stimming-on77).

- [x] Sketch in barlab/ and show Tom (Tom: yes, 2026-11-23)
- [x] Build in shared/signal.js and shared/signal.css
- [x] Check Solar loop, Tornado, Railgun at 1280 and 375 x 812; reduced motion; clean console
- [x] Bar test passes (102/102)
- [x] Docs true (docs/plans/bar-v3.md, GLOSSARY.md, DESIGN.md)
- [ ] Tell the Solar loop session the stopgap can go
