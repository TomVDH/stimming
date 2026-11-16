# Fire and smoke: the shared module and its reach

Tom, 2026-11-16 (decision 13 in [code-health.md](../code-health.md)): Fire's flame and smoke become one shared module that other toys reuse.
Bean `stimming-oeym`, under epic `stimming-3s8z`.

## The module: `shared/fire.js`

Fire is the reference port. The module is Fire's K3 code, moved as it was: the same kernels, the same volume, the same numbers.

### What moved, and what stays in Fire

| In the module | Stays in Fire |
|---|---|
| Nine `Storage3DTexture`s: velocity A and B, dye A and B, divergence, pressure A and B, curl noise, curl | The bar, the settings, the chemicals (`CHEMS`, `FEEL`) and `tune()` |
| The kernels: curl noise (baked once), clear, curl, advect velocity, divergence, Jacobi, project, advect dye, emit | The sound: roar, crackle, pop, whoosh, whump, fizz |
| The forces: buoyancy, heat and ambient turbulence, vorticity confinement, source wind, gust, swirl, wind, wall fade | The block, the floor, the word plate, the salt grains, the sparks |
| The emitter buffer and `setEmitters` | The fire light (`pointLight.colorNode`), the core, floor and shell glow |
| The flame ramp and the tint ramp | The key light, the camera, the render pipeline (blur, bloom) |
| The volume: `VolumeNodeMaterial` with scattering, self-shadow, emission and the shadow caster | Motion modes, banking, quality steps, the watchdog, input |

Fire's salt is the module's tint: the dye's alpha channel, a second ramp that the toy feeds at a spot.
Fire still reads `fire.vel` and `fire.emitters` for its sparks, and `fire.fireRamp` for its light.

### Design: the toy passes three.js in

The rule in [modularize.md](modularize.md) says a module never imports three.js. `shared/rocket.js` breaks it today.
For a TSL module, the toy passes the namespaces it already loaded: `createFire({ THREE, TSL, curl, renderer })`.

Why this way:

1. The module cannot load a second three.js. A page on the 0.170 map has no `three/webgpu` entry, so an import would fail at load time; with the namespaces passed in, the failure is one clear line in the toy.
2. The pin stays with the page. The module runs on whatever 0.186.1 build the page's importmap names.
3. Node graphs built from the page's own TSL share its node classes. A second TSL copy would build nodes that the page's renderer does not know.
4. The type check stays clean. `@types/three` 0.170 has no `Storage3DTexture` and no `interleavedGradientNoise`. A probe that types the namespaces as `typeof import('three/webgpu')` gives two errors. So the namespaces are typed loosely, the public API is typed in full, and the module stays in `include`. `npm run check` passes. `package.json` does not change.

Geometry options (grid, size, centre, pressure iterations, emitter capacity, wind radii) are JavaScript numbers. They compile into the kernels as constants, as in Fire, so the WGSL stays the same text.

### API

```js
const fire = createFire({ THREE, TSL, curl, renderer, grid, size, center, pressure, emitMax });
fire.setEmitters(flatXYZ);              // points in emitter space; fire.u.emitMatrix places them
const vol = fire.volume({ steps: 22 }); // after the scene and the camera
scene.add(vol.mesh, vol.shadowMesh);
fire.u.lightPos.value = keyLight.position;
await fire.compile([myOwnPass]);        // also bakes the curl noise
fire.step(1 / 120);                     // per fixed step; sets u.dt, swaps the dye
fire.setSteps(16);                      // ray march steps, for quality
fire.clear();
fire.dispose();
```

Every knob is a uniform in `fire.u`: emission (`emitDensity`, `emitTemperature`, `emitGain`), the gas (`buoyancy`, `weight`, `cooling`, `dissipation`, `turbulence`, `vorticity`, `velDamping`), motion (`sourcePosition`, `sourceVelocity`, `sourceSpeed`, `gustPosition`, `gustVelocity`, `swirl`, `wind`), tint (`tintFeed`, `tintSpot`, `tintFade`), and the look (`intensity`, `glowSpread`, the two ramps, `smokeTint`, the shadow and scattering terms).

## Proof: the same frame

Real GPU (NVIDIA, WebGPU on D3D12), headless Chromium with a seeded `Math.random` and a clock that moves only when the harness ticks. 1280 × 800 and 375 × 812. Interactions: salt flick, blow, flare, a word, Escape, Intensity, Reset, a drag of the fire, a hold that feeds salt.

1. **The sim is not bit-stable.** About eight emitter points fall in each grid cell, and each one reads and writes the cell in the emit pass. That race differs from run to run. Two runs of the old page differ on 43 to 99% of the pixels after one second. A pixel diff cannot prove the port by itself, so the proof has three parts.
2. **The shaders are the same.** The page compiles 54 WGSL modules. Old and new give the same 54, in the same order. Two of them differ in one name only: the emitter buffer is `NodeBuffer_1064` before and `NodeBuffer_1050` after (a node id). With digits in names masked, all 54 are equal. Four runs of the new page give the same text byte for byte.
3. **The frames sit inside the noise.** Frame 3 moves 1/255 on 712 pixels (old against old: 624). Four runs a side, 20 frames each, three look metrics per frame (mean luma, flame area, smoke area). A Welch t-test finds 1 of 57 metrics past p < 0.05, where chance alone gives about 3. That one is the smoke area at 375 px after 1 s: 42.9% before, 43.0% after.
4. **The console is clean** in all 16 page loads. Every interaction works: drag moves the fire, a hold feeds salt.

Harness: `fire-qa.mjs` in the session notes. Headless Chromium needs `--disable-dawn-features=use_dxc`, because it ships no `dxcompiler.dll`.

## Ink's copy: the drift

Ink says "Copy K3 from here, not from Fire". It is a fork, not a copy. Ink does not adopt the module in this step.

| Part | Fire (the module) | Ink |
|---|---|---|
| Grid | Fixed 100 × 100 × 200, box 12 × 12 × 24 on the floor | Per quality grade and tank width; dye on its own finer or coarser grid; box centred on 0 |
| Dye channels | r smoke, g heat, b age, a tint | rgb absorption times mass, a mass |
| Buoyancy | Heat lifts, smoke weighs | Mass sinks (`BUOYANCY_SIGN = -1`), times weight and gravity |
| Velocity advection | Plain semi-Lagrangian | Adds a six-neighbour viscous blend (`uViscosity`) |
| Curl noise | Frequency 10 by uniform, step 0.1 / f, times 5 | Frequency 6, step 0.02, divided by 2e |
| Turbulence | Heat term with age decay, plus an ambient term on smoke | One term on dyed water, plus `uWash` |
| Extra forces | Source wind, gust, swirl, wind | One slow convection roll (`uDrift`) |
| Vorticity weight | Heat plus half the smoke | Mass, 0.8 to 1 |
| Wall fade | 0.08 | 0.035 |
| Emitters | Up to 24,000 points through a matrix; a separate emit pass | Up to 8 spheres (three vec4 each); velocity grip in advection, dye in the correct pass |
| Dye advection | One pass, with dissipation and cooling | MacCormack: forward, then a clamped correction; no loss, `uKeep` |
| Clear | Velocity and both dye textures | Also pressure; a separate ink clear |
| Lifecycle | Inline in the page | `createK3()` with `compile`, `step`, `clear`, `resampleFrom`, `dispose` |

Common to both: the storage texture setup, voxel and UVW helpers, the curl, divergence, Jacobi and projection passes, and the vorticity confinement core.
For Ink to adopt the module, the module needs a solver core with hooks: the toy's own forces, its own dye advection and its own emitters. That is a later step, in Ink's own chat, when Tom picks it.

## Reach

Every toy that draws fire, flame, smoke, steam or exhaust, 2026-11-16. "Sim" means a real fluid; "noise" means a procedural look.

### On WebGPU (Compute): the module fits

| Toy | Shelf | What it draws | How, now | Fit |
|---|---|---|---|---|
| `fire` | Main 21 | The hero flame and smoke | `shared/fire.js` | Reference port, done |
| `spark` | Lab | Smoke of the spark wheel | A third K3 copy, lifted from Ink and retuned (`spark/index.html:987-1289`, render to :1503), about 510 lines | Best next adopter: same stack, a real 3D fluid, smoke that rises. It needs Ink's per-grade grid, so the module first gains a `grid` per quality step |
| `ink` | Main 32 | Ink dye, not fire | The K3 fork (see the drift above) | Later: needs a solver core with hooks |

### On raw WebGL2 (Shader): a GLSL fluid exists

| Toy | Shelf | What it draws | How, now |
|---|---|---|---|
| `cauldron` | Lab | The fire under the pot, and steam | Fire's solver ported to GLSL on a 48 × 56 × 48 grid packed into one 2D atlas (`cauldron/index.html:269-476`), ray-marched; steam is noise. About 300 lines |
| `schlieren` | Lab | Air and heat over a candle | A 2D grid fluid; the flame is an analytic teardrop |
| `windtunnel` | Lab | Smoke lines in a wind tunnel | A 2D MacCormack fluid |
| `vortex` | Main 35 | Smoke rings | Vortex filaments (Biot-Savart), splatted and ray-marched. Not a grid |
| `flametest`, `rubens` | Lab | Flame tongues | Noise in a full-screen fragment |
| `lichtenberg`, `rupert` | Lab | Ember glow, a steam plume | Noise in the fragment |

### On three.js 0.170 WebGL (Scene): all noise, no sim

| Toy | Shelf | What it draws | How, now |
|---|---|---|---|
| `railgun` | Main 40 | Comet smoke train, muzzle plume, fireball, soot | Ray-marched noise volumes in proxies, about 1,000 lines |
| `launch` | Main 38 | Rocket flame, climb smoke, ground cloud | `makeFlame` (`shared/rocket.js`); 40 ray-marched cylinders (from railgun); the ground cloud is a real 2D fluid |
| `calaeno` | Lab | Smoke train | Railgun's ray-marched train, copied word for word (`calaeno/trail.js`) |
| `ascent` | Lab | Rocket flame and trail | `makeFlame`, instanced puffs |
| `meteor` | Lab | Entry plume, steam column, train | Billboards and points |
| `fireworks` | Main 37 | Lit smoke, beach fires | 640 instanced billboard puffs; one sprite per fire |
| `frietkot` | Main 39 | Vent and fryer steam | 400 CPU-moved billboards |
| `window` | Main 33 | Trails and an impact fireball | A full-screen fragment: glowing capsules, a noise fireball |
| `tvtree` | Main 23 | Rocket, candle and volcano channels | Noise, 20 to 40 lines each |
| `nvg`, `phaeton`, `eastvan`, `bread`, `canal`, `viaduct` | Lab | Flak, diesel and chimney smoke, steam, a candle, a flare stack | Points, sprites, one bulb, a shader tongue: small details |

Three copies of the same smoke look already exist outside the fluid: railgun's ray-marched train (railgun, launch, calaeno). That is a GLSL module of its own, not this one.


## Options for the WebGL toys

The module needs WebGPU: it writes 3D storage textures from compute kernels. three.js's WebGL2 backend runs compute only on buffers, not on storage textures, so `WebGPURenderer` on WebGL2 cannot run it (Fire already rejects that backend; not tested further here).

| Option | What it takes | Gain | Cost |
|---|---|---|---|
| A. A GLSL/WebGL2 twin of the module | Grow `cauldron`'s atlas solver into `shared/firegl.js`: kernels as fragment passes over a 2D atlas, a ray-march function, the same ramps and constants. Raw WebGL2 toys use it directly; Scene toys run it on the three.js renderer through render targets and a `ShaderMaterial` | Real fire on every browser; cauldron proves it runs | Two codebases for one look; they drift. Small grids only (cauldron: 129,000 cells against Fire's 2 million) |
| B. Move the Scene toys to `WebGPURenderer` | A rewrite per toy: every `ShaderMaterial` and `onBeforeCompile` to TSL, the `EffectComposer` chain to `RenderPipeline` | One stack | Months of work on the S-tier and main shelf scenes; the 0.170 pin moves per toy, against stack-types decision 4 ("one planned step, never per toy"). Browsers without WebGPU lose those toys |
| C. WebGPU only | The module serves Compute toys. Scene toys keep their noise plumes | No new work, no drift | WebGL toys get no sim fire |

**Recommendation: C now, A only on demand.**

Tom picked C on 2026-11-16: WebGPU only for now. A waits until Tom asks for a hero sim fire in a WebGL toy.

1. Every fire in a Scene toy is a plume, a train or a puff: far away, fast, often kilometres long. A 12-unit grid does not fit those scales, and ray-marched noise already looks right there.
2. B breaks the one-pin rule and costs the most for the least.
3. A is the way if Tom wants a hero sim fire in a WebGL toy. Then build it from `cauldron`, its first reference port, and share the look with `fire.js` (ramp stops, tint, light terms), not the code.
4. Next steps for Tom to pick: `spark` adopts `fire.js` (with a grid per quality step); railgun's ray-marched smoke train becomes its own GLSL module for railgun, launch and calaeno.

