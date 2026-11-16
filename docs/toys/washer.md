# Pressure washer (`washer/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | None (Tom sets it) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `linear-gradient(100deg, oklch(0.7 0.13 135), oklch(0.78 0.15 48))` (proposal) |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

A filthy floor fills the stage, seen from above under a low evening sun. Hold and drag to spray: the fan jet cuts a crisp, clean stripe through years of grime, and the muddy water runs off down the floor.
The clean stone shows wet and glossy, then dries back to its true colour. Each floor hides a picture under the dirt: a compass rose, a burnt treasure map, a tiled octopus, a Roman "beware of the dog" mosaic.

## Controls

<!-- gen:bar -->
Bar: v2 (`washer/index.html:108`).

| Slot | Holds |
|---|---|
| Top left (choice) | `Surface`, segments: Patio (1), Deck (2), Pool (3), Mosaic (4) |
| Bottom left (actions) | `Reset` (R): the grime grows back in 2.4 s |
| Bottom right (slider) | `Fan`, 0 to 1, default 0.6: the fan's width, from a pencil jet to a wide fan |
| Key strip | hold + drag spray; r reset; 1-4 surface |
| Settings | Quality |
| Dev (`?dev`) | `Exposure`, `Bloom`, `Mist`, `Jet power`, `Drying` (all persist) |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Press and hold | Sprays in place: the spot comes fully clean |
| Drag | The fan lies across the stroke and cuts one stripe; a fast stroke leaves a faint stripe, a slow one a clean stripe |
| Keys | R resets; 1 to 4 pick the surface |
| Wheel, pinch, tilt | None |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | Raw WebGL2 (GLSL) |
| Libraries | None imported (the importmap is carried word for word) |
| Importmap | Word for word |
<!-- /gen:stack -->

The floor is flat and seen from above, so every pass is a full-screen triangle over a texture. No camera or scene graph is needed (`docs/stack.md`, tier 3).

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `reduced`, `onReducedChange`, `audioKit`, `linFit`, `css`, `stage`, `pageReady` |
| `shared/detail.js` | `detail` |
| `shared/glow.js` | `bloomChain`, `glowDetail` |
| `shared/output.js` | `OUTPUT` |
| `shared/grade.js` | `GRADE` |
| `shared/intro.js` | `intro` |
<!-- /gen:shared -->

Drift: none known. The noise helpers are the same local copy every raw WebGL2 toy carries.

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 1997 | The page: CSS, markup, vignette, one module script |
<!-- /gen:files -->

## Render pipeline

Passes in frame order. A frame runs only while the jet sprays, the grime regrows or water runs and dries.

| Pass | Target | Shader | Does |
|---|---|---|---|
| Bake (once per surface and size) | Two RGBA16F maps at sim size (MRT) | `BAKE_FS` | Floor albedo and gloss; height, porosity, joint, metal. Mipmaps on map 1 |
| Grime (once, or each frame while regrowing) | Dirt ping-pong, RGBA16F | `DIRT_FS` | Film, crust, film tint, crust kind. Mode 0 fresh, 1 carry to a new size, 2 regrow |
| Water | Water ping-pong, RGBA16F, a third of CSS size | `WATER_FS` | Depth and mud advect (semi-Lagrangian) downhill, into joints and away from the jet; a blur evens piles out without adding water; grime seals the ground, bare stone drinks; the ground's wetness dries |
| Stamp | Dirt ping-pong, scissored to the swept box, then blitted back | `STAMP_FS` | The jet's dwell over the frame (up to 40 substeps) removes film and crust |
| Mist | Mist ping-pong, R16F, an eighth of CSS size | `MIST_FS` | Spray hangs, drifts on the breeze, thins |
| Rivulets | Water map, additive points | `RIV_VS`, `RIV_FS` | Up to 40 muddy rivulet heads run downhill from the jet and pour water and mud into the water map; the water pass keeps their trails and dries them |
| Shade | HDR, RGBA16F, canvas size | `SHADE_FS` | Grime over floor, wet darkening, sun and sky reflection (GGX), mud, foam, the jet line, mist scatter |
| Droplets | HDR, additive points | `DROP_VS`, `DROP_FS` | Up to 600 spray drops in short arcs |
| Bloom | `bloomChain` | `shared/glow.js` | Glare off wet stone, foam and drops |
| Composite | Screen | `COMP_FS` | Vignette, grain (`GRADE`), film curve and dither (`OUTPUT`) |

The picture under each floor is drawn once with Canvas 2D into a 2048 by 1024 texture: colour in the left half; joints (R), mask (G) and brass or burn (B) in the right half.

### Uniforms

`SHADE_FS`, the ones a person tunes:

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uL` | vec3 | Sun direction; set so the glare lands on the upper left of the floor | Elevation about 25 to 28 degrees |
| `uEye` | vec3 | The eye, 1.1 m past the bottom edge, 1.75 m up | Per layout |
| `uSun`, `uSky0`, `uSky1` | vec3 | Sun colour (times 2.4), horizon and zenith | OKLCH through `linFit` |
| `uFilm[2]`, `uCrust[3]`, `uMud` | vec3 | The grime palette of the surface | Per surface in `SURF` |
| `uMistK` | float | Mist strength | Dev `Mist`, 1 |

`COMP_FS`: `uExpo` (Dev `Exposure`, 1), `uBloomK` (Dev `Bloom`, 0.5).

The jet (`JET` block, `washer/index.html:1333`): fan half-length `0.012 + 0.15 * fan^1.25` m; across width `0.006 + 0.12 * half` m; film rate `300 * sqrt(0.09 / half)` per second, times `320 / S` (0.8 to 1.8, so a small screen cuts as fast per pixel) and Dev `Jet power`; crust rate 0.55 of that, times a rate per crust kind (`SURF.kr`).

The fan lies across the stroke (angles doubled, so a line has no head); its ends keep their order between frames, so a frame never sweeps a bow-tie. A slow stroke cuts clean; a fast flick leaves a faint stripe.

## Sound

| | |
|---|---|
| Graph | `audioKit()` |
| Engine | Raw Web Audio |
| Voices | Jet: motor (saw and square through a resonant lowpass, throbbed by a 23 Hz pump), hiss (highpassed noise), roar (bandpassed noise; speed brightens it, grime lowers it), rumble (lowpassed noise). Grit: short bursts as crust breaks. Release: run-off trickle and drops. Reset: a slow swell. Surface: a thud. Floor all clean: a four-note chime |
| Sleep | `kit.rest` once the loop stops |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `detail({ maxDpr: 2, budget: 2.4e6 })`; sim maps follow the level: High up to 2x and 3.6 M texels, Standard 1.5x and 2 M, Low 1x and 1 M |
| Slow-frame step | `detail()`; the level change remakes the maps and carries the grime |
| Idle | The loop stops 12 s after the last spray (water and mist go by 5 s, then frames drop to about 15 a second while the ground dries) |
| Reduced motion | No drops, no water flow, no mist drift; Reset regrows at once |
| Measured | 2026-11-15, this Mac, High quality, 1280 by 800 (canvas 2496 by 1504, maps 2444 by 1473): 4.6 ms a frame while spraying, 4.3 ms while water runs. The first frame waits on the font for at most 0.9 s. Not measured on a phone |

## State and storage

| Key | Holds |
|---|---|
| `stimming.washer.sound` | Sound on or off |
| `stimming.washer.expo`, `.bloom`, `.mist`, `.power`, `.dry` | Dev rows |
| `stimming.quality` | Site quality (shared) |

## Tests and QA

No files in `tests/`. QA on 2026-11-15 ran in a hidden browser pane, through a throwaway probe page (manual frame pump, synthetic pointer events, PNG captures); the probe is not committed.

Checks for a change: a clean console on load and after each control; a stroke cuts a stripe; muddy water runs off and the ground dries; each surface shows its picture when fully cleaned; 1280 px, 375 by 812 and 812 by 375 hold (corners measured, no overlap, no sideways scroll).

## Known issues

- The sun glint on the patio's brass ring can hide the W at some stage shapes.
- The gesture gate for sound was not checked: the test browser lets audio start without a gesture.

## Legacy build

None.

## History

| | |
|---|---|
| Epic | `stimming-gkku` (feature) |
| Plans | None |
| Version | None |
