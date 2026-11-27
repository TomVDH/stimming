# Glass (`glass`)

- **Shelf:** Main #13
- **Tier / Size:** `three` · 134 KB
- **Verdict:** Solid, richly tactile 3D glass-breaking toy with strong shaders and Web Audio synthesis, held back by missing WebGL context-loss handling, an incomplete tab-hide/hold-timer cleanup, resize-triggered resets, and stale Bar v2 key-strip wiring.

## Bugs
- Missing WebGL context-loss handling: start() (glass/index.html:2681) creates THREE.WebGLRenderer without webglcontextlost or webglcontextrestored listeners, leaving the stage blank or crashing on GPU context loss.
- Incomplete visibility and blur cleanup (missing_whenVisible): lines 2658-2659 hand-roll IntersectionObserver (reading [e] instead of the latest entry) and visibilitychange instead of using whenVisible, and never clear spaceDown, holdT2, flashT, or audio on hide/blur. Holding Space with Gun or Armored Hammer and switching tabs leaves holdT2 timers firing shoot()/tap() and sfx() in the background.
- Stale Bar v2 selectors: line 118 queries '.s2-keys dd' so applyTool() (lines 2258-2263) only updates the hidden Bar v2 key strip and never Bar v3's .sg-how help rows; line 2635 checks '.s2-sheet' instead of '.sg-sheet' in the keydown guard.
- Viewport aspect or Bar v3 cover changes wipe pane state: fit() (lines 1701-1708) calls build() whenever quantized fw !== FW, and build() (line 1754) calls heal(true), erasing all cracks, holes, dents, and fallen shards on slight window resizes or bar wraps.
- Slow-frame fallback triggers without warmup and stalls on High quality: frame() (lines 2541-2544) increments slow from frame 1 on any >30 ms frame (such as shatter/craze spikes), and when site quality is 'high', pixelRatio() ignores lowDpr instead of stepping down to Standard.
- Tool-state edge mismatches: stepBrick() (line 2466) lets thrown bricks fly through a shattered pane without calling knock() on hanging shards, and shoot() (lines 2359-2372) punches holes in laminated glass without calling dentAt() or updating sagGoal.

## Labels, Copy & Menu Settings
- Stale dynamic help labels: lines 113-114 hardcode static Bar v3 help rows ('click' -> 'Hit the pane', 'hold' -> 'Hit the pane hard') while TOOLS (lines 2250-2254) and LOOK[glass].hold (lines 2207-2215) only update the hidden Bar v2 '.s2-keys dd' elements.
- Inaccurate 'hold + drag' help row: line 113 says 'hold + drag' -> 'Move the aim', which works for Gun and Brick wind-up, but dragging > 14 px with Hammer (line 2625) cancels the hold without moving any aim.
- Help/ARIA/asset drift: keys (line 110) uses 'arrows' while help (line 114) uses '← → ↑ ↓'; #stage aria-label (line 65) omits clicking hanging shards and switching glass kinds; line 2257 redundantly reads localStorage for 'stimming.glass.tool' despite persist: true on line 106; and glass/gunshot.mp3 (19.7 KB) is an unused orphan next to glass/gunshot.wav.

## Gameplay Improvements (up to 5)
1. Glass-cutter scoring on Hammer drag: instead of cancelling Hammer hold after a 14 px drag (line 2625), let slow drags score a shallow crack line along the pointer path that guides subsequent fractures and splits stained or annealed panes cleanly.
2. Floor shard sweeping and brick collisions: raycast pointer clicks/drags onto floorP when aiming below the sill or on a shattered pane so players can gently push and clink settled shards, and let thrown bricks trigger knock() on hanging shards when crossing z = T/2.
3. Frame and sill deflection: handle brick or wild shot impacts against the steel frame lip and glazing bead with a damped metallic ring, spark/scuff, and ricochet rather than ignoring clicks outside PW/PH - BEAD.
4. Optional rain-on-pane ambiance: add a calm Settings toggle for soft rain droplets running down the outer glass (refracting city bokeh and clearing on shattered shards) with gentle patter audio when Sound is enabled.
5. Keyboard glass cycling: bind [ / ] (or Shift+Left/Right) to step through the 9 glass types so keyboard-only players can switch panes even after the Bar v3 strip hides.

## Graphics Polish (up to 3)
1. 3D parallax cracks and edge-chipping: step 2-3 refracted samples through tCrack along the view ray inside GLASS_FS (lines 1198-1203) and add beveled micro-chipping normals around HOLE_FS craters so thick annealed and armored panes show true 2.6 cm depth.
2. Floor contact shadows and stained-glass caustics: replace the static radial uPool glow in FLOOR_FS (lines 1573-1575) with projected soft shadows and colored caustic light patches from hanging and fallen shards, especially jewel tones under stained and dichroic glass.
3. Richer material detail and skyline reflections: replace the blocky hash noise on brickMat (line 2837) and frameShader (line 1593) with procedural normal/roughness maps (within the 2.5 MB budget), and reflect the night skyline onto the front faces of tilted falling shards instead of only RoomEnvironment.
