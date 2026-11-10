# Ice tray (`ice`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A tray of ice cubes lies on a dark, wet table under one cool light. Twist the tray and it creaks, cracks race through the cubes as white flashes, and the cubes jump loose one by one. Flick them across the table, where they spin and throw rippling caustics. Dump the tray, then refill it and watch the water freeze from the edges in.

**Architecture:** three.js 0.170. The tray is one grid mesh twisted about its long axis in the vertex shader. Cubes ride the twist until their bond breaks, then become hand-rolled rigid bodies: box corners against the table, spheres against each other. Ice is a MeshPhysicalMaterial with transmission, extended through `onBeforeCompile` for the cloudy core, bubbles and crack planes. Bloom and grade come from K2; the wet table mirror copies Spark wheel's floor.

**Tech stack:** three.js 0.170 (WebGLRenderer, MeshPhysicalMaterial transmission, RoomEnvironment, EffectComposer, UnrealBloomPass, OutputPass); raw Web Audio on `audioKit()`.

**Spec:** idea 64 in [toy-ideas.md](../toy-ideas.md); rank 6 in [fidgets.md](fidgets.md), picked by Tom on 2026-11-10 in place of Rain stick; batch rules in [README.md](README.md); Bar v2 in [bar-v2.md](bar-v2.md).

| | |
|---|---|
| Size, estimate | M to L · $30 to $50 |
| Kits | K2 bloom and grade, and the mirrored wet floor, copied from `spark/index.html`. No new kit. |
| Before the build | nothing |

## The shot

A dark slate table fills the lower two thirds, wet and glossy. One ice tray lies across it at a slight angle, three-quarter on, cells in two rows of six.
One cool key light from the upper back rims the cubes; a faint warm fill from the front keeps the tray's face readable.
The tray is a frosted, translucent polymer in a pale cool tint. The cubes glow at their edges where the key light passes through them.
Nothing else: no freezer, no glass, no hand.

The first frame is a picture: a full tray, frost on the cube tops, two cubes already loose and lying on the table with their caustics beside them.

## Hero moments

1. **The twist.** Drag sideways and the tray twists along its length. It creaks, a crack runs through a cube as a white flash inside it, and the cube jumps out of its cell.
2. **Cloudy core.** Freezer ice is clear at the edges and white in the middle: water freezes from the outside in and pushes its air to the centre. Clear ice, frozen from one side, is glass.
3. **Caustics.** A loose cube throws bright, rippling light onto the table beside it. The pattern turns as the cube spins.
4. **Dump and refill.** Dump flips the tray and the cubes clatter out, each with its own clink. Refill pours water in, and frost creeps from the cell walls to the centre over 3 s.

## Loop

- **Drag sideways on the tray:** twist. The twist follows the drag with a stiff spring, to ±40°. Release: the tray springs back flat, and every loose cube pops up.
- **Drag on a loose cube:** push it; release flicks it with the pointer's speed. It slides, spins and clinks into the others.
- **Tap a loose cube:** a small flick away from the pointer.
- **Tap the tray:** a knock: loose cubes in it jump a little.
- **Dump (D):** the tray flips over its long edge; all cubes fall out.
- **Refill (R):** cubes on the table melt away in 0.6 s, water pours in and freezes.
- **Untouched:** no drift. The loop sleeps when every cube rests.

## Bar (Bar v2)

| Slot | Content |
|---|---|
| Top left | Choice: Ice, `segments`: Cloudy, Clear, Juice (keys 1, 2, 3) |
| Bottom left | Actions: Dump (key `D`), Refill (key `R`) |
| Bottom right | none |
| Bottom centre | Keys: `[DRAG] twist the tray` · `[DRAG CUBE] flick` · `[D] dump` · `[R] refill` |
| Settings | Cubes: 12, 16, 24 (choice) · Table: Wet, Dry (choice) · Quality (shared) |
| Settings footer | Reset: a full, fresh tray with the first-frame layout |

Three visible controls.

| Ice | Look | True detail |
|---|---|---|
| Cloudy | clear rim, white core, a few long bubble trails | freezer ice pushes air to the centre |
| Clear | glass; strong refraction of the light behind | ice frozen from one side leaves its air below |
| Juice | amber-red, clear rim, darker core | dissolved sugar and colour also gather in the last water to freeze |

### At 375 px

- The tray turns to run top to bottom, three cells by four (12 cubes), and fills 70 % of the height.
- A horizontal drag still twists it. Touch targets are 34 px.
- The choice moves bottom left as a stepper; the actions move bottom right.

## Physics

| Item | Rule |
|---|---|
| Twist | θ(u) = T · (u − 0.5) along the tray's length u in 0 to 1. T follows the pointer through a spring (ω 18 rad/s, ζ 0.7). |
| Bond | each cube holds a bond of 1 ± 0.3. Strain at its cell is \|T\| · (1 + edge bonus), where cells near the ends strain more. Strain past the bond for 80 ms breaks it. |
| Crack | a break plays the crack, flashes one crack plane inside the cube for 250 ms, and leaves it as a faint white sheet. |
| Pop | when the twist eases to 70 % of its peak, the cell wall throws the cube up (5 to 7) and out over the nearest long side (3 to 4.5), with a random spin. Strain also tires the bond, so a held or repeated twist frees a stubborn cube. |
| Rigid body | position, velocity, orientation (quaternion), angular velocity. Fixed step 1/120 s. Units are cube edges; gravity is 28 per second squared, slowed from true scale so a fall reads. |
| Table | the eight corners against y = 0: impulse with restitution 0.25 and friction 0.35, so cubes skid, tip and settle on a face. |
| Cubes | sphere against sphere (radius 0.55 edges), restitution 0.4. Impact speed drives the clink. |
| Tray | while in the tray, a cube follows its cell. A loose cube that lands back in a cell stays loose. |
| Sleep | a cube sleeps after 0.5 s under 0.01 units per second; the loop sleeps when all do. |

## Tech

**Tray.** One `PlaneGeometry`-based grid, extruded into cells with walls. The vertex shader applies the twist about the long axis. Frosted translucent polymer: MeshPhysicalMaterial with transmission 0.6, roughness 0.55, a pale cool tint.

**Ice.** One instanced box geometry with bevelled edges (12 to 24 instances), MeshPhysicalMaterial: transmission 1, ior 1.31, thickness 1, roughness 0.04, attenuation colour by Ice. `onBeforeCompile` adds:

1. The core: whiteness from the distance to the cube centre in local space, shaped by noise (Cloudy, Juice).
2. Bubbles: a few long thin trails toward the centre, from a hashed per-instance seed.
3. Frost: a white, rough skin on the top face that fades in the first seconds out of the tray.
4. Crack planes: up to three per cube from per-instance attributes (normal, offset, age), drawn as bright thin sheets where the fragment's local position meets the plane.

**Caustics.** One additive decal per loose cube on the table: a noise-warped ring pattern stretched along the light direction, rotated with the cube's yaw, brighter for Clear.

**Table.** Dark slate with fine grain. Wet copies Spark wheel's mirror: a mirrored copy of the cubes and tray under a glossy, translucent floor.

**Post.** K2 bloom at a high threshold, so only the rims and crack flashes bloom; grade with grain and a vignette.

## Sound

- **Creak:** band-passed noise with a slow pitch wander, its level following the twist rate.
- **Crack:** a sharp broadband snap (2 ms) and a high ping (3 to 6 kHz, 80 ms), as stressed ice rings when it fractures.
- **Pop:** a soft hollow tock as a cube leaves its cell.
- **Clink:** ice on ice: two inharmonic partials near 2 to 4 kHz, pitch by cube size, level by impact speed.
- **Table:** a dull knock on landing, a short slide hiss while skidding.
- **Refill:** a running-water bed for 0.8 s, then a sparse tinkle as the frost creeps in.
- Pan by screen x, jitter on every event, rate caps per kind. Muted by default.

## Finesse

- Cells near the ends of the tray break first, because they twist most.
- A crack stays in the cube as a faint white sheet that catches the light.
- Cloudy cubes glow white at the core when the key light passes through them.
- Caustics turn with the cube; a cube on its edge throws a long streak.
- Frost on a fresh cube fades as it sits on the table.

## Reduced motion and idle

- **Reduced motion:** no tumbling: loose cubes slide flat and stop fast; no crack flash, only the faint sheet; Dump and Refill cut without the flip and pour.
- **Idle:** lively while the tray moves or a cube moves. Asleep otherwise. No drift.

## Review focus

1. **Tunnelling:** a fast flick never sends a cube through the table or another cube. Cap speed at 20 units per second.
2. **Pointer pick:** a drag that starts on a loose cube flicks it; anywhere else on the tray, it twists.
3. **Stacking:** spheres between cubes let them rest in a pile without jitter; sleeping cubes wake only on contact.
4. **Transmission cost:** one transmission pass per frame; on the lower rung, transmission resolution halves and the mirror turns off.
5. **Refill during a slide:** cubes still moving melt away cleanly; no slot leaks.

## Tasks

### Task 1: Blockout (checkpoint)

**Files:** Create `ice/index.html`, the `toys.json` entry and the menu Lab entry with a low-fi icon and its `toys.ice` hook. Commit shared files with `--hunks` only.

**Produces:** the tray mesh and its twist, the cube instances riding it, the table, the lights, the first-frame layout.

- [ ] Tray, cubes, table, light. A sideways drag twists the tray and the cubes ride it. No release yet.
- [ ] Bar v2 spec with Ice, Dump, Refill and the Settings rows wired as stubs.
- [ ] Q1, Q2 and stills at 1280 and 375 px. Checkpoint with Tom.
- [ ] Commit: `Ice tray: blockout, a tray that twists`.

### Task 2: Release and physics (checkpoint)

- [ ] Bonds, cracks, pops, rigid bodies on the table, flick, Dump, Refill, sleep.
- [ ] Tom tries the feel. Q4.
- [ ] Commit: `Ice tray: twist, crack and pop`.

### Task 3: Ice

- [ ] Three ices, core, bubbles, frost, crack planes, caustics, wet mirror.
- [ ] Stills of each ice. Checkpoint with Tom.
- [ ] Commit: `Ice tray: cloudy, clear and juice ice`.

### Task 4: Sound

- [ ] Creak, crack, pop, clink, knock, slide, refill. Q9.
- [ ] Commit: `Ice tray: creaks, cracks and clinks`.

### Task 5: Finish and QA

- [ ] Cubes, Table and persistence. The performance ladder: pixel ratio 1, then transmission size and no mirror, then 12 cubes.
- [ ] Q1 to Q10. Tick the bean and record the cost. Commit.

## Kit handoff

None. The box-on-plane rigid body, marked as a section, suits Domino-style or dice toys later.
