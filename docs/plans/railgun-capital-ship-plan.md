# Railgun capital ship implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an enemy battleship in orbit as a second Railgun target: a full charge breaks it into five hulks, a tap wounds it, the hulks de-orbit as re-entry streaks and crash far beyond the mesas.

**Architecture:** Pure ship logic (timings, states, fall curves, hull layout) lives in a new `railgun/ship.js` with no three.js import, tested under `node --test`, as `washline/core.js` is. `railgun/index.html` gets a thin target seam (`tgt*` functions) so `fire()`, the aim and the hit stop reading `ast` directly, then the ship's meshes, effects and sound wire into the existing systems: the gun's flat-facet material, `makeTrain`, `makeFragTrail`, `writeStar`, `makeVol`, `rumble`, `busy()`.

**Tech Stack:** three.js 0.170 (BufferGeometryUtils), raw Web Audio through `audioKit()`, `node --test`, headless Playwright with the Chrome channel for the `__qa` checks.

**Spec:** `docs/plans/railgun-capital-ship.md`. Read it before Task 1.

## Global Constraints

- Bean: create a feature bean "Railgun: capital ship" with parent `stimming-ugc4`; worktree `.worktrees/<bean-id>`, branch `feature/<bean-id>`; merge by PR.
- `railgun/index.html` on `main` carries another session's uncommitted edits (2026-11-12). Start only after they land on `main`, or rebase onto them before Task 2.
- Commit through `tools/commit.sh -m "msg" -- <paths>` from the worktree. Never `git add -A`.
- Add no library. The importmap stays word for word.
- Hold 30 fps at a hold and during the shot, at 1280 × 800, rung 0.
- Kill threshold: charge power ≥ 0.85. Below it, a wound. Any hit on a wounded ship kills.
- Hull about 11 km long at about 150 km slant; about 4° across from the eye.
- Five hulks: `prow`, `fore`, `mid`, `drive`, `tower`.
- Fall 60 to 120 s per hulk; first 15 s in vacuum. Impacts 40 to 80 km out. Rumble 15 to 25 s after each flash.
- Next ship: rises for 40 s after the last dust dome settles; Reset skips the wait.
- Nothing on the ship glows until it is damaged. Engines stay dark.
- Code comments: ASD-STE100, one fact per line, twelve words or fewer.
- Rock mode must behave exactly as before: same `__qa` readings, `tests/bar-v2.html` at 98/98.

## Review Focus

1. Target changed mid-flight or mid-breakup: nothing vanishes; the change applies at the next Reset or the next arrival. Test in Task 2.
2. Fire while the ship arrives, breaks up or falls: no hit; the bolt flies on along the bore. Test in Task 4.
3. The tab hides or the toy idles during a 120 s fall: the fall keeps the toy awake; a hidden tab pauses it and it resumes where it was. Test in Task 5.
4. Reset during a fall: hulks, streaks, smoulder, domes and pending rumbles all clear; the next ship arrives at once. Test in Task 6.
5. Night: a far impact does not warm the near plain or the gun (the existing night rule). Test in Task 6.

---

### Task 1: Ship core (`railgun/ship.js`)

**Files:**
- Create: `railgun/ship.js`
- Test: `tests/railgun-ship.test.mjs`

**Interfaces:**
- Produces, all plain numbers and objects, no three.js:
  - `KILL = 0.85`, `ARRIVE = 40`, `VACUUM = 15`, `BREAK = 2`
  - `HULL = { len: 11000, joints: [2440, 150, -2520], sections }`. Hull frame: x runs stern (−5500) to prow tip (+5500), y up, z to starboard. `sections` is one entry per hulk: `{ id, x0, x1, depth }`. Values: prow 2440 to 5500, depth 900; fore 150 to 2440, depth 1200; mid −2520 to 150, depth 1350; drive −5500 to −2520, depth 1850; tower −2300 to −1380, standing 570 on the mid deck.
  - `makeShip(seed: number, t: number) → Ship`. `Ship = { state, t0, wound, hulks, seed }`. `state` is one of `'arrive' | 'station' | 'wounded' | 'breakup' | 'falling' | 'gone'`. `wound` is `null | { joint: number, t0: number }`. `hulks` is five `{ id, fallT, dist, bearing, rumbleDelay, breakAt, landedAt }` with seeded `fallT ∈ [60, 120]`, `dist ∈ [40000, 80000]`, `bearing` in radians spread across the far plain, `rumbleDelay ∈ [15, 25]`, `breakAt` and `landedAt` null.
  - `stepShip(ship, t) → void`: `arrive` → `station` at `t0 + ARRIVE`; `breakup` → `falling` once every `breakAt` passes; `falling` → `gone` when every hulk has `landedAt`. Sets `landedAt` when `hulkAt` says landed.
  - `hitShip(ship, c, t, hitX) → 'kill' | 'wound' | null`: null unless `station` or `wounded`. A kill sets `breakup` and each hulk's `breakAt` from `jointOrder`. A wound sets `wound` to the joint nearest `hitX` and `state = 'wounded'`.
  - `jointOrder(hitX) → Array<{ joint: number, at: number }>`: joints sorted by distance from `hitX`; `at` runs 0 to `BREAK`, linear in that distance.
  - `SHIP_ALT = 300000`: the nominal orbit height in metres, for light only. The drawn ship sits lower; that is the scale cheat.
  - `hulkAt(h, age) → { f, tumble, entry, landed }`: `age` from `breakAt`. `f` is the fall fraction, 0 at age 0 and 1 at `fallT`, slow at first (ease-in). `entry` 0 for `age < VACUUM`, a smoothstep to 1 over the next 10 s. `landed` true at `age ≥ fallT`. `tumble` in radians, slow (under 0.1 rad/s).
  - `driftDeg(t) → number`: degrees of orbit drift, 1° per 60 s.
  - `sunlit(alt: number, sunDeg: number) → number` in [0, 1]: 1 when the sun is up; below the horizon, 1 while `alt > 6371000 * (1 / cos(depression) − 1)`, with a 2 km soft edge.

- [ ] **Step 1: Write the failing tests**

```js
// Run: node --test tests/railgun-ship.test.mjs
test('a hit below 0.85 wounds, a second hit kills', () => {
  const s = makeShip(7, 0); stepShip(s, ARRIVE);
  assert.equal(hitShip(s, 0.5, 50, 1000), 'wound');
  assert.equal(s.state, 'wounded'); assert.equal(s.wound.joint, 150);
  assert.equal(hitShip(s, 0.2, 60, 1000), 'kill'); assert.equal(s.state, 'breakup');
});
test('a full charge kills at once', () => { /* c = 0.85 → 'kill' */ });
test('no hit while arriving, breaking up, falling or gone', () => { /* each → null */ });
test('joints fail outward from the hit within 2 s', () => {
  const o = jointOrder(150);
  assert.equal(o[0].joint, 150); assert.equal(o[0].at, 0);
  assert.ok(o.every(j => j.at >= 0 && j.at <= BREAK)); assert.ok(o[1].at <= o[2].at);
});
test('hulks fall 60 to 120 s and land 40 to 80 km out', () => { /* for seeds 1..50, every hulk in range */ });
test('entry is zero in vacuum and full by 25 s', () => { /* hulkAt(h, 14).entry === 0; hulkAt(h, 25).entry === 1 */ });
test('falling turns gone once every hulk lands', () => { /* stepShip to max fallT + breakAt → 'gone' */ });
test('arrive turns station after 40 s', () => { /* t0 + 39.9 → arrive; t0 + 40 → station */ });
test('sunlit: lit by day and at dusk, dark at deep night', () => {
  assert.equal(sunlit(SHIP_ALT, 10), 1); assert.equal(sunlit(SHIP_ALT, -12), 1);
  assert.equal(sunlit(SHIP_ALT, -25), 0);
});
test('makeShip is deterministic per seed', () => { /* deepEqual on two makeShip(3, 0) */ });
```

- [ ] **Step 2: Run, expect failure**

Run: `node --test tests/railgun-ship.test.mjs`
Expected: FAIL, cannot find module `../railgun/ship.js`.

- [ ] **Step 3: Implement `railgun/ship.js` to the interfaces above**

Use a local seeded generator (the toy's 16807 LCG) so seeds match between node and the page.

- [ ] **Step 4: Run, expect pass**

Run: `node --test tests/railgun-ship.test.mjs`
Expected: all tests pass.

- [ ] **Step 5: Commit** `railgun/ship.js`, `tests/railgun-ship.test.mjs`, the bean.

---

### Task 2: Target setting and the target seam

**Files:**
- Modify: `railgun/index.html` (settings around line 133; `fire` near line 5340; `aimAst` near 3082; the hit in `stepShot` near 5667; `respawn` near 5469; `resetToy` near 5832; `__qa` near 6518)

**Interfaces:**
- Consumes: nothing from Task 1 yet beyond the import.
- Produces:
  - `let tgtKind = 'rock'` (live target) and the stored choice `ui.setting('target')`, values `'rock' | 'ship'`, label *Target*, options *Asteroid* and *Ship*, `persist: true`, `display: 'segments'`.
  - `tgtPos(out) → Vector3`, `tgtLead(T, out) → Vector3` (where the target will be after `0.3 + T` s), `tgtCanHit() → boolean`, `tgtHit(c) → void`. In rock mode each returns what the current code does with `ast` today.
  - `__qa.target(k)`: sets the choice and runs `resetToy()`. `__qa.pick(k)`: sets the stored choice only, as the Settings sheet does. `__qa.tgt()` → `tgtKind`.

- [ ] **Step 1: Write the QA check (Playwright, against `python3 -m http.server 8001`)**

```js
// Rock mode is unchanged.
await qa('__qa.ast().state'); // 'approach'
await qa('__qa.shoot(1)'); await qa('__qa.run(13)');
expect(await qa('__qa.blastState().fire')).toBe(true);
// The choice waits for Reset.
await qa('__qa.pick("ship")');
expect(await qa('__qa.tgt()')).toBe('rock');
await qa('__qa.reset()'); await qa('__qa.run(3)');
expect(await qa('__qa.tgt()')).toBe('ship');
```

- [ ] **Step 2: Run, expect failure** (`__qa.tgt` undefined).
- [ ] **Step 3: Add the setting and route `fire`, `aimAst` and the hit through the four `tgt*` functions.** Ship branches return a parked point and `false` from `tgtCanHit` until Task 3. `tgtKind` takes the stored choice only in `landReset()` and when a ship arrives.
- [ ] **Step 4: Run the QA check and `tests/run.sh`.** Expected: check passes; `DONE 98/98`; clean console.
- [ ] **Step 5: Commit.**

---

### Task 3: The battleship in orbit

**Files:**
- Modify: `railgun/index.html` (new section `/* ---------- the ship: a battleship in orbit ---------- */` after the asteroid section, near line 1798)

**Interfaces:**
- Consumes: `HULL`, `makeShip`, `stepShip`, `driftDeg`, `sunlit` (Task 1); `tgt*` (Task 2).
- Produces:
  - `shipMeshes: THREE.Mesh[5]`, one per hulk id, each pivoted at its own centre.
  - `shipMat`: the gun's flat-facet shader (see `part()` near line 1192) with `uWound: vec4` (joint x, t0, bend, 0), `uEntry: float`, `uLit: float`.
  - `ship: Ship` (from `makeShip`), `SHIP_DIST = 150000`, `placeShip() → void`.
  - `__qa.ship() → { state, wounds, alive, landed, th, entry: number[] }`; `th` is the angular length in degrees.

- [ ] **Step 1: Write the QA check**

```js
await qa('__qa.target("ship")'); await qa('__qa.run(45)');
expect(await qa('__qa.ship().state')).toBe('station');
const th = await qa('__qa.ship().th'); expect(th).toBeGreaterThan(3.5); expect(th).toBeLessThan(4.5);
// In frame at all three sizes: project the hull centre, assert inside the canvas.
// The gun tracks it: __qa.aim().err < 0.004 after 20 s.
```

- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Build the hull from `HULL.sections`.** Each hulk is boxes merged with `BufferGeometryUtils.mergeGeometries`. The detail follows the approved sketch:
  - Prow: split wedge with a dark slot. Fore and mid: stepped plates on the spine.
  - Tower: swept back, with a bridge slit. Drive: four engine bells.
  - Keel fin under fore and mid. Four twin-barrel turrets: three dorsal, one ventral.
  - A faded rust-red band down the flank, as a vertex colour.

  Place the ship 150 km out on the rock's hold bearing, above the cirrus, drifting by `driftDeg`. Haze it through the existing `air` block (near line 750). `uLit` comes from `sunlit(SHIP_ALT, sunDeg)`.
- [ ] **Step 4: Run the QA check. Take stills at 1280 × 800, 375 × 812 and 812 × 375, at Time 0, 0.5 and 1.** Expected: check passes. Day and dusk: amber top edges and a dark belly. Night: a pale sliver. Noon: a faint ghost.
- [ ] **Step 5: Checkpoint with Tom: the look.** Send the stills; adjust before Task 4.
- [ ] **Step 6: Commit.**

---

### Task 3b: Dev menu and the ship's test shot (Tom, 2026-11-12)

Tom asked for the ship in the toy's dev menu, and a test button that makes the ship fire down at the planet. This reverses the spec's "the ship firing back" exclusion for a dev-only test.

**Files:**
- Modify: `shared/stim.js` (`makeRow`: a new `button` row type)
- Modify: `railgun/index.html` (settings array; a new section `/* ---------- the ship's shot: a test round to the plain ---------- */`; `busy()`; `__qa`)

**Interfaces:**
- Consumes: `shipAt` / `tgtPos` (Task 3); `puff`, `writeStar`, `flare`, `cam.shake`.
- Produces:
  - `shared/stim.js`: a settings row `{ type: 'button', id, label, text, onClick }`. It draws a label and an `s2-chip` button and holds no value. Its handle is `{ value: null, set() {}, disabled }`.
  - `railgun/index.html`: the Target row sits in the bar spec's `dev: [...]` rows (the Dev sheet, shown with `?dev`) as `label: 'Target'`, beside `Rock`. A `{ type: 'button', id: 'shipfire', label: 'Ship fires', text: 'Fire' }` dev row follows it. It is enabled only while a ship holds station.
  - `shipShot(): void` starts one round. `stepShipShot(dt)` advances it. `__qa.shipFire()` and `__qa.shipShot() → { state: 'idle' | 'flight' | 'boom', age, pos }`.

- [ ] **Step 1: Write the QA check.**

```js
// Ship mode, at station: __qa.shipFire() → state 'flight'.
// Flight lasts 1.5 to 2.5 s from the ship's belly to the plain.
// The round's screen size grows as it nears; it lands in frame on the plain, 3 to 8 km from the eye, never on the gun.
// After landing: state 'boom'; idle again within 6 s.
// Rock mode: the button is disabled; __qa.shipFire() does nothing.
// bar-v2 still DONE with no FAIL; the button row adds no visible bar control.
```

- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Add the `button` row to `shared/stim.js`.** It is additive; no other toy changes.
- [ ] **Step 4: Build the round.**
  - It leaves the ship's belly as a tiny hot point and accelerates hard: blazing speed, 1.5 to 2.5 s in all.
  - A thin bright streak trails it. It grows naturally by perspective.
  - It lands on the plain in frame, 3 to 8 km from the eye, away from the gun.
- [ ] **Step 5: Build the placeholder "silly" explosion.** A cartoonish pop: an oversized flash, a bouncy ring of dust puffs, a few tumbling K6 sparks, a little camera shake. It clears within 6 s. It is a stand-in to replace later; keep it in one function, `sillyBoom(p)`.
- [ ] **Step 6: Run the QA check and bar-v2. Take stills of mid-flight and the boom at 1280 × 800.**
- [ ] **Step 7: Commit** `shared/stim.js`, `railgun/index.html` and the bean.

---

### Task 4: The hit, the wound and the breakup

**Files:**
- Modify: `railgun/index.html` (the ship section; `fire`; `stepShot`; K6 `writeStar` calls)

**Interfaces:**
- Consumes: `hitShip`, `jointOrder`, `KILL`, `BREAK` (Task 1); `shipMeshes`, `shipMat.uWound`, `__qa.ship` (Task 3).
- Produces: `shipHit(c) → void` behind `tgtHit`; `stepShipFx(dt) → void`, called from `stepAst`; `__qa.ship().wounds`; `canHit` added to the `__qa.shot()` result.

- [ ] **Step 1: Write the QA check**

```js
// Full charge kills; five hulks part within 2 s of the hit.
await qa('__qa.target("ship")'); await qa('__qa.run(45)');
await qa('__qa.shoot(1)'); const hitT = await qa('__qa.shot().hitT');
await qa(`__qa.run(${hitT + 2.6})`);
expect(await qa('__qa.ship().state')).toBe('falling');
expect(await qa('__qa.blastState().fire')).toBe(false); // no fireball in vacuum
// A tap wounds; the next tap kills.
// (fresh ship) __qa.shoot(0.5) → state 'wounded', wounds 1; __qa.shoot(0.3) → 'breakup'.
// Review Focus 2: shoot while 'arrive' and while 'falling' → __qa.shot().canHit false, state unchanged.
```

- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement the kill.**
  - `tgtLead` aims at the mid hull. `fire` keeps its 11.5 to 8.5 s flight.
  - The hit: `hitFlash` without the 5 s tail and no `blastFx`, so there is no fireball, shell or soot. A white flare and a sub-second vapour sphere.
  - The spray: straight K6 stars with no gravity.
  - The joints: each fails at its `jointOrder` time with a short flash and thrown plate stars.
- [ ] **Step 4: Implement the wound.** One plate is thrown off. The joint smoulders dull red for 20 s through `uWound`. Vertices aft of the joint bend 4°. The ship sinks 3° down its orbit.
- [ ] **Step 5: Run the QA check.** Take stills at hit + 0.2 s, + 1 s and + 3 s. Expected: pass; clean console.
- [ ] **Step 6: Commit.**

---

### Task 5: De-orbit and the re-entry streaks

**Files:**
- Modify: `railgun/index.html` (ship section; `busy()` near line 5906; `resize` rung block near 3118)

**Interfaces:**
- Consumes: `hulkAt`, `VACUUM` (Task 1); `stepShipFx` (Task 4); `makeTrain(pu)` (near line 1883); `makeFragTrail(true)` (near 2105); `shedSpark`.
- Produces: `shipTrains: Array<{ m, pu, cheap: boolean }>`, `shipBusy() → boolean`, added as one term in `busy()`.

- [ ] **Step 1: Write the QA check**

```js
// After a kill: entry 0 at 14 s, 1 at 25 s; streaks visible after entry.
// Rungs: ?rung=0 → five raymarched trains; ?rung=2 → three trains plus two cheap trails.
// Review Focus 3: ?sleep=2500, kill, idle 40 s → __qa.draws() still grows.
// Hide the tab 10 s, show it: hulk drop unchanged across the hidden span.
// Performance: rung 0 at 1280 × 800, 30 fps across a full fall.
```

- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Move each hulk by `hulkAt`.** Each tumbles slowly; under reduced motion there is no tumble. Sparks vent while `entry` is 0. `uEntry` lights the leading face.
- [ ] **Step 4: Give each hulk a streak.** Rungs 0 and 1: `makeTrain` with its own uniforms. Rungs 2 and 3: `makeTrain` for mid, drive and fore; `makeFragTrail(true)` for prow and tower. Every train takes the rung's step counts. Shed pieces feed `shedSpark`.
- [ ] **Step 5: Add `shipBusy()`.** It is true while any hulk falls or smoulders, any dome rises, or any rumble is pending.
- [ ] **Step 6: Run the QA check and the fps check.** Expected: pass; 30 fps.
- [ ] **Step 7: Commit.**

---

### Task 6: Impacts, Reset and the next ship

**Files:**
- Modify: `railgun/index.html` (ship section; `resetToy`, `landReset`; VOLFX `makeVol` near 3915)

**Interfaces:**
- Consumes: hulk `dist`, `bearing`, `landedAt`, `rumbleDelay` (Task 1); `makeVol`; `rumble(c)` (near 6432).
- Produces: `shipDomes: Array<{ m, t0 }>`; `clearShip() → void`, called from `resetToy`.

- [ ] **Step 1: Write the QA check**

```js
// Each landing: a dome appears at dist 40–80 km; rumble queued at landedAt + rumbleDelay.
// 'gone' + domes settled → a new ship in 'arrive'; 40 s later 'station'.
// Review Focus 4: Reset mid-fall → alive 0, domes 0, __qa.audio().pend 0, state 'arrive'.
// Review Focus 5: Time 0, an impact at night → plain and gun luminance unchanged in a still crop.
```

- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Build the landing.** A horizon flash that lights the cloud bases only, a rising dust dome made with `makeVol`, and a delayed `rumble` per hulk.
- [ ] **Step 4: Bring the next ship.** A dome lives 60 s. The next ship starts its 40 s rise once the last dome is 60 s old; `tgtKind` takes a stored change here. `clearShip` runs from Reset.
- [ ] **Step 5: Run the QA check.** Take stills at night and at dusk. Expected: pass.
- [ ] **Step 6: Commit.**

---

### Task 7: Sound

**Files:**
- Modify: `railgun/index.html` (sound section, after `rumble` near 6432)

**Interfaces:**
- Consumes: the sound scaffolding: `track(end, ...nodes)`, `filt`, `hiss`, `echo`, `kit`.
- Produces: `shipCrack(ac)`, `jointThud(ac, k)`, `entryRoar(ac, i)`, `shipRumble(ac, k)`. Each registers with `track` so `pending()` and mute hold.

- [ ] **Step 1: Write the QA check**

```js
// Kill with sound on: crack scheduled hitT + 4 s; one thud per joint; five roars; five rumbles.
// Mute mid-fall → __qa.audio().pend reaches 0 within 1 s; context suspends after the last rumble.
```

- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement the four voices.**
  - Crack: thinner than `impact.mp3`.
  - Thuds: low and muffled, out of sync with the flashes.
  - Roars: a tearing groan, then a roar that builds over 20 s, all into one bus.
  - Rumbles: the existing rumble, lower and longer.
- [ ] **Step 4: Run the QA check.** Tom checks by ear on a real device.
- [ ] **Step 5: Commit.**

---

### Task 8: Reduced motion, full QA, review, PR

**Files:**
- Modify: `railgun/index.html` (as findings need), `.beans/<feature-bean>.md`, `.beans/stimming-ugc4--railgun-enemy-capital-ship-target.md`

- [ ] **Step 1: Reduced motion.** Expected: no tumble, flashes halved, shed pieces do not spin. Clean console.
- [ ] **Step 2: Run Q1 to Q10.** Use 1280 × 800, 375 × 812 and 812 × 375 on rungs 0 to 3, in both target modes. Then `node --test tests/railgun-ship.test.mjs` and `tests/run.sh` (98/98).
- [ ] **Step 3: Get a fresh-eyes review of the branch.** Fix the findings.
- [ ] **Step 4: Update both beans and open the PR.**
