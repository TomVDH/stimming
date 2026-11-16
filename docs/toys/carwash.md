# Car wash (`carwash/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | None yet |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `linear-gradient(100deg, oklch(0.64 0.28 350), oklch(0.8 0.14 212), oklch(0.8 0.165 68))` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

You sit in the driver's seat of a car on the conveyor of a tunnel car wash at night, and the whole picture is the windscreen.
One tap and the conveyor pulls the car through eight stations at 0.33 m/s: pre-soak curtain, triple foam, hanging cloth strips, wrap and top brushes, rinse, hot wax, spot-free rinse and the dryer, then out into a wet street.
Coloured tunnel light glows through the water, the foam and the cloth; the hand can run the wipers.

## Controls

<!-- gen:bar -->
Bar: v2.

| Slot | Holds |
|---|---|
| Top left (choice) | None |
| Bottom left (actions) | Go (G), Wipers (W, held) |
| Bottom right (slider) | None |
| Key strip | `[CLICK] go`, `[DRAG] sweep the wipers`, `[W] wipers` |
| Settings | Paint (Black, Cherry, Pearl, Teal), site Quality, Reset |
| Dev (`?dev`) | Jump (to a station), Pace (1 to 8), Exposure, Bloom, Grain |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click or tap | Parked or done: go (a dip to black returns the car to the door). Rolling: one wiper stroke |
| Drag | The wiper blades follow the hand round their pivots |
| Keys | G go, W wipers while held, Space or Enter on the stage go |
| Wheel, pinch, tilt | None |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | Raw WebGL2 |
| Libraries | None imported (the importmap is present, word for word) |
| Importmap | Word for word |
<!-- /gen:stack -->

One full-screen pass per stage of the frame draws the whole view: a procedural tunnel seen through a simulated windscreen, so raw WebGL2 is the lightest tier that holds it.

The windscreen is a bowed plane that leans back 31 degrees: its cowl edge is 1.15 m ahead of the eye and 0.34 m down, its header 0.4 m ahead and 0.12 m up. Every view ray meets it (`glassHit()`), which gives glass coordinates: `gx` across, `gh` up the rake, in metres. The glass map, the shared drops and runs, the lather and the wipers all work in those metres and reach the screen through the glass's own perspective (a 2 x 2 Jacobian per pixel), so drops grow toward the header and runs converge.

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `reduced`, `onReducedChange`, `audioKit`, `linFit`, `stage`, `pageReady` |
| `shared/intro.js` | `intro` |
| `shared/detail.js` | `detail` |
| `shared/glassrain.js` | `GLASS_RAIN` |
| `shared/wetglass.js` | `WET_GLASS`, `wetGlassDetail` |
| `shared/bokeh.js` | `BOKEH` |
| `shared/precip.js` | `PRECIP`, `precipDetail` |
| `shared/glow.js` | `bloomChain`, `glowDetail` |
| `shared/grade.js` | `GRADE` |
| `shared/output.js` | `OUTPUT` |
<!-- /gen:shared -->

The page does not use `shared/environment.js`. The runner has one scene pass and a fixed glass step; this toy needs a glass-state pass before the scene and a per-pixel wet value in `wgPane()` (the wipers and the foam clear beads in their own places). It runs the runner's pass order by hand: scene, two box steps, the bokeh gather, the pane, the bloom chain, then grade and output.
Local copies: none. The page has its own hash and noise (`cwH`, `cwN`, `cwFbm`) for its scene and sim.

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 2224 | The page: shell, shaders, sim, timeline, sound, input |
<!-- /gen:files -->

## Render pipeline

| Pass | Target | Shader or material | Does |
|---|---|---|---|
| Glass | Two RGBA16F maps, ping-pong, 400 x 263 on Standard, over the glass in metres | `SIM_FS` | Foam depth, sheet water, bead wetness, foam dye, the foam's offset, the soap film it leaves, cloth and blade smear. Gravity runs down the rake; water runs in rivulet lanes, pools at the cowl and dams above parked blades; curtain lines climb the glass; blades push a bow wave; the dryer drives water up |
| Scene | Full size, RGBA16F | `SCENE_FS` | Tunnel walls, floor and arches with LED bars and lit signs, the bonnet as a mirror, curtains, the foam fall, mitters, wrap and top brushes, the dryer's nozzle, the night street; spray streaks from `precip.js` |
| Down | 1/4, 1/8, 1/32, 1/128 | `DOWN_FS` | Box steps; the two small ones light the foam |
| Lens | Two targets, half or quarter size | `BOK_FS` (`bokeh.js`) | The eye focuses on the glass: a depth-aware disc gather from the 1/4 frame, tight (wiped glass) and wide (wet glass). Dry glass at the door racks focus to the tunnel |
| Pane | Full size | `PANE_FS` (`wetglass.js`) | `wgPane()` in glass metres, sheet bending; lather with body (thickness relief, a lit lip, a contact shadow, froth and medium bubbles, large bubbles that pop into rings, glints that follow the nearest arch light, an iridescent film where it thins); dry-glass dust, dried spots and a sliding highlight; the dryer's air line; the wipers; then the car: dash and vents mirrored low on the glass, frit band and tint strip, pillar, side window, header, lining, mirror |
| Knee | Half size | `KNEE_FS` | A soft knee picks the glow; halos lean a little toward white |
| Bloom | The chain from the knee | `bloomChain()` | Threshold 0, 5 levels (3 on Low) |
| Final | Screen | `FINAL_FS` | `gdGrade()`, a fade for Go, hot light toward white, `ouAces()`, `ouSrgb()`, a triangular dither |

### Uniforms

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uS` | float | The car's place in the tunnel, metres from the door | -4.5 to 22.4 |
| `uTop` | vec4 | Top brush: axis u, axis y, spin angle, on | Set each frame |
| `uMit` | vec4 | Mitter curtain: u, strip sway, on | Swings 0.28 m at 0.41 Hz |
| `uOn` | vec4 | Stations running: soak, foam, rinse, wax | 0 to 1 as the car nears |
| `uAmb` | vec3 | The floods' light on the car, for the foam | From `carLight()` |
| `uKnife` | vec3 | The dryer's air line: frame v, air | 0 to 1 |

## Sound

| | |
|---|---|
| Graph | `audioKit()`; outside layers go through a cabin low-pass at 900 Hz and a peak at 125 Hz |
| Engine | Raw Web Audio |
| Voices | Engine idle (three low tones); roof drumming (a baked loop of ticks); glass drumming; spray hiss; brush cloth flutter with slaps; dryer roar with a turbine peak; curtain splashes; foam landing; conveyor chain knocks; wiper motor and turn knocks; the roller's clunk on Go |
| Sleep | The beds fade when the loop stops; the kit sleeps 1.5 s later and when the page hides |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `detail({ maxDpr: 2, budget: 2.2e6 })` |
| Slow-frame step | `detail()` (sim size, bokeh scale and bloom levels follow the level) |
| Idle | The loop stops when the car is parked, or 12 s after it stops past the exit, and the wipers rest |
| Reduced motion | No loop: each Go shows the next station as a still (the glass sim runs forward to it); a wipe clears its fan at once; no body shake |
| Measured | 2026-11-16, live page loop, pane shown, High at 2496 x 1344, roll-in: median 16.2 ms a frame (60 fps). Probe, one step and draw: 13 to 18 ms on High, 12 to 15 ms at Standard's 2.3 Mpx |

## State and storage

| Key | Holds |
|---|---|
| `stimming.carwash.sound` | Sound on or off |
| `stimming.carwash.paint` | Paint |
| `stimming.carwash.expo`, `.bloom`, `.grain` | Dev tuning |

## Tests and QA

None in `tests/`. Checked on 2026-11-15 in a probe tab (stills from the live shaders): every station at 1280 x 720, 375 x 812 and 812 x 375; the bar's corners do not overlap; no sideways scroll; sound levels measured per station with an analyser. Not checked: the look in motion at full speed with the pane in front, and sound by ear.

## Known issues

- The live frame time of the heavy stations (foam, brushes) was not measured in the real loop; only the probe's GPU time. `stimming-auj3`
- The passenger blade's arc is mostly out of frame on 16:9; only the driver's arc shows.

## Legacy build

None.

## History

| | |
|---|---|
| Epic | `stimming-auj3` |
| Plans | None |
| Version | None |
