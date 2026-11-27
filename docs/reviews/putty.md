# Heat putty (`putty`)

- **Shelf:** Main #18
- **Tier / Size:** `webgl2` · 28 KB
- **Verdict:** Clean Bar v3 shader toy with responsive tactile deformation and audio, marred by a premature idle-sleep cutoff that freezes warm trails, missing WebGL context-loss recovery, and minor pointer/audio lifecycle gaps.

## Bugs
- putty/index.html:545 (idle) stops the rAF loop when hb < T0 - 0.03 (0.42), while VIEW (putty/index.html:289-291) starts clearing the leuco dye down at th - 0.24 (~0.1775). As a result, thick ridges freeze with ~70% hot pigment still showing after ~11 s and never cool back to cold.
- putty/index.html:99 creates a WebGL2 context without onContextLoss from shared/gl.js or webglcontextlost/webglcontextrestored listeners. Context loss leaves frame() calling into dead GL resources and never rebuilds programs or FBO targets on restore.
- putty/index.html:600-601 listens to pointerup and pointercancel without lostpointercapture or window blur cleanup, so losing capture leaves F.down stuck true and keeps the rAF loop and rub voice active.
- putty/index.html:554-560 (frame, whenVisible) runs rubTo() before checking visible and never zeros rubTo(0) when hidden, so hiding the tab mid-drag leaves the rub noise bed audible until audioKit's 1.5 s rest timer fires.
- putty/index.html:567-575 (pointerdown) sets F.down, resets hb to 1.25, enables Clear, and plays squish() even when clicking the empty table margin outside slab bounds.
- putty/index.html:330-341 (program), 360-370 (makeTarget), and 546-558 (frame) omit gl.LINK_STATUS checks, gl.FRAMEBUFFER_COMPLETE checks, Math.max(1, ...) target size clamping, and try/finally guards around step()/render().

## Labels, Copy & Menu Settings
- putty/index.html:92 (keys) lists 4 entries ('drag', 'hold', '1 2 3', 'c') and omits 'click' ('Press a dent'), whereas line 94 (help) lists 5 rows including ['click', 'Press a dent'] and uses uppercase 'C'.
- putty/index.html:88-95 passes only quality: true in bar with no putty settings (such as cooling speed or firmness/viscosity tied to SIM's uCool and uYield uniforms) and no reset handler.
- toys.json:497 sets accent to oklch(0.76 0.17 300) -> oklch(0.84 0.17 45) (violet to amber), mixing Violet's cold hue (298) with Noir's hot hue (55) instead of matching Violet's cold/hot pair (298 -> 356 in putty/index.html:75).
- putty/index.html:58 leaves <div class="vignette" hidden></div> empty, and docs/toys/putty.md does not exist.

## Gameplay Improvements (up to 5)
1. Support multi-touch (2-5 pointers tracked by pointerId instead of the single F.down lock at putty/index.html:568) so players can pinch ridges together, stretch putty between fingers, or stamp multiple fingertips at once.
2. Add a tactile fold/knead gesture or action (alongside Clear) that stretches and folds existing warm streaks into marbled swirls instead of resetting to a cold blank slab.
3. Let dragging across the slab boundary pull and bulge the putty silhouette dynamically (via a boundary mask/advection channel) rather than clipping strictly against a rigid rounded-rect rbox.
4. Tie audio nuance to putty physics: vary squish/rub filter resonance with local temperature and displacement thickness, and add a gentle suction pop when lifting a handprint.
5. Add a subtle double-tap/right-drag tool or warm brass roller/stamp option so players can flatten ridges or press clean geometric impressions as well as finger dents.

## Graphics Polish (up to 3)
1. Upgrade lighting in VIEW (putty/index.html:266-323): replace the single hard-offset table shadow with a soft height-aware contact shadow, and raise specular gloss and subsurface wrap translucency on warmer, freshly rubbed putty.
2. Advect a fine marbled pigment/strain UV field in a spare RG16F buffer and stamp subtle skin-ridge/fingerprint micro-normals under fingertips and the handprint SDF so smeared paths show realistic pulled streaks.
3. Smooth thick-ridge gradients on High quality/HiDPI displays by scaling normal and AO sampling radii with uTexCss in VIEW (putty/index.html:299, 309-312) and blending edge thickness into the cut bevel (putty/index.html:305).
