---
# stimming-zqrm
title: 'Spark wheel: WebGPU fluid smoke, a mount, a better place'
status: in-progress
type: task
priority: normal
created_at: 2026-11-15T04:16:31Z
updated_at: 2026-11-15T04:52:51Z
parent: stimming-oh7b
---

Plan (Tom approved, 2026-11-14): move Spark wheel to the three.js 0.186.1 WebGPU build with the K3 volume fluid for smoke and a flame lick; the present WebGL build stays as Classic. The wheel sits bigger, lower left, on a striker mount.

- [ ] Stage 1: placement, mount and yaw flip on the WebGL build; stills for Tom
- [x] Stage 2: copy to spark/legacy.html (noindex)
- [x] Stage 3: scratch proofs P1 to P4 (untracked)
- [ ] Stage 4: spark/gpu.html, port at parity, no smoke
- [ ] Stage 5: K3 fluid smoke and flame, coupled to the sparks
- [ ] Stage 6: quality ladder, Smoke toggle, idle, reduced motion
- [ ] Stage 7: swap gpu.html to index.html, no-WebGPU redirect, toys.json legacy true
- [ ] Stage 8: docs and final QA

## Notes

- Stage 1 built (2026-11-14), FLOOR -1.65, yaw +0.8 (tall +1.15), camera by aim(), striker mount in the pivot, lights mirrored, contact light below the flint on the camera side, seed embers down the jet, spin gain 0.7, fog 5 to 22. Stills taken at 1280 x 720, 375 x 812 and 812 x 375; clean console. Waits on Tom's verdict on the framing.
- tests/bar-v2.html in the hidden pane: 3 shell failures (narrow moves, narrow slider, values survive). Stage 1 does not touch the shell or the bar spec; recheck with the pane shown.

- Stage 3 proofs (2026-11-14), one throwaway page on three 0.186.1 WebGPU, Metal, no console errors:
  - P1 sparks: `NodeMaterial.vertexNode` with `attribute('aA', 'vec4')` on the CPU-written `InstancedBufferAttribute`s; `addUpdateRange` uploads hold after the ring wraps (8000 slots); additive `CustomBlending`; the mirror variant flips y in JS.
  - Pitfall: `select()` in the vertex maths puts a branch's maths inside that branch. A value first used in one branch is undefined for the other vertices, and nothing draws. Use column masks (`step`, `mix`) and no `select()` there.
  - Set `fog = false` on the spark material; a NodeMaterial fogs a `fragmentNode` too.
  - P2: knurl normal map, material array, `PMREMGenerator` + `RoomEnvironment`, `Fog`, the mirrored group under the transparent floor all draw. Use `renderer.getMaxAnisotropy()`.
  - P3: `RenderPipeline`, `pass(scene, camera, { samples: 2 })` (the target reports 2 samples), `bloom(node, 0.8, 0.45, 0.85)`, grade in TSL with `screenUV` and `interleavedGradientNoise`.
  - P4: a `NodeMaterial` box (BackSide, NoBlending, no depth test) in its own scene, `pass().setResolutionScale(0.5)`, `gaussianBlur`, composite `scene * (1 - vol.a) + vol.rgb`. The volume writes opacity in alpha, so a cleared pixel leaves the scene alone. The plume draws over the wheel until stage 5 adds the occlusion test.
  - Hidden pane: rAF stalls. The probe ran on `setTimeout` in a background tab and posted `drawImage` copies of the canvas to a local sink.
