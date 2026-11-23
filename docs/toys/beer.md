# Beer pour (`beer`)

Lab toy, series Belgium. Dutch name draft: Schuimkraag. Bean `stimming-fvs3` (feature); the refinement pass is `stimming-tptn`. Plan: `docs/plans/beer.md`.

A macro shot of one glass on a dark bar, backlit by a warm lamp. The bottle stands out of focus at the right. Hold to pour: the bottle lifts, tips and pours a beaded jet; the head climbs, swells and settles. The cold beer fogs the glass, beads grow on it and run. Each sip leaves a lacing ring.

## Play

| Input | Act |
|---|---|
| Hold | Pour: the bottle lifts, swings over the glass and tips. The glass cants to the beer's ritual angle and rights itself as it fills. |
| Hold and drag | Move the pour: sideways along the rim; up for a longer drop and a bigger head. |
| Drag the glass | Swirl: the glass slides on the table and springs home; the beer sloshes and can spill. |
| Tap the glass | It rings, lower when full, and frees a burst of bubbles. |
| Move the mouse | The camera leans round the glass. |
| Keys | Space holds a pour; P pours the beer's ritual; S sips; C clears to a fresh glass and a full bottle. |

## Bar v3

Choice Beer (25 beers, a stepper). Actions Pour (P), Sip (S), Clear (C). Slider Fizz. Settings: Light (Warm, White, Neon), Foam time (Fast, Real), Cold glass (on by default), Quality, Reset.

## How it works

three.js 0.170, WebGL2, custom shaders. Three layers: the room behind (blurred), the inside of the glass (beer, fizz, head, stream), then the glass over it.

| Part | Source | Method |
|---|---|---|
| Beer | `index.html`, `BEER_FS` | A lathe of the inner wall. Each pixel refracts in, marches to the wall, refracts out and reads the blurred room. Beer-Lambert along the true path; haze scatters the lamp forward. |
| Head | `FOAM_FS` | Bubbles pressed on the glass: round grey faces with bright rims and a key glint, finer below. The lamp light through the head uses Fire's smoke shading, copied as a marked `K3 lighting` section from `cloudbottle/scene.js`. |
| Fizz | `FIZZ_VS`, `FIZZ_FS` | Instanced sprites placed from time alone: nucleation trains (height grows as age cubed), wall bubbles, the surge, pops and spray. Each bubble is a gas lens: a dark rim, a bright core, a key glint. |
| Stream | `updateStream()` | A tube swept along the jet's parabola each frame, with three's physical transmission material. Capillary ripples run down it and grow into beads as it falls. |
| Wet glass | `shared/glassrain.js`, `shared/wetglass.js` | The shared wet pane, wrapped round the outer wall in arc and height. Cold beer chills the wall below its level: fog first, then beads, then runs that slip down and wipe tracks (about 40 s). |
| Lacing | `LACE` in `index.html` | A sip records the foam line. The glass draws a net of bubble walls there, with scallops and drips below; the films burst with age. Up to six rings. |
| Finish | `shared/output.js`, `shared/grade.js`, `shared/flare.js` | Bloom (three's UnrealBloomPass), a lens flare from the lamp (`flBuoy`, a soft orb and a thin streak), vignette, `ouAces`, an S-curve and grain from `gdHash`. |
| Fill model | `index.html` | Beer and foam volumes in the tipped glass (circular segments per slice); weir flow from the tipped bottle; foam per pour from the drop, the fizz and the beer's power; drainage by the beer's half-life. |

## Sound

`beer/sound.js`, raw Web Audio on the shared kit, muted by default. A stream hiss that rises in pitch as the glass fills, with a low splash; glugs at four to seven a second whose note falls as the bottle empties; fizz ticks that follow the head's age; a glass ring on a tap (lower and shorter when full); a sip; a clink on Clear. A hidden tab stops every voice.

## Performance

| Check | Result (2026-11-23, Edge headless, D3D11, RTX 3070, 1280 x 800, dpr 1) |
|---|---|
| Frame interval while pouring | median 7.7 ms, p90 15 ms |
| Drifting (settling head) | 30 fps |
| Asleep (60 s after input) | 0 frames |
| Console | clean at load and in play |

## QA captures

`docs/qa/beer/`: r00 before the pass; r01 mid-pour; r02 the full head; r03 wet glass and lacing after a sip; r04 375 x 812; r05 812 x 375; r06 reduced motion; r07 Kwak in its stand.

## Open

- Brand names: Tom keeps the real beer names, prints and labels (2026-11-23).
- The menu icon is thin: for the icon pass.
- Not checked: a real phone, real touch, the sound by ear.
