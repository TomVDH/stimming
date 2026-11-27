# Dijkstra (`dijkstra/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | Lichtvloed /ˈlɪxtˌvlut/ |
| Motto | Finding the way without asking for directions. |
| Shelf | Main, number 36 |
| Stage | None |
| Series | Maths class |
| Accent | `oklch(0.86 0.17 80)` |
| Sound | Yes (`toys.json`); the page makes none, see Known issues |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

A city at night seen from above. A search runs from the source pin, and its light floods the streets in the order the search visits them; the shortest path snaps on when the light reaches the destination, and the rest of the map recedes.
A hand moves the pins, jams or walls off streets with a drag, and blacks out a block with a double tap. Seven searches and four maps show how each search thinks.

## Controls

<!-- gen:bar -->
Bar: v3 (`dijkstra/main.js:28`).

| Slot | Holds |
|---|---|
| Top left (choice) | `Search`, stepper: Dijkstra (default), Districts, A*, Greedy, BFS, DFS, Two-way. Kept in `stimming.dijkstra.algo` |
| Bottom left (actions) | Shuffle (S), Remap (M), Clear (C) |
| Bottom right (slider) | None |
| Key strip | click set the source; hold set the destination; drag jam the streets; double-click black out a spot. Districts changes the first to add a district and hides the second |
| How to play (`help`) | Set the source; Set the destination; Move a pin; Jam the streets; Black out a spot; S Shuffle the pins; M Build a new map; C Clear the streets; T Show and hide the tree; Space Play the search again |
| Settings | Map (Streets, Cells, Circuit, Roots), Tree (on or off), Glow (0 to 1.5, default 0.5), Quality, Reset |
| Dev (`?dev`) | None |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click or tap | Sets the source and plays the search again. In Districts, adds a district (five at most; the sixth replaces the oldest); a tap on a district pin removes it |
| Long press (380 ms) | Sets the destination; the search plays again and the path waits for the light |
| Drag | From a pin: moves it, and the search settles live. From open ground: jams the streets it crosses; a second stroke jams them harder, a third walls them off |
| Double tap (320 ms) | Cuts the power round the point: its streets flash and go dark |
| Keys | S Shuffle, M Remap, C Clear, T the tree, Space plays the search again |
| Wheel, pinch, tilt | None |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | Raw WebGL2 |
| Libraries | None from the importmap; `shared/stim.js` loads culori by URL (`modulepreload` in the page) |
| Importmap | Word for word |
<!-- /gen:stack -->

Stack type Shader (`docs/code-health.md`): a flat map, lit per pixel; the CPU runs the search and the GPU plays it from one wave clock.

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `fitCanvas`, `onQuality`, `linFit`, `reduced`, `stage`, `pageReady` |
| `shared/intro.js` | `intro` |
| `shared/gl.js` | `TRI_VS`, `program`, `linked`, `target`, `free`, `bind`, `to`, `tri`, `onContextLoss` |
| `shared/output.js` | `OUTPUT` (`ouAces`, `ouSrgb`, `ouHash` in `FINAL_FS`) |
<!-- /gen:shared -->

Local copies of shared code (drift), from `docs/plans/modularize.md`:

| Copy | Where | Module | State |
|---|---|---|---|
| `compile`, `locate`, `nextFrame`, `target`, `free`, `bind`, `to`, `tri`, the 3 s compile poll, `TRI` (family A) | Was `index.html:1105` to `:1217` | `shared/gl.js` (step 4) | Done 2026-11-16 (`stimming-f4rc`). The poll is `linked(..., { limit: 3000 })` |
| `aces()`, `srgb()`, `hash()` in `FINAL_FS` | Was `index.html:1090` | `shared/output.js` (step 3) | Done 2026-11-16. Dijkstra is the reference port for `ouSrgb` |
| The dither, `(ouHash - 0.5) * 0.012` | `main.js:1031` | `ouDither` | Stays: `ouDither` uses 1/255, so the frame would change |
| `hash2` (in `LUT`), `vhash` and `vnoise` (in `FINAL_FS`) | `main.js:693`, `:983` | `shared/noise.js` (step 9) | Open: waits for its reference port, `frost` |
| The mask's depth-stencil buffer | `main.js:1100` | `target(..., { depth })` gives depth only | Stays by hand; `free` deletes it as `mask.depth` |

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 69 | The page: markup, stage style, `<script type="module" src="main.js">` |
| `main.js` | 1886 | The toy's module; `npm run check` type-checks it |
| `maps/index.json`, `maps/<city>.json` | 179 grabs, 52 MB | OpenStreetMap squares: streets, buildings, water, green, rivers |
| `maps/fetch.py` | 306 | Fetches and packs the grabs. It names its sources |
<!-- /gen:files -->

## Render pipeline

The scene target holds light only. The final pass shades the ground under it from the area mask.
Targets are RGBA16F, except the area mask and its blurred levels (RGBA8).

| Pass | Target | Shader or material | Does |
|---|---|---|---|
| 1. Area mask (on a new web or size only) | `mask`, full size, with depth-stencil | `MASK_VS` + `MASK_FS` | Buildings in R, water in G, green in B, an even-odd fill through the stencil; a tone per building in A |
| 2. Mask levels (with pass 1) | `maskB`, four levels, each half the last | `TRI_VS` + `DOWN_FS` | Blurred masks for occlusion, eaves and shadows |
| 3. Edges | `scene` | `CAPSULE_VS` + `EDGE_FS`, instanced, MAX blend | Each street lights when the wave clock passes its arrival time; the heat ramp colours it by distance; the tree grows over the tail |
| 4. Nodes | `scene` | `NODE_VS` + `NODE_FS`, instanced, additive | Crossings and lamps |
| 5. Path | `scene` | `CAPSULE_VS` + `PATH_FS`, instanced, MAX blend | The shortest path: it sweeps on in 0.22 s, flashes, then pulses |
| 6. Pins | `scene` | `NODE_VS` + `MARK_FS`, instanced, additive | Source, destination and district pins |
| 7. Bloom | `mips`, five levels; `ups`, four | `DOWN_FS` (threshold 0.02 on the first), `UP_FS` | Every lit line spills light onto the ground |
| 8. Final | Screen | `TRI_VS` + `FINAL_FS` (`main.js:976`) | Shades ground, roofs, water and green under the light; haze, vignette, `ouAces`, `ouSrgb`, dither |

Instance data, in stage CSS pixels: twelve floats per edge and per node, eight per path segment and per pin.
The heat ramp is a 256 × 1 RGBA16F texture (`lutData`, `main.js:667`), made from the map's OKLCH stops by `linFit`.

### Uniforms

Colours are OKLCH in `STYLES` (`main.js:649`), one set per map; `applyLook` makes them linear with `linFit`.

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uW` | `float` | The wave clock, in distance units: light reaches a point when `uW` passes it | 0 to the far end plus a 200 tail |
| `uBand` | `float` | Width of the bright front | 26 |
| `uCold` | `vec3` | Unlit line colour, at its level | Per map |
| `uOwn[5]` | `vec3[]` | District hues | Five muted hues |
| `uHot` | `vec3` | Path and pin colour | `oklch(0.97 0.06 85)` |
| `uRecede` | `float` | How far the rest fades after the path locks | 0 to 1 over 3.5 s, from 0.8 s after the lock |
| `uTreeG` | `float` | How far the search tree has grown | 0 to 1 over the tail; 0 with Tree off |
| `uGlow` | `float` | Glow setting: bloom in the haze | 0 to 1.5, default 0.5 |
| `uAmb`, `uSoil`, `uRoof` | `vec3` | Moonlight, ground, roofs | Per map |
| `uSpill` | `float` | How far street light spills onto the ground | Per map: 0.3 to 1.4 |
| `uSun` | `vec2` | Shadow offset; the moon sits up and to the left | 3 CSS px |

## Sound

| | |
|---|---|
| Graph | None. The page makes no audio context |
| Engine | None |
| Voices | None |
| Sleep | Not applicable |

The shell shows the Sound button because `toys.json` sets `sound: true`. The button toggles and does nothing else.

## Quality and performance

| | |
|---|---|
| Pixel ratio | `fitCanvas(canvas, { maxDpr: 2, budget: 4.2e6 })` (`main.js:1580`): hairlines need the screen's own pixels. It follows the site quality |
| Slow-frame step | None |
| Idle | The loop runs while the front moves, a drag is live or the path pulses, and for 60 s after the last input; ambient motion eases out over the last 2 s. It stops off screen or in a hidden tab |
| Reduced motion | The flood runs at 0.6 of its pace; no flicker; the path does not sweep on, flashes at 0.3 and pulses at half speed |
| Context loss | `onContextLoss` (`main.js:1834`): the loop stops; on restore every GL object is built again and the frame goes on where it stopped |
| Measured | Not measured |

## State and storage

| Key | Holds |
|---|---|
| `stimming.dijkstra.sound` | Sound on or off (the toy has no sound) |
| `stimming.dijkstra.algo` | The search |
| Bar v2 settings (`persist: true`) | Map, Tree, Glow |
| `stimming.quality` | Site-wide graphics quality |

## Tests and QA

No test file in `tests/`.
A change must give the same frame. Port proof of 2026-11-16 (bean `stimming-f4rc`), real GPU (RTX 3070, ANGLE D3D11) and SwiftShader:

| Check | Result |
|---|---|
| Frames | 53 canvas frames per build: 1280 × 800 (every gesture, all seven searches, all four maps, Glow, Tree, Shuffle, Remap, Quality, Reset), 375 × 812, 812 × 375, reduced motion, sound on. 0 pixels differ |
| Context loss | Before the port: no handler, the restore is refused and the canvas stays black. After: it recovers, also after two losses in a row. The first frame after a restore equals the frame before the loss, 0 pixels |
| Sound | No audio context before or after, sound on or off |
| Console | Clean, with the intro running and with the real parallel compile |

How to get frames that repeat (headless Playwright):

- Seed `Math.random`, and drive `requestAnimationFrame` and `performance.now` by hand. Turn off `KHR_parallel_shader_compile`.
- Wait 1.5 s for the resize timer, then remove `.intro` before the first tick. The toy starts when the intro leaves, and its 12 s fallback runs on the real clock: a run that ticks through the intro starts the toy at a random frame.
- The long press runs on a real 380 ms timer: hold the button for real time.

## Known issues

- The page has no sound, but `toys.json` sets `sound: true`, so the shell shows a Sound button that does nothing. The plan (`docs/plans/dijkstra.md`) asked for `audioKit()`. Bean `stimming-e94j`.

## Legacy build

None.

## History

| | |
|---|---|
| Epic | `stimming-nl1y` (Toy: Dijkstra); port `stimming-f4rc` under `stimming-3s8z` |
| Plans | `docs/plans/dijkstra.md` |
| Version | None set |
