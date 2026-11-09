# Lichtenberg burn (`lichtenberg`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Press and hold on a board. A blue-white fractal tree crawls out from your finger, crackles, and burns into the wood. Let go and it cools to embers.

**Architecture:** raw WebGL2, as Bench and Star trails. An incremental CPU sim grows the tree with the dielectric breakdown model. The GPU draws the tree as glowing strokes into an emission buffer, a heat buffer and a char buffer, then blooms the emission and lights the board with it.

**Tech stack:** raw WebGL2, Web Audio through `audioKit()` (Tone.js only if a voice needs it).

**Spec:** science-fair batch, 2026-11-09 (with Rubens tube, Smoke ring cannon, Flame test, Bismuth crystals). Batch rules in [README.md](README.md). Bar v2 in [bar-v2.md](bar-v2.md).

| | |
|---|---|
| Size, estimate | M · $20 to $35 |
| Kits | K1 idea only (a decay pass); no lift |
| Before the build | nothing |

## The shot

A board fills the stage, seen from straight above. A warm, low key light pools on it from the upper left; the corners fall to near black.
Wood is the default: pale birch with a faint grain. The board is the only object. No clamps, no electrodes, no cables.
The first frame already holds three old burns: two cooled to black trees, one still smouldering with a few glints.

## Hero moments

1. **The crawl.** Press and hold. Within one frame a white-hot point appears under the finger. A tree crawls outward, tip by tip, with a crackle. The core is white, the bloom blue-violet, and the board around it lights blue.
2. **Branch flash.** Each new branch flashes brighter than a plain step, so the tree seems to stutter and fork.
3. **The freeze.** Release mid-burn. The spark dies in a fifth of a second; the tree stays as an orange-hot channel, then dims to embers over seconds. Thick trunks stay hot longest.
4. **Arc-over.** When the tree touches an older burn or the board edge, the circuit closes. The whole path from the finger to the contact flashes white, the old tree re-glows, and a loud snap plays. The burn then stops.
5. **Smoulder.** Long after, a few points along the char still glint orange and fade.

## Loop

- Hold: grow the tree from the press point. Growth speeds up the longer you hold, as the channel heats.
- Release: freeze. The tree keeps its shape and cools.
- Tap: a short zap, a tiny tree of a few dozen steps.
- A new burn on an old one: the char conducts, so new trees reach for old ones.
- Clear: a sanding sweep wipes the board to fresh wood.

## Physical details (the pizzazz)

- **Trunks are thick, twigs are fine.** Width follows how many tips feed a segment, as current does.
- **Char has layers.** A black core, a brown caramel halo, a faint pale rim where the wood dried.
- **Char conducts.** New trees bend toward old burns and arc over on contact.
- **Hot wood glows by temperature.** Blue-white spark, then yellow-orange, then deep red, then black.
- **The spark lights the board.** The bloom's widest level tints the wood blue round the tree.
- **The buzz is mains-locked.** The transformer hum sits at 100 Hz with odd harmonics; crackle pans with the tip.

## Bar (Bar v2)

| Slot | Control | Content |
|---|---|---|
| Top left | Choice (segments) | Wood, Acrylic |
| Bottom left | Action | Clear (key `C`) |
| Bottom right | Slider | Voltage: growth speed and branch rate |
| Bottom centre | Keys | `[HOLD] burn` · `[RELEASE] freeze` · `[CLICK] zap` · `[SPACE] burn` |

**Settings sheet:** Branching (sparse to bushy, the DBM exponent), Ember life (short to long), Glow (bloom strength). All persist. Site Quality row. Clear is shown, so no Reset.

| Board | Look |
|---|---|
| Wood | Birch under warm light. The tree chars black and glows as embers. |
| Acrylic | A dark clear block lit from one edge. The tree is etched inside as bright fractures that catch the edge light; no char, no embers, a cold blue afterglow. |

## Tech

**Grid.** Cells of 4 CSS px, sized to the stage at boot and on Clear. The board maps to the stage with cover fit, so a resize crops, never stretches.

**Growth: dielectric breakdown, charge superposition** (Kim, Sewall and Lin, 2007).

1. Each burn starts as one cell at the press point. Its 8 neighbours are candidates.
2. Each candidate keeps a potential `φ = Σ (1 − R1 / r)` over the burn's cells, with `R1 = 0.5`. Adding a cell adds one term to every candidate: O(candidates).
3. A new candidate sums over all cells once: O(cells).
4. Pick one candidate with probability `Φ^η`, where `Φ` is φ normalized to the candidates' min and max. `η` runs from 1.6 (bushy) to 4 (sparse), random per burn inside the Branching band.
5. Old char adds an attraction: `Φ *= 1 + 3 · exp(−d / 5)`, where `d` is the cell distance to old char (a distance field updated per burn).
6. The new cell records its parent. Walking the parent chain increments each ancestor's tip count, which sets the stroke width.
7. Rate: `cells/s = 60 · (1 + 1.5 · held s) · voltage`, capped. A burn stops at 4,000 cells, on arc-over, or on release.

**Strokes.** One instance per segment (parent to child): two jittered end points, width, birth time, burn index, branch flag. One instance buffer, 64k segments; Clear empties it.

| Pass | Target | Blend | What |
|---|---|---|---|
| Decay | heat (RGBA16F, half res) | none | `heat *= exp(-dt / τ)`: G glow τ 3 s, B smoulder τ 18 s |
| Stamp | char (RGBA8) | MAX | live burn only; R core, G halo; deepens with age |
| Stamp | heat | MAX | live burn only; hotter for thick trunks |
| Spark | emission (RGBA16F) | add | live burn only; capsule strokes, white core, blue halo, flash `6 · exp(−age / 0.08)`, ×3 on a branch, per-frame crackle jitter |
| Embers | emission | add | from heat: temperature colour plus glints, `pow(noise, 12)` |
| Bloom | 5 mips | | threshold, 13-tap down, tent up |
| Final | screen | | wood albedo × (key light + wide bloom × spark tint), minus char, plus emission and bloom; filmic tone map, vignette, grain |

MAX blending makes the stamp idempotent: the live burn re-stamps every frame, so widths can grow after a segment is born.

**First frame.** Three seeded burns grow on the CPU at boot, stamp with aged heat, and draw once before `ready`.

## Sound

- **Buzz:** while growing. A 100 Hz saw plus odd harmonics through a bandpass, level by growth rate, with a slow wobble. Pans with the tip.
- **Crackle:** each step may fire a click: noise through a bandpass at 2 to 6 kHz, 2 to 8 ms, level and pitch jittered. Branches crack louder. Pans with the tip.
- **Snap:** arc-over. A broadband crack, then a 60 Hz thump and a short tail.
- **Sizzle:** while heat stays high, a faint filtered hiss with ticks that thin out as it cools.
- Mute by default; the kit's sleep holds while the buzz or sizzle runs.

## Finesse

- The press answers in the same frame: a white point and a blue pool, before the first step.
- No two burns match: seed, `η` and jitter change every time.
- The spark never reads as a static drawing: per-frame jitter on the live strokes, flicker on the tips.
- Embers die from the twigs inward; the trunk is the last to go.
- The bloom never washes the screen: thresholded, and capped on arc-over.

## 375 px recompose

The grid is built at the phone's own aspect, so the board fills a portrait stage. Cells stay 4 CSS px, so trees look the same size under the finger.
Touch: hold to burn, tap to zap. The choice moves bottom left as a stepper, Clear bottom right, Voltage into Settings.

## Reduced motion and idle

- **Reduced motion:** no per-frame jitter, no glint flicker; growth runs at half speed; the arc-over flash is softer.
- **Idle:** lively while growing; drifting (30 fps) while heat glows; asleep 60 s after the last input, after a 2 s ease of the glints. Hidden stops at once.

## Review focus

1. **Float targets:** no `EXT_color_buffer_float` shows `.fail`.
2. **Sim cost:** 4,000 cells with thousands of candidates stays under 4 ms a frame on the CPU. Cap steps per frame.
3. **Pointer leaving the stage mid-burn:** capture keeps the burn; `lostpointercapture` freezes it.
4. **Resize mid-burn:** the burn freezes, the board recomposes, char and heat keep their place.
5. **Arc-over flash:** cap the emission so bloom does not white out the stage.

## Tasks

### Task 1: Blockout (checkpoint)

**Files:** Create `lichtenberg/index.html`, the bean; add the `toys.json` entry and the menu Lab `<li>` with its `toys.lichtenberg` hook.

**Produces:** the DBM grower, the stroke instancing, the char, heat and emission passes, bloom and the wood composite. Hold, release and tap work.

- [ ] Grid, DBM growth, strokes, char and heat stamps, decay, emission, bloom, wood final pass.
- [ ] Hold to grow, release to freeze, tap to zap. Bar v2 shell with the choice, Voltage and Clear wired.
- [ ] First frame: three seeded burns.
- [ ] Syntax check, clean console, stills at 1280 and 375 px. **Checkpoint with Tom.**
- [ ] Commit: `Lichtenberg burn: blockout, a DBM tree on a birch board`.

### Task 2: Finesse and arc-over

- [ ] Branch flash, crackle jitter, trunk width growth, ember glints, the blue board light.
- [ ] Char attraction and arc-over: the path flash, the old tree re-glow, the stop.
- [ ] Clear's sanding sweep. Stills of the crawl, the freeze and an arc-over.
- [ ] Commit: `Lichtenberg burn: branch flash, embers and arc-over`.

### Task 3: Acrylic

- [ ] Acrylic board: edge light, etched fractures, cold afterglow; the chip eases between boards.
- [ ] Commit: `Lichtenberg burn: the acrylic block`.

### Task 4: Sound

- [ ] Buzz, crackle, snap and sizzle, panned with the tip. Q9.
- [ ] Commit: `Lichtenberg burn: buzz, crackle and snap`.

### Task 5: Settings, frame loop and QA

- [ ] Branching, Ember life, Glow; persistence. Frame loop states, watchdog ladder, reduced motion.
- [ ] Q1 to Q10 in the browser pane. Tick the bean and record the cost. Commit.

## Kit handoff

The DBM grower and the stroke stamps, marked as a section, suit a later lightning or crack toy.
