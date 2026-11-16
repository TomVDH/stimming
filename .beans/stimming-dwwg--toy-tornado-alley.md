---
# stimming-dwwg
title: 'Toy: Tornado alley'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-16T19:44:51Z
updated_at: 2026-11-16T23:40:18Z
parent: stimming-oh7b
---

Build Tornado alley from docs/plans/tornado.md (idea 364, Tom's add 2026-11-16). Size XXXL. It starts in the Lab. A wide, still, deadpan cinematic vista of the Oklahoma plains under a huge supercell. Several tornadoes at once; each carries an F-scale (F0 to F5) to set and play with.

- [x] Task 1: blockout of the shot: plains, wheat, farmhouse, road, supercell; checkpoint with Tom
- [ ] Task 2: one tornado: funnel volume, rotation, dust skirt, F-scale knob (framing blockout done; next: the hero ray-marched tornado with a continuous F-scale slider, per Tom)
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
- [x] Checkpoint with Tom (passed 2026-11-16)

Known gaps for later stages: the runner draws at the full frame rate while awake (no 30 fps drift step); the scene sleeps after 60 s with no input. The wheat shows faint row banding mid-distance. No sound yet.

### Stage 1, round 2 (Tom, 2026-11-16: "the road is offset", wheat "responsive to the wind", "the tornado would be in the distance", "golden ratio")

- Golden lines: the horizon sits 0.382 up the frame; the eye turns left so the road vanishes 0.618 across; the road runs 11 m right of the eye; the wall cloud lands near the left golden line.
- Wheat: near shells of ears with awns lean with the wind; gust fronts roll downwind as a pale sheen; the Storm slider drives the wind; the windmill turns faster with it.
- Distance: the storm sits about 30 per cent further out; a click places a funnel 8 to 30 km away.
- Headless 60 fps at 1280 x 720, console clean.

- Round 3 (Tom: the road "a bit more to the right", its golden cut "past the camera FOV"): the road vanishes at 0.764 across and runs 14 m right of the eye. The showcase goal and the composition are in docs/plans/tornado.md.

- Round 4 (Tom: the road moves left, "it will partially go past camera fov"): the road vanishes at 0.618 and runs 7.5 m right of the eye; its near end leaves the frame at the bottom right.

- Round 5 (Tom picked all four: storm base, sky and light, near wheat, storm placement), one commit each: the updraft and wall cloud on the left golden line with open sky above; a striated, ragged base with a lowered wall cloud and a greener core; a dusty sky with a warm horizon band that dims round the storm; the eye drops to 1.25 m and a foreground of 56 soft-focus ears sways with the gusts.

- Round 6 (Tom: "road to the left more, the camera partially hangs over it"): the road centre runs 3.4 m right of the eye, so the eye hangs over its left edge; wheat shells skip the verges, the verge and gravel have texture, the field's sunlit face is brighter.

## Stage 2 status (2026-11-16)

Built; waits for the checkpoint with Tom.

- [x] Funnel volume per tornado, ray-marched only near its curved axis: F-scale width and flare, a sway and a lean, helical striations that spin at 45 to 120 m/s over the radius, a ragged condensation edge, a top that spreads into the base, darker with F (grey at F2, near black at F5)
- [x] Dust skirt: wider than the funnel, spins faster, billowing, height by F
- [x] Life cycle: dust first, then the condensation lowers (touchdown); drift with the storm by F; rope-out bends the axis into an S, narrows to a 35 m rope, breaks up and fades (14 s + 7 s); each tornado ropes out by itself after 55 to 130 s
- [x] Controls: right click or double click ropes out, the wheel or [ ] steps a tornado's F level (eased over seconds), Clear ropes all out, a second Clear removes them
- [x] Tornadoes stay under the base: 17 to 36 km out; the shelf reaches to 15 km
- [x] QA flags ?near, ?age, ?rope, ?qa; headless 60 fps with four tornadoes; console clean
- [ ] Checkpoint with Tom

- Stage 2, round 2 (Tom: "a little less far away from the action, 50 or 85mm lens", "the tornados will be the centre pieces"; then "50mm looks good"): Lens setting 50 mm (default) or 85 mm; the storm moves 17 km closer; tornadoes 5 to 14 km out; funnel tops follow the local base (lower under the wall cloud) and fade before the cut; finer storm edges near the eye; F5 dust narrower and thinner.

- Hero tornado lab, first pass: tornado/lab.html + lab.js (noindex). F slider F0 to F5 morphs rope, cone, stovepipe, wedge; Morph, Pause, knobs (spin, turbulence, debris, distance, lens, sun, steps, resolution). Headless 44 to 60 fps at 0.6 resolution. Waits for Tom.

- Tornado lab, funnel surface pass (Tom picked it): noise lookups were 16 times too fine (the speckle, sandy debris and grainy base); the wall is now lumps that bend helical striation bands, with fibres and curds as shade; cavity shade from the field; the fringe shows only on the silhouette, so the funnel models lit and shaded; the haze under the storm is dim. 60 fps headless at every F level.

- Tornado lab, onion pass (Tom: "layers of swirling noise and raymarched volume like an onion", "production fidelity before we continue anything else"): the funnel is now a volume: a ragged dense core inside five thin sheaths, each spun as one body at its own Rankine rate and climb speed, noise helical, eroded and radial; multiple-scattering light with sun shadow rays and a two-lobe phase. Knobs read from the address (?lens=85&dist=0.5&res=1). Headless 53 to 60 fps at 0.6 resolution.

- Tornado lab, layering, light and smooth F (Tom: "ensure layering and shading light is a bit better", "smooth transition between fujita scales"): each layer's spin angle and climb are integrated per frame in lab.js (uPh), so F or Spin changes only change speed; the F table reads as a clamped Catmull-Rom curve; sheaths sit at 1.0 to 1.8 R with air between; shadow rays see each layer's mean ring, so outer sheaths shade inner ones; warm bounce from the wheat lights the lower funnel. Headless 60 fps at 0.6 resolution.

- Fix (Tom: "you did a regression", "warped in the middle when switching", "fucked at low F levels"): the climb term divided height by the local radius; in the flare that ratio stalls, so the upper funnel smeared into vertical sheets. The bands now use one height scale per funnel (uZs, gentle with size). A slider jump eases over about 3 s.

- Fix (Tom: "the onion layers blend together and smoothen the lower the F scale is", "properly fix all"): detail now follows the screen: sheath gaps stay three pixels or more (gSp) and the noise thins round a funnel that is thin on screen (gAng); the camera moves in on thin funnels; features round the funnel keep the shape of features up it at any size; the helix leans by arc, not angle (wide funnels had sheared flat); the dust spins as one body with integrated phases (the crossfade doubled at F4 and F5); lighter history (0.55), default resolution 0.75. Headless 60 fps at F1, F3, F5.

- Fix (Tom: "bottom of tornado looks weird and cut off with white"): the funnel ended in a flat, dense cap. It now tapers to a point over max(4 R, 80 m) at its lower edge, thins as it narrows, and tears along the wall's noise near the tip; the edge varies less once the condensation reaches the ground, where the tip sinks into its dust.

- Lab storm (Tom: the blockout storm clouds were the better start; then "Lab, wide framing"): two rejected attempts (a Worley cloud slab, then the blockout scaled up close) were reverted unpushed. Now the lab carries the shot's blockout supercell (main.js shapes, plates, scud, light, gloom, rain curtain) at its true scale, seen from the shot's distance (8 km to the wall cloud, 50 mm; Distance knob multiplies). The wall cloud stands over the axis and lowers a little with F; the funnel hides behind the storm's first surface. F0 is storm only (no condensation, no dust); a funnel cloud lowers from F0.5 and reaches the ground near F2. The noise volume gains a Worley channel, used lightly in the scud.

- Lab: storm and funnel merged (Tom: "merge them"), and a time-of-day control (Tom: "allow for a TOD setting in the lab"). The blockout storm hangs from the funnel's top in close framing (scaled from the shot, uKs). Round the tornado (2.8 storm km) the storm is density in the funnel's own march, turning with the outer sheath; the shell backdrop fades out there. The funnel takes the storm's shade (shadow rays to the base's height) and, near its top, its tone. Time 12:00 to 21:00 sets the sun's height, its colour by air mass and the sky light; Sun dir sets its bearing (0 behind, 180 backlit). Headless 20 to 60 fps; a performance pass is next.

- Junction (Tom: "the smooth merge / connection between storm layer and the actual funnel is not quite there yet"): a collar (bell) now flares out of the funnel's top quarter up into the wall cloud, in the funnel's own volume and light, its edge torn by the outer sheath's noise; the funnel's top fades inside it; the wall cloud's underside is an upturned bowl, and clears a wide envelope round the bell so its rough underside no longer cuts across the funnel. ?dbg=3 hides the bell, ?dbg=4 the near storm. Headless 13 to 50 fps on a shared GPU; a performance pass is due.

- Blend and refinement (Tom: "a gap between cloud deck and the funnel exists", "better refinement in the funnel across all F scales", "neatly colour blend from storm deck to top of bell to funnel"): the bell fades into the deck while the deck fades in over it (no void); the deck's edge softens near the bell; the bell's top width grows with F; one colour chain: the funnel turns to the storm's smooth tone up the bell (topKAt), and the deck by the bell takes that same tone before its own textured light (TONE_K matches their means). Funnel: round billows in each layer's own spinning frame (no more hair streaks), softer outer sheaths, rounder dust, less fill light.

- Taper and bands (Tom, 2026-11-16: "ensure smooth and realistic taper of clouds down to funnel", "i see bands of colour"). One horn joins the funnel to the deck: a quarter-ellipse outline (hornR), upright where it leaves the funnel, level where it meets the wall cloud's flat underside at uH. The funnel's own layers widen along it, so funnel and horn share one outline and no lip shows; a solid takes over up high and fades inside the wall cloud. The neck SDF, the bowl under the wall and the F lowering are gone. Bands removed: the far storm's plates stay on its flank (they striped the base's underside), the horn takes the deck's own light (stormLit at the underside just above it; cloudTone ran three times too dark), the sky under the base keeps one hue (the navy strip is gone), the rain shaft reaches the lab's ground as a soft grey veil (it floated as a green box), the funnel's shade takes the warm horizon light (it went navy), and the march's first steps carry a full step of jitter (wood grain). The wall cloud is always wider than the funnel's top, and the near region grows on a wide lens. The camera keeps the horn in frame at low F (frameK floor 0.76). Checked F0 to F5 at 24, 35, 50 and 85 mm, and at noon backlit; console clean.

- Shared lab: <https://claude.ai/artifact/4rQ7D568vJZ2DSwGnwRpFf> (private until Tom shares it). One page built from `tornado/lab.html`, `lab.js`, `shared/gl.js`, GRADE and OUTPUT; phones open with the knobs folded. Republish after a lab change.
