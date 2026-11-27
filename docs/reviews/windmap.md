# Wind map (`windmap`)

- **Shelf:** Main #34
- **Tier / Size:** `webgl2` · 87 KB
- **Verdict:** An exceptionally crafted, atmospheric WebGL2 desk toy with rich vortex physics, dual globe/flat projections, and responsive procedural audio, needing only WebGL context-loss handling and minor Bar v3 help/reset cleanup.

## Bugs
- windmap/index.html (line 166): WebGL2 context does not listen for `webglcontextlost` or `webglcontextrestored`, leaving the simulation and render targets dead if the GPU resets.
- windmap/index.html (lines 1674, 1686): `chipFor` and `addChip` query `.stim-ui .s2-chip` directly to toggle `aria-pressed` on the `+ Cyclone`, `Isobars`, and `Fronts` buttons, which works today only because Signal polls the hidden Bar v2 DOM and will break when Bar v2 is retired.
- windmap/index.html (line 1435): `drawFronts` runs `frontsFor(v)` (which steps 30 to 150 RK2 flow samples per front on the CPU) on every rendered frame for every active low when `Fronts` is enabled, creating a CPU spike when many storms are alive.

## Labels, Copy & Menu Settings
- windmap/index.html (lines 120-129, 1672): `setLook` manually calls `save('look', v)` even though the `look` setting row already specifies `persist: true`, while `count`, `trail`, `hemi`, and `marks` rely solely on Bar v2 `persist: true` without updating `localStorage` if changed programmatically.
- windmap/index.html (lines 133-135): `help` has three separate entries with the bare `'drag'` key (`['drag', 'Draw a jet']`, `['drag', 'Move a storm']`, `['drag', 'Turn the globe']`), which render identical mouse-drag icons in Bar v3's How to play sheet without qualifier sub-labels like `'drag storm'` or `'drag off globe'`.
- windmap/index.html (line 118, 1682): `reset: () => clearAll()` only clears active storms, gusts, and jets from the stage instead of resetting persisted settings (`View`, `Wind`, `Isobars`, `Fronts`, `Look`, `Particles`, `Trails`, `Hemisphere`, `H and L marks`) to their defaults.

## Gameplay Improvements (up to 5)
1. Let users place or sculpt a topographic ridge or island chain on the chart that deflects streamlines, splits jets, and sheds leeward von Karman vortex streets.
2. Add a continuous dye dropper gesture (such as shift-drag or an optional tool) that releases a concentrated ribbon of ink at the pointer to watch shear and stretching around nearby vortex cores.
3. Support two-finger pinch or scroll wheel over an existing storm or high to widen or tighten its core radius (`rc`) and circulation in place.
4. Allow opposite-sign vortices of comparable strength that wander close together to lock into a self-propelled dipole pair that glides across the chart before slowly shearing apart.

## Graphics Polish (up to 3)
1. Add a subtle landmass or bathymetry relief option using a compact signed-distance or height texture in `OUT_FS`, shading coastlines and shallow shelves beneath the silk trails while slowing surface wind over terrain.
2. Enhance the orthographic globe in `OUT_FS` with a subtle directional day/night terminator and twilight atmospheric scattering on the limb rim so silk trails glow against the night side.
3. Render faint, GPU-advected pressure contour ticks or subtle barbs along the isobars in `OUT_FS` so the pressure gradient and geostrophic flow direction read like an engraved meteorological plate.
