# Neon Hum (`neon`)

- **Shelf:** Main #10
- **Tier / Size:** `webgl2` · 92 KB
- **Verdict:** Strong, richly rendered WebGL2 desk toy with believable glass refraction and procedural walls, held back by a few Tone.js mute/pool edge cases, a mid-drag snap drop, and missing shared shell/GL hardening.

## Bugs
- humSync() (neon/index.html:315-330, called per-frame at 1809) only checks `if (!V || !kit.ac) return` without checking `sound.on`, so muting sound after audio has initialized still lets tube toggles, resets, or Chase create and start new Tone.Oscillator nodes on a suspended AudioContext while humStop() (306-313) disposes nodes via a 500 ms wall-clock setTimeout instead of audio-clock state.
- thunder() (neon/index.html:289-294) schedules burst()/drop() up to 1.3 s ahead on the shared 6-voice V.pool (take() at 201-205) and directly mutates v.n.envelope.decay and v.drop properties, so 6 clicks or knocks in between overwrite the queued thunder's pan, filter, and envelope; delayed thunder is also not cancelled when hiding the tab.
- addPoint() (neon/index.html:1979-1983) splits strokes exceeding `3.2 * S` pixels by calling `beginDraft(x, y, pid)` without passing the `snap` flag, silently dropping `Shift + drag` or `Straight tubes` snapping into freehand curves mid-drag.
- In shape() (neon/index.html:424-428), a short closed loop whose endpoints coincide causes `tan()` to return `[0, 0]`, making `normalize(vec2(vT.x, -vT.y))` in TUBE_FS (1226) evaluate `NaN` and bleed across the dual-filter glow pyramid.
- Lifecycle and WebGL hardening gaps: neon/index.html rolls its own IntersectionObserver (2235-2236, reading only `es[0]`) instead of `whenVisible`, leaves stormLater() (770-789) and dipLater() (1823-1837) timers firing when hidden or dark, lacks `try/finally` around update()/render() in frame() (1795-1814), throws on missing `EXT_color_buffer_float` without trying `EXT_color_buffer_half_float` for RGBA16F (1420), and fails permanently if context loss occurs during initGL()'s async `KHR_parallel_shader_compile` poll (1428, 2200).

## Labels, Copy & Menu Settings
- Duplicate `'click'` entries in Bar v3 `help` (neon/index.html:156): `['click', 'Switch a tube on and off']` and `['click', 'Knock on the wall']` render identical mouse icons without gesture nouns (e.g. `'click a tube'` and `'click the wall'`).
- Undocumented undo shortcut: `keydown` (neon/index.html:2150) binds `Cmd/Ctrl + Z` to undo(), but `help` (156-157) only documents `['backspace', 'Remove the last tube']`.
- `Straight tubes` (`id: 'straight'`, neon/index.html:150) only applies to pointer drags and is ignored by keyboard arrow drawing (1783), and `Gas` resets to Blue (`value: 6`, 138) on reload while `Wall` and `Straight tubes` persist.
- `docs/toys/neon.md` and `docs/inventory/neon.json` do not exist yet for this main-shelf toy; note `sound: true` in `toys.json:288` is valid ("Best with sound", muted by default via `audioKit()`), and `access.calm: true` (296) relies on `prefers-reduced-motion` until site-wide `calm()` lands in `shared/stim.js`.

## Gameplay Improvements (up to 5)
1. Allow dragging a tube's standoff clips or body (after a brief hold) to nudge and reposition bent letters on the wall without erasing and redrawing them.
2. Add material-reactive knock physics: knocking on Sequins flips nearby disc tilts in a damped wave, while knocking on Steel sends a traveling sympathetic shimmer across adjacent tubes.
3. Add a diegetic brass pull-chain or knife switch mounted in a corner of the wall to cut or strike the entire sign at once with a heavy relay clunk.
4. Offer a few wordless neon sign presets (such as a coffee cup, crescent moon, or arrow alongside OPEN) behind Reset or a small picker so players can remix classic shapes immediately.
5. Add an ambient "Passing headlights" or "Rainy night" option in Light show that sweeps slow warm and cool key light across the wall relief and glass refraction.

## Graphics Polish (up to 3)
1. Give Rainbow gas (TUBE_FS, neon/index.html:1211) a gentle autonomous hue drift when lit (currently `hueShift` only advances during Rave at line 757) and add subtle traveling ionization beads during argon warm-up (`WARM[t.gas]`).
2. Upgrade WALLGEN_FS (neon/index.html:1066-1090) with 2x2 supersampling or `fwidth` anti-aliasing on brick edges, tile grout, and sequin discs plus low-frequency dampness variation in gloss (`A.a`) at zero per-frame cost since the wall bakes once per resize.
3. Enhance tube depth off the wall in LIGHT (neon/index.html:1109) and TUBE_FS (1248-1255) by casting crisp directional standoff shadows onto the wall and adding dual-lobe specular highlights on the glass rim (`band`) so unlit tubes catch ambient light cleanly.
