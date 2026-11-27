# Soap cutting (`soap`)

- **Shelf:** Main #12
- **Tier / Size:** `three` · 121 KB
- **Verdict:** A responsive, richly crafted 3D soap-cutting toy with authentic shaders and Web Audio, held back by missing WebGL context-loss handling, an incomplete tab-hide lifecycle, and an unbounded particle pool.

## Bugs
- soap/index.html (lines 2743, 2750): Missing webglcontextlost/webglcontextrestored listeners on renderer.domElement (confirms gpu_missing_contextlost). Context loss leaves the canvas blank and the stage interactive without pausing or showing .fail.
- soap/index.html (lines 62, 176, 2583, 2724-2725): Uses custom IntersectionObserver and visibilitychange handlers instead of whenVisible from shared/stim.js, and does nothing when document.hidden becomes true (confirms missing_whenVisible). Hiding the tab mid-stroke leaves the looping Web Audio scrape playing and causes wall-clock nowS() timers in updateAuto, updatePress, updateSweep, and windAt to jump on return.
- soap/index.html (lines 710, 744-764, 811-820, 1154, 1601): retire(pc) never reclaims particle slots from the PMAX=60000 pool, so pN grows monotonically until resetBar(). split(st) only guards !onBoard against PMAX (after through(st) has already marked bond[st.p][c] = 2, leaving the piece scored but unsplit), while onBoard cuts and arm() have no PMAX bounds check at all.
- soap/index.html (lines 1701, 2345, 2446): nextCut() does not clear hover when Space runs an auto-cut, unlike startPress() (line 1902). After Space slices away part of the bar under a stationary mouse, previewWant() draws a stale cross at the old hover.q.
- soap/index.html (lines 2694-2703): pointercancel and lostpointercapture both call release(e), which executes startPress(st.press.rings, 'tap') when st.t < 0. A browser-cancelled touch on a scored cube will unintentionally pop it instead of aborting the gesture.

## Labels, Copy & Menu Settings
- Static flag bar_missing_keys is a false positive: soap/index.html (lines 135-142) defines both keys (ternary on coarse) and a 13-row help array for Bar v3.
- soap/index.html (lines 54, 139-142): #table aria-label includes "Fallen pieces cut too." while Bar v3 help omits that mechanic, and help lists "release" ("Pop the cracked cubes") while #table aria-label omits release.
- soap/index.html (lines 117, 126-143): soapAt initializes randomly on each load and does not persist via stimming.soap.soap, and bar.keys (lines 125, 135-137) evaluates coarse once at boot so ?bar=v2 never updates if pointer capability changes.

## Gameplay Improvements (up to 5)
1. Allow pressing/popping scored cubes on resting cut slabs, not only on bar (seedAt/pressPlan/setHover currently restrict to h.pc === bar). Cutting a thick slab in half and popping its grid feels broken when only the original bar responds.
2. Add gentle pointer/blade nudging or flicking for fallen cubes and small pieces (< CUT_MIN = 40) on the mat. Right now small fallen pieces cannot be pushed or moved individually, only cleared all at once with Blow.
3. Let soap hardness (SOAPS[i].hard) modulate cutting resistance and snap threshold (BITE, SNAP, and curl dimensions) rather than only sound and corner chipping. Soft Amber/Coral should slice smoothly with deeper initial bite, while hard Charcoal should demand firmer back-and-forth scoring before snapping.
4. Support surface paring/shaving curls when dragging shallowly across an already flat top face or corner, rather than requiring a fresh orthogonal score line (shaveAlong currently produces no curls on existing grooves or un-scored passes).
5. Allow a slight camera orbit or 90-degree mat/bar rotation (for example via right-drag or two-finger drag) so players can score and slice the back (-z) and left (-x) faces without waiting for a slab to tip over.

## Graphics Polish (up to 3)
1. Enable soft directional shadows (PCFSoftShadowMap on renderer and key at lines 2743, 2766) so the hovering blade, tipping slabs, and popped cubes cast grounded shadows onto boardMesh and bar. Right now there are no cast shadows anywhere, which makes the floating blade and resting pieces read slightly detached from the mat.
2. Add subtle contact/depression feedback or an ink/rim highlight on the hovered poppable cube in setHover (line 2455) instead of only changing the CSS cursor to pointer. This gives immediate tactile confirmation before clicking to pop or holding to spread cracks.
3. Pass non-zero knife chatter (aChat) and tapered thickness (aSoap.y along the curl length) in shavingGeometry/shapeCurl (lines 1203-1283), and modulate SOAP_RIM (line 2121) by the key light wrap so translucent soaps like Coral and Amber do not glow uniformly on shadowed back faces.
