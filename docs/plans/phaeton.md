# Phaeton (`phaeton`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A rail gun on a salt flat at dusk. Hold to charge, release to fire. The slug goes through a row of mixed targets in bullet time, then everything bursts at once in real time.

**Architecture:** three.js 0.170 on one perspective camera. A sim clock with a time scale runs the shot, so bullet time is one number. Targets are small meshes; shards and chunks are instanced meshes; spray and dust are points.

**Tech stack:** three.js 0.170 (WebGLRenderer, InstancedMesh, Points), Tone.js through `kit.tone()`, simplex-noise for the salt crust.

**Direction:** Tom, 2026-11-10: "Through everything", a mixed row that refills, charge sets power, salt flat at dusk. Tom named it Phaeton. Bean `stimming-xh8y`. The Lab toy Railgun (`railgun/`) is a different toy.

| | |
|---|---|
| Tier | 4, three.js: a moving perspective camera through several lit objects |
| Size, estimate | M · $20 to $35 |
| Kits | Burst particles (K6) from `fireworks/index.html` for sparks, in Task 3 |

## The shot

A low camera behind the breech, a little to the right, looks down the rails.
A white salt flat with a cracked hexagon crust runs to a flat horizon. The sky is low orange under deep blue. The sun is just down, so shadows are long and soft.
Two long copper rails sit on a dark armature. A capacitor box sits at the breech.
Six targets stand on thin stands down the lane, 8 to 48 m out. A steel backstop closes the lane at 60 m.

## Hero moments

1. **The charge.** The rails warm from copper to orange. Blue arcs crawl between them. The whine climbs.
2. **The flash.** On release, a plasma flash at the muzzle lights the salt and the targets for a few frames.
3. **The ride.** Time drops to about 1/40. The camera rides beside the slug through each target it reaches. Each target cracks, bulges and starts to burst, in slow motion.
4. **The snap.** Time snaps back. Everything bursts at once. A shock cone kicks up salt dust along the lane. The boom rolls out over the flat.

## Loop

- **Hold (pointer anywhere or Space):** charge 0 to 100 % in 2.5 s.
- **Release:** fire. A tap under 0.15 s fires nothing.
- **Power:** the slug carries energy `E = charge`. Each target takes its resistance from E. At E ≤ 0 the slug stops in that target.
- **Ride length:** from the muzzle to the stop point, so a bigger shot gets a longer ride.
- **Refill:** 4 s after the snap, a new mix of six drops onto the stands.
- **Untouched:** the scene holds still; the loop sleeps.

| Target | Resistance | Hit |
|---|---|---|
| Glass pane | 0.05 | A star crack, then sharp shards that catch the sky |
| Ice block | 0.12 | A white crush cone, then clear chunks and frost dust |
| Water tank | 0.15 | A clear tank bulges, splits, and throws a sheet of spray |
| Melon | 0.08 | Bursts outward in red pulp and green rind |
| Concrete block | 0.25 | A grey puff and heavy chunks that fall short |
| Steel plate | 0.30 | Petals open round a glowing hole; sparks spray on the far side |
| Backstop | stops all | A deep dent that glows and cools |

## Bar (Bar v2)

| Slot | Content |
|---|---|
| Top left | none |
| Bottom left | Fire (held, key `Space`), Shuffle (die icon, key `S`) |
| Bottom right | Slow-mo: the bullet-time scale |
| Bottom centre | Keys: `[HOLD] charge` · `[RELEASE] fire` |
| Settings | Camera: Ride, Fixed · Dust (toggle) · Quality (shared) |
| Settings footer | Reset: a fresh row and an unmarked backstop |

## Sound

- **Charge:** a 50 Hz capacitor hum, a rising whine, arc crackle.
- **Fire:** a supersonic crack and a deep thump, then a late echo off the flat.
- **Hits:** one per material: tinkle, crunch, slap, splat, thud, clang. In bullet time they play pitched down.
- Muted by default.

## Reduced motion and idle

- **Reduced motion:** no ride; the camera stays fixed. No flash. Half the debris.
- **Idle:** the loop sleeps when the charge is zero and no debris moves.

## Tasks

### Task 1: Blockout (checkpoint)

- [ ] `phaeton/index.html`: salt flat, sky, rails, six box targets, backstop.
- [ ] Hold to charge (rail glow), release to fire. The slug flies; boxes pop in bullet time and snap. Refill.
- [ ] Bar v2 spec with Fire, Shuffle, Slow-mo and the Settings rows.
- [ ] `toys.json` entry and Lab menu entry. Stills at 1280 and 375 px. Checkpoint with Tom.

### Task 2: Targets

- [ ] Real meshes and a hit for each material: shards, chunks, spray, pulp, petals.

### Task 3: Light and sparks

- [ ] Arcs, muzzle flash light, steel sparks (K6), shock cone and salt dust.

### Task 4: Sound

- [ ] Charge, fire, hits and echo through `kit.tone()`.

### Task 5: Finish and QA

- [ ] Phones, reduced motion, idle sleep, fps ladder. Tick the bean.
