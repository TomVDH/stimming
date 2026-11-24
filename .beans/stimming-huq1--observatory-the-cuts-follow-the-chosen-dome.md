---
# stimming-huq1
title: 'Observatory: the cuts follow the chosen dome'
status: in-progress
type: task
priority: normal
created_at: 2026-11-23T09:58:24Z
updated_at: 2026-11-23T23:34:23Z
parent: stimming-wqq9
---


The selector session (stimming-iv1u): Tom chose a two-beat pick on 2026-11-23, star then telescope, so the cuts must follow either dome.

- [x] cuts.start(phase, view, target, dome = complex.main); the cuts frame that dome's cupola, scale, slit, room and blockers
- [x] Each dome's close model from hero.of(dome): the classic main dome's refractor model, and the big dome's model with the reflector, built after the main one
- [x] The mirror shot plays only with the reflector (complex.big)
- [x] Checked headless with a local, uncommitted swap that drives complex.big: six cuts, the mirror push and hold
- [ ] The selector passes the chosen dome to cuts.start and drives that dome from the machine
