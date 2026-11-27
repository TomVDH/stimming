# Sonar (`sonar`)

- **Shelf:** Main #28
- **Tier / Size:** `webgl2` · 101 KB
- **Verdict:** Sonar is a richly atmospheric WebGL2/Tone.js console with cohesive active/passive simulation, though it suffers from a Bar v3 label/sync mismatch in Listen mode, missing WebGL context-loss recovery, and no visible-idle sleep.

## Bugs
- Missing WebGL2 context loss handling: `sonar/index.html:158` creates the context without `onContextLoss` from `shared/gl.js` or `webglcontextlost`/`webglcontextrestored` listeners, so a lost context leaves `frameFn` drawing into dead resources.
- Bar v3 button desync on load in Listen mode: `sonar/index.html:2041` calls `syncSlider()` synchronously before `shared/signal.js` mounts asynchronously, mutating `.s2-chip .s2-label` from `Ping` to `Knock` so `shared/signal.js:262` fails to match the chip and leaves the visible action button stuck on `Ping`.
- No idle sleep while visible and tab-return audio suspend race: `sonar/index.html:1814` sets `idle = () => false` so the 30 fps loop never sleeps after 60 s of inactivity, and `whenVisible` (`sonar/index.html:2065`) passes `() => true` to `kit.rest()`, which can suspend `AudioContext` 2.5 s after returning to the tab if you switch away and back quickly.
- Dropped radar contacts past 12: `sonar/index.html:1721-1728` slices `sea.contacts` to `MAXC = 12` when uploading `uC`/`uK` to `EXCITE`, so newly spawned contacts like Cranky Auntie, stalking subs, or bait schools at the end of the array still ping in JS readouts and audio while staying invisible on the scope.
- Stuck pointer/charge state on capture loss or mode switch: `sonar/index.html:1944-2008` listens to `pointerup` and `pointercancel` without `lostpointercapture`, and switching from Active to Listen while `pt.charging` is true lets `release()` fire an active `ping()` inside Listen mode.
- Per-redraw 2D canvas reallocation: `drawHud()` (`sonar/index.html:1540`) unconditionally assigns `hud.width = W; hud.height = H;` up to 10-30 times per second during boot, charging, and readout fades, reallocating the full backing canvas instead of resizing only when dimensions change.

## Labels, Copy & Menu Settings
- Bar v3 slider label stays `Range` in Listen mode: `syncSlider()` (`sonar/index.html:1887-1893`) only updates the hidden Bar v2 `.s2-slider > span` and `aria-label`, so `shared/signal.js:212` never updates the visible slider label or Settings slider label to `Span`.
- Ambiguous and incomplete Bar v3 `help` entries (`sonar/index.html:97-99`): `help` lists conflicting pairs like `['click', 'Ping a bearing']` and `['click', 'Knock the hull']` without stating Active vs Listen mode, omits `P`, `S`, `1`, and `2` (because `spec.help` skips auto-listed action/choice keys in `shared/signal.js:513`), and writes `'space enter'` without a separator.
- Stage `aria-label` and on-canvas legend mismatch (`sonar/index.html:59, 1396-1402`): the stage `aria-label` omits `Enter`, `P`, `S`, `1`, `2`, and touch phrasing, while the on-canvas `keyList()` in Active mode omits clicking the centre or pressing `Space`/`P` for an all-round ping.
- Dead Sounder state in `opts` and `MODE` (`sonar/index.html:103, 118, 1885`): `SOUNDER = false` leaves `opts.depth` (`stimming.sonar.depth`) and `MODE.sounder` (`Depth` / `Mark`) unused in the codebase.
- Static flags verified: `keys: false` (`sonar/index.html:95`) is intentional per `docs/plans/bar-v2.md:92` because Sonar draws its own on-canvas keycaps and supplies `help` for Bar v3; `"sound": true` in `toys.json:800` is intentional (`Best with sound` badge) while `audioKit` keeps audio muted by default.

## Gameplay Improvements (up to 5)
1. Pick targets directly from the waterfall and bearing strip in Listen mode (`sonar/index.html:1238-1242`): let clicking or dragging the top bearing strip aim the ear to that bearing, and let double-clicking near a frequency line in the waterfall lock the contact producing that tonal.
2. Add stereo panning to Listen hydrophone voices and Active echo returns (`sonar/index.html:1041-1067, 1144-1169`): pan passive voices by `Math.sin(bearingTo(c) - ear)` and active echoes by `Math.sin(e.b - sea.head)` so aiming the ear or turning the boat feels spatial.
3. Give `knock()` (`sonar/index.html:1342-1353`) quiet ecological reactions: nearby dolphins could turn toward the boat with click bursts or a close whale could answer with a brief song unit, turning the hull knock into wordless communication.
4. Add a subtle bearing preview tick on the scope rim on hover in Active mode, and expose a gentle slow-sweep or Shift-drag bearing cursor so players can line up directional pings cleanly without turning the boat.
5. Expose the parked depth Sounder (`SOUNDER = false` at `sonar/index.html:103`) as a third Display option (`Depth`) so the already-implemented seabed topography, thermocline layer, and diving whale/fish arches become playable.

## Graphics Polish (up to 3)
1. Re-prime `fallTex` on Shuffle: `on.shuffle` (`sonar/index.html:2036`) clears `acc` but leaves 19 seconds of stale frequency history from the previous ocean scrolling down the waterfall; re-priming `fallTex` as at startup (`sonar/index.html:2049`) keeps resets seamless.
2. Eliminate 30 Hz concentric ring seams in `EXCITE`: `sonar/index.html:269` varies seabed speckle using `floor(uTime * 30.0)`, which steps mid-ping across radial slices `uR0..uR1` and creates faint banding; using a per-ping seed instead keeps ping-to-ping speckle without radial seams.
3. Smooth graticule bloom in `SCREEN`: `sonar/index.html:410` samples `textureLod(uHud, uv, 3.5)` and `5.5` for the HUD halo, which can show mipmap blockiness on non-power-of-two canvases; blending `hudTex` into the existing `DOWN`/`BLUR` bloom chain will produce a cleaner phosphor halo.
