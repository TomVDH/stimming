# Night viaduct, Port polish: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the Port glows only from real sources, the causeway ends in a lit terminal portal, and the train and the ride camera move smoothly.

**Architecture:** all work sits in `viaduct/port.js` (scene, bake, motion, chase) and `viaduct/index.html` (frame loop, post chain). The still layer stays baked; the portal joins it. Motion changes stay inside `update()` and `updateChase()`.

**Tech stack:** three.js 0.170.0 (ShaderMaterial, EffectComposer, UnrealBloomPass), plain ES modules, no build step.

**Spec:** [viaduct-port-polish.md](viaduct-port-polish.md)

## Global constraints

- Touch only `viaduct/`, this plan, the spec and bean `stimming-3cmz`. No shared files.
- Library set is fixed: three.js 0.170.0 for this toy. Add no library.
- Code comments: ASD-STE100, one fact per line, twelve words or fewer.
- Tom said no Playwright. Check in the browser pane while it is visible; a hidden pane stops `requestAnimationFrame`.
- Syntax check for every task: copy `viaduct/port.js` to the scratchpad as `port.mjs` and run `node --check`. Expected: exit 0.
- Commit by explicit path, never `git add -A`. `git pull --ff-only` before `git push`.
- QA URLs: `?train=<s>` parks the train; `?ride` starts a ride at load. Never leave them loaded in Tom's tab.

## Review focus

1. **A resize during a ride.** `bake()` runs with the wide camera, then the ride must keep live mode. Expect the ride to go on with no black frame.
2. **Tom's saved tune values.** `localStorage` keys `stimming.viaduct.tune.port` override defaults after build. Expect a parked train (`?train`) to stay parked at speed 80.
3. **Pause 0.** Expect the train to wait at least 1 s in the portal, then come back.
4. **The light list cap.** `NL = 24`; lights past 24 drop silently. Expect `lights.length <= 24` after the portal light joins.
5. **A tap during the ease out.** Expect no new ride until the camera is back on the wide shot.

---

### Task 1: Glow classes, orb cap, bloom

**Files:**
- Modify: `viaduct/port.js` (the `flare()` helper near line 606, `flareMat`, every light site in the spec's table, the `post` return)

**Interfaces:**
- Produces: `pin(p: Vector3, c: number[3])` beside `flare(p, c, size)`. Both write to the one `flares` point set; an `aPin` float attribute (0 flare, 1 pin) tells them apart.

- [ ] **Step 1:** Add the `aPin` attribute to the flare point geometry. `flare()` pushes 0; `pin()` pushes 1 with size 14.
- [ ] **Step 2:** In `flareMat`, a pin draws the core only (`exp(-dot(c, c) * 60.0)`), clamps its point size to 3 px, and clamps its colour so its luminance stays under 0.7.
- [ ] **Step 3:** Change each light site to match the spec's table. Catenary masts: delete the call. Red tops: `flare` when the index is even, `pin` when odd.
- [ ] **Step 4:** After the port is built, keep the train head orb plus the 5 static orbs with the largest `k * size`. Remove the rest from `orbs`.
- [ ] **Step 5:** Set `post.bloom` to `[0.9, 0.6, 1.6]` as a start, then tune by eye in the pane until only flare cores and the flame bloom.
- [ ] **Step 6:** Syntax check. Load `localhost:8000/viaduct/?scene=port` in the pane. Expected: clean console; no catenary flares; crane booms show small pins with no halo.
- [ ] **Step 7:** Commit `viaduct/port.js`: "Night viaduct, Port: flares only on real lamps; pins for the rest".

### Task 2: Terminal portal

**Files:**
- Modify: `viaduct/port.js` (causeway block, `castParts`, `glowParts`, light list, `END`)

**Interfaces:**
- Consumes: `sweep(prof, s0, s1, step)`, `atX(s, side)`, `cone(pos, dir, len, halfAngle, color, k, fallK)`, `addLight(pos, col, power, range, dir, cos)`.
- Produces: `PORTAL_S = LEN + 10`, the mouth's place on the track. `slab(s0, s1, u0, u1, y0, y1)`: a box on the straight track past `LEN`, pushed to `castParts` with `aSU = (s, 99)`, so it takes no joints.

- [ ] **Step 1:** Embankment: `sweep([[-10, -3.6], [10, -3.6], [13, -30], [-13, -30]], LEN - 40, PORTAL_S, 4)`.
- [ ] **Step 2:** Block, with `slab()`, from `PORTAL_S` to `PORTAL_S + 80`, 60 m wide, from y 0 to y 42. The mouth is a gap 9 m wide (u -4.5 to 4.5) from the deck (y 24) to y 32. Build it as three slabs: left wall, right wall, lintel.
- [ ] **Step 3:** Mouth light: a warm emissive plane in `glowParts` across the gap, 30 m inside. Add one `addLight` at the mouth, warm `[1, 0.72, 0.42]`, power 3, range 30, aimed back down the track. Add one `cone()` from the mouth along the track toward the camera, half angle 0.35, `k` 0.25.
- [ ] **Step 4:** Set `END = PORTAL_S + 20`.
- [ ] **Step 5:** Syntax check. In the pane, log `lights.length` once through a temporary `console.log`. Expected: 24 or fewer. Remove the log.
- [ ] **Step 6:** Screenshot the wide shot. Expected: the deck lands on the embankment and runs into a lit mouth; mouth light lies on the last 40 m of deck.
- [ ] **Step 7:** Commit `viaduct/port.js`: "Night viaduct, Port: the causeway ends in a lit terminal portal".

### Task 3: Train speed profile

**Files:**
- Modify: `viaduct/port.js` (`update()`, `run`, `speed()`, `sendTrain()`)

**Interfaces:**
- Produces: `trainSpeed(s: number, dir: number, t: number): number`, the speed in m/s at track place `s`, `t` seconds after the train left its end.

- [ ] **Step 1:** Implement `trainSpeed`. It returns the cruise speed `speed()` times `min(smooth(t / 6), smooth(d / 220))`, where `d` is the distance left to the end the train is heading for, and `smooth` is smootherstep. The result never drops below 0.6 m/s while `d > 0`, so the train always arrives.
- [ ] **Step 2:** `update()` moves the train by `trainSpeed(...) * dt * k`. The wait lasts `max(1, runPause)` seconds.
- [ ] **Step 3:** Syntax check. In the pane, send a train with `+ Train`. Expected: it slows into the portal, hides, waits, and comes back out from rest.
- [ ] **Step 4:** Check review focus 2 and 3: open `?train=-40`, wait 5 s. Expected: the train stays parked. Set Pause to 0 in `?tune`. Expected: the train still waits 1 s.
- [ ] **Step 5:** Commit `viaduct/port.js`: "Night viaduct, Port: the train speeds up and brakes at each end".

### Task 4: Ride camera on springs

**Files:**
- Modify: `viaduct/port.js` (the chase block: `updateChase()`, `startChase()`, `IN`, `OUT`)

**Interfaces:**
- Consumes: `trainSpeed()` from Task 3 for the camera's roll speed.
- Produces: `spring(cur: Vector3, vel: Vector3, goal: Vector3, dt: number, tau = 0.35)`, a critically damped step that changes `cur` and `vel` in place.

- [ ] **Step 1:** Implement `spring()` with the closed form of a critically damped spring, `omega = 2 / tau`.
- [ ] **Step 2:** `IN = 2.2`, `OUT = 2.6`. `smooth` becomes smootherstep.
- [ ] **Step 3:** The blended goal position rises by `12 * sin(PI * k)` metres on the way in and out. Position and aim follow `spring()` toward their goals; at ride start, both springs start at the wide camera.
- [ ] **Step 4:** A tap while `chase.mode === 2` does nothing (review focus 5).
- [ ] **Step 5:** Syntax check. Open `?ride` with the pane visible. Expected: the camera lifts, arcs down beside the train, and holds it in frame as it passes; no snap at nose or tail.
- [ ] **Step 6:** Resize the pane during the ride (review focus 1). Expected: the ride goes on.
- [ ] **Step 7:** Commit `viaduct/port.js`: "Night viaduct, Port: the ride camera follows springs on an arc".

### Task 5: Frame rate

**Files:**
- Modify: `viaduct/port.js` (`setLive()`, `K2_HAZE`'s `k2portFog`)

- [ ] **Step 1:** In live mode, wrap `mirror` so it renders on every second call. The sea keeps the last mirror on the other frames.
- [ ] **Step 2:** `k2portFog` returns 0.0 at once when `uPortFog <= 0.0`.
- [ ] **Step 3:** Syntax check. In the visible pane, log frame intervals for 3 s in the wide shot and 3 s during a ride. Expected: both medians at the display rate or within 10 % of it on Tom's Mac.
- [ ] **Step 4:** Write both medians into the bean's Notes.
- [ ] **Step 5:** Commit `viaduct/port.js` and the bean: "Night viaduct, Port: half-rate mirror on rides; fog march skips when off".

### Task 6: Edges and shimmer

**Files:**
- Modify: `viaduct/port.js` (rail parts, `precast` joint fade), `viaduct/index.html` (`chain()` MSAA samples)

**Interfaces:**
- Consumes: `quality()` from `../shared/stim.js` (returns `'high'` or `'standard'`).

- [ ] **Step 1:** Rails get their own `railMat`: the steel look of `steel`, times a coverage factor `clamp(0.14 / fwidth(across) , 0, 1)`, so a rail thinner than a pixel dims instead of breaking into dashes. Rail geometry carries an `aAcross` attribute (offset from the rail centre in metres).
- [ ] **Step 2:** In `precast`, the joint fade becomes `smoothstep(0.2, 0.8, aa)`.
- [ ] **Step 3:** In `chain()`, samples are 4 when `quality() === 'high'` and the rung is 0; 2 on Standard; 0 at rung 3.
- [ ] **Step 4:** Syntax check, both files. Screenshot the wide shot and a ride. Expected: rails read as continuous lines; joints do not crawl.
- [ ] **Step 5:** Commit `viaduct/port.js` and `viaduct/index.html`: "Night viaduct, Port: rails and joints stop shimmering; 4x MSAA on High".

### Task 7: Close-out

**Files:**
- Modify: `.beans/stimming-3cmz--toy-night-viaduct.md`

- [ ] **Step 1:** Run the spec's checks 1 to 5 in the visible pane.
- [ ] **Step 2:** Tick the bean's Death Stranding and Chase cam lines; add "Polish pass: glow, portal, smoothness" as done. Add the open sub-projects 2 and 3 as unchecked lines.
- [ ] **Step 3:** Leave Tom's tab on `localhost:8000/viaduct/?scene=port&tune`.
- [ ] **Step 4:** Commit the bean and push.
