# Modularization audit

Bean: `stimming-5kiq` (epic `stimming-3s8z`). Audit of 2026-11-14. A plan: no toy changes here.
A toy adopts a module in its own chat, when Tom picks it (`AGENTS.md`, Process).

This file extends two others and does not repeat them:

- `docs/plans/shared-shaders.md`: the GLSL library (`shared/flare.js`, `grade.js`, `output.js`, `sky.js`, `water.js`, `glow.js`, `precip.js`, `wetglass.js`, `environment.js`, `detail.js`). It lists which toys copy each shader and how each adopts it.
- `docs/stack.md`: the renderer tiers and the library set.

This file covers what those two do not: **the JavaScript that repeats** (audio, WebGL2 plumbing, sizing, slow frames, colour, input, three.js post), the drift between toys and the modules that already exist, and one adoption order across both.

## How the audit was made

1. Seven agents read every toy's main page and its local modules (side pages skipped): about 222,000 lines in 87 folders. Their notes sit outside the repo.
2. A script pulled every JS and GLSL function from the live pages, normalized white space, and grouped equal bodies across toys.
3. Pattern counts over the same files (`new AudioContext`, `0.3963377774`, `rung`, `IntersectionObserver`, and so on).

Counts are by toy folder, from live pages only. "Exact" means the same body after white space; "family" means one name and one shape with small changes.

## The big picture

| Fact | Count |
|---|---|
| Toys in `toys.json` | 88 (`postcard` has no folder) |
| Raw WebGL2 toys | 40 |
| three.js toys (WebGL) | about 30; 3 more on the WebGPU build (`galaxy`, `fire`, `ink`) |
| Canvas 2D (alone or as a layer) | 34 |
| Toys on Bar v2 / on v1 | 62 / 24 |
| Toys that import a shared GLSL module | 7: `trainride`, `window`, `launch`, `railgun`, `foghorn`, `eastvan`, plus `fxlab` |
| Toys on `detail.js` | 1 (`foghorn`) |
| Function bodies copied exactly into 3 or more toys | 62 groups, about 2,900 redundant lines |
| Same-name families in 4 or more toys | about 80 names; most with small changes per toy |

Exact copies are only the floor. Most repeats are families: copied once, then changed a little in each toy. A module cannot replace a family without a look or feel check, so every row below names its risk.

## Candidate modules, ranked by payoff

Payoff weighs the lines saved, the number of toys, and the bugs a module fixes. Line savings are rough: toys × typical copy size.

| # | Module | What it does | Toys that copy it today | Lines saved | Risk | Exists? |
|---|---|---|---|---|---|---|
| 1 | **`audioKit()` + `shared/voices.js`** | The kit already gives the context, compressor, noise buffer, gesture unlock, `live()` and `rest()`. `voices.js` would add the voice helpers every toy rewrites: `bus(x)` (pan), `track(src, ...tails)` (count and disconnect), `burst()` (noise through a filter with a decay), `jit()`, `level()`, `stopAll()`, and `toneVoices(kit, build)`: the lazy Tone loader (`toneLoad ||= kit.tone().then(...)`) that 21 toys write as `voices()` | Own `AudioContext` (a hand copy of the kit): 29 toys, e.g. `galaxy`, `eyes`, `frost`, `harmono`, `cube`, `marble`, `flock`, `musicbox`, `plasma`, `orbits`, `slime`, `snow`, `top`, `dandelion`, `flap`, `harp`, `tesseract`, `zipper`, `balloons`. Voice helpers: `track` in 36 toys, `bus` 18, `burst` 28 (26 variants), `live` 36, `unlock` 29 | 1,200 to 1,800 | Low for the kit (same text; `flap` tuned its compressor). Medium for `voices.js` (each `burst` sounds a little different) | Kit: yes. Voices: new |
| 2 | **`shared/gl.js`**: raw WebGL2 plumbing | `program(vs, fs)` with error log and a uniform map, the full-screen triangle, `target(w, h, { float })` with a completeness probe, `free`, `bind`, the parallel-compile poll, `nextFrame`, and one context-lost handler | 40 raw toys in three families. **A** `compile/locate/renderable/target/free/bind`: `beer`, `bench`, `bismuth`, `chocolate`, `dijkstra`, `flametest`, `lichtenberg`, `marble`, `rubens`, `vortex`, `frost`, `flock`. **B** `program/programs/target/drop/segPass`: `trails`, `chamber`, `windmap`, `sonar`, `glow`, `foil`, `sequin`, `scope`. **C** `compile/sh/uni`: `rain`, `eyes`, `neon`, `orbits`, `plasma`, `kaleido`, `chladni`. Also `shared/environment.js` and `shared/glow.js` each carry a private compile (later work: step 4 leaves them as they are) | 2,500 to 4,000 | Low to medium: GL state is easy to break, but each toy's frame is easy to compare. Only `slime` recovers from a lost context (on a fresh canvas); a few others stop on it | Yes, since 2026-11-15: `program`, `linked` (the poll, the error log, the uniform map), `TRI_VS`, `tri`, `to`, `target(gl, w, h, { format, filter, depth, mips, clear, check })`, `renderable`, `msTarget`, `free`, `bind`, `nextFrame`, `onContextLoss`. Typed; `npm run check` passes |
| 3 | **`detail()` for every slow-frame watch**, plus `fitRenderer()` | `detail()` exists. Add `steps` (2 or 3 rungs) and a threshold option so the common ladders fit. Move the three.js `fitRenderer(renderer, panel, cap, onSize)` (13 toys, exact) into `stim.js` on top of `pixelRatio` | `rung` in 32 toys, `watchdog` in 19 (5 variants). Ladders: `trainride`, `subway`, `foil`, `glow`, `oilslick`, `sequin`, `beer`, `chocolate`, `ice`, `rubens`, `spark`, `phaeton`, `stone`, `windfarm`, `windmap`, `vortex`, `fireworks`, `launch`, `frietkot`, `flametest`, `lichtenberg`, `motorway`. `fitRenderer`: `balloons`, `bubbles`, `dandelion`, `ferro`, `glass`, `magnet`, `morpher`, `pendulum`, `pins`, `soap`, `tesseract`, `top`, `tvtree` | 900 to 1,200 | Medium: the rules differ (38 fps for 2 s; 24 ms over 40 frames; Railgun's 48 or 70 ms). A toy with its own rule keeps it. Fixes real bugs (see Drift) | `detail()`: yes. `fitRenderer`: new |
| 4 | **OKLCH in JS: use `stim.js`** | `oklchLinear`, `oklchRgb`, `linFit`, `css` | The `0.3963377774` matrix sits in 32 toys: `lin` exact in 26 (`morpher`, `fidget`, `domino`, `kaleido`, `soap`, `chladni`, `rain`, `tvtree`, `balloons`, `eyes`, `coil`, `dandelion`, `frost`, `harmono`, `cube`, `marble`, ...), plus `pendulum`, `top`; with a gamut loop (`gam`, `rgb`, `css`) in `harp`, `zipper`, `tesseract`, `sand` | 400 to 800 | Low for `lin` (same maths). Medium for the gamut loop: culori fits chroma another way, so out-of-gamut colours shift. `musicbox` and `top` define their own `linFit` with another signature | Yes |
| 5 | **K2 three.js post: `gradePass` + a new `bloomPass`** | `gradePass()` (`shared/grade.js`) replaces `makeGrade`. A new `bloomPass(UnrealBloomPass, opts)` would hold `makeBloom`, its size rule and the bicubic composite (`bic`). Classes come in as arguments, so the module still imports nothing | `makeGrade`: exact in `bread`, `canal`, `fireworks`, `ice`, `spark`; changed in `launch`, `meteor`, `frietkot`, `viaduct`, `railgun`. `makeBloom`: the same ten. `renderMirror`: `canal`, `fireworks`, `launch` (exact) | 1,000 to 1,500 | Medium to high: the forks drifted (letterbox, seed, bicubic, `smoothWidth`). Grade is covered by `shared-shaders.md`; bloom needs Tom's eye | Grade: yes. Bloom: new |
| 6 | **`shared/output.js` in raw toys** | `ouAces`, `ouSrgb`, `ouKnee`, `ouDither`, `ouFilm` | `aces` exact in 10 (`lava`, `vortex`, `dijkstra`, `beer`, `bismuth`, `chocolate`, `flametest`, `lichtenberg`, `rubens`, `stone`), same maths in `pool`. `srgb` without clamp equals `ouSrgb` in 6 (`dijkstra`, `beer`, `bismuth`, `chocolate`, `lichtenberg`, `rubens`); with clamp in 11 (`kaleido`, `neon`, `rain`, `frost`, `marble`, `flock`, `orbits`, `plasma`, `sand`, `chladni`, `eyes`) | 150 to 250 | Low where exact. The clamp copies need the clamp kept: `pow()` of a negative is undefined in GLSL | Yes |
| 7 | **`shared/noise.js`** (GLSL) | The Hoskins hash (`0.1031`), value noise, fbm, under one prefix | The `0.1031` hash in about 30 toys (names `hash`, `hash12`, `h`), `vnoise` exact in 12 + 9 (two sets, by hash name), `fbm` in 28 (26 variants). A sine hash in 7 more (`putty`, `scope`, `tvtree`, `balloons`, `sonar`, `vortex`, `phaeton`) | 500 to 700 | Low for the toys whose hash is the same text: the pattern stays bit for bit. High for the rest: a new hash moves every pattern. `glassrain.js` already holds `grH`, `grN`, `grFbm` | Partly (`grN`) |
| 8 | **`whenVisible` and `pixelRatio` everywhere** | `stim.js` has both | Own `IntersectionObserver` plus `visibilitychange` in about 20 toys (`flap`, `harp`, `tesseract`, `zipper`, `sand`, `frost`, `harmono`, `marble`, `flock`, `musicbox`, `orbits`, `plasma`, `snow`, `slime`, `galaxy`, ...). Own `devicePixelRatio` fit with the same 1.4e6 budget in about 10 | 300 to 500 | Low | Yes |
| 9 | **`shared/pointer.js`** | `local(e)` (pointer to panel space), one drag with pointer capture and the full up/cancel/lost set, a two-finger pinch | `local` in 26 toys (15 variants); the five-event pointer set in the family-A raw toys; pinch in `canal`, `trainride`, `ulam`, `galaxy` | 400 to 600 | Medium: gesture feel is the toy | New |
| 10 | **Shell leftovers** | `save/saved` storage wrappers (19 toys), `popover` (`subway`, `windfarm`, `foil`, `glow`, `oilslick`, `sequin`), the `markReady/playIntro` preamble (`subway`, `ulam`, `washline`), the intro in a second script (`orbits`, `plasma`, `slime`, `snow`, `top`) | 200 to 400 | Low. Most go with the Bar v2 move (epic `stimming-80dc`), so this is not its own work | Partly |

GLSL modules from `shared-shaders.md` (flare, sky, water, precip, wet glass, glow orbs) keep their own ranking there. This table adds only the ones the JS work touches.

### Toy-to-toy modules

Code that one toy owns and another imports or copies. Each is a question for Tom: move it to `shared/`, or leave it with its owner.

| Code | Owner | Used by | Note |
|---|---|---|---|
| `nvg/tube.js` (`Tube`, the image intensifier) | `nvg` | `railgun` imports it | The only cross-toy import. A move to `shared/` makes the dependency plain |
| K3 volume fluid (`createK3`, `createStorage3D`) | `fire` | `ink` (copy, "Lifted from fire") | Both TSL. The shared GLSL rule does not reach them |
| `spectral()` | `prism` | `flametest` (copy) | |
| `smin`, `smax` | `window` | `frietkot/figures.js` | |
| CRT screen and glass shader, `program/target/drop/clearAcc/quadPass` | `scope` | `sonar` (a fork) | Two oscilloscope-like toys; one module or one owner |
| The kit-ported twin | `coil` | `dandelion` (still on its own context) | `coil` shows the port `dandelion` needs |
| Composer block Render, Unreal, Output | | `ulam`, `washline` | Three lines; leave |

## Drift: copies that already differ from a shared module

| Toy | Copy | Shared module | State |
|---|---|---|---|
| `windfarm` | `swell()` and `hash12` | `wtSwell`, `wtH` in `water.js` | Same text; only argument names differ. Adoption is free |
| `stone`, `bismuth`, `chocolate`, `vortex`, `dijkstra`, `lava`, `beer`, `flametest`, `lichtenberg`, `rubens` | `aces()` | `ouAces` | Same text |
| `dijkstra`, `beer`, `bismuth`, `chocolate`, `lichtenberg`, `rubens` | `srgb()` | `ouSrgb` | Same text |
| `canal`, `bread` | `makeGrade` | `gradePass()` | Same body in both toys; `shared-shaders.md` already maps it |
| 29 toys | `audio/live/unlock/rest` | `audioKit()` | A hand copy of the kit from before it existed. `flap` changed the compressor (-14/8/5) |
| 26 toys | `lin()` | `oklchLinear()` | Same maths |
| `musicbox`, `top` | Own `linFit` | `linFit()` in `stim.js` | Same name, other signature: a trap for the next edit |
| `trainride` | Glass from `glassrain.js` parts, by hand | `wetGlass` in `wetglass.js` | The planned first adoption |
| `fireworks`, `launch`, `frietkot`, `canal`, `meteor`, `bread`, `spark`, `ice`, `viaduct`, `railgun` | K2 kit | `grade.js`, `sky.js`, `glow.js`, `flare.js` | Ten forks. `launch` and `railgun` already take `FLARE`; the rest stays local |

### Bugs the audit found on the way

These are not module work. Each needs a bean in its toy's chat.

| Toy | Finding |
|---|---|
| `bismuth`, `bread` | The `rung` ladder is read but never raised: the slow-frame step never fires |
| `windfarm`, `motorway`, `harp`, `zipper`, `sand` | A new quality choice does not reset the slow-frame step (`onQuality` misses it) |
| `motorway` | `fogT` is defined twice: in `COMMON` (`:383`) and in the sprite shader (`:824`) |
| `chamber` | The frame loop never stops when idle |
| `prism` | Two slow-frame watches; both set `lowDpr` |
| `glass` | `gunshot.mp3` looks unused: the page loads only the `.wav` |
| `glass` | On Bar v2, but `AGENTS.md` says it keeps its old header: the doc is stale |
| `phaeton` | MSAA twice: `antialias: true` on the canvas and 4 samples on the composer target |
| `postcard` | In `toys.json` with no folder |
| `fireworks` | Loads ZzFX from a CDN URL outside the importmap (Tom's pick, per its comment). The importmap rule does not list it |
| About 15 three.js toys | No `dispose()` on leave. Low impact: each page is one toy |

`docs/plans/shared-shaders.md` says "None yet" in its Adopted-by column. That is stale: `flare.js` (`launch`, `railgun`), `water.js` (`foghorn`, `trainride`), `glassrain.js` (`trainride`, `window`), `bokeh.js` (`trainride`), `grade.js` (`eastvan`), `environment.js`, `sky.js`, `weather.js` (`foghorn`).

## Adoption order

One module at a time, one toy at a time, picked by Tom. Each step names a reference port: the toy that adopts first and proves the module.

| Step | Module | Reference port | Why that toy | Then |
|---|---|---|---|---|
| 1 | `audioKit()` for the hand copies | `eyes` | Its `audio()` is the kit's text word for word; no sound changes | The 28 others, as each toy's chat comes up |
| 2 | `lin` to `oklchLinear` | `rain` (done 2026-11-15) | Same maths, a main shelf toy, a shader toy (the value goes into a uniform). Not bit-equal: `lin` rounds the matrix to 10 digits, so values move by 2.4e-7 at most and a few pixels by 1 of 255 (`docs/toys/rain.md`) | `morpher`, `kaleido`, `chladni`, ... |
| 3 | `aces`, `srgb` to `output.js` | `stone` (done 2026-11-15) | Its `aces` is `ouAces` byte for byte; small page. Bit-equal: 0 pixels differ in 25 frames, real GPU and SwiftShader. Stone has no `srgb()`: it ends with `pow(c, 1/2.2)`, which stays. So Stone proves `ouAces` only; `ouSrgb` still needs a first adopter (`dijkstra` holds the exact text) | The family-A raw toys |
| 4 | `shared/gl.js` (new) | `bismuth` (done 2026-11-15, `stimming-x1q5`) | Family A in full (`compile`, `locate`, `renderable`, `target`, `bind`, the compile poll); it also has the dead `rung` to fix with step 5. The port removes 93 lines (1,436 to 1,343). Bit-equal: 0 pixels differ in 35 of 35 canvas frames, on the real GPU and on SwiftShader, with the triangle now `TRI_VS`. Before the port Bismuth had no context-loss handler: the canvas went black for good. Since 2026-11-16 it uses `onContextLoss` (`stimming-x1q5`, Tom's call): it rebuilds and the scene goes on, also after two losses in a row. A browser unit check proves the parts Bismuth does not use (`onContextLoss` with lose and restore, a failed link, the probe, pairs, mips, `limit`) | Family A: a drop-in; `target` options replace the positional format and filter, `wait` covers the timer polls (`vortex`), `limit` the 3 s ones (`dijkstra`, `lichtenberg`), `onContextLoss` the hand handlers (`marble`, `frost`, `flock`). B (`trails`): pass `attrs` to `program`; uniform arrays map by the bare name (`chamber`, `sonar` read `u['x[0]']`); targets become immutable; the 4-vertex strip stays or moves to `TRI_VS` with a frame check; a failed link throws, so `fail()` moves to a catch. C (`rain`): `program` and `linked` replace `compile` and `uni`, `renderable` the inline float probe, `onContextLoss` the handler. After a restore, a toy must get its extensions again |
| 5 | `detail()` with `steps` | `subway` | `detail.js` holds Subway's numbers already | `trainride` (the shader library's planned first adopter), then the 38 fps ladders |
| 6 | `fitRenderer` into `stim.js` | `pins` | Exact copy; S tier, so Tom watches it closely | The other 12 |
| 7 | `shared/voices.js` (new) | `fireworks` | The fullest voice set (`track`, `prune`, `stopAll`, `filt`, `hiss`, `jit`) | `launch`, `frietkot`, `meteor`, `canal` |
| 8 | K2 `bloomPass` (new) with `gradePass` | `canal` | Its `makeGrade` is exact; `makeBloom` is the common base | `bread`, `meteor`, `spark`, `ice`, then `fireworks`, `launch`, `frietkot` |
| 9 | `shared/noise.js` (new) | `frost` | Its Hoskins hash and `vnoise` equal the common text (20 and 12 toys) | Only toys whose hash text matches |
| 10 | `shared/pointer.js` (new) | Tom picks | Feel matters most here | |

Steps 1 to 3 change no picture and no sound. They are the cheapest proof that toy chats can adopt shared code safely.
Steps 4 and 7 to 10 build new modules. Each new module gets the shader library's rule first: it must give the same frame or sound as the copy it replaces.

## Rules

- Perfect one thing first. A module is done when its reference port ships and Tom is happy, not when it is written.
- A module never imports three.js. It takes classes as arguments (`bloomPass(UnrealBloomPass, ...)`), as `gradePass()` returns a plain object today.
- A module moves code that is the same. Where copies differ, the module keeps the common part and the toy passes its own numbers.
- A toy chat adopts; this chat does not edit toy folders.
- Each adoption commit says which copy it removed and the proof that nothing changed (a frame diff, or "same text").

## Open questions for Tom

1. The order: audio and colour first (steps 1 and 2), or the WebGL2 kit first (step 4, the largest saving)?
2. New modules: `gl.js`, `voices.js`, `noise.js`, `pointer.js`, `bloomPass`. Which may exist?
3. `nvg/tube.js` to `shared/`: yes or no.
4. The bugs list: one bean per toy now, or wait for each toy's next turn?
