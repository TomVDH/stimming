# Turing skin (`turing/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | None yet |
| Motto | None yet |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `linear-gradient(135deg, oklch(0.78 0.14 75), oklch(0.5 0.115 56))` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

A patch of living skin carries a coat that a reaction grows. A brush stroke adds pigment; the pattern spreads from the stroke until the skin is full, then settles.
The Stripes slider walks one reaction from leopard spots through mazes to zebra stripes, so the whole coat changes under the hand. Idea 166 of the pool.

## Controls

<!-- gen:bar -->
Bar: v2 (`turing/index.html:109`).

| Slot | Holds |
|---|---|
| Top left (choice) | None |
| Bottom left (actions) | `Shuffle` (S), `Clear` (C) |
| Bottom right (slider) | `Stripes`, 0 to 1, default 0: the walk from spots to stripes |
| Key strip | drag grow; click seed; right-drag wash; 1-4 coat |
| Settings | `Coat` (stepper: Amber, Chalk, Reef, Ember; persists), `Pattern size` (2.5 to 6 CSS px a cell, 4; persists), `Growth` (0.3 to 1.6, 1; persists), Quality; Reset in the footer |
| Dev (`?dev`) | `Relief` (0 to 2.5, 1), `Gloss` (0 to 2.5, 1), `Calm` (settle threshold, log10, -5.4), `Target` (Auto, Half, Byte) |
<!-- /gen:bar -->

The coat choice sits in Settings, not top left. With a top-left choice, phones move the main slider into Settings, and Stripes is the core of the toy.

| Gesture | Does |
|---|---|
| Click or tap | Plants one seed; a spot grows from it |
| Drag | Brushes pigment along the stroke; a grow stroke also combs the grain, so stripes follow it |
| Right-drag, two-finger drag | Washes the skin bare; the coat heals back in from the edges |
| Mouse move | Carries the lamp; the sheen follows the pointer |
| Keys | 1 to 4 pick a coat; S shuffles; C clears |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | Raw WebGL2 (GLSL) |
| Libraries | None imported; the shell loads culori |
| Importmap | Word for word |
<!-- /gen:stack -->

The picture is per-pixel maths on a ping-pong simulation, seen flat. `docs/stack.md` puts that in raw WebGL2.
Key code: the walk `:534`, `SIM_FS` `:261`, `SHADE_FS` `:392`, the brush `brushTo` `:613`, the probe `harvest` `:731`, the loop `frame` `:957`, the opening `:1079`.

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `reduced`, `onReducedChange`, `audioKit`, `linFit`, `css`, `stage`, `pageReady` |
| `shared/detail.js` | `detail` |
| `shared/intro.js` | `intro` |
<!-- /gen:shared -->

No drift: sound goes through `audioKit`, the slow-frame step through `detail()`.

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 1175 | The page: CSS, markup, the vignette figure, one module script |
<!-- /gen:files -->

## Render pipeline

The simulation grid covers the stage plus two cells a side, centred on the stage. One cell is `Pattern size` CSS px.

| Pass | Target | Shader | Does |
|---|---|---|---|
| Stamp | State (ping-pong) | `STAMP_FS` | Up to 16 brush segments a pass: grow blends to the seed mix (U 0.5, V 0.25, with grain), wash to bare skin |
| Aux | Aux (ping-pong, RGBA8) | `AUX_FS` | Dries the wetness; a grow stroke combs the grain along itself |
| Sim, 8 to 28 a frame | State (ping-pong) | `SIM_FS` | One Gray-Scott step, wrapped edges, 3 x 3 Laplacian, grain pull on the feed |
| Probe, every 0.25 s | 16 x 10 RGBA8 | `PROBE_FS` | Mean change per step in each block, on a log scale; read back through a fence |
| Shade | Canvas | `SHADE_FS` | B-spline field and slope; pigment rim, rosette gaps and core; fur smeared along the grain (9 taps); dome relief and folds; one lamp with GGX, a satin lobe and a fur sheen across the hairs; wetness; vignette; ACES |

On a resize or a new pattern size, `RES_S_FS` and `RES_A_FS` carry the old grid into the new one about the stage centre. New ground starts bare and the coat grows into it.

### State format

The state stores W = 1 - U and V, so bare skin sits near zero, where floats are finest.

| Format | When |
|---|---|
| `RG32F` | `EXT_color_buffer_float` and a complete framebuffer |
| `RG16F`, then `RGBA16F` | Half-float targets only |
| `RGBA8`, two bytes a value | Always; 16 bits a value |

The Dev `Target` row forces Half or Byte to test the fallbacks.

### The walk

| Stripes | Feed F | Grain pull | Coat |
|---|---|---|---|
| 0 | 0.033 | 0 | Spots (leopard) |
| 0.3 | 0.036 | 0 | Spots and worms |
| 0.55 | 0.046 | 0 | Mazes |
| 0.75 | 0.046 | 0.25 | Stripes start to line up |
| 1 | 0.042 | 0.5 | Stripes along the grain (zebra) |

Kill rate k is 0.062 throughout. Du = 1, Dv = 0.5, dt = 1.
The grain pull lowers the feed's diffusion along the grain and raises it across, so stripes run along the grain.
A body map in the aux alpha moves F by up to 0.002, so spots run denser in some places.
The sim trails the slider by at most 1/2400 of the walk a step (`WALK_STEPS`): a jump from the maze end to spots kills the coat.
F = 0.031 at the spot end let stripes walked to spots die later; 0.033 keeps them (CPU tests, 2026-11-15).

### The brush

| Stroke | Seeds |
|---|---|
| Grow, walk under 0.22 | Beads only: a 3-cell dash, radius 2.4, every 18 cells, at a random angle. A seeded line starves in its middle here; a dash splits into a pair |
| Grow, walk from 0.22 | A line (radius 2.2) and the beads; the line grows into worms, mazes or stripes |
| Wash | Bare skin, radius 5; the coat heals back in |

Every grow line combs the grain along itself (aux G, B); beads do not. Every stroke wets the skin (aux R), which dries in 2.6 s.

### Coats

| Coat | Skin | Pigment | Surface |
|---|---|---|---|
| Amber | Tawny gold, cream belly | Black rim broken into rosette arcs, brown core | Fur, satin |
| Chalk | Off-white | Solid black | Fur, satin |
| Reef | Lemon | Navy rim, bright blue core | Glossy, raised |
| Ember | Black plum | Orange rim, yellow core | Wet gloss, raised |

The grain has no head or tail, so every fur term is even in its direction. An odd term showed a seam where `atan` wraps.

### Uniforms

`SHADE_FS`:

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uMat` | vec4 | Roughness, gloss, satin lobe, relief in CSS px | Per coat |
| `uCut` | vec2 | Pigment values where the rim and the core start | Per coat, about 0.13 and 0.2 to 0.27 |
| `uFur` | vec2 | Fur amount, rosette gaps | Per coat, 0 to 1 |
| `uKnob` | vec2 | Dev relief and gloss gains | 1, 1 |
| `uLight` | vec3 | Lamp position in CSS px, y up, and its height | Rests at 30 %, 28 % of the stage; height 0.62 of the long side |

`SIM_FS`: `uP` = (F, k, grain pull, dt).

## Sound

| | |
|---|---|
| Graph | `audioKit()` |
| Engine | Raw Web Audio |
| Voices | Brush: looped noise through a band (hiss) and a low pass (body), held 90 ms per move, pitched by speed; wash is brighter. Fizz: short rising sines, as many as the probe says the skin is busy, panned to where it is busy; spots plip higher than stripes. Clear: a falling band of noise. Shuffle: a scatter of plips. Coat: one soft knock |
| Sleep | `kit.rest()` when the loop stops and no pointer is down |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `detail({ maxDpr: 2, budget: 2.2e6 })`; the simulation grid is in CSS px and does not follow the ratio |
| Slow-frame step | `detail()`: two seconds under 38 fps drop the level; the level caps the steps a frame at 8, 20 or 28 |
| Idle | While any probe block changes faster than 3e-4 a step, the sim runs at full rate. After 3 s without that, the step rate falls to zero over 12 s (a cosine). Three calm probes (under 10^-5.4) stop it at once; 90 s after the last touch is a hard stop. The loop stops when the sim, the lamp, a coat fade and the wetness all rest |
| Reduced motion | The lamp stays at rest; coats change at once; the opening coat grows in full before the first frame |
| Measured | Mac GPU, 2026-11-15: one frame (brush, 15 sim steps, probe, shade) 2.5 ms at 906 x 1702 px; one sim step 0.016 ms on 118 x 217 cells |

## State and storage

| Key | Holds |
|---|---|
| `stimming.turing.sound` | Sound on or off |
| `stimming.turing.coat` | The coat |
| `stimming.turing.size` | Pattern size |
| `stimming.turing.growth` | Growth speed |
| `stimming.turing.relief`, `.gloss`, `.calm`, `.target` | Dev rows |
| `stimming.quality` | Site quality (shared) |

## Tests and QA

None in `tests/`. Checks for a change: a clean console on load; a drag grows a coat on bare skin; the slider turns spots to stripes; the loop stops once the skin settles; 1280 px, 375 x 812 and 812 x 375 hold; the Byte target still grows a coat.

QA of 2026-11-15 ran in the browser pane while it was hidden, so rAF did not run. A throwaway probe copy ran the same frame function by hand and sent canvas captures to a local sink. It checked: the opening, growth and the wind-down to idle (about 20 s); every walk between spots, worms, mazes and stripes, in all four coats; drag, click, right-drag and two-finger wash with synthetic pointer events; healing; S, C and 1 to 4; Float, Half and Byte targets; the sound graph (muted by default, live after the toggle). The real page loaded with a clean console; the corners showed no overlap at 1280 x 800, 375 x 812 (touch) and 812 x 375. Not seen: the live rAF loop on screen, and the sound by ear.

## Known issues

- A probe fence does not signal while the pane is hidden. The sim then winds down on time alone, which still stops it.
- Coats walked back toward spots keep some stripes when the wind-down stops them: a mixed coat, by design for now.

## Legacy build

None.

## History

| | |
|---|---|
| Epic | `stimming-46qv` (feature) |
| Plans | None; the walk was tuned with a CPU model of the same equations |
| Version | None |
