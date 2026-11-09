# Night viaduct, Pass snowbound: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pass becomes a snowbound epic: a long freight with a plough crosses a tall curved viaduct in a storm, under a moon that breaks through the cloud.

**Architecture:** the train shape moves to `viaduct/train.js`; Port and Pass both build from it. `viaduct/pass.js` is rewritten on Port's method: a baked still layer in two light layers (base, moon), a full-screen comp pass, and live parts for train, snow and spray. Shader chunks are copied from `port.js` into `pass.js`, not shared.

**Tech stack:** three.js 0.170.0 (ShaderMaterial, EffectComposer, Points), plain ES modules, no build step.

**Spec:** [viaduct-pass-snowbound.md](viaduct-pass-snowbound.md)

## Global constraints

- Touch only `viaduct/`, this plan, the spec and bean `stimming-3cmz`. No shared files.
- Library set is fixed: three.js 0.170.0 for this toy. Add no library.
- Code comments: ASD-STE100, one fact per line, twelve words or fewer.
- Tom said no Playwright. Check in the browser pane while it is visible; a hidden pane stops `requestAnimationFrame`.
- Syntax check for every task: copy each changed `.js` file to the scratchpad as `.mjs` and run `node --check`. Expected: exit 0.
- Commit by explicit path, never `git add -A`. `git pull --ff-only` before `git push`. Push after every task.
- Never leave a QA URL or debug build loaded in Tom's tab. Leave the tab on `?scene=pass`.
- Scene contract (what `index.html` reads from `build()`): `{ scene, camera, frame, bake, tune, dispose, orbs, update, tap, steer, release, lively, lower, post }`. Port's return at `port.js` line 2017 is the reference.

## Review focus

1. **Port does not change.** Expect Port screenshots after Task 1 to match the ones taken before it, at the same `?train=` park.
2. **A scene switch, Pass to Port and back.** Expect no leaked render targets and a clean console; `dispose()` frees every target Pass creates.
3. **The long train at the ends.** The 400 m freight must hide fully in each shed. Expect no wagon to show past the shed mouth while the train waits.
4. **Reduced motion.** Expect snow and cloud gaps to stand still, and no per-frame work with no train running.
5. **375 px.** Expect the span, the far shed and the peaks in frame, and the bar not to cover the deck.

---

### Task 1: Shared train module

**Files:**
- Create: `viaduct/train.js`
- Modify: `viaduct/port.js` (the train block, lines 816 to 978)

**Interfaces:**
- Produces: `makeTrain({ consist: string[], gap = 1.0, plough = false })` returns `{ parts: [{ kind, len, geo, off }], span, lay(s, dir, path, cb), lamps(s, dir, path) }`.
  - `path(s)` returns `{ x, z, yaw }`.
  - `lay` calls `cb(i, x, z, yaw)` per vehicle; `yaw` already faces the run direction.
  - `lamps` returns `{ head: {x, z}, tails: [{x, z}, {x, z}] }` in plan view; the scene adds heights.
  - Geometry attributes: `position`, `normal`, `color`, `aKind` (1 on a loco hull), `aTop` (1 where the normal's y > 0.7).
- Kinds: `loco` 20 m, `loco-b` 20 m, `car` 24 m, `box` 16 m, `hopper` 14 m. `plough` adds a wedge plough under the lead nose.

- [ ] **Step 1:** Before any change, screenshot Port at `?scene=port&train=175` at 1280 px. Save it to the scratchpad as `port-before.png`.
- [ ] **Step 2:** Move `hull()`, the `attrs()` helper and the consist offsets from `port.js` into `train.js`. Add `loco-b` (no rake, flat cab both ends), `box` (4.4 m tall body) and `hopper` (ends slope in by 1.5 m at the top). Add `aTop`.
- [ ] **Step 3:** `train.js` takes `mergeGeometries` from `three/addons/utils/BufferGeometryUtils.js` and its colour constants inline. It holds no material and no scene object.
- [ ] **Step 4:** In `port.js`, build with `makeTrain({ consist: ['loco', 'car', 'car', 'car'] })`. `place()` uses `lay()` and `lamps()`. `hullMat`, lights, glints and the beam stay in `port.js`.
- [ ] **Step 5:** Syntax check both files. Screenshot `?scene=port&train=175` again. Expected: it matches `port-before.png`; clean console.
- [ ] **Step 6:** Commit `viaduct/train.js` and `viaduct/port.js`: "Night viaduct: the train shape moves to train.js; Port builds from it".

### Task 2: Pass span, gorge and sheds

**Files:**
- Modify: `viaduct/pass.js` (rewrite)

**Interfaces:**
- Consumes: Port's `precast` material (`port.js` line 265), `sweep()` and `prism()` patterns (lines 684 to 740), `at()` and `atX()` (lines 674, 818). Copy them; do not import from `port.js`.
- Produces: `LEN` (span length on the track), `at(s, side)`, `atX(s, side)` (straight beyond each end), `DECK` (deck top height), `TRACK` (rail offset), `SHED_A`, `SHED_B` (track places of the two shed mouths), `START`, `END`.

- [ ] **Step 1:** Path: a gentle curve, 700 m long, from the near end at the camera's side to the far end under the peaks. Use a Catmull-Rom curve with an arc-length table, as Port does (lines 659 to 680).
- [ ] **Step 2:** Deck: Port's girder profile, swept along the path. Deck top at y 110 above the gorge floor at its deepest.
- [ ] **Step 3:** Piers in pairs every 45 m: 70 to 110 m tall, set by the gorge floor under them, tapering 30 % toward the top.
- [ ] **Step 4:** Gorge: two rock walls from the path's ends down to a V floor, faceted, lit by `litMaterial`-style flat planes with Port's haze.
- [ ] **Step 5:** Sheds: a concrete gallery 60 m long at each end, roof on posts, open on the valley side, dark inside. `SHED_A = -20`, `SHED_B = LEN + 20`. `START` and `END` sit 30 m plus the train span inside each shed.
- [ ] **Step 6:** Camera: wide shot high at the near end, to one side. Set FOV, position and target so the whole span and the far shed fit at 1280 px; at 375 px, move the camera back along the near end and narrow the FOV until the far shed fits.
- [ ] **Step 7:** Syntax check. In the pane, screenshot `?scene=pass` at 1280 and 375 px. Expected: the span curves away to the far shed; clean console.
- [ ] **Step 8:** Commit `viaduct/pass.js`: "Night viaduct, Pass: curved span, gorge and snow sheds".

### Task 3: Peaks, sky and the two-layer bake

**Files:**
- Modify: `viaduct/pass.js`

**Interfaces:**
- Consumes: Port's bake (`port.js` lines 1419 to 1688): `backRT` with depth, the comp mesh, `bake(renderer)`.
- Produces: `baseRT`, `moonRT` (same size, same depth source), `gapMask(xz, t)` in GLSL: 1 in a cloud gap, 0 under cloud. `uGapT` uniform drives it.

- [ ] **Step 1:** Peaks: keep today's sawtooth wedge rows from the old `pass.js`, taller, behind the far shed. Snow line on each crest.
- [ ] **Step 2:** The still layer renders twice in `bake()`: once with moon intensity 0 into `baseRT`, once with moon only and no ambient into `moonRT`. One depth texture serves both.
- [ ] **Step 3:** Comp: `col = base + moon * gapMask(worldXZ, uGapT)`. Rebuild world position from depth, as Port's comp does.
- [ ] **Step 4:** `gapMask`: two octaves of noise in world xz, drifting with the wind. Thresholds give gaps of 200 to 600 m. One peak takes 8 to 20 s to come out and fade.
- [ ] **Step 5:** Sky: a dark storm cloud deck with brighter gap edges where the moon sits behind it; the gaps match the ones on the ground.
- [ ] **Step 6:** Syntax check. Screenshot twice, 10 s apart. Expected: moonlight moved across the peaks between the two shots; no rebake ran (log the bake count once, then remove the log).
- [ ] **Step 7:** Commit `viaduct/pass.js`: "Night viaduct, Pass: peaks and sky; moon bakes as its own layer under drifting cloud gaps".

### Task 4: Freight and plough

**Files:**
- Modify: `viaduct/pass.js`

**Interfaces:**
- Consumes: `makeTrain()` from Task 1. Port's `trainSpeed(s, dir, t)` (line 1706), the `parked` flag and `?train=<s>`. Port's flare and pin rules (`flareMat`, line 469).

- [ ] **Step 1:** Consist: `['loco', 'loco-b', 'box', 'hopper', 'box', 'box', 'hopper', 'car', 'box', 'hopper', 'box', 'car', 'hopper', 'box', 'box', 'hopper', 'box', 'car']`, `plough: true`. The span comes to about 330 m; the spec's 400 m is approximate.
- [ ] **Step 2:** Pass hull material: Port's dark hull look plus snow where `aTop` is 1 and on the windward flank.
- [ ] **Step 3:** Speed: Port's `trainSpeed`, braking over the last 220 m to each hide point; cruise 13 m/s, so the freight takes about 25 s to pass a point.
- [ ] **Step 4:** Lamps: head lamps flare; one marker pin per wagon side. One headlight in the light list, aimed down the track.
- [ ] **Step 5:** `tap()` on the train or `+ Train` sends a freight. `update` and `lively` follow Port's rules, so the motion controls show.
- [ ] **Step 6:** Syntax check. Open `?scene=pass&train=350`. Expected: the parked freight sits mid-span with its plough at the front; clean console.
- [ ] **Step 7:** Check review focus 3: send a train and watch it into the far shed. Expected: no wagon shows past the shed mouth while it waits.
- [ ] **Step 8:** Commit `viaduct/pass.js`: "Night viaduct, Pass: long freight with a plough, built from train.js".

### Task 5: Snow, spray and caked snow

**Files:**
- Modify: `viaduct/pass.js`

**Interfaces:**
- Produces: `wind` (an object `{ x, z, gust }` updated in `update()`), `uWind` uniform shared by every snow material.

- [ ] **Step 1:** Wind: a base vector plus a gust from slow noise, 0.6 to 1.4 times base.
- [ ] **Step 2:** Near snow: 1 500 points in a box around the camera, soft discs, sizes 2 to 6 px, wrapped in the box.
- [ ] **Step 3:** Mid snow: 4 000 points along the span, stretched along the wind by speed.
- [ ] **Step 4:** Far curtains: in the comp pass, layered noise sheets by depth that hide and show far piers.
- [ ] **Step 5:** Headlamp: snow points inside the headlight cone brighten by the cone's falloff. Use the headlight's place and direction as uniforms.
- [ ] **Step 6:** Plough spray: two point plumes at the plough, left and right, 600 points each, thrown out and down with the wind. Count of live points grows with train speed and is 0 at rest.
- [ ] **Step 7:** Caked snow in the still layer: piers on the windward face, the deck edge, shed roofs.
- [ ] **Step 8:** Spindrift: thin bright plumes off the peak crests, blown with the wind, shown only where `gapMask` lights the crest.
- [ ] **Step 9:** Reduced motion: wind and gaps freeze, snow points hold still (review focus 4).
- [ ] **Step 10:** Syntax check. Screenshot the freight mid-span at speed. Expected: spray off the plough, lit snow in the beam; clean console.
- [ ] **Step 11:** Commit `viaduct/pass.js`: "Night viaduct, Pass: snow in three layers, lit in the beam; plough spray".

### Task 6: Tune desk, quality and close-out

**Files:**
- Modify: `viaduct/pass.js`, `viaduct/index.html` (only if Pass needs a change to show its controls), `.beans/stimming-3cmz--toy-night-viaduct.md`

- [ ] **Step 1:** `tune`: groups Sky, Cloud, Snow, Span, Train, Lens, built with Port's `knob()` and `colour()` (`port.js` lines 1931 to 1934). Bake-affecting knobs set `bake = true`.
- [ ] **Step 2:** `lower(rung)`: rung 1 halves mid snow and spray; rung 2 drops the far curtains; rung 3 drops near snow. `dispose()` frees every render target and geometry (review focus 2).
- [ ] **Step 3:** Syntax check. Switch Pass, Port, Pass in the pane. Expected: clean console.
- [ ] **Step 4:** Run the spec's checks 1 to 5. Record frame-time medians in the bean's Notes.
- [ ] **Step 5:** Tick the bean's Pass snowbound sub-project 1 line.
- [ ] **Step 6:** Leave Tom's tab on `localhost:8000/.worktrees/stimming-3cmz/viaduct/?scene=pass`.
- [ ] **Step 7:** Commit and push: "Night viaduct, Pass: tune desk, quality ladder; bean ticks snowbound phase 1".
