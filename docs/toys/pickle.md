# Glowing pickle (`pickle/`)

| | |
|---|---|
| Dutch | Gloeiende augurk /ˈɣlujəndə ɑuˈɣʏrk/ (draft) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.8 0.16 70)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 134, group A, a lab demonstration: plug in a gherkin; it hums and glows sodium yellow. Bean `stimming-f6pg`. Plan: [pickle.md](../plans/pickle.md).

## Rules

- One pickle, one switch, one slider. No modes, no salts, no other vegetables.
- Switch on: the pickle heats (about 4 s at 230 V, 16 s at 120 V), steams, sizzles and spits, then the arc lights at the right end. Under 100 V it only steams.
- The arc flickers and drops out for 50 to 160 ms now and then; each restrike flares and may spit.
- While it glows the right end scorches. The scorch stays until a fresh pickle.
- Switch off: the yellow goes in about 0.1 s; the hot char glows dull red and fades in about 4 s; the steam goes on while the skin is hot.
- 60 s after the last input the power switches itself off. The loop stops once the pickle is cool, dark and free of steam.

## Direction

- 3D. A fixed camera, low, at the front right, so the glowing end faces it. A tall stage looks from higher up.
- A white china plate on a dark oiled table in a dim room. A dim cool light from the upper left, as from a window behind blinds; a dark room environment gives the forks and the glaze their glints.
- A dill pickle, 12 cm by 3.7 cm, with a slight bow, ribs, warts and pale stripes. A steel dessert fork stands in each end, leaning out at 30 degrees; a red and a black clip lead bite the handles and run off to the sides.
- The glow is a sodium point light inside the pickle's right end. The pickle casts no shadow from it: the light leaves through the flesh. The forks cast hard shadows on the plate.
- The skin filters the glow: pale stripes pass more light, warts and dark skin less, so the pattern shows against it.
- Sodium light is one spectral line. A grade pulls the scene to one orange hue as the glow takes over, and the exposure drops, as the eye adapts.
- Steam: a raymarched volume with Fire's smoke shading (K3 lighting), lit by the glow from below and by the room from above.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Actions | Switch (Space): the mains on and off; it shows its state. Fresh (N): a new pickle, only while the power is off. |
| Slider | Variac: 90 to 230 V; stored as `stimming.pickle.variac` |
| Settings | Quality (shared) |
| How to play | Click, Space, N |

| Gesture | Does |
|---|---|
| Click or tap the stage | Flips the switch |
| Drag | Nothing |
| Keys | Space flips the switch; N lays a fresh pickle |

## Renderer and libraries

| | |
|---|---|
| Stack type | Scene |
| Tier | three.js 0.170, WebGL 2 |
| Post | RenderPass, the steam pass, UnrealBloomPass, OutputPass, a grade pass (sodium mono, vignette, grain) |
| Steam | A half-size raymarch (28 steps) of up to 14 noise-eroded puffs, Fire's smoke lighting (marked K3) with the glow as a moving point key, a depth prepass, a two-pass blur. It runs only while steam shows. |
| Sparks | Up to 96 points: ballistic brine drops; under the arc they burn sodium yellow |

## Sound

Web Audio on the shared kit, muted by default. Belgian mains, 230 V at 50 Hz.

- The hum: 50 Hz with the 100 Hz buzz of the iron. It follows the current: loud in the warm-up, thin once the arc burns (the current drops from about 6 A to under 1 A).
- The arc: noise chopped at 100 Hz and a high-passed 100 Hz rasp, with the glow's flicker.
- The sizzle: bright noise and bursting bubble ticks that follow the heat.
- Spits pop, restrikes snap, the ignition whumps; the switch clunks; a fresh pickle taps on the china.

## Files

| File | What |
|---|---|
| `index.html` | The page shell |
| `main.js` | State, the heat and arc model, the bar, input, the frame loop |
| `scene.js` | The set, the pickle shader, sparks, post |
| `steam.js` | The steam volume (K3 lighting) |
| `sound.js` | Web Audio beds and one-shots |

## Reduced motion

The glow does not flicker or drop out; it rises and falls slowly. No flare flashes. Fewer spits and less steam.
