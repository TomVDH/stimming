---
# stimming-24qv
title: 'Shared: lamp-lit rain and snow particles (precipfield.js), Whiteout first, Frietkot next'
status: in-progress
type: feature
created_at: 2026-11-23T19:42:50Z
updated_at: 2026-11-23T19:42:50Z
---


World-space rain and snow streaks, lit by lamps, as a shared module for raw WebGL2 and three.js. Whiteout is the first reference (snow, one lamp). Frietkot is the rain reference and adopts in its own chat. Design: docs/plans/precipfield.md.

- [x] Survey the rain and snow implementations across the toys
- [x] Design doc at docs/plans/precipfield.md
- [x] Tom approves the design
- [x] Implementation plan
- [x] shared/precipfield.js with JSDoc and @ts-check
- [x] Whiteout on the module, same frame (1/255) at four frozen states
- [x] QA Q1 to Q10 on Whiteout, node --check, npm run check
- [x] shared/AGENTS.md file row
- [x] three.js 0.170 ShaderMaterial compiles and draws (pfPlaneCorner keeps the winding)
- [ ] PR with /code-review
- [ ] Merge after review
- [ ] Frietkot adopts it in its own chat (Tom looks first)
