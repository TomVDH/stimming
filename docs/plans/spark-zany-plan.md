# Spark wheel: spark types, a hot wheel, a better roller: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Spark wheel five new spark types that each have a trick, a wheel that heats while it grinds and sheds the heat in a flare, a roller with holes, a bevel and an axle nut, and a slightly smaller wheel on the stage.

**Architecture:** One page, `spark/index.html` (three.js 0.186.1 WebGPU, TSL). The `METALS` table becomes `TYPES`; each entry carries the numbers for its sparks, smoke, glow and flare. Sparks gain a tint attribute; `launch()` gains rules for deeper forks and second acts. One number, `hot`, drives the rim glow, the spark and smoke gains and the flare.

**Tech Stack:** three.js 0.186.1 (`three/webgpu`, `three/tsl`), Web Audio through `audioKit`, the Bar v2 shell in `shared/stim.js`. No new library.

**Spec:** [spark-zany.md](spark-zany.md) (Tom approved, 2026-11-14). Bean `stimming-0d7r`.

## Global Constraints

- Change `spark/index.html` only. `spark/legacy.html`, `toys.json`, the menu and every shared file stay as they are.
- Hold 30 fps or better on Standard quality. The loop stops when nothing moves.
- Bar v2: one choice group, at most five visible controls, no new control. `tests/bar-v2.html` must pass.
- Check 1280 x 720, 375 x 812 and 812 x 375.
- TSL: a value first used inside `select()`, `Loop` or `If` is undefined outside it. Declare shared values with `.toVar()` first, or use `step`/`mix` masks.
- Reduced motion: half the sparks, no smoke, no flare flash, flares at half size, Sparkler forks once only.
- No brand names or looks. The roller stays a bare machined wheel on its fork.
- Code comments: ASD-STE100, one fact per line, twelve words or fewer.
- Commit only through `tools/commit.sh -m "msg" -- <paths>`, one logical commit per task, with the bean file. End each message with `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.
- Every number in the tables below is a start value. Tune it by stills; keep the names.

## Test harness (throwaway, never committed)

The page has no test hook, and the agent's browser pane fires no animation frames. So each task is checked through a probe copy.

- **Probe page:** `spark/probe-g.html`, built from `spark/index.html` by a scratchpad script. It replaces the frame loop's start and stop with a 16 ms timer that calls `frameLoop.nodes.nodeFrame.update()` then `frame()`, forces `visible = true`, removes the intro observer's `act.reset()`, and appends a hook before the last `</script>`:
  - `__g.ev(code)`: `eval` in module scope.
  - `__g.shot(width, postUrl)`: `draw()`, copy the canvas, POST a PNG to a local sink; returns `{ mean }`.
  - `__g.grind(on)`, `__g.strike()`, `__g.reset()`, `__g.info()`.
- **Sink:** a small local HTTP server that writes each POST body to a PNG in the scratchpad. Check its port is free; stop it by PID.
- **Run it** in a background tab of the browser pane, never the front tab. Delete the probe and stop the sink before each commit.
- **Syntax check:** extract the module script and run `node --check` on it. Expected: no output.
- **Errors:** collect `error` and `unhandledrejection` events in the page itself (`window.__errs`); the console log keeps old pages' errors. Expected after every probe run: `__errs.length === 0`.

## Review Focus

1. **A type change in mid-air.** Sparks, embers and smoke already out keep working; the new type starts on the next spark; no error. Test in Task 2, step 5.
2. **Reset during a flare, or with corn waiting to pop.** After `act.reset()`: `hot === 0`, no spark starts later, no puff waits, no ember stays. Test in Task 6, step 5.
3. **A flare with Smoke off, or reduced motion.** The flare still throws sparks, Ice included; no fluid call runs; `hot` still drops. Test in Task 6, step 6.
4. **The ring buffer under the Sparkler flare.** Three fork levels must not wrap the 8000 slots inside one second. Test in Task 3, step 5 and Task 6, step 4.
5. **A grid change with fog on the floor** (quality change, or the ladder's last rung). The fog clears, the page keeps running, the new grid takes the type's lift. Test in Task 4, step 6.

---

### Task 1: Smaller wheel, roller detail

**Files:**
- Modify: `spark/index.html`: `makeWheel()` (about l.241), `faceMaps()` (l.206), `frameShot()` (l.1197), `scene.fog` (l.158), `draw()` (l.1235), `spinFrom()` (l.1444)

**Interfaces:**
- Produces: `makeWheel()` returns `{ pivot, spin }`. `spin` is a `THREE.Group` whose z axis is the axle; `spin.rotation.z = wheel.angle` turns the wheel. (`mesh` is gone.)
- Produces: `rimMat`, `faceMat` keep their names; Task 5 sets their `emissive`.

- [ ] **Step 1: Camera.** In `frameShot()`: wide `aim(30, 1.85, 10.2, 0.42, 0.3)`, tall `aim(34, 3.4, 14.3, 1.3, 0.34)`. Fog becomes `new THREE.Fog(BG, 6, 24)`. In `spinFrom()` the gain becomes `fwd / (rPx * 0.8)`.
- [ ] **Step 2: Roller.** Rebuild the wheel inside `makeWheel()` as children of a `spin` group:
  - Rim: `CylinderGeometry(R, R, WIDTH, 160, 1, true)` (open ends), `rimMat` with `side: THREE.DoubleSide`, turned so its axis is z.
  - Two face plates: one `ExtrudeGeometry` from a `THREE.Shape` circle of radius `R - 0.03` with five round holes (radius 0.16, on a circle of radius 0.58), `{ depth: 0.04, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 48 }`, `faceMat`. Place them so each outer bevel meets the rim's edge at `z = ±WIDTH / 2`. The holes of the two plates are in line.
  - Hub: `CylinderGeometry(0.2, 0.2, WIDTH - 0.1, 32)` along z, `mountMat`.
  - Face maps: the extrude's cap UVs are shape coordinates, so set `repeat (0.5, 0.5)` and `offset (0.5, 0.5)` on `fm.map` and `fm.rough`.
  - Axle nuts: `CylinderGeometry(0.13, 0.13, 0.07, 6)` along z at `z = ±0.43`, `mountMat`, children of `pivot` (they do not spin).
  - `draw()`: `for (const w of [real, ghost]) w.spin.rotation.z = wheel.angle;`
- [ ] **Step 3: Syntax check.** Expected: no output.
- [ ] **Step 4: Probe.** At 1280 x 720: `__g.ev('rPx / size.h')` is between 0.17 and 0.19. At 375 x 812: between 0.10 and 0.12. `__errs` is empty. Take a rest still and a grind still at each of the three sizes; the holes show the spin (two grind stills 50 ms apart differ at a hole), the foot is above the bottom edge, the wet floor mirrors the holes.
- [ ] **Step 5: Commit.** `Spark wheel: a slightly smaller wheel; the roller gets holes, a bevel and axle nuts (stimming-0d7r)`

### Task 2: The types table, a tint per spark, the stepper

**Files:**
- Modify: `spark/index.html`: bar spec (l.91), `METALS` (l.557), `sparkGeo` attributes and `sparkMat()` (l.413 to 500), `writeSpark()` (l.503), `launch()` (l.569), `emit()` (l.629), the ember block (l.324 to 400), every `METALS[metal]` use

**Interfaces:**
- Produces: `const TYPES` (replaces `METALS`), `let pick = 'ferro'` (replaces `metal`).
- Produces: `const NO_TINT = [1, 1, 1, 0]`; per type a field `spark`: `NO_TINT`, a fixed `[r, g, b, mix]`, or the string `'hue'`; `tintOf(m)` returns `[r, g, b, mix]` for a new spark of type entry `m` (linear RGB; `mix` 0 keeps the heat ramp, 1 is the tint alone; `'hue'` gives a random bright hue).
- Produces: the smoke colour field is renamed from `tint` to `fog` in every entry and in the `tones` table, so `tint` means a spark's colour only.
- Produces: `writeSpark(p0, t0, v0, k, heat0, life, trail, size, kind, heat1, gain, tint = NO_TINT)`.
- Produces: `launch(p0, v0, t0, life, heat0, heat1, k, size, o = {})` with `o = { fd = 0, bd = 0, tint = NO_TINT, act = 0, trail }`. `act` 0 is a first flight; Task 3 uses 1 and 2.
- Produces: `addEmber(x, z, born, tau, t0, tint = NO_TINT)`; `EMBERS = 2048`.

Start values for the new entries (fields the three metals already have keep their meaning; the metals get `speed: 1`, `depth: 1`, `spark: NO_TINT`):

| Type | n | life | heat | k | fork | depth | kids | split | size | speed | `spark` |
|---|---|---|---|---|---|---|---|---|---|---|---|
| sparkler | 1.6 | 0.25, 0.5 | 0.9, 0.55 | 4, 6 | 1 | 2 | 3, 5 | 0 | 1.3 | 0.8 | `NO_TINT` |
| comet | 0.22 | 1.6, 2.4 | 1, 0.75 | 0.5, 0.9 | 0 | 0 | 0, 0 | 1 | 3.4 | 0.5 | `NO_TINT` |
| ice | 2 | 0.5, 1.0 | 0.9, 0.6 | 3, 5 | 0.25 | 1 | 2, 4 | 0.3 | 1.4 | 1 | `[0.62, 0.85, 1.0, 0.85]` |
| confetti | 1.6 | 0.5, 0.8 | 0.8, 0.8 | 2.5, 4 | 0 | 0 | 0, 0 | 0 | 2.0 | 0.9 | `'hue'` |
| popcorn | 0.9 | 0.5, 0.9 | 0.45, 0.35 | 2.5, 4 | 0 | 0 | 0, 0 | 0 | 1.8 | 0.8 | `[1.0, 0.78, 0.3, 0.6]` |

- [ ] **Step 1: Table and state.** Rename `METALS` to `TYPES` and `metal` to `pick` everywhere. Rename the smoke colour field `tint` to `fog`. Add the five entries with the fields above (their smoke, flame and glow fields come in Tasks 4 and 5; give them the Ferro values for now so the page runs). `emit()` scales the launch speed by `m.speed`.
- [ ] **Step 2: Bar.** The choice label is `Sparks`. Eight options in the table's order, keys `1` to `8`, labels `Ferro`, `Steel`, `Titanium`, `Sparkler`, `Comet`, `Ice`, `Confetti`, `Popcorn`. `onPick: v => { pick = v; }`. Update the stage's `aria-label` to name sparks, not metals, in one sentence.
- [ ] **Step 3: Tint on sparks.** Add instanced attribute `aE` (vec4) through the existing `slot()` helper; `commitSparks()` uploads it with the others; `act.reset` needs no change (a dead slot's tint is unused). In `sparkMat()`: colour is `mix(body(heat), aE.rgb, aE.a)` for the head, and the same mix with `body(heat * 0.7)` for the tail, then times the radiance as today.
- [ ] **Step 4: Tint on embers.** Add instanced attribute `aC` (vec4) to `emberGeo`; `emberMat()` mixes `body(vT)` toward `aC.rgb` by `aC.a`. `seedEmbers()` writes `NO_TINT`.
- [ ] **Step 5: Probe (Review Focus 1).** For each of the eight keys: `__g.ev("pick = 'x'")`, grind 1.5 s, still. Expected: Ice sparks read blue-white, Confetti sparks read as many hues, Popcorn kernels dull yellow, the metals unchanged from the Task 1 stills. Then, while Ferro sparks fly and smoke hangs, set `pick = 'confetti'`: old sparks keep their colour until they die, `__errs` is empty. `document.querySelector('.stim-ui')` shows a stepper, not segments (eight options).
- [ ] **Step 6: Syntax check, then commit.** `Spark wheel: eight spark types in a stepper; each spark and ember carries its own tint (stimming-0d7r)`

### Task 3: The tricks in flight

**Files:**
- Modify: `spark/index.html`: `launch()` (l.569), `TYPES`

**Interfaces:**
- Consumes: `launch(..., o)` and `addEmber(..., tint)` from Task 2.
- Produces: `TYPES[x].flutter = { life: [a, b], k: [a, b], drift }` (Confetti), `TYPES[x].pop = { wait: [a, b], up: [a, b], size, tint }` (Popcorn), `TYPES[x].bits = seconds` (how long floor bits lie).
- Produces: `const FORK_CAP = 600`: the most fork children `launch()` may write in one frame; `emit()` zeroes the counter each frame.
- Produces: `const corn = []`: kernels that wait on the floor, each `{ p, tPop }`. `emit()` pops every entry whose `tPop <= time` and removes it. `act.reset` empties it. Task 6 moves `tPop`.

- [ ] **Step 1: Deeper forks.** A spark forks when `o.fd < m.depth` (today: `fd === 0`). Children carry `fd + 1`. Each fork level halves `kids` and the child life. `FORK_CAP` stops forks, not first flights, once reached in a frame. Reduced motion: depth is 1 at most.
- [ ] **Step 2: Comet.** No fork. On the floor a comet splits into two or three small sparks (`split: 1` already does two; allow three for `comet`). `o.trail` is 0.22 for comets, so the tail is long. (The smoke trail is Task 4.)
- [ ] **Step 3: Confetti.** At the end of its first flight (life end or floor, whichever is first, and not on the floor), a spark chains one `act: 1` segment from its end point: speed is the end velocity times 0.25 plus a random sideways `m.flutter.drift` (start 0.8), drag from `m.flutter.k` (start 7 to 10), life from `m.flutter.life` (start 1.2 to 2.2), same tint, heat held at 0.8. On the floor, in either act, it becomes an ember with its tint and `tau = m.bits / 4` (start `bits: 6`). No bounce, no hiss.
- [ ] **Step 4: Popcorn.** A kernel that reaches the floor becomes an ember and joins `corn` with `tPop = t0 + end + wait` (`wait` starts at 0.25 to 0.9 s). When its time comes, `emit()` launches one `act: 2` segment from `p`: straight up at `m.pop.up` (start 4 to 7) with a random sideways 1.5, size `m.pop.size` (start 3), tint `m.pop.tint` (start cream `[1, 0.95, 0.8, 1]`), life 0.9, drag 2, and cues `'pop'`. The pop is written only at that moment, never ahead, so a reset or a flare can still change it. An `act: 2` spark bounces once, then lies as a cream ember for `m.bits` seconds. A kernel that dies in the air does nothing.
- [ ] **Step 5: Probe (Review Focus 4).** Sparkler, grind 3 s: `sparkGeo.instanceCount <= 8000`, `__errs` empty, the still shows stars inside stars. Confetti, grind 2 s then stop 1.5 s: the still shows coloured sparks above the floor moving slowly and coloured bits on the floor. Popcorn, grind 1.5 s then stop: stills at 0.3 s steps show white pieces rising from the floor after the kernels land. Comet: few large sparks with long tails.
- [ ] **Step 6: Syntax check, then commit.** `Spark wheel: Sparkler forks twice, Comet runs long, Confetti flutters, Popcorn pops (stimming-0d7r)`

### Task 4: Smoke per type

**Files:**
- Modify: `spark/index.html`: K3 block (`uLift`, `dyeCorrectPass`, l.660 to 940), the smoke block (`wisp()`, `FEED`, `smokeStep()`, l.960 to 1160), `launch()`, `TYPES`

**Interfaces:**
- Consumes: `fog` (the smoke's colour) from Task 2.
- Produces per type: `smoke` (amount), `fog: [L, C, h]`, `flame` (gain), `ramp`, `lift` (number), `warm` (boolean: the type burns), `trailSmoke` (Comet), `steam` (Popcorn).
- Produces: `wisp(t, p, smoke, heat = 0, radius = 0.16)`.

Start values:

| Type | smoke | fog (OKLCH) | flame | lift | warm | Extra |
|---|---|---|---|---|---|---|
| ferro, steel, titanium | as today | as today | as today | 1.4 | true | |
| sparkler | 0.35 | 0.7 0.03 85 | 0.6 | 1.4 | true | |
| comet | 0 | 0.6 0.01 80 | 0.3 | 1.2 | true | `trailSmoke: 0.05` |
| ice | 1.6 | 0.86 0.03 230 | 0 | -1.5 | false | |
| confetti | 0 | 0.6 0 0 | 0 | 1.4 | false | |
| popcorn | 0.15 | 0.8 0.01 90 | 0.5 | 1.6 | true | `steam: 0.08` |

- [ ] **Step 1: Lift glides.** In `draw()`, where the tint and ramp glide: `uLift.value += (m.lift - uLift.value) * 0.08`. `fitGrid()` needs no change (uniforms are shared by every grid).
- [ ] **Step 2: Soft side walls.** In `dyeCorrectPass`, beside the top fade, fade the dye over the outer 8% of the box in x and z (`smoothstep` on `min(uvw.x, 1 - uvw.x)` and the same for z). The floor has no fade.
- [ ] **Step 3: Cold types.** `warm: false` types skip the wet-floor hiss and its steam, feed no heat to the fluid, and get no flame puff. Ice still feeds smoke at the contact.
- [ ] **Step 4: Comet trails and Popcorn steam.** In `launch()`, a first-flight comet queues `wisp(t0 + i * 0.07, posAt(...), m.trailSmoke, 0.02, 0.1)` along its path until it ends or leaves the box. A popping kernel queues one `wisp(tPop, p, m.steam)`.
- [ ] **Step 5: Probe.** Ice, grind 5 s: the still shows pale fog low on the floor, none above the wheel's top, and no hard edge where the box ends. Comet, grind 4 s: thin smoke lines follow the comets. Ferro: the still matches the Task 3 Ferro still (no change to the plume).
- [ ] **Step 6: Probe (Review Focus 5).** With Ice fog on the floor, `__g.ev('rung = 3; resize()')`, wait until `sim.grid.join("x") === "64x80x32"`: `smokeLive` is false, `__errs` is empty; grind again 3 s: fog sinks again.
- [ ] **Step 7: Syntax check, then commit.** `Spark wheel: smoke per type: Ice fog sinks and pools, comets trail smoke, corn steams (stimming-0d7r)`

### Task 5: The hot wheel

**Files:**
- Modify: `spark/index.html`: new block `/* ---------- heat ---------- */` after `emit()`; `emit()`, `smokeStep()`, `draw()`, `lively` (l.1260), `act.reset`, `TYPES`

**Interfaces:**
- Produces: `let hot = 0` (0 to 1), `const HEAT = { rise: 1 / 6, fall: 1 / 5, after: 0.35, strike: 0.04 }`, `function heatStep(dt)` (called in `frame()` after `emit()`), `TYPES[x].glow`: three OKLCH colours, or the string `'cycle'` (Confetti).
- Consumes: `rimMat`, `mountMat` (the flint tube shares it; give the tube its own clone `tubeMat` so the fork and foot do not glow), `contact`, `FEED`, `rate`.

- [ ] **Step 1: The number.** `heatStep(dt)`: with `j = clamp(rate / 250)`, `hot += HEAT.rise * j * dt` while `j > 0.02`, else `hot -= HEAT.fall * dt`; clamp to 0..1. `strike()` adds `HEAT.strike`. `act.reset` sets `hot = 0`. (The flare at `hot >= 1` is Task 6; until then `hot` holds at 1.)
- [ ] **Step 2: Glow.** Each type's `glow`: `warm` types `[[0.35, 0.16, 30], [0.7, 0.18, 55], [0.97, 0.03, 90]]`, Ice `[[0.3, 0.12, 260], [0.75, 0.1, 215], [0.97, 0.02, 230]]`, Confetti `'cycle'` (hue turns once in 1.5 s at lightness 0.75, chroma 0.16). In `draw()`: the glow colour is the three-step ramp at `hot`, glided on a type change; `rimMat.emissive` takes it, `rimMat.emissiveIntensity = 3.5 * hot * hot`; `tubeMat` takes the same colour at 0.6 of that.
- [ ] **Step 3: Gains.** `emit()`: spark count times `1 + 0.8 * hot`, size times `1 + 0.4 * hot`. `smokeStep()`: contact smoke times `1 + 1.5 * hot`; flame heat times `1 + 2 * hot` (`warm` types only). `draw()`: the contact light's top value rises from 6 to 9 with `hot`.
- [ ] **Step 4: Idle rule.** `lively()` gains `|| hot > 0.04`.
- [ ] **Step 5: Probe.** Ferro: grind until `__g.ev('hot') >= 0.99`; elapsed sim time is between 5 and 7.5 s. Stills at `hot` 0.3, 0.6 and 1: the rim goes red, orange, white; the last one shows a flame at the flint. Stop: `hot` reaches 0 inside 6 s, then `__g.info().running` goes false after the smoke clears. Ice at `hot` 1: the rim glows blue-white and no flame shows. Confetti at `hot` 1: two stills 0.4 s apart show different rim hues.
- [ ] **Step 6: Syntax check, then commit.** `Spark wheel: the rim heats as it grinds; sparks, smoke and flame grow with it (stimming-0d7r)`

### Task 6: The flare

**Files:**
- Modify: `spark/index.html`: the heat block, the sound block (`GAP` l.1333, `play()` l.1395), `TYPES`

**Interfaces:**
- Produces: `TYPES[x].flare`: one of `'fan'`, `'star'`, `'salvo'`, `'frost'`, `'cannon'`, `'popAll'`. `function flare()`: fires the picked type's flare once, sets `hot = HEAT.after`. `heatStep()` calls it when `hot >= 1`.
- Produces: sound kind `'thump'` in `GAP` (`thump: 1 / 2`) and in `play()`.

| Type | flare | What it launches (full size; reduced motion halves every count) |
|---|---|---|
| ferro | fan | 220 sparks in a 70 degree fan round the jet, fork chance 1; fireball |
| steel | fan | 160 long sparks, 70 degree fan; small fireball |
| titanium | fan | 140 sparks, 70 degree fan, size times 1.5; white fireball |
| sparkler | star | 60 sparks in a sphere from the contact, fork depth 3 |
| comet | salvo | 12 comets in a 90 degree fan |
| ice | frost | 180 ice sparks in a low 120 degree fan; a fog bank |
| confetti | cannon | 320 confetti sparks in a 35 degree cone aimed up and down the jet |
| popcorn | popAll | every kernel ember on the floor pops now; plus 60 new kernels |

- [ ] **Step 1: `flare()`.** Launch the table's sparks through `launch()` from the contact point, all at the present `time`. The fireball is one `puff()` at the flint: radius 0.55, velocity straight up 2.5, grip 0.6, smoke `1.2 * m.smoke`, heat 1.5 (`warm` types). The fog bank (Ice) is three `puff()` calls low along the jet: radius 0.6, velocity along the jet 2, no heat, smoke 1.2. Confetti puffs nothing. Then `hot = HEAT.after`.
- [ ] **Step 2: `popAll`.** The flare sets every `tPop` in `corn` (Task 3) to now plus a random 0 to 0.25 s, then launches its 60 new kernels.
- [ ] **Step 3: Light and sound.** The flare sets a `flash` value to 1 that decays in 0.25 s; `draw()` adds `12 * flash` to the contact light (skipped under reduced motion). `cue(time, 'thump', contactPoint, 1)`; `play()` gives `'thump'` a 70 Hz sine blip of 0.35 s under a 0.5 s band of noise at 900 Hz, built from the page's `blip()` and `burst()` helpers.
- [ ] **Step 4: Probe (Review Focus 4).** For each type: grind until the flare fires (detect `hot` falling from above 0.95 to `HEAT.after`), still 0.15 s and 0.8 s later. Expected: the table's picture; `sparkGeo.instanceCount <= 8000`; `__errs` empty. Sparkler's flare writes at most `FORK_CAP` children a frame. A held grind fires the next flare 3 to 5 s later.
- [ ] **Step 5: Probe (Review Focus 2).** Popcorn: grind 2 s, stop, and inside 0.2 s call `__g.reset()`: `hot === 0`, `corn.length === 0`, `wisps.length === 0`, and a still 1.5 s later shows no pop. Ferro: `__g.reset()` 0.1 s after a flare: `sparkGeo.instanceCount === 0`, `smokeLive` is false after the next frame's kick wisp only.
- [ ] **Step 6: Probe (Review Focus 3).** `smokeOn = false`, Ice, grind to a flare: the still shows the ice fan; `smokeLive` is false throughout; `hot` dropped to `HEAT.after`. Read `reduced()`-guarded code by eye: no flash, half counts, Sparkler depth 1.
- [ ] **Step 7: Syntax check, then commit.** `Spark wheel: a full heat sheds in a flare, one per type, with a thump (stimming-0d7r)`

### Task 7: Whole-page check and close

**Files:**
- Modify: `.beans/stimming-0d7r--*.md`, `docs/plans/spark-zany.md` (status line only)

- [ ] **Step 1: Three sizes.** Probe stills of Ferro at rest, Sparkler mid-grind and an Ice flare at 1280 x 720, 375 x 812 and 812 x 375. The flare stays in frame; the stepper and the Grind button do not cover the wheel.
- [ ] **Step 2: Frame cost.** With the probe's bench hook (render, then wait for `device.queue.onSubmittedWorkDone()`): Sparkler flare and Ice fog, on High. Expected: average under 12 ms on this Mac. Record the numbers on the bean.
- [ ] **Step 3: Real page.** Load `spark/index.html` itself: no error from load, a grind, a tap and a key press `5`. `tests/bar-v2.html`: record the result; shell failures that also fail on `main` without this work are not this task's.
- [ ] **Step 4: Bean and doc.** Tick the bean's list, add a summary and the list of things not checkable in the pane (frame rate on a visible screen, sound by ear, drag by hand, a phone). Set the spec's status line to built. Commit: `Spark wheel: types, hot wheel and roller checked; bean stimming-0d7r closed out for Tom's look`
