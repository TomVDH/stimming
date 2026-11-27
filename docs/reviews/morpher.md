# Morpher (`morpher`)

- **Shelf:** Main #1
- **Tier / Size:** `three` · 120 KB
- **Verdict:** Morpher is clean, responsive, and well-crafted overall, with a missing WebGL context-loss handler, no 60 s idle sleep in auto-morph mode, and minor Bar v3 label and pointer polish gaps.

## Bugs
- Missing WebGL context-loss handling: `morpher/index.html:866` (`start()`) and `morpher/lab.html:1237, 1500` (`labExtrude()`, `labSdf()`) create `THREE.WebGLRenderer` instances with no `webglcontextlost` or `webglcontextrestored` listeners on `canvas`.
- Stale Bar v2 selector in `morpher/index.html:575`: the global `keydown` guard checks `.s2-sheet` instead of Bar v3's `.sg-sheet` (mitigated for modal sheets by `shared/signal.js` capture-phase `stopPropagation`, but leaves `.s2-sheet` dead for popovers or direct focus).
- No idle sleep or 30 fps drift cap: when `Shape` is `Changing` (`auto` is true), `step()` at `morpher/index.html:693-712` always returns `true`, keeping `frame()` running at full refresh rate indefinitely instead of throttling to 30 fps or sleeping after 60 s without input.
- Missing `lostpointercapture` handler in `morpher/index.html:534-549`: `pointerdown` calls `stage.setPointerCapture(e.pointerId)`, but only `pointerup` and `pointercancel` clear `down` and `grab.on`, so lost capture leaves a shape stretch stuck active.
- Invisible pointer state in `morpher/index.html:43, 496, 599`: `.stage--morpher.live` sets `cursor: none`, yet grabbing the shape fades `ptr.w` to 0 and `scroll` sets `ptr.on = false`, leaving neither OS cursor nor pip visible during a grab or after scrolling until the pointer moves again.

## Labels, Copy & Menu Settings
- Duplicate input label `'drag'` in `morpher/index.html:170, 172`: `keys` (`['drag', 'throw a blob'], ['drag', 'stretch the shape']`) and `help` (`['drag', 'Throw a blob'], ['drag', 'Stretch the shape']`) both pass bare `'drag'`, producing two identical mouse-drag icons in How to play without naming the target (e.g. `'drag shape'`).
- Missing icon and stale display hint on `Shape` in `morpher/index.html:163, 166`: `{ value: 'auto', label: 'Changing' }` omits an `icon` while the 12 other `SHAPES` options have SVGs (leaving a blank tile icon in the Bar v3 picker grid), and `display: 'stepper'` is ignored in Bar v3 for lists over 4 options.
- No `reset` callback or persisted settings in `morpher/index.html:165-174`: `initPage` passes no `reset` handler to restore `Shape` (`'auto'`) and `Blend` (`0.14`), and neither control persists under `stimming.morpher.*`.

## Gameplay Improvements (up to 5)
1. Add hold-to-herd gravity on empty stage space (or right-drag) so holding draws orbiting blobs into flowing streams and slingshots them together into the core.
2. Let a quick double-click on the central shape advance to the next form (or trigger a playful spin-morph impulse), making the centerpiece directly interactive without opening the bar.
3. Let colliding blobs fuse into larger slow-orbiting composite blobs when they meet, and transfer a soft chromatic ripple across the central shape when absorbed.
4. Add optional procedural Web Audio / Tone.js feedback via `audioKit()` (muted by default), with rubbery pitch bends while stretching the shape, soft water-drop plops on blob collisions, and a gentle low-pass gulp on absorption.
5. Support scroll wheel or pinch on the stage to smoothly adjust `Blend` (or scale the core) directly in place without needing to open the bar.

## Graphics Polish (up to 3)
1. Upgrade `FRAG` (`morpher/index.html:401-412`) from flat 2D rim shading to pseudo-3D SDF bevel height using multi-sample gradient normals, glossy Blinn-Phong specular highlights, and translucent subsurface glow where blobs fuse.
2. Add a soft offset contact shadow and subtle distance-field contour ripples (echoing the `#contours` diagram) on the dark `--stage` background around the shape to visualize the blend field as blobs approach.
3. Perturb the gradient coordinate `t` in `FRAG` (`morpher/index.html:402-403`) with the grab warp (`pw - p`), jelly squash `uSq`, and morph twist `uTw` so pigments visibly shear and swirl like taffy during pulls and transitions.
