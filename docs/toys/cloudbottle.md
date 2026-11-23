# Cloud in a bottle (`cloudbottle`)

Lab toy, idea 129. Bean `stimming-ec87`. Plan: `docs/plans/cloudbottle.md`.

A round glass jug with a little water stands on a black lab bench. A red rubber stopper seals it; an amber hose runs from the stopper to a rubber squeeze bulb on the bench.
Squeeze the bulb to pump the jug up. Pull the stopper, or pump past the limit: it pops, the air cools at once and a white cloud fills the jug. Squeeze again and the cloud clears.

## Play

| Input | Does |
|---|---|
| Click or tap (away from the stopper) | One squeeze: the bulb squashes, about 0.045 bar goes in |
| Hold | Squeezes once each 0.42 s |
| Drag the stopper up | Pulls it: it pops |
| Space | Pump |
| Enter | Release |
| Smoke slider | The nuclei: a thin haze at 0, a dense white cloud at 100 |

- A loose stopper goes home on the next squeeze.
- Past 0.55 to 0.65 bar the stopper pops by itself, after a creak.
- The cloud's density follows the pressure drop and the smoke. It forms in about 0.2 s: the densest nuclei light first.
- A squeeze on a sealed, cloudy jug warms the air: the fog halves and swirls. Three or four squeezes clear it.
- Left alone, the cloud thins with a 40 s time constant and sinks a little toward the water.
- The first frame: a cloud a few seconds old, the stopper loose on the mouth.

## How it is built

| File | What |
|---|---|
| `index.html` | The page shell |
| `main.js` | State, pump and pop physics, pointer, Bar v3 spec, frame loop |
| `jug.js` | Sizes, the jug profile in GLSL, the camera, the hose curve, the 64³ cloud noise |
| `fluid.js` | Fire's gas method in raw WebGL2: a 32 x 40 x 32 grid in the jug |
| `scene.js` | Raw WebGL2: fluid step, fog (half size), blur, bench, scene, bloom, grade |
| `sound.js` | Web Audio one-shots |

- 3D, a fixed camera a little above the jug. Signed distances draw the jug, stopper, hose (12 capsules) and bulb.
- The fog pass is a 36-step ray march inside the jug and over its mouth. Its lighting is a copy of Fire's smoke shading (`shared/fire.js`, `volume()`), marked `K3 lighting`: three self-shadow taps toward the key, Beer plus a multiple-scatter lobe, the powder term, a 0.5 ambient floor, and a Henyey-Greenstein phase. The march dither turns each frame; a two-pass blur hides it, as in Fire.
- The cloud moves with Fire's fluid (`shared/fire.js`), ported to raw WebGL2 in `fluid.js`, marked `K3: volume fluid`: advect, buoyancy, ambient turbulence, vorticity confinement, a Jacobi pressure solve, dye transport. The grid is 32 x 40 x 32 cells of 7.5 mm, packed as y slices in one 2D atlas. The glass is a solid wall; the mouth is open while the stopper is out.
- The dye holds the cloud and the gas warmth. A pop fills the cloud from the noise (dense nuclei and thin gaps) and adds an expansion source: the gas rushes up the neck. The cold gas meets warmer glass, so it rises along the walls, gathers under the shoulder and takes the droplets back up as vapour: the jug clears from the top. A squeeze blows a jet down the neck and warms the gas past the glass.
- As in Fire, the grid gives the body and fine noise, carried by the flow, cuts its edges. Formation raises a coverage threshold.
- The bench pass draws the black epoxy bench, the key's pool, and the jug's shadow analytically: glass and water pass light with a caustic line and a focus; the fog darkens the shadow.
- The scene pass marches the glass shell, then inside it to the water face (exact plane, meniscus line), the stopper and the back wall, and composites the fog between the walls.

## Frame loop

- Lively while the bulb, the stopper, a forming cloud or the wisp moves.
- Drifting at about 30 fps while a cloud swirls (measured 29.5 rAF per second headless). The fluid steps with the frame; asleep, it stops.
- 60 s after the last input the swirl eases to a stop over 2 s; the loop sleeps. A clear jug sleeps as soon as the parts settle.
- Hidden tab: the loop and the sim clock stop.
- Reduced motion: the fluid does not step. No wisp, a short hop on the pop. The cloud still fills in place and the loop sleeps.

## Sound

Muted by default. All one-shot nodes; an idle page runs no audio, and the context suspends 1.5 s after the loop sleeps.

- Squeeze: a breathy push that rises with the pressure, a short valve buzz, then the refill hiss.
- Creak: a few stick-slip ticks from the stopper near the limit.
- Pop: a crack, the jug's hollow note near 110 Hz, the hiss of escaping air, and a soft low breath as the cloud fills.
- Land and seat: a rubber knock with a short glass ring; a squeak as the stopper goes home.

## QA (headless Chromium, ANGLE GL, RTX 3070), 2026-11-23, with the fluid

| Check | Result |
|---|---|
| Q1 | `node --check` passes on the four modules, the menu scripts and the icon page |
| Q2 | Clean console in play (tap, hold, drag on the stopper, Space, Enter, slider), on `?lab` with the tile hovered, and on the icon page |
| Q3 | Captures in `docs/qa/cloudbottle/`; the fluid in `10-fluid-sequence.jpg` (first frame, pumped clear, 0.5 s, 3 s and 8 s after a pop) and `11-fluid-first-frame.jpg` |
| Q4 | Drift 29.5 rAF per second; 62 s after the last input, 0 frames in 2 s; a clear jug, 0 frames in 2 s |
| Q5 | Hidden tab: 0 frames in 2 s |
| Q6 | Reduced motion: clean console; 0 frames at rest; the pop forms the cloud with no wisp, then sleeps |
| Q7 | Bar v3: Pump, Release, the Smoke slider (3 controls); How to play has 4 rows |
| Q8 | Space pumps; Enter pops |
| Q9 | The context runs after a gesture and is suspended once the toy sleeps |
| Q10 | Frame times through a pop: median 16.7 ms, p95 16.8 ms |

## Open

- Tom sets the Dutch name (draft: Wolk in een fles).
- Tom picks the icon; A is on the menu until then.
