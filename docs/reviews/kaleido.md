# Kaleidoscope (`kaleido`)

- **Shelf:** Main #8
- **Tier / Size:** `webgl2` · 60 KB
- **Verdict:** Solid, tactile WebGL2 and rigid-body kaleidoscope with crisp procedural glass and audio, held back only by a few lifecycle/context-loss gaps and minimal customization.

## Bugs
- Missing whenVisible helper (kaleido/index.html:1385-1386): uses manual IntersectionObserver and visibilitychange listeners that only call wake() when visible, without immediately cancelling queued rAF frames or suspending the WebGL/AudioContext when hidden or scrolled off-screen.
- Stale Bar v2 selector (kaleido/index.html:1300): keydown handler checks .s2-sheet instead of Bar v3's .sg-sheet (only mitigated in practice because shared/signal.js stops key propagation in capture phase for non-popover sheets).
- Context-loss handling gap (kaleido/index.html:1039-1040, 1342-1351, 1369): uses raw webglcontextlost/webglcontextrestored listeners instead of shared/gl.js onContextLoss; if context is lost during KHR_parallel_shader_compile polling in initGL(), getProgramParameter returns null, boot() calls failed() (hiding canvas and controls), and webglcontextrestored never un-hides the canvas or clears .fail.
- No try/finally around step() and render() (kaleido/index.html:1159-1211): frame() calls step() and render() directly without try/finally, so any runtime exception breaks the animation loop silently.
- Audio unlock misses S shortcut (kaleido/index.html:187-195, 104): GESTURE_KEYS omits 's'/'S', so a returning visitor with persisted sound enabled who presses S to shuffle before clicking or pressing Space/arrows gets silent glass until another gesture wakes AudioContext.

## Labels, Copy & Menu Settings
- How to play row ['move', 'Show the mirrors'] (kaleido/index.html:108) maps to touch-drag ('Show the mirrors') on touch screens via shared/signal.js, even though pointermove (kaleido/index.html:1238) ignores non-drag touch input and dragging turns the barrel.
- Stage aria-label (kaleido/index.html:50) lists drag, click, arrow keys, Space, and S, but omits hovering/moving to reveal the mirror seams as documented in help.
- No Bar v3 Settings rows or reset callback exist (only site Quality is shown), and the selected Mirrors mode ('6', '12', 'tri') does not persist across reloads.

## Gameplay Improvements (up to 5)
1. Add a Glass Palette setting (e.g. Jewel, Sea Glass, Amber & Ink, Botanical) with persisted selection so the drum feels like swapping between distinct physical kaleidoscopes.
2. Support scroll wheel or pinch zoom to smoothly vary uRho (focal magnification) so users can inspect intricate shard clusters or pull back for full-barrel rosettes.
3. Let right-drag or gentle device tilt rotate the physics gravity vector (GRAV) instead of locking it downward, letting the pile drape across different mirror angles without a full shake.
4. Add 8-mirror and 10-mirror symmetry choices alongside 6, 12, and Triangle in the Mirrors selector to cover more classic geometric divisions.
5. Add an optional slow Ambient Drift toggle in Settings (off by default, respecting reduced motion and the 60s sleep budget) for hands-off desk-toy cascading.

## Graphics Polish (up to 3)
1. Split depth layers L === 0 and L === 1 across two cell uploads (or separate texture slices) so FS can apply subtle parallax and textureLod depth-of-field blur between back and front glass as uApex shifts.
2. Add angle-dependent iridescent/dichroic glints in drawCell() (keyed to body angle minus uTheta) and micro-bubbles in bead/rod/moon paths so pieces sparkle dynamically while tumbling rather than rotating flat sprites.
3. Replace the plain black outer cutoff (r >= 1.03 in look()) with a dark machined brass/anodized eyepiece rim, faint eyepiece glass reflection arc, and subtle resting mirror-seam ghosting.
