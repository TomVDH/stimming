# Smoke ring cannon (`vortex`)

- **Shelf:** Main #35
- **Tier / Size:** `webgl2` · 62 KB
- **Verdict:** An exceptionally well-crafted WebGL2 Biot-Savart vortex filament and volumetric smoke simulation with crisp laser-sheet scattering, needing only context-loss handling and minor scan/reset polish.

## Bugs
- vortex/index.html:915-947 (`initGL`): No `webglcontextlost` or `webglcontextrestored` listeners are attached to `canvas`, so a GPU context loss freezes the simulation without stopping the frame loop or recovering the GPU state.
- vortex/index.html:1271-1290 (`frame` / `busy`): When `sheetMode` is `'scan'`, the laser sheet sweep is driven by `driftT`, which freezes after 62 seconds of idle (`driftSpeed()` drops to 0) even while `Scan` is selected; also under `prefers-reduced-motion: reduce`, `driftSpeed()` is always 0, making the `Scan` option completely static unless rings are actively moving and even then `driftT` does not advance.

## Labels, Copy & Menu Settings
- vortex/index.html:91 (`actions`): The `clear` action omits an explicit `label: 'Clear'` property unlike `pair` (`label: 'Pair'`) and `collide` (`label: 'Collide'`), relying on shell fallback casing.
- vortex/index.html:1354-1360 (`act.reset`): Resetting the toy restores `Sheet` (`across`) and `Haze` (`0.5`), but does not reset the `settings` drawer items (`laser`, `render`, `smoke`, `breakup`) or their local state variables (`laser`, `look`, `smoke`, `breakup`) if `ui.reset` does not trigger their `onPick`/`onInput` callbacks.
- toys.json:1005 (`vortex.tagNl`): Missing Dutch tagline translation (`"tagNl": null`) whereas `nl` (`"Rookringkanon"`) and `ipa` are populated.

## Gameplay Improvements (up to 5)
1. Allow dragging the laser sheet plane directly when clicking near its top emitter lens or floor line, letting users position the slice at any depth or angle.
2. Add a subtle movable obstacle (such as a glass sphere or vertical rod) that vortex filaments deform around or split against via image-vortex repulsion.
3. Support multi-finger or right-click/Shift-click firing from the opposite side of the room so users can manually aim off-axis ring collisions at custom angles.
4. Let a fast flick gesture across the stage impart a gentle cross-breeze to the room air, drifting lingering smoke tendrils through the laser fan.

## Graphics Polish (up to 3)
1. Render a faint 3D cannon muzzle silhouette or brass aperture ring at `MUZZLE` catching the rim backlight and laser bounce so rings emerge from a physical source rather than empty air.
2. Upgrade the 32x32x32 3D value-noise texture (`makeNoise` at line 866) to a 64x64x64 curl-noise or multi-octave Perlin-Worley 3D texture to give the raymarched smoke volume finer, less repetitive filament curls.
3. Add chromatic dispersion or subtle dust-mote sparkles inside the laser sheet intersection (`HAZE_FS` lines 474-491) so individual brightly lit aerosol specks glint as rings slice through the beam.
