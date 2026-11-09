# Smoke ring cannon (`vortex`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Vortex rings of smoke fly through dark haze. A laser light sheet cuts a bright plane through the haze, and each ring flares as it crosses it.

**Architecture:** raw WebGL2. The rings are vortex filaments on the CPU (Biot-Savart). Smoke is a GPU particle system that the same filaments advect. A full-screen pass draws the haze and the laser sheet; a small bloom and a grade finish the frame.

**Tech stack:** raw WebGL2 (RGBA32F particle state, RGBA16F scene and bloom), plain Web Audio voices on `audioKit()`. Bar v2 through `initPage({ bar })`.

**Spec:** the science-fair batch of 2026-11-09 (with Lichtenberg burn, Rubens tube, Flame test, Bismuth crystals); batch rules in [README.md](README.md).

| | |
|---|---|
| Size, estimate | M · $20 to $30 |
| Kits | none. The filament solver is new; mark it `K7: vortex filaments` for later toys. |
| Before the build | nothing |

## Approach: vortex filaments, not a fluid grid

Each ring is a closed filament of 32 nodes with a circulation Γ and a core radius a. Every node moves with the regularized Biot-Savart velocity of all filaments:
`u(x) = Σ Γ/(4π) · (dl × r) / (|r|² + a²)^{3/2}`.
Smoke particles move with the same sum, on the GPU.

Why filaments:

1. **The hero moments come free.** Leapfrogging, head-on swelling, self-propulsion and the slow-down all fall out of one formula. A grid must resolve thin cores to show any of them.
2. **Cheap and exact at any scale.** Eight rings are 256 nodes: 65 k kernel calls a step on the CPU, under 1 ms. A 3D grid that holds a ring core costs 128³ cells and many passes; a 2D slice cannot leapfrog off-axis rings or aim in 3D.
3. **The smoke still looks like smoke.** Particles seeded in the core wind round it into a spiral, and particles outside the ring's bubble fall behind as a wake. Curl noise that grows with age breaks old rings into tendrils.

The cost: no reconnection, so a head-on pair cannot split into ringlets. The toy fakes that end: when two cores pass within 2a, both rings shed their smoke into tendrils and die.

## The shot

A dark room you never see, full of thin haze. A cool backlight rakes it from the upper left, so smoke reads as silver against near black.
A laser sheet fans down from a lens above the frame. It shows as a thin wedge of coloured light in the haze, with fine speckle.
Rings leave a muzzle just inside the left edge and fly right, a little toward you. You see each ring as an ellipse, three-quarter on.

## Hero moments

1. **The flare.** A ring crosses the sheet; a bright ellipse of laser light runs through its core from front to back, then goes out.
2. **Leapfrog.** Pair fires two rings on one axis. The rear ring shrinks, speeds up and passes through the front ring, which swells and slows. They swap two or three times.
3. **Head-on.** Collide fires a ring from each side. They swell into wide thin hoops, slow almost to a stop, then shatter into tendrils.
4. **Breakup.** An old ring grows six to eight lobes, then sheds curling tendrils that hang in the sheet and glow.
5. **Charge.** A hold swells the haze at the muzzle; release fires a fat, fast ring with a deep thup.

## Loop

- Tap: fire a ring from the muzzle toward the point you tap.
- Drag: aim. A faint ghost ring at the muzzle turns to the pointer. Release fires.
- Hold: charge. Charge sets the ring's radius and circulation.
- Untouched, the haze drifts and the speckle shimmers a little.

## Bar

| Slot | Control | Content |
|---|---|---|
| Top left | Choice `Sheet` (segments) | Across, Along, Scan |
| Bottom right | Slider | Haze: how thick the room is |
| Bottom left | Actions | Pair, Collide, Clear |
| Bottom centre | Keys | `[CLICK] fire` · `[DRAG] aim` · `[HOLD] charge` · `[SPACE] pair` |
| Settings | Rows | Laser: Green, Red, Blue · Smoke: Light, Dense · Breakup (slider, Calm to Wild) · Reset (footer) · Quality (shared) |

| Sheet | Plane | What it shows |
|---|---|---|
| Across | Normal along the launch axis, at 60 % of the frame | Rings cross it face first; the whole core flares |
| Along | Contains the launch axis, faces the camera at 30° | A meridional cut: two spiral eyes ride along with each ring |
| Scan | Across, sweeping slowly back and forth | Slices through all rings in turn |

| Laser | Colour (OKLCH) | Note |
|---|---|---|
| Green | 0.87 0.29 142 | 532 nm, the lab default |
| Red | 0.63 0.25 29 | 638 nm, dimmer to the eye |
| Blue | 0.55 0.24 264 | 450 nm |

## Physical details

- **Rings slow and grow.** The core spreads, `a² = a₀² + 4νt`, so speed `U = Γ/(4πR) · (ln(8R/a) − 1/4)` falls. Entrainment grows R by about 30 % over a ring's life. Γ decays with τ about 8 s.
- **A visible core.** Seeded smoke winds into a spiral round the core. Along shows it as two eyes.
- **A wake.** Smoke outside the ring's bubble falls behind as a thin tail.
- **Sound before smoke.** The thup plays at once; the ring rolls up in front of the muzzle over 0.1 s.
- **Laser speckle.** The haze inside the sheet has a fine, still, granular sparkle.
- **Forward scatter.** The sheet's lens is behind the plane, so smoke glows brightest on the far side of a ring (Henyey-Greenstein, g 0.6).
- **Fan falloff.** The sheet spreads from a line lens: brightness falls as 1/r from the lens.
- **Leapfrog period** grows with the gap between the two rings.

## Finesse

- Rings are visible everywhere, but dim; only the sheet makes them bright.
- The flare is brief: about the ring's core width divided by its speed.
- No two fires are the same: aim, radius and Γ jitter a little, as does the seed of the instability lobes.
- Tendrils keep curling slowly after a ring dies, then fade over 4 s.
- Bloom only takes the flare and the sheet's core, never the dim smoke.

## Tech

**Filaments (CPU, `K7`).** Up to 8 rings × 32 nodes. RK2 at a fixed 1/120 s step, two steps a frame. Each ring keeps Γ, a, age, charge and a slot index. Nodes start on a circle with a small random radial wave (modes 5 to 8) that seeds the lobes. Node data goes to an 32 × 8 RGBA32F texture each frame (xyz, Γ).

**Smoke (GPU).** A position texture, 64 wide and 128 rows per ring slot (8 192 particles each). RGBA32F: xyz and birth time.
- **Seed:** on fire, one pass with a scissor writes the slot's rows: 70 % in a Gaussian round the core (σ 1.3a), 30 % in the ring's bubble.
- **Advect:** each particle sums Biot-Savart over the live nodes, adds curl noise scaled by ring age and Breakup, then steps forward.
- **Draw:** soft Gaussian points with additive blend into the RGBA16F scene. Brightness is backlight scatter plus `exp(-(d/w)²)` of the distance d to the sheet, times laser colour and phase. Points near the lens grow and soften.

**Haze and sheet.** One full-screen pass before the smoke: background gradient, faint backlight in fbm haze, and the sheet. The view ray meets the sheet plane once; the glow there is fan mask × 1/r × haze density × speckle, divided by the cosine to the plane's normal (capped), so the sheet reads brightest edge-on.

**Post.** Bright pass, then a dual-filter bloom (four levels down and up). Grade: filmic curve, vignette, grain.

**First frame.** A pre-roll fires two rings and steps the sim 2.4 s. The first frame shows one ring flaring in the sheet and an older ring beyond it, starting to break up.

## Sound

- **Thup:** a sine at 70 to 110 Hz with a 60 ms pitch drop, plus a puff of band-passed noise. Charge lowers the pitch; each fire jitters pitch ±8 % and level ±2 dB. It pans with the aim.
- **Flare:** a very soft glassy tick when a ring crosses the sheet, panned to the ring.
- **Room:** brown noise below 300 Hz at −40 dB while rings fly.
- The context sleeps with the toy.

## Reduced motion and idle

- **Reduced motion:** rings fly at 60 % speed, no speckle shimmer, no haze drift. The flare still shows, more softly.
- **Idle:** lively while rings or tendrils move. Scan drifts at 30 fps. The haze drift sleeps 60 s after the last input. Hidden stops the loop and the sim clock.

## At 375 px

- The camera rolls 90°: the muzzle sits at the bottom centre and rings rise up the frame.
- The lens widens (fov 46° to 60°) and the camera pulls back, so a full ring and the sheet both fit.
- Across shows as a band across the upper middle; the lens fan comes in from the side.
- Particles per slot halve under the pixel budget; point size scales with the frame.
- Touch: tap fires, a drag aims, a hold charges. The Pair action stands in for Space.

## Review focus

1. **No float targets:** without `EXT_color_buffer_float` (RGBA32F), show `.fail`.
2. **Eight rings at once:** the ninth fire takes the oldest slot; its smoke goes at once.
3. **A drag that leaves the stage:** pointer capture keeps the aim; `lostpointercapture` cancels without a fire.
4. **Head-on cores:** the 2a test ends both rings cleanly, with no velocity spike.
5. **Bloom:** many flares at once must not white out the frame.

## Tasks

### Task 1: Blockout

**Files:** Create `vortex/index.html` and the bean. Add the `toys.json` entry and the Lab menu `<li>` with its `toys.vortex` hook.

**Produces:** `K7` filaments, the seed and advect passes, `HAZE_FS`, the bloom and grade. Tap fires a plain ring, so the still can be checked in motion.

- [ ] Scene, haze, sheet (Across), smoke from pre-rolled rings, bloom and grade.
- [ ] Stills at 1280 and 375 px. Checkpoint with Tom.
- [ ] Commit: `Smoke ring cannon: blockout`.

### Task 2: Cannon

- [ ] Pointer state machine: tap fires, drag aims with the ghost ring, hold charges.
- [ ] Pair, Collide (head-on with the 2a end), Clear.
- [ ] Breakup lobes and tendrils; slot reuse.
- [ ] Commit: `Smoke ring cannon: aim, charge, pair and collide`.

### Task 3: Sheets and Settings

- [ ] Along and Scan; Laser, Smoke, Breakup; Haze slider; Reset.
- [ ] Frame loop states; Q4 and Q5.
- [ ] Commit: `Smoke ring cannon: sheets and settings`.

### Task 4: Sound

- [ ] Thup, flare tick and room bed. Q9.
- [ ] Commit: `Smoke ring cannon: thup`.

### Task 5: QA

- [ ] Watchdog ladder. Q1 to Q10 in the browser pane. Record the cost in the bean.
- [ ] Commit.

## Kit handoff

`K7: vortex filaments` (the CPU solver and the GPU advect pass) suits a later fluid toy that needs rings or lines of vorticity.
