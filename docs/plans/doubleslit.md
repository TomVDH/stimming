# Double slit (`doubleslit`) implementation plan

Status: built as a Lab MVP (2026-11-22) · Bean: `stimming-w9m0` · Toy doc: [doubleslit.md](../toys/doubleslit.md)

**Goal:** Fire single photons through two slits. Each photon lands as one random dot. Only the crowd of dots shows the interference fringes.

**Architecture:** Flat, raw WebGL2 on `shared/gl.js`. The CPU samples each landing from the true two-slit intensity. Instanced dots go into two float targets: the plate keeps every count, and the flash layer fades by the K1 decay. A compose pass draws the detector face; bloom from `shared/glow.js`; a grade pass.

**Spec:** idea 123 in [toy-ideas.md](../toy-ideas.md) (Tom's replacement pick for batch 4); batch rules in [README.md](README.md); Bar v3 in [bar-v3.md](bar-v3.md).

| | |
|---|---|
| Size, estimate | S · $10 to $20 |
| Kits | K1 phosphor plate (`trails/`): the decay pass and the additive splat |
| Before the build | nothing |

## Defaults (Tom's open question: 3D or flat, and the presentation)

- **Flat, face on.** The stage is the face of a photon-counting camera: a dark glass plate in a dark room, as the real build-up photos show it. The dots are the whole story; a 3D bench would push them small and add props.
- **No apparatus on the stage.** The slits and the source are off the frame. The plate is the one object.
- **The default colour is 470 nm**, a blue LED, as in Harvard's demo. It reads blue on dark glass and stays apart from Cloud chamber's white and Night vision's green.
- **Each dot keeps its photon's colour.** A real detector is grey; colour here shows the wavelength, so a change of colour shows on the plate.
- **The slider is Colour (wavelength).** It changes the dot colour and the fringe spacing together (spacing grows with wavelength), so one hand move changes two things you can see.

## The physics

- Far-field (Fraunhofer) intensity: `I(u) = cos²(π d u / λ) · sinc²(π a u / λ)`, with `u` the angle on the plate.
- Slit width to gap as in Harvard's demo: 200 µm wide, 1.0 mm apart, so `d / a = 5`: nine fringes inside the central envelope.
- One slit covered: `I(u) = sinc²(π a u / λ)`. The fringes go; the broad hump stays.
- The beam is taller than the plate is wide: along y the dots fall off as a soft Gaussian.
- A few dark counts land at random, as on a real detector.
- Each landing is drawn by inverse CDF from a 4096-bin table, rebuilt when the slits or the colour change.

## The shot

A dark glass plate with soft corners fills the free stage. The room around it is darker. A faint room light lies as a sheen on the glass, top left.
The first frame is a picture: about 160 dots already lie on the plate, too few to show the fringes; the idle source keeps a few flashes coming.

## Hero moments

1. **One photon.** A tap: a white-hot point flashes in the photon's colour, with bloom, at a random place, then settles to a small dot. A soft click.
2. **The reveal.** Hold: the stream rises to 60 photons a second. The stripes show after some seconds and grow sharp over about a minute.
3. **Cover a slit.** Pick One slit: new dots fill the dark gaps, and in a minute the fringes wash out into one hump.

## Loop

- **Tap:** fire one photon.
- **Hold:** stream; the rate rises over 3 s and falls on release.
- **Untouched:** the source drips about 3 photons a second (drifting, 30 fps). After 60 s idle the drip stops over 2 s, the flashes fade, and the loop sleeps.

## Bar (Bar v3)

| Slot | Content |
|---|---|
| Choice | Two slits (2), One slit (1) |
| Slider | Colour: 420 to 660 nm, stored as `stimming.doubleslit.nm` |
| Actions | Fire (hold, Space), Clear (C) |
| How to play | Click fires one, hold streams, 1 and 2, C |
| Settings | Quality (shared) |

## Sound

Web Audio, muted by default. Each landing clicks: a 2 ms noise burst through a resonant band (2 to 5 kHz), with pitch, level, time and pan by x jittered, so no two are the same.
Above about 40 clicks a second the clicks thin out, and a soft rain of filtered noise rises with the rate.
A slit change slides a shutter. Clear wipes.

## Reduced motion and idle

Reduced motion: no drip; a tap and a hold still fire; flashes are softer. The loop sleeps when the last flash fades.
Hidden: the loop and the source stop at once.

## Tasks

### Task 1: Blockout
- [x] Plate, sampler, dots, flashes; screenshot at 1280 x 800 (no checkpoint: batch 4 ran unattended).

### Task 2: Look and sound
- [x] Flash and dot, plate glass, sheen, bloom, grade, dark counts. Clicks, rain, shutter, wipe.

### Task 3: Lab entry and QA
- [x] Icon round, emblems, intro emblem, `toys.json`, Lab tile and hook.
- [x] QA Q1 to Q10; toy doc; tick the bean. The cost is not recorded.
