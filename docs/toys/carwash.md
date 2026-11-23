# Car wash (`carwash/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | None yet |
| Motto | None |
| Shelf | Main, number 70 |
| Stage | Alpha |
| Series | None |
| Accent | `linear-gradient(100deg, oklch(0.64 0.28 350), oklch(0.8 0.14 212), oklch(0.8 0.165 68))` (a new one waits in the handoff: neon red to sodium amber) |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

A 1950s roadside car wash in the Nevada desert that never closed and was never updated. Nobody knows who owns it; it is open all night; now and then something strange happens on a run.
The toy opens on an establishing shot: the place from across the road at night, held like a film's first frame. One action, Proceed, cuts to the driver's seat, and the wash runs by itself: a chain pulls the car through soak, suds, cloth strips, brushes, rinse, wax and the blower at 0.33 m/s, then the driver rolls out into the desert. The film cuts back to the establishing shot and waits.

## Rules

- The camera's point of view is a set of Dev rows (`?dev`): the driver's seat and the establishing shot, each with position, pitch, yaw and field of view.
- Today's view is the default, so the page is the same without `?dev`.

## Direction

- A shady car wash in the Nevada desert. Nobody knows where it came from or who owns it. It is open 24 hours a day.
- It is a 1950s roadside wash, built then and never updated. The present year stays unstated.
- The toy opens on a wide establishing shot of the outside. The sole action is Proceed. Then the wash runs as one animation.
- Outside is empty desert at night. One buzzing OPEN 24 HRS sign is the only neon.
- Inside is old and worn. No generic neon tunnel.
- Most runs are ordinary. Sometimes one quiet, deniable strange moment happens. At most one per run. No jump scares.

## The place (Tom, 2026-11-16)

| Part | Built |
|---|---|
| Outside | A two-lane road with telephone poles and sagging wires; a low stucco building with glass-block windows and hand-painted WASH · WAX · DRY; an office with a breeze-block screen; a swept canopy on pipe posts with two caged bulbs; an empty cashier's booth with a faded price board; one sodium lamp on a wooden pole with dust and bugs in its cone |
| The pylon | 11 m: a slanted CAR WASH panel, an arrow ringed with bulbs (most dead, the rest chasing), and the only neon: OPEN 24 HRS, red and blue. The OPEN tubes buzz and drop out; the H is dead and now and then tries |
| Sky | The shared sky at 01:30, a dense star field, the galaxy's band rising behind the building, far ranges, a glow of far towns, silent heat lightning |
| Inside | Painted block walls (sea-green dado under cream, flaking), rust from the pipe brackets, a corrugated ceiling; arches of plain galvanised pipe with spray bars and nozzles; old twin tubes (one stutters, one runs dim, one is dead) and bulbs in wire cages; green motors with belts; small hand-painted signs; the chain in its slot; drain grates; moths at every lit lamp; mist that glows in the lamp light |
| The car | Seen from outside in the shot: a long, low sedan with fins, chrome and lit tail lamps, in the Paint setting. From inside: a chrome strip down the bonnet, an ornament on the nose, a painted dash with a chrome trim. Low beams light the lot and the desert; the driver turns them off in the tunnel |
| Suds | White, a touch warm or cool: soft heaped froth with a fine grain, a few clear bubbles of many sizes, lace where it drains. No coloured triple foam: that came decades later |
| Foam fall | A sheet of lather leaves the slot with a torn edge and holes; under it hang ropes of mixed widths at uneven places, each at its own speed, which swell, pinch and break into clumps lower down. On the glass the clumps land whole, each as the fall's line crosses its middle, in all sizes with torn, lacy rims; while the line is on the glass, thick foam spreads into thin, so the glass fills to white. Tom, 2026-11-22 (`stimming-mnpv`) |

## Strange (Tom, 2026-11-16: "strange things do happen when you go through it sometimes")

Most runs are an ordinary wash. At Proceed the run may draw one moment: Sometimes gives a 30 % chance, Often 75 %, Off none; the moment is then one of eleven, equally likely (about 2.7 % each on Sometimes). Each moment has its own sound cue, and the world's sound ducks under it. Nothing rushes the glass; nothing flashes more than twice in a second.

| Moment | Where | What happens | Cue |
|---|---|---|---|
| Lights out | Top brush | Every lamp in the tunnel dies for about 5 s; the cloth keeps turning in the dark; the lamps return with two flashes 0.45 s apart (a 1.5 s fade with reduced motion) | A relay's clunk and a falling hum; a ballast tick |
| Hand | Full suds | A hand presses into the foam from outside, holds, then slides down and away, smearing it | A dull thump and a skin squeak; a long squeak |
| Someone | Rolling out | A person stands in the desert at the far edge of the low beams. Back on the shot, someone stands under the lamp | A low swell, the world near silent |
| Foam climbs | Suds | For three seconds the foam slides up the glass, then falls again | A slow rising creak |
| Headlights | The whole run | Two headlights wait far behind in the mirror and never come closer; gone at the exit | A car idling, far off |
| Extra station | Between wax and spot rinse | An arch that was not there, with a dim red bulb and a sign nobody can read | A low drone and a long hiss |
| Two taps | Blower | The air stops and the chain holds; something taps the glass twice, and beads jump; the air starts again | The air dying; two knocks on glass; the air rising |
| Snow | Rolling out | Snow on the ground and in the air, an overcast, no stars. Back on the shot it is still snowing | A muffled hush |
| Noon | Rolling out | The exit opens on a bleached desert at noon. The shot is night again | Cicadas |
| Lights on the hills | Rolling out | Four lights hang still over the far hills; one slowly fades and returns. They are still there on the shot | A soft low chord |
| Exit is entrance | Rolling out | The exit opens on the entrance: the canopy, the door, the pylon | The sign's buzz |

Cut, and why: the road gone (too small to notice at a 1.2 m eye height); the brushes parting on someone at the far end (foam and lens blur hide anyone in the tunnel; the figure moved to the desert); wipers that move on their own (not deniable).

## Controls

<!-- gen:bar -->
Bar: v3 (the default; the old bar still builds, hidden).

| Slot | Holds |
|---|---|
| Actions | Proceed (shown only while the establishing shot waits, or while reduced motion steps the run) |
| Key strip (old bar) | `[CLICK] proceed`, `[DRAG] move the wipers` |
| How to play (`help`) | Click: Proceed. Click: Run the wipers once. Drag: Move the wipers. Enter: Proceed. Space: Proceed |
| Settings | Paint (Black, Cherry, Pearl, Teal), Strange (Off, Sometimes, Often), site Quality, Reset |
| Dev (`?dev`) | Run: Jump (entry to desert), Pace (1 to 8), Strange next (Random, None, or one moment by name). Driver's seat: Eye height, Eye side, Distance, Pitch, Yaw, Field of view, View Reset. Shot: Side, Height, Depth, Pitch, Yaw, Width, View Reset. Look: Exposure, Bloom, Grain |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click, tap, Enter or Space | On the shot: Proceed. On the run: one wiper stroke |
| Drag | On the run: the wiper blades follow the hand round their pivots |
| Mouse move | On the run: the head turns toward the pointer, 1.5 degrees across and 0.8 up and down at most, on a spring with a small overshoot. Not on touch, not with reduced motion |
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
The scene shader is one source in nine programs (`#define PASS_x`), because D3D11 cannot compile it as one program (`stimming-4uc8`): see Render pipeline. The links run in parallel (`KHR_parallel_shader_compile`); `linked()` waits for them before the first frame, and the page does not freeze.

Outside, each model (the ground, the building, the office, the canopy, the booth, the lamp, the pylon, the car in the shot) leaves its surface: albedo, roughness, metalness and any glow (`sfSet`, `sfGlow`, `sfOver`). The pass shades that surface once, at its end (`sfShade`): soft sky and fill light with a simple occlusion, then the sodium lamp, the two canopy bulbs and the neon, each with a cast shadow from the lot's solid shapes (`outVis`), and the sun by day. Diffuse and GGX specular with Schlick's Fresnel. One shade per pass keeps the D3D11 compile short. Mirrors and the tunnel side still use `outLight()`. Tom, 2026-11-23 (`stimming-zcmu`)
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
| `index.html` | 3621 | The page: shell, shaders, sim, timeline, strange moments, sound, input |
<!-- /gen:files -->

## Render pipeline

| Pass | Target | Shader or material | Does |
|---|---|---|---|
| Glass | Two RGBA16F maps, ping-pong, 400 x 263 on Standard | `SIM_FS` | Foam depth, sheet water, beads, foam tint, the foam's offset, soap film, cloth and blade smear. Skipped on the shot |
| Scene | Full size: two RGBA32F buffers in turn, then RGBA16F | `SCENE_FS`, seven programs a frame | The shot: the lot, the building, the pylon, the car, the sky. The seat: the same world through the door, the tunnel and its stations, the bonnet, the desert past the exit; mist, moths and dust in the light. The passes follow |
| Scene D, or E then F | RGBA32F: colour, distance | `PASS_D`; `PASS_E`, `PASS_F` | The desert past the exit; E and F (the entrance past the exit) run in its place for Exit is entrance. Only pixels whose ray gets there |
| Scene T | RGBA32F | `PASS_T` | The tunnel, with the desert from the pass before. Rays that start in the desert keep it |
| Scene O, P | RGBA32F | `PASS_O`, `PASS_P` | Outside: O the ground, the building, the office, the canopy; P the booth, the lamp, the pylon, the sky, the car, then the poles. Each shades its nearest surface once, with shadows. Rays that start inside keep the pass before |
| Scene L | RGBA32F | `PASS_L` | The arches, the figure, the bonnet |
| Scene M | RGBA32F: colour, the lens's depth | `PASS_M` | The blower, then the curtains, the wax mist, the brushes, the mitters, the foam fall |
| Scene N | `rtScene`, RGBA16F | `PASS_N` | The mitters on the glass, light in the air, snow, spray |
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
| `uWorld` | vec4 | Strange: snow, noon, lights on the hills, the entrance past the exit | 0 to 1 |
| `uFig`, `uExtra`, `uMirror` | vec4, float, float | Strange: a standing figure (x, z, level); the extra arch; the mirror's headlights | 0 to 1 |
| `uHand`, `uTap`, `uGrav` | vec4, vec4, float | Strange, in the glass sim: a hand (x, y, press), a knock (x, y, strength), foam's gravity | Gravity 1, or -0.9 when the foam climbs |

## Sound

| | |
|---|---|
| Graph | `audioKit()`; every world sound runs through one `duck` gain; inside sounds through a cabin low-pass at 900 Hz and a peak at 125 Hz; outside sounds through a low-pass at 2.2 kHz in the car, 7 kHz on the shot |
| Engine | Raw Web Audio |
| Outside | Desert wind in gusts, crickets, the sign's 120 Hz transformer buzz and crackle when its tubes drop out, the lamp's hum |
| Inside | Two old motors out of step, the chain's knock, a gurgling drain, a loose panel that rattles under the brushes and the blower, a belt that squeals now and then; roof and glass drumming, spray hiss, cloth flutter and slaps, the blower's roar, curtain splashes |
| Strange | Each moment ducks the world bus and plays its own cue straight to the kit's output |
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

Windows, 2026-11-22 (`stimming-4uc8`): every scene pass compiles in 6 s or less with d3dcompiler_47 at ANGLE's level (the one program before: over 300 s). Since the shading pass (2026-11-23): 7.5 s or less (O 7.5, M 6.8, E 6.5), the first frame at 9.3 s. In the app pane on D3D11, RTX 3070: the first frame at 9.5 s, no freeze, console clean, 8 ms frames in the run.
Same frame, before and after the split: headless Chromium on ANGLE GL, seeded `Math.random`, no free-running clock, the shot, every stop and six strange moments. The HDR scene matches to half-float precision, except thin poles' edge pixels, one arrow bulb (see Known issues) and NaN pixels on the anti-sun line (one more in the shot's sky, one fewer at the blower).
None in `tests/`. Checked on 2026-11-16 in a probe tab (stills from the live shaders, defaults read through an in-page stub so stored Dev values do not apply): the shot at 1280 x 720, 375 x 812 and 812 x 375; every station; the first frame after Proceed; the Proceed flow driven through `frame()` (shot, dip, run, the button hidden); a drag on the glass; the sound graph built and rendered on an offline context through every phase. Each strange moment forced from its Dev handler and shot as a still, with the shot on return after Snow and Someone. Reduced motion, stubbed in the probe: the shot is a still, Proceed steps through every stop with the button kept, and the desert returns to the shot. Not checked: the look in motion with the pane in front, sound by ear, and the cues' timing by ear.

## Known issues

- Tom's Dev values are the defaults since 2026-11-16 (`VIEW` and `LOOK` in the page): eye height -0.12, eye side -0.01, pitch -0.5, exposure 1.12, bloom 1.07, grain 0.12. Eye height and grain sit at the end of their ranges. Since 2026-11-22 the seat is further back (distance 0.32, range to 0.4) with a wider view (1.08), from Tom's ask; a stored Distance or Field of view overrides it until View Reset. `stimming-mnpv` The stills above predate this change. `stimming-auj3`
- The passenger blade's arc is mostly out of frame on 16:9.
- NVIDIA (D3D11 and GL): `pow()` of a negative base gives NaN, and the bloom turns each NaN pixel into a flare. The page clamps its bases: `mitters()` and `cloth()` (`sin` of 3.1416 goes below 0) and the Fresnel terms; `skDusk()` in `shared/sky.js` clamps its anti-sun line. `stimming-4uc8`, `stimming-wehv`
- Which arrow bulbs live comes from a hash of the bulb's place. The compiler's rounding can flip one bulb, so the pattern can differ between platforms and builds.

## Legacy build

None.

## History

| | |
|---|---|
| Epic | `stimming-auj3` |
| Plans | None |
| Version | None |
