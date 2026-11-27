# Ferrofluid (`ferro`)

- **Shelf:** Main #9
- **Tier / Size:** `three` · 70 KB
- **Verdict:** Healthy, responsive, and visually polished three.js scene with genuine physics (shallow-water pool, Rosensweig lattice, liquid bridges), held back mainly by missing visibility/audio-suspend cleanup, missing WebGL context-loss handling, and a minor bridge-recoil coordinate bug.

## Bugs
- ferro/index.html:62,1327-1328 (missing_whenVisible confirmed): Does not import whenVisible; IntersectionObserver and visibilitychange only call wake() when visible and never cancel pending raf or suspend ac/humG when hidden. If sound is on and Space locks the field (or pointer was active), the 50 Hz sawtooth hum continues playing in a hidden tab.
- ferro/index.html:1423-1431 (gpu_missing_contextlost confirmed): Creates THREE.WebGLRenderer without webglcontextlost or webglcontextrestored listeners on renderer.domElement, so context loss leaves frame() calling renderer.render() with no recovery or .fail fallback.
- ferro/index.html:711-736,753-761,1120-1129 (bridge recoil stale coordinates): When endRaw(e, out) returns false (e.d.gone or e.k < 0), EA or EB is not cleared and retains coordinates from the previous bridge, causing bridgesStep() and drawNecks() to compute recoil direction and lenCut against stale coordinates.
- ferro/index.html:1171-1190 (error guard & slow-frame step): frame() does not wrap step(dt) and draw() in try/finally, and lowDpr triggers after 20 frames > 30 ms immediately from boot without the 4 s warmup window.
- ferro/index.html:1299 (stale Bar v2 selector): keydown guard checks .s2-sheet instead of .sg-sheet (mitigated by signal.js capture-phase stopPropagation for modal sheets, but stale for Bar v3).
- ferro/index.html:25-29 (partial importmap): Only maps three and three/addons/ instead of the full pinned importmap in docs/standards/code.md.

## Labels, Copy & Menu Settings
- ferro/index.html:87 (help copy): ['hold + drag', 'Move the drops'] slightly misstates the action when no beads are airborne, since holding and dragging primarily moves the charged magnet and Rosensweig crown as well as clinging drops.
- ferro/index.html:65-80 (persistence): Fluid choice persists under custom key 'stimming.ferro.fluid' rather than shell-managed persist; Field slider (line 82) and Space lock state do not persist and have no Settings Reset button (acceptable since Settings only holds Quality, though Reset could restore default Field 1 and Ink).
- ferro/index.html:54,70-90 vs toys.json:246-275: Name ('Ferrofluid'), tag ('Liquid that's up to something.'), sound default (false), tier ('three'), and access metadata match cleanly; aria-keyshortcuts and Bar v3 help rows cover all inputs including hidden-in-v2 Esc and + -.

## Gameplay Improvements (up to 5)
1. Add a subtle repulsive mode or polarity toggle (for example right-click or a Magnet choice) that parts the pool and pushes spikes outward around a clear depression instead of only pulling upward.
2. Let tapping the dish rim or double-clicking send a clean circular capillary wave inward from the glass meniscus, swaying existing spikes without moving the magnet.
3. Allow pinning a second small resting magnet (or toggling a twin-pole mode) so stationary Rosensweig crowns interact and form liquid bridges between two glowing poles as you steer one around the other.
4. Give the four fluids distinct physical parameters (higher viscosity and slower spring damping for Magma, crisp high-tension bounce for Oil, elastic wobble for Alien) plus matching subtle pitch/filter shifts in audio synthesis.
5. Render an optional tactile physical magnet hovering at pullY (such as a small brushed neodymium cylinder or ring inside the glow) that tilts slightly with drag velocity and dips closer as Field rises.

## Graphics Polish (up to 3)
1. Add soft contact shadows and ambient occlusion: enable shadow casting from key onto the plinth/table or add a height/crowding crevice darkening term in the ink fragment shader so deep troughs between spikes and floating beads read with richer depth.
2. Increase pool mesh density (MESH_N) on Standard/High quality and refine vertex normal sampling or add analytical gradient blending in VERT to eliminate slight faceting along steep cone flanks and sharpen the studio light-strip reflections.
3. Sync the fluid side-wall cylinder (body, lines 1565-1567) or extend the pool edge skirt to match perimeter bulkAt height, and add subtle procedural brushed-steel grain to the plinth and matte texture to the tabletop within the expanded asset budget.
