# Chemical garden (`chemgarden/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | Chemische tuin /ˈxeːmisə ˈtœyn/ (draft, for Tom) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.8 0.1 215)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

One glass tank of water glass in a dark room, with a soft lamp behind it. Drop a metal-salt crystal in: it sinks, lands, and a hollow tower grows up through the liquid in the metal's colour.
The tower climbs in pulses. A bead swells at its tip and pops in a puff of colour, the tube kinks and goes on thinner, and now and then it branches. At the surface the tip turns and spreads.

## Rules

- 3D, three.js 0.170 (Tom, 2026-11-17). The tank is seen almost square on, a little from below the waterline.
- Light carries the scene: the lamp's glow comes through the liquid and through each tube, so a tube is pale where its wall is thin and dense at its edges.
- Real salt colours: copper blue, cobalt violet, nickel green, iron rust. Each salt has its own habit (iron grows short crusty bushes).
- The first frame is a garden of eight towers that grew long ago. Clear empties the tank for your own.
- The tank's floor stands above the bar (`ui.cover()`).

## Direction

- Defaults chosen by the build chat for the MVP (Tom's open question: "3D or flat, and the presentation"):
  - **Vessel:** one rectangular glass tank. Flat panes keep the towers readable with no lens work, and the glass edges catch the lamp as thin lines.
  - **Framing:** square on, the camera just below the waterline, so the underside of the surface reads as a silver band. A phone shows the middle of the tank at full height.
  - **The hand:** a click drops one crystal at that point, at a random depth; a drag sprinkles a line; Space scatters a handful.
- Reference: photos of real silicate gardens (Wikipedia, Wikimedia Commons): thin wavy tubes, bundles of copper tubes, violet cobalt fronds, rust iron clumps, all in clear beakers.
- Icon: A of `icons/spike-chemgarden-1.html` (no pick from Tom yet). Intro emblem: its silhouette, `shared/emblems/chemgarden.svg`.

## Controls

<!-- gen:bar -->
Bar: v3.

| Slot | Holds |
|---|---|
| Top left (choice) | Salt: Copper, Cobalt, Nickel, Iron (keys 1 to 4) |
| Actions | Scatter (Space), Clear (C) |
| Slider | Strength: weak water glass gives thin fast wisps; strong gives thick slow towers |
| Key strip | click: drop a crystal · drag: sprinkle · space: scatter · C: clear |
| Settings | Quality |
| Dev (`?dev`) | None |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click or tap | One crystal of the salt drops in at that point |
| Drag | A line of crystals, one per step of travel |
| Mouse move | The view tilts a few degrees, so the tank shows its depth (not under reduced motion) |
| Keys | 1 to 4 pick the salt; Space scatters five crystals; C clears the tank |
| Wheel, pinch, tilt | None |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Stack type | Scene |
| Tier | three.js 0.170.0, WebGL 2 |
| Libraries | three, three/addons (EffectComposer, RenderPass, ShaderPass, UnrealBloomPass, OutputPass) |
| Importmap | Word for word |
<!-- /gen:stack -->

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `reduced`, `onReducedChange`, `linFit`, `onQuality`, `pixelRatio`, `audioKit`, `stage`, `pageReady` |
| `shared/intro.js` | `intro` |
<!-- /gen:shared -->

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 69 | The page |
| `main.js` | 354 | Bar, garden, particles, input, loop, watchdog |
| `garden.js` | 315 | The growth model: pure logic, tested in `tests/chemgarden-garden.test.mjs` |
| `scene.js` | 541 | three.js scene: room, bed, towers, seeds, particles, liquid, surface, glass, post |
| `sound.js` | 113 | Web Audio voices |
<!-- /gen:files -->

## Growth model

| Phase | What happens |
|---|---|
| Fall | The crystal enters with a ring and bubbles, sinks at a slow terminal speed and tumbles; it leaves a faint streak of dissolved salt |
| Bulb | On the floor a gel skin swells around it for 0.9 to 1.5 s |
| Burst | The skin bursts and one to five tubes jet up from its top |
| Grow | Each tip climbs with two waves of wobble and a pull to vertical. Pressure builds; a bead swells and pops, the tube surges, kinks and thins. A pop can start a branch (fewer each generation, 14 tubes a tower at most) |
| Surface | A tip under the surface turns sideways, creeps 1.5 to 6 cm and stops |
| Crumble | Clear, or a full joint budget (6200), crumbles a tower top first in 1.2 s; its crumbs fall to the floor |

## Render pipeline

| Pass | Target | Shader or material | Does |
|---|---|---|---|
| Scene | half float, 4x multisample | room, bed, towers, seeds, points, liquid, surface, glass | Every lit part asks the lamp what lies behind it on the line from the eye (`behind()`) |
| Grade | half float | `ShaderPass` | Vignette, grain; it also resolves the multisample target |
| Bloom | half size | `UnrealBloomPass` (0.5, 0.55, 0.82) | Glow on the waterline, glass edges and fresh tips |
| Output | screen | `OutputPass` | ACES, sRGB |

Bloom reads after the grade on purpose: on some GPUs bloom on a multisampled target draws black.

## Sound

| | |
|---|---|
| Graph | `audioKit()` |
| Engine | Raw Web Audio on the kit's context |
| Voices | Drop: a plink, a splash and three bubble blips. Land: a glass tick and a soft thud. Pop: a wet blip, higher for a thin tube, louder for the first burst. Surface: a faint bright touch. Crumble: a low rustle with ticks. Growth: a band-passed fizz bed and tiny crackles, both by growth rate. Each voice pans with its tower |
| Sleep | `kit.rest()` when the loop stops |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `pixelRatio`, budget 2.2 M pixels on Standard |
| Slow-frame step | Own watch: pixel ratio 1, then third-size bloom and no multisampling |
| Idle | Lively while a crystal falls, a tower grows, a puff lives or the view eases; then the loop stops. No ambient drift. A minute after the last input, motion eases to a stop over 2 s |
| Reduced motion | No view tilt; tubes wobble at 40 %; puffs and crumbs fade in place |
| Start-up | `compileAsync`, then one first frame behind the intro |
| Measured | 2026-11-22, headless Chromium with ANGLE GL on the dev PC: 60 fps while one tower grows; 60 fps (worst frame 16.8 ms) with 29 towers growing and 2,121 capsules. A phone is not measured yet |

## State and storage

| Key | Holds |
|---|---|
| `stimming.chemgarden.sound` | Sound on or off |
| `stimming.chemgarden.salt` | Salt choice |
| `stimming.chemgarden.strength` | Strength |

## Tests and QA

Captures in `docs/qa/chemgarden/`. `node --test tests/chemgarden-garden.test.mjs` checks the model. A change must keep Q1 to Q10 of `docs/plans/README.md`.

## Known issues

- Not checked on a real phone, a real touch screen or Safari.
- Nobody has listened to the sound yet. Levels sit under the other toys by design, not by ear.

## Legacy build

None.

## History

| | |
|---|---|
| Epic | `stimming-oh7b` |
| Plans | `docs/plans/chemgarden.md` |
| Version | None |
