# Observatory (`observatory`) implementation plan

Status: active · Bean: `stimming-wqq9`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An observatory on a hill under tonight's real sky. A green aiming laser turns the cupola, a pick opens the slit and slews the tube, and you can enter the telescope for real and pseudo star data.

**Architecture:** A TypeScript toy in `observatory/src/`, bundled by `tools/build.mjs` to `observatory/dist/main.js`, on three.js 0.170.0 (WebGL). Pure logic (sky maths, catalog, dome, machine, clock, pseudo data) lives in `observatory/src/core/` with no three.js import, so Node tests import it directly. Scene, look and views build on it, as Railgun's `src/README.md` describes.

**Tech stack:** three.js 0.170.0, TypeScript 6.0.3, esbuild 0.25.10, Tone.js 15.0.4 through `audioKit()`, `shared/stim.js`, Node 26 `node --test` (native type stripping).

**Spec:** [observatory.md](observatory.md) (approved by Tom, 2026-11-17). Read it before each task.

## Global constraints

- Work in the worktree: `git worktree add .worktrees/stimming-wqq9 -b feature/stimming-wqq9`, `npm ci` there, serve with `PORT=8017 npm run dev` (port 8000 belongs to other chats). Merge by PR.
- Commit only with `tools/commit.sh -m "Observatory: what (stimming-wqq9)" -- <paths>`; shared files (`toys.json`, `index.html`, `package.json`, `CREDITS.md`) by `--hunks`.
- The importmap is copied word for word from `docs/standards/code.md`. three.js 0.170.0 only. No new library.
- Never import from `railgun/src/` or `trails/`. Copy what you need into `observatory/src/` and credit the source file in a one-line comment.
- `core/` files: erasable TypeScript only (no `enum`, no parameter properties, no namespaces); relative imports end in `.ts`.
- Place: latitude 51° N, longitude 0°. Both are Dev rows. The shot faces south.
- Sky: tonight's real sky from the clock, always night, no moon.
- The machine moves at real speed or slower: cupola cap 3°/s, tube cap 2°/s, shutter 4 s. Ease in and out.
- Sound muted by default, starts after a gesture. Idle: loop stops 60 s after the last input. Hidden: stop at once. Reduced motion: real speed only, no trails, crossfade instead of the flight.
- Budgets: 30 fps or better, first frame under 3 s, toy files under 1 MB, catalog files under 300 KB.
- Code comments: ASD-STE100, `.claude/rules/adjudant-code.md`. Prose: no em dashes.
- **Tom's gates** (stop and show, commit nothing visible before his yes): the blockout (Task 3), the catalog download (Task 4), the Lab menu entry (Task 3), the look (Task 7), the eyepiece (Task 9).

## Review focus

1. **Aim below the horizon or at the zenith.** The laser clamps to altitude 5° to 85°; the cupola never spins at the zenith. Test in Task 1.
2. **Azimuth wrap.** From 350° to 10° the cupola turns 20° the short way, never 340°. Test in Task 1.
3. **The target sets while tracked, or the page wakes hours later.** The machine goes to `lost`, the tracking light goes off, the tube parks; nothing points under the ground. Test in Task 6.
4. **A tap on an empty patch of sky.** No pick, no state change, the laser stays. Test in Task 6.
5. **Touch at 375 px.** A drag aims; a press that moves less than 8 px and lasts under 400 ms is a tap and picks. Test in Task 6.

---

### Task 1: Sky maths and the dome

**Files:**
- Create: `observatory/src/core/sky.ts`, `observatory/src/core/dome.ts`
- Test: `tests/observatory-sky.test.mjs`, `tests/observatory-dome.test.mjs`

**Interfaces:**
- Produces:
  - `type AltAz = { alt: number; az: number }` (degrees; az from north through east)
  - `gmst(ms: number): number`: degrees, 0 to 360, for a UTC time in ms
  - `lst(ms: number, lonDeg: number): number`: degrees
  - `toAltAz(raDeg: number, decDeg: number, lstDeg: number, latDeg: number): AltAz`
  - `toRaDec(a: AltAz, lstDeg: number, latDeg: number): { ra: number; dec: number }`
  - `clampAim(a: AltAz): AltAz`: altitude 5° to 85°
  - `azDelta(from: number, to: number): number`: signed, −180 to 180
  - `stepAxis(cur: number, target: number, vel: number, dt: number, cap: number, accel: number, wrap: boolean): { pos: number; vel: number }`

- [ ] **Step 1: Write the failing tests**

```js
// observatory-sky.test.mjs
test('gmst at J2000.0 is 280.46061837°', () => assert.ok(Math.abs(gmst(Date.UTC(2000,0,1,12)) - 280.46061837) < 1e-6));
test('a star at RA = LST and Dec 0 transits south at 90° − lat', () => { const a = toAltAz(123, 0, 123, 51); assert.ok(Math.abs(a.alt - 39) < 1e-9); assert.ok(Math.abs(a.az - 180) < 1e-9); });
test('Polaris stands near the latitude at any hour', () => { for (let h = 0; h < 24; h++) assert.ok(Math.abs(toAltAz(37.95, 89.26, h * 15, 51).alt - 51) < 0.8); });
test('toRaDec undoes toAltAz', () => { const a = toAltAz(80, 20, 200, 51), b = toRaDec(a, 200, 51); assert.ok(Math.abs(b.ra - 80) < 1e-9 && Math.abs(b.dec - 20) < 1e-9); });
// observatory-dome.test.mjs
test('azDelta takes the short way', () => { assert.equal(azDelta(350, 10), 20); assert.equal(azDelta(10, 350), -20); });
test('clampAim keeps 5° to 85°', () => { assert.equal(clampAim({ alt: -20, az: 90 }).alt, 5); assert.equal(clampAim({ alt: 89, az: 90 }).alt, 85); });
test('stepAxis never beats the cap and lands', () => { let s = { pos: 350, vel: 0 }; for (let i = 0; i < 600; i++) { s = stepAxis(s.pos, 10, s.vel, 1/30, 3, 1.5, true); assert.ok(Math.abs(s.vel) <= 3 + 1e-9); } assert.ok(Math.abs(azDelta(s.pos, 10)) < 0.05); });
```

- [ ] **Step 2: Run, expect FAIL** (`node --test tests/observatory-sky.test.mjs tests/observatory-dome.test.mjs`: module not found)
- [ ] **Step 3: Implement `sky.ts` and `dome.ts`.** GMST: the IAU 1982 formula in degrees (Meeus 12.4). `stepAxis` brakes in time to stop at the target (v² = 2·a·d), and wraps to 0 to 360 when `wrap`.
- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit** `observatory/src/core/sky.ts observatory/src/core/dome.ts tests/observatory-sky.test.mjs tests/observatory-dome.test.mjs`

### Task 2: The toy shell and the type check

**Files:**
- Create: `observatory/index.html` (copy the page shell of `railgun/index.html`: head, importmap, `<script type="module" src="./dist/main.js">`), `observatory/tsconfig.json` (copy of `railgun/tsconfig.json`), `observatory/src/main.ts`, `observatory/src/setup.ts`, `observatory/src/glsl.d.ts` (copy), `observatory/src/README.md` (modules table, load order)
- Modify: `package.json` scripts by hunk: `"check:observatory": "tsc --noEmit -p observatory/tsconfig.json"`, appended to `check`

**Interfaces:**
- Produces: `setup.ts` exports `renderer: THREE.WebGLRenderer`, `scene: THREE.Scene`, `camera: THREE.PerspectiveCamera`, `stageEl: HTMLElement`; `initPage({ id: 'observatory', bar })` runs here.

- [ ] **Step 1:** `npm run build`; expect `observatory/dist/main.js` written.
- [ ] **Step 2:** `npm run check`; expect 0 errors.
- [ ] **Step 3:** Open `http://localhost:8017/observatory/`; expect a black canvas, no console errors.
- [ ] **Step 4: Commit** the files above, `package.json` by hunk.

### Task 3: Blockout (Tom's gate)

**Files:**
- Create: `observatory/src/world/hill.ts`, `observatory/src/world/observatory.ts`, `observatory/src/world/laser.ts`, `observatory/src/sky/stars.ts` (placeholder: 3,000 random points on a sphere), `observatory/src/view/camera.ts`, `observatory/src/input.ts`, `observatory/src/loop.ts`
- Modify (after Tom's yes only): `toys.json`, `index.html` Lab shelf and its icon hook, by hunk, shaped as Lantern lake's entry in commit `acd73c78`. The tile art is emblem A: `icons/spike/emblems/observatory-a.svg`.

**Interfaces:**
- Consumes: `clampAim`, `stepAxis`, `azDelta` (Task 1).
- Produces:
  - `observatory.ts`: `buildObservatory(): { root: THREE.Group; cupola: THREE.Group; shutter: THREE.Object3D; tube: THREE.Group; setCupola(az: number): void; setShutter(open01: number): void; setTube(a: AltAz): void; slitTop: THREE.Vector3 }`
  - `laser.ts`: `buildLaser(): { mesh: THREE.Mesh; aim(from: THREE.Vector3, a: AltAz): void; visible: boolean }`
  - `camera.ts`: Dev rows eye, pitch, yaw, fov; default a low, wide shot, facing south, dome a third from the right, sky three quarters of the frame.
  - `input.ts`: `onAim(fn: (a: AltAz) => void)`, `onTap(fn: (a: AltAz) => void)`; alt and az come from the camera ray through the pointer.

- [ ] **Step 1:** Build grey meshes: hill, stone drum, dome with a slit and a shutter, tube on a fork. The icon sets the shapes.
- [ ] **Step 2:** The laser follows the pointer; the cupola follows its azimuth with `stepAxis` at 3°/s.
- [ ] **Step 3:** The loop runs while the cupola moves or input is fresh; it stops 60 s after the last input.
- [ ] **Step 4:** Screenshots at 1280 × 800 and 375 × 812 with headless Playwright 1.63.0; check the console is clean.
- [ ] **Step 5: Gate.** Show Tom the two stills and the live page. Ask for the blockout sign-off and, in the same message, for the Lab menu entry.
- [ ] **Step 6: Commit** the scene files; the `toys.json` and `index.html` hunks only after his yes. Tick "Blockout, signed off by Tom" in the bean.

### Task 3b: Woods and the complex (Tom's blockout review, 2026-11-17)

Tom on the first blockout: "we want woods and a view of the complex around it". The spec's "The outside view" holds the approved reading.

**Files:**
- Create: `observatory/src/world/woods.ts`, `observatory/src/world/complex.ts`
- Modify: `observatory/src/world/hill.ts`, `observatory/src/world/observatory.ts`, `observatory/src/view/camera.ts`, `observatory/src/loop.ts`, `observatory/src/README.md`

**Interfaces:**
- Produces:
  - `observatory.ts`: `buildDome(size: number): Dome`, where `Dome` is the object `buildObservatory` returned (`root`, `cupola`, `shutter`, `tube`, `setCupola`, `setShutter`, `setTube`, `slitTop`)
  - `complex.ts`: `buildComplex(): { root: THREE.Group; main: Dome; small: [Dome, Dome] }`, with the stone building (lit windows), the roll-off shed and the road
  - `woods.ts`: `buildWoods(): THREE.InstancedMesh`: conifers over the hill, a clearing at the top, a gap for the road

- [ ] **Step 1:** Woods: instanced conifers (one draw call) over the hill, a clearing at the top.
- [ ] **Step 2:** Complex: the main dome, two smaller domes at different angles to the camera, the stone building, the shed, the road up through the woods.
- [ ] **Step 3:** Camera: from a nearby rise, a little above the treetops, about 300 m from the complex; sky the upper 60%; the complex reads at 375 px.
- [ ] **Step 4:** The two small domes turn to the laser's azimuth a few seconds after the main dome (delays about 1.5 s and 3 s), each at its own cap (about 2.5°/s and 2°/s). The laser leaves the main dome.
- [ ] **Step 5:** Stills at 1280 and 375, rest and aim; the gate as in Task 3, Steps 5 and 6.

### Task 4: The catalog (Tom's gate for the download)

**Files:**
- Create: `tools/hyg-cut.mjs`, `observatory/stars.bin`, `observatory/stars.json`, `observatory/src/core/catalog.ts`
- Modify: `CREDITS.md` by hunk (HYG, its URL and CC BY-SA 4.0; the cut files carry the same licence)
- Test: `tests/observatory-catalog.test.mjs`

**Interfaces:**
- Produces:
  - `type Star = { hip: number; ra: number; dec: number; mag: number; ci: number; dist: number; spect: string; name: string; bayer: string }` (ra and dec in degrees, dist in parsecs, NaN when unknown)
  - `decodeStars(bin: ArrayBuffer, meta: { names: Record<number, string>; bayer: Record<number, string>; spect: string[] }): Star[]`
  - `loadStars(url: string): Promise<Star[]>`

- [ ] **Step 0: Gate.** Ask Tom for the download with the file name, the source URL and the size. Download to the scratchpad only.
- [ ] **Step 1: Write the failing tests:** about 9,000 stars (8,500 to 9,300) at mag ≤ 6.5; Sirius `hip 32349`, `mag` −1.46 ± 0.01, `dec` −16.7 ± 0.05, `name` "Sirius"; the Sun (HYG id 0) is not in the list; `stars.bin` + `stars.json` under 300 KB.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3:** `tools/hyg-cut.mjs <hyg.csv>` writes the two files; `catalog.ts` decodes them. Packing is the builder's call.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** the tool, the two data files, `catalog.ts`, the test, `CREDITS.md` by hunk.

### Task 5: Tonight's real sky

**Files:**
- Modify: `observatory/src/sky/stars.ts` (catalog points replace the placeholder)
- Create: `observatory/src/core/clock.ts`
- Test: `tests/observatory-clock.test.mjs`

**Interfaces:**
- Consumes: `lst`, `toAltAz` (Task 1), `loadStars` (Task 4).
- Produces:
  - `makeClock(nowMs: () => number): { skyMs(): number; speed: number; setSpeed(x: number): void; trails(): boolean; wake(): void; step(dtReal: number): void }`
  - `TRAIL_SPEED = 120` (sky seconds per real second); `trails()` is true at or above it.

- [ ] **Step 1: Write the failing tests:** at speed 1 the sky time follows the real clock within 1 ms; at speed 600, 1 s real gives 600 s sky; `trails()` false at 119, true at 120; `wake()` after 3 h asleep eases the sky to real time over 1 s (half way at 0.5 s within 10 %).
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement.** **Step 4: Run, expect PASS.**
- [ ] **Step 5:** Stars: size and brightness from magnitude, colour from the colour index, the sky group turned by LST at 51° N. Check by eye: Polaris stays put; the bright stars of the real hour stand where a sky chart for 51° N, 0° puts them.
- [ ] **Step 6: Commit.**

### Task 6: The machine

**Files:**
- Create: `observatory/src/core/machine.ts`, `observatory/src/core/pick.ts`, `observatory/src/core/gesture.ts`
- Modify: `observatory/src/loop.ts`, `observatory/src/input.ts`
- Test: `tests/observatory-machine.test.mjs`

**Interfaces:**
- Consumes: Tasks 1, 4, 5.
- Produces:
  - `pickStar(stars: Star[], aim: AltAz, lstDeg: number, latDeg: number, radiusDeg = 3): Star | null`: the brightest star within the radius, above 5° altitude
  - `classify(dxPx: number, dyPx: number, ms: number): 'tap' | 'drag'`: tap when moved < 8 px and < 400 ms
  - `type Phase = 'aim' | 'open' | 'slew' | 'track' | 'hold' | 'lost'`
  - `makeMachine(): { phase: Phase; target: Star | null; pick(s: Star): void; step(dt: number, ctx: { targetAlt: number; targetAz: number; trails: boolean }): void; cupolaAz: number; tubeAlt: number; tubeAz: number; shutter01: number; tracking: boolean }`

- [ ] **Step 1: Write the failing tests:**
  - an empty patch: `pickStar` returns null; the machine stays in `aim`
  - shut shutter: `pick` goes to `open` and reaches `slew` after 4 s
  - `slew` reaches `track` once cupola and tube are within 0.2°; `tracking` true
  - `trails: true` in `track` gives `hold`; `tracking` false; back to false gives `slew`
  - target altitude under 5° gives `lost`; the tube parks at 30° altitude; `tracking` false
  - `classify(3, 4, 200)` is `'tap'`; `classify(12, 0, 200)` and `classify(2, 2, 600)` are `'drag'`
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement.** **Step 4: Run, expect PASS.**
- [ ] **Step 5:** Wire it: a tap picks, a drag aims, the scene reads the machine each frame. The tracking light is a small lamp on the drum.
- [ ] **Step 6: Commit.**

### Task 6b: The pick sequence and the lights (Tom, 2026-11-17)

Spec: "The pick sequence and the lights" in [observatory.md](observatory.md).

**Files:**
- Create: `observatory/src/core/sequence.ts`, `observatory/src/view/cuts.ts`, `observatory/src/world/lights.ts`
- Modify: `observatory/src/loop.ts`, `observatory/src/view/camera.ts`, `observatory/src/world/complex.ts`
- Test: `tests/observatory-sequence.test.mjs`

**Interfaces:**
- Consumes: `makeMachine` and `Phase` (Task 6).
- Produces:
  - `type Cut = { at: number; shot: 'edge' | 'slit' | 'roll' | 'gear'; dur: number }`
  - `CUTS: Cut[]`: 3 or 4 cuts, 6 to 8 s in all
  - `cutAt(t: number): Cut | null`: the cut that shows at sequence time t; null after the last cut (back to the wide shot)
  - `lightLevel(phase: Phase, prev: number, dt: number): number`: 1 in `aim`, dims toward 0.35 in `open` and `slew`, 0 in `track`, `hold` and inside the telescope; it rises back to 1 over about 4 s
  - `lights.ts`: `buildLights(complex): { set(level: number): void }` for windows, door lamps and road lamps

- [ ] **Step 1: Write the failing tests:** `CUTS` covers 6 to 8 s with no gap; `cutAt(0)` is the `edge` cut; `cutAt(total + 0.01)` is null; `lightLevel('track', 1, 0.1)` falls toward 0 and reaches 0 within 3 s of steps; `lightLevel('aim', 0, 0.1)` reaches 1 within 4 to 5 s, not sooner than 3.5 s.
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement.** **Step 4: Run, expect PASS.**
- [ ] **Step 5:** On load the main dome's shut slit faces the camera. A pick runs the cuts (each a close camera with a long lens, about 20 to 35° fov down to 8 to 12°, a slow drift inside each cut) while the shutter opens and the tube rolls through; then the wide shot, the turn and the hunt. Reduced motion: one crossfade to the wide shot, no cuts.
- [ ] **Step 6:** Stills of each cut and the wide shot with lights at 1, 0.35 and 0; show Tom (a visible change).
- [ ] **Step 7: Commit.**

### Task 7: The look (Tom's gate)

**Files:**
- Create: `observatory/src/post/` (chain, bloom, grade, grain), `observatory/src/sky/haze.ts`, copied and trimmed from `railgun/src/post/` and `railgun/src/sky/`
- Modify: `observatory/src/world/*.ts` (materials, the lit door, starlight), `observatory/src/world/laser.ts` (the beam in haze: solid near the dome, fading with height)

- [ ] **Step 1:** Copy the post chain and the haze; credit each source file in a one-line comment.
- [ ] **Step 2:** Materials: white dome, stone drum, steel tube, a warm lit door, a faint horizon glow, no moon.
- [ ] **Step 3:** Stills at 1280 and 375 next to a Railgun night still.
- [ ] **Step 4: Gate.** Show Tom; change one thing at a time on his notes (memory: one visual change at a time).
- [ ] **Step 5: Commit** with his words in the message.

### Task 7b: The opening, dusk into night (Tom, 2026-11-17)

**Files:**
- Create: `observatory/src/core/opening.ts` (the opening's timeline: progress 0 to 1, sun depression, star magnitude limit, sky speed, play lock; no three.js), `tests/observatory-opening.test.mjs`
- Modify: `observatory/src/sky/stars.ts`, `observatory/src/sky/haze.ts`, `observatory/src/world/*.ts`, `observatory/src/post/grade.ts`, `observatory/src/loop.ts`, `observatory/src/input.ts`, `observatory/src/core/clock.ts`

- [ ] **Step 1:** Test then build `core/opening.ts`: 45 s from sun 4° below the horizon to 18° below; the star limit rises from about magnitude 0 to 6.5; the sky clock ends at real now at speed 1, under `TRAIL_SPEED` throughout; `skip()` reaches night in about 1.5 s; reduced motion starts at night.
- [ ] **Step 2:** The dusk light: a warm west from tonight's sunset azimuth at 51° N, the sky from deep blue to slate, last light on the domes, the drum and the crowns; it eases into the Task 7 night look.
- [ ] **Step 3:** The complex lights come on one by one as the sky darkens; the laser and picks unlock at full night.
- [ ] **Step 4:** Stills at 1280 and 375 at 0 s, 15 s, 30 s and 45 s; frame time at 375.
- [ ] **Step 5: Gate.** Show Tom. **Commit** locally with his words.

### Task 7c: Far mountains (Tom, 2026-11-17)

**Files:** Create `observatory/src/world/far.ts` (copied and trimmed from `railgun/src/world/farcountry.ts` where it fits). Modify `observatory/src/sky/haze.ts` only to receive the ridges.

- [ ] **Step 1:** Two or three ridgelines on the southern horizon, 10 to 40 km out, 1 to 3° high; no hard horizon line left.
- [ ] **Step 2:** They take the opening's light: warm toward the west at dusk, dark on the sky glow at night.
- [ ] **Step 3:** Stills at 1280 and 375, dusk 0 s and night; frame time at 375. **Gate:** show Tom; commit locally with his words.

### Task 7d: Distance haze (Tom, 2026-11-17)

**Files:** Modify `observatory/src/sky/haze.ts`, `observatory/src/world/far.ts`.

- [ ] **Step 1:** Each ridge further back fades more into the sky; the valley haze runs out to the mountains.
- [ ] **Step 2:** Stills as in 7c. **Gate:** show Tom; commit locally with his words.

### Task 7e: Distant clouds (Tom, 2026-11-17)

**Files:** Create `observatory/src/clouds/` (copied and trimmed from `railgun/src/clouds/`; credit each file). Railgun's cloud files must not change.

- [ ] **Step 1:** A low raymarched cloud bank above the far ridges only; the sky over the hill stays clear.
- [ ] **Step 2:** The clouds take the sunset at dusk and go dark at night; the pass renders only when the loop renders.
- [ ] **Step 3:** Frame time at 1280 and 375 inside the budget (30 fps or better); a lower step on the slow-frame rung if needed.
- [ ] **Step 4:** Stills as in 7c. **Gate:** show Tom; commit locally with his words.

### Task 7f: Live trial of the pick sequence (Tom, 2026-11-17)

- [ ] **Step 1:** Serve the branch on port 8037 and open it in Tom's tab; Tom plays the cuts. Changes from his notes, one at a time.

### Task 8: Fast time and trails

**Files:**
- Create: `observatory/src/sky/trails.ts` (accumulate and decay pass, ported from `trails/index.html`, the `decay` and `seg` programs)
- Modify: `observatory/src/post/chain.ts`, `observatory/src/view/camera.ts` (lens lean off while `clock.trails()`), `observatory/src/setup.ts` (the `Time` slider)

- [ ] **Step 1:** The `Time` slider maps 0 to 1 onto speed 1 to 3,600, on a log scale.
- [ ] **Step 2:** Under `TRAIL_SPEED` the trail buffer clears and the pass is skipped; above it, stars accumulate.
- [ ] **Step 3:** Reduced motion: the slider is fixed at 1, no trails.
- [ ] **Step 4:** Check by eye: at full speed the trails are arcs around Polaris; the machine holds; a drop to speed 1 slews back.
- [ ] **Step 5: Commit.**

### Task 9: Inside the telescope (Tom's gate)

**Files:**
- Create: `observatory/src/core/pseudo.ts`, `observatory/src/view/eyepiece.ts`, `observatory/src/view/flight.ts`, `observatory/src/view/hud.ts` (DOM text over the canvas)
- Test: `tests/observatory-pseudo.test.mjs`

**Interfaces:**
- Consumes: `Star`, the machine, the clock.
- Produces:
  - `tempFromCI(ci: number): number`: Ballesteros (2012), `4600 * (1 / (0.92 * ci + 1.7) + 1 / (0.92 * ci + 0.62))`
  - `lightLeftYear(distPc: number, year: number): number`: `Math.round(year - distPc * 3.26156)`
  - `spectrumLines(spect: string): number[]`: line positions 0 to 1 (Balmer for A, Ca II H and K for G and K, TiO bands for M); the same input always gives the same output
  - `fieldStars(raDeg: number, decDeg: number, fovDeg = 2): { dx: number; dy: number; mag: number }[]`: pseudo faint stars, seeded by sky position, 30 to 60 of them
  - `enter(): void`, `leave(): void` on the view; `Enter` is disabled unless the machine is in `track`

- [ ] **Step 1: Write the failing tests:** `tempFromCI(0.65)` within 5,600 to 6,000 K; `tempFromCI(0)` within 9,800 to 10,300 K; `lightLeftYear(2.64, 2026)` is 2017; `spectrumLines('A1V')` holds the Balmer lines and equals a second call; `fieldStars(101.3, -16.7)` equals a second call and has 30 to 60 stars, every one under 1° from the centre.
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement.** **Step 4: Run, expect PASS.**
- [ ] **Step 5:** The flight: through the slit and down the tube in 2 s (reduced motion: a crossfade). The round 2° field, the star with a slight shimmer, the real neighbours and the pseudo faint stars. The HUD as in the spec sketch. A drag nudges the field; a tap on a real star slews to it; Back and Esc return.
- [ ] **Step 6: Gate.** Show Tom stills of three stars (Sirius, Vega, Betelgeuse or what is up tonight) and the live page.
- [ ] **Step 7: Commit** with his words.

### Task 10: Sound, bar, QA and the toy doc

**Files:**
- Create: `observatory/src/sound/` (dome motor, shutter, quiet wind), `docs/toys/observatory.md` (from `docs/toys/_template.md`)
- Modify: `observatory/src/setup.ts` (Bar v2: `Enter` (E), `Back` (Esc), the `Time` slider; Settings: Letterbox, Resolution, Quality; Dev rows), `observatory/src/qa.ts` (`window.__qa`)

- [ ] **Step 1:** Sound through `audioKit()`, muted by default, `stimming.observatory.sound`; no running nodes when asleep.
- [ ] **Step 2:** `tests/run.sh http://localhost:8017/tests/bar-v2.html`; expect pass.
- [ ] **Step 3:** `node tools/loadtime.mjs` on the page; first frame under 3 s. Frame rate at 1280 and 375 at or above 30 fps; the slow-frame step works.
- [ ] **Step 4:** QA stills at 1280 and 375 into `docs/qa/observatory/`; hidden tab stops the loop; 60 s idle stops it.
- [ ] **Step 5:** `npm run check` and every `tests/observatory-*.test.mjs` pass.
- [ ] **Step 6: Commit**, tick the bean, open the PR. Tom's sign-off (`data-done`) is his alone.
