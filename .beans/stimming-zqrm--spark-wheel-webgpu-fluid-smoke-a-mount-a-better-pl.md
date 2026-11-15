---
# stimming-zqrm
title: 'Spark wheel: WebGPU fluid smoke, a mount, a better place'
status: in-progress
type: task
priority: normal
created_at: 2026-11-15T04:16:31Z
updated_at: 2026-11-15T05:35:05Z
parent: stimming-oh7b
---

Plan (Tom approved, 2026-11-14): move Spark wheel to the three.js 0.186.1 WebGPU build with the K3 volume fluid for smoke and a flame lick; the present WebGL build stays as Classic. The wheel sits bigger, lower left, on a striker mount.

- [ ] Stage 1: placement, mount and yaw flip on the WebGL build; stills for Tom
- [x] Stage 2: copy to spark/legacy.html (noindex)
- [x] Stage 3: scratch proofs P1 to P4 (untracked)
- [x] Stage 4: spark/gpu.html, port at parity, no smoke
- [x] Stage 5: K3 fluid smoke and flame, coupled to the sparks
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

- Stage 4 (2026-11-14): spark/gpu.html is the WebGPU build at parity, unlinked and noindex. Sparks, embers and haze are TSL node materials; the post chain is RenderPipeline, the stock bloom node and a TSL grade.
  - The importmap sits in the head before every modulepreload. After them, the map loads in a race and three/webgpu fails to resolve.
  - The loop is the renderer's own (as Fire): wake() sets the animation loop and starts renderer._animation; halt() stops it, so an idle page has no frame callback. A still draw ticks the node frame by hand.
  - three calls the first frame at once with no time stamp; frame() reads performance.now() itself.
  - This renderer bakes RoomEnvironment mirrored left to right against WebGL. room.scale.x = -1 and environmentIntensity 0.15 match the classic face and floor.
  - Bloom: the stock node at strength 1.2 (classic 0.8). Its blur is wider, so the glow is a little tighter round embers than classic.
  - The flat smoke wisp is gone. The Smoke toggle does nothing until stage 5.
  - Test artefact, not a page fault: in a hidden browser pane no rAF fires, so three's node frame stands still and environment, intensity and bloom uniforms do not update. Probes drive frames by timer and tick renderer._animation.nodes.nodeFrame.update() themselves.
  - Checked by probe stills against classic at 1280 x 720 and 375 x 812: rest, grind, three metals, dry floor, long trails, reset, strike, loop stop after the embers cool. The real page loads, grinds and takes a tap with no console error.
  - Not checked: fps on a visible screen, drag by hand, sound by ear, reduced motion, 812 x 375 still.

- Stage 5 (2026-11-14): spark/gpu.html has the K3 volume fluid, copied from Ink between K3 markers and retuned for smoke.
  - Box in the wheel's pivot frame: x -1.4 to 3.4, y from the floor up 6, z ±1.2; grid 80 x 100 x 40 (320k cells), 6 Jacobi sweeps, at most two steps of 1/60 s a frame. Dye r is smoke, g is heat.
  - Sources: a contact puff at the flint, a heat puff a little down the jet (the flame lick), two jet-drag spheres, puffs from bursts and from hot sparks on the wet floor (at most four a step). The rim drags a thin shell of air; the wheel's body holds no smoke.
  - March in the box frame in its own scene, half size, blurred, blended as scene x (1 - a) + rgb before bloom. The wheel hides smoke behind it by a ray and cylinder test. Light: cool rim light with a two-sample shadow, the warm contact light, a warm line along the jet, a little fill.
  - Per metal in METALS: smoke amount and tint, flame gain and ramp. Proposals for Tom.
  - Smoke lingers 9 s after the last puff, fades over the last 1.5 s, then clears; the loop stops after that. The Smoke toggle and reset clear it. Reset stands one small wisp by the rim.
  - Pitfall, same as the sparks: a value first used inside a TSL Loop is undefined when the loop runs no pass. The box position is a var before the emitter loops; without it the smoke vanished when the last emitter stopped.
  - Name clash avoided: the sound code owns burst(); the smoke queue is wisp() and wisps.
  - Checked by probe stills at 1280 x 720 and 375 x 812: grind, linger at 1, 4 and 7.5 s, three metals, toggle off, reset, loop stop. The real page loads (first frame mark at 0.64 s with warm caches), grinds and shows no error.
  - Not checked: frame time on a visible screen (stage 6 measures it), smoke in the wet-floor mirror (none drawn), reduced motion (no smoke by rule), 812 x 375.
