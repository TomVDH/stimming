# Domino Day (`domino`)

- **Shelf:** Main #4
- **Tier / Size:** `three` · 99 KB
- **Verdict:** Solid three.js domino simulator with tactile physics and procedural sound, held back by missing tab-visibility and WebGL context-loss handling, minor touch-gesture state leaks, and cluttered Bar v3 help/settings edge cases.

## Bugs
- domino/index.html:81,2253: Does not import or use whenVisible from shared/stim.js; the raw IntersectionObserver ignores document.hidden/visibilitychange, so switching tabs does not pause the rAF loop or clock.
- domino/index.html:2185: Creates THREE.WebGLRenderer on canvas without webglcontextlost or webglcontextrestored listeners, so GPU context loss leaves the render loop running against a dead context with no recovery or .fail fallback.
- domino/index.html:1989-1993: On touch, a second finger deletes the active pointer from ptrs to start turnBegin without calling finish() or setting ghost.visible = false, leaving shape drag previews (ghost) stranded on the table.
- domino/index.html:2052-2053: Listens for pointerup and pointercancel on canvas but not lostpointercapture; a dropped capture can leave a stale entry in ptrs, causing subsequent single-finger touches to act as two-finger table turns.
- domino/index.html:560-576: reset() calls dropBalls() and returns early at line 567 when no tiles or towers fell, skipping syncChips() and wake() so cleared steel balls stay visible on canvas and the Clear button stays enabled until the next wake.
- domino/index.html:1936-1954,2008: Mouse pointermove runs pick() across all standing tiles and invokes ppuAt() plus two Vector3.project() calls per tile (up to 6400 projections per move at MAX = 1600).

## Labels, Copy & Menu Settings
- domino/index.html:122-125: Bar v3 help rows repeat identical 'drag' (3 rows: 'Lay tiles', 'Add a tower', 'Throw a steel ball') and 'click' (4 rows: 'Tip a tile', 'Tip a tower', 'Add a tower', 'Throw a steel ball') icons without clarifying they depend on the active 'Add' choice, and omit Shift+drag (turn table) and image file drop (custom Picture field).
- domino/index.html:114-117,2087-2124: 'Picture' (id: 'picture') and 'Yours' (id: 'own') omit Bar persist: true (handled manually so stimming.domino.own can hold the PNG data URL); when 'Yours' is On, 'Picture' still shows the last motif pressed, and reloading with picture === 'own' forgets the prior motif back to 'mix'.
- domino/index.html:118,560-576: The Settings footer 'Reset' button calls reset() ('Stand the tiles up' for R), which is unclearly labelled relative to Settings reset and silently no-ops after 'Clear' (C) empties the table.

## Gameplay Improvements (up to 5)
1. Allow dragging from any standing tile to branch cleanly into a Y-fork without requiring an empty gap, so players can build cascading splits and parallel paths from one starter.
2. Make rolled steel balls collide and clink with each other, deflect off fallen tiles, and bounce softly off the table perimeter instead of passing through each other and rolling out of sight.
3. Add a single-step undo (e.g. Z or a quick tap-remove on a misplaced tower/tile) so players can fix a bad stroke or placement without clearing the entire table with C.
4. When Reset (R or Settings Reset) is triggered on an empty cleared table, re-deal the opening S-run and crown tower (or cycle a couple of classic starter layouts) instead of doing nothing.
5. Add a subtle tuned chime/marimba sound mode alongside the crisp plastic clack in Settings (still muted by default) where consecutive hits in a run step gently through a calm pentatonic scale.

## Graphics Polish (up to 3)
1. Add subtle normal perturbation along the engraved center bar in carve(mat) (domino/index.html:2144-2163) so the matte groove catches directional sun highlights and reads as physical depth rather than a flat dark band.
2. Give the floor plane a subtle procedural radial vignette and faint matte table grain instead of pure ShadowMaterial over flat CSS --stage, grounding both the domino shadows and the steel ball's RoomEnvironment reflections.
3. Replace the 1 px LineBasicMaterial drag preview (ghost, domino/index.html:2232) with soft translucent footprint ticks or subtle hover lift/highlight on the targeted standing tile or tower so tip and placement previews read cleanly at any zoom.
