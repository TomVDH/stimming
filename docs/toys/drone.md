# Zena (`drone/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | Zena /ˈzeːna/ |
| Motto | None |
| Shelf | Main, number 65 |
| Stage | Alpha |
| Series | None |
| Accent | `oklch(0.72 0.14 275)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

A faux drone sim: you fly a heavy-lift X8 quad over a field at dusk.
Eight rotors, a real flight controller and wind make it feel like a real craft; the onboard camera shows a flight HUD.

## Rules

- The name Zena is a brand-name exception for now (Tom, 2026-11-17). Tom may rename the toy.
- The id and the folder stay `drone`.
- The airframe has no lettering and no maker's marks.
- No readout on the stage. The flight numbers live only in the onboard feed's HUD (Bar v3).
- The feed stays light: one scene render and one pass. Never put the NVG tube back in this view.
- The model work waits for Tom (2026-11-17).

## Direction

- The onboard feed is a modern camera: mono with a cool white tint, fine grain, a slight wide-lens bend.
- HUD marks are white and engraved, with a soft dark rim, as in Railgun's sight (Tom).
- The HUD behaves as in real flight: world-fixed horizon and ladder, waterline, velocity vector, speed and altitude tapes with trends.
- Downwash: noisy gusts of pressed grass, never perfect rings (Tom); dust as rolling clouds.
- Haze discs on every rotor, upper and lower (Tom).
- The two-drag mouse scheme is a proof of concept (Tom). Keys and a gamepad are the main paths.

## Controls

<!-- gen:bar -->
Bar: v3 (`signal: true` on the Bar v2 spec).

| Slot | Holds |
|---|---|
| Choice | Mode: Position, Angle, Acro (segments; keys 1, 2, 3) |
| Actions | View (V), Reset (R) |
| Slider | Wind, 0 to 8 m/s mean |
| Key strip | `drag` fly, `right-drag` climb and turn, `WASD` climb and turn, `arrows` fly |
| Settings | View: Chase, Gimbal, Pilot; Quality; Reset |
| Dev (`?dev`) | None |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Drag (left button) | Right stick: pitch and roll |
| Right drag | Left stick: throttle and yaw; up from the ground starts the motors |
| Touch | Left half: throttle and yaw. Right half: pitch and roll |
| Keys | W and S climb and sink, A and D turn, arrows or I J K L fly, Shift for fine control |
| Gamepad | Mode 2: left stick throttle and yaw, right stick pitch and roll; bumpers step the mode, Y the view, Start resets |
| Wheel, pinch | Chase: distance. Gimbal: camera tilt. Pilot: zoom |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Stack type | Scene |
| Tier | three.js |
| Libraries | three |
| Importmap | Word for word |
<!-- /gen:stack -->

A camera moves through lit 3D objects, so the toy is a Scene on three.js 0.170.

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `reduced`, `stage`, `pageReady`, `pixelRatio`, `onQuality`, `audioKit` |
| `shared/intro.js` | `intro` |
<!-- /gen:shared -->

None.

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 70 | The page: stage, stick rings, styles |
| `main.js` | 799 | World, cameras, the onboard HUD, the loop, the bar |
| `flight.js` | 349 | Flight model and flight controller; no dependencies |
| `airframe.js` | 461 | The X8 airframe, built in code |
| `input.js` | 171 | Mouse sticks, thumbs, keys, gamepad |
| `sound.js` | 109 | Rotor sound |
| `feed.js` | 139 | The onboard feed and its HUD key |
| `wash.js` | 208 | Downwash: dust clouds and pressed grass |
<!-- /gen:files -->

## Render pipeline

| Pass | Target | Shader or material | Does |
|---|---|---|---|
| Shadow | Shadow map, 2048 | Depth | The sun's shadow, 32 m round the craft |
| Scene | Screen (Chase, Pilot) or a 4x MSAA target (Gimbal) | Standard and physical materials, sky shader | The world |
| Feed | Screen (Gimbal only) | `FEED_FS` in `feed.js` | ACES, mono, grain, lens bend, sharpening; the HUD key in white with a rim and an engraved edge |

### Uniforms

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uExpo` | float | Feed exposure, as the main view's | 1.15 |
| `uGrain` | float | Grain strength | 0.05 |
| `uLost` | float | Signal loss on a crash: row tear, noise, dim | 0 to 1 |

## Sound

| | |
|---|---|
| Graph | `audioKit()` |
| Engine | Raw Web Audio |
| Voices | One blade tone per rotor (8), beating against each other; air-wash noise; downwash rumble near the ground; distance, pan and Doppler |
| Sleep | The graph stops 1 s after the rotors stop; the kit rests |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `pixelRatio`; the feed draws its scene at up to 2.2 MP |
| Slow-frame step | None |
| Idle | The loop stops 30 s after landing, disarmed and untouched |
| Reduced motion | No wind by default, still grain, no windsock flutter, no motor buzz |
| Start-up | Shell default |
| Measured | Headless, uncapped, 1600 x 1000 at 1.5x (2026-11-17): Chase 2092 fps, Gimbal 1656 fps |

## State and storage

| Key | Holds |
|---|---|
| `stimming.drone.sound` | Sound on or off |
| `stimming.drone.view` | The view |
| `stimming.drone.mode` | The flight mode |
| `stimming.drone.wind` | The wind slider |
| `stimming.drone.dist` | The chase distance |

## Attributions

| Source | Kind | Licence | Credit shows |
|---|---|---|---|
| three.js 0.170.0 | Library | MIT | Site credits |
| Airframe from the hubspot-nightly intro (Tom's own code) | Procedural model | Tom's | None |

## Tests and QA

No test file yet. A change checks: arm, climb, hover, cruise, brake, yaw, land and disarm with keys and the mouse; a crash and the reset; the three views; 1280 px, 375 x 812 and 812 x 375; a clean console.

## Known issues

- Open work: the epic stimming-vk1p (course, field, model, controls, TypeScript, name review, the four parts).

## Legacy build

None.

## History

| | |
|---|---|
| Epic | `stimming-vk1p` (first bean: `stimming-81vs`, spike) |
| Plans | None |
| Version | None |
