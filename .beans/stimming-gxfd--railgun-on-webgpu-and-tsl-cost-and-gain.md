---
# stimming-gxfd
title: 'Railgun on WebGPU and TSL: cost and gain'
status: completed
type: spike
created_at: 2026-11-12T06:43:13Z
updated_at: 2026-11-12T06:43:13Z
parent: stimming-f793
---

Question: what does a move of Railgun to three.js `WebGPURenderer` and TSL cost, and what does it give?

Scope: a spike, not a port. `railgun/index.html` stays as it is (three.js 0.170, WebGL2, GLSL). The proof lives in `lab/railgun-webgpu/` (noindex, unlinked).

- [x] Inventory every ShaderMaterial and pass; sort by port effort
- [x] Find where WebGPU wins (compute particles, half-resolution volumes, storage buffers) and where it does not
- [x] Proof: field motes on TSL compute beside the WebGL2 CPU step, `lab/railgun-webgpu/`
- [x] Frame times at 1280 x 800 in headless Edge, `lab/railgun-webgpu/results.json`
- [x] Recommendation and effort estimate

## Recommendation

Do not port Railgun now.
The shot frame's cost sits in raymarched volumes: up to 9 `makeVol` volumes, the trail and the clouds, all fill-rate bound. WebGPU runs the same per-pixel math at the same speed. This spike did not profile the shot frame itself.
The proof shows a clear win only for CPU-stepped particles at counts far above what Railgun ships (2,400 motes).
At 2,400 motes the WebGL2 CPU step costs 0.06 ms a frame; WebGPU costs 0.37 ms, its fixed floor.

Do these instead, in this order:

1. Half-resolution volume pass in WebGL2: march the volumes into a half-size target, then a depth-aware upsample. This is the largest frame-time gain, and it needs no new renderer.
2. Port Railgun only when a feature needs compute: a mote storm of 100k or more, dust that settles, particles that hit the barrel or the ground.
3. When that happens, port in the order of the effort table below; the shared GLSL chunks go first.

Effort for a full port: 8 to 11 working days, most of it in the volumes and in visual A/B matching.

## Proof: field motes, WebGL2 CPU step vs WebGPU compute

`lab/railgun-webgpu/index.html` shows both side by side, with a count switch.
`gl.html` is Railgun as it ships: three.js 0.170, the CPU steps each mote (`stepMotes`), `THREE.Points` draw them with Railgun's mote shader.
`gpu.html` is three.js 0.186.1 `WebGPURenderer`: one TSL compute pass steps each mote in storage buffers (`instancedArray`), instanced `SpriteNodeMaterial` sprites draw them. `?webgl` forces the renderer's WebGL2 fallback.
Both use the same rule at full charge: softened 1/r pull to the axis, drag, drift to the muzzle, substeps of 1/60 s; dead motes respawn.

Bench: `PW=<playwright-core> node lab/railgun-webgpu/bench.mjs`, headless Edge, 1280 x 800, pixel ratio 1, RTX 3070 (D3D11 ANGLE for WebGL2), Ryzen 7 5800X3D, 2026-11-11.
Playwright is not in this repo; the run used `E:/dev/shotwright/node_modules/playwright-core`.
Each cell is step plus draw, in ms a frame: the median of nine bursts of 60 frames, one GPU sync per burst.
A sync per frame is not fair: `onSubmittedWorkDone` alone adds about 4 ms.

| Motes | WebGL2 CPU step | WebGPU compute | TSL on WebGL2 fallback | CPU-step JS |
|---:|---:|---:|---:|---:|
| 2,400 | **0.06 ms** | 0.37 ms | 0.10 ms | 0.05 ms |
| 20,000 | 0.40 ms | 0.38 ms | **0.15 ms** | 0.29 ms |
| 100,000 | 2.06 ms | **0.36 ms** | 0.50 ms | 1.61 ms |
| 400,000 | 8.86 ms | **0.58 ms** | 1.85 ms | 8.58 ms |
| 1,000,000 | 21.75 ms | **1.19 ms** | 4.06 ms | 21.20 ms |

Readings:

- At Railgun's 2,400 motes, WebGL2 wins. WebGPU has a floor of about 0.37 ms a frame for one compute pass and one render, at any count up to 100k.
- The CPU step grows linearly: 21.8 ms at 1M, 21.2 ms of it main-thread JS. WebGPU takes 1.2 ms.
- WebGPU and the CPU step cross at about 20k motes. From 100k up WebGPU is 6 to 18 times faster.
- The TSL WebGL2 fallback (transform feedback) beats the CPU step from 20k up, and beats WebGPU itself up to 20k. A TSL port keeps its compute on browsers without WebGPU.
- Port cost of this one system: about 60 lines of TSL. `gl_PointSize` has no WebGPU equal; sprites replace points. The WebGPU canvas clears to alpha 0, so a scene needs an opaque background or the additive motes vanish.

## Inventory: 27 ShaderMaterial sites, about 45 material instances, 6 passes

### Direct TSL port (about 3 days)

A line-by-line translation into TSL nodes. Each waits on the shared chunks (next table).

| Material | Code | Notes |
|---|---|---|
| sky dome | `sky` | K2 sky and haze chunks |
| far mesas | `far` | `dFdx` normals; TSL has `dFdx` |
| ground | `ground` | `dFdx`, shadow map read, 4-tap loop |
| gun, case, flap and port | `gunMat`, `caseMat`, `flapMat` | `fwidth` bands, `AIM` chunk, shadow map |
| asteroid, fragments, shards | `astMat`, `fragMat`, `shardMat` | one shader shared by rock and fragments |
| flares (about 12), glints (2 plus brake jets), shells (4), rings | `makeFlare`, `makeGlint`, `makeShell`, `makeRing` | screen quads and shells, small |
| shock ring, bolt, ion line, ion puffs | `shockRing`, `boltMat`, `ionMat`, `ionPuffs` | ribbons and instanced quads |
| dust puffs, fragment trails | `dust`, `makeFragTrail` | instanced quads |
| arcs | `arcMat` | ribbon from CPU points, 16 x 21 |
| burst stars (K6) | `starMat` | already analytic in the vertex shader: closed-form drag and gravity, CPU writes only at spawn. Port as `positionNode`; compute gives features, not speed |
| field motes | `moteMat` | done in the proof |

### Needs a rewrite (about 5 to 7 days)

| Item | Code | Why |
|---|---|---|
| Shared GLSL chunks: K2 noise, sky, haze, `LIGHT`, `AIR`, `TERRAIN`, `AIM`, `HEAD` | `HEAD`, `TERRAIN`, `AIM` | String chunks pasted into most shaders. They become TSL `Fn` modules first. Railgun then leaves the K2 and K6 kits it shares with Launch and Fireworks |
| `makeVol` volumes x 9: plume, charge dust, shot dust, case dust, muzzle smoke, ring volumes x 2, vent jets, fireball | `makeVol`, `VOLFX` | One `VOLFX` march built by string composition with `#define` and `#ifdef` (`VSHADE`, `VHAZE`) and per-volume `dens`, `alb`, `vlight`. TSL needs a JS factory of `Fn` nodes, `Loop` with `Break`, and an A/B check against the GLSL for each volume |
| comet trail and mini trails | `makeTrain` | 96-step march, 6-step light march, 3D noise |
| clouds | `CLOUD_FS` | instanced heaps, 3D noise |
| 3D noise bake | `volRT` | 96 draws into `WebGL3DRenderTarget` slices. Becomes one compute pass into a `Storage3DTexture` (Galaxy does this). The WebGL2 fallback has no storage textures, so the fallback keeps a slice render |
| sun shadow and gun depth | `shadowRT`, `gunDepthRT` | Custom depth targets work. The gun-depth read linearises with the WebGL depth range (`z * 2 - 1`); WebGPU depth runs 0 to 1, so the formula changes |
| post chain | `composer`, `makeBloom`, `makeGrade` | `EffectComposer` with 4x MSAA half float becomes `PostProcessing`. `UnrealBloomPass` is patched by string replace (B-spline mip reads, lens dirt, halation tints, own Gaussian weights): fork `BloomNode`. The grade is a 170-line uber shader (shock refraction, heat shimmer, focus hunt, thermal sight overlay): a long but plain TSL `Fn`. FXAA and output map to stock nodes |
| perf ladder | `rung`, `resize` | `setSamples`, bloom scale and step counts per rung need new hooks |

### Blocked or at risk

Nothing is blocked outright. Risks:

- `gl_PointSize`: none in WebGPU. Sprites replace points (proved here).
- No A/B harness for TSL: `fxlab` "Check a copy" covers raw WebGL2 and `ShaderMaterial` only. The volume port needs one.
- Compile stalls: about 45 node materials build on first use. Galaxy stages its builds; Railgun would need the same, or a pre-compile with `renderer.compileAsync`.
- Size: the WebGPU build is about 205 KB gzipped (`docs/stack.md`). Measure it against the 0.170 load before a port.

## Where WebGPU wins, and where it does not

| Area | Win? | Why |
|---|---|---|
| CPU-stepped particles (motes) | Yes, above about 50k | Proof above. Below that, no |
| Burst stars, dust puffs, ion puffs | No speed win | Closed form in the vertex shader already; CPU writes only at spawn. Compute adds features: ground bounce, wind, hits on the barrel |
| Raymarched volumes (9 volumes, trail, clouds) | No | Fill-rate and ALU bound; the same math runs at the same speed |
| Half-resolution volumes with depth-aware upsample | Yes, but not from WebGPU | The technique works in WebGL2 today. WebGPU only makes it neater (compute into a storage texture, shared memory for the upsample) |
| Shared light grid for the volumes | Yes, later | A compute pass could fill one 3D light texture for all volumes and replace each volume's light march. Large job; only on WebGPU |
| Storage buffers for arcs and stars | No | Uploads are small ranges now |
| 3D noise bake | Small | 96 draws become one dispatch, once at load |
