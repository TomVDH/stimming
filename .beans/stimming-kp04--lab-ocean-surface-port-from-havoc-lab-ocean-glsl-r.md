---
# stimming-kp04
title: 'Lab: ocean surface port from havoc lab ocean GLSL (raw WebGL2, Environment stack)'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-22T10:15:00Z
updated_at: 2026-11-23T18:30:00Z
---

Stack type: Environment (raw WebGL2 on shared/environment.js), reference foghorn. Port the havoc lab/ocean/ocean.js sea surface GLSL into a new Lab toy. Compare with shared/water.js. Checklist: [ ] read havoc surface main, [ ] toy shell, [ ] render, [ ] QA at 1280 and 375, [ ] compare note.

## Progress (2026-11-22)

Retargeted from lab/ocean/ocean.js to the Classic water in havoc src/view/water.js (CPU solver, TSL). Classic depends on the solver, a prepass copy and the sea palette, so this slice is procedural.

- [x] Read havoc classic surface (src/view/water.js) and the lab GLSL
- [x] Toy shell: breakers/index.html, Shader stack, raw WebGL2, shared/water.js and shared/sky.js pasted
- [x] Renders in the preview; click sends a ring; front reads as a white crest at about 5 s
- [ ] Early fill: a full white disc shows at 1 to 2 s after a click. Tune the foam term.
- [x] toys.json entry (Tom's yes, 2026-11-23): nl Branding, accent oklch(0.7 0.1 190), sound false, intro emblem shared/emblems/breakers.svg
- [x] Menu: Lab tile first in the Lab list, from A of icon round breakers-1 (no pick yet); hook play pitches the crest and throws spray, rest stands it up; favicon shared/favicons/breakers.png
- [x] Icon round icons/spike-breakers-1.html (Current none, A, D) with emblems, sheet row; captures in docs/qa/breakers/
- [ ] QA at 1280, 375 and 812 x 375, reduced motion check
- [ ] Compare against shared/water.js and the Classic look; note what the solver adds

The toy page is on main (c943ab7e). The menu tile and icon round are on main too.
