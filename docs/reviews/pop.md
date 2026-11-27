# Pop field (`pop`)

- **Shelf:** Main #2
- **Tier / Size:** `three` · 103 KB
- **Verdict:** Pop field is tactile, responsive, and richly styled across 18 materials, but lacks WebGL lifecycle/fallback guards, visibility pausing, and a pixel budget cap.

## Bugs
- Missing whenVisible integration (pop/index.html:91, :1957-1975): when the tab is hidden, any active frame() rAF loop and the re-inflation setTimeout (timer at :1973) keep running while nowS() wall-clock time advances c.due timers.
- Missing webglcontextlost and webglcontextrestored handlers on glc (pop/index.html:1582): context loss does not prevent default, halt composer.render() (:1915), or recover cleanly.
- Missing .fail fallback element in #field (pop/index.html:70-72) and error guards around new THREE.WebGLRenderer (:1582) and EffectComposer/UnrealBloomPass (:1882), leaving a blank stage if WebGL initialization or shader compilation fails.
- layout() calls pixelRatio(w, h, { budget: Infinity }) (pop/index.html:804) with no slow-frame step-down, bypassing the Standard quality 1.4e6 pixel budget across UnrealBloomPass and per-pixel noise/OKLCH shader loops.
- newSheet() (pop/index.html:1542-1544) calls layout(true) (which triggers buildJumbos() at :831) and immediately calls buildSprites() -> buildAtlas() -> buildJumbos(), rebuilding and re-uploading all jumbo canvases twice per shuffle or material switch.
- act.mat() (pop/index.html:1568-1573) passes wipeFrom(step || die) (:1555), which always resolves to the Shuffle button in .sg-bar .sg-act when visible under Bar v3 so material changes wipe from Shuffle instead of the Material picker; WebGL resources (gl, composer, quad, textures) are also not disposed on pagehide.

## Labels, Copy & Menu Settings
- In initPage bar.help (pop/index.html:115), the input token 'hold' is duplicated across two rows (['hold', 'Burst a big bubble'] and ['hold', 'Pop a bubble with more force']), rendering two identical hold icons in How to play.
- bar.help (pop/index.html:116) splits ['space', 'Pop the bubble'] and ['enter', 'Pop the bubble'] into identical rows and omits holding to burst a big bubble, whereas <canvas aria-label> (:71) states 'Hold Space on a big bubble to burst it.'.
- bar.keys (pop/index.html:113) uses lowercase verbs ('pop a bubble', 'burst a big bubble') while bar.help (:115-117) uses sentence case ('Pop a bubble', 'Burst a big bubble').
- 'Reset the toy' in bar.help (pop/index.html:117) and <canvas aria-label> (:71) overstates act.reset (:2063), which only refills popped bubbles via refill(nowS()) without resetting the material, palette, or grid.
- The selected Material in bar.choice (pop/index.html:104-106) is not persisted across reloads (unlike Settings rows with persist: true).

## Gameplay Improvements (up to 5)
1. Add a gentle knead/squish gesture when dragging slowly or hovering with light pressure, letting domes dent and squeak under the finger without popping until a firmer tap or quick sweep.
2. Let popping a popped cell (especially in rubber, latex, or foil) produce a soft hollow thud and slight film flex instead of being completely inert while waiting to refill.
3. Add a Settings toggle to hold popped bubbles flat until manually refilled with R or Reset, for users who like clearing a whole sheet without auto-reinflation after 6 to 12 seconds.
4. Give volatile jumbos (such as lava, popcorn, or glass) a subtle cascading tremor or delayed crackle across one ring further out when burst, reinforcing material differences without visual clutter.
5. Keep a quiet pitch memory across rapid pops (subtle harmonic chord decay on glass, holo, and disco) so dragging slowly across columns feels musical without adding UI.

## Graphics Polish (up to 3)
1. Pinch or flatten the dome normal briefly around popAt in DOME_FRAG (pop/index.html:1714) during the 45 ms gDelay (:1129) before swapping to the 2D film sprite, smoothing the dome-to-film transition.
2. Soften the transition on the wipe front in draw() (pop/index.html:1940-1945) with a subtle dark inner shadow beside wipe.col so the 2D snapshot clip sits naturally over the lit domes below.
3. Clamp the edge-on flip factor turn in drawBits() (pop/index.html:1475) away from zero so spinning glass, flake, tile, and scrap particles do not briefly vanish into degenerate strokes.
