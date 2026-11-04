# Dry ice fog (`dryice`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Drop dry ice into a basin of warm water. Fog boils up, pours over the rim like a slow waterfall, spreads across the table and falls off its edge, through one beam of light.

**Architecture:** K3 copied from Ink in water, with heavy fog and analytic solid walls (basin and table). Rendering uses Ink's dark-field scattering, with one to two spotlights and shadow marches. The basin, water and pellets are small meshes.

**Tech stack:** three.js 0.186.1 WebGPU and TSL, the build Fire uses; Tone.js through `kit.tone()`.

**Spec:** shortlist 47 in [toy-ideas.md](../toy-ideas.md); rank 13 in [toy-plan.md](../toy-plan.md); batch rules in [README.md](README.md).

| | |
|---|---|
| Size, estimate | M · $20 to $30 |
| Kits | Uses K3 from `ink/index.html` |
| Before the build | D3, and Ink in water built first |

## The shot

Near black. A low, wide basin of dark steel sits on a dark table that ends at the right third of the frame; beyond the edge is open dark.
One cold spotlight from the upper left rakes the scene. The water in the basin is a dim mirror.
The first frame shows one pellet already fizzing and a thin fog sheet spilling over the rim.

## Hero moments

1. **The spill.** Fog rises, turns, pours over the rim in slow folds, and runs across the table. At the edge it falls in a curtain.
2. **Torch.** In Torch mode your pointer is a flashlight from the viewer's side. Its cone cuts a solid-looking beam through the fog.
3. **Stage.** Cyan from the left, magenta from the right: the fog takes both, and they mix where the beams cross.
4. **The squeal.** Put a pellet on the steel rim and it screams, as dry ice really does on metal.

## Loop

- Tap the water: a pellet drops in. Tap the rim: a pellet sits on the rim and squeals. Tap the table or the air: a puff wafts the fog there.
- Pellets sublimate over about 40 s at the default warmth, shrinking and skittering on the water as gas jets push them.
- Warmth: hotter water makes violent bubbling and thick fog; cool water gives a thin creep.
- Blow: a gust from the left clears the table.
- Drag: waft the fog by hand.
- Torch mode: a mouse aims the torch by hovering. On touch, a drag aims it instead of wafting.

## Bar

| Control | Content |
|---|---|
| Chips | Lab, Stage, Torch |
| Slider | Warmth |
| Actions | + Ice, Blow |
| Settings | Table: Edge, Wide · Quality: Low, Medium, Standard, High (shared, plus Fire's lower tiers) |
| How | Click/Tap: drop ice · Drag: waft · Space: ice (mouse devices only) |

## Tech

**K3 from Ink.**

| Item | Ink | Dry ice fog |
|---|---|---|
| Grid, x × y × z | 96 × 160 × 48 | High 128 × 48 × 80 · Medium 96 × 36 × 60 · Low 64 × 24 × 40 |
| Dye | rgb absorption + mass | r = fog density, g = lift, b and a spare |
| Buoyancy | `−g · weight · mass` | `−g · 0.8 · fog + g · 1.6 · lift`, so fog billows up first, then sinks |
| Dissipation | none | fog τ 14 s; lift τ 0.6 s |
| Walls | the box | the box plus `solid(p)` |

**Solids, analytic.** `solid(p)` in the kernels:

- **Basin:** a ring wall between radius 0.36 and 0.4, below rim height, with a floor.
- **Table:** a slab below `tableY` for x < `edgeX`. With Table set to Wide, `edgeX` sits past the grid, so there is no edge.
- Below the table, past the edge, the grid runs 18 cells deeper. Fog has somewhere to fall.

Solid handling, in Ink's passes:

1. Advect: a back-trace into a solid clamps to the nearest fluid cell.
2. Divergence and Jacobi: a solid neighbour returns the centre pressure (Neumann).
3. After projection, velocity in solids is set to zero.

**Emission.** Each pellet (up to 12) emits at the water surface. The rate is `warmth * mass^(2/3)`, since sublimation follows surface area.
It adds fog and lift with an upward jet, broken into random sub-jets that look like bubbles bursting.

**Render (Ink's dark field).**

| Mode | Lights |
|---|---|
| Lab | One cold white spot (0.95 0.02 240) from the upper left, plus a faint fill |
| Stage | Two spots: cyan (0.8 0.13 200) from the left, magenta (0.7 0.2 340) from the right |
| Torch | One spot at the camera, aimed through the pointer; a 14° cone with a soft edge |

- Each light takes a 6-step shadow march.
- The background stays black, so beams show only where fog is.

**Meshes.**

- Basin: a lathe in dark brushed steel. Table: a slab with a faint top highlight.
- Water: a disc with a dark glossy shader. Its normals churn with noise scaled by the emission nearby.
- Pellets: small rounded boxes that jitter and drift as they shrink.

## Sound

- **Bubbling:** a granular gurgle. Short filtered noise bursts at random pitches; the rate follows total emission.
- **Squeal:** a pellet on the rim. A sine at 2.5 to 4 kHz with jitter and a rough AM, for 0.6 s, repeating while it sits there.
- **Pour:** a soft hiss whose level follows fog crossing the table edge. Estimate it from emitted fog over the last 3 s.
- **Blow:** a breath.

## Finesse

- Fog first leaps up off the water, then turns and falls. The lift term makes this.
- The curtain off the table edge thins as it falls and evaporates.
- Pellets skitter: their jets push them around on the water.
- The water surface lights up under the beam only where it churns.
- Torch mode shows the fog's inner structure, which the static light flattens.

## Reduced motion and idle

- **Reduced motion:** emission is half, bubbling is calm, and the torch beam follows the pointer with lag instead of instantly.
- **Idle:** the sim runs while pellets last or fog moves. It runs at 30 Hz after 12 s without input. With no pellets and no fog left, the loop sleeps. It also sleeps 60 s after the last input; the last frame holds.

## Review focus

1. **Fog leaking through walls:** a stress test with 12 pellets at full warmth. No fog crosses the basin wall below the rim.
2. **The 13th pellet:** the oldest pellet finishes at once. The cap holds.
3. **Torch on touch:** there is no hover, so a drag aims the torch and does not waft. The beam stays where the finger lifts. A tap on water or rim still drops ice.
4. **No WebGPU:** Fire's notice.
5. **A Quality change mid-spill:** fog resamples into the new grid; the scene does not reset.

## Tasks

### Task 1: The basin and the solids

**Files:** Create `dryice/index.html` and the bean.

**Produces:** marked `K3` from Ink; `solid(p)`; `pellets` (array of `{ x, z, mass, onRim }`); `addIce(x, z)`.

- [ ] Lift K3 from Ink. Add `solid()` and the three pass changes. Build the meshes. One pellet emits.
- [ ] Q1, Q2 and stills in Lab at 1280 and 375 px. Checkpoint with Tom.
- [ ] Commit: `Dry ice fog: basin, table and fog that pours`.

### Task 2: Warmth, pellets and the spill

- [ ] Rates, lift, the table edge, skittering pellets, Blow and waft.
- [ ] The leak test from Review focus 1. Screenshots of the curtain off the edge.
- [ ] Commit: `Dry ice fog: warm water, skittering pellets, the curtain`.

### Task 3: Lights

- [ ] Stage and Torch, the shadow marches and Torch aiming.
- [ ] Screenshots of all three modes. Checkpoint with Tom.
- [ ] Commit: `Dry ice fog: stage gels and a torch`.

### Task 4: Sound

- [ ] Gurgle, squeal, pour and breath. Q9.
- [ ] Commit: `Dry ice fog: gurgle, squeal and pour`.

### Task 5: Bar, menu and QA

- [ ] Bar, Settings and persistence. `toys.json`, and the menu Lab entry with its hook.
- [ ] Q1 to Q10, plus Q2 without WebGPU. Tick the bean and record the cost. Commit.

## Kit handoff

`solid(p)` support joins K3. Any later volume toy with walls (Elephant foam 87, Stir vortex 85) copies K3 from here.
