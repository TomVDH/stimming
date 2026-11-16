---
# stimming-dwwg
title: 'Toy: Tornado alley'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-16T19:44:51Z
updated_at: 2026-11-16T20:09:06Z
parent: stimming-oh7b
---

Build Tornado alley from docs/plans/tornado.md (idea 364, Tom's add 2026-11-16). Size XXXL. It starts in the Lab. A wide, still, deadpan cinematic vista of the Oklahoma plains under a huge supercell. Several tornadoes at once; each carries an F-scale (F0 to F5) to set and play with.

- [ ] Task 1: blockout of the shot: plains, wheat, farmhouse, road, supercell; checkpoint with Tom
- [ ] Task 2: one tornado: funnel volume, rotation, dust skirt, F-scale knob
- [ ] Task 3: many tornadoes: place, set F-scale, paths, ropes out
- [ ] Task 4: storm: wall cloud, rain curtain, hail, lightning, light and grade
- [ ] Task 5: debris and damage: wheat flattens, fence and barn debris
- [ ] Task 6: sound, Settings, Dev rows, QA at 1280 and 375 px
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Stage 1 status (2026-11-16)

Blockout built; waits for the checkpoint with Tom.

- [x] `tornado/index.html` + `tornado/main.js` on `shared/environment.js` (sky palette, glow, grade, output); Bar v2 spec wired
- [x] The shot: wheat, two-lane road to the vanishing point, poles and wires, farm (house, barn, windmill, shelterbelt), supercell (tower, overshooting top, anvil, base shelf, wall cloud, rain curtain), low sun behind the camera
- [x] Stubs: click touches down a flat grey funnel at the F level, drag steers it, keys 0 to 5, + Tornado, Clear, Storm slider, Time in Settings, Exposure in Dev
- [x] Headless QA: clean console on the toy, stills at 1280 and 375 x 812
- [ ] Checkpoint with Tom

Known gaps for later stages: the runner draws at the full frame rate while awake (no 30 fps drift step); the scene sleeps after 60 s with no input. The wheat shows faint row banding mid-distance. No sound yet.

### Stage 1, round 2 (Tom, 2026-11-16: "the road is offset", wheat "responsive to the wind", "the tornado would be in the distance", "golden ratio")

- Golden lines: the horizon sits 0.382 up the frame; the eye turns left so the road vanishes 0.618 across; the road runs 11 m right of the eye; the wall cloud lands near the left golden line.
- Wheat: near shells of ears with awns lean with the wind; gust fronts roll downwind as a pale sheen; the Storm slider drives the wind; the windmill turns faster with it.
- Distance: the storm sits about 30 per cent further out; a click places a funnel 8 to 30 km away.
- Headless 60 fps at 1280 x 720, console clean.
