# Aquarium (`aquarium/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | Aquarium /aːˈkʋaːrijʏm/ (draft, for Tom) |
| Motto | The fish have no idea what day it is. |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.8 0.11 195)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

A planted fish tank, seen through its front glass. Three small schools of tetras swim in it.
Click the surface: a pinch of flakes lands, and the fish rise and take it. Click the glass: they scatter, hide, calm down and come back to the front.

## Rules

- No frame and no props: the stage is the water behind the glass. The dark band at the top is the room above the waterline.
- Real fish, each with its own school: cardinal tetras low, ember tetras in the middle, lemon tetras high.
- Light carries the scene: one lamp above, caustics, soft shafts, haze that takes red first.
- A knock answers in the same frame: a flash at the knuckle and a ring in the glass. The fish start a moment later, near fish first.

## Direction

- 3D, chosen by the build chat for the MVP (Tom's open question: "3D or flat, and the presentation"). A fixed front view with a narrow lens; a mouse hover shifts the view a little, so the tank reads as a box of water.
- Fresh water, a nature-style planted tank: a carpet in front, two tall clumps of ribbon leaves, one short clump, sand that rises to the back.
- Reference: photos of planted tanks and of the three species. Cardinal: a cyan stripe nose to tail, red below its full length. Ember: glassy orange. Lemon: deep and pale, a red upper eye, a yellow and black anal fin.
- Physical details: the surface seen from below is a mirror (total internal reflection) with the fish and leaves in it; the meniscus is a bright line; fish shade the sand; oxygen pearls leave the leaves under a bright lamp; the substrate shows its section against the glass.
- Icon: Tom's pick A of `icons/spike-aquarium-1.html` (2026-11-16). Intro emblem: its silhouette, `shared/emblems/aquarium.svg`.

## Controls

<!-- gen:bar -->
Bar: v3.

| Slot | Holds |
|---|---|
| Top left (choice) | None |
| Actions | Feed (F), Knock (K) |
| Slider | Light: the lamp, dim to bright |
| Key strip | click: feed or knock · F: feed · K: knock |
| Settings | Quality, Reset |
| Dev (`?dev`) | None |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click or tap at the top | The surface band and the room above it: a pinch of flakes lands there |
| Click or tap lower | A knock on the glass at that point |
| Mouse hover | The view shifts a little (parallax) |
| Drag | A finger shifts the view; it springs back on release |
| Keys | F feeds at a random place; K knocks at the middle of the glass |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Stack type | Scene |
| Tier | three.js 0.170, WebGL 2 |
| Libraries | three, three/addons (EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass) |
| Importmap | Word for word |
<!-- /gen:stack -->

Fish need a camera, depth and instanced meshes; every material is a small `ShaderMaterial`, so no program grows large on D3D11.

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `pageReady`, `stage`, `reduced`, `onReducedChange`, `audioKit`, `sound` |
| `shared/intro.js` | `intro` |
| `shared/detail.js` | `detail` |
<!-- /gen:shared -->

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 60 | The page |
| `main.js` | 447 | Renderer, post, layout, loop, gestures, bar |
| `scene.js` | 661 | Shaders and meshes: back glass, sand, plants, fish, surface, shafts, points |
| `fish.js` | 308 | Schools, food, the knock and the startle wave |
| `sound.js` | 104 | Knock, patter, nips, darts, pearls, water bed |
<!-- /gen:files -->

## Render pipeline

| Pass | Target | Material | Does |
|---|---|---|---|
| Back glass | scene (half float, MSAA 4) | `BACK_FS` | Lit backdrop under water; above the waterline the mirror or the dark room |
| Sand, front section | scene | `SAND_FS`, `FRONT_FS` | Grains, caustics, fish shade, root shade; the substrate against the glass |
| Plants | scene | `PLANT_VS/FS` x 2 | Instanced ribbons that sway; a mirror twin above the surface |
| Fish | scene | `FISH_VS/FS` x 2 | One instanced tetra body; body wave, C-start bend, species pattern, iridescent stripe; a mirror twin |
| Points | scene | `PT_FS` | Flakes, motes, oxygen pearls |
| Shafts | scene, additive | `SHAFT_FS` x 12 slices | Light shafts through the water, slices parallel to the glass |
| Surface | scene, blended | `SURF_FS` | Ripples from drops, nips and knocks; mirror sheen, lamp spots, meniscus |
| Bloom | half size | `UnrealBloomPass` | Threshold 0.9 |
| Grade | screen | `GRADE` | Knock flash and ring, vignette, grain; Neutral tone mapping in `OutputPass` |

## Sound

| | |
|---|---|
| Graph | `audioKit()` |
| Engine | Raw Web Audio on the kit's context |
| Voices | Knock: a falling sine thump, a low noise click, three short glass modes, a water buzz. Patter: high noise ticks over 0.3 s. Nip: a rising plip at the surface, a tick below. Dart: a band-passed swish per startled fish. Pearl: a short rising blip. Bed: looped noise, low hum and a faint trickle |
| Levels | Offline render: knock peak −6.6 dBFS; patter, nips, darts and pearls −25 to −31 dBFS peak; bed −49 dBFS RMS |
| Sleep | `kit.rest()` when the loop stops; a hidden tab suspends at once |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `detail()`: cap 1.5, budget 2.2 M pixels on Standard |
| Slow-frame step | Rung 1 pixel ratio; rung 2 bloom at quarter size and 6 shaft slices; rung 3 half the carpet |
| Idle | Lively at full rate while food is in the water, a fish is afraid or the view eases; drifting at 30 fps; asleep 60 s after the last input, after a 2 s ease |
| Reduced motion | The fish hold still; feed and knock move them at about half speed; no parallax; the loop stops once the food is gone |
| Start-up | The schools settle for 8 s of sim time, then `compileAsync`, one frame and `finish()` behind the intro |
| Measured | 2026-11-22, headless Chromium with ANGLE GL on the dev PC: 60 fps through a feed and a knock at 1280 x 800 (median frame 16.7 ms, p95 16.8 ms), 51 fish. A phone is not measured yet |

## State and storage

| Key | Holds |
|---|---|
| `stimming.aquarium.sound` | Sound on or off |
| `stimming.aquarium.light` | Lamp level |

## Attributions

| Source | Kind | Licence | Credit shows |
|---|---|---|---|
| Caustic web: moving cell edges, written for this toy | Own code | Project | None |

## Tests and QA

Captures in `docs/qa/aquarium/`. `?qa` puts the tank state on `globalThis.__aq` for a test script.
A change must keep Q1 to Q10 of `docs/plans/README.md`.

## Known issues

- A resize to a new aspect lays the plants out again, so they jump.
- Not checked on a real phone or a real touch screen.

## Legacy build

None.

## History

| | |
|---|---|
| Epic | `stimming-oh7b` |
| Bean | `stimming-4xbr` |
| Plans | `docs/plans/aquarium.md` |
| Version | None |
