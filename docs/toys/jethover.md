# Jet hover (`jethover/`)

| | |
|---|---|
| Dutch | Zweefjet /ˈzʋeːfˌdʒɛt/ (draft) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.72 0.13 285)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 366, group C, a cinematic diorama: a VTOL jet hovers on its turbofans with the afterburner lit. Bean `stimming-ay6n`. Plan: [jethover.md](../plans/jethover.md).
Tom sized the full toy XXL. This build is the MVP: one shot, the hover. The plan names the later stages.

## Rules

- One craft, one pad, one shot. No modes, no start-up, no landing.
- The craft is generic: no real aircraft's shape, name, livery or markings (hard rule 11).
- The heat carries the shot: plumes, shock diamonds, shimmer, spray and haze answer the throttle.

## Direction

- 3D, with a fixed low camera at three-quarter front: a diorama with no orbit. The shimmer needs air between the craft and a far horizon.
- Blue hour, just after sunset. The camera looks toward the last light, so the dark craft has a cool rim and a warm underside from its own exhaust.
- An open plain and a damp concrete pad, a far ridge and a row of far lights. The shimmer bends the far lights, the ridge and the slab joints.
- A tall stage pulls the camera back so the whole craft fits.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Actions | Reheat (Space, hold): full throttle |
| Slider | Throttle: the hover setting, 0.2 to 0.75; stored as `stimming.jethover.throttle` |
| Settings | Quality (shared), Reset (the hover setting back to 0.45, the drift to the centre) |
| How to play | Hold, drag, click, Space |

| Gesture | Does |
|---|---|
| Hold | Full reheat: the engines spool up, the craft climbs a little, the plumes lengthen and the spray throws out wider |
| Drag while holding | The craft drifts toward the pointer and yaws a little to face it |
| Click or tap | A short burst of throttle |
| Release | The throttle comes back to the hover setting; the craft settles to the centre |
| Keys | Space held is full reheat |
| Wheel, pinch, tilt | None |

## Renderer and libraries

| | |
|---|---|
| Stack type | Scene |
| Tier | three.js 0.170 |
| Libraries | three (core, EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass); Web Audio for sound |
| Importmap | Word for word |

## Shared modules

| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `pageReady`, `stage`, `reduced`, `onReducedChange`, `audioKit`, `sound` |
| `shared/intro.js` | `intro` |
| `shared/detail.js` | `detail` |

## Files

| File | Role |
|---|---|
| `index.html` | The page |
| `main.js` | Bar, renderer and passes, engine and craft motion, pointer, frame loop, life cycle |
| `scene.js` | Sky dome, pad shader, the craft from lofts and plates, lights, environment |
| `fx.js` | Plume ribbons, heat ribbons and sheet, spray points, refraction and grade passes |
| `sound.js` | Roar, rumble, hiss, turbine whine, fan buzz and reheat crackle |

## How it works

```mermaid
flowchart LR
  H[Hand: hold, drag, Space] --> T[Throttle]
  T -->|spool lag| R[rpm]
  R --> C[Craft height and drift]
  R --> P[Plumes and diamonds]
  R --> G[Pad glow and lamps]
  R --> S[Spray]
  R --> A[Sound]
  P --> HT[Heat field]
  S --> HT
  HT --> RF[Refraction pass]
```

- **Engine.** The rpm follows the throttle with a lag: about 0.55 s up and 1.1 s down. A press adds a small kick at once, so the gesture answers in the same frame.
- **Craft.** Extra thrust over the hover setting lifts it on a soft spring. The drift is a slower spring toward the pointer, with a roll from the side speed.
- **Plumes.** One view-facing ribbon per nozzle, from the nozzle to the pad. A hot throat, a body that runs orange to violet blue, and shock diamonds: rhombs on the axis, spaced wider with more throttle, each dimmer than the one above. The cold lift-fan jet shows only in the heat field and the spray.
- **Pad.** Damp concrete with slab joints and soot, light from the nozzles and a hot pool under each plume, a wet mirror of the sky and a streak of each plume, then haze.
- **Heat.** Heat ribbons, an upright sheet over the pools and the hot spray draw into a half-size buffer. The refraction pass bends the scene by rising noise cells scaled by that buffer. The craft writes depth there, so heat behind it does not bend it.
- **Frames.** Scene with MSAA, heat, refraction, bloom with a threshold, grade, ACES output.

## Frame loop

| State | Rule |
|---|---|
| Lively | The hand acts, the engine spools, or the craft moves: full frame rate |
| Drifting | The hover: the flame flickers and the spray runs, at 30 fps |
| Asleep | 60 s after the last input, time eases to a stop over 2 s and the loop stops |
| Hidden | The loop and the sim clock stop at once |
| Reduced motion | No flicker, bob, sway, shake or grain while idle; the hover holds still and the loop stops. The throttle still answers. |

The first frame is a picture: five seconds of hover run before it, so the spray and the pools are up.
Sound follows the hand: it plays while the throttle is worked and through the spool-down, then fades and the audio context sleeps while the hover drifts on.

Slow frames step down: pixel ratio, then the bloom buffer to a quarter, then the spray cap to 500.

## QA (2026-11-22)

Headless Chromium with `--use-angle=gl`. Captures: `docs/qa/jethover/`.

| Check | Result |
|---|---|
| Q1 syntax | `node --check` passes on every module and the menu script |
| Q2 console | Clean at 1280, 375 x 812, 812 x 375, reduced motion and with sound on |
| Q4 idle | 30 frames a second while drifting; 0 frames in 2 s at 65 s after the last input |
| Q5 hidden | 0 frames in 2 s |
| Q6 reduced motion | No frames while idle; 0 frames in 2 s once the craft settles after a gesture |
| Q7 bar | 2 controls (Reheat, Throttle); 4 How rows |
| Q8 keys | Space held runs the engine to 0.95; release spools back to the hover |
| Q9 sound | The context runs during the gesture and is suspended 9 s after release |
| Q10 frames | 16.7 ms median, 16.7 ms p90 during a hold and drag, on Tom's PC through ANGLE GL |

## Open for Tom

- 3D or flat: 3D by default, a fixed low camera. A flat elevation would lose the air the shimmer bends.
- The name (working name Jet hover), the Dutch name (draft Zweefjet) and the accent.
- Sound follows the hand and fades after the spool-down; a steady hover hum while idle is possible but loud for an office.
- Icon pick: A is on the menu until Tom picks (spike `jethover-1`).
