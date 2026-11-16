# Mesh ball (`meshball/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | None yet (Tom sets it) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.58 0.25 318)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

A soft ball of goo sits in a white net. Press and hold: a dent sinks under the finger, and goo bubbles swell out through the holes round it, fattest in a ring that widens as the squeeze goes on.
Drag to roll the squeeze round the ball. Let go and the bubbles suck back in with a wobble.

## Controls

<!-- gen:bar -->
Bar: v2 (`meshball/index.html:116`).

| Slot | Holds |
|---|---|
| Top left (choice) | `Goo`, segments with colour dots: Grape, Lime, Mango, Glitter, Rainbow (keys 1 to 5), default Grape |
| Bottom left (actions) | `Squeeze` (held, Space): two palms press the ball from the left and the right |
| Bottom right (slider) | `Mesh`, 3 to 8 holes along a cube edge, default 5 |
| Key strip | hold squeeze; drag move the squeeze; space squeeze both sides |
| Settings | `Wobble` (0 to 1, 0.6), Quality; Reset in the footer |
| Dev (`?dev`) | `Bloom` (0 to 1.5, 0.55), `Exposure` (0.5 to 2, 1), `Glow` (0 to 2, 1), `Gloss` (0 to 2, 1), `Net bite` (0 to 2, 1) |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Press and hold | A finger dents the ball. Pressure builds over about 2 s. A ring of bubbles swells round the dent; the rest of the ball bulges less. |
| Drag | Moves the dent round the ball. Bubbles ahead swell; bubbles behind suck back. |
| Release | The bubbles suck back in with a wobble and a slurp. The dent springs back. |
| Press off the ball | Presses the nearest point of the outline. |
| Two or three fingers | Up to three dents at once. |
| Pen or pressure screen | A harder press dents deeper. |
| Mouse move | The key light follows the pointer, so the highlights glide over the bubbles. |
| Keys | Space holds the two-hand squeeze. 1 to 5 pick the goo. |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | Raw WebGL2 |
| Libraries | None imported |
| Importmap | Word for word |
<!-- /gen:stack -->

The picture is one full-screen ray march of a signed-distance ball through one fixed camera, so no scene graph is needed (`docs/stack.md`, decision guide 1).

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `reduced`, `onReducedChange`, `audioKit`, `linFit`, `stage`, `pageReady` |
| `shared/intro.js` | `intro` |
| `shared/detail.js` | `detail` |
| `shared/glow.js` | `bloomChain`, `glowDetail` |
| `shared/grade.js` | `GRADE` |
| `shared/output.js` | `OUTPUT` |
<!-- /gen:shared -->

Local copies: the GL helpers (`shader`, `program`) follow `stone/index.html`. The composite uses `ouAces`, `ouSrgb` and `ouDither` from `OUTPUT` through its own hue-keeping curve, not `ouFilm`. The cube-sphere maths (`faceUV`, `faceDir`, `cellDir`) is local; no shared module holds it. See `docs/plans/modularize.md`.

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 1139 | The page |
<!-- /gen:files -->

## Render pipeline

The ball lives in its own frame; `uRot` turns world vectors into it. The net is a cube sphere: six faces of N x N square holes on an equal-angle map. A fixed base turn (`Q0`, `:603`) puts a cube corner in view.

Each frame the CPU springs the model (`step`, `:818`), then writes every hole's bubble into an RGBA32F texture of 12N x N texels (`placeBubbles`, `:895`): texel one holds the bubble sphere (centre, radius), texel two its net radius and height.

| Pass | Target | Shader or material | Does |
|---|---|---|---|
| Ball | HDR frame, RGBA16F (RGBA8 without float targets) | `BALL_FS` (`:188`) | Sphere trace from the bound sphere. Each step reads the hole's bubble and its three nearest neighbours (`bubbleAt`, `:277`; `scene`, `:292`), the cords and knots, and the dented base. A step never passes a bubble it did not read. Jelly shading (`shadeGoo`, `:398`): deep body, glowing thin walls and creases, a wet skin that mirrors a softbox and a rim strip. Cords (`shadeNet`, `:441`). |
| Bloom | Half-size chain | `bloomChain` from `shared/glow.js` | Threshold 1.0 (0.8 on RGBA8); three or five levels by detail level. |
| Composite | Screen | `COMP_FS` (`:495`) | Bloom, vignette 0.5 and grain 0.02 (`GRADE`), a film curve on brightness that keeps the goo's colour, sRGB and dither (`OUTPUT`). |

A bubble below one hole radius is a sphere cap that fills its hole; above, it is a grape on a neck (`bubble`, `:626`). A low bubble clips to its cap's curve over the local net, so a pressed bubble follows the dent and leaves the cords clear.

### Uniforms

Ball shader, the ones a person tunes:

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uStrand` | float | Cord radius | Half a cell times 0.1 |
| `uBite` | float | How deep a cord sinks into the goo | Cord radius times 1.15 times Net bite |
| `uGlowK` | float | Light through thin goo | Dev Glow, 1 |
| `uSpecK` | float | Wet reflection | Dev Gloss, 1 |
| `uSteps` | int | March steps, by detail level | 44, 64, 84 |

Model constants (`:566` to `:652`, springs at `:816`): `HOLE` 0.94 of the half cell; a grape reaches the full half cell. Rest height 0.4 hole radii. Target height: rest plus pressure times (0.24 g + 0.85 ring g2), at most 1.25, with a press cutting 30 % under it. Finger: dent width 0.05, depth 0.13, reach 0.33 rad. Palm: 0.11, 0.17, 0.56. Springs: hole 210 (damping from Wobble), dent 140, lean 26.

## Sound

| | |
|---|---|
| Graph | `audioKit()` |
| Engine | Raw Web Audio |
| Voices | Squish (`:694`), on a press: noise through a resonant low-pass that sweeps 1700 to 240 Hz, and a sine gloop 150 to 72 Hz. Pop (`:703`), when a bubble passes a half sphere: a rising sine blip and a wet click; bigger holes pop lower; two pops a frame at most. Suck (`:711`), when a bubble drops back fast: a falling blip. Slurp (`:719`), on release: band-pass noise rising 320 to 1500 Hz and a low bloop; louder when more goo was out. Squelch (`:728`), while a press moves: looped noise through a band-pass that slow noise shakes; its level follows the drag speed. |
| Sleep | `kit.rest()` suspends the context 1.5 s after the loop stops. A hidden tab suspends it at once. |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `detail({ maxDpr: 1.75, budget: 2.2e6 })` (`:786`); High gives the screen's ratio up to 3 |
| Slow-frame step | `detail()`: two seconds under 38 fps drop one level: ratio 1, 44 march steps, three bloom levels. A new quality choice clears it. |
| Idle | The loop runs only while a press holds, a spring moves, the light eases or the lean settles. Then it stops. Hidden, it stops. |
| Reduced motion | Springs are critically damped, so nothing wobbles or overshoots. No lean, no light follow, no jiggle on a goo change; the canvas fade is instant. The squeeze still works. |
| Measured | 2026-11-15, Apple M3 Pro, High, 1738 x 1872 px, a held press at Mesh 5: 7 to 19 ms of GPU time a frame, median 12 ms (timer query; nine other toys shared the GPU). First frame 127 ms after navigation start. Phone frame times not measured. |

## State and storage

| Key | Holds |
|---|---|
| `stimming.meshball.sound` | Sound on or off |
| `stimming.meshball.wobble` | Wobble, from Settings |
| `stimming.meshball.bloom`, `.expo`, `.glow`, `.gloss`, `.bite` | Dev rows |
| `stimming.quality` | Site quality (shared) |

## Tests and QA

No files in `tests/`. QA on 2026-11-15 ran in the built-in browser pane, in a tab of its own, with full-size canvas captures sent to a local sink: console clean; press, hold, drag, release, a touch with pressure, the Space squeeze, all five goos, Mesh 3, 5 and 8, the Settings sheet, the loop asleep once settled (no frames in 2 s), and the sound graph built and running. Layouts held at 992 to 1142 px wide, 375 x 812 and 812 x 375. A change must keep the console clean and hold Bar v2 compliance (`docs/plans/bar-v2.md`).

## Known issues

- The sound was checked by its graph only, not by ear (`stimming-5ext`).
- Phone frame times are not measured (`stimming-5ext`).
- The Space squeeze flattens the sides; seen edge on, the flat pillows there can look dark (`stimming-5ext`).

## Legacy build

None.

## History

| | |
|---|---|
| Epic | None; feature bean `stimming-5ext` |
| Plans | None; idea 250 in `docs/toy-ideas.md` |
| Version | None |
