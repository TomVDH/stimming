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
| Dev: Look | Stimming (default) or Photoreal: sun and sky, white balance, saturation, contrast, glare, vignette, grain. QA: `docs/qa/tornado-look/` |
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
- [x] The line's parts are lit materials (Tom, 2026-11-17: "PBR the power wires"): each conductor is a weathered aluminium cylinder. A pixel sees the mean of its visible half, which reflects the sky and the field, and the sun draws a thin highlight along it. So a wire is dark against bright sky and bright against dark cloud. The poles are round creosoted wood with grain and a darker foot; the cross-arms are wood; the insulators are glazed porcelain bells with a glint. Every thin part covers only its share of a pixel, along its true slope: no aliasing, no crawl. No pole stands true (Tom, 2026-11-17: "random slight slants"): each leans about 2 degrees across the line, now and then 4, tilts a little along it, and its cross-arm rolls a little; the wires follow. The line runs on past the camera (Tom, 2026-11-17): two poles stand behind the eye, so the near span climbs out of the frame overhead.
- [x] The wires swing in two slow modes: their size follows Wind, Storm and the gusts, and grows fast as a tornado's inflow nears the line (by distance and F). The phases sum on the CPU, so a change of speed never jumps.
- [x] The near wheat is a stand the ray walks cell by cell (`wheat.js`): one stalk per 4.5 cm cell, a 10 cm head with kernel rows, awns, a stalk thickening low down. A thin awn skin over the heads takes a grazing ray in closed form. The walk runs in leaned space, so a gust's lean costs nothing. The low sun reaches only the canopy's top few centimetres and the field's open face along the verge; the stalks deep in the stand go dark. From a 1.25 m eye on the verge the field stands as a wall of stalks; the far field is unchanged. Its edge wanders and feathers over 45 cm (Tom, 2026-11-17: "feathered at edges", "noise it").
- [x] The road and its verges are lit materials (`road.js`, Tom, 2026-11-17: "pbr on the road and the rest of the surfaces"): asphalt, paint, the gravel berm and the grass ditch each take a diffuse term and a GGX highlight, and the road reflects the bright horizon at a grazing angle. Asphalt shows polished wheel paths, an oily strip down each lane and tar seal lines. The bands meet along wandering, noisy edges: gravel spills into the grass and grass creeps over the gravel. The berm falls to a ditch and rises to the field, and each slope turns to or from the sun. Gravel and grass meet over a wide, soft feather (Tom, 2026-11-17: "smoother feather between berm and grass"): tufts creep onto the stones first, with washed dirt between. Textures: gravel stones 2 to 4 cm from the noise volume's cells, pale aggregate in the asphalt, square patches, fine edge cracks, grass in combed streaks with dark gaps between clumps.
- [x] The far plain (`plain.js`): shelterbelts on the mile section lines, lone trees, three far farmsteads with grain bins, and a wire fence along the right field. The fence is lit like the line (Tom, 2026-11-17: "pbr the fences"): round wooden posts, green-painted steel T-posts chipped to rust, galvanised strands with the conductors' sheen; each post leans a little. Each is a flat shape in the scene pass, hazed as the ground is, and sorts behind or in front of the funnels. None crosses the road or stands in front of the usual touchdown ground. Far trees (Tom, 2026-11-17: "faraway trees") stand in six distance bands from 2.5 to 22 km, alone or in groves of two or three, thicker on some stretches of horizon than others.

- [x] Vehicles on the road (`traffic.js`, Tom, 2026-11-17, blockout): a pickup flees the storm on the eye's lane at 34 m/s from 1.1 km out, headlights on, dust behind, and races past about a metre from the eye; 3 s later two storm chasers, a wagon with roof gear and a van with an instrument rack, rush in from behind the eye at 31 m/s, close together, amber bars flashing. Each vehicle is ray-traced as lit boxes and wheels, with three jittered shutter samples for motion blur and smooth edges, a little roll and pitch, and a contact shadow. Dev: Road > Vehicles, or key V; it also runs once, 8 s after the first tornado's dust is up. Each vehicle is now a set of faceted hulls (bean `stimming-x63y`): hood and nose, a raked windshield, sides that lean in above the belt, a bed with walls and a liner on the pickup, bumpers, mirrors, wheel wells and flares, a grille, head and tail lamps; the wagon carries roof bars, a gear case, an amber bar, a cup anemometer and whip aerials; the van carries a roof rack, instrument cases, an amber bar, a hail guard and a mast with a radiation shield, a cross-arm, cups and a vane. Glass shows the world through the far window, past the seat backs. On a wet road each rear wheel throws a mist plume lit red by the tail lamps; on a dry one, thin dust. The drivers brake (lamps brighten, the nose dips), follow, and swerve round a pole lying across the road: their lane, the shoulder, the other lane, the far shoulder, the field.

- [x] The damage field (`damage.js`, bean `stimming-x63y`): a 50 m grid from 12.8 km left to 12.8 km right and out to 25.6 km keeps each point's peak tornado wind and the way it blew (the Rankine wind of `line.js`, turning anticlockwise and spiralling in). Only the cells near a working tornado update; only changed rows upload. Sites keep their own exact peak and its time. The second Clear mends it. GLSL reads it with `dmgAt(xz)`.
- [x] Trees (`plain.js`): lone trees have a trunk, four limbs and a crown of five ragged lobes, lit on the sun's side. They sway with Wind, the storm, the gusts and a near tornado's inflow. From the damage field, each tree by its own strength: leaves go in holes from about 30 m/s, limbs and whole lobes from 38, the tree snaps part way up or goes over at the roots from 45 to 55 (the crown lies on the ground, toward the wind), and past about 80 the top is carried off and a pale stripped stump stays. Shelterbelts and the far trees take the same field: crowns thin, tops drop, rows lie down. Read at 85 mm: at 28 mm the far plain is a band a few pixels high.

- [x] The farm (`farm.js`, moved out of `main.js`): a house with three windows and a door, a barn with a white-framed door and its red gambrel roof, two corrugated grain bins, a windmill and the hedge. Each building keeps its peak wind (a damage-field site). The house: siding and shingles go from 35 m/s, the roof from the windward edge from 48, the walls break along a ragged top from 62, a low heap from 80, a bare slab past 92. The barn goes at lower winds, and its walls lean downwind first. The bins crumple from 45, roll off downwind from 55, are gone past 65. The windmill's wheel races in a near inflow and is torn off at about 40; the tower bends, then goes down. Boards, tin and rubble lie strewn downwind of the yard. The far farmsteads lose roofs, walls and bins from the field.
- [x] Debris (`damage.js`): each stage a building passes throws pieces, more for a later stage. They ride the inflow to the nearest funnel, climb it while they orbit, are flung out and fall back at a board's or a sheet's pace; tin flashes as it tumbles. Six throws in the air at once, 16 s each.

### Stage 6: Finish and QA
- [ ] Sound, Settings, Dev rows, the performance ladder. QA in the browser pane. Tick the bean, record the cost.
