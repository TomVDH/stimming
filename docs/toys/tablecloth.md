# Tablecloth yank (`tablecloth/`)

| | |
|---|---|
| Dutch | Tafelkleedtruc /ˈtaːfəlkleːtˌtrʏk/ (draft) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.6 0.17 22)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 112, group E, a physics loop: drag the cloth edge and yank it; plates and glasses stay put or crash, depending on how fast you pull. Bean `stimming-nf4i`. Plan: [tablecloth.md](../plans/tablecloth.md).

## Rules

- One table, one setting, one gesture, one slider. No modes.
- The cloth is a Verlet sheet; the pieces are rigid bodies. Friction between them is the whole toy: a piece gains about mu g t while the cloth is under it, so speed decides.
- Measured outcomes for a Space yank (two runs each): 6 m/s, all 11 pieces stand within 6 cm; 4 m/s, all stand within 14 cm; 3 m/s, one or two pieces fall; 2 m/s, about five fall. A slow drag down to the boards takes the whole setting with it.
- A slow drag to the boards lights the cloth in each of 10 sim runs: the candle rides off, falls and throws its embers onto the cloth.
- A glass or plate that meets the floor fast breaks. Cutlery and the candlestick do not.
- A candle that falls stays lit for a few seconds. As it lands, it throws a spray of burning wax. Cloth that the flame or an ember touches catches fire.
- Fire spreads over the cloth, fast upward and slowly downward. Burning cloth chars, shrinks and burns through: holes with glowing edges, then ash. Wine and water put out the cloth they soak.
- The table sets itself again 2.5 s after all is still, fire and smoke included. R or Space does it at once and puts the fire out.
- The loop runs while anything moves. At rest the candle drifts at 30 fps for 60 s, then the loop stops.

## Direction

- 3D. A fixed camera at the table's pull-end corner, above and back, looking along the table. The floor in front of the pull end is in frame for the crash. A tall frame stands further back.
- A dining room at night: one warm pendant lamp above the table makes a pool of light; the room falls off into dark haze. At the far end, a painted wall with a wainscot and a tall window on the night; faint moonlight comes through it. The window and the lamp shade give the glass and the steel their highlights.
- A walnut table, 1.4 x 0.85 m, on four turned legs, a bead under the apron; oak boards.
- White satin damask cloth, 2.1 x 1.5 m, about 0.33 m of drop each side. Damask figures and a border band show only in the sheen; a doubled hem.
- Two places across the table: a porcelain dinner plate with a slate line on its verge, a knife, a fork, a tulip wine glass with deep red wine, a tumbler with water. A brass candlestick with a lit candle between them; wax drips run down the candle from its rim.
- Fire, after Fire: flames are heat in a fluid drawn through Fire's wood ramp, its hot stops turned toward orange (Tom, 2026-11-23); smoke takes the lamp's light. The fire lights the room. A white hem stitch and a fine weave show in the linen.
- True details: the setting moves a few cm toward the pull even on a clean yank; the trailing edge flicks each piece as it slips out, so plates chatter and glasses rock; the liquid surface stays level and lags its glass (first slosh mode of its radius); a tipped glass pours from the low side of its rim; the candle flame leans in the wind of the passing cloth and goes out if the stick falls; a wine glass's foot and stem survive its fall while the bowl breaks; a slow pull takes the setting down the cloth's hanging face before it drops.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Actions | Yank (Space): a clean yank at the Speed set; on a pulled table it resets first. Reset (R). |
| Slider | Speed: 0.6 to 8 m/s on a log scale; stored as `stimming.tablecloth.speed`; default about 6 m/s |
| Settings | Quality (shared) |
| How to play | Drag, release, Space, R |

| Gesture | Does |
|---|---|
| Press near the hanging hem | The hand takes the whole hem |
| Drag | The cloth follows the hand on the upright plane down the table's middle |
| Release with speed | The hand follows through at 1.5 times the release speed until the cloth clears the table |
| Release slowly | The hem drops where it is |
| Keys | Space yanks; R resets |
| Wheel, pinch, tilt | None |

## Renderer and libraries

| | |
|---|---|
| Stack type | Scene |
| Tier | three.js 0.170, WebGL 2 |
| Post | RenderPass, the fire's volume pass, UnrealBloomPass, OutputPass, a grade pass (vignette, grain) |
| Files | `index.html`, `main.js` (page, input, loop), `shapes.js` (profiles, layout, shard plans), `sim.js` (cloth, pieces, liquid, shards, fire spread, reset), `scene.js` (three.js), `ware.js` (tableware meshes and materials), `fire.js` (fire and smoke), `sound.js` |

## Sim

- Cloth: 48 x 34 Verlet particles at 120 Hz, six passes of structural, shear and bend links, a tether from the held hem along the path over the table's edges, collision with the table block (top and apron) and the floor, friction on both. The drawn mesh is the grid upsampled three times by Catmull-Rom and pushed out of the table.
- No clipping: the midpoints of the cloth's links and quads collide with the table, so a corner never cuts through between particles. The cloth keeps clear of the legs and, on the floor, of itself.
- Pieces: own rigid bodies after Wrecking ball (sphere sets) at 240 Hz. Plane contacts take normal passes, then one friction impulse and one torsional impulse at the contact centroid. On the top, friction under the cloth takes the cloth's velocity.
- Off the top, a piece meets the cloth's own surface: the nearest triangle of the cloth's quads, found through a 5 cm grid. A piece keeps to its own side of the cloth; it learns its side only while the two are apart. The cloth goes round the pieces from its side too. A piece that lands on cloth over the floor breaks as on the floor.
- Sleep: a pose test over an eighth of a second; a fallen cloth sleeps 2 s after it leaves the table.
- Shards: lathe patches of the piece's own profile, as rigid bodies on the table, the floor and a cloth heap, plus chips. Drops and puddles for the liquid.
- Fire: each cloth particle holds heat and fuel. Heat past 1 lights it; a lit particle burns its fuel in about 6 s and heats its eight neighbours, those above it most. Rising heat also lights cloth that hangs above a fire. Burning cloth shrinks its links; spent fuel cuts the particle out of the cloth. A puddle cools the cloth it soaks.
- Fire and smoke (`fire.js`, a K3 port of `shared/fire.js` to three.js 0.170 WebGL2, after `cloudbottle/fluid.js`): a 96 x 48 x 60 grid of 3.3 cm cells over the table and the floor before its pull end, packed as y slices in one atlas. Advect, buoyancy, turbulence, vorticity confinement, a 12-pass Jacobi solve, dye transport. The table top is solid; the top of the box is open. Burning particles are the emitters. The volume marches at half size, stops at the scene's depth, and lays over the scene before the bloom. The K3 lighting section holds Fire's ramp, self-shadow and phase.

## Sound

Raw Web Audio on the shared kit, muted by default. Banks are rendered once: porcelain, stemmed glass, tumbler, steel and brass voices of a few inharmonic modes each; tocks on wood, thuds on the boards; glass and china crashes with a tail of tinkles; shard tinks; a rustle and a two-crack snap for the cloth; slosh, drip and splash; a whoosh as the cloth catches, the spit of hot wax, crackles; a short dining-room echo. A roar of filtered noise swells with the fire. A cloth hiss follows the slide speed. A hit through the cloth is muffled by a low-pass. Each hit jitters pitch, time and level, at most eight a frame.

## Frame loop

| State | Does |
|---|---|
| Lively | Full rate while held, sliding, falling, sloshing, burning, smoking or resetting |
| Drifting | The candle flickers at 30 fps (a 30 ms timer between frames); a pulled table waits for its reset at the same rate |
| Asleep | 60 s after the last input the flicker eases out over 2 s and the loop stops |
| Hidden | The loop and the sim clock stop at once |
| Reduced motion | No flicker and no drift; the reset places pieces on straight paths |

The slow-frame watchdog steps down: pixel ratio 1, then smaller bloom, no multisampling, a smaller shadow map.

## QA

Captures: `docs/qa/tablecloth/` (01 blockout to 10 icons; 11 to 17 for the second pass: the new look, the slow ride, the fire, its ash). Q1 to Q10 passed on 2026-11-23, headless Edge on the RTX 3070 (D3D11), and again after the second pass: a clean console through Space, R, a slow drag, a fast flick and a full fire; Space yanks and R resets and puts the fire out; a hidden page draws no frames; reduced motion stops after the reset; the drift asks 31.5 frames a second and none after 64 s; the audio context suspends after the toy settles, the fire's too. Frame time: 10.6 ms mean through a yank, 7.8 ms mean with over 900 particles burning. Tom checks fps on a real screen.

## Open

- 3D or flat: 3D by default.
- The shot: the setting is small so the crash zone fits. A closer shot is Tom's call.
- The Dutch name: draft Tafelkleedtruc.
- The icon pick: A of spike tablecloth-1 is on the menu until Tom picks.
- Fire on a slow drag: the cloth catches each time the candle falls on or near it. A fast yank leaves the candle standing, so no fire.
- Reduced motion keeps the fire: it is the result of a gesture (Tom: yes).
