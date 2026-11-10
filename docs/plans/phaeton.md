# Phaeton (`phaeton`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A rail gun diorama, seen from the side. You load it by hand: the rack, the crane, the breech lever. Hold to charge, release to fire. The slug goes sideways through a row of mixed targets in bullet time, then everything bursts at once in real time.

**Architecture:** three.js 0.170 on one perspective camera with a long lens. A sim clock with a time scale runs the shot, so bullet time is one number. GSAP timelines run the loading machines. Targets are small meshes; debris is instanced meshes; steam, dust and spray are soft points.

**Tech stack:** three.js 0.170 (WebGLRenderer, InstancedMesh, Points, MeshPhysicalMaterial, RoundedBoxGeometry), GSAP 3.13, Tone.js through `kit.tone()`.

**Direction:** Tom, 2026-11-10: "Through everything", a mixed row that refills, charge sets power. Then: a high-quality side diorama, a fictional loading process with diegetic parts, firing sideways onto the objects; other modes later. Hands-on loading steps; a stage on a plinth. Tom named it Phaeton. Bean `stimming-xh8y`. The Lab toy Railgun (`railgun/`) is a different toy.

| | |
|---|---|
| Tier | 4, three.js: a lit diorama with moving machines and a tracking camera |
| Size, estimate | M to L · $30 to $50 |
| Kits | Burst particles (K6) from `fireworks/index.html` for sparks, in Task 4 |

## Art direction (Tom, 2026-11-10)

Zany, 1950s atomic age, dieselpunk. An original proving ground, no names or symbols from any game.

| Element | Look |
|---|---|
| Palette | Cream, seafoam, cherry, mustard, Bakelite brown, chrome, copper; hazard stripes |
| Gun | A streamlined seafoam nacelle with chrome rings, coil portholes, a cherry tail fin, a flared chrome muzzle; twin copper rails outside on standoffs |
| Machines | A diesel generator with a cherry flywheel and an exhaust stack; six glass vacuum tubes; a Bakelite console with a numbered dial and jewel lamps; a gantry with hazard stripes and a horseshoe magnet |
| Props | A PROVING GROUND 7 sign with an atom, a DANGER HIGH VOLTAGE sign |
| Materials | Enamel chips to bare metal on edges and in patches, with dust near the ground; copper turns verdigris in patches; salt crystals glint where they mirror the sun or the key light |
| Lens | Bloom on hot parts only, a tilt-shift blur that sells the miniature, a warm print grade, vignette, grain |
| Light | A low sun with a halo, a warm rim light from the sun side, soft violet contact shadows; the diorama floats over a sunset cloud sea (the camera looks down, so the backdrop is below the horizon) |

## The shot

A slab of salt flat, cut clean like a museum diorama, sits on a dark plinth and floats in a dusk sky. The camera looks at its long side with a long lens, tilted down 15°.
The cut faces show strata: white crust, grey mud, brown clay. The top shows the hexagon crust. A low sun from the front left throws long shadows to the right.
On the left stands the gun: a slug rack, a gantry crane, a breech with a sliding block and a red-knobbed lever, a barrel with copper rails and ceramic collars on two trestles. Behind it stand six capacitors and a panel with a dial and three lamps.
Six targets stand down the lane on thin stands. A steel backstop closes the lane on the right.

## Loading (diegetic)

| Step | You | The machine |
|---|---|---|
| 1. Load | Click the rack, or L | The crane runs to the rack, the magnet takes the top slug, carries it to the tray and sets it down. The LOAD lamp turns green. |
| 2. Lock | Click the lever, or K | The lever swings, the breech block slides shut over the slug. The LOCK lamp turns green. |
| 3. Charge | Hold anywhere, or Space | The capacitors light one by one, the dial needle climbs, the rails glow, arcs crawl on the barrel. |
| 4. Fire | Release | The slug leaves the muzzle with a flash and goes down the lane. |
| 5. Vent | (by itself) | The block slides open, the lever returns, steam rises from the breech. The gun is empty again. |

- The amber lamp asks for the next step. A step out of order blinks its lamp red.
- The part that takes the next step glows under the pointer.
- The rack holds five slugs; it restocks after the last one.

## The shot and the row

- **Power:** the slug carries energy `E = 0.15 + 1.25 · charge`. Each target takes its resistance from E. At E < resistance the slug stops and knocks that target off its stand.
- **Bullet time:** time drops to the Slow-mo setting (1/8 to 1/100). The track camera runs beside the slug, close in. At the stop point it holds 0.35 s, then time snaps back and the camera pulls out.
- **Debris:** chunks fly down the lane. Those that leave the slab fall off its edge into the dusk.
- **Refill:** 4 s after the snap, a new mix of six drops onto the stands. S shuffles it.

| Target | Resistance | Hit (Task 2) |
|---|---|---|
| Glass pane | 0.05 | Sharp shards that catch the sky; glitter |
| Ice block | 0.12 | Clear chunks and a frost cloud |
| Water tank | 0.15 | The shell splits and throws a sheet of spray; wet stains |
| Melon | 0.08 | Rind chunks, red pulp, splats |
| Concrete block | 0.25 | Heavy chunks and a grey dust puff |
| Steel plate | 0.30 | Petals open round a glowing hole |
| Backstop | stops all | A dent that glows and cools |

## Bar (Bar v2)

| Slot | Content |
|---|---|
| Top left | none (modes come later) |
| Bottom left | Load (L), Lock (K), Fire (held, Space) |
| Bottom right | Slow-mo |
| Bottom centre | Keys: `[CLICK] rack, lever` · `[HOLD] charge` · `[RELEASE] fire` · `[S] shuffle` |
| Settings | Camera: Track, Fixed · Dust (toggle) · Quality (shared) |
| Settings footer | Reset: a fresh row and a clean backstop |

## Sound (Task 5)

- **Machines:** crane motor whine, magnet clunk, breech slide and lock, lever ratchet, steam hiss.
- **Charge:** a 50 Hz hum per capacitor, a rising whine, arc crackle.
- **Fire:** a supersonic crack and a deep thump, then a late echo.
- **Hits:** one per material; pitched down in bullet time.
- Muted by default.

## Reduced motion and idle

- **Reduced motion:** no track camera; no flash; half the debris.
- **Idle:** the loop sleeps when no machine moves, the charge is zero and no debris moves.

## Tasks

### Task 1: Diorama blockout (checkpoint)

- [x] Slab with strata on a plinth, dusk sky, side camera that fits the frame.
- [x] Gun, rack, crane, breech, lever, capacitors, panel, lamps.
- [x] Load, lock, charge, fire, vent; refusals blink red; pointer picks the rack and lever.
- [x] Sideways shot, track camera, box debris that falls off the slab, steam.
- [x] `toys.json` entry and Lab menu entry. Checkpoint with Tom.

### Task 2: Targets

- [x] A hit for each material: shards, chunks, spray, pulp, petals, dust. Stains on the salt.
- [ ] Polish: ice reads grey, not clear; the steel petals face away from the camera.

### Task 3: Modes

- [x] Tom picked Corridor, Aquarium and Depth (2026-11-10). Mode choice top left, keys 1 to 4, kept per viewer.
  - Corridor: twenty glass panes, 0.68 m apart, a shard cascade.
  - Aquarium: one 12 m water tank; water drags 0.09 per metre; bubble trail and shock rings; the tank bursts at the snap.
  - Depth: 26 steel plates, 0.055 each, so no shot goes through; pierced plates glow; the slug stays stuck; a red flag marks the last depth, a yellow flag the best.
  - A mode change during a shot waits for the refill.

### Task 4: Light and sparks

- [x] Muzzle plasma, a shock ring and a smoke ring; streak sparks on steel, plates and the backstop; a salt-dust wake under the slug; heat shimmer along its path; stylised inner-lit ice (transmission showed the orange sky).

### Task 5: Sound

- [ ] Machines, charge, fire, hits and echo through `kit.tone()`.

### Task 6: Finish and QA

- [ ] Phones, reduced motion, idle sleep, fps ladder. Tick the bean.
