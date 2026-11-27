# Pin art (`pins`)

- **Shelf:** Main #5
- **Tier / Size:** `three` · 63 KB
- **Verdict:** Solid, tactile three.js toy with crisp instanced pin physics and clean idle stopping, held back by missing WebGL context-loss handling, incomplete tab-hide audio/loop cleanup, and a stale .s2-sheet selector.

## Bugs
- Stale Bar v2 sheet selector at pins/index.html:1260: global keydown handler checks t.closest?.('input, textarea, select, [contenteditable], .s2-sheet'), missing Bar v3's .sg-sheet class (including .sg-dev).
- Missing WebGL context loss handling at pins/index.html:1366: WebGLRenderer is created without webglcontextlost or webglcontextrestored listeners on renderer.domElement, so context loss fails to prevent default, pause rAF, or recover/show .fail.
- Visibility and audio-sleep gaps at pins/index.html:1016-1018 and 1287-1288: instead of whenVisible from ../shared/stim.js, frame() drops out when document.hidden or !onScreen while quiet < 4 without calling rest(), leaving AudioContext (ac) running and any active whoosh/rattle buffer nodes playing when hidden; IntersectionObserver(([e]) => ...) also reads only the first entry.
- Missing lostpointercapture listener on touch release at pins/index.html:1136: panel.setPointerCapture is called on pointerdown (line 1102), and grabEnd (1137) and lift (1205) listen to lostpointercapture, but release only listens to pointerup and pointercancel, which can strand a stale ID in fingers and block frame grabs at line 1103.
- Touch-drag offset during PINCH_WAIT at pins/index.html:1118-1124: pointermove overwrites fingers.set(e.pointerId, e) before the 90 ms pend.timer fires, causing begin(fingers.get(id)) to stamp at the moved location instead of the initial pointerdown point.
- Unguarded mid-flip shake at pins/index.html:601-602: shake() only checks if (!ready) return without checking flipT >= 0 (unlike shuffle, typeKey, backKey, and flipBoard), allowing Escape to trigger a shake and joltAt while spin() is mid-flip.
- Degenerate fallback fit at pins/index.html:929-938 and 1467: calling fit(16, 9) when panel has zero initial size yields padT + padB > 1.94 with CLEAR_MIN = 38, making span negative and slamming rig.d to 3000 until a real resize occurs.

## Labels, Copy & Menu Settings
- Importmap at pins/index.html:25-30 omits culori, tone, gsap, and simplex-noise from the canonical block in docs/standards/code.md, and the page lacks the Content-Security-Policy meta tag.
- Bar spec at pins/index.html:82-93 has no reset handler, so Settings only shows Site Quality and offers no way to restore the opening hand print, front side, and default camera zoom.
- Help row ['A-Z 0-9', 'Press a word'] at pins/index.html:91 understates GLYPH (line 635), which also accepts punctuation marks (!?&@#$%*+=.,:;'"/()<>-).
- UI labels, Finish options ('Chrome', 'Anodised') with stimming.pins.finish persistence, #board aria-label, and toys.json metadata ('Pin art', 'Everyone tried it with their face', sound: false) are otherwise aligned.

## Gameplay Improvements (up to 5)
1. Add two-way pin sculpting (for example right-drag or Shift+drag to push pins back in toward the plate) so players can refine and carve into raised reliefs without shaking the whole board flat.
2. Couple phone DeviceOrientation tilt (already read in tilt() at line 1169) and sharp frame nudges to subtle pin gravity slip, letting loose pins slide realistically when the board is tilted past upright.
3. Expand the RELIEFS library (lines 464-470) with more tactile everyday objects such as eyeglasses, a coiled watch mechanism, a fern leaf, a seashell, or varied hand poses so Shuffle feels fuller.
4. Scale brush radius smoothly with hold duration (widening slightly as pressure sinks deeper, like pressing a palm or fist) and vary shimmer/clack grain density with pointer speed for richer tactile feedback.
5. Add a third warm metallic finish (such as Brushed Brass alongside Chrome and Anodised) with subtly tuned partial ratios and decay in strike() so each finish has a distinct acoustic character.

## Graphics Polish (up to 3)
1. Add subtle per-pin surface micro-variation (a seeded hash modulating roughness or specular tint alongside grit(i)) and radial lathe darkening in patchHead/patchShaft to break up uniform CG dome reflections.
2. Add a faint front acrylic pane across the frame lip (LIP = 1) with soft environment fresnel sheen plus directional contact shadows on plate and pin shafts aligned with the SpotLight at (-28, 52, 64).
3. Enrich RoomEnvironment with a couple of soft studio light cards and blend anod(vP) with view-angle Fresnel in patchHead so both chrome highlights and thin-film anodised colour shift naturally as the board tilts and flips.
