# Wind map round 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Wind map a pointer-driven icon, an emblem and a main-shelf place, then a chart grid, light, three new gestures, a weather chart layer and a globe projection.

**Architecture:** Everything except the icon round lives in `windmap/index.html`: one page, raw WebGL2, Bar v2 shell. New systems join the existing ones by their interfaces: storms are the `vortices` array, the field is the `FIELD` GLSL chunk plus its CPU mirror, the frame is `simStep()` then `render()`. The chart layer is a 2D canvas over the WebGL canvas. The globe changes only the world domain, the noise sampling, the composite and the pointer mapping.

**Tech Stack:** Raw WebGL2, GSAP 3.13 (menu and icons), Tone.js 15.0.4 through `kit.tone()`, `shared/stim.js` (`initPage` with `bar`, `fitCanvas`, `linFit`).

**Spec:** `docs/superpowers/specs/2026-11-09-windmap-round-2-design.md`

## Global Constraints

- No new libraries. The importmap stays word for word.
- Dark only. Colours are OKLCH through `linFit` or `css`.
- No copy on the stage. H and L letters are the one exception, behind the `Marks` setting, default Off.
- Menu icons: angular brut tiles with a hard offset shadow. Every direction reacts to the pointer with `{ enter(p), move(p), leave() }`; a loop runs only as the idle state.
- Frame loop: lively at full rate, drifting at 30 fps, asleep 60 s after the last input, hidden stops at once.
- Shared checkout: commit only through `tools/commit.sh`; pass `--hunks` for `index.html`, `toys.json`, `icons/sheet.html` and `icons/picks.json`. Never revert another toy's work.
- No Playwright. Check in the built-in browser pane, in a background tab, never in Tom's front tab.
- Comments follow ASD-STE100: one fact per line, twelve words or fewer.
- Commit and push after each task. Keep bean `stimming-5qae` current and commit it with the code.

## Review Focus

1. **A slow circling start.** A user who starts circling slowly can wait 260 ms before 8 px of travel. They expect a storm, and they get a high. Task 5 measures how often this happens with a scripted slow circle.
2. **Grabbing a high.** A press inside a high's calm centre must grab the high (flick it), not spin up a storm in it. Task 5 tests it.
3. **The wrap seam.** A storm, a jet or a front that crosses x = 0 on the globe must not jump, double or lose its track. Task 8 tests it.
4. **Switching projection mid-gesture.** A Settings change while a press is held must end the gesture cleanly: no orphaned held storm. Task 8 tests it.
5. **Chart canvas size.** The 2D chart canvas must follow every resize and quality change, or the fronts drift off the storms. Task 7 tests it after a resize.

## QA harness

The tasks' checks run in a background browser-pane tab through this harness. It holds the page's clock, so frame counts are exact while the pane is hidden.

1. Save every `stimming.*` localStorage key to sessionStorage before you start. Restore them all when you finish: Tom plays in the same browser.
2. Navigate the background tab to `http://localhost:8000/windmap/`. Then fetch the page and `document.write` it with this script first in `<head>`:

```js
(()=>{let q=[];let now=performance.now();performance.now=()=>now;
window.requestAnimationFrame=cb=>{q.push(cb);return q.length;};window.cancelAnimationFrame=()=>{};
window.__pump=n=>{for(let i=0;i<n;i++){const cbs=q;q=[];now+=16.7;cbs.forEach(cb=>cb(now));}};
window.__live=()=>q.length;window.__errs=[];
addEventListener('error',e=>__errs.push(String(e.message)));
for(const k of ['error','warn']){const f=console[k];console[k]=(...a)=>{__errs.push(k+' '+a.join(' '));f(...a);};}})();
```

3. Navigate fresh before each harness load. `document.open` keeps the Document, so a `document.hidden` override leaks into the next run.
4. Drive gestures with `PointerEvent`s on `.stage`. Grab stills by wrapping `gl.drawArrays` and calling `canvas.toDataURL()` right after the draw to the default framebuffer.
5. Read storm state by wrapping `gl.uniform4fv` (the 64-float `uVort` upload is `[x, y, g * amp, rc]` per storm).
6. Every check ends with `__errs` empty.

`node --check` gate before every push: write each `<script type="module">` of `windmap/index.html` and each script of `index.html` to an `.mjs` file in the scratchpad and run `node --check` on it.

---

### Task 1: Icon round

**Files:**
- Create: `icons/spike-19.html` (the next free gallery number; check `icons/` first)
- Create: `icons/spike/emblems/windmap-a.svg` … `windmap-e.svg`
- Modify: `icons/sheet.html` (one line in `SPIKES`: `[19, ['windmap']]`)

**Interfaces:**
- Consumes: the gallery scaffold of `icons/spike-18.html`. Copy its helpers `el`, `emb`, `ctl(aim, rest, demo, start)`, `every(dt, fn)`, its tile CSS and its emblem preview.
- Produces: five controls, `windmap.A` … `windmap.E`, each `{ enter(p), move(p), leave() }` with `p` in viewBox units (128 × 128).

The directions follow the sheet's column rubrics.

| Col | Rubric | Wind map direction |
|---|---|---|
| A | Shaded object | A slate chart tile with silk streamlines; the pointer is a storm; lines bend into a spiral around it. |
| B | Stencil cut-out | Three thick streamline bands cut from a solid tile; circling the pointer winds them into a cyclone. |
| C | Single-weight line | A graticule and five even lines; the lines follow the pointer as a wind vane field. |
| D | Isometric block | A raised block map with a spiral on its top face; the pointer tilts the block and moves the eye. |
| E | Abstract mark | A heavy spiral mark and its eye; the pointer's distance tightens or opens the spiral. |

- [ ] **Step 1: Build the gallery.** One tile per direction plus its emblem preview, as spike 18 lays them out. Each tile is 128 × 128 with the hard offset shadow.
- [ ] **Step 2: Wire the pointer.** Each direction answers `enter`, `move` and `leave`. Focus plays its demo. Reduced motion holds the rest pose.
- [ ] **Step 3: Write the emblems.** One luminance SVG per direction in `icons/spike/emblems/`, white on transparent, from that direction's own geometry. The format is `shared/emblems/sonar.svg`.
- [ ] **Step 4: Check.** Open `/icons/spike-19.html` in a background tab. Pass: each tile reacts to a scripted `pointermove` path (take a still before and after), the console is clean, and `/icons/sheet.html` lists the Wind map row.
- [ ] **Step 5: Commit.** `tools/commit.sh -m "Icons: a Wind map round, five pointer-driven directions" --hunks <sheet hunk> -- icons/spike-19.html icons/spike/emblems/windmap-*.svg`
- [ ] **Step 6: Show Tom the gallery stills and stop.** Tom picks a direction. Do not start Task 2 before the pick.

### Task 2: Emblem and promotion

**Files:**
- Create: `shared/emblems/windmap.svg`
- Modify: `index.html` (move the Wind map `<li>` from `section.lab` to the end of the main shelf; new icon SVG; new `toys.windmap` hook)
- Modify: `toys.json` (`windmap` entry)
- Modify: `icons/picks.json` (`toys.windmap`: `{ "pick": "<letter>", "note": "<one line>" }`)
- Modify: `windmap/index.html` (the intro emblem span)

**Interfaces:**
- Consumes: Tom's pick from Task 1, and that direction's control code.
- Produces: `toys.windmap = { enter(p), move(p), leave(), play(), rest() }` in the menu, in the shape of `toys.sonar`.

- [ ] **Step 1: Emblem.** Copy the picked direction's emblem to `shared/emblems/windmap.svg`. Tidy it to a heavy, legible mark at 76 px.
- [ ] **Step 2: Menu.** Move the `<li>` to the end of the main shelf. The name reads `Wind map<span class="beta"><i>(</i>Beta<i>)</i></span>`, as Sonar's does. Port the picked control into the menu script as `toys.windmap`. `play` calls `enter(null)`; `rest` calls `leave()`.
- [ ] **Step 3: toys.json.** Set `"number": 33` (the next free number; check), `"sub": null`, `"emblem": "shared/emblems/windmap.svg"` and `"tier": "beta"`. Keep `nl` and `ipa`.
- [ ] **Step 4: Intro.** Add `<span class="intro-emblem" style="--emblem: url(../shared/emblems/windmap.svg)"></span>` before `intro-name`, as `trails/index.html` does. Set `intro-sub` to `Stimming No. 33`.
- [ ] **Step 5: Check.**
  - `node --check` passes for the menu scripts.
  - `/` shows Wind map at the end of the main shelf with (Beta), and `/?lab` no longer lists it.
  - A hover sends the icon through enter, move and leave with a clean console.
  - `/windmap/` plays the intro with the emblem.
  - Take stills at 1280 and 375 px.
- [ ] **Step 6: Commit.** `tools/commit.sh -m "Wind map: the main shelf as No. 33 (Beta), with its icon and emblem" --hunks <index.html, toys.json and picks.json hunks> -- shared/emblems/windmap.svg windmap/index.html .beans/stimming-5qae--toy-wind-map.md`

### Task 3: Chart grid

**Files:**
- Modify: `windmap/index.html` (`OUT_FS`, and the uniforms in `render()`)

**Interfaces:**
- Produces: `float grid(vec2 px, vec2 res)` in `OUT_FS`, returning a 0 to 1 coverage. Task 8 replaces its input with lon and lat on the sphere.

- [ ] **Step 1: Implement `grid()`.**
  - Major lines every 15 degrees (the short side spans 90 degrees); minor lines every 5 degrees.
  - Edge ticks 6 CSS px long at each major line, on all four stage edges.
  - Lines are anti-aliased with `fwidth`. Minor lines fade where they are closer than 6 px apart.
- [ ] **Step 2: Draw it after the plate.** After the plate is added: `c = mix(c, uGrid, major * 0.10 + minor * 0.04 + tick * 0.18)`. Remove today's pre-plate graticule mix.
- [ ] **Step 3: Check.** A harness still at 1280 and at 375 px, with two storms on Silk. Pass: the grid reads through the bright storm arms and does not dominate the dark areas. Show Tom.
- [ ] **Step 4: Commit.** `Wind map: a chart grid that reads through the wind`

### Task 4: Light pass

**Files:**
- Modify: `windmap/index.html` (bloom targets and passes; `EYE_GLOW` in `OUT_FS`; flash list; watchdog rungs)

**Interfaces:**
- Consumes: `bloomPass`, `BRIGHT_FS` and `BLUR_FS` patterns from `trails/index.html` (copy them; do not import).
- Produces: `flashes` array of `{ x, y, t0, kind: 'gust' | 'merge' }`, pushed by `gust()` and `onMerge()`, read by `render()` as `uniform vec4 uFlash[8]` (x, y, age, kind).

- [ ] **Step 1: Bloom.** Render the composite into a frame target. Bright pass at half size, threshold `smoothstep(0.45, 0.9, maxChannel)`. Blur at half and at quarter size. Add `0.28 * near + 0.18 * wide` in a final pass, the way Star trails' `OUT_FS` does.
- [ ] **Step 2: Eye glow.** In the composite, a ring at each low eye between 1 and 2 rc. Level `0.12 * clamp(|g| / 0.2)`, times `0.85 + 0.15 * sin(t * 1.7 + k)`. Use a warm-white tint. Highs get none.
- [ ] **Step 3: Flashes.** A gust is a radial light that expands over 0.3 s. A merge is a ring that expands from 0 to 4 rc over 0.6 s. Each fades with `exp(-age / τ)`.
- [ ] **Step 4: Ladder.** The rungs become: 1 pixel ratio, 2 bloom buffers half size, 3 particles half. `countK()` reads rung 3.
- [ ] **Step 5: Check.** Harness: merge two storms and grab stills at the merge frame and 0.3 s later; tap a gust and grab a still at 0.1 s. Pass: the ring and the flash read; the clean console holds; the drifting frame count is still 30 fps. Show Tom.
- [ ] **Step 6: Commit.** `Wind map: bloom, glowing eyes, gust flash and merge ring`

### Task 5: Gestures

**Files:**
- Modify: `windmap/index.html` (pointer machine; `vortices` records; `FIELD` and its CPU mirror; `psi()`; `stepStorms()`; sound voices; key strip)

**Interfaces:**
- Consumes: `spawnCyclone(x, y, g, rc, held)`, `stepStorms(dt)`, `induced()`, `vTheta()`, `cpuVel()`, `voices()`, `whenRunning()`.
- Produces:
  - `spawnHigh(x, y) → vortex`, with `kind: 'high'`, `q` (outflow strength) and `g` (opposite sign to a low).
  - Vortex fields `vx`, `vy` (carried flick velocity, decays with τ 2 s).
  - `jets`: up to 4 records `{ pts: [[x, y] × 8], amp, age }`, plus `addJet(path)`.
  - GPU uniforms `uJet[32]` (vec4: x, y, amp, 0) and `uNJ`.

The press sorting:

```
pointerdown:
  core = live storm or high with dist < 1.5 rc   → mode 'grab' at once
  else                                            → mode 'press'
'press' + 8 px of travel  → 'spin' (as now; record the path)
'press' + 260 ms still    → 'high' (spawnHigh at the press point)
pointerup in 'spin':  straight ≥ 0.85, length ≥ 0.25, |g| < 0.03 → addJet(path); remove seed
pointerup in 'grab':  carry the pointer velocity of the last 100 ms
pointerup in 'press': gust (as now)
```

- [ ] **Step 1: Write the checks first.** Add them to the harness script as named functions, each returning true or false:
  - `tapIsGust`: a down/up pair with 3 px of travel adds one gust and no storm and no jet.
  - `holdIsHigh`: down, pump 20 frames (0.33 s), then up. One record has `kind 'high'`.
  - `slowCircle`: down, then a 2 px move each frame along a circle of radius 40 px. Count how many starts out of 10 become highs. Record the number in the bean.
  - `grabFlick`: down inside a storm core, then moves at 600 px/s for 100 ms, then up. 1 s later the storm has moved more than 0.1 world along the throw.
  - `grabHigh`: down inside a high, then a drag. The high moves and no storm spawns.
  - `straightIsJet`: a 400 px straight drag in 0.3 s gives one jet and no live seed storm.
  - `lowsAvoidHigh`: a low placed 2 rc from a high ends farther from it after 3 s.
- [ ] **Step 2: Run the checks; they fail.** `holdIsHigh`, `grabFlick`, `grabHigh`, `straightIsJet` and `lowsAvoidHigh` fail; `tapIsGust` passes.
- [ ] **Step 3: High.**
  - In `FIELD` and `cpuVel`, a high adds its vortex term with `g` (clockwise in the north) plus `+r̂ * q / (2π r) * (1 - exp(-r² / rc²))`.
  - It is excluded from the eye respawn, the eye pass and the eye glow.
  - It grows while held: `q` rises to 0.08 and `g` to 0.06, over 3 s. After release it fades with amp τ 8 s.
  - Lows feel an extra repulsion `0.04 * (1 - r / 3rc)` inside 3 rc.
  - Highs never merge with lows; two highs merge like lows.
  - `psi()` gains the high's term.
- [ ] **Step 4: Grab and flick.** A held storm follows the pointer's world position. Smoothed pointer velocity: an exponential moving average with τ 0.1 s. On release, set `v.vx`, `v.vy` from it. `stepStorms` adds the carried velocity and decays it with `exp(-dt / 2)`.
- [ ] **Step 5: Jet.**
  - `addJet(path)` resamples the path to 8 evenly spaced points.
  - Field: for each jet, the nearest segment's unit direction × `0.35 * amp * exp(-(d / 0.04)²)`.
  - Amp: up over 0.5 s, then `exp(-age / 20)`; remove the jet below 0.01.
  - Each point drifts with `baseVel` × 0.5.
  - `psi()` gains a matching term, `0.35 * amp * 0.04 * 0.886 * tanh(1.13 * signed d / 0.04)` along the segment normal. GLSL has no erf, and tanh(1.13 x) is close enough for isobars.
  - At most 4 jets; a fifth replaces the oldest.
- [ ] **Step 6: Sound.**
  - High: a sine drone at 55 to 70 Hz with a slow filter. Gain follows `q` while held; it stops on release.
  - Flick: `whoosh()` with a higher band.
  - Jet: noise through a band that sweeps from 300 to 1,400 Hz over the drag time, panned along the path.
  - All jittered, all through `whenRunning`.
- [ ] **Step 7: Key strip.** `keys: [['drag', 'circle to spin a storm'], ['click', 'gust'], ['hold', 'high'], ['space', 'cyclone']]`.
- [ ] **Step 8: Run the checks; they pass.** Also re-run the round-1 Fujiwhara check: two spins 0.2 apart still merge within 12 s.
- [ ] **Step 9: Commit.** `Wind map: hold for a high, flick a storm, paint a jet stream`

### Task 6: Chart layer, part 1: tracks and marks

**Files:**
- Modify: `windmap/index.html` (a `chart` canvas over the WebGL canvas; Settings rows `chart` and `marks`)

**Interfaces:**
- Consumes: `vortices`, `S`, `dpr`, `fitCanvas` results from `resize()`.
- Produces:
  - `const chart = { canvas, ctx, draw() }`. `draw()` is called once per simulated frame, after `render()`.
  - `toScreen(x, y) → [px, py]` in CSS px. Task 8 replaces its body for the globe.
  - Per-storm `track` arrays of `{ x, y, g, t }`.

- [ ] **Step 1: Canvas.** An absolutely positioned `<canvas>` sized from the same `fitCanvas` call, with `pointer-events: none`. Resized in `resize()`. Cleared and drawn only when the sim steps.
- [ ] **Step 2: Settings.** Two toggle rows, persisted: `{ type: 'toggle', id: 'chart', label: 'Chart', value: false }` and `{ type: 'toggle', id: 'marks', label: 'Marks', value: false }`. Marks draws only when Chart is on.
- [ ] **Step 3: Tracks.**
  - Each low pushes a point every 1.5 s, at most 40.
  - Draw a dot of radius `1 + 4 * clamp(|g| / 0.3)` CSS px.
  - Alpha is `0.6 * exp(-age / 30)`; ink is `css([0.82, 0.02, 80])`.
- [ ] **Step 4: Marks.** `L` at each low and `H` at each high, in the slab face at 14 CSS px. Alpha is the storm's amp; ink as the tracks.
- [ ] **Step 5: Check.** Harness: Chart on, two storms; pump 20 s; take a still; resize the tab to 375 px; take a still. Pass: the dots trail each storm on both stills, with no offset after the resize (Review Focus 5). Clean console.
- [ ] **Step 6: Commit.** `Wind map: storm tracks and pressure marks on a chart layer`

### Task 7: Chart layer, part 2: fronts

**Files:**
- Modify: `windmap/index.html` (`chart.draw()`)

**Interfaces:**
- Consumes: `cpuVel(x, y, out)` for streamline tracing (it works on both paths once `buildGrid()` has run; call `buildGrid()` lazily on the GPU path too); `toScreen()`.
- Produces: `frontsFor(v) → [{ kind: 'warm' | 'cold' | 'occluded', pts }]`.

- [ ] **Step 1: Trace.**
  - For each low older than 3 s, start at 1.5 rc on bearing `θ0 + spin`: warm at θ0 = 60 degrees, cold at θ0 = 200 degrees. `spin` = storm age × 0.15 rad/s × sign(g).
  - Step outward along the flow, with RK2 steps of 0.004 world, up to a length of `min(6 rc, age × 0.02)`.
- [ ] **Step 2: Symbols.**
  - Draw each front as a 1.25 CSS px line.
  - Warm: half-moons on the leading side, radius 3.5 CSS px, every 14 px, ink `css([0.62, 0.12, 25])`.
  - Cold: triangles of the same size and step, ink `css([0.62, 0.1, 250])`.
  - From age 25 s, the first `min(1, (age - 25) / 15)` of both fronts merges into one occluded front with alternating symbols, ink `css([0.6, 0.1, 310])`.
  - All alpha times the storm's amp.
- [ ] **Step 3: Check.** Harness: one storm, Chart on; grab stills at 5 s, 20 s and 35 s. Pass: warm and cold fronts grow, then occlude. Show Tom.
- [ ] **Step 4: Commit.** `Wind map: warm, cold and occluded fronts`

### Task 8: Globe

**Files:**
- Modify: `windmap/index.html` (projection state; world domain; `FIELD` noise; CPU noise; update-pass wrap; composite raycast; pointer mapping; `toScreen()`; Settings row `proj`)

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `opts.proj`: `'chart' | 'globe'`.
  - `world()` → `{ AX, AY, wrap }`. Chart: screen-sized, no wrap. Globe: AX 2, AY 1, wrap true.
  - `wdx(dx)` → the wrapped shortest dx (identity in Chart). Used by every distance in storms, jets, merges and the eye pass.
  - `screenToWorld(cssX, cssY) → [x, y] | null`. Null means a miss off the disc.
  - `globe = { yaw, pitch, spinV }`.

- [ ] **Step 1: Write the checks first.**
  - `seamFree`: a storm placed at x = 1.98 with east drift crosses the wrap. Its uniform x goes from about 1.99 to about 0.01, and its g is unchanged.
  - `noSeamInField`: the CPU `baseVel` at x = 0.0005 and x = 1.9995 differs by less than 2 %.
  - `pointerOnDisc`: `screenToWorld` at the disc centre returns the world point under `globe.yaw`; a point outside the disc returns null.
  - `switchMidGesture`: hold a spin, then flip `proj` through the Settings row. After that no vortex is held and `__errs` is empty.
- [ ] **Step 2: Run the checks; they fail.**
- [ ] **Step 3: Domain and noise.**
  - In Globe, `psiN` samples `snoise(vec3(cos(π x) * R, sin(π x) * R, y * 1.6 * 2 + t * 0.03))` plus a second octave on the same cylinder, with `R = 1.6 / π`. The JS `psiN` mirrors it.
  - Particles wrap in x instead of dying, on the GPU update pass and in `cpuStep`. They still die at y < 0 or y > 1.
  - `buildGrid()` spans the global domain in Globe, so the CPU fallback wraps too.
  - Storms, jets and merge distances use `wdx`.
- [ ] **Step 4: Plate and composite.**
  - The plate is 2048 × 1024, or 1024 × 512 at watchdog rung 1.
  - `OUT_FS` gains a globe branch: for each pixel inside the disc (radius 0.46 × the short side), find the sphere point under an orthographic camera, rotate it by `pitch` and `yaw`, and read lon and lat. Sample the plate at `(lon / 2π, lat / π + 0.5)`.
  - Outside the disc: slate.
  - The limb gets a rim `pow(1 - cosθ, 3) * 0.25` in a cool tint.
  - `grid()` takes lon and lat on the globe.
- [ ] **Step 5: Turn and pointer.**
  - The globe turns at 3 degrees per second while drifting, and eases to 0 as the loop eases to sleep. Reduced motion: no auto turn.
  - A press that misses the disc drags `yaw` and `pitch` (pitch clamped to ±60 degrees) and flings with τ 1.5 s.
  - All gestures use `screenToWorld`.
- [ ] **Step 6: Chart layer.** `toScreen` projects through the globe. Points on the far side (cosθ < 0) are skipped; front polylines break there.
- [ ] **Step 7: Switching.**
  - Add a Settings choice row `{ id: 'proj', label: 'Projection', options: Chart, Globe, persist: true }`.
  - A switch ends any press (`endPress(false)`), maps storms (Chart to Globe: screen-relative position onto the visible hemisphere; Globe to Chart: the visible hemisphere back to the screen), re-seeds particles in the new domain, clears the plate and prerolls 1 s.
- [ ] **Step 8: Run the checks; they pass.** Then take stills of the globe at 1280 and 375 px with two storms, a jet and Chart on. Show Tom.
- [ ] **Step 9: Commit.** `Wind map: a globe projection`

### Task 9: Round-2 QA and close

**Files:**
- Modify: `.beans/stimming-5qae--toy-wind-map.md`

- [ ] **Step 1: Full QA in both projections.** Run Q1 to Q10 from `docs/plans/README.md` through the harness.
  - Q4: drifting at 30 fps and asleep at 60 s, now also with a high held and a jet alive.
  - Q9: sound for the new voices.
  - Q10: frame times with bloom, chart and globe on, at High.
- [ ] **Step 2: Bean.** Tick the round-2 checklist, write the QA numbers and the `slowCircle` count, and record the session time.
- [ ] **Step 3: Commit.** `Wind map: round 2 QA`
