# Release readiness: the approved label

Bean: `stimming-jfwe` (epic `stimming-3s8z`). Written 2026-11-16.
A toy gets the approved label only when it passes every item on this list. Tom gives the label; nothing else does.
Each item comes from a rule that already exists. The source column names that rule. This page adds no new rule, except the Attributions section in the toy doc.

## The checklist

| # | Item | Pass when | Source |
|---|---|---|---|
| 1 | Port | Every module in the toy's row of the port list is adopted; the toy uses only proved modules; the same-frame check is recorded (a 1/255 shift on a few pixels is the same frame; more needs Tom's look). A "Map" row has the standard importmap. | [ports.md](ports.md), [code-health.md](../code-health.md) decisions 3 and 12 |
| 2 | Toy doc | `docs/toys/<id>.md` exists from [the template](../toys/_template.md). Every section is there; a section with nothing to say says "None." The doc says what is now, cites `file:line`, and dates its numbers. | [toy-docs.md](toy-docs.md) |
| 3 | Type check | The module script is in `<id>/main.js` (or other `.js` files), the folder is in `include` in `tsconfig.json`, and `npm run check` gives 0 errors. | [typescript.md](typescript.md), [code-health.md](../code-health.md) decisions 8 to 10 |
| 4 | Stack and build | The toy doc names the stack type (Sketch, Shader, Environment, Scene, Compute), the renderer tier, each library with its version, the shared modules, and how the toy is built: passes, sims, key techniques. The type matches the toy, or the doc names the planned move. | [code-health.md](../code-health.md) Stack types, [stack.md](../stack.md), [stack-types.md](stack-types.md) |
| 5 | Importmap | The page carries the importmap word for word. The WebGPU toys (Galaxy, Fire, Ink Water, Spark wheel, Cauldron) carry the 0.186.1 map. A page that imports no library needs none. No library outside the set, unless Tom named it. | `AGENTS.md` Conventions, [stack.md](../stack.md) |
| 6 | Attributions | The toy doc lists every outside source: libraries and their licences, data (maps, datasets), audio files, fonts, models, textures, and shader techniques or papers the toy adapts. Each row gives the source, the licence, and whether credit must show on screen. An unknown licence blocks the label. | This page (see Attributions below) |
| 7 | Bar v2 | The toy passes a `bar` spec to `initPage`. Slot limits hold: one choice, three actions, one slider, four key strip entries, five visible controls. Settings holds only what anyone playing may want; tuning sits in `dev` rows under `?dev`. The key strip and the phone layout work; item 14 checks the compliance list at each size. A toy change to the shell passes `tests/bar-v2.html`. | [bar-v2.md](bar-v2.md) (Slots, Phones, Mobile and compliance, Dev sheet) |
| 8 | Bar answered | Tom has answered the toy's questions in the question sheet below: what stays, what moves to Settings or Dev, what is missing, what goes. The bar matches his answers. | This page (Question sheet) |
| 9 | `toys.json` | The entry has every field in order, with `name`, `nl`, `ipa`, `tag`, `tagNl`, `accent` and `series` set. Tom sets the Dutch words and the mottos. | `AGENTS.md` (`toys.json` shape, Series) |
| 10 | Still | `shared/stills/<id>.webp` exists and shows the toy as it looks now. | `AGENTS.md` (Stills) |
| 11 | Load progress | A heavy toy reports real progress with `stage()` and `buildSteps(n)`. Heavy: a Scene, Compute or Environment toy, or a toy that fetches or bakes assets before its first frame. A light toy may keep the shell default. | `AGENTS.md` (The intro is the preloader), [loading.md](loading.md) |
| 12 | Sound | Sound is muted by default, starts after a gesture, and goes through `audioKit()` or the shell's `sound`, so the stored choice and sleep hold. A toy with no sound has `sound: false` in `toys.json`. | `AGENTS.md` Conventions, [modularize.md](modularize.md) step 1 |
| 13 | Reduced motion | The toy reads `prefers-reduced-motion` and changes what moves. The doc says what changes. | `AGENTS.md` Conventions, [stack.md](../stack.md) rule 4 |
| 14 | Runtime QA | Recorded and dated in the toy doc: 30 fps or better at 1280 px and on a phone; the loop stops when hidden, and stops when idle unless Tom accepts the toy's idle motion (G4); a clean console on load and after every control; the Bar v2 compliance list at 1280, 375 x 812 and 812 x 375. | `AGENTS.md` Process and Conventions, [bar-v2.md](bar-v2.md) Checks |
| 15 | Sign-off | Tom puts `data-done` on the intro and the menu `<li>`. The approved label is version `"2.0"` in `toys.json`; only Tom sets it (Tom, 2026-11-16, G0). | `AGENTS.md` (`data-done`), [ports.md](ports.md) Rules |

### Rules for the list

- Read every item from the code and the docs. Never mark an item from memory.
- A runtime item (12 to 14) passes only with a dated record in the toy doc. No record is a fail, not a pass.
- The list runs one toy at a time, in that toy's own chat, when Tom picks it. Never fix gaps across toys in one sweep.
- Tom alone sets `data-done`, the version and the approved label. An agent never sets them.
- The label is version `"2.0"` in `toys.json` (Tom, 2026-11-16). No field is added.

## Attributions

Every toy doc gets an `## Attributions` section (the template has it from 2026-11-16).
One row per outside source:

| Field | Holds |
|---|---|
| Source | What it is, and its file or URL |
| Kind | Library, data, audio, font, model, texture, technique |
| Licence | The licence by name (MIT, CC0, CC BY 4.0, ODbL, own work). "Unknown" blocks the label |
| Credit shows | Yes (in the annex's Credits block, G8) or No (not required) |

- The libraries from the set and their licences: three.js (MIT), culori (MIT), Tone.js (MIT), GSAP 3.13 (the GSAP standard licence, free since 3.13), simplex-noise (MIT). B612 (SIL OFL 1.1), Gabarito (SIL OFL 1.1) and Iosevka (SIL OFL 1.1) are the site fonts. List each one a toy loads.
- A technique counts when a comment names its source (an author, a paper, a Shadertoy id) or when the code follows a known published method.
- Map data from OpenStreetMap is ODbL and needs a visible credit.
- An audio file needs its source and licence on record before the toy is approved. The licence check on `ms3guns.mp3` (Railgun) was open on 2026-11-10; on 2026-11-16 the file is not in the tree or in git history.

## New toys

About 20 more toys come; then the project closes. Each new toy meets this list from its first commit:

1. Its bean names the stack type before the first line of code ([code-health.md](../code-health.md)).
2. Its toy doc starts with the toy, from the template, Attributions included. Every outside source goes into the doc in the commit that adds it.
3. It starts on Bar v2, with tuning in `dev` rows from day one.
4. Its module script lives in `<id>/main.js` and its folder joins `tsconfig.json` in the first commit.
5. It uses the shared modules that are proved; it copies no shared code.
6. It starts in the Lab. It reaches the main shelf only after Tom vets it; then it needs a `toys.json` entry in full and a still.

## Audit of the main shelf, 2026-11-16

52 toys, in `toys.json` order. Read from the code, the toy docs, `toys.json`, `tsconfig.json`, `docs/plans/ports.md` and `shared/stills/`. No browser run.
Key: **Y** passes, **P** partly, **N** fails or has no record. Columns are the item numbers above.

No toy passes every item. No toy has items 6 (Attributions), 8 (Bar answered) or 14 (Runtime QA) in full.

| No. | Toy | 1 Port | 2 Doc | 3 Type | 4 Stack | 5 Map | 6 Attr | 7 Bar | 8 Ans | 9 json | 10 Still | 11 Load | 12 Sound | 13 RM | 14 QA | 15 Sign |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | morpher | N | N | N | N | N | N | Y | N | Y | Y | P | Y | Y | N | P |
| 2 | pop | N | P | N | P | Y | N | Y | N | Y | Y | P | Y | Y | N | P |
| 3 | fidget | N | N | P | N | Y | N | Y | N | Y | Y | Y | Y | Y | N | N |
| 4 | domino | N | N | N | N | N | N | Y | N | Y | Y | P | Y | Y | N | N |
| 5 | pins | N | N | N | N | N | N | Y | N | Y | Y | P | P | Y | N | N |
| 6 | galaxy | P | P | N | P | Y | N | P | N | Y | Y | Y | P | Y | N | N |
| 7 | prism | N | N | N | N | Y | N | P | N | Y | Y | P | Y | Y | N | N |
| 8 | kaleido | N | N | N | N | Y | N | Y | N | Y | Y | Y | P | Y | N | N |
| 9 | ferro | N | N | N | N | N | N | Y | N | Y | Y | P | P | Y | N | N |
| 10 | neon | N | N | N | N | Y | N | Y | N | Y | Y | Y | Y | Y | N | P |
| 11 | magnet | N | N | N | N | N | N | Y | N | Y | Y | P | P | Y | N | N |
| 12 | soap | N | N | N | N | N | N | Y | N | Y | Y | P | P | Y | N | N |
| 13 | glass | N | N | N | N | Y | N | Y | N | Y | Y | P | Y | Y | N | N |
| 15 | chladni | N | N | N | N | Y | N | Y | N | Y | Y | Y | P | Y | N | N |
| 16 | pendulum | N | N | N | N | N | N | Y | N | Y | Y | P | Y | Y | N | N |
| 17 | pool | N | N | N | N | Y | N | Y | N | Y | Y | Y | Y | Y | N | N |
| 18 | putty | N | N | N | N | Y | N | Y | N | Y | Y | Y | Y | Y | N | N |
| 19 | scope | N | N | N | N | Y | N | Y | N | Y | Y | Y | Y | Y | N | N |
| 20 | walker | N | N | N | N | N | N | Y | N | Y | Y | P | Y | Y | N | P |
| 21 | fire | P | N | N | N | Y | P | P | N | Y | Y | Y | Y | Y | N | N |
| 22 | rain | P | P | Y | Y | Y | P | Y | N | Y | Y | Y | P | Y | P | N |
| 23 | tvtree | N | N | P | N | N | N | Y | N | Y | Y | P | P | Y | N | N |
| 24 | balloons | N | N | N | N | N | N | Y | N | Y | Y | P | P | Y | N | N |
| 25 | bubbles | N | N | N | N | N | N | Y | N | Y | Y | P | P | Y | N | N |
| 26 | lava | N | N | N | N | Y | N | Y | N | Y | Y | Y | Y | Y | N | N |
| 27 | eyes | P | P | Y | Y | Y | N | Y | N | Y | Y | Y | Y | Y | N | N |
| 28 | sonar | N | N | N | N | Y | N | P | N | P | Y | Y | Y | Y | N | N |
| 29 | trails | N | N | N | N | Y | N | P | N | P | Y | Y | Y | Y | N | P |
| 30 | shadyos | Y | N | P | N | Y | N | P | N | P | Y | Y | Y | Y | N | N |
| 31 | chamber | N | N | N | N | Y | N | P | N | P | Y | Y | Y | Y | N | N |
| 32 | ink | P | N | N | N | Y | N | P | N | P | Y | P | Y | Y | N | P |
| 33 | window | Y | N | P | N | Y | P | P | N | P | Y | Y | Y | Y | N | P |
| 34 | windmap | N | N | N | N | Y | P | P | N | P | Y | Y | Y | Y | N | N |
| 35 | vortex | N | N | N | N | Y | N | P | N | P | Y | Y | Y | Y | N | N |
| 36 | dijkstra | Y | P | Y | Y | Y | P | P | N | P | Y | P | P | Y | N | N |
| 37 | fireworks | N | N | N | N | P | N | P | N | P | Y | P | Y | Y | N | P |
| 38 | launch | N | N | N | N | Y | N | P | N | P | Y | P | Y | Y | N | P |
| 39 | frietkot | N | N | P | N | Y | N | P | N | P | Y | P | Y | Y | N | N |
| 40 | railgun | Y | P | P | P | Y | N | P | N | P | Y | Y | Y | Y | N | N |
| 41 | trainride | N | N | N | N | Y | P | P | N | P | Y | P | Y | Y | N | N |
| 42 | foghorn | Y | N | Y | N | Y | P | Y | N | P | Y | P | Y | Y | N | N |
| 43 | washline | N | N | P | N | Y | P | Y | N | P | Y | N | P | P | N | N |
| 44 | cauldron | N | P | P | P | Y | P | Y | N | P | Y | P | Y | Y | P | N |
| 45 | meshball | N | P | N | P | Y | N | Y | N | P | Y | Y | Y | Y | P | N |
| 46 | washer | N | P | N | P | Y | N | Y | N | P | Y | Y | Y | Y | P | N |
| 47 | spark | N | N | N | N | Y | N | P | N | P | Y | P | Y | Y | N | N |
| 48 | oilslick | N | N | N | N | Y | N | N | N | P | Y | Y | Y | Y | N | N |
| 49 | ladder | N | P | N | P | Y | N | Y | N | P | Y | Y | Y | Y | P | N |
| 50 | windtunnel | N | P | N | P | Y | N | Y | N | P | Y | Y | Y | Y | P | N |
| 51 | schlieren | N | P | N | P | Y | N | Y | N | P | Y | Y | Y | Y | P | N |
| 52 | lichtenberg | N | N | N | N | Y | N | P | N | P | Y | Y | Y | Y | N | N |
| 53 | steelwool | N | P | N | P | Y | N | Y | N | P | Y | Y | Y | Y | P | N |

### How each column was read

| # | Y | P | N |
|---|---|---|---|
| 1 | Every module in the toy's `ports.md` row is imported, or the row lists none | Some are imported (Galaxy, Rain, Eyes); Fire has `fire.js` but no still frame without WebGPU; Ink has no still frame either | None imported, or the toy has no row. Railgun's row lists only `bloomPass`, which waits for Tom, so it reads Y |
| 2 | Never: no doc has the Attributions section yet | The doc exists. Stale on 2026-11-16: railgun, meshball, schlieren, steelwool, cauldron | No doc |
| 3 | Folder in `tsconfig.json` with its script in `.js` | Has `.js` modules, but the folder is not in the check | Script inline in HTML |
| 4 | The doc names the stack type and the build | The doc has the renderer section only | No doc |
| 5 | Word for word, the WebGPU map on an allowed toy, or no library import | Fireworks loads ZzFX from outside the map. Cauldron read P until Tom added it to the WebGPU list (G6) | Only the three.js entries (the "Map" rows in `ports.md`) |
| 6 | Never | A credits file or a code notice covers part of it | Nothing on record |
| 7 | Bar v2 with no open flag | Bar v2 with Settings rows that read as tuning, an own dev panel or own quality row, or a play control hidden in Settings | Bar v1 (Oil slick) |
| 9 | Every field set | `tag` and `tagNl` null (No. 28 to 53); `nl` and `ipa` null too on cauldron, meshball, washer, ladder, windtunnel, schlieren, steelwool | |
| 11 | `buildSteps`, or a light toy (Sketch or Shader) | A heavy toy with `stage()` marks only | No `stage()` on a heavy toy (Washing line) |
| 12 | `audioKit()` or no sound, and `toys.json` agrees | Own `AudioContext` (muted by the shell gate, but no kit sleep), or `toys.json` says `sound: true` on a silent page (Dijkstra, Washing line) | |
| 13 | The code reads reduced motion and cuts motion | Washing line: the wind slows, but nothing in `places/` reads it | |
| 14 | Never | The doc has dated numbers on a laptop only | No dated record |
| 15 | Never | `data-done` on the intro and the menu; no version after a port | No `data-done` |

### Findings across the shelf

1. **Attributions with an unknown licence.** Recorded audio: Railgun `shot.mp3`, `impact.mp3`, `boom.mp3`, `thrust.mp3` (the same file as `launch/thrust.mp3`); the 15 takes in `fireworks/sfx/`; `glass/gunshot.wav`; `sonar/ping.mp3`. Freesound clips: `window/cabin.mp3`, `trainride/sound/*.mp3`. Fog horn's ship renders (`foghorn/CREDITS.md`). Window's sea ("after havoc") and lens flare ("after Buoy Business"); its map box reaches US land with no named source. Rain's RainEffect base (Lucas Bebber). Frietkot's Tilt Neon and Courgette fonts. Prism's emission-line data. Ladder's ray-capsule ("after Inigo Quilez").
2. **Credits that never show.** Train ride's `annex.json` holds the OSM and swisstopo credits; Window seat's holds the Mapzen, NRCan and ESA WorldCover credits. No code loads either file. Dijkstra's OSM credit shows, at 9 px and 38 % opacity.
3. **Outside worlds.** Window's `ode.js` is a traced map of the Strangereal game world; Washing line's jet flyby is "a nod to Strangereal". ShadyOS shows "Task Manager" and "Force Quit…". TV tree has a "Claude" channel.
4. **Loops that never rest while in view.** Chamber, Oscilloscope (spin on by default), Caustic pool, Sonar, Galaxy, Morpher (Auto), Cauldron, Beach walker, Wind tunnel, TV tree (any lit set), Fog horn (ambient), ShadyOS (grain until standby, about 58 s). Rain, Window seat and Jacob's ladder run on purpose.
5. **WebGPU with no fallback.** Galaxy, Fire, Ink Water and Cauldron show only the fail line; decision 4 asks for a still frame. Spark wheel goes to its Classic build.
6. **Own sound graph, not `audioKit()`.** Galaxy, Kaleidoscope, Ferrofluid, Magnet balls, Soap cutting, Pin art, Chladni, Rain, TV tree, Balloon letters, Bubble wand.
7. **Port list gaps.** The eleven toys numbered 43 to 53 have no row in `ports.md`.
8. **`toys.json` against the page.** Dijkstra and Washing line say `sound: true`; neither page makes sound.
9. **Stale text.** The intro fallback says "Stimming Lab" on chamber, oilslick, ink, meshball, schlieren and washline. `AGENTS.md` says Glass keeps its old header; it is on Bar v2. On 2026-11-16 the pages dropped their Google Fonts link (bean `stimming-6ayf`); Frietkot keeps it for Tilt Neon and Courgette only.
10. **Pages that ship but are not the toy.** Railgun's `celllab`, `rangelab`, `stormlab`; Cauldron's `probe-gpu.html`; Frietkot's `people.html`, `voices.html`; `trainride/dev/`; `washline/archive/`; 46 unused parts in `fidget/parts/`; `dijkstra/maps/fetch.py`. Launch sets `window.__qa` in production.

## Question sheet

The record for item 8. Read from the code on 2026-11-16 (`file:line` refs: `docs/qa/release-ready/notes-2026-11-16.md`).
Bar slots: **C** choice, **A** actions, **S** slider, **K** key strip, **Set** Settings rows, **Dev** dev rows. Q marks the site Quality row.
Tom answers in small batches. Each answer goes under its question with the date.

### Site-wide

- **G0.** How does the approved label show in the files: a `toys.json` field, a version step, or `data-done` alone?
- **G1.** Recorded audio with no source on record: Railgun shot, impact, boom and thrust; the 15 Fireworks takes; Glass gunshot; Sonar ping. Are these Tom's own recordings? Is `ms3guns.mp3` the old name of Railgun's `shot.mp3`?
- **G2.** Freesound clips (Window `cabin.mp3`, Train ride `sound/`): which licence applies, and must a credit show?
- **G3.** Outside worlds: keep Window's Strangereal egg (`ode.js`), Washing line's flyby nod, ShadyOS's "Task Manager" and "Force Quit…", and TV tree's "Claude" channel?
- **G4.** Loops that never rest while in view (finding 4): fix each in its own chat, or accept some as the toy's nature?
- **G5.** WebGPU toys with no fallback (Galaxy, Fire, Ink Water, Cauldron): a still frame and one line (decision 4), or a Classic build as Spark wheel has?
- **G6.** Cauldron runs three.js 0.186.1: add it to the WebGPU list?
- **G7.** Lab and probe pages that ship in toy folders (finding 10): remove before release, or keep and mark `noindex`?
- **G8.** Credits on screen: where do they show (the vignette, Settings, the annex), and does Dijkstra's 9 px OSM credit do?

### Per toy

**1 morpher.** C Shape (stepper, 13); A Clear; S Blend; K 4; Set Q; Dev none. Silent.
- morpher.1 Auto (the default) keeps the loop busy: let it rest after a while?
- morpher.2 Keep the toy silent?
- Attributions: the 2D SDF shapes match Inigo Quilez's published functions; no credit.

**2 pop.** C Material (stepper, 18); A Shuffle, Reset; S none; K 4; Set Q; Dev none.
- pop.1 The vignette is empty: write one?

**3 fidget.** C none; A Reset; S none; K 4; Set none (no Q); Dev none.
- fidget.1 Shuffle is only the joystick nub and a hidden S key: make it a bar action beside Reset?
- fidget.2 `fidget/parts/` holds 51 parts and the board mounts 5: keep the other 46 in the release?
- fidget.3 Add the Quality row, or not for an SVG toy?

**4 domino.** C Add (tray, 8); A Iso, Clear; S none; K 4; Set Picture, Yours (photo upload), Q, Reset; Dev none.
- domino.1 A visitor's own photo ("Yours"): fine for release?
- domino.2 Space tips the first tile but is not on the strip: add it?

**5 pins.** C Finish (2); A Shuffle (no key); S none; K 4; Set Q; Dev none.
- pins.1 Give Shuffle a key?
- pins.2 Keep the iOS motion permission prompt?

**6 galaxy.** C Add (tray, 17); A Clear; S Gravity; K 4; Set Star streaks, Effect streaks, Q, Reset; Dev none.
- galaxy.1 Move the two streak sliders to Dev?

**7 prism.** C Light (stepper, 11); A + Piece, Clear; S none; K 4; Set Wireframe, Q, Reset; Dev none.
- prism.1 Move Wireframe to Dev?
- Attributions: the salt emission-line wavelengths have no named source.

**8 kaleido.** C Mirrors (6, 12, Tri); A Shuffle; S none; K 4; Set Q; Dev none.
- kaleido.1 The open item says it zooms in too far: still open?
- kaleido.2 Keep the bar bare, or add a row (spin friction, grain)?

**9 ferro.** C Fluid (4); A Drip; S Field; K 4; Set Q; Dev none.
- ferro.1 Escape and the `-` `=` keys are hidden: leave them hidden?

**10 neon.** C Gas (stepper, 13); A Undo, Clear; S none; K 4; Set Lights, Wall, Straight tubes, Q, Reset; Dev none.
- neon.1 Wall: Settings or Dev?
- neon.2 Undo works on Cmd/Ctrl+Z: show that key on the chip?

**11 magnet.** C none; A Ring, Hex, Shuffle; S none; K 4; Set Field lines, Q, Reset; Dev none.
- magnet.1 Anything wanted in the empty choice slot?

**12 soap.** C Soap (stepper, 6); A New bar, Blow; S none; K 4; Set Q; Dev none.
- soap.1 Enter pops the whole grid but is not on the strip: add it or drop it?

**13 glass.** C Glass (stepper, 9); A Rewind; S none; K 4; Set Tool (Hammer, Gun, Brick), Q; Dev none.
- glass.1 Tool drives play but sits in Settings: move it onto the bar?
- glass.2 Delete the unused `gunshot.mp3`?

**15 chladni.** C none; A Shuffle, Reset (pours sand); S none (own pitch rail on the stage); K 4; Set Q; Dev none.
- chladni.1 Keep the pitch rail as a diegetic control?
- chladni.2 Reset pours fresh sand: keep the word, or a literal verb (Pour)?

**16 pendulum.** C Pendulums (12, 20, 32); A Release, Stop, Iso; S none; K 3; Set Q; Dev none.
- pendulum.1 Iso is a view toggle in an action slot: keep, or move to Settings?

**17 pool.** C Tool (4); A Clear, Rain; S none; K 4; Set Pool, Time, Q; Dev none.
- pool.1 The water drifts at 30 fps forever: let it rest?
- pool.2 N (night) and P (next pool) are hidden: add them to the strip?

**18 putty.** C Putty (3); A Clear; S none; K 4; Set Q; Dev none.
- putty.1 The bare bar is the intent, or does it want a slider?
- putty.2 The slab casts a hard offset block shadow: does the no-hard-offset rule reach here?

**19 scope.** C Mode (Pen, Knot); A Shuffle, Clear; S Pitch; K off (own legend); Set Q, Reset; Dev none. Spin and phosphor are tags on the screen.
- scope.1 Keep spin and phosphor on the screen, or move phosphor into Settings?
- scope.2 Spin is on by default, so the loop never rests: fine?

**20 walker.** C Time (stepper, 8); A Close; S none; K 4; Set Legs, Cycle the day, Q, Reset; Dev none.
- walker.1 The walk never sleeps: add a sleep a minute after the last input?
- walker.2 R resets but is hidden: add it to the strip or drop it?

**21 fire.** C Salt (stepper, 9); A Reset; S Intensity; K 4; Set Base, Motion, Temperature, Turbulence, own Quality (Low to High); Dev none.
- fire.1 Temperature and Turbulence: Settings or Dev?
- fire.2 Keep Fire's own Low and Medium steps, or use the site Quality row?
- Attributions: the three.js `webgpu_volume_fire` example (MIT) carries no copyright notice in the files; the salt colours have no named source.

**22 rain.** C Weather (3); A none; S Wind; K 3; Set Q; Dev none.
- rain.1 No way to fog the glass again: add Clear or Reset, or does the fog come back by itself?
- Attributions: RainEffect (Lucas Bebber, Codrops) has no licence on record.

**23 tvtree.** C none; A Shuffle, Tune, Eyes; S none; K 4; Set Power, Lantern, Channels (link), Q; Dev none.
- tvtree.1 Power and Lantern are play controls in Settings: keep there?
- tvtree.2 Adult-leaning and war channels (Lovers' lane, Keyhole, Night raid, Test blast): fine for an office shelf?
- tvtree.3 Keep the "Asteroids" channel name (a game title)?
- Attributions: the hash in `channels.js` is Dave Hoskins' "hash without sine", uncredited.

**24 balloons.** C Foil (4); A Let go, Type (touch only); S none; K 4; Set Q, Reset; Dev none.
- balloons.1 Arrows gust but are hidden: add them to the strip?

**25 bubbles.** C none; A Blow, Clear; S none; K 3; Set Q; Dev none.
- bubbles.1 Keep the auto puff on arrival?

**26 lava.** C Colour (stepper, 8); A Flip, Shake; S none; K 4; Set Q; Dev none.
- lava.1 Arrows turn the lamp but are hidden: add or drop?
- lava.2 No Reset anywhere: wanted?

**27 eyes.** C none; A Shuffle, Shake, Blink; S none; K 4; Set Q; Dev none.
- eyes.1 Give Shake the Space key so the chip and the strip agree?
- eyes.2 D (dizzy) is hidden: show it?

**28 sonar.** C Display (Active, Listen); A Ping, Shuffle; S Range; K off (own legend); Set Afterglow, Scanlines, Grid, Q; Dev none.
- sonar.1 Move Afterglow and Scanlines to Dev?
- sonar.2 Sounder mode is in the code but not on the choice: add it or cut it?

**29 trails.** C Sky (3); A Shutter, Clear; S Exposure; K 2; Set Stars, Colour, Meteors, Q; Dev none.
- trails.1 Move Colour (True, Mono) to Dev?
- trails.2 Meteors show only while the loop is awake: should a meteor wake it?

**30 shadyos.** C Drag (Smear, Jelly); A + Window, Error, Clear; S Age; K off; Set Haunt, Hum, Trail, Boot screen, Q; Dev 9 event buttons.
- shadyos.1 Move Trail to Dev?

**31 chamber.** C Source (3); A Shower; S Magnet; K 2; Set Activity, Mist, Light, Tracks, Q; Dev none.
- chamber.1 Move Light to Dev? Keep Mist and Tracks in Settings?

**32 ink.** C Ink (5); A Drop, Clear; S Weight; K 4; Set Light, Water, own Quality (Low to High); Dev none.
- ink.1 Move Light to Dev?
- ink.2 Keep the own four-step Quality row, or use the site row?

**33 window.** C Time of day (stepper, 8); A Dim, Light, Cozy quiet flight; S Storm; K 4; Set Cloud, Towns, Rain, Seat, Aurora, Falling, Flying, Q; Dev none.
- window.1 Falling and Flying are one-shot triggers dressed as Settings rows: keep, or make them actions?
- window.2 Shorten "Cozy quiet flight" to one word?
- window.3 Move the camera URL flags (`?peer`, `?vy`, `?event`, `?at`, `?fog`) into Dev rows?

**34 windmap.** C View (Globe, Flat); A + Cyclone, Isobars, Fronts (no keys); S Wind; K 4; Set Look, Particles, Trails, Hemisphere, H and L marks, Q, Reset; Dev none.
- windmap.1 Move Look and Trails to Dev?
- windmap.2 Give the three actions keys?
- windmap.3 Five visible controls: too full?

**35 vortex.** C Sheet (Across, Scan); A Pair, Collide, Clear; S Haze; K 4; Set Laser, Smoke, Density, Breakup, Q, Reset; Dev none.
- vortex.1 Move Laser, Density and Breakup to Dev? Keep Smoke as a performance choice?

**36 dijkstra.** C Search (stepper, 7); A Shuffle, Remap, Clear; S none; K 4; Set Map, Tree, Glow, Q, Reset; Dev none.
- dijkstra.1 Move Glow to Dev?
- dijkstra.2 Space (replay) and T (tree) are hidden: add them to the strip?
- dijkstra.3 No sound but `toys.json` says `sound: true`: add sound, or set it false?

**37 fireworks.** C Shell (tray, 25); A Showtime; S Distance; K 4; Set Sky, Smoke, Water, Bill, Q; Dev none (own `.fxdev` panel on `?dev` or backquote).
- fireworks.1 Move the `.fxdev` panel onto bar `dev` rows?
- fireworks.2 Smoke and Water: Settings or Dev?
- fireworks.3 Add ZzFX 1.3.2 (MIT) to the library table?

**38 launch.** C Rocket (3); A Launch; S Dawn; K 3; Set Letterbox, Bokeh, Aperture, Focus, Highlights, Q; Dev none.
- launch.1 Move Bokeh, Aperture, Focus and Highlights to Dev?
- launch.2 Space launches but is not on the strip: add it?

**39 frietkot.** C none; A none; S none; K 2; Set Weather, Sign, Neon, Traffic, Tilt-shift, Camcorder, Q, Reset; Dev none.
- frietkot.1 No visible control: make Weather (or Sign) the choice?
- frietkot.2 Move Sign, Neon, Tilt-shift and Camcorder to Dev?
- frietkot.3 The hold-to-shake on the shack never fires: fix it, or cut it?
- Attributions: Tilt Neon and Courgette fonts have no licence file in the repo.

**40 railgun.** C none; A Sight, Reset (after a kill); S Time; K 4; Set Aim, Fire, Letterbox, Resolution, Smoke detail, Q; Dev 55 rows.
- railgun.1 Fire (Rail, Salvo) stands in for the HUD selector: ship it in Settings, or the HUD first?
- railgun.2 Move FPS (24, 30, 75) from Dev to Settings?
- railgun.3 Make Ambient (on, off) a player setting?

**41 trainride.** C Weather (stepper, 6); A Line; S Speed; K 4; Set Time, Drift, Express, Wet glass, Q; Dev none (own `?dev` mixer and top view).
- trainride.1 Move Wet glass to Dev?
- trainride.2 T cycles the time but is hidden: add it to the strip or drop it?
- trainride.3 Make the mixer and top view bar `dev` rows?
- trainride.4 Delete the unused `sound/idle.mp3`?

**42 foghorn.** C Time (3); A Horn; S Fog; K 2; Set Storm, Q; Dev none.
- foghorn.1 Storm in Settings, or beside Fog?
- foghorn.2 Add Dev rows for the hard-set look (bloom, grain, haze)?

**43 washline.** C none; A + Piece, Release (no keys); S Sun; K 3; Set Wind, Q; Dev none. Silent.
- washline.1 Sound, or set `toys.json` to `sound: false`?
- washline.2 Move Wind to the choice slot?
- washline.3 Keep `washline/archive/` in the release?

**44 cauldron.** C Add (tray, 21); A + Thing, Clear; S Fire; K 4; Set Simmer sound, Q, Reset; Dev 11 rows.
- cauldron.1 The WebGPU fire behind `?fire=gpu`: a Dev row, keep hidden, or remove?
- cauldron.2 A 30 fps simmer forever: accept, or let it rest?

**45 meshball.** C Goo (5); A Squeeze; S Mesh; K 3; Set Wobble, Q, Reset; Dev 5 rows.
- meshball.1 Wobble: Settings or Dev?

**46 washer.** C Surface (4); A Reset; S Fan; K 3; Set Q; Dev Exposure, Bloom, Mist, Jet power, Drying.
- washer.1 Move Jet power or Drying to Settings?

**47 spark.** C Sparks (stepper, 8); A Grind; S none; K 3; Set Trails, Floor, Smoke, Q, Reset; Dev none.
- spark.1 Move Trails and Floor to Dev? Keep Smoke for players?

**48 oilslick.** Bar v1: C Sky (3); A + Drop, Shuffle, Clear; S Film; own Settings popover with Q.
- oilslick.1 Port to Bar v2 before release? Keep all three actions?

**49 ladder.** C none; A Blow; S Gap; K 3; Set Arc flicker, Q; Dev 14 rows (no persist).
- ladder.1 Should the Dev values survive a reload (`persist`)?
- ladder.2 Enter puffs but is hidden: keep it hidden?

**50 windtunnel.** C Shape (5); A Puff; S Wind; K 4; Set Smoke lines, Q, Reset; Dev 5 rows.
- windtunnel.1 It draws at 30 fps when calm: let it rest?
- windtunnel.2 Fix the two known issues in its doc before release?

**51 schlieren.** C Source (4); A Blow; S Sensitivity; K 4; Set Filter, Q, Reset; Dev 5 rows.
- schlieren.1 Filter: Settings or Dev?

**52 lichtenberg.** C Board (Panel, Acrylic); A Clear; S Voltage; K 4; Set Branching, Ember life, Glow, Q; Dev none.
- lichtenberg.1 Move Glow, Branching and Ember life to Dev, so Settings holds Quality only?

**53 steelwool.** C Grade (3); A Blow, Reset; S none; K 3; Set Sparks, Q; Dev 7 rows.
- steelwool.1 Grade and Reset both lay a new pad: keep both?

### Answers

Batch 1, 2026-11-16 (Tom):

| Q | Answer | What follows |
|---|---|---|
| G0 | Version 2.0 | The approved label is `version: "2.0"` in `toys.json`. No new field. Item 15 says so |
| G1 | All downloaded | None of the recorded audio is Tom's own work. Each file needs its source and licence found before its toy is approved: Railgun (shot, impact, boom, thrust), Launch (thrust), Fireworks (15 takes), Glass (gunshot), Sonar (ping). `ms3guns.mp3` is gone from the repo |
| G4 | Judge per toy | Each toy's own chat proposes rest or keeps the motion; Tom decides there. Item 14 says so |
| G5 | Still frame and one line | Galaxy, Fire, Ink Water and Cauldron get decision 4 as written. Spark wheel keeps its Classic build |

Batch 2, 2026-11-16 (Tom):

| Q | Answer | What follows |
|---|---|---|
| G2 | Find each licence | Window seat's and Train ride's chats trace each clip to its page and record the licence. A clip that asks for credit gets it in the annex (G8) |
| G3 | Keep all four | The Strangereal egg (`window/ode.js`), the flyby nod, ShadyOS's OS names and TV tree's "Claude" channel stay. The traced map still needs an attribution row; its licence is unknown |
| G7 | Keep, `noindex` | Lab and probe pages in toy folders stay public with `noindex` and no link. Each toy's chat adds the tag |
| G8 | The annex | Credits show in the annex under the stage, its Credits block ([annex.md](annex.md); Tom picked A, Recede, 2026-11-09). Tom: "remember we had an area for below (content) to the toys on their toy pages". A toy whose source asks for credit needs its annex before approval |

Batch 3, 2026-11-16 (Tom):

| Q | Answer | What follows |
|---|---|---|
| morpher.1 | Keep cycling | Auto stays the default and keeps morphing. Tom accepts its idle motion (G4); item 14 passes on this point |
| morpher.2 | Keep silent | No sound. `sound: false` stays |
| pop.1 | Write it | Pop field gets a vignette in its own chat |
| fidget.1 | Add Shuffle (S) | A `shuffle` action with key S beside Reset |
| fidget.2 | Move to archive | The 46 unmounted parts leave `fidget/parts/` for an archive folder outside the published toy. This overrides G7 for Fidget |
| fidget.3 | No Settings | No Quality row; the Settings button stays hidden |
| domino.1 | Keep Yours | The photo upload stays; the photo never leaves the browser |
| domino.2 | Leave hidden | The strip keeps its four entries; Space stays a hidden key |

Batch 4, 2026-11-16 (Tom):

| Q | Answer | What follows |
|---|---|---|
| pins.1 | Add a key | Shuffle gets a key that typing never needs (not a letter: Pin art presses typed words) |
| pins.2 | Keep it | The iOS motion prompt and the tilt sway stay |
| galaxy.1 | Move to Dev | Star streaks and Effect streaks become `dev` rows. Settings keeps Quality and Reset |
| prism.1 | Keep in Settings | Wireframe stays a player setting |
| kaleido.1 | Fixed | The "zooms in too far" item leaves `AGENTS.md` |
| kaleido.2 | Add a slider | Kaleidoscope's chat proposes one main slider for Tom to pick |
| G6 | Add to the list | Cauldron joins the 0.186.1 WebGPU list in `AGENTS.md` and `docs/stack.md`. It gets the still-frame fallback (G5) |

Batch 5, 2026-11-16 (Tom):

| Q | Answer | What follows |
|---|---|---|
| ferro.1 | Leave hidden | Escape and `-` `=` stay hidden keys; the strip keeps its four entries |
| neon.1 | Keep in Settings | Wall stays a player setting |
| neon.2 | Show it | The Undo chip prints its shortcut (Cmd/Ctrl+Z) |
| magnet.1 | Ball finish | A top-left choice of ball finish. Magnet balls' chat proposes the options for Tom to pick |
| soap.1 | Put on strip | "Enter: pop all" goes on the key strip in place of one entry. Soap cutting's chat proposes which entry leaves |
| glass.1 | Tool as choice | Tool (Hammer, Gun, Brick) becomes the top-left choice; the glass type moves to Settings |
| glass.2 | Delete it | The unused `glass/gunshot.mp3` goes (bean `stimming-syu9`). `gunshot.wav` stays and still needs its source and licence (G1) |

Batch 6, 2026-11-16 (Tom):

| Q | Answer | What follows |
|---|---|---|
| chladni.1 | Keep the rail | The pitch rail stays a diegetic control; the slider slot stays empty |
| chladni.2 | Rename to Pour | The action reads Pour (key Space). Reset is not on Chladni's bar |
| pendulum.1 | Keep as action | Iso stays a chip with key V |
| pool.1 | Rest after 60 s | The drift eases to a still frame a minute after the last input (G4) |
| pool.2 | Leave hidden | N and P stay hidden keys |
| putty.1 | Keep it bare | No new controls |
| putty.2 | Soften it | The hard offset block shadow under the slab becomes a soft shadow |

Batch 7, 2026-11-16 (Tom):

| Q | Answer | What follows |
|---|---|---|
| scope.1 | Keep on screen | Spin and phosphor stay as tags on the scope's screen |
| scope.2 | Keep spinning | Spin stays on by default. Tom accepts the idle motion (G4) |
| walker.1 | Keep walking | The walk and breeze keep going. Tom accepts the idle motion (G4) |
| walker.2 | Leave hidden | R stays a hidden key; Reset stays in Settings |
| fire.1 | Keep in Settings | Temperature and Turbulence stay player settings |
| fire.2 | Keep own row | Fire keeps its four-step Quality row (Low to High) |
| rain.1 | Fog returns alone | No new control. The fog creeps back over a wiped pane by itself; Rain's chat checks the code and adds the creep if it is missing |

Batch 8, 2026-11-16 (Tom):

| Q | Answer | What follows |
|---|---|---|
| tvtree.1 | Rethink it | Tom: "revisualize what interactivity can mean here -- subsession". A separate session (`tvtree-interactivity`) proposes interaction ideas and records Tom's pick here |
| tvtree.2 | Keep all | Every channel stays, the adult-leaning and war ones too |
| tvtree.3 | Keep both | "Asteroids" and "Pinball" keep their names |
| balloons.1 | Swap into strip | "← → gust" replaces "enter let go" on the strip; Let go keeps its chip |
| bubbles.1 | Drop it | No auto puff on arrival; nothing moves until the visitor acts |
| lava.1 | Drop them | The arrow-key turn goes |
| lava.2 | No Reset | No Reset anywhere |
