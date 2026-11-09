---
# stimming-glot
title: 'Window seat: three.js wing spike'
status: in-progress
type: task
created_at: 2026-11-09T18:24:15Z
updated_at: 2026-11-09T18:24:15Z
parent: stimming-w1nd
---

Spike (Tom, 2026-11-09): does three.js earn its place in Window seat?
Hybrid: the raw shader keeps the outside and the cabin. three.js draws the near aircraft as meshes into pass 1.
Page: `window/spike-three.html` (noindex). Wing code: `window/wing3.js`. The live toy stays untouched.

- [ ] Lofted airfoil wing: main box, inboard and outboard flaps, aileron, spoilers, winglet
- [ ] Nacelle, pylon and three flap-track fairings as meshes
- [ ] Physical paint lit by the baked sky (PMREM), the sun and its shadows
- [ ] Shared WebGL2 context; composite into the outside buffer
- [ ] Screenshots to Tom: current vs spike, Dusk and Dawn
- [ ] Verdict: GPU cost, look, code size
