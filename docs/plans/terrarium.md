# Terrarium (`terrarium`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A sealed glass jar of moss and ferns sits on a dark stage. Mist it; drops bead and run down the inside of the glass, and the green inside wakes up.

**Architecture:** One raw WebGL2 scene. The jar is a ray-traced glass cylinder with a dome lid. The plants are a small set of SDF fronds and a moss height field inside it. The glass layer uses `shared/wetglass.js` for drops, runs and fog.

**Tech stack:** raw WebGL2 on `shared/gl.js`; `shared/wetglass.js`, `shared/weather.js`, `shared/glow.js`, `shared/output.js`; Tone.js through `kit.tone()`. No three.js.

**Spec:** idea 361 in [toy-ideas.md](../toy-ideas.md) (Tom's add, 2026-11-14); batch rules in [README.md](README.md); Bar v2 in [bar-v2.md](bar-v2.md). Bean `stimming-ral1`.

| | |
|---|---|
| Size, estimate | M · $20 to $35 |
| Kits | `shared/wetglass.js` for the glass, `shared/environment.js` for the frame loop |
| Before the build | nothing |

## The shot

A deep green-black stage. One tall glass jar stands in the middle, a little below centre, with a cork or glass dome lid.
Inside: a bed of moss on dark soil and pebbles, two or three ferns, a small mushroom cluster.
A soft grow light sits above and behind, so the glass has a long vertical rim and the leaves glow at their edges.
At rest the glass is lightly fogged and the plants are a little dull and curled.

## Hero moments

1. **The mist.** Click and hold to spray. A fine cone of mist enters from the lid; the glass fogs, then beads.
2. **Runs.** Beads join and run down the glass in wiggly tracks that clear the fog behind them.
3. **The green wakes.** The moss lifts and brightens; fern fronds uncurl over 4 to 6 s; the mushrooms glisten.
4. **The jar breathes.** Over a minute the fog slowly returns from the top as a condensation cycle.

## Loop

- **Hold:** mist. Longer holds give heavier drops and more runs.
- **Drag on the glass:** wipe a clear stripe with a finger; the fog creeps back.
- **Tap a frond:** it twitches and drops a bead.
- **Untouched:** the condensation cycle runs once, then the loop sleeps.

## Bar (Bar v2)

| Slot | Content |
|---|---|
| Top left | Choice: Plants, `segments`: Fern, Moss, Bog (keys 1, 2, 3) |
| Bottom left | Action: Mist (key `M`) |
| Bottom right | Slider: Light (the grow light, dusk to noon) |
| Bottom centre | Keys: `[HOLD] mist` · `[DRAG] wipe` · `[CLICK] poke` |
| Settings | Fog return speed · Quality (shared) |

## Sound

Mist: a soft pump hiss. Drops: small wet ticks on glass. The green waking: a faint airy swell. Muted by default.

## Reduced motion and idle

Reduced motion: drops place at once and do not run; fronds open in one step. Idle: the loop sleeps after the fog cycle.

## Tom's direction (2026-11-16, at the blockout)

Tom wants a very richly shaded toy: "glass, fog on glass, droplets, geo-node like plant propagation, maybe some bugs".

| Area | What it asks for | Where it lands |
|---|---|---|
| Glass | Real glass: refraction through the wall, a thick base, caustics on the floor | Task 2 |
| Fog and drops | Fog on the curved glass, beads that merge and run, the wipe | Task 2 |
| Plants | Plants that grow by rules, as geometry nodes do: fronds bud, branch and spread; moss creeps | Task 3, grown from one wetness value |
| Bugs | A few small creatures: a springtail, a woodlouse, a firefly at dusk | New task, after Task 3 |

The blockout's fronds are hand-placed arcs. Task 3 replaces them with a growth rule.

## The fill, maxed out (research, 2026-11-16)

Tom: "need further refining on plants and terrarium fill, procedural perhaps; let's max out; find online examples of plants, moss, particles or volume; fur for moss".
Today every plant is a signed-distance shape in the one ray-march pass. That caps the detail: each frond costs a full evaluation per march step, so the jar holds about 18 fronds and the moss is a bumpy height field with a colour.

### What the examples show

| Example | Technique | What it gives the jar |
|---|---|---|
| [iMoss](https://github.com/ledhieu/imoss), a marimo moss ball in three.js | 125,000 to 500,000 instanced strands, 6-segment tapered blades, lit per strand | Moss that is really strands: the light lies in it, the pointer parts it. Licence CC BY-NC: read for the idea, copy no code. |
| [Shell texturing](https://j-2k.github.io/shelltexture) (after Acerola's "How Do Games Render Fur?") | The surface drawn again in N shells; a hash per cell keeps or drops each shell, so strands taper; height gives fake AO | Cheap fur over a large carpet. Its weak spot is overdraw and steep views. |
| [Fur shells and fins](https://developer.download.nvidia.com/SDK/10.5/direct3d/Source/Fur/doc/FurShellsAndFins.pdf) (NVIDIA) | Shells for the body, fins for the silhouette | Moss edges that read as fuzz, not a shell stack. |
| [Instanced L-system forest](https://discourse.threejs.org/t/procedural-instanced-forest-high-performance-real-trees/88610) (three.js forum) | Per-instance attributes precomputed; LOD in the vertex shader | The model for fronds: one leaflet mesh, thousands of instances, placed by a rule. |
| [Fern by positional information and phyllotaxis](https://www.algorithmicbotany.org/papers/sigcourse.2003/2-27-positional.pdf) (algorithmic botany) | A frond's shape as a function of position along the rachis | The growth rule for fronds, pinnae and pinnules. |
| [Real-time translucency for leaves](https://www.cg.tuwien.ac.at/research/publications/2007/Habel_2007_RTT/Habel_2007_RTT-Preprint.pdf) (Habel et al.) | Light through a leaf from a thickness and a translucency colour | Backlit fronds that glow yellow-green against the grow light. |
| [Terrarium layers](https://terrariumtribe.com/terrarium-layers/) and [woodland terrariums](https://terrariumtribe.com/woodland-terrarium/) | Drainage stones, charcoal, a mesh, substrate sloped from 5 to 8 cm at the back to 3 cm at the front, hardscape set first, pillow moss on mounds, sheet moss creeping over stone | A believable build: a cut face with real layers, a slope, a stone and a branch that moss climbs. |

### Two ways to build it

| | A. Raster garden in the glass (recommended) | B. Stay in the ray march |
|---|---|---|
| How | Plants, moss, stones and wood are instanced meshes, drawn first into a colour and depth buffer with the same camera. The ray-marched jar reads that buffer through its wall. | Moss becomes a volume band over the bed, marched in slices (shells inside the march). Fronds stay distance shapes, with more detail. |
| Moss | 150,000 to 400,000 strands, two species, each with leaves and some with spore capsules on stalks | A fuzzy band; no single strands up close |
| Ferns | Fronds of instanced pinnae (thousands of leaflets), fiddleheads that unroll in the vertex shader | About 20 fronds; leaflets stay a comb |
| Light | A shadow map from the grow light; translucent leaves; per-strand AO | Soft fake shadows only |
| Wake | Dry moss leaves fold flat against the stem; wet they spread open (true of real moss). Per-strand, in the vertex shader. | Colour and height only |
| Cost | A rebuild of the contents (the glass stays). One small opt-in change to `shared/environment.js`: a scene texture can be a live buffer. | Smaller change; a lower ceiling |

### three.js: public implementations (checked 2026-11-16)

The toy is raw WebGL2 today, on `shared/environment.js`; it uses no three.js. Plan A is a real 3D scene (instancing, shadow maps), the case `docs/stack.md` gives to three.js 0.170.0, which the importmap already carries.
Only MIT code may be copied. A repo with no licence is all rights reserved: read it for the idea only.

| Repo | What it is | Licence | Use |
|---|---|---|---|
| [CK42BB/procedural-grass-threejs](https://github.com/CK42BB/procedural-grass-threejs) | Instanced blades with Bezier profiles, layered wind, a subsurface term, distance LOD, interactive push | MIT | Base for moss strands: shorter, denser, clumped |
| [dgreenheck/ez-tree](https://github.com/dgreenheck/ez-tree) | Procedural tree generator, dozens of parameters, a library on npm | MIT | Branch and leaf placement code for the branch and frond rachis |
| [piellardj/fur-threejs](https://piellardj.github.io/fur-threejs/) | Shells and fins fur in three.js, adapted for WebGL with no geometry shader | none | Idea only: a fuzz carpet over the soil, fins at the silhouette |
| [mate-h/shell-texturing](https://shell-texturing.vercel.app) | Shell texturing demo in three.js | none | Idea only |
| [al-ro grass](https://al-ro.github.io/projects/grass) | Classic instanced grass in three.js (`InstancedBufferGeometry`) | none | Idea only |
| [ledhieu/imoss](https://github.com/ledhieu/imoss) | 125,000 to 500,000 instanced moss strands on a ball | CC BY-NC | Idea only |
| [spacejack/terra](https://github.com/spacejack/terra) | Large instanced grass field, wind, terrain | unclear | Idea only |

No public three.js fern generator turned up. Fronds come from our own rule (Task 3), built as instanced pinnae.

**How the toy would sit on three.js.** One `WebGLRenderer` draws the garden (instanced moss, fronds, stones, wood, shadow map) into a render target with depth. The jar and the wet glass stay as they are, as full-screen `ShaderMaterial` passes on the same renderer: `wetglass.js`, `glassrain.js`, `bokeh.js`, `glow.js` and `output.js` already compile in a three.js `ShaderMaterial`. The toy then leaves `environment.js` and wires those bundles itself, as Fog horn's runner does.

### Plan A, stage by stage (one look at a time, stills after each)

1. **Raster pass.** The contents draw as meshes into a buffer the jar reads. Today's look first, as meshes, so nothing jumps.
2. **The build.** Drainage stones (instanced, round, visible on the cut face), a charcoal band, a mesh line, substrate sloped back to front. Hardscape: one craggy stone and one branch.
3. **Moss.** Instanced strands placed by a density map: cushion moss on mounds (dense, short, domed), sheet moss creeping over soil and stone. Some cushions carry spore capsules on red stalks. Dry: leaves fold, colour olive. Wet: leaves open, colour deep green, tiny water beads on tips. Growth spreads the density map.
4. **Ferns.** Fronds grown by rule: rachis, then pinnae by position, then pinnules; fiddleheads unroll with the wake. Translucent, backlit by the grow light. Sori dots on old fronds' undersides.
5. **Small life and air.** Lichen cups and a few tiny mushrooms on the branch. Humid air: slow motes in the lamp's light inside the jar. The bugs (springtails, a woodlouse) come after this, as their own task.
6. **Light.** The grow light's shadow map over the whole garden; a soft green bounce from the moss onto the glass.

### Budget

Hold 30 fps on Tom's laptop at Standard. The strand count and shadow size follow the shared quality level (High, Standard, Low) and the slow-frame watch. Idle still sleeps: the garden redraws only while something moves.

## Tasks

### Task 1: Blockout (checkpoint)
- [ ] Jar, lid, soil, moss, ferns, grow light. Flat shading is fine. Stills at 1280 and 375 px. Checkpoint with Tom.
- [ ] `toys.json` entry and menu Lab entry with a low-fi icon. Commit shared files with `--hunks`.

### Task 2: Glass
- [x] Wire `shared/wetglass.js` to the jar's curved surface: fog, beads, runs, the wipe stripe. Built 2026-11-16: a second, finer bead layer; the spray cone from the lid; the condensation cycle sleeps after about 66 s.

### Task 3: The green wakes
- [x] Moss lift and colour, fern unfurl, mushroom gloss, all driven by one wetness value. Built 2026-11-16: fronds grow by a golden-angle rule and curl into fiddleheads when dry; each mist adds lasting growth (new fronds, creeping moss), saved in `stimming.terrarium.grow`; a tap swings the nearest fern.

### Task 4: Finish and QA
- [ ] Sound, Settings, persistence, performance ladder. QA in the browser pane. Tick the bean, record the cost.
