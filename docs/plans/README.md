# Development plans: the next fifteen toys

Drafted 2026-11-04. Tom decides; nothing here is built.

These plans cover ranks 5 to 19 of the ranking in [toy-plan.md](../toy-plan.md).
Ranks 1 to 4 (Night viaduct, Star trails, Sonar, Cloud chamber) already have briefs in [toy-dev-plan.md](../toy-dev-plan.md).
Rank 19, "the chemistry bench", is one page with two experiments: Electrolysis and Iodine clock.
Kelvin dropper stays its own toy: it is a K1 toy, not a fluid.

## Start a build

Open one fresh session per toy with:

> Build **<toy>** from `docs/plans/<id>.md`: read the Ground rules in `docs/toy-dev-plan.md`, the batch rules in `docs/plans/README.md`, then the plan, and follow its tasks.

The session reads those three files, `shared/stim.js`, and only the source sections its plan names.
Large pages stay closed.

## The fifteen

| Rank | Toy | id | Tech | Kits | Size | Estimate | Waits on |
|---|---|---|---|---|---|---|---|
| 5 | [Fireworks](fireworks.md) | `fireworks` | 3D | uses K2, builds K6 | S to M | $15 to $30 | D1 |
| 6 | [Window seat](windowseat.md) | `windowseat` | 3D | | M to L | $25 to $50 | D2 |
| 7 | [Ink in water](ink.md) | `ink` | VOL | builds K3 | M | $20 to $30 | D3, D4 |
| 8 | [Sunbeam dust](sunbeam.md) | `sunbeam` | 3D | | S | $10 to $15 | |
| 9 | [Wind map](windmap.md) | `windmap` | 2D | uses K1 | S | $10 to $15 | |
| 10 | [Coast and meteor](meteor.md) | `meteor` | 3D | uses K2, K6 | L | $40 to $70 | D1, Fireworks |
| 11 | [Wind farm](windfarm.md) | `windfarm` | 3D | uses K2 | M | $20 to $30 | D1 |
| 12 | [Collatz coral](coral.md) | `coral` | 2D | | S | $10 to $15 | |
| 13 | [Dry ice fog](dryice.md) | `dryice` | VOL | uses K3 | M | $20 to $30 | D3, Ink in water |
| 14 | [Pull chain](chain.md) | `chain` | SIM + 3D | builds K4 rope | S to M | $12 to $25 | |
| 15 | [Ulam spiral](ulam.md) | `ulam` | 2D | | S | $10 to $15 | |
| 16 | [Canal at dusk](canal.md) | `canal` | 3D | uses K2 | L | $40 to $70 | D1 |
| 17 | [Marsh launch](launch.md) | `launch` | 3D | uses K2, K6 | M to L | $25 to $50 | D1, Fireworks |
| 18 | [Washing line](washline.md) | `washline` | SIM + 3D | uses K4, adds cloth | M | $20 to $30 | Pull chain |
| 19 | [Bench](bench.md) | `bench` | 2D | uses K5 | M | $20 to $35 | D5 |
| | **Total** | | | | | **$297 to $510** | |

## Budget

The $250 in toy-plan.md covers the first four toys and about two more.
These fifteen cost $297 to $510 on top, at the current size table.
No real cost is recorded yet: every toy bean still has "Record the session cost" open.
Rescale this table once Star trails, Sonar and Night viaduct carry real numbers.

If money stays tight, five toys give the most per dollar and wait on nothing: Sunbeam dust, Wind map, Collatz coral, Ulam spiral and Pull chain.

## Decisions for Tom

Answer these in one batch. A build that waits on one starts after the answer.

| | Question | Blocks | Default in the plan |
|---|---|---|---|
| D1 | Night viaduct is parked as broken. What broke? If it is the sky, haze, snow, bloom or grade, the first K2 toy fixes it in its own copy. | Fireworks, Coast and meteor, Wind farm, Canal at dusk, Marsh launch | Fireworks lifts K2 and fixes what Tom names. |
| D2 | Ship two image files in `windowseat/`: night lights (NASA Black Marble, public domain, about 1 MB) and a land mask (Natural Earth, public domain, about 100 KB)? Credit goes in the vignette. | Window seat | Yes. Procedural city lights look fake. |
| D3 | Two more WebGPU-only toys on three.js 0.186.1, as Fire and Galaxy are? Browsers without WebGPU see Fire's notice. | Ink in water, Dry ice fog | Yes. |
| D4 | Ink in water's stage is a bright lightbox; the page around it stays dark. Does a bright stage fit "dark only"? | Ink in water | Backlit by default; Dark field in Settings. |
| D5 | One Bench page with two chips, Electrolysis and Clock? | Bench | Yes. If no, Electrolysis ships alone as `electro`. |
| D6 | Ulam spiral can show digits on the cells at the deepest zoom. Is that copy on the stage? | nothing | Off, with a Settings toggle. |

## Kits, as the code stands

toy-plan.md lists five kits. The code already holds two of them, so their first use costs less than the table says.

| Kit | Source today | State | Lifted by |
|---|---|---|---|
| K1. Phosphor plate | `trails/index.html`, from `K1: accumulation and decay` to `end K1` | Built and marked | Wind map |
| K2. Night scene | `viaduct/index.html`: `NOISE`, `LIGHT` (its `haze()`), and the sky, snow and post sections | Built but not marked; the toy is parked as broken; its loop never sleeps | Fireworks first; then Wind farm, Coast and meteor, Canal at dusk, Marsh launch |
| K3. Volume fluid | `fire/index.html`, `fluid simulation kernels` (WebGPU, TSL) | Built for fire; needs a sinking dye and colour absorption | Ink in water first, then Dry ice fog |
| K4. Verlet rope | `balloons/index.html`, `physics: soft balloons on springs, verlet strings` | Rope exists; cloth does not | Pull chain (rope), then Washing line (adds cloth) |
| K5. 2D fluid | `marble/index.html`, `one frame of fluid`: `simStep()` runs force, advect, divergence, 24 Jacobi sweeps and gradient | Built, raw WebGL2 | Bench |
| K6. Burst particles (new) | none | Fireworks builds it | Coast and meteor, Marsh launch |

Kit rules:

1. Copy a kit into the new page. Never import from another toy, and never refactor the source toy.
2. Wrap the copy in `/* ---------- K<n>: <name> ---------- */` and `/* ---------- end K<n> ---------- */`, as Star trails does.
3. A kit fix lands in the new toy's copy. Tell Tom; he decides whether the source toy gets it.
4. The first toy to lift an unmarked kit (K2, K3, K4, K5) marks its copy. The next toy copies from there.

## Batch rules

These add to the Ground rules in toy-dev-plan.md, which still hold in full, including the Look rule.

### Finesse first

Each plan names its hero moments and a finesse list. A toy is not done until each item reads on a real screen.
The common bar for every toy:

1. **The first frame is a picture.** The stage opens composed and lit, never empty. Star trails pre-exposes its plate; each plan says how it does the same.
2. **Light carries the scene.** One key light, haze, and bloom with a threshold. Light moves when something happens: flashes, sweeps, warm-ups.
3. **Every gesture answers within one frame,** with light or motion, even when the main event comes later.
4. **Sound has a visible cause.** It pans with its source, and no hit repeats exactly: pitch, time and level jitter every time.
5. **Things settle with grace,** with eased stops, decays and afterglow. Then the loop sleeps.

Each plan also names a few true physical details: a sound delay, a glint, the colour of a flame. These are the pizazz. Props are not.
At 375 px the shot recomposes (lens, framing, counts), and every gesture has a touch form.

### Frame loop

1. **Lively** (input, or an event in flight): full frame rate.
2. **Drifting** (ambient motion only): 30 fps, as Caustic pool does (`now - lastDraw < 31`).
3. **Asleep:** 60 s after the last input, ambient motion eases to a stop over 2 s and the loop stops. Any input wakes it.
4. **Hidden** (tab hidden or stage off screen, from `whenVisible`): the loop stops at once. The sim clock stops too, so nothing jumps on return.
5. **Reduced motion:** no ambient drift. Gestures still answer, more softly.

Wrap `step()` and `render()` in `try`/`finally`, as Caustic pool does, so an error cannot leave the loop marked busy.

### Performance ladder

Use the watchdog from Fire and Snow globe. After 4 s of run time, a frame-time average above 1/38 s for 2 s steps quality down one rung.
It never steps back up in a session. It never writes the site-wide `stimming.quality` either: that is the user's choice. The rungs, in order:

1. Pixel ratio to 1.
2. Effect buffers (bloom, volume, reflection) to the next lower size.
3. Counts (particles, cells, instances).

### Quality

Quality is site-wide since bean `stimming-gq7k`. Never build a toy's own Quality chips.

1. Call `qualitySetting(document.getElementById('sets'))` after `initPage()`. It adds the shared Standard and High chips to Settings.
2. Size canvases through `fitCanvas()` or `pixelRatio()`; both read the shared choice. three.js toys pass the result to `renderer.setPixelRatio()`.
3. Call `onQuality(() => resize())`, so a change applies live, also from another tab.
4. A toy that needs a lighter tier keeps its own Low (or Low and Medium) in front of Standard, as Night viaduct and Fire do, and passes `quality: 'standard'` to keep the caps there.

In the plans, "High" means the shared High. "Low" means the watchdog's lower rung, or a toy's own Low tier where its Settings row lists one.

### Delayed sound

Fireworks, Coast and meteor and Marsh launch play sound late on purpose: light first, sound after.

1. Schedule on the audio clock (`ac.currentTime + delay`), not with `setTimeout`.
2. Keep a handle to each scheduled node. Muting stops them all.
3. `kit.rest(isIdle)` counts pending sounds as busy, so the context cannot sleep under a boom in flight.
4. A hidden tab cancels pending sounds.

### Pointer

Every new toy uses Night viaduct's pointer state machine:

- A press turns into a drag after 8 px of travel, or a hold after 260 ms.
- A release that is neither is a tap.
- Capture the pointer on press. `pointercancel` and `lostpointercapture` end every gesture.

### Settings

Each setting persists under `stimming.<id>.<key>`, with the `saved()` and `save()` pair from Star trails.
Settings use the `#setBtn` and `div.sets` popover from Star trails. Its `popover()` helper closes on an outside press and on Escape.

## QA

The repo has no test tooling. Keep the Playwright script in the session scratchpad, outside the repo.
Launch Chromium with the GPU flags in AGENTS.md; WebGPU toys also need `--enable-unsafe-webgpu`.

| # | Check | Pass |
|---|---|---|
| Q1 | Write each `<script type="module">` to an `.mjs` file and run `node --check`. Do the same for the menu script. | Exit code 0. |
| Q2 | Load `/<id>/`, wait until `.intro` leaves the DOM, then drive every chip, action and gesture. | No `pageerror`; no console error or warning. |
| Q3 | Screenshots at 1280 × 800, and at 375 × 812 with `isMobile` and `hasTouch`. Add one per hero moment. | Tom sees them. |
| Q4 | An init script counts `requestAnimationFrame` calls. Count for 2 s after the toy settles; for a drifting toy, 62 s after the last input. | No new calls. While drifting: 32 or fewer per second. |
| Q5 | Hide the page: redefine `document.hidden` as true, then fire `visibilitychange`. | No new frames in 2 s. |
| Q6 | `page.emulateMedia({ reducedMotion: 'reduce' })`, then Q2 and one screenshot. | Clean console; the plan's reduced-motion lines hold. |
| Q7 | Count bar controls: a `.choices` group, the `.slider` and each action chip count one each. Count `.how` rows. | Five controls or fewer; four rows or fewer. |
| Q8 | Tab to the stage and press each key the how-to lists. | Each key does its job. |
| Q9 | Set `stimming.<id>.sound` to `1`. An init script records each `AudioContext`. Play a gesture, then wait until the toy settles plus 2 s. | The context runs after the gesture and is `suspended` at the end. |
| Q10 | Log frame times during the main gesture. | Recorded in the bean. SwiftShader is a floor; Tom checks fps on a real device. |

Each plan's tasks name the checks that close them.
