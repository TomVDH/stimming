# Soup cauldron (`cauldron/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | None (Tom sets it) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `linear-gradient(100deg, oklch(0.62 0.2 35), oklch(0.82 0.14 80))` (proposal) |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

One big iron pot of broth over a fire, seen from a little above, so the soup is the stage.
A drag stirs it with a wooden spoon: the soup turns with weight, the middle dips, and the things ride round. A tap or `+ Ingredients` throws in the next thing (carrot, onion, fish, beetroot, rubber duck, peas, boot, star, tomato, mushroom). Each one splashes, bobs, cooks, breaks up and gives the soup its colour, so the colour and the thickness are a record of what went in.

## Controls

<!-- gen:bar -->
Bar: v3, the Signal bar, over Bar v2 (`signal: true` in `cauldron/index.html`). Copy rewritten 2026-11-17 (bean `stimming-u2in`).

| Slot | Holds |
|---|---|
| Choice | `Ingredients` list: Any (the old round, no heading), then Solids (sixteen) and Liquids (cream, squid ink, chilli oil, saffron) |
| Actions | `+ Ingredients` (T), `Throw out` (C) |
| Slider | `Heat`, 0 to 1, default 0.5: flame height, heat, bubbles, steam, the simmer's sound |
| How to play | Click: add an ingredient, push an ingredient down. Drag: stir the soup, move an ingredient, pour the liquid. ← →: stir the soup. T: add an ingredient. C: throw out the soup |
| Settings | Simmer sound (toggle); Quality; Reset in the footer |
| Dev (`?dev`) | Look: Exposure, Bloom, Blur. Camera: Height, Turn (near 0 is a side view). Fire: X, Z, Height, Size, Power, Spread. The camera and fire rows keep no value |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click or tap | Adds the tray's pick at that point: a thing is thrown, a liquid pours for 1.2 s |
| Drag | Stirs with the spoon; the spoon pulls the soup toward its own speed (`:1426`) |
| Keys | T throws, C clears; hold ← or → to stir round the pot (`:1839`) |
| Hover | The eye swings a little round the pot (none under reduced motion) |
| Wheel, pinch, tilt | None |

Clear drains the pot with a whirl, then fresh broth fills it (`:2119`). Reset (Settings) returns to the opening pot: broth, a carrot, an onion, Fire at 0.5 (`:2449`).
The throw order repeats: fish, beetroot, duck, peas (seven), boot, star, tomato, mushroom, carrot, onion (`:1481`).
What breaks into what: carrot into coins, onion into rings, fish into its bones, beetroot into cubes, star into small stars and glitter, tomato into chunks, mushroom into slices. Peas and pieces melt away. The duck and the boot never cook through.

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | Raw WebGL2 |
| Libraries | None imported |
| Importmap | Word for word |
<!-- /gen:stack -->

One ray per pixel draws the whole scene in one shader, so three.js would add a scene graph and gain nothing (`docs/stack.md`, decision 1).

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `onQuality`, `reduced`, `onReducedChange`, `audioKit`, `stage`, `pageReady` |
| `shared/detail.js` | `detail` |
| `shared/glow.js` | `bloomChain`, `glowDetail` |
| `shared/output.js` | `OUTPUT` |
| `shared/grade.js` | `GRADE` |
| `shared/intro.js` | `intro` |
<!-- /gen:shared -->

Local copies: the full-screen triangle and target helpers (the same as `stone/`), and the GLSL hash and value noise. No shared module holds either yet (`docs/plans/modularize.md`).

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 2489 | The page |
<!-- /gen:files -->

## Render pipeline

The CPU runs first each frame: the stir field (stable fluids, 64 × 64, `:1352`), the things (`:1660`), bubbles (`:1578`), droplets, puffs and sparks.

| Pass | Target | Shader or material | Does |
|---|---|---|---|
| 1. Velocity | `velTex`, RG16F, 64² | `texSubImage2D` | Uploads the stir field |
| 2. Dye | Two RGBA16F maps (MRT), 512² (384² on Low) | `DYE_FS` (`:439`) | Carries the colour (OKLab times weight), fat and glitter; the plumes mix in the pot's mean; the things add their tint |
| 3. Ripples | RG16F, 256² | `RIP_FS` (`:493`) | A wave field, two steps a frame at 60 fps; splashes, pops and the spoon push it |
| 4. Fire | Five RGBA16F atlases, 384 × 336: a 48 × 56 × 48 grid of 0.08 cells cut into z slices | `SOLID_FS` (once), `CURL_FS`, `VEL_FS`, `DIV_FS`, `JAC_FS` (12 sweeps), `PROJ_FS`, `FDYE_FS` | Fire's solver (`fire/index.html`), one or two steps a frame: buoyancy, curl-noise turbulence, vorticity confinement, a gas-expansion source, wind at high fire, a coal bed that feeds heat and smoke. The belly (up to the rim) and the legs are solids, baked once into an R16F mask; hot gas clings to the iron and climbs it. After 20 s at Fire 0 the solver rests |
| 5. Layers | Two RGBA16F maps (MRT), half the CSS size (a third on Low) | `LAYER_FS` | Back: the haze and the flagstone floor, lit through a bump normal (one Voronoi pass, an analytic slope) and by the solver's heat. Front: Fire's volume, marched 24 steps (16 on Low) with Fire's wood ramp, emission and smoke light, sparks, and the steam with Fire's smoke light; the steam skips its noise outside the column and the puffs. The march stops at the belly, the rim and the far inner wall |
| 6. Scene | RGBA16F, full size | `SCENE_FS` (`:712`) | Ray cast: belly, rim, legs, inner wall, the soup heightfield, bubble caps, the things (an SDF march over a short candidate list), droplets, the spoon |
| 7. Bloom | Half size chain | `bloomChain` | Threshold 0.9 |
| 8. Out | Canvas | `OUT_FS` (`:1191`) | `GRADE` (tint, vignette, grain), then `OUTPUT` (film curve, sRGB, dither) |

### Uniforms: `SCENE_FS` (`:718`)

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uDip` | `float` | The stir's paraboloid dip, from the pot's spin | 0 to 0.2 |
| `uFunnel` | `float` | The extra funnel at the centre for a fast spin | 0 to 0.1 |
| `uSoupK` | `float` | The soup's own warm glow | 0.75 + 0.35 × Fire |
| `uKeyDir`, `uKeyCol` | `vec3` | The lamp high behind the pot | `(-0.12, 0.68, -0.72)`, warm white |
| `uFireCol`, `uFlick` | `vec3`, `float` | Firelight colour and its flicker | Flicker 0.35 + 1.1 × Fire |
| `uMarch` | `int` | SDF march steps for the things | 56; 36 on Low |

## Sound

| | |
|---|---|
| Graph | `audioKit({ gain: 0.6, sleepMs: 2500 })` (`:1917`) |
| Engine | Raw Web Audio |
| Voices | Bed on one looping noise source (`:1956`): the simmer, the fire's rumble, a slosh that follows the spin, the spoon's scrape. Crackle bursts. Bubble pops: a rising sine, lower for bigger bubbles and thicker soup. Plop on each landing (`:2028`): a bloop, a splash hiss, droplets; the duck squeaks, the star chimes. A squelch as a thing breaks, drips, a whoosh on the Fire slider, glugs and a fill hiss for Clear |
| Sleep | The loop runs while the pot shows, so the bed plays; Simmer sound off silences the bed but not the events; hidden, or idle under reduced motion, the kit rests |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `detail({ maxDpr: 2, budget: 2.2e6 })` then `D.dpr()` (`:1268`) |
| Slow-frame step | `detail()`; only frames a hand drives are fed to it |
| Idle | A hand at work draws at up to 60 fps; the simmer draws at 30 fps; the frame gate keeps 2 ms of slack for rAF jitter; the CPU fluid sleeps when the soup is calm; a hidden pot stops (`whenVisible`, `:2481`) |
| Reduced motion | No simmer loop, no bubbles, sparks, droplets or steam puffs, no flicker, no boil currents, a fixed grain. A stir or a throw still moves, then the loop sleeps |
| Measured | 2026-11-15, laptop, built-in browser pane, Quality High: first frame 91 ms after navigation. 14 things at Fire 1, 2.2 M pixels: about 14 ms a frame. Empty pot: the 30 fps simmer at 120 Hz with no long frames |

### Performance pass (2026-11-16, `stimming-mbpi`)

Apple M3 Pro laptop, Chrome, 1280 × 720 at device ratio 2, 22 things (peas count one by one), Fire 1.
GPU time is the frame cost with a 1-pixel `readPixels` sync, 60 frames back to back, best of four rounds, in headless Chrome with the Metal GPU.
Frame rate is real rAF in headed Chrome on the 120 Hz screen.

| Measure | Before | After |
|---|---|---|
| GPU time, High (3.35 M px), stirring | 5.71 ms | 4.86 ms |
| GPU time, Standard (2.20 M px), stirring | 4.70 ms | 3.85 ms |
| Frame rate, High, simmer / stirring | 29.5 / 55.7 fps | 30.0 / 60.0 fps |
| Frame rate, Standard, simmer / stirring | 29.4 / 57.2 fps | 30.0 / 60.0 fps |
| Gap p95, High, simmer / stirring | 41.8 / 25.1 ms | 35.3 / 18.5 ms |

| Change | Effect |
|---|---|
| Solid mask baked once (`SOLID_FS`) | 5.38 → 5.03 ms. The mask matches the inline test in all 11,450 solid cells |
| Steam skips its noise outside the column and the puffs | 5.58 → 5.12 ms. Pixel-identical |
| Floor bump from one Voronoi pass | No change on this GPU; a third of the floor's Voronoi work. Mean difference 0.08 of 255 |
| Solver rests after 20 s at Fire 0 | Heat peaks at 0.007 by then, under the wood ramp's 0.05 threshold |
| Frame gate with 2 ms slack | The gate dropped frames on rAF jitter; now 30.0 and 60.0 fps |
| Tried and kept out | Jacobi 12 → 8 saves 0.1 ms; not worth a change to the flames |

The fire is chaotic: a 0.01% nudge to the buoyancy moves the picture more (mean difference 10.2 of 255) than this whole pass (8.0). Soup, things, iron and floor match.


## State and storage

| Key | Holds |
|---|---|
| `stimming.cauldron.sound` | Sound on or off |
| `stimming.cauldron.simmer` | Simmer sound on or off |
| `stimming.cauldron.exposure` | Dev: exposure |
| `stimming.cauldron.bloom` | Dev: bloom strength |

## Tests and QA

None in `tests/`. Checked on 2026-11-15 in the built-in browser pane: a clean console, the stir, a throw of each kind, Clear, Reset, the Fire slider at 0 and 1, the arrow-key stir, sound start after a click, and the layout at 1280 × 720, 375 × 812 and 812 × 375.

## Look (round 2)

| Part | Does |
|---|---|
| Soup | Marbled: Catmull-Rom advection clamped to its texels, a fine curl that wakes with the stir, plumes that fold in nearby soup, tints that land as ribbons, seams that stand up where colours meet. Only a drain evens the pot out |
| Film layers | Skin (aux b) sets on calm thick soup and cream, matte and wrinkled; wet broth; glassy fat with a faint oil-film rainbow |
| Cooking | Things deepen, gloss and shrink a touch; a split thing clears in 0.45 s while its pieces grow in; melting pieces take on the soup's colour |
| Steam | Rises over the boil's plumes in threads (Fire's detail noise erodes it), thin at high fire, leans with the wind |
| Parked | `gpufire.js`: Fire's WebGPU engine over the pot, only with `?fire=gpu` |

## Round 3 (2026-11-16)

| Part | Does |
|---|---|
| Hands | Tap a thing to dunk it; drag a thing to pull it (it lifts, drips, leaves a wake); with a liquid picked, a drag pours along the path |
| Things | 16 kinds: the ten, cleaner and chunkier, plus potato (cubes), leek (rings), garlic (cloves), chilli (sweats oil), bay leaf (never cooks through), noodles (melt) |
| Tray | Mix, Things and Liquids groups (the shell's opt-in `group`), four across, larger icons with no plate |
| Spoon | Rests on the rim at the back when let go; taps the iron as it settles; clinks on a hard stir |
| Air | Heat shimmer above the flames (output pass); steam parts under a passing hand |
| Floor | Cobbles tilt one by one, warm to cool, ash in the joints; a depth-of-field blur away from the pot (Dev: Background blur) |

## Known issues

- The fire grid is coarse (0.08 cells); fine flame detail comes from Fire's simplex detail noise in the march.
- Frame time after the fire solver and the PBR iron is not measured with the pane in view.
- `probe-gpu.html` (noindex) runs Fire's own WebGPU engine under a matching pot, for comparison; it is not linked.

- Things push each other as circles of their half-width, so two long things can overlap a little. The wall test uses each thing's true length.
- The steam layer runs at half the CSS size; on a large High-quality screen it reads soft.
- The sound was checked for its start and its voices, not by ear.

## Legacy build

None.

## History

| | |
|---|---|
| Epic | `stimming-fskg` |
| Plans | None; the idea is 363 in `docs/toy-ideas.md` |
| Version | None |
