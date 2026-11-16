# Tornado alley (`tornado`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Many sessions build this toy, one stage at a time. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A wide, still, deadpan cinematic vista of the Oklahoma plains under a vast supercell. Several tornadoes can touch down at once; each carries an F-scale, F0 to F5, that sets its size, speed and violence. Place them, scale them and watch them cross the land.

**Register (Tom, 2026-11-16):** very cinematic, flat and patient: a locked-off wide frame, a long straight road to the horizon, the land dwarfed by the sky. No film names in the toy, its copy or its code; describe it as "wide, still, deadpan framing".

**Showcase (Tom, 2026-11-16):** "an impressive show case of weather effects, haze, layering, clouds and the tornado turbulence and cone dynamics". Every stage aims at that bar: the effects carry the toy.

**Composition (Tom, 2026-11-16):** golden ratio. The horizon sits 0.382 up the frame. The eye hangs partly over the road's left edge (the road centre runs 3.4 m to its right); the road vanishes on the right golden line (0.618 across) and its near end runs out of the frame at the bottom right. The wheat field lies left of the verge. Wheat fills the foreground and answers the wind.

**Lens (Tom, 2026-11-16):** 50 mm ("50mm looks good"); 85 mm sits in Settings. The tornadoes are the centrepieces: the storm sits close, its dark base fills the sky over the sunlit wheat, the wall cloud hangs 8 km out on the left golden line, and tornadoes touch down 5 to 14 km out, under the base.

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

## Sound

Wind across the wheat at rest. Each tornado a low roar whose pitch and weight follow its F-scale, panned by place; rumble and distant thunder; hail on the barn roof. Distance delays every sound. Muted by default.

## Stages

Each stage is one or more sessions and ends with a checkpoint with Tom.

### Stage 1: The shot (blockout)
- [ ] Plains, wheat, road, poles, farmhouse, supercell silhouette, low sun. Stills at 1280 and 375 px. Checkpoint with Tom.
- [ ] `toys.json` entry and menu Lab entry with a low-fi icon.

### Stage 2: One tornado
- [x] Framing blockout (Tom, 2026-11-16: "we are just blocking out framing"): the 50 mm shot, stand-in funnel volumes with rotation, dust skirt, touchdown and rope-out, the F-scale table, the controls. The funnel look is a placeholder.
- [ ] The tornado itself (Tom: "the next will be an impressive raymarched tornado slider"): one hero ray-marched tornado, built on its own with one continuous F-scale slider (F0 to F5) that morphs it through rope, cone, stovepipe and wedge. Turbulence, cone dynamics, condensation, debris and dust are the showcase. It replaces `tornado()` in the shot when Tom signs it off.

### Stage 3: Many tornadoes
- [ ] Place, steer and scale several at once; life cycles; the frame-cost budget per tornado.

### Stage 4: The storm
- [ ] Rotating base, wall cloud, anvil, rain curtain, hail shaft, lightning; light and grade across the times of day.

### Stage 5: Debris and the land
- [ ] Wheat that bends and flattens along each track, lofted debris, a damage track that stays.

### Stage 6: Finish and QA
- [ ] Sound, Settings, Dev rows, the performance ladder. QA in the browser pane. Tick the bean, record the cost.
