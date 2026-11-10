# Calm jar (`calmjar`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** The stage is the inside of a jar of thick, clear liquid full of glitter. Drag to swirl it. Holographic flakes tumble and flash as they turn, then settle slowly, the big ones first and the fine dust last, into layers of colour at the bottom.

**Architecture:** Raw WebGL2. K5 2D fluid from Oil slick gives the swirl. Glitter is a GPU particle system in float textures: each flake has a position, a size, a tilt and a tilt rate. Flakes ride the fluid, sink at their own settling speed and tumble with the local vorticity. A point pass draws each flake as a small glinting sprite; a glow chain blooms the flashes.

**Tech stack:** raw WebGL2 on the `shared/stim.js` helpers; Tone.js through `kit.tone()`. No three.js.

**Spec:** shortlist 27 in [toy-ideas.md](../toy-ideas.md); "Calm jar" in [toy-plan.md](../toy-plan.md); rank 5 in [fidgets.md](fidgets.md); batch rules in [README.md](README.md); Bar v2 in [bar-v2.md](bar-v2.md).

| | |
|---|---|
| Size, estimate | M · $18 to $28 |
| Kits | K5 2D fluid from `oilslick/index.html` (`K5: 2D fluid` to `end K5`) |
| Before the build | F1 in [fidgets.md](fidgets.md) |

## Not Snow globe

Snow globe shows a scene inside a dome, with snow. Calm jar has no dome, no scene and no snow. The subject is the glitter's optics and the slow, size-sorted settle. The stage is the liquid itself, seen from inside the glass.

## The shot

The whole stage is liquid, lit from behind by a soft, deep gradient. The left and right edges carry a faint curve of glass with one bright refracted line each, so the eye reads a jar wall without a jar.
The bottom fifth holds a bed of settled glitter in layers: coarse flakes at the base, finer bands above, a haze of dust on top.

The first frame is a picture: a slow cloud of fine glitter still drifts down through the middle, with a few big flakes flashing as they turn.

## Hero moments

1. **The swirl.** Drag and the liquid turns. Thousands of flakes lift off the bed in a spiral and flash as they tumble.
2. **The flash.** Each flake is a tiny mirror with a thin-film colour. When its tilt catches the light it flares, then goes dark. A swirl of them sparkles.
3. **The settle.** Big flakes fall first, fine dust last. Settling speed grows with the square of size (Stokes), so the bed forms in layers by size, and the top keeps a slow snow of dust for a minute.
4. **Flip.** Turn the jar over: the bed becomes a ceiling and rains down through the liquid in sorted curtains.

## Loop

- **Drag:** swirl. The pointer pushes the fluid along its path.
- **Tap:** a small jolt: a puff of flakes lifts from the bed under the tap.
- **Shake (held, S):** the jar shakes side to side while held. Everything lifts.
- **Flip (F):** the jar turns over in 0.6 s; gravity reverses in the jar's frame.
- **Untouched:** the settle runs out over the Settle time, then the loop sleeps.

## Bar (Bar v2)

| Slot | Content |
|---|---|
| Top left | Choice: Glitter, `segments`: Holo, Gold, Ocean, Ember (keys 1 to 4), each with a colour dot |
| Bottom left | Actions: Shake (held, key `S`), Flip (key `F`) |
| Bottom right | Slider: Thickness (the liquid's viscosity: thin water to thick glycerin) |
| Bottom centre | Keys: `[DRAG] swirl` · `[CLICK] lift` · `[HOLD S] shake` · `[F] flip` |
| Settings | Flakes (slider: count) · Light: Back, Side (choice) · Quality (shared) |
| Settings footer | Reset: the jar settles at once into its first-frame state |

Four visible controls.

| Glitter | Flakes | Thin-film colour |
|---|---|---|
| Holo | hexes in three sizes, silver base | full rainbow shift with tilt |
| Gold | hexes and fine dust, gold base | gold to rose |
| Ocean | hexes and long slivers | teal to violet |
| Ember | hexes and fine dust | copper to red |

### At 375 px

- The stage is portrait; the bed sits in the bottom sixth. Flake count drops by 40 %.
- The choice moves bottom left as a stepper; the actions move bottom right; Thickness moves into Settings.
- Touch targets are 34 px.

## Physics

| Item | Rule |
|---|---|
| Fluid | K5 at 128 × 128 (96 × 96 on the lower rung). Viscosity and damping follow Thickness. |
| Flake drift | velocity = fluid velocity at the flake + settling velocity |
| Settling | v_s = k · size² / viscosity (Stokes). Three size classes plus dust. |
| Tumble | each flake's tilt turns at a rate set by the local vorticity plus a small wobble from its own fall (falling-leaf flutter). |
| Bed | a flake below the bed height rests. The bed height rises as flakes land; a strong flow lifts them again. |
| Flip | rotate gravity in 0.6 s; the bed becomes the ceiling and releases from the top. |
| Settle time | Thickness sets it: about 20 s thin, about 90 s thick. |

## Tech

**K5 lift.** Copy K5 from Oil slick into a marked section, then change: a no-slip wall on all four sides (a jar, not a puddle), viscosity from Thickness, and a body force from Shake.

**Particles.** Two `RGBA32F` textures, 256 × 256 (65 536 slots; Flakes sets how many draw): one holds position and size, one holds tilt, tilt rate and seed. A step pass advects them through the velocity texture.

**Flakes.** One point per flake, sized by its class. The fragment shader draws a hex or a sliver with a thin-film colour from tilt and light direction, and a sharp glint when the tilt meets the mirror angle. Fine dust draws as soft dots with a faint sparkle.

**Light.** Back: a soft gradient behind the liquid; flakes flash against it. Side: a hard key from one side; flashes grow larger and rarer.

**Glass edge.** The composite adds the two curved glass lines and a slight refraction near the side edges.

**Post.** A small glow chain on the glints; grade with grain and a vignette.

## Sound

- **Swirl:** a soft liquid wash, low-passed noise whose level follows the fluid's kinetic energy.
- **Glitter:** a very quiet shimmer of tiny high ticks, its density following the number of flakes in motion. It fades as the jar settles.
- **Shake:** a slosh at each reversal.
- **Flip:** a slow glug as the liquid turns.
- Pan follows the motion's centre. Muted by default.

## Finesse

- The bed forms in visible layers by size.
- Fine dust keeps falling after the big flakes are down: the calm.
- A flake flashes only for the instant its tilt meets the light.
- Thick liquid swirls slowly and settles long; thin liquid swirls fast and clears soon.
- The glass edges refract the flakes that pass them.

## Reduced motion and idle

- **Reduced motion:** no tumble flicker; flakes keep a fixed tilt and glow steadily. The settle runs at triple speed. Flip fades between states.
- **Idle:** drifting at 30 fps while flakes settle; lively during a gesture. It sleeps when every flake rests on the bed, or 60 s after the last input, after a 2 s ease.

## Review focus

1. **Particle cost:** the step and draw passes scale with Flakes. Log frame time at the full count.
2. **The bed:** flakes do not jitter on the bed. A resting flake skips the step until the flow at its cell passes a threshold.
3. **Flip during a swirl:** gravity turns smoothly; flakes never jump.
4. **Wall flow:** the no-slip walls keep flakes off the sides. No flake leaves the stage.
5. **Hidden tab during the settle:** the sim clock stops, so the settle resumes where it was.

## Tasks

### Task 1: Blockout (checkpoint)

**Files:** Create `calmjar/index.html`, the `toys.json` entry and the menu Lab entry with a low-fi icon and its `toys.calmjar` hook. Commit shared files with `--hunks`.

**Produces:** marked `K5` with jar walls, the particle textures and `stepFlakes(h)`, the point pass with flat colour.

- [ ] K5 lift, walls, Thickness. Flakes advect, settle by size and land on the bed. Drag swirls.
- [ ] Bar v2 spec with Glitter, Shake, Flip, Thickness and the Settings rows wired as stubs.
- [ ] Q1, Q2 and stills at 1280 and 375 px: mid-swirl and settled. Checkpoint with Tom.
- [ ] Commit: `Calm jar: blockout, glitter that settles by size`.

### Task 2: Optics

- [ ] Tilt and tumble, thin-film flakes, glints, dust, the two lights, the glass edges, the glow chain.
- [ ] A still of each Glitter mid-swirl. Checkpoint with Tom.
- [ ] Commit: `Calm jar: flakes that flash as they turn`.

### Task 3: Shake, flip and sound

- [ ] Held Shake, Flip, the bed lift. Wash, shimmer, slosh and glug. Q9.
- [ ] Q4: drifting at 32 fps or fewer while settling; asleep after the settle.
- [ ] Commit: `Calm jar: shake, flip and sound`.

### Task 4: Finish and QA

- [ ] Flakes, Light and persistence. The performance ladder: pixel ratio 1, then the glow chain, then the flake count, then the fluid grid.
- [ ] Q1 to Q10 in the browser pane. Tick the bean and record the cost. Commit.

## Kit handoff

K5 gains no-slip walls and a body force; GPU particles that ride K5 are new and marked. Lotus leaf or Marbling may copy them.
