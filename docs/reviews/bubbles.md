# Bubble wand (`bubbles`)

- **Shelf:** Main #25
- **Tier / Size:** `three` · 54 KB
- **Verdict:** Physically expressive three.js soap-film toy with rich interference shading and clean idle sleeping, held back by missing WebGL context-loss handling, incomplete tab-hide cleanup (leaking breath audio), and a stuck-Space edge case on blur.

## Bugs
- No WebGL context-loss handling: `start()` (`bubbles/index.html:1211-1220`) creates `THREE.WebGLRenderer` without a `webglcontextlost` or `webglcontextrestored` listener, so a GPU reset leaves a dead canvas without calling `preventDefault()`, pausing the loop, or showing `.fail`.
- Broken hide/offscreen lifecycle and background audio leak: `bubbles/index.html:1179-1180` hand-rolls `IntersectionObserver` and `visibilitychange` instead of using `whenVisible` from `shared/stim.js` and only wakes on show without pausing or muting on hide. If the tab hides while `whoosh()` (`bubbles/index.html:168-175`) is active or a `raf` frame is already queued, the queued frame still runs offscreen and the looping `breath` noise node (`bubbles/index.html:123-135`) keeps humming in the background tab.
- Stuck held `Space` breath on window blur: `blowStart()`/`blowEnd()` (`bubbles/index.html:69, 1163-1174`) rely on `keyBinder()` in `shared/stim.js:389-406`, which only listens to `keyup` and has no `window` `blur` reset. Tabbing away while holding `Space` leaves `puff.held` stuck `true`, keeping `frame()` running and `whoosh` blowing indefinitely.
- Missing `lostpointercapture` handler on touch: `pointerdown` calls `panel.setPointerCapture(e.pointerId)` (`bubbles/index.html:1143`), while `lift` (`bubbles/index.html:1153-1160`) only listens to `pointerup` and `pointercancel`. Losing capture without `pointerup` leaves `touchId` non-negative, blocking `goHome()`, `doze()` (`bubbles/index.html:154`), and future touches.
- Missing error guard in the main loop and mute fade leftover: `frame()` (`bubbles/index.html:1072-1099`) runs simulation and `draw()` without `try`/`finally`, and `sound.onChange` (`bubbles/index.html:1175-1178`) suspends `ac` without calling `whoosh(0)`, which can leave a brief stale breath burst when unmuting later.

## Labels, Copy & Menu Settings
- Stage 1 flag `bar_missing_keys` is a false positive: `bubbles/index.html:74-80` defines both `keys` (using a `coarse ? ... : ...` ternary, which likely tripped the static check) and `help` with 5 rows (`move slow`, `move fast`, `click`, `space`, `P`). Note that computing `keys` once at load via `coarse` means Bar v2 (`?bar=v2`) will not swap labels if a hybrid device switches pointer types.
- `Pop all` action (`bubbles/index.html:71`, `verb: 'clear'`) stays enabled (`disabled` is never toggled) even when `bubbles.length === 0` and no large film is on the ring (`burstForm()` returns early under `0.5 * R0`). Disabling it when idle would match Bar guidelines and give clear feedback.
- Minor copy/comment drift: `bubbles/index.html:37` still says `in the Bar v2 shell` and line 21 has a `<meta name="claude:viewport-fit-sides" content="cover">` tag; all user-facing Bar v3 labels (`Pop all`, `Blow`, `How to play` rows, and `#air` `aria-label`) are consistent.

## Gameplay Improvements (up to 5)
1. Speed-gated wand contact: in `stepBubbles()` (`bubbles/index.html:519`), any contact with the ring pops bubbles immediately (`dw < b.r + R0 * 0.78`). Only popping above a wand speed threshold while letting a slow wand cushion and herd bubbles via its air wake (`bubbles/index.html:483-487`) would make slow play much more tactile.
2. Controllable breath strength for `Blow`: let scroll wheel or vertical drag while holding `Blow`/`Space` scale `puff` target flow in `stepPuff()` (`bubbles/index.html:218-226`) instead of a single fixed ramp. That lets keyboard and touch users blow large slow floating bubbles as well as fast sprays.
3. Gentle background ripple on tap: tapping empty air in `pointerdown` (`bubbles/index.html:1146`) currently does nothing. Adding a soft radial air pulse (`jolt()` plus a small outward velocity impulse) would make missed taps gently wobble and scatter nearby bubbles.
4. Cluster swirl and soap dip ritual: let circling the wand stir a brief local curl into `wind()` (`bubbles/index.html:460-470`) so clinging bubbles waltz before merging, and let dipping the wand to the bottom edge refresh a thicker, high-chroma film (`form.seed` and initial thickness) with a soft wet plip.

## Graphics Polish (up to 3)
1. Fix tilted wand vs. film dome occlusion: `formMesh` renders in `scene` with `depthTest: false` before `post`, then `ringGroup` renders on top in `top` (`bubbles/index.html:1052-1058`). Depth-testing or clipping the far side of the torus against the film dome would stop the back of the tilted ring from drawing over the bubble attached to it.
2. Rainbow fringe on the tearing pop rim: `BUBBLE_FS` (`bubbles/index.html:763-774`) adds a flat warm flash along `edge` as a bubble tears open. Adding an optical thickness bump along `edge` (for example feeding `edge * 320.0` into `shade()`'s `extra` parameter) would make an iridescent thickened bead race ahead of the tear.
3. Hue-matched falling droplets: `DROP_FS` (`bubbles/index.html:857`) shades all pop droplets with a fixed blue-grey tint. Sampling or passing each parent bubble's interference colour at `b.tear` into a per-droplet color attribute in `droplets()` (`bubbles/index.html:621-634`) would visually tie the mist to the popped film.
