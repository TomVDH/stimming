# Tornado alley (`tornado`) implementation plan

Status: active · Bean: `stimming-dwwg`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Many sessions build this toy, one stage at a time. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A wide, still, deadpan cinematic vista of the Oklahoma plains under a vast supercell. Several tornadoes can touch down at once; each carries an F-scale, F0 to F5, that sets its size, speed and violence. Place them, scale them and watch them cross the land.

**Register (Tom, 2026-11-16):** very cinematic, flat and patient: a locked-off wide frame, a long straight road to the horizon, the land dwarfed by the sky. No film names in the toy, its copy or its code; describe it as "wide, still, deadpan framing".

**Showcase (Tom, 2026-11-16):** "an impressive show case of weather effects, haze, layering, clouds and the tornado turbulence and cone dynamics". Every stage aims at that bar: the effects carry the toy.

**Composition (Tom, 2026-11-16):** golden ratio. The horizon sits 0.382 up the frame. The eye hangs partly over the road's left edge (the road centre runs 3.4 m to its right); the road vanishes on the right golden line (0.618 across) and its near end runs out of the frame at the bottom right. The wheat field lies left of the verge. Wheat fills the foreground and answers the wind.

**Lens (Tom, 2026-11-16):** 50 mm ("50mm looks good"); 85 mm sits in Settings. The tornadoes are the centrepieces: the storm sits close, its dark base fills the sky over the sunlit wheat, the wall cloud hangs 8 km out on the left golden line, and tornadoes touch down 1.2 to 14 km out, under the base. A tornado never comes nearer than about 1 km (more for a wide one).

**Architecture:** One raw WebGL2 scene on the shared environment library, as Railgun is: `envScene` for the plains and far horizon, a ray-marched supercell (mesocyclone, wall cloud, anvil, rain curtain), and one volume per tornado (funnel, condensation, debris cloud, dust skirt) driven by a small set of per-tornado uniforms.

**Tech stack:** raw WebGL2 on `shared/gl.js` and `shared/environment.js`; `shared/sky.js`, `shared/weather.js`, `shared/precip.js`, `shared/glow.js`, `shared/grade.js`, `shared/output.js`. The funnels and dust use the Railgun rock's smoke shading and the volume ideas in `shared/fire.js`. three.js only if a stage proves it needs it.

**Spec:** idea 364 in [toy-ideas.md](../toy-ideas.md) (Tom's add, 2026-11-16); batch rules in [README.md](README.md); Bar v2 in [bar-v2.md](bar-v2.md). Bean `stimming-dwwg`.

| | |
|---|---|
| Size, estimate | XXXL · $150 and up, many sessions |
| Kits | the shared environment library; Railgun's smoke, debris and cloud deck |
| Before the build | Tom picks which XXXL comes first: Tornado alley or Calving. The second lifts the first's parts. |

## The shot

Eye height, a wide lens, the horizon on the lower golden line (see Composition). Flat wheat to the edge of the world, a straight two-lane road running to a vanishing point, telephone poles marching beside it.
A lone farmhouse, a barn and a windmill sit a mile off. Mid-frame and far, the supercell: a dark rotating base, a lowered wall cloud, a sunlit anvil towering up and out.
Behind the camera the sky is still clear, so warm low sun lights the wheat and the cloud's flank against the black-green core.

## F-scale

| F | Width | Look | Ground |
|---|---|---|---|
| F0 | thin rope | a faint condensation thread, a dust whirl at its foot | wheat ripples |
| F1 | narrow | a clear funnel, a small debris ring | wheat flattens in a line |
| F2 | cone | a full cone to the ground | fence posts and shingles in the debris |
| F3 | wide cone | a dark, dirty funnel; satellite vortices | a scoured track, roof sheets lofted |
| F4 | stovepipe | a broad column, wrapped in rain | a brown track, heavy debris |
| F5 | wedge | wider than tall, a black wall to the ground | the track is bare earth |

The F-scale sets width, rotation speed, translation speed, debris density, dust skirt height and sound. Changing it on a live tornado eases between levels over a few seconds.

## Hero moments

1. **Touchdown.** A funnel lowers from the wall cloud; dust spins up from the ground before the funnel reaches it; they join.
2. **Many at once.** Two or three tornadoes on the plain together, one roping out while another grows.
3. **The wedge.** An F5 widens until it fills a third of the frame and swallows the light.
4. **Rope out.** A dying tornado thins, bends into a long rope and breaks up in the sun.
5. **Lightning.** Strikes from the anvil and the flank light the rain curtain from inside.

## Loop

- **Click the plain:** a tornado touches down there at the current F-scale.
- **Drag a tornado:** steer its path. Scroll or `[` `]` on a tornado: change its F-scale.
- **Right click or double click:** rope it out.
- **Untouched:** the storm keeps turning; tornadoes live their own life cycle and rope out; the scene slows its frame rate, then sleeps after the last tornado.

## Bar (Bar v2)

| Slot | Content |
|---|---|
| Top left | Choice: F-scale, `stepper`: F0 to F5 (keys 0 to 5) |
| Bottom left | Actions: `+ Tornado`, Clear |
| Bottom right | Slider: Storm (a building cell to a full supercell) |
| Bottom centre | Keys: `[CLICK] touch down` · `[DRAG] steer` · `[0-5] F-scale` |
| Settings | Time: Afternoon, Golden hour, Dusk · Quality (shared); Dev rows for every look knob |
| Dev: Tone map | Film (`ouFilm`) or ACES (`ouFilmAces`), default ACES. ACES takes a 1.1 gain; Exposure trims both. `?tone=film` for one load |
| Dev: Window | Glass, Drops, Fog, Drop blur (focus on the plain: soft drops, `tornado/pane.js`), Bokeh (focus on the pane), Rain (the scene's own near rain: sunlit streaks, a grey veil on the distance), Grain. Off by default. QA: `docs/qa/tornado-window/` |

## Sound

Wind across the wheat at rest. Each tornado a low roar whose pitch and weight follow its F-scale, panned by place; rumble and distant thunder; hail on the barn roof. Distance delays every sound. Muted by default.

## Stages

Each stage is one or more sessions and ends with a checkpoint with Tom.

### Stage 1: The shot (blockout)
- [ ] Plains, wheat, road, poles, farmhouse, supercell silhouette, low sun. Stills at 1280 and 375 px. Checkpoint with Tom.
- [ ] `toys.json` entry and menu Lab entry with a low-fi icon.

### Stage 2: One tornado
- [x] Framing blockout (Tom, 2026-11-16: "we are just blocking out framing"): the 50 mm shot, stand-in funnel volumes with rotation, dust skirt, touchdown and rope-out, the F-scale table, the controls. The funnel look is a placeholder.
- [ ] The tornado itself (Tom: "the next will be an impressive raymarched tornado slider"): one hero ray-marched tornado, built on its own with one continuous F-scale slider (F0 to F5) that morphs it through rope, cone, stovepipe and wedge. Turbulence, cone dynamics, condensation, debris and dust are the showcase. It replaces `tornado()` in the shot when Tom signs it off. Built in `tornado/lab.html` (`lab.js`, noindex): raw WebGL2 on `shared/gl.js`, a 64³ tiling noise volume. The funnel is a volume, an onion (Tom, 2026-11-16: "layers of swirling noise and raymarched volume like an onion", "production fidelity"): a dense core with a ragged edge inside five thin sheaths at 0.85 to 1.65 R; each sheath spins as one body at its own Rankine rate and climbs at its own speed, so the layers shear and nothing winds up; sheath noise is helical, eroded, and varies with radius too (without it, streaks run along each ray); scattering in three octaves with sun shadow rays, a two-lobe phase and depth-darkened sky light. Then debris and rain as volumes, low-sun self-shadow, a lowered wall cloud; the F slider drives every value from one table in `lab.js`. Links: `?f=4.5`, `?morph`, `?t=12`, `?still`, `?dbg=1` (the sun term: diff, shadow, normal), `?dbg=2` (no fringe). The noise volume holds 64 cells per unit: `N()` scales by a sixteenth, so one unit is four cells.

### Stage 3: Many tornadoes
- [ ] Place, steer and scale several at once; life cycles; the frame-cost budget per tornado.

### Stage 4: The storm
- [ ] Rotating base, wall cloud, anvil, rain curtain, hail shaft, lightning; light and grade across the times of day.

### Stage 5: Debris and the land
- [ ] Wheat that bends and flattens along each track, lofted debris, a damage track that stays.
- [x] The power line (`line.js`, bean `stimming-o3o5`): a tornado's wind leans poles from 40 m/s and topples them past 58 m/s; spans break and their halves fall and whip. A fault arcs in hard blue-white pulses, throws sparks that fall and bounce, and lights the dust. From the first fault a short runs down the line toward the eye, pole by pole (Tom, 2026-11-17: "every pole shorts"). A recloser allows about four faults, then one more every 20 s. The second Clear mends the line. QA: `?tor=F4.5&line=1.5&age=40` puts the tornado 1.5 km out, left of the line.
- [x] The line's parts are lit materials (Tom, 2026-11-17: "PBR the power wires"): each conductor is a weathered aluminium cylinder. A pixel sees the mean of its visible half, which reflects the sky and the field, and the sun draws a thin highlight along it. So a wire is dark against bright sky and bright against dark cloud. The poles are round creosoted wood with grain and a darker foot; the cross-arms are wood; the insulators are glazed porcelain bells with a glint. Every thin part covers only its share of a pixel, along its true slope: no aliasing, no crawl.
- [x] The wires swing in two slow modes: their size follows Wind, Storm and the gusts, and grows fast as a tornado's inflow nears the line (by distance and F). The phases sum on the CPU, so a change of speed never jumps.
- [x] The near wheat is a stand the ray walks cell by cell (`wheat.js`): one stalk per 4.5 cm cell, a 10 cm head with kernel rows, awns, a stalk thickening low down. A thin awn skin over the heads takes a grazing ray in closed form. The walk runs in leaned space, so a gust's lean costs nothing. The low sun reaches only the canopy's top few centimetres and the field's open face along the verge; the stalks deep in the stand go dark. From a 1.25 m eye on the verge the field stands as a wall of stalks; the far field is unchanged. Its edge wanders and feathers over 45 cm (Tom, 2026-11-17: "feathered at edges", "noise it").
- [x] The road and its verges are lit materials (`road.js`, Tom, 2026-11-17: "pbr on the road and the rest of the surfaces"): asphalt, paint, the gravel berm and the grass ditch each take a diffuse term and a GGX highlight, and the road reflects the bright horizon at a grazing angle. Asphalt shows polished wheel paths, an oily strip down each lane and tar seal lines. The bands meet along wandering, noisy edges: gravel spills into the grass and grass creeps over the gravel. The berm falls to a ditch and rises to the field, and each slope turns to or from the sun.
- [x] The far plain (`plain.js`): shelterbelts on the mile section lines, lone trees, three far farmsteads with grain bins, and a wire fence along the right field. Each is a flat shape in the scene pass, hazed as the ground is, and sorts behind or in front of the funnels. None crosses the road or stands in front of the usual touchdown ground.

### Stage 6: Finish and QA
- [ ] Sound, Settings, Dev rows, the performance ladder. QA in the browser pane. Tick the bean, record the cost.
