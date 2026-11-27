# Beach walker (`walker`)

- **Shelf:** Main #20
- **Tier / Size:** `three` · 107 KB
- **Verdict:** A gorgeous, atmospheric linkage and shader piece with rich sky worlds and procedural audio, held back only by missing WebGL context-loss handling, an always-on breeze/surf loop that never sleeps, and a simplified 3D leg mesh compared to its 2D silhouette.

## Bugs
- walker/index.html (lines 88, 924): Missing webglcontextlost listener on skyCanvas to stop the render loop or fall back cleanly to the 2D canvas path on GPU context loss.
- walker/index.html (lines 1854-1865, busy / frame): The rAF loop runs endlessly (except during short 6-15s random lulls) because the ambient breeze keeps busy() true and there is no 60-second idle sleep timer, even under prefers-reduced-motion where ambient drift should stop.
- walker/index.html (lines 316-338, 1864, seaSound): Once surf is initialized, 3 buffer sources and 3 LFO oscillators run forever while the tab is visible and prevent kit.rest() from ever suspending the AudioContext when idle.
- walker/index.html (line 2006): Stale .s2-sheet selector in e.target.closest('input, textarea, select, .s2-sheet') misses Bar v3 sheet/popover containers.
- walker/index.html (line 1374, sea.render): Allocates a new THREE.Vector3 on every frame instead of reusing a scratch vector.

## Labels, Copy & Menu Settings
- walker/index.html (lines 24-29): The importmap only includes three and three/addons/, omitting the standard word-for-word culori, tone, gsap, and simplex-noise entries required by docs/standards/code.md.
- walker/index.html (lines 1945, 1948, 1969, 1974): Time of day choice and Close-up action state use custom localStorage handling (stimming.walker.time, stimming.walker.view) and reset() does not restore settings or view/time to defaults.
- walker/index.html (line 1964): Relies on fragile DOM query .stim-ui button[aria-keyshortcuts="V"] to sync aria-pressed on the Close-up action button instead of a toggle or bar API handle.

## Gameplay Improvements (up to 5)
1. Allow dragging the pennant vane at the top of the mast to manually flick it or pin the wind direction and strength.
2. Add a tactile sand-drawing or dune-shaping gesture along the foreground shore where dragging in the wet sand carves shallow channels that temporarily fill with swash water and subtly tilt the walker as it crosses them.
3. Let the user grab and lift individual foot pads or the frame crossbar to pick the walker up off the sand, watch its legsbicycle freely in the air, and drop it back down with a multi-foot sand crunch.
4. Make the distant lighthouse on the headland (in 2D and added to 3D) or the alien ringed planet respond to a tap with a subtle light sweep or ring-dust ripple across the water.

## Graphics Polish (up to 3)
1. Replace the uniform dark cylinders and spheres of the 3D walker with PVC-colored translucent yellow/ivory bamboo-and-tube materials featuring subtle subsurface rim glow, zip-tie joint cuffs, and the triangular web plates that currently only exist in the 2D fallback renderer.
2. Add wind-driven sand saltation and sea-spray particle sheets in the 3D scene that catch the low sun flare and swirl around the planted feet on impact, replacing the flat 2D canvas line streaks when WebGL is active.
3. Deform the wet sand reflection and shader normal map around each planted foot and fresh footprint so puddles ripple outward on footfall and footprints hold specular water pools before the swash erases them.
