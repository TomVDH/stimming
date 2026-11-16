# Car wash (`carwash/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | None yet |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `linear-gradient(100deg, oklch(0.64 0.28 350), oklch(0.8 0.14 212), oklch(0.8 0.165 68))` (a new one waits in the handoff: neon red to sodium amber) |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

A 1950s roadside car wash in the Nevada desert that never closed and was never updated. Nobody knows who owns it; it is open all night; now and then something strange happens on a run.
The toy opens on an establishing shot: the place from across the road at night, held like a film's first frame. One action, Proceed, cuts to the driver's seat, and the wash runs by itself: a chain pulls the car through soak, suds, cloth strips, brushes, rinse, wax and the blower at 0.33 m/s, then the driver rolls out into the desert. The film cuts back to the establishing shot and waits.

## The place (Tom, 2026-11-16)

| Part | Built |
|---|---|
| Outside | A two-lane road with telephone poles and sagging wires; a low stucco building with glass-block windows and hand-painted WASH · WAX · DRY; an office with a breeze-block screen; a swept canopy on pipe posts with two caged bulbs; an empty cashier's booth with a faded price board; one sodium lamp on a wooden pole with dust and bugs in its cone |
| The pylon | 11 m: a slanted CAR WASH panel, an arrow ringed with bulbs (most dead, the rest chasing), and the only neon: OPEN 24 HRS, red and blue. The OPEN tubes buzz and drop out; the H is dead and now and then tries |
| Sky | The shared sky at 01:30, a dense star field, the galaxy's band rising behind the building, far ranges, a glow of far towns, silent heat lightning |
| Inside | Painted block walls (sea-green dado under cream, flaking), rust from the pipe brackets, a corrugated ceiling; arches of plain galvanised pipe with spray bars and nozzles; old twin tubes (one stutters, one runs dim, one is dead) and bulbs in wire cages; green motors with belts; small hand-painted signs; the chain in its slot; drain grates; moths at every lit lamp; mist that glows in the lamp light |
| The car | Seen from outside in the shot: a long, low sedan with fins, chrome and lit tail lamps, in the Paint setting. From inside: a chrome strip down the bonnet, an ornament on the nose, a painted dash with a chrome trim. Low beams light the lot and the desert; the driver turns them off in the tunnel |
| Suds | White, a touch warm or cool: soft heaped froth with a fine grain, a few clear bubbles of many sizes, lace where it drains. No coloured triple foam: that came decades later |

## Controls

<!-- gen:bar -->
Bar: v2.

| Slot | Holds |
|---|---|
| Top left (choice) | None |
| Bottom left (actions) | Proceed (shown only while the establishing shot waits, or while reduced motion steps the run) |
| Bottom right (slider) | None |
| Key strip | `[CLICK] proceed`, `[DRAG] wipers` |
| Settings | Paint (Black, Cherry, Pearl, Teal), site Quality, Reset |
| Dev (`?dev`) | Jump (entry to desert), Pace (1 to 8); driver's seat: Eye height, Eye side, Seat distance, Pitch, Yaw, Field of view, View Reset; establishing shot: Shot side, Shot height, Shot depth, Shot pitch, Shot yaw, Shot width, Shot Reset; Exposure, Bloom, Grain |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click, tap, Enter or Space | On the shot: Proceed. On the run: one wiper stroke |
| Drag | On the run: the wiper blades follow the hand round their pivots |
| Wheel, pinch, tilt | None |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | Raw WebGL2 |
| Libraries | None imported (the importmap is present, word for word) |
| Importmap | Word for word |
<!-- /gen:stack -->

One full-screen pass per stage of the frame draws the whole view. Two cameras share the scene shader: the establishing shot (`uShot` 1, its own position and turn) and the driver's seat.
The windscreen is a bowed plane that leans back 31 degrees: its cowl edge is 1.15 m ahead of the eye and 0.34 m down, its header 0.4 m ahead and 0.12 m up. Every view ray meets it (`glassHit()`), which gives glass coordinates in metres. The glass map, the drops and runs, the lather and the wipers work in those metres and reach the screen through a 2 x 2 Jacobian per pixel.

The world is analytic: boxes, pipes and planes in tunnel metres (door at z 0, the exit at z 19, the car toward +z). `exterior()` draws everything outside and hands rays through the front door to `tunnelFrom()`; `desertBeyond()` is the world past the exit door. The car from outside is a small sphere-traced SDF, drawn only in the shot. GLSL has no recursion, so mirrors use cheaper paths: `emitRay()` inside, `outEmit()` outside, `farLite()` for their sky.

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
| `shared/sky.js` | `SKY`, `skyAt` |
<!-- /gen:shared -->

`sky.js` gives the night palette (`skyAt(1.5)`), `skDusk`, `skStarField` and `skStars`; the galaxy band, the ranges, the town glow and the lightning are the page's own. The page does not use `shared/environment.js`: it needs a glass-state pass before the scene and a per-pixel wet value in `wgPane()`.

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 3151 | The page: shell, shaders, sim, timeline, sound, input |
<!-- /gen:files -->

## Render pipeline

| Pass | Target | Shader or material | Does |
|---|---|---|---|
| Glass | Two RGBA16F maps, ping-pong, 400 x 263 on Standard | `SIM_FS` | Foam depth, sheet water, beads, foam tint, the foam's offset, soap film, cloth and blade smear. Skipped on the shot |
| Scene | Full size, RGBA16F | `SCENE_FS` | The shot: the lot, the building, the pylon, the car, the sky. The seat: the same world through the door, the tunnel and its stations, the bonnet, the desert past the exit; mist, moths and dust in the light |
| Down | 1/4, 1/8, 1/32, 1/128 | `DOWN_FS` | Box steps; the two small ones light the foam. Skipped on the shot |
| Lens | Two targets, half or quarter size | `BOK_FS` (`bokeh.js`) | The eye focuses on the glass from the soak to the blower; before and after, it looks out. Skipped on the shot |
| Pane | Full size | `PANE_FS` (`wetglass.js`) | The wet glass, the lather, the blower's air line, the wipers, then the car round the glass. On the shot it passes the scene through |
| Knee | Half size | `KNEE_FS` | A soft knee picks the glow |
| Bloom | The chain from the knee | `bloomChain()` | Threshold 0, 5 levels (3 on Low) |
| Final | Screen | `FINAL_FS` | `gdGrade()`, the dip to black, hot light toward white, `ouAces()`, `ouSrgb()`, a triangular dither |

### Uniforms (beyond the stations)

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uShot`, `uShotP`, `uShotR`, `uShotF` | float, vec3, mat3, float | The establishing shot and its camera | From `shotCam()`: a wide and a tall preset, mixed by the stage's aspect, plus the Dev rows |
| `uArchC[9]`, `uArchM[9]` | vec3, float | Each arch lamp's colour and level; the spray density round it | Flicker from `stepLights()`; mist from the stations |
| `uOut` | vec4 | Sodium lamp, canopy bulbs, door spill, booth bulb | 0 to 1 |
| `uNeon`, `uChase` | vec4, float | OPEN, 24 RS, the failing H, the bulbs; the bulbs' chase | 0 to 1 |
| `uZen`, `uMid`, `uBand`, `uAnti`, `uSunD`, `uStars`, `uDay` | | The sky from `skyAt()` | 01:30 |
| `uFlash` | vec2 | Heat lightning: level, bearing | Pulses at least 0.45 s apart |
| `uMoth[25]` | vec3 | Two moths per arch lamp, bugs at the sodium head and the canopy bulbs | Placed each frame |
| `uHead` | float | The low beams | 1 outside, 0 in the tunnel |

## Sound

| | |
|---|---|
| Graph | `audioKit()`; every world sound runs through one `duck` gain; inside sounds through a cabin low-pass at 900 Hz and a peak at 125 Hz; outside sounds through a low-pass at 2.2 kHz in the car, 7 kHz on the shot |
| Engine | Raw Web Audio |
| Outside | Desert wind in gusts, crickets, the sign's 120 Hz transformer buzz and crackle when its tubes drop out, the lamp's hum |
| Inside | Two old motors out of step, the chain's knock, a gurgling drain, a loose panel that rattles under the brushes and the blower, a belt that squeals now and then; roof and glass drumming, spray hiss, cloth flutter and slaps, the blower's roar, curtain splashes |
| Sleep | The beds fade when the loop stops; the kit sleeps 1.5 s later and when the page hides |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `detail({ maxDpr: 2, budget: 2.2e6 })` |
| Slow-frame step | `detail()` watches the run only; the shot's capped frames do not count |
| Idle | The shot lives at about 30 fps (the sign, the dust, the bugs, the lightning) and stops when hidden or under reduced motion |
| Reduced motion | No loop; no flicker, no chase, no lightning. Proceed shows the next stop as a still; after the desert, the shot |
| Measured | 2026-11-16, GPU timer queries in a background probe tab on a shared, loaded GPU, at 1052 x 560, interleaved with the v4 build: shot 6.9 ms; entry 17.3 (v4 14.3); suds 17.1 (16.5); brushes 18.5 (17.0); blower 11.9 (21.1); desert exit 20.0 (9.9). Absolute numbers are inflated by other tabs' work; the ratios hold |

## State and storage

| Key | Holds |
|---|---|
| `stimming.carwash.sound` | Sound on or off |
| `stimming.carwash.paint` | Paint |
| `stimming.carwash.eyeX`, `.eyeY`, `.eyeZ`, `.pitch`, `.yaw`, `.fov` | The driver's seat |
| `stimming.carwash.shotX`, `.shotY`, `.shotZ`, `.shotPitch`, `.shotYaw`, `.shotFov` | The establishing shot |
| `stimming.carwash.expo`, `.bloom`, `.grain` | Dev tuning |

## Tests and QA

None in `tests/`. Checked on 2026-11-16 in a probe tab (stills from the live shaders, defaults read through an in-page stub so stored Dev values do not apply): the shot at 1280 x 720, 375 x 812 and 812 x 375; every station; the first frame after Proceed; the Proceed flow driven through `frame()` (shot, dip, run, the button hidden); a drag on the glass; the sound graph built and rendered on an offline context through every phase. Not checked: the look in motion with the pane in front, and sound by ear.

## Known issues

- The stored Dev values in the shared browser profile (bloom 1.07, grain 0.12, eye at its lowest and farthest back) change the look a lot from the defaults. `stimming-auj3`
- The soak curtain through the lens reads as rows of bright pills. `stimming-auj3`
- The passenger blade's arc is mostly out of frame on 16:9.

## Legacy build

None.

## History

| | |
|---|---|
| Epic | `stimming-auj3` |
| Plans | None |
| Version | None |
