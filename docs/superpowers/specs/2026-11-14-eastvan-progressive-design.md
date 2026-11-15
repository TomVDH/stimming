# East Van: the progressive diorama

Epic `stimming-guw5`. Plan: `docs/plans/eastvan.md`. Date: 2026-11-14.

## Intent

East Van is the first ultra toy (SSS rank): a cute, simple Toy-town diorama of East Vancouver, where you poke everything.
Today it has a house lot with an alley behind it on one long plinth, and a separate disc of the corner of Commercial Drive and East 4th.

Tom wants a **progressive diorama**: the one that starts with the house, then the yard, then the alley, carried on as one walk.
He also wants **a separate alley diorama**: the alley seen on its own.

The walk follows the real block. The lane behind the house runs to the end of the block and comes out at Commercial Drive, behind the shops.

```
HOUSE → yard → garage → LANE ── along the lane ──→ backs of the Drive shops → THE DRIVE
```

## Approaches

| | Approach | Trade-off |
|---|---|---|
| A | One long plinth, L-shaped, camera glides between stops | One model you can see whole. Heaviest to draw; every change touches the whole model. |
| **B** | **A row of plinths end to end, like model-railway modules; camera glides from one to the next** | **Each module is perfected alone; only nearby modules draw; the lane module alone is the separate alley. The seams show as gaps.** |
| C | It grows as you play: poke the back gate and the next zone builds | Earned progress. Most motion work; the first visit is small. |

**Tom picked B** (2026-11-14). C can come later on top of B, one module at a time.

## Goals

- One walk, house to Drive, made of modules set end to end.
- Each module is a small diorama on its own plinth, with its own pokes and life.
- Any module can be shown alone. The lane module shown alone is the separate alley.
- The camera glides along the walk from module to module.
- The frame rate holds as the walk grows.

## Non-goals (this round)

- Sound.
- CC0 models and textures.
- The Bar v2 shell, the intro, the vignette.
- Growing as you play (approach C).
- New detail inside the House and Yard modules. They keep what they have. (The Lane module does get new detail: it must stand alone.)

## Anti-goals

- **Losing the approved look.** The house lot as it stands is what Tom liked ("looks fucking amazing"). The split must not change how it reads.
- **A menu of separate toys.** The modules must read as one place you walk through, not a list of scenes.
- **Dropping under 30 fps** at any point on the walk, on Standard quality.

## Constraints

- Plain HTML and JS, no build step. three.js 0.170 on WebGL, with the importmap from `AGENTS.md`. No new library.
- Code comments in ASD-STE100.
- Commits only through `tools/commit.sh`. Other sessions share this checkout.
- Budget (`docs/plans/eastvan.md`): 60 fps goal, 30 floor, 150 draw calls, 300k triangles.
- Every new public asset needs Tom's yes first and a row in `eastvan/CREDITS.md`.

## How it works today

- `eastvan/index.html` owns the camera, the pointer, the frame loop and the stops (`STOPS`, keys 1 to 3).
- `eastvan/town.js` `buildTown(sky, zones, life)` builds one whole scene: sky, sun, lights, every part of every zone file, pokes, movers.
- A zone file (`lot.js`, `alley.js`, `drive.js`) is plain data: `PARTS`, `WIRES`, `POKES`, `MOVES`, `ACTS`, `LAMPS`, optional `SUN`.
- `lot.js` holds one plinth 38.5 m deep that runs from the road to the far side of the lane. `alley.js` holds the backyard, the garage and the lane on top of it.
- `life.js` adds the crow, cat, flamingo, petals, smoke and basketball to the house scene.
- `lens.js` draws one scene with one camera.
- `drive.js` builds the 58 m disc round the corner from `data/drive.json` (City of Vancouver open data).

## The design

### The modules

The walk is five modules. The first three come from what exists; the last two are new.

| # | Module | Plinth | Content | From |
|---|---|---|---|---|
| 1 | House | 14 × 21 m | Road and van, sidewalk, front yard, the house, one metre of backyard | `lot.js` today |
| 2 | Yard | 14 × 9 m | Backyard, beds, trampoline, the back gate | `alley.js` today |
| 3 | Lane | 14 × 12 m, laid along the lane | The garage with its band room, hoop and ball; the lane: bins, raccoon, couch, TV, pole; new detail | `alley.js` today, grown |
| 4 | Lane run | 14 × 6 m, laid along the lane | The lane toward the Drive: garages, fences, a mural, the backs of the shops | new |
| 5 | Drive | 14 × 30 m, across the lane's end | The lane mouth on Commercial Drive: the backs and fronts of the shops, the sidewalk, the street | new, from `data/drive.json` |

Modules 1 to 3 run back from the road. At module 3 the walk turns 90° and runs along the lane, as the real lane does.

```
 [3 Lane]──[4 Lane run]──[5 Drive]
    │
 [2 Yard]
    │
 [1 House]
    │
   road
```

The lane runs straight on into its mouth on the Drive. Module 5 lies across the lane's end, with the Drive running north-south through it.

### A module

- Each module is one data file in `eastvan/modules/`, with the same keys as a zone file today, plus:
  - `SIZE`: the plinth's width and depth.
  - `JOIN`: where the walk enters and leaves it.
  - `STOP`: the camera's view of this module.
- A module sits on its own plinth, built in its own local frame, with its origin at the plinth's centre.
- The page places each module in the world along the walk. Modules never know where they sit.
- Plinths stand 0.6 m apart. The gap shows the strata on both cut faces, as model-railway modules do.

### The scene

- One scene holds every built module: one sky, one sun, one hemisphere light, one lens.
- `buildTown` splits in two:
  - **The stage:** sky, sun, hemisphere light, the frame loop's hooks.
  - **`buildModule`:** returns one module as a group, with its pokes, movers, switches, lamps and update.
- The sun's shadow box follows the module in view and covers its neighbours, at today's sharpness: 2048 on Standard, 4096 on High. (Claude's call.)
- Every built module is visible, so the far modules fill the views behind (the house stays in the alley view).
- Each module merges its static paint into one mesh, as the house lot does today. That keeps the whole walk inside the draw-call budget.
- Only the module in view and its neighbours run their update, cast shadows and take pokes. Far modules stand still. (Claude's call.)
- Modules build on first approach: the next module builds while the camera rests on this one.

### The camera

- Each module has one stop: a target, a yaw, a pitch and a fit (today's stop fields).
- The camera glides from stop to stop along the walk.
- Keys: 1 to 5 jump to a module. Arrow keys or the stop buttons go back and forward one module.
- Drag turns round the module in view. Scroll zooms. Zoomed fully out, the whole built walk is in view.

### The separate alley

- A **Solo** toggle shows one module alone: its neighbours hide, and the camera frames it in the round.
- The Lane module in Solo is the separate alley diorama (bean `stimming-cly0`).
- So it must stand alone as a full diorama. The garage, the band room, the hoop and the basketball move into it, and it gets new detail this round (Tom, 2026-11-14).

### The Drive disc

- The 58 m disc stays as its own place, the **Corner**, outside the walk (Tom, 2026-11-14).
- Module 5 is a slice of the same block at the scale of the other modules. It is cut from `data/drive.json`, so its lots, heights, shops and trees are real, and it carries the licence credit. (Claude's call.)
- Reason: the disc is about eight times the size of a module. In the row, its shops would look tiny beside the house.

### Life

- `life.js` splits per module: cat, flamingo and petals go with the house; the basketball goes with the lane.
- The crow belongs to the stage, not to a module. It flies across the gaps from the street wires to the lane wires and back. That is one thread that ties the walk together. (Claude's call.)

### Order of work

1. Split today's plinth into modules 1 to 3 with no visible change in the house view. The House plinth holds everything from the road to a metre past the back wall, so the first gap falls behind the house, out of the house view's sight. Tom checks this against the approved look.
2. Stage and `buildModule`, neighbour culling, the walk camera, Solo.
3. The Lane module grows into the full alley: new detail, framed for Solo.
4. Module 4, Lane run.
5. Module 5, Drive.

## Decided

| What | Who | When |
|---|---|---|
| Toy-town look, true 3D | Tom | 2026-11-10 |
| Progressive diorama, house → yard → alley onward | Tom | 2026-11-14 |
| Also a separate alley diorama | Tom | 2026-11-14 |
| Approach B, a row of modules | Tom | 2026-11-14 |
| The walk follows the real block to the Drive | Claude, proposed; Tom said "ok" | 2026-11-14 |
| The Lane module grows into a full alley: garage moves in, new detail | Tom | 2026-11-14 |
| The 58 m disc stays as its own place, the Corner | Tom | 2026-11-14 |

## Left to the builder

- Module file layout and names inside `eastvan/modules/`.
- How `buildModule` shares materials and the glow switches between modules.
- The glide curve and its timing.
- How Solo shows on screen (a key and a button are enough).
- Exact plinth sizes, within a metre of the table.
