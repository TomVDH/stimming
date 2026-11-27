# Chladni plate (`chladni`)

- **Shelf:** Main #15
- **Tier / Size:** `webgl2` · 54 KB
- **Verdict:** Solid acoustic WebGL2 desk toy with convincing brushed steel, sand physics, and Bar v3 integration, held back mainly by missing pointer-capture loss cleanup, a context-loss race in shader linking, and minor rail/copy polish.

## Bugs
- Missing lostpointercapture handlers on both the plate stage (chladni/index.html:1160-1161) and the tuning rail (chladni/index.html:1221-1222): if pointer capture is lost mid-drag, ptrs or grip/gripping stays set forever, locking tuning true, spinning requestAnimationFrame indefinitely, and keeping the bowed tone singing.
- Missing whenVisible from shared/stim.js: chladni/index.html:1292-1293 hand-rolls IntersectionObserver(([e]) => ...) and visibilitychange, reading only the first observer entry instead of the latest and bypassing the shared visibility lifecycle helper.
- Async shader-link context-loss race and incomplete restore: in initGL() (chladni/index.html:801-805), losing the WebGL context while awaiting KHR_parallel_shader_compile causes getProgramParameter(q.p, gl.LINK_STATUS) to return false and throw into failed() (chladni/index.html:1277), permanently hiding canvas and #rail; webglcontextrestored (chladni/index.html:1261-1268) also omits fit() and resets the user's current rung back to START inside seed().
- Unprotected frame loop and uncancelled audio on pause: frame() (chladni/index.html:1044-1060) does not wrap advance() and render() in try/finally, and pause() (chladni/index.html:1245-1248) suspends ac without zeroing tone gains via sing() or cancelling queued tossSound/pourSound one-shots (chladni/index.html:379-416), allowing a frozen gain tail or delayed grain burst to play upon resume.

## Labels, Copy & Menu Settings
- chladni/index.html:85, 104, 107: keys (['← → ↑ ↓', 'select the next pattern']), help (['← → ↑ ↓', 'Select the next pattern']), and #stage aria-label ('Press the arrow keys to select the next pattern.') all say "next pattern" even though ArrowLeft and ArrowDown step backward (stepRung(-1) at line 1231); "Select a pattern" or "Step patterns" is accurate.
- chladni/index.html:97-108: the second action reuses verb 'reset' with label 'Scatter' (which keeps pitch and pours sand), leaving Bar v3 Settings without a bar.reset callback or Reset footer to return to the starting pattern (START = 2).
- chladni/index.html:87, 1174-1175, 1232-1236: #rail exposes role="slider" (aria-label="Pitch") with tabindex="0", but lacks Home/End/PageUp/PageDown keys and does not exclude role="slider" in the global Enter key check (line 1233 only skips 'button, a'), so pressing Enter on the focused Pitch slider tosses sand.
- chladni/index.html:21, 27, 170-186: preloads culori in <head> yet duplicates OKLCH-to-linear conversion (lin, linear) instead of importing linFit from ../shared/stim.js, and keeps the legacy <meta name="claude:viewport-fit-sides" content="cover"> tag.

## Gameplay Improvements (up to 5)
1. Finger damping on the plate: holding a secondary touch or right-click/hold directly on the steel plate damps local vibration amplitude around the contact point, forcing a temporary nodal line so players can sculpt asymmetric hybrid figures.
2. Plate shape selector: add a compact Bar v3 choice group for Square, Circle, and Hexagon plates with matching eigenfunctions in FIELD and distinct fundamental timbres per geometry.
3. Gentle sand herding: dragging horizontally across the plate (or using a subtle sweep mode) pushes settled grains smoothly across the brushed steel without changing pitch, letting players herd sand onto antinodes and watch it leap back into place.
4. Soft auto-sweep / sustain mode: an optional calm drift toggle in Settings that slowly breathes pitch across adjacent resonances and settles naturally, turning the plate into an evolving desk sculpture when desired.
5. Drive strength and sand material presets: expose drive intensity (from delicate hairline ridges to lively grain showers) and material swatches (brass gold, iron filings, pale quartz) with matching grain weight and specular response in Settings.

## Graphics Polish (up to 3)
1. Center clamp bolt and surface detail: add a physical mounting screw/clamp cap at the center of the plate in SCENE_FS where the cylindrical stand meets the steel, plus subtle radial wear and micro-groove normal variation in plateTop.
2. Sculpted sand pile AO and grain volume: use the blurred density map denB in GRAIN_VS/GRAIN_FS to darken crevices under thick ridges, vary grain sizes slightly, and add warm inter-grain bounce lighting so nodal lines read with crisp 3D relief.
3. Airborne dust shimmer and floor bounce: render a soft golden haze around vigorously bouncing antinodes when A.z is high and project faint warm sand/steel bounce light onto floorAt in SCENE_FS to tie the plate and studio surface together.
