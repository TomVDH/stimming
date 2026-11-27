---
# stimming-d3j0
title: 'Observatory: telescope viewer workbench (scope.html)'
status: completed
type: task
created_at: 2026-11-22T09:53:12Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-wqq9
---

Workbench page for the hero refractor alone: orbit, tube altitude and azimuth, turn. Files: observatory/scope.html, observatory/src/viewer.ts, tools/build.mjs (extra entry for observatory only). Committed on main after Tom's yes (Tom: "Yes, workbench", "Commit both", 2026-11-22).

- [x] viewer.ts builds with observatory/dist/viewer.js
- [x] renders the telescope in the browser pane
- [x] tube altitude slider moves the tube
- [x] Tom reviews the viewer (2026-11-22)
- [x] Tom signs off the build.mjs change ("Commit both", 2026-11-22)

## Overnight work, 2026-11-22 to 23 (on main)

- [x] PBR: worn-metal roughness map on the metals, cast grain as a bump, filled gear teeth
- [x] Worm is a real single-start helix; it turns 150 times per RA turn; hand wheels turn
- [x] Mount pose from core/clearance.ts: counterweight down, meridian flip in five phases
- [x] Deterministic clearance check, scope.html?clearance: 0 clashes over 84 sky poses and 164 flip samples
- [x] three 0.170.0 as a dev dependency for the node tests
- [ ] Motor-like, rate-limited slewing
- [ ] Tom's look at the PBR and the flip
