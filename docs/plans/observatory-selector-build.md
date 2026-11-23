# Observatory selector and sky controls: build plan

Status: active · Bean: `stimming-iv1u`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The wide shot's two-beat selector (lock a star, then choose a telescope) and three sky controls (Night, Site, Sky).

**Architecture:** Pure logic in `core/` with node tests: the pick, the selector's states, the sky tables and the clock's swing. One DOM overlay module, `view/selector.ts`, draws the glow, the hairlines, the two text lines and the chips over the stage. `loop.ts` routes a tap to the selector and a choice to the machine. The sky controls are Bar v3 rows built in `setup.ts`.

**Tech Stack:** TypeScript (strict), three.js 0.170.0, `node --test` on `.ts` imports (Node 24 type stripping).

**Spec:** `docs/plans/observatory-selector.md`

## Global Constraints

- Commit only through `tools/commit.sh --no-push`. Never push, never merge into main.
- Touch only this bean's files. `view/cuts.ts` and `core/sequence.ts` belong to the obs-cuts session: no edit without its yes.
- Comments: ASD-STE100, double density, twelve words or fewer per line.
- No new library. Settings persist under `stimming.observatory.<key>`.
- Idle pages do no per-frame work. Reduced motion: no swing streak; the sky jumps.
- `npm run check` shows 0 errors. `node --test tests/observatory-*.test.mjs` passes.

## Review Focus

1. A tap on empty sky while locked: the lock lets go, no pick, no beam.
2. A star that sets below 5° while locked: the lock lets go.
3. The chips at a screen edge and at 375 x 812: both chips stay on screen, 44 px tall on touch.
4. A Night or Site change while the machine tracks: the machine follows the star to its new place, or lets go if it is under 5°.
5. A tap during the cuts or the opening: it skips, as today; the selector does not lock.

---

### Task 1: The pick a hover shows

**Files:** Modify `observatory/src/core/pick.ts`. Test `tests/observatory-pick.test.mjs`.

**Produces:** `nearStar(stars: Star[], aim: AltAz, lstDeg: number, latDeg: number, radiusDeg = 1.5): Star | null`. The star with the lowest score `sep + 0.4 * mag` inside the radius, above 5°.

- [ ] Tests: a faint star 0.2° from the aim beats a bright one 1.4° away; of two stars at the same place, the brighter wins; nothing inside 1.5° gives null; a star at 4° altitude gives null.
- [ ] Run them, see them fail. Implement. Run them, see them pass.
- [ ] Commit.

### Task 2: The selector's states

**Files:** Create `observatory/src/core/selector.ts`. Test `tests/observatory-selector.test.mjs`.

**Produces:**
- `type Scope = 'refractor' | 'reflector'`
- `type SelState = { mode: 'idle' | 'hover' | 'locked'; star: Star | null; last: Scope }`
- `makeSelector(): SelState` (mode idle, `last` reflector)
- `hover(s: SelState, star: Star | null): void` (no change while locked)
- `tapSel(s: SelState, star: Star | null): 'lock' | 'release' | 'none'` (a star locks it; an empty tap while locked releases)
- `choose(s: SelState, scope: Scope): Star | null` (locked only; sets `last`, mode idle, gives the star)
- `release(s: SelState): void`

- [ ] Tests for each transition above, and: `choose` while not locked gives null; `hover` while locked keeps the locked star.
- [ ] Fail, implement, pass, commit.

### Task 3: Sky tables and the swing

**Files:** Create `observatory/src/core/skyctl.ts`. Modify `observatory/src/core/clock.ts`. Tests `tests/observatory-skyctl.test.mjs`, `tests/observatory-clock.test.mjs`.

**Produces:**
- `NIGHTS: { id: string; label: string; lstH: number | null }[]`: `tonight` (null), `winter` 5.5, `spring` 10.5, `summer` 19.5, `autumn` 23.0
- `SITES: { id: string; label: string; lat: number }[]`: `home` 51, `tropics` 20, `equator` 0, `andes` -24; labels `Home 51° N`, `Tropics 20° N`, `Equator 0°`, `Andes 24° S`
- `bortleMag(b: number): number`: classes 1 to 9 give 7.6, 7.1, 6.6, 6.1, 5.6, 5.1, 4.6, 4.2, 4.0
- `nightShiftMs(realMs: number, lstH: number, lonDeg: number): number`: the shift in ms, within half a sidereal day, that puts the LST at `lstH`
- Clock: `shiftTo(ms: number, easeS: number): void` eases the sky's offset from real time to `ms`; `shifting(): boolean`; `shiftRate(): number`, sky seconds per real second during the ease, for the streak

- [ ] Tests: `lst(real + nightShiftMs(real, 5.5, 0), 0)` is 82.5° within 0.01°; the shift's size stays under 12 h of sidereal time; `bortleMag` table; the clock reaches the shift after `easeS` and runs at speed 1 after it; `shiftTo(0, 0)` jumps.
- [ ] Fail, implement, pass, commit.

### Task 4: A live latitude

**Files:** Modify `observatory/src/sky/stars.ts`, `observatory/src/world/dusk.ts`, `observatory/src/loop.ts` (imports only).

**Produces:** `stars.ts` exports `let LAT` and `setLat(deg: number): void`; every reader reads the live binding.

- [ ] `npm run check` passes. On the page, `__qa.lat` follows a `setLat` call; Polaris's altitude equals the latitude within 1°.
- [ ] Commit.

### Task 5: The selector overlay

**Files:** Create `observatory/src/view/selector.ts`. Modify `observatory/index.html` (its CSS only).

**Consumes:** Tasks 1 and 2.
**Produces:** `selectorView` with `draw(state: SelState, star: {x: number; y: number} | null, feet: Record<Scope, {x: number; y: number}>, hot: Scope | null): void`, `onChoose(fn: (s: Scope) => void)`, `hide()`.

- An absolutely placed SVG layer with `pointer-events: none`; the two chips are `<button>`s with pointer events.
- Hover: glow (radial gradient, 34 px), ring (9 px), one hairline to `feet[state.last]`, the name line and the instrument line.
- Locked: corner brackets, the line `Choose a telescope`, two chips, one hairline each, from the chip's near edge to its dome's foot.
- Chips flip to the left of the star when the right side has under 260 px of room; they move down when the top has no room.
- Chips are 44 px tall under `(pointer: coarse)`, 26 px otherwise.
- Keys 1 and 2 choose while locked.
- The overlay redraws only when the loop draws.

- [ ] Screenshot at 1280 x 720 and 375 x 812, hover and locked. Compare with the two mocks.
- [ ] Commit.

### Task 6: Wire the two beats

**Files:** Modify `observatory/src/loop.ts`.

**Consumes:** Tasks 1, 2 and 5.

- `input` (aim): hover with `nearStar`; the beam stays off before a pick (stimming-hben).
- `tap`: after the opening and cuts guards, `tapSel`. A lock wakes the loop; a release redraws.
- A choice binds the machine to that scope's dome (`refractor`: `complex.main`, `reflector`: `complex.big`, after the integration 357658dd), and the bound dome leaves the `turns` list while bound. The cuts play for the reflector only until the switchable hero lands (obs-cuts).
- A switch of telescope while tracking: the old dome shuts and joins the followers again.
- Esc while locked: release.
- `__qa` gets `selector` (mode, star hip, last) and `choose(scope)`.

- [ ] In the page: hover, lock, choose each scope; the beam leaves the chosen dome; Esc releases; a tap on empty sky releases.
- [ ] Commit.

### Task 7: Night, Site and Sky

**Files:** Modify `observatory/src/setup.ts` (bar spec), `observatory/src/loop.ts`, `observatory/src/sky/haze.ts`, `observatory/src/world/dusk.ts`.

**Consumes:** Tasks 3 and 4.

- Bar: the top-left `choice` is `Night` (five options, `tonight` first). The main `slider` is `Sky`, 1 to 9, step 1, value 2. Settings gets a `Site` choice row, segments, persisted.
- A Night or Site change: `clock.shiftTo` over 3 s; `setStreak` from `shiftRate()` while shifting; the machine re-reads its target each step as today.
- Sky: the night star limit is `bortleMag(b)`; the sky glow lifts with the class; from class 3, warm light domes on the horizon (a `uLights` uniform in `SKY_GLSL`: count and height from the class, at fixed azimuths away from south).
- Reduced motion: the shift jumps, no streak.

- [ ] Screenshots: each night at Bortle 2; Bortle 1, 5 and 8 on one night; Andes and Home.
- [ ] Commit.

### Task 8: Check and hand over

**Files:** Modify `observatory/src/README.md`, the bean.

- [ ] `npm run check`: 0 errors. `node --test tests/observatory-*.test.mjs`: all pass.
- [ ] Clean console at load, hover, lock, choose, a night change. Idle sleep after 60 s. Hidden tab stops.
- [ ] README rows for `core/selector.ts`, `core/skyctl.ts`, `view/selector.ts`; the bean's checklist.
- [ ] Screenshots to Tom. Commit.
