# Railgun (`railgun/`)

> Another chat works on Railgun now. This doc is a snapshot of 2026-11-14; the generated sections catch up on the next run.

<!-- gen:identity -->
| | |
|---|---|
| Dutch | Spoorkanon /ˈspoːrkaˌnɔn/ |
| Motto | A very persuasive way to move something. |
| Shelf | Main, number 40 |
| Stage | Beta |
| Series | After dark (`dark`, Na donker) |
| Accent | `linear-gradient(100deg, oklch(0.76 0.08 320), oklch(0.86 0.16 68))` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

An old railgun on a pylon stands over a dusty plain, in one locked-off shot from 2.6 km. A burning asteroid hangs beyond the muzzle.
Hold to charge, release to fire; a full charge shatters the rock. If nobody fires, the rock strikes the planet, and the scene rewinds into white.

## Rules

- A cloud change needs a gate in its commit message: `clouds-check: PASS` or `look-approved:` with Tom's words. `tools/commit.sh` refuses the commit without one.
- The gate covers `railgun/storms.js`, `railgun/stormlab.html`, and the cloud, air, sky, storm and band sections of `railgun/index.html`.
- Run the check with `npx -y -p playwright@1.63.0 node tools/clouds-check.mjs`. Put its last line in the message.
- The rig, its stills and its checks: `docs/qa/railgun-clouds/README.md`.
- Write a new golden set (`--update-golden`) only after Tom approves the look. Put his words in the commit.
- The camera's point of view is a set of Dev rows (`?dev`): eye, pitch, yaw and field of view. Today's view is the default. Railgun has no camera rows yet.

## Direction

To write.

## Controls

<!-- gen:bar -->
Bar: v3, the Signal bar, over Bar v2 (`railgun/src/setup.ts`, `signal: true`). Railgun is the first toy on the Dev sheet (`?dev`).

| Slot | Holds |
|---|---|
| Top left (choice) | None |
| Bottom left (actions) | `Sight` (V): Monolith or NVG sight; `Reset` (R): the rewind. Reset shows only after a kill. |
| Bottom right (slider) | `Time of day`: starry night to noon |
| Key strip (Bar v2) | hold charge the gun; release fire the shot; arrows turn the gun |
| How to play (Bar v3) | Hold: Charge the gun. Release: Fire the shot. Arrows: Turn the gun. V: Show and hide the sight. R: Reset the toy. |
| Settings | Aim (Auto, Manual); Shot (Single, Salvo); Letterbox; Resolution; Smoke detail (Low, Medium, High); Quality |
| Dev (`?dev`) | Charge mix, FPS, Game-over mix, Rock size, Target (Asteroid, Ship), Ship fire, fast rock, strike test, grain, bloom, tone map, exposure, brightness, contrast, saturation, FXAA |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Press and hold | Ranges, then charges |
| Release | Fires |
| Pointer move | Leans the lens about 1.4° yaw and 0.9° pitch (mouse only) |
| Keys | Space holds and fires; the arrows and W A S D turn and raise the gun, and set Aim to Manual |
| Wheel | None |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | three.js 0.170.0 (WebGL), a real 3D scene |
| Libraries | three (`EffectComposer`, `RenderPass`, `UnrealBloomPass`, `ShaderPass`, `OutputPass`, `FXAAShader`, `BufferGeometryUtils`, `RoundedBoxGeometry`), simplex-noise |
| Importmap | Word for word |
<!-- /gen:stack -->

A WebGPU spike (`stimming-gxfd`) kept Railgun on WebGL2; its proof sits in `lab/railgun-webgpu/`.

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `pixelRatio`, `onQuality`, `linFit`, `reduced`, `onReducedChange`, `quality`, `audioKit`, `sound`, `stage`, `pageReady`, `later`, `buildSteps` |
| `shared/intro.js` | `intro` |
| `shared/flare.js` | `FLARE` |
| `nvg/tube.js` | `Tube`: another toy's module, not in `shared/` |
<!-- /gen:shared -->

Drift (see `docs/plans/modularize.md`):

- K2 kit copies: bloom, grade, sky noise and haze (`k2noise`, `k2fbm`, `k2haze`). `shared/grade.js` and `shared/sky.js` hold the common versions.
- Own performance ladder (`rung` 0 to 3, it only goes up), not `detail()`.
- `nvg/tube.js` is shared by two toys but lives in one of them. A move to `shared/` is a candidate.

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 9431 | The page: one module script |
| `ship.js` | 118 | Capital ship states, hits, joints, hulk fall, light; no imports |
| `salvo.js` | 55 | Salvo constants and pure helpers; no three.js |
| `shot.mp3`, `boom.mp3`, `impact.mp3` | 1.2 MB | Sound samples |
<!-- /gen:files -->

## Render pipeline

| Pass | Target | Shader or material | Does |
|---|---|---|---|
| 1. Scene | Half-float target, 4× MSAA | 36 `ShaderMaterial`s: sky dome, ground, mesas, clouds, gun, asteroid, ship, raymarched smoke, plume and fireball, bolt, arcs, shards, dust | The world |
| 2. Bloom | Composer | `UnrealBloomPass` (K2 bloom, strength 0.5; half size from rung 2 or under 640 px) | Glow |
| 3. Grade | Composer | `ShaderPass` (K2 grade, `:3403`) | Tint, vignette 0.6, grain 0.075, letterbox, rage and flash |
| 4. Output | Composer | `OutputPass` | Tone map: AgX, ACES or Neutral |
| 5. FXAA | Composer | `ShaderPass(FXAAShader)` | From rung 2, or from the setting |
| 6. Sight | Overlay | `Tube` from `nvg/tube.js` | Monolith or NVG sight |

### Uniforms: the shared bag `U` (`:274`)

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uSun`, `uSunC`, `uZenC`, `uHorC` | `vec3` | Sun place, sun, zenith and horizon colours | From `Time` |
| `uAst`, `uAstR`, `uAstC` | mixed | Rock place, radius, colour | |
| `uCharge`, `uRage`, `uOver` | `float` | Charge level, over-hold rage | 0 to 1 |
| `uFire`, `uRecoil`, `uHeat`, `uBlast` | `float` | Shot state | |
| `uShocks[5]` | `vec4` | Shock rings | |
| `uShadowT`, `uShadowM` | mixed | Sun depth map | |
| `uAir`, `uHaze` | `float` | Air and haze | |

Grade pass: `uRage`, `uFlash`, `uSoft`, `uSeed`, `uCon`, `uSat`, `uBri`, `uGrain`, `uBox`. The Dev rows drive most of them.

## Sound

| | |
|---|---|
| Graph | `audioKit({ keys: ' ' })` (`:7864`) |
| Engine | Raw Web Audio, plus three samples |
| Voices | Wind bed; charge hum, choir and Expanse surge mixes; game-over surge; arcs and rumble; traverse motor; ship voices; ejector clunk; breech vents; crackle on over-hold |
| Samples | `shot.mp3` (Tom's report), `boom.mp3`, `impact.mp3`, fetched after warm-up with `later` |
| Space | A convolution echo for the plain (`plainVerb`) |
| Sleep | Sound off or a hidden tab stops every voice and suspends the context |

## Quality and performance

| | |
|---|---|
| Frame cap | 30 fps (`FRAME`); Dev FPS row: 24, 30, 75 |
| Pixel ratio | `max(0.4, base × RES_STEP[rung] × resolution)`, `RES_STEP` = 1, 0.82, 0.68, 0.55 |
| Slow-frame step | Own ladder: after 4 s, an average gap over 48 ms (busy) or 70 ms (idle) raises `rung` to at most 3; it never steps down. `?rung=N` forces it |
| Rung effects | Resolution share, MSAA, smoke steps (72, 40, 24), light and volume steps, bloom size, FXAA |
| Idle | Sleeps after 60 s with no input (`?sleep=`); `whenVisible` pauses it off screen |
| Reduced motion | About 60 checks: no shake, no sparks, no flaps or arcs, half gains |
| QA hook | `window.__qa` exposes draws, rung and info |
| Start-up | The scene builds in one task, then compiles twice behind the intro (visible meshes, then hidden ones). The intro's load line counts four steps: scene, compile, warm compile, first frame |

## State and storage

| Key | Holds |
|---|---|
| `stimming.railgun.time` | The Time slider |
| `stimming.railgun.chargemix`, `.gomix` | Dev sound mixes, with migrate markers |
| `stimming.railgun.<row>` | Settings and Dev rows: letterbox, aim, firemode, res, detail, fps, target, grain, bloom, tone, exposure, brightness, contrast, saturation, fxaa |
| `stimming.railgun.sound` | Sound on or off |

## Tests and QA

| File | Covers |
|---|---|
| `tests/railgun-ship.test.mjs` | `ship.js` (Node test runner) |
| `tests/railgun-salvo.test.mjs` | `salvo.js` banking and round gain |
| `tests/railgun-salvo-qa.js` | In-page probes through `window.__qa` |

## Known issues

- `stimming-4c0k` (bug, todo): the breech clips the mount at full charge.
- The sample fetch fails without a message and retries (`:8488`).
- Inline styles on `.reset-fill` and `.release-hint`.
- In progress: `stimming-svfw` (clouds, night to noon), `stimming-wsjx` (spruce-up), `stimming-z9w9` (gun, shot, shatter), `stimming-x3wl` (capital ship).

## Legacy build

None.

## History

| | |
|---|---|
| Feature | `stimming-f793`; epic `stimming-ugc4` (capital ship); `stimming-qsnm` (Salvo) |
| Plans | `docs/plans/railgun.md`, `railgun-capital-ship.md`, `railgun-salvo.md` and their `-plan.md` files |
| Version | None |
