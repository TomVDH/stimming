# Shared shader library

Bean: `stimming-ssrh`. Started 2026-11-09. Tom picks; nothing here is built yet.

Tom, Train Ride chat, 2026-11-09: "we also need to spin off sub session into REUSABLE shader effects that are shared between several toys; some of these too will be sourced from havoc / buoy business".

## The contract

One effect is one ES module in `shared/`, in the style of `shared/glassrain.js`.

- It exports GLSL source strings and, where needed, a small JS helper.
- The GLSL is plain functions. It declares no uniforms, no varyings and no `main`.
  The toy passes every value as an argument.
- It uses `texture()`, never `texture2D` or `gl_FragColor`.
  That text compiles in raw WebGL2 (`#version 300 es`) and in a three.js `ShaderMaterial`.
- Every name carries the module's prefix (`gr`, `bk`, `fl`), so two modules never clash.
  A module brings its own hash and noise under that prefix.
- The JS helper imports nothing. No shared module imports three.
- Out of scope: the three TSL toys (`galaxy`, `fire`, `ink`). GLSL strings do not reach them.

One dev page tests every module: `fxlab/` (noindex), built like `glasslab/`.
Each effect gets one panel: A against B at full resolution, with knobs.
A is a toy's own copy; B is the shared module. B runs in raw WebGL2 or in a three.js `ShaderMaterial`.
The page reads the largest difference between A and B. "Check all copies" tests every copy in both runtimes.
`glasslab/` stays the pane-rain page.

## Built

| Module | Date | Proof | Adopted by |
|---|---|---|---|
| `shared/flare.js` (lens flare) | 2026-11-09 | Five copies match within 1 / 255, raw and three.js | None yet |
| `shared/grade.js` (tint, vignette, grain) | 2026-11-10 | Five copies match within 1 / 255 in raw WebGL2. In three.js, three match; see the note | None yet |

Note on the grade in three.js: `viaduct` and `subway` hash `vUv * uRes`, which turns on the last bit of `vUv`.
The lab's three.js run has another `vUv`, so it draws other grain of the same strength (`subway`: 0.009 % of pixels differ by more than one step; `viaduct`: up to 8.7 %).
Inside a toy the pass keeps its own `vUv`, so the picture does not change.

### Grade: how a toy adopts it

| Toy | Copy today | Replace with |
|---|---|---|
| `fireworks`, `canal`, `bread`, `meteor` | `makeGrade` (integer hash) | `new ShaderPass(gradePass(POST))`. Pass `res` and `tint` as three.js vectors if the toy calls `.set` on them. `meteor` keeps its letterbox line, so it uses the parts |
| `viaduct` | `makeGrade` (sine hash) | `gradePass({ ..., noise: 'sin' })`; its hex tint step stays |
| `subway` | The grade `ShaderPass` (gradient noise) | `gradePass({ ..., noise: 'ign' })` |
| `trainride` | The grade `ShaderPass` with exposure, saturation, contrast | The parts: `gdVignette`, `gdGrain(gdIgn(vUv * uRes), ...)`; its own three steps stay |
| `launch` | `makeGrade` with fringe, split tone, seed, letterbox | The parts (lab: Ten seconds); grain weights `vec2(1.2, 0.6)` |
| `frietkot` | `makeGrade` with tape look, split tone, flicker | The parts (lab: Frietkot); `gdHashU` takes its frame offset |

A raw WebGL2 toy calls `gdGrade()` once at the end of its last pass.
Not shared, on purpose: split tone (two toys, two formulas), letterbox (two toys), exposure and contrast (one toy).

### Lens flare: how a toy adopts it

`fxlab/` shows the exact B source for each copy; paste it from there.

| Toy | Copy today | Replace with |
|---|---|---|
| `walker` | `POST_FS`: veil, streak, ghosts, screen blend | The parts, with `uBand` and `uHard` (lab: Beach walker). Keep the depth cover, haze pass, vignette and grade |
| `window` | `flare()` in `window/shader.js` | The parts in its ten-slot loop (lab: Window seat). `flareSlots(10)` can pack `uFlr` and `uFlrC` |
| `bread` | The flare `ShaderPass` | The parts with its own numbers (lab: Broodautomaat). Keep its blend |
| `fireworks`, `meteor` | `makeFlares` | `flWarm`, `flStreak`, `flGhosts` (lab: Fireworks). The local `warm()` goes |

New users (`launch`, `canal`, `viaduct`, `trainride`) call `flFlare()` and `flScreen()`: the Look rule's flare in one call.
`flareAt()` gives a raw WebGL2 toy the light's place on the frame.

Rules:

- One effect at a time. Tom picks.
- No toy moves onto a module here. This plan names the toys that can adopt it; each toy's own chat does the move.
- A module must draw the same picture as the copy it replaces, before any toy adopts it.

## Stock

Counts come from a search of every toy page on 2026-11-09, not from a full read of each.
Toys are named by folder. "K2" is the night-scene kit that Night viaduct built and later toys copied by hand.

| Effect | Where it lives now | Toys | Source to keep | Effort |
|---|---|---|---|---|
| Pane rain, pane fog | `shared/glassrain.js` | `trainride`, `window`; lab `glasslab/` | The shared module (Tom's base) | Done |
| Disc bokeh | `shared/bokeh.js`. By hand: `windfarm` `dofPass`, `motorway` `tilt0`, `bread` `tilt`, `frietkot` `tiltPass` | `trainride` shared; 4 by hand | The shared module. Havoc: `discBlur`, `tiltShift` in `src/engine/post.js` | Done. A tilt-shift band helper: S |
| Lens flare | `walker` `POST_FS`, `window/shader.js` `flare()`, `bread` flare pass, `fireworks` `makeFlares`, `meteor` `makeFlares` | 5 by hand | `walker` `POST_FS` (the Look rule's reference). Slots from `window`. Warmth, length and thinness knobs from Havoc `src/view/lensflare.js`; orb from `orbNode` | Built: `shared/flare.js` |
| Grade: tint, vignette, grain | `makeGrade` (K2) in `viaduct`, `fireworks`, `launch`, `meteor`, `canal`, `bread`, `frietkot`. Variants in `subway`, `trainride`, `windfarm`, `motorway`, `beer`, `dandelion` | 7 near word for word; 6 variants | `launch` `makeGrade`: integer pixel hash, grain seed | Built: `shared/grade.js` |
| Output: ACES fit, sRGB, dither | Raw WebGL2 toys: `aces()` in 10, `srgb()` in 19, a dither line in 22. three.js toys use the renderer's ACES | 10 to 22 | `pool` `aces` and `srgb`; `walker` dither | S |
| Noise: hash, value noise, fbm | Every shader toy: value noise in about 50 files, fbm in 35, three hash families | 50+ | `grH`, `grN`, `grFbm` in `glassrain.js` (the same text as `K2_NOISE`) | S. For new toys only: a new hash changes each old pattern |
| Night sky: gradient, stars | `K2_SKY` in `viaduct` (port, pass), `fireworks`, `launch`, `meteor`, `canal`. Own sky in `window`, `flock`, `trails`, `nvg`, `trainride`, `walker`, `windfarm` | 5 on K2; 7 own | `meteor` `duskGlow` and `k2stars`. Havoc `starField` (`src/view/aqua/sea.js:138`): tint and twinkle per star | M |
| Height haze | `K2_HAZE` in the same five. Own haze in `trainride`, `frietkot`, `motorway`, `bread` | 5 on K2; 4 own | `meteor` `k2hazeAmount`: the fog integral in closed form. Haze colour stays per toy | S |
| Bloom | three.js: `UnrealBloomPass` in 18 toys (`makeBloom` wrapper in 7). Raw WebGL2: an own down and up chain in about 20 toys. `motorway` `SoftBloom` | 18 and 20 | three.js toys keep the addon. Raw: the `vortex` chain | M: it needs a render-target helper |
| Water surface | `trainride`, `fireworks`, `launch`, `canal`, `viaduct/port.js`, `windfarm` `swell`, `walker` `SEA_FS`, `window` `seaField`, `meteor`, `nvg/harbour.js`, `dijkstra` | 11, all different | `windfarm` `swell` (each wave fades by pixel footprint). Havoc: `swell.js` and `swellmath.js` (wave sets, envelope, bent crests); `src/view/water.js:147` (two ripple layers, glint roll-off, backlit crests); `sea.js:585` rain rings; `sea.js:618` moon glade | L. First cut (slopes, Fresnel, glitter): M |
| Water mirror: the smeared reflection | `tMirror` in `canal`, `fireworks`, `launch`, `viaduct/port.js` | 4 | `fireworks` | M. Part of water |
| Light orbs, point flares | K2 orbs in `viaduct`, `fireworks`, `launch`; point flares in `viaduct/port.js`, `pass.js`; `windfarm` lights | 4 | `fireworks` orbs | M |
| Rain and snow in the air | `viaduct` (K2 precipitation), `canal`, `trainride`, `window`, `rain`, `frietkot`, `washline` | 7, all different | `viaduct/port.js`. Havoc `src/view/aqua/weatherfx.js`: each drop's place is a function of seed and time | M |
| Clouds | `window` (`noise3d.js`, a volume), `fireworks`, `flock`, `trainride`, `washline`, `windfarm`, `walker` | 7, all different | None. Each toy's clouds are its own look | L. Do not share yet |
| Light shafts | `walker` `HAZE_FS`, `frietkot`, `sunbeam`, `pins` | 4, all different | None | Do not share |
| Caustics | `pool`, `beer`, `snow` | 3 | `pool`. Havoc `causticWeb` (`sea.js:186`) | S. Low demand |
| Box fog | Havoc only: `src/view/aqua/boxfog.js` | 0. It could suit `sunbeam`, `windfarm` | Havoc | S. Low demand |

In three or more toys today: lens flare, grade, output, noise, night sky, height haze, bloom, water, water mirror, orbs, rain and snow, clouds, light shafts, caustics, and the tilt-shift blur.

## Havoc

Havoc's shader library (`src/engine/tsl`, bean `hvc-01d1`) is still a plan. The code sits in `src/view` and `src/engine/post.js`, as three.js TSL.
A port reads the TSL and writes the same math in GLSL. Havoc stays read-only.

| Havoc effect | File | Port to GLSL? |
|---|---|---|
| Lens flare: streak, ghosts, warmth | `src/view/lensflare.js`, `orbNode` in `src/engine/post.js` | Yes. Stimming already holds two hand ports |
| Disc bokeh, tilt-shift | `src/engine/post.js` | Done: `shared/bokeh.js` |
| Star field | `src/view/aqua/sea.js:138` | Yes, with the sky module |
| Swell: sets, envelope, bent and short crests | `src/view/swell.js`, `swellmath.js` | Yes, with the water module |
| Classic water (Glass) | `src/view/water.js:147` | Parts only: ripple layers, glint roll-off, backlit crests. The rest needs Havoc's solver texture |
| Sea extras: rain rings, moon glade, wind slicks, lamp glints | `src/view/aqua/sea.js:567` to `716` | Later, as water options |
| Searchlight on water | `hvc-xtcm` | Wait: Havoc has not built it |
| Weather: analytic rain and snow | `src/view/aqua/weatherfx.js` | Yes, with rain and snow |
| Caustic web | `src/view/aqua/sea.js:186` | Later; three toys only |
| Box fog | `src/view/aqua/boxfog.js` | Later; no toy needs it today |

## Share first

1. **Lens flare** (`shared/flare.js`). Five hand copies, one Look rule, one Havoc source. Small, and the A/B is easy to judge.
   Could adopt: `walker`, `window`, `bread`, `fireworks`, `meteor`. New users: `launch`, `canal`, `viaduct`, `trainride`.
2. **Grade** (`shared/grade.js`): tint, vignette and grain. Seven copies are near word for word, so the risk is the lowest.
   Could adopt: `viaduct`, `fireworks`, `launch`, `meteor`, `canal`, `bread`, `frietkot`, then `subway`, `trainride`.
3. **Water surface** (`shared/water.js`): wave slopes that never alias, Fresnel, glitter; Havoc's swell sets. Eleven toys, eleven waters. The largest gain and the largest job.
   Could adopt: `trainride`, `fireworks`, `launch`, `canal`, `viaduct`, `windfarm`, `meteor`.
4. **Night sky and haze** (`shared/sky.js`): the K2 gradient, Havoc's stars, the height-haze integral.
   Could adopt: `viaduct`, `fireworks`, `launch`, `meteor`, `canal`.
5. **Output** (`shared/output.js`): ACES fit, sRGB and dither for raw WebGL2 toys. Dull, but in the most pages.
   Could adopt: `pool`, `lava`, `vortex`, `dijkstra`, `lichtenberg`, `chocolate`, `rubens`, `bismuth`, `flametest`, `beer`.

Recommended first: lens flare.
