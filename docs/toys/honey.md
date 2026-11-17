# Honey coil (`honey/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | None yet (Tom sets it) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None (proposed: `goo`) |
| Accent | `linear-gradient(100deg, oklch(0.86 0.15 82), oklch(0.7 0.17 58), oklch(0.42 0.11 40))` (proposed, not yet in `toys.json`) |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

A thread of honey falls from above onto a dark slate. Where it lands it coils: it lays itself down in rings that stack into a tower, lean, and slowly sink and spread into an amber pool.
The hand moves the pour. Held still, the coil stacks. Dragged slowly, it lays loops and figures of eight, like a sewing machine. Dragged fast, the thread pulls straight. The Height slider sets how far the honey falls: low gives slow, fat coils; high gives fast, fine ones.

## Controls

<!-- gen:bar -->
Bar: v2 (`honey/index.html:129`).

| Slot | Holds |
|---|---|
| Top left (choice) | `Fluid`, segments: Honey (1), Syrup (2), Treacle (3), with colour dots; default Honey |
| Bottom left (actions) | `Pour` (Space, held), `Clear` (C) |
| Bottom right (slider) | `Height`, 0 to 1, default 0.4: the fall height. On phones it moves into Settings |
| Key strip | hold pour; drag steer; space pour; arrows steer |
| Settings | Quality |
| Dev (`?dev`) | `Exposure` (0.4 to 2.5, 1), `Bloom` (0 to 0.5, 0.1), `Pitch` (-15 to 25 degrees, 0), `Yaw` (-60 to 60 degrees, 0), `Distance` (0.6 to 1.8, 1), `Field of view` (18 to 50 degrees, 30), `Tempo` (0.4 to 1.6, 1), `Melt time` (0.4 to 2.5, 1) |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Press and hold | A thread falls from above the pointer and starts to coil where it lands. Release breaks it at the top; the tail falls and lays down. |
| Drag while pouring | Moves the pour. The coil follows the drag speed: ring, then loops, figures of eight, waves, then a straight line. |
| Keys | Space holds the pour at the last pour point; the arrow keys move it. 1, 2 and 3 pick the fluid; C clears. |
| Fluid choice | While pouring, the new fluid runs down the thread from the top. Otherwise it pours that fluid for 2.6 s. |
| Wheel, pinch, tilt | None. |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | Raw WebGL2 |
| Libraries | None imported |
| Importmap | Word for word |
<!-- /gen:stack -->

One fixed camera over one plate: a grid mesh for the pool and instanced, ray-traced capsules for the rope, so no scene graph is needed (`docs/stack.md`, decision guide 1).

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `onQuality`, `reduced`, `onReducedChange`, `audioKit`, `stage`, `pageReady` |
| `shared/intro.js` | `intro` |
| `shared/gl.js` | `TRI_VS`, `program`, `linked`, `target`, `free`, `bind`, `tri`, `onContextLoss` |
| `shared/detail.js` | `detail` |
| `shared/glow.js` | `bloomChain` |
| `shared/output.js` | `OUTPUT` |
| `shared/grade.js` | `GRADE` |
<!-- /gen:shared -->

Drift: none known. `CAPSULE` (`:921`) is a ray and capsule test after Inigo Quilez; Rupert's drop has its own round-cone march. Either could move to a shared module.

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 1807 | The page: CSS, markup, vignette, one module script |
<!-- /gen:files -->

## Simulation

All on the CPU, at a fixed step from the frame time.

| Part | Where | Does |
|---|---|---|
| Pattern generator | `generate()`, `:418` | The contact point traces a ring, loops, an eight, a wave or a line, blended by the drag speed over the lay speed. A ring keeps the lay speed at every instant; eights and waves run at an even phase rate. Offline plots: `gen.mjs` in the lab10 scratchpad. |
| Rope | `lay()`, `settle()`, `melt()`, `:311` to `:347` | A ring buffer of up to 6000 points, one each half rope radius. A point rests on the pool or on older rope (sphere contact, through a bucket grid), holds its shape, then melts its volume into the pool. Rope under a tall stack melts sooner, so the stack sinks. |
| Lean | `generate()` | A stack taller than the fluid's `fold` height sends the coil centre off its top, so the stack leans and the rope spills over its edge. |
| Thread | `threadPoints()`, `:639` | Two Bezier pieces from the pour, out of frame, to the contact point; free fall tapers it. A tail keeps the honey below its falling top end. |
| Pool | `poolStep()`, `:251` | A 160 x 160 thin-film height field: flux grows with the cube of the depth, and a dry cell takes honey only from a neighbour 0.009 deep, so puddles stop with a rounded edge. A second field carries the fluid mix. |
| Bubbles | `stepBubbles()`, `:575` | Up to 70 bubbles ride the thread, then a rope point, then stay trapped in the pool and drift with the film. |

## Render pipeline

| Pass | Target | Shader | Does |
|---|---|---|---|
| 1. Upload and field | `field` (RGBA16F, 320 x 320) | `FIELD_FS` (`:804`) | The pool, its tone and the rope stack go up as one RGBA16F texture; a cubic B-spline gives smooth height, slope and curvature. |
| 2. Light map | `lightA` (RGBA16F, 1024 x 1024) | `LMAP_VS` / `LMAP_FS` (`:1062`) | The capsules as the key light sees them, additive: honey thickness, tone, a lens gain that brightens the middle of a rod's shadow, and the thickness-weighted depth. Its box fits the honey each frame. |
| 3. Pool | `scene` (RGBA16F with depth) | `POOL_VS` / `POOL_FS` (`:830`) | One 233 x 233 grid mesh, lifted by the field. Slate with the key's falloff and sheen; under honey: refraction to the plate, Beer-Lambert colour, a thin-lens caustic, in-scatter, a backlit edge, Fresnel reflection of the room. |
| 4. Backdrop copy | `back` | Blit | The pool frame, so the rope can show what lies behind it. |
| 5. Rope and thread | `scene`, two passes | `CAP_VS` / `CAP_FS` (`:949`) | Ray-traced capsules on camera-facing quads, with depth. The normal follows the rope's smoothed direction. Light through the rope and other honey, a lensed view of the backdrop, a bright core, Fresnel reflection. The second pass blends a one-pixel fringe for smooth edges. |
| 6. Bubbles | `scene`, blended | `BUB_VS` / `BUB_FS` (`:1133`) | Sprites pushed to the honey's surface, dimmed by the honey over them. |
| 7. Bloom | Half-size chain | `bloomChain` from `shared/glow.js` | Threshold 1.4, only the key's reflections. Off at the Low level. |
| 8. Composite | Screen | `COMP_FS` (`:1176`) | Bloom, `gdVignette`, `gdGrain`, `ouFilm`. |

### Uniforms (the ones a person tunes)

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uSigA`, `uSigB`, `uSigC` | `vec3` | Absorption per world unit for syrup, honey and treacle (`SIGMA`, `:116`) | Mixed by tone |
| `uKey`, `uKeyI` | `vec3`, `float` | The key light's position and strength (`:1280`) | `[-0.75, 1.95, 1.45]`, 6 |
| `uCaus` | `float` | Caustic strength under the pool | 0.9 |
| `uScat` | `float` | In-scatter in the pool and the rope | 0.9 and 0.7 |
| `uBloomK`, `uExp` | `float` | Bloom strength and exposure | Dev rows, 0.1 and 1 (times 1.6) |

## Sound

| | |
|---|---|
| Graph | `audioKit()` |
| Engine | Raw Web Audio |
| Voices | Hum: a sine and a triangle a fifth up, lowpassed at 230 Hz, 48 to 74 Hz by height, lower for treacle; it swells while honey flows and wavers once per turn of the coil. Patter: a lowpassed noise tap and a falling sine thump, a few per turn of the coil, duller on honey than on bare slate, panned to the coil. Plop: a falling sine when a tail lands. Clear: a soft swipe. |
| Sleep | `kit.rest`: the context suspends 1.5 s after the loop stops or the page hides |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `detail({ maxDpr: 2, budget: 2.4e6 })`, `D.dpr(w, h)` (`:1297`) |
| Slow-frame step | `detail()`: two slow seconds drop one level. Level 0 turns the bloom off and uses ratio 1 (Standard) |
| Idle | The loop runs while a thread, live rope or a moving pool exists. The pool settles when no cell moves visibly for 1.2 s, or 18 s after the last honey lands. `whenVisible` stops it off screen. Shaders link on a timer, so a hidden tab still boots. |
| Reduced motion | The first frame is a settled coil in its pool, with no demo pour after the intro. Pours stay, since the hand starts them. |
| Measured | 2026-11-16, Mac, High, canvas 2464 x 1872: 8.2 to 9.4 ms of GPU work per frame during a pour, 0.3 to 0.5 ms of CPU step. Not measured on a phone. |

## State and storage

| Key | Holds |
|---|---|
| `stimming.honey.sound` | Sound on or off |
| `stimming.honey.exposure`, `.bloom`, `.pitch`, `.yaw`, `.dist`, `.fov`, `.tempo`, `.melt` | Dev rows |

## Tests and QA

No files in `tests/`. On 2026-11-16, in the built-in browser pane (hidden, so stills came from a probe copy with a hand-stepped loop): the first frame; pours at low, mid and high height for each fluid; slow, mid and fast drags; Space, the arrows, Clear, a fluid pick, the Height slider and the Settings sheet; sound on, the context running after a real click, the hum and patter with no errors; idle after a pour; layouts at 1280 x 800, 375 x 812 and 812 x 375. Not heard and not seen in live motion.

## Known issues

- The puddle's pinned edge can show a slight step on the 160-cell grid. (`stimming-je56`)
- When a high pour leans its stack, the rope that walks back over the top can climb its side for a moment. (`stimming-je56`)
- Rope and pool meet at a crease, not a smooth fillet. (`stimming-je56`)

## Legacy build

None.

## History

| | |
|---|---|
| Epic | `stimming-je56` (feature) |
| Plans | None |
| Version | None |
