# Pendulum wave (`pendulum`)

- **Shelf:** Main #16
- **Tier / Size:** `three` · 51 KB
- **Verdict:** Clean, responsive physics and musical audio overall, with real gaps in WebGL context-loss handling, hidden-tab drone cleanup, and stale Bar v2 DOM wiring.

## Bugs
- No WebGL context-loss handling: renderer in pendulum/index.html:1203 never attaches webglcontextlost or webglcontextrestored listeners to renderer.domElement (and has no pagehide disposal for geometry, materials, PMREM environment, or renderer).
- Background audio leak when hidden: whenVisible (pendulum/index.html:1156) only sets onScreen = false without suspending kit.ac or silencing rigA.pad, so the 4 continuous triangle drone oscillators started in bus() (pendulum/index.html:308-315) keep playing in background tabs whenever frame() stops before hitting the idle else branch (line 1002).
- Bar v3 aria-label drift and stale Bar v2 selectors: chipFor (pendulum/index.html:113-116) queries hidden .stim-ui .s2-chip elements, mutates .s2-kbd directly, and showPattern() (line 227) updates aria-label only on relBtn; shared/signal.js (lines 263-275) does not sync aria-label to the visible .sg-act button, so screen readers miss the active pattern name.
- Unprotected rAF loop: frame() (pendulum/index.html:956-1008) does not wrap step() or draw() in try/finally, so any runtime error leaves raf at 0 and stalls the toy without showing .fail.
- Premature DPR downgrade and per-move allocation: frame() (pendulum/index.html:961-964) latches lowDpr = true after 20 slow frames without a startup warmup window, and pick() / sweep() (lines 1031, 1051) allocate a new THREE.Vector3 on every pointer move.

## Labels, Copy & Menu Settings
- Ambiguous How to play rows: help (pendulum/index.html:110-111) passes bare 'drag' for both ['drag', 'Swing a ball'] and ['drag', 'Lift balls by their strings'], causing Bar v3 to render identical drag icons instead of using 'drag a ball' / 'drag strings' (and 'hold stage' for Rush time).
- Missing Reset in Settings: COUNT_KEY and VIEW_KEY persist to localStorage (pendulum/index.html:95, 914, 1148), but the bar spec defines no reset callback to restore the default 20-pendulum Perspective state.
- Direct shell styling and silent phase guard: style rules in pendulum/index.html:46-57 mix stale .s2-chip rules with direct .sg-ui .sg-btn overrides, and release() (line 234) silently no-ops during the 0.9s drop-in phase without disabling the Release button.
- Importmap and import style drift: pendulum/index.html:25-30 omits the standard shared importmap entries from docs/standards/code.md and loads Three.js via namespace import (line 1196) instead of named imports.

## Gameplay Improvements (up to 5)
1. Allow gentle camera orbit (right-drag or two-finger drag) with a double-tap/click snap back to the framed view so you can look straight down the Z-axis of the row to watch helical waves emerge in depth.
2. Let tapping any ball deliver a clean single-impulse pluck and add a direct pattern picker (plus extra wave presets like V-split or golden-ratio phase) so you do not have to cycle through all four patterns to reach one.
3. Add a subtle 'Perpetual' toggle in Settings that applies a tiny phase-preserving escapement drive (zero net damping) so the wave can cycle endlessly as a calm desk sculpture without winding down over 15 minutes.
4. Add 3 or 4 curated sound timbres or pentatonic/lydian tunings in Settings (e.g. Warm Marimba, Glass Celesta, Kalimba) using richer physical synthesis or a small procedural hall impulse under the 2.5 MB budget.
5. Let dragging along the beam or holding with a vertical slide smoothly brush a custom wave profile across all balls at once, complementing the existing string-sweep strum.

## Graphics Polish (up to 3)
1. Ground the floating I-beam on machined brushed-metal A-frame end-posts over a matte dark stage floor receiving soft PCFSoftShadowMap shadows and subtle coloured bounce light from the beads.
2. Upgrade the 3-plane studio() PMREM to a richer HDR studio light-dome texture and add fine metallic collar eyelets at each bead neck and slotted grommets along the beam flange.
3. Smooth the 5-step quantized dashes in TRAIL_FS (pendulum/index.html:482-495) into continuous tapered afterimage ribbons and add a subtle clearcoat rim pulse on each bead as it passes bottom-centre.
