# Caustic pool (`pool`)

- **Shelf:** Main #17
- **Tier / Size:** `webgl2` · 106 KB
- **Verdict:** Caustic pool is visually polished and responsive with rich acoustics and raymarched caustics, held back mainly by a never-sleeping 30 fps idle loop, an idle audio wake bug on tab return, and a few minor WebGL2/Bar v3 rough edges.

## Bugs
- Missing 60 s idle sleep (pool/index.html, drifting() at line 2275 and frame() at lines 2281, 2305): when prefers-reduced-motion is off, drifting() is always true, so the 30 fps rAF loop and full WebGL2 raymarch/caustic pass run forever without stopping.
- Stale Bar v2 selector (pool/index.html, keydown listener at line 2562): checks .s2-sheet instead of Bar v3's .sg-sheet / .sg-dev, leaving the keydown guard out of sync with Bar v3 sheets.
- AudioContext woken while idle (pool/index.html, sync() at line 2346): returning to a settled pool with sound on calls kit.wake() unconditionally, and because settled is already true (line 2307), kit.rest() is never scheduled, leaving continuous Tone.js Noise/LFO bed nodes running while idle.
- Slow-frame fallback wipes live ripples (pool/index.html, frame() at line 2291): stepping SIMN down to 160 calls allocPool(), which destroys and recreates sim, foam, and caus buffers and clears simActive mid-splash.
- Context-loss edge cases (pool/index.html, initGL() at lines 1417-1419 and allocPool() at line 1451): a context loss during parallel shader polling throws in LINK_STATUS and triggers failed() permanently, and allocPool() does not clear an in-flight PBO fence so a stale probe readback can overwrite probeData after a pool switch or resize.
- UV derivative seam on curved pools (pool/index.html, VIEW_FS wallU() at line 969, tiles() at lines 974, 1001, joint() at line 948): atan(P.z, P.x) jumps across -x, z = 0 on Round and Bean pools, spiking fwidth() and blurring a 1-pixel stripe on the far-left wall and coping.

## Labels, Copy & Menu Settings
- Missing Reset in Settings: bar passes an actions Clear chip ('clear') but omits bar.reset (per Bar v2/v3 specs, Reset belongs in Settings when Clear is shown), leaving no way to reset camera yaw, tilt, zoom, rain, and floaters.
- Static key strip copy: keys lists ['click', 'add an object'] and ['drag', 'throw an object'] even when the persisted tool is 'cut', where clicking and dragging cut a trench instead.
- Stage 1 missing_whenVisible note: pool/index.html skips the shared whenVisible() helper from shared/stim.js, but manually pauses rAF and suspends audio via IntersectionObserver and visibilitychange in sync() (lines 2340-2352, 2620-2621), so visibility pausing itself is not broken.

## Gameplay Improvements (up to 5)
1. Add a skipping stone (or cork duck) to Tools so a fast shallow drag across the water skips multiple times with crisp plops before sinking or bobbing upright.
2. Allow grabbing and lifting sunken anvils and kettlebells directly off the pool floor by clicking or holding over them underwater, sending up bubbles as they rise.
3. Use Bar v3's empty main slider slot for a calm Breeze or Water Depth control that gently drifts floaters and swells or shifts caustic focus depth in real time.
4. Let the Cut tool (or a gentle submerged swirl mode) stir persistent eddies when dragged slowly, herding blossom petals and leaves into soft spirals instead of only cutting trenches.
5. Add an interactive pool return jet or clickable underwater lamp lens at night so the user can toggle subtle ambient flow or cycle warm vs cyan pool lighting.

## Graphics Polish (up to 3)
1. Add 4 to 6 jittered volumetric steps along the refracted view ray tr in VIEW_FS sampling uCaus to render shimmering underwater caustic god rays, especially around sunken iron and night lamps.
2. Enrich tiles() and deck() in VIEW_FS with per-tile glaze hue/luminance variation, subtle normal bevels along grout lines, and darkened wet splash rings along the coping where waves lap over the edge.
3. Replace the flat sky(rf) gradient with dappled procedural tree canopy and soft cloud reflections so the water surface carries organic movement even when ripples settle.
