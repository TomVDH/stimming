# Ulam spiral (`ulam`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A million numbers spiral out from the centre, and the primes glow. Zoom from ten cells to a million, morph the spiral's shape, and let a sweeping beam sing the primes it crosses.

**Architecture:** three.js 0.170 as a thin host. One instanced quad per number; the vertex shader computes each number's position on three spirals from `gl_InstanceID` and blends between them. A CPU sieve marks the primes once. Points splat with energy kept constant, so zooming out turns them into a smooth density in which the diagonals show.

**Tech stack:** three.js 0.170 (InstancedBufferGeometry, OrthographicCamera, EffectComposer, UnrealBloomPass, OutputPass), Tone.js through `kit.tone()`.

**Spec:** shortlist 49 in [toy-ideas.md](../toy-ideas.md); rank 15 in [toy-plan.md](../toy-plan.md); batch rules in [README.md](README.md).

| | |
|---|---|
| Size, estimate | S · $10 to $15 |
| Kits | none; shares a host scaffold with Collatz coral |
| Before the build | nothing. D6 (digits) defaults off. |

## The shot

Black, with a faint blue-black glow at the centre. The square spiral at a middle zoom: about 40,000 cells.
Primes glow warm white; composites are dim, near-invisible dots. The diagonal lines already show.
A slow light sweep rests at about 2 o'clock.

## Hero moments

1. **The morph.** Pick Sacks or Hex and a million points flow from the square spiral to the new one in 1.6 s. The prime curves re-form as they land.
2. **The deep zoom.** Zoom out and single cells blur into a texture of diagonal streaks. Zoom in and the streaks resolve into cells.
3. **The sweep sings.** Sweep turns a soft beam around the centre. Primes flare as it crosses them, and each plays a note set by its gap to the previous prime.
4. **Euler's line.** Tap a cell: the diagonal with the most primes through it lights up end to end, and it plays. Set Start to 41 and Euler's `n² + n + 41` becomes one straight diagonal of 40 primes in a row.

## Loop

- Drag: pan. Wheel, pinch or the Zoom slider: zoom.
- Tap: light the richest diagonal through that cell.
- The chip picks the spiral. Sweep starts or stops the beam.

## Bar

| Control | Content |
|---|---|
| Chips | Square, Sacks, Hex |
| Slider | Zoom |
| Action | Sweep |
| Settings | Show: Primes, Twins, Gaps · Start: 1, 41 · Digits: Off, On (D6) · Quality: Low, High |
| How | Drag: pan · Wheel/Pinch: zoom · Click/Tap: light a diagonal · Space: sweep (mouse devices only) |

## Tech

**Numbers.** N = 2²⁰ (1,048,576) on High and 2¹⁸ on Low. `n = gl_InstanceID + uStart`, where Start is 1 or 41.
On the square spiral, numbers along a straight line follow a quadratic with a leading 4. Euler's polynomial at even arguments, `4n² + 2n + 41`, has that form, so it shows as a prime-rich line even from 1. Starting at 41 puts the whole polynomial, all 40 primes, on one diagonal. Verify both in Task 3 before Tom sees the claim in a vignette.

**Sieve.** A Uint8Array of N + 41, by Eratosthenes, in an idle slice at start: about 10 ms. Upload as an instance attribute `aKind` (one byte):

| Bit | Meaning |
|---|---|
| 0 | prime |
| 1 | twin prime |
| 2 to 7 | gap to the previous prime, halved, clamped to 63 |

**Positions (vertex shader).**

| Spiral | Position of n |
|---|---|
| Square | The closed-form Ulam walk. `k = ceil((sqrt(n) − 1) / 2)` gives the ring, then the side and the offset. |
| Sacks | Polar: radius `sqrt(n)`, angle `2π sqrt(n)`. Perfect squares line up on one ray. |
| Hex | The hexagonal ring walk: ring `k` holds `6k` cells, six sides of `k`. |

- Positions blend through `uFrom`, `uTo` and `uMix`, eased with a cubic.
- Scale Sacks and Hex so the area per number matches the square spiral, and density compares fairly.

**Energy-kept splats.** Each point is a quad of `max(cellPx, 1.5)` pixels. Its intensity scales by `min(1, cellPx²)`, so zooming out keeps the total light the same.
Additive blending into a half-float target, then bloom at a moderate threshold.

**Colour by Show.**

| Show | Primes | Others |
|---|---|---|
| Primes | warm white (0.95 0.04 85) | 0.25 0.02 260 |
| Twins | twins bright gold (0.85 0.15 80); other primes dimmer | dim |
| Gaps | gap ramp: small gaps cool (0.8 0.12 220) to large gaps warm (0.75 0.17 40) | dim |

**Zoom.** The slider is log scale, from 6 cells across the short side to all of N. Wheel and pinch zoom about the pointer. Pan clamps to the spiral's extent.

**Diagonal pick.** From the tapped cell, count primes along the four diagonal and line directions over ±60 cells. Take the richest one, fit the quadratic through three of its cells, and light every cell whose n fits that quadratic.
The highlight is a bitmask texture, 1,024 × 1,024, sampled per instance.

**Sweep.** A uniform angle `uSweep` turns at 0.25 rad/s. Primes within ±2° of the beam brighten by `exp(−Δ² / σ²)`.
The CPU finds the primes the beam crosses from a per-frame list of visible primes, at most 12 notes per second, the brightest and nearest first.

**Digits (D6).** Shown when a cell is at least 48 px. A 10-glyph atlas, drawn once from Gabarito into a canvas texture. Each cell draws its digits from the atlas.

## Sound

- **Sweep notes:** a soft glass bell, FMSynth with a short attack and a 1.5 s tail. Pitch comes from the gap: a twin gap of 2 plays the highest note, and larger gaps step down a major pentatonic. Each note pans by screen x.
- **Diagonal:** its primes play in order from the centre out, at 10 per second.
- **Zoom:** a filtered whoosh whose pitch follows the zoom speed.
- **Morph:** a short rising shimmer.

## Finesse

- At the deepest zoom-out, the diagonals read as fine streaks in a textured field, not as noise.
- The morph keeps every point's identity: you can watch one prime travel.
- The sweep's beam lights the composites faintly too, so it reads as light, not as a filter.
- Primes have a soft core and a tight bloom; composites are flat dots with no bloom.
- With Start at 41, a tap near the centre finds Euler's line. The first-frame view frames it.

## Reduced motion and idle

- **Reduced motion:** the morph cross-fades. The sweep steps 15° at a time and plays one note per step. Zoom moves snap.
- **Idle:** no drift. With Sweep on, the toy runs at 30 fps and sleeps 60 s after the last input. With Sweep off, the loop sleeps when zoom and pan settle.

## Review focus

1. **A phone with 2²⁰ instances:** the ladder drops to 2¹⁸ after a slow first second, and the sieve result is reused.
2. **Pinch zoom with two fingers plus a third touch:** only the first two pointers count. The third is ignored.
3. **A tap during the morph:** the pick uses the target spiral's positions.
4. **Pan clamp at deep zoom:** the spiral's edge stops the pan; you never fall into empty black.
5. **Digits on at a mid zoom:** digits show only above 48 px cells, so text never turns to mush.

## Tasks

### Task 1: The square spiral

**Files:** Create `ulam/index.html` and the bean.

**Produces:** `sieve(N)` returns a Uint8Array; `aKind`; `ULAM_VS` with `square(n)`, `sacks(n)`, `hexs(n)`; `view` (`{ cx, cy, scale }`).

- [ ] Sieve, instanced splats, square positions, energy-kept intensity, bloom, pan and zoom.
- [ ] Q1, Q2 and stills at three zooms, at 1280 and 375 px. Checkpoint with Tom.
- [ ] Commit: `Ulam spiral: a million numbers, primes aglow`.

### Task 2: Sacks, Hex and the morph

- [ ] The two other spirals, area scaling, the morph and the Show modes.
- [ ] Screenshots of all three spirals and one mid-morph.
- [ ] Commit: `Ulam spiral: Sacks and Hex, with a morph`.

### Task 3: Diagonals, sweep and digits

**Produces:** `pickDiagonal(n)` returns `{ a, b, c, cells }`; `sweep.on`.

- [ ] Diagonal pick and highlight, the sweep beam and its note picking, and the digit atlas.
- [ ] A screenshot of Euler's line lit. Checkpoint with Tom.
- [ ] Commit: `Ulam spiral: light a diagonal, a singing sweep`.

### Task 4: Sound

- [ ] Bells, diagonal run, zoom whoosh and morph shimmer. Q9.
- [ ] Commit: `Ulam spiral: primes sung by their gaps`.

### Task 5: Bar, menu and QA

- [ ] Bar, Settings and persistence. `toys.json`, and the menu Lab entry with its hook.
- [ ] Q1 to Q10. Tick the bean and record the cost. Commit.

## Kit handoff

None. If Collatz coral is built first, copy its host scaffold (orthographic camera, pan and zoom, bloom).
