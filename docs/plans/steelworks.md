# Steelworks (`steelworks`) plan

Status: MVP built as a Lab toy, 2026-11-23; waits on Tom's look · Bean: `stimming-2t3o`. Toy doc: [steelworks.md](../toys/steelworks.md)

Idea 204 Furnace tap, grown to size XXL, group C (Tom's picks, 2026-11-23): "A steel mill at night. Tap the blast furnace; molten iron runs the channels and lights the hall, a ladle tips into the converter, flame and sparks reach the roof."
Tom approved this plan on 2026-11-23. The MVP builds as a Lab toy.

## Context

Tom wants 200 toys on the main shelf and picked four parade pieces on 2026-11-23. Steelworks is the one indoor piece: a hall at night lit only by the metal in it.
The full toy is XXL (Jet hover's size). The first build is an MVP that finishes one hero moment at high fidelity, the way `docs/plans/volcano.md` cut an XXXXXL to one blast.

## 1. Reference (opened in the browser pane, Wikimedia Commons)

| Image | What it gave the look |
|---|---|
| `File:Blast_furnace_tapping.jpg` | The mood. A cast house in haze: cool blue shafts slant through the roof gaps, the iron glows orange low in the frame, a hood hangs dark over the taphole. Two colours, cool air and hot metal. |
| `File:Iron_runners_-_Trumbull-Cliffs_Blast_Furnace.jpg` | The layout. A round furnace shell on columns with the bustle pipe ring, a raised cast floor of sand, the main trough that splits into branching runners. |
| The molten iron stream set in the "blast furnace tapping" search (three close shots) | The iron. A white-yellow core, an orange edge, dark crust at the rim, sparks thrown up off the surface. |
| `File:Pouring the Molten Steel, Redcar Blast Furnace - geograph.org.uk - 624506.jpg` | The pour. Iron falls from a spout into a car below; spark fountains spray in round arcs; the whole bay glows from that one stream. |
| The "basic oxygen furnace converter" set (Commons, scanned plates) and a colour photo of a ladle pouring into a tilted converter | The converter. A pear-shaped vessel on trunnions, tilted toward the crane; the ladle tips from two hooks; a broad orange plume climbs; during the blow a white flame stands out of the mouth into the hood. |

The Gießhalle set (a museum cast house) gave the floor gear as it stands: the drill on its boom, the clay gun, the trough lid, the bosh plates. The MVP keeps only the drill and the gun as silhouettes.

## 2. The full toy (XXL): seven stages

The shot moves through one hall, the cast house first, then across to the converter bay. Each stage has one gesture.

| # | Stage | What happens | The hand |
|---|---|---|---|
| 1 | The hall at night | The furnace stands dark; the tuyere peepholes glow round the bosh; haze hangs under the roof; shafts from the yard lights slant in. | Nothing to do: it is the first frame. |
| 2 | The tap | The drill bores into the clay plug, grinding and throwing sparks. It breaks through: a jet of iron and gas blows out of the taphole with a roar and a spark fountain. | Hold to drill. Break-through comes after about 1.2 s of hold. |
| 3 | The iron run | Iron fills the main trough. At the skimmer the slag floats over and runs off to its own runner; the iron passes under and runs the iron runners. The edges crust, the centre flows bright, fume climbs into the hood, the hall lights orange. The tilting spout pours into a ladle under the floor. | Click the spout to swing the pour to the second ladle. Slider: Flow (the bore). |
| 4 | The plug | The clay gun swings in and plugs the taphole. The runners drain, crust over, cool from yellow to red to dark grey with a silver oxide skin. | Action Plug, or the cast ends by itself. |
| 5 | The ladle | A crane lifts the full ladle and carries it down the bay to the converter. The camera follows. | Drag to carry. |
| 6 | The charge | The converter tilts toward the crane. The ladle tips; iron pours into the mouth; a broad orange plume and sparks rise to the roof. | Hold to tip the ladle; the pour follows the tilt. |
| 7 | The blow | The converter rights itself, the lance drops in, and a white flame roars out of the mouth into the hood with a shower of sparks. Then it tilts the other way and taps steel. | Hold to lower the lance; the flame follows. |

## 3. The MVP cut: the tap and the iron run

One fixed shot of the cast house, stages 1 to 4 in one gesture loop.

### The hero moment

1. The first frame: the cast house at night. The furnace shell rises out of the top left into haze; the peepholes glow in a ring; cool shafts slant across; the runners lie dark and crusted from the last cast, a few cracks still dull red.
2. Hold on the stage (or Space): the drill bores. A spray of sparks, a grinding sound, the drill tip glows. The hall waits.
3. Break-through: the taphole blows. A jet of white-yellow iron arcs into the trough with gas, a roar and a round spark fountain. The light jumps across the hall.
4. The run (about 15 s to the spout): the front runs down the trough; the slag splits off at the skimmer and runs orange to its own pit; the iron runs white along the runner, the edges crust. Fume climbs, lit orange from below, into the hood. The air shimmers over the runners. The spout pours into the hidden ladle; the pit glows up.
5. The cast holds about 40 s (a real cast takes two hours). A click on the stage throws a spark burst where the pointer meets the iron (a splash).
6. The plug: the clay gun swings in, the jet chokes and stops. The runners drain and crust: yellow, red, a dark grey skin with a silver sheen and dull red cracks. The fume thins, the hall darkens. The loop sleeps.

### In and out

| In the MVP | Waits for a later stage |
|---|---|
| One fixed shot of the cast floor | The camera that follows the ladle down the bay |
| Hold to drill, release, the run; Plug; Flow | Swing the spout to the second ladle |
| The trough, the skimmer, two runners (iron and slag), the spout | The full runner tree with gates |
| The ladle hidden under the floor, seen as glow from its pit | The ladle on the crane, carried |
| Sparks, fume, shimmer, haze, shafts | The converter: charge, plume, blow, steel tap |
| No people (Tom, 2026-11-23) | |

### Tom's answers, 2026-11-23

1. Hero: the tap and the iron run.
2. Second light: cool shafts in haze.
3. People: none. The drill and the clay gun move on their own.
4. Gesture: hold to drill; break-through after about 1.2 s; an early release backs the drill off.

## Defaults

| Question | Default | Why |
|---|---|---|
| Renderer | three.js 0.170 (Scene type), small ShaderMaterials, as Volcano and Jet hover | The hall is solids: shell, columns, trusses, hood, floor, gear. The iron must light them. Later stages move the camera. |
| Time | Night | The iron is the key light; the hall is dark when the cast ends. |
| Second light | Cool blue-white shafts from the yard lights, through the roof monitor and wall louvres, into the haze | The reference's two colours. They give the dark hall a shape before the tap. |
| Camera | From a raised walk, eye 6.5 m over the cast floor, 50 degrees high (the build moved it up from 1.7 m: from the floor the runners hide in their channels). The furnace stands in the left half; the trough crosses toward the right; the runner leaves the right edge to the spout; the slag runner comes toward the eye. Narrow stage: the lens widens, the camera steps back. | The run crosses the frame; the iron shows in its channels. |
| Scale | Metres. Hearth 12 m across, taphole 3 m up the hearth wall; trough 1 m wide and 14 m long; runners 0.6 m wide; roof 30 m up. | True sizes keep the sparks and fume right. |
| Names | No real mill, company or plant names, no markings, no logos (hard rule 11). | |

## Physics (metres, seconds)

- The iron: a channel sim on the runner graph in JS. Each 0.25 m cell holds iron depth, slag depth and heat. Flow follows slope and depth (shallow water in 1D, lava coast's sim made linear). About 300 cells, 120 Hz, well under 0.1 ms a step.
- The skimmer: slag above the skimmer's lip goes over to the slag runner; iron goes under.
- Heat: iron taps at 1,500 °C, slag at 1,450 °C. The surface skins over where the flow is slow; the core stays liquid while it moves.
- Sparks: ballistic with drag. A carbon spark bursts at the end of its life into three to five forks (the iron spark's star). Each bounces once off the floor and dies.
- Fume: buoyant, sucked up by the hood's draught.

## Look (what makes it read as iron, not lava)

1. Iron is brighter and more liquid than lava: a white-yellow mirror that holds reflections of the hood and the sparks, not a crust with cracks.
2. Slag rides on top: orange, foamy, drifting in patches; it crusts first.
3. Cold iron goes grey-silver with an oily oxide sheen; cold slag goes dark and glassy.
4. Sparks: bright forks with stars at their ends; many near the taphole and the spout.
5. The hall: few shapes, light carries it (Look rule). Shell, hood, columns, trusses, the drill and gun as silhouettes, the floor. No props.

## 4. Tech

| Part | How | Source to read |
|---|---|---|
| Iron surface | A ShaderMaterial on the runner meshes reads a data texture (per cell: iron, slag, heat, speed). Blackbody ramp; two flow-mapped noise phases so the surface streams without smear; crust and cracks where slow; slag patches; a cheap reflection of the hood. | `lavacoast/shaders.js` (`incand`, the crust and braid code), `chocolate/index.html` |
| Light from the iron | Eight point lights placed along the hot cells each frame, weight by heat. One emission map (128 x 128, top down, blurred) for the floor's near glow. No shadow maps; a hand-placed occlusion under the hood. | `volcano/scene.js` (`MAX_BOMB_LIGHTS`) |
| Sparks | Instanced streaks, positions solved in the vertex shader from launch time and speed (no CPU update per spark). A ring buffer; 6,000 at High. | `lavacoast/shaders.js` `SPARK_VS`, `spark/`, `fireworks/` |
| Fume | K3 WebGL2 port copied from `jethover/fluid.js` (a 64 x 28 x 64 grid in one atlas): emitters at the taphole, skimmer and spout, a draught into the hood. Shading follows Fire's smoke: scattering, self-shadow keyed by the glow below. | `jethover/fluid.js`, `fire/`, `docs/plans/fire-smoke.md` |
| Haze and shafts | A half-size march through hall haze: the shafts from three window shapes with a roof-truss cookie, and warm in-scatter from the iron lights. | `volcano/clouds.js` (half-size march, depth read) |
| Heat shimmer | Jet hover's half-size heat buffer and refraction pass, over the runners and the jet. | `jethover/fx.js` |
| Post | Bloom with a threshold, grade, vignette, grain, as Volcano. | `volcano/main.js` |
| D3D11 | One small program per job: iron, floor, hall solids, sparks, fume kernels, haze, shimmer, composite. No uber shader. Hall solids use one light-cheap ShaderMaterial, not MeshStandardMaterial with eight lights. Every program compiles in `compileAsync` before the intro clears; log each link time and keep each under about 1.5 s. Car wash split one source into passes for the same reason. | `carwash/index.html` (`scenePart`), `docs/plans/tornado-meshes.md` |

Kits are copied, never imported from another toy; each copy is marked `/* ---------- K3: volume fluid ---------- */`.
No change to `shared/`.

### Files

| File | Holds |
|---|---|
| `steelworks/index.html` | Page skeleton, importmap word for word |
| `steelworks/main.js` | Bar, camera, frame loop, gestures, life cycle, ladder |
| `steelworks/layout.js` | The cast house in metres: furnace, channels, eye, windows |
| `steelworks/hall.js` | The hall's meshes and their material |
| `steelworks/iron.js` | The channel sim: iron, slag, heat; the light positions |
| `steelworks/sparks.js` | The spark ring buffer and its emitter |
| `steelworks/shaders.js` | Hall, iron, streams, sparks, haze, fume composite, grade |
| `steelworks/fume.js` | K3 copy from Jet hover, retuned |
| `steelworks/sound.js` | Web Audio |

## 5. Sound, bar and rules

### Bar v3

| Control | Content |
|---|---|
| Action | Tap (hold; key Space). While the iron runs it reads Plug. |
| Slider | Flow: the bore, so the cast rate and the jet's size |
| Settings | Quality (shared), Reset |
| How | Hold: drill the taphole · Click the iron: a splash · Space: tap or plug |

### Sound (muted by default, Web Audio through `audioKit()`)

| Sound | When |
|---|---|
| The hall: a low hum of fans and a far clank now and then | Only while the loop runs |
| The drill: a grind and a hammer rattle | While held |
| The tap: a roar with gas thumps, then a steady rush | From break-through to the plug |
| Sparks: a dry crackle that follows the count | With the spark fountains |
| The clay gun: a heavy clank and a hiss as the jet chokes | At the plug |

Indoors, so no distance delay. Every hit jitters in pitch, time and level. The context suspends when the loop sleeps.

### Frame loop and rules

- Lively while the drill turns, the iron runs or sparks fly. Drifting at 30 fps while the runners cool and the fume thins. Asleep 60 s after the last input, easing out over 2 s. Hidden: loop and sim clock stop.
- Reduced motion: no ambient fume drift or flicker. The tap still runs, with fewer sparks and no shake.
- Ladder (`shared/detail.js`): pixel ratio to 1, then haze, fume march and bloom buffers down, then sparks and fume steps halved.
- Budgets: 30 fps on the dev PC; first frame under 3 s cold (shader links count); own files under 2.5 MB recommended (5 MB comfortable max, up to 7.5 to 10 MB for S-tier or statement pieces).

## 6. Cost, risks, bean, questions

**Cost.** The MVP is one session at about Volcano's batch 3 size (L, $40 to $70). The full toy is XXL: three to five more sessions, $150 and up in all.

**Risks.**

1. Iron reads as lava. Mitigation: the mirror surface, the slag split, the silver cold skin, the forked sparks.
2. The hall reads as clutter. Mitigation: silhouettes and light; the Look rule; cut anything that only says "factory".
3. Eight moving lights on every hall surface cost frame time and link time. Mitigation: one cheap hall material; measure links in the first blockout.
4. The fume grid (24 m box) must cover the trough and the hood. Mitigation: the box sits over the taphole and the skimmer; the spout gets a cheap noise plume.
5. Headless capture on this PC: Edge or Chromium with `--use-angle=gl` for heavy passes; check the renderer string. Clamp every `pow()` base (NVIDIA NaN).

**Bean.** `stimming-2t3o`, a `feature` under the Lab toys epic (`stimming-oh7b`). Type Scene. Tasks, in order:

1. Plan to `docs/plans/steelworks.md`, bean.
2. Blockout on the stage, screenshot at 1280 x 800 within the first stretch of work (`docs/qa/steelworks/01-blockout-1280.jpg`), shown to Tom.
3. Iron sim and surface, light from the iron, sparks, fume, haze and shafts, shimmer, post.
4. Gestures, Bar v3, sound, frame loop, ladder.
5. Icon round `icons/spike-steelworks-1.html` (Current, A, D) with emblems, sheet `GALLERY` row; intro emblem `shared/emblems/steelworks.svg`; favicon.
6. `toys.json` entry (`sub: "Stimming Lab"`, `number: null`, draft `nl` "Staalfabriek" and `ipa`); Lab `<li>` with its GSAP hook, committed through a private index.
7. QA Q1 to Q10; `docs/toys/steelworks.md`; commits through `tools/commit.sh` with own paths and hunks only; `git log origin/main..main` before each push, stop if it lists a commit that is not mine.

## Verification

- Dev server `npm run dev` on port 8000 (check the port first); open `/steelworks/` in the browser pane; screenshot the first frame, the drill, the break-through, the run, the plug.
- Q1 to Q10 from `docs/plans/README.md` with a Playwright script in the scratchpad (Chromium `--use-angle=gl`): clean console, rAF count asleep, hidden page, reduced motion, bar count, keys, sound context suspended.
- Log each program's link time and the frame times during the run; record them in the bean.
