# Balloon letters (`balloons`)

- **Shelf:** Main #24
- **Tier / Size:** `three` · 98 KB
- **Verdict:** A tactile, well-crafted Three.js foil balloon toy with custom SDF inflation meshes, procedural Web Audio, and soft-body physics, needing only minor Bar v3 selector cleanup, context-loss handling, and importmap alignment.

## Bugs
- balloons/index.html:25-30: The importmap only defines 'three' and 'three/addons/', missing 'culori', 'tone', 'gsap', and 'simplex-noise' from the canonical word-for-word importmap in docs/standards/code.md.
- balloons/index.html:2019: The keydown guard checks t.closest?.('input, textarea, select, [contenteditable], .s2-sheet') without '.sg-sheet', though Signal's capture listener intercepts keys when a sheet is open.
- balloons/index.html:2053-2056: The click handler on '.stim-ui' checks '.s2-chip, .snd' and '.s2-sheet' to restore focus to panel (or keep focus on keysIn), which is dead under Bar v3 ('.sg-ui'); clicking a Bar v3 button in shared/signal.js:648 blurs keysIn and closes the mobile keyboard when changing foil or pressing 'Let go'.
- balloons/index.html:2076-2077: Visibility handling wakes the rAF loop on intersection/visibility return, but does not cancel in-flight raf, stop active creak/squeak oscillators, or suspend the AudioContext immediately when the tab hides or leaves the viewport.
- balloons/index.html:2098: WebGLRenderer does not listen for 'webglcontextlost' on renderer.domElement to cancel the animation loop and reveal the '.fail' message, nor does it dispose geometries, materials, and renderer on pagehide.
- balloons/index.html:2226-2238: The shader pre-compile loop creates four spare THREE.Mesh instances and adds them to scene, then only sets m.visible = false instead of removing them from scene and disposing their materials.

## Labels, Copy & Menu Settings
- balloons/index.html:1803: Ambient drift settles after 20 seconds of inactivity ('idleS > 20'), whereas docs/standards/code.md specifies easing to a stop 60 seconds after the last input.

## Gameplay Improvements (up to 5)
1. Allow dragging a balloon's hanging ribbon to tug the letter down and release it with a bouncy snap back into place.
2. Let two balloons rubbed vigorously together build static charge so they cling to each other or attract nearby confetti scraps.
3. Add a gentle double-tap or pinch gesture on an inflated letter to tie or untie it from the word, letting individual letters drift freely around the stage ceiling.
4. Support punctuation symbols like hearts or stars via simple key chords (such as Shift+3 or *) that inflate into shaped foil balloons alongside the letters.
5. Let deflated limp balloons resting on the floor be re-inflated with a quick pump gesture (repeated taps) before they sink away.

## Graphics Polish (up to 3)
1. Add a high-frequency anisotropic micro-flake or brushed mylar normal detail to FOIL_FN so close-up reflections break into authentic metallic sparkle along the seam pleats.
2. Render soft contact shadows and subtle ambient occlusion between adjacent letters when they press against one another in a word.
3. Give the curling party ribbons a two-sided satin sheen with a thin specular edge highlight and subtle shadow cast from the balloon body above.
