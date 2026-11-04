# Pull chain (`chain`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A row of ball-chain pull switches hangs in front of a dark wall. Each pull clicks a lamp on or off with a chime, and the swinging chains throw moving shadows through the lamplight.

**Architecture:** 2D Verlet chains (K4, from Balloon letters' `stepRope()`) in the wall's plane, rendered in three.js 0.170 with real spotlights and soft shadow maps. Each chain hangs from a sprung switch that toggles its lamp past a pull threshold.

**Tech stack:** three.js 0.170 (WebGLRenderer with PCFShadowMap, RoomEnvironment, EffectComposer, UnrealBloomPass, OutputPass), Tone.js through `kit.tone()`.

**Spec:** shortlist 63 in [toy-ideas.md](../toy-ideas.md); rank 14 in [toy-plan.md](../toy-plan.md); batch rules in [README.md](README.md).

| | |
|---|---|
| Size, estimate | S to M · $12 to $25 |
| Kits | Builds K4 rope from `balloons/index.html` (`makeRope()`, `stepRope()`) |
| Before the build | nothing |

## The shot

A dark, warm-grey wall fills the frame. Seven ball chains hang from above the frame at different lengths, each ending in a small brass pull.
In the first frame two lamps are on: two soft pools of light on the wall, each holding the soft shadows of the chains in front of it.

## Hero moments

1. **Shadow play.** A flung chain swings, and its shadow sweeps across the wall in every lit pool at once, each at its own angle.
2. **The filament warm-up.** A lamp comes on over 120 ms, from deep orange to warm white, with a slight overshoot. Off, it glows down over 300 ms. Real filaments have thermal lag.
3. **Colour pools.** In Colour mode, each lamp has a hue, and overlapping pools mix as light does.
4. **The cascade.** Clear tugs each chain in turn from left to right, with a falling arpeggio; Shuffle sets all of them dancing.

## Loop

- Drag a chain down: past the threshold the switch clicks and the lamp toggles. Release: the spring pulls the chain up with a second, softer click.
- Fling sideways: the chain swings, clacks into its neighbours and coils as it settles.
- Tap a chain: a quick tug, the same as a short pull. A tap on the bare wall tugs the nearest chain.
- Lit lamps form a chord: each pull plays its chain's note.

## Bar

| Control | Content |
|---|---|
| Chips | Filament, Daylight, Colour |
| Slider | none |
| Actions | Shuffle, Clear |
| Settings | Chains: 5, 7, 9 · Scale: Pentatonic, Major, Minor · Quality: Low, High |
| How | Drag: pull or swing · Click/Tap: tug · 1 to 9: a chain (mouse devices only) · Space: shuffle (mouse devices only) |

| Lamps | On | Off | Colour |
|---|---|---|---|
| Filament | 120 ms rise with overshoot, orange to warm white | 300 ms afterglow | 1800 K to 2700 K: 0.7 0.14 55 to 0.92 0.06 75 |
| Daylight | instant, one 40 ms flicker | instant | 4000 K: 0.96 0.02 95 |
| Colour | 200 ms | 200 ms | a seven-hue wheel at L 0.75, C 0.16 |

## Tech

**Physics (K4).** Lift `makeRope()` and `stepRope()` from Balloon letters into a marked `K4` section, then change:

| Item | Balloon letters | Pull chain |
|---|---|---|
| Step | `stepRope(r, h)`, h = 1/120 | the same, fixed 1/120 with an accumulator |
| Links | 3 distance iterations | 12 iterations: ball chain does not stretch |
| Bending | none | a one-sided constraint between beads i and i + 2. It only pushes apart, so the chain has a minimum bend radius, as real ball chain does. |
| Head | pinned to a balloon | pinned to a sprung switch anchor |
| Damping | 0.991 | 0.996: metal swings longer |
| Tail | a plain end | the pull: one point with four times the mass |

- **Beads:** 40 to 60 per chain, at 0.012 units apart.
- **Collisions:** bead against bead across chains through a uniform grid (cell = 2 bead radii), and beads against the wall plane. Restitution is low. Impact speed feeds the clatter sound.
- **Switch:** each anchor slides on y with a spring. It travels 25 mm at most.
  - Past 18 mm the switch toggles once and plays the click. It re-arms when the anchor returns above 9 mm.
  - Release: the spring returns the anchor, and the soft click plays.
- **Grab:** the nearest bead or pull within 24 px. It follows the pointer through a stiff spring. Release keeps the pointer's velocity.
- **Settle:** the loop sleeps when every bead moves less than 0.00004 per step for 1 s, the same test Balloon letters uses.

**Render.**

- **Camera:** perspective, narrow lens, square to the wall. Chains sit 0.3 units in front of the wall, so shadows fall clear of them.
- **Beads:** an InstancedMesh of spheres in MeshStandardMaterial, metalness 1, roughness 0.25. RoomEnvironment through PMREM at intensity 0.15 gives faint reflections even with all lamps off.
- **Pulls:** an InstancedMesh of small cylinders in brass (0.75 0.09 85).
- **Links:** an InstancedMesh of thin cylinders between beads. They show only on High.
- **Lamps:** one SpotLight per chain, above the frame, aimed at the wall below. Shadow maps are 1024 on High and 512 on Low, with `shadow.radius` near 4. Use `PCFShadowMap`: `PCFSoftShadowMap` ignores the radius. PCF blurs evenly; the chains hang parallel to the wall, so even softness reads true.
- **Wall:** a plane with a faint plaster noise. It receives shadows.
- **Post:** bloom at a high threshold, so only lit beads' highlights bloom. A grade adds grain and a vignette.

## Sound

- **Switch click:** two layers. A 1 ms tick at 4 kHz, then a 15 ms body through an 0.9 kHz bandpass. The return click is a softer copy at 70 % level.
- **Chime:** each chain owns one note of the scale (Settings). FMSynth with a bell-like ratio and a 3.5 s release. Rising on, falling a fourth on off.
- **Filament tink:** a tiny high tick on a filament's turn-on, from thermal shock.
- **Clatter:** very short clicks for bead impacts. Level follows impact speed, with at most 30 per second.
- Every sound pans by chain x.

## Finesse

- Each lamp sits over its own chain, so one swing throws shadows at a different angle in every lit pool.
- Lit beads carry a highlight from each lit lamp, so they glitter with more lamps on.
- A chain released high comes up with a small bounce at the switch.
- Pulls swing a little longer than the chain above them, because of their mass.
- The 1 to 9 keys tug, so a keyboard can play the chord.

## Reduced motion and idle

- **Reduced motion:** damping 0.98, so swings die fast. Shuffle and Clear toggle the lamps without the tug animations.
- **Idle:** no drift. The loop sleeps when the chains settle. Lamps stay on in a still frame.

## Review focus

1. **Grabbing a chain and dragging it off the stage:** capture holds, and release on `lostpointercapture` keeps the chain whole.
2. **A pull past the travel limit:** the anchor stops at 25 mm, and the chain takes the rest. No link stretches.
3. **Rapid tugs on one chain:** the switch re-arms only above 9 mm, so it never double-toggles.
4. **Nine chains at 375 px:** spacing shrinks. Grab radius stays 24 px, and the nearest chain wins.
5. **Shadow cost with nine lamps on:** on Low, five shadow maps at most; extra lamps light without shadows.

## Tasks

### Task 1: Chains and light (K4 lift)

**Files:** Create `chain/index.html` and the bean.

**Produces:** marked `K4` with `makeChain(x, len)`, `stepChain(c, h)`, `switchOf(c)`; `lamps` (array of `{ light, on, level, hue }`); `setLamp(i, on)`.

- [ ] Lift and change K4 as in the table. Build beads, pulls, wall, spotlights and shadows.
- [ ] Two lamps on in the first frame.
- [ ] Q1, Q2 and stills in all three modes at 1280 and 375 px. Checkpoint with Tom.
- [ ] Commit: `Pull chain: ball chains in lamplight, K4 lifted`.

### Task 2: Pulling

- [ ] Grab, switch travel and toggle, return spring, collisions, settle test.
- [ ] Lamp ramps per mode: warm-up, afterglow and flicker.
- [ ] Q4: the loop sleeps after the chains settle.
- [ ] Commit: `Pull chain: pull, fling and switch`.

### Task 3: Cascade and dance

- [ ] Clear's left-to-right cascade, Shuffle's dance, the 1 to 9 keys.
- [ ] A screenshot mid-swing with three pools lit. Checkpoint with Tom.
- [ ] Commit: `Pull chain: cascade and shuffle`.

### Task 4: Sound

- [ ] Click, chime, tink and clatter. Q9.
- [ ] Commit: `Pull chain: switch clicks, lamp chimes, clatter`.

### Task 5: Bar, menu and QA

- [ ] Bar, Settings and persistence. `toys.json`, and the menu Lab entry with its hook.
- [ ] Q1 to Q10. Tick the bean and record the cost. Commit.

## Kit handoff

K4, marked, with the 12 iterations, the one-sided bend constraint and the sprung anchor as options of `makeChain()`. Washing line copies K4 from here and adds cloth.
