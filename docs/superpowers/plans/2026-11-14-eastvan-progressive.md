# East Van progressive diorama Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn East Van's house-and-alley plinth into a walk of five modules, House → Yard → Lane → Lane run → Drive, each on its own plinth. The Lane module shown alone is the separate alley.

**Architecture:** A pure layout file (`walk.js`) places modules end to end and answers which are near. `town.js` splits into a stage (sky, sun, hemisphere) and `buildModule`, which builds one module as a group. A module's data keeps its authored coordinates; an inner frame group shifts them by `-ORIGIN`, so the existing numbers never change. The page drives one camera along the walk's stops.

**Tech Stack:** three.js 0.170 (WebGL), GSAP 3.13, plain ES modules, `node --test` for the pure files.

**Spec:** `docs/superpowers/specs/2026-11-14-eastvan-progressive-design.md`

## Global Constraints

- Plain HTML and JS, no build step. The importmap from `AGENTS.md`, word for word. No new library.
- Code comments: ASD-STE100, one fact per line, twelve words or fewer, active voice, present tense.
- Commit and push only through `tools/commit.sh -m "msg" -- <paths>`, with the bean file. Never `git add -A`. Commit lines end `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Budget at every stop: 30 fps floor on Standard, 150 draw calls, 300k triangles.
- Lights: at most 14 lamps across the whole walk. Lamps never leave the scene; a far lamp goes to intensity 0 (a change in light count recompiles every shader).
- The house view at key 1 must look as it does today (Tom approved it). Task 3 ends with Tom checking that.
- QA in the browser pane (Tom: no Playwright). Never leave a debug build in the shared tab.
- Each task gets a task bean under epic `stimming-guw5` (Task 5 uses the existing bean `stimming-cly0`).

## Review Focus

1. **A click on a far module** (visible, not active): it must not fire that module's poke; the camera travels there instead. Test in Task 4.
2. **Keys pressed mid-glide** (5 then 1 at once, while module 5 still builds): one build per module, and the camera ends at the last key's stop. Test in Task 4.
3. **An upright phone (375 × 812) at every stop:** the module fits the frame with no plinth edge cut off. Test in Tasks 4 and 7.
4. **Reduced motion:** the glide becomes a cut to the next stop; the crow hops instead of flying. Test in Task 4.
5. **Solo, then a module key:** Solo carries over to the new module; S again shows the walk. Test in Task 4.

---

### Task 1: The walk layout

**Files:**
- Create: `eastvan/walk.js`
- Test: `eastvan/tests/walk.test.mjs`

**Interfaces:**
- Produces:
  - `GAP = 0.6` (metres between plinths).
  - `layWalk(mods: Array<{ id, SIZE: [w, d], ORIGIN: [x, y, z], JOIN: 'back' | 'east', YAW?: number }>, start: [x, z]) → Array<{ id, centre: [x, 0, z], offset: [x, 0, z], yaw, size: [w, d] }>`. `JOIN` is the side the next module joins on. `SIZE` is in the module's own frame; `YAW` (default 0) turns that frame about y. `centre` is the plinth centre in the world. `offset = centre − R(YAW)·ORIGIN`: the frame group's position; `yaw` is its rotation. A `back` join steps `−z` by both depths' halves plus `GAP`; an `east` join steps `+x` by both widths' halves plus `GAP`, using each module's world footprint (its `SIZE` turned by `YAW`).
  - `near(i: number, n: number) → number[]`: the indexes of the active set, `i` and its neighbours, clipped to `[0, n)`.
  - `stopWorld(stop: { at, yaw, pitch?, w, tall, h, band, range }, placed) → stop` with `at` turned by `placed.yaw` and moved by `placed.offset`, and `yaw` plus `placed.yaw`.

- [ ] **Step 1: Write the failing tests** in `eastvan/tests/walk.test.mjs` with `node:test` and `node:assert/strict`:
  - `house stays put`: a first module with `ORIGIN [0,0,-1.45]`, `SIZE [14,22.9]`, placed with `start [0,-1.45]`, has `offset` `[0,0,0]`.
  - `back joins step down -z`: house `SIZE [14,22.9]` then yard `SIZE [14,9]`: yard `centre[2]` equals `-1.45 - 22.9/2 - 0.6 - 9/2` (`-18.0`, within 1e-9).
  - `east joins step along +x`: lane `SIZE [14,12]` with `JOIN 'east'`, then lane run `SIZE [14,12]`: run `centre[0]` equals lane `centre[0] + 14 + 0.6`, and its `centre[2]` equals the lane's.
  - `near clips`: `near(0,5)` is `[0,1]`; `near(2,5)` is `[1,2,3]`; `near(4,5)` is `[3,4]`.
  - `stopWorld moves at`: a stop at `[0,2,0]` on a module with offset `[1,0,-6]` and yaw 0 gives `at [1,2,-6]`, and every other field unchanged.
  - `yaw turns the frame`: a module with `ORIGIN [36.9,0,-3]`, `YAW Math.PI/2` and `SIZE [30,30]` placed after a 14 m wide east-joining module gets `offset` such that `R(π/2)·ORIGIN + offset = centre` (within 1e-9), and a stop at its `ORIGIN` lands on `centre`.
- [ ] **Step 2:** Run `node --test eastvan/tests/`. Expected: FAIL, `walk.js` not found.
- [ ] **Step 3:** Write `eastvan/walk.js` with the three functions and `GAP`. No three.js import; it must run in node.
- [ ] **Step 4:** Run `node --test eastvan/tests/`. Expected: 6 pass.
- [ ] **Step 5:** Commit `eastvan/walk.js eastvan/tests/walk.test.mjs` and the bean.

### Task 2: Split the plinth into three module files

**Files:**
- Create: `eastvan/modules/house.js`, `eastvan/modules/yard.js`, `eastvan/modules/lane.js`
- Modify: `eastvan/lot.js` (drop the 38.5 m plinth boxes, lines 87–90), `eastvan/alley.js` (retired: its parts move out; delete it at the end)
- Test: `eastvan/tests/modules.test.mjs`

**Interfaces:**
- Consumes: `box`, `cyl`, `blob`, `beam`, `boards`, `COL` from `eastvan/lot.js`.
- Produces: each module file exports `ID`, `SIZE`, `ORIGIN`, `JOIN`, `STOP`, `PARTS`, `WIRES`, `POKES`, `MOVES`, `ACTS`, `LAMPS`, in authored coordinates (today's numbers). No module holds plinth parts: `buildModule` makes the plinth from `SIZE`.

The cuts, in today's coordinates (z runs to the road):

| Module | z range | ORIGIN | SIZE | JOIN | Holds |
|---|---|---|---|---|---|
| house | 10 → -12.9 | `[0,0,-1.45]` | `[14, 22.9]` | `back` | all of `lot.js`, plus from `alley.js`: back boards, back gable, back barge, back door, stoop, back steps, kitchen window |
| yard | -12.9 → -21.9 | `[0,0,-17.4]` | `[14, 9]` | `back` | grass, raised beds and greens (move both beds 1.0 m to -z), trampoline and ball-on-trampoline, side fence panels (cut to the yard), back fence and back gate (move to z -21.7) |
| lane | -16.5 → -28.5 | `[0,0,-22.5]` | `[14, 12]` | `east` | garage slab, garage, mural, band room, garage door, hoop, sensor light; lane ground, pole, lamp, wires, bins, raccoon, puddles, couch, TV; far side |

STOPs: house `{ at:[0,2.6,0], yaw:0.5, w:27, tall:19, h:19, band:5, range:14 }` (today's). Yard `{ at:[0,1.2,-17.4], yaw:0.9, pitch:0.55, w:18, tall:14, h:12, band:4, range:10 }`. Lane `{ at:[0,2.2,-22.5], yaw:Math.PI+0.55, w:20, tall:15, h:14, band:5, range:12 }`.

- [ ] **Step 1: Write the failing tests** in `eastvan/tests/modules.test.mjs`, looping over the three modules:
  - `parts fit the plinth`: every box, cyl and blob centre lies within `ORIGIN ± SIZE/2` (x and z), with 0.6 m of slack for eaves and awnings.
  - `poke ids are unique` within a module.
  - `acts point at real things`: every `['flip', id]` names a part's `sw`; every `swing`, `pulse` and `run` names a part's `dyn`; every `MOVES` key names a `dyn`.
  - `lamps follow real things`: every `LAMPS[].of` (`sw:<id>` or `mv:<id>`) names a part's `sw` or `dyn`.
  - `no plinth parts`: no part has `k: 'plinth'`.
- [ ] **Step 2:** Run `node --test eastvan/tests/`. Expected: FAIL, modules not found.
- [ ] **Step 3:** Write the three module files by moving parts out of `lot.js` and `alley.js` as the table says. `house.js` re-exports `lot.js`'s house data and appends the back-of-house parts.
- [ ] **Step 4:** Run `node --test eastvan/tests/`. Expected: all pass.
- [ ] **Step 5:** Commit the module files, the test, `lot.js`, the removal of `alley.js`, and the bean. The page breaks until Task 3; commit Tasks 2 and 3 together if the page must stay working on `main` between them.

### Task 3: The stage and buildModule

**Files:**
- Modify: `eastvan/town.js` (split `buildTown` at line 72), `eastvan/life.js`, `eastvan/index.html` (the `PLACES` block)

**Interfaces:**
- Consumes: `layWalk`, `near` from `walk.js`; the module files from Task 2.
- Produces:
  - `buildStage(skyTexture) → { scene, sun, fitSun(centre: Vector3, half: [x, z]) }`. `fitSun` moves the sun target and sizes the shadow box. Map size: 2048 Standard, 4096 High (today's).
  - `buildModule(mod, placed, life?) → { id, group, pokes: [{ id, pos: Vector3 (world), r, fire }], noInk, update(t, dt), setActive(on: boolean) }`. `group` sits at `placed.offset`, turned by `placed.yaw`; it holds every mesh, mover, lamp and life object in authored coordinates. `life` is `(group, crown, pokes) → { noInk, update(t, dt) }`. The plinth (three strata, today's colours `soil`, `earth`, `rock`) comes from `SIZE`. `setActive(false)` stops updates and shadow casting, and sets the module's lamps to 0.
  - `life.js`: `houseLife` (cat, flamingo, petals, chimney) and `laneLife` (basketball; it ignores `crown`), both with the `life` signature above, in authored coordinates. The petal floor clips to the house plinth (z 10 to -12.9). The crow leaves `life.js` (Task 4).

- [ ] **Step 1:** Take a still of today's house view at key 1 and 1280 × 800 before any change; save it to the scratchpad as `house-before.png`.
- [ ] **Step 2:** Split `buildTown` into `buildStage` and `buildModule`. Keep its part sorting, wires, switches, movers, lamps and pokes as they are; only the scene they land in changes.
- [ ] **Step 3:** Build House, Yard and Lane in the page from `layWalk`, all active. Open the house view.
- [ ] **Step 4: Check.** Open `http://localhost:8000/eastvan/` in the pane. Expected: a clean console; the still matches `house-before.png` apart from the gap behind the house; draw calls at most 150; the 21 house pokes still fire.
- [ ] **Step 5:** Show Tom both stills side by side. Wait for his yes on the look before Task 4.
- [ ] **Step 6:** Commit `town.js`, `life.js`, `index.html` and the bean.

### Task 4: The walk camera, the active set, Solo and the crow

**Files:**
- Modify: `eastvan/index.html` (stops, keys, pointer, loop), `eastvan/town.js` (crow on the stage)

**Interfaces:**
- Consumes: `buildStage`, `buildModule`, `layWalk`, `near`, `stopWorld`.
- Produces: `WALK` (the module list in order) and `goTo(i: number, { snap?: boolean })` in `index.html`. The Corner (the 58 m disc) stays a separate place on key 0 and its own button.

Rules:
- Keys 1 to 5 go to a module; ← and → go one back or one on; S toggles Solo; 0 opens the Corner.
- The glide takes 1.1 s, `power2.inOut`, along the target and yaw; with reduced motion it is a cut.
- On arrival the active set is `near(i, n)`: those modules update, cast shadows and take pokes; `fitSun` covers them.
- A click that lands on an inactive module's pokes calls `goTo` on that module instead.
- Modules not yet built build on arrival at a neighbour, in idle time (`idle` from `shared/stim.js`). A second `goTo` before a build ends waits for it; no module builds twice.
- Solo hides every module but the current one and frames it in the round (yaw drag stays free). Solo stays on across `goTo`.
- Scrolled fully out, the frame holds the bounds of every built module (the spec's "whole walk in view"). The zoom limit grows as modules build.
- The crow sits on the house's top wire. A poke flies it across the gaps to the lane's top wire, rests 2 s and flies back, 3.6 s each way. With reduced motion it hops.

- [ ] **Step 1:** Write `goTo`, the keys, the active set, the far-click rule, Solo and the crow.
- [ ] **Step 2: Check each Review Focus line** in the pane:
  - Far click: from the house stop, click the garage. Expected: the camera glides to Lane; no garage poke fires.
  - Mid-glide keys: press 5 then 1 quickly. Expected: the camera ends at House; the console shows no second build.
  - Phone: at 375 × 812, visit stops 1 to 3. Expected: each plinth fits the frame.
  - Reduced motion (emulate it): press 2. Expected: a cut, no glide; the crow hops.
  - Solo: press S at Lane, then 1. Expected: House alone; S shows the walk again.
- [ ] **Step 3:** Read draw calls and fps at each stop. Expected: ≤ 150 calls, ≥ 30 fps on Standard.
- [ ] **Step 4:** Commit `index.html`, `town.js` and the bean.

### Task 5: The Lane grows into the full alley (bean `stimming-cly0`)

**Files:**
- Modify: `eastvan/modules/lane.js`, `eastvan/life.js` (`laneLife`)
- Test: `eastvan/tests/modules.test.mjs` (already covers the lane)

New detail, each with a poke:
- A bike chained to the back fence: the front wheel spins.
- A compost bin by the garage: the lid flaps and a fruit fly cloud lifts.
- A line of laundry between the garage and the pole: the sheets sway.
- Two crows on the lane wires: they hop along the wire.
- A neighbour's garage across the lane, with its own door that rolls up on a lit workshop.

- [ ] **Step 1:** Add the parts and pokes. Keep `SIZE [14, 12]`.
- [ ] **Step 2:** Run `node --test eastvan/tests/`. Expected: all pass.
- [ ] **Step 3: Check** in Solo at the Lane stop, 1280 × 800 and 375 × 812. Expected: every new poke fires; ≤ 150 calls; the module reads as a full diorama alone.
- [ ] **Step 4:** Stills to Tom. Commit `lane.js`, `life.js` and the bean.

### Task 6: Lane run

**Files:**
- Create: `eastvan/modules/run.js`
- Modify: `eastvan/index.html` (`WALK`)

`SIZE [14, 12]`, `JOIN 'east'`, authored in `lane.js`'s frame (`ORIGIN [0,0,-22.5]`), so its lane at z -24.5 lines up with the Lane module's. Content: the lane continues; on its near side two garages (one with an open door and a car on blocks), a fence with a mural, a hydrant; on its far side a fence and a cherry tree over it; the lane wires carry on. Pokes: the open garage's work lamp, the car's bonnet, the hydrant cap (a jet), the tree (petals, reusing `houseLife`'s petal code moved into a shared function).

- [ ] **Step 1:** Add `run.js` to the module test loop; run `node --test eastvan/tests/`. Expected: FAIL.
- [ ] **Step 2:** Write `run.js`; run the tests. Expected: pass.
- [ ] **Step 3: Check** at stop 4 and in Solo. Expected: pokes fire; ≤ 150 calls with stops 3 to 5 near.
- [ ] **Step 4:** Commit `run.js`, the test, `index.html` and the bean.

### Task 7: The Drive module from city data

**Files:**
- Modify: `eastvan/drive.js` (generalise the cut)
- Create: `eastvan/modules/drive.js`
- Test: `eastvan/tests/drive.test.mjs`

**Interfaces:**
- Produces: `driveParts(data, clip: { kind: 'disc', r } | { kind: 'rect', e0, n0, e1, n1 }) → { PARTS, WIRES, POKES, MOVES, ACTS, LAMPS }` in `eastvan/drive.js`, pure (no fetch). `loadDrive()` keeps working for the Corner as `driveParts(data, { kind: 'disc', r: 58 })`.
- The module: the west-side lane mouth on Commercial Drive, between lots 1965 and 1941 (data n 37.6 to 40.3, e -11.9; lane centre line n 38.9). The cut: `e -18 → 12`, `n 21.9 → 51.9`.
- `driveParts` keeps today's frame (x = data n, z = data e). The module turns it with `YAW Math.PI/2`, so world x = data e and world z = −data n: the lane runs along x and meets the Drive, which runs along z.
- `ORIGIN [36.9, 0, -3]` (n 36.9, e −3): the lane centre line sits 2 m behind the plinth centre, as in `lane.js`, so the lanes line up.
- `SIZE [30, 30]`: 14 m cannot hold the street (sidewalk to sidewalk is about 24 m). This is a builder's call above the spec's metre of leeway; Tom checks it in Step 4.
- The licence credit shows whenever the Drive module is near, as it does today on the Corner.

- [ ] **Step 1: Write the failing tests** in `eastvan/tests/drive.test.mjs`, reading `eastvan/data/drive.json` with `fs`:
  - `rect cut stays inside`: every part centre from `driveParts(data, rect)` has x (data n) within `21.9 → 51.9` and z (data e) within `-18 → 12`, with 0.6 m slack.
  - `disc still builds`: `driveParts(data, { kind: 'disc', r: 58 })` gives as many shop pokes as today (count them once before the change and pin the number).
  - `lane mouth is open`: no building part's centre has x (data n) within `37.6 → 40.3` and z (data e) below `-11.9`.
- [ ] **Step 2:** Run `node --test eastvan/tests/`. Expected: FAIL.
- [ ] **Step 3:** Split `loadDrive` into fetch plus `driveParts`; write `modules/drive.js` around the rect.
- [ ] **Step 4: Check** in the pane: the walk ends at stop 5, the Corner still opens on key 0, the credit shows at both. Stills of stop 5 to Tom, with the 30 × 30 size called out.
- [ ] **Step 5:** Commit `drive.js`, `modules/drive.js`, the test, `index.html` and the bean.
