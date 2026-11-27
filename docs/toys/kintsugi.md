<!--
Toy doc. Rules: docs/plans/toy-docs.md. Prose: ASD-STE100, double density. No em dashes.
A section marked (gen) comes from toys.json, series.json or the page source.
-->

# Kintsugi (`kintsugi/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | None yet (Tom sets it) |
| Motto | The cracks got the fancy treatment. |
| Shelf | Main, number 57 |
| Stage | Beta |
| Series | None (proposal: `poke`) |
| Accent | `linear-gradient(100deg, oklch(0.72 0.055 172), oklch(0.84 0.13 85))` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

One glazed bowl stands on a dark cloth under one soft light. A tap is a blow: cracks run out from the point of the blow, and the bowl falls apart into a handful of shards that settle on the cloth.
Then the bowl mends by itself. The shards rise and close, and liquid gold flows from the point of the blow along every seam. A lost chip comes back as a patch of gold.
The old gold stays. Each break takes new lines, so after a few rounds every bowl is different. The page keeps the bowl between visits.

## Controls

<!-- gen:bar -->
Bar: v3.

| Slot | Holds |
|---|---|
| Top left (choice) | Glaze, segments: Celadon (1), Tenmoku (2), Shino (3), Indigo (4), each with a colour dot |
| Bottom left (actions) | None |
| Bottom right (slider) | None |
| Key strip | `[CLICK] break the bowl`, `[MOVE] turn the light`, `[SPACE] break the bowl`; touch: `[TAP] break the bowl` |
| Settings | Site Quality, Reset (a new bowl with no breaks; the glaze stays) |
| Dev (`?dev`) | Camera: Pitch, Yaw, Field of view, Distance. Light: Exposure, Size. Gold: Vein width. All stored. |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click (mouse) | Breaks the whole bowl at once, at the point under the pointer. A miss takes the nearest point of the rim. While the shards rest, it starts the mend at once. |
| Tap (touch) | The same as a click, on release. |
| Move (mouse), drag (touch) | Swings the key light slowly round the bowl. The glints on the gold and the glaze follow it. |
| Keys | 1 to 4 pick a glaze. Space or Enter breaks the bowl at a point on its far wall, or starts the mend while the shards rest. |
| Wheel, pinch, tilt | None. |

A glaze pick recolours the same bowl in 0.6 s and keeps its gold. Taps during the fall, the mend and the flow do nothing.

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | Raw WebGL2 |
| Libraries | None (the page carries the importmap but imports no library) |
| Importmap | Word for word |
<!-- /gen:stack -->

The picture is one full-screen pass that ray traces a few analytic solids, so raw WebGL2 fits (`docs/stack.md`, decision guide 1). The shards need no mesh: each one is the same shell, cut by its own Voronoi cell.
The page needs `EXT_color_buffer_float` for half-float targets. Without it, the stage shows the fail line and the bar hides.

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `reduced`, `onReducedChange`, `audioKit`, `stage`, `pageReady`, `linFit` |
| `shared/detail.js` | `detail` |
| `shared/gl.js` | `program`, `linked`, `target`, `free`, `TRI_VS` |
| `shared/output.js` | `OUTPUT` |
| `shared/intro.js` | `intro` |
<!-- /gen:shared -->

The film grain and the vignette are local (`POST_FS`, `index.html:827`). They are static, so a sleeping frame does not boil. `burst` and `blip` copy the Worry stone voices; a shared sound kit could replace them (`docs/plans/modularize.md`).

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 1777 | The page: shell, geometry, ray tracer, break and mend, sound and vignette |
<!-- /gen:files -->

## Render pipeline

### The bowl

The bowl is an ellipsoid shell (outer radius 1, inner 0.945, y stretched by 1.12), cut flat at the rim, on a foot ring (`index.html:160`).
Scaled space divides y by 1.12, so both walls become spheres round one centre C.
One break is a set of up to 12 sites on the unit sphere round C. A point belongs to the cell whose site is nearest to its warped direction (`warpD`, `:197`). The warp (two sine bands) bends each straight Voronoi wall into a crack.
Each cell is one shard. The cut is radial from C, so every break face goes straight through the wall.

### Passes

| Pass | Target | Shader | Does |
|---|---|---|---|
| 1 | `hdr[i]` (RGBA16F, canvas size) | `MAIN_FS` (`:290`) | Ray traces the cloth and the bowl, or each shard under its pose; shades glaze, clay, gold and cloth; soft shadows and occlusion; on a still frame, averages with `hdr[1 - i]` |
| 2 | Canvas | `POST_FS` (`:827`) | Vignette, exposure, the ACES film curve, sRGB, static grain, dither |
| Once per break | `goldT` (RGBA8, 2048 x 2048) | `MERGE_FS` (`:852`) | Adds the break's veins and chip patches to the gold map, with a MAX blend |

- A shard ray first clips to its cell's cone, widened by 0.14 past the warp (`coneIv`, `:369`). In the shell it tests the cell at the entry; if the entry is outside, it marches ten steps and six bisections to the break face (`span`, `:345`).
- Soft shadows march a distance bound (`sdBowl`, `:427`). A shadow ray uses only the shards whose bounds come near it, and it stops above the highest shard (`shadowRay`, `:461`).
- The gold map is an equal-area map of directions round C, seen from below (`goldUv`). Red holds cover, green holds the ridge height.
- The live break draws its gold from the cell field itself (`roundAt`, `:262`). When the flow ends, the merge pass writes the same gold into the map.
- When the bowl is whole and still, 6 (Standard) or 10 (High) jittered frames average into one still, then the loop stops.

### The break, in time

| State | Length | What shows |
|---|---|---|
| crack | Up to 0.5 s | Hairline cracks run out through the crack net at 7 radians a second |
| fall | About 3 s | Each shard tips outward round its lowest point and lands on its curved back, then rocks twice. Shards near the blow go first; big shards tip slower. |
| rest | 1.7 s, or a tap | The shards lie apart |
| mend | 2.3 s | Each shard lifts clear of the cloth and turns home |
| flow | About 3 to 5 s | Gold runs from the blow through the crack net at 0.8 radians a second, glossy while wet, then sets |

The seam timing comes from the plain Voronoi net: a Dijkstra pass over 32 points per seam, from the blow (`seams`, `:1021`). The shard poses come from the cell samples (`shards`, `:1109`; `pose`, `:1196`).
The camera has two views: close on the whole bowl, and wide for the shards on the cloth. It eases to the wide view as the bowl falls, and back in as it closes (`frame`, `place`, `:1341`).

### Uniforms

`MAIN_FS`, the ones a person tunes:

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uLtan` | float | Tangent of the key light's angular radius: shadow and highlight softness | Dev, Light size, 9 degrees |
| `uVein` | float | Half-width of a gold vein, in radians | Dev, Vein width, 0.017 |
| `uL` | vec3 | Key light direction | Rest: azimuth -1.75, elevation 0.9 rad; the pointer swings it up to 1.2 rad round and 0.32 rad up or down |
| `uLc` | vec3 | Key light colour and strength | Warm white, 5 |
| `uBump` | float | Gold ridge height | 0.0045 |
| `uGThick`, `uGThin`, `uGPool`, `uGCrk`, `uClay` | vec3 | Glaze where thick, where thin, in the pond, its crackle, the clay body | `GLAZES`, `:99`, OKLCH to linear |
| `uGP`, `uGP2` | vec4 | Glaze roughness, crackle, streaks, milk; specks, crackle scale | `GLAZES` |

`POST_FS`: `uExpo` is Dev, Exposure, times 1.15.

## Sound

| | |
|---|---|
| Graph | `audioKit()` |
| Engine | Raw Web Audio on the kit noise buffer |
| Voices | Break: a high-passed knock, a low body, four inharmonic partials of the bowl cut short, then ten ticks as the crack runs (`breakSound`, `:1254`). Landing: a low thud on the cloth, a band tick and a small ring, sized by the shard; two smaller ticks as it rocks (`settleSound`, `:1265`). Close: a soft click as the shards meet (`closeSound`, `:1275`). Seam: a low bell (partials 1, 2, 2.76, 5.4) on a D minor pentatonic; a long seam rings an octave down; seams that close in one frame share one bell (`chime`, `:1286`). |
| Sleep | The loop end calls `kit.rest` after the last bell has rung out (about 3.5 s). A hidden page sleeps at once. |

QA on 2026-11-16 counted the voices built for one break (65 oscillators, 71 noise sources) with no errors. Nobody has heard them yet.

## Quality and performance

| | |
|---|---|
| Pixel ratio | `detail()` with `maxDpr: 2`, `budget: 2.4e6`; High takes the screen ratio, up to 3 |
| Slow-frame step | `detail()`: two seconds under 38 fps step down one level. Low uses 16 shadow steps instead of 26 (Standard) or 34 (High), drops the fine crackle and the still refinement. |
| Idle | The loop runs only while a break plays, the light or the camera eases, a glaze blends, or a still frame refines. Then it stops; QA saw no frame requests in 3 s. A hidden page stops at once. |
| Reduced motion | No flight and no camera move: the cracks show at once, then the gold fades in along every seam over 1.2 s. The light does not follow the pointer. A glaze pick switches at once. |
| Measured | 2026-11-16, Apple silicon, High, 3.25 million pixels, in a shared pane with other pages running: about 8 to 15 ms a frame for the whole bowl and the flow, 18 to 21 ms with ten shards apart. Phone hardware not measured. |

## State and storage

| Key | Holds |
|---|---|
| `stimming.kintsugi.sound` | Sound on or off |
| `stimming.kintsugi.glaze` | The last glaze |
| `stimming.kintsugi.bowl` | Every break, as the blow direction and a seed, up to 60; the gold map replays from it on load. Absent: the first bowl with one repair. Reset stores an empty list. |
| `stimming.kintsugi.pitch`, `.yaw`, `.fov`, `.eye`, `.expo`, `.soft`, `.vein` | Dev rows |
| `stimming.quality` | Site quality (shared) |

## Tests and QA

No files in `tests/`. QA on 2026-11-16 in the browser pane: clean console on load and after every control; idle after load; a break by mouse press, touch tap and Space; the glaze by segments and by the phone stepper; Settings with Quality and Reset; stills of every state at 1280 x 800, 375 x 812 and 812 x 375, with no overlap and no sideways scroll. Motion was checked from frame sequences only: background tabs run at about one frame a second.
A change to this toy checks the same list, plus `tests/bar-v2.html` for any shell change.

## Known issues

- Shards can pass through each other for a moment while they fall and mend; their poses are scripted, not simulated. See `stimming-67g2`.
- A lost WebGL context is not restored; the stage freezes until a reload.
- Tenmoku's streaks and Indigo's flecks are one noise; they can read as dots on the floor of a tipped shard.

## Legacy build

None.

## History

| | |
|---|---|
| Epic | `stimming-67g2` (feature) |
| Plans | None |
| Version | None |
