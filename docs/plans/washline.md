# Washing line (`washline`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Plain sheets snap in the wind on one line against the sky. With the sun behind them they glow like stained glass. Unclip the pegs one by one until a sheet flies away.

**Architecture:** Verlet cloth (new, built on K4's solver from Pull chain) pinned to a K4 rope at its pegs. Wind is an aerodynamic force per triangle from a moving gust field. three.js 0.170 renders the cloth with a two-pass trick: transmitted sky light uses multiplicative blending, which needs no sorting; front light is additive.

**Tech stack:** three.js 0.170 (BufferGeometry, EffectComposer, UnrealBloomPass, OutputPass), simplex-noise, Tone.js through `kit.tone()`.

**Spec:** shortlist 34 in [toy-ideas.md](../toy-ideas.md); rank 18 in [toy-plan.md](../toy-plan.md); batch rules in [README.md](README.md).

| | |
|---|---|
| Size, estimate | M · $20 to $30 |
| Kits | Uses K4 from `chain/index.html`; adds cloth to K4 |
| Before the build | Pull chain built first |

## The shot

A wide sky, pale near the horizon, bluer above, with soft clouds drifting. One line sags across the frame from out of frame left to out of frame right.
On it hang five plain rectangles of cloth in quiet colours, of different sizes, held by small wooden pegs.
A faint band of ground haze sits at the bottom. No posts, no garden: the Look rule cuts both.

## Hero moments

1. **Backlit cloth.** Move Sun behind the line and every sheet lights up in its colour. Where two sheets overlap, their colours multiply, like stained glass.
2. **Gusts you can see travel.** A gust reaches the left sheet first, then the next, then the next: a wave across the line.
3. **The flapping crack.** In Gale, loose corners snap with a sharp crack, as real cloth does when its edge whips over.
4. **Gone with the wind.** Pull the last peg and the sheet lifts, tumbles and sails out of frame.

## Loop

- Tap a peg: it pops off and tumbles down. The cloth now hangs from fewer pegs and flaps harder.
- Tap the sky: a small gust blows in from that side.
- Drag the cloth: grab it and pull. Release and it swings back.
- Drag the line: pluck it, and every sheet bounces.
- + Sheet hangs a new one, with a peg at each top corner, at a free spot.
- Release unclips every peg at once: everything flies.

## Bar

| Control | Content |
|---|---|
| Chips | Breeze, Gusty, Gale |
| Slider | Sun: from in front of the line to behind it |
| Actions | + Sheet, Release |
| Settings | Fabric: Cotton, Linen, Silk · Line: Slack, Taut · Quality: Standard, High (shared) |
| How | Click/Tap: unclip a peg · Drag: pull cloth or pluck the line · Space: sheet (mouse devices only) |

| Fabric | Bend stiffness | Damping | Mass per area | Look |
|---|---|---|---|---|
| Cotton | medium | 0.992 | 1 | Matte, mid translucency |
| Linen | high | 0.99 | 1.3 | Crisp folds, low translucency |
| Silk | low | 0.996 | 0.4 | Fluid, high translucency, a slight sheen |

## Tech

**Line (K4).** Copy K4 from Pull chain. Its chains move in the wall's plane, in 2D; this copy adds a z array to every point, so the line and cloth move in 3D. The line is a rope of 80 points, both ends pinned out of frame. Line Slack or Taut sets the rest length. Pegs are points on the rope.

**Cloth (new, in K4).** `makeCloth(w, h, cols, rows)`: a grid of Verlet particles, 24 × 18 on High and 16 × 12 on Low.

- **Constraints:** structural, shear and bend (two apart). 8 iterations on High, 5 on Low.
- **Pins:** each peg holds the nearest top particle to its rope point, both ways, so a heavy sheet pulls the line down.
- **Wind:** per triangle, `F = 0.5 * ρ * C * (v_rel · n) * |v_rel · n| * n * area`, split across the triangle's three particles. This one formula makes cloth flap; no extra animation is needed.
- **Gust field:** a base wind by chip plus simplex-noise gusts. The noise field scrolls with the wind's mean velocity, so gusts travel across the line.
- **Free cloth:** with no pegs, gravity, the wind force and drag only. It is removed after it leaves the frame by 20 %.
- **Step:** 1/120 s fixed, through an accumulator, as in Pull chain.

**Pegs.** Small instanced blocks. Unclipped pegs fly as rigid bodies under gravity, with a spin, and leave the frame.

**Render.** Normals are recomputed every frame. The cloth uses two materials:

1. **Transmission pass:** multiplicative blending (`DstColor`, `Zero`). Each sheet multiplies the sky behind it by `mix(1, T_rgb, sunBehind * translucency)`. Multiplying is order-free, so overlaps need no sorting.
2. **Reflection pass:** additive. Diffuse sun on the front face, sky ambient, and a soft sheen for Silk.

- The sky is a gradient with fbm clouds that drift with the wind. Bloom at a high threshold catches only backlit sheets.
- **Sun:** the slider moves the sun from in front of the line (low, behind the viewer) to behind it (low, through the sheets). The sky's glow moves with it.

**Picking.** Pegs: the nearest peg within 22 px. Cloth: ray to the nearest triangle, then the nearest particle. Line: within 16 px of a rope segment.

**Flap detection.** For edge particles, a sudden reversal of acceleration across the cloth normal triggers a flap crack. Each sheet cracks at most every 120 ms.

## Sound

- **Wind:** noise through a bandpass; level and brightness follow the chip and the gusts.
- **Flap crack:** a sharp 15 ms noise burst through a 1.5 kHz bandpass, its level following the reversal's strength, panned by x.
- **Peg pop:** a wooden click, plus a tiny tumble patter as it falls out of frame.
- **Line pluck:** a low twang that dies in 0.6 s.
- **Fly-away:** a rising whoosh that follows the sheet up.

## Finesse

- Sheets flap with their own rhythm; their sizes and masses differ.
- Overlapping backlit sheets make a third colour where they cross.
- A sheet on one peg twists and flags downwind; on two pegs it bellies like a sail.
- Linen is heavy: its folds hold longer.
- The line visibly sags more under bigger sheets.

## Reduced motion and idle

- **Reduced motion:** wind at 30 %, no cracks, and fly-away fades the sheet instead of tumbling it.
- **Idle:** this toy drifts in the wind: 30 fps, and 60 s after the last input the wind eases to calm over 3 s. The sheets settle, and the loop sleeps. The wind dying when you leave reads as natural.

## Review focus

1. **Release with five sheets in Gale:** five free cloths at once hold the frame rate. On Low they drop to 16 × 12 particles.
2. **Unclipping the last peg while dragging that sheet:** the sheet stays in the hand until release, then flies.
3. **+ Sheet with no free spot:** the button shows `aria-disabled` at six sheets.
4. **Cloth exploding:** clamp each particle's step to 0.05 units, so a hard yank cannot blow the solver up.
5. **375 px portrait:** the line spans the short side, three sheets fit, and the sun's sky glow stays in frame.

## Tasks

### Task 1: Line and sheets (K4 plus cloth)

**Files:** Create `washline/index.html` and the bean.

**Produces:** marked `K4` from Pull chain; `makeCloth(w, h, cols, rows)`; `stepCloth(c, h)`; `windAt(p, t)`; `pegs`.

- [ ] Lift K4. Add cloth, pins and the wind force. Draw the sky and both cloth passes.
- [ ] Q1, Q2 and stills with the sun in front and behind, at 1280 and 375 px. Checkpoint with Tom.
- [ ] Commit: `Washing line: sheets on a line, K4 with cloth`.

### Task 2: Hands on

- [ ] Peg unclip, peg flight, cloth grab, line pluck, free cloth, + Sheet and Release.
- [ ] The explosion clamp from Review focus 4.
- [ ] Commit: `Washing line: unclip, pull and let fly`.

### Task 3: Wind and fabric

- [ ] The gust field that travels, chips, fabrics, flap detection.
- [ ] A screenshot of backlit overlaps in Gusty. Checkpoint with Tom.
- [ ] Commit: `Washing line: gusts that travel, three fabrics`.

### Task 4: Sound

- [ ] Wind, crack, pop, pluck and whoosh. Q9.
- [ ] Commit: `Washing line: wind, cracks and pegs`.

### Task 5: Bar, menu and QA

- [ ] Bar, Settings and persistence. `toys.json`, and the menu Lab entry with its hook.
- [ ] Q1 to Q10. Tick the bean and record the cost. Commit.

## Kit handoff

K4 with cloth, marked. Silk drop (109) and Tablecloth yank (112) copy it from here.
