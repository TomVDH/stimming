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

- [x] Lofted airfoil wing: main box, inboard and outboard flaps, aileron, spoilers, winglet
- [x] Nacelle, pylon and three flap-track fairings as meshes
- [x] Physical paint lit by the baked sky (PMREM), the sun and its shadows
- [x] Shared WebGL2 context; composite into the outside buffer
- [ ] Screenshots to Tom: current vs spike, Dusk and Dawn
- [ ] Verdict: GPU cost, look, code size

Findings (2026-11-09, browser pane, 707x755):
- Frame time matches the live toy: 10 ms median on both (display cap).
- The env map takes the shader's satin squash; without it, curved skin mirrors dark ground in bands.
- Fairings read as flat blades in daylight; they need a rounder, shorter canoe.
- Spoiler side edges catch the sun as ridges.
- The shader's wing fog, storm air and flash tint do not reach the meshes yet.
