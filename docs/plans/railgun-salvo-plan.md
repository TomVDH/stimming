# Railgun Salvo implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Salvo, a second Railgun fire mode: the hold banks up to five rounds, the release ripples them out, and the rounds crater the rock, break it, then hunt its big chunks.

**Architecture:** Pure Salvo logic (bank table, launch times, recoil curve, damage tally, round gain) lives in a new `railgun/salvo.js` with no three.js import, tested under `node --test`, as `railgun/ship.js` and `washline/core.js` are. In `railgun/index.html`, `shot` stays the gun's one firing cycle (muzzle, recoil, vents, case, Reset glow). The bolts it fires live in a global `rounds[]` list, each with its own bolt ribbon, ion trail and Mach ring. Rail is a cycle with one round.

**Tech Stack:** three.js 0.170, raw Web Audio through `audioKit()`, `node --test`, headless Playwright (Chrome channel, GPU flags from AGENTS.md) for the `__qa` checks.

**Spec:** `docs/plans/railgun-salvo.md`. Read it before Task 1.

## Global Constraints

- Bean: create a feature bean "Railgun: Salvo fire mode" (no parent; note its id in `stimming-e39e`). Worktree `.worktrees/<bean-id>`, branch `feature/<bean-id>`; merge by PR.
- `railgun/index.html` is edited by other sessions (sound branch `claude/railgun-sound-3af021`, the sight session, the ship feature `feature/stimming-x3wl`). Merge `origin/main` into the feature branch before each task. Keep hunks scoped to Salvo.
- Commit through `tools/commit.sh -m "msg" -- <paths>` from the worktree. Never `git add -A`.
- Add no library. The importmap stays word for word.
- Hold 30 fps through the hold and with five rounds in flight, at 1280 × 800, rung 0.
- Bank times (hold seconds): `[2.41, 5.5, 8.6, 12.6, 14.6]`. 2.41 is `heldOf(ARM)`, the arm point.
- Round power `0.35`. Kill line `1.0`. Launch gap `0.5` s. Round 1 leaves at `0.3` s.
- The kill line applies to Salvo rounds only. Any armed Rail hit breaks the rock, as today.
- Recoil: round k slides `k / 5` of `SALVO_CAP`. `SALVO_CAP` is the clearance point Tom confirms in Task 4.
- The rock throws three big chunks (`chunks`, length 3). Hunts take them biggest first.
- Rail must behave as before: the same `__qa` readings for one shot, `tests/bar-v2.html` green. One deliberate change: a fire is dropped only while the last cycle's rounds still launch.
- Fire mode selector: an interim Settings choice until the sight session's HUD lands. The HUD selector is out of scope.
- Code comments: ASD-STE100, one fact per line, twelve words or fewer.
- QA checks: `const qa = e => page.evaluate(e)` against `python3 -m http.server 8001`, `?` plus `__qa.freeze()` for stills.

## Review Focus

1. A second salvo on a cratered rock: the press charges and the release fires as soon as the earlier rounds have all launched. It never drops silently. Test in Task 3.
2. A vent or a lost window with rounds banked: the bank empties, no round fires, the hum groans. Test in Task 2.
3. The mode changes mid-hold or mid-ripple: the change applies at the next press. Test in Task 2.
4. Reset with rounds in flight: rounds, bolts, ion trails, rings, craters, the tally and pending sounds all clear. Test in Task 5.
5. A new rock after a cratered one: no craters and a tally of 0. A Free-aim round off the disc flies on and does no damage. Test in Task 5.

---

### Task 1: Salvo core (`railgun/salvo.js`)

**Files:**
- Create: `railgun/salvo.js`
- Test: `tests/railgun-salvo.test.mjs`

**Interfaces:**
- Produces, plain numbers and objects, no three.js:
  - `BANK = [2.41, 5.5, 8.6, 12.6, 14.6]`, `ROUND_C = 0.35`, `KILL_LINE = 1.0`, `GAP = 0.5`, `LAUNCH = 0.3`, `MAX_ROUNDS = 5`
  - `bankAt(held: number) → 0..5`: the count of `BANK` entries at or below `held`.
  - `launchAt(j: number) → number`: seconds after the release for round j (1-based): `LAUNCH + GAP * (j − 1)`.
  - `recoilAt(age: number, n: number, cap: number) → number`: the slide in metres, `age` from the release.
  - `makeTally(chunks = 3) → { dmg: 0, broken: false, hunted: 0, chunks }`
  - `landRound(tally, c: number) → 'crater' | 'break' | 'hunt' | 'miss'`: before the break, add `c` to `dmg`; `dmg ≥ KILL_LINE − 1e-9` sets `broken` and returns `'break'`, else `'crater'`. After the break, `'hunt'` while `hunted < chunks` (increments `hunted`), then `'miss'`.
  - `roundGain(j: number, n: number) → number`: `0.45 + 0.55 * j / MAX_ROUNDS`. The last round of a full bank is 1.

`recoilAt` is the one algorithm the signature does not fix:

```js
// Round j kicks to j/5 of the cap when it leaves the muzzle.
// Early rounds hold 0.15 s and return with a 0.6 s time constant.
// The last round holds 0.6 s and runs out over 3.5 s, as Rail does.
const kick = (t, hold, tau) => t <= 0 ? 0 : (1 - Math.exp(-t / 0.06)) * Math.exp(-Math.max(0, t - hold) / tau);
// slide = cap * max over j in 1..n of (j / 5) * kick(age - launchAt(j), last ? 0.6 : 0.15, last ? 3.5 : 0.6)
```

- [ ] **Step 1: Write the failing tests**

```js
// Run: node --test tests/railgun-salvo.test.mjs
test('the hold banks rounds at the table times', () => {
  assert.equal(bankAt(2.3), 0); assert.equal(bankAt(2.41), 1); assert.equal(bankAt(8.6), 3); assert.equal(bankAt(16), 5);
});
test('rounds launch 0.5 s apart from 0.3 s', () => { assert.deepEqual([1, 2, 5].map(launchAt), [0.3, 0.8, 2.3]); });
test('a fresh rock: crater, crater, break, hunt, hunt', () => {
  const t = makeTally(); assert.deepEqual([1, 2, 3, 4, 5].map(() => landRound(t, ROUND_C)), ['crater', 'crater', 'break', 'hunt', 'hunt']);
});
test('a wounded rock breaks on round 1; three hunts, then a miss', () => {
  const t = makeTally(); landRound(t, ROUND_C); landRound(t, ROUND_C);
  assert.deepEqual([1, 2, 3, 4, 5].map(() => landRound(t, ROUND_C)), ['break', 'hunt', 'hunt', 'hunt', 'miss']);
});
test('recoil rises round by round and peaks near the cap', () => {
  const peak = j => Math.max(...Array.from({ length: 60 }, (_, i) => recoilAt(launchAt(j) + i * 0.01, 5, 300)));
  assert.ok(peak(1) < peak(2) && peak(4) < peak(5)); assert.ok(Math.abs(peak(5) - 300) < 3);
});
test('between rounds the barrel gets partway home', () => {
  const s = recoilAt(launchAt(2) - 0.01, 5, 300); assert.ok(s > 5 && s < 60);
});
test('a three-round bank stops at three fifths of the cap', () => {
  assert.ok(Math.abs(Math.max(...Array.from({ length: 400 }, (_, i) => recoilAt(i * 0.01, 3, 300))) - 180) < 3);
});
test('the last round runs out slowly', () => { assert.ok(recoilAt(launchAt(5) + 3, 5, 300) > 100); });
test('round gain rises to 1', () => { assert.ok(roundGain(1, 5) < roundGain(5, 5)); assert.ok(Math.abs(roundGain(5, 5) - 1) < 1e-12); });
```

- [ ] **Step 2: Run, expect failure.** Run: `node --test tests/railgun-salvo.test.mjs`. Expected: FAIL, cannot find module `../railgun/salvo.js`.
- [ ] **Step 3: Implement `railgun/salvo.js` to the interfaces above.**
- [ ] **Step 4: Run, expect pass.** Expected: all tests pass.
- [ ] **Step 5: Commit** `railgun/salvo.js`, `tests/railgun-salvo.test.mjs`, the bean.

---

### Task 2: Fire mode and banking

**Files:**
- Modify: `railgun/index.html` (settings near line 133; the charge section near 3270 to 3470: `act.press`, `act.release`, `vent`, `cancelHold`, `stepCharge`; `__qa` near 6590)

**Interfaces:**
- Consumes: `bankAt`, `BANK` from Task 1 (`import … from './salvo.js'`).
- Produces:
  - Settings choice `{ type: 'choice', id: 'firemode', label: 'Fire', display: 'segments', value: 'rail', persist: true, options: Rail, Salvo }`. Interim, until the HUD selector.
  - `let fireMode = 'rail'`. It takes the stored choice only in `act.press`, so a pick mid-hold or mid-ripple waits.
  - `charge.bank: number` (0 to 5), Salvo only.
  - `act.release` in Salvo calls `fire(ROUND_C, charge.bank)`; `bank === 0` fizzles.
  - `__qa.mode(m)` sets the choice; `__qa.fireMode()` → `fireMode`; `__qa.bank()` → `charge?.bank ?? 0`.

- [ ] **Step 1: Write the QA check**

```js
await qa('__qa.mode("salvo")'); await qa('__qa.hold(9)'); await qa('__qa.run(0.1)');
expect(await qa('__qa.bank()')).toBe(3);
// A pick mid-hold waits for the next press.
await qa('__qa.mode("rail")'); expect(await qa('__qa.fireMode()')).toBe('salvo');
// A vent empties the bank and fires nothing.
await qa('__qa.mode("salvo")'); await qa('__qa.jump(8)');
expect(await qa('__qa.stage()')).toBe('vent'); expect(await qa('__qa.bank()')).toBe(0); expect(await qa('__qa.shot()')).toBe(null);
// Rail is unchanged.
await qa('__qa.reset()'); await qa('__qa.mode("rail")'); await qa('__qa.charge(1)');
expect(await qa('__qa.level()')).toBeCloseTo(1, 2); expect(await qa('__qa.bank()')).toBe(0);
```

- [ ] **Step 2: Run, expect failure** (`__qa.mode` undefined).
- [ ] **Step 3: Implement.** In `stepCharge`, when `bankAt(held)` passes `charge.bank`, raise it and give the arm cue for each new round: `cam.shake += 0.25`, two `spawnArc`, `dustPulse(0.9)`, `armSound()`. Rail keeps its one arm cue. `vent()` and `cancelHold()` already drop `charge`; the bank goes with it.
- [ ] **Step 4: Run the QA check and `tests/run.sh`.** Expected: check passes; bar-v2 green; clean console.
- [ ] **Step 5: Commit.**

---

### Task 3: Rounds in flight

**Files:**
- Modify: `railgun/index.html` (the bolt near 3590 to 3650; the ion trail near 3660 to 3815; `boltAt`, `fire` near 5390 to 5450; `stepShot` near 5630 to 5755; `updateBolt` near 5760; `resetToy` near 5948)

**Interfaces:**
- Consumes: `launchAt`, `GAP` from Task 1; `charge.bank` and `fire(c, n)` from Task 2.
- Produces:
  - `const rounds = []`. A round: `{ j, n, c, t0, T, launchT, hitT, muzzle, target, canHit, hit, chunk: -1, res: null, bolt, ion }`. `t0` is the release time. The round leaves at `t0 + launchT` and lands at `t0 + launchT + T`.
  - `fire(c, n = 1)`: Rail calls `fire(c)`; Salvo calls `fire(ROUND_C, bank)`. It creates the cycle `shot` and `n` rounds. It returns early only while the previous cycle has rounds still to launch. A new cycle ejects any case the old one still holds.
  - The target seam: if `main` has `tgtPos`, `tgtLead`, `tgtCanHit`, `tgtHit` (ship feature, commit 7cfabd1), use them. If not, add them here with the same signatures and rock branches only. Each round takes `tgtLead(T)` and `tgtCanHit()` at its own launch, so Track mode leads each round.
  - `roundAt(r, t, out) → Vector3`: `boltAt` for one round; `t` from the round's launch.
  - `makeBolt()`, `makeIon()`: factories for one ribbon and one ion trail. A pool of `MAX_ROUNDS` each. Rail uses slot 0, so its look is unchanged.
  - `shot` keeps `hit`, `hitT`, `canHit` as the cycle's decisive hit: the break round if one breaks, else the last round. Vents, case, Reset glow and the blast light read those, as today.
  - `__qa.rounds()` → `rounds.map(r => ({ j: r.j, age: simT - r.t0, hit: r.hit, res: r.res }))`; `__qa.salvo(n)` sets Salvo and calls `fire(ROUND_C, n)`, as `__qa.shoot` calls `fire(c)`.
  - A round leaves `rounds` 16 s after its hit, when its ion trail ends.
  - `busy()` stays true while any round is in `rounds`.
  - On rungs 2 and 3, the ion trails of rounds 2 to 5 draw at half width.

- [ ] **Step 1: Write the QA check**

```js
await qa('__qa.mode("salvo")'); await qa('__qa.salvo(3)'); await qa('__qa.run(2.5)');
expect((await qa('__qa.rounds()')).length).toBe(3);
expect(await qa('__qa.ion().visible')).toBe(true);
await qa('__qa.run(12)');
expect((await qa('__qa.rounds()')).every(r => r.hit)).toBe(true);
// A second salvo fires once the first has launched.
await qa('__qa.salvo(1)'); await qa('__qa.run(0.5)');
expect((await qa('__qa.rounds()')).length).toBe(4);
// Rail: one round, same flight and hit times as before.
await qa('__qa.reset()'); await qa('__qa.mode("rail")'); await qa('__qa.shoot(1)');
expect(await qa('__qa.shot().T')).toBeCloseTo(8.5, 2); expect(await qa('__qa.shot().hitT')).toBeCloseTo(8.8, 2);
```

- [ ] **Step 2: Run, expect failure** (`__qa.rounds` undefined).
- [ ] **Step 3: Move the per-bolt state from `shot` to rounds.** `updateBolt` and `updateIon` loop over live rounds. The head flare and glints follow the leading round in flight. Hits still call `tgtHit(c)` on the first `canHit` round; Task 5 replaces that with the tally.
- [ ] **Step 4: Run the QA check, `tests/run.sh`, and Rail stills at 1280 × 800 before and after.** Expected: check passes; Rail stills match at release, at 4 s and at the hit.
- [ ] **Step 5: Commit.**

---

### Task 4: The gun through the ripple

**Files:**
- Modify: `railgun/index.html` (`U.uShock` near 302; ground shader near 803 to 897; `stepShot` recoil and kick near 5714 to 5735; `updateMuzzle(ma, c, m0)` near 4800; `blast(sh)` near 5756)

**Interfaces:**
- Consumes: `recoilAt` from Task 1; `rounds` from Task 3.
- Produces:
  - `const SALVO_CAP` (metres): the clearance point.
  - `U.uShocks: vec4[5]` replaces `U.uShock`: one Mach ring per round. The vent uses slot 0. The ground shader loops over the five.
  - Each round restarts the muzzle effects: `updateMuzzle` reads `ma` from the newest launched round. Each launch runs `blast` at that round's power.
  - `__qa.slide(m)`: poses `U.uRecoil` at m metres and draws, for the clearance stills.
  - `__qa.cap()` → `SALVO_CAP`.

- [ ] **Step 1: Find the clearance point.** Take stills with `__qa.slide(m)` for m from 120 to 400 in steps of 20, at 1280 × 800 and 375 × 812. Find the first m where the breech clips the mount.
- [ ] **Step 2: Checkpoint with Tom.** Send the stills. Tom confirms `SALVO_CAP`. Record it in the bean.
- [ ] **Step 3: Write the QA check**

```js
await qa('__qa.mode("salvo")'); await qa('__qa.salvo(5)');
const peaks = [];
for (let j = 1; j <= 5; j++) { await qa('__qa.run(0.5)'); peaks.push((await qa('__qa.recoil()')).slide); }
expect(peaks.every((p, i) => i === 0 || p > peaks[i - 1])).toBe(true);
expect(Math.max(...peaks)).toBeLessThanOrEqual((await qa('__qa.cap()')) + 1);
```

- [ ] **Step 4: Run, expect failure.**
- [ ] **Step 5: Implement.** In Salvo, `U.uRecoil = reduced() ? 0 : recoilAt(age, n, SALVO_CAP)`. The cradle kick uses the newest round with Rail's formula at power `j / 5`. Rail keeps its own recoil line.
- [ ] **Step 6: Run the check and take a 5-round still sequence at 1280 × 800.** Expected: check passes; five muzzle flashes and five rings; no clipping.
- [ ] **Step 7: Commit.**

---

### Task 5: Crater, break, hunt

**Files:**
- Modify: `railgun/index.html` (`astMat` near 1731; `stepAst`/`placeAst`; `shatter(c)` near 5414; `stepChunks` near 5328; `respawn` near 5500; `resetToy`)

**Interfaces:**
- Consumes: `makeTally`, `landRound`, `ROUND_C` from Task 1; `rounds` from Task 3.
- Produces:
  - `ast.tally = makeTally(chunks.length)`. `respawn()` and `resetToy()` renew it.
  - On each Salvo round's hit: `r.res = landRound(ast.tally, r.c)`. A Rail hit calls `tgtHit(c)` as today.
  - `'crater'`: `addCrater(P)`. It writes `uCrater: vec4[2]` on `astMat` (xyz the hit's direction in rock space, w the hit time; `w < 0` is off). Two slots suffice: a third crater round breaks the rock. The spot glows white, then dull red, over 20 s. It throws 40 burning pips with `writeStar`. `hitFlash = max(hitFlash, 0.33)`. `ast.jolt` (a Vector3) pushes the rock; it decays with a 1.5 s time constant in `placeAst`.
  - `'break'`: `tgtHit(Math.min(1.25, ast.tally.dmg))`. The rounds still in flight take `r.chunk` biggest first. Their `target` moves to the chunk's place at their hit time (`shardAt`).
  - `'hunt'`: `burstChunk(ci)`: a flare, 70 embers (as `updateBursts` writes), `ch.burstAt = simT`. The chunk's trail fades as a landed trail does. It gets no ember pool. Its shard instance takes radius 0.
  - `'miss'`: nothing; the round flies on.
  - `__qa.tally()` → `{ ...ast.tally }`; `__qa.craters()` → the count of lit spots.
  - `busy()` stays true while a crater glows.

- [ ] **Step 1: Write the QA check**

```js
await qa('__qa.reset()'); await qa('__qa.mode("salvo")'); await qa('__qa.salvo(2)'); await qa('__qa.run(14)');
expect(await qa('__qa.tally().dmg')).toBeCloseTo(0.7, 5); expect(await qa('__qa.craters()')).toBe(2);
expect(await qa('__qa.ast().state')).not.toBe('shatter');
await qa('__qa.salvo(4)'); await qa('__qa.run(14)');
expect((await qa('__qa.rounds()')).slice(-4).map(r => r.res)).toEqual(['break', 'hunt', 'hunt', 'hunt']);
expect(await qa('__qa.ast().state')).toBe('shatter');
// Reset clears everything.
await qa('__qa.salvo(5)'); await qa('__qa.run(4)'); await qa('__qa.reset()');
expect(await qa('__qa.rounds().length')).toBe(0); expect(await qa('__qa.tally().dmg')).toBe(0); expect(await qa('__qa.craters()')).toBe(0);
// Free aim off the disc: no damage.
await qa('__qa.aimFree(40, 10)'); await qa('__qa.salvo(1)'); await qa('__qa.run(13)'); expect(await qa('__qa.tally().dmg')).toBe(0);
```

- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement to the interfaces above.**
- [ ] **Step 4: Run the check. Take stills of two craters at 1280 × 800 at dusk and at noon, and of a hunt burst.** Expected: check passes; the craters read at 1280 and at 375.
- [ ] **Step 5: Checkpoint with Tom: send the crater and hunt stills.**
- [ ] **Step 6: Commit.**

---

### Task 6: Sound

**Files:**
- Modify: `railgun/index.html` (the sound section near 6385 to 6520: `armSound`, `shotSound`, `hitSounds`, `crackle`, `rumble`; the hum)

**Interfaces:**
- Consumes: `roundGain` from Task 1; `rounds` and `r.res` from Tasks 3 and 5.
- Produces:
  - Banking: each banked round plays `armSound()` and lifts the hum one step (`humUpdate` reads `charge.bank`).
  - `roundSound(ac, r)`: the shot take that `shotSound` plays on `main`, at `roundGain(r.j, r.n)`. For `j < n`, the tail fades over 1.5 s.
  - `craterSound(ac, r)`: a thin crack (band-passed noise, 2 to 4 kHz, 60 ms) and a thud (sine 60 to 35 Hz, 0.3 s) at the round's hit plus the far delay.
  - `huntSound(ac, r)`: a sharp crack and `crackle(ac, 0.6)`.
  - A break round plays `hitSounds` as Rail does.
  - Every new node goes through `track()`, so mute and drain hold.

- [ ] **Step 1: Write the QA check**

```js
await qa('__qa.mute(false)'); await qa('__qa.mode("salvo")'); await qa('__qa.salvo(5)'); await qa('__qa.run(3)');
expect(await qa('__qa.audio().pend')).toBeGreaterThan(0);
await qa('__qa.mute(true)'); await qa('__qa.run(1)'); expect(await qa('__qa.audio().pend')).toBe(0);
```

- [ ] **Step 2: Run, expect failure** (the pending count shows no Salvo nodes).
- [ ] **Step 3: Implement to the interfaces above.**
- [ ] **Step 4: Run the check. Record a 5-round salvo (headful, sound on) for Tom.** Expected: check passes; five rising cracks; craters, break and hunts audible in order.
- [ ] **Step 5: Commit.**

---

### Task 7: Reduced motion, QA, review, PR

**Files:**
- Modify: `railgun/index.html` (as findings need), `docs/plans/railgun.md` (a Salvo line), the feature bean, `stimming-e39e`

- [ ] **Step 1: Reduced motion.** No recoil, as today. Flashes halve. Tracers stay. No hunt ember sprays.
- [ ] **Step 2: Run Q1 to Q10 in both modes** at 1280 × 800, 375 × 812 and 812 × 375, at the three rock sizes, rungs 0 to 3. Then `node --test tests/railgun-salvo.test.mjs` and `tests/run.sh`. Expected: clean console; 30 fps with five rounds in flight at rung 0; bar-v2 green.
- [ ] **Step 3: Fresh-eyes review of the branch** (superpowers:requesting-code-review).
- [ ] **Step 4: Open the PR.** Tom checks fps, sound and the look on a real device.
- [ ] **Step 5: Update the beans and commit.**
