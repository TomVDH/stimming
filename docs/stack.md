# Stack: renderers and libraries

Tom's standard set, the four ways a toy can draw, and when to use each.
Audit of every toy on 2026-11-09. `AGENTS.md` keeps the short rules; this file holds the reasons.

## The library set

| Role | Library | Notes |
|---|---|---|
| 3D scenes | three.js 0.170.0 (WebGL) | About 170 KB gzipped, 690 KB parsed. |
| 3D on WebGPU | three.js 0.186.1 WebGPU build | Galaxy, Fire and Ink Water only. About 205 KB gzipped. |
| Colour | culori 4.0.1 | `shared/stim.js` loads it once; use its OKLCH helpers. |
| Sound | Tone.js 15.0.4 | Through `audioKit()`, so mute and gesture start hold. |
| Motion | GSAP 3.13.0 | DOM and SVG tweens; the menu keeps the UMD build. |
| Noise | simplex-noise 4.0.3 | CPU noise; GPU toys write their own in GLSL. |

Every toy page carries the same importmap, word for word (see `AGENTS.md`).
The importmap costs nothing: a library downloads only when a module imports it.
Add no other library without Tom.

## Four ways to draw

Pick the lightest one that does the job. Move up a tier only for a feature the lower tier lacks.

| Tier | Use it for | Cost | Examples |
|---|---|---|---|
| 1. DOM, SVG, CSS | Few objects, crisp vector art, text, layout | No library, no GPU context | Fidget board, the menu |
| 2. Canvas 2D | Lines, particles, plots, up to a few thousand shapes | No library; CPU-bound past that | Harmonograph, Split-flap, Gear train |
| 3. Raw WebGL2 + GLSL | Full-screen shaders, fields, fluids, simulations on textures (ping-pong), anything per-pixel | No library; one small helper; fastest start | Rain on glass, Kaleidoscope, Caustic pool, Neon Hum, Lichtenberg, Dijkstra |
| 4. three.js | Real 3D scenes: cameras, meshes, lights, shadows, loaded models, many objects | 170 KB plus scene setup | Frietkot, Night viaduct, Pin art, Beach walker, Balloon letters |

### Decision guide

1. Is the picture one quad of per-pixel maths, seen flat? Use **raw WebGL2**.
   A fragment shader on a full-screen triangle needs no camera, no scene graph and no library.
2. Does it need a perspective camera moving through several objects, lights or shadows? Use **three.js**.
3. Is it a few hundred moving shapes with no shading? Use **Canvas 2D**.
4. Is it a handful of crisp objects or text? Use **DOM or SVG**.
5. **Offer WebGPU wherever it helps performance** (Tom, 2026-11-09). three.js `WebGPURenderer` falls back to WebGL2 by itself, so a three.js toy can switch with one renderer change. Shader toys move where compute pays off: particles, fluids, cellular sims. Galaxy, Fire and Ink Water already run it. The short list lives in the epic bean `stimming-2s6y`.

### Why it matters

- **Start-up.** three.js adds a 170 KB download and about 50 to 150 ms of parse and shader compile on a laptop, more on a phone. A raw WebGL2 toy starts drawing in its first frame.
- **Frame cost.** three.js walks a scene graph, sorts objects and updates matrices every frame. A single-quad toy pays that for nothing.
- **Memory.** Each WebGL context holds its own buffers. One context per toy, released on leave.
- **Simplicity.** A shader toy in raw WebGL2 is one file to read. The same toy in three.js hides the shader inside a material.

## Audit, 2026-11-09

Counted from real imports (`from 'three'`), not the importmap.

| | three.js | three.js WebGPU | Raw WebGL2 | Canvas 2D | DOM / SVG |
|---|---|---|---|---|---|
| Main shelf (34) | 15 | 3 | 15 | 0 | 1 |
| Lab (44) | 20 | 0 | 18 | 6 | 0 |

### Refactor candidates: three.js with no 3D scene

These draw one orthographic quad with a custom shader. Raw WebGL2 does the same with no library.

| Toy | Shelf | What three.js does there | Suggestion |
|---|---|---|---|
| Morpher | Main | One orthographic quad, one SDF shader | Port to raw WebGL2 |
| Pop field | Main | One orthographic quad, one shader | Port to raw WebGL2 |
| Ulam spiral | Lab | Orthographic quad plus one overlay | Port to raw WebGL2 |

### Worth a look

Light 3D use; three.js may still earn its place. Check each before porting.

| Toy | Shelf | Use | Note |
|---|---|---|---|
| Bubble wand | Main | Orthographic, six objects, shaders | Likely a 2D shader job; check the bubble meshes |
| Prism | Main | Three objects, no camera class found | Check how it builds its view |
| Window seat | Main | One mesh; the sky is one big shader | The wing spike (`window/spike-three.html`) tests three.js for the near aircraft |
| Infinity cube, Coil, Spinning top, Snow globe | Lab | One to four meshes, perspective | Real 3D, small scenes; keep unless start-up hurts |

### Stays on three.js

Real scenes with cameras, many meshes, lights or loaded geometry: Frietkot, Broodautomaat, Canal at dusk, Night viaduct, Lit motorway, Train ride, Marsh launch, Fireworks, Coast and meteor, Wind farm, Subway, Beer pour, Washing line, Tesseract, Dandelion, Pin art, Domino Day, Soap cutting, Ferrofluid, Magnet balls, Glass, Pendulum wave, Balloon letters, TV tree, Beach walker.

## Rules for new toys

1. Start from the lowest tier that can draw the idea. Write the tier in the toy's bean.
2. Raw WebGL2 toys share one pattern: a full-screen triangle, `fitCanvas` from `shared/stim.js`, `whenVisible` to stop the loop off screen, and the site quality setting for the pixel ratio.
3. A three.js toy imports only what it uses (`import { WebGLRenderer, ... } from 'three'`) and disposes its geometry, materials and renderer on leave.
4. Every tier holds 30 fps or better, does no per-frame work when idle, and respects `prefers-reduced-motion`.
5. Port an existing toy only when Tom picks it, one toy at a time, with before and after numbers: first frame time and steady fps at 1280 px and on a phone.

## WebGPU short list (epic `stimming-2s6y`, not started)

| Toy | Why WebGPU |
|---|---|
| Murmuration | Boids on compute: tens of thousands of birds |
| Slime | Agents and a trail map, a classic compute job |
| Marbling, Ink Water | One fluid solver on compute, shared |
| Zen sand | Falling-sand cells on compute |
| Fireworks, Coast and meteor | Particle bursts and trails on compute |
| Cloud chamber | Thousands of short-lived tracks |
| Frietkot, Night viaduct, Lit motorway, Train ride, Broodautomaat | Renderer swap with the WebGL2 fallback; keep where frame time drops |
| Bubble wand, Lava lamp | Test compute fields against the fragment shaders |
