# Star trails (`trails`)

- **Shelf:** Main #29
- **Tier / Size:** `webgl2` · 36 KB
- **Verdict:** A calm, atmospheric WebGL2 long-exposure sky toy with clean accumulation shaders and tactile shutter audio, needing only context-loss handling, hidden-tab audio cleanup, and a pre-exposure decay fix.

## Bugs
- trails/index.html:147-153 (`canvas`, `gl`): Raw WebGL2 context does not attach `webglcontextlost` / `webglcontextrestored` handlers or call `onContextLoss` from `shared/gl.js`.
- trails/index.html:152,358 (`FLOAT`, `target`): Checks `EXT_color_buffer_float` and renders to `gl.RGBA16F`, but also enables `gl.LINEAR` filtering (`line 360`) without checking `OES_texture_float_linear` or probing framebuffer completeness via `renderable()`.
- trails/index.html:578-585 (`frameFn`, `idle`): When `closedAt = t` is set on load (`preExpose` at line 740), `idle()` stays false for `tau() * 5.5` seconds (up to 330s at max exposure) even when the shutter is closed and the pre-exposed arcs are immediately decayed away, instead of keeping the pre-exposed plate still until the user first opens/closes the shutter or a meteor spawns.
- trails/index.html:801 (`whenVisible`): Hiding the tab while the shutter is held open stops the rAF loop, but does not call `close()` or `padClose()` / `kit.rest()`, leaving the Tone.js `FatOscillator` pad droning while hidden.

## Labels, Copy & Menu Settings
- trails/index.html:92-119 (`initPage` bar spec): Missing `reset` callback in the bar spec to restore Sky, Exposure, Stars, Colour, and Meteors to their default values from Settings.
- trails/index.html:787 (`act.clear`): Pressing Clear (`C`) while `shutter` is true clears the accumulation buffers while the shutter remains open, without resetting or flashing a shutter curtain sound.

## Gameplay Improvements (up to 5)
1. Let dragging horizontally or vertically across the sky pan the camera azimuth and elevation slightly, with a gentle spring return or free framing of the celestial pole and horizon ridge.
2. Add a bulb-lock toggle gesture (such as double-click or a Lock latch action) so users can latch the shutter open for long hands-free exposures without holding a button down.
3. Allow clicking or tapping in the sky while the shutter is closed to release a localized meteor along the drag vector, giving a tactile action alongside holding the shutter.
4. Add a distant lighthouse, radio tower aircraft beacon, or passing satellite/ISS glint that leaves a distinct dotted or dashed trail across the plate during an exposure.
5. Include a lens dew or mist breath interaction that softly fogs and blooms the stars over very long exposures until wiped clear.

## Graphics Polish (up to 3)
1. Replace the flat procedural horizon cutout in `OUT_FS` with a multi-layered parallax silhouette ridge (distant mountains plus closer pine trees or an observatory dome) that catches faint rim light from the town glow and airglow.
2. Use a packed real star catalogue (Yale Bright Star / Hipparcos subset, easily under 150 KB within the 2.5 MB budget) so recognizable constellations, Polaris, and the Southern Cross appear in their true positions.
3. Add subtle chromatic aberration and lens coma near the frame corners in `OUT_FS`, plus diffraction spikes on the brightest magnitude stars in `SEG_FS`.
