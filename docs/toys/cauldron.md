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
A drag stirs it with a wooden spoon: the soup turns with weight, the middle dips, and the things ride round. A tap or `+ Thing` throws in the next thing (carrot, onion, fish, beetroot, rubber duck, peas, boot, star, tomato, mushroom). Each one splashes, bobs, cooks, breaks up and gives the soup its colour, so the colour and the thickness are a record of what went in.

## Controls

<!-- gen:bar -->
Bar: v2 (`cauldron/index.html:105`).

| Slot | Holds |
|---|---|
| Top left (choice) | `Add` tray: Mix (the old round), the ten things, and four liquids: cream, squid ink, chilli oil, saffron |
| Bottom left (actions) | `+ Thing` (T), `Clear` (C) |
| Bottom right (slider) | `Fire`, 0 to 1, default 0.5: flame height, heat, bubbles, steam, the simmer's sound |
| Key strip | drag stir; click throw in; ← → stir |
| Settings | Simmer sound (toggle); Quality; Reset in the footer |
| Dev (`?dev`) | Exposure, Bloom; Camera height and Camera turn (near 0 is a side view); Fire X, Fire Z, Fire height, Fire size, Fire power, Fire spread. The camera and fire rows keep no value |
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
| 4. Fire | Five RGBA16F atlases, 384 × 336: a 48 × 56 × 48 grid of 0.08 cells cut into z slices | `CURL_FS`, `VEL_FS`, `DIV_FS`, `JAC_FS` (12 sweeps), `PROJ_FS`, `FDYE_FS` | Fire's solver (`fire/index.html`), one or two steps a frame: buoyancy, curl-noise turbulence, vorticity confinement, a gas-expansion source, wind at high fire, a coal bed that feeds heat and smoke. The belly (up to the rim) and the legs are solids; hot gas clings to the iron and climbs it |
| 5. Layers | Two RGBA16F maps (MRT), half the CSS size (a third on Low) | `LAYER_FS` | Back: the haze and the flagstone floor, lit through a bump normal and by the solver's heat. Front: Fire's volume, marched 24 steps (16 on Low) with Fire's wood ramp, emission and smoke light, sparks, and the steam with Fire's smoke light. The march stops at the belly, the rim and the far inner wall |
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
| Idle | A hand at work draws at up to 60 fps; the simmer draws at 30 fps; the CPU fluid sleeps when the soup is calm; a hidden pot stops (`whenVisible`, `:2481`) |
| Reduced motion | No simmer loop, no bubbles, sparks, droplets or steam puffs, no flicker, no boil currents, a fixed grain. A stir or a throw still moves, then the loop sleeps |
| Measured | 2026-11-15, laptop, built-in browser pane, Quality High: first frame 91 ms after navigation. 14 things at Fire 1, 2.2 M pixels: about 14 ms a frame. Empty pot: the 30 fps simmer at 120 Hz with no long frames |

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
| Depth | Light dies with depth in the soup, tinted by its own hue. Thin broth shows sunk things, the spoon and the iron near the wall; thick soup, skin and fat close it up. Dev row Soup density scales it |
| Fire glow | The fire glows up through thin soup over the boil's plumes and the hot base, tinted by the soup's hue, stronger with Fire. Dev row Soup glow scales it |
| Boil | The heat drives the ripple field: a calm shiver everywhere at low fire, rolling heaves over the plumes near Fire 1 (heat cubed). Dev row Boil scales both |
| Film layers | Skin (aux b) sets on calm thick soup and cream, matte and wrinkled; wet broth; glassy fat with a faint oil-film rainbow |
| Cooking | Things deepen, gloss and shrink a touch; a split thing clears in 0.45 s while its pieces grow in; melting pieces take on the soup's colour |
| Steam | Rises over the boil's plumes in threads (Fire's detail noise erodes it), thin at high fire, leans with the wind |
| Parked | `gpufire.js`: Fire's WebGPU engine over the pot, only with `?fire=gpu` |

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
