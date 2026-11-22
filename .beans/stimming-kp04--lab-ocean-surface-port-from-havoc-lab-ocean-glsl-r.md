---
# stimming-kp04
title: 'Lab: ocean surface port from havoc lab ocean GLSL (raw WebGL2, Environment stack)'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-22T10:15:00Z
updated_at: 2026-11-22T10:19:14Z
---

Stack type: Environment (raw WebGL2 on shared/environment.js), reference foghorn. Port the havoc lab/ocean/ocean.js sea surface GLSL into a new Lab toy. Compare with shared/water.js. Checklist: [ ] read havoc surface main, [ ] toy shell, [ ] render, [ ] QA at 1280 and 375, [ ] compare note.

## Progress (2026-11-22)

Retargeted from lab/ocean/ocean.js to the Classic water in havoc src/view/water.js (CPU solver, TSL). Classic depends on the solver, a prepass copy and the sea palette, so this slice is procedural.

- [x] Read havoc classic surface (src/view/water.js) and the lab GLSL
- [x] Toy shell: breakers/index.html, Shader stack, raw WebGL2, shared/water.js and shared/sky.js pasted
- [x] Renders in the preview; click sends a ring; front reads as a white crest at about 5 s
- [ ] Early fill: a full white disc shows at 1 to 2 s after a click. Tune the foam term.
- [ ] Not yet: toys.json entry (favicon 404 until added; needs Tom's yes), QA at 1280, 375 and 812 x 375, reduced motion check
- [ ] Compare against shared/water.js and the Classic look; note what the solver adds

Not committed. Commit with tools/commit.sh once Tom has looked.
