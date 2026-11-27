# Oscilloscope (`scope`)

- **Shelf:** Main #19
- **Tier / Size:** `webgl2` · 170 KB
- **Verdict:** Richly engineered WebGL2 phosphor oscilloscope and hidden MIDI synthesizer with strong visual craft, held back by missing WebGL context-loss recovery, stale Bar v2 selectors, and a few idle/lifecycle leaks.

## Bugs
- Missing WebGL context-loss handling: scope/index.html:124 creates the WebGL2 context without onContextLoss from shared/gl.js or webglcontextlost/webglcontextrestored listeners, leaving all programs, VAOs, and FBO targets permanently broken after a GPU reset.
- Stale Bar v2 selector on slider: scope/index.html:2797,2802 queries `.stim-ui .s2-slider input` to set `aria-valuetext`, which misses the visible Bar v3 `.sg-ui .sg-slider input` controls.
- Stale Bar v2 selector in key handler: scope/index.html:2906 checks `.s2-sheet` instead of Bar v3's `.sg-sheet`, allowing global hotkeys like `P` and `Space` to fire when a Bar v3 `.sg-sheet.sg-dev` popover is open.
- No 60 s idle sleep and uncapped drifting rate: scope/index.html:2665 keeps `requestAnimationFrame(frame)` running indefinitely whenever `drifting()` is true (the default Knot 3:2 state), rather than throttling ambient drift to 30 fps and sleeping after 60 s.
- Hidden-tab timer leaks: scope/index.html:2875-2899,2932-2936 keep `showEgg()`, `hintEgg()`, and `blinkSound()` intervals running at 70 ms / 175 ms while the tab is hidden (`visible === false`), repeatedly calling `paintHud()` and `gl.generateMipmap` in the background.
- Stage-focus gate breaks Arrow keys: scope/index.html:2920 gates `ArrowUp`/`ArrowDown` pitch steps on `document.activeElement === stage`, so arrow keys do nothing on initial load or after clicking an on-screen `.snd-tag` button like `#spin-tag`.
- Shared `MAXSEG` overflow drops mini scopes: scope/index.html:1516,2034 allocates `MAXSEG = 18000` across `sweep()` and all `miniDraw()` traces, so on 16-part songs (`stars`, `toccata`) any frame over ~22 ms silently skips the last minis in the ring.
- Tab hide aborts songs and leaves `volTimer` dangling: scope/index.html:2678 calls `changed()` inside `whenVisible(stage, false)`, permanently destroying an active `tape` instead of pausing it, and `endTape()` (line 1404) never clears `tape.volTimer`.
- Non-float fallback loses HDR core: scope/index.html:2058 falls back to `RGBA8` when `EXT_color_buffer_float` is absent, clamping `acc` to `[0, 1]` so `SCREEN` (line 1905) loses its white-hot center and `DOWN` (line 1856) never hits its `knee`.

## Labels, Copy & Menu Settings
- `bar.help` (scope/index.html:112-113) omits vertical scroll to change pitch (line 2733) and horizontal scroll to step the knot grid size `5×5` to `24×24` (line 2727), and uses two identical `'drag'` rows (`'Tie a knot'` and `'Draw a shape'`) without naming `Knot` vs `Pen` mode; `#stage` `aria-label` (line 53) omits scroll controls too.
- `resetAll()` (scope/index.html:2857-2865) forgets to reset the Knot grid density `KG` / `KC` back to `9` (`9×9`).
- Dead `#phos-tag` control: scope/index.html:57,2327,2900 keeps `<button id="phos-tag">` and its click listener wired even though `paintHud()` unconditionally sets `phosTag.hidden = true`.
- `if (sound.on) sound.set(false)` (scope/index.html:2946) overwrites `stimming.scope.sound` back to `'0'` on every visit instead of remembering the user's sound preference (note: Stage 1 flag `sound_flag_true_in_toys_json` is a false positive for auto-play since the toy boots muted and `toys.json` `"sound": true` correctly signals "Best with sound").

## Gameplay Improvements (up to 5)
1. Direct 3D solid tumbling in Pen mode: allow right-drag or two-finger drag to rotate and toss extruded Pen solids with soft rotational inertia instead of only using the fixed 12 s `SPIN_T` turntable.
2. Continuous micro-detune and interactive grid density: let holding near a Knot cell edge (or dragging slowly with a fine nudge) smoothly detune the ratio so the Lissajous cylinder slowly rolls, and make the `9×9` HUD readout a clickable `.snd-tag` to cycle `KGRIDS` (`5, 9, 12, 24`) without hidden horizontal scrolling.
3. Richer 3D Pen library and optional multi-trace chop: add a few more classic wireframe forms to `PRESETS` (dodecahedron, torus knot, gyroscope rings, Lorenz loop) and let holding Shift in Pen mode layer a second trace onto the existing beam-chopper (`traces`).
4. Tactile bench audio feedback: when sound is active, add subtle procedural CRT relay clicks on power-on, phosphor change, and Knot cell transitions, plus optional gentle cabinet/tube warmth in `ensureChain`.
5. Clickable codeword terminal hints: make the bottom-left `egg` readout (`>/ "stars"`) and a subtle `hint` prompt clickable/tappable so pointer and touch users can trigger the hidden MIDI scope orchestra without typing blind.

## Graphics Polish (up to 3)
1. Physical CRT bezel and studio glass reflection: in `SCREEN` (scope/index.html:1884), replace the flat black border outside `inside` with a chamfered recessed bezel lip that catches coloured bounce from the phosphor glow and subtle curved-glass Fresnel sheen.
2. Radial edge defocus and wide halation scatter: vary `uSigma` in `BEAM_VS`/`BEAM_FS` slightly toward the screen corners to mimic electrostatic deflection astigmatism, and add a softer wide-radius glass halation pass in `SCREEN`.
3. Authentic monochrome vs colour masks and etched-graticule parallax: disable the RGB aperture grille stripes (`SCREEN` line 1929) on monochrome lab phosphors (`P31 Green`, `P3 Amber`, `P1 Green`, `P7 Radar`) in favour of fine phosphor micro-grain, and offset `hudTex` slightly relative to `uAccum` for real front-glass depth.
