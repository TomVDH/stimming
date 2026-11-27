# Jacob's ladder (`ladder`)

- **Shelf:** Main #49
- **Tier / Size:** `webgl2` · 68 KB
- **Verdict:** Solid, atmospheric WebGL2 desk toy with crisp physics and audio, held back by missing context-loss recovery, Bar v3 `help`/emblem metadata gaps, a 1.5 s audio tail when hidden, and a small `uLen` shader glitch on dying arcs.

## Bugs
- Missing WebGL2 context-loss handling (`ladder/index.html:162-168`): the page creates its own `webgl2` context without `onContextLoss` from `shared/gl.js` or `webglcontextlost`/`webglcontextrestored` listeners, so losing the GPU context leaves `frame()` issuing GL calls against a dead context with no recovery.
- Audio lingers after hiding or blurring (`ladder/index.html:1616-1622`, `1474-1495`): `whenVisible` calls `kit.rest(() => true)` instead of suspending immediately or muting `voice.buzz`, `voice.hiss`, and `voice.breathG`, so the continuous oscillators and noise sizzle keep humming for ~1.5 s (`sleepMs`) after the tab hides or stage scrolls out of view.
- Stuck `Space` breath on window blur (`ladder/index.html:1596-1599`): `act.blow(true)` sets `breath.target = 1` with no `blur` reset on `window`, so switching tabs or windows while holding `Space` misses `keyup` and leaves the updraft blowing until `Space` is pressed again.
- `frame(t)` (`ladder/index.html:1523-1535`) schedules the next `requestAnimationFrame(frame)` before `tick(dt)`, `render(dt)`, and `soundFrame(dt)` without a `try`/`finally` guard, so a transient runtime error keeps rescheduling and throwing every frame.
- Dying `ghost` arc reads the live arc's length (`ladder/index.html:1186-1188`, `1310`, `ARC_FS:980-982`): both strips share one `uLen` (`arc.len`), so right after a new strike at the narrow foot (`arc.len` ~0.7 cm), the fading upper `ghost` arc evaluates `s < 0.6` along its whole length and flashes green copper vapour across the entire thread.
- Minor dead state: `frameDt` (`ladder/index.html:1500`) is declared and never read.

## Labels, Copy & Menu Settings
- Missing Bar v3 `help` spec (`ladder/index.html:126-154`): only `keys: [['hold', 'blow on it'], ['move', 'lean it'], ['space', 'blow from below']]` is provided (`line 153`). In Bar v3 (`shared/signal.js:497-518`), How to play omits `'click'` / `'tap'` (puff), `'hold + drag'` (move breath), and `'Enter'` (side puff, documented only in `stage` `aria-label` at `line 43`), and maps `'move'` to `touch-drag` on touch devices even though hover leaning only runs for `e.pointerType === 'mouse'` (`line 1560`).
- Missing emblem (`toys.json:1404`): `"emblem": null` (and no `shared/emblems/ladder.svg`), so Bar v3's top-left monogram falls back to `'S'` (`shared/signal.js:534`).
- `toys.json:1406` metadata drift: `"sound": false` disagrees with the active Web Audio implementation (`audioKit` at `ladder/index.html:1360`), `toys.json:1412` (`"sound": "extra"`), and `docs/toys/ladder.md:12` (`Sound: Yes`).
- Ambiguous action/slider copy: the `'blow'` action (`ladder/index.html:128`) renders as `'Blow'` without indicating it blows an updraft from the box bottom, and `'Gap'` (`line 130`) persists neither its value nor offers a `reset` handler in `bar`.

## Gameplay Improvements (up to 5)
1. Direct rod tilting: allow grabbing and dragging either copper rod directly on the stage to widen or narrow the V-angle (syncing with the `Gap` slider and `ui.slider.set`), making the physical electrodes tactile.
2. Directional breath stream: replace or blend the purely radial pointer blow (`windAt` in `ladder/index.html:360-364` and `ADV_FS:1035-1039`) with pointer drag velocity so sweeping across the stage blows a directed stream of air like exhaling across a flame.
3. Swipe-to-quench / pinch: let a fast swipe across the plasma column slice or cool it locally (`a.cool` spike or immediate `snap()`), giving a crisp physical way to break arcs mid-climb.
4. Interactive transformer box: let tapping or holding on the transformer box briefly pulse an over-voltage surge (faster climb, louder mains hum, higher break length) or toggle power cleanly for a restrike on command.
5. Optional grounding probe (right-drag or modifier-hold): instead of only pushing the arc away thermally, let a secondary gesture act as a cool probe that attracts/pulls the arc thread toward the cursor before snapping.

## Graphics Polish (up to 3)
1. Pass per-arc length to `ARC_FS` (separate `uLen` per ribbon draw or encode arc distance in cm in `aD.y` at `ladder/index.html:1154-1164`) so copper-vapour green tint stays anchored to the roots on the fading `ghost` arc too.
2. Add transient spark embers on `snap()` and `pinch()` (drawn as additive `SPOT_VS` points with gravity/drag and fed into `sim`) so breaking at the top of the V sheds a brief shower of hot copper flecks.
3. Enrich `SCENE_FS` (`ladder/index.html:707-859`) with small brass/ceramic collars where the stubs enter the insulators, a subtle coil-vent or pilot-lamp detail on the transformer box, and soft box/rod shadow projection onto the back wall (`M_WALL`) so the arc light anchors the apparatus to the room.
