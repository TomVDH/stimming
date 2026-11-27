# Magnet balls (`magnet`)

- **Shelf:** Main #11
- **Tier / Size:** `three` · 60 KB
- **Verdict:** Clean, tactile physics and custom dipole-field shaders wrapped in a responsive toy, with minor audio/visibility lifecycle gaps, a missing WebGL context-loss handler, and a few Bar v3 help-row ambiguities.

## Bugs
- Missing WebGL context-loss handling: `magnet/index.html:1351` (`start()`) creates `new THREE.WebGLRenderer` with no `webglcontextlost` or `webglcontextrestored` listener on `renderer.domElement`, so context loss leaves `frame()` rendering to a dead context.
- Incomplete visibility and audio lifecycle: `magnet/index.html:1333-1334` hand-rolls `IntersectionObserver` (reading only `[e]`) and `visibilitychange` instead of `whenVisible`, never cancels a queued `raf` or suspends `ac` on tab hide/offscreen, so continuous `hum` (`drone`) and `roll` (`rumble`) oscillators keep running in the background if a magnet or roll is active.
- Idle audio leak on unmute/gesture: `magnet/index.html:1329-1332` (`sound.onChange`) and `magnet/index.html:165-170` (`unlock`) call `audio()` (`ac.resume()`) when the table is already settled (`!raf`), without calling `rest()`, leaving the `AudioContext` and its looping `src`/`h1`/`h2` nodes running while idle.
- Stale Bar v2 sheet selector: `magnet/index.html:1314` guards keydown with `e.target.closest?.('..., .s2-sheet')` instead of Bar v3's `.sg-sheet` (only mitigated by `signal.js`'s capture listener while a modal sheet is open).
- Incomplete error fallback: `magnet/index.html:1337-1339` (`failed()`) shows `.fail` but never calls `ui.hideControls()` or `stage('first-frame')`, leaving dead Bar v3 buttons on screen and delaying error reveal until the 6s intro timeout.

## Labels, Copy & Menu Settings
- Duplicate input labels in `bar.help` (`magnet/index.html:78-80`): both `['double-click', 'Flip a ball']` and `['double-click', 'Blast the balls apart']` use bare `'double-click'` with no target noun (unlike `'double-click ball'` / `'double-click table'`), so Bar v3 renders identical icons for both rows; `'hold'` and `'hold + drag'` similarly omit `'table'`.
- Copy mismatch on the hex preset: `bar.actions` (`magnet/index.html:70`) labels the button `'Hexagon'`, while `bar.help` (`magnet/index.html:80`) says `'Form a hex sheet'` and `#table[aria-label]` (`magnet/index.html:56`) says `'Press H to form a hex sheet.'`.
- Minor casing inconsistency in `bar.keys` (`magnet/index.html:76`): `'f'` is lowercase while `'R'`, `'H'`, `'S'`, and `'F'` in `bar.help` (`magnet/index.html:79-80`) are uppercase.

## Gameplay Improvements (up to 5)
1. Let scroll wheel / trackpad spin (or Q/E) rotate the raised hex puck's polarity (`wand.ta`) in place so nearby chains ripple and re-braid without dragging.
2. Add an inverse-polarity mode (right-click hold or quick toggle while holding the puck) so the magnet can gently part and repel clusters as well as gather them.
3. Blend a mild dipole-alignment factor into `substep()` radial attraction (`PULL`) so chains naturally resist broadside merging and prefer snapping end-to-end like real magnet spheres.
4. Improve keyboard play by binding `Space` to flip the aimed ball (`aim`) and bracket/Tab stepping to cycle `aim` across clusters, since `nudge()` currently stays locked on one cluster until the mouse moves.
5. Scale snap/clink pitch by cluster size (`sizes[label[i]]`) and add a soft low thud on table-edge bounces (`hitW[i]` in `substep()`) to give large assemblies and wall rebounds richer tactile weight.

## Graphics Polish (up to 3)
1. Replace the flat-shaded `CylinderGeometry` hex `puck` (`magnet/index.html:1485-1515`) with a chamfered hex mesh using `MeshPhysicalMaterial` matching the balls' anodized metal, plus a subtle directional shadow cast onto `tableShade`.
2. Add subtle procedural brushed-metal anisotropy/micro-roughness and a soft polar cap highlight in `ballMat.onBeforeCompile` (`magnet/index.html:1444-1476`) so dipole orientation (`TH[i]`) reads clearly even during fast flips and in tight clusters.
3. Smooth `tableShade` field-line anti-aliasing near dipole singularities using gradient-normalized distance (`length(grad(psi))` instead of raw `fwidth(s)` at `magnet/index.html:991-1004`) and directionalize snap flashes (`P[i]`) along newly formed bond vectors.
