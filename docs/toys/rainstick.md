# Rain stick (`rainstick/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | Regenstok /ˈreːɣənˌstɔk/ (draft, for Tom) |
| Motto | Turn it over. There's the weather again. |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.84 0.13 78)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

A glass tube with walnut caps lies on a dark stage, full of glass beads and a helix of brass pins.
Turn the tube and the beads rush, then trickle down through the pins for 10 to 15 s.
Each bead that strikes a pin clicks and lights that pin, so the tube rains light as it rains sound.

## Rules

- Sound and light share one event: a pin hit plays one voice and lights its own pin.
- The beads never see an angle jump. A spring follows every turn, flip and key.
- The physics runs in the tube's own frame, in fixed sub-steps of 1/240 s.
- No stand in the toy. The plinth and the post stay in the icon and the emblem only.

## Direction

- Flat, side-on view, chosen by the build chat for the MVP (Tom's open question: "3D or flat, and the presentation"). The physics is 2D, so a flat view shows every bead and every pin. The light gives the depth.
- Pins point at the viewer, so each pin shows as a brass dot. Their heights follow a helix seen side on.
- No stand: a flip turns the tube end over end, through upright, and a post would cut through it. The Look rule also cuts the prop.
- A warm backlight sits low and right, behind the tube. It gives the glass its long rim and puts a hot spot in each bead.
- Beads: clear, amber, teal and coral glass, after the icon.
- The tube fits the free stage at its angle. It shrinks fast and grows slowly, so it never leaves the stage.
- Icon: Tom's pick D of `icons/spike-rainstick-1.html` (2026-11-16).

## Controls

<!-- gen:bar -->
Bar: v3.

| Slot | Holds |
|---|---|
| Top left (choice) | None |
| Actions | Flip (F) |
| Slider | Beads: the bead count, 80 to 280 |
| Key strip | drag: turn the tube · click: shake · F: flip |
| Settings | Quality, Reset |
| Dev (`?dev`) | None |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click or tap | A shake: the beads jump back up the tube and click |
| Drag | The tube turns about its centre and follows the pointer's angle |
| Keys | F turns the tube over in 0.8 s; Space or Enter shakes; left and right arrows tilt by 12° |
| Wheel, pinch, tilt | None |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Stack type | Shader |
| Tier | Raw WebGL2 |
| Libraries | None from the importmap |
| Importmap | Word for word |
<!-- /gen:stack -->

A few hundred discs need no 3D scene. Instanced quads and two tube quads draw everything.

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `fitCanvas`, `pageReady`, `stage`, `reduced`, `onReducedChange`, `audioKit`, `onQuality` |
| `shared/intro.js` | `intro` |
| `shared/gl.js` | `TRI_VS`, `program`, `linked`, `target`, `free`, `bind`, `tri`, `onContextLoss` |
<!-- /gen:shared -->

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | about 65 | The page |
| `main.js` | about 340 | Bar, gestures, the turn spring, framing, frame loop |
| `sim.js` | about 250 | Beads, pins, grid and the position-based solver |
| `draw.js` | about 430 | Shaders and passes |
| `voice.js` | about 210 | Click voices, the bed, the tube body, the whoosh |
<!-- /gen:files -->

## Physics

| Item | Rule |
|---|---|
| Units | One unit is a bead radius, about 4 mm. The tube is 120 long and 13 wide inside. |
| Gravity | 180 units/s², under a tenth of real, so the trickle is slow glass |
| Turning frame | Coriolis, centrifugal and Euler terms, scaled by 0.4 and 0.16 to the same slow time |
| Step | 1/240 s, three solver passes, a speed cap of 0.6 units a step, so no bead passes a pin |
| Pins | 58 discs, 1.8 apart, height 0.8 R cos(golden angle × i) |
| Contacts | Pin restitution 0.42, wall 0.25, Coulomb friction 0.3 |
| Hit | A pin strike above 9 units/s makes a hit: pin, speed, x |
| Sleep | No hit and no bead above 5 units/s for 0.5 s |
| Cost | About 0.3 ms a frame at 180 beads (Node) |

## Render pipeline

| Pass | Target | Shader | Does |
|---|---|---|---|
| Stage | `scene`, RGBA16F | `BG_FS` | Blue-black ground and the warm backlight |
| Back glass | `scene` | `TUBE_FS`, back | The far wall dims the stage, thicker at the edges |
| Pins | `scene` | `DOT_VS`, `PIN_FS` | Brass heads; a struck pin glows hot white with a halo |
| Beads | `scene` | `DOT_VS`, `BEAD_FS` | Sphere impostors: tinted glass, the backlight as a lens spot, Fresnel rim, a key glint |
| Front glass and caps | `scene` | `TUBE_FS`, front | Glass walls and rim, a window stripe, walnut caps with a brass ring |
| Bloom | 5 halves | `BRIGHT_FS`, `DOWN_FS`, `UP_FS` | Bright pass, then down and up the chain |
| Grade | Screen | `FINAL_FS` | ACES curve, vignette, grain and dither |

## Sound

| | |
|---|---|
| Graph | `audioKit()`, raw Web Audio |
| Pin voice | Eight click buffers drawn at start: a noise tick, a brass ring (three inharmonic partials) and a glass tink. Level from the strike speed; pan from the pin's place on screen; each pin keeps its own pitch, with jitter on top. |
| Wall voice | A duller, shorter knock when a bead strikes the glass hard |
| Cap | 60 voices a second. The surplus feeds a looped crackle bed, so a rush sounds like rain, not a buzz. |
| Tube body | Every voice feeds a feedback comb and a band pass at 171.5 Hz, the lowest mode of a 1 m tube |
| Flip | Band-passed noise sweeps up and back over 0.9 s: the beads slide down the glass |
| Sleep | The bed stops 0.6 s after the rush; the context suspends 1.5 s after the loop stops |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `fitCanvas`, cap 2 and the shared budget |
| Slow-frame step | Own watch (batch rule): pixel ratio to 1, then one bloom level fewer, then two thirds of the beads |
| Idle | Lively while a pointer is down, the tube turns, a bead moves or a pin glows. Then the loop stops. No drift. |
| Reduced motion | Flip turns the tube at once. Pin light halves in 150 ms and shows at 0.55. A shake is softer. |
| Start-up | Shader link, 2.5 s of physics ahead, one frame and `gl.finish()` behind the intro. The trickle runs on when the intro clears. |
| Measured | 60 fps headless (ANGLE GL) at 1280 × 800 during a flip |

## State and storage

| Key | Holds |
|---|---|
| `stimming.rainstick.sound` | Sound on or off |
| `stimming.rainstick.beads` | The bead count |

## Attributions

| Source | Kind | Licence | Credit shows |
|---|---|---|---|
| Position-based dynamics | Technique | Public knowledge | None |
| ACES filmic curve (Narkowicz fit) | Technique | Public knowledge | None |

## Tests and QA

QA captures: `docs/qa/rainstick/`. A change must pass Q1 to Q10 in `docs/plans/README.md`.

## Known issues

- At a shallow angle the beads rest on the pins near the lower wall. The trickle stops early there, as in a real rain stick held flat.
- The plan's Fill choice (Seeds, Glass, Steel) and the Pins and Glow settings are not built. The MVP has glass beads only.
- Headless capture on Tom's PC needs `--use-angle=gl`.

## Legacy build

None.

## History

| | |
|---|---|
| Bean | `stimming-6hb9` |
| Plans | `docs/plans/rainstick.md` |
| Version | None |
