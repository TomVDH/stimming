# Galaxy (`galaxy`)

- **Shelf:** Main #6
- **Tier / Size:** `three` · 100 KB
- **Verdict:** Healthy, responsive WebGPU flagship toy on Bar v3 with rich physics, held back mainly by missing GPU loss/idle-sleep lifecycle guards, incomplete Clear/Reset cleanup, and minor doc drift.

## Bugs
- Custom visibility loop (`galaxy/index.html:2070-2080`) duplicates `shared/stim.js` `whenVisible` with `IntersectionObserver` + `visibilitychange`, omits the 60s idle-sleep stop and 30fps drift cap (`docs/standards/code.md:107`), and never disposes `renderer`, `AudioContext`, or observers on `pagehide`.
- Missing GPU device-loss handling and frame error boundary (`galaxy/index.html:405-412, 1912-2067`): `WebGPURenderer` has no `device.lost` listener (the WebGL2 fallback disposes on boot, but live device loss is unhandled) and `animate()` lacks `try`/`finally` around compute/render passes.
- `clearAll()` (`galaxy/index.html:1605-1622`) resets stars via `uClearT` and trims wells, but fails to clear active `blast` (`shellFx`), `gasUntil` / `gasClear` nebula clouds, or black hole `feed`/`feedGoal`/`jet`, leaving explosions, smoke, and jets firing across a cleared sky.
- `letGo()` (`galaxy/index.html:1717`) writes drag throw velocity into `w.vx`/`w.vz` even for `pinned` objects (`white`, `worm`, `string`), and `syncWells()` (`:1425`) uploads it to `uWV[k]`, biasing relative star speed and settling targets in `updatePass` (`:596, 603, 661`).
- `animate()` (`galaxy/index.html:1939`) skips `dark` nebula emission whenever a glowing `nebula` is nursing; because `dark` hides its core (`dot.size.value = 0` at `:2030-2032`), it renders invisibly and can expire its 2s `emitUntil` window without emitting any dust.
- Slow-frame fallback (`galaxy/index.html:1917-1920`) begins checking after only `frames > 30` (~0.5s) at `raw > 0.024` (~41.6 fps) instead of the standard 4s warm-up and `> 1/38 s` over 2s (`docs/standards/code.md:112`).

## Labels, Copy & Menu Settings
- `docs/toys/galaxy.md` has drifted from `toys.json` and `galaxy/index.html`: it lists `Series: None` (`toys.json:161` has `"series": "dark"`), `Version: None` (`toys.json:163` has `"version": "1.5"`), `Sound: Yes` (`toys.json:166` has `"sound": false` with `access.sound: "extra"`), cites `signal: true` at `:89` (removed in `galaxy/index.html:101`), and lists stale line counts (`2073` vs `2093`).
- `resetAll()` (`galaxy/index.html:1624-1629`), bound to Settings `Reset` and key `R` (`"Reset the toy"`), resets the galaxy pair (`seed()`) but leaves `zoomGoal`, `az`, and `clockT` unchanged.
- Stage `aria-label` (`galaxy/index.html:63`) says `"Drag to throw it"` instead of `"Hold and drag to throw it"` (used in `help` `:116`) and omits the `+ -` zoom shortcut listed in `help` (`:117`). Bar v3 `help`, `keys`, `persist` settings (`streakStars`, `streakFx`), and `.s2-*` isolation are otherwise clean.

## Gameplay Improvements (up to 5)
1. Add camera orbit and tilt controls via right-drag or Shift+drag (and two-finger drag on touch) so users can inspect the tilted binary disc, 3D nebula lobes, and black hole Einstein ring edge-on instead of staying locked to a fixed elevation.
2. Draw a subtle trajectory arc and capture-radius ring on the canvas while holding a cluster fling or dragging a well, helping players aim stable orbits, binaries, and black hole mergers without adding HUD text.
3. Route nebula gas parcels (`gasStep`), comet tails, and shockwave ripples through Wormhole mouths (`uWorm`) so glowing or dark plumes and comets emerge across the sky rather than only teleporting stars.
4. Allow dragging either end of a Cosmic string (or dragging on placement) to orient and stretch its gravitational wake across star streams instead of locking it to a random angle.
5. Expand the procedural Web Audio engine beyond the single D-chord drone with subtle, muted-by-default event voices on the existing compressor bus: a rising harmonic chirp for kilonova inspiral, a soft filtered boom for supernovae and red giants, and gentle shimmer during cluster flings.

## Graphics Polish (up to 3)
1. Replace the pure black `scene.background` (`#000`) with a subtle, high-res procedural deep-space Milky Way dust band and distant starfield backdrop that passes through black hole lensing (`lensOf`), making gravitational warping visible even when foreground stars thin out.
2. Upgrade the black hole accretion disk (`diskMat`) and shadow (`shadowMat`) with a smooth volumetric TSL shader ring and subtle screen-space gravitational lensing halo so the photon ring and hot gas filaments read cleanly when zoomed in instead of looking pointillist.
3. Replace uniform analytical `dotOf` sprites (`galaxy/index.html:712-716`) with a multi-channel procedural sprite atlas (Airy-disk cores, chromatic halos, and delicate 4-point diffraction spikes for heavy stars, pulsars, and supernovae) and add curl-noise turbulence (`snoise`) to supernova shells and comet tails.
